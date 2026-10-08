require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== LISTING MOLDES COLS ===");

    const { data: moldes, error } = await supabase
        .from('query_moldes')
        .select('*')
        .limit(10);

    console.log("Error:", error);
    if (moldes && moldes.length > 0) {
        console.log("Keys:", Object.keys(moldes[0]));
        console.table(moldes.map(m => ({
            id: m.id,
            sku: m.molde_sku,
            desc: m.molde_descripcion,
            estado: m.estado
        })));
    }
}

run();
