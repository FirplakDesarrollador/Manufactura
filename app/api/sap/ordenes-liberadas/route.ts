import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        let rawRows: any[] = [];
        let marmolRawRows: any[] = [];
        let fetchedFromSap = false;

        // Helper para normalizar fechas de SAP o Cloudflare a formato ISO YYYY-MM-DDTHH:mm:ss sin desfasar zona horaria
        const formatSapDate = (raw: any): string | null => {
            if (!raw) return null;
            const str = String(raw).trim();
            if (!str || str === 'null' || str === 'undefined') return null;
            if (/^\d{8}$/.test(str)) {
                return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}T00:00:00`;
            }
            const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                // Se conserva la descripción completa de SAP (incluye sufijos como "(CAJA CERRADA)")
                const cleanDesc = rawDesc;
            }
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const m = String(parsed.getMonth() + 1).padStart(2, '0');
                const d = String(parsed.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}T00:00:00`;
            }
            return null;
        };

        const cloudflareBaseUrl = process.env.SEMAFORO_API_URL 
            ? process.env.SEMAFORO_API_URL.replace(/\/semaforo\/?$/, '')
            : "https://toner-villages-acoustic-colony.trycloudflare.com";
        const cloudflareApiKey = process.env.SEMAFORO_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';

        let fibraExtraMap = new Map<string, any>();

        // 1. Consultar SAP Service Layer directamente (fuente primaria con U_FRealLiberacion para fecha ideal)
        try {
            console.log('Consultando órdenes directamente en SAP Service Layer...');
            const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
            const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
            const sapUser = process.env.SAP_USERNAME || 'manager';
            const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

            const loginUrl = sapUrl.endsWith('/Login') ? sapUrl : `${sapUrl.replace(/\/$/, '')}/Login`;
            const loginRes = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser }),
                signal: AbortSignal.timeout(12000)
            });

            if (loginRes.ok) {
                const loginData = await loginRes.json();
                const sessionId = loginData.SessionId;
                if (sessionId) {
                    const baseUrl = loginUrl.replace('/Login', '');
                    const [genRes, marmolRes] = await Promise.allSettled([
                        fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
                            headers: { 'Cookie': `B1SESSION=${sessionId}`, 'Prefer': 'odata.maxpagesize=1000' },
                            signal: AbortSignal.timeout(15000)
                        }),
                        fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
                            headers: { 'Cookie': `B1SESSION=${sessionId}`, 'Prefer': 'odata.maxpagesize=1000' },
                            signal: AbortSignal.timeout(15000)
                        })
                    ]);

                    if (genRes.status === 'fulfilled' && genRes.value.ok) {
                        const qData = await genRes.value.json();
                        if (Array.isArray(qData.value) && qData.value.length > 0) {
                            rawRows = qData.value;
                            fetchedFromSap = true;
                            console.log(`SAP Service Layer (general) devolvió ${rawRows.length} órdenes liberadas.`);
                        }
                    }

                    if (marmolRes.status === 'fulfilled' && marmolRes.value.ok) {
                        const mData = await marmolRes.value.json();
                        if (Array.isArray(mData.value) && mData.value.length > 0) {
                            marmolRawRows = mData.value;
                            console.log(`SAP Service Layer (Mármol Sintético) devolvió ${marmolRawRows.length} órdenes.`);
                        }
                    }
                }
            }
        } catch (sapErr) {
            console.warn('Fallo o timeout conectando a SAP Service Layer directo:', sapErr);
        }

        // 2. Si no se obtuvieron datos directos de SAP, intentar API Cloudflare como fallback
        if (rawRows.length === 0 || marmolRawRows.length === 0) {
            try {
                console.log('Intentando fallback vía API Cloudflare...');
                const [cfMarmolRes, cfGenRes, cfFibraRes] = await Promise.allSettled([
                    fetch(`${cloudflareBaseUrl}/ordenes_marmol/`, {
                        headers: { 'api-key': cloudflareApiKey },
                        cache: 'no-store',
                        signal: AbortSignal.timeout(12000)
                    }),
                    fetch(`${cloudflareBaseUrl}/ordenesliberadasms`, {
                        headers: { 'api-key': cloudflareApiKey },
                        cache: 'no-store',
                        signal: AbortSignal.timeout(12000)
                    }),
                    fetch(`${cloudflareBaseUrl}/ordenes_fibra/`, {
                        headers: { 'api-key': cloudflareApiKey },
                        cache: 'no-store',
                        signal: AbortSignal.timeout(12000)
                    })
                ]);

                if (marmolRawRows.length === 0 && cfMarmolRes.status === 'fulfilled' && cfMarmolRes.value.ok) {
                    const mData = await cfMarmolRes.value.json();
                    const mItems = Array.isArray(mData) ? mData : (mData.response || []);
                    if (mItems.length > 0) marmolRawRows = mItems;
                }

                if (rawRows.length === 0 && cfGenRes.status === 'fulfilled' && cfGenRes.value.ok) {
                    const gData = await cfGenRes.value.json();
                    const gItems = Array.isArray(gData) ? gData : (gData.response || []);
                    if (gItems.length > 0) {
                        rawRows = gItems;
                        fetchedFromSap = true;
                    }
                }

                if (cfFibraRes.status === 'fulfilled' && cfFibraRes.value.ok) {
                    const fData = await cfFibraRes.value.json();
                    const fItems = Array.isArray(fData) ? fData : (fData.response || []);
                    fItems.forEach((item: any) => {
                        const doc = String(item.orden_fabricacion || item.DocNum);
                        fibraExtraMap.set(doc, item);
                    });
                }
            } catch (cfErr) {
                console.warn('Fallo en API Cloudflare:', cfErr);
            }
        }

        // Helper para distinguir SKUs que NO pertenecen a Mármol Sintético / Fibra / Vaciado (Muebles, Empaque, Cajas, Insumos)
        const isNonMarmolSku = (sku: string, desc?: string) => {
            if (/^(VHPT|VTIN|VHEM|VEXH|VMUB|MUEB|PEMP|CEMP|PZCO|CMPD)/i.test(sku)) return true;
            if (desc && /^CAJA\s/i.test(desc.trim())) return true;
            return false;
        };

        // 3. Mapear datos para el frontend (page.tsx), Power Automate y Supabase
        const mappedRows = rawRows.map(item => {
            const docNum = item.DocNum || item.orden_fabricacion || '';
            const typeStr = item.Type === 'S' ? 'Estándar' : (item.Type === 'D' ? 'Desmontar' : (item.type || 'Especial'));
            const statusStr = item.Status === 'R' ? 'Liberado' : (item.Status === 'L' ? 'Cerrado' : (item.Status === 'C' ? 'Cancelado' : (item.Status || 'Planificado')));
            const plannedQty = Number(item.PlannedQty !== undefined ? item.PlannedQty : (item['Cant.Planificada'] !== undefined ? item['Cant.Planificada'] : item.cantidad)) || 1;
            const cmpltQty = Number(item.CmpltQty !== undefined ? item.CmpltQty : (item['Cant.Completada'] !== undefined ? item['Cant.Completada'] : 0)) || 0;
            const pendienteQty = item.Pendiente !== undefined ? Number(item.Pendiente) : (item['PENDIENTE-OJO cuando sea superior a 1'] !== undefined ? Number(item['PENDIENTE-OJO cuando sea superior a 1']) : (plannedQty - cmpltQty));
            const prodDesc = item.ItemName || item.Itemname || item.producto_descripcion || '';

            const fechaFin = formatSapDate(item.DueDate || item['Fecha Finalización'] || item.fecha_entrega_estimada);
            const fechaFab = formatSapDate(item.PostDate || item['Fecha Fabricación'] || item.fecha_liberacion || item.StartDate) || '';

            const rawIdeal = item.U_FRealLiberacion ||
                             item['fecha_ideal_producción'] ||
                             item['fecha_ideal_produccion'] ||
                             item['fecha_ideal_producci n'] ||
                             item.fecha_ideal_produccion ||
                             item.U_FLiberacionPlan ||
                             item.U_FechaLibToc ||
                             item.fecha_liberacion ||
                             item.RlsDate ||
                             fechaFin;
            const fechaIdeal = formatSapDate(rawIdeal) || fechaFin;

            const extraFibra = fibraExtraMap.get(String(docNum));

            return {
                docNum: docNum,
                tipo: typeStr,
                status: statusStr,
                fechaFabricacion: fechaFab,
                fechaFinalizacion: fechaFin || '',
                fechaCierre: item.CloseDate ? formatSapDate(item.CloseDate) : null,
                codigoCliente: item.CardCode || item.cliente || '',
                nombreSN: item.CardName || item.Cliente || item.cliente || 'FIRPLAK S A',
                itemCode: item.ItemCode || item.producto_sku || '',
                itemName: prodDesc,
                almacen: item.Warehouse || item.almacen || '',
                cantPlanificada: plannedQty,
                cantCompletada: cmpltQty,
                pendiente: pendienteQty,
                usuario: item.U_name || item.U_NAME || item.usuario || 'Sistema SAP',

                orden_fabricacion: String(docNum),
                numero_pedido: item.numero_pedido || String(docNum),
                producto_sku: item.ItemCode || item.producto_sku || '',
                producto_descripcion: prodDesc,
                color: item.color || '',
                cantidad: plannedQty,
                cliente: item.CardName || item.Cliente || item.cliente || 'FIRPLAK S A',
                comentario: item.comentarios || item.comentario || '',
                fecha_entrega_estimada: fechaFin,
                fecha_ideal_produccion: fechaIdeal,
                tamano: item.tamano || '',
                linea: item.U_Linea || item.linea || 'F02',
                molde_sku: item.molde_sku || '',
                molde_descripcion: item.molde_descripcion || prodDesc,
                kilos_gelcoat: item['Kilos Gelcoat'] !== undefined && item['Kilos Gelcoat'] !== null ? Number(item['Kilos Gelcoat']) : null,
                componentes: extraFibra ? extraFibra.componentes : (item.componentes || null),
                modificado_por: 'Sistema SAP'
            };
        });

        // 4. Preparar los registros EXCLUSIVOS de Mármol Sintético para la tabla 'ordenes_fabricacion'
        let msUpsertBatch: any[] = [];

        if (marmolRawRows.length > 0) {
            msUpsertBatch = marmolRawRows.map(item => {
                const rawDesc = (item.producto_descripcion || item.ItemName || '').trim();
                // Se conserva la descripción completa de SAP (incluye sufijos como "(CAJA CERRADA)")
                const cleanDesc = rawDesc;

                const rawIdeal = item.U_FRealLiberacion ||
                                 item.fecha_ideal_produccion ||
                                 item['fecha_ideal_producción'] ||
                                 item['fecha_ideal_produccion'] ||
                                 item['fecha_ideal_producci n'] ||
                                 item.U_FLiberacionPlan ||
                                 item.fecha_liberacion ||
                                 item.RlsDate ||
                                 item.fecha_entrega_estimada ||
                                 item.DueDate;
                const rawFin = item.fecha_entrega_estimada || item.DueDate;
                const fechaFin = formatSapDate(rawFin);
                const fechaIdeal = formatSapDate(rawIdeal) || fechaFin;

                return {
                    orden_fabricacion: String(item.orden_fabricacion || item.DocNum),
                    numero_pedido: item.numero_pedido || String(item.orden_fabricacion || item.DocNum),
                    producto_sku: item.producto_sku || item.ItemCode || '',
                    producto_descripcion: cleanDesc,
                    cantidad: Number(item.cantidad || item.PlannedQty) || 1,
                    cliente: item.cliente || item.CardName || 'FIRPLAK S A',
                    comentario: item.comentarios || item.comentario || '',
                    fecha_entrega_estimada: fechaFin,
                    fecha_ideal_produccion: fechaIdeal,
                    tamano: item.tamano || '',
                    linea: item.linea || 'F02',
                    molde_sku: item.molde_sku || '',
                    molde_descripcion: item.molde_descripcion || '',
                    kilos_gelcoat: item.kilos_gelcoat !== undefined && item.kilos_gelcoat !== null ? Number(item.kilos_gelcoat) : null,
                    modificado_por: 'Sistema SAP'
                };
            });
        } else {
            msUpsertBatch = mappedRows
                .filter(r => !isNonMarmolSku(r.producto_sku, r.producto_descripcion))
                .map(r => {
                    const rawDesc = (r.producto_descripcion || r.itemName || '').trim();
                    // Se conserva la descripción completa de SAP (incluye sufijos como "(CAJA CERRADA)")
                    const cleanDesc = rawDesc;
                    return {
                        orden_fabricacion: r.orden_fabricacion,
                        numero_pedido: r.numero_pedido,
                        producto_sku: r.producto_sku,
                        producto_descripcion: cleanDesc,
                        cantidad: r.cantidad,
                        cliente: r.cliente,
                        comentario: r.comentario,
                        fecha_entrega_estimada: r.fecha_entrega_estimada,
                        fecha_ideal_produccion: r.fecha_ideal_produccion,
                        tamano: r.tamano,
                        linea: r.linea,
                        molde_sku: r.molde_sku,
                        molde_descripcion: r.molde_descripcion,
                        kilos_gelcoat: r.kilos_gelcoat,
                        modificado_por: 'Sistema SAP'
                    };
                });
        }

        // Sincronizar catálogo de productos en 'productos' para asegurar que el join en query_ordenes_fabricacion siempre funcione
        const productosMap = new Map<string, { producto_sku: string; producto_descripcion: string }>();
        msUpsertBatch.forEach(item => {
            if (item.producto_sku && item.producto_descripcion) {
                productosMap.set(item.producto_sku, {
                    producto_sku: item.producto_sku,
                    producto_descripcion: item.producto_descripcion
                });
            }
        });
        const productosBatch = Array.from(productosMap.values());
        if (productosBatch.length > 0) {
            await supabase.from('productos').upsert(productosBatch, { onConflict: 'producto_sku' });
        }

        // Upsert a la tabla ordenes_fabricacion (Mármol Sintético / Vaciado / Fibra / Pintura)
        if (msUpsertBatch.length > 0) {
            // Consultar órdenes ya cerradas o canceladas (pendiente = false) en Supabase para NO reactivarlas
            const { data: nonPendingRows } = await supabase
                .from('ordenes_fabricacion')
                .select('orden_fabricacion')
                .eq('pendiente', false);

            const nonPendingSet = new Set((nonPendingRows || []).map(r => String(r.orden_fabricacion)));

            // Filtrar batch excluyendo las órdenes marcadas como no pendientes / canceladas / eliminadas
            const cleanBatch = msUpsertBatch.filter(item => !nonPendingSet.has(String(item.orden_fabricacion)));

            const BATCH_SIZE = 50;
            for (let i = 0; i < cleanBatch.length; i += BATCH_SIZE) {
                const batch = cleanBatch.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('ordenes_fabricacion')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (error) {
                    console.error('Error upserting ordenes_fabricacion (MS):', error);
                }
            }
            console.log(`Upserted ${cleanBatch.length} Mármol Sintético orders to ordenes_fabricacion (excluidas ${msUpsertBatch.length - cleanBatch.length} canceladas/cerradas).`);

            // Cierre automático de órdenes que ya completaron 100% en CEDI y están cerradas en SAP.
            // Regla: Si cedi >= cantidad, todos los pasos en planta están en 0 y ya no vienen en la lista de liberadas de SAP,
            // se marcan como pendiente = false para no saturar Control de Piso.
            try {
                const sapActiveSet = new Set(mappedRows.map(r => String(r.orden_fabricacion)).filter(Boolean));
                const { data: pendingPlantOrders } = await supabase
                    .from('query_ordenes_fabricacion')
                    .select('id, orden_fabricacion, cantidad, cedi, pintura, vaciado, pulido, acabado, empaque, digitado, transito')
                    .eq('pendiente', true);

                if (pendingPlantOrders && pendingPlantOrders.length > 0) {
                    const pasosEval = ['pintura', 'vaciado', 'pulido', 'acabado', 'empaque', 'digitado', 'transito'];
                    const idsToClose = pendingPlantOrders
                        .filter(ord => {
                            const cant = Number(ord.cantidad) || 0;
                            const cedi = Number(ord.cedi) || 0;
                            const stepsZero = pasosEval.every(p => (Number((ord as any)[p]) || 0) === 0);
                            const ofDoc = String(ord.orden_fabricacion);
                            return cant > 0 && cedi >= cant && stepsZero && !sapActiveSet.has(ofDoc);
                        })
                        .map(o => o.id)
                        .filter(Boolean);

                    if (idsToClose.length > 0) {
                        const { error: closeErr } = await supabase
                            .from('ordenes_fabricacion')
                            .update({
                                pendiente: false,
                                fecha_entrega_real: new Date().toISOString(),
                                modificado_por: 'Sistema SAP (Cierre Automático)'
                            })
                            .in('id', idsToClose);

                        if (!closeErr) {
                            console.log(`✅ Cierre automático: ${idsToClose.length} órdenes finalizadas en CEDI y cerradas en SAP fueron marcadas como pendiente = false.`);
                        } else {
                            console.error('Error en cierre automático de órdenes:', closeErr);
                        }
                    }
                }
            } catch (autoCloseErr) {
                console.warn('Advertencia evaluando cierre automático de órdenes:', autoCloseErr);
            }
        }

        // 4. Preparar y sincronizar registros de Fibra de Vidrio para la tabla 'ordenes_fabricacion_fibra'
        const isFibraSku = (sku: string, desc?: string) => {
            if (/^(VHPT|VTIN|VHEM|PPRD)/i.test(sku)) return true;
            if (desc) {
                const upper = desc.toUpperCase();
                if (upper.includes('HIDROMASAJE') || upper.includes('BAÑERA') || upper.includes('JACUZZI') || upper.includes('SPA ') || upper.includes('TINA ') || upper.includes('FALDON')) {
                    return true;
                }
            }
            return false;
        };

        const fibraRows = mappedRows.filter(r => isFibraSku(r.producto_sku, r.producto_descripcion));
        let totalFibraUpserted = 0;

        if (fibraRows.length > 0) {
            const { data: nonPendingFibra } = await supabase
                .from('ordenes_fabricacion_fibra')
                .select('orden_fabricacion')
                .eq('pendiente', false);

            const nonPendingFibraSet = new Set((nonPendingFibra || []).map(r => String(r.orden_fabricacion)));
            const cleanFibraBatch = fibraRows
                .filter(item => !nonPendingFibraSet.has(String(item.orden_fabricacion)))
                .map(r => ({
                    orden_fabricacion: String(r.orden_fabricacion),
                    numero_pedido: String(r.numero_pedido || r.orden_fabricacion),
                    producto_sku: r.producto_sku,
                    cantidad: r.cantidad,
                    fecha_entrega_estimada: r.fecha_entrega_estimada,
                    fecha_ideal_produccion: r.fecha_ideal_produccion,
                    pendiente: true,
                    cliente: r.cliente,
                    comentario: r.comentario,
                    tamano: r.tamano,
                    linea: r.linea,
                    molde_sku: r.molde_sku,
                    molde_descripcion: r.molde_descripcion,
                    kilos_gelcoat: r.kilos_gelcoat,
                    componentes: r.componentes || null,
                    modificado_por: 'Sistema SAP'
                }));

            const BATCH_SIZE = 50;
            for (let i = 0; i < cleanFibraBatch.length; i += BATCH_SIZE) {
                const batch = cleanFibraBatch.slice(i, i + BATCH_SIZE);
                const { error: errFibra } = await supabase
                    .from('ordenes_fabricacion_fibra')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (errFibra) {
                    console.error('Error upserting ordenes_fabricacion_fibra:', errFibra);
                } else {
                    totalFibraUpserted += batch.length;
                }
            }
            console.log(`Upserted ${cleanFibraBatch.length} Fibra orders to ordenes_fabricacion_fibra.`);
        }

        return NextResponse.json({
            success: true,
            error: false,
            message: `200 - Se consultaron ${mappedRows.length} órdenes de fabricación liberadas directamente desde SAP Service Layer.`,
            total: mappedRows.length,
            totalMarmol: msUpsertBatch.length,
            totalFibra: totalFibraUpserted,
            data: mappedRows,
            response: mappedRows
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error en /api/sap/ordenes-liberadas:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar ordenes liberadas' },
            { status: 500 }
        );
    }
}
