'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { registrarDigitado, reversarDigitado } from '@/lib/supabase/queries/digitado'
import { Keyboard, Send, Eraser, Loader2 } from 'lucide-react'

interface RegistroDigitadoCardProps {
    registro: RegistroTrazabilidad
    usuarioEmail: string
    onRefresh: () => void
    verReversar?: boolean
}

export default function RegistroDigitadoCard({ registro, usuarioEmail, onRefresh, verReversar = false }: RegistroDigitadoCardProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!confirm(`¿Desea completar el digitado de esta pieza y moverla a Tránsito?`)) return

        setLoading(true)
        try {
            await registrarDigitado(registro.id, usuarioEmail)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el digitado.')
        } finally {
            setLoading(false)
        }
    }

    const handleReversar = async () => {
        if (!confirm('¿Desea reversar esta pieza al estado anterior?')) return
        setLoading(true)
        try {
            if (registro.estado === 'Cedi') {
                const { reversarCedi } = await import('@/lib/supabase/queries/cedi')
                await reversarCedi(registro.id)
            } else {
                await reversarDigitado(registro.id)
            }
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al reversar.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all border-l-8 border-l-blue-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    {/* Header: Description and Dates */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <Keyboard size={24} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Serial: {registro.molde_serial}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Estado: {registro.estado}</span>
                            </div>
                        </div>
                    </div>

                    {/* Highly Legible Numbers Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orden Fabricación</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">{registro.orden_fabricacion}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Número Pedido</p>
                            <p className="text-3xl font-black text-blue-600 tracking-tighter">{registro.pedido || registro.numero_pedido}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Serial / Molde</p>
                            <p className="text-3xl font-black text-orange-600 tracking-tighter">{registro.molde_serial}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 min-w-[200px]">
                    {!verReversar ? (
                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            Enviar a Tránsito
                        </button>
                    ) : (
                        <button
                            onClick={handleReversar}
                            disabled={loading}
                            className="bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Eraser size={24} />}
                            Reversar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
