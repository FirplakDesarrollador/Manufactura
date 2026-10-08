require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== DUMPING ALL MOLDES FROM QUERY_MOLDES ===");

    const { data: moldes, error } = await supabase
        .from('query_moldes')
        .select('*');

    console.log("Error:", error);
    console.log("Total moldes:", moldes?.length);
    
    if (moldes) {
        // Group by tipo_molde_sku
        const byTipo = {};
        moldes.forEach(m => {
            const key = m.tipo_molde_sku || m.molde_sku || 'SinSKU';
            if (!byTipo[key]) byTipo[key] = [];
            byTipo[key].push(m);
        });

        console.log("Distinct tipo_molde_sku count:", Object.keys(byTipo).length);
        console.log("Distinct tipo_molde_sku keys:", Object.keys(byTipo));
    }
}

run();
