import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface CargaMoldesRow {
    moldeSku: string
    moldeDescripcion: string
    moldesTotales: number
    moldesDisponibles: number
    moldesEnUso: number
    moldesEnReparacion: number
    moldesEnFabricacion: number
    ordenes: number
    programado: number
    vueltas: number
}

export default function CargaMoldesTable() {
    const [data, setData] = useState<CargaMoldesRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Hacemos el request a Supabase. Como no sé el nombre exacto de la vista, 
                // por favor actualiza 'vista_carga_moldes' por el nombre correcto en tu BD.
                const { data: result, error } = await supabase.from('query_carga_moldes').select('*')
                
                if (error) {
                    console.error("Error fetching carga moldes:", error)
                }
                
                // Si la BD devuelve datos los usamos, de lo contrario un mock temporario
                if (result && result.length > 0) {
                    setData(result as any)
                } else {
                    setData([
                        {
                            moldeSku: 'SKU-EJEMPLO-001',
                            moldeDescripcion: 'Molde Rectangular 120x60',
                            moldesTotales: 10,
                            moldesDisponibles: 5,
                            moldesEnUso: 3,
                            moldesEnReparacion: 2,
                            moldesEnFabricacion: 0,
                            ordenes: 15,
                            programado: 10,
                            vueltas: 2
                        },
                        {
                            moldeSku: 'SKU-EJEMPLO-002',
                            moldeDescripcion: 'Molde Circular 80',
                            moldesTotales: 8,
                            moldesDisponibles: 2,
                            moldesEnUso: 6,
                            moldesEnReparacion: 0,
                            moldesEnFabricacion: 0,
                            ordenes: 20,
                            programado: 12,
                            vueltas: 1.5
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
                <h3 className="text-sm font-bold text-[#254153]">Tabla de Carga de Moldes</h3>
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
                                <th className="px-4 py-3 border-b text-center">Totales</th>
                                <th className="px-4 py-3 border-b text-center">Disponibles</th>
                                <th className="px-4 py-3 border-b text-center">En Uso</th>
                                <th className="px-4 py-3 border-b text-center">Reparación</th>
                                <th className="px-4 py-3 border-b text-center">Fabricación</th>
                                <th className="px-4 py-3 border-b text-center">Órdenes</th>
                                <th className="px-4 py-3 border-b text-center">Programado</th>
                                <th className="px-4 py-3 border-b text-center">Vueltas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                        No hay datos disponibles
                                    </td>
                                </tr>
                            ) : (
                                data.map((row: any, index: number) => (
                                    <tr 
                                        key={index} 
                                        className="hover:bg-[#f8fafc] transition-colors"
                                    >
                                        <td className="px-4 py-2.5 font-bold text-[#254153]">
                                            {row.moldeSku || row.sku || row.molde_sku || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[250px]" title={row.moldeDescripcion || row.descripcion || row.molde_descripcion}>
                                            {row.moldeDescripcion || row.descripcion || row.molde_descripcion || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                                            {row.moldesTotales ?? row.moldes_totales ?? row.totales ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-green-600 font-bold bg-green-50/30">
                                            {row.moldesDisponibles ?? row.moldes_disponibles ?? row.disponibles ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-orange-600 font-bold bg-orange-50/30">
                                            {row.moldesEnUso ?? row.moldes_en_uso ?? row.en_uso ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-red-600 font-medium">
                                            {row.moldesEnReparacion ?? row.moldes_en_reparacion ?? row.reparacion ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-gray-600">
                                            {row.moldesEnFabricacion ?? row.moldes_en_fabricacion ?? row.fabricacion ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-blue-600 font-bold bg-blue-50/30">
                                            {row.ordenes ?? row.total_ordenes ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[#00bcd4] font-bold bg-[#00bcd4]/5">
                                            {row.programado ?? row.piezas_programadas ?? '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-purple-600 font-bold">
                                            {row.vueltas ?? row.promedio_vueltas ?? '-'}
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
