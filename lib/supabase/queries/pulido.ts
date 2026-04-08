import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaPulido(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Desgelcada')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para pulido:', error)
        return []
    }

    return data || []
}

export async function registrarPulido(registroId: number, usuarioEmail: string, nuevoEstado: string) {
    // Pulido = UPDATE trazabilidad_ms: pulido_fecha, pulido_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: nuevoEstado,
            pulido_fecha: new Date().toISOString(),
            pulido_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar pulido: [${error.code}] ${error.message}`)
    }

    return data
}
