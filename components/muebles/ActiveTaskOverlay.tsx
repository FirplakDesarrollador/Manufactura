'use client'

import React, { useState, useEffect } from 'react'
import { Timer, CheckCircle2, AlertCircle, Loader2, Play, User } from 'lucide-react'
import { registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import { setTareaActiva } from '@/lib/supabase/queries/usuarios'
import { toast } from 'sonner'

interface ActiveTaskOverlayProps {
    tarea: {
        of: string
        proceso: string
        inicio: string
        operario_nombre: string
        operario_cedula: string
        producto_descripcion?: string
        available?: number
    }
    userEmail: string
    usuarioNombre: string
    onFinished: () => void
}

export default function ActiveTaskOverlay({ tarea, userEmail, usuarioNombre, onFinished }: ActiveTaskOverlayProps) {
    const [elapsedTime, setElapsedTime] = useState('')
    const [isFinishing, setIsFinishing] = useState(false)
    const [cantidad, setCantidad] = useState(1)
    const [loading, setLoading] = useState(false)

    // Cronometro
    useEffect(() => {
        const interval = setInterval(() => {
            const start = new Date(tarea.inicio).getTime()
            const now = new Date().getTime()
            const diff = now - start

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setElapsedTime(
                `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`
            )
        }, 1000)

        return () => clearInterval(interval)
    }, [tarea.inicio])

    const handleFinalizar = async () => {
        if (tarea.available && cantidad > tarea.available) {
            toast.error(`La cantidad no puede exceder el disponible (${tarea.available})`)
            return
        }

        setLoading(true)
        try {
            if (cantidad > 0) {
                // Register traceability only if pieces were cut
                await registrarTrazabilidadMueble({
                    orden_fabricacion: tarea.of,
                    cantidad: cantidad,
                    creado_por: `${usuarioNombre} - ID: ${tarea.operario_cedula}`,
                    proceso: tarea.proceso,
                    cedula_operario: tarea.operario_cedula,
                    nombre_operario: tarea.operario_nombre,
                    fecha_inicio: tarea.inicio
                })
                toast.success('¡Proceso finalizado con éxito!')
            } else {
                // 0 pieces: just release the lock, no record created
                toast.info('Proceso liberado sin registrar piezas')
            }

            // Always clear the active task
            await setTareaActiva(userEmail, null)
            onFinished()
        } catch (error) {
            console.error('Error finishing task:', error)
            toast.error('Error al finalizar la tarea')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] bg-[#254153] flex items-center justify-center p-4 md:p-8 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-500">
                
                {/* Left Side: Status Info */}
                <div className="w-full md:w-5/12 bg-gray-50 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                            Trabajo en curso
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-4xl font-black text-gray-900 leading-tight">
                                {tarea.proceso}
                            </h2>
                            <p className="text-blue-600 font-bold text-lg">
                                OF #{tarea.of}
                            </p>
                        </div>

                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                    <User size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Operario</span>
                                    <span className="text-sm font-bold text-gray-700">{tarea.operario_nombre}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                                    <Timer size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tiempo Transcurrido</span>
                                    <span className="text-xl font-black text-blue-600 tabular-nums">{elapsedTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-tighter">
                            La aplicación permanecerá bloqueada hasta que finalices este proceso para garantizar la precisión de los tiempos.
                        </p>
                    </div>
                </div>

                {/* Right Side: Action Area */}
                <div className="w-full md:w-7/12 p-8 flex flex-col justify-center items-center text-center space-y-8 bg-white">
                    {!isFinishing ? (
                        <>
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                                <Play size={40} className="animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-gray-900">Proceso en Marcha</h3>
                                <p className="text-gray-500 text-sm max-w-[240px] mx-auto">
                                    {tarea.producto_descripcion || 'Corta las piezas indicadas en la hoja de ruta antes de registrar.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFinishing(true)}
                                className="group relative w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span>FINALIZAR CORTE</span>
                                <CheckCircle2 size={24} />
                            </button>
                        </>
                    ) : (
                        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-gray-900">¿Cuántas piezas terminaste?</h3>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Registrar cantidad final</p>
                            </div>

                            <div className="flex items-center justify-center gap-6">
                                <button 
                                    onClick={() => setCantidad(prev => Math.max(0, prev - 1))}
                                    className={`w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center transition-colors ${cantidad <= 0 ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                    disabled={cantidad <= 0}
                                >
                                    <span className="text-2xl font-bold">−</span>
                                </button>
                                <input 
                                    type="number"
                                    value={cantidad}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value) || 0;
                                        if (tarea.available && val > tarea.available) val = tarea.available;
                                        setCantidad(val);
                                    }}
                                    className="w-24 h-16 text-center text-3xl font-black text-gray-900 border-b-4 border-blue-500 focus:outline-none bg-blue-50/30 rounded-t-xl"
                                />
                                <button 
                                    onClick={() => setCantidad(prev => {
                                        const next = prev + 1;
                                        if (tarea.available && next > tarea.available) return prev;
                                        return next;
                                    })}
                                    className={`w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors ${tarea.available && cantidad >= tarea.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={tarea.available !== undefined && cantidad >= tarea.available}
                                >
                                    <span className="text-2xl font-bold">+</span>
                                </button>
                            </div>

                            {tarea.available && (
                                <p className="text-[10px] text-gray-400 font-bold">
                                    DISPONIBLE: {tarea.available} PIEZAS
                                </p>
                            )}

                            {cantidad === 0 && (
                                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
                                    <span className="text-orange-500 text-lg">⚠️</span>
                                    <p className="text-orange-700 text-xs font-bold leading-tight">
                                        Con 0 piezas solo se libera el bloqueo.<br />
                                        <span className="font-normal text-orange-500">No se registrará ningún movimiento.</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleFinalizar}
                                    disabled={loading}
                                    className={`w-full h-16 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                                        cantidad === 0
                                            ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (
                                        cantidad === 0 ? (
                                            <><span>LIBERAR SIN REGISTRAR</span><CheckCircle2 size={24} /></>
                                        ) : (
                                            <><span>REGISTRAR Y LIBERAR</span><CheckCircle2 size={24} /></>
                                        )
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsFinishing(false)}
                                    disabled={loading}
                                    className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    )
}
