import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaEmpaque(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Acabado')
        .order('acabado_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para empaque:', error)
        return []
    }

    return data || []
}

export async function registrarEmpaque(registroId: number, usuarioEmail: string) {
    // Empaque = UPDATE trazabilidad_ms: empaque_fecha, empaque_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Empaque',
            empaque_fecha: new Date().toISOString(),
            empaque_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar empaque: [${error.code}] ${error.message}`)
    }

    return data
}
