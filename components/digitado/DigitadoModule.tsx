'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidad } from '@/lib/supabase/queries/pintura'
import { Search, Eraser, Loader2, Keyboard, Calendar, Hash, Package, Zap, Info, ClipboardList, TrendingUp, Boxes, Truck, Warehouse, Weight, Calculator } from 'lucide-react'
import DigitadoList from './DigitadoList'

export default function DigitadoModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
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
            const [oData, rData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidad()
            ])
            setOrdenes(oData)
            setRegistros(rData)
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

    const countAcabado = registros.filter(r =>
        ['Pulido', 'Acabado', 'Empaque', 'Digitado', 'Transito', 'Cedi'].includes(r.estado || '') &&
        (r.pintura_fecha && new Date(r.pintura_fecha).toLocaleDateString('es-ES') === todayStr)
    ).length

    const totalDigitado = filteredOrdenes.reduce((acc, o) => acc + (o.digitado || 0), 0)
    const totalTransito = filteredOrdenes.reduce((acc, o) => acc + (o.transito || 0), 0)

    const countCedi = registros.filter(r =>
        r.estado === 'Cedi' &&
        (r.cedi_fecha && new Date(r.cedi_fecha).toLocaleDateString('es-ES') === todayStr)
    ).length

    const totalKilogramos = registros.filter(r =>
        ['Cedi', 'Transito', 'Digitado'].includes(r.estado || '') &&
        (
            (r.cedi_fecha && new Date(r.cedi_fecha).toLocaleDateString('es-ES') === todayStr) ||
            (r.digitado_fecha && new Date(r.digitado_fecha).toLocaleDateString('es-ES') === todayStr) ||
            (r.transito_fecha && new Date(r.transito_fecha).toLocaleDateString('es-ES') === todayStr)
        )
    ).reduce((acc, r) => acc + (r.kilos_vaciados || 0), 0)

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Summary Header */}
            <div className="p-4 bg-white border-b border-slate-200 overflow-x-auto">
                <div className="flex flex-wrap gap-2 min-w-max">
                    <SummaryCard label="Cantidad" value={totalCantidad} color="blue" />
                    <SummaryCard label="Programado" value={totalProgramado} color="blue" />
                    <SummaryCard label="Pintura" value={totalPintura} color="blue" />
                    <SummaryCard label="Vaciado" value={totalVaciado} color="blue" />
                    <SummaryCard label="Pulido" value={totalPulido} color="blue" />
                    <SummaryCard label="Saldo" value={totalSaldo} color="blue" />
                    <SummaryCard label="Acabado" value={countAcabado} color="blue" />
                    <SummaryCard label="Digitado" value={totalDigitado} color="blue" isPrimary />
                    <SummaryCard label="Transito" value={totalTransito} color="orange" isPrimary />
                    <SummaryCard label="Cedi" value={countCedi} color="green" isPrimary />
                    <SummaryCard label="Kilogramos" value={totalKilogramos.toFixed(1)} color="slate" isPrimary />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Sku / Of / Pedido / Molde"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="p-3 bg-blue-600 text-white rounded-xl shadow-md active:scale-95"
                            onClick={() => {/* Date picker logic */ }}
                        >
                            <Calendar size={20} />
                        </button>
                        <button
                            onClick={clearFilters}
                            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl transition-all shadow-md active:scale-95"
                        >
                            <Eraser size={20} />
                        </button>
                    </div>
                </div>
                <div className="mt-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Orders List */}
                <div className="w-1/3 border-r border-slate-200 overflow-y-auto p-4 space-y-3 bg-white">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold uppercase text-sm italic">Sin ordenes halladas</div>
                    ) : (
                        filteredOrdenes.map(o => (
                            <OrderCard
                                key={o.id}
                                order={o}
                                isSelected={o.id === selectedOrderId}
                                onClick={() => {
                                    setSelectedOrderId(o.id)
                                }}
                            />
                        ))
                    )}
                </div>

                {/* Right Panel: Detail View (Tabs) */}
                <div className="flex-1 overflow-y-auto bg-slate-50 relative">
                    {!selectedOrderId || !selectedOrder ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
                            <Info size={48} />
                            <span className="text-xl font-black uppercase text-center px-4">Debe seleccionar una orden de fabricación</span>
                        </div>
                    ) : (
                        <DigitadoList
                            order={selectedOrder}
                            userEmail={userEmail}
                            onRefresh={loadData}
                        />
                    )}
                </div>
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
        <div className="flex flex-col items-center justify-center min-w-[70px] h-[70px] bg-blue-600 text-white rounded-xl shadow-lg border border-blue-700">
            <span className="text-[10px] font-bold uppercase opacity-90 text-center px-1">{label}</span>
            <span className="text-xl font-black">{value}</span>
        </div>
    )

    return (
        <div className={`flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-xl border-2 shadow-sm ${colorClasses[color] || colorClasses.blue}`}>
            <span className="text-[10px] font-bold uppercase opacity-80 text-center px-1">{label}</span>
            <span className="text-xl font-black">{value}</span>
        </div>
    )
}

function OrderCard({ order, isSelected, onClick }: { order: OrdenFabricacion, isSelected: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-100 bg-white hover:border-blue-200 shadow-sm'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase text-slate-400">OF: {order.orden_fabricacion}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${order.estado === 'Finalizado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.estado}
                </span>
            </div>
            <h4 className="text-sm font-black text-slate-800 line-clamp-1 mb-1">{order.producto_descripcion}</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1 font-bold text-slate-500">
                    <Hash size={12} /> {order.pedido}
                </div>
                <div className="flex items-center gap-1 font-bold text-slate-500">
                    <Package size={12} /> {order.cantidad} un
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
                <div className="bg-amber-500 text-white px-2 py-1 rounded text-[9px] font-bold">DES: {order.desgelcada || 0}</div>
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold">PUL: {order.pulido || 0}</div>
                <div className="bg-orange-500 text-white px-2 py-1 rounded text-[9px] font-bold">DIG: {order.digitado || 0}</div>
                <div className="bg-orange-600 text-white px-2 py-1 rounded text-[9px] font-bold">TRA: {order.transito || 0}</div>
            </div>
        </div>
    )
}
