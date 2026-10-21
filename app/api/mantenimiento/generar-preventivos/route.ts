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

export async function POST(req: Request) {
  try {
    const todayStr = getColombiaDate(new Date());

    // 1. Consultar fecha de última orden preventiva creada en Supabase
    const { data: lastPrev, error: lastErr } = await supabase
      .from('mantenimiento_ordenes')
      .select('created_at')
      .eq('origen', 'PLAN_PREVENTIVO')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastErr) {
      console.warn('Aviso consultando última orden preventiva:', lastErr);
    }

    const lastCreated = lastPrev && lastPrev.length > 0 ? lastPrev[0].created_at : null;
    const lastDateStr = lastCreated ? getColombiaDate(new Date(lastCreated)) : todayStr;

    // Calcular días calendario transcurridos
    const dToday = new Date(todayStr + 'T00:00:00Z').getTime();
    const dLast = new Date(lastDateStr + 'T00:00:00Z').getTime();
    const diffDays = Math.max(0, Math.round((dToday - dLast) / (1000 * 60 * 60 * 24)));

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

    // 3. Consultar órdenes preventivas que están ABIERTAS o PENDIENTES actualmente
    // (Para no duplicar órdenes si un preventivo ya tiene una OT abierta pendiente de ejecución)
    const { data: openOrders, error: openErr } = await supabase
      .from('mantenimiento_ordenes')
      .select('id, id_plan_preventivo, estado')
      .eq('origen', 'PLAN_PREVENTIVO')
      .not('estado', 'in', '("Completado","Cancelada","Resuelta")');

    if (openErr) {
      console.warn('Aviso consultando órdenes abiertas:', openErr);
    }

    const openPlanIds = new Set((openOrders || []).map(o => o.id_plan_preventivo).filter(Boolean));

    // 4. Consultar técnicos disponibles para pre-asignación
    const { data: tecnicosData } = await supabase
      .from('mantenimiento_tecnicos')
      .select('*')
      .eq('activo', true);

    const activeTechs = tecnicosData || [];

    // 5. Determinar el consecutivo máximo actual para PREV-
    const { data: prevCodes } = await supabase
      .from('mantenimiento_ordenes')
      .select('codigo')
      .filter('codigo', 'ilike', 'PREV-%');

    let maxNum = 0;
    (prevCodes || []).forEach(row => {
      const match = (row.codigo || '').trim().match(/^PREV-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n < 100000 && n > maxNum) {
          maxNum = n;
        }
      }
    });

    // 6. Evaluar planes vencidos e incrementar ref_frecuencia si pasaron días
    const plansToUpdateCounter: { id: number; ref_frecuencia: number }[] = [];
    const ordersToInsert: any[] = [];
    let nextCodeNum = maxNum + 1;

    for (const p of pmps) {
      const freq = Number(p.frecuencia_dias) || 1;
      const currentRef = Number(p.ref_frecuencia || 0);
      
      // Si han transcurrido días desde la última corrida, incrementamos el contador
      const newRef = diffDays > 0 ? Math.min(freq, currentRef + diffDays) : currentRef;

      if (newRef !== currentRef) {
        plansToUpdateCounter.push({
          id: p.id,
          ref_frecuencia: newRef
        });
      }

      const isDue = newRef >= freq || freq <= 1;

      // Si está vencido y NO tiene una OT abierta pendiente, generamos su nueva OT
      if (isDue && !openPlanIds.has(p.id)) {
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

        // Marcar este plan para no duplicarlo en este mismo ciclo
        openPlanIds.add(p.id);
      }
    }

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

    // 8. Insertar las nuevas órdenes generadas en mantenimiento_ordenes en lotes de 50
    let insertedCount = 0;
    if (ordersToInsert.length > 0) {
      const insertBatchSize = 50;
      for (let i = 0; i < ordersToInsert.length; i += insertBatchSize) {
        const batch = ordersToInsert.slice(i, i + insertBatchSize);
        const { error: insErr } = await supabase
          .from('mantenimiento_ordenes')
          .insert(batch);

        if (insErr) {
          console.error('Error insertando lote de órdenes preventivas:', insErr);
        } else {
          insertedCount += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Generación completada exitosamente`,
      diasTranscurridos: diffDays,
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
