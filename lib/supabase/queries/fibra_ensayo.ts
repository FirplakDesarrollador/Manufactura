import { supabase } from '@/lib/supabase'
import { ordenarPorFechaT } from '@/lib/fibra/ordenT'
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

    return ordenarPorFechaT(data || [])  // más atrasado primero por la T del Semáforo
}

export async function registrarEnsayo(registrer: string, usuarioEmail: string) {
    return registrarEnsayoConDestino(registrer, usuarioEmail, 'Guacales')
}

// Resultado del ensayo: pasa a Guacales, o se manda a Reparación o Destrucción (la fecha y el usuario quedan en acabado_*)
export async function registrarEnsayoConDestino(registrer: string, usuarioEmail: string, destino: 'Guacales' | 'Reparacion' | 'Destruccion') {
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: destino,
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
