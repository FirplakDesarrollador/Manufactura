'use client'

import React, { useState, useEffect } from 'react'
import { Supervisor, SupervisorTurno } from '@/types/muebles'
import { getSupervisores, getSupervisoresTurno, updateSupervisorTurno } from '@/lib/supabase/queries/muebles'
import { X, Users, RefreshCcw, Loader2, Award, Zap, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigurarSupervisoresModalProps {
    onClose: () => void
}

export default function ConfigurarSupervisoresModal({ onClose }: ConfigurarSupervisoresModalProps) {
    const [supervisores, setSupervisores] = useState<Supervisor[]>([])
    const [supervisoresTurno, setSupervisoresTurno] = useState<SupervisorTurno[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<'Muebles' | 'Cefi'>('Muebles')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [supData, subTurnoData] = await Promise.all([
                getSupervisores(),
                getSupervisoresTurno()
            ])
            setSupervisores(supData)
            setSupervisoresTurno(subTurnoData)
        } catch (error) {
            console.error('Error loading supervisor data:', error)
            toast.error('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateAssignment = async (id: number) => {
        if (!selectedSupervisorId) {
            toast.error('Seleccione un supervisor de la lista primero')
            return
        }
        
        setUpdatingId(id)
        try {
            await updateSupervisorTurno(id, selectedSupervisorId)
            toast.success('Supervisor reasignado')
            
            // Refresh data to show names correctly
            const newData = await getSupervisoresTurno()
            setSupervisoresTurno(newData)
        } catch (error) {
            console.error('Error updating supervisor assignment:', error)
            toast.error('Error al actualizar asignación')
        } finally {
            setUpdatingId(null)
        }
    }

    const filteredAssignments = supervisoresTurno.filter(s => s.planta.toLowerCase() === activeTab.toLowerCase())

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight leading-none mb-1">Supervisores</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Gestión de líderes por turno</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all shadow-inner"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Supervisor Selector */}
                <div className="p-6 bg-slate-50 border-b border-gray-100">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12} fill="currentColor" /> Seleccionar Nuevo Supervisor
                        </label>
                        <select 
                            value={selectedSupervisorId || ''} 
                            onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">-- Elige un supervisor para asignar --</option>
                            {supervisores.map(s => (
                                <option key={s.id} value={s.id}>{s.supervisor}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-4 bg-white border-b border-gray-50">
                    <button 
                        onClick={() => setActiveTab('Muebles')}
                        className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'Muebles' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Planta Muebles
                        {activeTab === 'Muebles' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('Cefi')}
                        className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'Cefi' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Planta Cefi
                        {activeTab === 'Cefi' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                </div>

                {/* Assignments List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando asignaciones...</span>
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                            <p className="text-gray-400 font-bold">Sin asignaciones configuradas</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAssignments.map((assignment) => (
                                <div key={assignment.id} className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 transition-all flex items-center justify-between group shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-sm">
                                            {assignment.turno}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Turno</p>
                                            <h4 className="text-sm font-bold text-slate-700">
                                                {assignment.supervisor_nombre || 'Sin asignar'}
                                            </h4>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleUpdateAssignment(assignment.id)}
                                        disabled={updatingId !== null || !selectedSupervisorId}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                            ${updatingId === assignment.id 
                                                ? 'bg-indigo-50 text-indigo-600' 
                                                : !selectedSupervisorId 
                                                    ? 'bg-gray-50 text-gray-300 pointer-events-none' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'
                                            }`}
                                    >
                                        {updatingId === assignment.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <RefreshCcw size={14} />
                                        )}
                                        {updatingId === assignment.id ? 'Guardando' : 'Reasignar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-4 bg-indigo-600 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Planta {activeTab}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Award size={16} className="text-amber-300" />
                        <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-widest">Asignación Directa</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
