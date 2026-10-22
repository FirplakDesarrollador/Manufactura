import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    calcularResumen,
    fetchCatalogoDefectosMs,
    fetchMsReportes,
    normalizarPiezas,
    rangoDiaUTC
} from '@/lib/calidad/msCalidad';
import { calcularResumenFv, normalizarRegistrosFv } from '@/lib/calidad/fvCalidad';
import { fetchRegistrosFv } from '@/lib/calidad/fvSharepoint';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type CalidadPlanta = { calidad: number; total: number; buenos: number; defectuosos: number };

// Valores de referencia para plantas sin fuente en vivo (MS se calcula desde Supabase)
const DEFAULT_OTRAS_PLANTAS: Record<string, CalidadPlanta> = {
    FV: { calidad: 85.0, total: 30, buenos: 25, defectuosos: 5 },
    QZ: { calidad: 95.0, total: 20, buenos: 19, defectuosos: 1 },
    MBL: { calidad: 95.0, total: 200, buenos: 190, defectuosos: 10 },
    CEFI: { calidad: 95.0, total: 180, buenos: 171, defectuosos: 9 },
    RMOLD: { calidad: 92.0, total: 50, buenos: 46, defectuosos: 4 }
};

// Histórico diario de Calidad IFI por Planta (sincronizado con Power BI)
const DAILY_QUALITY_HISTORY: Record<string, Record<string, CalidadPlanta>> = {
    // Agosto 2026
    "2026-08-28": {
        MS: { calidad: 78.8, total: 405, buenos: 319, defectuosos: 86 },
        FV: { calidad: 85.0, total: 30, buenos: 25, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 200, buenos: 190, defectuosos: 10 },
        CEFI: { calidad: 95.0, total: 180, buenos: 171, defectuosos: 9 }
    },
    "2026-08-27": {
        MS: { calidad: 88.4, total: 420, buenos: 371, defectuosos: 49 },
        FV: { calidad: 85.0, total: 28, buenos: 24, defectuosos: 4 },
        QZ: { calidad: 95.0, total: 18, buenos: 17, defectuosos: 1 },
        MBL: { calidad: 94.5, total: 190, buenos: 180, defectuosos: 10 },
        CEFI: { calidad: 95.0, total: 175, buenos: 166, defectuosos: 9 }
    },
    "2026-08-26": {
        MS: { calidad: 87.6, total: 435, buenos: 381, defectuosos: 54 },
        FV: { calidad: 84.0, total: 32, buenos: 27, defectuosos: 5 },
        QZ: { calidad: 94.0, total: 22, buenos: 21, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 210, buenos: 200, defectuosos: 10 },
        CEFI: { calidad: 94.8, total: 185, buenos: 175, defectuosos: 10 }
    },
    "2026-08-25": {
        MS: { calidad: 79.1, total: 410, buenos: 324, defectuosos: 86 },
        FV: { calidad: 82.0, total: 30, buenos: 25, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 93.8, total: 195, buenos: 183, defectuosos: 12 },
        CEFI: { calidad: 94.5, total: 170, buenos: 161, defectuosos: 9 }
    },
    "2026-08-24": {
        MS: { calidad: 73.8, total: 390, buenos: 288, defectuosos: 102 },
        FV: { calidad: 80.0, total: 25, buenos: 20, defectuosos: 5 },
        QZ: { calidad: 92.0, total: 15, buenos: 14, defectuosos: 1 },
        MBL: { calidad: 92.5, total: 180, buenos: 167, defectuosos: 13 },
        CEFI: { calidad: 93.0, total: 165, buenos: 153, defectuosos: 12 }
    },
    "2026-08-21": {
        MS: { calidad: 72.6, total: 380, buenos: 276, defectuosos: 104 },
        FV: { calidad: 81.0, total: 27, buenos: 22, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 18, buenos: 17, defectuosos: 1 },
        MBL: { calidad: 94.0, total: 190, buenos: 179, defectuosos: 11 },
        CEFI: { calidad: 94.0, total: 170, buenos: 160, defectuosos: 10 }
    },
    "2026-08-20": {
        MS: { calidad: 80.7, total: 415, buenos: 335, defectuosos: 80 },
        FV: { calidad: 83.5, total: 29, buenos: 24, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 19, buenos: 18, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 205, buenos: 195, defectuosos: 10 },
        CEFI: { calidad: 95.0, total: 180, buenos: 171, defectuosos: 9 }
    },
    "2026-08-19": {
        MS: { calidad: 67.9, total: 370, buenos: 251, defectuosos: 119 },
        FV: { calidad: 78.0, total: 26, buenos: 20, defectuosos: 6 },
        QZ: { calidad: 90.0, total: 16, buenos: 14, defectuosos: 2 },
        MBL: { calidad: 91.0, total: 175, buenos: 159, defectuosos: 16 },
        CEFI: { calidad: 92.0, total: 160, buenos: 147, defectuosos: 13 }
    },
    "2026-08-18": {
        MS: { calidad: 82.7, total: 430, buenos: 356, defectuosos: 74 },
        FV: { calidad: 84.0, total: 31, buenos: 26, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 21, buenos: 20, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 200, buenos: 190, defectuosos: 10 },
        CEFI: { calidad: 94.5, total: 175, buenos: 165, defectuosos: 10 }
    },
    "2026-08-14": {
        MS: { calidad: 80.5, total: 400, buenos: 322, defectuosos: 78 },
        FV: { calidad: 83.0, total: 28, buenos: 23, defectuosos: 5 },
        QZ: { calidad: 94.0, total: 18, buenos: 17, defectuosos: 1 },
        MBL: { calidad: 94.2, total: 190, buenos: 179, defectuosos: 11 },
        CEFI: { calidad: 94.0, total: 170, buenos: 160, defectuosos: 10 }
    },
    "2026-08-13": {
        MS: { calidad: 79.1, total: 395, buenos: 312, defectuosos: 83 },
        FV: { calidad: 82.5, total: 29, buenos: 24, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 19, buenos: 18, defectuosos: 1 },
        MBL: { calidad: 93.5, total: 185, buenos: 173, defectuosos: 12 },
        CEFI: { calidad: 93.8, total: 168, buenos: 158, defectuosos: 10 }
    },
    "2026-08-12": {
        MS: { calidad: 87.6, total: 440, buenos: 385, defectuosos: 55 },
        FV: { calidad: 85.0, total: 30, buenos: 25, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 215, buenos: 204, defectuosos: 11 },
        CEFI: { calidad: 95.0, total: 190, buenos: 181, defectuosos: 9 }
    },
    "2026-08-11": {
        MS: { calidad: 90.6, total: 460, buenos: 417, defectuosos: 43 },
        FV: { calidad: 86.5, total: 33, buenos: 29, defectuosos: 4 },
        QZ: { calidad: 96.0, total: 22, buenos: 21, defectuosos: 1 },
        MBL: { calidad: 96.0, total: 220, buenos: 211, defectuosos: 9 },
        CEFI: { calidad: 95.5, total: 195, buenos: 186, defectuosos: 9 }
    },
    "2026-08-10": {
        MS: { calidad: 89.3, total: 450, buenos: 402, defectuosos: 48 },
        FV: { calidad: 85.0, total: 31, buenos: 26, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 210, buenos: 200, defectuosos: 10 },
        CEFI: { calidad: 95.0, total: 185, buenos: 176, defectuosos: 9 }
    },
    "2026-08-08": {
        MS: { calidad: 86.3, total: 546, buenos: 471, defectuosos: 75 },
        FV: { calidad: 84.5, total: 35, buenos: 30, defectuosos: 5 },
        QZ: { calidad: 95.0, total: 24, buenos: 23, defectuosos: 1 },
        MBL: { calidad: 95.0, total: 230, buenos: 218, defectuosos: 12 },
        CEFI: { calidad: 95.0, total: 200, buenos: 190, defectuosos: 10 }
    },
    "2026-08-07": {
        MS: { calidad: 85.5, total: 430, buenos: 368, defectuosos: 62 },
        FV: { calidad: 84.0, total: 30, buenos: 25, defectuosos: 5 },
        QZ: { calidad: 94.0, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 94.5, total: 200, buenos: 189, defectuosos: 11 },
        CEFI: { calidad: 94.2, total: 180, buenos: 170, defectuosos: 10 }
    },
    "2026-08-06": {
        MS: { calidad: 82.3, total: 410, buenos: 337, defectuosos: 73 },
        FV: { calidad: 83.0, total: 29, buenos: 24, defectuosos: 5 },
        QZ: { calidad: 93.5, total: 19, buenos: 18, defectuosos: 1 },
        MBL: { calidad: 93.8, total: 195, buenos: 183, defectuosos: 12 },
        CEFI: { calidad: 94.0, total: 175, buenos: 165, defectuosos: 10 }
    },
    "2026-08-05": {
        MS: { calidad: 82.1, total: 405, buenos: 332, defectuosos: 73 },
        FV: { calidad: 82.5, total: 28, buenos: 23, defectuosos: 5 },
        QZ: { calidad: 94.0, total: 18, buenos: 17, defectuosos: 1 },
        MBL: { calidad: 93.5, total: 190, buenos: 178, defectuosos: 12 },
        CEFI: { calidad: 93.5, total: 170, buenos: 159, defectuosos: 11 }
    },
    "2026-08-04": {
        MS: { calidad: 80.7, total: 395, buenos: 319, defectuosos: 76 },
        FV: { calidad: 82.0, total: 27, buenos: 22, defectuosos: 5 },
        QZ: { calidad: 93.0, total: 17, buenos: 16, defectuosos: 1 },
        MBL: { calidad: 93.0, total: 185, buenos: 172, defectuosos: 13 },
        CEFI: { calidad: 93.0, total: 165, buenos: 153, defectuosos: 12 }
    },
    "2026-08-03": {
        MS: { calidad: 82.7, total: 415, buenos: 343, defectuosos: 72 },
        FV: { calidad: 83.5, total: 30, buenos: 25, defectuosos: 5 },
        QZ: { calidad: 94.5, total: 20, buenos: 19, defectuosos: 1 },
        MBL: { calidad: 94.0, total: 195, buenos: 183, defectuosos: 12 },
        CEFI: { calidad: 94.0, total: 175, buenos: 165, defectuosos: 10 }
    },
    "2026-08-01": {
        MS: { calidad: 82.4, total: 400, buenos: 330, defectuosos: 70 },
        FV: { calidad: 83.0, total: 28, buenos: 23, defectuosos: 5 },
        QZ: { calidad: 94.0, total: 18, buenos: 17, defectuosos: 1 },
        MBL: { calidad: 93.5, total: 185, buenos: 173, defectuosos: 12 },
        CEFI: { calidad: 93.5, total: 170, buenos: 159, defectuosos: 11 }
    }
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let fecha = searchParams.get('fecha'); // Formato esperado 'YYYY-MM-DD' o 'DD/MM/YYYY'

    if (!fecha) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        fecha = `${y}-${m}-${d}`;
    }

    // Normalizar formato si viene como DD/MM/YYYY
    if (fecha.includes('/')) {
        const parts = fecha.split('/');
        if (parts.length === 3) {
            fecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // ms_reporte_defectos tiene RLS: se consulta con el token de la sesión del usuario que llama
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
        return NextResponse.json(
            { success: false, error: 'Se requiere la sesión del usuario (Authorization: Bearer <token>)' },
            { status: 401 }
        );
    }

    try {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // MS: cálculo en vivo con la misma lógica del Power BI "BI Calidad MS"
        const [desde, hasta] = rangoDiaUTC(fecha);
        const [rows, catalogo] = await Promise.all([
            fetchMsReportes(client, desde, hasta, 'id, created_at, producto_id, defecto, Reparacion'),
            fetchCatalogoDefectosMs(client)
        ]);
        const resumen = calcularResumen(normalizarPiezas(rows, catalogo));

        // FV: cálculo en vivo desde la lista SharePoint, misma lógica del Power BI "BI Calidad FV"
        let fvLive: CalidadPlanta | null = null;
        try {
            const r = calcularResumenFv(normalizarRegistrosFv(await fetchRegistrosFv(desde.slice(0, 10), hasta.slice(0, 10))));
            fvLive = {
                calidad: Math.round(r.calidad * 10) / 10,
                total: r.piezasRevisadas,
                buenos: r.piezasBuenas,
                defectuosos: r.piezasDefectuosas
            };
        } catch (fvErr) {
            console.warn('Aviso calculando calidad FV desde SharePoint:', fvErr);
        }

        // Las demás plantas aún no tienen fuente en vivo: se mantienen los valores de referencia
        const otrasPlantas = { ...(DAILY_QUALITY_HISTORY[fecha] || DEFAULT_OTRAS_PLANTAS) };
        delete otrasPlantas.MS;
        if (fvLive) otrasPlantas.FV = fvLive;

        return NextResponse.json({
            success: true,
            fecha,
            fuente: 'supabase_live',
            plantas: {
                ...DEFAULT_OTRAS_PLANTAS,
                ...otrasPlantas,
                MS: {
                    calidad: Math.round(resumen.calidad * 10) / 10,
                    total: resumen.piezasRevisadas,
                    buenos: resumen.piezasBuenas,
                    defectuosos: resumen.piezasDefectuosas
                }
            }
        });

    } catch (err: any) {
        console.error("Error al consultar calidad:", err);
        return NextResponse.json(
            { success: false, error: err.message || 'Error calculando calidad' },
            { status: 500 }
        );
    }
}
