'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getMoldesDisponibles, registrarPintura } from '@/lib/supabase/queries/pintura'
import MetricCard from './MetricCard'
import OrdenCard from './OrdenCard'
import MoldSelector from './MoldSelector'
import { Search, X, Calendar } from 'lucide-react'

interface PinturaModuleProps {
    userEmail: string
}

export default function PinturaModule({ userEmail }: PinturaModuleProps) {
    // State management
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedOrden, setSelectedOrden] = useState<OrdenFabricacion | null>(null)
    const [selectedLinea, setSelectedLinea] = useState<string>('')
    const [moldesDisponibles, setMoldesDisponibles] = useState<Molde[]>([])
    const [selectedMolde, setSelectedMolde] = useState<Molde | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Load ordenes on mount
    useEffect(() => {
        loadOrdenes()
    }, [])

    // Load moldes when orden is selected
    useEffect(() => {
        if (selectedOrden) {
            loadMoldes(selectedOrden.molde_sku)
        } else {
            setMoldesDisponibles([])
            setSelectedMolde(null)
        }
    }, [selectedOrden])

    const loadOrdenes = async () => {
        setLoading(true)
        try {
            const data = await getOrdenesFabricacion()
            setOrdenes(data)
        } catch (error) {
            console.error('Error loading ordenes:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadMoldes = async (moldeSku: string) => {
        try {
            const data = await getMoldesDisponibles(moldeSku)
            setMoldesDisponibles(data)
        } catch (error) {
            console.error('Error loading moldes:', error)
        }
    }

    // Filter ordenes based on search and date
    const filteredOrdenes = useMemo(() => {
        return ordenes.filter((orden) => {
            const matchesSearch = !searchText ||
                orden.producto_descripcion.toLowerCase().includes(searchText.toLowerCase()) ||
                orden.orden_fabricacion.toLowerCase().includes(searchText.toLowerCase()) ||
                orden.numero_pedido.toLowerCase().includes(searchText.toLowerCase()) ||
                orden.molde_descripcion.toLowerCase().includes(searchText.toLowerCase())

            const matchesDate = !selectedDate ||
                (orden.fecha_ideal_produccion &&
                    new Date(orden.fecha_ideal_produccion).toISOString().split('T')[0] === selectedDate)

            return matchesSearch && matchesDate
        })
    }, [ordenes, searchText, selectedDate])

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = filteredOrdenes.reduce((sum, o) => sum + o.cantidad, 0)
        const programado = filteredOrdenes.reduce((sum, o) => sum + o.programado, 0)

        // These would come from trazabilidad records in a real implementation
        return {
            cantidad: total,
            programado: programado,
            pintura: 0, // Would be calculated from today's trazabilidad records
            desgelcado: 0,
            vaciado: 0,
            acabado: 0,
            digitado: 0,
            transito: 0,
            cedi: 0,
            kilogramos: 0
        }
    }, [filteredOrdenes])

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const handleSubmit = async () => {
        if (!selectedOrden || !selectedLinea || !selectedMolde) {
            alert('Por favor complete todos los campos')
            return
        }

        setSubmitting(true)
        try {
            await registrarPintura({
                orden_fabricacion_id: selectedOrden.id,
                molde_id: selectedMolde.id,
                linea: selectedLinea,
                usuario_email: userEmail
            })

            alert('Pintura registrada exitosamente')

            // Reset form
            setSelectedOrden(null)
            setSelectedLinea('')
            setSelectedMolde(null)

            // Reload data
            loadOrdenes()
        } catch (error) {
            console.error('Error registrando pintura:', error)
            alert('Error al registrar pintura')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Search and Metric Section Container */}
            <div className="bg-gray-50 p-2 flex items-center gap-4 border-b border-gray-200">
                {/* Top Controls */}
                <div className="flex items-center gap-2">
                    <button className="p-2 bg-cyan-500 text-white rounded-lg">
                        <Calendar size={20} />
                    </button>
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="Producto / OF / Pedido / ..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-3 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleClearFilters}
                        className="p-2 bg-orange-400 text-white rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Metrics Bar */}
                <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar">
                    <MetricCard title="Cantidad" value={metrics.cantidad} bgColor="bg-cyan-500" />
                    <MetricCard title="Programado" value={metrics.programado} bgColor="bg-orange-500" />
                    <MetricCard title="Pintura" value={metrics.pintura} bgColor="bg-teal-600" />
                    <MetricCard title="Desgelcado" value={metrics.desgelcado} bgColor="bg-pink-500" />
                    <MetricCard title="Vaciado" value={metrics.vaciado} bgColor="bg-blue-100" textColor="text-gray-900" />
                    <MetricCard title="Acabado" value={metrics.acabado} bgColor="bg-white" textColor="text-gray-900" />
                    <MetricCard title="Digitado" value={metrics.digitado} bgColor="bg-white" textColor="text-gray-900" />
                    <MetricCard title="Transito" value={metrics.transito} bgColor="bg-white" textColor="text-gray-900" />
                    <MetricCard title="CEDI" value={metrics.cedi} bgColor="bg-[#2b2d42]" textColor="text-white" />
                    <MetricCard title="Kilogramos" value={metrics.kilogramos} bgColor="bg-[#4a4e69]" textColor="text-white" />
                </div>
            </div>

            {/* Orders List - Full Width */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                    Ordenes encontradas: {filteredOrdenes.length}
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Cargando órdenes...</div>
                ) : filteredOrdenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No se encontraron órdenes</div>
                ) : (
                    filteredOrdenes.map((orden) => (
                        <OrdenCard
                            key={orden.id}
                            orden={orden}
                            isActive={selectedOrden?.id === orden.id}
                            onClick={() => setSelectedOrden(orden)}
                        />
                    ))
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-gray-50 p-4 flex items-center justify-between gap-4 border-t border-gray-200">
                <div className="flex flex-1 gap-4 items-end">
                    {/* Line Selector */}
                    <div className="w-1/4">
                        <select
                            value={selectedLinea}
                            onChange={(e) => setSelectedLinea(e.target.value)}
                            className="w-full px-4 py-3 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="">Elija linea</option>
                            <option value="Linea 1">Línea 1</option>
                            <option value="Linea 2">Línea 2</option>
                            <option value="Linea 3">Línea 3</option>
                        </select>
                    </div>

                    {/* Mold Selector - Simplified for the bar */}
                    <div className="w-1/4">
                        <select
                            value={selectedMolde?.id || ''}
                            onChange={(e) => {
                                const molde = moldesDisponibles.find(m => m.id === parseInt(e.target.value))
                                if (molde) setSelectedMolde(molde)
                            }}
                            disabled={!selectedOrden || !selectedLinea}
                            className="w-full px-4 py-3 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 outline-none"
                        >
                            <option value="">Elija el molde</option>
                            {moldesDisponibles.map((molde) => (
                                <option key={molde.id} value={molde.id}>
                                    {molde.serial}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedOrden || !selectedLinea || !selectedMolde || submitting}
                        className="flex-1 py-3 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {submitting ? 'Registrando...' : 'Pintar'}
                    </button>

                    {/* Moldes Info Button */}
                    <button className="bg-white text-gray-900 font-bold py-3 px-6 rounded-lg flex items-center gap-2 border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors">
                        <Search size={20} className="text-cyan-500" />
                        Moldes
                    </button>
                </div>
            </div>
        </div>
    )
}
