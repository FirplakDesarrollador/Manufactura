require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== INSPECTING QUERY_ORDENES_FABRICACION FOR CEDI AND OFs 2259728, 2259727 ===");

    const { data: ordenes, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .in('orden_fabricacion', ['2259728', '2259727']);

    console.log("Error:", error);
    console.log("OFs 2259728 & 2259727 data:", JSON.stringify(ordenes, null, 2));

    // Also check orders where cedi >= cantidad or cedi > 0
    const { data: cediDone } = await supabase
        .from('query_ordenes_fabricacion')
        .select('id, orden_fabricacion, producto_sku, cantidad, programado, cedi, empaque, vaciado, pintura')
        .gt('cedi', 0)
        .limit(10);

    console.log("\nSample orders with CEDI > 0:");
    console.table(cediDone);
}

run();
