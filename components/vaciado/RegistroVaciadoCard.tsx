'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarVaciado } from '@/lib/supabase/queries/vaciado'
import { Package, Hash, Layers, Info, CheckCircle, Clock } from 'lucide-react'

interface RegistroVaciadoCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
}

export default function RegistroVaciadoCard({ registro, usuarioEmail, onRefresh }: RegistroVaciadoCardProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!confirm('¿Desea registrar el vaciado para esta pieza?')) return

        setLoading(true)
        try {
            await registrarVaciado(registro.id, usuarioEmail)
            alert('¡Vaciado registrado exitosamente!')
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el vaciado.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                    {/* Header: Product Description */}
                    <div className="flex items-start gap-5">
                        <div className="bg-amber-100 p-3 rounded-xl text-amber-700 shrink-0">
                            <Package size={28} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm uppercase font-bold text-gray-400 tracking-widest">Producto</p>
                            <h3 className="text-xl font-extrabold text-[#254153] leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                        </div>
                    </div>

                    {/* Secondary Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-50 p-2 rounded-lg text-amber-600">
                                <Hash size={22} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 uppercase font-black tracking-widest leading-none">OF:</p>
                                <p className="text-lg font-black text-gray-900 mt-0.5">{registro.orden_fabricacion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-50 p-2 rounded-lg text-amber-600">
                                <Layers size={22} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 uppercase font-black tracking-widest leading-none mb-0.5">Serial:</p>
                                <p className="text-2xl font-black text-amber-700 tracking-tight leading-none">{registro.molde_serial}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-50 p-2 rounded-lg text-amber-600">
                                <Info size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-black tracking-tighter">Línea</p>
                                <p className="text-base font-bold text-gray-900">{registro.linea}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-50 p-2 rounded-lg text-amber-600">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-black tracking-tighter">Fecha Pintura</p>
                                <p className="text-base font-bold text-gray-900">
                                    {new Date(registro.pintura_fecha).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 xl:pt-0 shrink-0">
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full xl:w-auto bg-[#254153] hover:bg-[#1a2e3b] text-white px-10 py-5 rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:shadow-amber-900/20 active:scale-95 transition-all disabled:bg-gray-400 uppercase tracking-widest"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
                        ) : (
                            <CheckCircle size={24} />
                        )}
                        REGISTRAR VACIADO
                    </button>
                </div>
            </div>
        </div>
    )
}
