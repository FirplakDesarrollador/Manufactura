import fs from 'fs';

function loadEnv() {
  const env = fs.readFileSync('.env', 'utf-8');
  env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      process.env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

async function checkSAP() {
  loadEnv();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const url = process.env.SAP_API_URL;
  const username = process.env.SAP_USERNAME;
  const password = process.env.SAP_PASSWORD;
  const db = process.env.SAP_COMPANY_DB;

  console.log("Logging into SAP...");
  const loginRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CompanyDB: db, Password: password, UserName: username }),
  });

  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    return;
  }
  const data = await loginRes.json();
  const setCookie = loginRes.headers.get("set-cookie") || "";
  let routeId = "";
  const routeIdMatch = setCookie.match(/ROUTEID=([^;]+)/);
  if (routeIdMatch) routeId = routeIdMatch[1];
  const cookieHeader = `B1SESSION=${data.SessionId}; ROUTEID=${routeId}`;

  console.log("Fetching order 2258877...");
  const orderUrl = `${url.replace('/Login', '')}/ProductionOrders?$filter=DocumentNumber eq 2258877`;
  const orderRes = await fetch(orderUrl, {
    headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' }
  });

  if (!orderRes.ok) {
    console.error("Order fetch failed:", await orderRes.text());
    return;
  }

  const orderData = await orderRes.json();
  console.log("Order Data:", JSON.stringify(orderData, null, 2));
}

checkSAP();
