import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'

export async function getOrdenesFabricacion(): Promise<OrdenFabricacion[]> {
    const { data, error } = await supabase
        .from('query_ordenes_fabricacion')
        .select('*')
        .order('fecha_entrega_estimada', { ascending: true })

    if (error) {
        console.error('Error fetching ordenes fabricacion:', error)
        return []
    }

    return data || []
}

export async function getRegistrosTrazabilidad(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros trazabilidad:', error)
        return []
    }

    return data || []
}

export async function getMoldesDisponibles(moldeSku: string): Promise<Molde[]> {
    const { data, error } = await supabase
        .from('query_moldes')
        .select('*')
        .eq('estado', 'Disponible')
        .eq('molde_sku', moldeSku)
        .order('vueltas_actuales', { ascending: true })

    if (error) {
        console.error('Error fetching moldes disponibles:', error)
        return []
    }

    return data || []
}

export async function registrarPintura(pinturaData: {
    orden_fabricacion_id: number
    molde_id: number
    linea: string
    usuario_email: string
}) {
    const { data, error } = await supabase
        .from('registros_pintura')
        .insert({
            orden_fabricacion_id: pinturaData.orden_fabricacion_id,
            molde_id: pinturaData.molde_id,
            linea: pinturaData.linea,
            usuario_email: pinturaData.usuario_email,
            fecha: new Date().toISOString(),
        })
        .select()

    if (error) {
        console.error('Error registrando pintura:', error)
        throw error
    }

    return data
}
