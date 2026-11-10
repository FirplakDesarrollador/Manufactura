import { supabase } from '@/lib/supabase'
import { ordenarPorFechaT } from '@/lib/fibra/ordenT'
import { RegistroTrazabilidad, KilosReferencia } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'

export async function getRegistrosParaVaciado(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_fv')
        .select('*')
        .eq('estado', 'Pintura')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para vaciado:', error)
        return []
    }

    return ordenarPorFechaT(data || [])  // más atrasado primero por la T del Semáforo
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

export async function registrarVaciado(registrer: string, usuarioEmail: string) {
    // Vaciado entrega directo a pulido y libera el molde (antes lo hacía desmolde).
    const userId = await requireUserId(usuarioEmail)

    const { data: registro, error: fetchError } = await supabase
        .from('trazabilidad_fv')
        .select('molde_id')
        .eq('registrer', registrer)
        .single()

    if (fetchError || !registro) {
        throw new Error('No se encontró el registro de trazabilidad.')
    }

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: 'Pulido',
            vaciado_fecha: new Date().toISOString(),
            vaciado_user_id: userId,
            vaciado_maquina: null
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        console.error('Error registrando vaciado:', error)
        throw new Error(`Error al registrar vaciado: [${error.code}] ${error.message}`)
    }

    if (registro.molde_id) {
        await liberarMolde(registro.molde_id, usuarioEmail)
    }

    return data
}

export async function registrarDesgelcado(registrer: string, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: 'Desgelcada'
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        console.error('Error registrando desgelcado:', error)
        throw new Error(`Error al registrar desgelcado: [${error.code}] ${error.message}`)
    }

    return data
}

