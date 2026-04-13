'use client'

import React from 'react'
import { MetricasDia } from "@/lib/supabase/queries/dashboard"

interface MetricCardsProps {
    data: MetricasDia | null
    loading: boolean
}

export function MetricCards({ data, loading }: MetricCardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-4 gap-1.5 w-fit">
                {[...Array(17)].map((_, i) => (
                    <div key={i} className="animate-pulse w-20 h-20 bg-gray-100 rounded-lg" />
                ))}
            </div>
        )
    }

    const squares = [
        // Row 1
        { title: "Cantidad", value: data?.total_cantidad || 0, bg: "bg-[#00a3e0]", text: "text-white" },
        { title: "Programado", value: data?.total_programado || 0, bg: "bg-[#ff7f00]", text: "text-white" },
        { title: "Pintura", value: data?.total_pintura || 0, bg: "bg-white", text: "text-[#254153]" },

        // Row 2
        { title: "Pintura L1", value: data?.pintura_l1 || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Pintura L2", value: data?.pintura_l2 || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Pintura L3", value: data?.pintura_l3 || 0, bg: "bg-white", text: "text-[#254153]" },

        // Row 3
        { title: "Vaciado", value: data?.total_vaciado || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Vaciado L1", value: data?.vaciado_l1 || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Vaciado L2", value: data?.vaciado_l2 || 0, bg: "bg-white", text: "text-[#254153]" },

        // Row 4
        { title: "Estantería", value: data?.estanteria || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Saldos", value: data?.saldo || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "Desgelcadas", value: data?.desgelcada || 0, bg: "bg-white", text: "text-[#254153]" },

        // Row 5
        { title: "Acabado", value: data?.acabado || 0, bg: "bg-[#208b7e]", text: "text-white" },
        { title: "Digitado", value: data?.digitado || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "En Transito", value: data?.transito || 0, bg: "bg-white", text: "text-[#254153]" },
    ]

    const bottomSquares = [
        { title: "Kilogramos", value: data?.kilos_vaciados || 0, bg: "bg-white", text: "text-[#254153]" },
        { title: "CEDI", value: data?.cedi || 0, bg: "bg-white", text: "text-[#254153]" },
    ]

    return (
        <div className="flex flex-col gap-1.5 w-fit">
            <div className="grid grid-cols-4 gap-1.5">
                {squares.map((s, i) => (
                    <div
                        key={i}
                        className={`${s.bg} ${s.text} w-20 h-20 rounded-lg flex flex-col items-center justify-center shadow-sm border ${s.bg === 'bg-white' ? 'border-gray-200' : 'border-transparent'} hover:border-blue-400 transition-all p-1`}
                    >
                        <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-80 text-center leading-none px-1 h-4 flex items-center">{s.title}</span>
                        <span className="text-lg font-black tracking-tighter leading-none">{Math.round(Number(s.value)).toLocaleString()}</span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
                {bottomSquares.map((s, i) => (
                    <div
                        key={i}
                        className={`${s.bg} ${s.text} w-20 h-20 rounded-lg flex flex-col items-center justify-center shadow-sm border ${s.bg === 'bg-white' ? 'border-gray-200' : 'border-transparent'} hover:border-blue-400 transition-all p-1`}
                    >
                        <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-80 text-center leading-none px-1 h-4 flex items-center">{s.title}</span>
                        <span className="text-lg font-black tracking-tighter leading-none">{Math.round(Number(s.value)).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
