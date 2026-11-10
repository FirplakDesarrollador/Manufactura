import { supabase } from '@/lib/supabase'
import { lugarPieza } from '@/lib/fibra/procesoActual'
import { liberarMolde, requireUserId } from './helpers'

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

// Libera uno o varios moldes (quedan Disponibles; si están en reparación o por desmanchar conservan ese estado)
export async function liberarMoldes(ids: number[], usuarioEmail: string) {
    await requireUserId(usuarioEmail)
    for (const id of ids) await liberarMolde(id, usuarioEmail)
    const { data, error } = await supabase.from('moldes').select('id, estado').in('id', ids)
    if (error) throw new Error(`No se pudo comprobar la liberación: ${error.message}`)
    const siguen = (data || []).filter(m => m.estado === 'En uso').length
    if (siguen > 0) throw new Error(`${siguen} molde(s) siguen En uso: revise los permisos o vuelva a intentar.`)
}
