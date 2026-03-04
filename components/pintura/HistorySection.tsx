'use client'

import React, { useEffect, useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { getRegistrosTrazabilidad } from '@/lib/supabase/queries/pintura'
import { History, Ban, Clock, Package, Hash, Layers, Info } from 'lucide-react'

export default function HistorySection() {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRegistros = async () => {
            setLoading(true)
            const data = await getRegistrosTrazabilidad()
            setRegistros(data)
            setLoading(false)
        }
        fetchRegistros()
    }, [])

    const canDelete = (fecha: string, estado: string) => {
        const registroDate = new Date(fecha)
        const now = new Date()
        const diffMinutes = (now.getTime() - registroDate.getTime()) / (1000 * 60)

        // Only allow deletion if less than 10 minutes and NOT "vaciado" (or other final states)
        return diffMinutes <= 10 && estado === 'Pintura'
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]"></div>
                <p className="text-gray-500 font-medium">Cargando registros...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4 pb-20">
            <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 text-center mb-6">
                <p className="text-cyan-800 text-sm font-medium">
                    Registros creados el día de hoy, solo puedes eliminar los de hace 10 minutos máximo y que no hayan sido vaciados.
                </p>
                <p className="text-cyan-600 text-[11px] mt-1">
                    Piezas en pintura: {registros.filter(r => r.estado === 'Pintura').length}
                </p>
            </div>

            <div className="space-y-2">
                {registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <History size={48} className="text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">No hay registros hoy</p>
                    </div>
                ) : (
                    registros.map((registro, idx) => (
                        <div key={idx} className="bg-white rounded-lg border-2 border-gray-200 p-3 shadow-sm hover:shadow-md transition-all flex flex-wrap md:flex-nowrap gap-4 items-center">
                            {/* Product & Order Info */}
                            <div className="flex-1 min-w-[200px]">
                                <h3 className="text-[13px] font-bold text-cyan-600 uppercase leading-snug">
                                    {registro.producto_descripcion}
                                </h3>
                                <div className="flex gap-4 mt-1 text-[11px] font-bold">
                                    <div className="flex items-center gap-1">
                                        <Hash size={12} className="text-gray-400" />
                                        <span className="text-cyan-600">OF: {registro.orden_fabricacion}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Package size={12} className="text-gray-400" />
                                        <span className="text-cyan-600">Pedido: {registro.numero_pedido}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mold Info */}
                            <div className="w-1/4 min-w-[150px] border-l border-gray-100 pl-4 bg-gray-50/50 p-2 rounded">
                                <span className="text-[10px] uppercase font-bold text-cyan-500 block mb-1">MOLDE {registro.molde_descripcion}</span>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-gray-700">Serial: {registro.serial}</span>
                                    <div className="flex items-center gap-1">
                                        <Layers size={10} className="text-gray-400" />
                                        <span className="text-[11px] font-bold text-gray-700">Línea {registro.linea?.replace('Linea ', '')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamp & Process */}
                            <div className="w-1/5 min-w-[150px] border-l border-gray-100 pl-4 text-center">
                                <div className="text-[10px] text-gray-500 font-bold mb-1">
                                    Pintado: {new Date(registro.pintura_fecha).toLocaleString('es-ES', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </div>
                                <div className={`inline-block px-3 py-1 rounded text-[11px] font-bold uppercase ${registro.estado === 'Pintura' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {registro.estado}
                                </div>
                            </div>

                            {/* Delete Action (matching screenshot requirement) */}
                            <div className="w-[120px] border-l border-gray-100 pl-4 flex flex-col items-center justify-center">
                                {!canDelete(registro.pintura_fecha, registro.estado) ? (
                                    <div className="flex flex-col items-center text-center opacity-60">
                                        <Ban size={24} className="text-red-500 mb-1" />
                                        <span className="text-[10px] font-bold text-red-500 leading-tight">Ya no puedes eliminar este registro</span>
                                    </div>
                                ) : (
                                    <button className="flex flex-col items-center hover:opacity-80 text-red-600">
                                        <Ban size={24} className="mb-1" />
                                        <span className="text-[10px] font-bold leading-tight underline">Eliminar registro</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
