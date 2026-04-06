import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosSinContramolde(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('contramolde', true) // Only show if contramolde is marked as true in pintura
        .is('contramolde_fecha', null) // And not yet processed
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros sin contramolde:', error)
        return []
    }

    return data || []
}

export async function registrarContramolde(registroId: number, usuarioEmail: string) {
    // Contramolde = UPDATE trazabilidad_ms: contramolde_fecha, contramolde_user_id
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            contramolde_fecha: new Date().toISOString(),
            contramolde_user_id: userId
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar contramolde: [${error.code}] ${error.message}`)
    }

    return data
}
