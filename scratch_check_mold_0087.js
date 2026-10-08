require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== SEARCHING PMOL02-0087-000-0000 IN QUERY_MOLDES ===");

    const { data: moldes, error } = await supabase
        .from('query_moldes')
        .select('*')
        .or('tipo_molde_sku.eq.PMOL02-0087-000-0000,tipo_molde_sku.ilike.%0087%');

    console.log("Error:", error);
    console.log("Count found:", moldes?.length);
    if (moldes) {
        console.table(moldes.map(m => ({
            id: m.id,
            serial: m.serial,
            tipo_molde_sku: m.tipo_molde_sku,
            molde_sku: m.molde_sku,
            molde_descripcion: m.molde_descripcion,
            estado: m.estado
        })));
    }
}

run();
