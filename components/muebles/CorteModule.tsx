'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { OrdenMueble, MetricasMuebles, TareaMuebleActiva } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import MetricCard from '../pintura/MetricCard'
import EncabezadoMuebles from './EncabezadoMuebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Filter, CheckSquare, Play } from 'lucide-react'

interface CorteModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
    onStartTask?: (tarea: TareaMuebleActiva) => void
}

export default function CorteModule({ userEmail, turno, usuarioNombre, plantaMuebles, onStartTask }: CorteModuleProps) {
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
            console.error('Error loading Muebles data:', error)
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }, [turno, plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Realtime subscription — auto-refresh on new traceability records
    useEffect(() => {
        const channel = supabase
            .channel('corte-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'trazabilidad_muebles'
            }, () => {
                // Debounce rapid successive events
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
        const filtered = ordenes.filter((orden) => {
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

            // Only show orders that need cutting
            const needsCutting = (orden.por_cortar || 0) > 0 || (orden.reponer_corte || 0) > 0

            return matchesSearch && matchesDate && needsCutting
        })

        // Sort: reposición orders first, then by date
        return filtered.sort((a, b) => {
            const aReponer = (a.reponer_corte || 0) + (a.por_reponer || 0)
            const bReponer = (b.reponer_corte || 0) + (b.por_reponer || 0)
            if (aReponer > 0 && bReponer === 0) return -1
            if (bReponer > 0 && aReponer === 0) return 1
            return 0
        })
    }, [ordenes, searchText, selectedDate, dateType])

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Encabezado único de Muebles / CEFI (igual en Administración y todos los módulos) */}
            <EncabezadoMuebles
                ordenes={ordenes}
                plantaMuebles={plantaMuebles}
                searchText={searchText}
                setSearchText={setSearchText}
                fecha={selectedDate}
                setFecha={setSelectedDate}
                dateType={dateType}
                setDateType={setDateType}
                onRefresh={() => loadData()}
                loading={loading}
                calidad={metricas?.p_calidad ?? null}
                version={ordenes}
                resaltado="por_cortar"
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Filter size={14} />
                            Ordenes para corte: {filteredOrdenes.length}
                        </div>
                        {syncing && (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest animate-in fade-in duration-300">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block" />
                                Actualizando...
                            </div>
                        )}
                    </div>

                    {selectedOrdenes.length > 0 && (
                        <div className="sticky top-2 z-20 mb-4 bg-white border border-blue-100 rounded-xl shadow-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <CheckSquare size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900">{selectedOrdenes.length} orden{selectedOrdenes.length === 1 ? '' : 'es'} seleccionada{selectedOrdenes.length === 1 ? '' : 's'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                                        Total disponible: {selectedOrdenes.reduce((sum, item) => sum + (item.por_cortar || 0), 0)} piezas
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
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-100"
                                >
                                    <Play size={16} />
                                    Iniciar corte
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando órdenes de muebles...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No se encontraron órdenes pendientes de corte.</p>
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
                                    proceso="Corte"
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
                    proceso="Corte"
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
