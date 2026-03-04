import { supabase } from '@/lib/supabase'

export async function moverTransitoACedi(usuarioEmail: string) {
    // 1. Get user ID from email (assuming users table exists as per FF logic)
    const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioEmail)
        .single()

    if (userError) throw userError

    // 2. Update all records in 'Transito' to 'Cedi'
    const { data, error } = await supabase
        .from('registros_trazabilidad')
        .update({
            estado: 'Cedi',
            cedi_fecha: new Date().toISOString(),
            cedi_user_id: userData.id
        })
        .eq('estado', 'Transito')
        .select()

    if (error) throw error
    return data
}

export async function registrarCediIndividual(registroId: number, usuarioEmail: string) {
    const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', usuarioEmail)
        .single()

    if (userError) throw userError

    const { error } = await supabase
        .from('registros_trazabilidad')
        .update({
            estado: 'Cedi',
            cedi_fecha: new Date().toISOString(),
            cedi_user_id: userData.id
        })
        .eq('id', registroId)

    if (error) throw error
}

export async function reversarCedi(registroId: number) {
    const { error } = await supabase
        .from('registros_trazabilidad')
        .update({
            estado: 'Transito',
            cedi_fecha: null,
            cedi_user_id: null
        })
        .eq('id', registroId)

    if (error) throw error
}
