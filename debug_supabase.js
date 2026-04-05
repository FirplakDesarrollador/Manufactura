const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugData() {
    console.log("--- DEBUG: ORDENES ---");
    const { data: ordenes, error: errO } = await supabase.from('query_ordenes_fabricacion').select('*').limit(5);
    if (errO) console.error(errO);
    else ordenes.forEach(o => console.log(`OF: ${o.orden_fabricacion} | SKU: ${o.sku} | ProdSKU: ${o.producto_sku}`));

    console.log("\n--- DEBUG: MOLDES ---");
    const { data: moldes, error: errM } = await supabase.from('query_moldes').select('*').limit(5);
    if (errM) console.error(errM);
    else moldes.forEach(m => console.log(`Serial: ${m.serial} | MoldeSKU: ${m.molde_sku} | Estado: ${m.estado}`));
}

debugData();
