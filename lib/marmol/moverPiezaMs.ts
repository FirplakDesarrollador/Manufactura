import { supabase } from '@/lib/supabase'
import { liberarMolde, requireUserId } from '@/lib/supabase/queries/helpers'
import { registrarPintura } from '@/lib/supabase/queries/pintura'

// Movimientos manuales de piezas MS (Mover OF en Administración MS). Igual que en FV (fibra_administracion.ts):
// cada destino deja el estado y la fecha/usuario que dejaría el registro normal del proceso anterior, la pieza ocupa
// su molde en Pintura/Vaciado y lo libera al salir, y todo queda en el historial movimientos_ms (movimientos_ms.sql)
// con la fecha y el usuario anteriores del proceso si se sobrescriben.
//   Pintura  = registrada en Pintura (molde en uso)        Vaciado = vaciado registrado (molde en uso)
//   Pulido   = desmoldada (libera el molde)                 Acabado = pulido registrado
//   Estantería = acabado registrado                         Reparación
//   Empaque  = empaque registrado (pendiente de digitar)    Tránsito = digitado registrado
export const DESTINOS_MS = {
    pintura: { estado: 'Pintura', fecha: 'pintura_fecha', usuario: 'pintura_user_id' },
    vaciado: { estado: 'Vaciado', fecha: 'vaciado_fecha', usuario: 'vaciado_user_id' },
    pulido: { estado: 'Pulido', fecha: null, usuario: null },
    acabado: { estado: 'Acabado', fecha: 'pulido_fecha', usuario: 'pulido_user_id' },
    estanteria: { estado: 'Estanteria', fecha: 'estanteria_fecha', usuario: 'estanteria_user_id' },
    reparacion: { estado: 'Reparacion', fecha: 'reparacion_fecha', usuario: 'reparacion_user_id' },
    empaque: { estado: 'Empaque', fecha: 'empaque_fecha', usuario: 'empaque_user_id' },
    transito: { estado: 'Transito', fecha: 'digitado_fecha', usuario: 'digitado_user_id' }
} as const
export type DestinoMs = keyof typeof DESTINOS_MS
export const OCUPAN_MOLDE_MS = ['Pintura', 'Vaciado']

type MovimientoMs = {
    accion: 'mover' | 'registrar_desde_programado' | 'devolver_programado' | 'editar_registro'
    registroId: number | null; registrer?: string | null; of?: string | null
    estadoAntes?: string | null; estadoDespues?: string | null; moldeId?: number | null; detalle?: Record<string, unknown>
}
const SIN_TABLA = /movimientos_ms|relation|schema cache/i

// Antes de mover se confirma que el historial existe: un movimiento sin historial no se permite
export async function verificarHistorialMs() {
    const { error } = await supabase.from('movimientos_ms').select('id', { head: true, count: 'exact' }).limit(1)
    if (error) throw new Error(SIN_TABLA.test(error.message)
        ? 'Falta el historial de movimientos de MS: ejecute movimientos_ms.sql en Supabase.'
        : `No se pudo revisar el historial de MS: ${error.message}`)
}

async function registrarMovimientosMs(movs: MovimientoMs[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('El cambio se hizo, pero NO quedó en el historial: no hay una sesión activa.')
    const moldeIds = [...new Set(movs.map(m => m.moldeId).filter((x): x is number => x != null))]
    const { data: moldes } = moldeIds.length ? await supabase.from('moldes').select('id, serial').in('id', moldeIds) : { data: [] as { id: number; serial: string }[] }
    const serial = new Map((moldes || []).map(m => [m.id, String(m.serial ?? '')]))
    const { error } = await supabase.from('movimientos_ms').insert(movs.map(m => ({
        usuario_email: user.email, origen: 'administracion', accion: m.accion, registro_id: m.registroId, registrer: m.registrer ?? null,
        orden_fabricacion: m.of ?? null, estado_antes: m.estadoAntes ?? null, estado_despues: m.estadoDespues ?? null,
        molde_id: m.moldeId ?? null, molde_serial: m.moldeId ? serial.get(m.moldeId) ?? null : null, detalle: m.detalle ?? null
    })))
    if (error) throw new Error(SIN_TABLA.test(error.message)
        ? 'El cambio se hizo, pero NO quedó en el historial: ejecute movimientos_ms.sql en Supabase.'
        : `El cambio se hizo, pero NO quedó en el historial: [${error.code}] ${error.message}`)
}

async function leerPieza(id: number) {
    const { data, error } = await supabase.from('query_trazabilidad_ms').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`No se pudo leer la pieza: ${error.message}`)
    if (!data) throw new Error('La pieza ya no existe en la trazabilidad. Actualice la pantalla.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as Record<string, any>
}

async function nombreUsuario(id: number | null): Promise<string | null> {
    if (id == null) return null
    const { data } = await supabase.from('usuarios').select('*').eq('id', id).maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = data as any
    return u ? String(u.nombre || u.nombre_completo || u.correo || id) : null
}

// Piezas MS (Pintura o Vaciado) que ocupan cada molde
export async function ocupacionMoldesMs(moldeIds: number[]): Promise<Map<number, { of: string; id: string }>> {
    const res = new Map<number, { of: string; id: string }>()
    for (let i = 0; i < moldeIds.length; i += 200) {
        const { data, error } = await supabase.from('query_trazabilidad_ms').select('id, molde_id, orden_fabricacion')
            .in('molde_id', moldeIds.slice(i, i + 200)).in('estado', OCUPAN_MOLDE_MS)
        if (error) throw new Error(`No se pudo revisar la ocupación de los moldes: ${error.message}`)
        for (const p of data || []) res.set(p.molde_id, { of: String(p.orden_fabricacion ?? '¿?'), id: String(p.id) })
    }
    return res
}

export async function moverPiezaMs(registroId: number, destino: DestinoMs, usuarioEmail: string, motivo?: string) {
    const userId = await requireUserId(usuarioEmail)
    const d = DESTINOS_MS[destino]
    const antes = await leerPieza(registroId)
    const moldeId: number | null = antes.molde_id ?? null
    const entraAMolde = OCUPAN_MOLDE_MS.includes(d.estado) && !OCUPAN_MOLDE_MS.includes(antes.estado) && moldeId != null
    if (entraAMolde) {
        const ocup = (await ocupacionMoldesMs([moldeId])).get(moldeId)
        if (ocup && ocup.id !== String(registroId)) throw new Error(`No se puede devolver la pieza a ${d.estado}: su molde lo ocupa la OF ${ocup.of}. Libere ese molde primero.`)
    }
    // Fecha y usuario del proceso que se van a sobrescribir (quedan en el historial)
    const sobrescrito = d.fecha && antes[d.fecha]
        ? { campo: d.fecha, fecha: String(antes[d.fecha]), usuario_id: antes[d.usuario as string] ?? null, usuario: await nombreUsuario(antes[d.usuario as string] ?? null) }
        : null
    const cambios: Record<string, unknown> = { estado: d.estado }
    if (d.fecha && d.usuario) { cambios[d.fecha] = new Date().toISOString(); cambios[d.usuario] = userId }
    const { data, error } = await supabase.from('trazabilidad_ms').update(cambios).eq('id', registroId).select('id')
    if (error) throw new Error(`No se pudo mover la pieza: [${error.code}] ${error.message}`)
    if (!data || data.length === 0) throw new Error('No se movió la pieza. Revise los permisos o vuelva a intentar.')
    if (OCUPAN_MOLDE_MS.includes(antes.estado) && !OCUPAN_MOLDE_MS.includes(d.estado) && moldeId) await liberarMolde(moldeId, usuarioEmail)
    if (entraAMolde) {
        const { error: e2 } = await supabase.from('moldes').update({ estado: 'En uso', modificado_por: usuarioEmail, modified_at: new Date().toISOString() })
            .eq('id', moldeId as number).eq('estado', 'Disponible')
        if (e2) throw new Error(`La pieza se movió, pero no se pudo marcar su molde En uso: ${e2.message}`)
    }
    await registrarMovimientosMs([{
        accion: 'mover', registroId, registrer: antes.registrer, of: antes.orden_fabricacion, estadoAntes: antes.estado, estadoDespues: d.estado,
        moldeId, detalle: { destino, ...(motivo ? { motivo } : {}), ...(sobrescrito ? { sobrescrito } : {}) }
    }])
}

// Devuelve la pieza a Programado: se borra su registro (copia completa en el historial) y se libera el molde si lo ocupaba
export async function devolverPiezaMsAProgramado(registroId: number, usuarioEmail: string) {
    await requireUserId(usuarioEmail)
    const antes = await leerPieza(registroId)
    const { data: completo } = await supabase.from('trazabilidad_ms').select('*').eq('id', registroId).maybeSingle()
    const { data, error } = await supabase.from('trazabilidad_ms').delete().eq('id', registroId).select('id')
    if (error) throw new Error(`No se pudo devolver la pieza a Programado: [${error.code}] ${error.message}`)
    if (!data || data.length === 0) throw new Error('No se devolvió la pieza. Revise los permisos o vuelva a intentar.')
    if (OCUPAN_MOLDE_MS.includes(antes.estado) && antes.molde_id) await liberarMolde(antes.molde_id, usuarioEmail)
    await registrarMovimientosMs([{
        accion: 'devolver_programado', registroId, registrer: antes.registrer, of: antes.orden_fabricacion,
        estadoAntes: antes.estado, estadoDespues: 'Programado', moldeId: antes.molde_id ?? null, detalle: { registro_borrado: completo ?? null }
    }])
}

// Desde Programado: se registra como en Pintura (molde en uso, vueltas, kilos) y luego pasa al proceso elegido
export async function registrarPiezaProgramadoMs(ordenId: number, of: string, moldeId: number, destino: DestinoMs, usuarioEmail: string) {
    const pieza = await registrarPintura({ orden_fabricacion_id: ordenId, molde_id: moldeId, linea: 'Linea 1', usuario_email: usuarioEmail })
    const id = Number(pieza?.id)
    if (!id) throw new Error('Se registró la pintura pero no se recibió el código de la pieza. Actualice y muévala a mano.')
    await registrarMovimientosMs([{
        accion: 'registrar_desde_programado', registroId: id, registrer: pieza?.registrer ?? null, of,
        estadoAntes: 'Programado', estadoDespues: 'Pintura', moldeId, detalle: { destino }
    }])
    if (destino !== 'pintura') await moverPiezaMs(id, destino, usuarioEmail, 'Registro desde Programado (Administración)')
}

// Cambia el molde de la pieza (su molde lo ocupa otra pieza) y lo deja en el historial
export async function cambiarMoldePiezaMs(registroId: number, moldeNuevoId: number, motivo: string, moldeAntes: string | null, moldeIdAntes: number | null) {
    const antes = await leerPieza(registroId)
    const { error } = await supabase.from('trazabilidad_ms').update({ molde_id: moldeNuevoId }).eq('id', registroId)
    if (error) throw new Error(`No se pudo cambiar el molde de la pieza: ${error.message}`)
    await registrarMovimientosMs([{
        accion: 'editar_registro', registroId, registrer: antes.registrer, of: antes.orden_fabricacion,
        estadoAntes: antes.estado, estadoDespues: antes.estado, moldeId: moldeNuevoId,
        detalle: { motivo, molde_antes: moldeAntes, molde_id_antes: moldeIdAntes }
    }])
}
