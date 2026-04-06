import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

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
    // Reparacion = UPDATE trazabilidad_ms: reparacion_fecha, reparacion_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: nuevoEstado,
            reparacion_fecha: new Date().toISOString(),
            reparacion_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar reparación: [${error.code}] ${error.message}`)
    }

    return data
}
