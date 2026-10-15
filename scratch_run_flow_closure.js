require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarFlujoReal() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=========================================================================");
    console.log("            EJECUTANDO FLUJO EXACTO DE CIERRE DE ÓRDENES                ");
    console.log("=========================================================================\n");

    // 1. Paso 1: Ler_ordenes_supabase
    console.log("1. Leyendo órdenes pendientes desde Supabase (cedi > 0, pendiente = true, programado = 0)...");
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .gt('cedi', 0)
        .eq('pendiente', true)
        .eq('programado', 0);

    if (errOf) {
        console.error("❌ Error leyendo Supabase:", errOf);
        return;
    }

    const listaOrdenes = ordenes || [];
    console.log(`   Órdenes leídas que cumplen filtro inicial: ${listaOrdenes.length}`);

    // Paso 2: Inicializar ordenesCompletadas en 0
    let ordenesCompletadas = 0;

    // Paso 3: Compose (@length)
    const totalLeidas = listaOrdenes.length;

    // Filtrar condición en App: cantidad == cedi y 7 estaciones en 0
    const candidatas = listaOrdenes.filter(o => {
        const cant = Number(o.cantidad) || 0;
        const cedi = Number(o.cedi) || 0;
        return cant === cedi && cant > 0 &&
            Number(o.pintura || 0) === 0 &&
            Number(o.vaciado || 0) === 0 &&
            Number(o.pulido || 0) === 0 &&
            Number(o.acabado || 0) === 0 &&
            Number(o.empaque || 0) === 0 &&
            Number(o.digitado || 0) === 0 &&
            Number(o.transito || 0) === 0;
    });

    console.log(`2. Órdenes que cumplen condición de Planta (App): ${candidatas.length}\n`);

    if (candidatas.length === 0) {
        console.log("No hay órdenes pendientes que cumplan los criterios para cerrar.");
        return;
    }

    // Paso 4: Conectar a SAP Service Layer
    console.log("3. Conectando a SAP Service Layer...");
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

    if (!loginRes.ok) {
        console.error("❌ Error iniciando sesión en SAP:", loginRes.statusText);
        return;
    }

    const { SessionId } = await loginRes.json();
    const baseUrl = loginUrl.replace('/Login', '');
    console.log("   Sesión en SAP iniciada exitosamente.\n");

    // Consultar órdenes en lotes pequeños de 10 con maxpagesize para asegurar que SAP no trunque
    const sapMap = {};
    const batchSize = 10;
    const docNums = candidatas.map(o => Number(o.orden_fabricacion)).filter(n => !isNaN(n) && n > 0);

    console.log(`4. Consultando ${docNums.length} órdenes en SAP Service Layer...`);
    for (let i = 0; i < docNums.length; i += batchSize) {
        const slice = docNums.slice(i, i + batchSize);
        const filterStr = slice.map(num => `DocumentNumber eq ${num}`).join(' or ');
        try {
            const url = `${baseUrl}/ProductionOrders?$select=DocumentNumber,ProductionOrderStatus,PlannedQuantity,CompletedQuantity&$filter=${filterStr}`;
            const res = await fetch(url, {
                headers: {
                    'Cookie': `B1SESSION=${SessionId}`,
                    'Prefer': 'odata.maxpagesize=50'
                }
            });
            if (res.ok) {
                const json = await res.json();
                (json.value || []).forEach(po => {
                    sapMap[String(po.DocumentNumber)] = po;
                });
            } else {
                console.warn(`Lote ${i} error: ${res.statusText}`);
            }
        } catch (e) {
            console.error(`Error en lote ${i}:`, e.message);
        }
    }

    console.log(`   Órdenes encontradas en SAP: ${Object.keys(sapMap).length} de ${docNums.length}\n`);

    // 5. Evaluar y cerrar en Supabase
    const cerradas = [];
    const faltanEnSAP = [];
    const noEncontradasSAP = [];

    const getFechaColombiaISO = () => {
        const d = new Date();
        const colombiaTime = new Date(d.getTime() - (5 * 60 * 60 * 1000));
        return colombiaTime.toISOString();
    };

    console.log("5. Evaluando condición SAP y aplicando cierre...");
    for (const ord of candidatas) {
        const ofNum = String(ord.orden_fabricacion).trim();
        const sapPO = sapMap[ofNum];

        if (!sapPO) {
            noEncontradasSAP.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                producto_sku: ord.producto_sku,
                cantidad: ord.cantidad,
                cedi: ord.cedi
            });
            continue;
        }

        const pld = Number(sapPO.PlannedQuantity) || Number(ord.cantidad) || 0;
        const cmplt = Number(sapPO.CompletedQuantity) || 0;

        // Condition_3: cedi == cantidad en SAP
        if (cmplt >= pld && pld > 0) {
            // Cerrar_orden_Supabase
            const { error: errUpdate } = await supabase
                .from('ordenes_fabricacion')
                .update({
                    pendiente: false,
                    fecha_entrega_real: getFechaColombiaISO(),
                    modificado_por: 'Flujo de PowerAutomate'
                })
                .eq('id', ord.id);

            if (errUpdate) {
                console.error(`Error actualizando orden ${ofNum} en Supabase:`, errUpdate.message);
            } else {
                ordenesCompletadas++;
                cerradas.push({
                    id: ord.id,
                    orden_fabricacion: ofNum,
                    producto_sku: ord.producto_sku,
                    cantidad: ord.cantidad,
                    cedi: ord.cedi,
                    sapCompleted: cmplt,
                    sapPlanned: pld,
                    sapStatus: sapPO.ProductionOrderStatus
                });
            }
        } else {
            faltanEnSAP.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                producto_sku: ord.producto_sku,
                cantidadApp: ord.cantidad,
                cediApp: ord.cedi,
                sapPlanned: pld,
                sapCompleted: cmplt,
                faltantesSAP: pld - cmplt,
                sapStatus: sapPO.ProductionOrderStatus
            });
        }
    }

    console.log("\n=========================================================================");
    console.log("                  INFORME DE EJECUCIÓN DEL FLUJO                         ");
    console.log("=========================================================================");
    console.log(`\n🎉 Total órdenes cerradas exitosamente ('ordenesCompletadas'): ${ordenesCompletadas}`);
    if (cerradas.length > 0) {
        console.table(cerradas.slice(0, 15));
        if (cerradas.length > 15) {
            console.log(`   (...y ${cerradas.length - 15} órdenes más cerradas)`);
        }
    }

    if (faltanEnSAP.length > 0) {
        console.log(`\n⚠️ Novedades: Faltan piezas por entregar en SAP (${faltanEnSAP.length} órdenes):`);
        console.table(faltanEnSAP);
    }

    if (noEncontradasSAP.length > 0) {
        console.log(`\n🚨 Órdenes no localizadas en SAP SL (${noEncontradasSAP.length} órdenes):`);
        console.table(noEncontradasSAP.slice(0, 10));
    }

    // Verificar nuevo total pendiente en Supabase
    const { count: pendientesRestantes } = await supabase
        .from('ordenes_fabricacion')
        .select('*', { count: 'exact', head: true })
        .eq('pendiente', true);

    console.log(`\n📉 Órdenes que permanecen como pendientes en Supabase: ${pendientesRestantes}`);
}

ejecutarFlujoReal();
