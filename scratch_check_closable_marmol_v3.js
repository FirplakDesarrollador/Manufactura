require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // Fetch unique orden_fabricacion from query_trazabilidad_ms
    const { data: traz } = await supabase
        .from('query_trazabilidad_ms')
        .select('orden_fabricacion, estado, cedi_fecha, empaque_fecha')
        .limit(10000);

    const trazOfs = {};
    traz.forEach(t => {
        const of = String(t.orden_fabricacion || '').trim();
        if (!of) return;
        if (!trazOfs[of]) trazOfs[of] = { total: 0, cedi: 0, estados: {} };
        trazOfs[of].total++;
        const st = t.estado || 'SinEstado';
        trazOfs[of].estados[st] = (trazOfs[of].estados[st] || 0) + 1;
        if (['Cedi', 'Empaque', 'Completado'].includes(t.estado) || t.cedi_fecha) {
            trazOfs[of].cedi++;
        }
    });

    console.log(`Unique OFs in query_trazabilidad_ms: ${Object.keys(trazOfs).length}`);

    // Fetch SAP SL marble orders
    let sapMap = {};
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
        const marmolRes = await fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
            headers: { 'Cookie': `B1SESSION=${sessionId}`, 'Prefer': 'odata.maxpagesize=500' }
        });
        if (marmolRes.ok) {
            const marmolData = await marmolRes.json();
            (marmolData.value || []).forEach(row => {
                const docNum = String(row.DocNum || row.orden_fabricacion || '').trim();
                sapMap[docNum] = row;
            });
        }
    }

    console.log(`Unique OFs in SAP SL: ${Object.keys(sapMap).length}`);

    // Check matches
    const closable = [];
    const discrepancies = [];
    const inProgress = [];

    Object.keys(trazOfs).forEach(of => {
        const stats = trazOfs[of];
        const sap = sapMap[of];

        if (sap) {
            const plannedQty = Number(sap.PlannedQty !== undefined ? sap.PlannedQty : sap.cantidad) || 1;
            const cmpltQty = Number(sap.CmpltQty !== undefined ? sap.CmpltQty : 0) || 0;
            const isAppDone = stats.cedi >= plannedQty;

            if (isAppDone) {
                if (cmpltQty >= plannedQty) {
                    closable.push({
                        OF: of,
                        SKU: sap.ItemCode || sap.producto_sku,
                        Description: sap.ItemName || sap.producto_descripcion,
                        AppPiezasCedi: stats.cedi,
                        SAPPlanned: plannedQty,
                        SAPCompleted: cmpltQty,
                        SAPStatus: sap.Status
                    });
                } else {
                    discrepancies.push({
                        OF: of,
                        SKU: sap.ItemCode || sap.producto_sku,
                        AppPiezasCedi: stats.cedi,
                        SAPPlanned: plannedQty,
                        SAPCompleted: cmpltQty,
                        Message: `Completada en App (${stats.cedi} pz en CEDI), pero SAP solo registra ${cmpltQty}/${plannedQty}`
                    });
                }
            } else {
                inProgress.push({
                    OF: of,
                    SKU: sap.ItemCode || sap.producto_sku,
                    AppPiezasCedi: stats.cedi,
                    AppPiezasTotal: stats.total,
                    SAPPlanned: plannedQty,
                    SAPCompleted: cmpltQty
                });
            }
        }
    });

    console.log("\n================ RESULTADOS REALES DE MÁRMOL SINTÉTICO ================");
    console.log(`✅ 1. Órdenes de Mármol que SE CERRARÍAN (Cumplen App + SAP 100%): ${closable.length}`);
    if (closable.length > 0) console.table(closable);

    console.log(`\n⚠️ 2. Órdenes con DISCREPANCIA (App 100%, pero SAP incompleto): ${discrepancies.length}`);
    if (discrepancies.length > 0) console.table(discrepancies);

    console.log(`\n⏳ 3. Órdenes aún en proceso de producción: ${inProgress.length}`);
    if (inProgress.length > 0) console.table(inProgress.slice(0, 10));
}

run();
