import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        let rawRows: any[] = [];
        let marmolRawRows: any[] = [];
        let fetchedFromSap = false;

        // 1. Consultar SAP Service Layer (órdenes pendientes generales y órdenes de mármol sintético)
        try {
            console.log('Consultando órdenes de fabricación liberadas en SAP Service Layer...');
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
                if (sessionId) {
                    const baseUrl = loginUrl.replace('/Login', '');
                    
                    // a) Query general para /consulta-sap (441 órdenes liberadas)
                    const queryRes = await fetch(`${baseUrl}/SQLQueries('ordenes_pendientes_clean')/List`, {
                        headers: {
                            'Cookie': `B1SESSION=${sessionId}`,
                            'Prefer': 'odata.maxpagesize=500'
                        }
                    });

                    if (queryRes.ok) {
                        const queryData = await queryRes.json();
                        const items = queryData.value || [];
                        if (Array.isArray(items) && items.length > 0) {
                            rawRows = items;
                            fetchedFromSap = true;
                            console.log(`SAP Service Layer (general) devolvió ${rawRows.length} órdenes liberadas.`);
                        }
                    }

                    // b) Query específica para Mármol Sintético (129 órdenes enriquecidas con molde y gelcoat)
                    try {
                        const marmolRes = await fetch(`${baseUrl}/SQLQueries('ordenes_marmol_sl136')/List`, {
                            headers: {
                                'Cookie': `B1SESSION=${sessionId}`,
                                'Prefer': 'odata.maxpagesize=500'
                            }
                        });
                        if (marmolRes.ok) {
                            const marmolData = await marmolRes.json();
                            if (Array.isArray(marmolData.value) && marmolData.value.length > 0) {
                                marmolRawRows = marmolData.value;
                                console.log(`SAP Service Layer (Mármol Sintético) devolvió ${marmolRawRows.length} órdenes.`);
                            }
                        }
                    } catch (mErr) {
                        console.error('Error consultando ordenes_marmol_sl136:', mErr);
                    }
                }
            }
        } catch (sapErr) {
            console.error('Error al conectar con SAP Service Layer:', sapErr);
        }

        // Helper para distinguir SKUs que NO pertenecen a Mármol Sintético
        const isNonMarmolSku = (sku: string) => /^(VHPT|VTIN|VHEM|VEXH|VMUB|MUEB)/i.test(sku);

        // 2. Mapear datos para el frontend (page.tsx), Power Automate y Supabase
        const mappedRows = rawRows.map(item => {
            const docNum = item.DocNum || item.orden_fabricacion || '';
            const typeStr = item.Type === 'S' ? 'Estándar' : (item.Type === 'D' ? 'Desmontar' : (item.type || 'Especial'));
            const statusStr = item.Status === 'R' ? 'Liberado' : (item.Status === 'L' ? 'Cerrado' : (item.Status === 'C' ? 'Cancelado' : (item.Status || 'Planificado')));
            const plannedQty = Number(item.PlannedQty !== undefined ? item.PlannedQty : item.cantidad) || 1;
            const cmpltQty = Number(item.CmpltQty !== undefined ? item.CmpltQty : 0) || 0;
            const pendienteQty = item.Pendiente !== undefined ? Number(item.Pendiente) : (plannedQty - cmpltQty);

            return {
                docNum: docNum,
                tipo: typeStr,
                status: statusStr,
                fechaFabricacion: item.PostDate || item.fecha_liberacion || '',
                fechaFinalizacion: item.DueDate || item.fecha_entrega_estimada || '',
                fechaCierre: item.CloseDate || null,
                codigoCliente: item.CardCode || item.cliente || '',
                nombreSN: item.CardName || item.Cliente || item.cliente || 'FIRPLAK S A',
                itemCode: item.ItemCode || item.producto_sku || '',
                itemName: item.ItemName || item.producto_descripcion || '',
                almacen: item.Warehouse || item.almacen || '',
                cantPlanificada: plannedQty,
                cantCompletada: cmpltQty,
                pendiente: pendienteQty,
                usuario: item.U_name || item.U_NAME || item.usuario || 'Sistema SAP',

                orden_fabricacion: String(docNum),
                numero_pedido: item.numero_pedido || String(docNum),
                producto_sku: item.ItemCode || item.producto_sku || '',
                producto_descripcion: item.ItemName || item.producto_descripcion || '',
                color: item.color || '',
                cantidad: plannedQty,
                cliente: item.CardName || item.Cliente || item.cliente || 'FIRPLAK S A',
                comentario: item.comentarios || item.comentario || '',
                fecha_entrega_estimada: item.DueDate || item.fecha_entrega_estimada || null,
                fecha_ideal_produccion: item['fecha_ideal_producci n'] || item.fecha_ideal_produccion || item.DueDate || null,
                tamano: item.tamano || '',
                linea: item.U_Linea || item.linea || 'F02',
                molde_sku: item.molde_sku || '',
                molde_descripcion: item.molde_descripcion || item.ItemName || '',
                kilos_gelcoat: item['Kilos Gelcoat'] !== undefined && item['Kilos Gelcoat'] !== null ? Number(item['Kilos Gelcoat']) : null,
                modificado_por: 'Sistema SAP'
            };
        });

        // 3. Preparar los registros EXCLUSIVOS de Mármol Sintético para la tabla 'ordenes_fabricacion'
        let msUpsertBatch: any[] = [];

        if (marmolRawRows.length > 0) {
            msUpsertBatch = marmolRawRows.map(item => ({
                orden_fabricacion: String(item.orden_fabricacion || item.DocNum),
                numero_pedido: item.numero_pedido || String(item.orden_fabricacion || item.DocNum),
                producto_sku: item.producto_sku || item.ItemCode || '',
                cantidad: Number(item.cantidad || item.PlannedQty) || 1,
                cliente: item.cliente || item.CardName || 'FIRPLAK S A',
                comentario: item.comentarios || item.comentario || '',
                fecha_entrega_estimada: item.fecha_entrega_estimada || item.DueDate || null,
                fecha_ideal_produccion: item.fecha_liberacion || item.fecha_ideal_produccion || item.RlsDate || null,
                tamano: item.tamano || '',
                linea: item.linea || 'F02',
                molde_sku: item.molde_sku || '',
                molde_descripcion: item.molde_descripcion || '',
                kilos_gelcoat: item.kilos_gelcoat !== undefined && item.kilos_gelcoat !== null ? Number(item.kilos_gelcoat) : null,
                modificado_por: 'Sistema SAP'
            }));
        } else {
            msUpsertBatch = mappedRows
                .filter(r => !isNonMarmolSku(r.producto_sku))
                .map(r => ({
                    orden_fabricacion: r.orden_fabricacion,
                    numero_pedido: r.numero_pedido,
                    producto_sku: r.producto_sku,
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
                }));
        }

        // Upsert a la tabla ordenes_fabricacion (Mármol Sintético)
        if (msUpsertBatch.length > 0) {
            const BATCH_SIZE = 50;
            for (let i = 0; i < msUpsertBatch.length; i += BATCH_SIZE) {
                const batch = msUpsertBatch.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('ordenes_fabricacion')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (error) {
                    console.error('Error upserting ordenes_fabricacion (MS):', error);
                }
            }
            console.log(`Upserted ${msUpsertBatch.length} Mármol Sintético orders to ordenes_fabricacion.`);
        }

        return NextResponse.json({
            success: true,
            error: false,
            message: `200 - Se consultaron ${mappedRows.length} órdenes de fabricación liberadas directamente desde SAP Service Layer.`,
            total: mappedRows.length,
            totalMarmol: msUpsertBatch.length,
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
