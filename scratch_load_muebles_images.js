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
  // OPs transcritas de las 3 imágenes (Prog 17 y Prog 18 Septiembre)
  const image1Orders = [
    '10074512', '10074507', '10074495', '10074513', '10074502', '10074508', '10074499',
    '10074520', '10074500', '10074514', '10074506', '10074492', '10074519', '10074491',
    '10074518', '10074505', '10074497', '10074438', '10074429', '10074295', '10074297',
    '10074296', '10074481', '10074480', '10074302', '10074300', '10074301', '10074299',
    '10074521', '10074522'
  ];

  const image2Orders = [
    '10074494', '10074496', '10074493', '10074503', '10074509', '10074515', '10074520',
    '10074504', '10074517', '10074490', '10074501', '10074516', '10074510', '10074524',
    '10074511', '10074489', '10074485', '10074467', '10074066', '10074069', '10074068'
  ];

  const image3Orders = [
    '10074129', '10074130', '10074525', '10074568', '10074526', '10074547', '10074451',
    '10074543', '10074452', '10074528', '10074263', '10074550', '10074561', '10074580',
    '10074548', '10074191', '10074071', '10074426', '10074553', '10074563', '10074419',
    '10074418', '10074554', '10074423', '10074128', '10074360', '10074421', '10074562',
    '10074552', '10074557'
  ];

  // Unir todas las órdenes únicas
  const allOrdersSet = new Set([...image1Orders, ...image2Orders, ...image3Orders]);
  const ordersToLoad = Array.from(allOrdersSet);

  console.log(`Total órdenes únicas a consultar de las 3 imágenes: ${ordersToLoad.length}`);

  const cookieHeader = await loginToSAP();
  const baseUrl = process.env.SAP_API_URL.replace('/Login', '');
  
  const queryUrl = `${baseUrl}/SQLQueries('ordenes_muebles_comp_v3')/List`;
  console.log("Consultando ordenes_muebles_comp_v3 en SAP Service Layer...");

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
  } else {
    console.error("Error al consultar ordenes_muebles_comp_v3:", response.status, await response.text());
  }

  const matchingRows = rawRows.filter(r => ordersToLoad.includes(String(r.orden_fabricacion)));
  console.log(`Filas de componentes encontradas en query: ${matchingRows.length}`);

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

  const foundOrderNums = Array.from(orderMap.keys());
  const missingOrderNums = ordersToLoad.filter(num => !foundOrderNums.includes(num));
  console.log(`Órdenes encontradas en query (${foundOrderNums.length}):`, foundOrderNums);
  console.log(`Órdenes no encontradas en query (${missingOrderNums.length}):`, missingOrderNums);

  for (const missingNum of missingOrderNums) {
    console.log(`Buscando orden ${missingNum} directamente en SAP ProductionOrders...`);
    const poRes = await fetch(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${missingNum}`, {
      headers: { "Cookie": cookieHeader }
    });
    if (poRes.ok) {
      const poData = await poRes.json();
      if (poData.value && poData.value.length > 0) {
        const po = poData.value[0];
        let itemDesc = po.ItemNo;
        const itemRes = await fetch(`${baseUrl}/Items('${po.ItemNo}')?$select=ItemName`, {
          headers: { "Cookie": cookieHeader }
        });
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          itemDesc = itemData.ItemName || itemDesc;
        }

        const compList = (po.ProductionOrderLines || []).map(line => ({
          sku: line.ItemNo,
          componente: line.ItemNo,
          cantidad: Math.round(((Number(line.PlannedQuantity) || 0) - (Number(line.IssuedQuantity) || 0)) * 100) / 100
        }));

        orderMap.set(missingNum, {
          orden_fabricacion: missingNum,
          numero_pedido: String(po.OriginNum || missingNum),
          producto_sku: po.ItemNo || '',
          producto_descripcion: itemDesc,
          cantidad: Number(po.PlannedQuantity) || 1,
          cliente: 'FIRPLAK S A',
          fecha_entrega_estimada: parseDate(po.DueDate),
          planta: 'Muebles',
          modificado_por: 'Manual SAP Sync',
          created_at: parseDate(po.CreationDate) || new Date().toISOString(),
          componentes: compList
        });
      } else {
        console.log(`Orden ${missingNum} NO existe en SAP ProductionOrders.`);
      }
    }
  }

  const finalOrdersToInsert = Array.from(orderMap.values());
  console.log(`Total órdenes procesadas para upsert en Supabase: ${finalOrdersToInsert.length}`);

  if (finalOrdersToInsert.length > 0) {
    const { data: upsertData, error: upsertError } = await supabase
      .from('ordenes_fabricacion_muebles')
      .upsert(finalOrdersToInsert, { onConflict: 'orden_fabricacion' })
      .select('orden_fabricacion, numero_pedido, producto_descripcion, cantidad, cliente');

    if (upsertError) {
      console.error("Error al upsert en Supabase:", upsertError);
    } else {
      console.log("Upsert exitoso en Supabase! Registros insertados/actualizados:", upsertData?.length);
      console.table(upsertData);
    }
  }
}

main().catch(err => console.error(err));
