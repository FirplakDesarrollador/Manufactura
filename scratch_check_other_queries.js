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

  const queriesToCheck = [
    'ordenes_muebles_comp_v3',
    'ordenes_marmol_sl136',
    'ordenes_marmol_standard',
    'ordenes_pendientes_clean'
  ];

  for (const q of queriesToCheck) {
    console.log(`\n=== Evaluando query: ${q} ===`);
    try {
      const res = await fetch(`${baseUrl}/SQLQueries('${q}')/List?$top=1`, {
        headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.value || [];
        if (items.length > 0) {
          const cols = Object.keys(items[0]);
          console.log(`Columnas (${cols.length}):`, cols.join(', '));
          // Chequear si tiene columnas tipo semaforo:
          if (cols.includes('Color Liberación') || cols.includes('Color Producción')) {
            console.log("¡ESTA TIENE PINTA DE SEMÁFORO!");
          }
        } else {
          console.log("Sin resultados.");
        }
      } else {
         console.log("Error:", res.status);
      }
    } catch (e) {
      console.log(e.message);
    }
  }
}

main();
