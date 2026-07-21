'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'

interface SparePart {
    Modified: number
    ID: string
    Descripcion: string
    Maquina: string
    Subconjunto: string
    'Sku/Modelo': string
    Marca: string
    Ubicación: string
    Minimo: string
    'Stock actual': string
    Imagen?: string
    [key: string]: any
}

interface UnifiedInventoryTableProps {
    externalPlantFilter?: string | null
    onClearPlantFilter?: () => void
}

export default function UnifiedInventoryTable({ externalPlantFilter, onClearPlantFilter }: UnifiedInventoryTableProps) {
    const [parts, setParts] = useState<SparePart[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [successId, setSuccessId] = useState<string | null>(null)
    const [localStocks, setLocalStocks] = useState<Record<number, string>>({})
    const [showLowStockOnly, setShowLowStockOnly] = useState(false)
    const [showMinOnly, setShowMinOnly] = useState(false)

    // Sync external filter with internal low stock display
    useEffect(() => {
        if (externalPlantFilter) {
            setShowLowStockOnly(true)
        }
    }, [externalPlantFilter])

    const supabase = createClient()

    useEffect(() => {
        async function fetchAllParts() {
            setLoading(true)
            const { data, error } = await supabase
                .from('REPUESTOS_MANTENIMIENTO')
                .select('*')
                .order('Maquina', { ascending: true })

            if (!error && data) {
                console.log('Primer elemento de los datos:', data[0])
                setParts(data)
                const initialStocks: Record<number, string> = {}
                data.forEach(p => {
                    initialStocks[p.Modified] = p['Stock actual'] || '0'
                })
                setLocalStocks(initialStocks)
            } else {
                console.error('Error fetching parts:', error)
            }
            setLoading(false)
        }

        fetchAllParts()
    }, [supabase])

    const filteredParts = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase()
        return parts.filter(p => {
            // Filter by external plant if provided
            if (externalPlantFilter && p.Taller !== externalPlantFilter) {
                return false
            }

            const matchesSearch = p.Descripcion?.toLowerCase().includes(lowerSearch) ||
                p.Maquina?.toLowerCase().includes(lowerSearch) ||
                p.Subconjunto?.toLowerCase().includes(lowerSearch) ||
                p.ID?.toLowerCase().includes(lowerSearch)

            if (!matchesSearch) return false

            // If no filters are active, show everything that matches search
            if (!showLowStockOnly && !showMinOnly) return true

            const currentStock = Number(localStocks[p.Modified] || 0)
            const minStock = Number(p.Minimo || 0)
            const isLow = currentStock < minStock
            const isMin = currentStock === minStock && minStock !== 0

            // If both filters are active, show items that are low OR at min
            if (showLowStockOnly && showMinOnly) return isLow || isMin
            if (showLowStockOnly) return isLow
            if (showMinOnly) return isMin

            return true
        })
    }, [parts, searchTerm, showLowStockOnly, showMinOnly, localStocks])

    const handleStockUpdate = async (modified: number, newStock: string) => {
        setUpdatingId(modified.toString())

        const { error } = await supabase
            .from('REPUESTOS_MANTENIMIENTO')
            .update({ 'Stock actual': newStock })
            .eq('Modified', modified)

        if (error) {
            console.error('Error updating stock:', error)
            alert('Error al actualizar el stock. Verifica tu conexión.')
            // Revert local stock
            const original = parts.find(p => p.Modified === modified)
            if (original) {
                setLocalStocks(prev => ({ ...prev, [modified]: original['Stock actual'] }))
            }
        } else {
            // Update master state
            setParts(prev => prev.map(p => p.Modified === modified ? { ...p, 'Stock actual': newStock } : p))
            // Show success feedback
            setSuccessId(modified.toString())
            setTimeout(() => setSuccessId(null), 2000)
        }
        setUpdatingId(null)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="animate-pulse">Cargando inventario completo...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por máquina, descripción o subconjunto..."
                        className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {externalPlantFilter && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Planta: {externalPlantFilter}</span>
                        <button 
                            onClick={onClearPlantFilter}
                            className="text-indigo-400 hover:text-indigo-600 transition-colors"
                            title="Quitar filtro de planta"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all shadow-sm border ${showLowStockOnly
                            ? 'bg-red-500 text-white border-red-600 ring-4 ring-red-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                            }`}
                    >
                        <svg className={`h-5 w-5 ${showLowStockOnly ? 'text-white' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="hidden lg:inline">{showLowStockOnly ? 'Mostrando bajo stock' : 'Ver bajo stock'}</span>
                        <span className="lg:hidden">Bajo</span>
                        {showLowStockOnly && (
                            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                                {parts.filter(p => Number(localStocks[p.Modified] || 0) < Number(p.Minimo || 0)).length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setShowMinOnly(!showMinOnly)}
                        className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all shadow-sm border ${showMinOnly
                            ? 'bg-amber-500 text-white border-amber-600 ring-4 ring-amber-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-amber-200 hover:bg-amber-50/50'
                            }`}
                    >
                        <svg className={`h-5 w-5 ${showMinOnly ? 'text-white' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden lg:inline">{showMinOnly ? 'Mostrando en mínimo' : 'Ver en mínimo'}</span>
                        <span className="lg:hidden">Mín</span>
                        {showMinOnly && (
                            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                                {parts.filter(p => {
                                    const curr = Number(localStocks[p.Modified] || 0)
                                    const min = Number(p.Minimo || 0)
                                    return curr === min && min !== 0
                                }).length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32">Stock Actual</th>
                                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Imagen</th>
                                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Mín</th>
                                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descripción</th>
                                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubicación</th>
                                <th className="px-4 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Máquina</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {filteredParts.length > 0 ? (
                                filteredParts.map((part) => {
                                    const currentStock = Number(localStocks[part.Modified] || 0)
                                    const minStock = Number(part.Minimo || 0)

                                    let stockColorClass = 'text-gray-900 border-gray-200 focus:ring-indigo-500'
                                    if (currentStock > minStock) {
                                        stockColorClass = 'text-green-700 border-green-200 bg-green-50 focus:ring-green-500'
                                    } else if (currentStock === minStock && minStock !== 0) {
                                        stockColorClass = 'text-amber-600 border-amber-200 bg-amber-50 focus:ring-amber-500'
                                    } else if (currentStock < minStock) {
                                        stockColorClass = 'text-red-600 border-red-200 bg-red-50 focus:ring-red-500'
                                    }

                                    const isUpdating = updatingId === part.Modified.toString()
                                    const isSuccess = successId === part.Modified.toString()

                                    return (
                                        <tr key={part.Modified} className="hover:bg-indigo-50/10 transition-colors border-b border-gray-100 last:border-0">
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <div className="relative inline-block group">
                                                    <input
                                                        type="number"
                                                        value={localStocks[part.Modified] || ''}
                                                        disabled={isUpdating}
                                                        onChange={(e) => setLocalStocks(prev => ({ ...prev, [part.Modified]: e.target.value }))}
                                                        onBlur={(e) => {
                                                            const original = parts.find(p => p.Modified === part.Modified)?.['Stock actual']
                                                            if (e.target.value !== original) {
                                                                handleStockUpdate(part.Modified, e.target.value)
                                                            }
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                                        className={`w-28 px-3 py-2 text-center text-sm font-black rounded-xl border transition-all focus:outline-none focus:ring-2 ${stockColorClass} ${isUpdating ? 'opacity-50 animate-pulse' : ''} ${isSuccess ? 'ring-2 ring-green-500 border-green-500 bg-green-50' : ''
                                                            } hover:border-indigo-300 shadow-sm`}
                                                    />
                                                    {isSuccess && (
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-md animate-bounce">
                                                            ¡Guardado!
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                {part.Imagen ? (
                                                    <a href={`https://vuiuorjzonpyobpelyld.supabase.co/storage/v1/object/public/Repuestos/${encodeURIComponent(part.Imagen)}`} target="_blank" rel="noopener noreferrer">
                                                        <img 
                                                            src={`https://vuiuorjzonpyobpelyld.supabase.co/storage/v1/object/public/Repuestos/${encodeURIComponent(part.Imagen)}`} 
                                                            alt="Repuesto"
                                                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 inline-block shadow-sm hover:scale-110 transition-transform bg-white min-w-[40px] min-h-[40px]"
                                                            loading="lazy"
                                                        />
                                                    </a>
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 mx-auto flex items-center justify-center text-[8px] text-gray-400 font-bold uppercase tracking-wider min-w-[40px] min-h-[40px]">
                                                        Sin Img
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className="text-[11px] font-bold text-gray-400">{part.Minimo || '0'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs font-bold text-gray-900 line-clamp-1 max-w-[400px]" title={part.Descripcion}>{part.Descripcion}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-[11px] font-bold text-indigo-500">{part.Ubicación || '-'}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[9px] font-bold border border-gray-100 uppercase">
                                                    {part.Maquina}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-medium">
                                        No se encontraron resultados para "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
