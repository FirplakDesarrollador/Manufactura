require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error, count } = await supabase
    .from('inventario_bodega_historial')
    .select('*', { count: 'exact', head: true });
    
  console.log("Error:", error);
  console.log("Count in inventario_bodega_historial:", count);
  
  const { data: latest } = await supabase
    .from('inventario_bodega_historial')
    .select('fecha_consulta')
    .order('fecha_consulta', { ascending: false })
    .limit(1);
    
  console.log("Latest record date:", latest);
}

check();
