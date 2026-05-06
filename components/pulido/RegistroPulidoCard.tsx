'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarPulido } from '@/lib/supabase/queries/pulido'
import { Package, Hash, Layers, Info, CheckCircle, Clock, Sparkles, ChevronRight, AlertCircle, Send } from 'lucide-react'

interface RegistroPulidoCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroPulidoCard({ registro, usuarioEmail, onRefresh }: RegistroPulidoCardProps) {
    const [loading, setLoading] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState('')

    const handleRegister = async () => {
        if (!selectedStatus) {
            alert('Por favor, seleccione un estado de destino.')
            return
        }

        setLoading(true)
        try {
            await registrarPulido(registro.id, usuarioEmail, selectedStatus)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el movimiento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-xl p-2 shadow-sm hover:shadow-md transition-all border-l-2 border-l-cyan-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex-1 space-y-2">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-2">
                        <div className="bg-cyan-100 p-1.5 rounded-lg text-cyan-700 shrink-0">
                            <Sparkles size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">PRODUCTO</p>
                            <h3 className="text-sm font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={12} className="text-slate-400" />
                                <p className="text-[10px] font-bold text-slate-400">
                                    {new Date(registro.pintura_fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5 pb-1">
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-50 p-1.5 rounded text-cyan-600">
                                <Hash size={14} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-black">OF:</span>
                                    <span className="text-xs font-black text-slate-800">{registro.orden_fabricacion}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-black uppercase">PEDIDO:</span>
                                    <span className="text-xs font-black text-cyan-600">{registro.pedido || registro.numero_pedido}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-50 p-1.5 rounded text-cyan-600">
                                <Layers size={14} />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-slate-400 font-black">SERIAL:</span>
                                <span className="text-base font-black text-cyan-600 tracking-tight">{registro.molde_serial}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Triage Action Section */}
                <div className="pt-2 xl:pt-0 shrink-0 flex flex-row items-center gap-2">
                    <div className="relative min-w-[150px]">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className={`w-full appearance-none bg-slate-50 border-2 ${selectedStatus ? 'border-cyan-500 bg-white' : 'border-slate-200'} rounded-lg px-2 py-1 pr-6 font-bold text-slate-700 outline-none transition-all cursor-pointer text-[10px]`}
                        >
                            <option value="">Seleccione estado...</option>
                            <option value="Acabado">Acabado</option>
                            <option value="Reparacion">Reparación</option>
                            <option value="Destruccion">Destrucción</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={loading || !selectedStatus}
                        className={`px-3 py-1.5 rounded-lg font-black text-[10px] flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 uppercase tracking-widest ${selectedStatus
                            ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                        ) : (
                            <Send size={14} />
                        )}
                        Mover
                    </button>
                </div>
            </div>
        </div>
    )
}
