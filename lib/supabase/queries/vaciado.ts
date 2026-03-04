import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad, KilosReferencia } from '@/types/pintura'

export async function getRegistrosParaVaciado(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Pintura')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para vaciado:', error)
        return []
    }

    return data || []
}

export async function getKilosReferencia(): Promise<KilosReferencia[]> {
    const { data, error } = await supabase
        .from('query_kilos_referencia')
        .select('*')
        .order('producto_sku', { ascending: true })

    if (error) {
        console.error('Error fetching kilos referencia:', error)
        return []
    }

    return data || []
}

export async function registrarVaciado(registroId: number, usuarioEmail: string) {
    // Assuming a registros_vaciado table exists or updating the existing traceability record
    const { data, error } = await supabase
        .from('registros_vaciado')
        .insert({
            trazabilidad_id: registroId,
            usuario_email: usuarioEmail,
            fecha: new Date().toISOString()
        })
        .select()

    if (error) {
        console.error('Error registrando vaciado:', error)
        throw error
    }

    return data
}
