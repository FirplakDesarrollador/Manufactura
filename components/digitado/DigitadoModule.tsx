'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoy, getAllMoldes } from '@/lib/supabase/queries/pintura'
import { getRegistrosParaDigitado } from '@/lib/supabase/queries/digitado'
import { Search, Eraser, Loader2, Calendar, Info, ArrowLeft } from 'lucide-react'
import DigitadoList from './DigitadoList'
import OrdenCard from '../pintura/OrdenCard'
import { toast } from 'sonner'

export default function DigitadoModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [registrosGlobales, setRegistrosGlobales] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

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

        const hasRelevantPieces = (
            (o.pulido || 0) > 0 ||
            (o.desgelcada || 0) > 0 ||
            (o.empaque || 0) > 0 ||
            (o.acabado || 0) > 0 ||
            (o.digitado || 0) > 0 ||
            (o.transito || 0) > 0
        )

        return matchesSearch && matchesFecha && hasRelevantPieces
    })

    const todayStr = new Date().toLocaleDateString('es-ES')

    // Totals calculation
    const totalCantidad = filteredOrdenes.reduce((acc, o) => acc + (o.cantidad || 0), 0)
    const totalProgramado = filteredOrdenes.reduce((acc, o) => acc + (o.programado || 0), 0)
    const totalPintura = filteredOrdenes.reduce((acc, o) => acc + (o.pintura || 0), 0)
    const totalVaciado = filteredOrdenes.reduce((acc, o) => acc + (o.vaciado || 0), 0)
    const totalDesgelcada = filteredOrdenes.reduce((acc, o) => acc + (o.desgelcada || 0), 0)
    const totalPulido = filteredOrdenes.reduce((acc, o) => acc + (o.pulido || 0) + (o.desgelcada || 0), 0)
    const totalSaldo = filteredOrdenes.reduce((acc, o) => acc + (o.saldo || 0), 0)

    const countAcabado = registrosGlobales.filter(r =>
        ['Pulido', 'Acabado', 'Empaque', 'Digitado', 'Transito', 'Cedi'].includes(r.estado || '') &&
        (r.pintura_fecha && new Date(r.pintura_fecha).toLocaleDateString('es-ES') === todayStr)
    ).length

    const today = new Date().toISOString().split('T')[0]
    
    // Global Totals (Dashboard paridad)
    const totalDigitado = registrosGlobales.filter(r => r.estado === 'Digitado').length
    const totalTransito = registrosGlobales.filter(r => r.estado === 'Transito').length
    const countCediHoy = registrosGlobales.filter(r => 
        r.estado === 'Cedi' && 
        (r.cedi_fecha || '').split('T')[0] === today
    ).length

    // Kilogramos: Current Transito + Cedi Today (Matches reference app logic)
    const transitoRecords = registrosGlobales.filter(r => r.estado === 'Transito')
    const cediTodayRecords = registrosGlobales.filter(r => r.estado === 'Cedi' && (r.cedi_fecha || '').split('T')[0] === today)
    
    const totalKilogramos = [...transitoRecords, ...cediTodayRecords]
        .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Summary Header */}
            <div className="p-2 bg-white border-b border-slate-200 overflow-x-auto">
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
                <div className="mt-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedOrderId || !selectedOrder ? (
                    // Selection View
                    <div className="h-full overflow-y-auto p-4 space-y-3 max-w-7xl mx-auto">
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
                                <div key={o.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <OrdenCard
                                        orden={o}
                                        isActive={false}
                                        onClick={() => {
                                            setSelectedOrderId(o.id)
                                            if (o.orden_fabricacion) {
                                                navigator.clipboard.writeText(o.orden_fabricacion)
                                                toast.success(`Orden ${o.orden_fabricacion} copiada`)
                                            }
                                        }}
                                        moldes={allMoldes}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    // Detail View
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <DigitadoList
                            order={selectedOrder}
                            userEmail={userEmail}
                            onRefresh={loadData}
                            allMoldes={allMoldes}
                            onBack={() => setSelectedOrderId(null)}
                        />
                    </div>
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

