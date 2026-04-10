const https = require('https');

const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim().replace(/^"|"$/g, '')] = value.trim().replace(/^"|"$/g, '');
    }
});

// Bypass SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testSAPDirect() {
    const loginUrl = process.env.SAP_LOGIN_URL;
    const db = process.env.SAP_COMPANY_DB;
    const user = process.env.SAP_USER;
    const pass = process.env.SAP_PASSWORD;

    console.log(`Conectando a ${db} como ${user}...`);
    
    try {
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            body: JSON.stringify({
                CompanyDB: db,
                Password: pass,
                UserName: user
            })
        });

        if (!loginRes.ok) {
            console.error("Fallo Login SAP:", loginRes.status);
            return;
        }

        const loginData = await loginRes.json();
        const sessionId = loginData.SessionId;
        const cookies = loginRes.headers.get('set-cookie');

        const serial = '180-01';
        const rawUrl = loginUrl.replace('/Login', '');
        
        // Versión 1: Búsqueda exacta
        console.log(`Buscando serial: ${serial}...`);
        const filter = `SerialNumber eq '${serial}' or MfrSerialNo eq '${serial}'`;
        const params = new URLSearchParams({ '$filter': filter });
        const searchUrl = `${rawUrl}/SerialNumberDetails?${params.toString()}`;

        const searchRes = await fetch(searchUrl, {
            headers: {
                'Cookie': cookies || '',
                'B1SESSION': sessionId
            }
        });

        console.log(`Estado Respuesta: ${searchRes.status}`);
        const data = await searchRes.json();
        console.log("Resultado SAP:", JSON.stringify(data, null, 2));

        if (data.value && data.value.length === 0) {
            console.log("No se encontró con el serial exacto. Probando con comodines o variaciones...");
            // Tal vez tiene ceros a la izquierda?
            const filter2 = `contains(SerialNumber, '${serial}')`;
            const params2 = new URLSearchParams({ '$filter': filter2 });
            const searchUrl2 = `${rawUrl}/SerialNumberDetails?${params2.toString()}`;
            const searchRes2 = await fetch(searchUrl2, {
                headers: { 'Cookie': cookies || '', 'B1SESSION': sessionId }
            });
            const data2 = await searchRes2.json();
            console.log("Resultado con 'contains':", JSON.stringify(data2, null, 2));
        }

    } catch (e) {
        console.error("Error en la prueba:", e);
    }
}

testSAPDirect();
