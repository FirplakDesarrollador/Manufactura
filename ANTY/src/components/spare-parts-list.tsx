'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

interface SparePart {
    Modified: number
    ID: string
    Descripcion: string
    'Sku/Modelo': string
    'Stock actual': string
    Minimo: string
    Marca: string
}

interface SparePartsListProps {
    machineName: string
}

export default function SparePartsList({ machineName }: SparePartsListProps) {
    const [parts, setParts] = useState<SparePart[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [localStocks, setLocalStocks] = useState<Record<number, string>>({})
    const supabase = createClient()

    const fetchParts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('REPUESTOS_MANTENIMIENTO')
            .select('Modified, ID, Descripcion, "Sku/Modelo", "Stock actual", Minimo, Marca')
            .eq('Maquina', machineName)

        if (!error && data) {
            setParts(data)
            // Sincronizar stock local inicial
            const initialStocks: Record<number, string> = {}
            data.forEach(p => {
                initialStocks[p.Modified] = p['Stock actual'] || '0'
            })
            setLocalStocks(initialStocks)
        } else {
            console.error('Error fetching spare parts:', error)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (machineName) {
            fetchParts()
        }
    }, [machineName, supabase])

    const handleStockUpdate = async (modified: number, newStock: string) => {
        console.log(`Intentando actualizar stock para Modified ${modified} a ${newStock}...`)
        setUpdatingId(modified.toString())

        const { error, status, statusText } = await supabase
            .from('REPUESTOS_MANTENIMIENTO')
            .update({ 'Stock actual': newStock })
            .eq('Modified', modified)

        if (error) {
            console.error('Error de Supabase al actualizar:', error)
            alert(`Error (${status}): ${error.message || 'No tienes permisos para editar esta tabla. Verifica las políticas RLS en Supabase.'}`)

            // Revertir localmente al valor que tiene el objeto 'part' original
            const originalPart = parts.find(p => p.Modified === modified)
            if (originalPart) {
                setLocalStocks(prev => ({ ...prev, [modified]: originalPart['Stock actual'] }))
            }
        } else {
            console.log('Stock actualizado con éxito en Supabase')
            // Actualizar el estado maestro de partes
            setParts(current =>
                current.map(p => p.Modified === modified ? { ...p, 'Stock actual': newStock } : p)
            )
        }
        setUpdatingId(null)
    }

    if (loading) {
        return <div className="text-center py-10 text-gray-400 animate-pulse">Buscando repuestos para {machineName}...</div>
    }

    if (parts.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No hay repuestos registrados para esta máquina.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU/Modelo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Mín</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Stock Actual</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {parts.map((part, index) => {
                        const currentVal = localStocks[part.Modified] ?? part['Stock actual'] ?? '0'
                        const stockActual = Number(currentVal) || 0
                        const stockMinimo = Number(part.Minimo) || 0

                        // FIX: Solo marcar como actualizando si hay un ID válido y coincide
                        const isUpdating = updatingId !== null && updatingId === part.Modified.toString()

                        let stockColor = 'border-gray-200 focus:ring-gray-500'

                        if (stockActual > stockMinimo) {
                            stockColor = 'bg-green-50 border-green-200 text-green-700 focus:ring-green-500 shadow-sm'
                        } else if (stockActual === stockMinimo && stockMinimo !== 0) {
                            stockColor = 'bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500 shadow-sm'
                        } else if (stockActual < stockMinimo) {
                            stockColor = 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500 shadow-sm'
                        }

                        return (
                            <tr key={part.ID || index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{part.Descripcion}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{part['Sku/Modelo']}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 text-center">{part.Minimo || '0'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center w-24">
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={currentVal}
                                            disabled={isUpdating}
                                            onChange={(e) => {
                                                setLocalStocks(prev => ({ ...prev, [part.Modified]: e.target.value }))
                                            }}
                                            onBlur={(e) => {
                                                const originalValue = parts.find(p => p.Modified === part.Modified)?.['Stock actual']
                                                if (e.target.value !== originalValue) {
                                                    handleStockUpdate(part.Modified, e.target.value)
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    // @ts-ignore
                                                    e.target.blur()
                                                }
                                            }}
                                            className={`w-20 px-2 py-1.5 text-center text-xs font-bold rounded-lg border transition-all focus:outline-none focus:ring-2 ${stockColor} ${isUpdating ? 'opacity-50 animate-pulse' : 'hover:border-indigo-300'
                                                }`}
                                        />
                                        {isUpdating && (
                                            <div className="absolute -right-1 -top-1">
                                                <span className="flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
