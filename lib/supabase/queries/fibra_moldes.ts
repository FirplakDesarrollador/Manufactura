import { supabase } from '@/lib/supabase'
import { lugarPieza } from '@/lib/fibra/procesoActual'
import { liberarMolde, requireUserId } from './helpers'
import { moverPiezaFibra } from './fibra_administracion'
import { registrarMovimientosFv, OrigenMovimientoFv } from '@/lib/fibra/movimientos'

// Módulo Moldes (Control de piso FV): todos los moldes agrupados por tipo, con su estado y dónde está la pieza
// que lo ocupa. Una pieza ocupa su molde mientras está en Pintura o Vaciado (en FV y en MS); al salir de Vaciado
// el molde se libera. Un molde "En uso" sin ninguna pieza en esos estados quedó pegado y se puede liberar.

export type OcupacionMolde = {
    planta: 'FV' | 'MS'
    of: string
    estado: string
    lugar: string        // proceso o ubicación física (mesa del mapa) de la pieza
    fecha: string | null // fecha de pintura
}

export type MoldeUbicado = {
    id: number
    serial: string
    estado: string
    tipo: string
    planta: 'FV' | 'MS'
    vueltas: number
    modificadoPor: string | null
    modificado: string | null
    ocupacion: OcupacionMolde | null
}

// La tabla de moldes no dice la planta: los productos de Mármol (lavamanos, lavarropas, mesones…) se reconocen
// por el nombre; el resto (bañeras, faldones, zócalos…) es Fibra.
const ES_MS = /LAVAMANOS|LAVARROPAS|LAVAPLATOS|LAVATRAPEROS|MOLATRAPEROS|LAVAPLATOS|MESON|COCINA|PLAQUITA|MESA DE TRABAJO|\bLVM\b|MUESTRA/i
export const plantaDeMolde = (tipo: string): 'FV' | 'MS' => ES_MS.test(tipo) ? 'MS' : 'FV'

const ESTADOS_CON_MOLDE = ['Pintura', 'Vaciado']

export async function getMoldesUbicados(): Promise<MoldeUbicado[]> {
    const [moldesRes, fvRes, msRes] = await Promise.all([
        supabase.from('moldes')
            .select('id, serial, estado, nombre_articulo, vueltas_actuales, modificado_por, modified_at')
            .neq('estado', 'Destruido'),
        supabase.from('trazabilidad_fv')
            .select('molde_id, estado, mesa_fv, orden_fabricacion_id, pintura_fecha')
            .in('estado', ESTADOS_CON_MOLDE),
        supabase.from('query_trazabilidad_ms')
            .select('*')
            .in('estado', ESTADOS_CON_MOLDE)
    ])
    if (moldesRes.error) throw new Error(`No se pudieron leer los moldes: [${moldesRes.error.code}] ${moldesRes.error.message}`)
    if (fvRes.error) throw new Error(`No se pudieron leer las piezas de Fibra: [${fvRes.error.code}] ${fvRes.error.message}`)
    if (msRes.error) throw new Error(`No se pudieron leer las piezas de Mármol: [${msRes.error.code}] ${msRes.error.message}`)

    // Número de OF de las piezas FV
    const ordenIds = [...new Set((fvRes.data || []).map(p => p.orden_fabricacion_id).filter(Boolean))]
    const ofPorId = new Map<number, string>()
    for (let i = 0; i < ordenIds.length; i += 200) {
        const { data, error } = await supabase.from('ordenes_fabricacion_fv')
            .select('id, orden_fabricacion').in('id', ordenIds.slice(i, i + 200))
        if (error) throw new Error(`No se pudieron leer las órdenes de Fibra: ${error.message}`)
        for (const o of data || []) ofPorId.set(o.id, String(o.orden_fabricacion ?? ''))
    }

    // Molde → pieza que lo ocupa (la más reciente si hubiera varias)
    const ocupacion = new Map<number, OcupacionMolde>()
    const poner = (moldeId: number | null | undefined, o: OcupacionMolde) => {
        if (!moldeId) return
        const actual = ocupacion.get(moldeId)
        if (!actual || (o.fecha || '') > (actual.fecha || '')) ocupacion.set(moldeId, o)
    }
    for (const p of fvRes.data || []) {
        const mesa = p.mesa_fv ? ` · mesa ${String(p.mesa_fv).split('-')[1]}` : ''
        poner(p.molde_id, {
            planta: 'FV', of: ofPorId.get(p.orden_fabricacion_id) || '¿?', estado: p.estado,
            lugar: lugarPieza(p.estado, p.mesa_fv ?? null) + (p.mesa_fv && lugarPieza(p.estado, p.mesa_fv) !== lugarPieza(p.estado, null) ? mesa : ''),
            fecha: p.pintura_fecha
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialAId = new Map((moldesRes.data || []).map((m: any) => [String(m.serial).trim(), m.id as number]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (msRes.data || []) as any[]) {
        const id = p.molde_id ?? serialAId.get(String(p.molde_serial ?? '').trim())
        poner(id, { planta: 'MS', of: String(p.orden_fabricacion ?? '¿?'), estado: p.estado, lugar: p.estado, fecha: p.pintura_fecha ?? null })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (moldesRes.data || []).map((m: any) => {
        const tipo = String(m.nombre_articulo || '').trim() || '(Sin tipo de molde)'
        return {
            id: m.id, serial: String(m.serial ?? '').trim(), estado: m.estado || 'Indefinido', tipo,
            planta: plantaDeMolde(tipo), vueltas: m.vueltas_actuales || 0,
            modificadoPor: m.modificado_por ?? null, modificado: m.modified_at ?? null,
            ocupacion: ocupacion.get(m.id) ?? null
        }
    })
}

// Pieza de Fibra que ocupa cada molde (Pintura/Vaciado), para el selector de molde del mapa
export async function ocupacionMoldesFv(moldeIds: number[]): Promise<Map<number, OcupacionMolde & { registrer: string }>> {
    const res = new Map<number, OcupacionMolde & { registrer: string }>()
    if (moldeIds.length === 0) return res
    const { data, error } = await supabase.from('trazabilidad_fv')
        .select('registrer, molde_id, estado, mesa_fv, orden_fabricacion_id, pintura_fecha')
        .in('molde_id', moldeIds).in('estado', ESTADOS_CON_MOLDE)
    if (error) throw new Error(`No se pudo revisar qué piezas ocupan los moldes: [${error.code}] ${error.message}`)
    const ids = [...new Set((data || []).map(p => p.orden_fabricacion_id).filter(Boolean))]
    const { data: ofs } = ids.length ? await supabase.from('ordenes_fabricacion_fv').select('id, orden_fabricacion').in('id', ids) : { data: [] }
    const ofPorId = new Map((ofs || []).map(o => [o.id, String(o.orden_fabricacion ?? '')]))
    for (const p of data || []) {
        const actual = res.get(p.molde_id)
        if (actual && (actual.fecha || '') > (p.pintura_fecha || '')) continue
        res.set(p.molde_id, {
            planta: 'FV', registrer: String(p.registrer), of: ofPorId.get(p.orden_fabricacion_id) || '¿?', estado: p.estado,
            lugar: lugarPieza(p.estado, p.mesa_fv ?? null), fecha: p.pintura_fecha
        })
    }
    return res
}

// Libera un molde para volver a pintar con él. Si una pieza de Fibra lo ocupa (Pintura/Vaciado), esa pieza pasa a
// Pulido (se asume desmoldada): así la trazabilidad y el estado del molde quedan de acuerdo y Pintura lo acepta.
// Una pieza de Mármol no se mueve desde aquí. Todo queda en el historial de movimientos.
export async function liberarMoldeFv(moldeId: number, usuarioEmail: string, origen: OrigenMovimientoFv) {
    await requireUserId(usuarioEmail)
    const { data: piezas, error } = await supabase.from('trazabilidad_fv')
        .select('registrer, estado').eq('molde_id', moldeId).in('estado', ESTADOS_CON_MOLDE)
    if (error) throw new Error(`No se pudo revisar las piezas del molde: [${error.code}] ${error.message}`)
    for (const p of piezas || []) {
        await moverPiezaFibra(String(p.registrer), 'pulido', usuarioEmail, null, origen, `Liberar molde: la pieza estaba en ${p.estado}`)
    }
    const { data: antes } = await supabase.from('moldes').select('estado').eq('id', moldeId).maybeSingle()
    await liberarMolde(moldeId, usuarioEmail)
    const { data: despues, error: errDespues } = await supabase.from('moldes').select('estado').eq('id', moldeId).maybeSingle()
    if (errDespues) throw new Error(`No se pudo comprobar la liberación: ${errDespues.message}`)
    if (despues?.estado === 'En uso') throw new Error('El molde sigue En uso: revise los permisos o vuelva a intentar.')
    await registrarMovimientosFv([{
        origen, accion: 'liberar_molde', moldeId, estadoAntes: antes?.estado ?? null, estadoDespues: despues?.estado ?? null,
        detalle: { piezas_pasadas_a_pulido: (piezas || []).map(p => ({ registrer: String(p.registrer), estado: p.estado })) }
    }])
}

// Libera varios moldes (módulo Moldes)
export async function liberarMoldes(ids: number[], usuarioEmail: string) {
    for (const id of ids) await liberarMoldeFv(id, usuarioEmail, 'moldes')
}
