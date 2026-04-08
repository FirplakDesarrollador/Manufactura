'use client'

import React, { useState, useEffect } from 'react'
import { Turno } from '@/types/muebles'
import { getTurnos, updateTurno } from '@/lib/supabase/queries/muebles'
import { X, Clock, Save, Loader2, CalendarRange, PenLine } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigurarTurnosModalProps {
    onClose: () => void
}

export default function ConfigurarTurnosModal({ onClose }: ConfigurarTurnosModalProps) {
    const [turnos, setTurnos] = useState<Turno[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<number | null>(null)

    useEffect(() => {
        loadTurnos()
    }, [])

    const loadTurnos = async () => {
        setLoading(true)
        try {
            const data = await getTurnos()
            setTurnos(data)
        } catch (error) {
            console.error('Error loading shifts:', error)
            toast.error('Error al cargar turnos')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateTime = async (id: number, field: 'inicio' | 'fin', value: string) => {
        if (!value) return
        
        setSavingId(id)
        try {
            // value is HH:mm from input type="time"
            // need to format for PostgresTime if necessary, but select() will return it correctly
            await updateTurno(id, { [field]: value })
            toast.success('Horario actualizado')
            
            // Refresh local state
            setTurnos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
        } catch (error) {
            console.error('Error updating shift time:', error)
            toast.error('Error al actualizar horario')
        } finally {
            setSavingId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight leading-none mb-1">Configurar Turnos</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Gestión de horarios de planta</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all shadow-inner"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando turnos...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {turnos.map((turno) => (
                                <div key={turno.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-tight">Turno {turno.turno}</h3>
                                        </div>
                                        {savingId === turno.id && (
                                            <div className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase">
                                                <Loader2 size={10} className="animate-spin" /> Guardando...
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Inicio Jornada</label>
                                            <div className="relative group">
                                                <input 
                                                    type="time" 
                                                    defaultValue={turno.inicio?.substring(0, 5)}
                                                    onBlur={(e) => handleUpdateTime(turno.id, 'inicio', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-black text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-indigo-300"
                                                />
                                                <PenLine size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-indigo-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fin Jornada</label>
                                            <div className="relative group">
                                                <input 
                                                    type="time" 
                                                    defaultValue={turno.fin?.substring(0, 5)}
                                                    onBlur={(e) => handleUpdateTime(turno.id, 'fin', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-black text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-indigo-300"
                                                />
                                                <PenLine size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-indigo-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-4 bg-indigo-600 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <CalendarRange size={16} className="opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ajustes Globales</span>
                    </div>
                    <p className="text-[9px] font-bold text-indigo-100 max-w-[200px] text-right leading-tight">
                        Los cambios afectan el cálculo de métricas en tiempo real a partir del próximo registro.
                    </p>
                </div>
            </div>
        </div>
    )
}
