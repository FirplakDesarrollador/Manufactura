'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, Molde, RegistroTrazabilidad } from '@/types/pintura'
import { getOrdenesFabricacion, getMoldesDisponibles, registrarPintura, getRegistrosTrazabilidad, getAllMoldes } from '@/lib/supabase/queries/pintura'
import MetricCard from './MetricCard'
import OrdenCard from './OrdenCard'
import MoldSelector from './MoldSelector'
import { Search, X, Calendar, History, ClipboardList } from 'lucide-react'
import HistorySection from './HistorySection'
import ModalBuscarMolde from './ModalBuscarMolde'



interface PinturaModuleProps {
    userEmail: string
}

export default function PinturaModule({ userEmail }: PinturaModuleProps) {
    // State management
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [trazabilidad, setTrazabilidad] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedOrden, setSelectedOrden] = useState<OrdenFabricacion | null>(null)
    const [selectedLinea, setSelectedLinea] = useState<string>('')
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [moldesDisponibles, setMoldesDisponibles] = useState<Molde[]>([])
    const [debugInfo, setDebugInfo] = useState<string>('')
    const [selectedMolde, setSelectedMolde] = useState<Molde | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [view, setView] = useState<'report' | 'history'>('report')
    const [isMoldModalOpen, setIsMoldModalOpen] = useState(false)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)



    const loadOrdenes = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, trazaData, moldesData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidad(),
                getAllMoldes()
            ])
            setOrdenes(ordenesData)
            setTrazabilidad(trazaData)
            setAllMoldes(moldesData)
        } catch (error) {
            console.error('Error cargando datos iniciales en loadOrdenes:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const loadMoldes = React.useCallback(async (moldeSku: string) => {
        try {
            const data = await getMoldesDisponibles(moldeSku)
            setMoldesDisponibles(data)
        } catch (error) {
            console.error('Error loading moldes:', error)
        }
    }, [])

    // Load ordenes on mount
    useEffect(() => {
        loadOrdenes()
    }, [loadOrdenes])

    // Auto-hide notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [notification])

    // Load moldes when orden is selected
    useEffect(() => {
        if (selectedOrden) {
            // Priority to molde_sku as found in the working Flutter app
            const sku = (selectedOrden.molde_sku || selectedOrden.producto_sku || selectedOrden.sku || '').trim().toLowerCase()
            
            // Filter locally from allMoldes
            const available = allMoldes
                .filter(m => 
                    (m.molde_sku || '').trim().toLowerCase() === sku && 
                    m.estado === 'Disponible'
                )
                .sort((a, b) => a.vueltas_actuales - b.vueltas_actuales)
            
            setMoldesDisponibles(available)
            setSelectedMolde(null)
            
            if (available.length === 0) {
                setDebugInfo(`No se encontraron moldes Disponibles para el SKU: "${sku}"`)
            } else {
                setDebugInfo('')
            }
        } else {
            setMoldesDisponibles([])
            setSelectedMolde(null)
            setDebugInfo('')
        }
    }, [selectedOrden, allMoldes])

    // Filter ordenes based on search and date (Safe from null/undefined)
    const filteredOrdenes = useMemo(() => {
        const search = (searchText || '').toLowerCase()
        return ordenes.filter((orden) => {
            const matchesSearch = !search ||
                (orden.producto_descripcion || '').toLowerCase().includes(search) ||
                (orden.orden_fabricacion || '').toLowerCase().includes(search) ||
                (orden.pedido || '').toLowerCase().includes(search) ||
                (orden.molde_descripcion || '').toLowerCase().includes(search) ||
                (orden.producto_sku || '').toLowerCase().includes(search) ||
                (orden.molde_sku || '').toLowerCase().includes(search) ||
                (orden.cliente || '').toLowerCase().includes(search)

            const matchesDate = !selectedDate ||
                (orden.fecha_ideal_produccion &&
                    orden.fecha_ideal_produccion.includes(selectedDate))

            const isProgramada = (orden.programado || 0) > 0

            return matchesSearch && matchesDate && isProgramada
        })
    }, [ordenes, searchText, selectedDate])

    // Calculate metrics based on Flutter logic
    const metrics = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('es-ES') // matching d/M/y format loosely

        // Sum for filtered orders
        const total = filteredOrdenes.reduce((sum, o) => sum + (o.cantidad || 0), 0)
        const programado = filteredOrdenes.reduce((sum, o) => sum + (o.programado || 0), 0)

        // Filter traceability based on current search
        const trazaMatchesSearch = trazabilidad.filter(t => {
            if (!searchText) return true;
            const search = searchText.toLowerCase();
            return (t.orden_fabricacion || '').toLowerCase().includes(search) ||
                   (t.pedido || '').toLowerCase().includes(search) ||
                   (t.producto_descripcion || '').toLowerCase().includes(search) ||
                   (t.molde_descripcion || '').toLowerCase().includes(search) ||
                   (t.producto_sku || '').toLowerCase().includes(search);
        });

        const isToday = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).toLocaleDateString('es-ES');
            return d === todayStr;
        };

        const pinturaToday = trazaMatchesSearch.filter(t => isToday(t.pintura_fecha));
        
        const desgelcado = pinturaToday.filter(t => t.estado === 'Desgelcada').length;
        const vaciado = pinturaToday.filter(t => t.estado !== 'Pintura' && t.estado !== 'Desgelcado').length;
        
        const today = new Date().toISOString().split('T')[0]
        const search = (searchText || '').toLowerCase()

        // Filter by today (checking different dates as in Flutter)
        const recordsToday = trazabilidad.filter(t => {
            const matchesSearch = !search || 
                (t.orden_fabricacion || '').toLowerCase().includes(search) ||
                (t.pedido || '').toLowerCase().includes(search) ||
                (t.producto_descripcion || '').toLowerCase().includes(search) ||
                (t.molde_descripcion || '').toLowerCase().includes(search) ||
                (t.producto_sku || '').toLowerCase().includes(search)

            if (!matchesSearch) return false

            const pDate = (t.pintura_fecha || '').split('T')[0]
            const cDate = (t.cedi_fecha || '').split('T')[0]
            const dDate = (t.digitado_fecha || '').split('T')[0]
            const tDate = (t.transito_fecha || '').split('T')[0]

            return pDate === today || cDate === today || dDate === today || tDate === today
        })

        const totalKilos = recordsToday
            .filter(t => {
                const cDate = (t.cedi_fecha || '').split('T')[0]
                const dDate = (t.digitado_fecha || '').split('T')[0]
                const tDate = (t.transito_fecha || '').split('T')[0]
                const isFinalStatus = ['Digitado', 'Transito', 'Cedi'].includes(t.estado || '')
                const isTodayFinal = cDate === today || dDate === today || tDate === today
                return isFinalStatus && isTodayFinal
            })
            .reduce((acc, t) => acc + (t.molde_masa_teorica || 0), 0)

        // Count for Pintura and Desgelcada (specifically on pintura_fecha === today)
        const pinturaCount = recordsToday.filter(t => (t.pintura_fecha || '').split('T')[0] === today).length
        const desgelcadaCount = recordsToday.filter(t => 
            (t.pintura_fecha || '').split('T')[0] === today && 
            t.estado === 'Desgelcada'
        ).length

        return {
            cantidad: filteredOrdenes.reduce((sum, o) => sum + (o.cantidad || 0), 0),
            programado: filteredOrdenes.reduce((sum, o) => sum + (o.programado || 0), 0),
            pintura: pinturaCount,
            desgelcado: desgelcadaCount,
            vaciado: recordsToday.filter(t => 
                (t.pintura_fecha || '').split('T')[0] === today && 
                !['Pintura', 'Desgelcada'].includes(t.estado || '')
            ).length,
            acabado: 0,
            digitado: recordsToday.filter(t => (t.digitado_fecha || '').split('T')[0] === today && t.estado === 'Digitado').length,
            transito: recordsToday.filter(t => (t.transito_fecha || '').split('T')[0] === today && t.estado === 'Transito').length,
            cedi: recordsToday.filter(t => (t.cedi_fecha || '').split('T')[0] === today && t.estado === 'Cedi').length,
            kilogramos: parseFloat(totalKilos.toFixed(1))
        }
    }, [filteredOrdenes, trazabilidad, searchText])

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const checkMantenimiento = (molde: Molde) => {
        const threshold = (molde.Vueltas_Desmanchado || 40) - 1;

        if (molde.vueltas_actuales >= threshold) {
            const isNearLimit = molde.vueltas_actuales === threshold;
            const isOverLimit = molde.vueltas_actuales > threshold;
            
            const title = isOverLimit ? '⚠️ Molde al Límite ⚠️' : '🔔 Aviso de Mantenimiento 🔔';
            const message = isOverLimit 
                ? `El ${molde.molde_descripcion} # ${molde.serial} ha alcanzado su límite de ${molde.Vueltas_Desmanchado} vueltas. Al intentar pintar, será enviado a REPARACIÓN.`
                : `El ${molde.molde_descripcion} # ${molde.serial} está a una vuelta de su mantenimiento (${molde.Vueltas_Desmanchado} vueltas).`;
            
            alert(`${title}\n\n${message}`);
            return true;
        }
        return false;
    };

    const handleSubmit = async () => {
        // 1. Validaciones previas
        if (!selectedOrden) {
            alert('Error: Debe seleccionar una Orden de Fabricación.')
            return
        }
        if (!selectedLinea) {
            alert('Error: Debe seleccionar una Línea.')
            return
        }
        if (!selectedMolde) {
            alert('Error: Debe seleccionar un Molde.')
            return
        }

        setSubmitting(true)
        try {
            // 2. Proceso de registro (verificado en el backend)
            await registrarPintura({
                orden_fabricacion_id: selectedOrden.id,
                molde_id: selectedMolde.id,
                linea: selectedLinea,
                usuario_email: userEmail
            })

            // 3. Éxito convencional
            setNotification({ message: '¡Registro creado exitosamente!', type: 'success' })
            
            // Limpia los campos del formulario
            setSelectedOrden(null)
            setSelectedLinea('')
            setSelectedMolde(null)

            // Recargar datos
            loadOrdenes()
        } catch (error: any) {
            console.error('Error detallado registrando pintura:', error)
            const detail = error.message || ''
            
            // Caso Especial: Mantenimiento Automático (Menciona al usuario la reparación)
            if (detail.includes('MANTENIMIENTO_AUTOMATICO')) {
                const cleanMessage = detail.replace('MANTENIMIENTO_AUTOMATICO: ', '')
                setNotification({ message: cleanMessage, type: 'success' }) // Se muestra en verde porque es una acción del sistema exitosa
                
                // Limpiar campos porque el molde ya no se puede usar
                setSelectedMolde(null)
                loadOrdenes() // Recargar para ver el nuevo estado del molde
                return
            }

            // Error Real
            const errorMessage = detail || 'Error desconocido en el servidor'
            alert(`Error al registrar pintura: ${errorMessage}`)
            setNotification({ message: `Fallo: ${errorMessage}`, type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Search and Metric Section Container */}
            <div className="bg-gray-50 p-2 flex flex-col md:flex-row md:items-center gap-4 border-b border-gray-200">
                {/* Top Controls */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="p-2 bg-cyan-500 text-white rounded-lg shrink-0">
                        <Calendar size={20} />
                    </button>
                    <div className="relative flex-1 md:w-64">
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
                        className="p-2 bg-orange-400 text-white rounded-lg shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Metrics Bar */}
                <div className="flex w-full gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {view === 'history' ? (
                    <HistorySection />
                ) : (
                    <div className="space-y-2">
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
                                    moldes={allMoldes}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end w-full">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        {/* Line Selector */}
                        <div className="w-full sm:w-1/2">
                            <label className="md:hidden text-xs font-bold text-cyan-600 uppercase mb-1">Línea</label>
                            <select
                                value={selectedLinea}
                                onChange={(e) => setSelectedLinea(e.target.value)}
                                className="w-full px-4 py-3 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm"
                            >
                                <option value="">Elija linea</option>
                                <option value="Linea 1">Línea 1</option>
                                <option value="Linea 2">Línea 2</option>
                                <option value="Linea 3">Línea 3</option>
                            </select>
                        </div>

                        {/* Mold Selector - Simplified for the bar */}
                        <div className="w-full sm:w-1/2">
                            <label className="md:hidden text-xs font-bold text-cyan-600 uppercase mb-1">Molde</label>
                            <div className="flex flex-col gap-1">
                                <select
                                    value={selectedMolde?.id || ''}
                                    onChange={(e) => {
                                        const molde = moldesDisponibles.find(m => m.id === parseInt(e.target.value))
                                        if (molde) {
                                            setSelectedMolde(molde)
                                            checkMantenimiento(molde)
                                        }
                                    }}
                                    disabled={!selectedOrden || !selectedLinea}
                                    className={`w-full px-4 py-3 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all
                                        ${!selectedOrden ? 'cursor-not-allowed border-dashed bg-gray-50' : 'bg-white shadow-sm'}
                                    `}
                                >
                                    <option value="">
                                        {!selectedOrden ? '← Seleccione una orden primero' : 'Elija el molde'}
                                    </option>
                                    {moldesDisponibles.map((molde) => (
                                        <option key={molde.id} value={molde.id}>
                                            {molde.serial} ({molde.vueltas_actuales}v)
                                        </option>
                                    ))}
                                </select>
                                {debugInfo && (
                                    <div className="text-[10px] text-red-500 font-bold px-1 animate-pulse">
                                        {debugInfo}
                                    </div>
                                )}
                                {selectedMolde && (
                                    <div className="text-[10px] text-gray-500 px-1 italic">
                                        Vueltas: {selectedMolde.vueltas_actuales} / {selectedMolde.vueltas_mto_atipicas > 0 ? selectedMolde.vueltas_mto_atipicas : selectedMolde.vueltas_mto}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:flex-none">
                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOrden || !selectedLinea || !selectedMolde || submitting}
                            className="flex-1 lg:min-w-[150px] py-3 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {submitting ? 'Reg...' : 'Pintar'}
                        </button>

                        <div className="flex gap-2 w-full lg:w-auto">
                            {/* Moldes Info Button */}
                            <button
                                onClick={() => setIsMoldModalOpen(true)}
                                className="flex-1 lg:flex-none bg-white text-gray-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap"
                            >
                                <Search size={20} className="text-cyan-500" />
                                Moldes
                            </button>

                            {/* Registros / Volver Button */}
                            <button
                                onClick={() => setView(view === 'report' ? 'history' : 'report')}
                                className={`flex-1 lg:flex-none font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border shadow-sm transition-colors whitespace-nowrap ${view === 'history'
                                    ? 'bg-cyan-600 text-white border-cyan-700 hover:bg-cyan-700'
                                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {view === 'history' ? (
                                    <>
                                        <ClipboardList size={20} />
                                        Reportar
                                    </>
                                ) : (
                                    <>
                                        <History size={20} className="text-cyan-500" />
                                        Registros
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Snackbar */}
            {notification && (
                <div className={`fixed bottom-24 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                    notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    <div className="font-bold text-sm">
                        {notification.message}
                    </div>
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/10 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Modals */}
            <ModalBuscarMolde
                isOpen={isMoldModalOpen}
                onClose={() => setIsMoldModalOpen(false)}
            />
        </div>
    )
}
