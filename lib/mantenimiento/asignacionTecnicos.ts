// Reglas ÚNICAS para asignar un técnico a una orden de mantenimiento preventivo.
// Las usan el generador automático (5:00 a. m.) y el Planificador, para que los dos asignen igual:
//   1. Ejecutor: MT (técnicos de mantenimiento) con MT, OP (producción) con OP.
//   2. Especialidad: el técnico atiende la planta de la orden (o "Todas").
//   3. Turno: NP (paro) con técnicos NP o PRNP; PR (producción) con PR o PRNP; PRNP / General con todos.
//   4. Disponibilidad: sus horas del día + la orden caben en su capacidad (capacidad × (1 + margen)), y además
//      en la PARTE DEL TURNO que le corresponde: una tarea NP solo cabe en la parte del turno sin producción y una
//      PR en la parte con producción (pct_produccion del técnico, de la tabla de Turnos). Ej.: 93 % PR · 7 % NP con
//      7,2 h → 0,5 h para NP. Entre los disponibles gana el que tenga menos carga.
//   5. Personas SIN HORARIO (no son técnicos): Roberto Aguilar (jefe de mantenimiento) y María Elena Pérez
//      (coordinadora). Solo reciben órdenes de las plantas que tienen marcadas en la botonera de Especialidad
//      (hoy MTTO y EX = externos / proveedores), sin mirar turno ni capacidad, y solo si ningún técnico la tomó.
//   6. Si nadie tiene tiempo (MT u OP), la orden IGUAL se genera y queda en "Pendientes por Asignar" (sin técnico).
//      Nunca se deja de generar un mantenimiento.
//   Prioridad (la aplica quien llama): primero las órdenes de menor frecuencia (diarias, cada 2, cada 3 días…), luego
//   las semanales y así hacia arriba; ver ordenPrioridad.

import { normalizarEjecutor } from '@/lib/nomenclaturaPlantas';

export const CAPACIDAD_BASE_HORAS = 7.2;
export const MARGEN_SOBRECARGA_PCT = 10;

/** Personas sin horario (jefe y coordinadora de mantenimiento): solo sus plantas de la botonera, después de los técnicos */
export const SIN_HORARIO: string[][] = [['roberto', 'aguilar'], ['maria elena', 'perez']];

export type TecnicoAsignable = {
  id: number;
  nombre: string;
  ejecutor?: string | null;
  /** códigos de planta que atiende (MS, CEFI, …) o TODAS */
  plantas: string[];
  /** modalidad: PR, NP, PRNP, General, INACTIVO */
  turno?: string | null;
  capacidadHoras?: number | null;
  activo?: boolean;
  /** % del turno de hoy en producción (0 a 1); sin dato se deduce del turno: PR 1, NP 0, mixto 0,5 */
  pctProduccion?: number | null;
};

/** Horas ya asignadas a un técnico en el día: total y cuánto es de tareas NP y de tareas PR */
export type CargaTecnico = { total: number; np: number; pr: number };
export type CargaPorTecnico = Record<number, CargaTecnico>;

const tipoTurno = (turno?: string | null): 'np' | 'pr' | 'mixto' => {
  const t = String(turno ?? '').toLowerCase();
  if (t.includes('prnp') || t.includes('nppr') || t.includes('general') || !t) return 'mixto';
  if (t === 'pr' || t.includes('produccion')) return 'pr';
  if (t === 'np' || t.includes('paro')) return 'np';
  return 'mixto';
};

/** Suma una tarea a la carga del técnico (en su total y en la parte NP o PR según el turno del plan) */
export function sumarCarga(carga: CargaPorTecnico, id: number, horas: number, turnoPlan?: string | null) {
  const c = carga[id] || (carga[id] = { total: 0, np: 0, pr: 0 });
  c.total += horas;
  const tipo = tipoTurno(turnoPlan);
  if (tipo === 'np') c.np += horas;
  if (tipo === 'pr') c.pr += horas;
}

/** % del turno en producción del técnico (el guardado o, sin dato, el de su modalidad) */
export function pctProduccionDe(t: TecnicoAsignable): number {
  const p = Number(t.pctProduccion);
  if (t.pctProduccion != null && !isNaN(p)) return Math.min(1, Math.max(0, p));
  const tipo = tipoTurno(t.turno);
  return tipo === 'pr' ? 1 : tipo === 'np' ? 0 : 0.5;
}

export type SolicitudAsignacion = {
  ejecutor?: string | null;
  /** plantas de la orden (códigos) */
  plantas: string[];
  /** turno requerido del plan: PR, NP, PRNP */
  turno?: string | null;
  horas: number;
};

export type ResultadoAsignacion = {
  id: number | null;
  motivo: 'disponible' | 'sin_horario' | 'sin_tecnico';
};

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export function turnosCompatibles(turnoPlan?: string | null, turnoTecnico?: string | null): boolean {
  if (!turnoPlan || !turnoTecnico) return true;
  const tPlan = norm(turnoPlan);
  const tTec = norm(turnoTecnico);
  if (tPlan.includes('prnp') || tTec.includes('prnp') || tTec.includes('general')) return true;
  if (tPlan === 'pr' || tPlan.includes('produccion')) return tTec === 'pr' || tTec.includes('produccion');
  if (tPlan === 'np' || tPlan.includes('paro')) return tTec === 'np' || tTec.includes('paro');
  return true;
}

export function esSinHorario(nombre: string): boolean {
  const n = norm(nombre);
  return SIN_HORARIO.some(partes => partes.every(p => n.includes(p)));
}

export function capacidadEfectiva(t: TecnicoAsignable, margenPct = MARGEN_SOBRECARGA_PCT): number {
  return (Number(t.capacidadHoras) || CAPACIDAD_BASE_HORAS) * (1 + margenPct / 100);
}

const estaActivo = (t: TecnicoAsignable) => t.activo !== false && norm(t.turno) !== 'inactivo' && t.id !== 9999;

/** Orden de prioridad para asignar: menor frecuencia primero (diarias antes que semanales…); empate, el orden original */
export function ordenPrioridad(frecuenciaA: unknown, frecuenciaB: unknown): number {
  const f = (v: unknown) => { const n = Number(v); return n > 0 ? n : 9999; };
  return f(frecuenciaA) - f(frecuenciaB);
}

/** Técnicos que cumplen ejecutor, especialidad (planta) y turno, sin mirar la carga (las personas sin horario no entran aquí) */
export function tecnicosCompatibles(sol: SolicitudAsignacion, tecnicos: TecnicoAsignable[]): TecnicoAsignable[] {
  const ej = normalizarEjecutor(sol.ejecutor);
  const plantas = sol.plantas.map(p => String(p).toUpperCase());
  // Orden de planta TODAS (p. ej. fugas en toda la empresa): sirve cualquier técnico
  const todasPlantas = plantas.includes('TODAS');
  return tecnicos.filter(t =>
    estaActivo(t)
    && !esSinHorario(t.nombre)
    && normalizarEjecutor(t.ejecutor) === ej
    && (todasPlantas || t.plantas.some(tp => { const c = String(tp).toUpperCase(); return c === 'TODAS' || plantas.includes(c); }))
    && turnosCompatibles(sol.turno, t.turno)
  );
}

/**
 * Elige el técnico para una orden. `carga` = horas ya asignadas a cada técnico ese día (se debe sumar
 * la orden elegida a la carga antes de asignar la siguiente).
 */
export function elegirTecnico(
  sol: SolicitudAsignacion,
  tecnicos: TecnicoAsignable[],
  carga: CargaPorTecnico,
  margenPct = MARGEN_SOBRECARGA_PCT
): ResultadoAsignacion {
  const vacio: CargaTecnico = { total: 0, np: 0, pr: 0 };
  const cargaDe = (id: number) => carga[id] || vacio;
  const porCarga = (a: TecnicoAsignable, b: TecnicoAsignable) => cargaDe(a.id).total - cargaDe(b.id).total || a.nombre.localeCompare(b.nombre, 'es');
  const tipo = tipoTurno(sol.turno);
  const cabe = (t: TecnicoAsignable) => {
    const cap = capacidadEfectiva(t, margenPct);
    const c = cargaDe(t.id);
    if (c.total + sol.horas > cap + 0.0001) return false;
    // La parte del turno que le toca a la tarea: NP en lo que no es producción, PR en lo que sí
    const p = pctProduccionDe(t);
    if (tipo === 'np') return c.np + sol.horas <= cap * (1 - p) + 0.0001;
    if (tipo === 'pr') return c.pr + sol.horas <= cap * p + 0.0001;
    return true;
  };

  const disponibles = tecnicosCompatibles(sol, tecnicos).filter(cabe).sort(porCarga);
  if (disponibles.length) return { id: disponibles[0].id, motivo: 'disponible' };

  // Sin horario (jefe / coordinadora): solo plantas marcadas expresamente en su botonera (MTTO, EX…); sin turno ni capacidad
  const ej = normalizarEjecutor(sol.ejecutor);
  const plantas = sol.plantas.map(p => String(p).toUpperCase());
  const sinHorario = tecnicos.filter(t =>
    t.activo !== false && t.id !== 9999 && esSinHorario(t.nombre)
    && normalizarEjecutor(t.ejecutor) === ej
    && t.plantas.some(tp => plantas.includes(String(tp).toUpperCase()))
  ).sort(porCarga);
  if (sinHorario.length) return { id: sinHorario[0].id, motivo: 'sin_horario' };

  // Nadie con tiempo: la orden se genera igual y queda en Pendientes por Asignar
  return { id: null, motivo: 'sin_tecnico' };
}
