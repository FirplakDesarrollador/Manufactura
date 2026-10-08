require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CHECKING OF 2260322 & 2260248 IN SUPABASE ===");

    // 1. Query query_ordenes_fabricacion
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .in('orden_fabricacion', ['2260322', '2260248']);

    console.log("Error OF:", errOf);
    console.log("OFs found:", ordenes?.length);
    if (ordenes && ordenes.length > 0) {
        console.log("OF Data:", JSON.stringify(ordenes, null, 2));
    }

    // Also check ordenes_fabricacion directly
    const { data: ofDirect, error: errDirect } = await supabase
        .from('ordenes_fabricacion')
        .select('*')
        .in('orden_fabricacion', ['2260322', '2260248']);

    console.log("Direct ordenes_fabricacion:", JSON.stringify(ofDirect, null, 2));

    // 2. Query query_moldes for related mold_skus
    if (ordenes && ordenes.length > 0) {
        for (const ord of ordenes) {
            console.log(`\nChecking moldes for OF ${ord.orden_fabricacion}:`);
            console.log(`   producto_sku: "${ord.producto_sku}"`);
            console.log(`   molde_sku: "${ord.molde_sku}"`);
            console.log(`   producto_descripcion: "${ord.producto_descripcion}"`);
            console.log(`   molde_descripcion: "${ord.molde_descripcion}"`);

            const skuToSearch = ord.molde_sku || ord.producto_sku;
            const { data: moldes, error: errM } = await supabase
                .from('query_moldes')
                .select('*')
                .eq('molde_sku', skuToSearch);

            console.log(`   Moldes matching '${skuToSearch}':`, moldes?.length);
            if (moldes && moldes.length > 0) {
                console.log(`   Sample mold:`, JSON.stringify(moldes[0], null, 2));
            }
        }
    }
}

run();
