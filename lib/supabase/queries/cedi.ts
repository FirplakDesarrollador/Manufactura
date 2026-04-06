import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosTransito(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Transito')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros en transito:', error)
        return []
    }

    return data || []
}

export async function marcarTodoComoCedi(usuarioEmail: string) {
    // Buscar todos los registros en 'Transito' y pasarlos a 'Cedi'
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Cedi',
            cedi_fecha: new Date().toISOString(),
            cedi_user_id: userId
        })
        .eq('estado', 'Transito')
        .select()

    if (error) {
        console.error('Error marcando registros para Cedi:', error)
        throw new Error(`Error en Cedi: [${error.code}] ${error.message}`)
    }

    return data
}

export async function registrarCedi(registroId: number, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)

    const { error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Cedi',
            cedi_fecha: new Date().toISOString(),
            cedi_user_id: userId
        })
        .eq('id', registroId)

    if (error) {
        console.error('Error registrando Cedi:', error)
        throw new Error(`Error en Cedi: [${error.code}] ${error.message}`)
    }
}

export async function reversarCedi(registroId: number) {
    const { error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Transito',
            cedi_fecha: null,
            cedi_user_id: null
        })
        .eq('id', registroId)

    if (error) {
        console.error('Error reversando Cedi:', error)
        throw new Error(`Error al reversar Cedi: [${error.code}] ${error.message}`)
    }
}
