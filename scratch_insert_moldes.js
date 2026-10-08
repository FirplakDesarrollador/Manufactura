const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function addMoldes() {
    // We insert molds to ensure they appear in the UI as Disponible
    const molds = [
        {
            serial: 'PMOL02-216-000-0000',
            tipo_molde_sku: 'PMOL02-216-000-0000',
            tipo_molde_id: 474,
            estado: 'Disponible',
            vueltas_actuales: 0,
            vueltas_acumuladas: 0,
            nombre_articulo: 'MOLDE LAVAPLATOS KOA 63X51 1 BOWL',
            descripcion_molde: 'MOLDE LAVAPLATOS KOA 63X51 1 BOWL'
        },
        {
            serial: 'PCOC04-0019-B2C-0103',
            tipo_molde_sku: 'PCOC04-0019-B2C-0103',
            tipo_molde_id: 474,
            estado: 'Disponible',
            vueltas_actuales: 0,
            vueltas_acumuladas: 0,
            nombre_articulo: 'MOLDE LAVAPLATOS KOA 63X51',
            descripcion_molde: 'MOLDE LAVAPLATOS KOA 63X51'
        },
        {
            serial: 'VCOC04-0019-B2C-0103',
            tipo_molde_sku: 'VCOC04-0019-B2C-0103',
            tipo_molde_id: 474,
            estado: 'Disponible',
            vueltas_actuales: 0,
            vueltas_acumuladas: 0,
            nombre_articulo: 'LAVAPLATOS KOA 63X51 1 BOWL MARFIL BRILLANTE (CAJA CERRADA)',
            descripcion_molde: 'LAVAPLATOS KOA 63X51 1 BOWL MARFIL BRILLANTE (CAJA CERRADA)'
        }
    ];
    
    for (const m of molds) {
        // check if exists
        const { data } = await sb.from('moldes').select('id').eq('serial', m.serial).maybeSingle();
        if (!data) {
            const { error } = await sb.from('moldes').insert(m);
            console.log(`Inserted ${m.serial}:`, error ? error.message : 'OK');
        } else {
            console.log(`Mold ${m.serial} already exists (id ${data.id}). Updating to Disponible...`);
            const { error } = await sb.from('moldes').update({ estado: 'Disponible', tipo_molde_sku: m.tipo_molde_sku }).eq('id', data.id);
            console.log(`Updated ${m.serial}:`, error ? error.message : 'OK');
        }
    }
}

addMoldes();
