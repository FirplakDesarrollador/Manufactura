'use client'

import React, { useState, useEffect } from 'react'
import { Molde } from '@/types/pintura'
import { getAllMoldes, updateMoldeEstado } from '@/lib/supabase/queries/pintura'
import { Search, X, Eraser, RefreshCw } from 'lucide-react'

interface ModalBuscarMoldeProps {
    isOpen: boolean
    onClose: () => void
}

export default function ModalBuscarMolde({ isOpen, onClose }: ModalBuscarMoldeProps) {
    const [moldes, setMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [updating, setUpdating] = useState<number | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadMoldes()
        }
    }, [isOpen])

    const loadMoldes = async () => {
        setLoading(true)
        const data = await getAllMoldes()
        setMoldes(data)
        setLoading(false)
    }

    const handleUpdateEstado = async (moldeId: number) => {
        setUpdating(moldeId)
        try {
            await updateMoldeEstado(moldeId, 'Disponible')
            alert('¡Acción exitosa! Se cambió el estado del molde correctamente')
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
                                    <div className="text-xs font-medium text-gray-500 mt-1">
                                        {molde.molde_descripcion}
                                    </div>
                                    <div className={`text-[11px] font-bold mt-2 inline-block px-2 py-0.5 rounded-full ${molde.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                            molde.estado === 'En uso' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {molde.estado}
                                    </div>
                                </div>

                                {molde.estado === 'En uso' && (
                                    <button
                                        onClick={() => handleUpdateEstado(molde.id)}
                                        disabled={updating === molde.id}
                                        className="flex flex-col items-center justify-center p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all shadow-md active:scale-95 disabled:bg-gray-300"
                                        title="Liberar Molde"
                                    >
                                        <RefreshCw size={20} className={updating === molde.id ? 'animate-spin' : ''} />
                                        <span className="text-[10px] font-bold mt-1">LIBERAR</span>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
