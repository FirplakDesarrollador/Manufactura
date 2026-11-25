import { supabase } from '@/lib/supabase'
import { ordenarPorFechaT } from '@/lib/fibra/ordenT'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'
import { RegistroTrazabilidad } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'

// Instalación Herrajes: punto de notificación entre Vaciado y Pulido. Recibe las piezas vaciadas (menos los kits de
// reparación, que no pasan por la planta); al registrar, la pieza queda en estado Herrajes y su molde se libera.
export async function getRegistrosParaHerrajes(): Promise<RegistroTrazabilidad[]> {
    const { data, error } = await supabase
        .from('query_trazabilidad_fv')
        .select('*')
        .eq('estado', 'Vaciado')
        .order('pintura_fecha', { ascending: false })

    if (error) {
        console.error('Error fetching registros para herrajes:', error)
        return []
    }

    return ordenarPorFechaT((data || []).filter(r => !esKitReparacion(r.producto_descripcion)))
}

export async function registrarHerrajes(registrer: string, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)

    const { data: actual, error: errActual } = await supabase
        .from('trazabilidad_fv')
        .select('estado, molde_id')
        .eq('registrer', registrer)
        .maybeSingle()
    if (errActual) throw new Error(`No se pudo leer la pieza: [${errActual.code}] ${errActual.message}`)
    if (!actual) throw new Error('No se encontró la pieza.')
    if (actual.estado !== 'Vaciado') throw new Error(`La pieza ya no está en Vaciado (está en ${actual.estado}). Actualice la lista.`)

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({
            estado: 'Herrajes',
            herrajes_fecha: new Date().toISOString(),
            herrajes_user_id: userId
        })
        .eq('registrer', registrer)
        .select()
        .single()

    if (error) {
        const sinColumna = /herrajes_|invalid input value for enum/i.test(error.message)
        throw new Error(sinColumna
            ? 'Falta preparar la base de datos para Herrajes: corra el archivo fibra_herrajes.sql en Supabase.'
            : `Error al registrar herrajes: [${error.code}] ${error.message}`)
    }

    // La pieza ya salió del molde: se libera (si no lo ocupa otra pieza en Pintura/Vaciado)
    if (actual.molde_id) {
        const { data: otra } = await supabase.from('trazabilidad_fv').select('registrer')
            .eq('molde_id', actual.molde_id).in('estado', ['Pintura', 'Vaciado']).neq('registrer', registrer).limit(1)
        if (!otra || otra.length === 0) await liberarMolde(actual.molde_id, usuarioEmail)
    }

    return data
}
