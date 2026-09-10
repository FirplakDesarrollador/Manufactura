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

async function checkQuery() {
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

        const res = await fetch(`${baseUrl}/SQLQueries('semaforo_v3')`, {
            headers: { 'Cookie': cookieHeader }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(err) {
        console.error(err);
    }
}
checkQuery();
