import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'

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
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting orden fabricacion:', error)
        throw error
    }
}

export async function updateRegistroTrazabilidad(id: number, data: Partial<RegistroTrazabilidad>) {
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
        .from('trazabilidad_ms')
        .update(filteredData)
        .eq('id', id)

    if (error) {
        console.error('Error updating registro trazabilidad:', error)
        throw error
    }
}

export async function deleteRegistroTrazabilidad(id: number) {
    const { error } = await supabase
        .from('trazabilidad_ms')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting registro trazabilidad:', error)
        throw error
    }
}
