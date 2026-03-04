import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export async function getRegistrosParaDesmolde(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Vaciado')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para desmolde:', error)
        return []
    }

    return data || []
}

export async function registrarDesmolde(registroId: number, usuarioEmail: string) {
    const { data, error } = await supabase
        .from('registros_desmolde')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando desmolde:', error)
        throw error
    }

    return data
}
