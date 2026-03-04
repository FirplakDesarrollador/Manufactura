'use client'

import React, { useState, useEffect } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosParaDesmolde } from '@/lib/supabase/queries/desmolde'
import RegistroDesmoldeCard from './RegistroDesmoldeCard'
import { Search, Eraser, ClipboardList, PackageSearch, Loader2 } from 'lucide-react'

export default function DesmoldeModule({ userEmail }: { userEmail: string }) {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        loadRegistros()
    }, [])

    const loadRegistros = async () => {
        setLoading(true)
        try {
            const data = await getRegistrosParaDesmolde()
            setRegistros(data)
        } catch (error) {
            console.error('Error loading registros para desmolde:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredRegistros = registros.filter(r => {
        if (!searchText) return true
        const search = searchText.toLowerCase()
        return (
            (r.molde_serial?.toLowerCase() || '').includes(search) ||
            (r.molde_descripcion?.toLowerCase() || '').includes(search) ||
            (r.orden_fabricacion?.toLowerCase() || '').includes(search) ||
            (r.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (r.pedido?.toLowerCase() || '').includes(search) ||
            (r.numero_pedido?.toLowerCase() || '').includes(search)
        )
    })

    return (
        <div className="h-full flex flex-col bg-slate-50/30 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 px-8 py-8 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <PackageSearch size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Módulo Desmolde</h1>
                                <p className="text-base text-slate-500 font-bold mt-1 uppercase tracking-widest opacity-80">
                                    Control de salida de moldes y validación de piezas.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50 px-8 py-4 flex items-center border border-indigo-100 rounded-2xl">
                        <div className="text-right">
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-none">Pendientes</p>
                            <p className="text-3xl font-black text-indigo-700 leading-none mt-2">{registros.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar Section */}
            <div className="p-8 pb-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Search size={24} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por OF, Producto, Pedido o Molde..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-14 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all shadow-inner font-bold text-lg text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                        <button
                            onClick={() => setSearchText('')}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-3"
                        >
                            <Eraser size={24} />
                            <span className="text-base font-black uppercase tracking-widest">Limpiar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 pt-4">
                <div className="max-w-7xl mx-auto h-full">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-6">
                            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                            <span className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando registros...</span>
                        </div>
                    ) : filteredRegistros.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-40 flex flex-col items-center justify-center text-center px-6 shadow-inner">
                            <div className="bg-slate-50 p-12 rounded-full mb-8">
                                <ClipboardList size={80} className="text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sin piezas encontradas</h3>
                            <p className="text-base text-slate-500 max-w-sm mt-3 font-semibold">
                                {searchText
                                    ? "No hay coincidencias con los criterios de búsqueda actuales."
                                    : "No hay piezas en estado 'Vaciado' pendientes por desmoldar."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-10">
                            <div className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-4">
                                <div className="h-1.5 w-16 bg-indigo-200 rounded-full" />
                                Lista de Piezas: {filteredRegistros.length}
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                                {filteredRegistros.map((registro) => (
                                    <RegistroDesmoldeCard
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
