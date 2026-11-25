import { supabase } from '@/lib/supabase'
import { revisarEnBloque, type ResultadoEntrega } from '@/lib/revisionEntregaSap'

// Guarda la revisión de componentes para la entrega en public.revision_entrega_of (servidor).
// Si SAP falla para una OF que ya tenía revisión, se conserva la anterior y solo se anota el error.

export type FilaRevision = {
    orden_fabricacion: string; planta: string | null
    estado: 'completo' | 'faltante' | 'sin_dato' | 'error'
    exigidos: number; cubiertos: number; faltantes: number; sin_dato: number
    detalle: ResultadoEntrega['detalle']; error: string | null
    calculado_at: string; visto_at: string
}

const TABLA = 'revision_entrega_of'
const LOTE_LECTURA = 200

export async function leerFilas(ofs: string[]): Promise<Map<string, FilaRevision>> {
    const m = new Map<string, FilaRevision>()
    for (let i = 0; i < ofs.length; i += LOTE_LECTURA) {
        const { data, error } = await supabase.from(TABLA).select('*').in('orden_fabricacion', ofs.slice(i, i + LOTE_LECTURA))
        if (error) throw new Error(`No se pudo leer la revisión guardada: ${error.message}`)
        for (const f of (data || []) as FilaRevision[]) m.set(f.orden_fabricacion, f)
    }
    return m
}

/** Consulta SAP en bloque para estas OF y guarda el resultado. Devuelve las filas como quedaron. */
export async function revisarYGuardar(ofs: string[], planta: string | null, previas?: Map<string, FilaRevision>): Promise<Map<string, FilaRevision>> {
    const anteriores = previas ?? await leerFilas(ofs)
    const resultados = await revisarEnBloque(ofs)
    const ahora = new Date().toISOString()
    const filas: FilaRevision[] = []
    for (const of of ofs) {
        const r = resultados.get(of)
        const previa = anteriores.get(of)
        if (!r) continue
        if ('error' in r) {
            if (previa && previa.estado !== 'error') filas.push({ ...previa, error: r.error })
            else filas.push({
                orden_fabricacion: of, planta: planta ?? previa?.planta ?? null, estado: 'error',
                exigidos: 0, cubiertos: 0, faltantes: 0, sin_dato: 0, detalle: [], error: r.error, calculado_at: ahora, visto_at: previa?.visto_at ?? ahora,
            })
            continue
        }
        filas.push({
            orden_fabricacion: of, planta: planta ?? previa?.planta ?? null, estado: r.estado,
            exigidos: r.exigidos, cubiertos: r.cubiertos, faltantes: r.faltantes, sin_dato: r.sin_dato,
            detalle: r.detalle, error: null, calculado_at: r.calculado_at, visto_at: previa?.visto_at ?? ahora,
        })
    }
    if (filas.length) {
        const { error } = await supabase.from(TABLA).upsert(filas, { onConflict: 'orden_fabricacion' })
        if (error) throw new Error(`No se pudo guardar la revisión: ${error.message}`)
    }
    const salida = new Map(anteriores)
    for (const f of filas) salida.set(f.orden_fabricacion, f)
    return salida
}

/** Marca las OF como vistas en pantalla (el cron solo mantiene al día las vistas en los últimos 2 días). */
export async function marcarVistas(ofs: string[]) {
    const ahora = new Date().toISOString()
    for (let i = 0; i < ofs.length; i += LOTE_LECTURA) {
        await supabase.from(TABLA).update({ visto_at: ahora }).in('orden_fabricacion', ofs.slice(i, i + LOTE_LECTURA))
    }
}
