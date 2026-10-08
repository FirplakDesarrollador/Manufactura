require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== UPDATING 100% CEDI COMPLETED ORDERS IN SUPABASE ===");

    // Fetch active pending orders
    const { data: ordenes, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('id, orden_fabricacion, cantidad, cedi')
        .eq('pendiente', true);

    if (error) {
        console.error("Error fetching ordenes:", error);
        return;
    }

    const completedIds = (ordenes || [])
        .filter(o => {
            const cantReq = Number(o.cantidad) || 1;
            const cediCount = Number(o.cedi) || 0;
            return cediCount >= cantReq && cantReq > 0;
        })
        .map(o => o.id);

    console.log(`Found ${completedIds.length} orders with 100% CEDI delivery to mark as pendiente = false.`);

    if (completedIds.length === 0) return;

    // Batch update ordenes_fabricacion
    const BATCH_SIZE = 100;
    let totalUpdated = 0;

    for (let i = 0; i < completedIds.length; i += BATCH_SIZE) {
        const batchIds = completedIds.slice(i, i + BATCH_SIZE);
        const { data, error: updateErr } = await supabase
            .from('ordenes_fabricacion')
            .update({
                pendiente: false,
                fecha_entrega_real: new Date().toISOString(),
                modificado_por: 'Completado 100% CEDI'
            })
            .in('id', batchIds)
            .select('id');

        if (updateErr) {
            console.error(`Error updating batch ${i}:`, updateErr);
        } else {
            totalUpdated += data ? data.length : 0;
            console.log(`Batch ${i / BATCH_SIZE + 1} updated: ${data ? data.length : 0} rows.`);
        }
    }

    console.log(`\n✅ SUCCESSFULLY UPDATED ${totalUpdated} ORDERS TO pendiente = false!`);
}

run();
