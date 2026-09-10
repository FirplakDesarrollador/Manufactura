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

  console.log("=== Buscando TODAS las queries ===");
  try {
    let allQueries = [];
    let url = `${baseUrl}/SQLQueries?$select=SqlCode,SqlName,UpdateDate`;
    
    while(url) {
        const res = await fetch(url, { headers: { 'Cookie': cookieHeader } });
        if(!res.ok) {
            console.log("Error:", res.status, await res.text());
            break;
        }
        const data = await res.json();
        allQueries.push(...data.value);
        
        const nextLink = data['@odata.nextLink'] || data['odata.nextLink'];
        if (nextLink) {
            url = nextLink.startsWith('http') ? nextLink : `${baseUrl}/${nextLink.replace(/^\//, '')}`;
        } else {
            url = null;
        }
    }
    
    const semaforoQueries = allQueries.filter(q => q.SqlName && q.SqlName.toLowerCase().includes('semaforo'));
    console.log("Queries con la palabra 'semaforo':", JSON.stringify(semaforoQueries, null, 2));
    
    // Sort by update date
    allQueries.sort((a,b) => new Date(b.UpdateDate) - new Date(a.UpdateDate));
    console.log("Ultimas 5 queries actualizadas:", JSON.stringify(allQueries.slice(0, 5), null, 2));

  } catch (err) {
    console.log("Error:", err.message);
  }
}

main();
