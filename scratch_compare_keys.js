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
        .limit(1000);

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

    console.log("Sample OFs from Supabase trazabilidad_ms:", Object.keys(trazOfs).slice(0, 15));

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
            console.log("Sample row from SAP SL ordenes_marmol_sl136:", marmolData.value?.[0]);
            (marmolData.value || []).forEach(row => {
                const docNum = String(row.DocNum || row.orden_fabricacion || row.DocEntry || '').trim();
                sapMap[docNum] = row;
            });
        }
    }

    console.log("Sample OF keys from SAP SL:", Object.keys(sapMap).slice(0, 15));

    // Check intersection
    const trazKeys = new Set(Object.keys(trazOfs));
    const sapKeys = new Set(Object.keys(sapMap));
    const intersection = [...trazKeys].filter(x => sapKeys.has(x));
    console.log(`Matching OFs between Supabase and SAP SL: ${intersection.length}`);
    if (intersection.length > 0) {
        console.log("Matching OFs:", intersection.slice(0, 10));
        intersection.forEach(of => {
            console.log(`OF ${of}: Supabase traz count=${trazOfs[of].total}, cedi=${trazOfs[of].cedi} | SAP SL PlannedQty=${sapMap[of].PlannedQty}, CmpltQty=${sapMap[of].CmpltQty}, Status=${sapMap[of].Status}`);
        });
    }
}

run();
