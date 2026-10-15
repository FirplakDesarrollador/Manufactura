require('dotenv').config({ path: '.env' });

async function checkFibraOrdersFromSAP() {
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

    console.log("Consultando ordenes_pendientes_clean en SAP SL...");
    const res = await fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
        headers: {
            'Cookie': `B1SESSION=${SessionId}`,
            'Prefer': 'odata.maxpagesize=1000'
        }
    });

    const data = await res.json();
    const allOrders = data.value || [];
    console.log(`Total órdenes liberadas en SAP: ${allOrders.length}`);

    // Filtro para Fibra de Vidrio: Prefijos VHPT, VTIN, VHEM, PPRD o descripciones de hidromasaje/bañera
    const fibraOrders = allOrders.filter(r => {
        const sku = String(r.ItemCode || r.producto_sku || '').toUpperCase().trim();
        const desc = String(r.ItemName || r.producto_descripcion || '').toUpperCase().trim();
        return /^(VHPT|VTIN|VHEM|PPRD)/i.test(sku) || 
               desc.includes('HIDROMASAJE') || 
               desc.includes('BAÑERA') || 
               desc.includes('JACUZZI') ||
               desc.includes('SPA ') ||
               desc.includes('TINA ');
    });

    console.log(`\n🎯 Órdenes de FIBRA DE VIDRIO encontradas en SAP: ${fibraOrders.length}`);

    // Analicemos fechas de estas órdenes de fibra:
    const fechasPost = {};
    const fechasDue = {};
    fibraOrders.forEach(o => {
        const post = String(o.PostDate || '').split('T')[0];
        const due = String(o.DueDate || '').split('T')[0];
        fechasPost[post] = (fechasPost[post] || 0) + 1;
        fechasDue[due] = (fechasDue[due] || 0) + 1;
    });

    console.log("\nDistribución por Fecha de Liberación (PostDate):", fechasPost);
    console.log("\nDistribución por Fecha de Entrega (DueDate):", fechasDue);

    console.log("\nMuestra de 10 órdenes de Fibra encontradas en SAP:");
    console.table(fibraOrders.slice(0, 10).map(o => ({
        OF: o.DocNum || o.orden_fabricacion,
        Pedido: o.U_Pedido || o.numero_pedido || '',
        SKU: o.ItemCode,
        Descripcion: (o.ItemName || '').substring(0, 35),
        Cantidad: o.PlannedQty,
        PostDate: o.PostDate,
        DueDate: o.DueDate,
        Cliente: (o.CardName || '').substring(0, 25)
    })));
}

checkFibraOrdersFromSAP();
