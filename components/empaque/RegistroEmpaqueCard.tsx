'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarEmpaque } from '@/lib/supabase/queries/empaque'
import { Hash, Layers, Clock, PackageCheck, Send, Info } from 'lucide-react'

interface RegistroEmpaqueCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroEmpaqueCard({ registro, usuarioEmail, onRefresh }: RegistroEmpaqueCardProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!confirm('¿Desea registrar el empaque de esta pieza?')) return

        setLoading(true)
        try {
            await registrarEmpaque(registro.id, usuarioEmail)
            alert('¡Empaque registrado exitosamente!')
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el empaque.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all border-l-8 border-l-emerald-500">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-6">
                        <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-700 shrink-0">
                            <PackageCheck size={32} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm uppercase font-bold text-slate-400 tracking-widest">Producto / Pieza</p>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Clock size={16} className="text-slate-400" />
                                <p className="text-sm font-bold text-slate-400">
                                    Finalizado: {new Date(registro.acabado_fecha || '').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-emerald-600">
                                <Hash size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none">OF:</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{registro.orden_fabricacion}</p>
                                <div className="mt-3">
                                    <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none"># Pedido:</p>
                                    <p className="text-xl font-black text-emerald-600 mt-1">{registro.pedido || registro.numero_pedido}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-emerald-600">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Serial / Molde:</p>
                                <p className="text-3xl font-black text-emerald-600 tracking-tight">{registro.molde_serial}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-emerald-600">
                                <Info size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none mb-1">SKU:</p>
                                <p className="text-lg font-bold text-slate-700">{registro.producto_sku}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="pt-6 2xl:pt-0 shrink-0">
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full 2xl:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-emerald-200 active:scale-95 transition-all disabled:bg-slate-300 uppercase tracking-widest"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-7 w-7 border-3 border-white/30 border-t-white" />
                        ) : (
                            <Send size={28} />
                        )}
                        Registrar Empaque
                    </button>
                </div>
            </div>
        </div>
    )
}
