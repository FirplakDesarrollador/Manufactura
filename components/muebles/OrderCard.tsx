'use client'

import React from 'react'
import { OrdenMueble } from '@/types/muebles'
import { FileText, Calendar, Package, User, AlertCircle, TrendingUp, Truck, CheckCircle, Info } from 'lucide-react'
import { format, isBefore, isToday, parseISO } from 'date-fns'

interface OrderCardProps {
    orden: OrdenMueble
    isActive: boolean
    onClick: () => void
    proceso?: string // 'Corte', 'Enchape', etc.
}

export default function OrderCard({ orden, isActive, onClick, proceso = 'Corte' }: OrderCardProps) {
    const deliveryDate = orden.fecha_entrega_estimada ? parseISO(orden.fecha_entrega_estimada) : null
    const creationDate = orden.created_at ? parseISO(orden.created_at) : null
    
    const getDeliveryColor = () => {
        if (!deliveryDate) return 'bg-gray-100 text-gray-500'
        if (isToday(deliveryDate)) return 'bg-amber-100 text-amber-700 border-amber-200'
        if (isBefore(deliveryDate, new Date())) return 'bg-red-100 text-red-700 border-red-200'
        return 'bg-blue-50 text-blue-600 border-blue-100'
    }

    const reposicionCount = () => {
        if (proceso === 'Corte') return orden.reponer_corte || 0
        if (proceso === 'Enchape') return orden.reponer_enchape || 0
        if (proceso === 'Inspeccion') return orden.reponer_inspeccion || 0
        return 0
    }

    const currentReposiciones = reposicionCount()

    return (
        <div 
            onClick={onClick}
            className={`w-full bg-white rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col ${
                isActive 
                    ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
        >
            {/* Process Badge / Status indicator */}
            {currentReposiciones > 0 && (
                <div className="absolute top-0 right-0 z-10">
                    <div className="bg-red-600 text-white px-3 py-1 rounded-bl-xl font-bold text-xs flex items-center gap-1 shadow-sm">
                        <AlertCircle size={14} />
                        REPOSICIÓN: {currentReposiciones}
                    </div>
                </div>
            )}

            <div className="p-4 flex flex-wrap gap-4 items-center justify-between">
                {/* Column 1: Identificación */}
                <div className="w-full sm:w-[275px] space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span className="font-bold text-gray-900 text-sm">OF: {orden.orden_fabricacion}</span>
                        {orden.ensayo && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Ensayo
                            </span>
                        )}
                    </div>
                    <div className="text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                            <span className="text-gray-500 font-medium uppercase text-[10px]">Liberación:</span>
                            <span className="text-gray-900 font-semibold">{creationDate ? format(creationDate, 'dd/MM/yyyy') : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-blue-600 font-bold">Pedido:</span>
                            <span className="text-gray-700">{orden.numero_pedido}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <User size={12} className="text-blue-600" />
                            <span className="text-gray-500">Cliente:</span>
                            <span className="text-gray-900 font-medium truncate max-w-[180px]">{orden.cliente}</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block h-24 w-px bg-gray-100" />

                {/* Column 2: Producto & Entrega */}
                <div className="w-full sm:w-[275px] space-y-2">
                    <div className="h-10">
                        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight text-center">
                            {orden.producto_descripcion}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-500 italic">SKU: {orden.producto_sku}</span>
                        <span className="text-red-500 font-bold uppercase">{orden.planta}</span>
                    </div>
                    <div className={`flex items-center justify-center gap-2 py-1.5 rounded-lg border px-3 mt-1 ${getDeliveryColor()}`}>
                        <Calendar size={14} />
                        <span className="text-[11px] font-bold">ENTREGA: {deliveryDate ? format(deliveryDate, 'dd/MM/yyyy') : 'PENDIENTE'}</span>
                    </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block h-24 w-px bg-gray-100" />

                {/* Column 3: Cantidad & Pendiente */}
                <div className="w-full lg:flex-1 grid grid-cols-2 gap-2">
                    {/* Cantidad Grid */}
                    <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
                        <div className="bg-blue-600 text-white text-[10px] font-bold text-center py-0.5 uppercase">Cant. Programada</div>
                        <div className="grid grid-cols-2 p-2 gap-1 text-center">
                            <div>
                                <div className="text-[9px] text-blue-600 font-bold uppercase">Muebles</div>
                                <div className="text-sm font-bold text-gray-900">{orden.cantidad}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-blue-600 font-bold uppercase">Piezas</div>
                                <div className="text-sm font-bold text-gray-900">{orden.piezas}</div>
                            </div>
                        </div>
                    </div>

                    {/* Pendiente Grid */}
                    <div className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50/30">
                        <div className="bg-orange-500 text-white text-[10px] font-bold text-center py-0.5 uppercase tracking-wider">Pendiente</div>
                        <div className="grid grid-cols-2 p-2 gap-1 text-center divide-x divide-orange-100">
                            {(() => {
                                // Logic to define what 'Pending' means for each stage
                                let pendingMuebles = 0;
                                let pendingPiezas = 0;
                                const totalPiezas = Number(orden.piezas) || 0;
                                const programmedMuebles = orden.cantidad || 1;
                                const piezasPerMueble = totalPiezas / programmedMuebles;

                                switch (proceso) {
                                    case 'Corte':
                                        pendingMuebles = orden.por_cortar || 0;
                                        pendingPiezas = Number(orden.piezas_pendientes) || 0;
                                        break;
                                    case 'Enchape':
                                        pendingMuebles = (orden.corte || 0) + (orden.reponer_enchape || 0);
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    case 'Inspeccion':
                                        pendingMuebles = (orden.enchape || 0) + (orden.reponer_inspeccion || 0);
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    case 'Empaque':
                                        pendingMuebles = orden.inspeccion || 0;
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    case 'Digitado':
                                        pendingMuebles = orden.empaque || 0;
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    case 'Transito':
                                        pendingMuebles = orden.digitado || 0;
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    case 'CEDI':
                                        pendingMuebles = orden.transito || 0;
                                        pendingPiezas = Math.round(pendingMuebles * piezasPerMueble);
                                        break;
                                    default:
                                        pendingMuebles = orden.por_cortar || 0;
                                        pendingPiezas = Number(orden.piezas_pendientes) || 0;
                                }

                                return (
                                    <>
                                        <div>
                                            <div className="text-[9px] text-orange-600 font-bold uppercase">Muebles</div>
                                            <div className="text-sm font-bold text-gray-900">{pendingMuebles}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-orange-600 font-bold uppercase">Piezas</div>
                                            <div className="text-sm font-bold text-gray-900">{pendingPiezas}</div>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Progress Timeline */}
            <div className="bg-gray-50 border-t border-gray-100 p-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center justify-between min-w-[700px] gap-2">
                    {[
                        { label: 'Corte', val: orden.corte, icon: <TrendingUp size={12} />, color: 'blue' },
                        { label: 'Enchape', val: orden.enchape, icon: <TrendingUp size={12} />, color: 'blue' },
                        { label: 'Inspecc.', val: orden.inspeccion, icon: <TrendingUp size={12} />, color: 'blue' },
                        { label: 'Empaque', val: orden.empaque, icon: <Package size={12} />, color: 'blue' },
                        { label: 'Digitado', val: orden.digitado, icon: <FileText size={12} />, color: 'amber' },
                        { label: 'Transito', val: orden.transito, icon: <Truck size={12} />, color: 'amber' },
                        { label: 'Cedi', val: orden.cedi, icon: <CheckCircle size={12} />, color: 'green' },
                    ].map((step, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-center p-1 rounded border border-gray-200 bg-white">
                            <div className={`flex items-center gap-1 text-[9px] font-bold uppercase ${
                                step.color === 'blue' ? 'text-blue-600' : 
                                step.color === 'amber' ? 'text-amber-600' : 'text-green-600'
                            }`}>
                                {step.icon}
                                {step.label}
                            </div>
                            <div className="text-xs font-bold text-gray-900">{step.val}</div>
                        </div>
                    ))}
                    
                    {/* Extra: Reponer Info */}
                    <div className="flex-[0.5] flex flex-col items-center justify-center p-1 rounded border border-red-100 bg-red-50">
                        <div className="text-[8px] font-bold text-red-600 uppercase">A reponer</div>
                        <div className="text-xs font-bold text-red-700">{orden.por_reponer}</div>
                    </div>
                </div>
            </div>
            
            {/* Active Highlight line */}
            {isActive && <div className="h-1 bg-blue-500 w-full" />}
        </div>
    )
}
