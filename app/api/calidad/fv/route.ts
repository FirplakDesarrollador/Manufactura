import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizarRegistrosFv } from '@/lib/calidad/fvCalidad';
import { fetchRegistrosFv } from '@/lib/calidad/fvSharepoint';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/calidad/fv?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (hasta exclusivo)
// Devuelve las piezas FV normalizadas desde la lista SharePoint de calidad FV.
export async function GET(request: Request) {
    // Solo usuarios con sesión en la app: los datos salen con credenciales de aplicación de Graph
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return NextResponse.json({ success: false, error: 'Se requiere la sesión del usuario' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
        return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde') || '';
    const hasta = searchParams.get('hasta') || '';
    if (!FECHA_RE.test(desde) || !FECHA_RE.test(hasta) || desde >= hasta) {
        return NextResponse.json({ success: false, error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 });
    }

    try {
        const piezas = normalizarRegistrosFv(await fetchRegistrosFv(desde, hasta));
        return NextResponse.json({ success: true, desde, hasta, piezas });
    } catch (err: any) {
        console.error('Error consultando calidad FV en SharePoint:', err);
        return NextResponse.json({ success: false, error: err.message || 'Error consultando SharePoint' }, { status: 500 });
    }
}
