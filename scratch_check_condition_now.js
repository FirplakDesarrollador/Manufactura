require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCondition() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== EVALUANDO CONDICIÓN EXACTA DEL USUARIO ===");

    // 1. Leer órdenes pendientes desde Supabase
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*');

    if (errOf) {
        console.error("Error leyendo query_ordenes_fabricacion:", errOf);
        return;
    }

    console.log(`Total órdenes cargadas desde Supabase: ${ordenes ? ordenes.length : 0}`);

    // Filtrar solo las pendientes
    const pendientes = (ordenes || []).filter(o => o.pendiente === true || Number(o.pendiente) > 0);
    console.log(`Total órdenes PENDIENTES en Supabase: ${pendientes.length}`);

    // Pasos del proceso a revisar (deben estar todos en 0)
    const pasosProceso = [
        'pintura', 'vaciado', 'desgelcada', 'estanteria', 
        'pulido', 'acabado', 'reparacion', 'reparacion_larga', 
        'saldo', 'destruccion', 'empaque', 'digitado', 'transito'
    ];

    // 2. Evaluar condición: todos los pasos en 0 y cedi == cantidad
    const cumplenApp = [];
    const enProcesoApp = [];

    pendientes.forEach(ord => {
        const cant = Number(ord.cantidad) || 0;
        const cedi = Number(ord.cedi) || 0;

        // Verificar si todos los pasos del proceso están en 0
        const pasosEnCero = pasosProceso.every(paso => {
            const val = Number(ord[paso]) || 0;
            return val === 0;
        });

        // cedi = cantidad
        const cediIgualCantidad = (cant > 0 && cedi === cant);

        if (pasosEnCero && cediIgualCantidad) {
            cumplenApp.push(ord);
        } else {
            enProcesoApp.push({
                ord,
                pasosEnCero,
                cediIgualCantidad,
                cedi,
                cant
            });
        }
    });

    console.log(`\n1. Órdenes pendientes con [Pasos en 0 Y CEDI = Cantidad]: ${cumplenApp.length}`);
    if (cumplenApp.length > 0) {
        console.table(cumplenApp.slice(0, 5).map(o => ({
            id: o.id,
            OF: o.orden_fabricacion,
            SKU: o.producto_sku,
            Cant: o.cantidad,
            Cedi: o.cedi,
            Empaque: o.empaque,
            Vaciado: o.vaciado,
            Pulido: o.pulido
        })));
    }

    // También veamos si hay órdenes donde cedi >= cantidad pero algún paso no está en 0
    const cediIgualPeroPasosNoCero = pendientes.filter(o => {
        const cant = Number(o.cantidad) || 0;
        const cedi = Number(o.cedi) || 0;
        const cediOk = cant > 0 && cedi >= cant;
        const pasosEnCero = pasosProceso.every(paso => (Number(o[paso]) || 0) === 0);
        return cediOk && !pasosEnCero;
    });
    console.log(`\n(Dato adicional) Órdenes pendientes con CEDI >= Cantidad pero con pasos != 0: ${cediIgualPeroPasosNoCero.length}`);

    // 3. Consultar SAP para las órdenes que cumplen condición en la App (o para todas si son pocas)
    let sapMap = {};
    let sapConnected = false;
    try {
        console.log("\n2. Conectando a SAP Service Layer...");
        const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
        const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
        const sapUser = process.env.SAP_USERNAME || 'manager';
        const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

        const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : `${sapUrl.replace(/\/$/, '')}/Login`;
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser })
        });

        if (loginRes.ok) {
            const loginData = await loginRes.json();
            const sessionId = loginData.SessionId;
            const baseUrl = loginUrl.replace('/Login', '');

            // Traer ordenes_pendientes_clean y ordenes_marmol_sl136
            const [genRes, marmolRes] = await Promise.all([
                fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
                    headers: { 'Cookie': `B1SESSION=${sessionId}`, 'Prefer': 'odata.maxpagesize=1000' }
                }),
                fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
                    headers: { 'Cookie': `B1SESSION=${sessionId}`, 'Prefer': 'odata.maxpagesize=1000' }
                })
            ]);

            if (genRes.ok) {
                const genData = await genRes.json();
                (genData.value || []).forEach(r => {
                    const docNum = String(r.DocNum || r.orden_fabricacion || '').trim();
                    if (docNum) sapMap[docNum] = r;
                });
            }

            if (marmolRes.ok) {
                const marmolData = await marmolRes.json();
                (marmolData.value || []).forEach(r => {
                    const docNum = String(r.DocNum || r.orden_fabricacion || '').trim();
                    if (docNum) sapMap[docNum] = { ...(sapMap[docNum] || {}), ...r };
                });
            }

            sapConnected = true;
            console.log(`   Conexión exitosa a SAP SL. Órdenes cargadas de SAP: ${Object.keys(sapMap).length}`);
        } else {
            console.error("   Fallo en login de SAP:", loginRes.statusText);
        }
    } catch (e) {
        console.error("   Error conectando a SAP:", e.message);
    }

    // 4. Evaluar en SAP para las órdenes que cumplen condición en la App
    console.log("\n3. Evaluando condición completa con SAP...");
    let ordenesCompletadas = 0;
    const cerrables = [];
    const faltanPiezasSAP = [];
    const noEncontradasSAP = [];

    for (const ord of cumplenApp) {
        const ofNum = String(ord.orden_fabricacion || '').trim();
        const sapData = sapMap[ofNum];

        if (!sapData) {
            noEncontradasSAP.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantidadApp: ord.cantidad,
                CediApp: ord.cedi,
                Motivo: 'No se encontraron datos en la consulta de SAP'
            });
            continue;
        }

        const plannedQty = Number(sapData.PlannedQty !== undefined ? sapData.PlannedQty : (sapData.cantidad || ord.cantidad)) || 0;
        const cmpltQty = Number(sapData.CmpltQty !== undefined ? sapData.CmpltQty : 0) || 0;

        // En SAP: cedi en SAP = cantidad en SAP (CmpltQty == PlannedQty)
        if (cmpltQty >= plannedQty && plannedQty > 0) {
            ordenesCompletadas++;
            cerrables.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                Cliente: ord.cliente,
                CantApp: ord.cantidad,
                CediApp: ord.cedi,
                SAPPld: plannedQty,
                SAPCmplt: cmpltQty,
                StatusSAP: sapData.Status || sapData.status || 'R'
            });
        } else {
            faltanPiezasSAP.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantApp: ord.cantidad,
                CediApp: ord.cedi,
                SAPPld: plannedQty,
                SAPCmplt: cmpltQty,
                FaltantesSAP: plannedQty - cmpltQty
            });
        }
    }

    console.log("\n==================== RESUMEN NUMÉRICO ====================");
    console.log(`1. Total órdenes pendientes en Supabase: ${pendientes.length}`);
    console.log(`2. Órdenes con [Pasos en 0 Y CEDI = Cantidad] en App: ${cumplenApp.length}`);
    console.log(`3. Órdenes pendientes con CEDI >= Cantidad (independiente de pasos): ${pendientes.filter(o => Number(o.cedi) >= Number(o.cantidad) && Number(o.cantidad) > 0).length}`);
    console.log(`4. Conexión a SAP: ${sapConnected ? 'EXITOSA' : 'FALLIDA'}`);
    console.log(`   - Total órdenes en SAP: ${Object.keys(sapMap).length}`);
    console.log(`5. De las ${cumplenApp.length} órdenes que cumplen en la App:`);
    console.log(`   --> ✅ CUMPLEN TODA LA CONDICIÓN PARA SER CERRADAS (CmpltQty == PlannedQty en SAP): ${ordenesCompletadas}`);
    console.log(`   --> ⚠️ FALTAN PIEZAS POR ENTREGAR EN SAP (CmpltQty < PlannedQty): ${faltanPiezasSAP.length}`);
    console.log(`   --> 🚨 ERROR / NO ENCONTRADAS EN SAP: ${noEncontradasSAP.length}`);

    if (cerrables.length > 0) {
        console.log("\nDetalle de las órdenes listas para cerrar:");
        console.table(cerrables);
    }
    if (faltanPiezasSAP.length > 0) {
        console.log(`\nMuestra de órdenes con faltantes en SAP (primeras 5 de ${faltanPiezasSAP.length}):`);
        console.table(faltanPiezasSAP.slice(0, 5));
    }
    if (noEncontradasSAP.length > 0) {
        console.log(`\nMuestra de órdenes no encontradas en SAP (primeras 5 de ${noEncontradasSAP.length}):`);
        console.table(noEncontradasSAP.slice(0, 5));
    }
}

checkCondition();

