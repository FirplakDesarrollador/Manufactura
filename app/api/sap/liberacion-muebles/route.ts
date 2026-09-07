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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';
        
        // Consultar órdenes de Muebles liberadas junto con sus componentes (WOR1 + OITM) desde SAP Service Layer
        const queryUrl = `${baseUrl}/SQLQueries('ordenes_muebles_comp_v3')/List`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader || loginData,
                'Content-Type': 'application/json',
                'Prefer': 'odata.maxpagesize=500'
            },
            cache: 'no-store'
        });

        let rawRows: any[] = [];
        if (response.ok) {
            const json = await response.json();
            rawRows = json.value || [];
        }

        // Agrupar filas devueltas por orden de fabricación
        const orderMap = new Map<string, any>();
        rawRows.forEach((row: any) => {
            const docNum = String(row.orden_fabricacion || '');
            if (!docNum) return;

            if (!orderMap.has(docNum)) {
                orderMap.set(docNum, {
                    orden_fabricacion: docNum,
                    numero_pedido: row.numero_pedido || docNum,
                    producto_sku: row.producto_sku || '',
                    producto_descripcion: row.producto_descripcion || '',
                    cantidad: Number(row.cantidad) || 1,
                    cliente: row.cliente || 'FIRPLAK S A',
                    fecha_entrega_estimada: parseDate(row.fecha_entrega_estimada),
                    planta: row.planta || 'Muebles',
                    modificado_por: 'SAP Service Layer Sync',
                    created_at: parseDate(row.fecha_liberacion) || new Date().toISOString(),
                    componentes: []
                });
            }

            const order = orderMap.get(docNum);
            if (row.componente_sku && row.componente_nombre) {
                const planned = Number(row.comp_planned) || 0;
                const issued = Number(row.comp_issued) || 0;
                const compQty = Math.round((planned - issued) * 100) / 100;
                
                order.componentes.push({
                    sku: row.componente_sku,
                    componente: row.componente_nombre,
                    cantidad: compQty
                });
            }
        });

        const groupedOrders = Array.from(orderMap.values());

        if (groupedOrders.length > 0) {
            await supabase
                .from('ordenes_fabricacion_muebles')
                .upsert(groupedOrders, { onConflict: 'orden_fabricacion' });
        }

        const { count } = await supabase
            .from('ordenes_fabricacion_muebles')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            totalSincronizadas: groupedOrders.length,
            totalEnSupabase: count || 0,
            endpoint: "/SQLQueries('ordenes_muebles_comp_v3')/List",
            data: groupedOrders
        });
    } catch (error: any) {
        console.error("Error en API /api/sap/liberacion-muebles: ", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
