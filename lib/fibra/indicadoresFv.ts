import { supabase } from '@/lib/supabase'
import { parseDBTimestamp } from '@/lib/utils/date'
import { cargarKgPorSku } from './kgProductoFv'

// Indicadores de Control de Piso Fibra (FV): cuántas piezas registró cada proceso en el período (día u mes),
// repartidas por hora (día) o por día (mes), a partir de las fechas de cada proceso en la trazabilidad de la pieza.
// Las fechas se guardan en UTC sin zona (ver parseDBTimestamp); el período se arma en hora local y se consulta en UTC.

export type Proceso = { id: string; label: string; columna: string; grupo: 'flujo' | 'calidad' }

// En el orden del flujo de la planta. Ensayo se guarda en acabado_fecha; Guacales en empaque_fecha;
// Digitado es el paso que deja la pieza en Tránsito.
export const PROCESOS_FV: Proceso[] = [
    { id: 'pintura', label: 'Pintura', columna: 'pintura_fecha', grupo: 'flujo' },
    { id: 'vaciado', label: 'Vaciado', columna: 'vaciado_fecha', grupo: 'flujo' },
    { id: 'herrajes', label: 'Herrajes', columna: 'herrajes_fecha', grupo: 'flujo' },
    { id: 'pulido', label: 'Pulido', columna: 'pulido_fecha', grupo: 'flujo' },
    { id: 'ensayo', label: 'Ensayo', columna: 'acabado_fecha', grupo: 'flujo' },
    { id: 'guacales', label: 'Guacales', columna: 'empaque_fecha', grupo: 'flujo' },
    { id: 'digitado', label: 'Digitado', columna: 'digitado_fecha', grupo: 'flujo' },
    { id: 'cedi', label: 'CEDI', columna: 'cedi_fecha', grupo: 'flujo' },
    { id: 'reparacion', label: 'Reparación', columna: 'reparacion_fecha', grupo: 'calidad' },
    { id: 'saldo', label: 'Saldo', columna: 'saldo_fecha', grupo: 'calidad' },
    { id: 'destruccion', label: 'Destrucción', columna: 'destruccion_fecha', grupo: 'calidad' },
]

export type Periodo = { tipo: 'dia'; fecha: string } | { tipo: 'mes'; mes: string }   // 'YYYY-MM-DD' | 'YYYY-MM'

export type ResultadoIndicadores = {
    cubetas: string[]                                  // horas ('06'…) o días ('01'…)
    conteo: Record<string, Record<string, number>>     // proceso → cubeta → piezas
    total: Record<string, number>                      // proceso → piezas del período
    cicloPromedioDias: number | null                   // Pintura → CEDI de las piezas que llegaron a CEDI en el período
    cicloPiezas: number
    enProceso: { estado: string; piezas: number }[]    // inventario actual por estado (sin CEDI)
    // Kg vaciados: resina + gelcoat (con la reducción de Parámetros FV) de las piezas vaciadas, por cubeta
    kgVaciado: Record<string, number>
    kgTotal: number
    kgSinDato: number                                  // piezas vaciadas cuyo producto no tiene kilos en Parámetros
    actualizado: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const utc = (d: Date) => d.toISOString().slice(0, 19)   // las columnas son UTC sin zona

export function rangoPeriodo(p: Periodo): { desde: Date; hasta: Date; cubetas: string[] } {
    if (p.tipo === 'dia') {
        const [y, m, d] = p.fecha.split('-').map(Number)
        const desde = new Date(y, m - 1, d), hasta = new Date(y, m - 1, d + 1)
        return { desde, hasta, cubetas: Array.from({ length: 24 }, (_, h) => pad(h)) }
    }
    const [y, m] = p.mes.split('-').map(Number)
    const desde = new Date(y, m - 1, 1), hasta = new Date(y, m, 1)
    const dias = new Date(y, m, 0).getDate()
    return { desde, hasta, cubetas: Array.from({ length: dias }, (_, i) => pad(i + 1)) }
}

async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
    const filas: T[] = []
    for (let i = 0; ; i += 1000) {
        const { data, error } = await consulta(i, i + 999)
        if (error) throw new Error(error.message)
        filas.push(...(data || []))
        if (!data || data.length < 1000) break
    }
    return filas
}

export async function cargarIndicadoresFv(p: Periodo): Promise<ResultadoIndicadores> {
    const { desde, hasta, cubetas } = rangoPeriodo(p)
    const d = utc(desde), h = utc(hasta)
    const columnas = PROCESOS_FV.map(x => x.columna)
    const filtro = columnas.map(c => `and(${c}.gte.${d},${c}.lt.${h})`).join(',')

    const [filas, estados, kgPorSku] = await Promise.all([
        todas<Record<string, string | null>>((a, b) => supabase.from('query_trazabilidad_fv')
            .select(['registrer', 'estado', 'producto_sku', ...columnas].join(','))
            .or(filtro).order('registrer').range(a, b) as any),
        todas<{ estado: string | null }>((a, b) => supabase.from('trazabilidad_fv')
            .select('estado').not('estado', 'in', '(Cedi,Destruccion,Saldo)').order('registrer').range(a, b) as any),
        cargarKgPorSku(true),
    ])
    const kgVaciado: Record<string, number> = Object.fromEntries(cubetas.map(c => [c, 0]))
    let kgTotal = 0, kgSinDato = 0

    const conteo: ResultadoIndicadores['conteo'] = {}, total: ResultadoIndicadores['total'] = {}
    for (const pr of PROCESOS_FV) { conteo[pr.id] = Object.fromEntries(cubetas.map(c => [c, 0])); total[pr.id] = 0 }

    let cicloSuma = 0, cicloPiezas = 0
    for (const f of filas) {
        for (const pr of PROCESOS_FV) {
            const v = f[pr.columna]; if (!v) continue
            const t = parseDBTimestamp(v); if (isNaN(t.getTime()) || t < desde || t >= hasta) continue
            const cubeta = pad(p.tipo === 'dia' ? t.getHours() : t.getDate())
            conteo[pr.id][cubeta] = (conteo[pr.id][cubeta] || 0) + 1
            total[pr.id]++
            if (pr.id === 'vaciado') {
                const kg = kgPorSku.get(String(f.producto_sku || '').trim())
                if (kg === undefined) kgSinDato++
                else { kgVaciado[cubeta] += kg; kgTotal += kg }
            }
            if (pr.id === 'cedi' && f.pintura_fecha) {
                const ini = parseDBTimestamp(f.pintura_fecha)
                if (!isNaN(ini.getTime()) && t > ini) { cicloSuma += (t.getTime() - ini.getTime()) / 86400000; cicloPiezas++ }
            }
        }
    }

    const porEstado = new Map<string, number>()
    for (const e of estados) { const k = String(e.estado || 'Sin estado'); porEstado.set(k, (porEstado.get(k) || 0) + 1) }

    return {
        cubetas, conteo, total,
        cicloPromedioDias: cicloPiezas ? cicloSuma / cicloPiezas : null, cicloPiezas,
        enProceso: [...porEstado].map(([estado, piezas]) => ({ estado, piezas })),
        kgVaciado: Object.fromEntries(Object.entries(kgVaciado).map(([k, v]) => [k, Math.round(v * 10) / 10])), kgTotal: Math.round(kgTotal * 10) / 10, kgSinDato,
        actualizado: new Date().toISOString(),
    }
}
