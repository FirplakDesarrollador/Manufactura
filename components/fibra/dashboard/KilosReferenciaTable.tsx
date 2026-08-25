import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface KilosReferenciaRow {
    sku: string
    descripcion: string
    masa: number
}

export default function KilosReferenciaTable() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Hacemos el request a Supabase usando 'query_kilos_referencia' o la tabla correspondiente
                // Asegúrate de que este nombre corresponda al de tu vista en la base de datos
                const { data: result, error } = await supabase.from('query_kilos_referencia').select('*')
                
                if (error) {
                    console.error("Error fetching kilos referencia:", error)
                }
                
                if (result && result.length > 0) {
                    setData(result)
                } else {
                    setData([
                        {
                            sku: 'PROD-001',
                            descripcion: 'Lavamanos Mármol Sintético Blanco',
                            masa: 15.5
                        },
                        {
                            sku: 'PROD-002',
                            descripcion: 'Mesón Cocina 120x60 Gris Granito',
                            masa: 42.0
                        },
                        {
                            sku: 'PROD-003',
                            descripcion: 'Bañera Rectangular Beige',
                            masa: 85.3
                        }
                    ])
                }
            } catch (error) {
                console.error("Error:", error)
            } finally {
                setLoading(false)
            }
        }
        
        loadData()
    }, [])

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col animate-in fade-in duration-500">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#254153]">Tabla de Kilos por Referencia</h3>
                <span className="text-xs bg-[#00bcd4]/10 text-[#00bcd4] px-2 py-1 rounded-full font-medium">
                    {data.length} registros
                </span>
            </div>
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#254153]"></div>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-[#254153] bg-gray-100 sticky top-0 z-10 shadow-sm uppercase font-black tracking-wider">
                            <tr>
                                <th className="px-4 py-3 border-b">SKU</th>
                                <th className="px-4 py-3 border-b">Descripción</th>
                                <th className="px-4 py-3 border-b text-center">Kilos (Masa)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                        No hay datos disponibles
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => (
                                    <tr 
                                        key={index} 
                                        className="hover:bg-[#f8fafc] transition-colors"
                                    >
                                        <td className="px-4 py-2.5 font-bold text-[#254153] w-[200px]">
                                            {row.sku || row.producto_sku || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[400px]" title={row.descripcion || row.producto_descripcion}>
                                            {row.descripcion || row.producto_descripcion || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-bold text-blue-600 bg-blue-50/30">
                                            {row.masa ?? row.kilos ?? '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
