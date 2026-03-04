import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export async function getRegistrosParaPulido(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Pulido')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para pulido:', error)
        return []
    }

    return data || []
}

export async function registrarPulido(registroId: number, usuarioEmail: string, nuevoEstado: string) {
    const { data, error } = await supabase
        .from('registros_pulido')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            estado_destino: nuevoEstado,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando pulido:', error)
        throw error
    }

    return data
}
