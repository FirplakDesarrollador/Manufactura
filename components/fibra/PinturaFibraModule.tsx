'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, Molde, RegistroTrazabilidad } from '@/types/pintura'
import { getOrdenesFabricacion, registrarPintura, getAllMoldes, getRegistrosTrazabilidadHoyMetricas } from '@/lib/supabase/queries/fibra'
import OrdenCard from '@/components/pintura/OrdenCard'
import { Search, X, History, ClipboardList } from 'lucide-react'
import EncabezadoFibra, { useMetricasFibra } from './EncabezadoFibra'
import HistorySection from './HistorySection'
import ModalBuscarMolde from '../pintura/ModalBuscarMolde'
import PintarOrdenFranja from './PintarOrdenFranja'
import { recargarFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'
import { cediSoloSap } from '@/lib/fibra/completadaSap'
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
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
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

    // Pintar una pieza de la orden con el molde elegido en su propia tarjeta (true si quedó registrada)
    const [pintandoId, setPintandoId] = useState<number | string | null>(null)
    const pintarOrden = async (orden: OrdenFabricacion, molde: Molde | null): Promise<boolean> => {
        const kit = esKitReparacion(orden.producto_descripcion)
        if (!molde && !kit) { alert('Error: Debe seleccionar un Molde.'); return false }
        const sumEtapas = (orden.pintura || 0) + (orden.herrajes || 0) + (orden.pulido || 0) + (orden.reparacion || 0) + (orden.saldo || 0) +
            (orden.empaque || 0) + (orden.transito || 0) + (orden.vaciado || 0) + (orden.estanteria || 0) +
            (orden.acabado || 0) + (orden.reparacion_larga || 0) + (orden.digitado || 0) + (orden.cedi || 0) +
            cediSoloSap(orden)   // unidades completadas en SAP sin registro en planta
        const cantidadMax = Math.max(0, orden.cantidad || orden.cantidad_programada || 0)
        if (cantidadMax > 0 && sumEtapas >= cantidadMax) {
            alert(`Acción bloqueada: La sumatoria de piezas en etapas (${sumEtapas}) de la orden ${orden.orden_fabricacion} ya alcanzó la cantidad máxima permitida (${cantidadMax}).`)
            return false
        }
        setPintandoId(orden.id)
        try {
            if (kit) {
                // Kit de reparación: sin molde y directo a Digitado (no pasa por los procesos de la planta)
                await registrarKitReparacionFv(orden.id, 'digitado', userEmail, null, 'pintura')
            } else {
                const r = await registrarPintura({ orden_fabricacion_id: orden.id, molde_id: molde!.id, linea: 'Linea 1', usuario_email: userEmail })
                if (r.aviso_molde) alert(`⚠️ Molde para desmanchar ⚠️\n\n${r.aviso_molde}`)
            }
            setNotification({ message: kit ? 'Kit de reparación registrado: pasó directo a Digitado' : `OF ${orden.orden_fabricacion}: pieza registrada en Pintura`, type: 'success' })
            loadOrdenes()
            return true
        } catch (error: any) {
            console.error('Error detallado registrando pintura:', error)
            const detail = error.message || 'Error desconocido en el servidor'
            alert(`Error al registrar pintura: ${detail}`)
            setNotification({ message: `Fallo: ${detail}`, type: 'error' })
            return false
        } finally {
            setPintandoId(null)
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

            {/* Órdenes: cada una con su franja para elegir el molde y pintar (sin barra aparte abajo) */}
            <div className="flex-1 md:overflow-y-auto p-2 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[#324354] text-xs font-black uppercase">
                        {view === 'history' ? 'Registros de pintura' : `Ordenes encontradas: ${filteredOrdenes.length}`}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setIsMoldModalOpen(true)} title="Buscar moldes"
                            className="h-8 px-2.5 text-xs bg-white text-[#324354] font-bold rounded-lg flex items-center gap-1.5 border border-[#e2ded5] hover:bg-[#F6F3EE] shadow-sm">
                            <Search size={14} /> Moldes
                        </button>
                        <button onClick={() => setView(view === 'report' ? 'history' : 'report')}
                            className={`h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 border shadow-sm ${view === 'history' ? 'bg-[#324354] text-white border-[#324354]' : 'bg-white text-[#324354] border-[#e2ded5] hover:bg-[#F6F3EE]'}`}>
                            {view === 'history' ? <><ClipboardList size={14} /> Reportar</> : <><History size={14} /> Registros</>}
                        </button>
                    </div>
                </div>
                {view === 'history' ? (
                    <HistorySection />
                ) : loading && ordenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Cargando órdenes...</div>
                ) : filteredOrdenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No se encontraron órdenes</div>
                ) : (
                    <div className="space-y-2">
                        {filteredOrdenes.map((orden) => (
                            <div key={orden.id} className="bg-white border-2 border-[#e2ded5] rounded-lg">
                                {/* La tarjeta de la orden solo informa (como en Vaciado): sin borde propio ni selección */}
                                <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                                    <OrdenCard planta="fv" pesos="gelcoat" orden={orden} isActive={false} onClick={() => { }} moldes={allMoldes} />
                                </div>
                                <PintarOrdenFranja orden={orden} allMoldes={allMoldes} enviando={pintandoId === orden.id}
                                    onPintar={molde => pintarOrden(orden, molde)} />
                            </div>
                        ))}
                    </div>
                )}
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

