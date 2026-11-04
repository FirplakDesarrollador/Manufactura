'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getRegistrosTrazabilidadHoyMetricas, getAllMoldes } from '@/lib/supabase/queries/fibra'
import OrdenCard from '@/components/pintura/OrdenCard'
import EncabezadoFibra, { useMetricasFibra } from '../EncabezadoFibra'
import { OrderProcessesPanel } from '@/components/fibra/administracion/AdministracionFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { RefreshCw, ChevronsUpDown, FileText, AlertTriangle } from 'lucide-react'

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

export default function BuscadorOrdenesFibraModule() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [trazabilidad, setTrazabilidad] = useState<RegistroTrazabilidad[]>([])
    const [moldes, setMoldes] = useState<Molde[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState('')
    const [etapaFiltro, setEtapaFiltro] = useState<string>('')
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoOrden | ''>('')
    const [abiertas, setAbiertas] = useState<Set<number>>(new Set())
    const [detalleOf, setDetalleOf] = useState<string | null>(null)
    const [limite, setLimite] = useState(50)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        const [{ data, error }, trazaHoy, moldesData] = await Promise.all([
            supabase.from('ordenes_fabricacion_fv').select('*').order('fecha_entrega_estimada', { ascending: true }),
            getRegistrosTrazabilidadHoyMetricas(),
            getAllMoldes()
        ])
        if (error) setError(`No se pudieron cargar las órdenes: ${error.message}`)
        else setOrdenes(data || [])
        setTrazabilidad(trazaHoy)
        setMoldes(moldesData)
        setCargando(false)
    }

    useEffect(() => { cargar() }, [])
    useEffect(() => { setLimite(50) }, [busqueda, fechaFiltro, etapaFiltro, estadoFiltro])

    // Búsqueda y fecha: el mismo filtro base del encabezado común de piso FV
    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, trazabilidad, busqueda, fechaFiltro)
    const porBusqueda = useMemo(() => baseFilteredOrdenes.map(o => ({ o, ...piezasPorEtapa(o) })), [baseFilteredOrdenes])

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

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            <EncabezadoFibra
                metrics={metrics}
                searchText={busqueda}
                onSearchChange={setBusqueda}
                selectedDate={fechaFiltro}
                onDateChange={setFechaFiltro}
                onClear={() => { setBusqueda(''); setFechaFiltro(''); setEtapaFiltro(''); setEstadoFiltro('') }}
                loading={cargando}
                placeholder="OF, pedido, SKU, producto, molde o cliente"
                extra={
                    <div className="flex items-center gap-1.5">
                        {(Object.keys(conteoEstados) as EstadoOrden[]).map(e => (
                            <button key={e} onClick={() => setEstadoFiltro(estadoFiltro === e ? '' : e)}
                                className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${estadoFiltro === e ? 'bg-[#324354] text-white border-[#324354]' : COLOR_ESTADO[e]}`}>
                                {e} <span className="font-black">{conteoEstados[e]}</span>
                            </button>
                        ))}
                        <button onClick={cargar} disabled={cargando}
                            className="h-8 w-8 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar órdenes">
                            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                }
            />

            {/* Filtrar por proceso: clic para ver solo las órdenes con piezas en ese proceso */}
            <div className="px-4 py-1.5 bg-white border-b border-slate-200 flex items-center gap-2">
                <span className="text-[10px] font-black text-cyan-600 uppercase shrink-0">Filtrar por proceso</span>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {ETAPAS.map(e => {
                        const t = totales[e.key]
                        const activa = etapaFiltro === e.key
                        return (
                            <button key={e.key} onClick={() => setEtapaFiltro(activa ? '' : e.key)}
                                title={`${t.piezas} pieza(s) en ${e.label} · ${t.ordenes} orden(es)`}
                                className={`shrink-0 h-7 px-2 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-colors ${activa ? 'bg-[#324354] border-[#324354] text-white' : t.piezas > 0 ? 'bg-white border-slate-200 text-[#324354] hover:bg-slate-50' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                {e.label} <span className="font-black">{t.ordenes}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Lista de órdenes */}
            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                    <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                        Ordenes encontradas: {filtradas.length}
                        {etapaFiltro && <span className="text-slate-500 normal-case font-semibold"> · con piezas en <b>{ETAPAS.find(e => e.key === etapaFiltro)?.label}</b></span>}
                    </div>

                    {error ? (
                        <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2"><AlertTriangle size={18} /> {error}</div>
                    ) : cargando ? (
                        <div className="text-center py-8 text-gray-500">Cargando órdenes...</div>
                    ) : filtradas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No se encontraron órdenes</div>
                    ) : (
                        <>
                            {filtradas.slice(0, limite).map(({ o, cantidad, piezas, estado, excedida }) => {
                                const abierta = abiertas.has(o.id)
                                const avance = cantidad > 0 ? Math.min(100, Math.round((piezas.cedi / cantidad) * 100)) : 0
                                return (
                                    <div key={o.id} className="space-y-2">
                                        <div className="flex gap-3 items-stretch">
                                            {/* Misma tarjeta de orden de los demás módulos + franja con el estado y el avance a CEDI */}
                                            <div className={`flex-1 min-w-0 bg-white border-2 rounded-lg ${excedida ? 'border-red-400' : 'border-gray-300'}`}>
                                                <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                                                    <OrdenCard planta="fv" conDetalle={false} orden={o} isActive={false} onClick={() => { }} moldes={moldes} />
                                                </div>
                                                <div className="rounded-b-md border-t-2 border-gray-200 bg-slate-50 px-3 py-1.5 flex flex-wrap items-center gap-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_ESTADO[estado]}`}>{estado}</span>
                                                    <div className="flex-1 min-w-[160px] flex items-center gap-2">
                                                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden" title={`${piezas.cedi} de ${cantidad} en CEDI`}>
                                                            <div className="h-full bg-[#59a96a]" style={{ width: `${avance}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-[#324354] shrink-0">{avance}% en CEDI</span>
                                                    </div>
                                                    {excedida && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">Piezas en etapas &gt; cantidad</span>}
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
