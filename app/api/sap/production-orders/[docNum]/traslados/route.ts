import { NextResponse } from 'next/server';
import { trasladosDeOf } from '@/lib/sapTraslados';

// Traslados de una orden de fabricación (pestaña Traslados del detalle de la orden). La búsqueda está en lib/sapTraslados.
export async function GET(_request: Request, props: { params: Promise<{ docNum: string }> }) {
    try {
        const { docNum } = await props.params;
        if (!docNum || !/^\d+$/.test(docNum)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });
        const { solicitudes, traslados } = await trasladosDeOf(docNum);
        return NextResponse.json({ ordenFabricacion: docNum, solicitudes, traslados });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error consultando traslados en SAP' }, { status: 500 });
    }
}
