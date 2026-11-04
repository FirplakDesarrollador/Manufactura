import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'

export async function getRegistrosParaPulido(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_fv')
        .select('*')
        .in('estado', ['Pulido', 'Vaciado'])
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros para pulido:', error)
        return []
    }

    return data || []
}

export async function registrarPulido(registrer: string, usuarioEmail: string, nuevoEstado: string) {
    // Pulido = UPDATE trazabilidad_fv: pulido_fecha, pulido_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data: actual } = await supabase
        .from('trazabilidad_fv')
        .select('estado, molde_id')
        .eq('registrer', registrer)
        .maybeSingle()

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: nuevoEstado,
            pulido_fecha: new Date().toISOString(),
            pulido_user_id: userId
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar pulido: [${error.code}] ${error.message}`)
    }

    if (actual?.estado === 'Vaciado' && actual.molde_id) {
        await liberarMolde(actual.molde_id, usuarioEmail)
    }

    return data
}
