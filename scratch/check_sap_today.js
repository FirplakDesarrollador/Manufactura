require('dotenv').config({ path: '.env' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    const sapUrl = 'https://200.7.96.194:50000/b1s/v1/Login';
    const sapDb = 'Firplak_SA';
    const sapUser = 'manager';
    const sapPass = '2023Fir#.*';

    console.log('Conectando a SAP SL directo...');
    try {
        const loginRes = await fetch(sapUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser }),
            signal: AbortSignal.timeout(10000)
        });
        const loginData = await loginRes.json();
        const sessionId = loginData.SessionId;
        console.log('Login exitoso. Consultando ProductionOrders...');

        const baseUrl = sapUrl.replace('/Login', '');
        
        // 1. ProductionOrders con CreationDate o PostingDate >= 2026-10-14
        const poRes = await fetch(`${baseUrl}/ProductionOrders?$select=DocumentNumber,ItemNo,ProductionOrderStatus,PostingDate,CreationDate,DueDate,PlannedQuantity&$filter=PostingDate ge '2026-10-14' or CreationDate ge '2026-10-14'`, {
            headers: { 'Cookie': `B1SESSION=${sessionId}` },
            signal: AbortSignal.timeout(15000)
        });
        const poData = await poRes.json();
        const orders = poData.value || [];
        console.log(`Total ProductionOrders en SAP SL con fecha >= 2026-10-14: ${orders.length}`);

        const today20261015 = orders.filter(o => String(o.CreationDate || o.PostingDate || '').startsWith('2026-10-15'));
        console.log(`ProductionOrders con fecha de hoy (2026-10-15): ${today20261015.length}`);

        if (today20261015.length > 0) {
            console.table(today20261015);
        } else {
            console.log('Últimas 5 órdenes registradas:');
            console.table(orders.slice(-5));
        }

    } catch (e) {
        console.log('Error o timeout en SAP:', e.message);
    }
}

main();
