'use client'

import React, { useState, useEffect } from 'react'
import {
    getTrazabilidadDia,
    TrazabilidadDia,
    getMetricasDiaActual,
    getPinturaColorHoy,
    getVaciadoTamanoHoy,
    getProgramacionColores,
    getProgramacionTamanos,
    MetricasDia,
    PinturaColor,
    VaciadoTamano,
    ProgramacionColor,
    ProgramacionTamano
} from "@/lib/supabase/queries/dashboard"
import TrazabilidadTable from './TrazabilidadTable'
import ProductionCharts from './ProductionCharts'
import { MetricCards } from './MetricCards'
import { DetailedCharts } from './DetailedCharts'
import CargaMoldesTable from './CargaMoldesTable'
import CargaProductosTable from './CargaProductosTable'
import OrdenesTable from './OrdenesTable'
import BIViewer from './BIViewer'
import KilosReferenciaTable from './KilosReferenciaTable'
import {
    LayoutDashboard,
    Table as TableIcon,
    BarChart3,
    RefreshCw,
    Inbox,
    Package,
    FileText,
    PieChart
} from 'lucide-react'

export default function DashboardModule() {
    const [trazabilidadData, setTrazabilidadData] = useState<TrazabilidadDia[]>([])
    const [metricasDia, setMetricasDia] = useState<MetricasDia | null>(null)
    const [pinturaColor, setPinturaColor] = useState<PinturaColor | null>(null)
    const [vaciadoTamano, setVaciadoTamano] = useState<VaciadoTamano | null>(null)
    const [progColor, setProgColor] = useState<ProgramacionColor[]>([])
    const [progTamano, setProgTamano] = useState<ProgramacionTamano[]>([])

    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'charts' | 'table'>('charts')
    const [activeSubModule, setActiveSubModule] = useState<'estadisticas' | 'cargaMoldes' | 'cargaProductos' | 'ordenes' | 'bi' | 'kilosReferencia'>('estadisticas')

    const loadData = async () => {
        setLoading(true)
        try {
            const [
                trazabilidad,
                metricas,
                pColor,
                pTamano
            ] = await Promise.all([
                getTrazabilidadDia(),
                getMetricasDiaActual(),
                getProgramacionColores(),
                getProgramacionTamanos()
            ])

            setTrazabilidadData(trazabilidad)
            setMetricasDia(metricas)
            setPinturaColor(metricas as any) // Reuse metricas as it contains the same daily view data
            setVaciadoTamano(metricas as any)
            setProgColor(pColor)
            setProgTamano(pTamano)
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1e293b] rounded-lg shadow-lg">
                        <LayoutDashboard className="text-[#00bcd4]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Manufactura</h2>
                        <p className="text-xs text-[#00a3e0] uppercase tracking-widest font-black">Monitoreo en tiempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-xl mr-2 font-medium">
                        <button
                            onClick={() => setActiveTab('charts')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'charts'
                                    ? 'bg-white text-[#254153] shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <BarChart3 size={18} />
                            Gráficos
                        </button>
                        <button
                            onClick={() => setActiveTab('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'table'
                                    ? 'bg-white text-[#254153] shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <TableIcon size={18} />
                            Tabla Detallada
                        </button>
                    </div>

                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                        title="Actualizar Datos"
                    >
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
                    </button>

                    <div className="ml-2 hidden md:block text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Usuario</p>
                        <p className="text-xs font-bold text-[#254153]">analista2.desarrollo</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-2 lg:p-2 animate-in fade-in duration-300">
                {activeSubModule === 'estadisticas' && (
                    <div className="max-w-full mx-auto">
                        {activeTab === 'charts' ? (
                            <div className="animate-in fade-in duration-500">
                                {/* Layout Grid: Squares on Left, Tables on Right */}
                                <div className="flex flex-col lg:flex-row gap-4">
                                    {/* Left Side: The Squares */}
                                    <div className="w-fit shrink-0 mx-auto lg:mx-0">
                                        <MetricCards data={metricasDia} loading={loading} />
                                    </div>

                                    {/* Right Side: Detailed Breakdowns */}
                                    <div className="flex-1 min-w-0">
                                        <div className="space-y-4">
                                            <DetailedCharts
                                                pinturaColor={pinturaColor}
                                                vaciadoTamano={vaciadoTamano}
                                                progColor={progColor}
                                                progTamano={progTamano}
                                                loading={loading}
                                            />

                                            {/* Keep the hourly trend chart at the bottom */}
                                            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tendencia de Producción (Hoy)</h3>
                                                <ProductionCharts data={trazabilidadData} />
                                            </div>

                                            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                                <div className="p-2 bg-gray-50 border-b border-gray-100">
                                                    <h3 className="text-sm font-bold text-[#254153]">Trazabilidad Día</h3>
                                                </div>
                                                <TrazabilidadTable data={trazabilidadData} loading={loading} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <TrazabilidadTable data={trazabilidadData} loading={loading} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeSubModule === 'cargaMoldes' && (
                    <div className="max-w-full mx-auto h-full">
                        <CargaMoldesTable />
                    </div>
                )}

                {activeSubModule === 'cargaProductos' && (
                    <div className="max-w-full mx-auto h-full">
                        <CargaProductosTable />
                    </div>
                )}
                
                {activeSubModule === 'ordenes' && (
                    <div className="max-w-full mx-auto h-full">
                        <OrdenesTable />
                    </div>
                )}

                {activeSubModule === 'bi' && (
                    <div className="max-w-full mx-auto h-full">
                        <BIViewer />
                    </div>
                )}

                {activeSubModule === 'kilosReferencia' && (
                    <div className="max-w-full mx-auto h-full">
                        <KilosReferenciaTable />
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="bg-white w-full shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-200 overflow-x-auto">
                <div className="flex flex-row min-w-max md:min-w-0 md:justify-center">
                    <button
                        onClick={() => setActiveSubModule('estadisticas')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'estadisticas' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <BarChart3 size={20} className={activeSubModule === 'estadisticas' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">Estadísticas</span>
                    </button>
                    
                    <button
                        onClick={() => setActiveSubModule('cargaMoldes')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'cargaMoldes' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <Inbox size={20} className={activeSubModule === 'cargaMoldes' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">Carga moldes</span>
                    </button>

                    <button
                        onClick={() => setActiveSubModule('cargaProductos')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'cargaProductos' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <Package size={20} className={activeSubModule === 'cargaProductos' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">Carga productos</span>
                    </button>

                    <button
                        onClick={() => setActiveSubModule('ordenes')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'ordenes' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <FileText size={20} className={activeSubModule === 'ordenes' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">Órdenes</span>
                    </button>

                    <button
                        onClick={() => setActiveSubModule('bi')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'bi' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <PieChart size={20} className={activeSubModule === 'bi' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">BI</span>
                    </button>

                    <button
                        onClick={() => setActiveSubModule('kilosReferencia')}
                        className={`flex-1 min-w-[120px] px-4 flex flex-col items-center justify-center gap-1.5 py-2.5 border-t-2 transition-colors ${
                            activeSubModule === 'kilosReferencia' 
                                ? 'border-[#00bcd4] text-[#254153] bg-[#00bcd4]/5 font-bold' 
                                : 'border-transparent text-gray-500 hover:text-[#254153] hover:bg-gray-50 font-medium'
                        }`}
                    >
                        <TableIcon size={20} className={activeSubModule === 'kilosReferencia' ? "text-[#00bcd4]" : ""} />
                        <span className="text-[11px] whitespace-nowrap">Kilos ref.</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
