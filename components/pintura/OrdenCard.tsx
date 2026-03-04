import React from 'react'
import { OrdenFabricacion } from '@/types/pintura'
import { Box, Clipboard, Users } from 'lucide-react'

interface OrdenCardProps {
    orden: OrdenFabricacion
    isActive: boolean
    onClick: () => void
}

// Helper to render a small metric box within the card
const MiniMetric = ({ label, value, color }: { label: string, value: number, color?: string }) => (
    <div className={`flex flex-col items-center justify-center p-1 border rounded min-w-[70px] ${color || 'border-gray-200'}`}>
        <span className="text-[10px] font-bold text-gray-900 uppercase">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
)

export default function OrdenCard({ orden, isActive, onClick }: OrdenCardProps) {

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-2 rounded-lg border-2 transition-all flex border-gray-300 ${isActive
                ? 'bg-cyan-100/50 border-cyan-400'
                : 'bg-white hover:bg-gray-50'
                }`}
        >
            {/* Left Section: Basic Info */}
            <div className="w-1/4 pr-2 border-r border-gray-300 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-1 text-cyan-600 mb-1">
                        <Clipboard size={14} />
                        <span className="text-xs font-bold text-gray-900">OF: {orden.orden_fabricacion}</span>
                        <span className="bg-blue-200 text-blue-800 text-[10px] px-1 rounded font-bold ml-auto">ENSAYO</span>
                    </div>
                    <div className="text-[11px] font-bold text-cyan-600">Pedido: {orden.pedido}</div>
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-1">{orden.producto_descripcion}</div>
                </div>
                <div className="flex items-center gap-1 text-cyan-500 mt-auto">
                    <Users size={12} />
                    <span className="text-[11px] font-bold">Cliente: {orden.cliente || orden.cliente_nombre}</span>
                </div>
            </div>

            {/* Middle Section: Mold Status */}
            <div className="w-1/5 px-3 border-r border-gray-300 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold">
                    <div className="text-cyan-600">Totales: <span className="text-gray-900">0</span></div>
                    <div className="text-red-500">En reparación: <span className="text-gray-900">0</span></div>
                    <div className="text-green-600">Disponibles: <span className="text-gray-900">0</span></div>
                    <div className="text-orange-600">En fabricación: <span className="text-gray-900">0</span></div>
                    <div className="text-yellow-600">En uso: <span className="text-gray-900">0</span></div>
                </div>
            </div>

            {/* Right Section: Process Grid */}
            <div className="flex-1 pl-3 grid grid-cols-8 gap-1">
                <MiniMetric label="Cantidad" value={orden.cantidad || orden.cantidad_programada} color="bg-cyan-50 border-cyan-200" />
                <MiniMetric label="Pintura" value={0} />
                <MiniMetric label="Desgelcada" value={0} />
                <MiniMetric label="Pulido" value={0} />
                <MiniMetric label="Reparación" value={0} />
                <MiniMetric label="Saldo" value={0} />
                <MiniMetric label="Empaque" value={0} />
                <MiniMetric label="Transito" value={0} />

                <MiniMetric label="Programado" value={orden.programado || 0} color="bg-orange-50 border-orange-200" />
                <MiniMetric label="Vaciado" value={0} />
                <MiniMetric label="Estanteria" value={0} />
                <MiniMetric label="Acabado" value={0} />
                <MiniMetric label="Rep. Larga" value={0} />
                <MiniMetric label="Destrucción" value={0} />
                <MiniMetric label="Digitado" value={0} />
                <MiniMetric label="CEDI" value={0} color="bg-cyan-50 border-cyan-200" />
            </div>
        </button>
    )
}

