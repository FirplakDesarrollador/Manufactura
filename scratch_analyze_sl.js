const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/(^"|"$)/g, '');
    }
  }
});
Object.assign(process.env, envVars);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function loginToSAP() {
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const response = await fetch(sapUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            CompanyDB: process.env.SAP_COMPANY_DB,
            Password: process.env.SAP_PASSWORD,
            UserName: process.env.SAP_USERNAME
        }),
    });
    if (!response.ok) throw new Error("SAP Login Error");
    const data = await response.json();
    return `B1SESSION=${data.SessionId}`;
}

async function analyze() {
    try {
        console.log("Conectando a Service Layer para obtener los 3040 registros...");
        const cookie = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL.replace('/Login', '');
        
        let allSlRows = [];
        let nextUrl = `${baseUrl}/SQLQueries('semaforo')/List?$cross-join=none`;
        
        while (nextUrl) {
            const res = await fetch(nextUrl, {
                headers: { "Cookie": cookie, "Prefer": "odata.maxpagesize=1000" }
            });
            const data = await res.json();
            if (data.value) allSlRows = allSlRows.concat(data.value);
            nextUrl = data['odata.nextLink'] ? `${baseUrl}/${data['odata.nextLink']}` : null;
        }
        console.log(`- Obtenidos: ${allSlRows.length} registros de Service Layer.`);

        // Buscar duplicados
        const seen = new Set();
        const duplicates = [];
        const estados = {};

        allSlRows.forEach(row => {
            const key = row.U_Originnum + '-' + row.U_NroOP + '-' + row.U_SKU;
            if (seen.has(key)) {
                duplicates.push(row);
            } else {
                seen.add(key);
            }
            estados[row.U_Estado] = (estados[row.U_Estado] || 0) + 1;
        });

        console.log(`\n¡Se encontraron ${duplicates.length} duplicados (llave: Originnum-NroOP-SKU)!`);
        console.log("Distribución de Estados en toda la tabla:", estados);

        // Imprimir algunos ejemplos de datos para ver si hay campos nulos
        console.log("\nEjemplo de un registro:", JSON.stringify(allSlRows[0], null, 2));

    } catch (err) {
        console.error(err);
    }
}
analyze();
