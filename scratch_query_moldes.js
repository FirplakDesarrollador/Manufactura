const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMoldes() {
    const { data, error } = await supabase
        .from('query_moldes')
        .select('*')
        .or('molde_sku.ilike.%0019-B2C-0103%,molde_sku.ilike.%216-000-0000%');
        
    console.log("Error:", error);
    console.log("Moldes:", data);
}

checkMoldes();
