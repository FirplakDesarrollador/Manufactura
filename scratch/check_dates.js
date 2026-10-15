require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    console.log("=== INSPECCIÓN DE ÓRDENES PARA MAÑANA (2026-10-15) ===");

    // 1. Cloudflare API /ordenes_fibra/
    const apiKey = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';
    let cfOrders = [];
    try {
        const resCf = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenes_fibra/', {
            headers: { 'api-key': apiKey }
        });
        if (resCf.ok) {
            const dataCf = await resCf.json();
            cfOrders = Array.isArray(dataCf) ? dataCf : (dataCf.response || []);
        }
    } catch(e) {
        console.error("Error CF:", e.message);
    }
    console.log("1. CF /ordenes_fibra/ total:", cfOrders.length);

    // 2. Cloudflare API /ordenesliberadasms
    let cfAll = [];
    try {
        const resAll = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenesliberadasms', {
            headers: { 'api-key': apiKey }
        });
        if (resAll.ok) {
            const dataAll = await resAll.json();
            cfAll = Array.isArray(dataAll) ? dataAll : (dataAll.response || []);
        }
    } catch(e) {
        console.error("Error CF all:", e.message);
    }
    const cfAllFibra = cfAll.filter(r => {
        const sku = String(r.ItemCode || '').toUpperCase().trim();
        const desc = String(r.Itemname || r.ItemName || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || desc.includes('BAÑERA') || desc.includes('JACUZZI') || desc.includes('SPA ') || desc.includes('TINA ');
    });
    console.log("2. CF /ordenesliberadasms Fibra:", cfAllFibra.length);

    // 3. SAP Service Layer ordenes_pendientes_clean
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const loginRes = await fetch(sapUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: process.env.SAP_COMPANY_DB, Password: process.env.SAP_PASSWORD, UserName: process.env.SAP_USERNAME })
    });
    const { SessionId } = await loginRes.json();
    const baseUrl = sapUrl.replace('/Login', '');

    const resSap = await fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
        headers: { 'Cookie': `B1SESSION=${SessionId}`, 'Prefer': 'odata.maxpagesize=1000' }
    });
    const { value: allSap } = await resSap.json();
    const sapFibra = (allSap || []).filter(r => {
        const sku = String(r.ItemCode || '').toUpperCase().trim();
        const desc = String(r.ItemName || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || desc.includes('BAÑERA') || desc.includes('JACUZZI') || desc.includes('SPA ') || desc.includes('TINA ');
    });
    console.log("3. SAP Service Layer Fibra:", sapFibra.length);

    // 4. Supabase ordenes_fabricacion_fibra
    const { data: supaFibra } = await supabase.from('ordenes_fabricacion_fibra').select('orden_fabricacion, fecha_ideal_produccion, fecha_entrega_estimada, pendiente, programado, cantidad');
    console.log("4. Supabase ordenes_fabricacion_fibra total:", supaFibra.length);

    // Revisar qué órdenes se cargaron hoy (2026-10-14)
    const hoyOrders = supaFibra.filter(o => o.fecha_ideal_produccion && o.fecha_ideal_produccion.includes('2026-10-14'));
    console.log("   Órdenes con fecha_ideal_produccion = 2026-10-14:", hoyOrders.length);

    // Revisar qué órdenes tienen fecha_ideal_produccion = 2026-10-15
    const mananaOrders = supaFibra.filter(o => o.fecha_ideal_produccion && o.fecha_ideal_produccion.includes('2026-10-15'));
    console.log("   Órdenes con fecha_ideal_produccion = 2026-10-15:", mananaOrders.length);

    // Mostrar qué órdenes de SAP / CF coinciden con las de hoy
    const hoyOfSet = new Set(hoyOrders.map(o => String(o.orden_fabricacion)));
    const sapInHoy = sapFibra.filter(o => hoyOfSet.has(String(o.DocNum)));
    console.log("   De las de SAP, cuántas están marcadas como 2026-10-14:", sapInHoy.length);
    console.log("   De las de SAP, cuántas NO están marcadas como 2026-10-14:", sapFibra.length - sapInHoy.length);

    // Imprimir las que NO están en hoy
    const sapNotInHoy = sapFibra.filter(o => !hoyOfSet.has(String(o.DocNum)));
    if (sapNotInHoy.length > 0) {
        console.log("\nÓrdenes de SAP que NO están en hoy (2026-10-14):");
        console.table(sapNotInHoy.map(o => ({
            DocNum: o.DocNum,
            SKU: o.ItemCode,
            Desc: (o.ItemName || '').substring(0, 30),
            PostDate: o.PostDate,
            DueDate: o.DueDate,
            PlannedQty: o.PlannedQty
        })));
    }
}

main().catch(console.error);
