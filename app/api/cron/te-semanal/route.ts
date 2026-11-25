import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fotoTrabajoEstandarizado } from '@/lib/sistema-produccion/trabajoEstandarizado';

// Tarea de los domingos a las 11 p. m. (hora Colombia; vercel.json: lunes 04:00 UTC): toma la foto del Trabajo
// Estandarizado por planta (50 % cobertura + 50 % calidad de las HDT) de la semana que termina y la guarda en
// sp_te_semanal con la función sp_te_guardar (las rutas del servidor no tienen sesión). Así ninguna semana queda sin
// dato aunque nadie abra el tablero. Lo que se guarde después en la misma semana (tablero o botón) la reemplaza;
// las semanas pasadas no se vuelven a calcular.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
    // Fecha en Colombia (UTC-5): a las 04:00 UTC del lunes todavía es domingo en Colombia
    const hoy = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
    try {
        const { actual, errores } = await fotoTrabajoEstandarizado(hoy);
        if (errores.length) return NextResponse.json({ ok: false, fecha: hoy, errores }, { status: 500 });
        const { data, error } = await supabase.rpc('sp_te_guardar', { p_filas: actual });
        if (error) return NextResponse.json({ ok: false, fecha: hoy, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, fecha: hoy, semana: actual[0]?.semana ?? null, plantas: actual.length, guardadas: data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, fecha: hoy, error: e?.message || String(e) }, { status: 500 });
    }
}
