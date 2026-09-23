'use client'

import React, { useState, useEffect } from 'react'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'
import { 
    X, 
    ClipboardList, 
    Calendar, 
    User, 
    Layers, 
    Clock, 
    Trash2, 
    AlertTriangle,
    Loader2,
    RefreshCw,
    Wrench,
    CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

interface HistorialTrazabilidadModalProps {
    orden: OrdenMueble
    onClose: () => void
    onSuccess?: () => void
}

interface RegistroTrazabilidad {
    id: number
    orden_fabricacion: string
    proceso: string
    cantidad: number
    creado_por?: string
    nombre_operario?: string
    cedula_operario?: string
    taladro?: string
    turno?: string
    linea?: string
    supervisor?: string
    created_at: string
    fecha_inicio?: string
}

export default function HistorialTrazabilidadModal({ orden, onClose, onSuccess }: HistorialTrazabilidadModalProps) {
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const loadRegistros = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('trazabilidad_muebles')
                .select('*')
                .eq('orden_fabricacion', String(orden.orden_fabricacion))
                .order('created_at', { ascending: false })

            if (error) throw error
            setRegistros(data || [])
        } catch (error: any) {
            console.error('Error loading traceability history:', error)
            toast.error('Error al cargar historial de trazabilidad')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRegistros()
    }, [orden.orden_fabricacion])

    const handleDeleteRegistro = async (id: number) => {
        setDeletingId(id)
        try {
            const { error } = await supabase
                .from('trazabilidad_muebles')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Registro de trazabilidad eliminado')
            setRegistros(prev => prev.filter(r => r.id !== id))
            setConfirmDeleteId(null)
            onSuccess?.()
        } catch (error: any) {
            console.error('Error deleting traceability record:', error)
            toast.error('No se pudo eliminar el registro')
        } finally {
            setDeletingId(null)
        }
    }

    const getProcessBadgeColor = (proceso: string) => {
        switch (proceso?.toLowerCase()) {
            case 'corte':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'enchape':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            case 'inspeccion':
            case 'inspección':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'empaque':
                return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'digitado':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200'
            case 'transito':
            case 'tránsito':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'cedi':
                return 'bg-teal-100 text-teal-800 border-teal-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Sin fecha'
        try {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return dateStr
            return d.toLocaleString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    const totalPiezas = registros.reduce((sum, r) => sum + (r.cantidad || 0), 0)

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ClipboardList size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                Registros de Trazabilidad
                            </h3>
                            <p className="text-xs font-bold text-blue-600">
                                OF #{orden.orden_fabricacion}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadRegistros}
                            disabled={loading}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            title="Recargar registros"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Product Summary */}
                <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                    <div className="text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Producto: </span>
                        {orden.producto_descripcion || orden.producto_sku || 'Sin descripción'}
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
                            Total Registros: {registros.length}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                            Cant. Acumulada: {totalPiezas}
                        </span>
                    </div>
                </div>

                {/* Content List */}
                <div className="p-6 overflow-y-auto flex-1 space-y-3">
                    {loading ? (
                        <div className="py-16 text-center text-gray-400 font-medium flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <span>Cargando historial de procesos...</span>
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 font-medium flex flex-col items-center gap-2">
                            <Layers className="text-gray-300" size={48} />
                            <p className="text-sm font-bold text-gray-600">No hay procesos anteriores registrados</p>
                            <p className="text-xs text-gray-400">Esta orden aún no cuenta con movimientos de trazabilidad reportados.</p>
                        </div>
                    ) : (
                        registros.map((item) => (
                            <div 
                                key={item.id}
                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-all space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${getProcessBadgeColor(item.proceso)}`}>
                                            {item.proceso}
                                        </span>
                                        <span className="text-sm font-black text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                                            {item.cantidad} {item.cantidad === 1 ? 'pieza' : 'piezas'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                                            <Clock size={13} />
                                            {formatDate(item.created_at)}
                                        </div>
                                        {confirmDeleteId === item.id ? (
                                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                                                <button
                                                    onClick={() => handleDeleteRegistro(item.id)}
                                                    disabled={deletingId === item.id}
                                                    className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                                                >
                                                    {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : 'Borrar'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold hover:bg-gray-200"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(item.id)}
                                                className="p-1 text-gray-300 hover:text-red-600 rounded transition-colors"
                                                title="Eliminar este registro"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-lg">
                                    {item.nombre_operario && item.nombre_operario !== 'Desconocido' && (
                                        <div className="flex items-center gap-1.5">
                                            <User size={13} className="text-gray-400 shrink-0" />
                                            <span className="font-bold text-gray-700">Operario:</span>
                                            <span className="truncate">{item.nombre_operario}</span>
                                            {item.cedula_operario && item.cedula_operario !== 'NO APLICA' && (
                                                <span className="text-gray-400">({item.cedula_operario})</span>
                                            )}
                                        </div>
                                    )}
                                    {item.creado_por && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-gray-700">Reportado por:</span>
                                            <span className="truncate">{item.creado_por}</span>
                                        </div>
                                    )}
                                    {item.taladro && item.taladro !== 'NO APLICA' && (
                                        <div className="flex items-center gap-1.5">
                                            <Wrench size={13} className="text-gray-400 shrink-0" />
                                            <span className="font-bold text-gray-700">Taladro/Máquina:</span>
                                            <span>{item.taladro}</span>
                                        </div>
                                    )}
                                    {item.turno && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-gray-700">Turno:</span>
                                            <span>Turno {item.turno}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
