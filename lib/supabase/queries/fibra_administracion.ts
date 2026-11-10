import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'
import { registrarPintura } from './fibra'
import { fotoPiezaFv, registrarMovimientosFv, MovimientoFv, OrigenMovimientoFv } from '@/lib/fibra/movimientos'

export async function updateOrdenFabricacion(id: number, data: Partial<OrdenFabricacion>) {
    // Only allow fields that exist in the actual table
    const allowedKeys = [
        'numero_pedido',
        'orden_fabricacion',
        'cantidad',
        'fecha_entrega_estimada',
        'pendiente',
        'fecha_entrega_real',
        'modificado_por',
        'cliente',
        'producto_sku',
        'ensayo',
        'fecha_ideal_produccion',
        'comentario',
        'Prioridad_OF'
    ]

    const filteredData = Object.keys(data)
        .filter(key => allowedKeys.includes(key))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((obj, key) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any)[key] = (data as any)[key];
            return obj;
        }, {} as Partial<OrdenFabricacion>);

    const { error } = await supabase
        .from('ordenes_fabricacion')
        .update(filteredData)
        .eq('id', id)

    if (error) {
        console.error('Error updating orden fabricacion:', error)
        throw error
    }
}

export async function deleteOrdenFabricacion(id: number) {
    const { error } = await supabase
        .from('ordenes_fabricacion')
        .update({
            pendiente: false,
            modificado_por: 'Eliminado/Cancelado por Usuario App'
        })
        .eq('id', id)

    if (error) {
        console.error('Error deleting orden fabricacion:', error)
        throw error
    }
}

// Si la pieza ocupaba su molde (Pintura/Vaciado) y tras editarla o borrarla ya no lo ocupa, libera el molde
// (así no quedan moldes "En uso" sin pieza).
async function leerOcupacionMolde(registrer: string) {
    const { data } = await supabase.from('trazabilidad_fv').select('estado, molde_id, orden_fabricacion_id').eq('registrer', registrer).maybeSingle()
    return data as { estado: string; molde_id: number | null; orden_fabricacion_id: number | null } | null
}
async function liberarMoldeSiQuedoSinPieza(antes: { estado: string; molde_id: number | null } | null, despues: { estado?: string; molde_id?: number | null } | null) {
    if (!antes?.molde_id || !['Pintura', 'Vaciado'].includes(antes.estado)) return
    const sigueOcupando = despues && ['Pintura', 'Vaciado'].includes(despues.estado ?? antes.estado) && (despues.molde_id ?? antes.molde_id) === antes.molde_id
    if (sigueOcupando) return
    const { data: { user } } = await supabase.auth.getUser()
    await liberarMolde(antes.molde_id, user?.email || 'Administración FV')
}

export async function updateRegistroTrazabilidad(idOrRegistrer: string | number, data: Partial<RegistroTrazabilidad>) {
    const antes = await leerOcupacionMolde(String(idOrRegistrer))
    const allowedKeys = [
        'pintura_fecha',
        'orden_fabricacion_id',
        'molde_id',
        'pintura_user_id',
        'pintura_linea',
        'vaciado_fecha',
        'vaciado_user_id',
        'contramolde',
        'contramolde_fecha',
        'contramolde_user_id',
        'pulido_fecha',
        'pulido_user_id',
        'enviar_reparar_molde',
        'reparacion_fecha',
        'reparacion_user_id',
        'empaque_fecha',
        'empaque_user_id',
        'cedi_fecha',
        'cedi_user_id',
        'digitado_user_id',
        'digitado_fecha',
        'transito_fecha',
        'transito_user_id',
        'acabado_user_id',
        'acabado_fecha',
        'saldo_user_id',
        'saldo_fecha',
        'vaciado_linea',
        'registrer',
        'estado',
        'destruccion_user_id',
        'destruccion_fecha',
        'estanteria_user_id',
        'estanteria_fecha',
        'kilos_vaciados',
        'vaciado_maquina'
    ]

    const filteredData = Object.keys(data)
        .filter(key => allowedKeys.includes(key))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((obj, key) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any)[key] = (data as any)[key];
            return obj;
        }, {} as Partial<RegistroTrazabilidad>);

    const { error } = await supabase
        .from('trazabilidad_fv')
        .update(filteredData)
        .eq('registrer', String(idOrRegistrer))

    if (error) {
        console.error('Error updating registro trazabilidad:', error)
        throw error
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nuevo = filteredData as any
    await liberarMoldeSiQuedoSinPieza(antes, { estado: nuevo.estado, molde_id: nuevo.molde_id })
    await registrarMovimientosFv([{
        origen: 'administracion', accion: 'editar_registro', registrer: String(idOrRegistrer),
        ordenId: nuevo.orden_fabricacion_id ?? antes?.orden_fabricacion_id ?? null,
        estadoAntes: antes?.estado ?? null, estadoDespues: nuevo.estado ?? antes?.estado ?? null,
        moldeId: nuevo.molde_id ?? antes?.molde_id ?? null, detalle: { campos: filteredData }
    }])
}

export async function deleteRegistroTrazabilidad(idOrRegistrer: string | number) {
    const antes = await leerOcupacionMolde(String(idOrRegistrer))
    const { error } = await supabase
        .from('trazabilidad_fv')
        .delete()
        .eq('registrer', String(idOrRegistrer))

    if (error) {
        console.error('Error deleting registro trazabilidad:', error)
        throw error
    }
    await liberarMoldeSiQuedoSinPieza(antes, null)
    await registrarMovimientosFv([{
        origen: 'administracion', accion: 'eliminar_registro', registrer: String(idOrRegistrer),
        ordenId: antes?.orden_fabricacion_id ?? null, estadoAntes: antes?.estado ?? null, moldeId: antes?.molde_id ?? null
    }])
}

// Movimiento manual desde el Mapa de procesos FV: pasa todas las piezas de una OF que están en los estados de origen
// al estado de destino y deja la fecha y el usuario del movimiento en los campos de ese proceso (trazabilidad).
export const DESTINOS_MOVIMIENTO_FV = {
    // Pintura y Vaciado solo para piezas nuevas desde Programado (registrarPiezaProgramadoFv)
    pintura: { estado: 'Pintura', fecha: 'pintura_fecha', usuario: 'pintura_user_id' },
    vaciado: { estado: 'Vaciado', fecha: 'vaciado_fecha', usuario: 'vaciado_user_id' },
    // Cada destino deja el estado y la fecha que dejaría el registro normal del proceso anterior:
    // pasar a Ensayo = Pulido registrado; a Huacales (Guacales) = Ensayo registrado; a Digitado (Empaque) = huacal
    // registrado; a Tránsito = Digitado registrado; a CEDI = CEDI registrado
    pulido: { estado: 'Pulido', fecha: 'pulido_fecha', usuario: 'pulido_user_id' },
    ensayo: { estado: 'Ensayo', fecha: 'pulido_fecha', usuario: 'pulido_user_id' },
    reparacion: { estado: 'Reparacion', fecha: 'reparacion_fecha', usuario: 'reparacion_user_id' },
    huacales: { estado: 'Guacales', fecha: 'acabado_fecha', usuario: 'acabado_user_id' },
    digitado: { estado: 'Empaque', fecha: 'empaque_fecha', usuario: 'empaque_user_id' },
    transito: { estado: 'Transito', fecha: 'digitado_fecha', usuario: 'digitado_user_id' },
    cedi: { estado: 'Cedi', fecha: 'cedi_fecha', usuario: 'cedi_user_id' }
} as const
export type DestinoMovimientoFv = keyof typeof DESTINOS_MOVIMIENTO_FV

export async function moverPiezasOrdenFibra(ordenId: number, estadosOrigen: string[], destino: DestinoMovimientoFv, usuarioEmail: string) {
    const userId = await requireUserId(usuarioEmail)
    const d = DESTINOS_MOVIMIENTO_FV[destino]

    const { data: piezas, error: errorPiezas } = await supabase
        .from('trazabilidad_fv')
        .select('registrer, estado, molde_id')
        .eq('orden_fabricacion_id', ordenId)
        .in('estado', estadosOrigen)
    if (errorPiezas) throw new Error(`No se pudieron leer las piezas de la orden: [${errorPiezas.code}] ${errorPiezas.message}`)
    if (!piezas || piezas.length === 0) throw new Error(`La orden no tiene piezas registradas en ${estadosOrigen.join(' / ')}.`)

    const { data: movidas, error } = await supabase
        .from('trazabilidad_fv')
        .update({ estado: d.estado, [d.fecha]: new Date().toISOString(), [d.usuario]: userId })
        .in('registrer', piezas.map(p => p.registrer))
        .select('registrer')
    if (error) throw new Error(`No se pudo mover la orden: [${error.code}] ${error.message}`)
    if (!movidas || movidas.length !== piezas.length) {
        throw new Error(`Solo se movieron ${movidas?.length || 0} de ${piezas.length} pieza(s). Revise los permisos o vuelva a intentar.`)
    }

    // Al salir de vaciado se libera el molde, igual que en Pulido
    for (const p of piezas) if (p.estado === 'Vaciado' && p.molde_id) await liberarMolde(p.molde_id, usuarioEmail)

    await registrarMovimientosFv(piezas.map(p => ({
        origen: 'mapa' as const, accion: 'mover' as const, registrer: String(p.registrer), ordenId,
        estadoAntes: p.estado, estadoDespues: d.estado, moldeId: p.molde_id ?? null, detalle: { destino, toda_la_orden: true }
    })))
    return movidas.length
}

// ===== Mesas del Mapa de procesos FV =====
// Mesa física donde el supervisor ubicó cada pieza (columna mesa_fv, ver fibra_mesas_ensayo.sql y fibra_mesas_mapa.sql)
export type PiezaMapaFv = { registrer: string; ordenId: number; estado: string; mesa: string | null }

// Piezas de las órdenes cargadas en el mapa que están en alguno de los estados dados
export async function getPiezasMapaFv(ordenIds: number[], estados: string[]): Promise<PiezaMapaFv[]> {
    const piezas: PiezaMapaFv[] = []
    for (let i = 0; i < ordenIds.length; i += 200) {
        const { data, error } = await supabase
            .from('trazabilidad_fv')
            .select('registrer, orden_fabricacion_id, estado, mesa_fv')
            .in('orden_fabricacion_id', ordenIds.slice(i, i + 200))
            .in('estado', estados)
            .order('pintura_fecha', { ascending: true })
        if (error) {
            const sinColumna = /mesa_fv/.test(error.message)
            throw new Error(sinColumna
                ? 'Falta la columna de mesas en la base de datos: ejecute fibra_mesas_ensayo.sql y fibra_mesas_mapa.sql en Supabase.'
                : `No se pudieron leer las piezas del mapa: [${error.code}] ${error.message}`)
        }
        for (const r of data || []) piezas.push({ registrer: String(r.registrer), ordenId: r.orden_fabricacion_id, estado: r.estado, mesa: r.mesa_fv ?? null })
    }
    return piezas
}

// ----- Operaciones sin historial (las usan las funciones públicas de abajo, que registran el movimiento) -----

async function ponerMesa(registrer: string, mesa: string | null) {
    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({ mesa_fv: mesa })
        .eq('registrer', registrer)
        .select('registrer')
    if (error) {
        if (error.code === '23514') throw new Error('La base de datos no acepta esa mesa: ejecute fibra_mesas_mapa.sql en Supabase.')
        throw new Error(`No se pudo ubicar la pieza: [${error.code}] ${error.message}`)
    }
    if (!data || data.length === 0) throw new Error('No se actualizó la pieza. Revise los permisos o vuelva a intentar.')
}

const OCUPAN_MOLDE = ['Pintura', 'Vaciado']

// Cambia el estado de la pieza y deja la fecha y el usuario del proceso. El molde se libera cuando la pieza sale
// de Pintura/Vaciado hacia Pulido o más adelante; si vuelve a Pintura/Vaciado desde un proceso posterior, el molde
// vuelve a quedar En uso (y no se permite si ya lo ocupa otra pieza).
async function cambiarEstadoPieza(registrer: string, antes: FotoPiezaFvLocal, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null) {
    const userId = await requireUserId(usuarioEmail)
    const d = DESTINOS_MOVIMIENTO_FV[destino]
    const entraAMolde = OCUPAN_MOLDE.includes(d.estado) && !OCUPAN_MOLDE.includes(antes.estado) && antes.moldeId != null
    if (entraAMolde) {
        const { data: otra, error: errOtra } = await supabase.from('trazabilidad_fv')
            .select('registrer, estado, orden_fabricacion_id').eq('molde_id', antes.moldeId as number)
            .in('estado', OCUPAN_MOLDE).neq('registrer', registrer).limit(1)
        if (errOtra) throw new Error(`No se pudo revisar el molde de la pieza: ${errOtra.message}`)
        if (otra && otra.length > 0) {
            const { data: o } = await supabase.from('ordenes_fabricacion_fv').select('orden_fabricacion').eq('id', otra[0].orden_fabricacion_id).maybeSingle()
            throw new Error(`No se puede devolver la pieza a ${d.estado}: su molde lo ocupa ahora otra pieza (OF ${o?.orden_fabricacion ?? '¿?'} en ${otra[0].estado}). Libere ese molde primero.`)
        }
    }
    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .update({ estado: d.estado, [d.fecha]: new Date().toISOString(), [d.usuario]: userId, mesa_fv: mesa })
        .eq('registrer', registrer)
        .select('registrer')
    if (error) {
        if (error.code === '23514') throw new Error('La base de datos no acepta esa mesa: ejecute fibra_mesas_mapa.sql en Supabase.')
        throw new Error(`No se pudo mover la pieza: [${error.code}] ${error.message}`)
    }
    if (!data || data.length === 0) throw new Error('No se movió la pieza. Revise los permisos o vuelva a intentar.')
    if (OCUPAN_MOLDE.includes(antes.estado) && !OCUPAN_MOLDE.includes(d.estado) && antes.moldeId) await liberarMolde(antes.moldeId, usuarioEmail)
    if (entraAMolde) {
        const { error: errMolde } = await supabase.from('moldes')
            .update({ estado: 'En uso', modificado_por: usuarioEmail, modified_at: new Date().toISOString() })
            .eq('id', antes.moldeId as number).eq('estado', 'Disponible')
        if (errMolde) throw new Error(`La pieza se movió, pero no se pudo marcar su molde En uso: ${errMolde.message}`)
    }
}

type FotoPiezaFvLocal = { estado: string; mesa: string | null; moldeId: number | null; ordenId: number | null }
async function fotoObligatoria(registrer: string): Promise<FotoPiezaFvLocal> {
    const foto = await fotoPiezaFv(registrer)
    if (!foto) throw new Error('La pieza ya no existe en la trazabilidad. Actualice el mapa.')
    return foto
}

// ----- Funciones públicas: cada una deja el movimiento en el historial (movimientos_fv) -----

// Ubica la pieza en una mesa (o la deja sin mesa) dentro de su mismo proceso
export async function asignarMesaFv(registrer: string, mesa: string | null, origen: OrigenMovimientoFv = 'mapa') {
    const antes = await fotoObligatoria(registrer)
    await ponerMesa(registrer, mesa)
    await registrarMovimientosFv([{
        origen, accion: mesa ? 'cambiar_mesa' : 'quitar_mesa', registrer, ordenId: antes.ordenId,
        estadoAntes: antes.estado, estadoDespues: antes.estado, mesaAntes: antes.mesa, mesaDespues: mesa, moldeId: antes.moldeId
    }])
}

// Mueve una sola pieza a otro proceso (cambia su estado y lo registra en la trazabilidad) y la deja en la mesa
// indicada o sin mesa.
export async function moverPiezaFibra(registrer: string, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null = null, origen: OrigenMovimientoFv = 'mapa', motivo?: string) {
    const antes = await fotoObligatoria(registrer)
    await cambiarEstadoPieza(registrer, antes, destino, usuarioEmail, mesa)
    await registrarMovimientosFv([{
        origen, accion: 'mover', registrer, ordenId: antes.ordenId,
        estadoAntes: antes.estado, estadoDespues: DESTINOS_MOVIMIENTO_FV[destino].estado,
        mesaAntes: antes.mesa, mesaDespues: mesa, moldeId: antes.moldeId,
        detalle: { destino, ...(motivo ? { motivo } : {}) }
    }])
}

// Devuelve una pieza a Programado (pendiente por pintar) desde cualquier proceso: se borra su registro de
// trazabilidad. Queda en el historial (movimientos_fv) con su estado, mesa y molde. Si la pieza aún ocupaba el
// molde (Pintura/Vaciado) se libera. Las vueltas del molde no se tocan.
export async function devolverPiezaAProgramadoFv(registrer: string, usuarioEmail: string, origen: OrigenMovimientoFv = 'mapa') {
    await requireUserId(usuarioEmail)
    const antes = await fotoObligatoria(registrer)
    const { data: completo } = await supabase.from('trazabilidad_fv').select('*').eq('registrer', registrer).maybeSingle()

    const { data, error } = await supabase
        .from('trazabilidad_fv')
        .delete()
        .eq('registrer', registrer)
        .select('registrer')
    if (error) throw new Error(`No se pudo devolver la pieza a Programado: [${error.code}] ${error.message}`)
    if (!data || data.length === 0) throw new Error('No se devolvió la pieza. Revise los permisos o vuelva a intentar.')

    if (OCUPAN_MOLDE.includes(antes.estado) && antes.moldeId) await liberarMolde(antes.moldeId, usuarioEmail)
    await registrarMovimientosFv([{
        origen, accion: 'devolver_programado', registrer, ordenId: antes.ordenId,
        estadoAntes: antes.estado, estadoDespues: 'Programado', mesaAntes: antes.mesa, moldeId: antes.moldeId,
        // Copia del registro borrado: así no se pierde la trazabilidad de la pieza ni del molde
        detalle: { registro_borrado: completo ?? null }
    }])
}

// Kit de reparación (lib/fibra/kitReparacion.ts): se registra sin molde y queda en el proceso indicado
// (desde Pintura: Digitado). Respeta la cantidad de la orden igual que Pintura.
export async function registrarKitReparacionFv(ordenId: number, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null = null, origen: OrigenMovimientoFv = 'mapa') {
    const userId = await requireUserId(usuarioEmail)
    const { data: orden, error: errOrden } = await supabase.from('ordenes_fabricacion_fv')
        .select('id, orden_fabricacion, cantidad, programado').eq('id', ordenId).single()
    if (errOrden || !orden) throw new Error(`No se encontró la orden: ${errOrden?.message || ordenId}`)
    const { count, error: errCount } = await supabase.from('trazabilidad_fv')
        .select('*', { count: 'exact', head: true }).eq('orden_fabricacion_id', ordenId)
    if (errCount) throw new Error(`No se pudieron contar las piezas de la orden: ${errCount.message}`)
    const permitidas = orden.cantidad || orden.programado || 0
    if (permitidas > 0 && (count || 0) >= permitidas) {
        throw new Error(`La orden ${orden.orden_fabricacion} ya tiene registradas sus ${permitidas} pieza(s).`)
    }
    const ahora = new Date()
    const registrer = `${ahora.getTime()}KIT`
    const { error } = await supabase.from('trazabilidad_fv').insert({
        pintura_fecha: ahora.toISOString(), orden_fabricacion_id: ordenId, molde_id: null, pintura_user_id: userId,
        pintura_linea: 'Linea 1', contramolde: false, enviar_reparar_molde: false, registrer, estado: 'Pintura', kilos_vaciados: 0
    })
    if (error) {
        throw new Error(error.code === '23502' && /molde_id/.test(error.message)
            ? 'La base de datos exige molde en cada pieza: no se puede registrar el kit sin molde (hay que permitir molde_id vacío en trazabilidad_fv).'
            : `No se pudo registrar el kit: [${error.code}] ${error.message}`)
    }
    const recien: FotoPiezaFvLocal = { estado: 'Pintura', mesa: null, moldeId: null, ordenId }
    if (destino === 'pintura') { if (mesa) await ponerMesa(registrer, mesa) }
    else await cambiarEstadoPieza(registrer, recien, destino, usuarioEmail, mesa)
    await registrarMovimientosFv([{
        origen, accion: 'registrar_desde_programado', registrer, ordenId, of: String(orden.orden_fabricacion ?? ''),
        estadoAntes: 'Programado', estadoDespues: DESTINOS_MOVIMIENTO_FV[destino].estado, mesaDespues: mesa,
        detalle: { destino, kit_reparacion: true, sin_molde: true }
    }])
}

// Desde Programado (el pintor no la registró): el supervisor escoge el molde en el mapa. Se registra igual que en
// Pintura (molde en uso, vueltas, kilos) y luego la pieza pasa al proceso y a la mesa donde se soltó.
export async function registrarPiezaProgramadoFv(ordenId: number, moldeId: number, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null = null, origen: OrigenMovimientoFv = 'mapa') {
    const pieza = await registrarPintura({ orden_fabricacion_id: ordenId, molde_id: moldeId, linea: 'Linea 1', usuario_email: usuarioEmail })
    const registrer = String(pieza?.registrer || '')
    if (!registrer) throw new Error('Se registró la pintura pero no se recibió el código de la pieza. Actualice el mapa y ubíquela a mano.')
    const recien: FotoPiezaFvLocal = { estado: 'Pintura', mesa: null, moldeId, ordenId }
    if (destino === 'pintura') {
        if (mesa) await ponerMesa(registrer, mesa)
    } else {
        await cambiarEstadoPieza(registrer, recien, destino, usuarioEmail, mesa)
    }
    const movimientos: MovimientoFv[] = [{
        origen, accion: 'registrar_desde_programado', registrer, ordenId,
        estadoAntes: 'Programado', estadoDespues: DESTINOS_MOVIMIENTO_FV[destino].estado, mesaDespues: mesa, moldeId,
        detalle: { destino }
    }]
    await registrarMovimientosFv(movimientos)
}
