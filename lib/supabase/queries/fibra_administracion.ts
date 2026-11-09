import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { liberarMolde, requireUserId } from './helpers'
import { registrarPintura } from './fibra'

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

export async function updateRegistroTrazabilidad(idOrRegistrer: string | number, data: Partial<RegistroTrazabilidad>) {
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
}

export async function deleteRegistroTrazabilidad(idOrRegistrer: string | number) {
    const { error } = await supabase
        .from('trazabilidad_fv')
        .delete()
        .eq('registrer', String(idOrRegistrer))

    if (error) {
        console.error('Error deleting registro trazabilidad:', error)
        throw error
    }
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

export async function asignarMesaFv(registrer: string, mesa: string | null) {
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

// Mueve una sola pieza a otro proceso (cambia su estado y lo registra en la trazabilidad) y la deja en la mesa
// indicada o sin mesa. Si sale de Vaciado se libera el molde, igual que en Pulido.
export async function moverPiezaFibra(registrer: string, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null = null) {
    const userId = await requireUserId(usuarioEmail)
    const d = DESTINOS_MOVIMIENTO_FV[destino]
    const { data: actual } = await supabase
        .from('trazabilidad_fv')
        .select('estado, molde_id')
        .eq('registrer', registrer)
        .maybeSingle()
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
    // El molde se libera cuando la pieza sale de Pintura/Vaciado hacia Pulido o más adelante
    const conMolde = destino === 'pintura' || destino === 'vaciado'
    if ((actual?.estado === 'Vaciado' || actual?.estado === 'Pintura') && !conMolde && actual.molde_id) await liberarMolde(actual.molde_id, usuarioEmail)
}

// Desde Programado (el pintor no la registró): el supervisor escoge el molde en el mapa. Se registra igual que en
// Pintura (molde en uso, vueltas, kilos) y luego la pieza pasa al proceso y a la mesa donde se soltó.
export async function registrarPiezaProgramadoFv(ordenId: number, moldeId: number, destino: DestinoMovimientoFv, usuarioEmail: string, mesa: string | null = null) {
    const pieza = await registrarPintura({ orden_fabricacion_id: ordenId, molde_id: moldeId, linea: 'Linea 1', usuario_email: usuarioEmail })
    const registrer = String(pieza?.registrer || '')
    if (!registrer) throw new Error('Se registró la pintura pero no se recibió el código de la pieza. Actualice el mapa y ubíquela a mano.')
    if (destino === 'pintura') {
        if (mesa) await asignarMesaFv(registrer, mesa)
    } else {
        await moverPiezaFibra(registrer, destino, usuarioEmail, mesa)
    }
}
