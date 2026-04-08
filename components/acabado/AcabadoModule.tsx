'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosAcabado } from '@/lib/supabase/queries/acabado'
import RegistroAcabadoCard from './RegistroAcabadoCard'
import { Search, Eraser, ClipboardList, Loader2, Sparkles, LayoutGrid } from 'lucide-react'

type TabType = 'Pulido' | 'Acabado'

export default function AcabadoModule({ userEmail }: { userEmail: string }) {
    const [activeTab, setActiveTab] = useState<TabType>('Pulido')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    const loadRegistros = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getRegistrosAcabado(activeTab)
            setRegistros(data)
        } catch (error) {
            console.error('Error loading registros:', error)
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => {
        loadRegistros()
    }, [loadRegistros])

    const filteredRegistros = registros.filter(r => {
        // Si hay búsqueda, mostrar todo (ignorar filtro de fecha)
        if (searchText) {
            const search = searchText.toLowerCase()
            return (
                r.orden_fabricacion?.toLowerCase().includes(search) ||
                r.pedido?.toLowerCase().includes(search) ||
                r.producto_sku?.toLowerCase().includes(search) ||
                r.producto_descripcion?.toLowerCase().includes(search) ||
                r.molde_serial?.toLowerCase().includes(search) ||
                r.numero_pedido?.toLowerCase().includes(search)
            )
        }

        // Filtro por fecha (Desde la medianoche de hoy para turno actual)
        const midnight = new Date()
        midnight.setHours(0, 0, 0, 0)
        
        const pulidoDate = r.pulido_fecha ? new Date(r.pulido_fecha) : null
        const acabadoDate = r.acabado_fecha ? new Date(r.acabado_fecha) : null
        
        const isToday = activeTab === 'Pulido' 
            ? (pulidoDate && pulidoDate >= midnight)
            : (acabadoDate && acabadoDate >= midnight)

        return isToday
    })

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header mejorado */}
            <div className="bg-white px-8 py-8 border-b-2 border-slate-100 shadow-sm transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="bg-sky-600 p-4 rounded-2xl text-white shadow-lg shadow-sky-100 flex items-center justify-center">
                            <Sparkles size={40} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                MÓDULO ACABADO
                            </h1>
                            <p className="text-slate-400 font-bold tracking-widest text-sm uppercase mt-1">
                                Control de calidad final y almacenamiento.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex p-2 bg-slate-100 rounded-[2rem] min-w-[440px] shadow-inner border border-slate-200/50">
                        <button
                            onClick={() => setActiveTab('Pulido')}
                            className={`flex-1 flex items-center justify-center gap-4 py-6 px-4 rounded-[1.8rem] font-black transition-all duration-300 ${activeTab === 'Pulido' ? 'bg-white shadow-xl text-sky-600 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Sparkles size={24} fill={activeTab === 'Pulido' ? 'currentColor' : 'none'} />
                            PULIDO
                        </button>
                        <button
                            onClick={() => setActiveTab('Acabado')}
                            className={`flex-1 flex items-center justify-center gap-4 py-6 px-4 rounded-[1.8rem] font-black transition-all duration-300 ${activeTab === 'Acabado' ? 'bg-white shadow-xl text-sky-600 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={24} fill={activeTab === 'Acabado' ? 'currentColor' : 'none'} />
                            ESTANTERÍA
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar Section */}
            <div className="p-8 pb-4">
                <div className="max-w-[1600px] mx-auto">
                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-600 transition-colors">
                                <Search size={24} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar sku, descripción, OF, pedido..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-14 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-sky-600 focus:border-sky-600 outline-none transition-all shadow-inner font-bold text-xl text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                        <button
                            onClick={() => setSearchText('')}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-3"
                        >
                            <Eraser size={24} />
                            <span className="text-lg font-black uppercase tracking-widest">Limpiar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 pt-4">
                <div className="max-w-[1600px] mx-auto h-full">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-6">
                            <Loader2 className="w-16 h-16 text-sky-600 animate-spin" />
                            <span className="text-xl font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando registros...</span>
                        </div>
                    ) : filteredRegistros.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-40 flex flex-col items-center justify-center text-center px-6 shadow-inner">
                            <div className="bg-slate-50 p-12 rounded-full mb-8">
                                <ClipboardList size={80} className="text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sin piezas encontradas</h3>
                            <p className="text-lg text-slate-500 max-w-sm mt-3 font-semibold">
                                {searchText
                                    ? "No hay coincidencias con los criterios de búsqueda actuales."
                                    : `No hay piezas en estado '${activeTab}' pendientes desde la medianoche.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-10">
                            <div className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-4">
                                <div className="h-1.5 w-16 bg-sky-200 rounded-full" />
                                Lista de Piezas Hoy: {filteredRegistros.length}
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                                {filteredRegistros.map((registro) => (
                                    <RegistroAcabadoCard
                                        key={registro.id}
                                        registro={registro}
                                        usuarioEmail={userEmail}
                                        onRefresh={loadRegistros}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
