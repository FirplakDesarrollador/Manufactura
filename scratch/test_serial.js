const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente para este script
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim().replace(/^"|"$/g, '')] = value.trim().replace(/^"|"$/g, '');
    }
});

async function testSerial() {
    const serial = '1180-01';
    console.log(`--- Probando Serial SAP: ${serial} ---`);
    
    // Simular lógica de sap-service.ts
    const rawUrl = process.env.SAP_LOGIN_URL || '';
    const baseUrl = rawUrl.toLowerCase().endsWith('/login') ? rawUrl.slice(0, -6) : rawUrl.replace(/\/$/, '');
    
    const filter = `SerialNumber eq '${serial.replace(/'/g, "''")}' or MfrSerialNo eq '${serial.replace(/'/g, "''")}'`;
    
    // Usar URLSearchParams como en el código corregido
    const params = new URLSearchParams();
    params.set('$filter', filter);
    params.set('$select', 'U_EstadoMolde,SerialNumber,MfrSerialNo');
    
    const searchUrl = `${baseUrl}/SerialNumberDetails?${params.toString()}`;
    
    console.log("URL de búsqueda generada:");
    console.log(searchUrl);
}

testSerial();
