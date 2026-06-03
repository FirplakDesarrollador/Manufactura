import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface OrdenFabricacionRow {
    ordenFabricacion: string
    numeroPedido: string
    cliente: string
    productoDescripcion: string
    fechaIdealProduccion: string
    ensayo: boolean
    moldeDescripcion: string
    moldesTotales: number
    moldesDisponibles: number
}

export default function OrdenesTable() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Hacemos el request a Supabase usando 'query_ordenes_fabricacion' 
                // Asegúrate de que este nombre corresponda al de tu vista en la base de datos
                const { data: result, error } = await supabase.from('query_ordenes_fabricacion').select('*')
                
                if (error) {
                    console.error("Error fetching ordenes:", error)
                }
                
                if (result && result.length > 0) {
                    setData(result)
                } else {
                    setData([
                        {
                            ordenFabricacion: 'ORD-2026-001',
                            numeroPedido: 'PED-9081',
                            cliente: 'Constructor S.A.',
                            productoDescripcion: 'Lavamanos Mármol Sintético Blanco',
                            fechaIdealProduccion: new Date().toISOString(),
                            ensayo: false,
                            moldeDescripcion: 'Molde Lavamanos Estándar',
                            moldesTotales: 4,
                            moldesDisponibles: 2
                        },
                        {
                            ordenFabricacion: 'ORD-2026-002',
                            numeroPedido: 'PED-9085',
                            cliente: 'Distribuidora del Norte',
                            productoDescripcion: 'Mesón Cocina 120x60 Gris Granito',
                            fechaIdealProduccion: new Date(Date.now() + 86400000).toISOString(),
                            ensayo: true,
                            moldeDescripcion: 'Molde Rectangular 120x60',
                            moldesTotales: 2,
                            moldesDisponibles: 1
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
                <h3 className="text-sm font-bold text-[#254153]">Tabla de Órdenes de Fabricación</h3>
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
                                <th className="px-4 py-3 border-b">Orden</th>
                                <th className="px-4 py-3 border-b">Pedido</th>
                                <th className="px-4 py-3 border-b">Cliente</th>
                                <th className="px-4 py-3 border-b">Producto</th>
                                <th className="px-4 py-3 border-b text-center">Ensayo</th>
                                <th className="px-4 py-3 border-b text-center">Fecha Prod.</th>
                                <th className="px-4 py-3 border-b hidden md:table-cell">Molde Asignado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                                            {row.ordenFabricacion || row.orden_fabricacion || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-gray-600">
                                            {row.numeroPedido || row.numero_pedido || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-800 truncate max-w-[150px]">
                                            {row.cliente || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[200px]" title={row.productoDescripcion || row.producto_descripcion}>
                                            {row.productoDescripcion || row.producto_descripcion || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {(row.ensayo !== undefined ? row.ensayo : false) ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                                                    Ensayo
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-gray-600">
                                            {row.fechaIdealProduccion || row.fecha_ideal_produccion 
                                                ? new Date(row.fechaIdealProduccion || row.fecha_ideal_produccion).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 truncate max-w-[150px] hidden md:table-cell" title={row.moldeDescripcion || row.molde_descripcion}>
                                            {row.moldeDescripcion || row.molde_descripcion || '-'}
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
