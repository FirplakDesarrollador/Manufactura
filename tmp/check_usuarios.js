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
    // 1. Get OpenAPI spec for usuarios table structure
    const spec = await fetchData('/rest/v1/');
    const parsed = JSON.parse(spec.body);
    if (parsed.definitions && parsed.definitions.usuarios) {
        const cols = Object.keys(parsed.definitions.usuarios.properties);
        console.log(`Columnas de usuarios (${cols.length}): ${cols.join(', ')}`);
    }

    // 2. Fetch a few users to see the data
    const users = await fetchData('/rest/v1/usuarios?select=*&limit=5');
    console.log(`\nStatus: ${users.status}`);
    const usersData = JSON.parse(users.body);
    if (Array.isArray(usersData) && usersData.length > 0) {
        console.log(`Total usuarios (muestra): ${usersData.length}`);
        usersData.forEach((u, i) => {
            console.log(`\nUsuario ${i+1}:`, JSON.stringify(u, null, 2));
        });
    } else {
        console.log("No se encontraron usuarios o error:", users.body.substring(0, 200));
    }

    // 3. Search for any user with 'analista' or 'desarrollo'
    const search = await fetchData('/rest/v1/usuarios?select=*&or=(email.ilike.*analista*,email.ilike.*desarrollo*)&limit=5');
    const searchData = JSON.parse(search.body);
    console.log(`\nBúsqueda 'analista/desarrollo': ${Array.isArray(searchData) ? searchData.length : 0} resultados`);
    if (Array.isArray(searchData)) {
        searchData.forEach(u => console.log(JSON.stringify(u)));
    }
}

main().catch(console.error);
