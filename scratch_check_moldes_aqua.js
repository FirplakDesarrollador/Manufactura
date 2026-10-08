require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== SEARCHING MOLDES TABLE DIRECTLY FOR AQUA & SERIALS ===");

    const { data: moldes, error } = await supabase
        .from('moldes')
        .select('*')
        .or('descripcion_molde.ilike.%AQUA%,nombre_articulo.ilike.%AQUA%,serial.ilike.%0175%,serial.ilike.%239%,serial.ilike.%235%')
        .limit(30);

    console.log("Error:", error);
    console.log("Count found:", moldes?.length);
    if (moldes && moldes.length > 0) {
        console.table(moldes.map(m => ({
            id: m.id,
            serial: m.serial,
            tipo_molde_sku: m.tipo_molde_sku,
            descripcion_molde: m.descripcion_molde,
            nombre_articulo: m.nombre_articulo,
            estado: m.estado
        })));
    }
}

run();
