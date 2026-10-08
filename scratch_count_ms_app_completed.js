require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== COUNTING MS ORDERS COMPLETED IN SUPABASE (APP ONLY) ===");

    // Fetch all trazabilidad_ms records
    let allTraz = [];
    let page = 0;
    let pageSize = 10000;
    
    while (true) {
        const { data, error } = await supabase
            .from('query_trazabilidad_ms')
            .select('id, orden_fabricacion, orden_fabricacion_id, estado, cedi_fecha, empaque_fecha, transito_fecha, digitado_fecha, of_cantidad, producto_sku')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Error fetching trazabilidad page:", page, error);
            break;
        }
        if (!data || data.length === 0) break;
        allTraz = allTraz.concat(data);
        console.log(`Fetched page ${page}: ${data.length} records. Total so far: ${allTraz.length}`);
        if (data.length < pageSize) break;
        page++;
    }

    console.log(`Total trazabilidad_ms records retrieved: ${allTraz.length}`);

    // Group by orden_fabricacion
    const ofMap = {};

    allTraz.forEach(row => {
        const ofNum = String(row.orden_fabricacion || row.orden_fabricacion_id || '').trim();
        if (!ofNum) return;

        if (!ofMap[ofNum]) {
            ofMap[ofNum] = {
                of: ofNum,
                sku: row.producto_sku || '',
                totalPiezas: 0,
                piezasCompletadas: 0,
                ofCantidadReq: Number(row.of_cantidad) || 0,
                estados: {}
            };
        }

        ofMap[ofNum].totalPiezas++;
        const st = row.estado || 'SinEstado';
        ofMap[ofNum].estados[st] = (ofMap[ofNum].estados[st] || 0) + 1;

        // Check if piece finished all process steps (reached Cedi, Empaque, Transito, Digitado or has timestamp)
        const isFinished = ['Cedi', 'cedi', 'Empaque', 'empaque', 'Transito', 'Digitado', 'Completado'].includes(row.estado)
            || row.cedi_fecha != null
            || row.empaque_fecha != null;

        if (isFinished) {
            ofMap[ofNum].piezasCompletadas++;
        }
    });

    const totalOFsInTraz = Object.keys(ofMap).length;
    console.log(`Total distinct Ordenes de Fabricacion in trazabilidad_ms: ${totalOFsInTraz}`);

    const completadasEnApp = [];
    const enProcesoEnApp = [];

    Object.values(ofMap).forEach(item => {
        // Required cant is item.ofCantidadReq || item.totalPiezas
        const targetCant = item.ofCantidadReq > 0 ? item.ofCantidadReq : item.totalPiezas;

        if (item.piezasCompletadas >= targetCant && item.piezasCompletadas > 0) {
            completadasEnApp.push(item);
        } else {
            enProcesoEnApp.push(item);
        }
    });

    console.log(`\n================ RESULTADOS EXCLUSIVOS DE SUPABASE (MS) ================`);
    console.log(`🎯 Órdenes de Mármol Sintético COMPLETADAS en la App (Supabase): ${completadasEnApp.length}`);
    console.log(`⏳ Órdenes de Mármol Sintético EN PROCESO en la App (Supabase): ${enProcesoEnApp.length}`);

    if (completadasEnApp.length > 0) {
        console.log(`\nMuestra de primeras 15 órdenes COMPLETADAS en Supabase:`);
        console.table(completadasEnApp.slice(0, 15).map(x => ({
            OF: x.of,
            SKU: x.sku,
            CantRequerida: x.ofCantidadReq,
            TotalPiezasTrazadas: x.totalPiezas,
            PiezasTerminadasCedi: x.piezasCompletadas,
            Estados: JSON.stringify(x.estados)
        })));
    }
}

run();
