import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { sapBaseUrl } from '@/lib/sapTraslados';
import { supabase } from '@/lib/supabase';
import { LectorArboles } from '@/lib/fibra/pesosProductoFv';

// Parámetros FV: resina y gelcoat por pieza de cada producto FV desde SAP (lib/fibra/pesosProductoFv.ts).
//  ?accion=lista            → SKUs FV vigentes en SAP (VHPT, VTIN, VHEM)
//  ?accion=calcular&skus=…  → calcula esos SKUs (hasta 15) y los guarda en productos_fv_pesos (sin tocar las reducciones)
// La app llama "calcular" por lotes, uno a la vez (SAP se bloquea con consultas en paralelo).
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PREFIJOS = ['VHPT', 'VTIN', 'VHEM'];

export async function GET(request: Request) {
    const p = new URL(request.url).searchParams;
    const accion = p.get('accion');
    const baseUrl = sapBaseUrl();
    try {
        if (accion === 'lista') {
            const filtro = PREFIJOS.map(x => `startswith(ItemCode,'${x}')`).join(' or ');
            const items: { sku: string; descripcion: string }[] = [];
            let url: string | null = `${baseUrl}/Items?$select=ItemCode,ItemName,Valid,Frozen&$filter=${encodeURIComponent(`(${filtro}) and Valid eq 'tYES'`)}`;
            for (let i = 0; url && i < 100; i++) {
                const r = await fetchSAP(url, { method: 'GET', headers: { Prefer: 'odata.maxpagesize=200' } });
                if (!r.ok) throw new Error(`SAP no entregó los productos (${r.status})`);
                const d = await r.json();
                for (const it of d.value || []) if (it.Frozen !== 'tYES') items.push({ sku: String(it.ItemCode).trim(), descripcion: String(it.ItemName || '') });
                const sig = d['odata.nextLink'] || d['@odata.nextLink'];
                url = sig ? (String(sig).startsWith('http') ? sig : `${baseUrl}/${String(sig).replace(/^\//, '')}`) : null;
            }
            return NextResponse.json({ productos: items });
        }

        if (accion === 'calcular') {
            const skus = (p.get('skus') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 15);
            if (!skus.length) return NextResponse.json({ error: 'Faltan los SKU' }, { status: 400 });
            const lector = new LectorArboles(baseUrl);
            const filas = [];
            for (const sku of skus) {
                const base = { producto_sku: sku, calculado_at: new Date().toISOString() };
                try {
                    const r = await lector.piezas(sku);
                    if (!r) { filas.push({ ...base, piezas: [], error: 'SAP no tiene lista de materiales para este producto' }); continue; }
                    const ban = r.piezas.find(x => x.pieza === 'Bañera'), fal = r.piezas.find(x => x.pieza === 'Faldón');
                    filas.push({
                        ...base, producto_descripcion: r.descripcion, piezas: r.piezas,
                        resina_banera_kg: ban?.resinaKg ?? null, resina_banera_tipo: ban?.resinaTipo ?? null, gelcoat_banera_kg: ban?.gelcoatKg ?? null,
                        resina_faldon_kg: fal?.resinaKg ?? null, resina_faldon_tipo: fal?.resinaTipo ?? null, gelcoat_faldon_kg: fal?.gelcoatKg ?? null,
                        error: r.piezas.length ? null : 'La lista de materiales no trae estructuras con resina o gelcoat',
                    });
                } catch (e: any) {
                    filas.push({ ...base, piezas: [], error: e?.message || 'Error consultando SAP' });
                }
            }
            if (p.get('simular') === '1') return NextResponse.json({ filas });   // pruebas: calcula sin guardar
            const { error } = await supabase.from('productos_fv_pesos').upsert(filas, { onConflict: 'producto_sku' });
            if (error) return NextResponse.json({ error: /productos_fv_pesos|relation|schema cache/i.test(error.message) ? 'Falta crear la tabla: ejecute productos_fv_pesos.sql en Supabase.' : error.message }, { status: 500 });
            return NextResponse.json({ calculados: filas.length, conError: filas.filter(f => f.error).length });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando SAP' }, { status: 500 });
    }
}
