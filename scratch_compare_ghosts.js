const sql = require('mssql');
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

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Firplak_SA',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120000
};

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

async function compare() {
    try {
        console.log("1. Conectando a SQL Server para obtener los 3000 registros puros...");
        await sql.connect(config);
        const result = await sql.query(`EXEC [Planos_Symphony].[dbo].[SEMAFORO]`);
        const pureRows = result.recordset;
        console.log(`- Obtenidos: ${pureRows.length} registros del SP.`);
        await sql.close();

        console.log("2. Conectando a Service Layer para obtener los 3040 registros...");
        const cookie = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL.replace('/Login', '');
        
        let allSlRows = [];
        let nextUrl = `${baseUrl}/SQLQueries('semaforo_v3')/List?$cross-join=none`;
        
        while (nextUrl) {
            const res = await fetch(nextUrl, {
                headers: { "Cookie": cookie, "Prefer": "odata.maxpagesize=1000" }
            });
            const data = await res.json();
            if (data.value) allSlRows = allSlRows.concat(data.value);
            nextUrl = data['odata.nextLink'] ? `${baseUrl}/${data['odata.nextLink']}` : null;
        }
        console.log(`- Obtenidos: ${allSlRows.length} registros de Service Layer.`);

        // 3. Comparar para encontrar los 40 fantasmas
        const pureKeys = new Set(pureRows.map(r => r.Originnum + '-' + r['Nro OP'] + '-' + r.SKU));
        
        const ghosts = [];
        allSlRows.forEach(row => {
            const key = row.U_Originnum + '-' + row.U_NroOP + '-' + row.U_SKU;
            if (!pureKeys.has(key)) {
                ghosts.push(row);
            }
        });

        console.log(`\n¡Se encontraron ${ghosts.length} registros fantasma!`);
        if (ghosts.length > 0) {
            console.log("\nEjemplo de un fantasma:", JSON.stringify(ghosts[0], null, 2));
            
            // Analizar características comunes
            const estados = {};
            ghosts.forEach(g => {
                estados[g.U_Estado] = (estados[g.U_Estado] || 0) + 1;
            });
            console.log("\nAgrupación por Estado:", estados);
        }

    } catch (err) {
        console.error(err);
    }
}
compare();
