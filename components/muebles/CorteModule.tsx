'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy, registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import MetricCard from '../pintura/MetricCard'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Filter } from 'lucide-react'

interface CorteModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function CorteModule({ userEmail, turno, usuarioNombre, plantaMuebles }: CorteModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles),
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

            // Only show orders that need cutting
            const needsCutting = (orden.por_cortar || 0) > 0 || (orden.reponer_corte || 0) > 0

            return matchesSearch && matchesDate && needsCutting
        })
    }, [ordenes, searchText, selectedDate, dateType])

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
                                    className={`p-2 rounded-lg text-white transition-colors duration-200 flex items-center gap-1 ${dateType === 'entrega' ? 'bg-blue-600' : 'bg-purple-600'}`}
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
                                    placeholder="Buscar por OF, Pedido, Cliente o SKU..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleClearFilters}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <button
                                onClick={loadData}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Summary Stats Bar */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 shrink-0">
                            <MetricCard title="Cortados" value={metricas?.cortados || 0} bgColor="bg-blue-600" />
                            <MetricCard title="Piezas" value={metricas?.corte_piezas || 0} bgColor="bg-blue-500" />
                            <MetricCard title="M2 Corte" value={metricas?.corte_m2 || 0} bgColor="bg-blue-400" />
                            <MetricCard title="Reposic." value={metricas?.reposiciones || 0} bgColor="bg-red-500" />
                            <MetricCard title="CEDI" value={metricas?.cedi || 0} bgColor="bg-gray-800" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Filter size={14} />
                            Ordenes para corte: {filteredOrdenes.length}
                        </div>
                    </div>

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
                                    isActive={selectedOrden?.id === orden.id}
                                    onClick={() => {
                                        setSelectedOrden(orden)
                                        setIsModalOpen(true)
                                    }}
                                    proceso="Corte"
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
                    proceso="Corte"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    onSuccess={() => {
                        setIsModalOpen(false)
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
