require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const apiKey = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';

async function analyzeCFAndSupabase() {
    console.log("=== COMPARANDO CF Y SUPABASE ===");

    // 1. Obtener órdenes de CF /ordenes_fibra/
    const res1 = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenes_fibra/', {
        headers: { 'api-key': apiKey }
    });
    const data1 = await res1.json();
    const cfFibra = Array.isArray(data1) ? data1 : (data1.response || []);

    // 2. Obtener órdenes de CF /ordenesliberadasms
    const res2 = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenesliberadasms', {
        headers: { 'api-key': apiKey }
    });
    const data2 = await res2.json();
    const cfAll = Array.isArray(data2) ? data2 : (data2.response || []);
    const cfAllFibra = cfAll.filter(r => {
        const sku = String(r.ItemCode || '').toUpperCase().trim();
        const desc = String(r.Itemname || r.ItemName || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || desc.includes('BAÑERA') || desc.includes('JACUZZI') || desc.includes('SPA ') || desc.includes('TINA ');
    });

    console.log("CF /ordenes_fibra/ count:", cfFibra.length);
    console.log("CF /ordenesliberadasms Fibra count:", cfAllFibra.length);

    // 3. Supabase órdenes
    const { data: supaOrders, error: supaErr } = await supabase
        .from('ordenes_fabricacion_fibra')
        .select('*');
    if (supaErr) {
        console.error("Error Supabase:", supaErr);
        return;
    }
    console.log("Supabase ordenes_fabricacion_fibra count:", supaOrders.length);

    const supaMap = new Map();
    supaOrders.forEach(o => supaMap.set(String(o.orden_fabricacion), o));

    // Revisar las 17 de /ordenes_fibra/
    console.log("\n--- Detalle de las 17 órdenes en CF /ordenes_fibra/ ---");
    cfFibra.forEach(o => {
        const docNum = String(o.orden_fabricacion);
        const inSupa = supaMap.get(docNum);
        console.log(`OF: ${docNum} | SKU: ${o.producto_sku} | CF FechaIdeal: ${o['fecha_ideal_producción']} | CF FechaEntrega: ${o.fecha_entrega_estimada} | En Supabase: ${inSupa ? 'SÍ (fecha_ideal: ' + inSupa.fecha_ideal_produccion + ', prog: ' + inSupa.programado + ')' : 'NO'}`);
    });

    // Revisar las 49 de /ordenesliberadasms Fibra
    console.log("\n--- Detalle de las 49 órdenes de Fibra en CF /ordenesliberadasms ---");
    const fechasFin = {};
    cfAllFibra.forEach(o => {
        const fFin = String(o['Fecha Finalización'] || '').substring(0, 10);
        fechasFin[fFin] = (fechasFin[fFin] || 0) + 1;
    });
    console.log("Distribución por Fecha Finalización (DueDate):", fechasFin);

    // Cuántas de las 49 están en Supabase
    let inSupaCount = 0;
    let notInSupaCount = 0;
    const notInSupa = [];
    cfAllFibra.forEach(o => {
        const docNum = String(o.DocNum);
        if (supaMap.has(docNum)) {
            inSupaCount++;
        } else {
            notInSupaCount++;
            notInSupa.push(o);
        }
    });
    console.log(`De las 49 órdenes de Fibra de SAP: ${inSupaCount} ya están en Supabase, ${notInSupaCount} NO están en Supabase.`);
    if (notInSupa.length > 0) {
        console.log("Órdenes de Fibra que no están en Supabase:", notInSupa.map(o => ({
            DocNum: o.DocNum,
            SKU: o.ItemCode,
            Desc: (o.Itemname || '').substring(0, 30),
            FechaFin: o['Fecha Finalización'],
            Cant: o['Cant.Planificada']
        })));
    }
}

analyzeCFAndSupabase().catch(console.error);
