import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export type ReparacionTab = 'Reparacion' | 'Saldo' | 'Destruccion'

export async function getRegistrosReparacion(tab: ReparacionTab): Promise<RegistroTrazabilidad[]> {
    let query = supabase
        .from('query_trazabilidad_ms')
        .select('*')

    if (tab === 'Reparacion') {
        query = query.in('estado', ['Reparacion', 'Reparacion_larga'])
    } else {
        query = query.eq('estado', tab)
    }

    const { data, error } = await query.order('pintura_fecha', { ascending: true })

    if (error) {
        console.error(`Error fetching registros para ${tab}:`, error)
        return []
    }

    return data || []
}

export async function registrarAccionReparacion(registroId: number, usuarioEmail: string, nuevoEstado: string) {
    const { data, error } = await supabase
        .from('registros_reparacion')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            estado_destino: nuevoEstado,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando acción de reparación:', error)
        throw error
    }

    return data
}
