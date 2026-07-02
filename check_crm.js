const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkCRM() {
    console.log("--- DEBUG: BUSCANDO EN crm_cuentas ---");
    const { data: cuentas, error: errC } = await supabase.from('crm_cuentas').select('*').ilike('nombre', '%Italia%');
    if (errC) {
        console.error("Error crm_cuentas:", errC);
    } else {
        console.log("Cuentas encontradas con 'Italia':", cuentas);
    }
    
    console.log("--- DEBUG: TODAS LAS CUENTAS ---");
    const { data: allCuentas, error: errAll } = await supabase.from('crm_cuentas').select('*').limit(5);
    if (errAll) {
         console.error("Error crm_cuentas all:", errAll);
    } else {
         console.log("Algunas cuentas:", allCuentas);
    }

    console.log("\n--- DEBUG: BUSCANDO EN usuarios ---");
    const { data: usuarios, error: errU } = await supabase.from('usuarios').select('*').limit(5);
    if (errU) {
        console.error("Error usuarios:", errU);
    } else {
        console.log("Algunos usuarios:", usuarios);
    }
    
    // Check if there is any relation between them or an exact match issue.
    const { data: c2, error: e2 } = await supabase.from('crm_cuentas').select('*').ilike('nombre', '%Cerámica%');
    console.log("Cuentas con 'Cerámica':", c2);
}

checkCRM();
