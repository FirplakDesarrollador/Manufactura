require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CHECKING QUERY_MOLDES FOR AQUA OR 80X60 ===");

    const { data: moldesAqua, error } = await supabase
        .from('query_moldes')
        .select('*')
        .or('molde_descripcion.ilike.%AQUA%,molde_sku.ilike.%PMOL02-0087%,molde_sku.ilike.%PMOL02-216%');

    console.log("Moldes count:", moldesAqua?.length);
    if (moldesAqua) {
        console.table(moldesAqua.map(m => ({
            id: m.id,
            molde_sku: m.molde_sku,
            serial: m.molde_serial,
            descripcion: m.molde_descripcion,
            estado: m.estado
        })));
    }
}

run();
