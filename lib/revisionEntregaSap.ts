import { fetchSAP } from '@/lib/sap'
import { sapBaseUrl } from '@/lib/sapTraslados'
import { grupoMaterial } from '@/lib/gruposMateriales'

// Revisión de componentes para la entrega, EN BLOQUE (servidor): al entregar la OF, SAP descuenta de la bodega de cada
// componente lo cargado a la orden. Se revisa que esa bodega tenga en existencia lo que falta por descontar
// (requerido − consumido) de cada componente, salvo la mano de obra/CIF y las piezas del despiece de Muebles (CMPD09).
// En bloque: las listas de materiales se piden de a 20 OF por consulta y la existencia de cada componente una sola vez,
// aunque lo usen muchas OF. Las consultas van una tras otra (en la misma sesión de SAP, en paralelo se bloquean).
// Si SAP no entrega la existencia de un componente se informa como "sin dato", nunca como cubierto.

export type ComponenteEntrega = {
    item: string; descripcion: string; bodega: string; requerido: number; consumido: number; pendiente: number
    existencia: number | null; grupo?: string; estado: 'ok' | 'consumido' | 'faltante' | 'sin_dato'
}
export type ResultadoEntrega = {
    orden_fabricacion: string
    estado: 'completo' | 'faltante' | 'sin_dato'
    exigidos: number; cubiertos: number; faltantes: number; sin_dato: number
    detalle: ComponenteEntrega[]
    calculado_at: string
}
export type ResultadoBloque = Map<string, ResultadoEntrega | { error: string }>

const red = (n: number) => Math.round(n * 10000) / 10000
const LOTE_OF = 20
const LOTE_ITEMS = 20

/** Componentes que no se exigen para la entrega. */
export const componenteExcluido = (item: string, descripcion: string) =>
    grupoMaterial(descripcion) === 'mo' || item.toUpperCase().startsWith('CMPD09')

export async function revisarEnBloque(ofsEntrada: string[], baseUrl = sapBaseUrl()): Promise<ResultadoBloque> {
    const ofs = [...new Set(ofsEntrada.map(o => String(o).trim()).filter(o => /^\d+$/.test(o)))]
    const salida: ResultadoBloque = new Map()
    if (!ofs.length) return salida

    // 1) Listas de materiales, de a 20 OF por consulta
    type Req = { item: string; descripcion: string; bodega: string; requerido: number; consumido: number }
    const porOf = new Map<string, Map<string, Req>>()
    for (let i = 0; i < ofs.length; i += LOTE_OF) {
        const lote = ofs.slice(i, i + LOTE_OF)
        const filtro = lote.map(o => `DocumentNumber eq ${o}`).join(' or ')
        const r = await fetchSAP(`${baseUrl}/ProductionOrders?$select=DocumentNumber,ProductionOrderLines&$filter=${encodeURIComponent(filtro)}`,
            { method: 'GET', headers: { Prefer: `odata.maxpagesize=${LOTE_OF}` } as any })
        if (!r.ok) {
            for (const o of lote) salida.set(o, { error: `SAP no respondió las órdenes (${r.status})` })
            continue
        }
        for (const po of (await r.json()).value || []) {
            const of = String(po.DocumentNumber)
            const lineas: any[] = Array.isArray(po.ProductionOrderLines) ? po.ProductionOrderLines : []
            if (!lineas.length) { salida.set(of, { error: 'SAP no entregó la lista de materiales' }); continue }
            const req = new Map<string, Req>()
            for (const l of lineas) {
                const item = String(l.ItemNo || '').trim(); if (!item) continue
                const descripcion = String(l.ItemName || '')
                if (componenteExcluido(item, descripcion)) continue
                const bodega = String(l.Warehouse || '').trim()
                const k = `${item}|${bodega}`
                const x = req.get(k) || { item, descripcion, bodega, requerido: 0, consumido: 0 }
                x.requerido += Number(l.PlannedQuantity) || 0; x.consumido += Number(l.IssuedQuantity) || 0; req.set(k, x)
            }
            porOf.set(of, req)
        }
        for (const o of lote) if (!porOf.has(o) && !salida.has(o)) salida.set(o, { error: 'La OF no está en SAP' })
    }

    // 2) Existencia por bodega: cada componente una sola vez, de a 20 por consulta
    const codigos = [...new Set([...porOf.values()].flatMap(m => [...m.values()].map(x => x.item)))]
    const stock = new Map<string, Map<string, number>>()
    let errorStock: string | null = null
    for (let i = 0; i < codigos.length; i += LOTE_ITEMS) {
        const filtro = codigos.slice(i, i + LOTE_ITEMS).map(c => `ItemCode eq '${c.replace(/'/g, "''")}'`).join(' or ')
        const s = await fetchSAP(`${baseUrl}/Items?$select=ItemCode,ItemWarehouseInfoCollection&$filter=${encodeURIComponent(filtro)}`,
            { method: 'GET', headers: { Prefer: `odata.maxpagesize=${LOTE_ITEMS}` } as any })
        if (!s.ok) { errorStock = `SAP no entregó las existencias (${s.status})`; break }
        for (const it of (await s.json()).value || []) {
            const m = new Map<string, number>()
            for (const w of it.ItemWarehouseInfoCollection || []) m.set(String(w.WarehouseCode || '').trim().toUpperCase(), Number(w.InStock) || 0)
            stock.set(String(it.ItemCode).trim(), m)
        }
    }

    // 3) Resultado por OF
    const ahora = new Date().toISOString()
    for (const [of, req] of porOf) {
        if (errorStock) { salida.set(of, { error: errorStock }); continue }
        const detalle: ComponenteEntrega[] = [...req.values()].map(x => {
            const pendiente = red(Math.max(0, x.requerido - x.consumido))
            const existencia = stock.get(x.item)?.get(x.bodega.toUpperCase())
            const estado = pendiente <= 1e-6 ? 'consumido' : existencia === undefined ? 'sin_dato'
                : existencia >= pendiente - Math.max(1e-6, pendiente * 0.001) ? 'ok' : 'faltante'
            return { ...x, requerido: red(x.requerido), consumido: red(x.consumido), pendiente, existencia: existencia === undefined ? null : red(existencia), grupo: grupoMaterial(x.descripcion), estado }
        })
        const n = (e: string) => detalle.filter(d => d.estado === e).length
        salida.set(of, {
            orden_fabricacion: of,
            estado: n('faltante') ? 'faltante' : n('sin_dato') ? 'sin_dato' : 'completo',
            exigidos: detalle.length, cubiertos: n('ok') + n('consumido'), faltantes: n('faltante'), sin_dato: n('sin_dato'),
            detalle, calculado_at: ahora,
        })
    }
    return salida
}
