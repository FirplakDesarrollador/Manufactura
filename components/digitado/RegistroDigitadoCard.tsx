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
        <div className="bg-white border-2 border-slate-100 rounded-xl p-2 shadow-sm hover:shadow-md transition-all border-l-2 border-l-blue-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {/* Header: Description and Dates */}
                    <div className="flex items-start gap-2 mb-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-100">
                            <Keyboard size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-800 leading-tight">
                                {registro.producto_descripcion.toUpperCase()}
                            </h3>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Serial: {registro.molde_serial}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Estado: {registro.estado}</span>
                            </div>
                        </div>
                    </div>

                    {/* Highly Legible Numbers Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">OF</p>
                            <p className="text-base font-black text-slate-800 tracking-tighter">{registro.orden_fabricacion}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">PEDIDO</p>
                            <p className="text-base font-black text-blue-600 tracking-tighter">{registro.pedido || registro.numero_pedido}</p>
                        </div>
                        <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">SERIAL / MOLDE</p>
                            <p className="text-base font-black text-orange-600 tracking-tighter">{registro.molde_serial}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[160px] xl:self-end pb-1 px-1">
                    {!verReversar ? (
                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <Send size={14} />}
                            Enviar a Tránsito
                        </button>
                    ) : (
                        <button
                            onClick={handleReversar}
                            disabled={loading}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <Eraser size={14} />}
                            Reversar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
