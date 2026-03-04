import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export async function getRegistrosAcabado(estado: 'Acabado' | 'Estanteria'): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', estado)
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error(`Error fetching registros para ${estado}:`, error)
        return []
    }

    return data || []
}

export async function registrarAcabado(registroId: number, usuarioEmail: string, nuevoEstado: string) {
    const { data, error } = await supabase
        .from('registros_acabado')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            estado_destino: nuevoEstado,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando acabado:', error)
        throw error
    }

    return data
}
