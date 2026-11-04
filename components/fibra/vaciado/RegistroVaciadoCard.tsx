'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarVaciado, registrarDesgelcado } from '@/lib/supabase/queries/fibra_vaciado'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

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

    const acciones = (
        <>
        {!confirmingDesgelcar ? (
            <>
                <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="h-11 px-4 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <CheckCircle size={16} />}
                    Registrar vaciado
                </button>
                <button
                    onClick={() => setConfirmingDesgelcar(true)}
                    disabled={loading}
                    className="h-11 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
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
                    className="h-11 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <AlertTriangle size={16} />}
                    ¿Está seguro de desgelcar?
                </button>
                <button
                    onClick={() => setConfirmingDesgelcar(false)}
                    disabled={loading}
                    className="h-11 px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                    <X size={14} />
                    Cancelar
                </button>
            </>
        )}
        </>
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-amber-50/40" />
}
