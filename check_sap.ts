import { loginToSAP } from './lib/sap.js'; // We might need to compile or run with tsx

async function main() {
  try {
    const sapAuth = await loginToSAP();
    console.log("Logged in:", sapAuth.sessionId);

    // Query ProductionOrders
    const baseUrl = process.env.SAP_API_URL.replace('/Login', '');
    const ordersToFind = [2254650];
    
    for (const orderNum of ordersToFind) {
      const url = `${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${orderNum}`;
      const res = await fetch(url, {
        headers: {
          "Cookie": sapAuth.cookieHeader
        }
      });
      const data = await res.json();
      if (data.value && data.value.length > 0) {
        const order = data.value[0];
        console.log(`Order ${orderNum}: Qty=${order.PlannedQuantity}, Status=${order.ProductionOrderStatus}, Item=${order.ItemNo}`);
      } else {
        console.log(`Order ${orderNum} not found in SAP.`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
