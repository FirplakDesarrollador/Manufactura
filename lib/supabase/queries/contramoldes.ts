import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export async function getRegistrosSinContramolde(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('contramolde', false)
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros sin contramolde:', error)
        return []
    }

    return data || []
}

export async function registrarContramolde(registroId: number, usuarioEmail: string) {
    // Asumiendo que existe una tabla registros_contramolde
    const { data, error } = await supabase
        .from('registros_contramolde')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando contramolde:', error)
        throw error
    }

    return data
}
