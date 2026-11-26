'use client';

// Turnos de los técnicos de mantenimiento por semana (domingo a sábado), en dos etapas: semana actual y próxima.
// Se guarda en mant_turnos_semana (una fila por semana y técnico, con el turno de cada día). Ver mant_turnos_semana.sql.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Copy, Eye, EyeOff, Factory, GripVertical, Loader2, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PLANTAS_SP } from '@/lib/sistema-produccion/cumplimiento';
import { MAX_NP, MIN_PR, modalidadDeHoy, type HorarioDia, type Modalidad } from '@/lib/mantenimiento/turnosModalidad';

// Plantas de producción que salen siempre en el horario de plantas (se pueden agregar otras)
const PLANTAS_PROD = ['MS', 'FV', 'MBL', 'CEFI', 'RTM'];
// Horarios más usados (botones rápidos al editar un día)
const HORARIOS_RAPIDOS: { i: string; f: string; nota?: string }[] = [
  { i: '06:00', f: '17:30' }, { i: '06:00', f: '17:12' }, { i: '06:00', f: '15:12' }, { i: '06:00', f: '13:20' },
  { i: '06:00', f: '20:40' }, { i: '06:00', f: '05:52', nota: 'casi 24 h' },
];
// Horario por defecto de cada planta (domingo a sábado) cuando la semana no tiene uno guardado
const NO: HorarioDia = 'NO';
const h = (i: string, f: string): HorarioDia => ({ i, f });
const L_V_S = (lv: HorarioDia, sab: HorarioDia): HorarioDia[] => [NO, lv, lv, lv, lv, lv, sab];
const DEFECTO_PLANTA: Record<string, HorarioDia[]> = {
  MS: L_V_S(h('06:00', '17:30'), h('06:00', '13:20')),
  FV: L_V_S(h('06:00', '17:30'), h('06:00', '13:20')),
  RTM: L_V_S(h('06:00', '17:30'), h('06:00', '13:20')),
  MBL: L_V_S(h('06:00', '20:40'), h('06:00', '20:40')),
  CEFI: L_V_S(h('06:00', '20:40'), h('06:00', '20:40')),
};
const NOMBRE_MOD: Record<Modalidad, string> = { PR: 'PR · Producción', NP: 'NP · No producción', PRNP: 'NPPR · Producción - No producción', INACTIVO: 'Inactivo' };
const CORTO_MOD: Record<Modalidad, string> = { PR: 'PR', NP: 'NP', PRNP: 'NPPR', INACTIVO: 'Inactivo' };
const COLOR_MOD: Record<Modalidad, string> = {
  PR: 'bg-emerald-50 text-emerald-700 border-emerald-200', NP: 'bg-sky-50 text-sky-700 border-sky-200',
  PRNP: 'bg-amber-50 text-amber-700 border-amber-200', INACTIVO: 'bg-slate-100 text-slate-500 border-slate-200',
};

// Turnos del horario de mantenimiento (colores del cuadro que se compartía en Excel)
export const TURNOS_MANT: { codigo: string; horario: string; color: string; texto?: string }[] = [
  { codigo: 'T1', horario: '05:30 – 12:50', color: '#FFC966' },
  { codigo: 'T2', horario: '07:30 – 14:50', color: '#9DDCF5' },
  { codigo: 'T3', horario: '14:50 – 22:10', color: '#FFF200' },
  { codigo: 'T4', horario: '22:10 – 05:30', color: '#B4E5A2' },
  { codigo: 'T5', horario: '13:20 – 20:40', color: '#ABABAB' },
  { codigo: 'T6', horario: '06:30 – 15:50', color: '#FF9A33' },
  { codigo: 'T7', horario: '12:50 – 20:40', color: '#F2CEEF' },
  { codigo: 'T8', horario: '06:00 – 13:20', color: '#CCFFFF' },
  { codigo: 'T9', horario: '20:40 – 04:00', color: '#4A90D9', texto: '#ffffff' },
];
const DESCANSO = { codigo: 'D', nombre: 'Descanso', color: '#E5E7EB' };
const VACACIONES = { codigo: 'V', nombre: 'Vacaciones', color: '#C4B5FD' };
// Código y texto de ayuda de una celda
const info = (c: string | null | undefined) => !c ? { cod: '—', sub: '' }
  : c === 'D' ? { cod: 'D', sub: 'Descanso' } : c === 'V' ? { cod: 'V', sub: 'Vacaciones' }
  : { cod: c, sub: TURNOS_MANT.find(x => x.codigo === c)?.horario || '' };
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

type Fila = { tecnico_id: number; tecnico_nombre: string; dias: (string | null)[] };
type Tecnico = { id: number; name: string; turno?: string; especialidad?: string; planta?: string };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Domingo de la semana de una fecha (la semana del horario va de domingo a sábado). */
const domingoDe = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - x.getDay()); return x; };
const masDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function TurnosSemanales({ technicians, userEmail, onTechsUpdated, onDistribucion }: {
  technicians: Tecnico[]; userEmail?: string; onTechsUpdated?: () => void;
  /** % del turno de hoy en producción por técnico, para que la cuadrilla muestre el reparto real */
  onDistribucion?: (pct: Record<number, number | null>) => void;
}) {
  const [etapa, setEtapa] = useState<'actual' | 'proxima'>('actual');
  const [filas, setFilas] = useState<Record<string, Fila[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);
  // Orden de las filas (arrastrando el técnico); es el mismo para todas las semanas
  const [orden, setOrden] = useState<Record<number, number>>({});
  // Técnicos quitados de la tabla de turnos (siguen en la cuadrilla); se pueden volver a mostrar
  const [ocultos, setOcultos] = useState<Set<number>>(new Set());
  const [verOcultos, setVerOcultos] = useState(false);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  // Horario de las plantas por semana: { semana: { planta: [7 días] } }
  const [horario, setHorario] = useState<Record<string, Record<string, HorarioDia[]>>>({});
  const [editH, setEditH] = useState<{ planta: string; dia: number; i: string; f: string } | null>(null);
  const [plantaNueva, setPlantaNueva] = useState('');
  const [reubicando, setReubicando] = useState(false);
  const [avisoReubicacion, setAvisoReubicacion] = useState<string | null>(null);
  const ultimoIntento = useRef('');

  const hoy = new Date();
  const semanas = useMemo(() => {
    const d0 = domingoDe(new Date());
    return { actual: d0, proxima: masDias(d0, 7) };
  }, []);
  const domingo = semanas[etapa];
  const claveSemana = iso(domingo);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    const { data, error: e } = await supabase.from('mant_turnos_semana').select('semana, tecnico_id, tecnico_nombre, dias')
      .in('semana', [iso(semanas.actual), iso(semanas.proxima)]);
    if (e) {
      setError(/mant_turnos_semana|relation|schema cache/i.test(e.message) ? 'Falta ejecutar mant_turnos_semana.sql en Supabase.' : e.message);
    } else {
      const m: Record<string, Fila[]> = {};
      (data || []).forEach((r: { semana: string; tecnico_id: number; tecnico_nombre: string; dias: (string | null)[] }) => {
        (m[r.semana] = m[r.semana] || []).push({ tecnico_id: r.tecnico_id, tecnico_nombre: r.tecnico_nombre, dias: r.dias || [] });
      });
      setFilas(m);
    }
    const hp = await supabase.from('mant_horario_plantas').select('semana, planta, dias').in('semana', [iso(semanas.actual), iso(semanas.proxima)]);
    if (hp.error) {
      setError(/mant_horario_plantas|relation|schema cache/i.test(hp.error.message) ? 'Falta ejecutar mant_turnos_semana.sql en Supabase (tabla del horario de plantas).' : hp.error.message);
    } else {
      const m: Record<string, Record<string, HorarioDia[]>> = {};
      (hp.data || []).forEach((r: { semana: string; planta: string; dias: HorarioDia[] }) => { (m[r.semana] = m[r.semana] || {})[r.planta] = r.dias || []; });
      setHorario(m);
    }
    let o = await supabase.from('mant_turnos_orden').select('tecnico_id, orden, oculto');
    if (o.error && /oculto/.test(o.error.message)) o = await supabase.from('mant_turnos_orden').select('tecnico_id, orden') as typeof o;
    if (!o.error) {
      const rows = (o.data || []) as { tecnico_id: number; orden: number; oculto?: boolean }[];
      setOrden(Object.fromEntries(rows.map(r => [r.tecnico_id, r.orden])));
      setOcultos(new Set(rows.filter(r => r.oculto).map(r => r.tecnico_id)));
    }
    setCargando(false);
  }, [semanas]);
  useEffect(() => { void cargar(); }, [cargar]);

  // Técnicos activos (y los que ya tienen turnos en la semana aunque ahora estén inactivos)
  const lista = useMemo(() => {
    const deSemana = filas[claveSemana] || [];
    const ids = new Set(deSemana.map(f => f.tecnico_id));
    // Activos y los que tienen turnos en alguna de las dos semanas (en descanso hoy quedan Inactivos, pero siguen en la tabla)
    // Solo cuentan filas con algún turno puesto (una fila vacía no hace aparecer a un técnico inactivo)
    const conTurnos = new Set(Object.values(filas).flat().filter(f => f.dias.some(Boolean)).map(f => f.tecnico_id));
    const activos = technicians.filter(t => t.id !== 9999 && (t.turno !== 'INACTIVO' || conTurnos.has(t.id)));
    const todos: { id: number; nombre: string }[] = [
      ...activos.map(t => ({ id: t.id, nombre: t.name })),
      ...deSemana.filter(f => f.dias.some(Boolean) && !activos.some(t => t.id === f.tecnico_id)).map(f => ({ id: f.tecnico_id, nombre: f.tecnico_nombre })),
    ];
    // Primero los que tienen turnos, en el orden del primer turno de la semana; luego el resto por nombre
    const primero = (id: number) => {
      const d = deSemana.find(f => f.tecnico_id === id)?.dias.find(x => x && x !== 'D' && x !== 'V');
      return d ? TURNOS_MANT.findIndex(t => t.codigo === d) : 99;
    };
    // El orden guardado (arrastrando) manda; los técnicos sin orden van al final
    const ord = (id: number) => (id in orden ? orden[id] : 100000);
    return todos.filter(t => verOcultos || !ocultos.has(t.id)).sort((a, b) => ord(a.id) - ord(b.id) || (ids.has(b.id) ? 1 : 0) - (ids.has(a.id) ? 1 : 0) || primero(a.id) - primero(b.id) || a.nombre.localeCompare(b.nombre));
  }, [technicians, filas, claveSemana, orden, ocultos, verOcultos]);

  // Quitar (o volver a mostrar) un técnico de la tabla de turnos
  const ocultar = async (id: number, valor: boolean) => {
    setError(null);
    const { error: e } = await supabase.from('mant_turnos_orden').upsert({ tecnico_id: id, orden: orden[id] ?? 100000, oculto: valor }, { onConflict: 'tecnico_id' });
    if (e) { setError(/oculto|mant_turnos_orden|relation|schema cache/i.test(e.message) ? 'Falta ejecutar mant_turnos_semana.sql en Supabase (para quitar técnicos de la tabla).' : e.message); return; }
    setOcultos(prev => { const n = new Set(prev); if (valor) n.add(id); else n.delete(id); return n; });
  };

  // Soltar una fila sobre otra: se mueve a esa posición y se guarda el orden de todas
  const soltar = async (desde: number, hasta: number) => {
    setArrastrando(null); setSobre(null);
    if (desde === hasta) return;
    const ids = lista.map(t => t.id);
    const i = ids.indexOf(desde), j = ids.indexOf(hasta);
    if (i < 0 || j < 0) return;
    ids.splice(i, 1); ids.splice(j, 0, desde);
    const nuevo = Object.fromEntries(ids.map((id, k) => [id, k + 1]));
    const antes = orden;
    setOrden(nuevo);
    const { error: e } = await supabase.from('mant_turnos_orden').upsert(ids.map((id, k) => ({ tecnico_id: id, orden: k + 1 })), { onConflict: 'tecnico_id' });
    if (e) { setOrden(antes); setError(/mant_turnos_orden|relation|schema cache/i.test(e.message) ? 'No se guardó el orden: falta ejecutar mant_turnos_semana.sql (tabla mant_turnos_orden).' : `No se guardó el orden: ${e.message}`); }
  };

  const diasDe = (id: number) => (filas[claveSemana] || []).find(f => f.tecnico_id === id)?.dias || [];

  const guardarFila = async (semana: string, id: number, nombre: string, dias: (string | null)[]) => {
    setGuardando(id); setError(null);
    const { error: e } = await supabase.from('mant_turnos_semana').upsert(
      { semana, tecnico_id: id, tecnico_nombre: nombre, dias, actualizado_por: userEmail || null, actualizado_at: new Date().toISOString() },
      { onConflict: 'semana,tecnico_id' });
    setGuardando(null);
    if (e) { setError(`No se guardó el turno: ${e.message}`); return false; }
    setFilas(prev => {
      const l = (prev[semana] || []).filter(f => f.tecnico_id !== id);
      return { ...prev, [semana]: [...l, { tecnico_id: id, tecnico_nombre: nombre, dias }] };
    });
    return true;
  };

  const cambiar = (id: number, nombre: string, dia: number, valor: string) => {
    const dias = Array.from({ length: 7 }, (_, i) => diasDe(id)[i] ?? null);
    dias[dia] = valor || null;
    void guardarFila(claveSemana, id, nombre, dias);
  };

  // Toda la semana del técnico con un mismo turno (lunes a sábado; domingo descanso)
  const llenarSemana = (id: number, nombre: string, valor: string) => {
    if (!valor) return;
    void guardarFila(claveSemana, id, nombre, valor === 'V' ? Array(7).fill('V') : ['D', valor, valor, valor, valor, valor, valor]);
  };

  const copiarDeActual = async () => {
    const origen = filas[iso(semanas.actual)] || [];
    if (!origen.length) { setError('La semana actual no tiene turnos para copiar.'); return; }
    if ((filas[claveSemana] || []).some(f => f.dias.some(Boolean)) && !confirm('La próxima semana ya tiene turnos. ¿Reemplazarlos con los de la semana actual?')) return;
    for (const f of origen) { if (!(await guardarFila(claveSemana, f.tecnico_id, f.tecnico_nombre, f.dias))) return; }
  };

  const limpiarFila = (id: number, nombre: string) => { void guardarFila(claveSemana, id, nombre, [null, null, null, null, null, null, null]); };

  // ── Horario de las plantas de la semana elegida ──
  const horarioSemana = horario[claveSemana] || {};
  const plantasHorario = [...PLANTAS_PROD, ...Object.keys(horarioSemana).filter(p => !PLANTAS_PROD.includes(p))];
  // Lo guardado en la semana manda; si un día no tiene nada, el horario por defecto de la planta
  const diasDeSemana = useCallback((semana: string, planta: string) =>
    Array.from({ length: 7 }, (_, i) => horario[semana]?.[planta]?.[i] ?? DEFECTO_PLANTA[planta]?.[i] ?? null) as HorarioDia[], [horario]);
  const diasPlanta = (planta: string) => diasDeSemana(claveSemana, planta);
  const esDefecto = (planta: string, i: number) => horarioSemana[planta]?.[i] == null && DEFECTO_PLANTA[planta]?.[i] != null;
  const guardarHorario = async (planta: string, dias: HorarioDia[]) => {
    setError(null); setEditH(null);
    const { error: e } = await supabase.from('mant_horario_plantas').upsert(
      { semana: claveSemana, planta, dias, actualizado_por: userEmail || null, actualizado_at: new Date().toISOString() }, { onConflict: 'semana,planta' });
    if (e) { setError(`No se guardó el horario de ${planta}: ${e.message}`); return; }
    setHorario(prev => ({ ...prev, [claveSemana]: { ...(prev[claveSemana] || {}), [planta]: dias } }));
  };
  const ponerHorario = (planta: string, dia: number, valor: HorarioDia, lunesASabado = false) => {
    const d = diasPlanta(planta);
    if (lunesASabado) { for (let k = 1; k <= 6; k++) d[k] = valor; } else d[dia] = valor;
    void guardarHorario(planta, d);
  };
  const textoHorario = (h: HorarioDia) => !h ? '—' : h === 'NO' ? 'No trabaja' : h.i === h.f ? '24 h' : `${h.i} – ${h.f}`;

  // ── Ubicación automática en la cuadrilla: turno de HOY de cada técnico + horario de plantas de esta semana ──
  const hoyIdx = hoy.getDay();
  const semanaHoy = iso(semanas.actual);
  const ubicacion = useMemo(() => {
    const plantas = [...new Set([...PLANTAS_PROD, ...Object.keys(horario[semanaHoy] || {})])];
    const hp = plantas.map(p => diasDeSemana(semanaHoy, p));
    const res: Record<number, { modalidad: Modalidad; pct: number | null; plantas?: string[] | null }> = {};
    // Sin horario de hoy en ninguna planta no se reubica (todo quedaría como no producción)
    if (!hp.some(d => d[hoyIdx] != null)) return { listo: false, res };
    const sig = plantas.map(p => diasDeSemana(iso(semanas.proxima), p));
    (filas[semanaHoy] || []).forEach(f => {
      // Los quitados de la tabla de turnos no se mueven (p. ej. siempre PR)
      if (ocultos.has(f.tecnico_id)) return;
      const cod = f.dias[hoyIdx];
      // Solo las plantas del técnico (su especialidad, p. ej. "MS, FV, RTM"); sin ninguna con horario → todas
      const tec = technicians.find(t => t.id === f.tecnico_id);
      const suyas = (tec?.especialidad || tec?.planta || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const idx = plantas.map((p, k) => (suyas.includes(p.toUpperCase()) ? k : -1)).filter(k => k >= 0);
      const usar = idx.length ? idx : plantas.map((_, k) => k);
      const r = modalidadDeHoy(cod, TURNOS_MANT.find(t => t.codigo === cod)?.horario, usar.map(k => hp[k]), hoyIdx, usar.map(k => sig[k]));
      if (r) res[f.tecnico_id] = { ...r, plantas: idx.length ? idx.map(k => plantas[k]) : null };
    });
    return { listo: true, res };
  }, [horario, filas, semanaHoy, hoyIdx, semanas, diasDeSemana, technicians, ocultos]);

  // La cuadrilla muestra el reparto real de los NPPR con estos %
  useEffect(() => {
    onDistribucion?.(Object.fromEntries(Object.entries(ubicacion.res).map(([id, r]) => [Number(id), r.pct])));
  }, [ubicacion, onDistribucion]);

  // Si la cuadrilla no coincide con lo calculado, se actualiza el técnico (modalidad y activo) y se recarga
  useEffect(() => {
    if (!ubicacion.listo || reubicando) return;
    const cambios = Object.entries(ubicacion.res)
      .map(([id, r]) => ({ id: Number(id), mod: r.modalidad, actual: technicians.find(t => t.id === Number(id))?.turno }))
      .filter(c => c.actual !== undefined && c.actual !== c.mod);
    if (!cambios.length) return;
    // El mismo intento no se repite (si falló, queda el aviso en rojo en vez de reintentar sin fin)
    const clave = cambios.map(c => `${c.id}:${c.mod}`).sort().join(',');
    if (ultimoIntento.current === clave) return;
    ultimoIntento.current = clave;
    setReubicando(true);
    void (async () => {
      const fallas: string[] = [];
      for (const c of cambios) {
        const { error: e } = await supabase.from('mantenimiento_tecnicos').update({ modalidad_operativa: c.mod, activo: c.mod !== 'INACTIVO' }).eq('id', c.id);
        if (e) fallas.push(`${technicians.find(t => t.id === c.id)?.name || c.id}: ${e.message}`);
      }
      setAvisoReubicacion(fallas.length ? `No se pudo reubicar a: ${fallas.join('; ')}` : `Cuadrilla reubicada para hoy (${cambios.length} técnico(s)).`);
      // Solo se recuerda el intento si falló; si salió bien, un cambio a mano posterior se vuelve a corregir
      if (!fallas.length) ultimoIntento.current = '';
      onTechsUpdated?.();
      setReubicando(false);
    })();
  }, [ubicacion, technicians, reubicando, onTechsUpdated]);

  // % que se muestra: PR → % del turno en producción; NP → % en no producción; NPPR → los dos
  const textoPct = (m: Modalidad, pct: number | null) => {
    if (pct == null) return '';
    const pr = Math.round(pct * 100);
    return m === 'PR' ? ` (${pr} %)` : m === 'NP' ? ` (${100 - pr} %)` : ` (${pr} % PR · ${100 - pr} % NP)`;
  };

  const fechas = DIAS.map((_, i) => masDias(domingo, i));
  const sabado = fechas[6];
  const rango = `${domingo.getDate()} ${MESES[domingo.getMonth()]} – ${sabado.getDate()} ${MESES[sabado.getMonth()]} ${sabado.getFullYear()}`;
  const estilo = (c: string | null | undefined) => {
    if (!c) return { background: '#ffffff', color: '#94a3b8' };
    if (c === 'D') return { background: DESCANSO.color, color: '#64748b' };
    if (c === 'V') return { background: VACACIONES.color, color: '#3b0764' };
    const t = TURNOS_MANT.find(x => x.codigo === c);
    return t ? { background: t.color, color: t.texto || '#1f2937' } : { background: '#fff', color: '#1f2937' };
  };

  return (
    <>
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3 w-full">
      {/* Encabezado: título, etapas y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-5 h-5 text-[#324354] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#324354] leading-tight">Turnos de Mantenimiento</h2>
            <p className="text-[11px] text-slate-500">Semana del {rango} · toque una celda para cambiar el turno · arrastre ⋮⋮ para ordenar los técnicos</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['actual', 'proxima'] as const).map(e => (
              <button key={e} type="button" onClick={() => setEtapa(e)}
                className={`h-7 px-3 rounded-md text-[11px] sm:text-xs font-bold whitespace-nowrap ${etapa === e ? 'bg-[#324354] text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
                {e === 'actual' ? 'Semana actual' : 'Próxima semana'}
              </button>
            ))}
          </div>
          {ocultos.size > 0 && (
            <button type="button" onClick={() => setVerOcultos(v => !v)}
              className="h-7 px-3 rounded-lg bg-white border border-[#e2ded5] text-slate-600 text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]">
              {verOcultos ? <EyeOff size={13} /> : <Eye size={13} />} {verOcultos ? 'Esconder quitados' : `Ver quitados (${ocultos.size})`}
            </button>
          )}
          {etapa === 'proxima' && (
            <button type="button" onClick={() => void copiarDeActual()} title="Copiar los turnos de la semana actual a la próxima"
              className="h-7 px-3 rounded-lg bg-white border border-[#e2ded5] text-[#324354] text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]">
              <Copy size={13} /> Copiar semana actual
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d14747] bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {cargando ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-xs">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-slate-300 bg-[#F6F3EE] px-2 py-1.5 text-left font-black text-[#324354] w-[230px]">TÉCNICO</th>
                {DIAS.map((d, i) => {
                  const esHoy = iso(fechas[i]) === iso(hoy);
                  return <th key={d} className={`border border-slate-300 px-1 pt-1.5 font-black ${esHoy ? 'bg-[#324354] text-white' : 'bg-[#F6F3EE] text-[#324354]'}`}>{d}</th>;
                })}
                <th rowSpan={2} className="border border-slate-300 bg-[#F6F3EE] px-1 font-bold text-[10px] text-slate-500 w-[120px]">Toda la semana</th>
              </tr>
              <tr>
                {fechas.map((f, i) => {
                  const esHoy = iso(f) === iso(hoy);
                  return <th key={i} className={`border border-slate-300 px-1 pb-1.5 text-sm font-black ${esHoy ? 'bg-[#324354] text-white' : 'bg-[#F6F3EE] text-[#324354]'}`}>{f.getDate()}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {lista.map(t => {
                const dias = diasDe(t.id);
                return (
                  <tr key={t.id} draggable
                    onDragStart={e => { setArrastrando(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); }}
                    onDragOver={e => { if (arrastrando != null) { e.preventDefault(); if (sobre !== t.id) setSobre(t.id); } }}
                    onDrop={e => { e.preventDefault(); if (arrastrando != null) void soltar(arrastrando, t.id); }}
                    onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                    className={`group ${arrastrando === t.id ? 'opacity-40' : ''} ${sobre === t.id && arrastrando !== t.id ? 'outline outline-2 outline-[#324354] -outline-offset-2' : ''}`}>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-[#324354]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 min-w-0">
                          <GripVertical size={14} className="text-slate-400 shrink-0 cursor-grab active:cursor-grabbing" aria-label="Arrastrar para mover la fila" />
                          <span className="truncate" title={`${t.nombre} · arrastre la fila para cambiar el orden`}>{t.nombre}</span>
                        </span>
                        {guardando === t.id ? <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />
                          : (
                            <span className="flex items-center gap-1 shrink-0">
                              {dias.some(Boolean) && (
                                <button type="button" onClick={() => limpiarFila(t.id, t.nombre)} title="Borrar los turnos de la semana"
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#d14747]"><Trash2 size={12} /></button>
                              )}
                              <button type="button" onClick={() => void ocultar(t.id, !ocultos.has(t.id))}
                                title={ocultos.has(t.id) ? 'Volver a mostrar en la tabla de turnos' : 'Quitar de la tabla de turnos (sigue siendo técnico en la cuadrilla)'}
                                className={`${ocultos.has(t.id) ? 'text-[#324354]' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#d14747]'}`}>
                                {ocultos.has(t.id) ? <Eye size={12} /> : <EyeOff size={12} />}
                              </button>
                            </span>
                          )}
                      </div>
                    </td>
                    {DIAS.map((_, i) => (
                      <td key={i} className="border border-slate-300 p-0 h-9 relative hover:brightness-95" style={estilo(dias[i])}>
                        {/* Se ve el turno y su horario; la lista para cambiarlo queda invisible encima */}
                        <div className="flex items-baseline justify-center gap-1.5 h-9 leading-9 whitespace-nowrap pointer-events-none px-1">
                          <span className="font-black text-sm">{info(dias[i]).cod}</span>
                          {info(dias[i]).sub && <span className="text-[11px] font-semibold opacity-80">{info(dias[i]).sub}</span>}
                        </div>
                        <select value={dias[i] || ''} onChange={e => cambiar(t.id, t.nombre, i, e.target.value)} disabled={guardando === t.id}
                          title={info(dias[i]).sub || 'Sin turno'} aria-label={`Turno ${DIAS[i].toLowerCase()} de ${t.nombre}`}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                          <option value="">— Sin turno</option>
                          {TURNOS_MANT.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo} · {x.horario}</option>)}
                          <option value="D">D · Descanso</option>
                          <option value="V">V · Vacaciones</option>
                        </select>
                      </td>
                    ))}
                    <td className="border border-slate-300 p-0.5">
                      <select value="" onChange={e => llenarSemana(t.id, t.nombre, e.target.value)} disabled={guardando === t.id}
                        title="Poner el mismo turno de lunes a sábado (domingo descanso), o vacaciones toda la semana"
                        className="w-full h-7 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 outline-none cursor-pointer">
                        <option value="">Lun–Sáb…</option>
                        {TURNOS_MANT.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo} · {x.horario}</option>)}
                        <option value="V">V · Vacaciones (toda la semana)</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr><td colSpan={9} className="border border-slate-300 py-8 text-center text-slate-400 font-semibold">No hay técnicos activos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Convenciones de turnos */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
        {TURNOS_MANT.map(x => (
          <span key={x.codigo} className="flex items-center gap-1.5 text-[11px] font-bold rounded-md border border-slate-300 overflow-hidden">
            <span className="px-1.5 py-0.5 bg-[#F6F3EE] text-[#324354]">{x.codigo}</span>
            <span className="px-1.5 py-0.5" style={{ background: x.color, color: x.texto || '#1f2937' }}>{x.horario}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] font-bold rounded-md border border-slate-300 overflow-hidden">
          <span className="px-1.5 py-0.5 bg-[#F6F3EE] text-[#324354]">D</span>
          <span className="px-1.5 py-0.5" style={{ background: DESCANSO.color, color: '#64748b' }}>Descanso</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold rounded-md border border-slate-300 overflow-hidden">
          <span className="px-1.5 py-0.5 bg-[#F6F3EE] text-[#324354]">V</span>
          <span className="px-1.5 py-0.5" style={{ background: VACACIONES.color, color: '#3b0764' }}>Vacaciones</span>
        </span>
      </div>
    </section>

    {/* Horario de las plantas en la semana: con él y el turno de hoy de cada técnico se ubica la cuadrilla */}
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3 w-full mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <Factory className="w-5 h-5 text-[#324354] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#324354] leading-tight">Horario de las Plantas</h2>
            <p className="text-[11px] text-slate-500">
              {etapa === 'actual' ? 'Semana actual' : 'Próxima semana'} ({rango}) · toque un día para poner el horario. La cuadrilla se ubica sola con el turno de hoy:
              {' '}todo el turno ({Math.round(MIN_PR * 100)} %) con alguna de SUS plantas (especialidad) trabajando → PR · nada ({Math.round(MAX_NP * 100)} %) → NP · parcial → NPPR · Descanso o Vacaciones → Inactivo. Sin plantas con horario se compara con todas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select value={plantaNueva} onChange={e => setPlantaNueva(e.target.value)} className="h-7 px-2 text-[11px] font-bold bg-white border border-[#e2ded5] rounded-lg outline-none">
            <option value="">Otra planta…</option>
            {PLANTAS_SP.filter(p => !plantasHorario.includes(p.value)).map(p => <option key={p.value} value={p.value}>{p.value} · {p.label}</option>)}
          </select>
          <button type="button" disabled={!plantaNueva} onClick={() => { void guardarHorario(plantaNueva, Array(7).fill(null)); setPlantaNueva(''); }}
            className="h-7 px-2.5 rounded-lg bg-[#324354] text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><Plus size={13} /> Agregar</button>
        </div>
      </div>

      <div className="overflow-x-auto min-[1100px]:overflow-visible">
        <table className="w-full min-w-[1000px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-slate-300 bg-[#F6F3EE] px-2 py-1.5 text-left font-black text-[#324354] w-[230px]">PLANTA</th>
              {DIAS.map((d, i) => {
                const esHoy = iso(fechas[i]) === iso(hoy);
                return <th key={d} className={`border border-slate-300 px-1 py-1.5 font-black ${esHoy ? 'bg-[#324354] text-white' : 'bg-[#F6F3EE] text-[#324354]'}`}>{d} {fechas[i].getDate()}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {plantasHorario.map(planta => (
              <tr key={planta}>
                <td className="border border-slate-300 px-2 py-1 font-black text-[#324354]">
                  {planta} <span className="font-semibold text-slate-400 text-[10px]">{PLANTAS_SP.find(p => p.value === planta)?.label || ''}</span>
                </td>
                {diasPlanta(planta).map((h, i) => {
                  const abierto = editH && editH.planta === planta && editH.dia === i;
                  return (
                    <td key={i} className={`border border-slate-300 p-0 h-10 relative text-center ${h === 'NO' ? 'bg-slate-100 text-slate-400' : h ? 'bg-emerald-50 text-emerald-800' : 'text-slate-300'}`}>
                      <button type="button" onClick={() => setEditH({ planta, dia: i, i: h && h !== 'NO' ? h.i : '06:00', f: h && h !== 'NO' ? h.f : '17:30' })}
                        className={`w-full h-10 font-bold text-[11px] hover:bg-black/5 ${esDefecto(planta, i) ? 'italic opacity-75' : ''}`}
                        title={esDefecto(planta, i) ? 'Horario por defecto de la planta (toque para cambiarlo)' : 'Cambiar el horario de este día'}>{textoHorario(h)}</button>
                      {abierto && editH && (
                        <div className="absolute z-30 top-1 left-1/2 -translate-x-1/2 w-[260px] bg-white border-2 border-[#324354] rounded-xl shadow-xl p-2 space-y-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#324354] uppercase">{planta} · {DIAS[i].toLowerCase()}</span>
                            <button type="button" onClick={() => setEditH(null)} className="text-slate-400 hover:text-slate-600" title="Cerrar"><X size={13} /></button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input type="time" value={editH.i} onChange={e => setEditH({ ...editH, i: e.target.value })} className="flex-1 min-w-0 h-7 px-1 text-xs border border-slate-300 rounded" />
                            <span className="text-slate-400">–</span>
                            <input type="time" value={editH.f} onChange={e => setEditH({ ...editH, f: e.target.value })} className="flex-1 min-w-0 h-7 px-1 text-xs border border-slate-300 rounded" />
                          </div>
                          {/* Horarios más usados */}
                          <div className="grid grid-cols-2 gap-1">
                            {HORARIOS_RAPIDOS.map(r => {
                              const sel = editH.i === r.i && editH.f === r.f;
                              return (
                                <button key={`${r.i}-${r.f}`} type="button" onClick={() => setEditH({ ...editH, i: r.i, f: r.f })}
                                  className={`h-6 rounded-md border text-[10px] font-bold ${sel ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'}`}
                                  title={r.nota}>{r.i}–{r.f}{r.nota ? ' ·' : ''}{r.nota ? <span className="font-semibold"> {r.nota}</span> : null}</button>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">O escriba otro horario arriba. Si termina antes de empezar, pasa de medianoche; mismo inicio y fin = 24 h.</p>
                          <div className="grid grid-cols-2 gap-1">
                            <button type="button" onClick={() => ponerHorario(planta, i, { i: editH.i, f: editH.f })} className="h-7 rounded-lg bg-[#324354] text-white text-[10px] font-bold">Guardar</button>
                            <button type="button" onClick={() => ponerHorario(planta, i, 'NO')} className="h-7 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">No trabaja</button>
                            <button type="button" onClick={() => ponerHorario(planta, i, { i: editH.i, f: editH.f }, true)}
                              className="col-span-2 h-7 rounded-lg bg-white border border-[#e2ded5] text-[#324354] text-[10px] font-bold">Guardar de lunes a sábado</button>
                            <button type="button" onClick={() => ponerHorario(planta, i, null)} className="col-span-2 h-6 text-[10px] font-semibold text-slate-400 hover:text-[#d14747]">{DEFECTO_PLANTA[planta] ? "Volver al horario por defecto" : "Quitar"}</button>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resultado de hoy */}
      {etapa === 'actual' && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] relative">
          <span className="font-black text-[#324354] mr-1">Distribución de hoy ({DIAS[hoyIdx].toLowerCase()}):</span>
          {!ubicacion.listo ? (
            <span className="font-semibold text-amber-700">Ponga el horario de hoy de al menos una planta para que la cuadrilla se ubique sola.</span>
          ) : (
            <>
              {Object.entries(ubicacion.res).sort((a, b) => a[1].modalidad.localeCompare(b[1].modalidad)).map(([id, r]) => (
                <span key={id} className={`px-2 py-0.5 rounded-md border font-bold ${COLOR_MOD[r.modalidad]}`} title={`${NOMBRE_MOD[r.modalidad]} · comparado con ${r.plantas?.join(", ") || "todas las plantas"}`}>
                  {(technicians.find(t => t.id === Number(id))?.name || String(id)).split(' ').slice(0, 2).join(' ')}: {CORTO_MOD[r.modalidad]}{textoPct(r.modalidad, r.pct)}
                </span>
              ))}
              {reubicando && <Loader2 size={13} className="animate-spin text-slate-400" />}
              {avisoReubicacion && <span className={`font-semibold ${avisoReubicacion.startsWith('No') ? 'text-[#d14747]' : 'text-emerald-700'}`}>{avisoReubicacion}</span>}
            </>
          )}
        </div>
      )}
    </section>
    </>
  );
}
