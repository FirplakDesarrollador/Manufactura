import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually
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
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

  if (!response.ok) {
    throw new Error(`SAP Login Error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const routeIdMatch = (response.headers.get("set-cookie") || "").match(/ROUTEID=([^;]+)/);
  const routeId = routeIdMatch ? routeIdMatch[1] : "";
  return `B1SESSION=${data.SessionId}; ROUTEID=${routeId}`;
}

async function main() {
  try {
    const cookieHeader = await loginToSAP();
    console.log("Conectado a SAP exitosamente.");

    // The user mentioned 10070451. We will also check 10070454, 10070455
    const ordersToCheck = ['10070451', '10070454', '10070455'];
    
    const baseUrl = process.env.SAP_API_URL.replace('/Login', '');

    for (const orderNum of ordersToCheck) {
      console.log(`Consultando orden ${orderNum} en SAP...`);
      const res = await fetch(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${orderNum}`, {
        headers: { "Cookie": cookieHeader }
      });
      const data = await res.json();
      
      if (data.value && data.value.length > 0) {
        const sapOrder = data.value[0];
        console.log(JSON.stringify(sapOrder, null, 2));
      } else {
        console.log(`La orden ${orderNum} no se encontró en SAP.`);
      }
    }
  } catch (err) {
    console.error("Error en el script:", err);
  }
}

main();
