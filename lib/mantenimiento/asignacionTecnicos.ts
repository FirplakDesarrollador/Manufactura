// Reglas ÚNICAS para asignar un técnico a una orden de mantenimiento preventivo.
// Las usan el generador automático (5:00 a. m.) y el Planificador, para que los dos asignen igual:
//   1. Ejecutor: MT (técnicos de mantenimiento) con MT, OP (producción) con OP.
//   2. Especialidad: el técnico atiende la planta de la orden (o "Todas").
//   3. Turno: NP (paro) con técnicos NP o PRNP; PR (producción) con PR o PRNP; PRNP / General con todos.
//   4. Disponibilidad: sus horas del día + la orden caben en su capacidad (capacidad × (1 + margen)).
//      Entre los disponibles gana el que tenga menos carga.
//   5. Si nadie tiene disponibilidad (solo MT): técnico de reserva, Roberto Aguilar o María Elena Pérez (el de menos carga).
//      Una orden OP sin nadie disponible queda "Sin asignar" (la reserva es de mantenimiento).

import { normalizarEjecutor } from '@/lib/nomenclaturaPlantas';

export const CAPACIDAD_BASE_HORAS = 7.2;
export const MARGEN_SOBRECARGA_PCT = 10;

/** Técnicos de reserva: reciben lo que nadie más puede atender (se reconocen por nombre) */
export const TECNICOS_RESERVA: string[][] = [['roberto', 'aguilar'], ['maria elena', 'perez']];

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
};

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
  motivo: 'disponible' | 'reserva' | 'sin_tecnico';
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

export function esTecnicoReserva(nombre: string): boolean {
  const n = norm(nombre);
  return TECNICOS_RESERVA.some(partes => partes.every(p => n.includes(p)));
}

export function capacidadEfectiva(t: TecnicoAsignable, margenPct = MARGEN_SOBRECARGA_PCT): number {
  return (Number(t.capacidadHoras) || CAPACIDAD_BASE_HORAS) * (1 + margenPct / 100);
}

const estaActivo = (t: TecnicoAsignable) => t.activo !== false && norm(t.turno) !== 'inactivo' && t.id !== 9999;

/** Técnicos que cumplen ejecutor, especialidad (planta) y turno, sin mirar la carga */
export function tecnicosCompatibles(sol: SolicitudAsignacion, tecnicos: TecnicoAsignable[]): TecnicoAsignable[] {
  const ej = normalizarEjecutor(sol.ejecutor);
  const plantas = sol.plantas.map(p => String(p).toUpperCase());
  // Orden de planta TODAS (p. ej. fugas en toda la empresa): sirve cualquier técnico
  const todasPlantas = plantas.includes('TODAS');
  return tecnicos.filter(t =>
    estaActivo(t)
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
  carga: Record<number, number>,
  margenPct = MARGEN_SOBRECARGA_PCT
): ResultadoAsignacion {
  const cargaDe = (id: number) => carga[id] || 0;
  const porCarga = (a: TecnicoAsignable, b: TecnicoAsignable) => cargaDe(a.id) - cargaDe(b.id) || a.nombre.localeCompare(b.nombre, 'es');

  const disponibles = tecnicosCompatibles(sol, tecnicos)
    .filter(t => cargaDe(t.id) + sol.horas <= capacidadEfectiva(t, margenPct) + 0.0001)
    .sort(porCarga);
  if (disponibles.length) return { id: disponibles[0].id, motivo: 'disponible' };

  if (normalizarEjecutor(sol.ejecutor) === 'MT') {
    const reserva = tecnicos.filter(t => estaActivo(t) && esTecnicoReserva(t.nombre)).sort(porCarga);
    if (reserva.length) return { id: reserva[0].id, motivo: 'reserva' };
  }
  return { id: null, motivo: 'sin_tecnico' };
}
