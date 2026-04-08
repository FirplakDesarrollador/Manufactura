'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy, getCediActual, registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Warehouse, ArrowLeftRight, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CediModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function CediModule({ userEmail, turno, usuarioNombre, plantaMuebles }: CediModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [cediActual, setCediActual] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isBulkMoving, setIsBulkMoving] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData, cediData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles),
                getMetricasMueblesHoy(turno),
                getCediActual(plantaMuebles)
            ])
            setOrdenes(ordenesData)
            if (metricasData && metricasData.length > 0) {
                setMetricas(metricasData[0])
            }
            setCediActual(cediData)
        } catch (error) {
            console.error('Error loading Cedi data:', error)
        } finally {
            setLoading(false)
        }
    }, [turno, plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const filteredOrdenes = useMemo(() => {
        const search = searchText.toLowerCase()
        return ordenes.filter((orden) => {
            const matchesSearch = !search ||
                (orden.producto_descripcion || '').toLowerCase().includes(search) ||
                (orden.orden_fabricacion || '').toLowerCase().includes(search) ||
                (orden.numero_pedido || '').toLowerCase().includes(search) ||
                (orden.producto_sku || '').toLowerCase().includes(search) ||
                (orden.cliente || '').toLowerCase().includes(search)

            const ordenDate = dateType === 'entrega' 
                ? orden.fecha_entrega_estimada 
                : orden.created_at
            
            const matchesDate = !selectedDate || (ordenDate && ordenDate.includes(selectedDate))

            // Only show orders with pieces in Transit (waiting for CEDI)
            const inTransit = (orden.transito || 0) > 0

            return matchesSearch && matchesDate && inTransit
        })
    }, [ordenes, searchText, selectedDate, dateType])

    const handleMoveAllToCedi = async () => {
        const ordenesToMove = ordenes.filter(o => (o.transito || 0) > 0)
        
        if (ordenesToMove.length === 0) {
            toast.error('No existen piezas en tránsito para mover')
            return
        }

        if (!confirm(`¿Desea mover todos los muebles (${ordenesToMove.length} órdenes) de Tránsito a Cedi?`)) {
            return
        }

        setIsBulkMoving(true)
        try {
            for (const o of ordenesToMove) {
                await registrarTrazabilidadMueble({
                    orden_fabricacion: o.orden_fabricacion || '',
                    cantidad: o.transito || 0,
                    creado_por: usuarioNombre,
                    proceso: 'Cedi'
                })
            }
            toast.success('Muebles movidos a Cedi correctamente')
            await loadData()
        } catch (error) {
            console.error('Error in bulk move:', error)
            toast.error('Error al realizar el movimiento masivo')
        } finally {
            setIsBulkMoving(false)
        }
    }

    const handleDownloadReport = () => {
        const pendingCSV = ordenes.filter(o => o.pendiente && (o.transito || 0) > 0)
        if (pendingCSV.length === 0) {
            toast.error('No hay muebles en tránsito para el reporte')
            return
        }
        
        // CSV logic simplified for now
        toast.info('Generando reporte CSV...')
        const headers = 'OF,Pedido,Cliente,SKU,Descripcion,Transito\n'
        const rows = pendingCSV.map(o => 
            `${o.orden_fabricacion},${o.numero_pedido},${o.cliente},${o.producto_sku},"${o.producto_descripcion}",${o.transito}`
        ).join('\n')
        
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Reporte_Cedi_${plantaMuebles}_${new Date().toISOString().split('T')[0]}.csv`)
        link.click()
    }

    // Calculate WIP sums for this stage
    const sumDigitado = filteredOrdenes.reduce((sum, o) => sum + (o.digitado || 0), 0)
    const sumTransito = filteredOrdenes.reduce((sum, o) => sum + (o.transito || 0), 0)

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Controls & Metrics Header */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Search and Date Filter */}
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative group">
                                <button 
                                    onClick={() => setDateType(dateType === 'entrega' ? 'creacion' : 'entrega')}
                                    className={`p-2 rounded-lg text-white transition-colors duration-200 flex items-center gap-1 ${dateType === 'entrega' ? 'bg-indigo-600' : 'bg-purple-600'}`}
                                >
                                    <Calendar size={20} />
                                    <span className="text-[10px] font-bold hidden sm:inline uppercase">{dateType}</span>
                                </button>
                            </div>
                            
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por Sku / Of / Pedido / Cliente..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleClearFilters}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                title="Limpiar filtros"
                            >
                                <X size={20} />
                            </button>
                            
                            <button
                                onClick={loadData}
                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Cedi Specific Metrics */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Digitado</p>
                                <p className="text-lg font-bold text-gray-800">{sumDigitado}</p>
                            </div>
                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Tránsito</p>
                                <p className="text-lg font-bold text-gray-800">{sumTransito}</p>
                            </div>

                            {/* Move All Button */}
                            <button
                                onClick={handleMoveAllToCedi}
                                disabled={isBulkMoving || loading}
                                className="h-[65px] px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                title="Mover todo de Tránsito a Cedi"
                            >
                                {isBulkMoving ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <>
                                        <ArrowLeftRight size={24} />
                                        <span className="text-[9px] font-bold uppercase">CEDI Masivo</span>
                                    </>
                                )}
                            </button>

                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm ring-2 ring-indigo-50">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Cedi Hoy</p>
                                <p className="text-lg font-bold text-gray-800">{cediActual?.cedi || 0}</p>
                            </div>

                            {/* Download Report */}
                            <button
                                onClick={handleDownloadReport}
                                className="h-[65px] px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                                title="Descargar Reporte CSV"
                            >
                                <Download size={24} />
                                <span className="text-[9px] font-bold uppercase">Reporte</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Warehouse size={14} />
                            ORDENES ENTRANDO A CEDI: {filteredOrdenes.length}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando órdenes para Cedi...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No hay órdenes para registrar en Cedi.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrdenes.map((orden) => (
                                <OrderCard
                                    key={orden.id}
                                    orden={orden}
                                    isActive={selectedOrden?.id === orden.id}
                                    onClick={() => {
                                        setSelectedOrden(orden)
                                        setIsModalOpen(true)
                                    }}
                                    proceso="Cedi"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Trazabilidad Modal */}
            {selectedOrden && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    orden={selectedOrden}
                    proceso="Cedi"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
