'use client'

import { supabase } from '@/lib/supabase'
import type { OrdenMueble } from '@/types/muebles'

// Control de Piso Semielaborados (cajas, SKU PEMP…): Corte → Digitado → Tránsito → Almacén.
// OF en ordenes_fabricacion_muebles (planta 'Semielaborados'); registros por CANTIDAD en trazabilidad_muebles;
// unidades por proceso en la vista query_of_semielaborados (semielaborados.sql).

export type OrdenSemi = {
    id: number
    created_at: string
    numero_pedido: string | null
    orden_fabricacion: string
    cantidad: number
    pendiente: boolean
    cliente: string | null
    producto_sku: string | null
    producto_descripcion: string | null
    planta: string
    fecha_entrega_estimada: string | null
    fecha_real_liberacion: string | null
    fecha_prometida_entrega: string | null
    fecha_ideal_entrega_produccion: string | null
    programado: number
    corte: number
    digitado: number
    transito: number
    almacen: number
}

export type ProcesoSemi = 'Corte' | 'Digitado' | 'Transito' | 'Almacen'

/** De qué etapa toma cada proceso lo que tiene por hacer */
export const ENTRADA: Record<ProcesoSemi, keyof OrdenSemi> = {
    Corte: 'programado', Digitado: 'corte', Transito: 'digitado', Almacen: 'transito',
}
export const NOMBRE_PROCESO: Record<ProcesoSemi, string> = {
    Corte: 'Corte', Digitado: 'Digitado', Transito: 'Tránsito', Almacen: 'Almacén',
}

export async function cargarOrdenesSemi(): Promise<OrdenSemi[]> {
    const filas: OrdenSemi[] = []
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from('query_of_semielaborados').select('*')
            .eq('pendiente', true).order('id', { ascending: false }).range(desde, desde + 999)
        if (error) {
            throw new Error(/query_of_semielaborados|relation|schema cache/i.test(error.message)
                ? 'Falta crear el control de piso de Semielaborados: ejecute semielaborados.sql en Supabase.'
                : error.message)
        }
        filas.push(...((data || []) as OrdenSemi[]))
        if (!data || data.length < 1000) break
    }
    return filas
}

/** Registra unidades que terminan un proceso (como en Muebles: una fila por registro con la cantidad) */
export async function registrarSemi(orden: OrdenSemi, proceso: ProcesoSemi, cantidad: number, usuario: { email: string; nombre: string; cedula?: string | null }) {
    const ahora = new Date().toISOString()
    const { error } = await supabase.from('trazabilidad_muebles').insert([{
        orden_fabricacion: String(orden.orden_fabricacion), cantidad, creado_por: usuario.email || usuario.nombre,
        // proceso es una lista fija en la base (proceso_muebles): Almacén se guarda como 'Cedi'
        proceso: proceso === 'Almacen' ? 'Cedi' : proceso, cedula_operario: usuario.cedula || usuario.email || 'SEMIELABORADOS', nombre_operario: usuario.nombre,
        fecha_inicio: ahora, taladro: 'NO APLICA', created_at: ahora,
    }])
    if (error) throw error
}

/** La OF con los campos de Muebles (para reutilizar Mover OF, Editar, Eliminar y Trazabilidad) */
export function comoOrdenMueble(o: OrdenSemi): OrdenMueble {
    return {
        id: o.id, created_at: o.created_at, numero_pedido: o.numero_pedido || '', orden_fabricacion: o.orden_fabricacion,
        cantidad: o.cantidad, cliente: o.cliente || '', ensayo: false, producto_sku: o.producto_sku || '',
        producto_descripcion: o.producto_descripcion || '', planta: o.planta, por_cortar: o.programado, piezas_pendientes: 0,
        corte: o.corte, enchape: 0, inspeccion: 0, empaque: 0, digitado: o.digitado, transito: o.transito, cedi: o.almacen,
        sum_cortados: 0, sum_enchapado: 0, sum_inspeccion: 0, sum_empacado: 0, sum_digitado: 0, sum_transito: 0, sum_cedi: 0,
        piezas: 0, canto: 0, rh_metros: 0, reposiciones: 0, por_reponer: 0, reponer_corte: 0, reponer_enchape: 0,
        reponer_inspeccion: 0, fecha_entrega_estimada: o.fecha_entrega_estimada || '', pendiente: o.pendiente,
    }
}

export const coincideSemi = (o: OrdenSemi, q: string) => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    return [o.orden_fabricacion, o.producto_descripcion, o.producto_sku, o.numero_pedido, o.cliente].some(v => String(v || '').toLowerCase().includes(t))
}
