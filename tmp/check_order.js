require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    // get order_id
    const { data: orden } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .eq('orden_fabricacion', '2256798');
        
    const order_id = orden[0].id;
    console.log('Order ID:', order_id);
    
    const { data: traza, error } = await supabase
        .from('trazabilidad_ms')
        .select('*')
        .eq('orden_fabricacion_id', order_id);
        
    console.log('Trazabilidad items:', traza?.length);
    console.log('States:', traza?.map(t => t.estado));
}
check();
