import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { sapBaseUrl } from '@/lib/sapTraslados';

// Nombre de las bodegas de SAP (Warehouses): /api/sap/bodegas?codigos=MP-03,MP-04 → { bodegas: { 'MP-03': 'Nombre' } }
// Una bodega que SAP no devuelve no aparece en la respuesta (la pantalla muestra solo el código, nunca un nombre inventado).
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const codigos = [...new Set((new URL(request.url).searchParams.get('codigos') || '')
        .split(',').map(c => c.trim()).filter(c => /^[\w\-. ]{1,20}$/.test(c)))].slice(0, 50);
    if (!codigos.length) return NextResponse.json({ bodegas: {} });
    try {
        const filtro = codigos.map(c => `WarehouseCode eq '${c.replace(/'/g, "''")}'`).join(' or ');
        const r = await fetchSAP(`${sapBaseUrl()}/Warehouses?$select=WarehouseCode,WarehouseName&$filter=${encodeURIComponent(filtro)}`,
            { method: 'GET', headers: { Prefer: 'odata.maxpagesize=50' } as any });
        if (!r.ok) throw new Error(`SAP no entregó las bodegas (${r.status})`);
        const bodegas: Record<string, string> = {};
        for (const w of (await r.json()).value || []) bodegas[String(w.WarehouseCode).trim()] = String(w.WarehouseName || '').trim();
        return NextResponse.json({ bodegas });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando SAP' }, { status: 500 });
    }
}
