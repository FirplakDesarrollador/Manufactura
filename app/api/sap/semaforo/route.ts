import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';
import { supabase } from '@/lib/supabase';

function mapRow(item: any, index: number) {
    const descKey = Object.keys(item).find(k => k.toLowerCase().includes('descripc')) || 'Descripción Artículo';
    const cantPendKey = Object.keys(item).find(k => k.toLowerCase().includes('pendiente') && !k.toLowerCase().includes('item')) || 'Cant. Pendiente';
    const cantPendItemKey = Object.keys(item).find(k => k.toLowerCase().includes('pend') && k.toLowerCase().includes('item')) || 'Cant. Pend. Item';
    const cantTotKey = Object.keys(item).find(k => k.toLowerCase().includes('total')) || 'Cantidad total';
    const tipoOrdKey = Object.keys(item).find(k => k.toLowerCase().includes('tipo')) || 'Tipo Orden';

    return {
        id: index + 1,
        originnum: item.Originnum ? String(item.Originnum) : '',
        nroOp: item["Nro OP"] ? String(item["Nro OP"]) : (item.orden_fabricacion ? String(item.orden_fabricacion) : ''),
        sku: item.SKU || item.producto_sku || '',
        descripcion: item[descKey] || item.producto_descripcion || '',
        planta: item.Planta || item.linea || 'MS',
        familia: item.Familia || 'PA',
        tipoOrden: item[tipoOrdKey] || 'STANDARD',
        cantPendiente: String(item[cantPendKey] ?? item.cantidad ?? '0'),
        cantPendItem: String(item[cantPendItemKey] ?? '0'),
        cantTotal: String(item[cantTotKey] ?? item.cantidad ?? '0'),
        disponiblePt01: String(item["Disponible PT01"] ?? '0'),
        fechaCreacionOp: item["Fecha Creación OP"] || item.fecha_liberacion || '',
        estado: item.Estado || 'Liberado',
        fechaRecomendadaLiberacion: item["Fecha Recomendada Liberación"] || item.fecha_liberacion || '',
        fechaRealLiberacion: item["Fecha Real Liberación"] || item.fecha_liberacion || '',
        consumoParaLiberar: String(item["Consumo Para Liberar"] ?? '0'),
        colorLiberacionTxt: item["Color Liberación Txt"] || 'Verde',
        colorLiberacion: String(item["Color Liberación"] ?? 'VERDE'),
        cumplimientoLiberacion: item["Cumplimiento Liberación"] || '100%',
        fechaEntregaLote: item["Fecha Entrega Lote"] || item.fecha_entrega_estimada || '',
        fechaRecomendadaDeEntrega: item["Fecha Recomendada de Entrega"] || item.fecha_entrega_estimada || '',
        fechaCierreOp: item["Fecha Cierre OP"] || null,
        fechaIdealEntregaProduccion: item["Fecha Ideal Entrega Producción"] || item.fecha_ideal_produccion || '',
        consumoAmortiguadorPlanta: String(item["Consumo Amortiguador Planta"] ?? '0'),
        colorProduccionTxt: item["Color Producción Txt"] || 'Verde',
        colorProduccion: String(item["Color Producción"] ?? 'VERDE'),
        cumplimientoPlanta: item["Cumplimiento Planta"] || '100%',
        diasRetrazoFirplak: String(item["Dias Retrazo Firplak"] ?? '0'),
        colorFirplakTxt: item["Color Firplak Txt"] || 'Verde',
        colorFirplak: String(item["Color Firplak"] ?? 'VERDE'),
        cumplimientoFirplak: item["Cumplimiento Firplak"] || '100%',
        fechaPrometidaEntregaItem: item["Fecha Prometida Entrega Item"] || item.fecha_entrega_estimada || '',
        destino: item.Destino || 'CEDI',
        numLote: item.NumLote || item.numero_pedido || '',
        molde: item.Molde || item.molde_descripcion || null,
        capacidadMolde: item["Capacidad Molde"] ? String(item["Capacidad Molde"]) : null,
        fechaCargaMolde: item["Fecha Carga Molde"] || '',
        amortiguador: String(item.Amortiguador ?? '0'),
        cliente: item.Cliente || item.cliente || 'FIRPLAK S A',
    };
}

export async function GET() {
    try {
        let rawItems: any[] = [];
        let fetchedFromSqlServer = false;

        // 1. Intentar consultar primero la API de SQL Server (FastAPI ejecutor de [Planos_Symphony].[dbo].[SEMAFORO])
        const pyApiUrl = process.env.SEMAFORO_API_URL || 'http://127.0.0.1:7000/semaforo';
        const apiKey = (process.env.SEMAFORO_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us').replace(/"/g, '');

        try {
            console.log("Consultando directo a SQL Server (FastAPI /semaforo)...");
            const pyRes = await fetch(pyApiUrl, {
                method: 'GET',
                headers: {
                    'api-key': apiKey,
                    'ngrok-skip-browser-warning': 'true'
                },
                cache: 'no-store'
            });

            if (pyRes.ok) {
                const pyJson = await pyRes.json();
                const items = pyJson.response || pyJson.data || [];
                if (Array.isArray(items) && items.length > 0) {
                    rawItems = items;
                    fetchedFromSqlServer = true;
                    console.log(`SQL Server devolvió ${rawItems.length} registros del SP SEMAFORO.`);
                }
            } else {
                console.warn(`FastAPI devolvió código HTTP ${pyRes.status}`);
            }
        } catch (pyErr) {
            console.warn("Falló conexión directa a FastAPI /semaforo:", pyErr);
        }

        // 2. Fallback a SAP Service Layer si FastAPI no estuvo disponible
        if (!fetchedFromSqlServer) {
            console.log("Ejecutando fallback a SAP Service Layer...");
            const loginData = await loginToSAP();
            const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';

            let url: string | null = `${baseUrl}/SQLQueries('semaforo')/List`;
            let page = 1;

            while (url) {
                const response: Response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Cookie': loginData.cookieHeader,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store'
                });

                if (!response.ok) break;

                const json: any = await response.json();
                const items = json.value || [];
                rawItems.push(...items);

                const nextLink: string | undefined = json['@odata.nextLink'] || json['odata.nextLink'];
                if (nextLink) {
                    url = nextLink.startsWith('http') ? nextLink : `${baseUrl}/${nextLink.replace(/^\//, '')}`;
                    page++;
                } else {
                    url = null;
                }
            }
        }

        const data = rawItems.map(mapRow);

        // 3. Sincronizar con Supabase en lotes de 100
        if (data.length > 0) {
            const mappedForDb = data.map(item => ({
                nro_op: item.nroOp || '',
                originnum: item.originnum || '',
                sku: item.sku || '',
                descripcion: item.descripcion || '',
                planta: item.planta || '',
                familia: item.familia || '',
                tipo_orden: item.tipoOrden || '',
                cant_pendiente: item.cantPendiente || '0',
                cant_total: item.cantTotal || '0',
                estado: item.estado || '',
                fecha_creacion_op: item.fechaCreacionOp || '',
                fecha_real_liberacion: item.fechaRealLiberacion || '',
                color_liberacion: item.colorLiberacion || '',
                color_produccion: item.colorProduccion || '',
                color_firplak: item.colorFirplak || '',
                cumplimiento_planta: item.cumplimientoPlanta || '',
                cumplimiento_firplak: item.cumplimientoFirplak || '',
                dias_retrazo_firplak: item.diasRetrazoFirplak || '0',
                cliente: item.cliente || '',
                num_lote: item.numLote || '',
                raw_data: item,
                updated_at: new Date().toISOString()
            }));

            const BATCH_SIZE = 100;
            for (let i = 0; i < mappedForDb.length; i += BATCH_SIZE) {
                const batch = mappedForDb.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('semaforo')
                    .upsert(batch, { onConflict: 'nro_op' });
                if (error) {
                    console.error('Error upserting semaforo batch:', error);
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: data.length,
            source: fetchedFromSqlServer ? "SQL Server (EXEC [Planos_Symphony].[dbo].[SEMAFORO])" : "SAP Service Layer",
            data
        });
    } catch (err: any) {
        console.error("Error en /api/sap/semaforo:", err);
        return NextResponse.json({
            success: false,
            error: String(err),
            total: 0,
            data: []
        }, { status: 500 });
    }
}
