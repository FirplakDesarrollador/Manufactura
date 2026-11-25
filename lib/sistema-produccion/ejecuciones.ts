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

import { ALIAS_NOMENCLATURA, PLANTAS_SP, semanaDe } from './cumplimiento'
import { ROLES_SP, personaOculta, plantasDePersona, type ReglasSP, type RolSP } from './reglas'
import { festivosColombia, festivoEnDiaLaboral } from '@/lib/festivosColombia'
import { resolveNombreCompleto } from '@/lib/ficha-rcc/constants'

export const HERRAMIENTAS_AUTO = ['AF', 'OPT', 'OPTS', 'BIT', 'RRC'] as const
export type HerrAuto = typeof HERRAMIENTAS_AUTO[number]
// Herramientas que se miden por planta con un porcentaje (no por persona con frecuencia)
export const HERRAMIENTAS_POR_PLANTA = ['TE'] as const

export type Ejecucion = { herr: HerrAuto; fecha: string; quien: string; email?: string | null; planta?: string | null }
// plantas: las de la persona en las reglas (donde la herramienta no está "No aplica"); si no tiene, la registrada en la
// ejecución; vacía = sin planta. Con varias plantas el cupo cuenta en cada una (el total FIRPLAK lo cuenta una vez).
// extra: ejecución de más (por encima de lo exigido en el periodo): se muestra como ejecutada, pero no suma al
// cumplimiento (que no pasa de 100 %)
export type Cupo = { herr: HerrAuto; persona: string; rol: RolSP; plantas: string[]; fecha: string; ejec: 0 | 1; extra?: boolean }

const norm = (s: string | null | undefined) =>
    String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

// Alias de cada planta (Nomenclatura de Plantas + códigos viejos del Sistema de Producción), sin tildes y en minúscula
const ALIAS_PLANTA: Record<string, string[]> = {
    MS: ['ms', 'marmol', 'marmol sintetico', 'planta marmol', 'planta marmol sintetico', 'mp-10', 'marmol sintetico ms'],
    MBL: ['mbl', 'mbles', 'muebles', 'mueble', 'planta de muebles', 'planta muebles', 'carpinteria', 'madera', 'mp-20'],
    FV: ['fv', 'fibra', 'fibra de vidrio', 'planta fibra', 'planta fibra de vidrio', 'refuerzo fibra', 'mp-03', 'hidromasajes', 'jacuzzis', 'jacuzzi', 'multipersonales'],
    RTM: ['rtm', 'inyeccion rtm', 'moldeo rtm', 'planta rtm', 'quartzstone', 'cuarzo', 'qz', 'mp-05', 'sup', 'superficies'],
    SG: ['sg', 'servicios generales', 'planta general', 'planta servicios generales'],
    SERVICIOS: ['servicios', 'servicios a cliente', 'servicio al cliente', 'servicio a cliente'],
    CEFI: ['cefi', 'cema', 'planta cefi', 'planta muebles cefi', 'cefi muebles'],
    MANUF: ['manuf', 'manufactura'],
    MTTO: ['mtto', 'matto', 'mantenimiento', 'mantto', 'mato', 'mto', 'mant', 'averias'],
    LOGI: ['logi', 'log', 'logistica'],
    ALM: ['alm', 'almacen', 'materias primas'],
    CEDI: ['cedi', 'centro de distribucion', 'centro destribucion'],
    EXPO: ['expo', 'exp', 'exportaciones'],
    'FPK-HOME-MED': ['fpk-home-med', 'firplak home medellin', 'tienda medellin'],
    'FPK-HOME-BOG': ['fpk-home-bog', 'firplak home bogota', 'firplak home', 'tienda bogota'],
    MOLD: ['mold', 'moldes', 'fabricacion moldes', 'fabricacion de moldes'],
    RMOLD: ['rmold', 'rr moldes', 'rrmoldes', 'reparacion moldes', 'reparacion de moldes'],
    EX: ['ex', 'ext', 'externo', 'proveedor externo', 'tercerizado'],
    OC: ['oc', 'obras civiles', 'infraestructura'],
    TI: ['ti', 'sistemas', 'tecnologia e informatica'],
    CALID: ['calid', 'calidad', 'cali', 'inspeccion'],
}
const PLANTA_DE_ALIAS = new Map<string, string>(Object.entries(ALIAS_PLANTA).flatMap(([c, l]) => l.map(a => [a, c] as [string, string])))

/** Planta escrita en cada módulo o en Talento Humano → código de planta del Sistema de Producción (null si no es una). */
export function plantaSP(raw: string | null | undefined): string | null {
    const p = norm(raw)
    if (!p) return null
    // 1) el código de una planta de la nomenclatura; 2) alias revisados aquí; 3) alias de la nomenclatura
    const codigo = PLANTAS_SP.find(x => norm(x.value) === p)
    if (codigo) return codigo.value
    const exacto = PLANTA_DE_ALIAS.get(p) || ALIAS_NOMENCLATURA.get(p)
    if (exacto) return exacto
    if (p.includes('(calidad)') || p.startsWith('calidad')) return 'CALID'
    if (p.startsWith('reparacion de moldes') || p.startsWith('reparacion moldes') || p.startsWith('rr molde')) return 'RMOLD'
    if (p.startsWith('molde') || p.startsWith('fabricacion de molde') || p.startsWith('fabricacion molde')) return 'MOLD'
    if (p.startsWith('marmol')) return 'MS'
    if (p.startsWith('fibra')) return 'FV'
    if (p.startsWith('mueble')) return 'MBL'
    if (p.startsWith('mantenimiento')) return 'MTTO'
    if (p.startsWith('almacen')) return 'ALM'
    if (p.startsWith('servicios generales')) return 'SG'
    if (p.startsWith('servicio')) return 'SERVICIOS'
    if (p.startsWith('logistic')) return 'LOGI'
    if (p.startsWith('export')) return 'EXPO'
    if (p.startsWith('superficie') || p.includes('rtm')) return 'RTM'
    return null
}

const isoUtc = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return isoUtc(d) }
const lunesDe = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); const dia = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - dia + 1); return isoUtc(d) }

/**
 * Reglas marcadas "Sí" que hoy no entran en la medición (sin falsos positivos: se avisa, no se asume):
 *  - herramienta automática con un rol "Sí" sin frecuencia definida (no hay cuántas veces exigir);
 *  - herramienta con un rol "Sí" que todavía no tiene fuente automática en la app.
 */
export function reglasSinMedicion(reglas: ReglasSP): string[] {
    const out: string[] = []
    for (const h of reglas.herramientas) {
        const roles = ROLES_SP.filter(rol => h.roles[rol] === 'aplica' && (reglas.personas[rol] || []).length > 0)
        if (!roles.length) continue
        if ((HERRAMIENTAS_POR_PLANTA as readonly string[]).includes(h.codigo)) continue
        if ((HERRAMIENTAS_AUTO as readonly string[]).includes(h.codigo)) {
            const sinFr = roles.filter(rol => !(h.frecuencia?.[rol]?.semana! > 0))
            if (sinFr.length) out.push(`${h.nombre}: aplica a ${sinFr.join(', ')} pero no tiene frecuencia definida, así que no se le exige.`)
        } else {
            out.push(`${h.nombre}: aplica a ${roles.join(', ')} pero aún no tiene fuente automática en la app, así que no entra en el cumplimiento.`)
        }
    }
    return out
}

/**
 * Cupos (exigidos y ejecutados) de las herramientas automáticas, desde `desde` (inclusive) hasta `hoy`.
 * `personaDe` convierte el nombre o correo de quien ejecutó en el nombre de la persona en las reglas (o null).
 */
export function calcularCupos(ejecuciones: Ejecucion[], reglas: ReglasSP, desde: string, hoy: string, hasta: string = hoy): { cupos: Cupo[]; sinPersona: number } {
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
        // Hasta hoy (no hasta el fin del tramo): un mes que cruza el cambio de versión ve todas sus ejecuciones; las
        // semanas solo toman las de su lunes a domingo
        if (!e.fecha || e.fecha < desde || e.fecha > hoy) continue
        const p = resolver(e.quien) || (e.email ? resolver(e.email) : null)
        if (!p) { if (e.fecha <= hasta) sinPersona++; continue }
        const k = `${p}|${e.herr}`
        if (!porClave.has(k)) porClave.set(k, [])
        porClave.get(k)!.push(e)
    }
    porClave.forEach(l => l.sort((a, b) => a.fecha.localeCompare(b.fecha)))

    // Semanas con festivo en día laboral
    const anios = new Set<number>()
    for (let a = Number(desde.slice(0, 4)); a <= Number(hoy.slice(0, 4)); a++) anios.add(a)
    const semanasFestivo = new Set<string>()
    const diasFestivos = new Set<string>()
    anios.forEach(a => festivosColombia(a).forEach(f => { if (festivoEnDiaLaboral(f.fecha)) { semanasFestivo.add(semanaDe(f.fecha).clave); diasFestivos.add(f.fecha) } }))
    // Días hábiles de la semana (lunes a viernes, sin festivos) hasta hoy: las veces no hechas se reparten en ellos
    const diasHabiles = (lunes: string) => [0, 1, 2, 3, 4].map(i => sumarDias(lunes, i)).filter(d => d <= hoy && !diasFestivos.has(d))

    const cupos: Cupo[] = []
    const empujar = (herr: HerrAuto, persona: string, rol: RolSP, exigidos: number, hechas: Ejecucion[], fechaFalta: string, diasLibres: string[] = [], plantasP: string[] = []) => {
        const plantasEj = (e: Ejecucion) => (plantasP.length ? plantasP : plantaSP(e.planta) ? [plantaSP(e.planta)!] : [])
        // Herramientas diarias: una ejecución por día (dos el mismo día no cubren dos días)
        const unaPorDia = diasLibres.length > 0
        const usadas: Ejecucion[] = []
        for (const e of hechas) {
            if (usadas.length >= exigidos) break
            if (unaPorDia && usadas.some(u => u.fecha === e.fecha)) continue
            usadas.push(e)
        }
        usadas.forEach(e => cupos.push({ herr, persona, rol, fecha: e.fecha, plantas: plantasEj(e), ejec: 1 }))
        // Las de más también quedan (adicionales), para ver todo lo que hizo la persona
        hechas.filter(e => !usadas.includes(e)).forEach(e => cupos.push({ herr, persona, rol, fecha: e.fecha, plantas: plantasEj(e), ejec: 1, extra: true }))
        // Las no hechas: en los días hábiles sin ejecución (en orden); si faltan días, en la fecha de cierre del periodo
        const libres = diasLibres.filter(d => !usadas.some(u => u.fecha === d))
        for (let i = 0; i < exigidos - usadas.length; i++) {
            cupos.push({ herr, persona, rol, fecha: libres[i] ?? fechaFalta, plantas: plantasP, ejec: 0 })
        }
    }

    for (const h of reglas.herramientas) {
        if (!(HERRAMIENTAS_AUTO as readonly string[]).includes(h.codigo)) continue
        const herr = h.codigo as HerrAuto
        for (const { nombre, rol } of personas) {
            if (personaOculta(reglas, nombre)) continue   // oculta: no se le exige ni se muestra
            const fr = h.frecuencia?.[rol]
            if (h.roles[rol] !== 'aplica' || !fr || !(fr.semana > 0)) continue
            // Igual que "Revisiones esperadas" en las Reglas: solo cuenta en sus plantas donde la herramienta no está
            // "No aplica"; si todas sus plantas están en "No aplica", no se le exige
            const suyas = plantasDePersona(reglas, nombre)
            const plantasP = suyas.filter(p => h.plantas[p] !== 'no_aplica')
            if (suyas.length && !plantasP.length) continue
            const hechas = porClave.get(`${nombre}|${herr}`) || []

            if (fr.periodo === 'mes') {
                // Por mes: desde el primer mes completo después del histórico; los meses terminados exigen la frecuencia
                // completa y el mes en curso solo cuenta lo ya hecho
                const [ay, am] = desde.split('-').map(Number)
                const primerMes = desde.endsWith('-01') ? desde.slice(0, 7) : isoUtc(new Date(Date.UTC(ay, am, 1))).slice(0, 7)
                for (let m = primerMes; m <= (hasta < hoy ? hasta : hoy).slice(0, 7);) {
                    const [y, mo] = m.split('-').map(Number)
                    const fin = isoUtc(new Date(Date.UTC(y, mo, 0)))
                    const enMes = hechas.filter(e => e.fecha.slice(0, 7) === m)
                    const exigidos = fin < hoy ? fr.semana : Math.min(enMes.length, fr.semana)
                    empujar(herr, nombre, rol, exigidos, enMes, fin < hoy ? fin : hoy, [], plantasP)
                    m = isoUtc(new Date(Date.UTC(y, mo, 1))).slice(0, 7)
                }
                continue
            }

            // Por semana (lunes a domingo)
            for (let lunes = lunesDe(desde); lunes <= hoy && lunes <= hasta; lunes = sumarDias(lunes, 7)) {
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
                // Frecuencia diaria (≥ días hábiles de la semana, ej. Bitácora o RRC 5 / semana): cada día hábil es una vez exigida
                const habiles = diasHabiles(lunes)
                const diaria = completa >= habiles.length && habiles.length > 0
                empujar(herr, nombre, rol, exigidos, enSemana, viernes < hoy ? viernes : hoy, diaria ? habiles : [], plantasP)
            }
        }
    }
    return { cupos, sinPersona }
}

// Versión de las reglas vigente desde un lunes (sp_reglas_versiones)
export type VersionReglas = { desde: string; reglas: ReglasSP }

/** Versión vigente en una fecha (la última con desde ≤ fecha; antes de la primera, la primera). */
export function reglasVigentes(versiones: VersionReglas[], fecha: string): ReglasSP | null {
    if (!versiones.length) return null
    let r = versiones[0].reglas
    for (const v of versiones) if (v.desde <= fecha) r = v.reglas
    return r
}

/**
 * Cupos con reglas por vigencia: cada tramo (de una versión a la siguiente) se calcula con su versión, así un cambio
 * de exigencias aplica desde su fecha y no cambia las semanas anteriores. Las versiones empiezan en lunes.
 */
export function calcularCuposVersiones(ejecuciones: Ejecucion[], versiones: VersionReglas[], desde: string, hoy: string): { cupos: Cupo[]; sinPersona: number } {
    const vs = [...versiones].sort((a, b) => a.desde.localeCompare(b.desde))
    const cupos: Cupo[] = []
    let sinPersona = 0
    vs.forEach((v, i) => {
        const ini = i === 0 || v.desde < desde ? desde : v.desde
        const sig = vs[i + 1]?.desde
        const fin = sig ? sumarDias(sig, -1) : hoy
        if (fin < desde || ini > hoy || ini > fin) return
        const r = calcularCupos(ejecuciones, v.reglas, ini, hoy, fin)
        cupos.push(...r.cupos)
        sinPersona += r.sinPersona
    })
    return { cupos, sinPersona }
}
