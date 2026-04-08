'use client'

import React from 'react'
import { AlertTriangle, Info } from 'lucide-react'

interface PanelDefectoCardProps {
    defecto: string
    cantidad: number
    alertaRoja: number
    alertaAmarilla: number
    idsReposiciones?: number[]
    onClick?: () => void
}

export default function PanelDefectoCard({ 
    defecto, 
    cantidad, 
    alertaRoja, 
    alertaAmarilla,
    onClick
}: PanelDefectoCardProps) {
    
    const getStatusColor = () => {
        if (cantidad >= alertaRoja && alertaRoja > 0) return 'bg-red-500 border-red-600'
        if (cantidad >= alertaAmarilla && alertaAmarilla > 0) return 'bg-amber-500 border-amber-600'
        return 'bg-emerald-500 border-emerald-600'
    }

    const getLightColor = () => {
        if (cantidad >= alertaRoja && alertaRoja > 0) return 'text-red-600'
        if (cantidad >= alertaAmarilla && alertaAmarilla > 0) return 'text-amber-600'
        return 'text-emerald-600'
    }

    const getBgSubtle = () => {
        if (cantidad >= alertaRoja && alertaRoja > 0) return 'bg-red-50'
        if (cantidad >= alertaAmarilla && alertaAmarilla > 0) return 'bg-amber-50'
        return 'bg-emerald-50'
    }

    return (
        <div 
            onClick={onClick}
            className={`w-full sm:w-[280px] cursor-pointer rounded-2xl border-2 p-4 transition-all hover:scale-[1.02] shadow-sm ${getStatusColor().replace('bg-', 'border-').replace('border-', 'border-opacity-20 ')} ${getBgSubtle()}`}
        >
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-gray-800 text-sm leading-tight uppercase line-clamp-2 min-h-[40px]">
                        {defecto}
                    </h3>
                    <div className={`shrink-0 w-3 h-3 rounded-full shadow-sm animate-pulse ${getStatusColor().split(' ')[0]}`} />
                </div>

                {/* Main Metric */}
                <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Hallazgos</span>
                        <span className={`text-4xl font-black tabular-nums transition-colors ${getLightColor()}`}>
                            {cantidad}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/80 rounded-lg border border-gray-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-bold text-gray-600">{alertaAmarilla}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/80 rounded-lg border border-gray-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] font-bold text-gray-600">{alertaRoja}</span>
                        </div>
                    </div>
                </div>

                {/* Comparison Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                        <span>Estado</span>
                        <span>{cantidad >= alertaRoja ? 'Critico' : cantidad >= alertaAmarilla ? 'Advertencia' : 'Normal'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                            className={`h-full transition-all duration-500 ${getStatusColor().split(' ')[0]}`} 
                            style={{ width: `${Math.min((cantidad / (alertaRoja || 1)) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
