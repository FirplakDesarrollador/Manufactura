'use client'

import React, { useState, useEffect } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosParaVaciado } from '@/lib/supabase/queries/vaciado'
import RegistroVaciadoCard from './RegistroVaciadoCard'
import KilosTable from './KilosTable'
import { Search, Eraser, Info, Database, ClipboardList, TableProperties } from 'lucide-react'

export default function VaciadoModule({ userEmail }: { userEmail: string }) {
    const [activeTab, setActiveTab] = useState<'reportar' | 'kilos'>('reportar')
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        if (activeTab === 'reportar') {
            loadRegistros()
        }
    }, [activeTab])

    const loadRegistros = async () => {
        setLoading(true)
        const data = await getRegistrosParaVaciado()
        setRegistros(data)
        setLoading(false)
    }

    const filteredRegistros = registros.filter(r => {
        if (!searchText) return true
        const search = searchText.toLowerCase()
        return (
            r.molde_serial?.toLowerCase().includes(search) ||
            r.molde_descripcion?.toLowerCase().includes(search) ||
            r.orden_fabricacion?.toLowerCase().includes(search) ||
            r.producto_descripcion?.toLowerCase().includes(search) ||
            r.pedido?.toLowerCase().includes(search) ||
            r.numero_pedido?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Main Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-[#254153] flex items-center gap-2 uppercase tracking-tight">
                            <Database size={28} className="text-amber-600" />
                            Módulo de Vaciado
                        </h2>
                        <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest opacity-80">
                            Registro de piezas y consulta de pesos estándar.
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setActiveTab('reportar')}
                            className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'reportar'
                                ? 'bg-[#254153] text-white shadow-lg scale-105'
                                : 'text-gray-500 hover:text-[#254153] hover:bg-white/50'
                                }`}
                        >
                            <ClipboardList size={20} />
                            Reportar
                        </button>
                        <button
                            onClick={() => setActiveTab('kilos')}
                            className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'kilos'
                                ? 'bg-[#254153] text-white shadow-lg scale-105'
                                : 'text-gray-500 hover:text-[#254153] hover:bg-white/50'
                                }`}
                        >
                            <TableProperties size={20} />
                            Tabla Kilos
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto h-full">
                    {activeTab === 'reportar' ? (
                        <div className="space-y-6">
                            {/* Search and Stats bar for Reporting */}
                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-amber-500 transition-colors">
                                        <Search size={22} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar por OF, Producto, Pedido o Molde..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm font-bold text-base"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSearchText('')}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                                    >
                                        <Eraser size={22} />
                                        <span className="text-sm font-black uppercase tracking-widest">Limpiar</span>
                                    </button>
                                    <div className="bg-amber-50 px-8 flex items-center border border-amber-100 rounded-xl">
                                        <div className="text-right">
                                            <p className="text-xs font-black text-amber-500 uppercase tracking-tighter leading-none">Pendientes</p>
                                            <p className="text-2xl font-black text-amber-700 leading-none mt-1">{registros.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pieces List */}
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-100 border-t-amber-600" />
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando piezas...</span>
                                </div>
                            ) : filteredRegistros.length === 0 ? (
                                <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-32 flex flex-col items-center justify-center text-center px-6">
                                    <div className="bg-gray-50 p-8 rounded-full mb-6">
                                        <ClipboardList size={64} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[#254153]">No hay piezas encontradas</h3>
                                    <p className="text-sm text-gray-500 max-w-xs mt-2 font-medium">
                                        {searchText
                                            ? "Intenta con otros criterios de búsqueda."
                                            : "No existen piezas en estado 'Pintura' actualmente."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="text-xs font-black text-[#254153]/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                        <div className="h-1 w-10 bg-amber-200 rounded-full" />
                                        Piezas para Vaciado: {filteredRegistros.length}
                                    </div>
                                    {filteredRegistros.map((registro) => (
                                        <RegistroVaciadoCard
                                            key={registro.id}
                                            registro={registro}
                                            usuarioEmail={userEmail}
                                            onRefresh={loadRegistros}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <KilosTable />
                    )}
                </div>
            </div>
        </div>
    )
}
