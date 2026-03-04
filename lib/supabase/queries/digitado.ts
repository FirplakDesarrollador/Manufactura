import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'

export async function getRegistrosParaDigitado(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Empaque')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para digitado:', error)
        return []
    }

    return data || []
}

export async function registrarDigitado(registroId: number, usuarioEmail: string) {
    const { data, error } = await supabase
        .from('registros_digitado')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando digitado:', error)
        throw error
    }

    return data
}

export async function reversarDigitado(registroId: number) {
    // Logic to remove from registros_digitado or update state back to Pulido/Empaque
    // This depends on the triggers in Supabase, but here we just need to hit the right table
    const { data, error } = await supabase
        .from('registros_digitado')
        .delete()
        .eq('trazabilidad_id', registroId)

    if (error) {
        console.error('Error reversando digitado:', error)
        throw error
    }

    return data
}
