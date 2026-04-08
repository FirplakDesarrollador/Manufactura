'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ConteoDefecto } from '@/types/muebles'
import { getConteoDefectos } from '@/lib/supabase/queries/muebles'
import { 
    Calendar as CalendarIcon, 
    Filter, 
    RefreshCw, 
    Loader2, 
    LayoutGrid,
    Clock,
    Wrench,
    CheckCircle2,
    XCircle,
    FileText
} from 'lucide-react'
import PanelDefectoCard from './PanelDefectoCard'
import DefectosReportadosModal from './DefectosReportadosModal'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PanelDefectosModuleProps {
    plantaMuebles: string
    turno: string
}

export default function PanelDefectosModule({ plantaMuebles, turno }: PanelDefectosModuleProps) {
    const [data, setData] = useState<ConteoDefecto[]>([])
    const [loading, setLoading] = useState(true)
    
    // Detailed view modal state
    const [selectedDetail, setSelectedDetail] = useState<{
        nombre: string,
        ids: number[]
    } | null>(null)

    // Filters
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [selectedTurno, setSelectedTurno] = useState<string>(turno)
    
    const taladrosOptions = plantaMuebles === 'Muebles' 
        ? ["CYFLEX S", "CX100", "CX200", "HUAHUA", "HUA HUA 2"]
        : ["Taladro Cefi"]
    const [selectedTaladros, setSelectedTaladros] = useState<string[]>(taladrosOptions)

    const [selectedTipos, setSelectedTipos] = useState<boolean[]>([true, false]) // true = Reparación, false = Reposición

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const results = await getConteoDefectos({
                fecha: selectedDate,
                planta: plantaMuebles,
                turno: selectedTurno === 'all' ? undefined : selectedTurno,
                taladros: selectedTaladros,
                tipos: selectedTipos
            })
            setData(results)
        } catch (error) {
            console.error('Error loading panel data:', error)
            toast.error('Error al cargar datos del panel')
        } finally {
            setLoading(false)
        }
    }, [selectedDate, plantaMuebles, selectedTurno, selectedTaladros, selectedTipos])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Grouping logic (equivalent to agruparReposiciones)
    const groupedData = React.useMemo(() => {
        const grouped: Record<number, any> = {}
        
        data.forEach(item => {
            if (!grouped[item.defecto_id]) {
                grouped[item.defecto_id] = {
                    defecto_id: item.defecto_id,
                    defecto: item.defecto,
                    cantidad: 0,
                    alerta_amarilla: item.alerta_amarilla,
                    alerta_roja: item.alerta_roja,
                    ids_reposiciones: []
                }
            }
            grouped[item.defecto_id].cantidad += Number(item.cantidad)
            grouped[item.defecto_id].ids_reposiciones.push(...(item.ids_reposiciones || []))
        })
        
        return Object.values(grouped).sort((a: any, b: any) => b.cantidad - a.cantidad)
    }, [data])

    const toggleTaladro = (t: string) => {
        setSelectedTaladros(prev => 
            prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
        )
    }

    const toggleTipo = (val: boolean) => {
        setSelectedTipos(prev => 
            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header / Sidebar-like Filter Bar */}
            <div className="bg-white border-b border-gray-100 p-6 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        {/* Filters Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
                            {/* Date Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <CalendarIcon size={12} /> Fecha de Reporte
                                </label>
                                <input 
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
                                />
                            </div>

                            {/* Turno Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Clock size={12} /> Turno Laboral
                                </label>
                                <select 
                                    value={selectedTurno}
                                    onChange={(e) => setSelectedTurno(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="1">Turno 1</option>
                                    <option value="2">Turno 2</option>
                                    <option value="3">Turno 3</option>
                                    <option value="all">Todos los Turnos</option>
                                </select>
                            </div>

                            {/* Taladros Multi-select (Visual Tags) */}
                            <div className="space-y-1.5 min-w-[200px]">
                                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Wrench size={12} /> Centros de Trabajo
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-xl min-h-[42px]">
                                    {taladrosOptions.map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => toggleTaladro(t)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                                selectedTaladros.includes(t) 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tipo Multi-select */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <LayoutGrid size={12} /> Tipo de Hallazgo
                                </label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleTipo(true)}
                                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                            selectedTipos.includes(true)
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-400 opacity-60'
                                        }`}
                                    >
                                        <CheckCircle2 size={14} className={selectedTipos.includes(true) ? 'text-blue-500' : ''} />
                                        REPARACIÓN
                                    </button>
                                    <button 
                                        onClick={() => toggleTipo(false)}
                                        className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                            selectedTipos.includes(false)
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-400 opacity-60'
                                        }`}
                                    >
                                        <XCircle size={14} className={selectedTipos.includes(false) ? 'text-blue-500' : ''} />
                                        REPOSICIÓN
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 self-center lg:self-end">
                            <button 
                                onClick={loadData}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all active:scale-95 shadow-sm bg-white"
                                title="Actualizar datos"
                            >
                                <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    {!loading && data.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Defectos:</span>
                                <span className="text-xl font-black text-blue-600 leading-none">{groupedData.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hallazgos Totales:</span>
                                <span className="text-xl font-black text-blue-600 leading-none">
                                    {groupedData.reduce((acc, curr: any) => acc + curr.cantidad, 0)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="relative">
                                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Procesando información...</h3>
                            <p className="text-sm text-gray-500">Analizando registros de calidad del día seleccionado</p>
                        </div>
                    ) : groupedData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-gray-200 mx-4">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                <FileText size={40} className="text-blue-200" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800">Sin hallazgos registrados</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-2">
                                Buen trabajo. No se han reportado defectos para los filtros seleccionados en este periodo.
                            </p>
                            <button 
                                onClick={() => {
                                    setSelectedTurno('all')
                                    setSelectedTaladros(taladrosOptions)
                                    setSelectedTipos([true, false])
                                }}
                                className="mt-6 text-sm font-bold text-blue-600 hover:underline"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {groupedData.map((defecto: any) => (
                                <PanelDefectoCard 
                                    key={defecto.defecto_id}
                                    defecto={defecto.defecto}
                                    cantidad={defecto.cantidad}
                                    alertaAmarilla={defecto.alerta_amarilla}
                                    alertaRoja={defecto.alerta_roja}
                                    idsReposiciones={defecto.ids_reposiciones}
                                    onClick={() => setSelectedDetail({
                                        nombre: defecto.defecto,
                                        ids: defecto.ids_reposiciones
                                    })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed View Modal */}
            {selectedDetail && (
                <DefectosReportadosModal 
                    defectoNombre={selectedDetail.nombre}
                    idsReposiciones={selectedDetail.ids}
                    onClose={() => setSelectedDetail(null)}
                />
            )}
        </div>
    )
}
