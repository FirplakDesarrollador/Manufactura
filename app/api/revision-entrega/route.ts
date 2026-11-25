import { NextResponse } from 'next/server';
import { leerFilas, marcarVistas, revisarYGuardar } from '@/lib/revisionEntregaGuardar';

// Revisión de componentes para la entrega guardada en el servidor (tabla revision_entrega_of).
// POST { ofs: string[], planta?: 'MS'|'FV'|'MBL'|'CEFI', forzar?: boolean }
//  - sin forzar (al abrir una pantalla): devuelve lo guardado; solo consulta SAP las OF que nunca se han revisado.
//  - forzar (botón "Actualizar componentes" de la planta o ↻ de una OF): consulta SAP en bloque esas OF ya.
// La actualización periódica la hace el cron (/api/cron/revision-entrega). Máximo 100 OF por llamada.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_OFS = 100;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const ofs: string[] = [...new Set<string>((Array.isArray(body?.ofs) ? body.ofs : []).map((o: unknown) => String(o ?? '').trim()).filter((o: string) => /^\d+$/.test(o)))];
        if (!ofs.length) return NextResponse.json({ filas: [] });
        if (ofs.length > MAX_OFS) return NextResponse.json({ error: `Máximo ${MAX_OFS} órdenes por consulta` }, { status: 400 });
        const planta = typeof body?.planta === 'string' ? body.planta.slice(0, 10) : null;

        const guardadas = await leerFilas(ofs);
        const pedir = body?.forzar ? ofs : ofs.filter(o => !guardadas.has(o));
        const filas = pedir.length ? await revisarYGuardar(pedir, planta, guardadas) : guardadas;
        await marcarVistas(ofs);
        return NextResponse.json({ filas: ofs.map(o => filas.get(o)).filter(Boolean) });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error en la revisión de componentes' }, { status: 500 });
    }
}
