const https = require('https');
const fs = require('fs');

const supabaseUrl = 'vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

function fetchData(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            path: encodeURI(path),
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
    
    // 1. Schema
    const spec = await fetchData('/rest/v1/');
    const parsed = JSON.parse(spec.body);
    if (parsed.definitions && parsed.definitions.usuarios) {
        const cols = Object.keys(parsed.definitions.usuarios.properties);
        out.push(`Columnas de usuarios (${cols.length}): ${cols.join(', ')}`);
        const req = parsed.definitions.usuarios.required || [];
        out.push(`Requeridos: ${req.join(', ')}`);
    }

    // 2. Fetch first 5 users
    const users = await fetchData('/rest/v1/usuarios?select=*&limit=5');
    const usersData = JSON.parse(users.body);
    out.push(`\nStatus: ${users.status}`);
    if (Array.isArray(usersData)) {
        out.push(`Usuarios encontrados: ${usersData.length}`);
        usersData.forEach((u, i) => {
            out.push(`\nUsuario ${i+1}: ${JSON.stringify(u)}`);
        });
    } else {
        out.push(`Error: ${users.body.substring(0, 300)}`);
    }

    fs.writeFileSync('tmp/usuarios_output.txt', out.join('\n'));
    console.log('Guardado en tmp/usuarios_output.txt');
}

main().catch(console.error);
