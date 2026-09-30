'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { OrdenMueble, TrazabilidadRecord } from '@/types/muebles'
import { getOrdenesMuebles, getTrazabilidadMueblesHoy, registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import {
    Search, Eraser, Loader2, Calendar, ArrowLeftRight,
    ArrowLeft, FileSpreadsheet, FileCode, Warehouse
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

interface CediModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function CediModule({ userEmail, turno, usuarioNombre, plantaMuebles }: CediModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [trazabilidad, setTrazabilidad] = useState<TrazabilidadRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [moving, setMoving] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, trazData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles, true),
                getTrazabilidadMueblesHoy(plantaMuebles)
            ])
            setOrdenes(ordenesData)
            setTrazabilidad(trazData || [])
        } catch (error) {
            console.error('Error loading Cedi data:', error)
            toast.error('Error al cargar datos de CEDI')
        } finally {
            setLoading(false)
        }
    }, [plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Stats globales (no afectadas por filtros)
    const today = new Date().toISOString().split('T')[0]
    const totalDigitado = ordenes.reduce((s, o) => s + (o.digitado || 0), 0)
    const totalTransito = ordenes.reduce((s, o) => s + (o.transito || 0), 0)
    const totalCediHoy  = trazabilidad
        .filter(r => r.proceso === 'Cedi' && (r.created_at || '').split('T')[0] === today)
        .reduce((s, r) => s + (r.cantidad || 0), 0)

    // Mover masivo Transito -> CEDI
    const handleMoveAllToCedi = async () => {
        const ordenesToMove = ordenes.filter(o => (o.transito || 0) > 0)
        if (ordenesToMove.length === 0) {
            toast.error('No hay piezas en transito para mover')
            return
        }
        if (!confirm(`Mover todos los muebles (${ordenesToMove.length} ordenes) de Transito a CEDI?`)) return

        setMoving(true)
        try {
            for (const o of ordenesToMove) {
                await registrarTrazabilidadMueble({
                    orden_fabricacion: o.orden_fabricacion || '',
                    cantidad: o.transito || 0,
                    creado_por: usuarioNombre,
                    proceso: 'Cedi',
                    cedula_operario: 'CEDI_BULK',
                    nombre_operario: usuarioNombre,
                    fecha_inicio: new Date().toISOString()
                })
            }
            toast.success('Muebles movidos a CEDI correctamente')
            loadData()
        } catch (error) {
            console.error('Error in bulk move:', error)
            toast.error('Error al realizar el movimiento masivo')
        } finally {
            setMoving(false)
        }
    }

    // Reporte
    const getReportData = () => {
        const headers = ['OF', 'Pedido', 'Cliente', 'SKU', 'Descripcion', 'Cantidad', 'Digitado', 'Transito', 'Cedi', 'Fecha Entrega']
        const rows = filteredOrdenes.map(o => [
            o.orden_fabricacion || '',
            o.numero_pedido || '',
            o.cliente || '',
            o.producto_sku || '',
            o.producto_descripcion || '',
            o.cantidad || 0,
            o.digitado || 0,
            o.transito || 0,
            o.cedi || 0,
            o.fecha_entrega_estimada || ''
        ])
        return { headers, rows }
    }

    const handleExportCSV = () => {
        const { headers, rows } = getReportData()
        const csvContent = 'data:text/csv;charset=utf-8,'
            + headers.join(',') + '\n'
            + rows.map(e => e.join(',')).join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `reporte_cedi_muebles_${today}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExportExcel = () => {
        const { headers, rows } = getReportData()
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'CEDI Muebles')
        XLSX.writeFile(wb, `reporte_cedi_muebles_${today}.xlsx`)
    }

    // Filtrado
    const filteredOrdenes = ordenes.filter(o => {
        const search = searchText.toLowerCase()
        const matchesSearch = !searchText || (
            (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
            (o.numero_pedido?.toLowerCase() || '').includes(search) ||
            (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (o.producto_sku?.toLowerCase() || '').includes(search) ||
            (o.cliente?.toLowerCase() || '').includes(search)
        )
        const matchesFecha = !fechaFiltro || (o.fecha_entrega_estimada || '').includes(fechaFiltro)
        const hasPieces = (o.transito || 0) > 0 || (o.cedi || 0) > 0
        return matchesSearch && matchesFecha && hasPieces
    }).sort((a, b) => {
        const dateA = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : Infinity
        const dateB = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : Infinity
        return (isNaN(dateA) ? Infinity : dateA) - (isNaN(dateB) ? Infinity : dateB)
    })

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId) ?? null

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Header / Filtros + Stats */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">

                    {/* Filtros */}
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="SKU / OF / Pedido / Cliente"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button className="p-2 bg-indigo-600 text-white rounded-lg" title="Filtrar por fecha">
                            <Calendar size={18} />
                        </button>
                        <button
                            onClick={() => { setSearchText(''); setFechaFiltro(null) }}
                            className="p-2 bg-orange-500 text-white rounded-lg"
                            title="Limpiar filtros"
                        >
                            <Eraser size={18} />
                        </button>
                    </div>

                    {/* Stats globales */}
                    <div className="flex gap-2">
                        <StatCard label="Digitado" value={totalDigitado} color="blue" />
                        <StatCard label="Transito" value={totalTransito} color="orange" />
                        <StatCard label="CEDI Hoy" value={totalCediHoy}  color="green" />
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-4 items-center pl-4 border-l border-slate-200">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="flex flex-col items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 border border-indigo-100 disabled:opacity-50"
                        >
                            {moving ? <Loader2 className="animate-spin" size={20} /> : <ArrowLeftRight size={20} />}
                            <span className="text-[9px] font-black uppercase mt-1">Mover a CEDI</span>
                        </button>

                        <div className="h-10 w-px bg-slate-200 mx-1" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase text-center">Exportar Reporte</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md shadow-green-100 active:scale-95"
                                    title="Exportar a Excel"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span className="text-[10px] font-black uppercase">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md shadow-slate-200 active:scale-95"
                                    title="Exportar a CSV"
                                >
                                    <FileCode size={16} />
                                    <span className="text-[10px] font-black uppercase">CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Warehouse size={12} />
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>
            </div>

            {/* Area de contenido (master-detail) */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedOrderId || !selectedOrder ? (
                    <div className="h-full overflow-y-auto p-4 space-y-3 max-w-7xl mx-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                <Loader2 className="animate-spin text-indigo-500" size={48} />
                                <span className="font-bold uppercase tracking-widest animate-pulse">Cargando ordenes...</span>
                            </div>
                        ) : filteredOrdenes.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase text-lg italic bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                Sin ordenes en transito o CEDI
                            </div>
                        ) : (
                            filteredOrdenes.map(o => (
                                <div key={o.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <OrderCard
                                        orden={o}
                                        isActive={false}
                                        onClick={() => {
                                            setSelectedOrderId(o.id)
                                            setSelectedOrden(o)
                                            setIsModalOpen(true)
                                        }}
                                        proceso="Cedi"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                            <button
                                onClick={() => setSelectedOrderId(null)}
                                className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:text-indigo-700 transition-colors mb-3 w-fit group"
                            >
                                <div className="bg-indigo-50 p-1 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <ArrowLeft size={16} />
                                </div>
                                Volver a la lista
                            </button>
                            <div className="pointer-events-none opacity-90 scale-[0.98] origin-left">
                                <OrderCard
                                    orden={selectedOrder}
                                    isActive={true}
                                    onClick={() => {}}
                                    proceso="Cedi"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Trazabilidad */}
            {selectedOrden && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedOrderId(null)
                        setSelectedOrden(null)
                    }}
                    orden={selectedOrden}
                    proceso="Cedi"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        setSelectedOrderId(null)
                        setSelectedOrden(null)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const bgColors: Record<string, string> = {
        blue:   'bg-blue-600',
        orange: 'bg-orange-500',
        green:  'bg-green-600',
        slate:  'bg-slate-600',
    }
    return (
        <div className={`${bgColors[color]} text-white px-4 py-2 rounded-xl min-w-[80px] flex flex-col items-center shadow-lg border border-black/5`}>
            <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>
            <span className="text-lg font-black">{value}</span>
        </div>
    )
}
