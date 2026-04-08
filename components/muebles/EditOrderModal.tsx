'use client'

import React, { useState } from 'react'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'
import { 
    X, 
    Save, 
    Trash2, 
    ClipboardList, 
    AlertTriangle,
    Loader2,
    CheckCircle2
} from 'lucide-react'
import TrazabilidadModal from './TrazabilidadModal'

interface EditOrderModalProps {
    orden: OrdenMueble
    usuarioNombre: string
    turno: string
    onClose: () => void
    onSuccess: () => void
}

export default function EditOrderModal({ orden, usuarioNombre, turno, onClose, onSuccess }: EditOrderModalProps) {
    const [cantidad, setCantidad] = useState(orden.cantidad || 0)
    const [ensayo, setEnsayo] = useState(orden.ensayo || false)
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showTraceability, setShowTraceability] = useState(false)

    const handleSave = async () => {
        if (cantidad <= 0) {
            alert('La cantidad debe ser mayor a 0')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('ordenes_fabricacion_muebles')
                .update({
                    cantidad: cantidad,
                    ensayo: ensayo
                })
                .eq('id', orden.id)

            if (error) throw error

            alert('¡Acción exitosa! Se ha modificado la orden correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error updating order:', error)
            alert('Error inesperado: No se pudo modificar la orden')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('ordenes_fabricacion_muebles')
                .delete()
                .eq('id', orden.id)

            if (error) throw error

            alert('¡Acción exitosa! Se ha eliminado la orden correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error deleting order:', error)
            alert('Error al eliminar la orden')
        } finally {
            setLoading(false)
        }
    }

    if (showTraceability) {
        return (
            <TrazabilidadModal 
                isOpen={true}
                orden={orden} 
                proceso="Corte" // Basic entry point
                usuarioNombre={usuarioNombre}
                turno={turno}
                onSuccess={() => {
                    onSuccess()
                    setShowTraceability(false)
                }}
                onClose={() => setShowTraceability(false)} 
            />
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <h3 className="text-xl font-bold text-blue-600">OF: {orden.orden_fabricacion}</h3>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm font-medium text-blue-800 text-center leading-relaxed italic">
                            {orden.producto_descripcion}
                        </p>
                    </div>

                    {/* Traceability Button */}
                    <button
                        onClick={() => setShowTraceability(true)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <ClipboardList size={20} />
                        REGISTROS DE TRAZABILIDAD
                    </button>

                    {/* Form Controls */}
                    <div className="grid grid-cols-2 gap-6 pt-2">
                        {/* Cantidad */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-blue-600 uppercase tracking-wider block">Cantidad</label>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-center focus:border-blue-500 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        {/* Ensayo */}
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <label className="text-xs font-black text-blue-600 uppercase tracking-wider">Ensayo</label>
                            <button
                                onClick={() => setEnsayo(!ensayo)}
                                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                                    ensayo ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ${
                                        ensayo ? 'translate-x-11' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-1 py-3 bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Trash2 size={20} />
                            ELIMINAR
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            GUARDAR
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-red-950/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle size={40} />
                        </div>
                        <div className="space-y-2 text-center">
                            <h4 className="text-2xl font-bold text-gray-900">¿Confirmar Acción?</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                ¿Está seguro que desea eliminar esta orden de fabricación? 
                                <br />
                                <span className="font-bold text-red-600">Esto eliminará todos los registros asociados.</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-colors"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
