'use client'

import React, { useState, useEffect } from 'react'
import { MetricasMuebles } from '@/types/muebles'
import { getMetricasDashboard } from '@/lib/supabase/queries/muebles'
import { 
    BarChart3, 
    PieChart, 
    RefreshCw, 
    Download, 
    Loader2, 
    LayoutDashboard,
    ExternalLink,
    AlertCircle,
    Info
} from 'lucide-react'
import MetricasDashboardCard from './MetricasDashboardCard'
import { toast } from 'sonner'

interface DashboardModuleProps {
    plantaMuebles: string
}

export default function DashboardModule({ plantaMuebles }: DashboardModuleProps) {
    const [metricas, setMetricas] = useState<MetricasMuebles[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'stats' | 'bi'>('stats')

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await getMetricasDashboard(plantaMuebles)
            setMetricas(data)
        } catch (error) {
            console.error('Error loading dashboard metrics:', error)
            toast.error('Error al cargar métricas')
        } finally {
            setLoading(false)
        }
    }, [plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    const exportToCSV = () => {
        if (!metricas.length) return
        
        try {
            const headers = Object.keys(metricas[0]).join(',')
            const rows = metricas.map(m => Object.values(m).join(','))
            const csvContent = [headers, ...rows].join('\n')
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            
            link.setAttribute('href', url)
            link.setAttribute('download', `metricas_muebles_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            toast.success('Reporte exportado correctamente')
        } catch (error) {
            toast.error('Error al exportar reporte')
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header / Tab Switcher */}
            <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-full md:w-fit">
                        <button 
                            onClick={() => setActiveTab('stats')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'stats' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 size={16} />
                            ESTADÍSTICAS
                        </button>
                        <button 
                            onClick={() => setActiveTab('bi')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'bi' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <LayoutDashboard size={16} />
                            BI REPORTING
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button 
                            onClick={loadData}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all active:scale-95 bg-white shadow-sm"
                            title="Actualizar datos"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        
                        {activeTab === 'stats' && (
                            <button 
                                onClick={exportToCSV}
                                disabled={loading || !metricas.length}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                <Download size={18} />
                                EXPORTAR CSV
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-y-auto ${activeTab === 'bi' ? 'p-0' : 'p-6 md:p-8'}`}>
                <div className={activeTab === 'bi' ? 'h-full w-full' : 'max-w-7xl mx-auto'}>
                    {activeTab === 'stats' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Rendimiento Histórico</h2>
                                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                        <Info size={14} className="text-blue-500" />
                                        Métricas consolidadas de los últimos 15 días de producción
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-100 italic font-medium text-xs text-blue-600">
                                    Planta: {plantaMuebles}
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center">
                                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                                    <h3 className="text-lg font-bold text-gray-800">Analizando registros históricos</h3>
                                    <p className="text-sm text-gray-500">Consolidando datos de turnos y procesos...</p>
                                </div>
                            ) : metricas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <AlertCircle size={48} className="text-gray-200 mb-4" />
                                    <h3 className="text-xl font-black text-gray-800">Sin datos de rendimiento</h3>
                                    <p className="text-sm text-gray-500 max-w-xs mt-2">
                                        No se han encontrado registros de métricas para este periodo. Los datos se generarán conforme avance el turno.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {metricas.map((m, idx) => (
                                        <MetricasDashboardCard 
                                            key={`${m.fecha}-${m.turno}-${idx}`} 
                                            metricas={m} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <iframe 
                                src="https://app.powerbi.com/view?r=eyJrIjoiYTUyODMwMmMtODZkYi00OTZhLThjNTktN2E4OGZkNzA1ZjI0IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9" 
                                className="w-full h-[calc(100vh-140px)] border-0"
                                title="Power BI Manufacture Report"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
