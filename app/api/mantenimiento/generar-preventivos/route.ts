import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generarPreventivos } from '@/lib/mantenimiento/generarPreventivos';

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

// Generación MANUAL (la automática corre a las 5:00 a. m. desde /api/cron/generar-preventivos). Misma lógica.
export async function POST() {
  try {
    const r = await generarPreventivos(supabase);
    return NextResponse.json({ ...r, mensaje: 'Generación completada' }, { status: r.success ? 200 : 207 });
  } catch (error: any) {
    console.error('Error crítico en generador de preventivos:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
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
