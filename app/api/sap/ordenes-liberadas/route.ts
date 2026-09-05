import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const apiKey = (process.env.NEXT_PUBLIC_API_KEY || process.env.ORDENESLIBERADAS_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us').replace(/"/g, '');

        // Candidate URLs for ordenes_fibra
        const candidateUrls = [
            process.env.ORDENES_FIBRA_API_URL,
            process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/liberacionmuebles\/?$/, 'ordenes_fibra/') : null,
            'http://127.0.0.1:7000/ordenes_fibra/'
        ].filter(Boolean) as string[];

        let rawFibraRows: any[] = [];
        let fetchedFromFibraApi = false;

        for (const url of candidateUrls) {
            try {
                console.log("Consultando ordenes_fibra en:", url);
                const res = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'api-key': apiKey,
                        'ngrok-skip-browser-warning': 'true'
                    },
                    cache: 'no-store'
                });

                if (res.ok) {
                    const json = await res.json();
                    const items = json.response || json.data || json || [];
                    if (Array.isArray(items) && items.length > 0) {
                        rawFibraRows = items;
                        fetchedFromFibraApi = true;
                        console.log(`API ordenes_fibra devolvió ${rawFibraRows.length} órdenes.`);
                        break;
                    }
                }
            } catch (err) {
                // Probar siguiente candidata
            }
        }

        // Sincronizar hacia ordenes_fabricacion_fibra en Supabase
        if (fetchedFromFibraApi && rawFibraRows.length > 0) {
            const mappedForFibraDb = rawFibraRows.map(item => ({
                orden_fabricacion: item.orden_fabricacion ? String(item.orden_fabricacion) : '',
                numero_pedido: item.numero_pedido || '',
                producto_sku: item.producto_sku || '',
                producto_descripcion: item.producto_descripcion || '',
                cantidad: Number(item.cantidad) || 1,
                cliente: item.cliente || 'FIRPLAK S A',
                comentario: item.comentarios || '',
                fecha_entrega_estimada: item.fecha_entrega_estimada || null,
                fecha_ideal_produccion: item.fecha_ideal_produccion || null,
                componentes: item.componentes ? (typeof item.componentes === 'string' ? JSON.parse(item.componentes) : item.componentes) : null
            })).filter(r => r.orden_fabricacion);

            const BATCH_SIZE = 100;
            for (let i = 0; i < mappedForFibraDb.length; i += BATCH_SIZE) {
                const batch = mappedForFibraDb.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('ordenes_fabricacion_fibra')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (error) {
                    console.error("Error upserting ordenes_fabricacion_fibra:", error);
                }
            }
        }

        // También consultar API general de órdenes liberadas si existiera
        const genUrl = process.env.ORDENESLIBERADAS_API_URL || 'http://127.0.0.1:7000/ordenesliberadasms';
        try {
            const response = await fetch(genUrl, {
                method: 'GET',
                headers: {
                    'api-key': apiKey,
                    'ngrok-skip-browser-warning': 'true',
                },
                cache: 'no-store',
            });
            if (response.ok) {
                const result = await response.json();
                const rawRows = Array.isArray(result.response) ? result.response : [];
                if (rawRows.length > 0) {
                    const mappedForDb = rawRows.map(item => ({
                        orden_fabricacion: item.DocNum ? String(item.DocNum) : '',
                        numero_pedido: item.NumLote || '',
                        producto_sku: item.ItemCode || '',
                        producto_descripcion: item.Itemname || '',
                        cantidad: Number(item["Cant.Planificada"]) || 1,
                        cliente: item.CardName || 'FIRPLAK S A',
                        comentario: '',
                        fecha_entrega_estimada: item["Fecha Finalización"] || null
                    })).filter(r => r.orden_fabricacion);

                    for (let i = 0; i < mappedForDb.length; i += 100) {
                        const batch = mappedForDb.slice(i, i + 100);
                        await supabase
                            .from('ordenes_fabricacion')
                            .upsert(batch, { onConflict: 'orden_fabricacion' });
                    }
                }
            }
        } catch (genErr) {
            console.warn("Fallback ordenesliberadasms error:", genErr);
        }

        return NextResponse.json({
            success: true,
            totalFibra: rawFibraRows.length,
            message: `Sincronizadas ${rawFibraRows.length} órdenes de Fibra hacia Supabase.`,
            data: rawFibraRows
        });
    } catch (error: any) {
        console.error("Error en /api/sap/ordenes-liberadas:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar órdenes liberadas' },
            { status: 500 }
        );
    }
}
