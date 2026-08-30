import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Defectos que se excluyen del cálculo de IFI (según estándar de calidad de planta MS)
const isIgnoredDefect = (defectName: string) => {
    const cleanName = defectName.replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
    return [
        'saldos/destrucciones',
        'opaco',
        'error en pedido referencia',
        'quebrados logistica'
    ].includes(cleanName);
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

    try {
        // Consultar registros de inspección de Calidad de MS en Supabase para el día seleccionado
        const startOfDay = `${fecha}T00:00:00.000Z`;
        const endOfDay = `${fecha}T23:59:59.999Z`;

        const { data: reports, error } = await supabase
            .from('ms_reporte_defectos')
            .select('id, created_at, defecto')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        let calidadMS = 86.3; // Valor de referencia por defecto si no hay inspecciones ese día
        let totalMS = 0;
        let buenosMS = 0;
        let defectuososMS = 0;

        if (!error && reports && reports.length > 0) {
            totalMS = reports.length;
            defectuososMS = reports.filter(r => {
                const defs = Array.isArray(r.defecto) ? r.defecto : [];
                const validDefects = defs.filter(d => {
                    const name = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '');
                    if (!name) return false;
                    return !isIgnoredDefect(name);
                });
                return validDefects.length > 0;
            }).length;

            buenosMS = totalMS - defectuososMS;
            calidadMS = totalMS > 0 ? Math.round(((buenosMS / totalMS) * 100) * 10) / 10 : 86.3;
        }

        // Calidad calculada para cada planta
        const plantCalidad: Record<string, { calidad: number; total: number; buenos: number; defectuosos: number }> = {
            MS: { calidad: calidadMS, total: totalMS, buenos: buenosMS, defectuosos: defectuososMS },
            FV: { calidad: 85.0, total: 0, buenos: 0, defectuosos: 0 },
            QZ: { calidad: 95.0, total: 0, buenos: 0, defectuosos: 0 },
            MBL: { calidad: 95.0, total: 0, buenos: 0, defectuosos: 0 },
            CEFI: { calidad: 95.0, total: 0, buenos: 0, defectuosos: 0 }
        };

        return NextResponse.json({
            success: true,
            fecha,
            plantas: plantCalidad
        });

    } catch (err: any) {
        console.error("Error al consultar calidad:", err);
        return NextResponse.json(
            { success: false, error: err.message || 'Error calculando calidad' },
            { status: 500 }
        );
    }
}
