import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaEnsayo(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_fv')
        .select('*')
        .eq('estado', 'Ensayo')
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros para ensayo:', error)
        return []
    }

    return data || []
}

export async function registrarEnsayo(registrer: string, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: 'Guacales',
            acabado_fecha: new Date().toISOString(),
            acabado_user_id: userId
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar ensayo: [${error.code}] ${error.message}`)
    }

    return data
}
