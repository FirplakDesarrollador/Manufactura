'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion } from '@/types/pintura'
import { getRegistrosTrazabilidad } from '@/lib/supabase/queries/pintura'
import RegistroDigitadoCard from '../digitado/RegistroDigitadoCard'
import { Truck, Info, Hash, Keyboard, Warehouse } from 'lucide-react'

interface CediListProps {
    order: OrdenFabricacion
    userEmail: string
    onRefresh: () => void
}

export default function CediList({ order, userEmail, onRefresh }: CediListProps) {
    const [activeTab, setActiveTab] = useState<'Digitado' | 'Transito' | 'Cedi'>('Digitado')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(false)

    const loadRegistros = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getRegistrosTrazabilidad()
            setRegistros(data.filter(r => r.orden_fabricacion === order.orden_fabricacion))
        } catch (error) {
            console.error('Error loading piezas:', error)
        } finally {
            setLoading(false)
        }
    }, [order.orden_fabricacion])

    useEffect(() => { loadRegistros() }, [loadRegistros])

    const filteredRegistros = registros.filter(r => {
        if (activeTab === 'Digitado') return r.estado === 'Digitado'
        if (activeTab === 'Transito') return r.estado === 'Transito'
        return r.estado === 'Cedi'
    })

    return (
        <div className="h-full flex flex-col">
            {/* Context Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Hash size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">OF SELECCIONADA</p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{order.orden_fabricacion}</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Producto</p>
                    <p className="text-xs font-bold text-slate-600 truncate max-w-[300px]">{order.producto_descripcion}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-slate-200">
                <TabButton
                    active={activeTab === 'Digitado'}
                    onClick={() => setActiveTab('Digitado')}
                    icon={<Keyboard size={18} />}
                    label="Digitado"
                />
                <TabButton
                    active={activeTab === 'Transito'}
                    onClick={() => setActiveTab('Transito')}
                    icon={<Truck size={18} />}
                    label="Transito"
                />
                <TabButton
                    active={activeTab === 'Cedi'}
                    onClick={() => setActiveTab('Cedi')}
                    icon={<Warehouse size={18} />}
                    label="Cedi"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : filteredRegistros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                        <Info size={32} />
                        <span className="font-bold uppercase text-xs tracking-widest mt-2">Sin piezas en {activeTab}</span>
                    </div>
                ) : (
                    filteredRegistros.map(r => (
                        <RegistroDigitadoCard
                            key={r.id}
                            registro={r}
                            usuarioEmail={userEmail}
                            onRefresh={() => { loadRegistros(); onRefresh(); }}
                            verReversar={activeTab !== 'Digitado'}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${active ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            {icon} {label}
        </button>
    )
}

function Loader2({ className, size = 24 }: { className?: string, size?: number }) {
    return <Truck className={`animate-bounce ${className}`} size={size} /> // Using Truck as a fun loader for CEDI
}
