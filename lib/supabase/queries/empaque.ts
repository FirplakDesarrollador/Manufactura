import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

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
    const { data, error } = await supabase
        .from('registros_empaque')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando empaque:', error)
        throw error
    }

    return data
}
