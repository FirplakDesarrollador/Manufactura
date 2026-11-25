import { supabase } from '@/lib/supabase'

// Historial de movimientos manuales del Control de piso FV (tabla movimientos_fv, ver fibra_movimientos.sql).
// Toda acción manual sobre una pieza o un molde (mapa, Ubicar desde Excel, módulo Moldes, Administración) deja
// una fila con usuario, hora, antes y después. Si no se puede guardar, se avisa con error: el cambio ya se hizo
// pero no quedó en el historial (nunca se calla).

export type OrigenMovimientoFv = 'mapa' | 'importar_excel' | 'moldes' | 'administracion' | 'pintura'
export type AccionMovimientoFv = 'mover' | 'cambiar_mesa' | 'quitar_mesa' | 'registrar_desde_programado'
    | 'devolver_programado' | 'liberar_molde' | 'editar_registro' | 'eliminar_registro'

export type MovimientoFv = {
    origen: OrigenMovimientoFv
    accion: AccionMovimientoFv
    registrer?: string | null
    ordenId?: number | null
    of?: string | null
    estadoAntes?: string | null
    estadoDespues?: string | null
    mesaAntes?: string | null
    mesaDespues?: string | null
    moldeId?: number | null
    detalle?: Record<string, unknown> | null
}

export type FilaMovimientoFv = {
    id: number
    created_at: string
    usuario_email: string
    origen: string
    accion: string
    registrer: string | null
    orden_fabricacion: string | null
    estado_antes: string | null
    estado_despues: string | null
    mesa_antes: string | null
    mesa_despues: string | null
    molde_serial: string | null
    detalle: Record<string, unknown> | null
}

// Estado actual de una pieza (para guardar el "antes")
export type FotoPiezaFv = { estado: string; mesa: string | null; moldeId: number | null; ordenId: number | null }
export async function fotoPiezaFv(registrer: string): Promise<FotoPiezaFv | null> {
    const { data, error } = await supabase.from('trazabilidad_fv')
        .select('estado, mesa_fv, molde_id, orden_fabricacion_id').eq('registrer', registrer).maybeSingle()
    if (error) throw new Error(`No se pudo leer la pieza ${registrer}: [${error.code}] ${error.message}`)
    return data ? { estado: data.estado, mesa: data.mesa_fv ?? null, moldeId: data.molde_id ?? null, ordenId: data.orden_fabricacion_id ?? null } : null
}

const SIN_TABLA = /movimientos_fv|relation|schema cache/i

export async function registrarMovimientosFv(movimientos: MovimientoFv[]) {
    if (movimientos.length === 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('El cambio se hizo, pero NO quedó en el historial: no hay una sesión activa.')

    // Número de OF y serial del molde para que el historial se lea sin cruces
    const ordenIds = [...new Set(movimientos.filter(m => !m.of && m.ordenId).map(m => m.ordenId as number))]
    const moldeIds = [...new Set(movimientos.filter(m => m.moldeId).map(m => m.moldeId as number))]
    const [ofs, moldes] = await Promise.all([
        ordenIds.length ? supabase.from('ordenes_fabricacion_fv').select('id, orden_fabricacion').in('id', ordenIds) : Promise.resolve({ data: [] as { id: number; orden_fabricacion: string }[] }),
        moldeIds.length ? supabase.from('moldes').select('id, serial').in('id', moldeIds) : Promise.resolve({ data: [] as { id: number; serial: string }[] })
    ])
    const ofPorId = new Map((ofs.data || []).map(o => [o.id, String(o.orden_fabricacion ?? '')]))
    const serialPorId = new Map((moldes.data || []).map(m => [m.id, String(m.serial ?? '')]))

    const filas = movimientos.map(m => ({
        usuario_email: user.email,
        origen: m.origen,
        accion: m.accion,
        registrer: m.registrer ?? null,
        orden_fabricacion: m.of ?? (m.ordenId ? ofPorId.get(m.ordenId) ?? null : null),
        estado_antes: m.estadoAntes ?? null,
        estado_despues: m.estadoDespues ?? null,
        mesa_antes: m.mesaAntes ?? null,
        mesa_despues: m.mesaDespues ?? null,
        molde_id: m.moldeId ?? null,
        molde_serial: m.moldeId ? serialPorId.get(m.moldeId) ?? null : null,
        detalle: m.detalle ?? null
    }))
    const { error } = await supabase.from('movimientos_fv').insert(filas)
    if (error) {
        throw new Error(SIN_TABLA.test(error.message)
            ? 'El cambio se hizo, pero NO quedó en el historial: ejecute fibra_movimientos.sql en Supabase.'
            : `El cambio se hizo, pero NO quedó en el historial: [${error.code}] ${error.message}`)
    }
}

// Últimos movimientos (opcionalmente de una OF)
export async function getMovimientosFv(opciones: { of?: string; limite?: number } = {}): Promise<FilaMovimientoFv[]> {
    let q = supabase.from('movimientos_fv').select('*').order('created_at', { ascending: false }).limit(opciones.limite ?? 300)
    if (opciones.of) q = q.eq('orden_fabricacion', opciones.of)
    const { data, error } = await q
    if (error) {
        throw new Error(SIN_TABLA.test(error.message)
            ? 'Falta el historial de movimientos: ejecute fibra_movimientos.sql en Supabase.'
            : `No se pudo leer el historial: [${error.code}] ${error.message}`)
    }
    return (data || []) as FilaMovimientoFv[]
}
