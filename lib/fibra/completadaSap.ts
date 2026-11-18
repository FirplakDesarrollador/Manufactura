import { supabase } from '@/lib/supabase'
import type { OrdenFabricacion } from '@/types/pintura'

// Cantidad completada en SAP de cada OF de Fibra (columna cantidad_completada_sap de ordenes_fabricacion_fibra, que se
// llena al cargar órdenes). Si la columna aún no existe (falta fibra_completada_sap.sql), las órdenes quedan igual.

/** Unidades entregadas en SAP que no tienen registro en planta (CEDI de SAP por encima del CEDI registrado). */
export function cediSoloSap(o: OrdenFabricacion): number {
    const sap = Number(o.cantidad_completada_sap) || 0
    return Math.max(0, sap - Math.max(0, Number(o.cedi) || 0))
}

/** Agrega cantidad_completada_sap a las órdenes (por número de OF). */
export async function conCompletadaSap<T extends OrdenFabricacion>(ordenes: T[]): Promise<T[]> {
    if (!ordenes.length) return ordenes
    const { data, error } = await supabase.from('ordenes_fabricacion_fibra')
        .select('orden_fabricacion, cantidad_completada_sap').eq('pendiente', true)
    if (error || !data) return ordenes
    const mapa = new Map(data.map(r => [String(r.orden_fabricacion).trim(), Number(r.cantidad_completada_sap) || 0]))
    return ordenes.map(o => ({ ...o, cantidad_completada_sap: mapa.get(String(o.orden_fabricacion).trim()) ?? null }))
}
