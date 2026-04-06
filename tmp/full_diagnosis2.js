const https = require('https');
const fs = require('fs');

const supabaseUrl = 'vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

function fetchOpenAPISpec() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            path: '/rest/v1/',
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

async function main() {
    const output = [];
    const log = (msg) => { output.push(msg); };

    try {
        const spec = await fetchOpenAPISpec();
        const defs = spec.definitions || {};
        const tables = Object.keys(defs).sort();

        log(`Total tablas/vistas: ${tables.length}\n`);

        // Filter trazabilidad tables
        const trazTables = tables.filter(t => t.toLowerCase().includes('traz'));
        log(`== TABLAS CON 'traz' (${trazTables.length}) ==`);
        for (const t of trazTables) {
            const props = defs[t].properties ? Object.keys(defs[t].properties) : [];
            const req = defs[t].required || [];
            log(`\n--- ${t} ---`);
            log(`  Columnas (${props.length}): ${props.join(', ')}`);
            log(`  Requeridos (${req.length}): ${req.join(', ') || 'Ninguno'}`);
            // Check if it's a view (no required = probably a view)
            log(`  ¿Es vista? ${req.length === 0 ? 'Probablemente SÍ' : 'Probablemente NO (tiene campos requeridos)'}`);
        }

        // Filter molde tables
        const moldeTables = tables.filter(t => t.toLowerCase().includes('molde'));
        log(`\n\n== TABLAS CON 'molde' (${moldeTables.length}) ==`);
        for (const t of moldeTables) {
            const props = defs[t].properties ? Object.keys(defs[t].properties) : [];
            const req = defs[t].required || [];
            log(`\n--- ${t} ---`);
            log(`  Columnas (${props.length}): ${props.join(', ')}`);
            log(`  Requeridos (${req.length}): ${req.join(', ') || 'Ninguno'}`);
        }

        // All table names
        log(`\n\n== TODAS LAS TABLAS/VISTAS ==`);
        log(tables.join('\n'));

    } catch(e) {
        log(`ERROR: ${e.message}`);
    }

    const result = output.join('\n');
    fs.writeFileSync('tmp/diagnosis_output.txt', result);
    console.log("Diagnóstico guardado en tmp/diagnosis_output.txt");
    console.log(result);
}

main().catch(console.error);
