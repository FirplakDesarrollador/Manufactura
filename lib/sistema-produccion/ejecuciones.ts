// Cumplimiento del Sistema de Producción calculado en automático desde el historial de ejecución de cada herramienta:
//  - Hora-Hora (AF)   → módulo Hora a Hora (tabla Hora_Hora): quién la realizó, fecha y planta.
//  - OPT              → módulo OPT Operativa (tabla OPT): "Created By", Create_at y Planta.
//  - OPT Sistémica    → módulo OPT Sistémica (tabla opt_registros): correo de quien la hizo, fecha y planta.
//  - Bitácora (BIT)   → módulo Bitácora (tabla seguimiento_bitacora): un día por supervisor con actividades completadas.
//  - RRC              → asistencia del módulo Respuesta Rápida Calidad (registro_asistencia): un día por persona "Presente".
//                       Por ahora solo se mide la asistencia; a futuro, la robustez de la RRC y el cierre de los temas abiertos.
// Lo esperado sale de las Reglas de Medición: a cada persona del rol al que aplica la herramienta se le exige su
// frecuencia (por semana, menos en semanas con festivo; o por mes). Cada vez exigida es un "cupo": ejecutado (1) o no (0).
// Ejecutar de más no pasa de 100 %. La semana en curso se exige en proporción a los días hábiles transcurridos.

import { semanaDe } from './cumplimiento'
import { ROLES_SP, TRANSVERSAL, type ReglasSP, type RolSP } from './reglas'
import { festivosColombia, festivoEnDiaLaboral } from '@/lib/festivosColombia'
import { resolveNombreCompleto } from '@/lib/ficha-rcc/constants'

export const HERRAMIENTAS_AUTO = ['AF', 'OPT', 'OPTS', 'BIT', 'RRC'] as const
export type HerrAuto = typeof HERRAMIENTAS_AUTO[number]

export type Ejecucion = { herr: HerrAuto; fecha: string; quien: string; email?: string | null; planta?: string | null }
export type Cupo = { herr: HerrAuto; persona: string; rol: RolSP; planta: string | null; fecha: string; ejec: 0 | 1 }

const norm = (s: string | null | undefined) =>
    String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/** Planta escrita en cada módulo → código de planta del Sistema de Producción (null si no es una planta de las reglas). */
export function plantaSP(raw: string | null | undefined): string | null {
    const p = norm(raw)
    if (!p) return null
    if (p === 'ms' || p.startsWith('marmol')) return 'MS'
    if (p === 'fv' || p.startsWith('fibra')) return 'FV'
    if (p === 'mbl' || p === 'mbles' || p.startsWith('mueble')) return 'MBLES'
    if (p === 'cefi') return 'CEFI'
    if (p.startsWith('calidad')) return 'CALIDAD'
    if (p === 'rr moldes' || p === 'rrmoldes' || p === 'rmold' || p.startsWith('reparacion de moldes') || p.startsWith('reparacion moldes')) return 'RR MOLDES'
    if (p.startsWith('molde')) return 'MOLDES'
    if (p.startsWith('mantenimiento') || p === 'mant') return 'MANTENIMIENTO'
    if (p === 'cedi') return 'CEDI'
    if (p.startsWith('almacen')) return 'ALMACEN'
    if (p.startsWith('servicio')) return 'SERVICIOS'
    return null
}

const isoUtc = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return isoUtc(d) }
const lunesDe = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); const dia = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - dia + 1); return isoUtc(d) }

/**
 * Cupos (exigidos y ejecutados) de las herramientas automáticas, desde `desde` (inclusive) hasta `hoy`.
 * `personaDe` convierte el nombre o correo de quien ejecutó en el nombre de la persona en las reglas (o null).
 */
export function calcularCupos(ejecuciones: Ejecucion[], reglas: ReglasSP, desde: string, hoy: string): { cupos: Cupo[]; sinPersona: number } {
    // Personas de las reglas y su rol
    const personas: { nombre: string; rol: RolSP }[] = []
    ROLES_SP.forEach(rol => (reglas.personas[rol] || []).forEach(nombre => personas.push({ nombre, rol })))
    const nombres = personas.map(p => p.nombre)
    const porNorm = new Map(nombres.map(n => [norm(n), n]))
    const resolver = (quien: string) => {
        const directo = porNorm.get(norm(quien))
        if (directo) return directo
        const r = resolveNombreCompleto(quien, nombres)
        return porNorm.get(norm(r)) || null
    }

    // Ejecuciones por persona y herramienta
    const porClave = new Map<string, Ejecucion[]>()
    let sinPersona = 0
    for (const e of ejecuciones) {
        if (!e.fecha || e.fecha < desde || e.fecha > hoy) continue
        const p = resolver(e.quien) || (e.email ? resolver(e.email) : null)
        if (!p) { sinPersona++; continue }
        const k = `${p}|${e.herr}`
        if (!porClave.has(k)) porClave.set(k, [])
        porClave.get(k)!.push(e)
    }
    porClave.forEach(l => l.sort((a, b) => a.fecha.localeCompare(b.fecha)))

    // Semanas con festivo en día laboral
    const anios = new Set<number>()
    for (let a = Number(desde.slice(0, 4)); a <= Number(hoy.slice(0, 4)); a++) anios.add(a)
    const semanasFestivo = new Set<string>()
    anios.forEach(a => festivosColombia(a).forEach(f => { if (festivoEnDiaLaboral(f.fecha)) semanasFestivo.add(semanaDe(f.fecha).clave) }))

    const cupos: Cupo[] = []
    const plantaDe = (nombre: string) => { const p = reglas.plantaPersona?.[nombre]; return p && p !== TRANSVERSAL ? p : null }
    const empujar = (herr: HerrAuto, persona: string, rol: RolSP, exigidos: number, hechas: Ejecucion[], fechaFalta: string) => {
        const hechos = Math.min(hechas.length, exigidos)
        for (let i = 0; i < exigidos; i++) {
            const e = i < hechos ? hechas[i] : null
            cupos.push({ herr, persona, rol, fecha: e ? e.fecha : fechaFalta, planta: (e && plantaSP(e.planta)) || plantaDe(persona), ejec: e ? 1 : 0 })
        }
    }

    for (const h of reglas.herramientas) {
        if (!(HERRAMIENTAS_AUTO as readonly string[]).includes(h.codigo)) continue
        const herr = h.codigo as HerrAuto
        for (const { nombre, rol } of personas) {
            const fr = h.frecuencia?.[rol]
            if (h.roles[rol] !== 'aplica' || !fr || !(fr.semana > 0)) continue
            const hechas = porClave.get(`${nombre}|${herr}`) || []

            if (fr.periodo === 'mes') {
                // Por mes: desde el primer mes completo después del histórico; los meses terminados exigen la frecuencia
                // completa y el mes en curso solo cuenta lo ya hecho
                const [ay, am] = desde.split('-').map(Number)
                const primerMes = desde.endsWith('-01') ? desde.slice(0, 7) : isoUtc(new Date(Date.UTC(ay, am, 1))).slice(0, 7)
                for (let m = primerMes; m <= hoy.slice(0, 7);) {
                    const [y, mo] = m.split('-').map(Number)
                    const fin = isoUtc(new Date(Date.UTC(y, mo, 0)))
                    const enMes = hechas.filter(e => e.fecha.slice(0, 7) === m)
                    const exigidos = fin < hoy ? fr.semana : Math.min(enMes.length, fr.semana)
                    empujar(herr, nombre, rol, exigidos, enMes, fin < hoy ? fin : hoy)
                    m = isoUtc(new Date(Date.UTC(y, mo, 1))).slice(0, 7)
                }
                continue
            }

            // Por semana (lunes a domingo)
            for (let lunes = lunesDe(desde); lunes <= hoy; lunes = sumarDias(lunes, 7)) {
                const domingo = sumarDias(lunes, 6)
                const viernes = sumarDias(lunes, 4)
                const enSemana = hechas.filter(e => e.fecha >= lunes && e.fecha <= domingo)
                const conFestivo = semanasFestivo.has(semanaDe(lunes).clave)
                const completa = conFestivo && fr.festivo != null ? fr.festivo : fr.semana
                let exigidos = completa
                if (domingo >= hoy) {
                    // Semana en curso: proporcional a los días hábiles (lunes a viernes) ya transcurridos, hoy incluido
                    const dias = Math.min(5, Math.max(0, Math.round((Date.parse(hoy) - Date.parse(lunes)) / 86400000) + 1))
                    exigidos = Math.max(Math.floor((completa * dias) / 5), Math.min(enSemana.length, completa))
                }
                empujar(herr, nombre, rol, exigidos, enSemana, viernes < hoy ? viernes : hoy)
            }
        }
    }
    return { cupos, sinPersona }
}
