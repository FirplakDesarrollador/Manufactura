import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generarPreventivos } from '@/lib/mantenimiento/generarPreventivos';

// Tarea diaria de las 5:00 a. m. hora Colombia (vercel.json: 10:00 UTC). Genera las órdenes de mantenimiento
// preventivo (PREV-n) que vencen MAÑANA, con el técnico asignado por las reglas únicas (ejecutor → planta →
// turno → disponibilidad → reserva). Si se llama varias veces el mismo día no duplica órdenes.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const r = await generarPreventivos(supabase);
    return NextResponse.json(r, { status: r.success ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
