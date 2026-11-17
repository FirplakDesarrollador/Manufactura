import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { sapBaseUrl } from '@/lib/sapTraslados';
import { calcularPesosVaciado } from '@/lib/fibra/pesosVaciado';

// Gelcoat y resina por pieza (Bañera / Faldón, por unidad) de una OF, para las tarjetas de Pintura y Vaciado FV.
// Misma regla del detalle de la orden (lib/fibra/pesosVaciado.ts); solo trae la lista de materiales.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const of = new URL(request.url).searchParams.get('of') || '';
    if (!/^\d+$/.test(of)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });
    try {
        const r = await fetchSAP(`${sapBaseUrl()}/ProductionOrders?$filter=DocumentNumber eq ${of}&$select=DocumentNumber,PlannedQuantity,ProductionOrderLines`, { method: 'GET' });
        if (!r.ok) throw new Error(`SAP no respondió la OF (${r.status})`);
        const po = (await r.json()).value?.[0];
        if (!po) throw new Error('La OF no está en SAP');
        const lineas: any[] = Array.isArray(po.ProductionOrderLines) ? po.ProductionOrderLines : [];
        if (!lineas.length) throw new Error('SAP no entregó la lista de materiales');
        return NextResponse.json({ orden_fabricacion: of, piezas: calcularPesosVaciado(lineas, po.PlannedQuantity) });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando SAP' }, { status: 500 });
    }
}
