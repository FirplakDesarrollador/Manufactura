require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';

async function syncFibraManana() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=========================================================================");
    console.log("   ACTUALIZANDO ÓRDENES DE FIBRA DE VIDRIO PARA MAÑANA (2026-10-15)      ");
    console.log("=========================================================================\n");

    const targetDateStr = '2026-10-15T00:00:00';

    // 1. Obtener mapeo de moldes existentes en Supabase
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
            });
        }
    });

    // 2. Obtener órdenes de Cloudflare API /ordenes_fibra/ y /ordenesliberadasms
    console.log("1. Consultando órdenes liberadas en Cloudflare API / SAP...");
    const [resFibra, resAll] = await Promise.all([
        fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenes_fibra/', { headers: { 'api-key': apiKey } }),
        fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenesliberadasms', { headers: { 'api-key': apiKey } })
    ]);

    const dataFibra = await resFibra.json();
    const dataAll = await resAll.json();

    const cfFibra = Array.isArray(dataFibra) ? dataFibra : (dataFibra.response || []);
    const cfAll = Array.isArray(dataAll) ? dataAll : (dataAll.response || []);

    const sapFibraAll = cfAll.filter(r => {
        const sku = String(r.ItemCode || '').toUpperCase().trim();
        const desc = String(r.Itemname || r.ItemName || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || desc.includes('BAÑERA') || desc.includes('JACUZZI') || desc.includes('SPA ') || desc.includes('TINA ');
    });

    console.log(`- Órdenes directas en /ordenes_fibra/: ${cfFibra.length}`);
    console.log(`- Órdenes de Fibra en /ordenesliberadasms: ${sapFibraAll.length}`);

    // Helper para fechas YYYYMMDD o ISO -> YYYY-MM-DDTHH:mm:ss
    const parseSapDate = (val) => {
        if (!val) return null;
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

    // 3. Crear mapa consolidado por orden_fabricacion
    const ordersMap = new Map();

    // A) Cargar todas las órdenes pendientes actuales de Supabase para asegurar que se reprogramen para mañana
    const { data: pendingOrders } = await supabase
        .from('ordenes_fabricacion_fibra')
        .select('*')
        .eq('pendiente', true);

    console.log(`- Órdenes pendientes actuales en Supabase: ${pendingOrders ? pendingOrders.length : 0}`);
    (pendingOrders || []).forEach(o => {
        const copy = { ...o };
        delete copy.id;
        copy.fecha_ideal_produccion = targetDateStr;
        copy.pendiente = true;
        copy.modificado_por = 'Sincronización SAP Fibra - Reprogramación Día Siguiente';
        ordersMap.set(String(o.orden_fabricacion), copy);
    });

    // B) Consolidar con las 49 órdenes de Fibra de /ordenesliberadasms
    sapFibraAll.forEach(o => {
        const docNum = String(o.DocNum);
        const sku = String(o.ItemCode || '').trim().toUpperCase();
        const desc = String(o.Itemname || o.ItemName || '').trim().toUpperCase();
        const cant = Number(o['Cant.Planificada'] || o.PlannedQty) || 1;

        let moldInfo = moldMapBySku[sku];
        if (!moldInfo) {
            for (const item of moldMapByDesc) {
                if (item.keywords.some(k => desc.includes(k))) {
                    moldInfo = item;
                    break;
                }
            }
        }

        const existing = ordersMap.get(docNum);
        ordersMap.set(docNum, {
            ...(existing || {}),
            orden_fabricacion: docNum,
            numero_pedido: String(o.U_Pedido || o.numero_pedido || (existing ? existing.numero_pedido : '') || docNum),
            producto_sku: sku,
            cantidad: cant,
            fecha_entrega_estimada: parseSapDate(o['Fecha Finalización'] || o.DueDate || (existing ? existing.fecha_entrega_estimada : null)),
            fecha_ideal_produccion: targetDateStr,
            pendiente: true,
            cliente: String(o.CardName || o.Cliente || (existing ? existing.cliente : '') || 'FIRPLAK S A').trim(),
            comentario: o.Comments || (existing ? existing.comentario : 'Cargado desde SAP SL'),
            molde_sku: moldInfo ? moldInfo.molde_sku : (existing ? existing.molde_sku : null),
            molde_descripcion: moldInfo ? moldInfo.molde_descripcion : (existing ? existing.molde_descripcion : null),
            modificado_por: 'Sincronización SAP Fibra'
        });
    });

    // C) Enriquecer con /ordenes_fibra/ (componentes, comentarios detallados, etc.)
    cfFibra.forEach(o => {
        const docNum = String(o.orden_fabricacion);
        const sku = String(o.producto_sku || '').trim().toUpperCase();
        const desc = String(o.producto_descripcion || '').trim().toUpperCase();
        const cant = Number(o.cantidad) || 1;

        let moldInfo = moldMapBySku[sku];
        if (!moldInfo) {
            for (const item of moldMapByDesc) {
                if (item.keywords.some(k => desc.includes(k))) {
                    moldInfo = item;
                    break;
                }
            }
        }

        const existing = ordersMap.get(docNum);
        ordersMap.set(docNum, {
            ...(existing || {}),
            orden_fabricacion: docNum,
            numero_pedido: String(o.numero_pedido || (existing ? existing.numero_pedido : '') || docNum),
            producto_sku: sku,
            cantidad: cant,
            fecha_entrega_estimada: parseSapDate(o.fecha_entrega_estimada || (existing ? existing.fecha_entrega_estimada : null)),
            fecha_ideal_produccion: targetDateStr,
            pendiente: true,
            cliente: String(o.cliente || (existing ? existing.cliente : '') || 'FIRPLAK S A').trim(),
            comentario: o.comentarios || (existing ? existing.comentario : 'Cargado desde SAP SL'),
            componentes: o.componentes || (existing ? existing.componentes : null),
            molde_sku: moldInfo ? moldInfo.molde_sku : (existing ? existing.molde_sku : null),
            molde_descripcion: moldInfo ? moldInfo.molde_descripcion : (existing ? existing.molde_descripcion : null),
            modificado_por: 'Sincronización SAP Fibra'
        });
    });

    const finalBatch = Array.from(ordersMap.values());
    console.log(`\n2. Total de órdenes consolidadas para programar el 2026-10-15: ${finalBatch.length}`);

    // 4. Actualizar tabla 'productos' en Supabase para evitar descripciones vacías en la vista
    const productosMap = new Map();
    sapFibraAll.forEach(o => {
        const sku = String(o.ItemCode || '').trim().toUpperCase();
        const desc = String(o.Itemname || o.ItemName || '').trim().toUpperCase();
        if (sku && desc) {
            productosMap.set(sku, { producto_sku: sku, producto_descripcion: desc });
        }
    });
    cfFibra.forEach(o => {
        const sku = String(o.producto_sku || '').trim().toUpperCase();
        const desc = String(o.producto_descripcion || '').trim().toUpperCase();
        if (sku && desc) {
            productosMap.set(sku, { producto_sku: sku, producto_descripcion: desc });
        }
    });

    const productosBatch = Array.from(productosMap.values());
    if (productosBatch.length > 0) {
        console.log(`3. Sincronizando catálogo de ${productosBatch.length} productos...`);
        try {
            await supabase.from('productos').upsert(productosBatch, { onConflict: 'producto_sku' });
        } catch(e) {
            console.warn("Nota productos:", e.message);
        }
    }

    // 5. Upsert en 'ordenes_fabricacion_fibra'
    console.log(`4. Guardando ${finalBatch.length} órdenes en 'ordenes_fabricacion_fibra' con fecha_ideal = 2026-10-15...`);
    const BATCH_SIZE = 40;
    let totalUpserted = 0;

    const cleanFinalBatch = finalBatch.map(o => {
        const c = { ...o };
        delete c.id;
        return c;
    });

    for (let i = 0; i < cleanFinalBatch.length; i += BATCH_SIZE) {
        const chunk = cleanFinalBatch.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
            .from('ordenes_fabricacion_fibra')
            .upsert(chunk, { onConflict: 'orden_fabricacion' })
            .select('orden_fabricacion');

        if (error) {
            console.error(`❌ Error en lote ${i}:`, error);
        } else {
            totalUpserted += (data ? data.length : chunk.length);
        }
    }

    console.log(`\n🎉 ¡ACTUALIZACIÓN COMPLETADA! ${totalUpserted} órdenes asignadas al día 2026-10-15.`);

    // 6. Verificar en la vista 'ordenes_fabricacion_fv'
    const { data: checkData, count } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('*', { count: 'exact' })
        .eq('fecha_ideal_produccion', targetDateStr);

    console.log(`\n📊 Total órdenes en la vista ordenes_fabricacion_fv con fecha_ideal = 2026-10-15: ${checkData ? checkData.length : 0}`);
    if (checkData && checkData.length > 0) {
        console.table(checkData.slice(0, 10).map(v => ({
            OF: v.orden_fabricacion,
            SKU: v.producto_sku,
            Descripcion: (v.producto_descripcion || '').substring(0, 30),
            Cantidad: v.cantidad,
            Programado: v.programado,
            Molde: (v.molde_descripcion || '').substring(0, 20),
            FechaIdeal: v.fecha_ideal_produccion
        })));
    }
}

syncFibraManana().catch(console.error);
