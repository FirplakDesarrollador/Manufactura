const https = require('https');
const fs = require('fs');

const supabaseUrl = 'vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

function fetchData(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            path: path,
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
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

async function main() {
    const out = [];

    // 1. Try correo field
    const byCorreo = await fetchData('/rest/v1/usuarios?correo=eq.analista2.desarrollo@firplak.com&select=*');
    out.push(`Buscar por correo: status=${byCorreo.status}, body=${byCorreo.body.substring(0, 500)}`);

    // 2. Try OpenAPI spec to see what pintura_user_id type is
    const spec = await fetchData('/rest/v1/');
    const parsed = JSON.parse(spec.body);
    if (parsed.definitions && parsed.definitions.trazabilidad_ms && parsed.definitions.trazabilidad_ms.properties) {
        const userIdProp = parsed.definitions.trazabilidad_ms.properties.pintura_user_id;
        out.push(`\npintura_user_id tipo: ${JSON.stringify(userIdProp)}`);
    }

    // 3. Check if usuarios has uuid column that matches auth
    if (parsed.definitions && parsed.definitions.usuarios && parsed.definitions.usuarios.properties) {
        out.push(`\nusuarios.uuid tipo: ${JSON.stringify(parsed.definitions.usuarios.properties.uuid)}`);
        out.push(`usuarios.id tipo: ${JSON.stringify(parsed.definitions.usuarios.properties.id)}`);
    }

    // 4. Get an existing trazabilidad_ms record to see what pintura_user_id looks like
    const existing = await fetchData('/rest/v1/query_trazabilidad_ms?select=pintura_user_id,pintura_fecha,estado&limit=3&order=pintura_fecha.desc');
    out.push(`\nEjemplos de pintura_user_id existentes: ${existing.body.substring(0, 500)}`);

    fs.writeFileSync('tmp/user_analysis.txt', out.join('\n'));
    console.log('Guardado en tmp/user_analysis.txt');
}

main().catch(console.error);
