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

// Tipos de semielaborado (26/11/2026). Todos tienen 4 pasos; cambia el nombre del primero y del último:
//  - Cajas (SKU PEMP…):                     Corte → Digitado → Tránsito → Almacén
//  - Herrajes FV (SKU PMPD04…):             Herrajes → Digitado → Tránsito → Almacén
//  - Kits motobomba FV (PEST01… MOTOBOMBA): Ensamble → Digitado → Tránsito → CEDI
// El primer paso se guarda siempre como 'Corte' en trazabilidad_muebles (proceso es una lista fija de la base) y el
// último como 'Cedi'; la pantalla muestra el nombre de cada tipo. Cada OF es de un solo tipo (por su SKU).
export type TipoSemi = 'cajas' | 'herrajes' | 'motobombas'

export const TIPOS_SEMI: { id: TipoSemi; label: string; procesos: Record<ProcesoSemi, string>; claves: Record<ProcesoSemi, string> }[] = [
    { id: 'cajas', label: 'Cajas', procesos: { Corte: 'Corte', Digitado: 'Digitado', Transito: 'Tránsito', Almacen: 'Almacén' },
        claves: { Corte: 'corte', Digitado: 'digitado', Transito: 'transito', Almacen: 'almacen' } },
    { id: 'herrajes', label: 'Herrajes FV', procesos: { Corte: 'Herrajes', Digitado: 'Digitado', Transito: 'Tránsito', Almacen: 'Almacén' },
        claves: { Corte: 'herrajes', Digitado: 'digitado', Transito: 'transito', Almacen: 'almacen' } },
    { id: 'motobombas', label: 'Kits motobomba FV', procesos: { Corte: 'Ensamble', Digitado: 'Digitado', Transito: 'Tránsito', Almacen: 'CEDI' },
        claves: { Corte: 'ensamble', Digitado: 'digitado', Transito: 'transito', Almacen: 'cedi' } },
]
export const tipoSemi = (id: TipoSemi) => TIPOS_SEMI.find(t => t.id === id)!

export function tipoDeSku(sku: string | null | undefined): TipoSemi {
    const s = String(sku || '').toUpperCase()
    if (s.startsWith('PMPD')) return 'herrajes'
    if (s.startsWith('PEST')) return 'motobombas'
    return 'cajas'
}

/** Permiso de un proceso de un tipo: semielaborados.<tipo>_<proceso> (p. ej. herrajes_herrajes, motobombas_cedi) */
export const permisoSemi = (tipo: TipoSemi, proceso: ProcesoSemi) => `${tipo}_${tipoSemi(tipo).claves[proceso]}`

export async function cargarOrdenesSemi(tipo?: TipoSemi): Promise<OrdenSemi[]> {
    const todas = await cargarTodasSemi()
    return tipo ? todas.filter(o => tipoDeSku(o.producto_sku) === tipo) : todas
}

async function cargarTodasSemi(): Promise<OrdenSemi[]> {
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
