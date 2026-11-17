import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { sapBaseUrl } from '@/lib/sapTraslados';
import { grupoMaterial } from '@/lib/gruposMateriales';

// Componentes para la entrega (FV, Digitado y Tránsito): al entregar la OF, SAP descuenta lo cargado a la orden de la
// bodega de cada componente (MP-03). Se revisa que esa bodega tenga en existencia lo que falta por descontar
// (requerido − ya consumido) de cada componente de la lista de materiales, salvo la mano de obra (mano de obra y CIF).
// Si SAP no entrega la existencia de un componente se informa como "sin dato", nunca como cubierto.
// La existencia es la de la bodega: la comparten las demás OF que usan el mismo componente.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const red = (n: number) => Math.round(n * 10000) / 10000;

export async function GET(request: Request) {
    const of = new URL(request.url).searchParams.get('of') || '';
    if (!/^\d+$/.test(of)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });
    try {
        const baseUrl = sapBaseUrl();
        const r = await fetchSAP(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${of}&$select=DocumentNumber,ProductionOrderLines`, { method: 'GET' });
        if (!r.ok) throw new Error(`SAP no respondió la OF (${r.status})`);
        const po = (await r.json()).value?.[0];
        if (!po) throw new Error('La OF no está en SAP');
        const lineas: any[] = Array.isArray(po.ProductionOrderLines) ? po.ProductionOrderLines : [];
        if (!lineas.length) throw new Error('SAP no entregó la lista de materiales');

        // Agrupado por artículo y bodega (un artículo puede venir en varias líneas)
        const req = new Map<string, { item: string; descripcion: string; bodega: string; requerido: number; consumido: number }>();
        for (const l of lineas) {
            const item = String(l.ItemNo || '').trim(); if (!item) continue;
            const descripcion = String(l.ItemName || '');
            if (grupoMaterial(descripcion) === 'mo') continue;
            const bodega = String(l.Warehouse || '').trim();
            const k = `${item}|${bodega}`;
            const x = req.get(k) || { item, descripcion, bodega, requerido: 0, consumido: 0 };
            x.requerido += Number(l.PlannedQuantity) || 0; x.consumido += Number(l.IssuedQuantity) || 0; req.set(k, x);
        }

        // Existencia por bodega: de a 20 artículos por consulta, una consulta a la vez (en paralelo SAP se bloquea)
        const codigos = [...new Set([...req.values()].map(x => x.item))];
        const stock = new Map<string, Map<string, number>>();
        for (let i = 0; i < codigos.length; i += 20) {
            const filtro = codigos.slice(i, i + 20).map(c => `ItemCode eq '${c.replace(/'/g, "''")}'`).join(' or ');
            const s = await fetchSAP(`${baseUrl}/Items?$select=ItemCode,ItemWarehouseInfoCollection&$filter=${encodeURIComponent(filtro)}`, { method: 'GET', headers: { Prefer: 'odata.maxpagesize=50' } as any });
            if (!s.ok) throw new Error(`SAP no entregó las existencias (${s.status})`);
            for (const it of (await s.json()).value || []) {
                const m = new Map<string, number>();
                for (const w of it.ItemWarehouseInfoCollection || []) m.set(String(w.WarehouseCode || '').trim().toUpperCase(), Number(w.InStock) || 0);
                stock.set(String(it.ItemCode).trim(), m);
            }
        }

        const detalle = [...req.values()].map(x => {
            const pendiente = red(Math.max(0, x.requerido - x.consumido));
            const existencia = stock.get(x.item)?.get(x.bodega.toUpperCase());
            const estado = pendiente <= 1e-6 ? 'consumido' : existencia === undefined ? 'sin_dato' : existencia >= pendiente - Math.max(1e-6, pendiente * 0.001) ? 'ok' : 'faltante';
            return { ...x, requerido: red(x.requerido), consumido: red(x.consumido), pendiente, existencia: existencia === undefined ? null : red(existencia), grupo: grupoMaterial(x.descripcion), estado };
        });
        const n = (e: string) => detalle.filter(d => d.estado === e).length;
        return NextResponse.json({
            orden_fabricacion: of,
            estado: n('faltante') ? 'faltante' : n('sin_dato') ? 'sin_dato' : 'completo',
            exigidos: detalle.length, cubiertos: n('ok') + n('consumido'), faltantes: n('faltante'), sin_dato: n('sin_dato'),
            detalle, calculado_at: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando SAP' }, { status: 500 });
    }
}
