'use client'

import React from 'react'
import { TrazabilidadDia } from '@/lib/supabase/queries/dashboard'

interface TrazabilidadTableProps {
    data: TrazabilidadDia[]
    loading: boolean
}

export default function TrazabilidadTable({ data, loading }: TrazabilidadTableProps) {
    const hours = Array.from({ length: 18 }, (_, i) => i + 6) // h6 to h23

    if (loading) {
        return <div className="text-center py-10">Cargando datos de trazabilidad...</div>
    }

    if (data.length === 0) {
        return <div className="text-center py-10">No hay datos de trazabilidad para hoy.</div>
    }

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#254153]">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider sticky left-0 bg-[#254153] z-10">
                            Proceso
                        </th>
                        {hours.map(h => (
                            <th key={h} className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                {h}:00
                            </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider bg-[#1a2e3b]">
                            Total
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider bg-[#1a2e3b]">
                            Prom
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-inherit border-r border-gray-100">
                                {row.proceso}
                            </td>
                            {hours.map(h => {
                                const key = `h${h}` as keyof TrazabilidadDia
                                const val = row[key] as number
                                return (
                                    <td key={h} className={`px-3 py-3 whitespace-nowrap text-sm text-center font-medium ${val > 0 ? 'text-cyan-600 bg-cyan-50' : 'text-gray-400'}`}>
                                        {val}
                                    </td>
                                )
                            })}
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-white bg-[#254153]">
                                {row.total_dia}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-[#254153]">
                                {row.promedio?.toFixed(1)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
