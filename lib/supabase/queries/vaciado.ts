import { supabase } from '@/lib/supabase'
import { RegistroTrazabilidad, KilosReferencia } from '@/types/pintura'
import { requireUserId } from './helpers'

export async function getRegistrosParaVaciado(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_ms')
        .select('*')
        .eq('estado', 'Pintura')
        .order('pintura_fecha', { ascending: true })

    if (error) {
        console.error('Error fetching registros para vaciado:', error)
        return []
    }

    return data || []
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

export async function registrarVaciado(registroId: number, usuarioEmail: string, maquina: string) {
    // Vaciado = UPDATE trazabilidad_ms: vaciado_fecha, vaciado_user_id, estado -> 'Vaciado'
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Vaciado',
            vaciado_fecha: new Date().toISOString(),
            vaciado_user_id: userId,
            vaciado_maquina: maquina
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        console.error('Error registrando vaciado:', error)
        throw new Error(`Error al registrar vaciado: [${error.code}] ${error.message}`)
    }

    return data
}

export async function registrarDesgelcado(registroId: number, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)

    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .update({
            estado: 'Desgelcada'
        })
        .eq('id', registroId)
        .select()
        .single()

    if (error) {
        console.error('Error registrando desgelcado:', error)
        throw new Error(`Error al registrar desgelcado: [${error.code}] ${error.message}`)
    }

    return data
}

