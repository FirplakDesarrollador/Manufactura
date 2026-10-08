import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function loginToSAP() {
  const url = process.env.SAP_API_URL;
  const username = process.env.SAP_USERNAME;
  const password = process.env.SAP_PASSWORD;
  const db = process.env.SAP_COMPANY_DB;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CompanyDB: db, Password: password, UserName: username }),
  });

  const data = await response.json();
  const routeIdMatch = (response.headers.get("set-cookie") || "").match(/ROUTEID=([^;]+)/);
  const routeId = routeIdMatch ? routeIdMatch[1] : "";
  return `B1SESSION=${data.SessionId}; ROUTEID=${routeId}`;
}

async function main() {
  const cookieHeader = await loginToSAP();
  const baseUrl = process.env.SAP_API_URL.replace('/Login', '');

  const userList = [
    '10074370', '10074465', '10074459', '10074458', '10074449', '10074404',
    '10074367', '10074261', '10074456', '10074380', '10074363', '10074400',
    '10074455', '10074362', '10074399', '10074365', '10074468', '10074467',
    '10074376', '10074374', '10074371', '10074377', '10074379', '10074364',
    '10074454', '10074322', '10074375', '10074464', '10074318', '10074323'
  ];

  console.log("Comprobando órdenes en SAP...");
  for (const num of ['10074455', '10074555', '10074521']) {
    const res = await fetch(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${num}`, {
      headers: { "Cookie": cookieHeader }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Orden ${num}:`, data.value && data.value.length > 0 ? `Existe (${data.value[0].ItemNo})` : 'NO existe');
    }
  }

  // Cargar 10074455 si existe
  if (userList.includes('10074455')) {
    // vamos a consultar ordenes_muebles_comp_v3 para 10074455 por si acaso
    const queryUrl = `${baseUrl}/SQLQueries('ordenes_muebles_comp_v3')/List`;
    const response = await fetch(queryUrl, {
      headers: { 'Cookie': cookieHeader, 'Prefer': 'odata.maxpagesize=10000' }
    });
    if (response.ok) {
      const json = await response.json();
      const match = (json.value || []).filter(r => String(r.orden_fabricacion) === '10074455');
      console.log(`10074455 en ordenes_muebles_comp_v3: ${match.length} filas`);
    }
  }
}

main().catch(err => console.error(err));
