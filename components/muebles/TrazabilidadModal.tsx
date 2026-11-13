'use client'

import React, { useState, useEffect } from 'react'
import { OrdenMueble, TareaMuebleActiva } from '@/types/muebles'
import { X, Copy, MinusSquare, PlusSquare, AlertTriangle, Send, Loader2 } from 'lucide-react'
import { registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import { toast } from 'sonner'

interface TrazabilidadModalProps {
    isOpen: boolean
    onClose: () => void
    orden: OrdenMueble
    ordenes?: OrdenMueble[]
    proceso: string
    usuarioNombre: string
    turno: string
    taladro?: string
    userEmail: string
    onSuccess: () => void
    onStartTask?: (tarea: TareaMuebleActiva) => void
    onReportDefect?: (orden: OrdenMueble, operario?: { cedula: string, nombre: string }) => void
}

export default function TrazabilidadModal({ 
    isOpen, 
    onClose, 
    orden,
    ordenes,
    proceso, 
    usuarioNombre, 
    turno,
    taladro,
    userEmail,
    onSuccess,
    onStartTask,
    onReportDefect
}: TrazabilidadModalProps) {
    const [cantidad, setCantidad] = useState(1)
    const [loading, setLoading] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [available, setAvailable] = useState<number>(0)

    const ordenesSeleccionadas = React.useMemo(
        () => ordenes?.length ? ordenes : [orden],
        [orden, ordenes]
    )

    const validateQuantity = React.useCallback((val: number) => {
        let error = null
        let avail = 0

        switch (proceso) {
            case 'Corte':
                avail = ordenesSeleccionadas.reduce((sum, item) => sum + (item.por_cortar || 0), 0)
                break
            case 'Enchape':
                avail = ordenesSeleccionadas.reduce((sum, item) => sum + (item.corte || 0) + (item.reponer_enchape || 0), 0)
                break
            case 'Inspeccion':
            case 'Inspección':
                avail = ordenesSeleccionadas.reduce((sum, item) => sum + (item.enchape || 0) + (item.reponer_inspeccion || 0), 0)
                break
            case 'Empaque':
                avail = ordenesSeleccionadas.reduce((sum, item) => sum + (item.inspeccion || 0), 0)
                break
            case 'Digitado':
                const isCefiOrd = (orden.planta || '').toLowerCase().includes('cefi') || (orden.producto_sku || '').toUpperCase().startsWith('VCEF')
                avail = isCefiOrd ? ((orden.inspeccion || 0) + (orden.empaque || 0)) : (orden.empaque || 0)
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
    }, [orden, ordenesSeleccionadas, proceso])

    useEffect(() => {
        if (isOpen) {
            validateQuantity(1)
            setValidationError(null)
        }
    }, [isOpen, validateQuantity])

    // Ajustar cantidad por defecto al disponible
    useEffect(() => {
        if (isOpen && available > 0) {
            setCantidad(available)
        }
    }, [isOpen, available])

    const handleCopy = () => {
        navigator.clipboard.writeText(orden.orden_fabricacion?.toString() || '')
        toast.info('OF copiada al portapapeles')
    }

    const handleIncrement = () => {
        if (available > 0 && cantidad >= available) return
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
        let val = parseInt(e.target.value) || 0
        if (available > 0 && val > available) val = available
        setCantidad(val)
        validateQuantity(val)
    }

    const handleSubmit = async () => {
        if (validationError) return

        // Si son múltiples órdenes seleccionadas (ej. Empaque masivo o registro múltiple)
        if (ordenesSeleccionadas.length > 1) {
            setLoading(true)
            try {
                for (const item of ordenesSeleccionadas) {
                    const cantItem = proceso === 'Corte'
                        ? (item.por_cortar || 0)
                        : proceso === 'Enchape'
                        ? ((item.corte || 0) + (item.reponer_enchape || 0))
                        : proceso === 'Empaque'
                        ? (item.inspeccion || 0)
                        : ((item.enchape || 0) + (item.reponer_inspeccion || 0))
                    if (cantItem > 0) {
                        await registrarTrazabilidadMueble({
                            orden_fabricacion: item.orden_fabricacion,
                            creado_por: usuarioNombre,
                            cantidad: cantItem,
                            proceso: proceso,
                            cedula_operario: 'NO APLICA',
                            nombre_operario: usuarioNombre,
                            fecha_inicio: new Date().toISOString(),
                            taladro: taladro || 'NO APLICA'
                        })
                    }
                }
                toast.success(`${proceso} registrado exitosamente`)
                onSuccess()
                onClose()
            } catch (error) {
                console.error('Error al registrar múltiple:', error)
                toast.error('Error al registrar')
            } finally {
                setLoading(false)
            }
            return
        }

        if (cantidad <= 0) return

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
                cedula_operario: 'NO APLICA',
                nombre_operario: usuarioNombre,
                fecha_inicio: new Date().toISOString(),
                taladro: taladro
            })
            toast.success(proceso === 'Empaque' ? 'Empaque registrado exitosamente' : 'Registro exitoso')
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error al registrar:', error)
            toast.error('Error al registrar trazabilidad')
        } finally {
            setLoading(false)
        }
    }

    const handleStartTaskAndReportDefect = async () => {
        if (onReportDefect) onReportDefect(orden, { cedula: 'NO APLICA', nombre: usuarioNombre })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 transition-all">
                {/* Header */}
                <div className="p-5 flex items-start justify-between border-b border-gray-50 bg-gray-50/30">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={handleCopy}>
                            <span className="text-blue-500 font-bold text-lg leading-none">
                                {ordenesSeleccionadas.length > 1 ? `${ordenesSeleccionadas.length} ordenes` : orden.orden_fabricacion}
                            </span>
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
                    <div className="space-y-6 flex flex-col items-center animate-in fade-in duration-300">
                        {ordenesSeleccionadas.length > 1 ? (
                            <div className="w-full max-h-36 overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-100">
                                {ordenesSeleccionadas.map((item) => (
                                    <div key={item.id} className="p-3 text-left">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-blue-600 font-black text-xs">OF #{item.orden_fabricacion}</span>
                                            <span className="text-gray-400 font-bold text-[10px]">
                                                {proceso === 'Corte'
                                                    ? (item.por_cortar || 0)
                                                    : proceso === 'Enchape'
                                                    ? ((item.corte || 0) + (item.reponer_enchape || 0))
                                                    : proceso === 'Empaque'
                                                    ? (item.inspeccion || 0)
                                                    : ((item.enchape || 0) + (item.reponer_inspeccion || 0))} disp.
                                            </span>
                                        </div>
                                        <p className="text-gray-500 font-bold text-[10px] uppercase leading-tight mt-1 line-clamp-2">
                                            {item.producto_descripcion && item.producto_descripcion.trim() !== '' && item.producto_descripcion.toLowerCase() !== 'sin descripcion' && item.producto_descripcion.toLowerCase() !== 'sin descripción'
                                                ? item.producto_descripcion 
                                                : (item.producto_sku ? `PRODUCTO (${item.producto_sku})` : `OF #${item.orden_fabricacion}`)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 font-bold text-xs leading-relaxed max-w-[280px] uppercase tracking-wider">
                                {orden.producto_descripcion && orden.producto_descripcion.trim() !== '' && orden.producto_descripcion.toLowerCase() !== 'sin descripcion' && orden.producto_descripcion.toLowerCase() !== 'sin descripción'
                                    ? orden.producto_descripcion 
                                    : (orden.producto_sku ? `PRODUCTO (${orden.producto_sku})` : `OF #${orden.orden_fabricacion}`)}
                            </p>
                        )}

                        <div className="flex justify-center gap-8 w-full border-y border-gray-100 py-3">
                            <div className="text-center">
                                <span className="text-blue-500 text-[10px] font-bold uppercase block tracking-wider">
                                    Usuario
                                </span>
                                <span className="text-gray-800 font-bold text-sm">
                                    {usuarioNombre}
                                </span>
                            </div>
                            <div className="text-center">
                                <span className="text-blue-500 text-[10px] font-bold uppercase block tracking-wider">Disponible</span>
                                <span className="text-gray-800 font-bold text-sm">{available}</span>
                            </div>
                        </div>
                        
                        {(proceso !== 'Empaque' || ordenesSeleccionadas.length === 1) && (
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleDecrement} 
                                    disabled={cantidad <= 1}
                                    className={`transition-all ${cantidad <= 1 ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:scale-110 active:scale-95'}`}
                                >
                                    <MinusSquare size={48} fill="currentColor" stroke="white" />
                                </button>
                                
                                <div className="relative flex flex-col items-center">
                                    <input 
                                        type="number"
                                        value={cantidad}
                                        onChange={handleInputChange}
                                        className="w-24 h-14 text-center text-2xl font-bold border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm"
                                    />
                                    {available > 0 && (
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">máx. {available}</span>
                                    )}
                                </div>

                                <button 
                                    onClick={handleIncrement} 
                                    disabled={available > 0 && cantidad >= available}
                                    className={`transition-all ${available > 0 && cantidad >= available ? 'text-gray-200 cursor-not-allowed' : 'text-emerald-500 hover:scale-110 active:scale-95'}`}
                                >
                                    <PlusSquare size={48} fill="currentColor" stroke="white" />
                                </button>
                            </div>
                        )}

                        <div className="w-full">
                            {validationError ? (
                                <div className="bg-orange-500 rounded-2xl p-4 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                                    <AlertTriangle size={32} className="text-white" />
                                    <p className="text-white text-center font-bold leading-tight text-sm uppercase">{validationError}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-white shadow-xl transition-all active:scale-[0.98] ${
                                        loading 
                                            ? 'bg-blue-400' 
                                            : proceso === 'Empaque'
                                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                        proceso === 'Empaque' ? (
                                            <><Send size={20} /><span>REGISTRAR EMPAQUE</span></>
                                        ) : (
                                            <><Send size={20} /><span>REGISTRAR {proceso.toUpperCase()}</span></>
                                        )
                                    )}
                                </button>
                            )}

                            {(proceso === 'Inspeccion' || proceso === 'Inspección') && (
                                <button
                                    type="button"
                                    onClick={handleStartTaskAndReportDefect}
                                    disabled={loading}
                                    className="w-full py-3.5 px-4 mt-3 rounded-2xl flex items-center justify-center gap-2 font-black text-amber-900 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 shadow-sm transition-all active:scale-[0.98] uppercase text-xs"
                                >
                                    <AlertTriangle size={18} className="text-amber-600" />
                                    <span>REPORTAR DEFECTO / REPOSICIÓN</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
