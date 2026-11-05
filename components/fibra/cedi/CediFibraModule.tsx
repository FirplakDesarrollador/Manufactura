'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoyMetricas, getAllMoldes } from '@/lib/supabase/queries/fibra'
import { moverTransitoACedi } from '@/lib/supabase/queries/fibra_cedi'
import { Loader2, FileSpreadsheet, ArrowLeftRight, FileCode, ArrowLeft } from 'lucide-react'
import EncabezadoFibra, { useMetricasFibra } from '../EncabezadoFibra'
import CediList from './CediList'
import OrdenCard from '@/components/pintura/OrdenCard'
import * as XLSX from 'xlsx'

export default function CediFibraModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
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
                getRegistrosTrazabilidadHoyMetricas(),
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
        const headers = ['OF', 'Pedido', 'Producto', 'SKU', 'Cliente', 'Cantidad', 'Saldo', 'Vaciado', 'Pintura', 'Desgelcada', 'Pulido', 'Guacales', 'Acabado', 'Digitado', 'Transito', 'Cedi']
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

    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, registros, searchText, selectedDate)

    const filteredOrdenes = useMemo(() => baseFilteredOrdenes
        .filter(o => (o.transito || 0) > 0 || (o.cedi || 0) > 0)
        .sort((a, b) => {
            const dateA = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : Infinity
            const dateB = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : Infinity
            const valA = isNaN(dateA) ? Infinity : dateA
            const valB = isNaN(dateB) ? Infinity : dateB
            return valA - valB
        }), [baseFilteredOrdenes])

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            <EncabezadoFibra
                metrics={metrics}
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onClear={() => { setSearchText(''); setSelectedDate('') }}
                loading={loading}
                placeholder="Sku / Of / Pedido / Molde"
                extra={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="h-8 px-3 flex items-center gap-1.5 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                            title="Mover todas las piezas en Tránsito a CEDI"
                        >
                            {moving ? <Loader2 className="animate-spin" size={14} /> : <ArrowLeftRight size={14} />}
                            Mover a CEDI
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="h-8 px-3 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                            title="Exportar reporte a Excel"
                        >
                            <FileSpreadsheet size={14} />
                            Excel
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="h-8 px-3 flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                            title="Exportar reporte a CSV"
                        >
                            <FileCode size={14} />
                            CSV
                        </button>
                    </div>
                }
            />

            {/* Content area */}            {/* Content area */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedOrderId || !selectedOrder ? (
                    // Selection View
                    <div className="h-full overflow-y-auto p-4 space-y-2">
                        <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">Ordenes encontradas: {filteredOrdenes.length}</div>
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
                                    <OrdenCard planta="fv"
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
                                <OrdenCard planta="fv"
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

