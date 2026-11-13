// Reparación de Moldes (RMOLD): cierre diario del Informe de Turno e indicadores del Tablero de Control.
// Reemplaza el Excel "Productividad Moldes" con sus mismas fórmulas:
//  - Moldes reparados (equivalentes) = MS + FV + RTM + Desmanchados ÷ 3 + Brillados ÷ 2
//  - Productividad = Total ÷ Meta (capacidad)
//  - Piezas por persona = Total ÷ Personas; meta por persona = Meta ÷ 7; productividad por persona = real ÷ meta
//  - Nivel de servicio = Entregados ÷ Esperados (histórico de mayo a octubre 2026: valor digitado)
//  - Paros reflejados (min) = (Meta − Total) × 24, nunca negativos (sobre la meta = 0)
// Tablas: rmold_registros, rmold_paros y rmold_meta_personas (informe_turno_rmold.sql).
import type { SupabaseClient } from '@supabase/supabase-js';

export const META_NS = 95; // %
export const META_PRODUCTIVIDAD = 98; // % (fila META de la tabla de promedios del Excel)
export const PERSONAS_META_BASE = 7; // la meta por persona del Excel es Meta ÷ 7
export const MINUTOS_POR_MOLDE = 24;
export const TIEMPO_OPERACION_MIN = 522; // 552 − 30 min (histórico del Excel)
// Turnos por defecto del cierre (se pueden cambiar en el formulario):
//  - Lunes a viernes: 6:00 a 15:12 (552 min) − 20 de 5 min y cierre de turno − 20 alimentación 1 − 28 alimentación 2 = 484 min
//  - Sábado: 6:00 a 13:20 (440 min) − 20 de 5 min y cierre de turno − 20 alimentación 1 = 400 min
export const TURNO_RMOLD = { horaInicio: '06:00', horaFin: '15:12', inicioFinTurno: 20, alimentacion1: 20, alimentacion2: 28 };
export const TURNO_RMOLD_SABADO = { horaInicio: '06:00', horaFin: '13:20', inicioFinTurno: 20, alimentacion1: 20, alimentacion2: 0 };
export const turnoRmoldPara = (fecha: string) => (new Date(`${fecha}T12:00:00`).getDay() === 6 ? TURNO_RMOLD_SABADO : TURNO_RMOLD);
export const PERSONAS_PROGRAMADAS_RMOLD = 6;
export const META_RMOLD_DEFECTO = 24;
// Minutos entre dos horas HH:MM (si la de fin es menor, cruza la medianoche)
export function minutosEntre(inicio: string, fin: string): number | null {
    const a = /^(\d{1,2}):(\d{2})/.exec(inicio || ''), b = /^(\d{1,2}):(\d{2})/.exec(fin || '');
    if (!a || !b) return null;
    const m = (+b[1] * 60 + +b[2]) - (+a[1] * 60 + +a[2]);
    return m < 0 ? m + 1440 : m;
}

export const FAMILIAS_PARO = ['EXPLOTACIÓN (OPERARIO/PRODUCCIÓN)', 'INDUCIDO (NO DEPENDE DEL EQUIPO)', 'AVERÍA', 'SIN CLASIFICAR'] as const;
export const NOMBRE_FAMILIA: Record<string, string> = {
    'EXPLOTACIÓN (OPERARIO/PRODUCCIÓN)': 'Explotación',
    'INDUCIDO (NO DEPENDE DEL EQUIPO)': 'Inducido',
    'AVERÍA': 'Avería',
    'SIN CLASIFICAR': 'Sin clasificar'
};
export const COLOR_FAMILIA: Record<string, string> = {
    'EXPLOTACIÓN (OPERARIO/PRODUCCIÓN)': '#e06634',
    'INDUCIDO (NO DEPENDE DEL EQUIPO)': '#0284c7',
    'AVERÍA': '#14b8a6',
    'SIN CLASIFICAR': '#94a3b8'
};
// Causas más usadas en la hoja PAROS (el formulario las sugiere; se puede escribir otra)
export const CAUSAS_PARO_BASE = [
    'AUSENTISMOS', 'REPROCESO MAYOR', 'SIN MOLDES', 'BAJO FLUJO POR FALTA DE MOLDES', 'ENTRENAMIENTO', 'PRESTAMO DE PERSONAL',
    'RENUNCIA', 'LIMPIEZA DE MOLDES', 'BAJA DESTREZA', 'OPERARIO EN ENTRENAMIENTO', 'NO CALIDAD', 'PROBLEMAS DE TRANSPORTE',
    'AVERÍA', 'REUNION PROGRAMADA', 'VACACIONES'
];

export interface RegistroRmold {
    id?: number;
    fecha: string; // YYYY-MM-DD
    moldes_ms: number;
    moldes_fv: number;
    moldes_rtm: number;
    moldes_brillados: number;
    moldes_desmanchados: number;
    contramoldes_reparados?: number | null; // C.M. reparados: no suman al total, solo estadística
    // Tiempo laborado del turno (tiempo_operacion_min = disponible) y ausentismo (personas = presentes)
    hora_inicio?: string | null;
    hora_fin?: string | null;
    min_inicio_fin_turno?: number | null;
    min_alimentacion_1?: number | null;
    min_alimentacion_2?: number | null;
    ausentes?: number | null;
    moldes_esperados: number | null;
    moldes_entregados: number | null;
    nivel_servicio: number | null; // fracción, solo histórico digitado
    personas: number;
    meta: number;
    tiempo_operacion_min: number;
    observaciones?: string | null;
    origen?: 'formulario' | 'excel';
    creado_por?: string | null;
    actualizado_por?: string | null;
    updated_at?: string;
}

export interface ParoRmold {
    id?: number;
    fecha: string;
    familia: string;
    causa: string;
    minutos: number;
    observacion: string | null;
    tipo: 'REFLEJADO' | 'REAL';
    origen?: 'formulario' | 'excel';
}

export interface MetaPersonas { personas: number; meta: number }

// Indicadores de un día (mismas fórmulas del Excel)
export interface CalculoDia {
    total: number;
    productividad: number | null; // %
    pzsPersona: number | null;
    metaPzsPersona: number;
    productividadPersona: number | null; // %
    ns: number | null; // %
    parosReflejados: number; // min; 0 si produjo la meta o más (no hay paros negativos)
}

export function calcularDia(r: Pick<RegistroRmold, 'moldes_ms' | 'moldes_fv' | 'moldes_rtm' | 'moldes_brillados' | 'moldes_desmanchados' | 'moldes_esperados' | 'moldes_entregados' | 'nivel_servicio' | 'personas' | 'meta'>): CalculoDia {
    const total = (r.moldes_ms || 0) + (r.moldes_fv || 0) + (r.moldes_rtm || 0) + (r.moldes_desmanchados || 0) / 3 + (r.moldes_brillados || 0) / 2;
    const meta = r.meta || 0;
    const pzsPersona = r.personas > 0 ? total / r.personas : null;
    const metaPzsPersona = meta / PERSONAS_META_BASE;
    const ns = r.moldes_esperados != null && r.moldes_esperados > 0 && r.moldes_entregados != null
        ? (r.moldes_entregados / r.moldes_esperados) * 100
        : r.nivel_servicio != null ? r.nivel_servicio * 100 : null;
    return {
        total,
        productividad: meta > 0 ? (total / meta) * 100 : null,
        pzsPersona,
        metaPzsPersona,
        productividadPersona: pzsPersona != null && metaPzsPersona > 0 ? (pzsPersona / metaPzsPersona) * 100 : null,
        ns,
        // Sobre la meta no hay paro: el Excel daba negativos, que restaban minutos a los otros días
        parosReflejados: Math.max(0, (meta - total) * MINUTOS_POR_MOLDE)
    };
}

// Meta propuesta para un número de personas: la de la tabla, o la del número más cercano por debajo
export function metaParaPersonas(tabla: MetaPersonas[], personas: number): number | null {
    if (!tabla.length || !(personas > 0)) return null;
    const p = Math.round(personas);
    const exacta = tabla.find(t => t.personas === p);
    if (exacta) return exacta.meta;
    const menores = tabla.filter(t => t.personas <= p).sort((a, b) => b.personas - a.personas);
    return (menores[0] || [...tabla].sort((a, b) => a.personas - b.personas)[0]).meta;
}

const aNumero = (v: any) => (v == null ? null : Number(v));
const normalizarRegistro = (r: any): RegistroRmold => ({
    ...r,
    moldes_ms: Number(r.moldes_ms) || 0,
    moldes_fv: Number(r.moldes_fv) || 0,
    moldes_rtm: Number(r.moldes_rtm) || 0,
    moldes_brillados: Number(r.moldes_brillados) || 0,
    moldes_desmanchados: Number(r.moldes_desmanchados) || 0,
    contramoldes_reparados: aNumero(r.contramoldes_reparados),
    hora_inicio: r.hora_inicio ? String(r.hora_inicio).slice(0, 5) : null,
    hora_fin: r.hora_fin ? String(r.hora_fin).slice(0, 5) : null,
    min_inicio_fin_turno: aNumero(r.min_inicio_fin_turno),
    min_alimentacion_1: aNumero(r.min_alimentacion_1),
    min_alimentacion_2: aNumero(r.min_alimentacion_2),
    ausentes: aNumero(r.ausentes),
    moldes_esperados: aNumero(r.moldes_esperados),
    moldes_entregados: aNumero(r.moldes_entregados),
    nivel_servicio: aNumero(r.nivel_servicio),
    personas: Number(r.personas) || 0,
    meta: Number(r.meta) || 0,
    tiempo_operacion_min: Number(r.tiempo_operacion_min) || TIEMPO_OPERACION_MIN
});

// Lee todas las filas de una tabla en páginas de 1000 (límite de Supabase por consulta)
async function leerTodo(sb: SupabaseClient, tabla: string, orden: string) {
    const filas: any[] = [];
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await sb.from(tabla).select('*').order(orden).range(desde, desde + 999);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < 1000) return filas;
    }
}

const mensajeTablas = (e: any) => (/contramoldes|hora_inicio|hora_fin|min_inicio_fin_turno|min_alimentacion|ausentes/i.test(`${e?.message}`)
    ? 'Faltan columnas nuevas del cierre (contramoldes, tiempo del turno, ausentismo): ejecute rmold_cierre_campos.sql en Supabase.'
    : /does not exist|schema cache|42P01|PGRST205/i.test(`${e?.message} ${e?.code}`)
    ? 'Faltan las tablas de RMOLD en la base: ejecute informe_turno_rmold.sql en Supabase.'
    : e?.message || 'No se pudieron leer los datos de RMOLD');

export async function cargarRmold(sb: SupabaseClient): Promise<{ registros: RegistroRmold[]; paros: ParoRmold[]; metas: MetaPersonas[] }> {
    // Sin sesión la base no entrega filas (RLS) y el tablero parecería vacío
    const { data: sesion } = await sb.auth.getSession();
    if (!sesion?.session) throw new Error('La sesión expiró: vuelva a iniciar sesión para ver los datos de RMOLD.');
    try {
        const [registros, paros, metas] = await Promise.all([
            leerTodo(sb, 'rmold_registros', 'fecha'),
            leerTodo(sb, 'rmold_paros', 'fecha'),
            leerTodo(sb, 'rmold_meta_personas', 'personas')
        ]);
        return {
            registros: registros.map(normalizarRegistro),
            paros: paros.map(p => ({ ...p, minutos: Number(p.minutos) || 0 })),
            metas: metas.map(m => ({ personas: Number(m.personas), meta: Number(m.meta) }))
        };
    } catch (e) {
        throw new Error(mensajeTablas(e));
    }
}

// Guarda el cierre de un día (uno por fecha: si ya existe se actualiza) y reemplaza sus paros
export async function guardarCierreRmold(sb: SupabaseClient, registro: RegistroRmold, paros: ParoRmold[], usuario: string) {
    const { id, updated_at, origen, creado_por, ...datos } = registro;
    const fila: Record<string, any> = { ...datos, actualizado_por: usuario, updated_at: new Date().toISOString() };
    // Campos nuevos sin dato no se envían (así un cierre sin ellos se guarda aunque la base aún no tenga las columnas)
    for (const k of ['contramoldes_reparados', 'hora_inicio', 'hora_fin', 'min_inicio_fin_turno', 'min_alimentacion_1', 'min_alimentacion_2', 'ausentes']) if (fila[k] == null) delete fila[k];
    const { error } = id
        ? await sb.from('rmold_registros').update(fila).eq('id', id)
        : await sb.from('rmold_registros').upsert({ ...fila, origen: 'formulario', creado_por: usuario }, { onConflict: 'fecha' });
    if (error) throw new Error(mensajeTablas(error));
    const { error: errBorrar } = await sb.from('rmold_paros').delete().eq('fecha', registro.fecha);
    if (errBorrar) throw new Error(mensajeTablas(errBorrar));
    if (paros.length) {
        const { error: errParos } = await sb.from('rmold_paros').insert(
            paros.map(({ id: _id, origen: _o, ...p }) => ({ ...p, fecha: registro.fecha, origen: 'formulario', creado_por: usuario }))
        );
        if (errParos) throw new Error(mensajeTablas(errParos));
    }
}

export async function guardarMetasPersonas(sb: SupabaseClient, metas: MetaPersonas[]) {
    const { error: errBorrar } = await sb.from('rmold_meta_personas').delete().gt('personas', 0);
    if (errBorrar) throw new Error(mensajeTablas(errBorrar));
    if (!metas.length) return;
    const { error } = await sb.from('rmold_meta_personas').insert(metas);
    if (error) throw new Error(mensajeTablas(error));
}
