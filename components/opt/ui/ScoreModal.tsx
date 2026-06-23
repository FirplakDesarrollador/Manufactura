'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'

export interface ScoreData {
    total: number
    basicData: number
    filledObs: number
    detailLevel: number
    congruence: number
    vaNva: number
}

interface ScoreModalProps {
    isOpen: boolean
    scoreData: ScoreData | null
}

export function ScoreModal({ isOpen, scoreData }: ScoreModalProps) {
    const router = useRouter()

    if (!isOpen || !scoreData) return null

    const getColorClass = (score: number) => {
        if (score >= 80) return 'text-green-600'
        if (score >= 50) return 'text-amber-500'
        return 'text-red-600'
    }

    const { total, basicData, filledObs, detailLevel, congruence, vaNva } = scoreData

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#000155] text-white p-6 text-center relative">
                    <h2 className="text-xl font-bold mb-1 opacity-90 tracking-wide">Calidad de tu OPT</h2>
                    <div className="flex items-center justify-center gap-3">
                        {total >= 80 ? (
                            <CheckCircle2 size={36} className="text-green-400" />
                        ) : total >= 50 ? (
                            <TrendingUp size={36} className="text-amber-400" />
                        ) : (
                            <AlertTriangle size={36} className="text-red-400" />
                        )}
                        <span className={`text-6xl font-black ${getColorClass(total)} bg-white px-4 rounded-xl shadow-inner my-2`}>
                            {total}%
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-sm font-bold text-gray-400 mb-4 border-b pb-2 uppercase tracking-wider">
                        Desglose de Calificación
                    </h3>

                    <ul className="space-y-3 text-sm">
                        <li className="flex justify-between items-center group">
                            <span className="text-gray-600 group-hover:text-black transition-colors">Datos Básicos</span>
                            <span className="font-bold flex items-center gap-1">
                                {basicData} <span className="text-gray-400 text-xs font-normal">/ 20</span>
                            </span>
                        </li>
                        <li className="flex justify-between items-center group">
                            <span className="text-gray-600 group-hover:text-black transition-colors">Llenado de Obs.</span>
                            <span className="font-bold flex items-center gap-1">
                                {filledObs} <span className="text-gray-400 text-xs font-normal">/ 30</span>
                            </span>
                        </li>
                        <li className="flex justify-between items-center group">
                            <span className="text-gray-600 group-hover:text-black transition-colors">Nivel de Detalle</span>
                            <span className="font-bold flex items-center gap-1">
                                {detailLevel} <span className="text-gray-400 text-xs font-normal">/ 20</span>
                            </span>
                        </li>
                        <li className="flex justify-between items-center group">
                            <span className="text-gray-600 group-hover:text-black transition-colors">Congruencia</span>
                            <span className="font-bold flex items-center gap-1">
                                {congruence} <span className="text-gray-400 text-xs font-normal">/ 15</span>
                            </span>
                        </li>
                        <li className="flex justify-between items-center group">
                            <span className="text-gray-600 group-hover:text-black transition-colors">Análisis VA/NVA</span>
                            <span className="font-bold flex items-center gap-1">
                                {vaNva} <span className="text-gray-400 text-xs font-normal">/ 15</span>
                            </span>
                        </li>
                    </ul>

                    <div className="mt-8">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-[#749094] hover:bg-[#254153] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
