import fs from 'fs';

const envPath = '.env';
const envFile = fs.readFileSync(envPath, 'utf-8');
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

async function main() {
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

  console.log("=== Ejecutando semaforo_v2 en Service Layer ===");
  try {
    const url = `${baseUrl}/SQLQueries('semaforo_v2')/List?$top=5`;
    const res = await fetch(url, { headers: { 'Cookie': cookieHeader } });
    
    if(res.ok) {
        const data = await res.json();
        console.log(`Exito, registros devueltos:`, data.value.length);
        console.log(`Muestra del primer registro:`, JSON.stringify(data.value[0], null, 2));
    } else {
        console.log("Error:", res.status, await res.text());
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
}

main();
