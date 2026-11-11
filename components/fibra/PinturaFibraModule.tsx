'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, Molde, RegistroTrazabilidad } from '@/types/pintura'
import { getOrdenesFabricacion, getMoldesDisponibles, registrarPintura, getRegistrosTrazabilidad, getAllMoldes, getRegistrosTrazabilidadHoyMetricas } from '@/lib/supabase/queries/fibra'
import OrdenCard from '@/components/pintura/OrdenCard'
import MoldSelector from '../pintura/MoldSelector'
import { Search, X, History, ClipboardList } from 'lucide-react'
import EncabezadoFibra, { useMetricasFibra } from './EncabezadoFibra'
import HistorySection from './HistorySection'
import ModalBuscarMolde from '../pintura/ModalBuscarMolde'
import { moldesDisponiblesOrden } from '@/lib/fibra/moldesOrden'
import { recargarFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'
import { registrarKitReparacionFv } from '@/lib/supabase/queries/fibra_administracion'



interface PinturaFibraModuleProps {
    userEmail: string
}

export default function PinturaFibraModule({ userEmail }: PinturaFibraModuleProps) {
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
    const [moldSearchText, setMoldSearchText] = useState('')
    const [isMoldDropdownOpen, setIsMoldDropdownOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [view, setView] = useState<'report' | 'history'>('report')
    const [isMoldModalOpen, setIsMoldModalOpen] = useState(false)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)



    const loadOrdenes = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, trazaData, moldesData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidadHoyMetricas(), // Usar hoy para métricas rápidas
                getAllMoldes()
            ])
            setOrdenes(ordenesData)
            setTrazabilidad(trazaData)
            setAllMoldes(moldesData)
        } catch (error) {
            console.error('Supabase error en registrarPintura:', error)
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMoldDropdownOpen && !(event.target as Element).closest('.relative')) {
                setIsMoldDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMoldDropdownOpen])

    // Load moldes when orden is selected
    useEffect(() => {
        if (selectedOrden) {
            const sku = (selectedOrden.molde_sku || selectedOrden.producto_sku || selectedOrden.sku || '').trim().toLowerCase()
            const available = moldesDisponiblesOrden(selectedOrden, allMoldes)

            setMoldesDisponibles(available)
            setSelectedMolde(null)

            if (esKitReparacion(selectedOrden.producto_descripcion)) {
                setDebugInfo('')
            } else if (available.length === 0) {
                setDebugInfo(`Sin molde específico asignado: puede elegir o buscar cualquier molde de la lista.`)
            } else {
                setDebugInfo('')
            }
        } else {
            setMoldesDisponibles([])
            setSelectedMolde(null)
            setDebugInfo('')
        }
    }, [selectedOrden, allMoldes])

    // Moldes para el selector: busca entre todos los moldes si hay texto, o muestra los asociados a la orden
    const moldesOpciones = useMemo(() => {
        const q = moldSearchText.trim().toLowerCase()
        if (q) {
            return allMoldes.filter(m => 
                (m.serial || '').toLowerCase().includes(q) ||
                (m.molde_descripcion || '').toLowerCase().includes(q) ||
                (m.molde_sku || '').toLowerCase().includes(q)
            )
        }
        if (moldesDisponibles.length > 0) {
            return moldesDisponibles
        }
        return allMoldes
    }, [moldSearchText, moldesDisponibles, allMoldes])

    // Filtro base y métricas compartidos con los demás módulos de piso FV
    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, trazabilidad, searchText, selectedDate)

    // Filter and sort ordenes based on search and date (Safe from null/undefined)
    const filteredOrdenes = useMemo(() => {
        const filtered = baseFilteredOrdenes.filter((orden) => {
            // En Pintura, solo mostramos lo que realmente tiene piezas pendientes por iniciar
            const hasProgramado = (orden.programado || 0) > 0
            return hasProgramado
        })

        return filtered.sort((a, b) => {
            const dateAStr = a.fecha_entrega_lote || a.fecha_ideal_produccion || a.fecha_entrega_estimada
            const dateBStr = b.fecha_entrega_lote || b.fecha_ideal_produccion || b.fecha_entrega_estimada
            const dateA = dateAStr ? new Date(dateAStr).getTime() : Infinity
            const dateB = dateBStr ? new Date(dateBStr).getTime() : Infinity
            const valA = isNaN(dateA) ? Infinity : dateA
            const valB = isNaN(dateB) ? Infinity : dateB
            return valA - valB
        })
    }, [baseFilteredOrdenes])

    const [syncing, setSyncing] = useState(false)

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const handleSyncSap = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/sap/ordenes-liberadas', { cache: 'no-store' })
            const json = await res.json().catch(() => null)
            await Promise.all([loadOrdenes(), recargarFechasSemaforoFv()])
            setNotification(json?.avisoFechasSemaforo
                ? { message: `Órdenes actualizadas. ${json.avisoFechasSemaforo}`, type: 'error' }
                : { message: 'Órdenes actualizadas y sincronizadas desde SAP correctamente', type: 'success' })
        } catch (e) {
            await loadOrdenes()
            setNotification({ message: 'Órdenes recargadas', type: 'success' })
        } finally {
            setSyncing(false)
        }
    }

    const checkMantenimiento = (molde: Molde) => {
        const threshold = molde.vueltas_mto_atipicas > 0 
            ? molde.vueltas_mto_atipicas - 1
            : molde.vueltas_mto - 1;

        if (molde.vueltas_actuales >= threshold) {
            const isNew = molde.vueltas_mto_atipicas === 1;
            const title = isNew ? '🆕 Molde nuevo 🆕' : '⚠️ Molde para desmanchar ⚠️';
            const message = isNew 
                ? `El ${molde.molde_descripcion} # ${molde.serial} Se debe encerar en el puesto`
                : `El ${molde.molde_descripcion} # ${molde.serial} Se debe sacar para desmanchar`;
            
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
        const kit = esKitReparacion(selectedOrden.producto_descripcion)
        if (!selectedMolde && !kit) {
            alert('Error: Debe seleccionar un Molde.')
            return
        }
        const sumEtapas = (selectedOrden.pintura || 0) +
            (selectedOrden.pulido || 0) +
            (selectedOrden.reparacion || 0) +
            (selectedOrden.saldo || 0) +
            (selectedOrden.empaque || 0) +
            (selectedOrden.transito || 0) +
            (selectedOrden.vaciado || 0) +
            (selectedOrden.estanteria || 0) +
            (selectedOrden.acabado || 0) +
            (selectedOrden.reparacion_larga || 0) +
            (selectedOrden.digitado || 0) +
            (selectedOrden.cedi || 0)
        const cantidadMax = Math.max(0, selectedOrden.cantidad || selectedOrden.cantidad_programada || 0)

        if (cantidadMax > 0 && sumEtapas >= cantidadMax) {
            alert(`Acción bloqueada: La sumatoria de piezas en etapas (${sumEtapas}) de la orden ${selectedOrden.orden_fabricacion} ya alcanzó la cantidad máxima permitida (${cantidadMax}).`)
            return
        }

        setSubmitting(true)
        try {
            // 2. Proceso de registro (verificado en el backend)
            if (kit) {
                // Kit de reparación: sin molde y directo a Digitado (no pasa por los procesos de la planta)
                await registrarKitReparacionFv(selectedOrden.id, 'digitado', userEmail, null, 'pintura')
            } else {
                await registrarPintura({
                    orden_fabricacion_id: selectedOrden.id,
                    molde_id: selectedMolde!.id,
                    linea: 'Linea 1', // Valor por defecto válido para la DB, ya que en Fibra no aplica.
                    usuario_email: userEmail
                })
            }

            // 3. Éxito: Notificación, Limpiar campos, Invalidar caché (recargar data)
            setNotification({ message: kit ? 'Kit de reparación registrado: pasó directo a Digitado' : '¡Registro creado exitosamente!', type: 'success' })
            
            // Actualizar localmente la orden para prevenir spam rápido
            setSelectedOrden(prev => prev ? { ...prev, programado: (prev.programado || 0) - 1 } : null)
            
            // Limpia los campos del formulario (mantiene orden y línea seleccionadas para agilizar procesos)
            setSelectedMolde(null)

            // Recargar datos para actualizar métricas y caché
            loadOrdenes()
        } catch (error: any) {
            console.error('Error detallado registrando pintura:', error)
            const detail = error.message || 'Error desconocido en el servidor'
            // Diálogo de error con el detalle específico del fallo
            alert(`Error al registrar pintura: ${detail}`)
            setNotification({ message: `Fallo: ${detail}`, type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-full md:h-full flex flex-col bg-slate-50/30 md:overflow-hidden">
            <EncabezadoFibra
                metrics={metrics}
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onClear={handleClearFilters}
                onSyncSap={handleSyncSap}
                syncing={syncing}
                loading={loading}
            />

            {/* Main Content Area */}
            <div className="flex-1 md:overflow-y-auto p-2 sm:p-4">
                {view === 'history' ? (
                    <HistorySection />
                ) : (
                    <div className="space-y-2">
                        <div className="text-[#324354] text-xs font-black mb-2 uppercase">
                            Ordenes encontradas: {filteredOrdenes.length}
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Cargando órdenes...</div>
                        ) : filteredOrdenes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No se encontraron órdenes</div>
                        ) : (
                            filteredOrdenes.map((orden) => (
                                <OrdenCard planta="fv"
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
            <div className="sticky bottom-0 z-10 md:static bg-gray-50 px-2 sm:px-4 py-2 border-t border-gray-200">
                <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-end w-full">
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        {/* Line Selector Removed for Fibra */}

                        {/* Mold Selector with Search */}
                        <div className="w-full sm:w-1/2">
                            {selectedOrden && esKitReparacion(selectedOrden.producto_descripcion) ? (
                                <div className="w-full min-h-9 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg flex items-center">
                                    Kit de reparación: no necesita molde. Al pintar pasa directo a Digitado.
                                </div>
                            ) : (
                            <div className="relative">
                                <div 
                                    onClick={() => !!selectedOrden && setIsMoldDropdownOpen(!isMoldDropdownOpen)}
                                    className={`w-full h-9 px-3 text-sm bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg cursor-pointer flex justify-between items-center shadow-sm transition-all
                                        ${!selectedOrden ? 'opacity-50 cursor-not-allowed bg-gray-50 border-dashed' : 'hover:border-cyan-500 focus:ring-2 focus:ring-cyan-500'}
                                    `}
                                >
                                    <span className={selectedMolde ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                        {selectedMolde 
                                            ? `${selectedMolde.serial} (${selectedMolde.vueltas_actuales}v) · ${selectedMolde.estado}` 
                                            : !selectedOrden ? '← Seleccione orden' : 'Elija el molde'}
                                    </span>
                                    <Search size={15} className="text-gray-400" />
                                </div>

                                {isMoldDropdownOpen && (
                                    <div className="absolute bottom-full mb-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Buscar molde..."
                                                value={moldSearchText}
                                                onChange={(e) => setMoldSearchText(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </div>
                                        <div className="max-h-[220px] overflow-y-auto">
                                            {moldesOpciones.length === 0 ? (
                                                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                                                    No se encontraron moldes
                                                </div>
                                            ) : (
                                                moldesOpciones.map((molde) => (
                                                    <div
                                                        key={molde.id}
                                                        onClick={() => {
                                                            setSelectedMolde(molde)
                                                            checkMantenimiento(molde)
                                                            setIsMoldDropdownOpen(false)
                                                            setMoldSearchText('')
                                                        }}
                                                        className={`px-4 py-2.5 hover:bg-cyan-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 ${
                                                            selectedMolde?.id === molde.id ? 'bg-cyan-50/70' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">{molde.serial}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                                molde.estado === 'Disponible' ? 'bg-emerald-100 text-emerald-800' :
                                                                molde.estado === 'En uso' ? 'bg-amber-100 text-amber-800' :
                                                                molde.estado === 'Reparación' ? 'bg-red-100 text-red-800' :
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {molde.estado}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-cyan-600 font-bold">{molde.vueltas_actuales}v</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {debugInfo && (
                                    <div className="text-[10px] text-amber-600 font-bold px-1 mt-1">
                                        {debugInfo}
                                    </div>
                                )}
                                {selectedMolde && (
                                    <div className="text-[10px] text-gray-500 px-1 mt-1 flex items-center justify-between">
                                        <span>Estado: <b className={selectedMolde.estado === 'Disponible' ? 'text-emerald-600' : 'text-amber-600'}>{selectedMolde.estado}</b></span>
                                        <span className="italic">Vueltas: {selectedMolde.vueltas_actuales} / {selectedMolde.vueltas_mto_atipicas > 0 ? selectedMolde.vueltas_mto_atipicas : selectedMolde.vueltas_mto}</span>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:flex-none">
                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOrden || (!selectedMolde && !esKitReparacion(selectedOrden.producto_descripcion)) || submitting || (selectedOrden.programado || 0) <= 0}
                            className="flex-1 lg:min-w-[130px] h-9 bg-cyan-600 text-white rounded-lg font-bold text-sm hover:bg-cyan-700 transition-colors disabled:bg-gray-600 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {submitting ? 'Reg...' : 'Pintar'}
                        </button>

                        <div className="flex gap-2 w-full lg:w-auto">
                            {/* Moldes Info Button */}
                            <button
                                onClick={() => setIsMoldModalOpen(true)}
                                className="flex-1 lg:flex-none h-9 text-sm bg-white text-gray-900 font-bold px-4 rounded-lg flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap"
                            >
                                <Search size={16} className="text-cyan-500" />
                                Moldes
                            </button>

                            {/* Registros / Volver Button */}
                            <button
                                onClick={() => setView(view === 'report' ? 'history' : 'report')}
                                className={`flex-1 lg:flex-none h-9 text-sm font-bold px-4 rounded-lg flex items-center justify-center gap-2 border shadow-sm transition-colors whitespace-nowrap ${view === 'history'
                                    ? 'bg-cyan-600 text-white border-cyan-700 hover:bg-cyan-700'
                                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {view === 'history' ? (
                                    <>
                                        <ClipboardList size={16} />
                                        Reportar
                                    </>
                                ) : (
                                    <>
                                        <History size={16} className="text-cyan-500" />
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

