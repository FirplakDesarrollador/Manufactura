'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoy, getAllMoldes } from '@/lib/supabase/queries/pintura'
import { getRegistrosParaDigitado } from '@/lib/supabase/queries/digitado'
import { Search, Eraser, Loader2, Calendar, RefreshCw, Keyboard } from 'lucide-react'
import EstadoEntregaOf from '../fibra/EstadoEntregaOf'
import ResumenFaltantes from '../fibra/ResumenFaltantes'
import { actualizarTodasEnPantalla, useRevisionEnCurso, useVersionRevision, tieneFaltantes, fijarGrupo, useFaltantesGrupo } from '@/lib/fibra/revisionEntrega'
import DigitadoList from './DigitadoList'
import OrdenCard from '../pintura/OrdenCard'
import { toast } from 'sonner'

export const GRUPO_DIGITADO_MS = 'ms-digitado'

const tienePiezasDigitado = (o: OrdenFabricacion) => (
    (o.pulido || 0) > 0 ||
    (o.desgelcada || 0) > 0 ||
    (o.empaque || 0) > 0 ||
    (o.acabado || 0) > 0 ||
    (o.digitado || 0) > 0 ||
    (o.transito || 0) > 0
)

export default function DigitadoModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [registrosGlobales, setRegistrosGlobales] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    // Componentes para la entrega (misma revisión de SAP que FV): giro del botón general mientras revisa
    const revisando = useRevisionEnCurso()
    useVersionRevision() // reordena la lista cuando llega una revisión
    const conFaltantes = useFaltantesGrupo(GRUPO_DIGITADO_MS)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [oData, rData, gData, mData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosParaDigitado(),
                getRegistrosTrazabilidadHoy(),
                getAllMoldes()
            ])
            setOrdenes(oData)
            setRegistros(rData)
            setRegistrosGlobales(gData)
            setAllMoldes(mData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Abrir/cerrar las piezas de la orden (copia el número de OF al abrir, como antes)
    const alternarOrden = (o: OrdenFabricacion) => {
        if (selectedOrderId === o.id) { setSelectedOrderId(null); return }
        setSelectedOrderId(o.id)
        if (o.orden_fabricacion) {
            navigator.clipboard.writeText(o.orden_fabricacion)
            toast.success(`Orden ${o.orden_fabricacion} copiada`)
        }
    }

    const clearFilters = () => {
        setSearchText('')
        setFechaFiltro(null)
        setSelectedOrderId(null)
    }

    const filteredOrdenes = ordenes.filter(o => {
        const search = searchText.toLowerCase()
        const matchesSearch = !searchText || (
            (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
            (o.pedido?.toLowerCase() || '').includes(search) ||
            (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (o.producto_sku?.toLowerCase() || '').includes(search) ||
            (o.molde_descripcion?.toLowerCase() || '').includes(search) ||
            (o.cliente?.toLowerCase() || '').includes(search)
        )

        const matchesFecha = !fechaFiltro || (
            o.fecha_ideal_produccion === fechaFiltro ||
            o.fecha_entrega_estimada === fechaFiltro
        )

        return matchesSearch && matchesFecha && tienePiezasDigitado(o)
    }).sort((a, b) => {
        // Primero las órdenes con componentes faltantes para la entrega (SAP)
        const fa = tieneFaltantes(a.orden_fabricacion) ? 0 : 1
        const fb = tieneFaltantes(b.orden_fabricacion) ? 0 : 1
        if (fa !== fb) return fa - fb
        const dateAStr = a.fecha_ideal_produccion || a.fecha_entrega_estimada
        const dateBStr = b.fecha_ideal_produccion || b.fecha_entrega_estimada
        const dateA = dateAStr ? new Date(dateAStr).getTime() : Infinity
        const dateB = dateBStr ? new Date(dateBStr).getTime() : Infinity
        const valA = isNaN(dateA) ? Infinity : dateA
        const valB = isNaN(dateB) ? Infinity : dateB
        return valA - valB
    })

    // Órdenes del módulo (sin filtros de búsqueda ni fecha): el menú cuenta las que tienen faltantes
    useEffect(() => {
        if (loading) return
        fijarGrupo(GRUPO_DIGITADO_MS, ordenes.filter(tienePiezasDigitado).map(o => o.orden_fabricacion))
    }, [ordenes, loading])

    const todayStr = new Date().toLocaleDateString('es-ES')

    // Totals calculation
    const totalCantidad = filteredOrdenes.reduce((acc, o) => acc + (o.cantidad || 0), 0)
    const totalProgramado = filteredOrdenes.reduce((acc, o) => acc + (o.programado || 0), 0)
    const totalPintura = filteredOrdenes.reduce((acc, o) => acc + (o.pintura || 0), 0)
    const totalVaciado = filteredOrdenes.reduce((acc, o) => acc + (o.vaciado || 0), 0)
    const totalDesgelcada = filteredOrdenes.reduce((acc, o) => acc + (o.desgelcada || 0), 0)
    const totalPulido = filteredOrdenes.reduce((acc, o) => acc + (o.pulido || 0) + (o.desgelcada || 0), 0)
    const totalSaldo = filteredOrdenes.reduce((acc, o) => acc + (o.saldo || 0), 0)

    // Filter registrosGlobales to only include those belonging to the filtered orders
    const validOrderIds = new Set(filteredOrdenes.map(o => o.orden_fabricacion))
    const filteredRegistrosGlobales = registrosGlobales.filter(r => validOrderIds.has(r.orden_fabricacion))

    const countAcabado = filteredRegistrosGlobales.filter(r =>
        ['Pulido', 'Acabado', 'Empaque', 'Digitado', 'Transito', 'Cedi'].includes(r.estado || '') &&
        (r.pintura_fecha && new Date(r.pintura_fecha).toLocaleDateString('es-ES') === todayStr)
    ).length

    const today = new Date().toISOString().split('T')[0]
    
    // Global Totals (Dashboard paridad - matching the order cards exactly)
    const totalDigitado = filteredOrdenes.reduce((acc, o) => acc + (o.digitado || 0), 0)
    const totalTransito = filteredOrdenes.reduce((acc, o) => acc + (o.transito || 0), 0)
    
    const countCediHoy = filteredRegistrosGlobales.filter(r => 
        r.estado === 'Cedi' && 
        (r.cedi_fecha || '').split('T')[0] === today
    ).length

    // Kilogramos: Current Transito + Cedi Today (Matches reference app logic)
    const transitoRecords = filteredRegistrosGlobales.filter(r => r.estado === 'Transito')
    const cediTodayRecords = filteredRegistrosGlobales.filter(r => r.estado === 'Cedi' && (r.cedi_fecha || '').split('T')[0] === today)
    
    const totalKilogramos = [...transitoRecords, ...cediTodayRecords]
        .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

    return (
        <div className="w-full min-h-full flex flex-col bg-slate-50/30 pb-12">
            {/* Summary Header */}
            <div className="p-2 bg-white border-b border-slate-200 overflow-x-auto sticky top-0 z-10 shadow-sm">
                <div className="flex flex-wrap gap-1 min-w-max">
                    <SummaryCard label="Ordenes" value={filteredOrdenes.length} color="blue" isPrimary />
                    <SummaryCard label="Cantidad" value={totalCantidad} color="blue" />
                    <SummaryCard label="Programado" value={totalProgramado} color="blue" />
                    <SummaryCard label="Pintura" value={totalPintura} color="blue" />
                    <SummaryCard label="Vaciado" value={totalVaciado} color="blue" />
                    <SummaryCard label="Pulido" value={totalPulido} color="blue" />
                    <SummaryCard label="Saldo" value={totalSaldo} color="blue" />
                    <SummaryCard label="Acabado" value={countAcabado} color="blue" />
                    <SummaryCard label="Digitado" value={totalDigitado} color="blue" isPrimary />
                    <SummaryCard label="Transito" value={totalTransito} color="orange" isPrimary />
                    <SummaryCard label="Cedi" value={countCediHoy} color="green" isPrimary />
                    <SummaryCard label="Kilogramos" value={totalKilogramos.toFixed(1)} color="slate" isPrimary />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-2 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Sku / Of / Pedido / Molde"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs text-slate-800"
                        />
                    </div>
                    <button
                        onClick={actualizarTodasEnPantalla}
                        disabled={revisando}
                        title="Actualizar los componentes para la entrega de todas las órdenes en pantalla (consulta SAP una por una; se actualiza sola cada hora en punto)"
                        className="h-9 px-4 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 shrink-0 shadow-sm disabled:opacity-60"
                    >
                        <RefreshCw size={15} className={revisando ? 'animate-spin' : ''} />
                        {revisando ? 'Revisando componentes…' : 'Actualizar componentes'}
                    </button>
                    <div className="flex gap-1 items-stretch">
                        <button
                            className="px-3 bg-blue-600 text-white rounded-lg shadow-md active:scale-95"
                            onClick={() => {/* Date picker logic */ }}
                        >
                            <Calendar size={16} />
                        </button>
                        <button
                            onClick={clearFilters}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-lg transition-all shadow-md active:scale-95"
                        >
                            <Eraser size={16} />
                        </button>
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-blue-600 uppercase tracking-widest">
                    <span>Ordenes encontradas: {filteredOrdenes.length}</span>
                    {conFaltantes > 0 && (
                        <span className="flex items-center gap-1.5 normal-case tracking-normal text-[#d14747]" title="Órdenes con componentes faltantes para la entrega (SAP); se muestran primero">
                            <b className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow">{conFaltantes > 99 ? '99+' : conFaltantes}</b>
                            {conFaltantes === 1 ? 'orden con faltantes de componentes' : 'órdenes con faltantes de componentes'}
                        </span>
                    )}
                    <ResumenFaltantes ofs={filteredOrdenes.map(o => o.orden_fabricacion)} />
                </div>
            </div>

            {/* Content Area - Natural scrolling container */}
            <div className="p-4 space-y-3 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={48} />
                        <span className="font-bold uppercase tracking-widest animate-pulse">Cargando órdenes...</span>
                    </div>
                ) : filteredOrdenes.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-bold uppercase text-lg italic bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        Sin ordenes halladas
                    </div>
                ) : (
                    filteredOrdenes.map(o => (
                        <div key={o.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Tarjeta de la orden con franja inferior: componentes para la entrega (SAP) y Registrar Digitado */}
                            <div className={`bg-white border-2 rounded-lg ${o.id === selectedOrderId ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-gray-300'}`}>
                                <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none">
                                    <OrdenCard
                                        orden={o}
                                        isActive={o.id === selectedOrderId}
                                        onClick={() => alternarOrden(o)}
                                        moldes={allMoldes}
                                    />
                                </div>
                                <div className="rounded-b-md border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1 flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-1.5">
                                    <EstadoEntregaOf of={o.orden_fabricacion} />
                                    <button onClick={() => alternarOrden(o)}
                                        className={`ml-auto h-9 px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-colors ${o.id === selectedOrderId ? 'bg-white text-[#324354] border border-[#e2ded5] hover:bg-[#F6F3EE]' : 'bg-[#324354] hover:bg-[#254153] text-white'}`}
                                        title="Ver las piezas de la orden para registrar el digitado">
                                        <Keyboard size={16} /> {o.id === selectedOrderId ? 'Ocultar piezas' : 'Registrar Digitado'}
                                    </button>
                                </div>
                            </div>
                            {o.id === selectedOrderId && (
                                <div className="border-2 border-t-0 border-cyan-500 rounded-b-lg overflow-hidden -mt-2 bg-slate-50 shadow-inner">
                                    <DigitadoList
                                        order={o}
                                        userEmail={userEmail}
                                        onRefresh={loadData}
                                        allMoldes={allMoldes}
                                        onBack={() => setSelectedOrderId(null)}
                                        isInline={true}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function SummaryCard({ label, value, color, isPrimary = false }: { label: string, value: string | number, color: string, isPrimary?: boolean }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-white text-blue-600 border-blue-100",
        orange: "bg-orange-500 text-white border-orange-600",
        green: "bg-green-600 text-white border-green-700",
        slate: "bg-slate-500 text-white border-slate-600",
    }

    if (isPrimary && color === 'blue') return (
        <div className="flex flex-col items-center justify-center min-w-[75px] h-[60px] bg-blue-600 text-white rounded-lg shadow-sm border border-blue-700">
            <span className="text-[9px] font-bold uppercase opacity-90 text-center px-1 leading-tight mb-0.5">{label}</span>
            <span className="text-base font-black tracking-tight">{value}</span>
        </div>
    )

    return (
        <div className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] rounded-lg border shadow-sm ${colorClasses[color] || colorClasses.blue}`}>
            <span className="text-[9px] font-bold uppercase opacity-80 text-center px-1 leading-tight mb-0.5">{label}</span>
            <span className="text-base font-black tracking-tight">{value}</span>
        </div>
    )
}
