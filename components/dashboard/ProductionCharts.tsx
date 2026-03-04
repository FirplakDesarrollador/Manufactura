'use client'

import React from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts'
import { TrazabilidadDia } from '@/lib/supabase/queries/dashboard'

interface ProductionChartsProps {
    data: TrazabilidadDia[]
}

export default function ProductionCharts({ data }: ProductionChartsProps) {
    // Transform data for line chart (hourly trend)
    const hours = Array.from({ length: 18 }, (_, i) => i + 6)

    interface HourlyPoint {
        time: string
        [key: string]: string | number | undefined
    }

    const hourlyData = hours.map(h => {
        const point: HourlyPoint = { time: `${h}:00` }
        data.forEach(process => {
            const key = `h${h}` as keyof TrazabilidadDia
            point[process.proceso] = process[key]
        })
        return point
    })

    // Colors for different processes
    const colors = ['#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

    return (
        <div className="space-y-8">
            {/* Hourly Trend Line Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-[#254153] mb-6">Tendencia de Producción por Hora</h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            {data.map((process, index) => (
                                <Line
                                    key={process.proceso}
                                    type="monotone"
                                    dataKey={process.proceso}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Total by Process Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-[#254153] mb-6">Total Producción por Proceso</h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="proceso"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="total_dia" radius={[6, 6, 0, 0]} barSize={50}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
