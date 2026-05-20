'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getTrazabilidadOperarios, TrazabilidadRecord } from '@/lib/supabase/queries/muebles'
import { getEmpleadoById } from '@/lib/supabase/queries/talento_humano'
import { Calendar, Search, Users, Clock, Hash, CheckCircle2, User, Package, ListFilter } from 'lucide-react'

interface OperarioStats {
    cedula: string
    nombre: string
    piezasCortadas: number
    tiempoTotalMs: number
    operaciones: number
    ordenes: Set<string>
}

interface OperarioInOrder {
    cedula: string
    nombre: string
    piezasCortadas: number
    tiempoTotalMs: number
    operaciones: number
}

interface OrdenStats {
    orden_fabricacion: string
    piezasCortadas: number
    tiempoTotalMs: number
    operaciones: number
    operarios: Map<string, OperarioInOrder>
}

interface SeguimientoModuleProps {
    plantaMuebles: string
}

export default function SeguimientoModule({ plantaMuebles }: SeguimientoModuleProps) {
    const [records, setRecords] = useState<TrazabilidadRecord[]>([])
    const [fotos, setFotos] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    
    // Filters
    const [viewMode, setViewMode] = useState<'personas' | 'ordenes'>('personas')
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [searchPerson, setSearchPerson] = useState('')
    const [searchOrder, setSearchOrder] = useState('')

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Fetch trazabilidad for "Corte" on selected date
                const data = await getTrazabilidadOperarios('Corte', selectedDate)
                setRecords(data || [])
            } catch (error) {
                console.error('Error fetching trazabilidad:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [selectedDate])

    // Agrupación por Personas
    const statsPersonas = useMemo(() => {
        const opMap = new Map<string, OperarioStats>()

        records.forEach(record => {
            if (!record.cedula_operario) return

            if (!opMap.has(record.cedula_operario)) {
                opMap.set(record.cedula_operario, {
                    cedula: record.cedula_operario,
                    nombre: record.nombre_operario || 'Desconocido',
                    piezasCortadas: 0,
                    tiempoTotalMs: 0,
                    operaciones: 0,
                    ordenes: new Set<string>()
                })
            }

            const op = opMap.get(record.cedula_operario)!
            op.piezasCortadas += (record.cantidad || 0)
            op.operaciones += 1
            if (record.orden_fabricacion) {
                op.ordenes.add(record.orden_fabricacion)
            }

            if (record.fecha_inicio && record.created_at) {
                const start = new Date(record.fecha_inicio).getTime()
                const end = new Date(record.created_at).getTime()
                if (end > start) {
                    op.tiempoTotalMs += (end - start)
                }
            }
        })

        return Array.from(opMap.values())
    }, [records])

    // Agrupación por Órdenes
    const statsOrdenes = useMemo(() => {
        const ordMap = new Map<string, OrdenStats>()

        records.forEach(record => {
            if (!record.orden_fabricacion) return

            if (!ordMap.has(record.orden_fabricacion)) {
                ordMap.set(record.orden_fabricacion, {
                    orden_fabricacion: record.orden_fabricacion,
                    piezasCortadas: 0,
                    tiempoTotalMs: 0,
                    operaciones: 0,
                    operarios: new Map<string, OperarioInOrder>()
                })
            }

            const ord = ordMap.get(record.orden_fabricacion)!
            ord.piezasCortadas += (record.cantidad || 0)
            ord.operaciones += 1

            let timeMs = 0
            if (record.fecha_inicio && record.created_at) {
                const start = new Date(record.fecha_inicio).getTime()
                const end = new Date(record.created_at).getTime()
                if (end > start) {
                    timeMs = end - start
                    ord.tiempoTotalMs += timeMs
                }
            }

            if (record.cedula_operario) {
                if (!ord.operarios.has(record.cedula_operario)) {
                    ord.operarios.set(record.cedula_operario, {
                        cedula: record.cedula_operario,
                        nombre: record.nombre_operario || 'Desconocido',
                        piezasCortadas: 0,
                        tiempoTotalMs: 0,
                        operaciones: 0
                    })
                }
                const opInOrd = ord.operarios.get(record.cedula_operario)!
                opInOrd.piezasCortadas += (record.cantidad || 0)
                opInOrd.tiempoTotalMs += timeMs
                opInOrd.operaciones += 1
            }
        })

        return Array.from(ordMap.values())
    }, [records])

    // Fetch photos for unique operators (from either grouping)
    useEffect(() => {
        const fetchPhotos = async () => {
            const newFotos: Record<string, string> = { ...fotos }
            let hasNew = false
            for (const op of statsPersonas) {
                if (newFotos[op.cedula] === undefined) {
                    const emp = await getEmpleadoById(op.cedula)
                    if (emp && emp.foto) {
                        newFotos[op.cedula] = emp.foto
                        hasNew = true
                    } else {
                        newFotos[op.cedula] = ''
                        hasNew = true
                    }
                }
            }
            if (hasNew) {
                setFotos(newFotos)
            }
        }
        if (statsPersonas.length > 0) {
            fetchPhotos()
        }
    }, [statsPersonas]) // eslint-disable-line react-hooks/exhaustive-deps

    // Filtros combinados
    const filteredPersonas = useMemo(() => {
        return statsPersonas.filter(op => {
            const matchPerson = !searchPerson || op.nombre.toLowerCase().includes(searchPerson.toLowerCase()) || op.cedula.includes(searchPerson)
            const matchOrder = !searchOrder || Array.from(op.ordenes).some(o => o.includes(searchOrder))
            return matchPerson && matchOrder
        })
    }, [statsPersonas, searchPerson, searchOrder])

    const filteredOrdenes = useMemo(() => {
        return statsOrdenes.filter(ord => {
            const matchOrder = !searchOrder || ord.orden_fabricacion.includes(searchOrder)
            const matchPerson = !searchPerson || Array.from(ord.operarios.values()).some(op => 
                op.nombre.toLowerCase().includes(searchPerson.toLowerCase()) || op.cedula.includes(searchPerson)
            )
            return matchOrder && matchPerson
        })
    }, [statsOrdenes, searchOrder, searchPerson])

    const formatTime = (ms: number) => {
        if (ms === 0) return '0s'
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`
        }
        return `${seconds}s`
    }

    return (
        <div className="h-full flex flex-col bg-gray-50/80">
            {/* Header / Filters */}
            <div className="bg-white p-6 border-b border-gray-200 shadow-sm z-10">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <ListFilter className="text-blue-600" />
                                Seguimiento de Corte
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">Monitorea el rendimiento diario por personal u órdenes de fabricación.</p>
                        </div>
                        
                        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('personas')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'personas' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Users size={16} /> Por Personas
                            </button>
                            <button
                                onClick={() => setViewMode('ordenes')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'ordenes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Package size={16} /> Por Órdenes
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Filtrar por persona..." 
                                value={searchPerson}
                                onChange={(e) => setSearchPerson(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Filtrar por N° Orden..." 
                                value={searchOrder}
                                onChange={(e) => setSearchOrder(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando datos de seguimiento...</p>
                        </div>
                    ) : viewMode === 'personas' ? (
                        /* VISTA POR PERSONAS */
                        filteredPersonas.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <Users size={56} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium text-lg">No se encontraron registros de corte para la fecha seleccionada.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredPersonas.map((op, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                                        <div className="p-5 flex items-center gap-4 border-b border-gray-50 bg-gradient-to-br from-blue-50/80 via-white to-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                                            
                                            <div className="w-16 h-16 rounded-full shadow-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center relative z-10 border-2 border-white ring-2 ring-blue-50">
                                                {fotos[op.cedula] ? (
                                                    <img src={fotos[op.cedula]} alt={op.nombre} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={28} className="text-gray-300" />
                                                )}
                                            </div>
                                            <div className="relative z-10 flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-800 text-lg leading-tight truncate" title={op.nombre}>{op.nombre}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                                                    <Hash size={12} className="text-gray-400" /> {op.cedula}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="flex items-center justify-between group/item">
                                                <div className="flex items-center gap-3 text-gray-600">
                                                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center transition-colors group-hover/item:bg-green-100">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                    <span className="text-sm font-semibold">Piezas Cortadas</span>
                                                </div>
                                                <span className="text-xl font-black text-gray-800">{op.piezasCortadas}</span>
                                            </div>

                                            <div className="flex items-center justify-between group/item">
                                                <div className="flex items-center gap-3 text-gray-600">
                                                    <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center transition-colors group-hover/item:bg-orange-100">
                                                        <Clock size={16} />
                                                    </div>
                                                    <span className="text-sm font-semibold">Promedio</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md">
                                                    {op.operaciones > 0 ? formatTime(op.tiempoTotalMs / op.operaciones) : '0s'}
                                                </span>
                                            </div>

                                            <div className="pt-4 border-t border-dashed border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Órdenes Trabajadas</div>
                                                    <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{op.ordenes.size}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {Array.from(op.ordenes).map(of => (
                                                        <span key={of} className="px-2.5 py-1 bg-gray-50 text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-md text-[11px] font-bold border border-gray-100 transition-colors cursor-default">
                                                            {of}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        /* VISTA POR ÓRDENES */
                        filteredOrdenes.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <Package size={56} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium text-lg">No se encontraron órdenes para la fecha seleccionada.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredOrdenes.map((ord, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group flex flex-col">
                                        <div className="p-5 flex items-center gap-4 border-b border-gray-50 bg-gradient-to-br from-purple-50/80 via-white to-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                                            
                                            <div className="w-14 h-14 rounded-xl shadow-sm overflow-hidden bg-white flex-shrink-0 flex items-center justify-center relative z-10 border border-gray-100">
                                                <Package size={28} className="text-purple-500" />
                                            </div>
                                            <div className="relative z-10 flex-1 min-w-0">
                                                <h3 className="font-black text-gray-800 text-xl leading-tight truncate">OF {ord.orden_fabricacion}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                                                    {ord.operarios.size} operario{ord.operarios.size !== 1 ? 's' : ''} involucrado{ord.operarios.size !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-5 border-b border-dashed border-gray-200 flex justify-between items-center bg-gray-50/50">
                                            <div className="text-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Total Piezas</span>
                                                <span className="font-bold text-gray-800">{ord.piezasCortadas}</span>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200"></div>
                                            <div className="text-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Tiempo Total</span>
                                                <span className="font-bold text-gray-800">{formatTime(ord.tiempoTotalMs)}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3">Detalle por Operario</div>
                                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                                                {Array.from(ord.operarios.values()).map((op) => (
                                                    <div key={op.cedula} className="flex items-center gap-3 bg-white border border-gray-100 p-2 rounded-lg">
                                                        <div className="w-8 h-8 rounded-full shadow-sm overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                                            {fotos[op.cedula] ? (
                                                                <img src={fotos[op.cedula]} alt={op.nombre} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={14} className="text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-xs text-gray-800 truncate" title={op.nombre}>{op.nombre}</div>
                                                            <div className="text-[10px] text-gray-500">CC: {op.cedula}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="font-bold text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{op.piezasCortadas} pz</div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5">{formatTime(op.tiempoTotalMs)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
