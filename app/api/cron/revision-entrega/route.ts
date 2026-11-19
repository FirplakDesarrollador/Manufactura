import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revisarYGuardar } from '@/lib/revisionEntregaGuardar';

// Cron de cada hora (vercel.json): mantiene al día la revisión de componentes para la entrega de TODAS las plantas.
//  - OF con faltantes, sin dato o error: se revisan cada hora.
//  - OF en OK: cada 3 horas.
// Solo las OF que alguna pantalla mostró en los últimos 2 días (las entregadas o cerradas dejan de mostrarse y salen solas).
// Se revisan en bloque, de a 60 OF, primero las de problemas y las más viejas, con un tope de tiempo por ejecución.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const HORA = 60 * 60000;
const LOTE = 60;
const TOPE_MS = 240000;

export async function GET() {
    const inicio = Date.now();
    try {
        const { data, error } = await supabase.from('revision_entrega_of')
            .select('orden_fabricacion, estado, calculado_at')
            .gte('visto_at', new Date(Date.now() - 2 * 24 * HORA).toISOString());
        if (error) throw new Error(error.message);

        // Margen de 10 min para que una OF revisada a las 9:02 entre en la corrida de las 12:00
        const edad = (f: { calculado_at: string }) => Date.now() - new Date(f.calculado_at).getTime();
        const pendientes = (data || [])
            .filter(f => f.estado !== 'completo' ? edad(f) >= HORA - 10 * 60000 : edad(f) >= 3 * HORA - 10 * 60000)
            .sort((a, b) => Number(a.estado === 'completo') - Number(b.estado === 'completo') || edad(b) - edad(a))
            .map(f => f.orden_fabricacion as string);

        let revisadas = 0;
        for (let i = 0; i < pendientes.length && Date.now() - inicio < TOPE_MS; i += LOTE) {
            const lote = pendientes.slice(i, i + LOTE);
            await revisarYGuardar(lote, null);
            revisadas += lote.length;
        }
        return NextResponse.json({ ok: true, enSeguimiento: data?.length || 0, porRevisar: pendientes.length, revisadas, segundos: Math.round((Date.now() - inicio) / 1000) });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error en el cron de revisión' }, { status: 500 });
    }
}
