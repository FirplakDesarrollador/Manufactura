'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosSinContramolde } from '@/lib/supabase/queries/contramoldes'
import RegistroContramoldeCard from './RegistroContramoldeCard'
import { Search, Eraser, Info, Database } from 'lucide-react'

export default function ContramoldeModule({ userEmail }: { userEmail: string }) {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    const loadRegistros = useCallback(async () => {
        setLoading(true)
        const data = await getRegistrosSinContramolde()
        setRegistros(data)
        setLoading(false)
    }, [])

    useEffect(() => {
        const load = async () => {
            await loadRegistros()
        }
        void load()
    }, [loadRegistros])

    const filteredRegistros = registros.filter(r => {
        if (!searchText) return true
        const search = searchText.toLowerCase()
        return (
            r.molde_serial?.toLowerCase().includes(search) ||
            r.molde_descripcion?.toLowerCase().includes(search) ||
            r.orden_fabricacion?.toLowerCase().includes(search) ||
            r.producto_descripcion?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Search Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-[#254153] flex items-center gap-2">
                                <Database size={24} className="text-cyan-600" />
                                Módulo de Contramoldes
                            </h2>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                                Busque y registre el proceso de contramolde para las piezas pintadas.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-cyan-50 px-4 py-2 rounded-lg border border-cyan-100">
                            <Info size={18} className="text-cyan-600" />
                            <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">
                                Pendientes: {registros.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-cyan-500 transition-colors">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por Serial, Descripción u OF..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm group-hover:border-gray-200"
                            />
                        </div>
                        <button
                            onClick={() => setSearchText('')}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                            title="Limpiar búsqueda"
                        >
                            <Eraser size={20} />
                            <span className="text-sm font-bold hidden sm:inline uppercase">Limpiar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-100 border-t-cyan-600" />
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                Cargando información...
                            </span>
                        </div>
                    ) : filteredRegistros.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 py-32 flex flex-col items-center justify-center text-center px-6">
                            <div className="bg-gray-50 p-6 rounded-full mb-4">
                                <Search size={48} className="text-gray-200" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No se encontraron piezas</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2">
                                {searchText
                                    ? "No hay resultados para su búsqueda actual. Intente con otros criterios."
                                    : "Actualmente no hay piezas pendientes por registro de contramolde."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="text-[11px] font-bold text-[#254153]/50 uppercase tracking-widest px-1">
                                Piezas encontradas: {filteredRegistros.length}
                            </div>
                            {filteredRegistros.map((registro) => (
                                <RegistroContramoldeCard
                                    key={registro.id}
                                    registro={registro}
                                    usuarioEmail={userEmail}
                                    onRefresh={loadRegistros}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
