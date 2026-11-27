import { NextResponse } from 'next/server';
import { loginToSAP, fetchSAP, SAP_BASE_URL } from '@/lib/sap';
import { supabase } from '@/lib/supabase';
import { fechasSemaforoPorOf } from '@/lib/sap/fechasSemaforo';

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

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Máximo de OF que se confirman en SAP por corrida (la sincronización corre cada 15 min: el rezago se pone al día
// en pocas corridas sin pasarse del tiempo de la función). Las más viejas primero.
const MAX_REVISION_CIERRE = 600;
const CIERRE_AUTO = 'Sistema SAP (Cierre automático)';

async function cerrarOrdenesCerradasEnSap(liberadasEnSap: Set<string>) {
    // OF abiertas en el control de piso (Muebles y CEFI), paginado (Supabase entrega máximo 1000 por consulta)
    const abiertas: string[] = [];
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from('ordenes_fabricacion_muebles').select('orden_fabricacion')
            .eq('pendiente', true).order('id', { ascending: true }).range(desde, desde + 999);
        if (error) { console.error('[liberacion-muebles] No se pudieron listar las OF abiertas:', error); return { revisadas: 0, cerradas: 0, pendientesPorRevisar: 0 }; }
        abiertas.push(...(data || []).map(o => String(o.orden_fabricacion)));
        if (!data || data.length < 1000) break;
    }
    const ausentes = abiertas.filter(of => /^[0-9]+$/.test(of) && !liberadasEnSap.has(of));
    const aRevisar = ausentes.slice(0, MAX_REVISION_CIERRE);

    // Consultas a SAP una tras otra (en paralelo SAP se bloquea), de a 20 OF
    const porCerrar: string[] = [];
    for (let i = 0; i < aRevisar.length; i += 20) {
        const lote = aRevisar.slice(i, i + 20);
        try {
            const filtro = lote.map(of => `DocumentNumber eq ${of}`).join(' or ');
            const res = await fetchSAP(`${SAP_BASE_URL}/ProductionOrders?$select=DocumentNumber,ProductionOrderStatus&$filter=${encodeURIComponent(filtro)}`,
                { method: 'GET', headers: { Prefer: 'odata.maxpagesize=50' } });
            if (!res.ok) { console.warn(`[liberacion-muebles] SAP no confirmó el estado de ${lote.length} OF (${res.status}): no se cierran`); continue; }
            const estado = new Map<string, string>(((await res.json()).value || []).map((o: any) => [String(o.DocumentNumber), String(o.ProductionOrderStatus)]));
            for (const of of lote) {
                const e = estado.get(of);
                if (e && e !== 'boposReleased') porCerrar.push(of);
            }
        } catch (e) {
            console.warn('[liberacion-muebles] Error confirmando en SAP el cierre de OF:', e);
        }
    }

    let cerradas = 0;
    for (let i = 0; i < porCerrar.length; i += 100) {
        const lote = porCerrar.slice(i, i + 100);
        const { error } = await supabase.from('ordenes_fabricacion_muebles')
            .update({ pendiente: false, fecha_entrega_real: new Date().toISOString(), modificado_por: CIERRE_AUTO })
            .in('orden_fabricacion', lote);
        if (error) console.error('[liberacion-muebles] Error ocultando OF cerradas en SAP:', error);
        else cerradas += lote.length;
    }
    if (cerradas) console.log(`[liberacion-muebles] ${cerradas} OF ya cerradas en SAP se ocultaron del control de piso.`);
    return { revisadas: aRevisar.length, cerradas, pendientesPorRevisar: ausentes.length - aRevisar.length };
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
                'Prefer': 'odata.maxpagesize=5000'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error al consultar SAP Service Layer (${response.status}): ${errText.slice(0, 200)}`);
        }
        const json = await response.json();
        const rawRows: any[] = json.value || [];

        // Agrupar filas devueltas por orden de fabricación
        const orderMap = new Map<string, any>();
        rawRows.forEach((row: any) => {
            const docNum = String(row.orden_fabricacion || '');
            if (!docNum) return;

            if (!orderMap.has(docNum)) {
                const sku = String(row.producto_sku || '').toUpperCase();
                const linea = String(row.u_linea || '').toUpperCase();
                const desc = String(row.producto_descripcion || '').toUpperCase();
                const isCefi = ['F09', 'F11'].includes(linea) ||
                    sku.startsWith('VCOC08') ||
                    sku.startsWith('VBAN27') ||
                    sku.startsWith('VCLO01') ||
                    sku.startsWith('VROP10') ||
                    (row.planta && String(row.planta).toLowerCase().includes('cefi')) ||
                    desc.includes('TABLERO COMPUESTO') ||
                    desc.includes('MODULAR');
                // Cajas (SKU PEMP…): semielaborados, con su propio control de piso (no salen en Muebles ni en CEFI)
                const calculatedPlant = sku.startsWith('PEMP') ? 'Semielaborados' : isCefi ? 'Cefi' : 'Muebles';

                orderMap.set(docNum, {
                    orden_fabricacion: docNum,
                    numero_pedido: row.numero_pedido || docNum,
                    producto_sku: row.producto_sku || '',
                    producto_descripcion: row.producto_descripcion || '',
                    cantidad: Number(row.cantidad) || 1,
                    cliente: row.cliente || 'FIRPLAK S A',
                    fecha_entrega_estimada: parseDate(row.fecha_entrega_estimada),
                    planta: calculatedPlant,
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
                
                // cantidad = lo que falta por consumir (planeado − consumido); planeada = total de la OF, para que la
                // vista query_of_muebles calcule piezas, m² y canto aunque la OF ya haya consumido sus materiales
                order.componentes.push({
                    sku: row.componente_sku,
                    componente: row.componente_nombre,
                    cantidad: compQty,
                    planeada: Math.round(planned * 100) / 100
                });
            }
        });

        const groupedOrders = Array.from(orderMap.values());

        // Semielaborados de Fibra que no trae la consulta de Muebles: Herrajes FV (PMPD04) y Ensamble de kits de
        // motobomba (PEST01 … MOTOBOMBA). Se leen liberados directo de ProductionOrders y quedan en la planta
        // Semielaborados (su control de piso los separa por SKU). Si SAP falla aquí, el resto sigue igual.
        let avisoSemi: string | null = null;
        try {
            const filtro = `ProductionOrderStatus eq 'boposReleased' and (startswith(ItemNo,'PMPD04') or startswith(ItemNo,'PEST01'))`;
            let siguiente: string | null = `${SAP_BASE_URL}/ProductionOrders?$select=DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,DueDate,PostingDate&$filter=${encodeURIComponent(filtro)}`;
            for (let paginas = 0; siguiente && paginas < 20; paginas++) {
                const res = await fetchSAP(siguiente, { method: 'GET', headers: { Prefer: 'odata.maxpagesize=200' } });
                if (!res.ok) throw new Error(`SAP respondió ${res.status}`);
                const j = await res.json();
                for (const o of j.value || []) {
                    const sku = String(o.ItemNo || '').toUpperCase();
                    const desc = String(o.ProductDescription || '');
                    if (sku.startsWith('PEST01') && !/MOTOBOMBA/i.test(desc)) continue;
                    const docNum = String(o.DocumentNumber);
                    if (orderMap.has(docNum)) continue;
                    groupedOrders.push({
                        orden_fabricacion: docNum, numero_pedido: docNum, producto_sku: o.ItemNo, producto_descripcion: desc,
                        cantidad: Number(o.PlannedQuantity) || 1, cliente: 'FIRPLAK S A',
                        fecha_entrega_estimada: o.DueDate ? String(o.DueDate).slice(0, 10) + ' 00:00:00' : null,
                        planta: 'Semielaborados', modificado_por: 'SAP Service Layer Sync',
                        created_at: o.PostingDate ? String(o.PostingDate).slice(0, 10) + ' 00:00:00' : new Date().toISOString(),
                        componentes: [],
                    });
                }
                const next = j['odata.nextLink'] || j['@odata.nextLink'];
                siguiente = next ? (String(next).startsWith('http') ? next : `${SAP_BASE_URL}/${String(next).replace(/^\//, '')}`) : null;
            }
        } catch (e: any) {
            avisoSemi = `No se pudieron traer Herrajes FV / Kits motobomba de SAP: ${e?.message || e}`;
            console.warn('[liberacion-muebles]', avisoSemi);
        }

        // Las 4 fechas del Semáforo (igual que Fibra). Si la API del Semáforo no responde, no se tocan las guardadas.
        let avisoFechas: string | null = null;
        let filas: any[] = groupedOrders;
        if (groupedOrders.length > 0) {
            try {
                const fechas = await fechasSemaforoPorOf();
                const ahora = new Date().toISOString();
                filas = groupedOrders.map(o => {
                    const f = fechas.get(String(o.orden_fabricacion).trim());
                    return f ? { ...o, ...f, fechas_semaforo_actualizadas: ahora } : o;
                });
                const sinFecha = groupedOrders.length - filas.filter(f => f.fechas_semaforo_actualizadas).length;
                if (sinFecha) avisoFechas = `${sinFecha} OF de Muebles/CEFI no están en el Semáforo: quedaron sin sus fechas.`;
            } catch (e: any) {
                avisoFechas = `No se pudieron traer las fechas del Semáforo: ${e?.message || e}`;
            }
            let { error: errUpsert } = await supabase.from('ordenes_fabricacion_muebles').upsert(filas, { onConflict: 'orden_fabricacion' });
            // Sin las columnas de fechas (falta muebles_control_piso_fv.sql) se guardan las OF sin ellas
            if (errUpsert && /fecha_entrega_lote|fecha_real_liberacion|fecha_ideal_entrega|fecha_prometida|fechas_semaforo/i.test(errUpsert.message)) {
                avisoFechas = 'Faltan las columnas de fechas del Semáforo: ejecute muebles_control_piso_fv.sql en Supabase.';
                ({ error: errUpsert } = await supabase.from('ordenes_fabricacion_muebles').upsert(groupedOrders, { onConflict: 'orden_fabricacion' }));
            }
            if (errUpsert) throw new Error(`No se pudieron guardar las OF de Muebles/CEFI: ${errUpsert.message}`);
        }
        if (avisoFechas) console.warn('[liberacion-muebles]', avisoFechas);

        // Cierre automático (misma lógica de Fibra): una OF abierta que ya no viene liberada en la consulta se
        // CONFIRMA en SAP; solo si SAP dice que ya no está Liberada se oculta del control de piso. Si SAP no
        // responde no se cierra nada. Con la consulta vacía (posible falla) tampoco.
        const cierre = rawRows.length > 0
            ? await cerrarOrdenesCerradasEnSap(new Set(groupedOrders.map(o => String(o.orden_fabricacion))))
            : { revisadas: 0, cerradas: 0, pendientesPorRevisar: 0 };

        const { count } = await supabase
            .from('ordenes_fabricacion_muebles')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            success: true,
            cierreAutomatico: cierre,
            avisoFechas,
            avisoSemi,
            totalSincronizadas: groupedOrders.length,
            totalEnSupabase: count || 0,
            endpoint: "/SQLQueries('ordenes_muebles_comp_v3')/List",
            data: filas
        });
    } catch (error: any) {
        console.error("Error en API /api/sap/liberacion-muebles: ", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
