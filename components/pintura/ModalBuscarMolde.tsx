'use client'

import React, { useState, useEffect } from 'react'
import { Molde } from '@/types/pintura'
import { getAllMoldes, updateMoldeEstado, getCurrentUserProfile } from '@/lib/supabase/queries/pintura'
import { Search, X, Eraser, RefreshCw, Wrench } from 'lucide-react'

interface ModalBuscarMoldeProps {
    isOpen: boolean
    onClose: () => void
}

export default function ModalBuscarMolde({ isOpen, onClose }: ModalBuscarMoldeProps) {
    const [moldes, setMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [updating, setUpdating] = useState<number | null>(null)
    const [sapStatuses, setSapStatuses] = useState<Record<string, { status: string; loading: boolean; error?: boolean; notFound?: boolean }>>({})
    const [currentUser, setCurrentUser] = useState<{ nombre: string; correo: string } | null>(null)

    const loadSapStatus = async (serial: string) => {
        if (sapStatuses[serial]) return;

        setSapStatuses(prev => ({ ...prev, [serial]: { status: '', loading: true } }))
        try {
            const res = await fetch(`/api/sap/mold-status/${serial}`)
            if (!res.ok) throw new Error('Error de conexión con SAP')
            const data = await res.json()
            
            if (data.found === false) {
                // Molde no existe en SAP
                setSapStatuses(prev => ({ ...prev, [serial]: { status: 'No registrado', loading: false, notFound: true } }))
            } else if (data.estadoSAP) {
                // Molde encontrado con estado
                setSapStatuses(prev => ({ ...prev, [serial]: { status: data.estadoSAP, loading: false } }))
            } else {
                // Molde encontrado pero sin estado asignado
                setSapStatuses(prev => ({ ...prev, [serial]: { status: 'Sin estado', loading: false } }))
            }
        } catch (err) {
            setSapStatuses(prev => ({ ...prev, [serial]: { status: 'Error', loading: false, error: true } }))
        }
    }

    const loadMoldes = React.useCallback(async () => {
        setLoading(true)
        const data = await getAllMoldes()
        setMoldes(data)
        setLoading(false)
    }, [])

    const loadUser = async () => {
        const profile = await getCurrentUserProfile()
        if (profile) setCurrentUser(profile)
    }

    useEffect(() => {
        if (isOpen) {
            loadMoldes()
            loadUser()
        }
    }, [isOpen, loadMoldes])

    // Cargar estados de SAP para los moldes filtrados (limitado para evitar sobrecarga)
    useEffect(() => {
        const visibleMoldes = moldes.filter(m =>
            !searchText ||
            m.serial.toLowerCase().includes(searchText.toLowerCase()) ||
            m.molde_descripcion.toLowerCase().includes(searchText.toLowerCase())
        ).slice(0, 20); // Solo los primeros 20 visibles

        visibleMoldes.forEach(m => {
            if (!sapStatuses[m.serial]) {
                loadSapStatus(m.serial)
            }
        })
    }, [searchText, moldes])

    const handleUpdateEstado = async (moldeId: number, nuevoEstado: string = 'Disponible', descripcion?: string) => {
        setUpdating(moldeId)
        try {
            await updateMoldeEstado(
                moldeId, 
                nuevoEstado, 
                descripcion, 
                currentUser?.nombre || currentUser?.correo || undefined
            )
            alert(`¡Acción exitosa! Se cambió el estado del molde a ${nuevoEstado} correctamente`)
            loadMoldes()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('¡Error inesperado! No se pudo cambiar el estado del molde')
        } finally {
            setUpdating(null)
        }
    }

    const filteredMoldes = moldes.filter(m =>
        !searchText ||
        m.serial.toLowerCase().includes(searchText.toLowerCase()) ||
        m.molde_descripcion.toLowerCase().includes(searchText.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[600px] h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-cyan-700">Buscador de moldes</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={28} className="text-cyan-700" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Ingrese serial o descripción..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full px-5 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setSearchText('')}
                            className="bg-orange-500 px-4 rounded-xl text-white hover:bg-orange-600 transition-colors shadow-md flex items-center gap-2"
                            title="Limpiar"
                        >
                            <Eraser size={22} />
                            <span className="font-bold hidden sm:inline">Limpiar</span>
                        </button>
                    </div>

                    <div className="text-sm font-bold text-cyan-600 px-1">
                        Moldes encontrados: <span className="text-gray-900 ml-1">{filteredMoldes.length}</span>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                            <span className="text-sm font-medium text-gray-500">Cargando moldes...</span>
                        </div>
                    ) : filteredMoldes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={48} className="mb-2 opacity-20" />
                            <p className="font-medium">No se encontraron moldes</p>
                        </div>
                    ) : (
                        filteredMoldes.map((molde) => (
                            <div
                                key={molde.id}
                                className="flex items-center justify-between p-4 bg-white border-2 border-gray-50 rounded-xl shadow-sm hover:border-cyan-100 hover:shadow-md transition-all group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-base font-bold text-cyan-700 truncate">
                                        {molde.serial}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500 mt-0.5">
                                        {molde.molde_descripcion}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${molde.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                            molde.estado === 'En uso' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            App: {molde.estado}
                                        </div>

                                        {/* Etiqueta SAP */}
                                        {(() => {
                                            const sap = sapStatuses[molde.serial]
                                            const styleClass = !sap || sap.loading 
                                                ? 'bg-gray-50 text-gray-400 border-gray-200'
                                                : sap.error 
                                                    ? 'bg-red-50 text-red-600 border-red-200'
                                                    : sap.notFound 
                                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                        : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                            return (
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${styleClass}`}>
                                                    <span className="opacity-60 text-[9px] uppercase tracking-wider">SAP:</span>
                                                    {!sap || sap.loading ? (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                                    ) : (
                                                        <span>{sap.status}</span>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {(molde.estado === 'En uso' || molde.estado === 'En reparacion') && (
                                        <button
                                            onClick={() => handleUpdateEstado(molde.id, 'Disponible', molde.molde_descripcion)}
                                            disabled={updating === molde.id}
                                            className="flex flex-col items-center justify-center p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:bg-gray-300"
                                            title="Liberar Molde"
                                        >
                                            <RefreshCw size={20} className={updating === molde.id ? 'animate-spin' : ''} />
                                            <span className="text-[10px] font-bold mt-1 uppercase">Liberar</span>
                                        </button>
                                    )}
                                    
                                    {molde.estado !== 'En reparacion' && (
                                        <button
                                            onClick={() => handleUpdateEstado(molde.id, 'En reparacion', molde.molde_descripcion)}
                                            disabled={updating === molde.id}
                                            className="flex flex-col items-center justify-center p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-md active:scale-95 disabled:bg-gray-300"
                                            title="Enviar a Reparación"
                                        >
                                            <Wrench size={20} className={updating === molde.id ? 'animate-spin' : ''} />
                                            <span className="text-[10px] font-bold mt-1 uppercase">Reparar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
