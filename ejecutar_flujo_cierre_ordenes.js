require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Modo de ejecución: pasar --execute para aplicar cambios reales en Supabase
const isExecuteMode = process.argv.includes('--execute');

async function ejecutarFlujoCierre() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=========================================================================");
    console.log(`   FLUJO DE CIERRE DE ÓRDENES (18:00) - MODO: ${isExecuteMode ? '🔴 REAL (APLICA CIERRES)' : '🟡 SIMULACIÓN (DRY-RUN)'}`);
    console.log("=========================================================================\n");

    // 1. Leer órdenes pendientes desde Supabase
    console.log("1. Leyendo órdenes de fabricación pendientes desde Supabase...");
    const { data: ordenes, error: errOf } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*');

    if (errOf) {
        console.error("❌ Error leyendo Supabase:", errOf);
        return;
    }

    const pendientes = (ordenes || []).filter(o => o.pendiente === true || Number(o.pendiente) > 0);
    console.log(`   Total órdenes leídas en Supabase: ${ordenes ? ordenes.length : 0}`);
    console.log(`   Órdenes pendientes activas: ${pendientes.length}`);

    // Inicializar variable ordenesCompletadas en 0
    let ordenesCompletadas = 0;
    const cerradasExitosas = [];
    const discrepanciasSAP = [];
    const erroresSAP = [];

    const pasosProceso = [
        'pintura', 'vaciado', 'desgelcada', 'estanteria', 
        'pulido', 'acabado', 'reparacion', 'reparacion_larga', 
        'saldo', 'destruccion', 'empaque', 'digitado', 'transito'
    ];

    // Filtrar las que en la App tienen: todos los pasos en 0 y cedi = cantidad
    const candidatasApp = pendientes.filter(ord => {
        const cant = Number(ord.cantidad) || 0;
        const cedi = Number(ord.cedi) || 0;
        const pasosEnCero = pasosProceso.every(p => (Number(ord[p]) || 0) === 0);
        return pasosEnCero && cant > 0 && cedi === cant;
    });

    console.log(`\n2. Órdenes con [Pasos en 0 y CEDI = Cantidad]: ${candidatasApp.length}`);

    // 2. Conectar a SAP Service Layer
    console.log("\n3. Consultando estado en SAP Service Layer...");
    let sapConnected = false;
    const sapMap = {};

    try {
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

        if (loginRes.ok) {
            const { SessionId } = await loginRes.json();
            const baseUrl = loginUrl.replace('/Login', '');
            sapConnected = true;

            // Consultar en lotes de 30 órdenes
            const batchSize = 30;
            const docNums = candidatasApp.map(o => Number(o.orden_fabricacion)).filter(n => !isNaN(n) && n > 0);

            for (let i = 0; i < docNums.length; i += batchSize) {
                const slice = docNums.slice(i, i + batchSize);
                const filterStr = slice.map(num => `DocumentNumber eq ${num}`).join(' or ');
                try {
                    const res = await fetch(`${baseUrl}/ProductionOrders?$select=DocumentNumber,ProductionOrderStatus,PlannedQuantity,CompletedQuantity&$filter=${filterStr}`, {
                        headers: { 'Cookie': `B1SESSION=${SessionId}` }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        (json.value || []).forEach(po => {
                            sapMap[String(po.DocumentNumber)] = po;
                        });
                    }
                } catch (e) {
                    console.error(`Error consultando lote ${i} en SAP:`, e.message);
                }
            }
            console.log(`   Conexión exitosa a SAP. Órdenes contrastadas: ${Object.keys(sapMap).length}`);
        } else {
            console.error("   ❌ Error autenticando en SAP:", loginRes.statusText);
        }
    } catch (e) {
        console.error("   ❌ Excepción conectando a SAP:", e.message);
    }

    // 3. Evaluar cada orden y aplicar la lógica del flujo
    console.log("\n4. Evaluando condiciones para cada orden...");

    const idsParaCerrar = [];

    candidatasApp.forEach(ord => {
        const ofNum = String(ord.orden_fabricacion).trim();
        const sapPO = sapMap[ofNum];

        if (!sapConnected || !sapPO) {
            // Sino: Notificar error al consultar SAP
            erroresSAP.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                producto_sku: ord.producto_sku,
                cantidad: ord.cantidad,
                cedi: ord.cedi,
                motivo: !sapConnected ? 'Fallo de conexión con SAP' : 'Orden no encontrada en SAP'
            });
            return;
        }

        const plannedQty = Number(sapPO.PlannedQuantity) || Number(ord.cantidad) || 0;
        const cmpltQty = Number(sapPO.CompletedQuantity) || 0;

        // Si cedi en SAP = cantidad en SAP:
        if (cmpltQty >= plannedQty && plannedQty > 0) {
            idsParaCerrar.push(ord.id);
            cerradasExitosas.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                producto_sku: ord.producto_sku,
                cliente: ord.cliente,
                cantidad: ord.cantidad,
                cedi: ord.cedi,
                sapPlanned: plannedQty,
                sapCompleted: cmpltQty,
                sapStatus: sapPO.ProductionOrderStatus
            });
        } else {
            // Sino: Notificar a los analistas que faltan piezas por entregar en SAP
            discrepanciasSAP.push({
                id: ord.id,
                orden_fabricacion: ofNum,
                producto_sku: ord.producto_sku,
                cantidadApp: ord.cantidad,
                cediApp: ord.cedi,
                sapPlanned: plannedQty,
                sapCompleted: cmpltQty,
                faltantesSAP: plannedQty - cmpltQty,
                sapStatus: sapPO.ProductionOrderStatus
            });
        }
    });

    // 4. Si se confirma el cierre, actualizar en Supabase
    if (idsParaCerrar.length > 0) {
        if (isExecuteMode) {
            console.log(`\n5. 🚀 Aplicando CIERRE de ${idsParaCerrar.length} órdenes en Supabase...`);
            const updateBatchSize = 100;
            let totalActualizadas = 0;

            for (let i = 0; i < idsParaCerrar.length; i += updateBatchSize) {
                const batch = idsParaCerrar.slice(i, i + updateBatchSize);
                const { data, error: updErr } = await supabase
                    .from('ordenes_fabricacion')
                    .update({
                        pendiente: false,
                        fecha_entrega_real: new Date().toISOString(),
                        modificado_por: 'Flujo Cierre 18:00 Conciliacion SAP'
                    })
                    .in('id', batch)
                    .select('id');

                if (updErr) {
                    console.error(`Error cerrando lote ${i} en Supabase:`, updErr);
                } else {
                    totalActualizadas += data ? data.length : 0;
                }
            }

            ordenesCompletadas = totalActualizadas;
            console.log(`   ✅ Cierre completado exitosamente: ${ordenesCompletadas} órdenes actualizadas a pendiente = false.`);
        } else {
            ordenesCompletadas = idsParaCerrar.length;
            console.log(`\n5. ⚠️ MODO SIMULACIÓN: ${ordenesCompletadas} órdenes identificadas para cerrar (no se modificaron datos aún).`);
            console.log("   Para ejecutar el cierre real en Supabase ejecuta con: node ejecutar_flujo_cierre_ordenes.js --execute");
        }
    }

    // 5. GENERAR NOTIFICACIONES A LOS ANALISTAS
    console.log("\n=========================================================================");
    console.log("                  NOTIFICACIÓN PARA LOS ANALISTAS                        ");
    console.log("=========================================================================");

    // Si 'ordenesCompletadas' > 0: Notificar que se cerraron órdenes exitosamente
    if (ordenesCompletadas > 0) {
        console.log(`\n📢 [NOTIFICACIÓN DE ÉXITO]`);
        console.log(`   Se cerraron exitosamente ${ordenesCompletadas} órdenes de fabricación en el sistema.`);
        console.log(`   Criterio validado: Pasos de proceso en 0, CEDI = Cantidad en App y 100% entregadas en SAP.`);
    }

    // Sino (o adicional): Notificar que faltan piezas por entregar en SAP
    if (discrepanciasSAP.length > 0) {
        console.log(`\n⚠️ [ALERTA DISCREPANCIA SAP] Faltan piezas por entregar en SAP para ${discrepanciasSAP.length} órdenes:`);
        console.table(discrepanciasSAP);
    }

    // Sino: Notificar error al consultar SAP
    if (erroresSAP.length > 0) {
        console.log(`\n🚨 [ALERTA CONSULTA SAP] No se obtuvo confirmación de SAP para ${erroresSAP.length} órdenes (revisar catálogo ERP o conexión):`);
        console.table(erroresSAP.slice(0, 10));
    }

    // Guardar informe en archivo JSON para auditoría
    const informePath = path.join(__dirname, 'scratch', 'informe_cierre_ordenes.json');
    const informe = {
        fecha_ejecucion: new Date().toISOString(),
        modo: isExecuteMode ? 'EJECUCION_REAL' : 'SIMULACION',
        ordenesCompletadas,
        totalPendientesLeidas: pendientes.length,
        totalCandidatasApp: candidatasApp.length,
        cerradasExitosas: cerradasExitosas.map(o => ({ OF: o.orden_fabricacion, SKU: o.producto_sku, Cantidad: o.cantidad })),
        discrepanciasSAP,
        erroresSAP
    };

    if (!fs.existsSync(path.join(__dirname, 'scratch'))) {
        fs.mkdirSync(path.join(__dirname, 'scratch'));
    }
    fs.writeFileSync(informePath, JSON.stringify(informe, null, 2));
    console.log(`\n📄 Informe detallado guardado para auditoría en: scratch/informe_cierre_ordenes.json\n`);

    return informe;
}

ejecutarFlujoCierre();
