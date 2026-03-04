'use client'

import React, { useState, useEffect } from 'react'
import { KilosReferencia } from '@/types/pintura'
import { getKilosReferencia } from '@/lib/supabase/queries/vaciado'
import { Search, Loader2, TableProperties, Scale, Info, Database } from 'lucide-react'

export default function KilosTable() {
    const [data, setData] = useState<KilosReferencia[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const result = await getKilosReferencia()
            setData(result)
        } catch (error) {
            console.error('Error loading kilos data:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredData = data.filter(item => {
        if (!searchText) return true
        const search = searchText.toLowerCase()
        return (
            (item.producto_sku?.toLowerCase() || '').includes(search) ||
            (item.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (item.masa?.toString() || '').includes(search)
        )
    })

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
            {/* Header & Search */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Catálogo de Kilos</h2>
                        <p className="text-base text-slate-500 font-medium">Referencia oficial de pesos por producto</p>
                    </div>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por SKU, descripción o peso..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-inner"
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-slate-500 font-medium animate-pulse">Cargando base de datos...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider">Producto SKU</th>
                                    <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider">Descripción</th>
                                    <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Masa (Kg)</th>
                                    <th className="px-8 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Gelcoat (Kg)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                                                    {item.producto_sku}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-base font-semibold text-slate-600">
                                                {item.producto_descripcion}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-base border border-emerald-100">
                                                    <Scale className="w-4 h-4" />
                                                    {Number(item.masa || 0).toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-base border border-blue-100">
                                                    <TableProperties className="w-4 h-4" />
                                                    {Number(item.cantGelcoat || 0).toFixed(3)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-slate-50 p-4 rounded-full">
                                                    <Search className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-slate-800 font-bold">No se encontraron resultados</p>
                                                    <p className="text-slate-500 text-sm">Prueba ajustando los términos de búsqueda</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Stats */}
                {!loading && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{filteredData.length} Referencias Disponibles</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <span>Valores actualizados desde query_kilos_referencia</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
