'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion } from '@/types/pintura'
import RegistroDigitadoCard from './RegistroDigitadoCard'
import { Truck, Info, Hash, Package } from 'lucide-react'
import { getRegistrosTrazabilidad } from '@/lib/supabase/queries/pintura'

interface DigitadoListProps {
    order: OrdenFabricacion
    userEmail: string
    onRefresh: () => void
}

export default function DigitadoList({ order, userEmail, onRefresh }: DigitadoListProps) {
    const [activeTab, setActiveTab] = useState<'Pulido' | 'Transito'>('Pulido')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(false)

    React.useEffect(() => {
        loadRegistros()
    }, [order.orden_fabricacion])

    const loadRegistros = async () => {
        setLoading(true)
        try {
            const data = await getRegistrosTrazabilidad()
            // Filter piece by piece OF string matching selected order OF string
            setRegistros(data.filter(r => r.orden_fabricacion === order.orden_fabricacion))
        } catch (error) {
            console.error('Error loading registros for order:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredRegistros = registros.filter(r => {
        if (activeTab === 'Pulido') {
            return ['Pulido', 'Acabado', 'Empaque'].includes(r.estado || '')
        }
        return r.estado === 'Transito' || r.estado === 'Digitado'
    })

    return (
        <div className="h-full flex flex-col">
            {/* Header: Selected Order info */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                        <Hash size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Orden de Fabricación (OF)</p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{order.orden_fabricacion}</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Producto</p>
                    <p className="text-sm font-bold text-slate-600 line-clamp-1 max-w-sm">{order.producto_descripcion}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('Pulido')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-black uppercase text-sm transition-all ${activeTab === 'Pulido' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Package size={18} />
                    Pulido
                </button>
                <button
                    onClick={() => setActiveTab('Transito')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-black uppercase text-sm transition-all ${activeTab === 'Transito' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Truck size={18} />
                    Transito
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
