import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to get date string in Colombian timezone (America/Bogota)
function getColombiaDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date); // YYYY-MM-DD
}

// Días calendario entre dos fechas YYYY-MM-DD
function daysBetween(fromStr: string, toStr: string): number {
  const dFrom = new Date(fromStr + 'T00:00:00Z').getTime();
  const dTo = new Date(toStr + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((dTo - dFrom) / (1000 * 60 * 60 * 24)));
}

// Supabase limita cada consulta a 1000 filas: paginar para traer todo
async function fetchAllRows<T>(buildQuery: () => any, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function POST(req: Request) {
  try {
    const todayStr = getColombiaDate(new Date());

    // 1. Fecha de la última OT generada por cada plan (generación por calendario)
    const prevOrders = await fetchAllRows<{ id_plan_preventivo: number | null; fecha_programada: string | null; created_at: string }>(
      () => supabase
        .from('mantenimiento_ordenes')
        .select('id_plan_preventivo, fecha_programada, created_at')
        .eq('origen', 'PLAN_PREVENTIVO')
        .order('id', { ascending: true })
    );

    const lastGenByPlan = new Map<number, string>();
    prevOrders.forEach(o => {
      if (!o.id_plan_preventivo) return;
      const d = o.fecha_programada ? String(o.fecha_programada).slice(0, 10) : getColombiaDate(new Date(o.created_at));
      const prev = lastGenByPlan.get(o.id_plan_preventivo);
      if (!prev || d > prev) lastGenByPlan.set(o.id_plan_preventivo, d);
    });

    // 2. Consultar Planes Preventivos Maestros (PMP) activos
    const { data: pmps, error: pmpErr } = await supabase
      .from('mantenimiento_planes_preventivos')
      .select('*')
      .eq('activo', true)
      .order('id', { ascending: true });

    if (pmpErr || !pmps) {
      return NextResponse.json({ 
        success: false, 
        error: pmpErr?.message || 'Error cargando planes preventivos' 
      }, { status: 500 });
    }

    // 3. Consultar técnicos disponibles para pre-asignación
    const { data: tecnicosData } = await supabase
      .from('mantenimiento_tecnicos')
      .select('*')
      .eq('activo', true);

    const activeTechs = tecnicosData || [];

    // 4. Determinar el consecutivo máximo actual para PREV-
    const prevCodes = await fetchAllRows<{ codigo: string | null }>(
      () => supabase
        .from('mantenimiento_ordenes')
        .select('codigo')
        .filter('codigo', 'ilike', 'PREV-%')
        .order('id', { ascending: true })
    );

    let maxNum = 0;
    prevCodes.forEach(row => {
      const match = (row.codigo || '').trim().match(/^PREV-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n < 100000 && n > maxNum) {
          maxNum = n;
        }
      }
    });

    // 5. Evaluar planes vencidos por calendario. El contador de cada plan avanza
    // según los días desde su propio updated_at, así múltiples corridas en el mismo día no lo inflan.
    const plansToUpdateCounter: { id: number; ref_frecuencia: number }[] = [];
    const ordersToInsert: any[] = [];
    let nextCodeNum = maxNum + 1;

    for (const p of pmps) {
      const freq = Number(p.frecuencia_dias) || 1;
      const currentRef = Math.min(freq, Number(p.ref_frecuencia || 0));
      const lastCountStr = p.updated_at || p.created_at
        ? getColombiaDate(new Date(p.updated_at || p.created_at))
        : todayStr;
      const elapsed = daysBetween(lastCountStr, todayStr);

      let newRef = Math.min(freq, currentRef + elapsed);

      // Nunca generar dos OT del mismo plan dentro de un mismo ciclo de frecuencia
      const lastGenStr = lastGenByPlan.get(p.id);
      const daysSinceGen = lastGenStr ? daysBetween(lastGenStr, todayStr) : null;
      if (daysSinceGen !== null && daysSinceGen < freq && newRef >= freq) {
        newRef = daysSinceGen;
      }

      const isDue = newRef >= freq;

      // Vencido por calendario: se genera la OT aunque la anterior siga abierta,
      // y el contador se reinicia para iniciar el siguiente ciclo
      if (isDue) {
        const codigoOT = `PREV-${nextCodeNum++}`;
        const pPlanta = (p.planta || 'MS').trim();

        // Buscar técnico candidato compatible por planta
        const matchingTech = activeTechs.find(t => {
          const tPlanta = (t.planta || t.especialidad || '').toUpperCase();
          return tPlanta.includes(pPlanta.toUpperCase()) || tPlanta.includes('TODAS');
        });

        ordersToInsert.push({
          id_plan_preventivo: p.id,
          tipo_orden: 'PREVENTIVO',
          origen: 'PLAN_PREVENTIVO',
          codigo: codigoOT,
          titulo: p.titulo,
          maquina: p.maquina || 'Equipo General',
          planta: pPlanta,
          id_tecnico: matchingTech ? matchingTech.id : null,
          tecnico_nombre: matchingTech ? matchingTech.nombre : 'Sin asignar',
          turno: p.tipo_intervencion || p.turno_requerido || 'NP',
          fecha_programada: todayStr,
          fecha_apertura: `${todayStr}T08:00:00-05:00`,
          duracion_estimada_min: p.duracion_minutos || 60,
          estado: 'Pendiente',
          prioridad: 'Media',
          comentarios_ejecucion: `Orden generada automáticamente por plan preventivo ciclo (${freq} días).`,
          fotos_antes: [],
          fotos_despues: []
        });

        newRef = 0;
      }

      if (newRef !== currentRef || elapsed > 0) {
        plansToUpdateCounter.push({
          id: p.id,
          ref_frecuencia: newRef
        });
      }
    }

    // 6. Insertar las nuevas órdenes generadas en mantenimiento_ordenes en lotes de 50
    let insertedCount = 0;
    const failedPlanIds = new Set<number>();
    if (ordersToInsert.length > 0) {
      const insertBatchSize = 50;
      for (let i = 0; i < ordersToInsert.length; i += insertBatchSize) {
        const batch = ordersToInsert.slice(i, i + insertBatchSize);
        const { error: insErr } = await supabase
          .from('mantenimiento_ordenes')
          .insert(batch);

        if (insErr) {
          console.error('Error insertando lote de órdenes preventivas:', insErr);
          batch.forEach(o => failedPlanIds.add(o.id_plan_preventivo));
        } else {
          insertedCount += batch.length;
        }
      }
    }

    // Si la OT no se pudo insertar, el plan sigue vencido para reintentar en la próxima corrida
    plansToUpdateCounter.forEach(item => {
      if (failedPlanIds.has(item.id)) {
        const plan = pmps.find(p => p.id === item.id);
        item.ref_frecuencia = Number(plan?.frecuencia_dias) || 1;
      }
    });

    // 7. Ejecutar actualizaciones de contadores de ref_frecuencia en lotes
    if (plansToUpdateCounter.length > 0) {
      // Actualizamos en paralelo con Promise.allSettled por lotes de 25
      const batchSize = 25;
      for (let i = 0; i < plansToUpdateCounter.length; i += batchSize) {
        const batch = plansToUpdateCounter.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(item =>
            supabase
              .from('mantenimiento_planes_preventivos')
              .update({
                ref_frecuencia: item.ref_frecuencia,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          )
        );
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Generación completada exitosamente`,
      planesActualizadosContador: plansToUpdateCounter.length,
      ordenesGeneradas: insertedCount,
      rangoCodigos: insertedCount > 0 ? `PREV-${maxNum + 1} a PREV-${maxNum + insertedCount}` : 'Sin nuevas órdenes',
      fechaGeneracion: todayStr
    });

  } catch (error: any) {
    console.error('Error crítico en generador de preventivos:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function GET() {
  // Proporcionar estado de generación sin alterar datos
  try {
    const todayStr = getColombiaDate(new Date());

    const { data: lastPrev } = await supabase
      .from('mantenimiento_ordenes')
      .select('created_at')
      .eq('origen', 'PLAN_PREVENTIVO')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCreated = lastPrev && lastPrev.length > 0 ? lastPrev[0].created_at : null;
    const lastDateStr = lastCreated ? getColombiaDate(new Date(lastCreated)) : todayStr;

    const dToday = new Date(todayStr + 'T00:00:00Z').getTime();
    const dLast = new Date(lastDateStr + 'T00:00:00Z').getTime();
    const diffDays = Math.max(0, Math.round((dToday - dLast) / (1000 * 60 * 60 * 24)));

    const { count: totalPmps } = await supabase
      .from('mantenimiento_planes_preventivos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    const { count: totalOrdenes } = await supabase
      .from('mantenimiento_ordenes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      estado: 'Operativo',
      fechaHoyColombia: todayStr,
      ultimaFechaPreventivo: lastDateStr,
      diasTranscurridos: diffDays,
      totalPlanesActivos: totalPmps || 0,
      totalOrdenesActuales: totalOrdenes || 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
