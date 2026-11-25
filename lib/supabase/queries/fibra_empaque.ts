import { supabase } from '@/lib/supabase'
import { ordenarPorFechaT } from '@/lib/fibra/ordenT'
import { RegistroTrazabilidad } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaEmpaque(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_fv')
        .select('*')
        .in('estado', ['Guacales', 'Acabado'])
        .order('acabado_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros para empaque:', error)
        return []
    }

    return ordenarPorFechaT(data || [])  // más atrasado primero por la T del Semáforo
}

export async function registrarEmpaque(registrer: string, usuarioEmail: string) {
    // Empaque = UPDATE trazabilidad_fv: empaque_fecha, empaque_user_id, estado
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: 'Empaque',
            empaque_fecha: new Date().toISOString(),
            empaque_user_id: userId
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        throw new Error(`Error al registrar empaque: [${error.code}] ${error.message}`)
    }

    return data
}
