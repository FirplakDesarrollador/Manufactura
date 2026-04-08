'use client'

import React from 'react'
import { MetricasMuebles } from '@/types/muebles'
import { Calendar, Clock, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MetricasDashboardCardProps {
    metricas: MetricasMuebles
}

export default function MetricasDashboardCard({ metricas }: MetricasDashboardCardProps) {
    const formattedDate = format(new Date(metricas.fecha), "EEEE, dd 'de' MMMM", { locale: es })

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-6">
            {/* Header: Date & Shift */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-100">
                        <Calendar size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight leading-none mb-1">
                            {formattedDate}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> Registro de Producción
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</span>
                        <span className="text-sm font-black text-white">{metricas.turno}</span>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ProcessBox title="Corte" metrics={[
                    { label: 'Uni', val: metricas.cortados },
                    { label: 'Pzs', val: metricas.corte_piezas },
                    { label: 'm2', val: metricas.corte_m2 }
                ]} color="blue" />
                
                <ProcessBox title="Enchape" metrics={[
                    { label: 'Uni', val: metricas.enchapados },
                    { label: 'Pzs', val: metricas.enchape_piezas },
                    { label: 'ml', val: metricas.enchape_ml }
                ]} color="emerald" />

                <ProcessBox title="Inspección" metrics={[
                    { label: 'Uni', val: metricas.inspeccion },
                    { label: 'Pzs', val: metricas.inspeccion_piezas },
                    { label: 'm2', val: metricas.inspeccion_m2 }
                ]} color="amber" />

                <ProcessBox title="Empaque" metrics={[
                    { label: 'Uni', val: metricas.empacados },
                    { label: 'Pzs', val: metricas.empaque_piezas },
                    { label: 'm2', val: metricas.empaque_m2 }
                ]} color="indigo" />
            </div>

            {/* Quality & Logistics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <SingleStat label="Reparaciones" val={metricas.reparaciones} color="red" />
                <SingleStat label="Reposiciones" val={metricas.reposiciones} color="red" />
                <SingleStat label="Digitado" val={metricas.digitado} color="slate" />
                <SingleStat label="Tránsito" val={metricas.transito} color="slate" />
                <SingleStat label="CEDI" val={metricas.cedi} color="slate" />
                <SingleStat label="% Calidad" val={`${metricas.p_calidad}%`} color="sky" highlight />
                <SingleStat label="% Rechazo" val={`${metricas.p_rechazado}%`} color="rose" highlight />
            </div>
        </div>
    )
}

function ProcessBox({ title, metrics, color }: { 
    title: string, 
    metrics: { label: string, val: any }[], 
    color: 'blue' | 'emerald' | 'amber' | 'indigo' 
}) {
    const colors = {
        blue: 'bg-blue-600 border-blue-100 text-blue-100',
        emerald: 'bg-emerald-600 border-emerald-100 text-emerald-100',
        amber: 'bg-amber-500 border-amber-100 text-amber-50',
        indigo: 'bg-indigo-600 border-indigo-100 text-indigo-100'
    }

    return (
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${colors[color]}`}>
                {title}
                <BarChart3 size={12} className="opacity-50" />
            </div>
            <div className="flex divide-x divide-gray-100 p-2">
                {metrics.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">{m.label}</span>
                        <span className="text-xs font-black text-gray-700 tabular-nums">{m.val || 0}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SingleStat({ label, val, color, highlight }: { 
    label: string, 
    val: any, 
    color: 'red' | 'slate' | 'sky' | 'rose',
    highlight?: boolean
}) {
    const colors = {
        red: 'bg-red-50 text-red-700 border-red-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
        sky: 'bg-sky-50 text-sky-700 border-sky-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100'
    }

    return (
        <div className={`px-2 py-2 rounded-xl border flex flex-col items-center justify-center text-center transition-colors hover:bg-white ${colors[color]} ${highlight ? 'ring-2 ring-white shadow-sm' : ''}`}>
            <span className="text-[8px] font-bold uppercase tracking-widest leading-none mb-1 opacity-70">{label}</span>
            <span className={`font-black tracking-tight ${highlight ? 'text-xs' : 'text-[11px]'}`}>{val || 0}</span>
        </div>
    )
}
