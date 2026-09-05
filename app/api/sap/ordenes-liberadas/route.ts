import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const apiKey = (process.env.NEXT_PUBLIC_API_KEY || process.env.ORDENESLIBERADAS_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us').replace(/"/g, '');

        const candidateUrls = [
            'http://127.0.0.1:7000/ordenes_fibra/',
            process.env.ORDENES_FIBRA_API_URL,
            process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/liberacionmuebles\/?$/, 'ordenes_fibra/') : null
        ].filter(Boolean) as string[];

        let rawFibraRows: any[] = [];
        let fetchedFromFibraApi = false;

        for (const url of candidateUrls) {
            try {
                console.log('Consultando ordenes_fibra en:', url);
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
                        console.log(`API ordenes_fibra devolvio ${rawFibraRows.length} ordenes.`);
                        break;
                    }
                }
            } catch (err) {
                // Probar siguiente candidata
            }
        }

        if (fetchedFromFibraApi && rawFibraRows.length > 0) {
            // Mapping for ordenes_fabricacion_fibra
            const mappedForFibraDb = rawFibraRows.map(item => ({
                orden_fabricacion: item.orden_fabricacion ? String(item.orden_fabricacion) : '',
                numero_pedido: item.numero_pedido || '',
                producto_sku: item.producto_sku || '',
                cantidad: Number(item.cantidad) || 1,
                cliente: item.cliente || 'FIRPLAK S A',
                comentario: item.comentarios || '',
                fecha_entrega_estimada: item.fecha_entrega_estimada || null,
                fecha_ideal_produccion: item.fecha_ideal_produccion || null,
                tamano: item.tamano || '',
                color: item.color || '',
                linea: item.linea || '',
                molde_sku: item.molde_sku || '',
                molde_descripcion: item.molde_descripcion || '',
                kilos_gelcoat: item.kilos_gelcoat !== undefined && item.kilos_gelcoat !== null ? Number(item.kilos_gelcoat) : null,
                modificado_por: 'Sistema SAP',
                componentes: item.componentes ? (typeof item.componentes === 'string' ? JSON.parse(item.componentes) : item.componentes) : null
            })).filter(r => r.orden_fabricacion);

            // Batch upsert to ordenes_fabricacion_fibra
            const BATCH_SIZE = 50;
            for (let i = 0; i < mappedForFibraDb.length; i += BATCH_SIZE) {
                const batch = mappedForFibraDb.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('ordenes_fabricacion_fibra')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (error) {
                    console.error('Error upserting ordenes_fabricacion_fibra:', error);
                }
            }

            // Also map and sync to ordenes_fabricacion for general control de piso / Marmol view
            const mappedForGeneralDb = rawFibraRows.map(item => ({
                orden_fabricacion: item.orden_fabricacion ? String(item.orden_fabricacion) : '',
                numero_pedido: item.numero_pedido || '',
                producto_sku: item.producto_sku || '',
                cantidad: Number(item.cantidad) || 1,
                cliente: item.cliente || 'FIRPLAK S A',
                comentario: item.comentarios || '',
                fecha_entrega_estimada: item.fecha_entrega_estimada || null,
                fecha_ideal_produccion: item.fecha_ideal_produccion || null,
                tamano: item.tamano || '',
                color: item.color || '',
                linea: item.linea || '',
                molde_sku: item.molde_sku || '',
                molde_descripcion: item.molde_descripcion || '',
                kilos_gelcoat: item.kilos_gelcoat !== undefined && item.kilos_gelcoat !== null ? Number(item.kilos_gelcoat) : null,
                modificado_por: 'Sistema SAP',
                estado: 'programada'
            })).filter(r => r.orden_fabricacion);

            for (let i = 0; i < mappedForGeneralDb.length; i += BATCH_SIZE) {
                const batch = mappedForGeneralDb.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('ordenes_fabricacion')
                    .upsert(batch, { onConflict: 'orden_fabricacion' });
                if (error) {
                    console.error('Error upserting ordenes_fabricacion:', error);
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalFibra: rawFibraRows.length,
            message: `Sincronizadas ${rawFibraRows.length} ordenes de Fibra hacia Supabase.`,
            data: rawFibraRows
        });
    } catch (error: any) {
        console.error('Error en /api/sap/ordenes-liberadas:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar ordenes liberadas' },
            { status: 500 }
        );
    }
}
