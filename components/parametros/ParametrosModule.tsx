'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ProductoMS } from '@/types/pintura'
import { getProductosMS, updateProductosBulk } from '@/lib/supabase/queries/productos'
import {
    Search,
    Eraser,
    Loader2,
    Save,
    CheckSquare,
    Square,
    Percent,
    Weight,
    Info,
    AlertCircle
} from 'lucide-react'

export default function ParametrosModule({ userEmail }: { userEmail: string }) {
    const [productos, setProductos] = useState<ProductoMS[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [reductionType, setReductionType] = useState<'percent' | 'kg'>('percent')
    const [reductionValue, setReductionValue] = useState('0.0')
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getProductosMS()
            setProductos(data)
        } catch (error) {
            console.error('Error loading products:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProductos = useMemo(() => {
        const search = searchText.toLowerCase()
        return productos.filter(p =>
            (p.producto_sku?.toLowerCase() || '').includes(search) ||
            (p.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (p.color?.toLowerCase() || '').includes(search) ||
            (p.masa?.toString() || '').includes(search)
        )
    }, [productos, searchText])

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProductos.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredProductos.map(p => p.id)))
        }
    }

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleSave = async () => {
        if (selectedIds.size === 0) {
            alert('Debe seleccionar al menos 1 producto')
            return
        }

        const modeText = reductionType === 'percent' ? `${reductionValue}%` : `${reductionValue}kg`
        if (!confirm(`¿Seguro que desea reducir en ${modeText} los kilos de los ${selectedIds.size} productos seleccionados?`)) return

        setSaving(true)
        try {
            const val = parseFloat(reductionValue)
            await updateProductosBulk(Array.from(selectedIds), {
                [reductionType === 'percent' ? 'porcentaje_reduccion' : 'kilos_reduccion']: val,
                modified_by: userEmail
            })
            alert(`Se aplicó la reducción a ${selectedIds.size} productos correctamente.`)
            setReductionValue('0.0')
            setSelectedIds(new Set())
            loadData()
        } catch (error) {
            console.error('Error saving changes:', error)
            alert('Hubo un error al guardar los cambios.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Header / Tools */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-6">
                    {/* Search */}
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">Búsqueda</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="sku / producto / kilos / color"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Reduction Selector */}
                    <div className="flex gap-4 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setReductionType('percent')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${reductionType === 'percent' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Percent size={14} /> REDUCIR EN %
                        </button>
                        <button
                            onClick={() => setReductionType('kg')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${reductionType === 'kg' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Weight size={14} /> REDUCIR EN KILOS
                        </button>
                    </div>

                    {/* Value & Save */}
                    <div className="flex items-end gap-3">
                        <div className="w-32">
                            <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">
                                {reductionType === 'percent' ? '% de reducción' : 'Kg de reducción'}
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={reductionValue}
                                onChange={(e) => setReductionValue(e.target.value)}
                                className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-lg font-black text-center text-blue-600 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || selectedIds.size === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-black text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            MODIFICAR
                        </button>
                    </div>

                    {/* Note */}
                    <div className="max-w-[280px] bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-2">
                        <Info className="text-blue-500 shrink-0" size={16} />
                        <p className="text-[10px] font-bold text-blue-700 leading-tight">
                            Nota: Puedes reducir en porcentaje o kilogramos los productos que selecciones
                        </p>
                    </div>
                </div>
            </div>

            {/* Selection Info */}
            <div className="px-6 py-2 bg-slate-50 flex justify-between border-b border-slate-200">
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-400">Encontrados: <b className="text-slate-700">{filteredProductos.length}</b></span>
                    <span className="text-green-600 border-l border-slate-200 pl-4">Seleccionados: <b>{selectedIds.size}</b></span>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden box-border">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider">
                                <th className="p-3 w-10">
                                    <button onClick={handleSelectAll} className="hover:scale-110 transition-transform">
                                        {selectedIds.size === filteredProductos.length && filteredProductos.length > 0
                                            ? <CheckSquare size={20} className="text-white" />
                                            : <Square size={20} className="text-white" />
                                        }
                                    </button>
                                </th>
                                <th className="p-3">Sku</th>
                                <th className="p-3">Producto</th>
                                <th className="p-3 text-center">Kg SAP</th>
                                <th className="p-3 text-center">% Reduc.</th>
                                <th className="p-3 text-center">Kg Reduc.</th>
                                <th className="p-3 text-center bg-blue-700">Kg App</th>
                                <th className="p-3 whitespace-nowrap">Ult. Modif</th>
                                <th className="p-3">Modificado Por</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={40} /></td>
                                </tr>
                            ) : filteredProductos.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-20 text-center text-slate-400 font-bold italic">No se encontraron productos</td>
                                </tr>
                            ) : (
                                filteredProductos.map((p, idx) => (
                                    <tr key={p.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors text-[11px] font-bold text-slate-600`}>
                                        <td className="p-3">
                                            <button onClick={() => toggleSelect(p.id)} className="hover:scale-110 transition-transform">
                                                {selectedIds.has(p.id)
                                                    ? <CheckSquare size={18} className="text-green-500" />
                                                    : <Square size={18} className="text-slate-300" />
                                                }
                                            </button>
                                        </td>
                                        <td className="p-3 text-blue-600 font-black">{p.producto_sku}</td>
                                        <td className="p-3 max-w-xs truncate">{p.producto_descripcion}</td>
                                        <td className="p-3 text-center font-black">{p.masa}</td>
                                        <td className="p-3 text-center text-orange-600">{p.porcentaje_reduccion}%</td>
                                        <td className="p-3 text-center text-orange-600">{p.kilos_reduccion}</td>
                                        <td className="p-3 text-center bg-blue-50 font-black text-blue-700 text-sm">{p.kilos}</td>
                                        <td className="p-3 whitespace-nowrap text-slate-400">
                                            {p.modified_at ? new Date(p.modified_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="p-3 text-slate-400 truncate max-w-[120px]">{p.modified_by || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
