require('dotenv').config({ path: '.env' });

async function checkSAPFibra() {
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

    const res = await fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
        headers: {
            'Cookie': `B1SESSION=${SessionId}`,
            'Prefer': 'odata.maxpagesize=500'
        }
    });
    const data = await res.json();
    const rows = data.value || [];

    const fibraRows = rows.filter(r => {
        const sku = String(r.ItemCode || r.producto_sku || '').toUpperCase();
        const desc = String(r.ItemName || r.producto_descripcion || '').toUpperCase();
        return sku.startsWith('VHEM') || desc.includes('HIDROMASAJE') || desc.includes('SANTORINI') || desc.includes('BAÑERA') || desc.includes('JACUZZI');
    });

    console.log(`Total órdenes liberadas en SAP analizadas: ${rows.length}`);
    console.log(`Órdenes de Fibra de Vidrio detectadas en SAP: ${fibraRows.length}`);
    if (fibraRows.length > 0) {
        console.table(fibraRows.slice(0, 10).map(r => ({
            OF: r.DocNum,
            SKU: r.ItemCode,
            Descripcion: r.ItemName,
            FechaLiberacion: r.PostDate,
            FechaEntrega: r.DueDate,
            Cantidad: r.PlannedQty
        })));
    }
}

checkSAPFibra();
