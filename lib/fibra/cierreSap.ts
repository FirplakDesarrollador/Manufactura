import { supabase } from '@/lib/supabase'

// Piezas FV de órdenes cerradas en SAP (no por la app): la función fv_barrer_of_cerradas_sap (fibra_cierre_sap.sql)
// las pasa a CEDI con la fecha del cierre y deja el motivo en movimientos_fv (origen 'sap').
// La llaman los crons de órdenes liberadas y de cada hora, y el botón de la tarjeta de la pieza.
export type PiezaCerradaSap = { of: string; registrer: string; estado_antes: string }

export async function barrerOfCerradasSap(): Promise<PiezaCerradaSap[]> {
    const { data, error } = await supabase.rpc('fv_barrer_of_cerradas_sap')
    if (error) {
        throw new Error(/fv_barrer_of_cerradas_sap|schema cache|function/i.test(error.message)
            ? 'Falta la función del cierre en SAP: ejecute fibra_cierre_sap.sql en Supabase.'
            : `No se pudieron retirar las piezas de órdenes cerradas en SAP: ${error.message}`)
    }
    return (data || []) as PiezaCerradaSap[]
}

// Mensaje de cierre en SAP de una pieza (para su trazabilidad), o null si no salió por cierre en SAP
export async function cierreSapDePieza(registrer: string): Promise<{ fecha: string; motivo: string } | null> {
    const { data } = await supabase.from('movimientos_fv').select('created_at, detalle')
        .eq('registrer', registrer).eq('accion', 'cierre_sap').order('created_at', { ascending: false }).limit(1)
    const f = data?.[0]
    if (!f) return null
    const d = (f.detalle || {}) as { fecha_cierre?: string; motivo?: string }
    return { fecha: d.fecha_cierre || f.created_at, motivo: d.motivo || 'OF cerrada en SAP' }
}

// Últimas piezas retiradas por cierre en SAP (aviso en Administración)
export type FilaCierreSap = { created_at: string; registrer: string | null; orden_fabricacion: string | null; estado_antes: string | null; molde_serial: string | null }
export async function piezasRetiradasPorSap(dias = 15): Promise<FilaCierreSap[]> {
    const { data, error } = await supabase.from('movimientos_fv')
        .select('created_at, registrer, orden_fabricacion, estado_antes, molde_serial')
        .eq('accion', 'cierre_sap').gte('created_at', new Date(Date.now() - dias * 86400000).toISOString())
        .order('created_at', { ascending: false }).limit(200)
    if (error) return []
    return (data || []) as FilaCierreSap[]
}
