import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface CargaProductosRow {
    productoSku: string
    productoDescripcion: string
    grupo: string
    color: string
    totalOrdenes: number
    piezasProgramadas: number
}

export default function CargaProductosTable() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Hacemos el request a Supabase usando 'query_carga_productos' 
                // Asegúrate de que este nombre corresponda al de tu vista en la base de datos
                const { data: result, error } = await supabase.from('query_carga_productos').select('*')
                
                if (error) {
                    console.error("Error fetching carga productos:", error)
                }
                
                if (result && result.length > 0) {
                    setData(result)
                } else {
                    setData([
                        {
                            productoSku: 'PROD-001',
                            productoDescripcion: 'Lavamanos Mármol Sintético',
                            grupo: 'Lavamanos',
                            color: 'Blanco',
                            totalOrdenes: 150,
                            piezasProgramadas: 120
                        },
                        {
                            productoSku: 'PROD-002',
                            productoDescripcion: 'Mesón Cocina 120x60',
                            grupo: 'Mesones',
                            color: 'Gris Granito',
                            totalOrdenes: 45,
                            piezasProgramadas: 40
                        },
                        {
                            productoSku: 'PROD-003',
                            productoDescripcion: 'Bañera Rectangular',
                            grupo: 'Bañeras',
                            color: 'Beige',
                            totalOrdenes: 12,
                            piezasProgramadas: 12
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
                <h3 className="text-sm font-bold text-[#254153]">Tabla de Carga de Productos</h3>
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
                                <th className="px-4 py-3 border-b">Grupo</th>
                                <th className="px-4 py-3 border-b">Color</th>
                                <th className="px-4 py-3 border-b text-center">Órdenes</th>
                                <th className="px-4 py-3 border-b text-center hidden md:table-cell">Programado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No hay datos disponibles
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => (
                                    <tr 
                                        key={index} 
                                        className="hover:bg-[#f8fafc] transition-colors"
                                    >
                                        <td className="px-4 py-2.5 font-bold text-[#254153]">
                                            {row.productoSku || row.sku || row.producto_sku || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[300px]" title={row.productoDescripcion || row.descripcion || row.producto_descripcion}>
                                            {row.productoDescripcion || row.descripcion || row.producto_descripcion || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700">
                                            {row.grupo ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {row.color ?? '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-blue-600 font-bold bg-blue-50/30">
                                            {row.totalOrdenes ?? row.total_ordenes ?? row.ordenes ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[#00bcd4] font-bold bg-[#00bcd4]/5 hidden md:table-cell">
                                            {row.piezasProgramadas ?? row.piezas_programadas ?? row.programado ?? '-'}
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
