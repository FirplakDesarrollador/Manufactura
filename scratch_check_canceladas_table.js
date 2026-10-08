require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CHECKING ORDENES_CANCELADAS TABLE ===");

    const { data, error } = await supabase
        .from('ordenes_canceladas')
        .select('*')
        .limit(5);

    if (error) {
        console.log("ordenes_canceladas table check:", error.code, error.message);
    } else {
        console.log("ordenes_canceladas table EXISTS! Total sample rows:", data.length);
    }
}

run();
