const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local or .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrden() {
    const { data, error } = await supabase
        .from('ordenes_fabricacion')
        .select('*')
        .eq('orden_fabricacion', '2259941');
        
    console.log("Error:", error);
    console.log("Data:", data);
}

checkOrden();
