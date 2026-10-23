require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cargarOrdenesFibraHoy() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=========================================================================");
    console.log("   CARGANDO ÓRDENES DE FIBRA DE VIDRIO DESDE SAP EN ordenes_fabricacion_fibra ");
    console.log("=========================================================================\n");

    // 1. Obtener mapeo de moldes existentes
    const { data: histOrders } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('producto_sku, producto_descripcion, molde_sku, molde_descripcion, molde_id');

    const moldMapBySku = {};
    const moldMapByDesc = [];
    (histOrders || []).forEach(h => {
        if (h.producto_sku && h.molde_sku) {
            moldMapBySku[h.producto_sku.trim().toUpperCase()] = {
                molde_sku: h.molde_sku,
                molde_descripcion: h.molde_descripcion,
                molde_id: h.molde_id
            };
        }
        if (h.producto_descripcion && h.molde_descripcion) {
            moldMapByDesc.push({
                keywords: h.producto_descripcion.toUpperCase().split(/\s+/).filter(w => w.length > 3),
                molde_sku: h.molde_sku,
                molde_descripcion: h.molde_descripcion,
                molde_id: h.molde_id
            });
        }
    });

    // 2. Conectar a SAP Service Layer
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
    const sapUser = process.env.SAP_USERNAME || 'manager';
    const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

    const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : sapUrl + '/Login';
    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser })
    });
    const { SessionId } = await loginRes.json();
    const baseUrl = loginUrl.replace('/Login', '');

    console.log("1. Conexión a SAP exitosa. Obteniendo órdenes liberadas...");
    const res = await fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
        headers: {
            'Cookie': `B1SESSION=${SessionId}`,
            'Prefer': 'odata.maxpagesize=1000'
        }
    });
    const { value: allOrders } = await res.json();

    // 3. Filtrar órdenes de Fibra de Vidrio
    const fibraOrders = (allOrders || []).filter(r => {
        const sku = String(r.ItemCode || r.producto_sku || '').toUpperCase().trim();
        const desc = String(r.ItemName || r.producto_descripcion || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || 
               desc.includes('BAÑERA') || 
               desc.includes('JACUZZI') || 
               desc.includes('SPA ') || 
               desc.includes('TINA ');
    });

    console.log(`2. Total órdenes de Fibra encontradas en SAP: ${fibraOrders.length}`);

    // Helper para fechas YYYYMMDD -> YYYY-MM-DDTHH:mm:ss
    const parseSapDate = (val) => {
        if (!val) return new Date().toISOString();
        const s = String(val).trim();
        if (s.length === 8 && /^\d{8}$/.test(s)) {
            const y = s.substring(0, 4);
            const m = s.substring(4, 6);
            const d = s.substring(6, 8);
            return `${y}-${m}-${d}T00:00:00`;
        }
        if (s.includes('T')) return s;
        return `${s}T00:00:00`;
    };

    const todayStr = '2026-10-14T00:00:00';

    // 4. Preparar catálogo de productos para asegurar descripciones
    const productosMap = new Map();
    fibraOrders.forEach(o => {
        const sku = String(o.ItemCode || o.producto_sku || '').trim().toUpperCase();
        const desc = String(o.ItemName || o.producto_descripcion || '').trim().toUpperCase();
        if (sku && desc) {
            productosMap.set(sku, {
                producto_sku: sku,
                producto_descripcion: desc
            });
        }
    });

    const productosBatch = Array.from(productosMap.values());
    if (productosBatch.length > 0) {
        console.log(`3. Sincronizando ${productosBatch.length} productos en tabla 'productos'...`);
        const { error: errProd } = await supabase.from('productos').upsert(productosBatch, { onConflict: 'producto_sku' });
        if (errProd) {
            console.warn("Nota sobre upsert en productos:", errProd.message);
        }
    }

    // 5. Mapear al modelo físico de la tabla 'ordenes_fabricacion_fibra'
    const batchToInsert = fibraOrders.map(o => {
        const sku = String(o.ItemCode || o.producto_sku || '').trim().toUpperCase();
        const desc = String(o.ItemName || o.producto_descripcion || '').trim().toUpperCase();
        const cant = Number(o.PlannedQty) || 1;

        let moldInfo = moldMapBySku[sku];
        if (!moldInfo) {
            for (const item of moldMapByDesc) {
                if (item.keywords.some(k => desc.includes(k))) {
                    moldInfo = item;
                    break;
                }
            }
        }

        return {
            orden_fabricacion: String(o.DocNum),
            numero_pedido: String(o.U_Pedido || o.numero_pedido || o.DocNum || ''),
            producto_sku: sku,
            cantidad: cant,
            fecha_entrega_estimada: parseSapDate(o.DueDate),
            fecha_ideal_produccion: todayStr, // Fecha de hoy
            pendiente: true,
            cliente: String(o.CardName || o.Cliente || 'FIRPLAK S A').trim(),
            comentario: o.Comments || 'Cargado desde SAP SL',
            molde_sku: moldInfo ? moldInfo.molde_sku : null,
            molde_descripcion: moldInfo ? moldInfo.molde_descripcion : null,
            modificado_por: 'Sincronización SAP Fibra'
        };
    });

    console.log(`4. Insertando ${batchToInsert.length} órdenes en tabla física 'ordenes_fabricacion_fibra'...`);

    const { data: inserted, error: insertError } = await supabase
        .from('ordenes_fabricacion_fibra')
        .upsert(batchToInsert, { onConflict: 'orden_fabricacion' })
        .select('id, orden_fabricacion, producto_sku, cantidad');

    if (insertError) {
        console.error("❌ Error insertando en ordenes_fabricacion_fibra:", insertError);
        return;
    }

    console.log(`\n🎉 ¡CARGA EXITOSA! Se sincronizaron ${inserted ? inserted.length : batchToInsert.length} órdenes de Fibra en Supabase.`);

    // 6. Verificar nuevo total en la vista 'ordenes_fabricacion_fv'
    const { count: nuevoTotal, data: sampleView } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('*', { count: 'exact' })
        .order('fecha_ideal_produccion', { ascending: false })
        .limit(5);

    console.log(`\n📊 Nuevo Total de Órdenes en la vista Fibra (ordenes_fabricacion_fv): ${nuevoTotal}`);
    console.log("Muestra de órdenes recién agregadas en la vista:");
    console.table(sampleView.map(v => ({
        OF: v.orden_fabricacion,
        SKU: v.producto_sku,
        Descripcion: (v.producto_descripcion || '').substring(0, 30),
        Cantidad: v.cantidad,
        Programado: v.programado,
        FechaIdeal: v.fecha_ideal_produccion
    })));
}

cargarOrdenesFibraHoy();
