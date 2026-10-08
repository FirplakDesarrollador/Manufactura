require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarConciliacionSAP() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=================================================================");
    console.log("   INICIANDO CONCILIACIÓN DE ÓRDENES DE FABRICACIÓN (APP vs SAP) ");
    console.log("=================================================================\n");

    let ordenesCompletadas = 0;
    const cierresExitosos = [];
    const discrepancias = [];
    const erroresSAP = [];
    const enProceso = [];

    // 1. Leer órdenes de fabricación pendientes en Supabase
    console.log("1. Leyendo órdenes pendientes desde Supabase...");
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .gt('pendiente', 0);

    if (errOf) {
        console.error("❌ Error leyendo ordenes_fabricacion de Supabase:", errOf);
        return;
    }

    console.log(`   Se encontraron ${ordenes ? ordenes.length : 0} órdenes pendientes en la App.`);

    if (!ordenes || ordenes.length === 0) {
        console.log("No hay órdenes pendientes por procesar.");
        return;
    }

    // 2. Conectar a SAP Service Layer y consultar órdenes liberadas
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

            console.log("   Conexión exitosa a SAP SL. Consultando ordenes_marmol_sl136 y ordenes_pendientes_clean...");
            const marmolRes = await fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Prefer': 'odata.maxpagesize=500'
                }
            });

            if (marmolRes.ok) {
                const marmolData = await marmolRes.json();
                (marmolData.value || []).forEach(row => {
                    const docNum = String(row.DocNum || row.orden_fabricacion || '').trim();
                    if (docNum) sapMap[docNum] = row;
                });
                sapConnected = true;
                console.log(`   Se obtuvieron ${Object.keys(sapMap).length} órdenes liberadas desde SAP SL.`);
            } else {
                console.error("   ⚠️ Falló la consulta SQLQueries('ordenes_marmol_sl136') en SAP:", marmolRes.statusText);
            }
        } else {
            console.error("   ❌ Falló el inicio de sesión en SAP Service Layer:", loginRes.statusText);
        }
    } catch (sapErr) {
        console.error("   ❌ Excepción al conectar con SAP Service Layer:", sapErr.message);
    }

    // 3. Consultar trazabilidad de las piezas en Supabase
    console.log("\n3. Verificando trazabilidad de procesos en la App...");
    const ofNumbers = ordenes.map(o => String(o.orden_fabricacion || o.numero_pedido || o.id)).filter(Boolean);
    
    // Traer trazabilidad por lotes
    const { data: trazRecords, error: errTraz } = await supabase
        .from('query_trazabilidad_ms')
        .select('orden_fabricacion, estado, cedi_fecha, empaque_fecha')
        .in('orden_fabricacion', ofNumbers.slice(0, 1000));

    if (errTraz) {
        console.error("❌ Error leyendo trazabilidad de Supabase:", errTraz);
        return;
    }

    const trazByOf = {};
    (trazRecords || []).forEach(r => {
        const ofNum = String(r.orden_fabricacion).trim();
        if (!trazByOf[ofNum]) trazByOf[ofNum] = [];
        trazByOf[ofNum].push(r);
    });

    // 4. Evaluar cada orden según la lógica definida
    console.log("\n4. Evaluando órdenes una por una...\n");

    for (const ord of ordenes) {
        const ofNum = String(ord.orden_fabricacion || ord.numero_pedido || ord.id).trim();
        const cantReq = Number(ord.cantidad) || Number(ord.cantPlanificada) || 1;
        const traz = trazByOf[ofNum] || [];

        // Verificar si la orden está completada en la App
        const finishedPieces = traz.filter(t => 
            ['Cedi', 'cedi', 'Empaque', 'empaque', 'Transito', 'Digitado', 'Completado'].includes(t.estado) ||
            t.cedi_fecha != null ||
            t.empaque_fecha != null
        ).length;

        const isAppComplete = traz.length > 0 && finishedPieces >= cantReq;

        if (isAppComplete) {
            console.log(`📍 Orden ${ofNum} (${ord.producto_sku}): Completada en App (${finishedPieces}/${cantReq} piezas en CEDI/Empaque). Comparando con SAP...`);

            if (!sapConnected) {
                erroresSAP.push({
                    OF: ofNum,
                    SKU: ord.producto_sku,
                    Error: "No se pudo consultar SAP debido a un fallo de conexión o autenticación."
                });
                continue;
            }

            const sapData = sapMap[ofNum];

            if (sapData) {
                const plannedQty = Number(sapData.PlannedQty !== undefined ? sapData.PlannedQty : sapData.cantidad) || cantReq;
                const cmpltQty = Number(sapData.CmpltQty !== undefined ? sapData.CmpltQty : 0) || 0;

                if (cmpltQty >= plannedQty) {
                    console.log(`   ✅ SAP entrega completa: CmpltQty (${cmpltQty}) >= PlannedQty (${plannedQty}). CERRANDO ORDEN EN SUPABASE...`);
                    
                    // CERRAR ORDEN EN SUPABASE
                    const { error: updateErr } = await supabase
                        .from('ordenes_fabricacion')
                        .update({
                            pendiente: 0,
                            fecha_cierre: new Date().toISOString(),
                            modificado_por: 'Sistema Conciliacion SAP'
                        })
                        .eq('id', ord.id);

                    if (updateErr) {
                        console.error(`   ❌ Error actualizando orden ${ofNum} en Supabase:`, updateErr.message);
                    } else {
                        ordenesCompletadas++;
                        cierresExitosos.push({
                            OF: ofNum,
                            SKU: ord.producto_sku,
                            CantReq: cantReq,
                            SAPCmplt: cmpltQty,
                            SAPPld: plannedQty
                        });
                    }
                } else {
                    console.log(`   ⚠️ Discrepancia detectada: App completa (${finishedPieces}/${cantReq}), pero SAP CmpltQty = ${cmpltQty} / ${plannedQty}.`);
                    discrepancias.push({
                        OF: ofNum,
                        SKU: ord.producto_sku,
                        CantApp: finishedPieces,
                        SAPPlanned: plannedQty,
                        SAPCompleted: cmpltQty,
                        Detalle: `App registró ${finishedPieces} pz terminadas, pero en SAP solo hay ${cmpltQty} pz entregadas.`
                    });
                }
            } else {
                console.log(`   ⚠️ SAP no devolvió resultados para la OF ${ofNum}. Notificando a analistas...`);
                erroresSAP.push({
                    OF: ofNum,
                    SKU: ord.producto_sku,
                    Error: "La orden está terminada en la App, pero no figura como liberada o no fue encontrada en SAP."
                });
            }
        } else {
            enProceso.push({
                OF: ofNum,
                SKU: ord.producto_sku,
                CantReq: cantReq,
                CantTrazadas: traz.length,
                CantFin: finishedPieces
            });
        }
    }

    // 5. INFORME FINAL Y NOTIFICACIÓN A ANALISTAS
    console.log("\n=================================================================");
    console.log("                  RESUMEN FINAL DE CONCILIACIÓN                   ");
    console.log("=================================================================");
    console.log(`\n🎉 Total órdenes cerradas exitosamente ('ordenesCompletadas'): ${ordenesCompletadas}`);
    if (cierresExitosos.length > 0) {
        console.table(cierresExitosos);
    } else {
        console.log("   (0 cierres realizados en esta ejecución)");
    }

    console.log(`\n⚠️ Discrepancias detectadas (App 100% vs SAP Incompleto) [${discrepancias.length}]:`);
    if (discrepancias.length > 0) {
        console.table(discrepancias);
    } else {
        console.log("   (Ninguna discrepancia encontrada)");
    }

    console.log(`\n🚨 Alertas de SAP / Órdenes sin registro en ERP [${erroresSAP.length}]:`);
    if (erroresSAP.length > 0) {
        console.table(erroresSAP);
    } else {
        console.log("   (Sin errores de comunicación con SAP)");
    }

    console.log(`\n⏳ Órdenes que continúan en proceso de fabricación en planta [${enProceso.length}].`);
}

ejecutarConciliacionSAP();
