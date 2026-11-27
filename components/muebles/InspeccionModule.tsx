'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import MetricCard from '../pintura/MetricCard'
import EncabezadoMuebles from './EncabezadoMuebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import ModalReportarDefectoMueble from './ModalReportarDefectoMueble'
import { Search, X, Calendar, RefreshCw, Filter, CheckCircle, AlertCircle, ChevronDown, CheckSquare, Play, AlertTriangle } from 'lucide-react'

interface InspeccionModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string // Added to handle taladro options
    onStartTask?: (tarea: any) => void
}

export default function InspeccionModule({ userEmail, turno, usuarioNombre, plantaMuebles, onStartTask }: InspeccionModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrdenes, setSelectedOrdenes] = useState<OrdenMueble[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDefectoModalOpen, setIsDefectoModalOpen] = useState(false)
    const [defectoSelectedOrden, setDefectoSelectedOrden] = useState<OrdenMueble | null>(null)
    const [operarioInfo, setOperarioInfo] = useState<{ cedula: string, nombre: string } | null>(null)
    const [taladro, setTaladro] = useState<string>('')
    // Primero se ven las OF; al elegir una (o Reportar defecto) se escoge el taladro en una ventanita
    const [pidiendoTaladro, setPidiendoTaladro] = useState<{ tipo: 'registrar' | 'defecto'; orden: OrdenMueble | null } | null>(null)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    const taladroOptions = plantaMuebles === 'Muebles' 
        ? ['CX200', 'HUAHUA', 'HUA HUA 2']
        : ['Taladro Cefi', 'CX100']

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
            console.error('Error loading Inspeccion data:', error)
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
            .channel('inspeccion-realtime')
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

    const handleSelectOrden = (orden: OrdenMueble) => {
        setPidiendoTaladro({ tipo: 'registrar', orden })
    }

    // Taladro elegido: sigue con la acción pendiente (registrar inspección o reportar defecto)
    const elegirTaladro = (t: string) => {
        const p = pidiendoTaladro
        setTaladro(t)
        setPidiendoTaladro(null)
        if (!p) return
        if (p.tipo === 'registrar' && p.orden) {
            setSelectedOrdenes([p.orden])
            setIsModalOpen(true)
        } else {
            setDefectoSelectedOrden(p.orden)
            setIsDefectoModalOpen(true)
        }
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
                resaltado="enchape"
                acciones={<button type="button" onClick={() => setPidiendoTaladro({ tipo: 'defecto', orden: null })} title="Reportar Defecto / Calidad"
                    className="h-9 px-3 shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Reportar defecto
                </button>}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    {(
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle size={14} />
                                    ÓRDENES POR INSPECCIONAR (EN ENCHAPE): {filteredOrdenes.length}
                                </div>
                                {syncing && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest animate-in fade-in duration-300">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block" />
                                        Actualizando...
                                    </div>
                                )}
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
                                            isActive={selectedOrdenes.some((item) => item.id === orden.id)}
                                            onClick={() => handleSelectOrden(orden)}
                                            proceso="Inspeccion"
                                            onReportDefect={(ord) => handleSelectOrden(ord)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {pidiendoTaladro && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
                    onMouseDown={e => { if (e.target === e.currentTarget) setPidiendoTaladro(null) }}>
                    <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-sm p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">
                                    {pidiendoTaladro.tipo === 'defecto' ? 'Reportar defecto' : 'Registrar inspección'}
                                </span>
                                {pidiendoTaladro.orden && <p className="text-xl font-black text-[#324354] mt-2">OF {pidiendoTaladro.orden.orden_fabricacion}</p>}
                                <p className="text-sm font-bold text-slate-500 mt-1">¿Con qué taladro?</p>
                            </div>
                            <button type="button" onClick={() => setPidiendoTaladro(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" title="Cerrar"><X size={20} /></button>
                        </div>
                        <div className="grid gap-2">
                            {taladroOptions.map(opt => (
                                <button key={opt} type="button" onClick={() => elegirTaladro(opt)}
                                    className={`h-12 rounded-xl border-2 text-base font-black transition-colors ${opt === taladro ? 'bg-[#254153] border-[#254153] text-white' : 'bg-white border-slate-200 text-[#254153] hover:border-[#254153]'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Trazabilidad Modal */}
            {selectedOrdenes.length > 0 && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    orden={selectedOrdenes[0]}
                    ordenes={selectedOrdenes}
                    proceso="Inspeccion"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
                    taladro={taladro}
                    onStartTask={(tarea) => {
                        clearSelection()
                        onStartTask?.(tarea)
                    }}
                    onReportDefect={(ord, operario) => {
                        clearSelection()
                        setDefectoSelectedOrden(ord)
                        if (operario) {
                            setOperarioInfo(operario)
                        }
                        setIsDefectoModalOpen(true)
                    }}
                    onSuccess={() => {
                        clearSelection()
                        loadData()
                    }}
                />
            )}

            {/* Defect Reporting Modal */}
            {isDefectoModalOpen && (
                <ModalReportarDefectoMueble
                    isOpen={isDefectoModalOpen}
                    onClose={() => {
                        setIsDefectoModalOpen(false)
                        setDefectoSelectedOrden(null)
                        setOperarioInfo(null)
                    }}
                    ordenFabricacion={defectoSelectedOrden?.orden_fabricacion || ''}
                    ordenData={defectoSelectedOrden || undefined}
                    usuarioNombre={usuarioNombre}
                    operarioCedula={operarioInfo?.cedula}
                    operarioNombre={operarioInfo?.nombre}
                    turno={turno}
                    taladro={taladro}
                    plantaMuebles={plantaMuebles}
                    onSuccess={() => loadData(true)}
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
