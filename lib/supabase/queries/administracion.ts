import { supabase } from '@/lib/supabase'

export async function updateOrdenFabricacion(id: number, data: any) {
    const { error } = await supabase
        .from('ordenes_fabricacion')
        .update(data)
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

export async function updateRegistroTrazabilidad(id: number, data: any) {
    const { error } = await supabase
        .from('trazabilidad_ms')
        .update(data)
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
