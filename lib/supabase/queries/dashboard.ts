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
    [key: string]: string | number | undefined
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
    [key: string]: string | number | undefined
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
    const now = new Date()
    const offset = -5 // Colombia
    const localDate = new Date(now.getTime() + (offset * 3600000))
    const todayStr = localDate.toISOString().split('T')[0]

    // 1. Fetch current summary from view (for estanteria/legacy fields)
    const { data: qData } = await supabase
        .from('query_metricas_dia')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

    // 2. Fetch ALL orders for summary totals
    const { data: oData } = await supabase
        .from('query_ordenes_fabricacion')
        .select('cantidad, programado, saldo, digitado, transito, estanteria')
        .limit(3000)

    const totalCantidad = oData?.reduce((sum, item) => sum + (item.cantidad || 0), 0) || 0
    const totalProgramado = oData?.reduce((sum, item) => sum + (item.programado || 0), 0) || 0
    const totalSaldo = oData?.reduce((sum, item) => sum + (item.saldo || 0), 0) || 0
    const totalDigitado = oData?.reduce((sum, item) => sum + (item.digitado || 0), 0) || 0
    const totalTransito = oData?.reduce((sum, item) => sum + (item.transito || 0), 0) || 0
    const totalEstanteria = oData?.reduce((sum, item) => sum + (item.estanteria || 0), 0) || 0

    // 3. Fetch TODAY'S registries for real-time counts
    const { data: rData } = await supabase
        .from('query_trazabilidad_ms')
        .select('*') 
        .or(`pintura_fecha.gte.${todayStr},vaciado_fecha.gte.${todayStr},cedi_fecha.gte.${todayStr},digitado_fecha.gte.${todayStr}`)
        .limit(4000)

    const todayR = rData || []
    const isTodayStr = (d: string | null) => d && d.startsWith(todayStr)

    // Stage filters
    const pToday = todayR.filter(r => isTodayStr(r.pintura_fecha))
    const vToday = todayR.filter(r => isTodayStr(r.vaciado_fecha))
    const cToday = todayR.filter(r => isTodayStr(r.cedi_fecha) && r.estado === 'Cedi')
    const aToday = pToday.filter(r => ['Pulido', 'Acabado', 'Empaque', 'Digitado', 'Transito', 'Cedi'].includes(r.estado || ''))

    // Helper for breakdowns
    const sumBy = (arr: any[], key: string, val: string) => arr.filter(r => r[key] === val).length

    const metrics: any = {
        fecha: todayStr,
        total_pintura: pToday.length,
        pintura_l1: sumBy(pToday, 'pintura_linea', 'Linea 1'),
        pintura_l2: sumBy(pToday, 'pintura_linea', 'Linea 2'),
        pintura_l3: sumBy(pToday, 'pintura_linea', 'Linea 3'),
        total_vaciado: vToday.length,
        vaciado_l1: sumBy(vToday, 'vaciado_linea', 'Linea 1'),
        vaciado_l2: sumBy(vToday, 'vaciado_linea', 'Linea 2'),
        vaciado_l3: sumBy(vToday, 'vaciado_linea', 'Linea 3'),
        grandes: sumBy(vToday, 'producto_tamano', 'Grande'),
        medianas: sumBy(vToday, 'producto_tamano', 'Mediana'),
        pequenas: sumBy(vToday, 'producto_tamano', 'Pequena'),
        desgelcada: vToday.filter(r => r.estado === 'Desgelcado').length,
        acabado: aToday.length,
        cedi: cToday.length,
        estanteria: totalEstanteria || qData?.estanteria || 0,
        saldo: totalSaldo,
        digitado: totalDigitado,
        transito: totalTransito,
        total_cantidad: totalCantidad,
        total_programado: totalProgramado,
        kilos_vaciados: vToday.reduce((acc, r: any) => {
            const w = parseFloat(r.kilos_vaciados) || parseFloat(r.molde_masa_teorica) || 0
            return acc + w
        }, 0)
    }

    // Add colors breakdown (matching UPPERCASE in DB)
    const colorFields: Record<string, string> = {
        'BLANCO': 'blancas', 'NATURAL': 'natural', 'MARFIL': 'marfil',
        'GRIS BRUMA': 'gris_bruma', 'GRIS': 'gris', 'GRIS SOMBRA': 'gris_sombra',
        'GRIS NIEBLA': 'gris_niebla', 'GRANITO CHAMPANA': 'granito_champana',
        'GRANITO GRIS': 'granito_gris', 'GRANITO NEGRO': 'granito_negro',
        'GRANITO PERLA': 'granito_perla', 'GRANITO BLANCO': 'granito_blanco',
        'GRANITO MARFIL': 'granito_marfil', 'NEGRO': 'negras'
    }

    Object.entries(colorFields).forEach(([dbVal, field]) => {
        const filtered = pToday.filter(r => r.producto_color === dbVal)
        metrics[field] = filtered.length
        metrics[`${field}_l1`] = sumBy(filtered, 'pintura_linea', 'Linea 1')
        metrics[`${field}_l2`] = sumBy(filtered, 'pintura_linea', 'Linea 2')
        metrics[`${field}_l3`] = sumBy(filtered, 'pintura_linea', 'Linea 3')
    })
    
    // Add size line breakdowns
    const sizes = [
        { db: 'Grande', key: 'grandes' },
        { db: 'Mediana', key: 'medianas' },
        { db: 'Pequena', key: 'pequenas' }
    ]
    sizes.forEach(s => {
        const filtered = vToday.filter(r => r.producto_tamano === s.db)
        metrics[`${s.key}_l1`] = sumBy(filtered, 'vaciado_linea', 'Linea 1')
        metrics[`${s.key}_l2`] = sumBy(filtered, 'vaciado_linea', 'Linea 2')
        metrics[`${s.key}_l3`] = sumBy(filtered, 'vaciado_linea', 'Linea 3')
    })

    return metrics as MetricasDia
}

export async function getPinturaColorHoy(): Promise<PinturaColor | null> {
    return getMetricasDiaActual() as any
}

export async function getVaciadoTamanoHoy(): Promise<VaciadoTamano | null> {
    return getMetricasDiaActual() as any
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
