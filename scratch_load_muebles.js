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

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes('T')) {
    return str;
  }
  if (str.length === 8) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${year}-${month}-${day} 00:00:00`;
  }
  return str;
}

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
  const ordersToLoad = [
    '10074370', '10074465', '10074459', '10074458', '10074449', '10074404',
    '10074367', '10074261', '10074456', '10074380', '10074363', '10074400',
    '10074455', '10074555', '10074362', '10074399', '10074365', '10074468',
    '10074467', '10074376', '10074374', '10074371', '10074377', '10074379',
    '10074364', '10074454', '10074322', '10074375', '10074464', '10074318',
    '10074323', '10074521'
  ];
  
  console.log(`Cargando ${ordersToLoad.length} órdenes...`);

  const cookieHeader = await loginToSAP();
  const baseUrl = process.env.SAP_API_URL.replace('/Login', '');
  
  const queryUrl = `${baseUrl}/SQLQueries('ordenes_muebles_comp_v3')/List`;

  const response = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json',
      'Prefer': 'odata.maxpagesize=10000'
    }
  });

  let rawRows = [];
  if (response.ok) {
    const json = await response.json();
    rawRows = json.value || [];
  }

  const matchingRows = rawRows.filter(r => ordersToLoad.includes(String(r.orden_fabricacion)));

  const orderMap = new Map();
  matchingRows.forEach((row) => {
    const docNum = String(row.orden_fabricacion || '');
    if (!docNum) return;

    if (!orderMap.has(docNum)) {
      orderMap.set(docNum, {
        orden_fabricacion: docNum,
        numero_pedido: row.numero_pedido || docNum,
        producto_sku: row.producto_sku || '',
        producto_descripcion: row.producto_descripcion || '',
        cantidad: Number(row.cantidad) || 1,
        cliente: row.cliente || 'FIRPLAK S A',
        fecha_entrega_estimada: parseDate(row.fecha_entrega_estimada),
        planta: row.planta || 'Muebles',
        modificado_por: 'SAP Service Layer Sync',
        created_at: parseDate(row.fecha_liberacion) || new Date().toISOString(),
        componentes: []
      });
    }

    const order = orderMap.get(docNum);
    if (row.componente_sku && row.componente_nombre) {
      const planned = Number(row.comp_planned) || 0;
      const issued = Number(row.comp_issued) || 0;
      const compQty = Math.round((planned - issued) * 100) / 100;
      
      order.componentes.push({
        sku: row.componente_sku,
        componente: row.componente_nombre,
        cantidad: compQty
      });
    }
  });

  const finalOrdersToInsert = Array.from(orderMap.values());

  if (finalOrdersToInsert.length > 0) {
    const { data: upsertData, error: upsertError } = await supabase
      .from('ordenes_fabricacion_muebles')
      .upsert(finalOrdersToInsert, { onConflict: 'orden_fabricacion' })
      .select('orden_fabricacion');

    if (upsertError) {
      console.error("Error al upsert en Supabase:", upsertError);
    } else {
      console.log("Upsert exitoso en Supabase! Registros cargados/actualizados:", upsertData?.length);
    }
  }
}

main().catch(err => console.error(err));
