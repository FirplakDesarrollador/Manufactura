require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== CHECKING CLOSABLE MARBLE ORDERS (v2 with query_ views) ===");

    // 1. Fetch orders from Supabase query_ordenes_fabricacion
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*');

    if (errOf) {
        console.error("Error fetching query_ordenes_fabricacion:", errOf);
        return;
    }

    console.log(`Total query_ordenes_fabricacion in Supabase: ${ordenes ? ordenes.length : 0}`);

    // Fetch query_trazabilidad_ms
    const { data: trazabilidad, error: errTraz } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .limit(10000);

    if (errTraz) {
        console.error("Error fetching query_trazabilidad_ms:", errTraz);
        return;
    }

    console.log(`Total query_trazabilidad_ms records in Supabase: ${trazabilidad ? trazabilidad.length : 0}`);

    if (trazabilidad && trazabilidad.length > 0) {
        console.log("Sample trazabilidad record keys:", Object.keys(trazabilidad[0]));
        console.log("Sample trazabilidad estados:", [...new Set(trazabilidad.map(t => t.estado))]);
    }

    // Group trazabilidad by orden_fabricacion or orden_fabricacion_id
    const trazByOrden = {};
    (trazabilidad || []).forEach(t => {
        const ofKey = String(t.orden_fabricacion || t.orden_fabricacion_id || '');
        if (!trazByOrden[ofKey]) {
            trazByOrden[ofKey] = [];
        }
        trazByOrden[ofKey].push(t);
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
                console.log(`Loaded ${Object.keys(sapMap).length} marble orders from SAP Service Layer.`);
            }
        }
    } catch (sapError) {
        console.error("Exception connecting to SAP SL:", sapError);
    }

    // 3. Evaluate each order
    console.log("\n=== EVALUATING MARBLE ORDERS WITH YOUR CRON LOGIC ===");
    let ordenesCompletadas = 0;
    const closableOrders = [];
    const discrepancyOrders = [];
    const sapErrorOrMissing = [];
    const incompleteAppOrders = [];

    (ordenes || []).forEach(ord => {
        const ofNum = String(ord.orden_fabricacion || ord.numero_pedido || ord.id);
        const trazRecords = trazByOrden[ofNum] || trazByOrden[String(ord.id)] || [];
        const cantRequerida = Number(ord.cantidad) || 1;

        // Check completion in App:
        // A piece is complete if state is 'Cedi', 'Empaque', 'Completado' or has cedi_fecha / transito_fecha
        const cediCount = trazRecords.filter(t => 
            ['Cedi', 'cedi', 'Empaque', 'empaque', 'Completado', 'Digitado', 'Transito'].includes(t.estado) ||
            t.cedi_fecha != null ||
            t.digitado_fecha != null
        ).length;

        const isAppComplete = trazRecords.length > 0 && trazRecords.length >= cantRequerida && cediCount >= cantRequerida;

        const sapData = sapMap[ofNum];

        if (isAppComplete) {
            if (sapData) {
                const plannedQty = Number(sapData.PlannedQty !== undefined ? sapData.PlannedQty : sapData.cantidad) || cantRequerida;
                const cmpltQty = Number(sapData.CmpltQty !== undefined ? sapData.CmpltQty : (sapData.cantCompletada || 0)) || 0;
                const statusSap = sapData.Status || sapData.status || 'R';

                if (cmpltQty >= plannedQty) {
                    ordenesCompletadas++;
                    closableOrders.push({
                        OF: ofNum,
                        SKU: ord.producto_sku || ord.itemCode,
                        Cliente: ord.cliente || ord.nombreSN,
                        CantApp: trazRecords.length,
                        PlannedQty: plannedQty,
                        CmpltQty: cmpltQty,
                        StatusSAP: statusSap
                    });
                } else {
                    discrepancyOrders.push({
                        OF: ofNum,
                        SKU: ord.producto_sku,
                        CantApp: trazRecords.length,
                        PlannedQty: plannedQty,
                        CmpltQty: cmpltQty,
                        Discrepancia: `App (${trazRecords.length} pz) completa, pero SAP CmpltQty = ${cmpltQty} / ${plannedQty}`
                    });
                }
            } else {
                sapErrorOrMissing.push({
                    OF: ofNum,
                    SKU: ord.producto_sku,
                    CantApp: trazRecords.length,
                    Detalle: 'Orden completada en App pero no encontrada o con error en SAP SL'
                });
            }
        } else {
            incompleteAppOrders.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantRequerida: cantRequerida,
                CantTrazabilidad: trazRecords.length,
                CantTerminadas: cediCount
            });
        }
    });

    console.log(`\n================ RESULTADOS DE LA EVALUACIÓN ================`);
    console.log(`✅ 1. Órdenes listas para CERRAR ('ordenesCompletadas = ${ordenesCompletadas}'):`);
    if (closableOrders.length > 0) {
        console.table(closableOrders);
    } else {
        console.log("   (Ninguna cumple actualmente ambas condiciones al 100%)");
    }

    console.log(`\n⚠️ 2. Órdenes completadas en App PERO con discrepancia en SAP (${discrepancyOrders.length}):`);
    if (discrepancyOrders.length > 0) {
        console.table(discrepancyOrders.slice(0, 10));
    } else {
        console.log("   (Ninguna discrepancia detectada)");
    }

    console.log(`\n🚨 3. Órdenes completadas en App sin registro en SAP (${sapErrorOrMissing.length}):`);
    if (sapErrorOrMissing.length > 0) {
        console.table(sapErrorOrMissing.slice(0, 10));
    }

    console.log(`\n⏳ 4. Órdenes aún en proceso en App (${incompleteAppOrders.length})`);
    if (incompleteAppOrders.length > 0) {
        console.log("Muestra de las primeras 5 órdenes en proceso:");
        console.table(incompleteAppOrders.slice(0, 5));
    }
}

run();
