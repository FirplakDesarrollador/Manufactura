require('dotenv').config({ path: '.env' });

async function querySAPDocNums() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
    const sapUser = process.env.SAP_USERNAME || 'manager';
    const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

    const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : sapUrl + '/Login';
    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser })
    });
    const { SessionId } = await loginRes.json();
    const baseUrl = loginUrl.replace('/Login', '');

    // Check ProductionOrders directly
    const res = await fetch(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq 2259540 or DocumentNumber eq 2261244 or DocumentNumber eq 2261315`, {
        headers: { 'Cookie': `B1SESSION=${SessionId}` }
    });
    const data = await res.json();
    console.log("Result from ProductionOrders direct query:");
    console.log(JSON.stringify(data.value ? data.value.map(p => ({
        DocNum: p.DocumentNumber,
        AbsoluteEntry: p.AbsoluteEntry,
        Status: p.ProductionOrderStatus,
        PlannedQty: p.PlannedQuantity,
        CompletedQty: p.CompletedQuantity
    })) : data, null, 2));
}

querySAPDocNums();
