import { supabase } from '@/lib/supabase';

// Tipos definidos según los esquemas Parse_JSON del flujo
export interface OrdenSupabase {
    id: number;
    orden_fabricacion: string;
    cantidad: number;
    producto_sku: string;
    producto_descripcion?: string;
    molde_sku?: string;
    molde_descripcion?: string;
    pintura?: number;
    vaciado?: number;
    desgelcada?: number;
    estanteria?: number;
    pulido?: number;
    acabado?: number;
    reparacion?: number;
    reparacion_larga?: number;
    saldo?: number;
    destruccion?: number;
    empaque?: number;
    digitado?: number;
    transito?: number;
    cedi?: number;
    programado?: number;
}

export interface RespuestaSAPMarmol {
    numero_pedido?: string;
    orden_fabricacion: number;
    producto_sku?: string;
    producto_descripcion?: string;
    color?: string;
    cantidad: number;
    molde_descripcion?: string;
    molde_sku?: string;
    tamano?: string;
    fecha_entrega_estimada?: string;
    Cliente?: string;
    cedi: number;
    fecha_cierre?: string | null;
}

// Configuración de destinatarios según el flujo
export const NOTIFICACIONES_CONFIG = {
    discrepancias: [
        'tatiana.sepulveda@FIRPLAK.COM',
        'analista2.desarrollo@firplak.com'
    ],
    errorSAP: [
        'analista2.desarrollo@firplak.com',
        'daniel.jimenez@firplak.com'
    ]
};

/**
 * Función que replica fielmente el flujo de Power Automate
 */
export async function ejecutarFlujoConciliacion() {
    // -------------------------------------------------------------------------
    // PASO 1: Ler_ordenes_supabase (HTTP GET)
    // uri: query_ordenes_fabricacion?cedi=gt.0&pendiente=eq.true&programado=eq.0&select=*
    // -------------------------------------------------------------------------
    const { data: ordenes, error: errOrdenes } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .gt('cedi', 0)
        .eq('pendiente', true)
        .eq('programado', 0);

    if (errOrdenes) {
        console.error('Error en Paso 1 (Ler_ordenes_supabase):', errOrdenes.message);
        throw errOrdenes;
    }

    const listaOrdenes = (ordenes || []) as OrdenSupabase[];

    // -------------------------------------------------------------------------
    // PASO 2: InitializeVariable (ordenesCompletadas = 0)
    // -------------------------------------------------------------------------
    let ordenesCompletadas: number = 0;

    // -------------------------------------------------------------------------
    // PASO 3: Compose (@length)
    // -------------------------------------------------------------------------
    const totalOrdenesLeidas: number = listaOrdenes.length;
    console.log(`Paso 3: Total órdenes leídas desde Supabase: ${totalOrdenesLeidas}`);

    // Arreglos para recopilar resultados de las acciones de notificación
    const cerradas: Array<{ id: number; orden_fabricacion: string; cedi: number; cantidad: number }> = [];
    const novedadesFaltantesSAP: Array<{ orden_fabricacion: string; cedi: number; cantidad: number }> = [];
    const erroresConexionSAP: Array<{ orden_fabricacion: string; error: string }> = [];

    // Helper para fecha en hora Colombia (UTC-5): @addHours(utcNow(), -5)
    const getFechaColombiaISO = () => {
        const d = new Date();
        const colombiaTime = new Date(d.getTime() - (5 * 60 * 60 * 1000));
        return colombiaTime.toISOString();
    };

    // -------------------------------------------------------------------------
    // PASO 4: Foreach (@body('Ler_ordenes_supabase'))
    // -------------------------------------------------------------------------
    for (const orden of listaOrdenes) {
        const {
            id,
            orden_fabricacion,
            cantidad = 0,
            cedi = 0,
            pintura = 0,
            vaciado = 0,
            pulido = 0,
            acabado = 0,
            empaque = 0,
            digitado = 0,
            transito = 0
        } = orden;

        // Condition (If):
        // cantidad == cedi Y pintura == 0 Y vaciado == 0 Y pulido == 0 Y 
        // acabado == 0 Y empaque == 0 Y digitado == 0 Y transito == 0
        const cumpleCondicionApp = 
            cantidad === cedi &&
            pintura === 0 &&
            vaciado === 0 &&
            pulido === 0 &&
            acabado === 0 &&
            empaque === 0 &&
            digitado === 0 &&
            transito === 0;

        if (!cumpleCondicionApp) {
            // Rama "else": no hace nada y continúa con la siguiente orden
            continue;
        }

        // Compose: "orden completada en app se procede a comparar con SAP"
        console.log(`Orden ${orden_fabricacion}: completada en app, se procede a comparar con SAP.`);

        // Buscar_orden_en_SAP (HTTP GET a API SAP)
        // uri: @{parameters('api_sap')}/ordenes_marmol/?orden=@{orden_fabricacion}
        let sapResponseData: RespuestaSAPMarmol[] | null = null;
        let sapError: string | null = null;

        try {
            const apiSapBaseUrl = process.env.API_SAP_URL || 'https://api.firplak.com'; // o ngrok
            const apiSapToken = process.env.API_SAP_TOKEN || '';

            const res = await fetch(`${apiSapBaseUrl}/ordenes_marmol/?orden=${orden_fabricacion}`, {
                method: 'GET',
                headers: {
                    'api-key': `Bearer ${apiSapToken}`
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const json = await res.json();
            sapResponseData = json.response || [];
        } catch (err: any) {
            sapError = err.message || 'Error desconocido';
        }

        // Si Buscar_orden_en_SAP falló (runAfter: Failed):
        if (sapError || !sapResponseData) {
            // Post_message_in_a_chat_or_channel_6 y 4 (analista2.desarrollo y daniel.jimenez)
            erroresConexionSAP.push({
                orden_fabricacion,
                error: sapError || 'Sin respuesta'
            });
            console.error(`🚨 Error al consultar OF ${orden_fabricacion} en SAP:`, sapError);
            continue;
        }

        // Condition_2: length(body('Buscar_orden_en_SAP')['response']) > 0
        if (sapResponseData.length > 0) {
            // Parse_JSON_2: @first(body('Buscar_orden_en_SAP')['response'])
            const sapOrden = sapResponseData[0];
            const cediSAP = Number(sapOrden.cedi) || 0;
            const cantSAP = Number(sapOrden.cantidad) || 0;

            // Condition_3: cedi == cantidad en SAP
            if (cediSAP === cantSAP && cantSAP > 0) {
                // Compose_2: "La orden X esta completa en SAP, estan entregadas Y de Z"
                console.log(`✅ La orden ${orden_fabricacion} está completa en SAP (${cediSAP}/${cantSAP}).`);

                // Cerrar_orden_Supabase (HTTP PATCH a ordenes_fabricacion?id=eq.id)
                const { error: errUpdate } = await supabase
                    .from('ordenes_fabricacion')
                    .update({
                        pendiente: false,
                        fecha_entrega_real: getFechaColombiaISO(),
                        modificado_por: 'Flujo de PowerAutomate'
                    })
                    .eq('id', id);

                if (errUpdate) {
                    console.error(`Error actualizando orden ${orden_fabricacion} en Supabase:`, errUpdate.message);
                } else {
                    // Increment_variable: ordenesCompletadas += 1
                    ordenesCompletadas += 1;
                    cerradas.push({
                        id,
                        orden_fabricacion,
                        cedi: cediSAP,
                        cantidad: cantSAP
                    });
                }
            } else {
                // Rama "else" de Condition_3:
                // Faltan piezas por entregar en SAP -> Enviar Teams a Tatiana y Analista Desarrollo
                novedadesFaltantesSAP.push({
                    orden_fabricacion,
                    cedi: cediSAP,
                    cantidad: cantSAP
                });
                console.warn(`⚠️ OF ${orden_fabricacion}: Completa en App pero en SAP faltan piezas (${cediSAP}/${cantSAP}).`);
            }
        }
    }

    return {
        totalOrdenesLeidas,
        ordenesCompletadas,
        cerradas,
        novedadesFaltantesSAP,
        erroresConexionSAP
    };
}
