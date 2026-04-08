'use client'

import React, { useState, useEffect } from 'react'
import { Defecto } from '@/types/muebles'
import { getDefectos } from '@/lib/supabase/queries/muebles'
import { 
    Search, 
    Plus, 
    RefreshCw, 
    AlertCircle, 
    CheckCircle2, 
    XCircle,
    Loader2,
    Filter,
    Eraser
} from 'lucide-react'
import DefectoCard from './DefectoCard'
import EditDefectoModal from './EditDefectoModal'
import { toast } from 'sonner'

interface DefectosModuleProps {
    plantaMuebles: string
}

export default function DefectosModule({ plantaMuebles }: DefectosModuleProps) {
    const [defectos, setDefectos] = useState<Defecto[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true) // Default to Active
    const [selectedDefecto, setSelectedDefecto] = useState<Defecto | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await getDefectos(activeFilter)
            setDefectos(data)
        } catch (error) {
            console.error('Error loading defects:', error)
            toast.error('Error al cargar defectos')
        } finally {
            setLoading(false)
        }
    }, [activeFilter])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredDefectos = defectos.filter(d => 
        d.nombre.toLowerCase().includes(searchText.toLowerCase()) || 
        d.id.toString().includes(searchText)
    )

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex flex-wrap items-end gap-6 flex-1">
                        {/* Status Filter */}
                        <div className="space-y-1.5 min-w-[140px]">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Estado</label>
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select 
                                    value={activeFilter === undefined ? 'all' : activeFilter.toString()}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setActiveFilter(val === 'all' ? undefined : val === 'true')
                                    }}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                                >
                                    <option value="true">Activos</option>
                                    <option value="false">Inactivos</option>
                                    <option value="all">Todos</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="space-y-1.5 flex-1 min-w-[280px] max-w-md">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Buscar Defecto</label>
                            <div className="relative group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                <input 
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Nombre o ID del defecto..."
                                    className="w-full pl-11 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium"
                                />
                                {searchText && (
                                    <button 
                                        onClick={() => setSearchText('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                                    >
                                        <Eraser size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={loadData}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all active:scale-95"
                            title="Actualizar lista"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={20} />
                            <span>CREAR DEFECTO</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Info */}
            <div className="max-w-7xl mx-auto w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Resultados:</span>
                    <span className="text-sm font-black text-blue-600">{filteredDefectos.length}</span>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-blue-500 text-xs font-bold animate-pulse">
                        <Loader2 className="animate-spin" size={14} />
                        CARGANDO...
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-12">
                <div className="max-w-7xl mx-auto">
                    {filteredDefectos.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Search size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">No se encontraron defectos</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-1">
                                No hay registros que coincidan con los filtros seleccionados.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredDefectos.map((defecto) => (
                                <DefectoCard 
                                    key={defecto.id} 
                                    defecto={defecto} 
                                    onClick={() => setSelectedDefecto(defecto)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {isCreateModalOpen && (
                <EditDefectoModal 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={loadData}
                />
            )}
            
            {selectedDefecto && (
                <EditDefectoModal 
                    defecto={selectedDefecto}
                    onClose={() => setSelectedDefecto(null)}
                    onSuccess={loadData}
                />
            )}
        </div>
    )
}
