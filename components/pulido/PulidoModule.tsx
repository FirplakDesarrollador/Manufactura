'use client'

import React, { useState, useEffect } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosParaPulido } from '@/lib/supabase/queries/pulido'
import RegistroPulidoCard from './RegistroPulidoCard'
import { Search, Eraser, ClipboardList, PenTool, Loader2 } from 'lucide-react'

export default function PulidoModule({ userEmail }: { userEmail: string }) {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        loadRegistros()
    }, [])

    const loadRegistros = async () => {
        setLoading(true)
        try {
            const data = await getRegistrosParaPulido()
            setRegistros(data)
        } catch (error) {
            console.error('Error loading registros para pulido:', error)
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
            (r.numero_pedido?.toLowerCase() || '').includes(search) ||
            (r.producto_sku?.toLowerCase() || '').includes(search)
        )
    })

    return (
        <div className="h-full flex flex-col bg-slate-50/30 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-cyan-600 rounded-lg text-white shadow-lg shadow-cyan-200">
                                <PenTool size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Módulo Pulido</h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-80">
                                    Control de acabado y superficies.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-cyan-50 px-3 py-1 flex items-center border border-cyan-100 rounded-lg">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest leading-none">Pendientes</p>
                            <p className="text-lg font-black text-cyan-700 leading-none mt-1">{registros.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar Section */}
            <div className="p-2 pb-1">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white p-2 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por OF, Producto, Pedido o Molde..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 outline-none transition-all shadow-inner font-bold text-sm text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                        <button
                            onClick={() => setSearchText('')}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <Eraser size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Limpiar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-2 pt-1">
                <div className="max-w-7xl mx-auto h-full">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-6">
                            <Loader2 className="w-16 h-16 text-cyan-600 animate-spin" />
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
                                    : "No hay piezas en estado 'Pulido' pendientes."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 pb-10">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                                <div className="h-1 w-8 bg-cyan-200 rounded-full" />
                                Lista: {filteredRegistros.length}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {filteredRegistros.map((registro) => (
                                    <RegistroPulidoCard
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
