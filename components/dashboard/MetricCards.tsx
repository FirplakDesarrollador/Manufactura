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
            <div className="grid grid-cols-3 gap-3 w-fit">
                {[...Array(17)].map((_, i) => (
                    <div key={i} className="animate-pulse w-28 h-28 bg-gray-100 rounded-xl" />
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
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
                {squares.map((s, i) => (
                    <div
                        key={i}
                        className={`${s.bg} ${s.text} w-28 h-28 rounded-xl flex flex-col items-center justify-center shadow-lg border ${s.bg === 'bg-white' ? 'border-gray-200' : 'border-transparent'} hover:border-gray-400 transition-all`}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-80">{s.title}</span>
                        <span className="text-2xl font-black">{Math.round(Number(s.value)).toLocaleString()}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-3 pr-10">
                {bottomSquares.map((s, i) => (
                    <div
                        key={i}
                        className={`${s.bg} ${s.text} w-28 h-28 rounded-xl flex flex-col items-center justify-center shadow-lg border ${s.bg === 'bg-white' ? 'border-gray-200' : 'border-transparent'} hover:border-gray-400 transition-all`}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-80">{s.title}</span>
                        <span className="text-2xl font-black">{Math.round(Number(s.value)).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
