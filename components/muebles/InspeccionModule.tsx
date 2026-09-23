'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import MetricCard from '../pintura/MetricCard'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import ModalReportarDefectoMueble from './ModalReportarDefectoMueble'
import { Search, X, Calendar, RefreshCw, Filter, CheckCircle, AlertCircle, ChevronDown, CheckSquare, Play, AlertTriangle } from 'lucide-react'

interface InspeccionModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string // Added to handle taladro options
    onStartTask?: (tarea: any) => void
}

export default function InspeccionModule({ userEmail, turno, usuarioNombre, plantaMuebles, onStartTask }: InspeccionModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrdenes, setSelectedOrdenes] = useState<OrdenMueble[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDefectoModalOpen, setIsDefectoModalOpen] = useState(false)
    const [defectoSelectedOrden, setDefectoSelectedOrden] = useState<OrdenMueble | null>(null)
    const [taladro, setTaladro] = useState<string>('')
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    const taladroOptions = plantaMuebles === 'Muebles' 
        ? ['CX200', 'HUAHUA', 'HUA HUA 2']
        : ['Taladro Cefi', 'CX100']

    const loadData = useCallback(async (soft = false) => {
        if (soft) {
            setSyncing(true)
        } else {
            setLoading(true)
        }
        try {
            const [ordenesData, metricasData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles, true),
                getMetricasMueblesHoy(turno)
            ])
            setOrdenes(ordenesData)
            if (metricasData && metricasData.length > 0) {
                setMetricas(metricasData[0])
            }
        } catch (error) {
            console.error('Error loading Inspeccion data:', error)
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }, [turno, plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Realtime subscription — auto-refresh when records are inserted/updated
    useEffect(() => {
        const channel = supabase
            .channel('inspeccion-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'trazabilidad_muebles'
            }, () => {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => loadData(true), 800)
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'ordenes_fabricacion_muebles'
            }, () => {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => loadData(true), 800)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [loadData])

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const handleSelectOrden = (orden: OrdenMueble) => {
        if (!taladro) {
            setNotification({ message: '¡Por favor selecciona el taladro en el menú superior!', type: 'error' })
            return
        }
        setSelectedOrdenes([orden])
        setIsModalOpen(true)
    }

    const clearSelection = () => {
        setSelectedOrdenes([])
        setIsModalOpen(false)
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

            // Only show orders that have been processed by Enchape OR need inspection re-work
            // Only show orders with pieces ready for Inspection (WIP from Enchape)
            // Logic: enchape > 0 OR reponer_inspeccion > 0
            const needsInspeccion = (orden.enchape || 0) > 0 || (orden.reponer_inspeccion || 0) > 0

            return matchesSearch && matchesDate && needsInspeccion
        })
    }, [ordenes, searchText, selectedDate, dateType])

    // Calculate WIP sums for this stage
    const sumEnchape = filteredOrdenes.reduce((sum, o) => sum + (o.enchape || 0), 0)
    const sumInspeccion = filteredOrdenes.reduce((sum, o) => sum + (o.inspeccion || 0), 0)

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Controls & Metrics Header */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Search and Date Filter */}
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative group">
                                <button 
                                    onClick={() => setDateType(dateType === 'entrega' ? 'creacion' : 'entrega')}
                                    className={`p-2 rounded-lg text-white transition-colors duration-200 flex items-center gap-1 ${dateType === 'entrega' ? 'bg-emerald-600' : 'bg-purple-600'}`}
                                    title={dateType === 'entrega' ? 'Filtrando por Fecha Entrega' : 'Filtrando por Fecha Creación'}
                                >
                                    <Calendar size={20} />
                                    <span className="text-[10px] font-bold hidden sm:inline uppercase">{dateType}</span>
                                </button>
                            </div>
                            
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar en Inspección..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Taladro Selection (Required in Flutter) */}
                            <div className="relative min-w-[180px]">
                                <select 
                                    value={taladro}
                                    onChange={(e) => setTaladro(e.target.value)}
                                    className={`w-full pl-4 pr-10 py-2 bg-white border ${!taladro ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300'} rounded-lg text-sm appearance-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium`}
                                >
                                    <option value="">Seleccione Taladro</option>
                                    {taladroOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>

                            <button
                                onClick={() => {
                                    setDefectoSelectedOrden(null)
                                    setIsDefectoModalOpen(true)
                                }}
                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                title="Reportar Defecto / Calidad"
                            >
                                <AlertTriangle size={16} />
                                <span className="hidden sm:inline">REPORTAR DEFECTO</span>
                            </button>

                            <button
                                onClick={handleClearFilters}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <button
                                onClick={() => loadData()}
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                title="Actualizar datos"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Inspection Specific Metrics */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0 shrink-0">
                            <MetricCard title="Enchape" value={sumEnchape} bgColor="bg-indigo-600" />
                            <MetricCard title="Inspección" value={sumInspeccion} bgColor="bg-emerald-600" />
                            <MetricCard title="Insp. hoy" value={metricas?.inspeccion || 0} bgColor="bg-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    {!taladro ? (
                        <div className="flex flex-col items-center justify-center py-32 text-orange-500 gap-4">
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                                <AlertCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold uppercase tracking-tight">¡Debes seleccionar el taladro!</h2>
                            <p className="text-gray-500 font-medium">Por favor selecciona la máquina en el menú superior para ver las órdenes.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle size={14} />
                                    ORDENES EN INSPECCIÓN: {filteredOrdenes.length}
                                </div>
                                {syncing && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest animate-in fade-in duration-300">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block" />
                                        Actualizando...
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-500 font-medium">Cargando órdenes de inspección...</p>
                                </div>
                            ) : filteredOrdenes.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                        <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No hay órdenes pendientes de inspección.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredOrdenes.map((orden) => (
                                        <OrderCard
                                            key={orden.id}
                                            orden={orden}
                                            isActive={selectedOrdenes.some((item) => item.id === orden.id)}
                                            onClick={() => handleSelectOrden(orden)}
                                            proceso="Inspeccion"
                                            onReportDefect={(ord) => {
                                                setDefectoSelectedOrden(ord)
                                                setIsDefectoModalOpen(true)
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Trazabilidad Modal */}
            {selectedOrdenes.length > 0 && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    orden={selectedOrdenes[0]}
                    ordenes={selectedOrdenes}
                    proceso="Inspeccion"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
                    taladro={taladro}
                    onStartTask={(tarea) => {
                        clearSelection()
                        onStartTask?.(tarea)
                    }}
                    onSuccess={() => {
                        clearSelection()
                        loadData()
                    }}
                />
            )}

            {/* Defect Reporting Modal */}
            {isDefectoModalOpen && (
                <ModalReportarDefectoMueble
                    isOpen={isDefectoModalOpen}
                    onClose={() => {
                        setIsDefectoModalOpen(false)
                        setDefectoSelectedOrden(null)
                    }}
                    ordenFabricacion={defectoSelectedOrden?.orden_fabricacion || ''}
                    ordenData={defectoSelectedOrden || undefined}
                    usuarioNombre={usuarioNombre}
                    turno={turno}
                    taladro={taladro}
                    plantaMuebles={plantaMuebles}
                    onSuccess={() => loadData(true)}
                />
            )}

            {/* Notification Snackbar */}
            {notification && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-300 ${
                    notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                } text-white`}>
                    <div className="font-bold">{notification.message}</div>
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/10 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}
