import React from 'react'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { Box, Clipboard, Users } from 'lucide-react'

interface OrdenCardProps {
    orden: OrdenFabricacion
    isActive: boolean
    onClick: () => void
    moldes: Molde[]
}

// Helper to render a small metric box within the card
const MiniMetric = ({ label, value, color }: { label: string, value: number, color?: string }) => (
    <div className={`flex flex-col items-center justify-center p-1 border rounded ${color || 'border-gray-200'}`}>
        <span className="text-[10px] font-bold text-gray-900 uppercase text-center leading-tight">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
)

export default function OrdenCard({ orden, isActive, onClick, moldes }: OrdenCardProps) {
    const sku = (orden.molde_sku || orden.producto_sku || orden.sku || '').trim()
    const relevantMoldes = moldes.filter(m => (m.molde_sku || '').trim().toLowerCase() === sku.toLowerCase())
    const disponibles = relevantMoldes.filter(m => m.estado === 'Disponible').length
    const enUso = relevantMoldes.filter(m => m.estado === 'En uso').length
    const enReparacion = relevantMoldes.filter(m => !['Disponible', 'En uso'].includes(m.estado)).length

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all flex flex-col md:flex-row gap-3 md:gap-0 ${isActive
                ? 'bg-cyan-100 border-cyan-500 ring-4 ring-cyan-500/20 shadow-md'
                : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
        >
            {/* Left Section: Basic Info */}
            <div className="w-full md:w-1/4 md:pr-2 md:border-r border-gray-300 flex flex-col justify-between overflow-hidden">
                <div className="overflow-hidden">
                    <div className="flex items-center gap-1 text-cyan-600 mb-1">
                        <Clipboard size={14} className="shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">OF: {orden.orden_fabricacion}</span>
                        <span className="bg-blue-200 text-blue-800 text-[10px] px-1 rounded font-bold ml-auto shrink-0">ENSAYO</span>
                    </div>
                    <div className="text-[11px] font-bold text-cyan-600 truncate">Pedido: {orden.pedido}</div>
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-tight h-8">{orden.producto_descripcion}</div>
                    <div className="text-[9px] text-gray-400 italic mt-1 truncate">SKU: {sku || 'No definido'}</div>
                </div>
                <div className="flex items-center gap-1 text-cyan-500 mt-2 md:mt-auto">
                    <Users size={12} className="shrink-0" />
                    <span className="text-[11px] font-bold truncate">Cliente: {orden.cliente || orden.cliente_nombre}</span>
                </div>
            </div>

            {/* Middle Section: Mold Status */}
            <div className="w-full md:w-1/5 md:px-3 md:border-r border-gray-300 flex flex-col justify-center bg-gray-50 md:bg-transparent p-2 md:p-0 rounded">
                <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold">
                    <div className="text-cyan-600">Totales: <span className="text-gray-900">{relevantMoldes.length}</span></div>
                    <div className="text-red-500">Reparación: <span className="text-gray-900">{enReparacion}</span></div>
                    <div className="text-green-600">Disponibles: <span className="text-gray-900">{disponibles}</span></div>
                    <div className="text-orange-600">Fabricación: <span className="text-gray-900">0</span></div>
                    <div className="text-yellow-600">En uso: <span className="text-gray-900">{enUso}</span></div>
                </div>
            </div>

            {/* Right Section: Process Grid */}
            <div className="flex-1 md:pl-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
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
