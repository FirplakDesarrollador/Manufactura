require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== CHECKING CLOSABLE MARBLE ORDERS ===");

    // 1. Fetch orders from Supabase ordenes_fabricacion
    const { data: ordenes, error: errOf } = await supabase
        .from('ordenes_fabricacion')
        .select('*');

    if (errOf) {
        console.error("Error fetching ordenes_fabricacion:", errOf);
        return;
    }

    console.log(`Total ordenes_fabricacion in Supabase: ${ordenes.length}`);

    // Fetch trazabilidad_ms
    const { data: trazabilidad, error: errTraz } = await supabase
        .from('trazabilidad_ms')
        .select('*');

    if (errTraz) {
        console.error("Error fetching trazabilidad_ms:", errTraz);
        return;
    }

    console.log(`Total trazabilidad_ms records in Supabase: ${trazabilidad.length}`);

    // Group trazabilidad by orden_fabricacion_id or orden_fabricacion
    const trazByOrdenId = {};
    trazabilidad.forEach(t => {
        if (!trazByOrdenId[t.orden_fabricacion_id]) {
            trazByOrdenId[t.orden_fabricacion_id] = [];
        }
        trazByOrdenId[t.orden_fabricacion_id].push(t);
    });

    // 2. Connect to SAP Service Layer
    let sapMap = {};
    try {
        console.log("\nLogging into SAP Service Layer...");
        const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
        const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
        const sapUser = process.env.SAP_USERNAME || 'manager';
        const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

        const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : `${sapUrl.replace(/\/$/, '')}/Login`;
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser })
        });

        if (loginRes.ok) {
            const loginData = await loginRes.json();
            const sessionId = loginData.SessionId;
            const baseUrl = loginUrl.replace('/Login', '');

            console.log("SAP Login successful. Querying ordenes_marmol_sl136...");
            const marmolRes = await fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Prefer': 'odata.maxpagesize=500'
                }
            });

            if (marmolRes.ok) {
                const marmolData = await marmolRes.json();
                (marmolData.value || []).forEach(row => {
                    const docNum = String(row.DocNum || row.orden_fabricacion || '');
                    sapMap[docNum] = row;
                });
                console.log(`Loaded ${Object.keys(sapMap).length} marble orders from SAP.`);
            } else {
                console.error("Failed to query SAP ordenes_marmol_sl136:", marmolRes.statusText);
            }
        } else {
            console.error("Failed to login to SAP SL:", loginRes.statusText);
        }
    } catch (sapError) {
        console.error("Exception connecting to SAP SL:", sapError);
    }

    // 3. Evaluate each order
    console.log("\n=== EVALUATING ORDERS WITH USER LOGIC ===");
    let ordenesCompletadas = 0;
    const closableOrders = [];
    const discrepancyOrders = [];
    const incompleteAppOrders = [];

    for (const ord of ordenes) {
        const ofNum = String(ord.orden_fabricacion || ord.numero_pedido || ord.id);
        const trazRecords = trazByOrdenId[ord.id] || [];
        const totalCant = ord.cantidad || 1;

        // Check if all process steps are complete for the required quantity
        // In MS, steps are: Pintura -> Vaciado -> Desmolde -> Pulido -> Reparacion/Empaque/CEDI
        // An order is complete in app if all pieces reached CEDI or Empaque (or estado = 'CEDI' / 'Empaque' / 'Completado')
        const cediEmpaqueCount = trazRecords.filter(t => ['CEDI', 'Empaque', 'Completado'].includes(t.estado)).length;
        const appComplete = trazRecords.length >= totalCant && trazRecords.every(t => ['CEDI', 'Empaque', 'Completado'].includes(t.estado));

        const sapData = sapMap[ofNum];

        if (appComplete) {
            console.log(`\nOrden ${ofNum} (ID: ${ord.id}): App status: COMPLETADA (${cediEmpaqueCount}/${totalCant} piezas en CEDI/Empaque)`);

            if (sapData) {
                const plannedQty = Number(sapData.PlannedQty !== undefined ? sapData.PlannedQty : sapData.cantidad) || totalCant;
                const cmpltQty = Number(sapData.CmpltQty !== undefined ? sapData.CmpltQty : 0) || 0;

                console.log(`   SAP Data found for OF ${ofNum}: PlannedQty=${plannedQty}, CmpltQty=${cmpltQty}, Status=${sapData.Status || sapData.status}`);

                if (cmpltQty >= plannedQty) {
                    console.log(`   --> CAN BE CLOSED IN SUPABASE! (Delivered ${cmpltQty} == Total ${plannedQty})`);
                    ordenesCompletadas++;
                    closableOrders.push({
                        id: ord.id,
                        orden_fabricacion: ofNum,
                        sku: ord.producto_sku,
                        cant: totalCant,
                        plannedQty,
                        cmpltQty,
                        sapStatus: sapData.Status
                    });
                } else {
                    console.log(`   --> DISCREPANCY! App complete, but SAP CmpltQty (${cmpltQty}) < PlannedQty (${plannedQty})`);
                    discrepancyOrders.push({
                        id: ord.id,
                        orden_fabricacion: ofNum,
                        sku: ord.producto_sku,
                        cant: totalCant,
                        plannedQty,
                        cmpltQty,
                        reason: `SAP entregado (${cmpltQty}) < planificado (${plannedQty})`
                    });
                }
            } else {
                console.log(`   --> SAP error/not found for OF ${ofNum}`);
            }
        } else {
            incompleteAppOrders.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                trazCount: trazRecords.length,
                cediCount: cediEmpaqueCount,
                cant: totalCant
            });
        }
    }

    console.log("\n================ SUMMARY ================");
    console.log(`Ordenes listas para cerrar ('ordenesCompletadas'): ${ordenesCompletadas}`);
    console.table(closableOrders);

    console.log(`\nOrdenes completadas en App pero con discrepancia en SAP (${discrepancyOrders.length}):`);
    console.table(discrepancyOrders);

    console.log(`\nOrdenes pendientes en App (${incompleteAppOrders.length})`);
}

run();
