'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import MetricCard from '../pintura/MetricCard'
import EncabezadoMuebles from './EncabezadoMuebles'
import OrderCard from './OrderCard'
import TrazabilidadModal from './TrazabilidadModal'
import { Search, X, Calendar, RefreshCw, Filter, FileText, Undo2, Send } from 'lucide-react'
import DevolverInspeccionMuebles from './DevolverInspeccionMuebles'
import EstadoEntregaOf from '../fibra/EstadoEntregaOf'
import ResumenFaltantes from '../fibra/ResumenFaltantes'
import { actualizarTodasEnPantalla, useRevisionEnCurso, useVersionRevision, tieneFaltantes, fijarGrupo, useFaltantesGrupo } from '@/lib/fibra/revisionEntrega'

/** Grupo de OF del Digitado de Muebles/CEFI (la bolita del menú cuenta las que tienen componentes faltantes). */
export const grupoDigitadoMuebles = (planta: string) => `mbl-digitado-${(planta || 'muebles').toLowerCase()}`

const listaParaDigitado = (orden: OrdenMueble, plantaMuebles: string) =>
    (plantaMuebles || '').toLowerCase() === 'cefi' || (orden.planta || '').toLowerCase().includes('cefi')
        ? ((orden.inspeccion || 0) > 0 || (orden.empaque || 0) > 0)
        : ((orden.empaque || 0) > 0 || (orden.inspeccion || 0) > 0)

interface DigitadoModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function DigitadoModule({ userEmail, turno, usuarioNombre, plantaMuebles }: DigitadoModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [devolverOrden, setDevolverOrden] = useState<OrdenMueble | null>(null)
    // Componentes para la entrega (misma revisión de SAP que MS y FV)
    const revisando = useRevisionEnCurso()
    const versionRevision = useVersionRevision()
    const grupo = grupoDigitadoMuebles(plantaMuebles)
    const conFaltantes = useFaltantesGrupo(grupo)

    const loadData = React.useCallback(async () => {
        setLoading(true)
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
            console.error('Error loading Digitado data:', error)
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

            // Only show orders with pieces ready for Digitado (WIP from Empaque, or directly from Inspección in CEFI)
            return matchesSearch && matchesDate && listaParaDigitado(orden, plantaMuebles)
        })
            // Primero las órdenes con componentes faltantes para la entrega (orden estable en lo demás)
            .map((o, i) => ({ o, i, f: tieneFaltantes(o.orden_fabricacion) ? 0 : 1 }))
            .sort((a, b) => a.f - b.f || a.i - b.i)
            .map(x => x.o)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordenes, searchText, selectedDate, dateType, plantaMuebles, versionRevision])

    // Órdenes del módulo (sin filtros): el menú cuenta las que tienen faltantes
    useEffect(() => {
        if (loading) return
        fijarGrupo(grupo, ordenes.filter(o => listaParaDigitado(o, plantaMuebles)).map(o => o.orden_fabricacion))
    }, [ordenes, loading, grupo, plantaMuebles])

    // Calculate WIP sums for this stage
    const isCefiPlant = (plantaMuebles || '').toLowerCase() === 'cefi'
    void isCefiPlant
    // Sin proceso Empaque: lo que espera Digitado sale de Inspección (y lo que hubiera quedado en Empaque)
    const sumPrevStage = filteredOrdenes.reduce((sum, o) => sum + (o.inspeccion || 0) + (o.empaque || 0), 0)
    const sumDigitado = filteredOrdenes.reduce((sum, o) => sum + (o.digitado || 0), 0)

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
                acciones={<button type="button" onClick={() => actualizarTodasEnPantalla((plantaMuebles || '').toLowerCase() === 'cefi' ? 'CEFI' : 'MBL')} disabled={revisando}
                    title="Actualizar los componentes para la entrega de todas las órdenes en pantalla (consulta SAP en bloque)"
                    className="h-9 px-3 shrink-0 bg-[#254153] hover:bg-[#1a3040] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 disabled:opacity-60">
                    <RefreshCw size={15} className={revisando ? 'animate-spin' : ''} /> {revisando ? 'Revisando…' : 'Actualizar componentes'}
                </button>}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-7xl mx-auto p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-cyan-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} />
                            ORDENES EN DIGITADO: {filteredOrdenes.length}
                            {conFaltantes > 0 && (
                                <span className="ml-2 flex items-center gap-1.5 normal-case tracking-normal text-[#d14747]" title="Órdenes con componentes faltantes para la entrega (SAP); se muestran primero">
                                    <b className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow">{conFaltantes > 99 ? '99+' : conFaltantes}</b>
                                    {conFaltantes === 1 ? 'orden con faltantes de componentes' : 'órdenes con faltantes de componentes'}
                                </span>
                            )}
                            <span className="ml-2"><ResumenFaltantes ofs={filteredOrdenes.map(o => o.orden_fabricacion)} /></span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando órdenes de digitado...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                                <Search size={48} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No hay órdenes pendientes de digitado.</p>
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
                                        proceso="Digitado"
                                    />
                                    {/* Franja de componentes para la entrega (SAP), pegada debajo de la tarjeta */}
                                    <div className="mx-3 -mt-0.5 rounded-b-xl border-2 border-t-0 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1.5 flex flex-wrap items-center gap-2">
                                        <EstadoEntregaOf of={orden.orden_fabricacion} />
                                        <div className="ml-auto flex items-center gap-2">
                                            <button type="button" onClick={() => setDevolverOrden(orden)} disabled={(orden.inspeccion || 0) <= 0}
                                                title="Devolver unidades por digitar a Inspección"
                                                className="h-9 px-4 rounded-lg bg-white border border-amber-400 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                                                <Undo2 size={16} /> Devolver a Inspección
                                            </button>
                                            <button type="button" onClick={() => { setSelectedOrden(orden); setIsModalOpen(true) }}
                                                className="h-9 px-4 rounded-lg bg-[#254153] hover:bg-[#1a3040] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                                <Send size={16} /> Registrar Digitado
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {devolverOrden && (
                <DevolverInspeccionMuebles
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
                    proceso="Digitado"
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
