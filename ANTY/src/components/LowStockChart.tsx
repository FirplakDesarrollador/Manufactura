'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

interface SparePart {
    Taller: string
    Minimo: string
    'Stock actual': string
}

interface ChartData {
    name: string
    count: number
}

interface LowStockChartProps {
    onPlantClick?: (plant: string | null) => void
    selectedPlant?: string | null
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308']

export default function LowStockChart({ onPlantClick, selectedPlant }: LowStockChartProps) {
    const [parts, setParts] = useState<SparePart[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchParts() {
            const { data, error } = await supabase
                .from('REPUESTOS_MANTENIMIENTO')
                .select('Taller, Minimo, "Stock actual"')

            if (!error && data) {
                setParts(data)
            }
            setLoading(false)
        }
        fetchParts()
    }, [supabase])

    const chartData = useMemo(() => {
        const counts: Record<string, number> = {}
        
        parts.forEach(part => {
            const current = Number(part['Stock actual'] || 0)
            const min = Number(part.Minimo || 0)
            
            if (current < min) {
                const plant = part.Taller || 'Sin Planta'
                counts[plant] = (counts[plant] || 0) + 1
            }
        })

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    }, [parts])

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-[400px] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-medium">Generando analítica...</p>
                </div>
            </div>
        )
    }

    if (chartData.length === 0) {
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo en Orden!</h3>
                <p className="text-gray-500 max-w-xs">No se detectaron repuestos por debajo del nivel mínimo en ninguna planta.</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold mb-2 tracking-widest uppercase">
                        Alertas de Stock
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Repuestos Bajo el Mínimo</h2>
                    <p className="text-gray-500 text-sm mt-1">Conteo de items críticos agrupados por planta (Taller)</p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Actualizado en tiempo real
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl border border-gray-800">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                            <p className="text-xl font-black">{payload[0].value} <span className="text-sm font-normal text-gray-400">Repuestos</span></p>
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                        <Bar 
                            dataKey="count" 
                            radius={[8, 8, 8, 8]} 
                            barSize={40}
                            onClick={(data) => {
                                if (onPlantClick && data && data.name) {
                                    onPlantClick(selectedPlant === data.name ? null : data.name as string)
                                }
                            }}
                            className="cursor-pointer"
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    opacity={selectedPlant && selectedPlant !== entry.name ? 0.3 : 1}
                                    stroke={selectedPlant === entry.name ? '#000' : 'none'}
                                    strokeWidth={2}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
