const https = require('https');

const supabaseUrl = 'vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

// Fetch the OpenAPI spec from Supabase REST API - this lists ALL available tables/views
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
            res.on('end', () => {
                try {
                    const spec = JSON.parse(data);
                    resolve(spec);
                } catch(e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

// Try inserting into a specific table to see the exact error
function tryInsert(tableName, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: supabaseUrl,
            path: `/rest/v1/${tableName}`,
            method: 'POST',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

// Fetch columns of a specific table
function fetchColumns(tableName) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            path: `/rest/v1/${tableName}?limit=0`,
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Accept': 'application/vnd.pgrst.object+json',
                'Prefer': 'count=exact'
            }
        };

        const req = https.request(options, (res) => {
            // The response headers contain content-profile info
            resolve({ 
                status: res.statusCode, 
                contentRange: res.headers['content-range'],
                headers: res.headers
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

// Fetch one row from a table with all columns
function fetchOneRow(tableName) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            path: `/rest/v1/${tableName}?limit=1&select=*`,
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
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

async function main() {
    console.log("============================================");
    console.log("   DIAGNÓSTICO COMPLETO DE BASE DE DATOS");
    console.log("============================================\n");

    // STEP 1: Get OpenAPI spec to list all tables/views
    console.log("PASO 1: Listando TODAS las tablas y vistas disponibles...\n");
    try {
        const spec = await fetchOpenAPISpec();
        if (spec.paths) {
            const tables = Object.keys(spec.paths).map(p => p.replace('/', '')).sort();
            console.log(`Total tablas/vistas: ${tables.length}`);
            
            // Highlight trazabilidad-related tables
            const trazTables = tables.filter(t => t.toLowerCase().includes('traz'));
            console.log(`\nTablas con 'traz': ${JSON.stringify(trazTables)}`);
            
            const moldeTables = tables.filter(t => t.toLowerCase().includes('molde'));
            console.log(`Tablas con 'molde': ${JSON.stringify(moldeTables)}`);
            
            const allTables = tables.join(', ');
            console.log(`\nTodas: ${allTables}`);
        } else if (spec.definitions) {
            const tables = Object.keys(spec.definitions).sort();
            console.log(`Total tablas/vistas: ${tables.length}`);
            
            const trazTables = tables.filter(t => t.toLowerCase().includes('traz'));
            console.log(`\nTablas con 'traz': ${JSON.stringify(trazTables)}`);

            const moldeTables = tables.filter(t => t.toLowerCase().includes('molde'));
            console.log(`Tablas con 'molde': ${JSON.stringify(moldeTables)}`);

            console.log(`\nTodas: ${tables.join(', ')}`);

            // STEP 2: Inspect trazabilidad tables
            console.log("\n\nPASO 2: Inspeccionando estructura de tablas de trazabilidad...\n");
            for (const t of trazTables) {
                console.log(`--- ${t} ---`);
                if (spec.definitions[t] && spec.definitions[t].properties) {
                    const cols = Object.keys(spec.definitions[t].properties);
                    console.log(`Columnas (${cols.length}): ${cols.join(', ')}`);
                    
                    // Check required fields
                    const required = spec.definitions[t].required || [];
                    console.log(`Requeridos: ${required.length > 0 ? required.join(', ') : 'Ninguno'}`);
                }
                console.log('');
            }

            // STEP 3: Inspect moldes table
            console.log("\nPASO 3: Inspeccionando estructura de tabla moldes...\n");
            for (const t of moldeTables) {
                console.log(`--- ${t} ---`);
                if (spec.definitions[t] && spec.definitions[t].properties) {
                    const cols = Object.keys(spec.definitions[t].properties);
                    console.log(`Columnas (${cols.length}): ${cols.join(', ')}`);
                }
                console.log('');
            }
        }
    } catch(e) {
        console.error("Error obteniendo OpenAPI spec:", e.message);
    }

    // STEP 4: Inspect one real row from trazabilidad_ms
    console.log("\nPASO 4: Intentando leer un registro existente...\n");
    for (const table of ['trazabilidad_ms', 'TrazabilidadMs', 'query_trazabilidad_ms']) {
        try {
            const result = await fetchOneRow(table);
            console.log(`${table}: status=${result.status}`);
            if (result.status === 200) {
                const parsed = JSON.parse(result.body);
                if (parsed.length > 0) {
                    console.log(`  Columnas: ${Object.keys(parsed[0]).join(', ')}`);
                    // Show a few key values
                    const row = parsed[0];
                    console.log(`  Sample: id=${row.id}, estado=${row.estado}, pintura_fecha=${row.pintura_fecha}`);
                }
            }
        } catch(e) {
            console.log(`${table}: ERROR - ${e.message}`);
        }
    }

    // STEP 5: Check moldes columns
    console.log("\nPASO 5: Columnas reales de la tabla moldes...\n");
    try {
        const result = await fetchOneRow('moldes');
        if (result.status === 200) {
            const parsed = JSON.parse(result.body);
            if (parsed.length > 0) {
                console.log(`Columnas moldes: ${Object.keys(parsed[0]).join(', ')}`);
            }
        } else {
            // Try query_moldes
            const result2 = await fetchOneRow('query_moldes');
            if (result2.status === 200) {
                const parsed = JSON.parse(result2.body);
                if (parsed.length > 0) {
                    console.log(`Columnas query_moldes: ${Object.keys(parsed[0]).join(', ')}`);
                }
            }
        }
    } catch(e) {
        console.log(`moldes: ERROR - ${e.message}`);
    }

    console.log("\n============================================");
    console.log("   FIN DEL DIAGNÓSTICO");
    console.log("============================================");
}

main().catch(console.error);
