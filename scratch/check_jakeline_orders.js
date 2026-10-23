const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function querySAP() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
    const sapUser = process.env.SAP_USERNAME || 'manager';
    const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

    const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : sapUrl + '/Login';
    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            CompanyDB: sapDb,
            UserName: sapUser,
            Password: sapPass
        })
    });

    const cookies = loginRes.headers.get('set-cookie');
    const baseUrl = sapUrl.replace(/\/Login\/?$/, '');

    for (const docNum of [2261707, 2261760]) {
        const res = await fetch(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${docNum}`, {
            headers: {
                'Cookie': cookies,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        console.log(`SAP OF ${docNum}:`, JSON.stringify(data.value?.map(p => ({
            AbsoluteEntry: p.AbsoluteEntry,
            DocumentNumber: p.DocumentNumber,
            ItemNo: p.ItemNo,
            PlannedQuantity: p.PlannedQuantity,
            CompletedQuantity: p.CompletedQuantity,
            RejectedQuantity: p.RejectedQuantity,
            ProductionOrderStatus: p.ProductionOrderStatus
        })), null, 2));
    }
}
querySAP().catch(console.error);
