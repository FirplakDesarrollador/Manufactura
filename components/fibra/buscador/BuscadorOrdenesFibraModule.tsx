'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion } from '@/types/pintura'
import { parseDBDate } from '@/lib/utils/date'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { Search, Eraser, RefreshCw, ChevronsUpDown, FileText, Clipboard, Users, AlertTriangle } from 'lucide-react'

// Buscador de órdenes FV (solo consulta): en qué proceso están las piezas de cada orden,
// su historial por pieza y el detalle de la orden en SAP.

export type Etapa = { key: keyof OrdenFabricacion | 'programado'; label: string }

// Orden del flujo de la planta; Saldo y Destrucción van al final
export const ETAPAS: Etapa[] = [
    { key: 'programado', label: 'Programado' },
    { key: 'pintura', label: 'Pintura' },
    { key: 'desgelcada', label: 'Desgelcada' },
    { key: 'vaciado', label: 'Vaciado' },
    { key: 'estanteria', label: 'Estantería' },
    { key: 'pulido', label: 'Pulido' },
    { key: 'acabado', label: 'Acabado' },
    { key: 'reparacion', label: 'Reparación' },
    { key: 'reparacion_larga', label: 'Rep. larga' },
    { key: 'empaque', label: 'Empaque' },
    { key: 'digitado', label: 'Digitado' },
    { key: 'transito', label: 'Tránsito' },
    { key: 'cedi', label: 'CEDI' },
    { key: 'saldo', label: 'Saldo' },
    { key: 'destruccion', label: 'Destrucción' }
]

type EstadoOrden = 'Sin iniciar' | 'En proceso' | 'Entregada'

// Mismo cálculo de la tarjeta de Administración (OrdenCard): programado = cantidad − piezas en etapas
export function piezasPorEtapa(o: OrdenFabricacion) {
    const v = (n?: number) => Math.max(0, n || 0)
    const cantidad = Math.max(0, o.cantidad || o.cantidad_programada || 0)
    const sumEtapas = v(o.pintura) + v(o.pulido) + v(o.reparacion) + v(o.saldo) + v(o.empaque) + v(o.transito) +
        v(o.vaciado) + v(o.estanteria) + v(o.acabado) + v(o.reparacion_larga) + v(o.digitado) + v(o.cedi)
    const piezas: Record<string, number> = { programado: Math.max(0, cantidad - sumEtapas) }
    for (const e of ETAPAS) if (e.key !== 'programado') piezas[e.key] = v(o[e.key] as number | undefined)
    const estado: EstadoOrden = cantidad > 0 && piezas.cedi >= cantidad ? 'Entregada' : piezas.programado >= cantidad ? 'Sin iniciar' : 'En proceso'
    return { cantidad, piezas, estado, excedida: cantidad > 0 && sumEtapas > cantidad }
}

const COLOR_ESTADO: Record<EstadoOrden, string> = {
    'Sin iniciar': 'bg-slate-100 text-slate-700 border-slate-300',
    'En proceso': 'bg-amber-50 text-amber-800 border-amber-300',
    'Entregada': 'bg-emerald-50 text-emerald-800 border-emerald-300'
}

const fecha = (d?: string | null) => d ? parseDBDate(d).toLocaleDateString('es-ES') : '—'

export default function BuscadorOrdenesFibraModule() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [etapaFiltro, setEtapaFiltro] = useState<string>('')
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoOrden | ''>('')
    const [abiertas, setAbiertas] = useState<Set<number>>(new Set())
    const [detalleOf, setDetalleOf] = useState<string | null>(null)
    const [limite, setLimite] = useState(50)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        const { data, error } = await supabase.from('ordenes_fabricacion_fv').select('*').order('fecha_entrega_estimada', { ascending: true })
        if (error) setError(`No se pudieron cargar las órdenes: ${error.message}`)
        else setOrdenes(data || [])
        setCargando(false)
    }

    useEffect(() => { cargar() }, [])
    useEffect(() => { setLimite(50) }, [busqueda, etapaFiltro, estadoFiltro])

    const conEtapas = useMemo(() => ordenes.map(o => ({ o, ...piezasPorEtapa(o) })), [ordenes])

    const porBusqueda = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        if (!q) return conEtapas
        return conEtapas.filter(({ o }) => [o.orden_fabricacion, o.pedido, (o as any).numero_pedido, o.producto_descripcion, o.producto_sku, o.molde_descripcion, o.molde_sku, o.cliente]
            .some(v => String(v ?? '').toLowerCase().includes(q)))
    }, [conEtapas, busqueda])

    // Totales por proceso según la búsqueda y el estado (sin el filtro de proceso, para poder cambiarlo)
    const totales = useMemo(() => {
        const t: Record<string, { piezas: number; ordenes: number }> = {}
        for (const e of ETAPAS) t[e.key] = { piezas: 0, ordenes: 0 }
        for (const r of porBusqueda) {
            if (estadoFiltro && r.estado !== estadoFiltro) continue
            for (const e of ETAPAS) if (r.piezas[e.key] > 0) { t[e.key].piezas += r.piezas[e.key]; t[e.key].ordenes++ }
        }
        return t
    }, [porBusqueda, estadoFiltro])

    const filtradas = useMemo(() => porBusqueda.filter(r =>
        (!estadoFiltro || r.estado === estadoFiltro) && (!etapaFiltro || r.piezas[etapaFiltro] > 0)
    ), [porBusqueda, estadoFiltro, etapaFiltro])

    const conteoEstados = useMemo(() => {
        const c: Record<EstadoOrden, number> = { 'Sin iniciar': 0, 'En proceso': 0, 'Entregada': 0 }
        for (const r of porBusqueda) c[r.estado]++
        return c
    }, [porBusqueda])

    const alternar = (id: number) => setAbiertas(prev => {
        const n = new Set(prev)
        if (n.has(id)) n.delete(id)
        else n.add(id)
        return n
    })

    const hayFiltros = busqueda || etapaFiltro || estadoFiltro

    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40 overflow-hidden">
            {/* Barra de búsqueda y estados */}
            <div className="bg-white border-b border-[#e2ded5] px-4 py-3 space-y-3">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-[#324354] mr-2">
                        <Search className="w-5 h-5" />
                        <h2 className="text-base sm:text-lg font-black">Buscador de órdenes FV</h2>
                    </div>
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            autoFocus
                            placeholder="OF, pedido, SKU, producto, molde o cliente"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 bg-[#F6F3EE] border border-[#e2ded5] rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-[#324354]/30"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        {(Object.keys(conteoEstados) as EstadoOrden[]).map(e => (
                            <button key={e} onClick={() => setEstadoFiltro(estadoFiltro === e ? '' : e)}
                                className={`h-9 px-3 rounded-lg border text-xs font-bold whitespace-nowrap ${estadoFiltro === e ? 'bg-[#324354] text-white border-[#324354]' : COLOR_ESTADO[e]}`}>
                                {e} <span className="font-black">{conteoEstados[e]}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { setBusqueda(''); setEtapaFiltro(''); setEstadoFiltro('') }} disabled={!hayFiltros}
                        className="h-9 w-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-40" title="Limpiar filtros">
                        <Eraser size={16} />
                    </button>
                    <button onClick={cargar} disabled={cargando}
                        className="h-9 w-9 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar órdenes">
                        <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Piezas por proceso: clic para ver solo las órdenes con piezas en ese proceso */}
                <div className="max-w-7xl mx-auto flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                    {ETAPAS.map(e => {
                        const t = totales[e.key]
                        const activa = etapaFiltro === e.key
                        return (
                            <button key={e.key} onClick={() => setEtapaFiltro(activa ? '' : e.key)}
                                title={`${t.piezas} pieza(s) en ${e.label} · ${t.ordenes} orden(es)`}
                                className={`shrink-0 min-w-[78px] px-2 py-1 rounded-lg border text-center transition-colors ${activa ? 'bg-[#324354] border-[#324354] text-white' : t.piezas > 0 ? 'bg-white border-[#e2ded5] text-[#324354] hover:bg-slate-50' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                <div className="text-[9px] font-black uppercase leading-tight">{e.label}</div>
                                <div className="text-sm font-black leading-tight">{t.piezas}</div>
                                <div className={`text-[9px] leading-tight ${activa ? 'text-white/70' : 'text-slate-400'}`}>{t.ordenes} OF</div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Lista de órdenes */}
            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-7xl mx-auto space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-3 py-1 bg-[#324354] text-white rounded-full font-black">{filtradas.length} orden(es)</span>
                        {etapaFiltro && <span className="text-slate-500 font-semibold">con piezas en <b>{ETAPAS.find(e => e.key === etapaFiltro)?.label}</b></span>}
                    </div>

                    {error ? (
                        <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2"><AlertTriangle size={18} /> {error}</div>
                    ) : cargando ? (
                        <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-[#e2ded5]">Cargando órdenes...</div>
                    ) : filtradas.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-[#e2ded5]">No se encontraron órdenes</div>
                    ) : (
                        <>
                            {filtradas.slice(0, limite).map(({ o, cantidad, piezas, estado, excedida }) => {
                                const abierta = abiertas.has(o.id)
                                const avance = cantidad > 0 ? Math.min(100, Math.round((piezas.cedi / cantidad) * 100)) : 0
                                return (
                                    <div key={o.id} className="space-y-2">
                                        <div className="flex gap-3 items-stretch">
                                        <div className={`flex-1 min-w-0 bg-white rounded-xl border shadow-sm p-3 flex flex-col lg:flex-row gap-3 ${excedida ? 'border-red-400' : 'border-[#e2ded5]'}`}>
                                            {/* Datos de la orden */}
                                            <div className="lg:w-[30%] min-w-0 lg:pr-3 lg:border-r border-[#e2ded5]">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Clipboard size={14} className="text-[#324354]" />
                                                    <span className="text-sm font-black text-[#324354]">OF {o.orden_fabricacion}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO[estado]}`}>{estado}</span>
                                                    {excedida && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">Piezas en etapas &gt; cantidad</span>}
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-800 mt-1 leading-snug break-words">{o.producto_descripcion || o.molde_descripcion || o.producto_sku || 'Sin descripción'}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">SKU: {o.producto_sku || o.molde_sku || '—'} · Pedido: {o.pedido || (o as any).numero_pedido || '—'}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">Ideal producción: <b>{fecha(o.fecha_ideal_produccion)}</b> · Entrega: <b>{fecha(o.fecha_entrega_estimada)}</b></div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate"><Users size={11} /> {o.cliente || (o as any).cliente_nombre || 'Cliente no registrado'}</div>
                                            </div>

                                            {/* Procesos */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">Cantidad {cantidad}</span>
                                                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" title={`${piezas.cedi} de ${cantidad} en CEDI`}>
                                                        <div className="h-full bg-[#59a96a]" style={{ width: `${avance}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-[#324354] shrink-0">{avance}% en CEDI</span>
                                                </div>
                                                <div className="grid grid-cols-5 sm:grid-cols-8 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
                                                    {ETAPAS.map(e => {
                                                        const n = piezas[e.key]
                                                        return (
                                                            <div key={e.key} title={`${e.label}: ${n}`}
                                                                className={`rounded-md border px-0.5 py-1 text-center ${n > 0 ? (e.key === etapaFiltro ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-[#324354] border-[#324354] text-white') : 'bg-white border-slate-200 text-slate-300'}`}>
                                                                <div className="text-[8px] font-black uppercase leading-tight truncate">{e.label}</div>
                                                                <div className="text-sm font-black leading-tight">{n}</div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones: mismos botones y posición que Administración */}
                                        <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm justify-center shrink-0">
                                            <button onClick={() => alternar(o.id)}
                                                className={`p-2 rounded-lg transition-colors ${abierta ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50 bg-blue-50/50'}`}
                                                title={abierta ? 'Ocultar procesos por pieza' : 'Ver procesos por pieza'}>
                                                <ChevronsUpDown size={18} />
                                            </button>
                                            <button onClick={() => setDetalleOf(o.orden_fabricacion)}
                                                className="p-2 text-[#324354] hover:bg-slate-100 rounded-lg transition-colors bg-slate-50"
                                                title="Detalle de la orden en SAP (lista de materiales, comentarios)">
                                                <FileText size={18} />
                                            </button>
                                        </div>
                                        </div>
                                        {abierta && <OrderProcessesPanel orden={o} registros={[]} />}
                                    </div>
                                )
                            })}
                            {filtradas.length > limite && (
                                <button onClick={() => setLimite(l => l + 50)}
                                    className="w-full py-2 rounded-xl bg-white border border-[#e2ded5] text-[#324354] font-bold text-xs hover:bg-slate-50">
                                    Ver más ({filtradas.length - limite} restantes)
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {detalleOf != null && <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)} />}
        </div>
    )
}
