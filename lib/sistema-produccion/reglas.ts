// Reglas de Medición del Sistema de Producción: a quién le aplica cada herramienta (por rol y por planta),
// metas, forma de cálculo y personas por rol. Un solo documento en Supabase (sp_reglas_medicion, clave 'reglas').
// Todos lo leen; solo los garantes del Sistema de Producción lo modifican (también lo exige la base de datos).
// Valores iniciales tomados del Excel "ILU CONSOLIDADO 1.xlsx" (hojas Lider, Supervisores, Jefes, % SUPERVISORES,
// % JEFES, LIDERES %, Herramienta y RRC).

import { PLANTAS_SP } from './cumplimiento'

export type EstadoRegla = 'aplica' | 'no_aplica' | 'formacion' | 'por_definir'
export const ESTADOS_REGLA: Record<EstadoRegla, { label: string; corto: string; clase: string; ayuda: string }> = {
    aplica: { label: 'Aplica', corto: 'Sí', clase: 'bg-[#59a96a] text-white border-[#59a96a]', ayuda: 'Se mide y cuenta en el cumplimiento' },
    no_aplica: { label: 'No aplica', corto: 'No', clase: 'bg-white text-slate-400 border-slate-200', ayuda: 'No se le exige' },
    formacion: { label: 'Solo formación', corto: 'Form.', clase: 'bg-[#7B8E90]/20 text-[#324354] border-[#7B8E90]/50', ayuda: 'Está en el plan de formación, pero no se mide en el cumplimiento' },
    por_definir: { label: 'Por definir', corto: '?', clase: 'bg-[#deb841]/25 text-[#7a5f0e] border-[#deb841]', ayuda: 'Pendiente que los garantes definan si aplica' },
}
export const ORDEN_ESTADOS: EstadoRegla[] = ['aplica', 'no_aplica', 'formacion', 'por_definir']

export const ROLES_SP = ['Líder', 'Supervisor', 'Jefe', 'Gerente'] as const
export type RolSP = typeof ROLES_SP[number]
// Nombre en pantalla de cada rol (la clave "Jefe" incluye a los coordinadores)
export const NOMBRE_ROL: Record<RolSP, { uno: string; varios: string; corto: string }> = {
    'Líder': { uno: 'Líder', varios: 'Líderes', corto: 'Líder' },
    'Supervisor': { uno: 'Supervisor', varios: 'Supervisores', corto: 'Supervisor' },
    'Jefe': { uno: 'Jefe o Coordinador', varios: 'Jefes y Coordinadores', corto: 'Jefe / Coord.' },
    'Gerente': { uno: 'Gerente', varios: 'Gerentes', corto: 'Gerente' },
}
// Frecuencia mínima de una herramienta para un rol: `semana` es la cantidad por periodo (por semana, salvo
// periodo 'mes'); "festivo" = semanas con festivo (solo aplica a las semanales). Gerente: frecuencia mensual.
export type PeriodoFrecuencia = 'semana' | 'mes'
export type Frecuencia = { semana: number; festivo?: number | null; periodo?: PeriodoFrecuencia }

export type HerramientaRegla = {
    codigo: string; nombre: string
    fuente: string          // de dónde sale el dato hoy
    nota?: string
    roles: Record<RolSP, EstadoRegla>
    plantas: Record<string, EstadoRegla>
    frecuencia?: Partial<Record<RolSP, Frecuencia>>
}
export type ReglasSP = {
    metaIndividual: number           // herramienta, planta y persona
    limiteSuperior: number           // colectivo FIRPLAK
    limiteInferior: number
    calculo: string[]                // cómo se calcula (texto)
    herramientas: HerramientaRegla[]
    personas: Record<RolSP, string[]>
    // Planta de cada persona (código de planta, "TRANSVERSAL" si cubre varias, vacío = por definir).
    // Se usa para el total de revisiones esperadas por planta.
    plantaPersona?: Record<string, string>
}
// RRC: días con asistencia "Presente" en el módulo RRC contra la frecuencia de las reglas (por ahora solo asistencia;
// a futuro se medirá la robustez de la RRC y el cierre de los temas abiertos)
export const FUENTE_RRC = 'App · Asistencia RRC según la frecuencia (automático). A futuro: robustez de la RRC y cierre de temas abiertos'
// Herramientas que se miden en automático desde el historial de su módulo (lib/sistema-produccion/ejecuciones.ts)
export const FUENTES_AUTO: Record<string, string> = {
    AF: 'App · Historial Hora a Hora (automático)',
    OPT: 'App · Historial OPT Operativa (automático)',
    OPTS: 'App · Historial OPT Sistémica (automático)',
    BIT: 'App · Historial Bitácora (automático)',
    RRC: FUENTE_RRC,
}
export const TRANSVERSAL = 'TRANSVERSAL'

// Garantes del Sistema de Producción: únicos que pueden modificar las reglas
// (Estiven Londoño tiene dos correos: el del directorio y el que usa en la app)
export const GARANTES_SP = [
    { nombre: 'Héctor Chinchilla', correos: ['hector.chinchilla@firplak.com'] },
    { nombre: 'María Isabel Escobar', correos: ['supervisorcalidad3@firplak.com'] },
    { nombre: 'Estiven Londoño', correos: ['coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'] },
]
export const esGaranteSP = (email?: string | null) =>
    !!email && GARANTES_SP.some(g => g.correos.includes(email.trim().toLowerCase()))

// Plantas: 'A' aplica, '0' = 0 % en el Excel (se contaba en el promedio, pero hay que confirmar si aplica), 'N' sin dato
const plantas = (marcas: string): Record<string, EstadoRegla> => {
    const m: Record<string, EstadoRegla> = {}
    PLANTAS_SP.forEach((p, i) => { m[p.value] = marcas[i] === 'A' ? 'aplica' : 'por_definir' })
    return m
}
const roles = (l: EstadoRegla, s: EstadoRegla, j: EstadoRegla, g: EstadoRegla = 'no_aplica'): Record<RolSP, EstadoRegla> => ({ 'Líder': l, 'Supervisor': s, 'Jefe': j, 'Gerente': g })

// Orden de plantas: FV, MS, MBLES, CEFI, CALIDAD, MOLDES, CEDI, ALMACEN, MANTENIMIENTO, RR MOLDES, SERVICIOS
export const REGLAS_INICIALES: ReglasSP = {
    metaIndividual: 90,
    limiteSuperior: 80,
    limiteInferior: 60,
    calculo: [
        'Cumplimiento = auditorías ejecutadas ÷ auditorías programadas (vencidas) en OPT Sistémica → Agendamiento.',
        'Cada semana vale su porcentaje; un mes o un año es el promedio de sus semanas (como el "PROMEDIO MENSUAL" del Excel ILU).',
        'Meta individual (por herramienta, planta y persona): 90 %.',
        'Cumplimiento colectivo FIRPLAK: límite superior 80 % y límite inferior 60 % (gráficas por mes y de seguimiento).',
        'Frecuencia mínima por semana: Hora-Hora 4 por supervisor (3 en semanas con festivo); OPT 1 por supervisor; OPT Sistémica 1 por jefe o coordinador. Gerente: OPT Sistémica 1 por mes.',
        'Hasta la semana del 24/10/2026 se usa el histórico del Excel ILU CONSOLIDADO; desde la semana siguiente calcula la app.',
        'En el Excel, una planta con 0 % se promediaba igual que las demás: por eso esas casillas quedan "Por definir" hasta que los garantes confirmen si aplica.',
    ],
    herramientas: [
        { codigo: 'TE', nombre: 'Trabajo Estandarizado', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAAAA0AA') },
        { codigo: 'EE', nombre: 'Entrenamiento Estandarizado', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAAAA0AA') },
        { codigo: 'AF', nombre: 'Hora-Hora / AF', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAA000000'), frecuencia: { 'Supervisor': { semana: 4, festivo: 3 } } },
        { codigo: 'BIT', nombre: 'Bitácora', fuente: 'App · Agendamiento OPT Sistémica', nota: 'En el Excel todas las plantas estaban en 0 %.', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('00000000000') },
        { codigo: 'GI', nombre: 'Gestión de Indicadores', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAA00AA0') },
        { codigo: '5S', nombre: "5'S", fuente: 'Sin medición (solo plan de formación)', nota: 'Aparece en el plan de formación de supervisores y jefes, pero no en sus hojas de cumplimiento.', roles: roles('no_aplica', 'formacion', 'formacion'), plantas: plantas('NNNNNNNNNNN') },
        { codigo: 'RRC', nombre: 'Respuesta Rápida Calidad (RRC)', fuente: FUENTE_RRC, nota: 'Plantas según la asistencia RRC del Excel; Mantenimiento no aparece.', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('AAA0A00A0A0') },
        { codigo: 'OPT', nombre: 'OPT', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('0AAAA000000'), frecuencia: { 'Supervisor': { semana: 1, festivo: 1 } } },
        { codigo: 'OPTS', nombre: 'OPT Sistémica', fuente: 'Solo histórico Excel ILU', roles: roles('no_aplica', 'no_aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAA00AA0'), frecuencia: { 'Jefe': { semana: 1, festivo: 1 }, 'Gerente': { semana: 1, periodo: 'mes' } } },
        { codigo: 'MA', nombre: 'Mantenimiento Autónomo', fuente: 'App · Agendamiento OPT Sistémica', nota: 'Existe en la app, pero no en el Excel ILU: sin regla definida.', roles: roles('por_definir', 'por_definir', 'por_definir'), plantas: plantas('NNNNNNNNNNN') },
        { codigo: 'BE', nombre: 'Bajas Estadísticas', fuente: 'App · Agendamiento OPT Sistémica', nota: 'Existe en la app, pero no en el Excel ILU: sin regla definida.', roles: roles('por_definir', 'por_definir', 'por_definir'), plantas: plantas('NNNNNNNNNNN') },
    ],
    // Nombres completos de la base de personal (Talento Humano). Juan David Montoya y Edisson Hernandez
    // no están activos en la base: quedan con su nombre del Excel y se marcan en pantalla.
    personas: {
        'Líder': [
            'Jhonny Rafael Ortiz Tovar',
            'Henry Jose Estevez del Prado',
            'Juan Camilo Vélez Serna',
            'Lina Osorio',
            'Yurany Andrea Ortiz Torres',
        ],
        'Supervisor': [
            'Juan David Ramirez Echeverri',
            'Osnar Mejias Torrealba',
            'Dimer Gonzalo Vergara Delgado',
            'Pedro Alejandro Vegas Sanchez',
            'Juan David Montoya',
            'Edisson Hernandez',
            'Alejandro Gonzalez Cano',
            'Santiago Londoño Agudelo',
            'Arley Guillermo Taborda Torres',
            'Maria Isabel Escobar Laurens',
            'Jair Alejandro Alvarez Davila',
            'Brian Stiven Sánchez Hernández',
            'Jose Manuel Zambrano Serna',
            'Erica Isabel Marulanda Becerra',
        ],
        'Jefe': [
            'Ederson Estiven Londoño Alvarez',
            'Hector José Chinchilla Trigos',
            'Roberto Elías Aguilar Sierra',
            'Jakeline Chaverra Soto',
            'Juliana Ramirez Valencia',
            'Carlos Jose Mier Rodríguez',
            'Sara María Aguilar Sierra',
        ],
        // Gerentes: frecuencias propias (mensuales)
        'Gerente': [
            'Ismael Correa Restrepo',
        ],
    },
    // Planta de cada persona (Talento Humano cuando coincidió; Manufactura, Ingeniería e I+D+I = transversal)
    plantaPersona: {
        'Ederson Estiven Londoño Alvarez': TRANSVERSAL,
        'Jhonny Rafael Ortiz Tovar': 'MS',
        'Henry Jose Estevez del Prado': 'MS',
        'Juan Camilo Vélez Serna': 'CALIDAD',
        'Lina Osorio': 'RR MOLDES',
        'Yurany Andrea Ortiz Torres': 'MOLDES',
        'Juan David Ramirez Echeverri': 'FV',
        'Osnar Mejias Torrealba': 'MS',
        'Dimer Gonzalo Vergara Delgado': 'MS',
        'Pedro Alejandro Vegas Sanchez': 'MS',
        'Alejandro Gonzalez Cano': 'MBLES',
        'Santiago Londoño Agudelo': 'ALMACEN',
        'Arley Guillermo Taborda Torres': 'CEDI',
        'Maria Isabel Escobar Laurens': 'CALIDAD',
        'Jair Alejandro Alvarez Davila': 'CALIDAD',
        'Brian Stiven Sánchez Hernández': TRANSVERSAL,
        'Jose Manuel Zambrano Serna': TRANSVERSAL,
        'Erica Isabel Marulanda Becerra': 'SERVICIOS',
        'Hector José Chinchilla Trigos': TRANSVERSAL,
        'Roberto Elías Aguilar Sierra': 'MANTENIMIENTO',
        'Jakeline Chaverra Soto': TRANSVERSAL,
        'Juliana Ramirez Valencia': TRANSVERSAL,
        'Carlos Jose Mier Rodríguez': 'ALMACEN',
        'Sara María Aguilar Sierra': TRANSVERSAL,
        'Ismael Correa Restrepo': TRANSVERSAL,
    },
}

// Nombre corto del Excel → nombre completo de la base de personal (para reglas guardadas antes del cambio)
export const RENOMBRES_PERSONAS: Record<string, string> = {
    // Carolina Escobar en la app es Estiven Londoño (cambio de puesto sin cambio de correo)
    'Carolina Escobar': 'Ederson Estiven Londoño Alvarez',
    'Jhony Ortiz': 'Jhonny Rafael Ortiz Tovar',
    'Henrry Estevez': 'Henry Jose Estevez del Prado',
    'Camilo Velez': 'Juan Camilo Vélez Serna',
    'Yurany Ortiz': 'Yurany Andrea Ortiz Torres',
    'Juan David Ramirez': 'Juan David Ramirez Echeverri',
    'Osnar Mejia': 'Osnar Mejias Torrealba',
    'Dimer Vergara': 'Dimer Gonzalo Vergara Delgado',
    'Alejandro Vega': 'Pedro Alejandro Vegas Sanchez',
    'Alejandro Gonzalez': 'Alejandro Gonzalez Cano',
    'Santiago Londoño': 'Santiago Londoño Agudelo',
    'Arley Taborda': 'Arley Guillermo Taborda Torres',
    'Maria Escobar': 'Maria Isabel Escobar Laurens',
    'Jair Alvarez': 'Jair Alejandro Alvarez Davila',
    'Brian': 'Brian Stiven Sánchez Hernández',
    'Jose Zambrano': 'Jose Manuel Zambrano Serna',
    'Erika Marulanda': 'Erica Isabel Marulanda Becerra',
    'Hector Chinchilla': 'Hector José Chinchilla Trigos',
    'Roberto Aguilar': 'Roberto Elías Aguilar Sierra',
    'Jakeline Chaverra': 'Jakeline Chaverra Soto',
    'Juliana Ramirez': 'Juliana Ramirez Valencia',
    'Carlos Mier': 'Carlos Jose Mier Rodríguez',
    'Sara Aguilar': 'Sara María Aguilar Sierra',
}

// Reglas guardadas antes de que existiera un campo: se completan con los valores iniciales (por código de herramienta)
export function completarReglas(r: ReglasSP): ReglasSP {
    const ini = new Map(REGLAS_INICIALES.herramientas.map(h => [h.codigo, h]))
    const calculo = r.calculo.some(t => /Frecuencia/i.test(t)) ? r.calculo
        : [...r.calculo.slice(0, 4), ...REGLAS_INICIALES.calculo.filter(t => /Frecuencia/i.test(t)), ...r.calculo.slice(4)]
    const ren = (n: string) => RENOMBRES_PERSONAS[n] || n
    const personas = Object.fromEntries(Object.entries(r.personas).map(([rol, l]) => [rol, [...new Set((l || []).map(ren))]])) as ReglasSP['personas']
    for (const rol of ROLES_SP) if (!personas[rol]) personas[rol] = [...(REGLAS_INICIALES.personas[rol] || [])]
    const guardadas = Object.fromEntries(Object.entries(r.plantaPersona || {}).map(([n, p]) => [ren(n), p]))
    const plantaPersona = { ...(REGLAS_INICIALES.plantaPersona || {}), ...guardadas }
    const calculoG = calculo.map(t => /Frecuencia mínima por semana/.test(t) && !/Gerente/.test(t) ? `${t.replace(/\.$/, '')}. Gerente: OPT Sistémica 1 por mes.` : t)
    const herramientas = r.herramientas.map(h => {
        const base = ini.get(h.codigo)
        const frecuencia = { ...(h.frecuencia || base?.frecuencia || {}) }
        ROLES_SP.forEach(rol => { if (!(rol in (r.personas || {})) && base?.frecuencia?.[rol] && !frecuencia[rol]) frecuencia[rol] = base.frecuencia[rol] })
        const roles = { ...h.roles } as Record<RolSP, EstadoRegla>
        ROLES_SP.forEach(rol => { if (!roles[rol]) roles[rol] = base?.roles[rol] || 'no_aplica' })
        return { ...h, roles, frecuencia, fuente: FUENTES_AUTO[h.codigo] || (h.codigo === 'RRC' && /Solo histórico/i.test(h.fuente) ? FUENTE_RRC : h.fuente) }
    })
    return { ...r, calculo: calculoG, personas, plantaPersona, herramientas }
}
