'use client'
import { parseDBTimestamp } from '@/lib/utils/date';

import React, { useState } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarVaciado, registrarDesgelcado } from '@/lib/supabase/queries/fibra_vaciado'
import OrdenCard from '@/components/pintura/OrdenCard'
import { Layers, CheckCircle, Clock, AlertTriangle, X, Scale } from 'lucide-react'

interface RegistroVaciadoCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Misma tarjeta de orden que Pintura (OrdenCard) + franja de la pieza: serial, fecha de pintura, masa teórica y acciones
export default function RegistroVaciadoCard({ registro, orden, moldes, usuarioEmail, onRefresh }: RegistroVaciadoCardProps) {
    const [loading, setLoading] = useState(false)
    const [confirmingDesgelcar, setConfirmingDesgelcar] = useState(false)

    const handleRegister = async () => {
        setLoading(true)
        try {
            await registrarVaciado(registro.registrer || '', usuarioEmail)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el vaciado.')
        } finally {
            setLoading(false)
        }
    }

    const handleDesgelcar = async () => {
        setLoading(true)
        try {
            await registrarDesgelcado(registro.registrer || '', usuarioEmail)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el desgelcado.')
        } finally {
            setLoading(false)
            setConfirmingDesgelcar(false)
        }
    }

    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
            {orden ? (
                // La tarjeta de la orden solo informa: sin borde propio ni selección
                <div className="[&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none [&>button]:cursor-default [&>button:hover]:bg-white">
                    <OrdenCard orden={orden} isActive={false} onClick={() => { }} moldes={moldes} />
                </div>
            ) : (
                <div className="p-3 text-xs">
                    <div className="font-bold text-gray-900">OF: {registro.orden_fabricacion}</div>
                    <div className="text-[11px] font-bold text-gray-800 mt-1">{registro.producto_descripcion || registro.producto_sku}</div>
                    <div className="mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> La OF no está en las órdenes de fabricación FV cargadas
                    </div>
                </div>
            )}

            {/* Pieza a vaciar */}
            <div className="border-t-2 border-gray-200 bg-amber-50/40 px-3 py-2 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-amber-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black leading-none">Serial</p>
                            <p className="text-lg font-black text-amber-700 leading-tight">{registro.molde_serial}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black leading-none">Fecha pintura</p>
                            <p className="text-xs font-bold text-gray-900 leading-tight mt-0.5">
                                {registro.pintura_fecha ? parseDBTimestamp(registro.pintura_fecha).toLocaleString('es-CO') : '—'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Scale size={16} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black leading-none">Masa teórica</p>
                            <p className="text-xs font-bold text-gray-900 leading-tight mt-0.5">
                                {registro.molde_masa_teorica ? `${Number(registro.molde_masa_teorica).toFixed(2)} Kg` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 shrink-0">
                    {!confirmingDesgelcar ? (
                        <>
                            <button
                                onClick={handleRegister}
                                disabled={loading}
                                className="h-9 px-4 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <CheckCircle size={16} />}
                                Registrar vaciado
                            </button>
                            <button
                                onClick={() => setConfirmingDesgelcar(true)}
                                disabled={loading}
                                className="h-9 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <AlertTriangle size={16} />
                                Desgelcar pieza
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleDesgelcar}
                                disabled={loading}
                                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <AlertTriangle size={16} />}
                                ¿Está seguro de desgelcar?
                            </button>
                            <button
                                onClick={() => setConfirmingDesgelcar(false)}
                                disabled={loading}
                                className="h-9 px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <X size={14} />
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
