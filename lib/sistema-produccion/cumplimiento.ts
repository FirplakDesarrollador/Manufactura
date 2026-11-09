// Cumplimiento del Sistema de Producción: auditorías OPT Sistémica ejecutadas ÷ programadas.
// Hasta la última semana del Excel "ILU CONSOLIDADO" se usa su histórico (sp_cumplimiento_historico);
// después, el agendamiento (opt_planificacion) y los registros (opt_registros) de la aplicación.

export const META_SP = 90;

// Plantas / áreas del Sistema de Producción (mismas del Excel). La sigla es lo que se guarda.
export const PLANTAS_SP: { value: string; label: string }[] = [
  { value: 'FV', label: 'Fibra de Vidrio' },
  { value: 'MS', label: 'Mármol Sintético' },
  { value: 'MBLES', label: 'Muebles' },
  { value: 'CEFI', label: 'CEFI' },
  { value: 'CALIDAD', label: 'Calidad' },
  { value: 'MOLDES', label: 'Moldes' },
  { value: 'CEDI', label: 'CEDI' },
  { value: 'ALMACEN', label: 'Almacén' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'RR MOLDES', label: 'RR Moldes' },
  { value: 'SERVICIOS', label: 'Servicios' }
];

// Herramientas: código guardado → nombre. OPTS y RRC solo vienen del histórico del Excel por ahora.
export const HERRAMIENTAS_SP: Record<string, string> = {
  TE: 'Trabajo Estandarizado',
  EE: 'Entrenamiento Estandarizado',
  AF: 'Hora-Hora / AF',
  BIT: 'Bitácora',
  GI: 'Gestión de Indicadores',
  OPT: 'OPT',
  OPTS: 'OPT Sistémica',
  RRC: 'RRC',
  '5S': "5'S",
  MA: 'Mantenimiento Autónomo',
  BE: 'Bajas Estadísticas'
};

export const nombreHerramienta = (c: string) => HERRAMIENTAS_SP[c] || c;
export const nombrePlanta = (c: string) => PLANTAS_SP.find(p => p.value === c)?.label || c;

export const colorSemaforo = (v: number | null | undefined, meta = META_SP) =>
  v === null || v === undefined ? '#cbd5e1' : v >= meta ? '#59a96a' : v >= meta - 10 ? '#deb841' : '#d14747';

export interface PlanSP {
  id?: string;
  fecha_programada: string | null;
  responsable_email: string | null;
  modulo_tipo: string | null;
  estado: string | null;
  planta: string | null;
}
export interface RegistroSP {
  created_at: string;
  user_email: string | null;
  modulo_tipo: string | null;
}
export interface HistoricoSP {
  fecha: string;
  nivel: 'firplak' | 'planta' | 'persona';
  planta: string | null;
  persona: string | null;
  rol: string | null;
  herramienta: string | null;
  cumplimiento: number;
}

// Fecha local AAAA-MM-DD
export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Semana ISO (lunes a domingo) y el viernes de esa semana, que es la fecha que usaba el Excel
export function semanaDe(fecha: string) {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dia = t.getUTCDay() || 7;
  const jueves = new Date(t); jueves.setUTCDate(t.getUTCDate() + 4 - dia);
  const anio = jueves.getUTCFullYear();
  const semana = Math.ceil(((jueves.getTime() - Date.UTC(anio, 0, 1)) / 86400000 + 1) / 7);
  const viernes = new Date(t); viernes.setUTCDate(t.getUTCDate() + 5 - dia);
  return { clave: `${anio}-S${String(semana).padStart(2, '0')}`, anio, semana, viernes: viernes.toISOString().slice(0, 10) };
}

const norm = (s: string | null | undefined) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Una programación cuenta como ejecutada si quedó EJECUTADA o si hay un registro del mismo
// módulo hecho por el mismo responsable dentro de ±3 días. Cada registro se usa una sola vez.
export function marcarEjecutadas(planes: PlanSP[], registros: RegistroSP[]) {
  const usados = new Set<number>();
  const regs = registros.map((r, i) => ({ i, tipo: norm(r.modulo_tipo), user: norm(r.user_email), t: new Date(r.created_at).getTime() }));
  return planes.map(p => {
    if ((p.estado || '').toUpperCase() === 'EJECUTADA') return { ...p, ejecutada: true };
    if (!p.fecha_programada) return { ...p, ejecutada: false };
    const tp = new Date(`${p.fecha_programada}T12:00:00`).getTime();
    const tipo = norm(p.modulo_tipo);
    const resp = norm(p.responsable_email);
    const r = regs.find(x => !usados.has(x.i) && x.tipo === tipo && x.user === resp && Math.abs(x.t - tp) <= 3.1 * 86400000);
    if (r) { usados.add(r.i); return { ...p, ejecutada: true }; }
    return { ...p, ejecutada: false };
  });
}

export type PlanEvaluado = PlanSP & { ejecutada: boolean };

// Programaciones que ya se debían hacer: las de días pasados, y las de hoy solo si ya se hicieron
export const planVencido = (p: PlanEvaluado, hoy: string) =>
  !!p.fecha_programada && (p.fecha_programada < hoy || (p.fecha_programada === hoy && p.ejecutada));

export const promedio = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
