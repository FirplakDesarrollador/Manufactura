import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

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
    // Acabado = UPDATE trazabilidad_ms: acabado_fecha, acabado_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: nuevoEstado,
            acabado_fecha: new Date().toISOString(),
            acabado_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar acabado: [${error.code}] ${error.message}`)
    }

    return data
}
