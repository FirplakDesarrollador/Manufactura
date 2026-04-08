'use client'

import React, { useState, useEffect } from 'react'
import { ReposicionMueble } from '@/types/muebles'
import { getReposicionesByIds } from '@/lib/supabase/queries/muebles'
import { X, AlertCircle, Loader2, ListFilter, Download } from 'lucide-react'
import DefectoReportadoItemCard from './DefectoReportadoItemCard'
import { toast } from 'sonner'

interface DefectosReportadosModalProps {
    defectoNombre: string
    idsReposiciones: number[]
    onClose: () => void
}

export default function DefectosReportadosModal({ 
    defectoNombre, 
    idsReposiciones, 
    onClose 
}: DefectosReportadosModalProps) {
    const [reposiciones, setReposiciones] = useState<ReposicionMueble[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDocs = async () => {
            setLoading(true)
            try {
                const results = await getReposicionesByIds(idsReposiciones)
                setReposiciones(results)
            } catch (error) {
                console.error('Error loading defect details:', error)
                toast.error('Error al cargar detalles de hallazgos')
            } finally {
                setLoading(false)
            }
        }
        loadDocs()
    }, [idsReposiciones])

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                            <AlertCircle className="text-rose-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none mb-1">
                                Detalle de Hallazgos
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                                    {defectoNombre}
                                </span>
                                <span className="text-xs font-bold text-gray-400">•</span>
                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                    <ListFilter size={12} /> {reposiciones.length} registros cargados
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => toast.info('Funcionalidad de exportación en desarrollo')}
                            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                            title="Exportar registros"
                        >
                            <Download size={20} />
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all shadow-inner"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                            <div className="relative w-20 h-20">
                                <Loader2 className="animate-spin text-blue-500 w-full h-full stroke-[1.5]" size={48} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-gray-800">Recuperando evidencias</h3>
                                <p className="text-sm text-gray-500 max-w-xs">Consultando base de datos de trazabilidad y reposiciones...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-6">
                            {reposiciones.length === 0 ? (
                                <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <AlertCircle size={48} className="text-gray-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-700">No se encontraron detalles</h3>
                                    <p className="text-sm text-gray-500">Los registros podrían haber sido archivados o modificados.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {reposiciones.map((item) => (
                                        <DefectoReportadoItemCard 
                                            key={item.id} 
                                            reposicion={item} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Panel de Calidad • Manufactura Muebles
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Datos Actualizados</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
