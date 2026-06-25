'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, TrendingUp, AlertTriangle, Sparkles, Lightbulb } from 'lucide-react'

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

interface Feedback {
    comment: string
    tips: string[]
}

function generateFeedback(scoreData: ScoreData): Feedback {
    const { total, basicData, filledObs, detailLevel, congruence, vaNva } = scoreData
    const tips: string[] = []
    let comment = ""

    if (total >= 90) {
        comment = "¡Impecable! Has registrado una OPT ejemplar. Los datos están completos, el nivel de detalle de las observaciones es excelente y el análisis de valor agregado está correctamente justificado."
    } else if (total >= 80) {
        comment = "¡Excelente registro! La OPT cumple con altos estándares de calidad. Aportas información valiosa para el control de piso."
    } else if (total >= 60) {
        comment = "Buen registro. Has documentado adecuadamente la observación, aunque existen algunos aspectos que podrías detallar mejor para enriquecer el reporte."
    } else if (total >= 40) {
        comment = "Registro regular. La OPT ha sido guardada, pero carece de suficiente profundidad. Es importante que amplíes las descripciones y completes todos los análisis correspondientes."
    } else {
        comment = "Atención: La calidad del registro de la OPT es muy baja. Faltan detalles esenciales sobre las observaciones o el análisis de actividades. Te recomendamos revisar los puntos de mejora."
    }

    if (basicData < 20) {
        tips.push("Completa todos los campos obligatorios del encabezado (título, planta, puesto, operario) para asegurar la trazabilidad del registro.")
    }
    if (filledObs < 30) {
        tips.push("Registra y describe al menos 4 observaciones en los diferentes aspectos evaluados para aumentar el alcance del diagnóstico.")
    }
    if (detailLevel < 20) {
        tips.push("Aumenta la extensión de tus comentarios (promedio de más de 40 letras). Explica detalladamente el cómo y por qué de la situación observada.")
    }
    if (congruence < 15) {
        tips.push("Asegúrate de que cada vez que marques que un criterio 'No cumple', redactes su respectivo comentario justificando la desviación.")
    }
    if (vaNva < 15) {
        tips.push("Completa el análisis VA/NVA ingresando observaciones que justifiquen y expliquen las actividades de valor agregado y desperdicios medidas.")
    }

    if (tips.length === 0) {
        tips.push("¡Sigue así! Tu registro es excelente. Te recomendamos mantener este nivel de rigor en las siguientes observaciones.")
    }

    return { comment, tips }
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
    const feedback = generateFeedback(scoreData)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-[#000155] to-[#1e2075] text-white p-6 text-center relative">
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
                    {/* Comentario redactado */}
                    <div className="mt-6 bg-[#f0f5f8] rounded-xl p-4 border border-[#e2edf2] text-[#254153] animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-[#749094]" />
                            <span className="font-bold text-xs uppercase tracking-wide">Retroalimentación</span>
                        </div>
                        <p className="text-xs leading-relaxed italic">{feedback.comment}</p>
                    </div>

                    {/* Tips de Mejora */}
                    <div className="mt-5 text-[#254153] animate-in slide-in-from-bottom-2 duration-300 delay-75">
                        <div className="flex items-center gap-2 mb-2.5">
                            <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span className="font-bold text-xs uppercase tracking-wide">Tips de Mejora</span>
                        </div>
                        <ul className="space-y-2 text-xs pl-1">
                            {feedback.tips.map((tip, idx) => (
                                <li key={idx} className="flex gap-2 items-start">
                                    <span className="text-amber-500 font-bold text-sm leading-none">•</span>
                                    <span className="leading-relaxed">{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => router.push('/opt')}
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
