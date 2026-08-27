'use client'

import React from 'react'
import { OrdenFabricacionDetalle } from "@/lib/supabase/queries/fibra_dashboard"
import { AlertTriangle } from 'lucide-react'

interface OrderCardProps {
    order: OrdenFabricacionDetalle
}

export function OrderCard({ order }: OrderCardProps) {

    const stages = [
        { label: 'PINTURA', value: order.pintura || 0, color: 'text-[#009688]' },
        { label: 'DESGELCADA', value: order.desgelcada || 0, color: 'text-[#e91e63]' },
        { label: 'PULIDO', value: order.pulido || 0, color: 'text-[#2196f3]' },
        { label: 'REPARACION', value: order.reparacion || 0, color: 'text-[#2196f3]' },
        { label: 'SALDO', value: order.saldo || 0, color: 'text-[#2196f3]' },
        { label: 'EMPAQUE', value: order.empaque || 0, color: 'text-[#2196f3]' },
        { label: 'TRANSITO', value: order.transito || 0, color: 'text-[#2196f3]' },
        { label: 'DIGITADO', value: order.digitado || 0, color: 'text-[#2196f3]' },
        { label: 'CEDI', value: order.cedi || 0, color: 'text-[#254153]' },
    ]

    const secondaryStages = [
        { label: 'VACIADO', value: order.vaciado || 0, color: 'text-[#254153]' },
        { label: 'ESTANTERIA', value: order.estanteria || 0, color: 'text-[#254153]' },
        { label: 'ACABADO', value: order.acabado || 0, color: 'text-[#254153]' },
        { label: 'REP. LARGA', value: order.reparacion_larga || 0, color: 'text-[#254153]' },
        { label: 'DESTRUCCION', value: order.destruccion || 0, color: 'text-[#254153]' },
    ]

    const displayStages = [...stages, ...secondaryStages]
    const sumEtapas = displayStages
        .filter(s => !['DESGELCADA', 'DESTRUCCION'].includes(s.label))
        .reduce((acc, s) => acc + (s.value || 0), 0)
    const cantidadTotal = order.cantidad || 0
    const isExcedido = cantidadTotal > 0 && sumEtapas > cantidadTotal
    const programadoCalculado = Math.max(0, cantidadTotal - sumEtapas)

    return (
        <div className={`rounded-lg border shadow-sm p-4 mb-3 flex flex-col md:flex-row gap-4 transition-shadow relative ${
            isExcedido ? 'bg-red-50/40 border-red-400' : 'bg-white border-gray-100 hover:shadow-md'
        }`}>
            {isExcedido && (
                <div className="absolute -top-2.5 right-4 bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
                    <AlertTriangle size={12} />
                    ¡Alerta: Suma en etapas ({sumEtapas}) excede cantidad ({cantidadTotal})!
                </div>
            )}
            {/* Left Section: Order Info */}
            <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[#254153]">OF: {order.orden_fabricacion}</span>

                </div>
                <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-tight">Pedido: {order.numero_pedido || order.pedido || '-'}</p>
                    <p className="text-[11px] font-bold text-[#254153] leading-snug mt-1" title={order.producto_descripcion}>{order.producto_descripcion || order.producto_sku || 'Sin descripción'}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-gray-400">👤 Cliente: {order.cliente || order.cliente_nombre || '-'}</span>
                </div>
            </div>

            {/* Middle Section: Mold Info */}
            <div className="w-[150px] flex flex-col justify-center border-l border-r border-gray-50 px-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-[#00bcd4] font-bold">Totales:</span>
                        <span className="font-bold">{order.moldes_totales || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-green-500 font-bold">Disponibles:</span>
                        <span className="font-bold">{order.moldes_disponibles || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-orange-500 font-bold">En uso:</span>
                        <span className="font-bold">{order.moldes_en_uso || 0}</span>
                    </div>
                </div>
            </div>

            {/* Right Section: Stats Grid */}
            <div className="flex-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                {/* Main Stats */}
                <div className={`flex flex-col border rounded p-1 min-w-[70px] ${
                    isExcedido ? 'border-red-400 bg-red-100/80 text-red-700' : 'border-[#00bcd4]/20 bg-[#00bcd4]/5'
                }`}>
                    <span className="text-[8px] font-bold text-center uppercase">CANTIDAD</span>
                    <span className="text-sm font-black text-center">{cantidadTotal}</span>
                </div>
                <div className="flex flex-col border border-[#ff9800]/20 rounded p-1 min-w-[70px] bg-[#ff9800]/5">
                    <span className="text-[8px] font-bold text-[#ff9800] text-center">PROGRAMADO</span>
                    <span className="text-sm font-black text-center">{programadoCalculado}</span>
                </div>

                {/* Stages */}
                {displayStages.map((stage, i) => (
                    <div key={i} className="flex flex-col border border-gray-100 rounded p-1 min-w-[70px] bg-gray-50/30">
                        <span className={`text-[8px] font-bold ${stage.color} text-center uppercase`}>{stage.label}</span>
                        <span className="text-sm font-black text-center">{stage.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
