// Trabajo Estandarizado (TE) del Sistema de Producción, por planta:
//   TE = 50 % Cobertura del puesto + 50 % Calidad de la HDT
// con las mismas fórmulas de HDT → Estadísticas (lib/hdt/indicadores.ts):
//  - Cobertura: cargos distintos de los empleados activos de la planta (Talento Humano) que tienen una HDT vigente
//    de la planta que corresponde a su labor ÷ cargos distintos de la planta.
//  - Calidad: promedio del puntaje de calidad de las HDT vigentes de la planta.
// Las HDT y los empleados guardan el nombre de la planta ("Mármol Sintético", "Fibra de Vidrio"…); se lleva al código
// de planta del Sistema de Producción (MS, FV…). Si varias plantas de las HDT caen en el mismo código, se suman.
// Es una foto del momento (las HDT no guardan historia): cada semana se guarda la foto en sp_te_semanal.

import { evaluateQuality, matchesLabor, normalizeString, type HdtItem, type HdtStep } from '@/lib/hdt/indicadores'
import { plantaSP } from './ejecuciones'
import { cargarPlantasSP, codigoPlantaSP, hoyIso, semanaDe } from './cumplimiento'
import { supabase } from '@/lib/supabase'
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano'

export type EmpleadoTE = { cargo: string | null; planta: string | null; activo?: boolean | null }
export type TEPlanta = {
    planta: string            // código de planta del Sistema de Producción
    cobertura: number | null  // % (null si la planta no tiene cargos con empleados activos)
    calidad: number | null    // % (null si la planta no tiene HDT vigentes)
    te: number | null         // 50 % cobertura + 50 % calidad (null si falta alguno)
    cargos: number; cargosCubiertos: number; hdts: number
}

export function trabajoEstandarizadoPorPlanta(hdts: HdtItem[], pasos: HdtStep[], empleados: EmpleadoTE[]): TEPlanta[] {
    const vigentes = hdts.filter(h => h.is_current)
    // Por código SP: cargos (por planta original, porque la cobertura se busca en las HDT de esa misma planta) y puntajes
    const m = new Map<string, { cargos: number; cubiertos: number; puntajes: number[] }>()
    const de = (sp: string) => { if (!m.has(sp)) m.set(sp, { cargos: 0, cubiertos: 0, puntajes: [] }); return m.get(sp)! }

    // Calidad
    vigentes.forEach(h => {
        const sp = plantaSP(h.planta)
        if (!sp) return
        de(sp).puntajes.push(evaluateQuality(h, pasos).score)
    })
    // Cobertura (igual que Estadísticas HDT: por planta, cargos distintos de los empleados activos)
    const plantasEmp = new Map<string, string>() // planta normalizada → nombre
    empleados.forEach(e => { if (e.activo !== false && e.planta) plantasEmp.set(normalizeString(e.planta), e.planta) })
    plantasEmp.forEach((nombre, norm) => {
        const sp = plantaSP(nombre)
        if (!sp) return
        const cargos = [...new Set(empleados.filter(e => e.activo !== false && e.planta && normalizeString(e.planta) === norm).map(e => e.cargo).filter((c): c is string => !!c))]
        const hdtsPlanta = vigentes.filter(h => h.planta && normalizeString(h.planta) === norm)
        const x = de(sp)
        x.cargos += cargos.length
        x.cubiertos += cargos.filter(c => hdtsPlanta.some(h => matchesLabor(h.labor, c, h.proceso))).length
    })

    return [...m.entries()].map(([planta, x]) => {
        const cobertura = x.cargos > 0 ? (x.cubiertos / x.cargos) * 100 : null
        // Planta con cargos y sin ninguna HDT: calidad 0 (no hay HDT que calificar), no "sin dato"
        const calidad = x.puntajes.length ? x.puntajes.reduce((a, b) => a + b, 0) / x.puntajes.length : x.cargos > 0 ? 0 : null
        const te = cobertura !== null && calidad !== null ? 0.5 * cobertura + 0.5 * calidad : null
        return { planta, cobertura, calidad, te, cargos: x.cargos, cargosCubiertos: x.cubiertos, hdts: x.puntajes.length }
    }).sort((a, b) => a.planta.localeCompare(b.planta))
}

// Foto semanal guardada en sp_te_semanal
export type TESemana = { semana: string; planta: string; fecha: string; te: number | null; cobertura: number | null; calidad: number | null; hdts: number | null; cargos: number | null; cargos_cubiertos: number | null }

/**
 * Calcula el TE de hoy por planta (HDT vigentes + empleados activos), guarda la foto de la semana en curso en
 * sp_te_semanal y devuelve todas las semanas guardadas (una por semana y planta: la más reciente).
 * Si no se puede guardar, devuelve solo la semana en curso y el error.
 */
/** Foto del TE por planta a la fecha dada (no guarda nada). La usan el tablero, el botón y la tarea de los domingos. */
export async function fotoTrabajoEstandarizado(hoy: string): Promise<{ actual: TESemana[]; errores: string[] }> {
    const errores: string[] = []
    await cargarPlantasSP() // plantas y alias de la Nomenclatura para reconocer la planta de cada HDT
    const [hd, emp] = await Promise.all([
        supabase.from('hdts').select('*').eq('is_current', true),
        supabaseTalentoHumano.from('empleados').select('cargo, planta, activo').eq('activo', true),
    ])
    if (hd.error) errores.push(`Trabajo Estandarizado · HDT: ${hd.error.message}`)
    if (emp.error) errores.push(`Trabajo Estandarizado · empleados: ${emp.error.message}`)
    const ids = (hd.data || []).map((h: { id: string }) => h.id)
    const pasos: HdtStep[] = []
    for (let i = 0; i < ids.length && !errores.length; i += 200) {
        const { data, error } = await supabase.from('hdt_steps').select('*').in('hdt_id', ids.slice(i, i + 200))
        if (error) { errores.push(`Trabajo Estandarizado · pasos HDT: ${error.message}`); break }
        pasos.push(...((data || []) as HdtStep[]))
    }
    if (errores.length) return { actual: [], errores }
    const sm = semanaDe(hoy)
    const actual: TESemana[] = trabajoEstandarizadoPorPlanta((hd.data || []) as HdtItem[], pasos, (emp.data || []) as EmpleadoTE[])
        .filter(x => x.te !== null)
        .map(x => ({ semana: sm.clave, planta: x.planta, fecha: hoy, te: x.te, cobertura: x.cobertura, calidad: x.calidad, hdts: x.hdts, cargos: x.cargos, cargos_cubiertos: x.cargosCubiertos }))
    return { actual, errores }
}

export async function actualizarTrabajoEstandarizado(): Promise<{ filas: TESemana[]; errores: string[]; guardadas: number }> {
    const { actual, errores } = await fotoTrabajoEstandarizado(hoyIso())
    if (errores.length) return { filas: [], errores, guardadas: 0 }
    const up = await supabase.from('sp_te_semanal').upsert(actual.map(x => ({ ...x, actualizado_at: new Date().toISOString() })), { onConflict: 'semana,planta' })
    const todas = up.error ? null : await supabase.from('sp_te_semanal').select('semana, planta, fecha, te, cobertura, calidad, hdts, cargos, cargos_cubiertos')
    if (up.error || todas?.error) {
        const msg = (up.error || todas?.error)!.message
        errores.push(`Trabajo Estandarizado: no se pudo guardar el histórico semanal (${/sp_te_semanal|relation|schema cache/i.test(msg) ? 'falta ejecutar sp_te_semanal.sql' : msg}); solo se muestra la semana en curso.`)
        return { filas: actual, errores, guardadas: 0 }
    }
    const num = (v: unknown) => (v == null ? null : Number(v))
    const unicas = new Map<string, TESemana>()
    ;((todas!.data || []) as TESemana[]).map(x => ({ ...x, planta: codigoPlantaSP(x.planta), te: num(x.te), cobertura: num(x.cobertura), calidad: num(x.calidad) }))
        .forEach(x => { const k = `${x.semana}|${x.planta}`; const y = unicas.get(k); if (!y || x.fecha >= y.fecha) unicas.set(k, x) })
    return { filas: [...unicas.values()], errores, guardadas: actual.length }
}
