'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import OrdenCard from '@/components/pintura/OrdenCard'
import { Layers, Scale, AlertTriangle } from 'lucide-react'
import TrazabilidadPiezaFibra from './TrazabilidadPiezaFibra'

// Tarjeta de una pieza en los módulos de piso FV (Vaciado, Pulido, Ensayo…): la tarjeta de la orden de Pintura
// y debajo la franja de la pieza (serial, último proceso con su trazabilidad, masa teórica) con las acciones del módulo a la derecha
interface TarjetaPiezaFibraProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    acciones: React.ReactNode
    franja?: string   // color de fondo de la franja de la pieza
}

export default function TarjetaPiezaFibra({ registro, orden, moldes, acciones, franja = 'bg-amber-50/40' }: TarjetaPiezaFibraProps) {
    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg">
            {orden ? (
                // La tarjeta de la orden solo informa: sin borde propio ni selección
                <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                    <OrdenCard planta="fv" orden={orden} isActive={false} onClick={() => { }} moldes={moldes} />
                </div>
            ) : (
                <div className="p-3 text-xs">
                    <div className="font-bold text-gray-900">OF: {registro.orden_fabricacion}</div>
                    <div className="text-[11px] font-bold text-gray-800 mt-1">{registro.producto_descripcion || registro.producto_sku}</div>
                    <div className="mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> La OF no está en las órdenes de fabricación FV cargadas
                    </div>
                </div>
            )}

            <div className={`rounded-b-md border-t-2 border-gray-200 px-3 py-2 flex flex-col lg:flex-row lg:items-center gap-3 ${franja}`}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-amber-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black leading-none">Serial</p>
                            <p className="text-lg font-black text-amber-700 leading-tight">{registro.molde_serial}</p>
                        </div>
                    </div>
                    <TrazabilidadPiezaFibra registro={registro} />
                    <div className="flex items-center gap-2">
                        <Scale size={16} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black leading-none">Masa teórica</p>
                            <p className="text-xs font-bold text-gray-900 leading-tight mt-0.5">
                                {registro.molde_masa_teorica ? `${Number(registro.molde_masa_teorica).toFixed(2)} Kg` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">{acciones}</div>
            </div>
        </div>
    )
}
