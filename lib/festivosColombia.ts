// Festivos de Colombia calculados para cualquier año (se actualizan solos cada año).
// - Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
// - Ley Emiliani (Ley 51 de 1983), se pasan al lunes siguiente: 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
// - Según la Pascua: Jueves y Viernes Santo; Ascensión (+43), Corpus Christi (+64) y Sagrado Corazón (+71) en lunes.

export type Festivo = { fecha: string; nombre: string }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d))
const sumar = (d: Date, dias: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + dias); return x }
const lunesSiguiente = (d: Date) => { const dia = d.getUTCDay(); return dia === 1 ? d : sumar(d, (8 - dia) % 7) }

// Domingo de Pascua (algoritmo de Meeus/Butcher, calendario gregoriano)
function pascua(a: number) {
    const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4
    const g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30
    const k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451)
    const mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1
    return utc(a, mes, dia)
}

export function festivosColombia(anio: number): Festivo[] {
    const p = pascua(anio)
    const lista: [Date, string][] = [
        [utc(anio, 1, 1), 'Año Nuevo'],
        [lunesSiguiente(utc(anio, 1, 6)), 'Reyes Magos'],
        [lunesSiguiente(utc(anio, 3, 19)), 'San José'],
        [sumar(p, -3), 'Jueves Santo'],
        [sumar(p, -2), 'Viernes Santo'],
        [utc(anio, 5, 1), 'Día del Trabajo'],
        [sumar(p, 43), 'Ascensión del Señor'],
        [sumar(p, 64), 'Corpus Christi'],
        [sumar(p, 71), 'Sagrado Corazón'],
        [lunesSiguiente(utc(anio, 6, 29)), 'San Pedro y San Pablo'],
        [utc(anio, 7, 20), 'Día de la Independencia'],
        [utc(anio, 8, 7), 'Batalla de Boyacá'],
        [lunesSiguiente(utc(anio, 8, 15)), 'Asunción de la Virgen'],
        [lunesSiguiente(utc(anio, 10, 12)), 'Día de la Raza'],
        [lunesSiguiente(utc(anio, 11, 1)), 'Todos los Santos'],
        [lunesSiguiente(utc(anio, 11, 11)), 'Independencia de Cartagena'],
        [utc(anio, 12, 8), 'Inmaculada Concepción'],
        [utc(anio, 12, 25), 'Navidad'],
    ]
    return lista.map(([d, nombre]) => ({ fecha: iso(d), nombre })).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Semana ISO (lunes a domingo) de una fecha AAAA-MM-DD
export function semanaIso(fecha: string) {
    const [a, m, d] = fecha.split('-').map(Number)
    const t = utc(a, m, d)
    const dia = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - dia)
    const inicio = utc(t.getUTCFullYear(), 1, 1)
    return { anio: t.getUTCFullYear(), semana: Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7) }
}

// ¿El festivo cae en día laboral (lunes a sábado)? Un festivo en domingo no reduce la semana
export const festivoEnDiaLaboral = (fecha: string) => { const [a, m, d] = fecha.split('-').map(Number); return utc(a, m, d).getUTCDay() !== 0 }
