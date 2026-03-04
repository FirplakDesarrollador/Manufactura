'use client'

import React from 'react'
import { OrdenFabricacionDetalle } from "@/lib/supabase/queries/dashboard"

interface OrderCardProps {
    order: OrdenFabricacionDetalle
}

export function OrderCard({ order }: OrderCardProps) {

    const stages = [
        { label: 'PINTURA', value: order.pintura, color: 'text-[#009688]' },
        { label: 'DESGELCADA', value: order.desgelcada, color: 'text-[#e91e63]' },
        { label: 'PULIDO', value: order.pulido, color: 'text-[#2196f3]' },
        { label: 'REPARACION', value: order.reparacion, color: 'text-[#2196f3]' },
        { label: 'SALDO', value: order.saldo, color: 'text-[#2196f3]' },
        { label: 'EMPAQUE', value: order.empaque, color: 'text-[#2196f3]' },
        { label: 'TRANSITO', value: order.transito, color: 'text-[#2196f3]' },
        { label: 'DIGITADO', value: order.digitado, color: 'text-[#2196f3]' },
        { label: 'CEDI', value: order.cedi, color: 'text-[#254153]' },
    ]

    const secondaryStages = [
        { label: 'VACIADO', value: order.vaciado, color: 'text-[#254153]' },
        { label: 'ESTANTERIA', value: order.estanteria, color: 'text-[#254153]' },
        { label: 'ACABADO', value: order.acabado, color: 'text-[#254153]' },
        { label: 'REP. LARGA', value: order.reparacion_larga, color: 'text-[#254153]' },
        { label: 'DESTRUCCION', value: order.destruccion, color: 'text-[#254153]' },
        { label: 'DIGITADO', value: order.digitado, color: 'text-[#254153]' },
        { label: 'CEDI', value: order.cedi, color: 'text-[#254153]' },
    ]

    return (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 mb-3 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow">
            {/* Left Section: Order Info */}
            <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[#254153]">OF: {order.orden_fabricacion}</span>
                    {order.ensayo && (
                        <span className="bg-[#2196f3] text-white text-[10px] px-2 py-0.5 rounded font-black uppercase">ENSAYO</span>
                    )}
                </div>
                <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-tight">Pedido: {order.numero_pedido}</p>
                    <p className="text-[11px] text-[#254153] leading-tight mt-1">{order.producto_descripcion}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-gray-400">👤 Cliente: {order.cliente}</span>
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
                <div className="flex flex-col border border-[#00bcd4]/20 rounded p-1 min-w-[70px] bg-[#00bcd4]/5">
                    <span className="text-[8px] font-bold text-[#00bcd4] text-center">CANTIDAD</span>
                    <span className="text-sm font-black text-center">{order.cantidad}</span>
                </div>
                <div className="flex flex-col border border-[#ff9800]/20 rounded p-1 min-w-[70px] bg-[#ff9800]/5">
                    <span className="text-[8px] font-bold text-[#ff9800] text-center">PROGRAMADO</span>
                    <span className="text-sm font-black text-center">{order.programado}</span>
                </div>

                {/* Stages */}
                {[...stages, ...secondaryStages.slice(0, 5)].map((stage, i) => (
                    <div key={i} className="flex flex-col border border-gray-100 rounded p-1 min-w-[70px] bg-gray-50/30">
                        <span className={`text-[8px] font-bold ${stage.color} text-center uppercase`}>{stage.label}</span>
                        <span className="text-sm font-black text-center">{stage.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
