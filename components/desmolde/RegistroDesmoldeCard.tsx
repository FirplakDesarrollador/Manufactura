'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarDesmolde } from '@/lib/supabase/queries/desmolde'
import { Package, Hash, Layers, Info, CheckCircle, Clock } from 'lucide-react'

interface RegistroDesmoldeCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroDesmoldeCard({ registro, usuarioEmail, onRefresh }: RegistroDesmoldeCardProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!confirm('¿Desea registrar el desmolde para esta pieza?')) return

        setLoading(true)
        try {
            await registrarDesmolde(registro.id, usuarioEmail)
            alert('¡Desmolde registrado exitosamente!')
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el desmolde.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div className="flex-1 space-y-6">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-6">
                        <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-700 shrink-0">
                            <Package size={32} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm uppercase font-bold text-slate-400 tracking-widest">Producto / Pieza</p>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-indigo-600">
                                <Hash size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none">OF:</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{registro.orden_fabricacion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-indigo-600">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Serial / Molde:</p>
                                <p className="text-3xl font-black text-indigo-600 tracking-tight">{registro.molde_serial}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-indigo-600">
                                <Info size={22} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-black tracking-tighter">Molde Desc.</p>
                                <p className="text-lg font-bold text-slate-900 truncate max-w-[200px]" title={registro.molde_descripcion}>
                                    {registro.molde_descripcion}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl text-indigo-600">
                                <Clock size={22} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-black tracking-tighter">Fecha Vaciado</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {new Date(registro.pintura_fecha).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-6 xl:pt-0 shrink-0">
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full xl:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 rounded-2xl font-black text-base flex items-center justify-center gap-4 shadow-xl hover:shadow-indigo-900/20 active:scale-95 transition-all disabled:bg-slate-400 uppercase tracking-widest"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-7 w-7 border-3 border-white/30 border-t-white" />
                        ) : (
                            <CheckCircle size={28} />
                        )}
                        REGISTRAR DESMOLDE
                    </button>
                </div>
            </div>
        </div>
    )
}
