'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import MetricCard from '../pintura/MetricCard'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Filter, Layers, CheckSquare, Play } from 'lucide-react'

interface EnchapeModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
    onStartTask?: (tarea: any) => void
}

export default function EnchapeModule({ userEmail, turno, usuarioNombre, plantaMuebles, onStartTask }: EnchapeModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrdenes, setSelectedOrdenes] = useState<OrdenMueble[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
            console.error('Error loading Enchape data:', error)
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
            .channel('enchape-realtime')
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

    const toggleOrden = (orden: OrdenMueble) => {
        setSelectedOrdenes((current) => {
            const exists = current.some((item) => item.id === orden.id)
            if (exists) return current.filter((item) => item.id !== orden.id)
            return [...current, orden]
        })
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

            // Only show orders with pieces ready for Enchape (WIP from Corte)
            // Logic: corte > 0 OR reponer_enchape > 0
            const needsEnchape = (orden.corte || 0) > 0 || (orden.reponer_enchape || 0) > 0

            return matchesSearch && matchesDate && needsEnchape
        })
    }, [ordenes, searchText, selectedDate, dateType])

    // Calculate dynamic sums for header based on WIP available for this stage
    const sumCorte = filteredOrdenes.reduce((sum, o) => sum + (o.corte || 0), 0)
    const sumEnchape = filteredOrdenes.reduce((sum, o) => sum + (o.enchape || 0), 0)

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
                                    placeholder="Buscar en Enchape..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleClearFilters}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <button
                                onClick={() => loadData()}
                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                title="Actualizar datos"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Enchape Specific Metrics */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 shrink-0">
                            <MetricCard title="Corte" value={sumCorte} bgColor="bg-blue-600" />
                            <MetricCard title="Enchape" value={sumEnchape} bgColor="bg-indigo-600" />
                            <MetricCard title="Enchape hoy" value={metricas?.enchapados || 0} bgColor="bg-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Layers size={14} />
                            ORDENES EN ENCHAPE: {filteredOrdenes.length}
                        </div>
                        {syncing && (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest animate-in fade-in duration-300">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block" />
                                Actualizando...
                            </div>
                        )}
                    </div>

                    {selectedOrdenes.length > 0 && (
                        <div className="sticky top-2 z-20 mb-4 bg-white border border-indigo-100 rounded-xl shadow-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <CheckSquare size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900">{selectedOrdenes.length} orden{selectedOrdenes.length === 1 ? '' : 'es'} seleccionada{selectedOrdenes.length === 1 ? '' : 's'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                                        Total disponible: {selectedOrdenes.reduce((sum, item) => sum + (item.corte || 0) + (item.reponer_enchape || 0), 0)} piezas
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 font-bold text-xs uppercase"
                                >
                                    Limpiar
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                    <Play size={16} />
                                    Iniciar enchape
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando órdenes de enchape...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No hay órdenes pendientes de enchape.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrdenes.map((orden) => (
                                <OrderCard
                                    key={orden.id}
                                    orden={orden}
                                    isActive={selectedOrdenes.some((item) => item.id === orden.id)}
                                    onClick={() => toggleOrden(orden)}
                                    proceso="Enchape"
                                />
                            ))}
                        </div>
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
                    proceso="Enchape"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
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

