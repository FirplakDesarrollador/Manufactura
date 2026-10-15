require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runRealAudit() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== AUDITORÍA REAL DE ÓRDENES CERRABLES (CONSULTANDO SAP PRODUCTION ORDERS) ===");

    // 1. Obtener órdenes de Supabase
    const { data: ordenes, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*');

    if (error) {
        console.error("Error cargando Supabase:", error);
        return;
    }

    const pendientes = (ordenes || []).filter(o => o.pendiente === true || Number(o.pendiente) > 0);
    const pasosProceso = [
        'pintura', 'vaciado', 'desgelcada', 'estanteria', 
        'pulido', 'acabado', 'reparacion', 'reparacion_larga', 
        'saldo', 'destruccion', 'empaque', 'digitado', 'transito'
    ];

    // Condición en App: Pasos en 0 y cedi == cantidad
    const cumplenApp = pendientes.filter(ord => {
        const cant = Number(ord.cantidad) || 0;
        const cedi = Number(ord.cedi) || 0;
        const pasosEnCero = pasosProceso.every(p => (Number(ord[p]) || 0) === 0);
        return pasosEnCero && cant > 0 && cedi === cant;
    });

    console.log(`1. Total órdenes pendientes en Supabase: ${pendientes.length}`);
    console.log(`2. Órdenes que cumplen en la App [Pasos en 0 y CEDI == Cantidad]: ${cumplenApp.length}`);

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

    // 3. Consultar las 416 órdenes en lotes de 40 contra ProductionOrders de SAP
    console.log("3. Consultando ProductionOrders en SAP SL en lotes...");
    const sapDataMap = {};
    const batchSize = 30;
    const docNums = cumplenApp.map(o => Number(o.orden_fabricacion)).filter(n => !isNaN(n) && n > 0);

    for (let i = 0; i < docNums.length; i += batchSize) {
        const slice = docNums.slice(i, i + batchSize);
        const filterStr = slice.map(num => `DocumentNumber eq ${num}`).join(' or ');
        try {
            const res = await fetch(`${baseUrl}/ProductionOrders?$select=DocumentNumber,ProductionOrderStatus,PlannedQuantity,CompletedQuantity&$filter=${filterStr}`, {
                headers: { 'Cookie': `B1SESSION=${SessionId}` }
            });
            if (res.ok) {
                const json = await res.json();
                (json.value || []).forEach(po => {
                    sapDataMap[String(po.DocumentNumber)] = po;
                });
            } else {
                console.error(`Error en lote ${i}:`, res.statusText);
            }
        } catch (err) {
            console.error(`Excepción en lote ${i}:`, err.message);
        }
    }

    console.log(`Total órdenes encontradas directamente en SAP ProductionOrders: ${Object.keys(sapDataMap).length}`);

    // 4. Evaluar condición exacta:
    // Si cedi en SAP = cantidad en SAP (CompletedQuantity >= PlannedQuantity):
    //    Cerrar la orden en Supabase -> Incrementar 'ordenesCompletadas'
    // Sino: Notificar que faltan piezas en SAP
    // Sino: Notificar error en SAP

    let ordenesCompletadas = 0;
    const listosParaCerrar = [];
    const faltanEnSAP = [];
    const noExisteEnSAP = [];

    cumplenApp.forEach(ord => {
        const ofNum = String(ord.orden_fabricacion).trim();
        const sapPO = sapDataMap[ofNum];

        if (!sapPO) {
            noExisteEnSAP.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantidadApp: ord.cantidad,
                CediApp: ord.cedi
            });
            return;
        }

        const pld = Number(sapPO.PlannedQuantity) || Number(ord.cantidad) || 0;
        const cmplt = Number(sapPO.CompletedQuantity) || 0;

        if (cmplt >= pld && pld > 0) {
            ordenesCompletadas++;
            listosParaCerrar.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantApp: ord.cantidad,
                CediApp: ord.cedi,
                SAPPld: pld,
                SAPCmplt: cmplt,
                StatusSAP: sapPO.ProductionOrderStatus
            });
        } else {
            faltanEnSAP.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantApp: ord.cantidad,
                CediApp: ord.cedi,
                SAPPld: pld,
                SAPCmplt: cmplt,
                Faltantes: pld - cmplt,
                StatusSAP: sapPO.ProductionOrderStatus
            });
        }
    });

    console.log("\n==================== RESULTADO DEFINITIVO ====================");
    console.log(`🎯 Órdenes que CUMPLEN TODA LA CONDICIÓN para ser cerradas ('ordenesCompletadas'): ${ordenesCompletadas}`);
    console.log(`⚠️ Órdenes que cumplen en App pero faltan piezas en SAP: ${faltanEnSAP.length}`);
    console.log(`🚨 Órdenes que no se encontraron en SAP: ${noExisteEnSAP.length}`);

    // Clasificación por estado en SAP de las que cumplen:
    const cerradasEnSAP = listosParaCerrar.filter(o => o.StatusSAP === 'boposClosed').length;
    const liberadasEnSAP = listosParaCerrar.filter(o => o.StatusSAP === 'boposReleased').length;
    console.log(`   - De las ${ordenesCompletadas} listas para cerrar:`);
    console.log(`     * Ya cerradas en SAP (boposClosed): ${cerradasEnSAP}`);
    console.log(`     * Liberadas con entrega 100% en SAP (boposReleased): ${liberadasEnSAP}`);

    if (faltanEnSAP.length > 0) {
        console.log("\nEjemplo de órdenes donde faltan piezas en SAP:");
        console.table(faltanEnSAP.slice(0, 5));
    }
}

runRealAudit();
