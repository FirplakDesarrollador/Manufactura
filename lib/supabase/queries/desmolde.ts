import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaDesmolde(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Vaciado')
        .eq('contramolde', true)
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para desmolde:', error)
        return []
    }

    return data || []
}

export async function registrarDesmolde(registroId: number, usuarioEmail: string) {
    // Desmolde = UPDATE trazabilidad_ms: estado -> 'Desgelcada'
    // + Liberar el molde (estado -> 'Disponible')

    // 1. Obtener el registro actual para saber el molde_id
    const { data: registro, error: fetchError } = await supabase
        .from('trazabilidad_ms')
        .select('molde_id')
        .eq('id', registroId)
        .single()

    if (fetchError || !registro) {
        throw new Error('No se encontró el registro de trazabilidad.')
    }

    // 2. Actualizar el registro de trazabilidad
    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Pulido',
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar desmolde: [${error.code}] ${error.message}`)
    }

    // 3. Liberar el molde -> Disponible, resetear vueltas_actuales
    const { error: moldeError } = await supabase
        .from('moldes')
        .update({
            estado: 'Disponible',
            vueltas_actuales: 0,
            modificado_por: usuarioEmail,
            modified_at: new Date().toISOString()
        })
        .eq('id', registro.molde_id)

    if (moldeError) {
        console.error('Error liberando molde:', moldeError)
        // No lanzar error fatal, el registro ya se actualizó
    }

    return data
}
