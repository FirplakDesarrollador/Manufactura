import { supabase } from '@/lib/supabase'

// Proceso actual de cada unidad de las OF de Fibra (control de piso de la app), para el arqueo y Prioridades.
// Una pieza ubicada en una mesa del Mapa de procesos se reporta por su ubicación física (p. ej. "Ensamble 1");
// si no tiene mesa, por el proceso de su estado. Las unidades aún sin pieza registrada son "Programado".

// Prefijo de la mesa (mesa_fv = "<zona>-<n>") → ubicación física
const LUGAR_MESA: Record<string, string> = {
    pintura: 'Pintura', curadop: 'Zona Curado', curadov: 'Zona Curado', vaciado: 'Vaciado',
    desmolde: 'Desmolde · Herrajes · Nivelación', pulido: 'Pulido', acabado: 'Acabado 1',
    ensamble1: 'Ensamble 1', ensamble2: 'Ensamble 2', ensayo: 'Ensayo', acabado2: 'Acabado 2',
    huacales: 'Huacales', reparacion: 'Reparación', digitado: 'Digitado', transito: 'Tránsito', cedi: 'CEDI'
}
// Estado de la pieza → proceso (cuando no tiene mesa)
const LUGAR_ESTADO: Record<string, string> = {
    Pintura: 'Pintura', Desgelcada: 'Desgelcada', Vaciado: 'Vaciado', Estanteria: 'Estantería', Pulido: 'Pulido',
    Ensayo: 'Ensayo', Acabado: 'Ensayo', Guacales: 'Huacales', Empaque: 'Digitado', Reparacion: 'Reparación', Reparacion_larga: 'Reparación',
    Digitado: 'Digitado', Transito: 'Tránsito', Cedi: 'CEDI', Saldo: 'Saldo', Destruccion: 'Destrucción'
}

// Mesas válidas para cada estado (mismos tramos del mapa): una mesa vieja de otro tramo no cuenta
const MESAS_ESTADO: Record<string, string[]> = {
    Pintura: ['pintura', 'curadop', 'vaciado'],
    Vaciado: ['curadov', 'desmolde', 'pulido'], Desgelcada: ['curadov', 'desmolde', 'pulido'], Pulido: ['curadov', 'desmolde', 'pulido'],
    Ensayo: ['acabado', 'ensamble1', 'ensamble2', 'ensayo'], Acabado: ['acabado', 'ensamble1', 'ensamble2', 'ensayo'],
    Guacales: ['acabado2', 'huacales'], Reparacion: ['reparacion'], Reparacion_larga: ['reparacion']
}

const lugarPieza = (estado: string, mesa: string | null) => {
    const prefijo = mesa ? mesa.split('-')[0] : ''
    const mesaValida = !!prefijo && (MESAS_ESTADO[estado] || []).includes(prefijo)
    return (mesaValida && LUGAR_MESA[prefijo]) || LUGAR_ESTADO[estado] || `Estado "${estado}" sin proceso conocido`
}

// OF (número) → proceso de cada unidad, una por posición. Falla con error si no puede leer la app.
export async function procesosActualesFv(): Promise<Map<string, string[]>> {
    const { data: ordenes, error } = await supabase
        .from('ordenes_fabricacion_fv')
        .select('id, orden_fabricacion, cantidad, cantidad_programada')
    if (error) throw new Error(`No se pudieron leer las órdenes de Fibra de la app: ${error.message}`)

    const piezasPorOrden = new Map<number, { estado: string; mesa: string | null }[]>()
    const ids = (ordenes || []).map(o => o.id)
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error: errorPiezas } = await supabase
            .from('trazabilidad_fv')
            .select('orden_fabricacion_id, estado, mesa_fv, pintura_fecha')
            .in('orden_fabricacion_id', ids.slice(i, i + 200))
            .order('pintura_fecha', { ascending: true })
        if (errorPiezas) throw new Error(`No se pudieron leer las piezas de Fibra de la app: ${errorPiezas.message}`)
        for (const p of data || []) {
            const lista = piezasPorOrden.get(p.orden_fabricacion_id) || []
            lista.push({ estado: p.estado, mesa: p.mesa_fv ?? null })
            piezasPorOrden.set(p.orden_fabricacion_id, lista)
        }
    }

    const resultado = new Map<string, string[]>()
    for (const o of ordenes || []) {
        const piezas = piezasPorOrden.get(o.id) || []
        const cantidad = Math.max(0, o.cantidad || o.cantidad_programada || 0)
        const procesos = piezas.map(p => lugarPieza(p.estado, p.mesa))
        for (let n = procesos.length; n < cantidad; n++) procesos.push('Programado')
        resultado.set(String(o.orden_fabricacion ?? '').trim(), procesos)
    }
    return resultado
}
