import { NextResponse } from 'next/server';
import { revisarEnBloque } from '@/lib/revisionEntregaSap';

// Componentes para la entrega de una OF (consulta directa a SAP, sin guardar). La lógica está en lib/revisionEntregaSap
// (la misma de la revisión en bloque que guarda en revision_entrega_of).
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
    const of = new URL(request.url).searchParams.get('of') || '';
    if (!/^\d+$/.test(of)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });
    try {
        const r = (await revisarEnBloque([of])).get(of);
        if (!r) throw new Error('La OF no está en SAP');
        if ('error' in r) throw new Error(r.error);
        return NextResponse.json(r);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando SAP' }, { status: 500 });
    }
}
