'use client'

import { useMemo, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts'

interface HourlyInspectionChartProps {
    reports: Record<string, string | number | null | undefined>[]
}

interface HourlyData {
    hora: string
    horaNum: number
    buenos: number
    defectuosos: number
    total: number
}

const isIgnoredDefect = (defectName: string) => {
    const cleanName = defectName.replace(/^\s*\d+\.\s*/, '').trim().toLowerCase()
    return [
        'saldos/destrucciones',
        'opaco',
        'error en pedido referencia',
        'quebrados logistica'
    ].includes(cleanName)
}

export function HourlyInspectionChart({ reports }: HourlyInspectionChartProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    const hourlyData = useMemo(() => {
        // Initialize hours 5:00 to 23:00
        const hours: Record<number, { buenos: number; defectuosos: number }> = {}
        for (let h = 5; h <= 23; h++) {
            hours[h] = { buenos: 0, defectuosos: 0 }
        }

        reports.forEach(report => {
            const createdAt = report.created_at as string
            if (!createdAt) return

            const date = new Date(
                createdAt.endsWith('Z') || createdAt.includes('+')
                    ? createdAt
                    : createdAt + 'Z'
            )
            // Use UTC since the app stores in UTC
            const hour = date.getUTCHours()

            if (hour < 5 || hour > 23) return

            const defectos = String(report.defectos_lista || '')
            const hasDefect = defectos
                ? defectos.split(',').map(s => s.trim()).some(d => d && !isIgnoredDefect(d))
                : false

            if (hasDefect) {
                hours[hour].defectuosos += 1
            } else {
                hours[hour].buenos += 1
            }
        })

        const data: HourlyData[] = []
        for (let h = 5; h <= 23; h++) {
            const total = hours[h].buenos + hours[h].defectuosos
            if (total > 0 || (h >= 6 && h <= 18)) {
                data.push({
                    hora: `${h}:00`,
                    horaNum: h,
                    buenos: hours[h].buenos,
                    defectuosos: hours[h].defectuosos,
                    total
                })
            }
        }

        return data
    }, [reports])

    const totalPiezas = hourlyData.reduce((acc, d) => acc + d.total, 0)
    const maxHour = hourlyData.reduce((max, d) => d.total > max.total ? d : max, hourlyData[0] || { hora: '-', total: 0 })

    if (isCollapsed) {
        return (
            <div className="bg-white border-b border-gray-200">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-1 h-4 bg-blue-600" />
                        <span className="text-[10px] font-black text-[#254153] uppercase tracking-widest">
                            Piezas Hora a Hora
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                            ({totalPiezas} piezas hoy)
                        </span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white border-b border-gray-200">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(true)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
                <div className="flex items-center space-x-3">
                    <div className="w-1 h-4 bg-blue-600" />
                    <span className="text-[10px] font-black text-[#254153] uppercase tracking-widest">
                        Inspección Hora a Hora
                    </span>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-4 text-right">
                        <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase block leading-none">Total Hoy</span>
                            <span className="text-sm font-black text-[#254153]">{totalPiezas}</span>
                        </div>
                        {maxHour && maxHour.total > 0 && (
                            <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase block leading-none">Hora Pico</span>
                                <span className="text-sm font-black text-blue-600">{maxHour.hora} ({maxHour.total})</span>
                            </div>
                        )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </button>

            {/* Chart */}
            <div className="px-4 py-3">
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={hourlyData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="hora"
                                tick={{ fill: '#254153', fontSize: 9, fontWeight: 900 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(37,65,83,0.04)' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const buenos = (payload.find(p => p.dataKey === 'buenos')?.value as number) || 0
                                        const defectuosos = (payload.find(p => p.dataKey === 'defectuosos')?.value as number) || 0
                                        const total = buenos + defectuosos
                                        return (
                                            <div className="bg-[#254153] text-white p-2.5 shadow-xl border border-black/20" style={{ minWidth: '140px' }}>
                                                <p className="text-[10px] font-black uppercase border-b border-white/10 pb-1 mb-1.5">{label}</p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-bold opacity-70 flex items-center gap-1">
                                                            <span className="w-2 h-2 bg-[#22c55e] inline-block" /> OK
                                                        </span>
                                                        <span className="text-xs font-black text-green-400">{buenos}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-bold opacity-70 flex items-center gap-1">
                                                            <span className="w-2 h-2 bg-[#ef4444] inline-block" /> DEF
                                                        </span>
                                                        <span className="text-xs font-black text-red-400">{defectuosos}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/10 pt-1">
                                                        <span className="text-[9px] font-bold opacity-70">TOTAL</span>
                                                        <span className="text-xs font-black">{total}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                dataKey="buenos"
                                stackId="a"
                                fill="#22c55e"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="defectuosos"
                                stackId="a"
                                fill="#ef4444"
                                radius={[2, 2, 0, 0]}
                            >
                                <LabelList
                                    dataKey="total"
                                    position="top"
                                    fill="#254153"
                                    style={{ fontSize: '9px', fontWeight: 900 }}
                                    formatter={(value: any) => value > 0 ? value : ''}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center space-x-6 pt-1 pb-1">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-[#22c55e]" />
                        <span className="text-[9px] font-black text-gray-500 uppercase">OK / Buenos</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-[#ef4444]" />
                        <span className="text-[9px] font-black text-gray-500 uppercase">Defectuosos</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
