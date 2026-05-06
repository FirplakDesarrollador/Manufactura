'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoy } from '@/lib/supabase/queries/pintura'
import { moverTransitoACedi } from '@/lib/supabase/queries/cedi'
import { Search, Eraser, Loader2, Calendar, Hash, Package, Info, FileSpreadsheet, ArrowLeftRight } from 'lucide-react'
import CediList from './CediList'

export default function CediModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [moving, setMoving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [oData, rData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidadHoy()
            ])
            setOrdenes(oData)
            setRegistros(rData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMoveAllToCedi = async () => {
        const transitoCount = registros.filter(r => r.estado === 'Transito').length
        if (transitoCount === 0) {
            alert('No hay piezas en Transito para mover.')
            return
        }

        if (!confirm(`¿Está seguro que desea mover ${transitoCount} piezas de Transito a Cedi?`)) return

        setMoving(true)
        try {
            await moverTransitoACedi(userEmail)
            alert('Piezas movidas exitosamente.')
            loadData()
        } catch (error) {
            console.error('Error moving to CEDI:', error)
            alert('Error al mover piezas.')
        } finally {
            setMoving(false)
        }
    }

    const handleExportCSV = () => {
        // Simple CSV export implementation
        const headers = ['OF', 'Pedido', 'Producto', 'SKU', 'Cantidad', 'Digitado', 'Transito']
        const rows = filteredOrdenes.map(o => [
            o.orden_fabricacion,
            o.pedido,
            o.producto_descripcion,
            o.producto_sku,
            o.cantidad,
            o.digitado,
            o.transito
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `reporte_cedi_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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

        const hasPieces = (o.transito || 0) > 0 || (o.cedi || 0) > 0

        return matchesSearch && matchesFecha && hasPieces
    })

    const todayStr = new Date().toLocaleDateString('es-ES')

    const today = new Date().toISOString().split('T')[0]
    
    // Global Totals (Not affected by filters, matching reference app)
    const totalDigitado = registros.filter(r => r.estado === 'Digitado').length
    const totalTransito = registros.filter(r => r.estado === 'Transito').length
    const countCediHoy = registros.filter(r => 
        r.estado === 'Cedi' && 
        (r.cedi_fecha || '').split('T')[0] === today
    ).length

    // Kilogramos: Current Transito + Cedi Today (Matches reference app logic)
    const transitoRecords = registros.filter(r => r.estado === 'Transito')
    const cediTodayRecords = registros.filter(r => r.estado === 'Cedi' && (r.cedi_fecha || '').split('T')[0] === today)
    
    const totalKilogramos = [...transitoRecords, ...cediTodayRecords]
        .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Summary Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Sku / Of / Pedido / Molde"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="p-2 bg-blue-600 text-white rounded-lg"><Calendar size={18} /></button>
                        <button onClick={() => { setSearchText(''); setFechaFiltro(null); }} className="p-2 bg-orange-500 text-white rounded-lg"><Eraser size={18} /></button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-2">
                        <StatCard label="Digitado" value={totalDigitado} color="blue" />
                        <StatCard label="Transito" value={totalTransito} color="orange" />
                        <StatCard label="Cedi" value={countCediHoy} color="green" />
                        <StatCard label="Kilogramos" value={totalKilogramos.toFixed(1) as any} color="slate" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="flex flex-col items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            {moving ? <Loader2 className="animate-spin" size={24} /> : <ArrowLeftRight size={24} />}
                            <span className="text-[10px] font-bold uppercase mt-1">Mover a Cedi</span>
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">Reporte</span>
                            <button
                                onClick={handleExportCSV}
                                className="p-2 border border-blue-200 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            >
                                <FileSpreadsheet size={24} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Orders List */}
                <div className="w-1/3 border-r border-slate-200 overflow-y-auto p-4 space-y-3 bg-white">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold uppercase text-sm italic">Sin ordenes halladas</div>
                    ) : (
                        filteredOrdenes.map(o => (
                            <div
                                key={o.id}
                                onClick={() => setSelectedOrderId(o.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOrderId === o.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-100 bg-white hover:border-blue-200'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black text-slate-400">OF: {o.orden_fabricacion}</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black uppercase">Pendiente</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 line-clamp-none">{o.producto_descripcion}</h4>
                                <div className="mt-2 flex gap-3 text-[10px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1"><Hash size={12} />{o.pedido}</span>
                                    <span className="flex items-center gap-1"><Package size={12} />{o.cantidad} unt</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Panel: Piece tabs */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {!selectedOrder ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
                            <Info size={48} />
                            <span className="text-xl font-black uppercase text-center px-4">Debe seleccionar una orden de fabricación</span>
                        </div>
                    ) : (
                        <CediList
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

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    const bgColors: Record<string, string> = {
        blue: 'bg-blue-600',
        orange: 'bg-orange-500',
        green: 'bg-green-600',
        slate: 'bg-slate-600'
    }
    return (
        <div className={`${bgColors[color]} text-white px-4 py-2 rounded-xl min-w-[80px] flex flex-col items-center shadow-lg border border-black/5`}>
            <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>
            <span className="text-lg font-black">{value}</span>
        </div>
    )
}
