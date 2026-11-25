import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularDia, normalizarRegistro } from './rmold'
import { PLANTAS_CALIDAD } from '@/lib/calidad/plantasCalidadConfig'
import { calcularResumen, fetchCatalogoDefectosMs, fetchMsReportes, normalizarPiezas, rangoDiaUTC } from '@/lib/calidad/msCalidad'

// Indicadores de RMOLD de un día para el Tablero de Control (recuadros de la planta RMOLD), en automático:
//  - Cierre diario de RMOLD (rmold_registros, el mismo del tablero RMOLD): moldes reparados vs meta, nivel de servicio
//    (entregados ÷ esperados) y personas (presentes + ausentes → presentismo)
//  - Calidad RMOLD (rmold_reporte_defectos): piezas buenas ÷ revisadas del día
// Si el día no tiene cierre o inspecciones se devuelve null (el tablero lo muestra "sin dato", nunca un valor inventado).
export interface IndicadoresRmoldDia {
    cierre: { moldes: number; meta: number; productividad: number | null; nivelServicio: number | null; personas: number; ausentes: number } | null
    calidad: { calidad: number; revisadas: number } | null
}

export async function indicadoresRmoldDia(sb: SupabaseClient, fecha: string): Promise<IndicadoresRmoldDia> {
    const rmold = PLANTAS_CALIDAD.rmold
    const [cierreRes, calidadRes] = await Promise.allSettled([
        sb.from('rmold_registros').select('*').eq('fecha', fecha).maybeSingle(),
        (async () => {
            const [desde, hasta] = rangoDiaUTC(fecha)
            const [rows, catalogo] = await Promise.all([
                fetchMsReportes(sb, desde, hasta, 'id, created_at, producto_id, defecto, Reparacion', {}, rmold),
                fetchCatalogoDefectosMs(sb, rmold)
            ])
            return calcularResumen(normalizarPiezas(rows, catalogo, undefined, rmold))
        })()
    ])

    let cierre: IndicadoresRmoldDia['cierre'] = null
    if (cierreRes.status === 'fulfilled' && cierreRes.value.data) {
        const r = normalizarRegistro(cierreRes.value.data)
        const c = calcularDia(r)
        cierre = {
            moldes: Math.round(c.total * 10) / 10,
            meta: r.meta || 0,
            productividad: c.productividad,
            nivelServicio: c.ns,
            personas: r.personas || 0,
            ausentes: r.ausentes ?? 0
        }
    }
    let calidad: IndicadoresRmoldDia['calidad'] = null
    if (calidadRes.status === 'fulfilled' && calidadRes.value.piezasRevisadas > 0) {
        calidad = { calidad: Math.round(calidadRes.value.calidad * 10) / 10, revisadas: calidadRes.value.piezasRevisadas }
    }
    return { cierre, calidad }
}
