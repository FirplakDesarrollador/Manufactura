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

export const ROLES_SP = ['Líder', 'Supervisor', 'Jefe'] as const
export type RolSP = typeof ROLES_SP[number]

export type HerramientaRegla = {
    codigo: string; nombre: string
    fuente: string          // de dónde sale el dato hoy
    nota?: string
    roles: Record<RolSP, EstadoRegla>
    plantas: Record<string, EstadoRegla>
}
export type ReglasSP = {
    metaIndividual: number           // herramienta, planta y persona
    limiteSuperior: number           // colectivo FIRPLAK
    limiteInferior: number
    calculo: string[]                // cómo se calcula (texto)
    herramientas: HerramientaRegla[]
    personas: Record<RolSP, string[]>
}

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
const roles = (l: EstadoRegla, s: EstadoRegla, j: EstadoRegla): Record<RolSP, EstadoRegla> => ({ 'Líder': l, 'Supervisor': s, 'Jefe': j })

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
        'Hasta la semana del 24/10/2026 se usa el histórico del Excel ILU CONSOLIDADO; desde la semana siguiente calcula la app.',
        'En el Excel, una planta con 0 % se promediaba igual que las demás: por eso esas casillas quedan "Por definir" hasta que los garantes confirmen si aplica.',
    ],
    herramientas: [
        { codigo: 'TE', nombre: 'Trabajo Estandarizado', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAAAA0AA') },
        { codigo: 'EE', nombre: 'Entrenamiento Estandarizado', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAAAA0AA') },
        { codigo: 'AF', nombre: 'Hora-Hora / AF', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('AAAAA000000') },
        { codigo: 'BIT', nombre: 'Bitácora', fuente: 'App · Agendamiento OPT Sistémica', nota: 'En el Excel todas las plantas estaban en 0 %.', roles: roles('aplica', 'aplica', 'aplica'), plantas: plantas('00000000000') },
        { codigo: 'GI', nombre: 'Gestión de Indicadores', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('AAAAAA00AA0') },
        { codigo: '5S', nombre: "5'S", fuente: 'Sin medición (solo plan de formación)', nota: 'Aparece en el plan de formación de supervisores y jefes, pero no en sus hojas de cumplimiento.', roles: roles('no_aplica', 'formacion', 'formacion'), plantas: plantas('NNNNNNNNNNN') },
        { codigo: 'RRC', nombre: 'Respuesta Rápida Calidad (RRC)', fuente: 'Solo histórico Excel ILU', nota: 'Plantas según la asistencia RRC del Excel; Mantenimiento no aparece.', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('AAA0A00A0A0') },
        { codigo: 'OPT', nombre: 'OPT', fuente: 'App · Agendamiento OPT Sistémica', roles: roles('no_aplica', 'aplica', 'aplica'), plantas: plantas('0AAAA000000') },
        { codigo: 'OPTS', nombre: 'OPT Sistémica', fuente: 'Solo histórico Excel ILU', roles: roles('no_aplica', 'no_aplica', 'aplica'), plantas: plantas('AAAAAA00AA0') },
        { codigo: 'MA', nombre: 'Mantenimiento Autónomo', fuente: 'App · Agendamiento OPT Sistémica', nota: 'Existe en la app, pero no en el Excel ILU: sin regla definida.', roles: roles('por_definir', 'por_definir', 'por_definir'), plantas: plantas('NNNNNNNNNNN') },
        { codigo: 'BE', nombre: 'Bajas Estadísticas', fuente: 'App · Agendamiento OPT Sistémica', nota: 'Existe en la app, pero no en el Excel ILU: sin regla definida.', roles: roles('por_definir', 'por_definir', 'por_definir'), plantas: plantas('NNNNNNNNNNN') },
    ],
    personas: {
        'Líder': ['Jhony Ortiz', 'Henrry Estevez', 'Camilo Velez', 'Lina Osorio', 'Yurany Ortiz'],
        'Supervisor': ['Juan David Ramirez', 'Osnar Mejia', 'Dimer Vergara', 'Alejandro Vega', 'Juan David Montoya', 'Edisson Hernandez', 'Alejandro Gonzalez',
            'Santiago Londoño', 'Arley Taborda', 'Maria Escobar', 'Jair Alvarez', 'Brian', 'Jose Zambrano', 'Erika Marulanda'],
        'Jefe': ['Carolina Escobar', 'Hector Chinchilla', 'Roberto Aguilar', 'Jakeline Chaverra', 'Juliana Ramirez', 'Carlos Mier', 'Sara Aguilar'],
    },
}
