'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy, getCediActual } from '@/lib/supabase/queries/muebles'
import MetricCard from '../pintura/MetricCard'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Truck } from 'lucide-react'

interface TransitoModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function TransitoModule({ userEmail, turno, usuarioNombre, plantaMuebles }: TransitoModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [cediActual, setCediActual] = useState<any>(null)
    const [loading, setLoading] = useState(true)
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
            console.error('Error loading Transito data:', error)
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

            // Only show orders with pieces ready for Transit (WIP from Digitado)
            // Logic: digitado > 0
            const isDigitized = (orden.digitado || 0) > 0

            return matchesSearch && matchesDate && isDigitized
        })
    }, [ordenes, searchText, selectedDate, dateType])

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
                                    placeholder="Buscar en Tránsito..."
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
                                onClick={loadData}
                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Transito Specific Metrics */}
                        <div className="flex gap-2 shrink-0">
                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Digitado</p>
                                <p className="text-lg font-bold text-gray-800">{sumDigitado}</p>
                            </div>
                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm ring-2 ring-indigo-50">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Tránsito</p>
                                <p className="text-lg font-bold text-gray-800">{sumTransito}</p>
                            </div>
                            <div className="bg-white border border-indigo-200 rounded-lg p-2 min-w-[90px] text-center shadow-sm">
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">Tráns. hoy</p>
                                <p className="text-lg font-bold text-gray-800">{metricas?.transito || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Truck size={14} />
                            ORDENES EN TRÁNSITO: {filteredOrdenes.length}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando órdenes en tránsito...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No hay órdenes en tránsito.</p>
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
                                    proceso="Transito"
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
                    proceso="Transito"
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
