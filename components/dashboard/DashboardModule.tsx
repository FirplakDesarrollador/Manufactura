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
import {
    LayoutDashboard,
    Table as TableIcon,
    BarChart3,
    RefreshCw
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

    const loadData = async () => {
        setLoading(true)
        try {
            const [
                trazabilidad,
                metricas,
                pintura,
                vaciado,
                pColor,
                pTamano
            ] = await Promise.all([
                getTrazabilidadDia(),
                getMetricasDiaActual(),
                getPinturaColorHoy(),
                getVaciadoTamanoHoy(),
                getProgramacionColores(),
                getProgramacionTamanos()
            ])

            setTrazabilidadData(trazabilidad)
            setMetricasDia(metricas)
            setPinturaColor(pintura)
            setVaciadoTamano(vaciado)
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
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-[1600px] mx-auto">
                    {activeTab === 'charts' ? (
                        <div className="animate-in fade-in duration-500">
                            {/* Layout Grid: Squares on Left, Tables on Right */}
                            <div className="flex flex-col xl:flex-row gap-12">
                                {/* Left Side: The Squares */}
                                <div className="xl:w-fit shrink-0">
                                    <MetricCards data={metricasDia} loading={loading} />
                                </div>

                                {/* Right Side: Detailed Breakdowns */}
                                <div className="flex-1 min-w-0">
                                    <div className="space-y-12">
                                        <DetailedCharts
                                            pinturaColor={pinturaColor}
                                            vaciadoTamano={vaciadoTamano}
                                            progColor={progColor}
                                            progTamano={progTamano}
                                            loading={loading}
                                        />

                                        {/* Keep the hourly trend chart at the bottom */}
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Tendencia de Producción (Hoy)</h3>
                                            <ProductionCharts data={trazabilidadData} />
                                        </div>

                                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                                <h3 className="text-lg font-bold text-[#254153]">Trazabilidad Día</h3>
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
            </div>
        </div>
    )
}
