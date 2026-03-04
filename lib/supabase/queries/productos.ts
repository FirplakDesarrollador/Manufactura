import { supabase } from '@/lib/supabase'
import { ProductoMS } from '@/types/pintura'

export async function getProductosMS(): Promise<ProductoMS[]> {
    const { data, error } = await supabase
        .from('query_productos_ms')
        .select('*')
        .order('producto_descripcion', { ascending: true })

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    return data || []
}

export async function updateProductosBulk(
    ids: number[],
    data: {
        porcentaje_reduccion?: number,
        kilos_reduccion?: number,
        modified_by: string
    }
) {
    const updatePayload: any = {
        modified_at: new Date().toISOString(),
        modified_by: data.modified_by
    }

    if (data.porcentaje_reduccion !== undefined) {
        updatePayload.porcentaje_reduccion = data.porcentaje_reduccion
    }

    if (data.kilos_reduccion !== undefined) {
        updatePayload.kilos_reduccion = data.kilos_reduccion
    }

    const { data: result, error } = await supabase
        .from('productos')
        .update(updatePayload)
        .in('id', ids)
        .select()

    if (error) {
        console.error('Error updating products bulk:', error)
        throw error
    }

    return result
}
