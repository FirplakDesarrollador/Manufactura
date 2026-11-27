'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy, getCediActual } from '@/lib/supabase/queries/muebles'
import MetricCard from '../pintura/MetricCard'
import EncabezadoMuebles from './EncabezadoMuebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Truck, Undo2, Send } from 'lucide-react'
import DevolverInspeccionMuebles from './DevolverInspeccionMuebles'

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
    const [devolverOrden, setDevolverOrden] = useState<OrdenMueble | null>(null)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData, cediData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles, true),
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
            {/* Encabezado único de Muebles / CEFI (igual en Administración y todos los módulos) */}
            <EncabezadoMuebles
                ordenes={filteredOrdenes}
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
            />

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
                                <div key={orden.id}>
                                    <OrderCard
                                        orden={orden}
                                        isActive={selectedOrden?.id === orden.id}
                                        onClick={() => {
                                            setSelectedOrden(orden)
                                            setIsModalOpen(true)
                                        }}
                                        proceso="Transito"
                                    />
                                    {/* Franja de acciones pegada debajo de la tarjeta (como en Digitado) */}
                                    <div className="mx-3 -mt-0.5 rounded-b-xl border-2 border-t-0 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1.5 flex flex-wrap items-center justify-end gap-2">
                                        <button type="button" onClick={() => setDevolverOrden(orden)} disabled={(orden.digitado || 0) <= 0}
                                            title="Devolver unidades por pasar a tránsito a Digitado"
                                            className="h-9 px-4 rounded-lg bg-white border border-amber-400 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                                            <Undo2 size={16} /> Devolver a Digitado
                                        </button>
                                        <button type="button" onClick={() => { setSelectedOrden(orden); setIsModalOpen(true) }}
                                            className="h-9 px-4 rounded-lg bg-[#254153] hover:bg-[#1a3040] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                            <Send size={16} /> Registrar Tránsito
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {devolverOrden && (
                <DevolverInspeccionMuebles
                    destino="digitado"
                    orden={devolverOrden}
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    userEmail={userEmail}
                    onCerrar={() => setDevolverOrden(null)}
                    onHecho={() => { setDevolverOrden(null); loadData() }}
                />
            )}

            {/* Trazabilidad Modal */}
            {selectedOrden && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    orden={selectedOrden}
                    proceso="Transito"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
