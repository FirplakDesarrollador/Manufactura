import { supabase } from '@/lib/supabase'

export interface TrazabilidadDia {
    proceso: string
    h6: number
    h7: number
    h8: number
    h9: number
    h10: number
    h11: number
    h12: number
    h13: number
    h14: number
    h15: number
    h16: number
    h17: number
    h18: number
    h19: number
    h20: number
    h21: number
    h22: number
    h23: number
    total_dia: number
    promedio: number
}

export interface MetricasDia {
    fecha: string
    total_pintura: number
    total_vaciado: number
    grandes: number
    medianas: number
    pequenas: number
    acabado: number
    cedi: number
    desgelcada: number
    vaciado_l1: number
    vaciado_l2: number
    vaciado_l3: number
    pintura_l1: number
    pintura_l2: number
    pintura_l3: number
    transito: number
    digitado: number
    saldo: number
    estanteria: number
    total_programado?: number
    total_cantidad?: number
    kilos_vaciados?: number
}

export interface OrdenFabricacionDetalle {
    id: number
    numero_pedido: string
    orden_fabricacion: string
    cantidad: number
    producto_descripcion: string
    cliente: string
    tamano: string
    ensayo: boolean
    pintura: number
    vaciado: number
    desgelcada: number
    estanteria: number
    pulido: number
    acabado: number
    reparacion: number
    reparacion_larga: number
    saldo: number
    destruccion: number
    empaque: number
    digitado: number
    transito: number
    cedi: number
    programado: number
    moldes_totales: number
    moldes_disponibles: number
    moldes_en_uso: number
}

export interface PinturaColor {
    pintura_fecha: string
    total_pintado: number
    blancas: number
    negras: number
    natural: number
    marfil: number
    granito_perla: number
    otro: number
    // These are placeholders for line breakdowns if needed later
    blanca_l1?: number
    blanca_l2?: number
    blanca_l3?: number
}

export interface VaciadoTamano {
    vaciado_fecha: string
    total_vaciado: number
    grandes: number
    medianas: number
    pequenas: number
    kilos_vaciados: string
    grandes_l1?: number
    medianas_l1?: number
    pequenas_l1?: number
    grandes_l2?: number
    medianas_l2?: number
    pequenas_l2?: number
    grandes_l3?: number
    medianas_l3?: number
    pequenas_l3?: number
}

export interface ProgramacionColor {
    color: string
    total_programado_por_color: number
}

export interface ProgramacionTamano {
    tamano: string
    total_programado_por_tamano: number
}

export async function getTrazabilidadDia(): Promise<TrazabilidadDia[]> {
    const { data, error } = await supabase
        .from('trazabilidad_dia')
        .select('*')
        .order('proceso', { ascending: true })

    if (error) {
        console.error('Error fetching trazabilidad_dia:', error)
        return []
    }

    return data || []
}

export async function getMetricasDiaActual(): Promise<MetricasDia | null> {
    const { data, error } = await supabase
        .from('query_metricas_dia')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching metricas_dia:', error)
        return null
    }

    // Fetch total_cantidad and total_programado from query_ordenes_fabricacion
    const { data: oData, error: oError } = await supabase
        .from('query_ordenes_fabricacion')
        .select('cantidad, programado')

    if (oError) {
        console.error('Error fetching order totals:', oError)
    }

    const totalCantidad = oData?.reduce((sum, item) => sum + (item.cantidad || 0), 0) || 0
    const totalProgramado = oData?.reduce((sum, item) => sum + (item.programado || 0), 0) || 0

    // Fetch kilograms today from query_vaciado_dia_ms
    const { data: vData } = await supabase
        .from('query_vaciado_dia_ms')
        .select('kilos_vaciados')
        .order('vaciado_fecha', { ascending: false })
        .limit(1)
        .single()

    return {
        ...data,
        total_cantidad: totalCantidad,
        total_programado: totalProgramado,
        kilos_vaciados: parseFloat(vData?.kilos_vaciados?.toString() || '0')
    }
}

export async function getOrdenesFabricacionDetalle(): Promise<OrdenFabricacionDetalle[]> {
    const { data, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .order('id', { ascending: false })

    if (error) {
        console.error('Error fetching order details:', error)
        return []
    }

    return data as OrdenFabricacionDetalle[]
}

export async function getPinturaColorHoy(): Promise<PinturaColor | null> {
    // Actually, query_metricas_dia has many more fields than I thought.
    // To get the full breakdown with lines, I should fetch it either from query_pintura_dia_ms 
    // or from the direct view if it has it. 
    // The user's screenshot has "Total, Linea 1, Linea 2, Linea 3"

    const { data, error } = await supabase
        .from('query_metricas_dia')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

    if (error) return null

    // For the "Piezas pintadas hoy por colores" table
    // I need color breakdown BY LINE.
    // query_metricas_dia HAS: blancas, negras, natural... AND blanca_l1, blanca_l2...

    return data
}

export async function getVaciadoTamanoHoy(): Promise<VaciadoTamano | null> {
    const { data, error } = await supabase
        .from('query_metricas_dia')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

    if (error) return null

    return data
}

export async function getProgramacionColores(): Promise<ProgramacionColor[]> {
    const { data, error } = await supabase
        .from('query_programacion_colores')
        .select('*')

    if (error) {
        console.error('Error fetching programacion_colores:', error)
        return []
    }

    return data || []
}

export async function getProgramacionTamanos(): Promise<ProgramacionTamano[]> {
    const { data, error } = await supabase
        .from('query_programacion_tamanos')
        .select('*')

    if (error) {
        console.error('Error fetching programacion_tamanos:', error)
        return []
    }

    return data || []
}
