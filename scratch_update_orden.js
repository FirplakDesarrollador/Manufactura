const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOrden() {
    const { data, error } = await supabase
        .from('ordenes_fabricacion')
        .update({ 
            producto_descripcion: 'LAVAPLATOS KOA 63X51 1 BOWL MARFIL BRILLANTE (CAJA CERRADA)'
        })
        .eq('orden_fabricacion', '2259941')
        .select();
        
    console.log("Error:", error);
    console.log("Updated:", data);
}

updateOrden();
