'use client'
import { parseDBTimestamp } from '@/lib/utils/date'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarEnsayo } from '@/lib/supabase/queries/fibra_ensayo'
import { Hash, Layers, Clock, FlaskConical, Send } from 'lucide-react'

interface RegistroEnsayoCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroEnsayoCard({ registro, usuarioEmail, onRefresh }: RegistroEnsayoCardProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!confirm('¿Desea registrar el ensayo de esta pieza y pasarla a guacales?')) return

        setLoading(true)
        try {
            await registrarEnsayo(registro.registrer || '', usuarioEmail)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el ensayo.')
        } finally {
            setLoading(false)
        }
    }

    const fecha = registro.pulido_fecha || registro.pintura_fecha

    return (
        <div className="bg-white border-2 border-slate-100 rounded-xl p-2 shadow-sm hover:shadow-md transition-all border-l-2 border-l-violet-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                        <div className="bg-violet-100 p-1.5 rounded-lg text-violet-700 shrink-0">
                            <FlaskConical size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">PRODUCTO</p>
                            <h3 className="text-sm font-black text-slate-800 leading-tight">
                                {(registro.producto_descripcion || 'Sin descripción').toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={12} className="text-slate-400" />
                                <p className="text-[10px] font-bold text-slate-400">
                                    Pulido: {fecha ? parseDBTimestamp(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5 pb-1">
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-50 p-1.5 rounded text-violet-600">
                                <Hash size={14} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-black">OF:</span>
                                    <span className="text-xs font-black text-slate-800">{registro.orden_fabricacion}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-black uppercase">PEDIDO:</span>
                                    <span className="text-xs font-black text-violet-600">{registro.pedido || registro.numero_pedido}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-50 p-1.5 rounded text-violet-600">
                                <Layers size={14} />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-slate-400 font-black">SERIAL:</span>
                                <span className="text-base font-black text-violet-600 tracking-tight">{registro.molde_serial}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 xl:pt-0 shrink-0">
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg font-black text-[10px] flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white disabled:bg-slate-300"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                        ) : (
                            <Send size={14} />
                        )}
                        Registrar ensayo
                    </button>
                </div>
            </div>
        </div>
    )
}
