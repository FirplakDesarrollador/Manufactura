import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

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
    // Digitado = UPDATE trazabilidad_ms: digitado_fecha, digitado_user_id, estado -> 'Transito'
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Transito',
            digitado_fecha: new Date().toISOString(),
            digitado_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar digitado: [${error.code}] ${error.message}`)
    }

    return data
}

export async function reversarDigitado(registroId: number) {
    // Reversar = Volver a Empaque
    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Empaque',
            digitado_fecha: null,
            digitado_user_id: null
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        console.error('Error reversando digitado:', error)
        throw new Error(`Error al reversar digitado: [${error.code}] ${error.message}`)
    }

    return data
}
