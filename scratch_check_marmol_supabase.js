require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("=== CHECKING ALL TABLES IN SUPABASE ===");
  
  const candidateTables = [
    'programacion_marmol',
    'ordenes_marmol',
    'ordenes_produccion',
    'programacion_produccion',
    'ordenes',
    'control_piso',
    'trazabilidad_marmol',
    'vaciado_marmol',
    'pintura_marmol',
    'ordenes_liberadas',
    'marmol_programacion',
    'solicitudes_marmol',
    'hdt_estandares',
    'hdt_registros',
    'hora_a_hora',
    'opt_operativa',
    'opt_sistemica'
  ];

  for (const t of candidateTables) {
    const { data, error, count } = await supabase
      .from(t)
      .select('*', { count: 'exact' })
      .limit(3);

    if (error) {
      console.log(`Table '${t}': Error (${error.code}) ${error.message}`);
    } else {
      console.log(`Table '${t}': Count=${count}, Rows returned=${data?.length}`);
      if (data && data.length > 0) {
        console.log(`   Columns:`, Object.keys(data[0]));
        console.log(`   Row 0:`, JSON.stringify(data[0], null, 2));
      }
    }
  }
}

check();
