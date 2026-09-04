import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';
import { supabase } from '@/lib/supabase';

function parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (str.length === 8) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        return `${year}-${month}-${day} 00:00:00`;
    }
    return str;
}

export async function GET() {
    try {
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';
        const queryUrl = `${baseUrl}/SQLQueries('ordenes_muebles_sl')/List`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader || loginData,
                'Content-Type': 'application/json',
                'Prefer': 'odata.maxpagesize=500'
            },
            cache: 'no-store'
        });

        let rawItems: any[] = [];
        if (response.ok) {
            const json = await response.json();
            rawItems = json.value || [];
        }

        if (rawItems.length > 0) {
            const mappedRecords = rawItems.map((item: any) => {
                let componentesJson = [];
                if (item.componentes) {
                    try {
                        componentesJson = typeof item.componentes === 'string' ? JSON.parse(item.componentes) : item.componentes;
                    } catch {
                        componentesJson = [];
                    }
                }
                return {
                    orden_fabricacion: item.orden_fabricacion ? String(item.orden_fabricacion) : '',
                    numero_pedido: item.numero_pedido || '',
                    producto_sku: item.producto_sku || '',
                    producto_descripcion: item.producto_descripcion || '',
                    cantidad: Number(item.cantidad) || 1,
                    cliente: item.cliente || '',
                    fecha_entrega_estimada: parseDate(item.fecha_entrega_estimada),
                    componentes: componentesJson,
                    planta: item.planta || 'Muebles',
                    modificado_por: 'SAP Service Layer Sync',
                    created_at: parseDate(item.fecha_liberacion) || new Date().toISOString()
                };
            });

            await supabase
                .from('ordenes_fabricacion_muebles')
                .upsert(mappedRecords, { onConflict: 'orden_fabricacion' });
        }

        const { count } = await supabase
            .from('ordenes_fabricacion_muebles')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            totalSincronizadas: rawItems.length,
            totalEnSupabase: count || 0,
            endpoint: "/SQLQueries('ordenes_muebles_sl')/List",
            data: rawItems
        });
    } catch (error: any) {
        console.error("Error en API /api/sap/liberacion-muebles: ", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
