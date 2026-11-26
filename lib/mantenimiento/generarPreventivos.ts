// Generación automática de órdenes de mantenimiento preventivo (PREV-n) desde los planes (PMP).
// Si un plan vence HOY (la tarea no corrió el día anterior) también se crea su orden de hoy; lo vencido antes no se repone.
// Corre todos los días a las 5:00 a. m. (hora Colombia) desde /api/cron/generar-preventivos (vercel.json),
// NO al abrir el Gestor. Genera con UN DÍA de anticipación: a las 5:00 a. m. de hoy se crean las órdenes
// que vencen mañana (fecha programada = mañana), para que se puedan planificar.
//
// Cuándo vence un plan (por calendario):
//   - Si ya tuvo órdenes generadas: última fecha programada + frecuencia.
//   - Si nunca tuvo: hoy + (frecuencia − contador ref_frecuencia); el contador avanza con los días calendario.
// Las órdenes abiertas se acumulan: aunque la anterior siga pendiente, la nueva se genera en su fecha.
// El técnico se asigna con las reglas únicas de lib/mantenimiento/asignacionTecnicos.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { obtenerCodigoPlanta } from '@/lib/nomenclaturaPlantas';
import { elegirTecnico, sumarCarga, ordenPrioridad, type TecnicoAsignable, type CargaPorTecnico } from '@/lib/mantenimiento/asignacionTecnicos';

const DIA_MS = 86400000;

/** Fecha YYYY-MM-DD en Colombia */
export function fechaColombia(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function sumarDias(fecha: string, dias: number): string {
  return new Date(new Date(fecha + 'T00:00:00Z').getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}
function diasEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta + 'T00:00:00Z').getTime() - new Date(desde + 'T00:00:00Z').getTime()) / DIA_MS);
}

// Supabase limita cada consulta a 1000 filas: paginar para traer todo
async function traerTodo<T>(consulta: () => any, tam = 1000): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += tam) {
    const { data, error } = await consulta().range(desde, desde + tam - 1);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < tam) break;
  }
  return filas;
}

/** "MS, CEFI" → ['MS','CEFI'] (códigos oficiales) */
export function plantasDeTexto(v: unknown): string[] {
  const partes = String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return [...new Set(partes.map(p => (obtenerCodigoPlanta(p) || p).toUpperCase()))];
}

export type ResultadoGeneracion = {
  success: boolean;
  fechaGeneracion: string;
  fechaProgramada: string;
  ordenesGeneradas: number;
  asignadasSinHorario: number;
  sinAsignar: number;
  planesActualizadosContador: number;
  rangoCodigos: string;
  error?: string;
};

export async function generarPreventivos(supabase: SupabaseClient, ahora: Date = new Date()): Promise<ResultadoGeneracion> {
  const hoy = fechaColombia(ahora);
  const manana = sumarDias(hoy, 1);

  // 1. Última fecha programada por plan (solo órdenes generadas por el plan)
  const generadas = await traerTodo<{ id_plan_preventivo: number | null; fecha_programada: string | null; created_at: string }>(
    () => supabase.from('mantenimiento_ordenes').select('id_plan_preventivo, fecha_programada, created_at')
      .eq('origen', 'PLAN_PREVENTIVO').order('id', { ascending: true })
  );
  const ultimaProgramada = new Map<number, string>();
  generadas.forEach(o => {
    if (!o.id_plan_preventivo) return;
    const d = o.fecha_programada ? String(o.fecha_programada).slice(0, 10) : fechaColombia(new Date(o.created_at));
    const prev = ultimaProgramada.get(o.id_plan_preventivo);
    if (!prev || d > prev) ultimaProgramada.set(o.id_plan_preventivo, d);
  });

  // 2. Planes activos
  const { data: planes, error: errPlanes } = await supabase.from('mantenimiento_planes_preventivos')
    .select('*').eq('activo', true).order('id', { ascending: true });
  if (errPlanes || !planes) throw new Error(errPlanes?.message || 'No se pudieron leer los planes preventivos');

  // 3. Técnicos (reglas de asignación)
  const { data: tecData } = await supabase.from('mantenimiento_tecnicos').select('*');
  const tecnicos: TecnicoAsignable[] = (tecData || []).map((t: any) => ({
    id: t.id, nombre: t.nombre || '', ejecutor: t.ejecutor,
    plantas: plantasDeTexto(t.especialidad || t.planta),
    turno: t.activo === false ? 'INACTIVO' : (t.modalidad_operativa || t.turno || 'PR'),
    capacidadHoras: parseFloat(t.capacidad_horas) || null, activo: t.activo !== false,
    pctProduccion: t.pct_produccion != null ? Number(t.pct_produccion) : null,
  }));

  // 4. Carga de cada técnico por día programado (hoy y mañana: órdenes abiertas de ese día)
  const delDia = await traerTodo<{ id_tecnico: number | null; duracion_estimada_min: number | null; estado: string | null; fecha_programada: string | null; turno: string | null }>(
    () => supabase.from('mantenimiento_ordenes').select('id_tecnico, duracion_estimada_min, estado, fecha_programada, turno')
      .in('fecha_programada', [hoy, manana]).order('id', { ascending: true })
  );
  const cargaPorDia: Record<string, CargaPorTecnico> = { [hoy]: {}, [manana]: {} };
  delDia.forEach(o => {
    const dia = String(o.fecha_programada || '').slice(0, 10);
    if (!o.id_tecnico || o.estado === 'Completado' || !cargaPorDia[dia]) return;
    sumarCarga(cargaPorDia[dia], o.id_tecnico, (Number(o.duracion_estimada_min) || 60) / 60, o.turno);
  });

  // 5. Planta de la orden = la de la MÁQUINA en el catálogo (no la escrita en el plan)
  let maquinas: { id: number; codigo_equipo: string | null; nombre_equipo: string | null; planta: string | null }[] = [];
  try {
    maquinas = await traerTodo(() => supabase.from('mantenimiento_maquinas_equipos').select('id, codigo_equipo, nombre_equipo, planta').order('id', { ascending: true }));
  } catch (e) {
    console.error('No se pudo leer mantenimiento_maquinas_equipos; se usa la planta del plan:', e);
  }
  const n = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const porId = new Map(maquinas.map(m => [m.id, m]));
  const porNombre = new Map(maquinas.filter(m => m.nombre_equipo).map(m => [n(m.nombre_equipo), m]));
  const porCodigo = new Map(maquinas.filter(m => m.codigo_equipo && String(m.codigo_equipo).trim().length >= 3).map(m => [String(m.codigo_equipo).trim().toUpperCase(), m]));
  const plantaDeMaquina = (p: any): string | null => {
    const nombre = String(p.maquina || '');
    if (nombre.includes('|')) return null;   // plan de varios equipos: se deja la del plan
    const m = (p.id_maquina && porId.get(Number(p.id_maquina)))
      || (p.codigo_maquina && porCodigo.get(String(p.codigo_maquina).trim().toUpperCase()))
      || porNombre.get(n(nombre));
    const pl = m?.planta ? String(m.planta).trim() : '';
    return pl && pl.length <= 8 ? pl : null;
  };

  // 6. Consecutivo PREV-
  const codigos = await traerTodo<{ codigo: string | null }>(
    () => supabase.from('mantenimiento_ordenes').select('codigo').filter('codigo', 'ilike', 'PREV-%').order('id', { ascending: true })
  );
  let maxNum = 0;
  codigos.forEach(r => {
    const m = (r.codigo || '').trim().match(/^PREV-(\d+)$/i);
    if (m) { const v = parseInt(m[1], 10); if (v < 100000 && v > maxNum) maxNum = v; }
  });
  let siguiente = maxNum + 1;

  // 7. Planes que vencen a más tardar mañana
  const nuevas: any[] = [];
  const contadores: { id: number; ref_frecuencia: number }[] = [];
  let asignadasSinHorario = 0;
  let sinAsignar = 0;

  // Prioridad: primero los planes de menor frecuencia (diarios, cada 2, cada 3 días…), así toman la capacidad de los
  // técnicos antes que los semanales y mensuales
  const enPrioridad = [...planes].sort((a, b) => ordenPrioridad(a.frecuencia_dias, b.frecuencia_dias) || a.id - b.id);
  for (const p of enPrioridad) {
    const freq = Math.max(1, Number(p.frecuencia_dias) || 1);
    const refActual = Math.min(freq, Math.max(0, Number(p.ref_frecuencia || 0)));
    const ultima = ultimaProgramada.get(p.id) || null;

    let vence: string;
    let refSinGenerar = refActual;
    if (ultima) {
      vence = sumarDias(ultima, freq);
    } else {
      // Nunca generado: el contador avanza con los días desde la última vez que se tocó el plan
      const base = p.updated_at || p.created_at ? fechaColombia(new Date(p.updated_at || p.created_at)) : hoy;
      refSinGenerar = Math.min(freq, refActual + Math.max(0, diasEntre(base, hoy)));
      vence = sumarDias(hoy, freq - refSinGenerar);
    }

    let ultimaFinal = ultima;
    // Lo vencido no se repone hacia atrás: arranca hoy. Si vence hoy (la tarea no corrió ayer, o es la transición)
    // se crea la de hoy y, si también le toca mañana, la de mañana: así siempre queda un día adelante.
    let fecha = vence < hoy ? hoy : vence;
    while (fecha <= manana) {
      const carga = cargaPorDia[fecha];
      const pPlanta = (plantaDeMaquina(p) || p.planta || 'MS').trim();
      const horas = (Number(p.duracion_minutos) || 60) / 60;
      const asig = elegirTecnico(
        { ejecutor: p.ejecutor, plantas: plantasDeTexto(pPlanta), turno: p.tipo_intervencion || p.turno_requerido, horas },
        tecnicos, carga
      );
      const tec = asig.id ? tecnicos.find(t => t.id === asig.id) : null;
      if (tec) sumarCarga(carga, tec.id, horas, p.tipo_intervencion || p.turno_requerido);
      if (asig.motivo === 'sin_horario') asignadasSinHorario++;
      if (asig.motivo === 'sin_tecnico') sinAsignar++;

      nuevas.push({
        id_plan_preventivo: p.id,
        tipo_orden: 'PREVENTIVO',
        origen: 'PLAN_PREVENTIVO',
        codigo: `PREV-${siguiente++}`,
        titulo: p.titulo,
        maquina: p.maquina || 'Equipo General',
        planta: pPlanta,
        id_tecnico: tec ? tec.id : null,
        tecnico_nombre: tec ? tec.nombre : 'Sin asignar',
        turno: p.tipo_intervencion || p.turno_requerido || 'NP',
        fecha_programada: fecha,
        fecha_apertura: `${fecha}T08:00:00-05:00`,
        duracion_estimada_min: p.duracion_minutos || 60,
        estado: 'Pendiente',
        prioridad: 'Media',
        comentarios_ejecucion: '',
        nota_sistema: `Orden generada automáticamente por plan preventivo ciclo (${freq} días).`,
        fotos_antes: [],
        fotos_despues: []
      });
      ultimaFinal = fecha;
      fecha = sumarDias(fecha, freq);
    }

    // Contador visible (días del ciclo actual): desde la última fecha programada
    const ref = ultimaFinal ? Math.min(freq, Math.max(0, diasEntre(ultimaFinal, hoy))) : refSinGenerar;
    if (ref !== Number(p.ref_frecuencia || 0)) contadores.push({ id: p.id, ref_frecuencia: ref });
  }

  // 8. Guardar órdenes en lotes
  let insertadas = 0;
  const fallidos = new Set<number>();
  for (let i = 0; i < nuevas.length; i += 50) {
    const lote = nuevas.slice(i, i + 50);
    let { error } = await supabase.from('mantenimiento_ordenes').insert(lote);
    // Sin la columna nota_sistema (falta mant_nota_sistema.sql): la nota va en las observaciones, como antes
    if (error && /nota_sistema/i.test(error.message || '')) {
      const respaldo = lote.map(({ nota_sistema, ...o }: any) => ({ ...o, comentarios_ejecucion: nota_sistema }));
      ({ error } = await supabase.from('mantenimiento_ordenes').insert(respaldo));
    }
    if (error) {
      console.error('Error insertando lote de órdenes preventivas:', error);
      lote.forEach(o => fallidos.add(o.id_plan_preventivo));
    } else {
      insertadas += lote.length;
    }
  }

  // 9. Contadores (los planes cuya orden falló no se tocan: se reintenta en la próxima corrida)
  const aGuardar = contadores.filter(c => !fallidos.has(c.id));
  for (let i = 0; i < aGuardar.length; i += 25) {
    await Promise.allSettled(aGuardar.slice(i, i + 25).map(c =>
      supabase.from('mantenimiento_planes_preventivos').update({ ref_frecuencia: c.ref_frecuencia, updated_at: new Date().toISOString() }).eq('id', c.id)
    ));
  }

  return {
    success: fallidos.size === 0,
    fechaGeneracion: hoy,
    fechaProgramada: manana,
    ordenesGeneradas: insertadas,
    asignadasSinHorario,
    sinAsignar,
    planesActualizadosContador: aGuardar.length,
    rangoCodigos: insertadas > 0 ? `PREV-${maxNum + 1} a PREV-${siguiente - 1}` : 'Sin nuevas órdenes',
    ...(fallidos.size ? { error: `${fallidos.size} plan(es) no se pudieron generar; se reintentan en la próxima corrida.` } : {}),
  };
}
