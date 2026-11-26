'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'

// Las fechas del Semáforo de cada OF de Muebles / CEFI (columnas de muebles_control_piso_fv.sql, las llena
// /api/sap/liberacion-muebles). Se leen una sola vez para toda la pantalla y se comparten entre las tarjetas.
type Resultado = { mapa: Map<string, FechasSemaforoFv>; error: string | null }

let pendiente: Promise<Resultado> | null = null

async function leer(): Promise<Resultado> {
    const mapa = new Map<string, FechasSemaforoFv>()
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase
            .from('ordenes_fabricacion_muebles')
            .select('orden_fabricacion, fecha_entrega_lote, fecha_real_liberacion, fecha_ideal_entrega_produccion, fecha_prometida_entrega, fechas_semaforo_actualizadas')
            .eq('pendiente', true).order('id', { ascending: true }).range(desde, desde + 999)
        if (error) {
            return {
                mapa,
                error: /fecha_entrega_lote|fechas_semaforo|column/i.test(error.message)
                    ? 'Faltan las columnas de fechas del Semáforo: ejecute muebles_control_piso_fv.sql en Supabase.'
                    : `No se pudieron leer las fechas del Semáforo: ${error.message}`
            }
        }
        for (const r of data || []) {
            mapa.set(String(r.orden_fabricacion).trim(), {
                lote: r.fecha_entrega_lote, realLib: r.fecha_real_liberacion, idealW: r.fecha_ideal_entrega_produccion,
                prometida: r.fecha_prometida_entrega, actualizadas: r.fechas_semaforo_actualizadas
            })
        }
        if (!data || data.length < 1000) break
    }
    return { mapa, error: null }
}

export function useFechasSemaforoMuebles(activo = true): Resultado | null {
    const [resultado, setResultado] = useState<Resultado | null>(null)
    useEffect(() => {
        if (!activo) return
        let vigente = true
        if (!pendiente) pendiente = leer()
        pendiente.then(r => { if (vigente) setResultado(r) })
        return () => { vigente = false }
    }, [activo])
    return resultado
}
