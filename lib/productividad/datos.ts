import { supabase } from '@/lib/supabase'
import { PARAMETROS_INICIALES, conMinutosDeParos, calcularDia, type DiaPlanta, type ParametrosProd, type Paro, type PlantaProd } from './calculo'

// Lectura y registro de productividad en Supabase (tablas de productividad.sql)

const COLS_DIA = 'fecha, planta, tiempo_min, mo_teorica, mo_real, obj_piezas, real_piezas, pct_prod_piezas, obj_prod, obj_phh, real_phh, prod_phh, kg_objetivo, kg_real, pct_prod_kg, kghh_real, kghh_objetivo, pct_prod_kghh, min_funcional, min_inducido, min_explotacion, min_averia, min_averia_real, paros_averia_real'
const COLS_PARO = 'id, fecha, planta, proceso, familia, modo_perdida, equipo, descripcion, minutos, tipo, area_responsable, responsable'

const faltaTabla = (m: string) => /prod_(dia_planta|paros|parametros|plantas_activas)/.test(m) && /(does not exist|schema cache|not find)/i.test(m)
export const mensajeError = (m: string) => (faltaTabla(m) ? 'Falta ejecutar productividad.sql en Supabase (y cargar el histórico).' : m)

const aNum = (v: unknown) => (v == null || v === '' ? null : Number(v))

// Supabase devuelve como máximo 1000 filas por consulta: se pide por páginas
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const salida: T[] = []
    for (let i = 0; ; i += 1000) {
        const { data, error } = await consulta(i, i + 999)
        if (error) throw new Error(mensajeError(error.message))
        salida.push(...(data || []))
        if (!data || data.length < 1000) break
    }
    return salida
}

const normalizarDia = (r: Record<string, unknown>): DiaPlanta => {
    const d = { ...r } as unknown as DiaPlanta
    for (const k of Object.keys(r)) if (k !== 'fecha' && k !== 'planta' && k !== 'detalle') (d as unknown as Record<string, unknown>)[k] = aNum(r[k])
    for (const k of ['min_funcional', 'min_inducido', 'min_explotacion', 'min_averia', 'min_averia_real', 'paros_averia_real'] as const) d[k] = Number(d[k]) || 0
    return d
}

/** Días de las plantas (con detalle solo si se pide: es pesado). */
export async function cargarDias(opts: { desde?: string; plantas?: PlantaProd[]; conDetalle?: boolean } = {}): Promise<DiaPlanta[]> {
    const filas = await todas<Record<string, unknown>>((a, b) => {
        let q = supabase.from('prod_dia_planta').select(opts.conDetalle ? `${COLS_DIA}, detalle` : COLS_DIA).order('fecha').order('planta').range(a, b)
        if (opts.desde) q = q.gte('fecha', opts.desde)
        if (opts.plantas?.length) q = q.in('planta', opts.plantas)
        return q as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>
    })
    return filas.map(normalizarDia)
}

export async function cargarParos(opts: { desde?: string; hasta?: string } = {}): Promise<Paro[]> {
    const filas = await todas<Paro>((a, b) => {
        let q = supabase.from('prod_paros').select(COLS_PARO).order('fecha', { ascending: false }).order('id').range(a, b)
        if (opts.desde) q = q.gte('fecha', opts.desde)
        if (opts.hasta) q = q.lte('fecha', opts.hasta)
        return q as unknown as PromiseLike<{ data: Paro[] | null; error: { message: string } | null }>
    })
    return filas.map(p => ({ ...p, minutos: Number(p.minutos) || 0 }))
}

export async function cargarActivas(): Promise<Map<string, string>> {
    const filas = await todas<{ fecha: string; plantas: string }>((a, b) => supabase.from('prod_plantas_activas').select('fecha, plantas').range(a, b) as unknown as PromiseLike<{ data: { fecha: string; plantas: string }[] | null; error: { message: string } | null }>)
    return new Map(filas.map(f => [f.fecha, f.plantas]))
}

export async function cargarParametros(): Promise<ParametrosProd> {
    const { data, error } = await supabase.from('prod_parametros').select('clave, valor')
    if (error) throw new Error(mensajeError(error.message))
    const p: ParametrosProd = JSON.parse(JSON.stringify(PARAMETROS_INICIALES))
    for (const f of data || []) (p as unknown as Record<string, unknown>)[f.clave] = f.valor
    return p
}

/** Último día registrado de la planta antes de la fecha (para proponer los valores que casi no cambian). */
export async function ultimoDia(planta: PlantaProd, antesDe: string): Promise<DiaPlanta | null> {
    const { data, error } = await supabase.from('prod_dia_planta').select(`${COLS_DIA}, detalle`).eq('planta', planta).lt('fecha', antesDe).order('fecha', { ascending: false }).limit(1)
    if (error) throw new Error(mensajeError(error.message))
    return data?.[0] ? normalizarDia(data[0] as Record<string, unknown>) : null
}

export async function diaRegistrado(planta: PlantaProd, fecha: string): Promise<{ dia: DiaPlanta | null; paros: Paro[] }> {
    const [d, p] = await Promise.all([
        supabase.from('prod_dia_planta').select(`${COLS_DIA}, detalle, origen, registrado_por, updated_at`).eq('planta', planta).eq('fecha', fecha).maybeSingle(),
        supabase.from('prod_paros').select(COLS_PARO).eq('planta', planta).eq('fecha', fecha).order('id'),
    ])
    if (d.error) throw new Error(mensajeError(d.error.message))
    if (p.error) throw new Error(mensajeError(p.error.message))
    return { dia: d.data ? normalizarDia(d.data as Record<string, unknown>) : null, paros: (p.data || []).map(x => ({ ...x, minutos: Number(x.minutos) || 0 })) as Paro[] }
}

/**
 * Guarda el día de una planta y sus paros (reemplaza los paros de ese día y planta).
 * Calcula los indicadores con las fórmulas del Excel y los minutos de pérdida con los paros.
 */
export async function guardarDia(dia: DiaPlanta, paros: Paro[], p: ParametrosProd, origen: 'app' | 'informe_turno', email: string | null): Promise<DiaPlanta> {
    const parosLimpios = paros.filter(x => (x.descripcion || '').trim() && Number(x.minutos) > 0).map(x => ({ ...x, fecha: dia.fecha, planta: dia.planta }))
    const calculado = conMinutosDeParos(calcularDia(dia, p), parosLimpios)
    const { error } = await supabase.from('prod_dia_planta').upsert({ ...calculado, origen, registrado_por: email, updated_at: new Date().toISOString() }, { onConflict: 'fecha,planta' })
    if (error) throw new Error(mensajeError(error.message))
    const del = await supabase.from('prod_paros').delete().eq('fecha', dia.fecha).eq('planta', dia.planta)
    if (del.error) throw new Error(mensajeError(del.error.message))
    if (parosLimpios.length) {
        const ins = await supabase.from('prod_paros').insert(parosLimpios.map(x => ({
            fecha: x.fecha, planta: x.planta, proceso: x.proceso || null, familia: x.familia || null, modo_perdida: x.modo_perdida || null,
            equipo: x.equipo || null, descripcion: (x.descripcion || '').trim().toUpperCase(), minutos: Number(x.minutos) || 0,
            tipo: x.tipo || 'REFLEJADO', area_responsable: x.area_responsable || null, responsable: x.responsable || null, origen, registrado_por: email,
        })))
        if (ins.error) throw new Error(mensajeError(ins.error.message))
    }
    return calculado
}

/** Sugerencias del histórico de paros: familia, modo, equipo y área más usados para una descripción parecida. */
export async function catalogoParos(planta: PlantaProd): Promise<Paro[]> {
    const desde = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)
    return todas<Paro>((a, b) => supabase.from('prod_paros').select(COLS_PARO).eq('planta', planta).gte('fecha', desde).range(a, b) as unknown as PromiseLike<{ data: Paro[] | null; error: { message: string } | null }>)
}
