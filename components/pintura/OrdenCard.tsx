import { parseDBDate } from '@/lib/utils/date';
import React from 'react'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { Box, Clipboard, Users, AlertTriangle } from 'lucide-react'

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

    const cantidadTotal = Math.max(0, orden.cantidad || orden.cantidad_programada || 0)

    // Sum of all stage counts
    const sumEtapas = (orden.pintura || 0) +
        (orden.pulido || 0) +
        (orden.reparacion || 0) +
        (orden.saldo || 0) +
        (orden.empaque || 0) +
        (orden.transito || 0) +
        (orden.vaciado || 0) +
        (orden.estanteria || 0) +
        (orden.acabado || 0) +
        (orden.reparacion_larga || 0) +
        (orden.digitado || 0) +
        (orden.cedi || 0)

    const isExcedido = cantidadTotal > 0 && sumEtapas > cantidadTotal
    const programadoCalculado = Math.max(0, cantidadTotal - sumEtapas)

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all flex flex-col md:flex-row gap-3 md:gap-0 relative ${isExcedido
                ? 'bg-red-50/30 border-red-500 ring-4 ring-red-500/20 shadow-md'
                : isActive
                ? 'bg-cyan-100 border-cyan-500 ring-4 ring-cyan-500/20 shadow-md'
                : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
        >
            {isExcedido && (
                <div className="absolute -top-2.5 right-4 bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 z-10">
                    <AlertTriangle size={12} />
                    ¡Alerta: Suma en etapas ({sumEtapas}) excede cantidad ({cantidadTotal})!
                </div>
            )}
            {/* Left Section: Basic Info */}
            <div className="w-full md:w-1/4 md:pr-2 md:border-r border-gray-300 flex flex-col justify-between overflow-hidden">
                <div className="overflow-hidden">
                    <div className="flex items-center gap-1 text-cyan-600 mb-1">
                        <Clipboard size={14} className="shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">OF: {orden.orden_fabricacion}</span>

                    </div>
                    <div className="text-[11px] font-bold text-cyan-600 truncate">Pedido: {orden.pedido || orden.numero_pedido || 'Sin pedido'}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {orden.fecha_ideal_produccion && (
                            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block">
                                📅 Ideal: {parseDBDate(orden.fecha_ideal_produccion).toLocaleDateString('es-ES')}
                            </div>
                        )}
                        {orden.fecha_entrega_estimada && (
                            <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded inline-block">
                                📦 Entrega: {parseDBDate(orden.fecha_entrega_estimada).toLocaleDateString('es-ES')}
                            </div>
                        )}
                    </div>
                    <div className="text-[11px] font-bold text-gray-800 mt-1 line-clamp-2 leading-tight" title={orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku}>
                        {orden.producto_descripcion || orden.molde_descripcion || orden.producto_sku || 'Sin descripción'}
                    </div>
                    <div className="text-[9px] text-gray-400 italic mt-0.5 truncate">SKU: {sku || 'No definido'}</div>
                </div>
                <div className="flex items-center gap-1 text-cyan-500 mt-2 md:mt-auto">
                    <Users size={12} className="shrink-0" />
                    <span className="text-[11px] font-bold truncate">Cliente: {orden.cliente || orden.cliente_nombre || 'No registrado'}</span>
                </div>
            </div>

            {/* Middle Section: Mold Status */}
            <div className="w-full md:w-1/5 md:px-3 md:border-r border-gray-300 flex flex-col justify-center bg-gray-50 md:bg-transparent p-2 md:p-0 rounded">
                <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold">
                    <div className="text-cyan-600">Totales: <span className="text-gray-900">{orden.moldes_totales || relevantMoldes.length}</span></div>
                    <div className="text-red-500">Reparación: <span className="text-gray-900">{orden.moldes_en_reparacion || enReparacion}</span></div>
                    <div className="text-green-600">Disponibles: <span className="text-gray-900">{orden.moldes_disponibles || disponibles}</span></div>
                    <div className="text-orange-600">Fabricación: <span className="text-gray-900">{orden.moldes_en_fabricacion || 0}</span></div>
                    <div className="text-yellow-600">En uso: <span className="text-gray-900">{orden.moldes_en_uso || enUso}</span></div>
                </div>
            </div>

            {/* Right Section: Process Grid */}
            <div className="flex-1 md:pl-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
                <MiniMetric label="Cantidad" value={cantidadTotal} color={isExcedido ? "bg-red-100 border-red-400 text-red-700" : "bg-cyan-50 border-cyan-200"} />
                <MiniMetric label="Pintura" value={Math.max(0, orden.pintura || 0)} />
                <MiniMetric label="Desgelcada" value={Math.max(0, orden.desgelcada || 0)} />
                <MiniMetric label="Pulido" value={Math.max(0, orden.pulido || 0)} />
                <MiniMetric label="Reparación" value={Math.max(0, orden.reparacion || 0)} />
                <MiniMetric label="Saldo" value={Math.max(0, orden.saldo || 0)} />
                <MiniMetric label="Empaque" value={Math.max(0, orden.empaque || 0)} />
                <MiniMetric label="Transito" value={Math.max(0, orden.transito || 0)} />

                <MiniMetric label="Programado" value={programadoCalculado} color="bg-orange-50 border-orange-200" />
                <MiniMetric label="Vaciado" value={Math.max(0, orden.vaciado || 0)} />
                <MiniMetric label="Estanteria" value={Math.max(0, orden.estanteria || 0)} />
                <MiniMetric label="Acabado" value={Math.max(0, orden.acabado || 0)} />
                <MiniMetric label="Rep. Larga" value={Math.max(0, orden.reparacion_larga || 0)} />
                <MiniMetric label="Destrucción" value={Math.max(0, orden.destruccion || 0)} />
                <MiniMetric label="Digitado" value={Math.max(0, orden.digitado || 0)} />
                <MiniMetric label="CEDI" value={Math.max(0, orden.cedi || 0)} color="bg-cyan-50 border-cyan-200" />
            </div>
        </button>
    )
}
