'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoyMetricas, getAllMoldes } from '@/lib/supabase/queries/fibra'
import { Loader2 } from 'lucide-react'
import DigitadoList from './DigitadoList'
import OrdenCard from '@/components/pintura/OrdenCard'
import EncabezadoFibra, { useMetricasFibra } from '../EncabezadoFibra'
import { toast } from 'sonner'

// Digitado en lote por orden (la vista anterior de Digitado) con el encabezado común de piso FV:
// se elige una OF y se digitan N piezas de una vez (DigitadoList)
export default function DigitadoLoteFibra({ userEmail, extra }: { userEmail: string; extra?: React.ReactNode }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registrosGlobales, setRegistrosGlobales] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [oData, gData, mData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidadHoyMetricas(),
                getAllMoldes()
            ])
            setOrdenes(oData)
            setRegistrosGlobales(gData)
            setAllMoldes(mData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, registrosGlobales, searchText, selectedDate)

    // Órdenes con piezas que se pueden digitar (o ya digitadas / en tránsito)
    const filteredOrdenes = useMemo(() => baseFilteredOrdenes.filter(o => (
        (o.pulido || 0) > 0 ||
        (o.desgelcada || 0) > 0 ||
        (o.empaque || 0) > 0 ||
        (o.acabado || 0) > 0 ||
        (o.digitado || 0) > 0 ||
        (o.transito || 0) > 0
    )).sort((a, b) => {
        const rawA = a.fecha_entrega_lote || a.fecha_ideal_produccion || a.fecha_entrega_estimada
        const rawB = b.fecha_entrega_lote || b.fecha_ideal_produccion || b.fecha_entrega_estimada
        const dateA = rawA ? new Date(rawA).getTime() : Infinity
        const dateB = rawB ? new Date(rawB).getTime() : Infinity
        const valA = isNaN(dateA) ? Infinity : dateA
        const valB = isNaN(dateB) ? Infinity : dateB
        return valA - valB
    }), [baseFilteredOrdenes])

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            <EncabezadoFibra
                metrics={metrics}
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onClear={() => { setSearchText(''); setSelectedDate(''); setSelectedOrderId(null) }}
                loading={loading}
                placeholder="Sku / Of / Pedido / Molde"
                extra={extra}
            />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                    <div className="text-cyan-600 text-xs font-bold mb-2 uppercase">
                        Órdenes para digitar en lote: {filteredOrdenes.length}
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                            <Loader2 className="animate-spin" size={18} /> Cargando órdenes...
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Sin órdenes halladas</div>
                    ) : (
                        filteredOrdenes.map(o => (
                            <div key={o.id} className="space-y-2">
                                <OrdenCard planta="fv"
                                    orden={o}
                                    isActive={o.id === selectedOrderId}
                                    onClick={() => {
                                        if (selectedOrderId === o.id) {
                                            setSelectedOrderId(null)
                                        } else {
                                            setSelectedOrderId(o.id)
                                            if (o.orden_fabricacion) {
                                                navigator.clipboard.writeText(o.orden_fabricacion)
                                                toast.success(`Orden ${o.orden_fabricacion} copiada`)
                                            }
                                        }
                                    }}
                                    moldes={allMoldes}
                                />
                                {o.id === selectedOrderId && (
                                    <div className="border-2 border-t-0 border-cyan-500 rounded-b-lg overflow-hidden -mt-2 bg-slate-50 shadow-inner">
                                        <DigitadoList
                                            order={o}
                                            userEmail={userEmail}
                                            onRefresh={loadData}
                                            allMoldes={allMoldes}
                                            onBack={() => setSelectedOrderId(null)}
                                            isInline={true}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
