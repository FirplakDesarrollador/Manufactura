require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== INSPECTING QUERY_MOLDES ===");

    const { data: moldes, error } = await supabase
        .from('query_moldes')
        .select('*')
        .not('tipo_molde_sku', 'is', null)
        .limit(20);

    console.log("Error:", error);
    console.log("Count with non-null tipo_molde_sku:", moldes?.length);
    if (moldes && moldes.length > 0) {
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
