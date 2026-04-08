'use client'

import React, { useState } from 'react'
import { Defecto } from '@/types/muebles'
import { X, Save, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { upsertDefecto, deleteDefecto } from '@/lib/supabase/queries/muebles'
import { toast } from 'sonner'

interface EditDefectoModalProps {
    defecto?: Defecto // If undefined, we are creating a new one
    onClose: () => void
    onSuccess: () => void
}

export default function EditDefectoModal({ defecto, onClose, onSuccess }: EditDefectoModalProps) {
    const isEditing = !!defecto
    const [nombre, setNombre] = useState(defecto?.nombre || '')
    const [alertaAmarilla, setAlertaAmarilla] = useState(defecto?.alerta_amarilla || 0)
    const [alertaRoja, setAlertaRoja] = useState(defecto?.alerta_roja || 0)
    const [estado, setEstado] = useState(defecto?.estado ?? true)
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleSave = async () => {
        if (!nombre.trim()) {
            toast.error('El nombre es obligatorio')
            return
        }

        setLoading(true)
        try {
            await upsertDefecto({
                id: defecto?.id,
                nombre: nombre.trim(),
                alerta_amarilla: alertaAmarilla,
                alerta_roja: alertaRoja,
                estado: estado
            })
            toast.success(isEditing ? 'Defecto actualizado' : 'Defecto creado')
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error saving defect:', error)
            toast.error('Error al guardar el defecto')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!defecto?.id) return
        
        setLoading(true)
        try {
            await deleteDefecto(defecto.id)
            toast.success('Defecto eliminado')
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error deleting defect:', error)
            toast.error('Error al eliminar el defecto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800">
                        {isEditing ? 'Editar Defecto' : 'Nuevo Defecto'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition-colors shadow-sm">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Nombre del Defecto</label>
                        <input 
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium"
                            placeholder="Ej: Rayado, Manchado..."
                        />
                    </div>

                    {/* Alerts Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider ml-1">Alerta Amarilla</label>
                            <input 
                                type="number"
                                value={alertaAmarilla}
                                onChange={(e) => setAlertaAmarilla(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-100 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm font-bold text-amber-900"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1">Alerta Roja</label>
                            <input 
                                type="number"
                                value={alertaRoja}
                                onChange={(e) => setAlertaRoja(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-red-50/50 border border-red-100 rounded-xl focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all text-sm font-bold text-red-900"
                            />
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <span className="text-sm font-bold text-gray-800 block">Estado del Defecto</span>
                            <span className="text-xs text-gray-500">{estado ? 'Visible en registros' : 'Oculto para nuevos registros'}</span>
                        </div>
                        <button 
                            onClick={() => setEstado(!estado)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${estado ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${estado ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-3">
                    {isEditing ? (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Eliminar defecto"
                        >
                            <Trash2 size={20} />
                        </button>
                    ) : <div />}

                    <div className="flex gap-3 flex-1 justify-end">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            CANCELAR
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isEditing ? 'ACTUALIZAR' : 'CREAR DEFECTO'}
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[160] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar Defecto?</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-[240px]">
                            Esta acción no se puede deshacer. Se dejará de mostrar en los reportes de calidad.
                        </p>
                        <div className="flex gap-3 w-full max-w-[280px]">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            >
                                CANCELAR
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors"
                            >
                                SÍ, ELIMINAR
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
