'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import MetricCard from '../pintura/MetricCard'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Filter, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'

interface InspeccionModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string // Added to handle taladro options
}

export default function InspeccionModule({ userEmail, turno, usuarioNombre, plantaMuebles }: InspeccionModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [taladro, setTaladro] = useState<string>('')

    const taladroOptions = plantaMuebles === 'Muebles' 
        ? ['CYFLEX S', 'CX200', 'HUAHUA', 'HUA HUA 2']
        : ['Taladro Cefi', 'CX100']

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData] = await Promise.all([
                getOrdenesMuebles(),
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
        }
    }, [turno])

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
                                onClick={handleClearFilters}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <button
                                onClick={loadData}
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
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
                                            isActive={selectedOrden?.id === orden.id}
                                            onClick={() => {
                                                setSelectedOrden(orden)
                                                setIsModalOpen(true)
                                            }}
                                            proceso="Inspeccion"
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Trazabilidad Modal */}
            {selectedOrden && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    orden={selectedOrden}
                    proceso="Inspeccion"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    taladro={taladro}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
