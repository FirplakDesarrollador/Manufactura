require('dotenv').config({ path: '.env' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    const sapUrl = 'https://200.7.96.194:50000/b1s/v1/Login';
    const loginRes = await fetch(sapUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: 'Firplak_SA', Password: '2023Fir#.*', UserName: 'manager' })
    });
    const { SessionId } = await loginRes.json();
    const baseUrl = sapUrl.replace('/Login', '');
    const res = await fetch(`${baseUrl}/ProductionOrders?$select=DocumentNumber,ItemNo,ProductionOrderStatus,PostingDate,CreationDate,DueDate,PlannedQuantity&$orderby=DocumentNumber desc&$top=10`, {
        headers: { 'Cookie': 'B1SESSION=' + SessionId }
    });
    const data = await res.json();
    console.log('Top 10 highest DocumentNumbers currently in SAP B1:');
    console.table(data.value);
}

main().catch(console.error);
