require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== INSPECTING MOLDES & TIPO_MOLDES TABLES ===");

    const { data: moldes, error: errM } = await supabase
        .from('moldes')
        .select('*')
        .limit(5);

    console.log("moldes sample:", moldes ? Object.keys(moldes[0]) : errM);

    const { data: tipos, error: errT } = await supabase
        .from('tipo_moldes')
        .select('*')
        .limit(5);

    console.log("tipo_moldes sample:", tipos ? Object.keys(tipos[0]) : errT);
    if (tipos && tipos.length > 0) {
        console.log("Sample tipo_moldes row:", tipos[0]);
    }
}

run();
