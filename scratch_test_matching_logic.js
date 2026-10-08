require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== TESTING SMART MOLD MATCHING LOGIC ===");

    // Fetch order 2260248
    const { data: ordenes } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .eq('orden_fabricacion', '2260248')
        .single();

    console.log("Order:", ordenes.orden_fabricacion, ordenes.producto_descripcion, "molde_sku:", ordenes.molde_sku, "molde_desc:", ordenes.molde_descripcion);

    // Fetch all moldes from query_moldes
    const { data: allMoldes } = await supabase
        .from('query_moldes')
        .select('*');

    console.log("Total moldes loaded:", allMoldes?.length);

    // Smart filtering function
    function findMatchingMoldes(orden, moldesList) {
        const targetSku = (orden.molde_sku || orden.producto_sku || '').trim().toLowerCase();
        const targetDesc = (orden.molde_descripcion || orden.producto_descripcion || '').trim().toLowerCase();

        // Extract code from PMOL02-0087-000-0000 -> "0087" or "087"
        const codeMatch = targetSku.match(/PMOL\d*-(\d+)/i);
        const targetCode = codeMatch ? codeMatch[1].replace(/^0+/, '') : ''; // "87"

        return moldesList.filter(m => {
            if (m.estado !== 'Disponible') return false;

            const mSku = (m.tipo_molde_sku || m.molde_sku || '').trim().toLowerCase();
            const mSerial = (m.serial || '').trim().toLowerCase();
            const mDesc = (m.molde_descripcion || m.nombre_articulo || '').trim().toLowerCase();

            // 1. Exact SKU match
            if (targetSku && (mSku === targetSku || mSerial === targetSku)) return true;

            // 2. Serial code prefix match (e.g. "0087-10" contains code "87" or starts with "0087" or "087")
            if (targetCode) {
                const serialPrefix = mSerial.split('-')[0].replace(/^0+/, '');
                if (serialPrefix === targetCode) return true;
            }

            // 3. Description keyword match (e.g. both contain "aqua 80x60" or "lavarropas aqua")
            if (targetDesc && mDesc) {
                // Extract key terms (ignoring common words like "molde", "blanco", etc.)
                const keywords = targetDesc
                    .replace(/molde|blanco|brillante|mate|con|flauta/gi, '')
                    .split(/\s+/)
                    .filter(w => w.length > 2);

                if (keywords.length > 0) {
                    const matchesAll = keywords.every(kw => mDesc.includes(kw));
                    if (matchesAll) return true;
                }
            }

            return false;
        });
    }

    const matches = findMatchingMoldes(ordenes, allMoldes);
    console.log(`Matching moldes found: ${matches.length}`);
    console.table(matches.map(m => ({
        id: m.id,
        serial: m.serial,
        tipo_molde_sku: m.tipo_molde_sku,
        desc: m.molde_descripcion || m.nombre_articulo,
        estado: m.estado
    })));
}

run();
