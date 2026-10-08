require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== CHECKING PENDING MS ORDERS IN SUPABASE ===");

    // 1. Fetch pending orders from query_ordenes_fabricacion (or ordenes_fabricacion where pendiente > 0)
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .gt('pendiente', 0);

    if (errOf) {
        console.error("Error fetching query_ordenes_fabricacion:", errOf);
        return;
    }

    console.log(`Total Ordenes de Fabricacion PENDIENTES (pendiente > 0) en Supabase: ${ordenes ? ordenes.length : 0}`);

    if (!ordenes || ordenes.length === 0) return;

    // Get list of OF numbers
    const ofList = ordenes.map(o => String(o.orden_fabricacion || o.numero_pedido || o.id)).filter(Boolean);

    // Fetch trazabilidad records for these specific pending OFs
    const { data: trazRecords, error: errTraz } = await supabase
        .from('query_trazabilidad_ms')
        .select('id, orden_fabricacion, estado, cedi_fecha, empaque_fecha')
        .in('orden_fabricacion', ofList.slice(0, 500)); // batch fetch first 500

    if (errTraz) {
        console.error("Error fetching trazabilidad for pending OFs:", errTraz);
        return;
    }

    console.log(`Found ${trazRecords ? trazRecords.length : 0} trazabilidad records for pending OFs`);

    const trazByOf = {};
    (trazRecords || []).forEach(r => {
        const ofNum = String(r.orden_fabricacion).trim();
        if (!trazByOf[ofNum]) trazByOf[ofNum] = [];
        trazByOf[ofNum].push(r);
    });

    const completadasEnApp = [];
    const enProceso = [];
    const sinTrazabilidad = [];

    ordenes.forEach(ord => {
        const ofNum = String(ord.orden_fabricacion || ord.numero_pedido || ord.id).trim();
        const cantReq = Number(ord.cantidad) || Number(ord.cantPlanificada) || 1;
        const traz = trazByOf[ofNum] || [];

        if (traz.length === 0) {
            sinTrazabilidad.push({ OF: ofNum, SKU: ord.producto_sku, CantidadReq: cantReq });
            return;
        }

        const finishedCount = traz.filter(t => 
            ['Cedi', 'cedi', 'Empaque', 'empaque', 'Transito', 'Digitado', 'Completado'].includes(t.estado) ||
            t.cedi_fecha != null ||
            t.empaque_fecha != null
        ).length;

        if (finishedCount >= cantReq && finishedCount > 0) {
            completadasEnApp.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantidadReq: cantReq,
                PiezasTrazadas: traz.length,
                PiezasFinCedi: finishedCount
            });
        } else {
            enProceso.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantidadReq: cantReq,
                PiezasTrazadas: traz.length,
                PiezasFinCedi: finishedCount
            });
        }
    });

    console.log("\n================ CONTEO FINAL EXCLUSIVO DE SUPABASE ================");
    console.log(`✅ Órdenes PENDIENTES con 100% de proceso COMPLETADO en la App: ${completadasEnApp.length}`);
    if (completadasEnApp.length > 0) {
        console.table(completadasEnApp);
    } else {
        console.log("   (0 órdenes pendientes han completado todas sus piezas al 100% en CEDI/Empaque)");
    }

    console.log(`\n⏳ Órdenes pendientes EN PROCESO en la App: ${enProceso.length}`);
    if (enProceso.length > 0) console.table(enProceso.slice(0, 10));

    console.log(`\n🆕 Órdenes pendientes SIN INICIAR trazabilidad en la App: ${sinTrazabilidad.length}`);
    if (sinTrazabilidad.length > 0) console.table(sinTrazabilidad.slice(0, 5));
}

run();
