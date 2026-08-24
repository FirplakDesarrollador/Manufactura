import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder() {
    console.log("Consultando orden 1005449 en Supabase...");
    const { data, error } = await supabase
        .from('ordenes_fabricacion')
        .select('*')
        .eq('orden_fabricacion', '1005449');

    if (error) {
        console.error("Error query_ordenes_fabricacion:", error);
    } else {
        console.log("Resultado query_ordenes_fabricacion:", data);
        if (data && data.length > 0) {
            console.log("✅ La orden SI está en Supabase (ordenes_fabricacion).");
        } else {
            console.log("❌ La orden NO está en Supabase (ordenes_fabricacion).");
        }
    }
}

checkOrder();
