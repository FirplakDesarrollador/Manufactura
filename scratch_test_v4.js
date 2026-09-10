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

async function updateQuery() {
    try {
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

        const sqlQueryPayload = {
            SqlCode: "semaforo_v4",
            SqlName: "Semaforo V4",
            SqlText: `SELECT "Code" FROM "@F_SEMAFORO"`
        };
        
        let qRes = await fetch(`${baseUrl}/SQLQueries`, {
            method: 'POST',
            headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(sqlQueryPayload)
        });
        
        if (!qRes.ok) {
            await fetch(`${baseUrl}/SQLQueries('semaforo_v4')`, {
                method: 'PATCH',
                headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ SqlText: sqlQueryPayload.SqlText })
            });
        }
        
        const listRes = await fetch(`${baseUrl}/SQLQueries('semaforo_v4')/List`, {
            headers: { 'Cookie': cookieHeader }
        });
        const data = await listRes.json();
        console.log(data);
    } catch(err) {
        console.error(err);
    }
}
updateQuery();
