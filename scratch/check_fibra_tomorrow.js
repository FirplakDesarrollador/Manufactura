require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFibraTomorrow() {
    console.log("=== REVISANDO ÓRDENES DE FIBRA PARA MAÑANA (2026-10-15) ===");
    
    // 1. Consultar ordenes_fibra en Cloudflare API
    const apiKey = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';
    
    let cfFibra = [];
    try {
        const res1 = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenes_fibra/', {
            headers: { 'api-key': apiKey }
        });
        if (res1.ok) {
            const data1 = await res1.json();
            cfFibra = Array.isArray(data1) ? data1 : (data1.response || []);
        }
    } catch(e) {
        console.log("Error cf /ordenes_fibra/:", e.message);
    }
    console.log("Órdenes directas en /ordenes_fibra/:", cfFibra.length);
    if (cfFibra.length > 0) {
        console.log("Muestra /ordenes_fibra/:", JSON.stringify(cfFibra.slice(0, 3), null, 2));
    }

    // 2. Consultar ordenesliberadasms en Cloudflare API
    let cfAll = [];
    try {
        const res2 = await fetch('https://toner-villages-acoustic-colony.trycloudflare.com/ordenesliberadasms', {
            headers: { 'api-key': apiKey }
        });
        if (res2.ok) {
            const data2 = await res2.json();
            cfAll = Array.isArray(data2) ? data2 : (data2.response || []);
        }
    } catch(e) {
        console.log("Error cf /ordenesliberadasms:", e.message);
    }
    console.log("Total órdenes liberadas en Cloudflare:", cfAll.length);

    const fibraFromAll = cfAll.filter(r => {
        const sku = String(r.ItemCode || r.producto_sku || '').toUpperCase().trim();
        const desc = String(r.ItemName || r.Itemname || r.producto_descripcion || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || 
               desc.includes('BAÑERA') || 
               desc.includes('JACUZZI') || 
               desc.includes('SPA ') || 
               desc.includes('TINA ');
    });
    console.log("Órdenes de fibra filtradas de /ordenesliberadasms:", fibraFromAll.length);
    if (fibraFromAll.length > 0) {
        console.log("Muestra fibra de all:", JSON.stringify(fibraFromAll.slice(0, 3), null, 2));
    }

    // 3. Revisar qué hay en Supabase ordenes_fabricacion_fibra
    const { data: supaFibra, count: totalSupa } = await supabase
        .from('ordenes_fabricacion_fibra')
        .select('*', { count: 'exact' });
    console.log(`\nEn Supabase 'ordenes_fabricacion_fibra' hay actualmente: ${totalSupa} órdenes.`);

    // Agrupar por fecha_ideal_produccion
    const byFechaIdeal = {};
    (supaFibra || []).forEach(o => {
        const f = String(o.fecha_ideal_produccion || 'null').substring(0, 10);
        byFechaIdeal[f] = (byFechaIdeal[f] || 0) + 1;
    });
    console.log("Distribución en Supabase por fecha_ideal_produccion:", byFechaIdeal);
}

checkFibraTomorrow();
