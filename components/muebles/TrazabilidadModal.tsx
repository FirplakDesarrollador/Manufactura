'use client'

import React, { useState, useEffect } from 'react'
import { OrdenMueble } from '@/types/muebles'
import { X, Copy, MinusSquare, PlusSquare, AlertTriangle, Send, Loader2, User, ArrowRight, ChevronLeft } from 'lucide-react'
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
    const [step, setStep] = useState<'identificacion' | 'registro'>('identificacion')
    const [identificacion, setIdentificacion] = useState('')
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
            setStep('identificacion')
            setIdentificacion('')
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
        if (validationError || cantidad <= 0 || !identificacion) return

        // Extra business logic from Flutter
        if (proceso === 'Inspeccion' && (orden.por_reponer || 0) > 0 && cantidad >= (orden.enchape || 0)) {
            toast.error('Tiene piezas por reponer en esta orden')
            return
        }

        setLoading(true)
        try {
            await registrarTrazabilidadMueble({
                orden_fabricacion: orden.orden_fabricacion,
                creado_por: `${usuarioNombre} - ID: ${identificacion}`,
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
            
            <div className={`relative w-full max-w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 transition-all ${step === 'identificacion' ? 'min-h-[300px]' : ''}`}>
                {/* Header */}
                <div className="p-5 flex items-start justify-between border-b border-gray-50 bg-gray-50/30">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={handleCopy}>
                            <span className="text-blue-500 font-bold text-lg leading-none">{orden.orden_fabricacion}</span>
                            <Copy size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{proceso}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6">
                    {step === 'identificacion' ? (
                        /* Step 1: Identification */
                        <div className="space-y-6 flex flex-col items-center animate-in slide-in-from-right-4 duration-300">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                <User size={32} />
                            </div>
                            
                            <div className="text-center space-y-1">
                                <h3 className="text-lg font-bold text-gray-900">Validar Operario</h3>
                                <p className="text-xs text-gray-500">Ingrese su número de identificación</p>
                            </div>

                            <div className="w-full relative">
                                <input 
                                    type="text"
                                    autoFocus
                                    inputMode="numeric"
                                    value={identificacion}
                                    onChange={(e) => setIdentificacion(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Cédula o ID"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && identificacion.length >= 4) {
                                            setStep('registro')
                                        }
                                    }}
                                    className="w-full h-14 text-center text-2xl font-bold border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-200 placeholder:text-lg"
                                />
                            </div>

                            <button
                                onClick={() => setStep('registro')}
                                disabled={identificacion.length < 4}
                                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                                    identificacion.length < 4 
                                        ? 'bg-gray-300 shadow-none cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-xl'
                                }`}
                            >
                                <span>CONTINUAR</span>
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    ) : (
                        /* Step 2: Quantity & Submit */
                        <div className="space-y-6 flex flex-col items-center animate-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => setStep('identificacion')}
                                className="self-start flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors uppercase"
                            >
                                <ChevronLeft size={14} />
                                Volver
                            </button>

                            <p className="text-center text-gray-600 font-medium text-sm leading-relaxed max-w-[280px]">
                                {orden.producto_descripcion}
                            </p>

                            <div className="flex justify-center gap-8 w-full border-y border-gray-100 py-3">
                                <div className="text-center">
                                    <span className="text-blue-500 text-[10px] font-bold uppercase block tracking-wider">Identificado</span>
                                    <span className="text-gray-800 font-bold text-sm">{identificacion}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-blue-500 text-[10px] font-bold uppercase block tracking-wider">Disponible</span>
                                    <span className="text-gray-800 font-bold text-sm">{available}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={handleDecrement} className="text-red-500 hover:scale-110 active:scale-95 transition-all">
                                    <MinusSquare size={48} fill="currentColor" stroke="white" />
                                </button>
                                
                                <div className="relative">
                                    <input 
                                        type="number"
                                        value={cantidad}
                                        onChange={handleInputChange}
                                        className="w-24 h-14 text-center text-2xl font-bold border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <button onClick={handleIncrement} className="text-emerald-500 hover:scale-110 active:scale-95 transition-all">
                                    <PlusSquare size={48} fill="currentColor" stroke="white" />
                                </button>
                            </div>

                            <div className="w-full">
                                {validationError ? (
                                    <div className="bg-orange-500 rounded-2xl p-4 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                                        <AlertTriangle size={32} className="text-white" />
                                        <p className="text-white text-center font-bold leading-tight text-sm uppercase">{validationError}</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || cantidad <= 0}
                                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-white shadow-xl transition-all active:scale-[0.98] ${
                                            loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                        }`}
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /><span>REGISTRAR</span></>}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
