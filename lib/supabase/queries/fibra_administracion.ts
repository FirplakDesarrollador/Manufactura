import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'

export async function updateOrdenFabricacion(id: number, data: Partial<OrdenFabricacion>) {
    // Only allow fields that exist in the actual table
    const allowedKeys = [
        'numero_pedido',
        'orden_fabricacion',
        'cantidad',
        'fecha_entrega_estimada',
        'pendiente',
        'fecha_entrega_real',
        'modificado_por',
        'cliente',
        'producto_sku',
        'ensayo',
        'fecha_ideal_produccion',
        'comentario',
        'Prioridad_OF'
    ]

    const filteredData = Object.keys(data)
        .filter(key => allowedKeys.includes(key))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((obj, key) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any)[key] = (data as any)[key];
            return obj;
        }, {} as Partial<OrdenFabricacion>);

    const { error } = await supabase
        .from('ordenes_fabricacion')
        .update(filteredData)
        .eq('id', id)

    if (error) {
        console.error('Error updating orden fabricacion:', error)
        throw error
    }
}

export async function deleteOrdenFabricacion(id: number) {
    const { error } = await supabase
        .from('ordenes_fabricacion')
        .update({
            pendiente: false,
            modificado_por: 'Eliminado/Cancelado por Usuario App'
        })
        .eq('id', id)

    if (error) {
        console.error('Error deleting orden fabricacion:', error)
        throw error
    }
}

export async function updateRegistroTrazabilidad(idOrRegistrer: string | number, data: Partial<RegistroTrazabilidad>) {
    const allowedKeys = [
        'pintura_fecha',
        'orden_fabricacion_id',
        'molde_id',
        'pintura_user_id',
        'pintura_linea',
        'vaciado_fecha',
        'vaciado_user_id',
        'contramolde',
        'contramolde_fecha',
        'contramolde_user_id',
        'pulido_fecha',
        'pulido_user_id',
        'enviar_reparar_molde',
        'reparacion_fecha',
        'reparacion_user_id',
        'empaque_fecha',
        'empaque_user_id',
        'cedi_fecha',
        'cedi_user_id',
        'digitado_user_id',
        'digitado_fecha',
        'transito_fecha',
        'transito_user_id',
        'acabado_user_id',
        'acabado_fecha',
        'saldo_user_id',
        'saldo_fecha',
        'vaciado_linea',
        'registrer',
        'estado',
        'destruccion_user_id',
        'destruccion_fecha',
        'estanteria_user_id',
        'estanteria_fecha',
        'kilos_vaciados',
        'vaciado_maquina'
    ]

    const filteredData = Object.keys(data)
        .filter(key => allowedKeys.includes(key))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((obj, key) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any)[key] = (data as any)[key];
            return obj;
        }, {} as Partial<RegistroTrazabilidad>);

    const { error } = await supabase
        .from('trazabilidad_fv')
        .update(filteredData)
        .eq('registrer', String(idOrRegistrer))

    if (error) {
        console.error('Error updating registro trazabilidad:', error)
        throw error
    }
}

export async function deleteRegistroTrazabilidad(idOrRegistrer: string | number) {
    const { error } = await supabase
        .from('trazabilidad_fv')
        .delete()
        .eq('registrer', String(idOrRegistrer))

    if (error) {
        console.error('Error deleting registro trazabilidad:', error)
        throw error
    }
}

// Movimiento manual desde el Mapa de procesos FV: pasa todas las piezas de una OF que están en los estados de origen
// al estado de destino y deja la fecha y el usuario del movimiento en los campos de ese proceso (trazabilidad).
export const DESTINOS_MOVIMIENTO_FV = {
    pulido: { estado: 'Pulido', fecha: 'pulido_fecha', usuario: 'pulido_user_id' },
    ensayo: { estado: 'Ensayo', fecha: 'acabado_fecha', usuario: 'acabado_user_id' },
    reparacion: { estado: 'Reparacion', fecha: 'reparacion_fecha', usuario: 'reparacion_user_id' },
    huacales: { estado: 'Guacales', fecha: 'empaque_fecha', usuario: 'empaque_user_id' },
    digitado: { estado: 'Digitado', fecha: 'digitado_fecha', usuario: 'digitado_user_id' },
    transito: { estado: 'Transito', fecha: 'transito_fecha', usuario: 'transito_user_id' },
    cedi: { estado: 'Cedi', fecha: 'cedi_fecha', usuario: 'cedi_user_id' }
} as const
export type DestinoMovimientoFv = keyof typeof DESTINOS_MOVIMIENTO_FV

export async function moverPiezasOrdenFibra(ordenId: number, estadosOrigen: string[], destino: DestinoMovimientoFv, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)
    const d = DESTINOS_MOVIMIENTO_FV[destino]

    const { data: piezas, error: errorPiezas } = await supabase
        .from('trazabilidad_fv')
        .select('registrer, estado, molde_id')
        .eq('orden_fabricacion_id', ordenId)
        .in('estado', estadosOrigen)
    if (errorPiezas) throw new Error(`No se pudieron leer las piezas de la orden: [${errorPiezas.code}] ${errorPiezas.message}`)
    if (!piezas || piezas.length === 0) throw new Error(`La orden no tiene piezas registradas en ${estadosOrigen.join(' / ')}.`)

    const { data: movidas, error } = await supabase
        .from('trazabilidad_fv')
        .update({ estado: d.estado, [d.fecha]: new Date().toISOString(), [d.usuario]: userId })
        .in('registrer', piezas.map(p => p.registrer))
        .select('registrer')
    if (error) throw new Error(`No se pudo mover la orden: [${error.code}] ${error.message}`)
    if (!movidas || movidas.length !== piezas.length) {
        throw new Error(`Solo se movieron ${movidas?.length || 0} de ${piezas.length} pieza(s). Revise los permisos o vuelva a intentar.`)
    }

    // Al salir de vaciado se libera el molde, igual que en Pulido
    for (const p of piezas) if (p.estado === 'Vaciado' && p.molde_id) await liberarMolde(p.molde_id, usuarioEmail)

    return movidas.length
}
