'use client'

import React, { useState, useCallback } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import RegistroDigitadoCard from './RegistroDigitadoCard'
import { Truck, Info, Package, ArrowLeft } from 'lucide-react'
import { getRegistrosTrazabilidadPorOrden } from '@/lib/supabase/queries/pintura'
import { registrarDigitadoMasivo } from '@/lib/supabase/queries/digitado'
import OrdenCard from '../pintura/OrdenCard'
import { toast } from 'sonner'

interface DigitadoListProps {
    order: OrdenFabricacion
    userEmail: string
    onRefresh: () => void
    allMoldes: Molde[]
    onBack: () => void
}

export default function DigitadoList({ order, userEmail, onRefresh, allMoldes, onBack }: DigitadoListProps) {
    const [activeTab, setActiveTab] = useState<'Pulido' | 'Transito'>('Pulido')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(false)
    const [cantidadLote, setCantidadLote] = useState(1)
    const [bulkLoading, setBulkLoading] = useState(false)

    const loadRegistros = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRegistrosTrazabilidadPorOrden(order.orden_fabricacion);
            setRegistros(data);
        } catch (error) {
            console.error('Error loading registros for order:', error);
        } finally {
            setLoading(false);
        }
    }, [order]);

    React.useEffect(() => {
        loadRegistros();
        setCantidadLote(1); // Reset cantidad al cambiar de orden
    }, [loadRegistros]);

    const filteredRegistros = registros.filter(r => {
        if (activeTab === 'Pulido') {
            return ['Desgelcada', 'Pulido', 'Acabado', 'Empaque'].includes(r.estado || '')
        }
        return r.estado === 'Transito' || r.estado === 'Digitado'
    })

    const handleRegistroMasivo = async () => {
        const piezasDisponibles = filteredRegistros.filter(r => ['Desgelcada', 'Pulido', 'Acabado', 'Empaque'].includes(r.estado || ''))
        if (piezasDisponibles.length === 0) return

        const selectCount = Math.min(cantidadLote, piezasDisponibles.length)
        const idsToUpdate = piezasDisponibles.slice(0, selectCount).map(r => r.id)

        if (!confirm(`¿Desea mover ${selectCount} piezas a Tránsito de forma masiva?`)) return

        setBulkLoading(true)
        try {
            await registrarDigitadoMasivo(idsToUpdate, userEmail)
            toast.success(`${selectCount} piezas movidas a Tránsito`)
            await loadRegistros()
            onRefresh()
        } catch (error) {
            console.error('Error masivo:', error)
            toast.error('Error al procesar el lote')
        } finally {
            setBulkLoading(false)
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header: Selected Order info */}
            <div className="bg-white border-b border-slate-200 shadow-sm p-4">
                <div className="max-w-7xl mx-auto flex flex-col gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:text-blue-700 transition-colors w-fit group"
                    >
                        <div className="bg-blue-50 p-1 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        Volver a la lista
                    </button>
                    
                    <div className="pointer-events-none opacity-90 scale-[0.98] origin-left">
                        <OrdenCard
                            orden={order}
                            isActive={true}
                            onClick={() => {}}
                            moldes={allMoldes}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs & Bulk Action */}
            <div className="bg-white border-b border-slate-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('Pulido')}
                        className={`flex-1 py-2.5 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${activeTab === 'Pulido' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Package size={16} />
                        Pulido ({registros.filter(r => ['Desgelcada', 'Pulido', 'Acabado', 'Empaque'].includes(r.estado || '')).length})
                    </button>
                    <button
                        onClick={() => setActiveTab('Transito')}
                        className={`flex-1 py-2.5 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${activeTab === 'Transito' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Truck size={16} />
                        Transito ({registros.filter(r => r.estado === 'Transito' || r.estado === 'Digitado').length})
                    </button>
                </div>

                {activeTab === 'Pulido' && filteredRegistros.length > 0 && (
                    <div className="p-2 bg-slate-50 flex items-center justify-between gap-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Cantidad Lote:</span>
                            <input
                                type="number"
                                min="1"
                                max={filteredRegistros.length}
                                value={cantidadLote}
                                onChange={(e) => setCantidadLote(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded font-black text-blue-600 text-sm"
                            />
                            <button
                                onClick={() => setCantidadLote(filteredRegistros.length)}
                                className="text-[10px] font-black text-blue-600 uppercase hover:underline ml-1"
                            >
                                Seleccionar todo
                            </button>
                        </div>
                        <button
                            onClick={handleRegistroMasivo}
                            disabled={bulkLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            {bulkLoading ? 'Procesando...' : `Mover ${Math.min(cantidadLote, filteredRegistros.length)} a Tránsito`}
                        </button>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredRegistros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-3xl">
                        <Info size={32} />
                        <span className="font-bold uppercase text-xs tracking-widest text-center px-4">Sin piezas en {activeTab} para OF {order.orden_fabricacion}</span>
                    </div>
                ) : (
                    filteredRegistros.map(r => (
                        <RegistroDigitadoCard
                            key={r.id}
                            registro={r}
                            usuarioEmail={userEmail}
                            onRefresh={() => {
                                loadRegistros()
                                onRefresh()
                            }}
                            verReversar={activeTab === 'Transito'}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
