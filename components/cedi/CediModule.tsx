'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoy, getAllMoldes } from '@/lib/supabase/queries/pintura'
import { moverTransitoACedi } from '@/lib/supabase/queries/cedi'
import { Search, Eraser, Loader2, Calendar, Info, FileSpreadsheet, ArrowLeftRight, FileCode, ArrowLeft } from 'lucide-react'
import CediList from './CediList'
import OrdenCard from '../pintura/OrdenCard'
import * as XLSX from 'xlsx'

export default function CediModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
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
            const [oData, rData, mData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidadHoy(),
                getAllMoldes()
            ])
            setOrdenes(oData)
            setRegistros(rData)
            setAllMoldes(mData)
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

    const getReportData = () => {
        const headers = ['OF', 'Pedido', 'Producto', 'SKU', 'Cliente', 'Cantidad', 'Saldo', 'Vaciado', 'Pintura', 'Desgelcada', 'Pulido', 'Empaque', 'Acabado', 'Digitado', 'Transito', 'Cedi']
        const rows = filteredOrdenes.map(o => [
            o.orden_fabricacion || '',
            o.pedido || '',
            o.producto_descripcion || '',
            o.producto_sku || '',
            o.cliente || '',
            o.cantidad || 0,
            o.saldo || 0,
            o.vaciado || 0,
            o.pintura || 0,
            o.desgelcada || 0,
            o.pulido || 0,
            o.empaque || 0,
            o.acabado || 0,
            o.digitado || 0,
            o.transito || 0,
            o.cedi || 0
        ])
        return { headers, rows }
    }

    const handleExportCSV = () => {
        const { headers, rows } = getReportData()
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

    const handleExportExcel = () => {
        const { headers, rows } = getReportData()
        const data = [headers, ...rows]
        const ws = XLSX.utils.aoa_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Cedi Report")
        XLSX.writeFile(wb, `reporte_cedi_${new Date().toISOString().split('T')[0]}.xlsx`)
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
                    <div className="flex gap-4 items-center pl-4 border-l border-slate-200">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="flex flex-col items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 border border-blue-100"
                        >
                            {moving ? <Loader2 className="animate-spin" size={20} /> : <ArrowLeftRight size={20} />}
                            <span className="text-[9px] font-black uppercase mt-1">Mover a Cedi</span>
                        </button>
                        
                        <div className="h-10 w-px bg-slate-200 mx-1" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase text-center">Exportar Reporte</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md shadow-green-100 active:scale-95 group"
                                    title="Exportar a Excel"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span className="text-[10px] font-black uppercase">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md shadow-slate-200 active:scale-95 group"
                                    title="Exportar a CSV"
                                >
                                    <FileCode size={16} />
                                    <span className="text-[10px] font-black uppercase">CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>
            </div>

            {/* Content area */}
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
                                        onClick={() => setSelectedOrderId(o.id)}
                                        moldes={allMoldes}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    // Detail View
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                            <button
                                onClick={() => setSelectedOrderId(null)}
                                className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:text-blue-700 transition-colors mb-3 w-fit group"
                            >
                                <div className="bg-blue-50 p-1 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <ArrowLeft size={16} />
                                </div>
                                Volver a la lista
                            </button>
                            <div className="pointer-events-none opacity-90 scale-[0.98] origin-left">
                                <OrdenCard
                                    orden={selectedOrder}
                                    isActive={true}
                                    onClick={() => {}}
                                    moldes={allMoldes}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <CediList
                                order={selectedOrder}
                                userEmail={userEmail}
                                onRefresh={loadData}
                            />
                        </div>
                    </div>
                )}
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
