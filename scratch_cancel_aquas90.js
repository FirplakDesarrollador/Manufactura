require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CANCELING OFs 2259728 AND 2259727 IN SUPABASE ===");

    const { data, error } = await supabase
        .from('ordenes_fabricacion')
        .update({
            pendiente: false,
            fecha_entrega_real: new Date().toISOString(),
            modificado_por: 'Cancelado por Usuario (Jakeline)'
        })
        .in('orden_fabricacion', ['2259728', '2259727'])
        .select();

    if (error) {
        console.error("Error updating OFs:", error);
    } else {
        console.log("Successfully marked OFs 2259728 & 2259727 as pendiente = false! Count updated:", data?.length);
        console.log("Updated rows:", data);
    }
}

run();
