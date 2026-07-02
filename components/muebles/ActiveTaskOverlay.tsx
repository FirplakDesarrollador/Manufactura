'use client'

import React, { useState, useEffect } from 'react'
import { Timer, CheckCircle2, AlertCircle, Loader2, Play, User } from 'lucide-react'
import { registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import { setTareaActiva } from '@/lib/supabase/queries/usuarios'
import { TareaMuebleActiva, TareaMuebleActivaOrden } from '@/types/muebles'
import { toast } from 'sonner'

interface ActiveTaskOverlayProps {
    tarea: TareaMuebleActiva
    userEmail: string
    usuarioNombre: string
    onFinished: () => void
}

export default function ActiveTaskOverlay({ tarea, userEmail, usuarioNombre, onFinished }: ActiveTaskOverlayProps) {
    const [elapsedTime, setElapsedTime] = useState('')
    const [isFinishing, setIsFinishing] = useState(false)
    const [cantidades, setCantidades] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(false)

    const taskOrders = React.useMemo<TareaMuebleActivaOrden[]>(() => {
        if (tarea.ordenes?.length) return tarea.ordenes
        return [{
            of: tarea.of,
            producto_descripcion: tarea.producto_descripcion,
            available: tarea.available
        }]
    }, [tarea])

    useEffect(() => {
        const initialQuantities = taskOrders.reduce<Record<string, number>>((acc, item) => {
            acc[item.of] = item.available && item.available > 0 ? 1 : 0
            return acc
        }, {})
        setCantidades(initialQuantities)
    }, [taskOrders])

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

    const setCantidadForOrder = (of: string, value: number, max?: number) => {
        let next = Number.isFinite(value) ? value : 0
        if (next < 0) next = 0
        if (max !== undefined && next > max) next = max
        setCantidades((current) => ({ ...current, [of]: next }))
    }

    const totalCantidad = taskOrders.reduce((sum, item) => sum + (cantidades[item.of] || 0), 0)
    const totalDisponible = taskOrders.reduce((sum, item) => sum + (item.available || 0), 0)

    const handleFinalizar = async () => {
        const invalidOrder = taskOrders.find((item) => {
            const cantidad = cantidades[item.of] || 0
            return item.available !== undefined && cantidad > item.available
        })

        if (invalidOrder) {
            toast.error(`La cantidad de la OF ${invalidOrder.of} no puede exceder el disponible (${invalidOrder.available})`)
            return
        }

        setLoading(true)
        try {
            const registros = taskOrders
                .map((item) => ({ item, cantidad: cantidades[item.of] || 0 }))
                .filter(({ cantidad }) => cantidad > 0)

            if (registros.length > 0) {
                await Promise.all(registros.map(({ item, cantidad }) =>
                    registrarTrazabilidadMueble({
                        orden_fabricacion: item.of,
                        cantidad,
                        creado_por: `${usuarioNombre} - ID: ${tarea.operario_cedula}`,
                        proceso: tarea.proceso,
                        cedula_operario: tarea.operario_cedula,
                        nombre_operario: tarea.operario_nombre,
                        fecha_inicio: tarea.inicio
                    })
                ))
                toast.success('Proceso finalizado con exito')
            } else {
                toast.info('Proceso liberado sin registrar piezas')
            }

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
            <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-500">
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
                                {taskOrders.length > 1 ? `${taskOrders.length} OF seleccionadas` : `OF #${taskOrders[0].of}`}
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
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tiempo transcurrido</span>
                                    <span className="text-xl font-black text-blue-600 tabular-nums">{elapsedTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        {taskOrders.length > 1 && (
                            <div className="mb-4 max-h-32 overflow-y-auto rounded-xl bg-white border border-gray-100 divide-y divide-gray-100">
                                {taskOrders.map((item) => (
                                    <div key={item.of} className="px-3 py-2 text-left">
                                        <div className="flex justify-between gap-2 text-[10px] font-black">
                                            <span className="text-blue-600">OF #{item.of}</span>
                                            <span className="text-gray-400">{item.available || 0} disp.</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-tighter">
                            La aplicacion permanecera bloqueada hasta que finalices este proceso para garantizar la precision de los tiempos.
                        </p>
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 flex flex-col justify-center items-center text-center space-y-8 bg-white">
                    {!isFinishing ? (
                        <>
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                                <Play size={40} className="animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-gray-900">Proceso en marcha</h3>
                                <p className="text-gray-500 text-sm max-w-[260px] mx-auto">
                                    {taskOrders.length > 1 ? 'Corta las piezas de cada orden seleccionada antes de registrar.' : taskOrders[0].producto_descripcion || 'Corta las piezas indicadas en la hoja de ruta antes de registrar.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFinishing(true)}
                                className="group relative w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                            >
                                <span>FINALIZAR CORTE</span>
                                <CheckCircle2 size={24} />
                            </button>
                        </>
                    ) : (
                        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-gray-900">Cuantas piezas terminaste?</h3>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Registrar cantidad por orden</p>
                            </div>

                            <div className="w-full max-h-[300px] overflow-y-auto pr-1 space-y-3">
                                {taskOrders.map((item) => {
                                    const cantidad = cantidades[item.of] || 0
                                    return (
                                        <div key={item.of} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                                            <div className="flex items-start justify-between gap-3 mb-3 text-left">
                                                <div className="min-w-0">
                                                    <div className="text-blue-600 text-xs font-black">OF #{item.of}</div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase leading-tight line-clamp-2">
                                                        {item.producto_descripcion || 'Sin descripcion'}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-[10px] text-gray-400 font-black uppercase">{item.available || 0} disp.</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() => setCantidadForOrder(item.of, cantidad - 1, item.available)}
                                                    className={`w-11 h-11 bg-white rounded-xl flex items-center justify-center transition-colors ${cantidad <= 0 ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                                    disabled={cantidad <= 0}
                                                >
                                                    <span className="text-xl font-bold">-</span>
                                                </button>
                                                <input
                                                    type="number"
                                                    value={cantidad}
                                                    onChange={(e) => setCantidadForOrder(item.of, parseInt(e.target.value) || 0, item.available)}
                                                    className="w-20 h-12 text-center text-2xl font-black text-gray-900 border-b-4 border-blue-500 focus:outline-none bg-white rounded-t-xl"
                                                />
                                                <button
                                                    onClick={() => setCantidadForOrder(item.of, cantidad + 1, item.available)}
                                                    className={`w-11 h-11 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors ${item.available !== undefined && cantidad >= item.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={item.available !== undefined && cantidad >= item.available}
                                                >
                                                    <span className="text-xl font-bold">+</span>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {totalDisponible > 0 && (
                                <p className="text-[10px] text-gray-400 font-bold">
                                    TOTAL DISPONIBLE: {totalDisponible} PIEZAS
                                </p>
                            )}

                            {totalCantidad === 0 && (
                                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
                                    <AlertCircle size={18} className="text-orange-500 shrink-0" />
                                    <p className="text-orange-700 text-xs font-bold leading-tight">
                                        Con 0 piezas solo se libera el bloqueo.<br />
                                        <span className="font-normal text-orange-500">No se registrara ningun movimiento.</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleFinalizar}
                                    disabled={loading}
                                    className={`w-full h-16 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                                        totalCantidad === 0
                                            ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (
                                        totalCantidad === 0 ? (
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
        </div>
    )
}
