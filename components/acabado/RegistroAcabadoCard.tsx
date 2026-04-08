'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarAcabado } from '@/lib/supabase/queries/acabado'
import { Hash, Layers, Clock, Sparkles, Send, ChevronRight } from 'lucide-react'

interface RegistroAcabadoCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroAcabadoCard({ registro, usuarioEmail, onRefresh }: RegistroAcabadoCardProps) {
    const [loading, setLoading] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState('')

    // Determinamos las opciones de estado basadas en el estado actual
    const currentStatus = registro.estado

    const handleRegister = async () => {
        if (!selectedStatus) {
            alert('Por favor, seleccione un estado de destino.')
            return
        }

        if (!confirm(`¿Desea mover esta pieza a "${selectedStatus}"?`)) return

        setLoading(true)
        try {
            await registrarAcabado(registro.id, usuarioEmail, selectedStatus)
            alert('¡Pieza movida exitosamente!')
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el movimiento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all border-l-8 border-l-sky-500">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-6">
                        <div className="bg-sky-100 p-4 rounded-2xl text-sky-700 shrink-0">
                            <Sparkles size={32} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm uppercase font-bold text-slate-400 tracking-widest">Producto / Pieza</p>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Clock size={16} className="text-slate-400" />
                                <p className="text-sm font-bold text-slate-400">
                                    {currentStatus === 'Pulido' ? 'Pulido' : 'Acabado'}: {new Date(currentStatus === 'Pulido' ? registro.pulido_fecha! : registro.acabado_fecha!).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-sky-600">
                                <Hash size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none">OF:</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{registro.orden_fabricacion}</p>
                                <div className="mt-3">
                                    <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none"># Pedido:</p>
                                    <p className="text-xl font-black text-sky-600 mt-1">{registro.pedido || registro.numero_pedido}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-sky-600">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Serial / Molde:</p>
                                <p className="text-3xl font-black text-sky-600 tracking-tight">{registro.molde_serial}</p>
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
                            className={`w-full appearance-none bg-slate-50 border-2 ${selectedStatus ? 'border-sky-500 bg-white' : 'border-slate-200'} rounded-2xl px-6 py-5 pr-12 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-sky-100 transition-all cursor-pointer text-lg`}
                        >
                            <option value="">Seleccione estado...</option>
                            {currentStatus === 'Pulido' && <option value="Acabado">Acabado</option>}
                            {currentStatus === 'Acabado' && <option value="Estanteria">Estantería</option>}
                            <option value="Reparacion">Reparación</option>
                            <option value="Destruccion">Destrucción</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                            <ChevronRight size={24} className="rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={loading || !selectedStatus}
                        className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 uppercase tracking-widest ${selectedStatus
                            ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-7 w-7 border-3 border-white/30 border-t-white" />
                        ) : (
                            <Send size={28} />
                        )}
                        Mover
                    </button>
                </div>
            </div>
        </div>
    )
}
