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
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Firplak_SA',
    options: { encrypt: false, trustServerCertificate: true }
};

async function testView() {
    try {
        console.log("1. Conectando a SQL Server...");
        await sql.connect(config);
        
        console.log("2. Creando Vista FIR_V_SEMAFORO...");
        // Drop if exists
        await sql.query(`IF OBJECT_ID('FIR_V_SEMAFORO', 'V') IS NOT NULL DROP VIEW FIR_V_SEMAFORO;`);
        // Create view pointing to snapshot
        await sql.query(`CREATE VIEW FIR_V_SEMAFORO AS SELECT * FROM dbo.SEMAFORO_SNAPSHOT;`);
        console.log("Vista creada.");

        console.log("3. Autenticando en Service Layer...");
        const loginRes = await fetch(process.env.SAP_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                CompanyDB: process.env.SAP_COMPANY_DB,
                Password: process.env.SAP_PASSWORD,
                UserName: process.env.SAP_USERNAME
            })
        });
        const loginData = await loginRes.json();
        const routeIdMatch = (loginRes.headers.get("set-cookie") || "").match(/ROUTEID=([^;]+)/);
        const cookieHeader = `B1SESSION=${loginData.SessionId}; ROUTEID=${routeIdMatch ? routeIdMatch[1] : ""}`;
        const baseUrl = process.env.SAP_API_URL.replace('/Login', '');

        console.log("4. Registrando query en Service Layer con la Vista...");
        const queryPayload = {
            SqlCode: "semaforo_view_test",
            SqlName: "Semaforo View Test",
            SqlText: "SELECT [Originnum], [Nro OP], [SKU] FROM FIR_V_SEMAFORO"
        };

        let res = await fetch(`${baseUrl}/SQLQueries`, {
            method: 'POST',
            headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(queryPayload)
        });

        if (res.status === 400) {
            console.log("POST falló, intentando PATCH...");
            res = await fetch(`${baseUrl}/SQLQueries('semaforo_view_test')`, {
                method: 'PATCH',
                headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ SqlText: queryPayload.SqlText })
            });
        }

        if (res.ok) {
            console.log("¡ÉXITO! Service Layer aceptó la vista.");
            // Vamos a intentar consultarla
            const getRes = await fetch(`${baseUrl}/SQLQueries('semaforo_view_test')/List`, {
                headers: { 'Cookie': cookieHeader }
            });
            const getData = await getRes.json();
            if (getData.value) {
                console.log(`La consulta por Service Layer devolvió ${getData.value.length} registros (página 1).`);
            } else {
                console.log("Error al consultar:", getData);
            }
        } else {
            const errBody = await res.text();
            console.log("Error al registrar query:", res.status, errBody);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

testView();
