'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarAccionReparacion } from '@/lib/supabase/queries/reparacion'
import { Hash, Layers, Clock, Wrench, Send, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'

interface RegistroReparacionCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroReparacionCard({ registro, usuarioEmail, onRefresh }: RegistroReparacionCardProps) {
    const [loading, setLoading] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState('')

    // Determinamos las opciones de estado basadas en el estado actual del registro
    const isDestruccion = registro.estado === 'Destruccion'
    const isSaldo = registro.estado === 'Saldo'
    const isReparacion = registro.estado?.startsWith('Reparacion')

    const handleRegister = async () => {
        if (!selectedStatus) {
            alert('Por favor, seleccione un estado de destino.')
            return
        }

        if (!confirm(`¿Desea mover esta pieza a "${selectedStatus}"?`)) return

        setLoading(true)
        try {
            await registrarAccionReparacion(registro.id, usuarioEmail, selectedStatus)
            alert('¡Pieza movida exitosamente!')
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el movimiento.')
        } finally {
            setLoading(false)
        }
    }

    const getIcon = () => {
        if (isDestruccion) return <Trash2 size={32} />
        if (isSaldo) return <div className="text-2xl font-black">$</div>
        return <Wrench size={32} />
    }

    const getIconColor = () => {
        if (isDestruccion) return 'bg-red-100 text-red-600'
        if (isSaldo) return 'bg-amber-100 text-amber-600'
        return 'bg-orange-100 text-orange-600'
    }

    const getBorderColor = () => {
        if (isDestruccion) return 'border-l-red-500'
        if (isSaldo) return 'border-l-amber-500'
        return 'border-l-orange-500'
    }

    return (
        <div className={`bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all border-l-8 ${getBorderColor()}`}>
            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-6">
                        <div className={`p-4 rounded-2xl shrink-0 ${getIconColor()}`}>
                            {getIcon()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm uppercase font-bold text-slate-400 tracking-widest">Producto / Pieza</p>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Clock size={16} className="text-slate-400" />
                                <p className="text-sm font-bold text-slate-400">
                                    Vaciado: {new Date(registro.pintura_fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-slate-600">
                                <Hash size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none">OF:</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{registro.orden_fabricacion}</p>
                                <div className="mt-3">
                                    <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none"># Pedido:</p>
                                    <p className="text-xl font-black text-orange-600 mt-1">{registro.pedido || registro.numero_pedido}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-slate-600">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Serial / Molde:</p>
                                <p className="text-3xl font-black text-orange-600 tracking-tight">{registro.molde_serial}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="pt-6 2xl:pt-0 shrink-0 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="relative min-w-[240px]">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className={`w-full appearance-none bg-slate-50 border-2 ${selectedStatus ? 'border-orange-500 bg-white' : 'border-slate-200'} rounded-2xl px-6 py-5 pr-12 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-100 transition-all cursor-pointer text-lg`}
                        >
                            <option value="">Seleccione estado...</option>
                            {isReparacion && (
                                <>
                                    <option value="Acabado">Liberar a Acabado</option>
                                    <option value="Saldo">Mover a Saldo</option>
                                    <option value="Destruccion">Mover a Destrucción</option>
                                </>
                            )}
                            {isSaldo && (
                                <>
                                    <option value="Empaque">Liberar a Empaque</option>
                                    <option value="Reparacion">Volver a Reparación</option>
                                    <option value="Destruccion">Mover a Destrucción</option>
                                </>
                            )}
                            {isDestruccion && (
                                <>
                                    <option value="Saldo">Recuperar como Saldo</option>
                                    <option value="Reparacion">Intentar Reparación</option>
                                </>
                            )}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                            <ChevronRight size={24} className="rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={loading || !selectedStatus}
                        className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 uppercase tracking-widest ${selectedStatus
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-7 w-7 border-3 border-white/30 border-t-white" />
                        ) : (
                            <Send size={28} />
                        )}
                        Procesar
                    </button>
                </div>
            </div>
        </div>
    )
}
