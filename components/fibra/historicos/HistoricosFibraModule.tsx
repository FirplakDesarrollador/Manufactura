'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, FileText, History, RefreshCw, Search, X } from 'lucide-react'

// Históricos FV (solo consulta): todas las órdenes que han pasado por el Control de Piso FV, abiertas y cerradas,
// en tabla con buscador. Al tocar una orden se abre su trazabilidad pieza por pieza (la misma de Administración).
// Fuente: ordenes_fabricacion_fibra (sin el filtro pendiente = true de la vista ordenes_fabricacion_fv), con el mismo
// criterio de planta de esa vista: producto de Fibra de vidrio, o sin producto y SKU VTIN / VHEM / VHPT / PPRD.

type EstadoHist = 'Abierta' | 'Cerrada' | 'Eliminada'

type FilaHist = {
    id: number
    orden_fabricacion: string
    numero_pedido: string
    cliente: string
    producto_sku: string
    descripcion: string
    cantidad: number
    liberacion: string
    entrega: string
    estado: EstadoHist
    modificado_por: string
}

type Piezas = { total: number; cedi: number; proceso: number; saldo: number; destruccion: number }

const PREFIJOS_FV = ['VTIN', 'VHEM', 'VHPT', 'PPRD']
const POR_PAGINA = 100

const COLOR_ESTADO: Record<EstadoHist, string> = {
    'Abierta': 'bg-amber-50 text-amber-800 border-amber-300',
    'Cerrada': 'bg-emerald-50 text-emerald-800 border-emerald-300',
    'Eliminada': 'bg-rose-50 text-rose-700 border-rose-300'
}

type Campo = 'orden_fabricacion' | 'numero_pedido' | 'producto_sku' | 'descripcion' | 'cliente' | 'cantidad' | 'liberacion' | 'entrega' | 'estado'

const fecha = (v?: string | null) => {
    if (!v) return ''
    const [a, m, d] = v.slice(0, 10).split('-')
    return a && m && d ? `${d}/${m}/${a}` : v
}

// Lee una tabla completa en bloques de 1000 (límite de Supabase por consulta)
async function leerTodo<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
    const filas: T[] = []
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await consulta(desde, desde + 999)
        if (error) throw new Error(error.message)
        filas.push(...(data || []))
        if (!data || data.length < 1000) break
    }
    return filas
}

export default function HistoricosFibraModule() {
    const [filas, setFilas] = useState<FilaHist[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoHist | ''>('')
    const [orden, setOrden] = useState<{ campo: Campo; asc: boolean }>({ campo: 'liberacion', asc: false })
    const [limite, setLimite] = useState(POR_PAGINA)
    const [piezas, setPiezas] = useState<Record<number, Piezas>>({})
    const [detalle, setDetalle] = useState<FilaHist | null>(null)
    const [detalleSap, setDetalleSap] = useState<string | null>(null)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        try {
            const ordenes = await leerTodo<any>((d, h) => supabase.from('ordenes_fabricacion_fibra')
                .select('id, created_at, orden_fabricacion, numero_pedido, cliente, producto_sku, molde_descripcion, cantidad, fecha_entrega_estimada, pendiente, modificado_por')
                .order('id', { ascending: false }).range(d, h))

            // Descripción y planta de cada SKU (productos de la app y, si no está, productos desde SAP)
            const skus = [...new Set(ordenes.map(o => String(o.producto_sku || '').trim()).filter(Boolean))]
            const productos = new Map<string, { desc: string; planta: string | null }>()
            const sap = new Map<string, string>()
            for (let i = 0; i < skus.length; i += 200) {
                const bloque = skus.slice(i, i + 200)
                const [p, ps] = await Promise.all([
                    supabase.from('productos').select('producto_sku, producto_descripcion, planta').in('producto_sku', bloque),
                    supabase.from('productos desde sap').select('"Producto_Sku", "Producto_Descripcion"').in('Producto_Sku', bloque)
                ])
                for (const r of p.data || []) productos.set(r.producto_sku, { desc: r.producto_descripcion || '', planta: r.planta })
                for (const r of (ps.data || []) as any[]) sap.set(r.Producto_Sku, r.Producto_Descripcion || '')
            }

            const lista: FilaHist[] = ordenes
                .filter(o => {
                    const sku = String(o.producto_sku || '').trim()
                    const p = productos.get(sku)
                    return p ? p.planta === 'Fibra_de_vidrio' || (p.planta == null && PREFIJOS_FV.some(x => sku.startsWith(x)))
                        : PREFIJOS_FV.some(x => sku.startsWith(x))
                })
                .map(o => {
                    const sku = String(o.producto_sku || '').trim()
                    const mod = String(o.modificado_por || '')
                    const estado: EstadoHist = o.pendiente ? 'Abierta' : /elimin|cancel/i.test(mod) ? 'Eliminada' : 'Cerrada'
                    return {
                        id: o.id,
                        orden_fabricacion: String(o.orden_fabricacion || '').trim(),
                        numero_pedido: String(o.numero_pedido || '').trim(),
                        cliente: String(o.cliente || '').trim(),
                        producto_sku: sku,
                        descripcion: productos.get(sku)?.desc || sap.get(sku) || String(o.molde_descripcion || ''),
                        cantidad: Number(o.cantidad) || 0,
                        liberacion: o.created_at || '',
                        entrega: o.fecha_entrega_estimada || '',
                        estado,
                        modificado_por: mod
                    }
                })
            setFilas(lista)
        } catch (e: any) {
            setError(`No se pudieron cargar los históricos: ${e?.message || e}`)
        }
        setCargando(false)
    }

    useEffect(() => { cargar() }, [])
    useEffect(() => { setLimite(POR_PAGINA) }, [busqueda, estadoFiltro, orden])

    const conteo = useMemo(() => {
        const c: Record<EstadoHist, number> = { 'Abierta': 0, 'Cerrada': 0, 'Eliminada': 0 }
        for (const f of filas) c[f.estado]++
        return c
    }, [filas])

    const filtradas = useMemo(() => {
        const q = busqueda.trim().toUpperCase()
        const dir = orden.asc ? 1 : -1
        return filas
            .filter(f => !estadoFiltro || f.estado === estadoFiltro)
            .filter(f => !q || [f.orden_fabricacion, f.numero_pedido, f.producto_sku, f.descripcion, f.cliente].some(v => v.toUpperCase().includes(q)))
            .sort((a, b) => {
                const va = a[orden.campo], vb = b[orden.campo]
                const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es', { numeric: true })
                return r * dir || b.id - a.id
            })
    }, [filas, busqueda, estadoFiltro, orden])

    const visibles = useMemo(() => filtradas.slice(0, limite), [filtradas, limite])

    // Piezas por estado solo de las órdenes visibles (consulta liviana a trazabilidad_fv)
    useEffect(() => {
        const faltan = visibles.map(f => f.id).filter(id => !(id in piezas))
        if (!faltan.length) return
        let vivo = true
        ;(async () => {
            const nuevo: Record<number, Piezas> = {}
            for (const id of faltan) nuevo[id] = { total: 0, cedi: 0, proceso: 0, saldo: 0, destruccion: 0 }
            for (let i = 0; i < faltan.length; i += 100) {
                const { data, error } = await supabase.from('trazabilidad_fv').select('orden_fabricacion_id, estado')
                    .in('orden_fabricacion_id', faltan.slice(i, i + 100)).limit(10000)
                if (error) return
                for (const r of data || []) {
                    const p = nuevo[r.orden_fabricacion_id]
                    if (!p) continue
                    p.total++
                    if (r.estado === 'Cedi') p.cedi++
                    else if (r.estado === 'Saldo') p.saldo++
                    else if (r.estado === 'Destruccion') p.destruccion++
                    else p.proceso++
                }
            }
            if (vivo) setPiezas(prev => ({ ...prev, ...nuevo }))
        })()
        return () => { vivo = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibles])

    const ordenarPor = (campo: Campo) => setOrden(o => o.campo === campo ? { campo, asc: !o.asc }
        : { campo, asc: !(campo === 'liberacion' || campo === 'entrega' || campo === 'cantidad') })

    const Enc = ({ campo, texto, derecha }: { campo: Campo; texto: string; derecha?: boolean }) => (
        <th className={`px-2 py-2 font-black whitespace-nowrap ${derecha ? 'text-right' : 'text-left'}`}>
            <button type="button" onClick={() => ordenarPor(campo)} title="Ordenar"
                className={`inline-flex items-center gap-0.5 uppercase hover:text-[#324354] ${orden.campo === campo ? 'text-[#324354]' : ''}`}>
                {texto}
                {orden.campo === campo ? (orden.asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
            </button>
        </th>
    )

    // Escape cierra el detalle
    useEffect(() => {
        if (!detalle) return
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !detalleSap) setDetalle(null) }
        window.addEventListener('keydown', k)
        return () => window.removeEventListener('keydown', k)
    }, [detalle, detalleSap])

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            {/* Barra: buscador + estados + actualizar */}
            <div className="px-4 py-2 bg-white border-b border-[#e2ded5] flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 mr-2">
                    <History size={18} className="text-[#324354]" />
                    <span className="text-sm font-black text-[#324354] uppercase tracking-wide">Históricos FV</span>
                </div>
                <div className="relative flex-1 min-w-[220px] max-w-[520px]">
                    <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar OF, pedido, SKU, producto o cliente"
                        className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-300 bg-[#F6F3EE] text-xs font-semibold text-[#324354] outline-none focus:ring-2 focus:ring-[#324354]/20" />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Limpiar">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    {(Object.keys(conteo) as EstadoHist[]).map(e => (
                        <button key={e} onClick={() => setEstadoFiltro(estadoFiltro === e ? '' : e)}
                            className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${estadoFiltro === e ? 'bg-[#324354] text-white border-[#324354]' : COLOR_ESTADO[e]}`}>
                            {e === 'Abierta' ? 'Abiertas' : e === 'Cerrada' ? 'Cerradas' : 'Eliminadas'} <span className="font-black">{conteo[e]}</span>
                        </button>
                    ))}
                    <button onClick={() => { setPiezas({}); cargar() }} disabled={cargando}
                        className="h-8 w-8 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                    Órdenes encontradas: {filtradas.length} <span className="text-slate-400 normal-case font-semibold">· toque una orden para ver su trazabilidad</span>
                </div>
                {error ? (
                    <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2"><AlertTriangle size={18} /> {error}</div>
                ) : cargando ? (
                    <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Cargando históricos...</div>
                ) : filtradas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No se encontraron órdenes</div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#e2ded5] shadow-sm overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#F6F3EE] text-[10px] text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <Enc campo="orden_fabricacion" texto="OF" />
                                    <Enc campo="numero_pedido" texto="Pedido" />
                                    <Enc campo="producto_sku" texto="SKU" />
                                    <Enc campo="descripcion" texto="Producto" />
                                    <Enc campo="cliente" texto="Cliente" />
                                    <Enc campo="cantidad" texto="Cant." derecha />
                                    <th className="px-2 py-2 font-black text-left uppercase whitespace-nowrap">Piezas</th>
                                    <Enc campo="liberacion" texto="Liberación" />
                                    <Enc campo="entrega" texto="Entrega" />
                                    <Enc campo="estado" texto="Estado" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map(f => {
                                    const p = piezas[f.id]
                                    return (
                                        <tr key={f.id} onClick={() => setDetalle(f)}
                                            className="border-t border-slate-100 hover:bg-[#F6F3EE]/70 cursor-pointer">
                                            <td className="px-2 py-1.5 font-black text-[#324354] whitespace-nowrap">{f.orden_fabricacion}</td>
                                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{f.numero_pedido || '—'}</td>
                                            <td className="px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap">{f.producto_sku}</td>
                                            <td className="px-2 py-1.5 text-slate-700 max-w-[280px] truncate" title={f.descripcion}>{f.descripcion || '—'}</td>
                                            <td className="px-2 py-1.5 text-slate-600 max-w-[180px] truncate" title={f.cliente}>{f.cliente || '—'}</td>
                                            <td className="px-2 py-1.5 text-right font-black text-[#324354]">{f.cantidad}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                {!p ? <span className="text-slate-300">…</span> : p.total === 0 ? <span className="text-slate-400">Sin registros</span> : (
                                                    <span className="inline-flex gap-1">
                                                        <span className="px-1.5 rounded bg-emerald-50 text-emerald-700 font-bold" title="En CEDI">CEDI {p.cedi}</span>
                                                        {p.proceso > 0 && <span className="px-1.5 rounded bg-amber-50 text-amber-700 font-bold" title="En proceso">Proceso {p.proceso}</span>}
                                                        {p.saldo > 0 && <span className="px-1.5 rounded bg-slate-100 text-slate-700 font-bold">Saldo {p.saldo}</span>}
                                                        {p.destruccion > 0 && <span className="px-1.5 rounded bg-rose-50 text-rose-700 font-bold">Destr. {p.destruccion}</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{fecha(f.liberacion)}</td>
                                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{fecha(f.entrega)}</td>
                                            <td className="px-2 py-1.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${COLOR_ESTADO[f.estado]}`}
                                                    title={f.modificado_por || undefined}>{f.estado}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filtradas.length > limite && (
                            <button onClick={() => setLimite(l => l + POR_PAGINA)}
                                className="w-full py-2 border-t border-[#e2ded5] text-[#324354] font-bold text-xs hover:bg-slate-50">
                                Ver más ({filtradas.length - limite} restantes)
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Detalle: trazabilidad de la orden (solo consulta) */}
            {detalle && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget) setDetalle(null) }}>
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl min-h-[60vh] max-h-[94vh] overflow-y-auto">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                                <span className="text-xs font-black uppercase text-[#324354] bg-[#324354]/10 px-2.5 py-1 rounded-md">Histórico · Trazabilidad</span>
                                <h2 className="text-xl font-black text-[#324354] mt-2">OF {detalle.orden_fabricacion}</h2>
                                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                    {detalle.producto_sku} · {detalle.descripcion}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                                    <span><b className="text-[#7B8E90]">Pedido:</b> {detalle.numero_pedido || '—'}</span>
                                    <span><b className="text-[#7B8E90]">Cliente:</b> {detalle.cliente || '—'}</span>
                                    <span><b className="text-[#7B8E90]">Cantidad:</b> {detalle.cantidad}</span>
                                    <span><b className="text-[#7B8E90]">Liberación:</b> {fecha(detalle.liberacion)}</span>
                                    <span><b className="text-[#7B8E90]">Entrega:</b> {fecha(detalle.entrega)}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO[detalle.estado]}`}>{detalle.estado}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => setDetalleSap(detalle.orden_fabricacion)}
                                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
                                    title="Detalle de la orden en SAP (lista de materiales, comentarios)">
                                    <FileText size={15} /> SAP
                                </button>
                                <button onClick={() => setDetalle(null)}
                                    className="h-9 px-3 rounded-lg bg-[#324354] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#254153]">
                                    <X size={15} /> Cerrar
                                </button>
                            </div>
                        </div>
                        <OrderProcessesPanel orden={{ id: detalle.id, orden_fabricacion: detalle.orden_fabricacion } as any} registros={[]} />
                    </div>
                </div>
            )}

            {detalleSap != null && <DetalleOrdenSapModal ordenFabricacion={detalleSap} onClose={() => setDetalleSap(null)} />}
        </div>
    )
}
