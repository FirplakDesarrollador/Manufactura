// Ubicación automática de los técnicos en la cuadrilla (PR / NP / PRNP / INACTIVO) según su turno de hoy y el horario
// de las plantas de la semana (Gestor de Mantenimiento → Configuración).
// Reglas (decisión del 24/11/2026):
//  - Un rato del turno es "producción" si AL MENOS UNA de las plantas del técnico (su especialidad) está trabajando;
//    si el técnico no tiene plantas con horario (p. ej. OTROS), se compara con todas las plantas.
//  - Todo el turno en producción (100 %) → PR; nada (0 %) → NP; cualquier cruce parcial → PRNP (ajuste del 24/11/2026).
//  - Descanso o Vacaciones hoy → INACTIVO. Sin turno hoy → no se cambia.
//  - Manda el día de hoy (la cuadrilla se reubica cada día).

export type Modalidad = 'PR' | 'NP' | 'PRNP' | 'INACTIVO'
/** Horario de una planta en un día: intervalo (puede pasar de medianoche), 'NO' = no trabaja, null = sin definir */
export type HorarioDia = { i: string; f: string } | 'NO' | null

export const MIN_PR = 1
export const MAX_NP = 0
const TOL = 0.001   // redondeo de minutos

/** 'HH:MM' → minutos del día */
export const minutos = (h: string) => { const [a, b] = h.split(':').map(Number); return (a || 0) * 60 + (b || 0) }

/** Horario '05:30 – 12:50' de un turno → [inicio, fin] en minutos (fin > inicio; si pasa de medianoche se suma 1440) */
export function intervaloTurno(horario: string): [number, number] | null {
    const m = horario.match(/(\d{1,2}:\d{2})\s*[–-]+\s*(\d{1,2}:\d{2})/)
    if (!m) return null
    const a = minutos(m[1]); let b = minutos(m[2])
    if (b <= a) b += 1440
    return [a, b]
}

/** Intervalos de producción (unión de todas las plantas) de ayer, hoy y mañana, en minutos relativos a hoy 00:00 */
function intervalosProduccion(porPlanta: HorarioDia[][], hoyIdx: number, semanaSiguiente?: HorarioDia[][]): [number, number][] {
    const out: [number, number][] = []
    const diaDe = (dias: HorarioDia[] | undefined, d: number) => dias?.[d] ?? null
    porPlanta.forEach((dias, p) => {
        for (const desfase of [-1, 0, 1]) {
            const d = hoyIdx + desfase
            const h = d < 0 ? null : d > 6 ? diaDe(semanaSiguiente?.[p], 0) : diaDe(dias, d)
            if (!h || h === 'NO') continue
            const a = minutos(h.i); let b = minutos(h.f)
            if (b <= a) b += 1440               // 22:00 – 06:00 o 24 h (06:00 – 06:00)
            out.push([a + desfase * 1440, b + desfase * 1440])
        }
    })
    return out
}

/** Minutos de [a, b] cubiertos por la unión de los intervalos */
function cubierto([a, b]: [number, number], ints: [number, number][]): number {
    const cortes = ints.map(([x, y]) => [Math.max(a, x), Math.min(b, y)] as [number, number]).filter(([x, y]) => y > x).sort((p, q) => p[0] - q[0])
    let total = 0, fin = a
    for (const [x, y] of cortes) { if (y <= fin) continue; total += y - Math.max(x, fin); fin = y }
    return total
}

/**
 * Modalidad de un técnico hoy.
 * @param codigo turno de hoy ('T1'..'T9', 'D', 'V' o null)
 * @param horario horario del turno ('05:30 – 12:50')
 * @param porPlanta horario de cada planta en la semana (7 días, domingo a sábado)
 * @param siguiente mismo orden de plantas en la semana siguiente (para el turno del sábado que pasa al domingo)
 * @returns modalidad y % del turno en producción; null si no hay turno hoy
 */
export function modalidadDeHoy(codigo: string | null | undefined, horario: string | undefined, porPlanta: HorarioDia[][], hoyIdx: number, siguiente?: HorarioDia[][]): { modalidad: Modalidad; pct: number | null } | null {
    if (!codigo) return null
    if (codigo === 'D' || codigo === 'V') return { modalidad: 'INACTIVO', pct: null }
    const t = horario ? intervaloTurno(horario) : null
    if (!t) return null
    const pct = cubierto(t, intervalosProduccion(porPlanta, hoyIdx, siguiente)) / (t[1] - t[0])
    return { modalidad: pct >= MIN_PR - TOL ? 'PR' : pct <= MAX_NP + TOL ? 'NP' : 'PRNP', pct }
}
