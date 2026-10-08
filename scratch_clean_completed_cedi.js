require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== CHECKING ORDERS WITH 100% CEDI DELIVERIES IN SUPABASE ===");

    // Fetch orders from query_ordenes_fabricacion where cedi > 0 and pendiente = true
    const { data: ordenes, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('id, orden_fabricacion, producto_sku, cantidad, cedi, pendiente')
        .eq('pendiente', true);

    if (error) {
        console.error("Error fetching ordenes:", error);
        return;
    }

    console.log(`Total active pending orders in Supabase: ${ordenes ? ordenes.length : 0}`);

    const completadasEnCedi = (ordenes || []).filter(o => {
        const cantReq = Number(o.cantidad) || 1;
        const cediCount = Number(o.cedi) || 0;
        return cediCount >= cantReq && cantReq > 0;
    });

    console.log(`🎯 Orders with 100% CEDI delivery currently marked as pendiente = true: ${completadasEnCedi.length}`);
    if (completadasEnCedi.length > 0) {
        console.log("Sample 10 orders:");
        console.table(completadasEnCedi.slice(0, 10));
    }
}

run();
