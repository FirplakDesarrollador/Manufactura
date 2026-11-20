// Productividad de las plantas: mismas fórmulas del Excel "Nivel de productividad" (hojas BD_* y BD_FPK).
// Porcentajes como fracción (0,956 = 95,6 %).

export const PLANTAS_PROD = ['MS', 'MBL', 'CEFI', 'FV', 'RTM'] as const
export type PlantaProd = typeof PLANTAS_PROD[number]
export const NOMBRE_PLANTA_PROD: Record<PlantaProd, string> = { MS: 'Mármol Sintético', MBL: 'Muebles', CEFI: 'CEFI', FV: 'Fibra de Vidrio', RTM: 'RTM / Quarzstone' }
export const FAMILIAS = ['EXPLOTACION', 'AVERIA', 'INDUCIDO', 'FUNCIONAL'] as const
export type Familia = typeof FAMILIAS[number]
export const NOMBRE_FAMILIA: Record<Familia, string> = { EXPLOTACION: 'Explotación', AVERIA: 'Averías', INDUCIDO: 'Inducido', FUNCIONAL: 'Funcional' }
export const COLOR_FAMILIA: Record<Familia, string> = { AVERIA: '#f08a5d', EXPLOTACION: '#9cc3d5', INDUCIDO: '#f2e394', FUNCIONAL: '#b8bcc2' }

export interface DiaPlanta {
    fecha: string; planta: PlantaProd
    tiempo_min: number | null; mo_teorica: number | null; mo_real: number | null
    obj_piezas: number | null; real_piezas: number | null; pct_prod_piezas: number | null
    obj_prod: number | null; obj_phh: number | null; real_phh: number | null; prod_phh: number | null
    kg_objetivo: number | null; kg_real: number | null; pct_prod_kg: number | null
    kghh_real: number | null; kghh_objetivo: number | null; pct_prod_kghh: number | null
    // Minutos de pérdida por familia (paros REFLEJADO) y averías reales del día
    min_funcional: number; min_inducido: number; min_explotacion: number; min_averia: number
    min_averia_real: number; paros_averia_real: number
    detalle?: Record<string, unknown>
}
export interface Paro {
    id?: number; fecha: string; planta: string; proceso: string | null; familia: string | null; modo_perdida: string | null
    equipo: string | null; descripcion: string | null; minutos: number; tipo: string | null
    area_responsable: string | null; responsable: string | null
}
export interface ParametrosProd {
    pesos: Record<PlantaProd, number>
    inicio_ms_kg: string
    factor_kg_ms: number
    objetivos_perdidas: { total: number } & Record<Familia, number>
    objetivo_productividad: number
}
export const PARAMETROS_INICIALES: ParametrosProd = {
    pesos: { MS: 0.55, MBL: 0.27, CEFI: 0.13, RTM: 0.02, FV: 0.03 },
    inicio_ms_kg: '2026-10-01',
    factor_kg_ms: 10.5,
    objetivos_perdidas: { total: 0.10, EXPLOTACION: 0.05, AVERIA: 0.02, INDUCIDO: 0.02, FUNCIONAL: 0.01 },
    objetivo_productividad: 0.9,
}

/** Productividad de la planta en el día: MS por kilos desde la fecha de inicio en kg, las demás por piezas. */
export function prodPlanta(d: DiaPlanta, p: ParametrosProd): number | null {
    if (d.planta === 'MS' && d.fecha >= p.inicio_ms_kg) return d.pct_prod_kg
    return d.pct_prod_piezas
}

export type PerdidasDia = Record<Familia, number> & { averiasReales: number; parosAveriaReales: number }
/** Minutos de pérdida por familia de un día y planta: paros REFLEJADO (averías reales: todos los de familia AVERIA). */
export function minutosPerdidas(paros: Paro[]): PerdidasDia {
    const r: PerdidasDia = { EXPLOTACION: 0, AVERIA: 0, INDUCIDO: 0, FUNCIONAL: 0, averiasReales: 0, parosAveriaReales: 0 }
    for (const x of paros) {
        const fam = (x.familia || '').toUpperCase() as Familia
        if (!FAMILIAS.includes(fam)) continue
        if ((x.tipo || '').toUpperCase() === 'REFLEJADO') r[fam] += Number(x.minutos) || 0
        if (fam === 'AVERIA') { r.averiasReales += Number(x.minutos) || 0; r.parosAveriaReales++ }
    }
    return r
}

const clave = (fecha: string, planta: string) => `${fecha}|${planta}`
export function indexarParos(paros: Paro[]) {
    const m = new Map<string, Paro[]>()
    for (const x of paros) { const k = clave(x.fecha, x.planta); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x) }
    return m
}

export interface IndicadorDia {
    fecha: string
    prod: number | null                      // % productividad (null: sin plantas activas)
    phh: number | null
    perdidas: Record<Familia, number> | null // fracción del tiempo
    totalPerdidas: number | null
    pesos: Partial<Record<PlantaProd, number>>
}

/** Pérdidas de una planta en el día como fracción del tiempo laborado (minutos guardados con el día). */
export function perdidasPlanta(d: DiaPlanta): Record<Familia, number> | null {
    if (!d.tiempo_min) return null
    const t = d.tiempo_min
    return { EXPLOTACION: (Number(d.min_explotacion) || 0) / t, AVERIA: (Number(d.min_averia) || 0) / t, INDUCIDO: (Number(d.min_inducido) || 0) / t, FUNCIONAL: (Number(d.min_funcional) || 0) / t }
}

/** Copia al día los minutos de pérdida calculados de sus paros (al registrar desde la app). */
export function conMinutosDeParos(d: DiaPlanta, paros: Paro[]): DiaPlanta {
    const m = minutosPerdidas(paros)
    return { ...d, min_funcional: m.FUNCIONAL, min_inducido: m.INDUCIDO, min_explotacion: m.EXPLOTACION, min_averia: m.AVERIA, min_averia_real: m.averiasReales, paros_averia_real: m.parosAveriaReales }
}

/**
 * Indicador general FIRPLAK por día (BD_FPK): promedio ponderado de las plantas activas.
 * Una planta está activa si tiene registro ese día y la columna "plantas activas" la incluye (vacía o "TODAS (5)" = todas).
 */
export function indicadoresFirplak(dias: DiaPlanta[], activas: Map<string, string>, p: ParametrosProd, plantas: readonly PlantaProd[] = PLANTAS_PROD): IndicadorDia[] {
    const porFecha = new Map<string, Map<PlantaProd, DiaPlanta>>()
    for (const d of dias) { if (!porFecha.has(d.fecha)) porFecha.set(d.fecha, new Map()); porFecha.get(d.fecha)!.set(d.planta, d) }
    const salida: IndicadorDia[] = []
    for (const [fecha, m] of [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const lista = (activas.get(fecha) || '').toUpperCase()
        const activa = (pl: PlantaProd) => m.has(pl) && plantas.includes(pl) && (lista === '' || lista === 'TODAS (5)' || lista.includes(pl))
        const base = PLANTAS_PROD.reduce((s, pl) => s + (activa(pl) ? p.pesos[pl] : 0), 0)
        if (!base) { salida.push({ fecha, prod: null, phh: null, perdidas: null, totalPerdidas: null, pesos: {} }); continue }
        const pesos: Partial<Record<PlantaProd, number>> = {}
        let prod = 0, phh = 0
        const perd: Record<Familia, number> = { EXPLOTACION: 0, AVERIA: 0, INDUCIDO: 0, FUNCIONAL: 0 }
        for (const pl of PLANTAS_PROD) {
            if (!activa(pl)) continue
            const w = p.pesos[pl] / base
            pesos[pl] = w
            const d = m.get(pl)!
            prod += (prodPlanta(d, p) ?? 0) * w
            phh += (d.prod_phh ?? 0) * w
            const pp = perdidasPlanta(d)
            if (pp) for (const f of FAMILIAS) perd[f] += pp[f] * w
        }
        salida.push({ fecha, prod, phh, perdidas: perd, totalPerdidas: FAMILIAS.reduce((s, f) => s + perd[f], 0), pesos })
    }
    return salida
}

export const promedio = (v: (number | null | undefined)[]) => {
    const n = v.filter((x): x is number => typeof x === 'number' && isFinite(x))
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null
}

// ---------------------------------------------------------------------------------------------
// Registro diario: cálculo de los indicadores de un día con las fórmulas de cada hoja del Excel
// ---------------------------------------------------------------------------------------------

const div = (a: number | null | undefined, b: number | null | undefined) => (a == null || !b ? null : a / b)

/** Completa los campos calculados del día según la planta (mismas fórmulas del Excel). */
export function calcularDia(d: DiaPlanta, p: ParametrosProd): DiaPlanta {
    const r = { ...d }
    const det = (r.detalle || {}) as Record<string, number | string | null | undefined>
    const n = (k: string) => { const v = Number(det[k]); return det[k] == null || det[k] === '' || isNaN(v) ? 0 : v }
    if (r.planta === 'MS') {
        // Tiempo real de producción, objetivo por PHH y turnos, kilos
        const mo = [n('mo_teorica_ms_t1'), n('mo_teorica_ms_t2'), n('mo_teorica_ms_t3')]
        const t = [n('tiempo_t1'), n('tiempo_t2'), n('tiempo_t3')]
        const hh = mo.reduce((s, x, i) => s + x * (t[i] / 60), 0)
        r.mo_teorica = mo.reduce((a, b) => a + b, 0)
        r.mo_real = r.mo_teorica - n('ausentismo_general')
        if (r.obj_phh != null) r.obj_piezas = Math.round(r.obj_phh * hh)
        const hhReal = hh * (1 - (r.mo_teorica ? n('ausentismo_general') / r.mo_teorica : 0))
        r.pct_prod_piezas = div(r.real_piezas, r.obj_piezas)
        r.real_phh = div(r.real_piezas, hhReal)
        r.prod_phh = div(r.real_phh, r.obj_phh)
        r.kg_objetivo = r.obj_piezas == null ? null : r.obj_piezas * p.factor_kg_ms
        r.pct_prod_kg = div(r.kg_real, r.kg_objetivo)
        r.kghh_real = div(r.kg_real, hhReal)
        r.kghh_objetivo = r.obj_phh == null ? null : r.obj_phh * p.factor_kg_ms
        r.pct_prod_kghh = div(r.kghh_real, r.kghh_objetivo)
    } else {
        // FV: acabado en conversión (sencillas ×1, hidros ×2, multis ×3); demás plantas: piezas reales directas
        if (r.planta === 'FV') r.real_piezas = n('real_acabado_sencillas') + 2 * n('real_acabado_hidros') + 3 * n('real_acabado_multis')
        if (r.planta === 'RTM') r.real_piezas = n('quarzstone_acabado') + n('rtm_acabado')
        if (r.planta === 'CEFI') r.real_piezas = n('empaque_piezas_fpk') + n('empaque_piezas_turno_1')
        r.pct_prod_piezas = div(r.real_piezas, r.obj_piezas)
        const horas = r.tiempo_min ? r.tiempo_min / 60 : null
        if (r.planta === 'FV' || r.planta === 'RTM') r.obj_phh = horas && r.mo_teorica ? (r.obj_piezas ?? 0) / (horas * r.mo_teorica) : null
        r.real_phh = horas && r.mo_real ? (r.real_piezas ?? 0) / horas / r.mo_real : null
        r.prod_phh = div(r.real_phh, r.obj_phh)
    }
    if (r.obj_prod == null) r.obj_prod = p.objetivo_productividad
    return r
}
