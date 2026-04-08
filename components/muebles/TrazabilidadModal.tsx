'use client'

import React, { useState, useEffect } from 'react'
import { OrdenMueble } from '@/types/muebles'
import { X, Copy, MinusSquare, PlusSquare, AlertTriangle, Send, Loader2 } from 'lucide-react'
import { registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import { toast } from 'sonner'

interface TrazabilidadModalProps {
    isOpen: boolean
    onClose: () => void
    orden: OrdenMueble
    proceso: string
    usuarioNombre: string
    turno: string
    taladro?: string
    onSuccess: () => void
}

export default function TrazabilidadModal({ 
    isOpen, 
    onClose, 
    orden, 
    proceso, 
    usuarioNombre, 
    turno,
    taladro,
    onSuccess 
}: TrazabilidadModalProps) {
    const [cantidad, setCantidad] = useState(1)
    const [loading, setLoading] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [available, setAvailable] = useState<number>(0)

    const validateQuantity = React.useCallback((val: number) => {
        let error = null
        let avail = 0

        // Field logic: Each field in the view (corte, enchape, etc.) 
        // represents the WIP pieces READY for that specific module.
        // Stage -> Field to use as limit
        // ------------------------------
        // Enchape    <- orden.corte
        // Inspeccion <- orden.enchape
        // Empaque    <- orden.inspeccion
        // Digitado   <- orden.empaque
        // Transito   <- orden.digitado
        // CEDI       <- orden.transito

        switch (proceso) {
            case 'Corte':
                avail = orden.por_cortar || 0
                break
            case 'Enchape':
                avail = (orden.corte || 0) + (orden.reponer_enchape || 0)
                break
            case 'Inspeccion':
                avail = (orden.enchape || 0) + (orden.reponer_inspeccion || 0)
                break
            case 'Empaque':
                avail = orden.inspeccion || 0
                break
            case 'Digitado':
                avail = orden.empaque || 0
                break
            case 'Transito':
                avail = orden.digitado || 0
                break
            case 'CEDI':
                avail = orden.transito || 0
                break
        }

        if (val > avail) {
            error = `La cantidad no puede exceder el disponible (${avail})`
        }

        setAvailable(avail)
        setValidationError(error)
    }, [orden, proceso])

    useEffect(() => {
        if (isOpen) {
            setCantidad(1)
            setValidationError(null)
            validateQuantity(1)
        }
    }, [isOpen, validateQuantity])

    const handleIncrement = () => {
        const next = cantidad + 1
        setCantidad(next)
        validateQuantity(next)
    }

    const handleDecrement = () => {
        if (cantidad > 1) {
            const next = cantidad - 1
            setCantidad(next)
            validateQuantity(next)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 0
        setCantidad(val)
        validateQuantity(val)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(orden.orden_fabricacion?.toString() || '')
        toast.info('OF copiada al portapapeles')
    }

    const handleSubmit = async () => {
        if (validationError || cantidad <= 0) return

        // Extra business logic from Flutter
        if (proceso === 'Inspeccion' && (orden.por_reponer || 0) > 0 && cantidad >= (orden.enchape || 0)) {
            toast.error('Tiene piezas por reponer en esta orden')
            return
        }

        setLoading(true)
        try {
            await registrarTrazabilidadMueble({
                orden_fabricacion: orden.orden_fabricacion,
                creado_por: usuarioNombre,
                cantidad: cantidad,
                proceso: proceso,
                taladro: taladro
            })
            toast.success('Registro exitoso')
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error al registrar:', error)
            toast.error('Error al registrar trazabilidad')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-5 flex items-start justify-between">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={handleCopy}>
                        <span className="text-blue-500 font-bold text-lg">{orden.orden_fabricacion}</span>
                        <Copy size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={28} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-6 space-y-6 flex flex-col items-center">
                    <p className="text-center text-gray-600 font-medium text-sm leading-relaxed max-w-[300px]">
                        {orden.producto_descripcion}
                    </p>

                    <div className="flex justify-center gap-8 w-full border-y border-gray-100 py-3">
                        <div className="text-center">
                            <span className="text-blue-500 text-xs font-bold uppercase block">Proceso</span>
                            <span className="text-gray-800 font-medium">{proceso}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-blue-500 text-xs font-bold uppercase block">Disponible</span>
                            <span className="text-gray-800 font-medium">{available}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handleDecrement} className="text-red-500 hover:scale-110 transition-transform">
                            <MinusSquare size={44} fill="currentColor" stroke="white" />
                        </button>
                        
                        <input 
                            type="number"
                            value={cantidad}
                            onChange={handleInputChange}
                            className="w-24 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                        />

                        <button onClick={handleIncrement} className="text-emerald-500 hover:scale-110 transition-transform">
                            <PlusSquare size={44} fill="currentColor" stroke="white" />
                        </button>
                    </div>

                    <div className="w-full">
                        {validationError ? (
                            <div className="bg-orange-500 rounded-xl p-4 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                                <AlertTriangle size={32} className="text-white" />
                                <p className="text-white text-center font-medium leading-tight">{validationError}</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || cantidad <= 0}
                                className={`w-full h-12 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all ${
                                    loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /><span>REGISTRAR</span></>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
