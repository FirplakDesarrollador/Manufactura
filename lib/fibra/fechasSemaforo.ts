'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Las 4 fechas del Semáforo guardadas en cada OF de Fibra (ver fibra_fechas_semaforo.sql). Se leen de la tabla
// ordenes_fabricacion_fibra una sola vez para toda la pantalla y se comparten entre las tarjetas de orden.
export type FechasSemaforoFv = {
    lote: string | null        // Fecha Entrega Lote (T)
    realLib: string | null     // Fecha Real Liberación
    idealW: string | null      // Fecha Ideal Entrega Producción (W)
    prometida: string | null   // Fecha Prometida Entrega Item (AF)
    actualizadas: string | null
}
type Resultado = { mapa: Map<string, FechasSemaforoFv>; error: string | null }

let pendiente: Promise<Resultado> | null = null
const oyentes = new Set<(r: Resultado) => void>()

async function leer(): Promise<Resultado> {
    const { data, error } = await supabase
        .from('ordenes_fabricacion_fibra')
        .select('orden_fabricacion, fecha_entrega_lote, fecha_real_liberacion, fecha_ideal_entrega_produccion, fecha_prometida_entrega, fechas_semaforo_actualizadas')
        .eq('pendiente', true)
    if (error) {
        return {
            mapa: new Map(),
            error: /fecha_entrega_lote|fechas_semaforo|column/i.test(error.message)
                ? 'Faltan las columnas de fechas del Semáforo: ejecute fibra_fechas_semaforo.sql en Supabase.'
                : `No se pudieron leer las fechas del Semáforo: ${error.message}`
        }
    }
    const mapa = new Map<string, FechasSemaforoFv>()
    for (const r of data || []) {
        mapa.set(String(r.orden_fabricacion).trim(), {
            lote: r.fecha_entrega_lote, realLib: r.fecha_real_liberacion, idealW: r.fecha_ideal_entrega_produccion,
            prometida: r.fecha_prometida_entrega, actualizadas: r.fechas_semaforo_actualizadas
        })
    }
    return { mapa, error: null }
}

export function cargarFechasSemaforoFv(): Promise<Resultado> {
    if (!pendiente) pendiente = leer()
    return pendiente
}

// Después de "Cargar Órdenes": vuelve a leer y avisa a las tarjetas abiertas
export function recargarFechasSemaforoFv() {
    pendiente = leer()
    pendiente.then(r => oyentes.forEach(f => f(r)))
}

export function useFechasSemaforoFv(activo = true): Resultado | null {
    const [resultado, setResultado] = useState<Resultado | null>(null)
    useEffect(() => {
        if (!activo) return
        let vigente = true
        cargarFechasSemaforoFv().then(r => { if (vigente) setResultado(r) })
        const oir = (r: Resultado) => { if (vigente) setResultado(r) }
        oyentes.add(oir)
        return () => { vigente = false; oyentes.delete(oir) }
    }, [activo])
    return resultado
}
