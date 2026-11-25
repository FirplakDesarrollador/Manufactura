import { supabase } from '@/lib/supabase'
import { requireUserId } from '@/lib/supabase/queries/helpers'

// Control de Piso Superficies (RTM / Inyección): datos y registros (superficies_rtm.sql).
// Sin moldes. Cada unidad de la OF es una fila de trazabilidad_rtm; "Programado" = cantidad − unidades registradas.
// Estados (dónde está la unidad):
//   Pulido      pulida, pendiente de digitar (aparece en Digitado)
//   Reparacion  en reparación
//   Transito    digitado registrado (aparece en CEDI)
//   Cedi        recibida en CEDI
//   Saldo / Destruccion
// Todo registro se hace por cantidad y queda en el historial movimientos_rtm.

export type EstadoRtm = 'Programado' | 'Pulido' | 'Reparacion' | 'Transito' | 'Cedi' | 'Saldo' | 'Destruccion'

export const NOMBRE_ESTADO_RTM: Record<EstadoRtm, string> = {
    Programado: 'Programado (sin pulir)', Pulido: 'Pulido · por digitar', Reparacion: 'Reparación', Transito: 'Tránsito (digitado)',
    Cedi: 'CEDI', Saldo: 'Saldo', Destruccion: 'Destrucción'
}

// Fecha y usuario que deja cada destino (el registro normal del proceso que lleva ahí)
const CAMPOS_DESTINO: Record<Exclude<EstadoRtm, 'Programado'>, { fecha: string; usuario: string } | null> = {
    Pulido: { fecha: 'pulido_fecha', usuario: 'pulido_user_id' },
    Reparacion: { fecha: 'reparacion_fecha', usuario: 'reparacion_user_id' },
    Transito: { fecha: 'digitado_fecha', usuario: 'digitado_user_id' },
    Cedi: { fecha: 'cedi_fecha', usuario: 'cedi_user_id' },
    Saldo: { fecha: 'saldo_fecha', usuario: 'saldo_user_id' },
    Destruccion: { fecha: 'destruccion_fecha', usuario: 'destruccion_user_id' }
}

export interface OrdenRtm {
    id: number
    orden_fabricacion: string
    numero_pedido: string | null
    producto_sku: string | null
    producto_descripcion: string | null
    familia: string | null
    cantidad: number
    cantidad_completada_sap: number
    cliente: string | null
    comentario: string | null
    fecha_entrega_estimada: string | null
    fecha_ideal_produccion: string | null
    fecha_entrega_lote: string | null
    fecha_real_liberacion: string | null
    fecha_ideal_entrega_produccion: string | null
    fecha_prometida_entrega: string | null
    created_at: string
    programado: number
    pulido: number
    reparacion: number
    transito: number
    cedi: number
    saldo: number
    destruccion: number
    registradas: number
}

const SIN_TABLAS = /ordenes_fabricacion_rtm|trazabilidad_rtm|movimientos_rtm|productos_rtm|relation|schema cache/i
export const mensajeErrorRtm = (e: unknown) => {
    const m = e instanceof Error ? e.message : (e as { message?: string })?.message || String(e)
    return SIN_TABLAS.test(m) ? 'Faltan las tablas de Superficies: ejecute superficies_rtm.sql en Supabase.' : m
}

// Órdenes pendientes con sus conteos por proceso, de la más atrasada a la más reciente (fecha T del Semáforo)
export async function cargarOrdenesRtm(): Promise<OrdenRtm[]> {
    const { data, error } = await supabase.from('ordenes_fabricacion_rtm_v').select('*')
    if (error) throw new Error(mensajeErrorRtm(error))
    const fecha = (o: OrdenRtm) => o.fecha_entrega_lote || o.fecha_ideal_produccion || o.fecha_entrega_estimada || '9999'
    return ((data || []) as OrdenRtm[]).sort((a, b) => String(fecha(a)).localeCompare(String(fecha(b))) || a.orden_fabricacion.localeCompare(b.orden_fabricacion))
}

export const disponiblesEn = (o: OrdenRtm, estado: EstadoRtm) =>
    estado === 'Programado' ? o.programado : estado === 'Pulido' ? o.pulido : estado === 'Reparacion' ? o.reparacion
        : estado === 'Transito' ? o.transito : estado === 'Cedi' ? o.cedi : estado === 'Saldo' ? o.saldo : o.destruccion

async function historial(filas: { origen: string; accion: string; of: string; antes: string; despues: string; cantidad: number; detalle?: Record<string, unknown> }[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('El registro se hizo, pero NO quedó en el historial: no hay una sesión activa.')
    const { error } = await supabase.from('movimientos_rtm').insert(filas.map(f => ({
        usuario_email: user.email, origen: f.origen, accion: f.accion, orden_fabricacion: f.of,
        estado_antes: f.antes, estado_despues: f.despues, cantidad: f.cantidad, detalle: f.detalle ?? null
    })))
    if (error) throw new Error(`El registro se hizo, pero NO quedó en el historial: ${mensajeErrorRtm(error)}`)
}

/**
 * Mueve `cantidad` unidades de la OF de un estado a otro.
 *  - Desde Programado: se crean las unidades (registro de pulido) en el destino.
 *  - Hacia Programado: se borran las unidades (vuelven a estar sin pulir).
 *  - Entre estados: se toman las unidades más antiguas de ese estado.
 * Revisa la cantidad disponible en la base en ese momento (no la de la pantalla).
 */
export async function moverUnidadesRtm(orden: Pick<OrdenRtm, 'id' | 'orden_fabricacion' | 'cantidad'>, desde: EstadoRtm, hacia: EstadoRtm,
    cantidad: number, usuarioEmail: string, origen: string, motivo?: string): Promise<number> {
    const n = Math.floor(Number(cantidad))
    if (!(n > 0)) throw new Error('La cantidad debe ser mayor que cero.')
    if (desde === hacia) throw new Error('El proceso de origen y el de destino son el mismo.')
    const userId = await requireUserId(usuarioEmail)
    const ahora = new Date().toISOString()

    if (desde === 'Programado') {
        const { count, error: errC } = await supabase.from('trazabilidad_rtm').select('id', { count: 'exact', head: true }).eq('orden_fabricacion_id', orden.id)
        if (errC) throw new Error(mensajeErrorRtm(errC))
        const libres = Math.max(0, Number(orden.cantidad) - (count || 0))
        if (n > libres) throw new Error(`La OF ${orden.orden_fabricacion} solo tiene ${libres} unidad(es) sin pulir.`)
        const marca = ahora.replace(/[-:T.Z]/g, '').slice(0, 14)
        const destino = CAMPOS_DESTINO[hacia as Exclude<EstadoRtm, 'Programado'>]
        const filas = Array.from({ length: n }, (_, i) => ({
            registrer: `RTM-${orden.orden_fabricacion}-${marca}-${String((count || 0) + i + 1).padStart(3, '0')}`,
            orden_fabricacion_id: orden.id,
            estado: hacia,
            // Toda unidad registrada pasó por Pulido; si va a otro proceso queda también su fecha
            pulido_fecha: ahora, pulido_user_id: userId,
            ...(destino && hacia !== 'Pulido' ? { [destino.fecha]: ahora, [destino.usuario]: userId } : {})
        }))
        const { error } = await supabase.from('trazabilidad_rtm').insert(filas)
        if (error) throw new Error(`No se pudo registrar: ${mensajeErrorRtm(error)}`)
    } else {
        const { data: unidades, error: errU } = await supabase.from('trazabilidad_rtm').select('id')
            .eq('orden_fabricacion_id', orden.id).eq('estado', desde).order('id', { ascending: true }).limit(n)
        if (errU) throw new Error(mensajeErrorRtm(errU))
        if ((unidades || []).length < n) throw new Error(`La OF ${orden.orden_fabricacion} solo tiene ${(unidades || []).length} unidad(es) en ${NOMBRE_ESTADO_RTM[desde]}.`)
        const ids = (unidades || []).map(u => u.id)
        if (hacia === 'Programado') {
            const { error } = await supabase.from('trazabilidad_rtm').delete().in('id', ids)
            if (error) throw new Error(`No se pudo devolver a Programado: ${mensajeErrorRtm(error)}`)
        } else {
            const destino = CAMPOS_DESTINO[hacia]
            const cambios: Record<string, unknown> = { estado: hacia }
            if (destino) { cambios[destino.fecha] = ahora; cambios[destino.usuario] = userId }
            const { data, error } = await supabase.from('trazabilidad_rtm').update(cambios).in('id', ids).select('id')
            if (error) throw new Error(`No se pudo registrar: ${mensajeErrorRtm(error)}`)
            if ((data || []).length !== n) throw new Error(`Solo se movieron ${(data || []).length} de ${n} unidad(es). Revise los permisos.`)
        }
    }
    await historial([{ origen, accion: hacia === 'Programado' ? 'devolver_programado' : desde === 'Programado' ? 'registrar' : 'mover',
        of: orden.orden_fabricacion, antes: desde, despues: hacia, cantidad: n, detalle: motivo ? { motivo } : undefined }])
    return n
}

export interface MovimientoRtm {
    id: number; created_at: string; usuario_email: string; origen: string; accion: string; orden_fabricacion: string | null
    estado_antes: string | null; estado_despues: string | null; cantidad: number; detalle: Record<string, unknown> | null
}
export async function cargarMovimientosRtm(limite = 300, of?: string): Promise<MovimientoRtm[]> {
    let q = supabase.from('movimientos_rtm').select('*').order('created_at', { ascending: false }).limit(limite)
    if (of) q = q.eq('orden_fabricacion', of)
    const { data, error } = await q
    if (error) throw new Error(mensajeErrorRtm(error))
    return (data || []) as MovimientoRtm[]
}

// Unidades con fecha de cada proceso desde `desde` (para el dashboard y los indicadores del día)
export interface UnidadRtm {
    orden_fabricacion_id: number; estado: string; pulido_fecha: string | null; reparacion_fecha: string | null; digitado_fecha: string | null
    cedi_fecha: string | null; saldo_fecha: string | null; destruccion_fecha: string | null
}
export async function cargarUnidadesDesde(desde: string): Promise<UnidadRtm[]> {
    const cols = 'orden_fabricacion_id, estado, pulido_fecha, reparacion_fecha, digitado_fecha, cedi_fecha, saldo_fecha, destruccion_fecha'
    const filas: UnidadRtm[] = []
    for (let a = 0; ; a += 1000) {
        const { data, error } = await supabase.from('trazabilidad_rtm').select(cols)
            .or(`pulido_fecha.gte.${desde},digitado_fecha.gte.${desde},cedi_fecha.gte.${desde},reparacion_fecha.gte.${desde},saldo_fecha.gte.${desde},destruccion_fecha.gte.${desde}`)
            .order('id').range(a, a + 999)
        if (error) throw new Error(mensajeErrorRtm(error))
        filas.push(...((data || []) as UnidadRtm[]))
        if (!data || data.length < 1000) break
    }
    return filas
}

// Órdenes (todas, también cerradas) por id: producto de las unidades del dashboard
export async function cargarOrdenesPorId(ids: number[]): Promise<Map<number, { of: string; sku: string | null; descripcion: string | null }>> {
    const m = new Map<number, { of: string; sku: string | null; descripcion: string | null }>()
    for (let i = 0; i < ids.length; i += 300) {
        const { data, error } = await supabase.from('ordenes_fabricacion_rtm').select('id, orden_fabricacion, producto_sku, producto_descripcion').in('id', ids.slice(i, i + 300))
        if (error) throw new Error(mensajeErrorRtm(error))
        for (const o of data || []) m.set(o.id, { of: o.orden_fabricacion, sku: o.producto_sku, descripcion: o.producto_descripcion })
    }
    return m
}

// Parámetros por producto (kg por unidad)
export async function cargarParametrosRtm(): Promise<Map<string, number | null>> {
    const { data, error } = await supabase.from('productos_rtm_parametros').select('producto_sku, kg_unidad')
    if (error) throw new Error(mensajeErrorRtm(error))
    return new Map((data || []).map(p => [String(p.producto_sku), p.kg_unidad == null ? null : Number(p.kg_unidad)]))
}
export async function guardarParametroRtm(sku: string, kg: number | null, usuarioEmail: string) {
    const { error } = await supabase.from('productos_rtm_parametros').upsert({ producto_sku: sku, kg_unidad: kg, actualizado_por: usuarioEmail, updated_at: new Date().toISOString() }, { onConflict: 'producto_sku' })
    if (error) throw new Error(mensajeErrorRtm(error))
}

// Día de hoy en Bogotá (AAAA-MM-DD) y si una fecha (timestamptz) cae en ese día
export const hoyBogotaRtm = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
export const diaBogota = (f: string | null | undefined) => (f ? new Date(f).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) : '')
