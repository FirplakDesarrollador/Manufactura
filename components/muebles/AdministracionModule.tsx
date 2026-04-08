'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import OrderCard from './OrderCard'
import EditOrderModal from './EditOrderModal'
import { 
    Search, 
    X, 
    Calendar, 
    RefreshCw, 
    Settings, 
    Upload, 
    Loader2, 
    ArrowUpFromLine,
    BarChart3,
    Package
} from 'lucide-react'
import { toast } from 'sonner'

interface AdministracionModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function AdministracionModule({ userEmail, turno, usuarioNombre, plantaMuebles }: AdministracionModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [metricas, setMetricas] = useState<MetricasMuebles | null>(null)
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedOrder, setSelectedOrder] = useState<OrdenMueble | null>(null)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles),
                getMetricasMueblesHoy(turno)
            ])
            setOrdenes(ordenesData)
            if (metricasData && metricasData.length > 0) {
                setMetricas(metricasData[0])
            }
        } catch (error) {
            console.error('Error loading Muebles administration data:', error)
        } finally {
            setLoading(false)
        }
    }, [turno, plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleClearFilters = () => {
        setSearchText('')
        setSelectedDate('')
    }

    const filteredOrdenes = useMemo(() => {
        const search = searchText.toLowerCase()
        return ordenes.filter((orden) => {
            const matchesSearch = !search ||
                (orden.producto_descripcion || '').toLowerCase().includes(search) ||
                (orden.orden_fabricacion || '').toLowerCase().includes(search) ||
                (orden.numero_pedido || '').toLowerCase().includes(search) ||
                (orden.producto_sku || '').toLowerCase().includes(search) ||
                (orden.cliente || '').toLowerCase().includes(search)

            const ordenDate = dateType === 'entrega' 
                ? orden.fecha_entrega_estimada 
                : orden.created_at
            
            const matchesDate = !selectedDate || (ordenDate && ordenDate.includes(selectedDate))

            return matchesSearch && matchesDate
        })
    }, [ordenes, searchText, selectedDate, dateType])

    const handleSyncSAP = async () => {
        if (!confirm('¿Está seguro(a) que desea cargar las órdenes desde SAP manualmente? This process may take a few minutes.')) {
            return
        }

        setIsSyncing(true)
        try {
            const { data, error } = await supabase.functions.invoke('cargar-ordenes-sap-muebles')
            
            if (error) throw error

            const count = data?.ordenesCargadas || 0
            toast.success(`¡Carga exitosa! Se cargaron ${count} órdenes a la App`)
            await loadData()
        } catch (error) {
            console.error('Error syncing with SAP:', error)
            toast.error('Error al sincronizar con SAP: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        } finally {
            setIsSyncing(false)
        }
    }

    const stats = useMemo(() => {
        const totalProgramadoMuebles = filteredOrdenes.reduce((sum, o) => sum + (o.cantidad || 0), 0)
        const totalProgramadoPiezas = filteredOrdenes.reduce((sum, o) => sum + (Number(o.piezas) || 0), 0)
        
        let pendienteMuebles = 0
        let pendientePiezas = 0
        
        filteredOrdenes.forEach(o => {
            const m = o.por_cortar || 0
            const p = Number(o.piezas_pendientes) || 0
            pendienteMuebles += m
            pendientePiezas += p
        })

        const totalReposicionesMuebles = filteredOrdenes.reduce((sum, o) => sum + (o.reposiciones || 0), 0)
        const totalReposicionesPiezas = filteredOrdenes.reduce((sum, o) => sum + (o.por_reponer || 0), 0)

        return {
            programado: { muebles: totalProgramadoMuebles, piezas: totalProgramadoPiezas },
            pendiente: { muebles: pendienteMuebles, piezas: pendientePiezas },
            reposiciones: { muebles: totalReposicionesMuebles, piezas: totalReposicionesPiezas }
        }
    }, [filteredOrdenes])

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="bg-white p-3 border-b border-gray-200">
                <div className="max-w-[1400px] mx-auto flex flex-col gap-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Filtrar ordenes:</span>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setDateType(dateType === 'entrega' ? 'creacion' : 'entrega')}
                                    className={`p-2 rounded-lg text-white transition-all ${dateType === 'entrega' ? 'bg-indigo-600' : 'bg-purple-600'}`}
                                >
                                    <Calendar size={20} />
                                </button>
                                <div className="relative w-48">
                                    <input
                                        type="text"
                                        placeholder="Sku / Of / Pedido / Cliente"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <button
                                    onClick={handleClearFilters}
                                    className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 flex-1">
                            <MetricBox title="Corte" metrics={[
                                { label: 'Muebles', val: metricas?.cortados },
                                { label: 'Piezas', val: metricas?.corte_piezas },
                                { label: 'm2', val: metricas?.corte_m2 }
                            ]} />
                            <MetricBox title="Enchape" metrics={[
                                { label: 'Muebles', val: metricas?.enchapados },
                                { label: 'Piezas', val: metricas?.enchape_piezas },
                                { label: 'ml', val: metricas?.enchape_ml }
                            ]} />
                            <MetricBox title="Inspeccion" metrics={[
                                { label: 'Muebles', val: metricas?.inspeccion },
                                { label: 'Piezas', val: metricas?.inspeccion_piezas },
                                { label: 'm2', val: metricas?.inspeccion_m2 }
                            ]} />
                            <MetricBox title="Empaque" metrics={[
                                { label: 'Muebles', val: metricas?.empacados },
                                { label: 'Piezas', val: metricas?.empaque_piezas },
                                { label: 'm2', val: metricas?.empaque_m2 }
                            ]} />
                            
                            <div className="flex gap-1">
                                <SingleMetricBox label="Reparaciones" val={metricas?.reparaciones} color="red" />
                                <SingleMetricBox label="Reposiciones" val={metricas?.reposiciones} color="red" />
                                <SingleMetricBox label="Digitado" val={metricas?.digitado} color="teal" />
                                <SingleMetricBox label="Transito" val={metricas?.transito} color="teal" />
                                <SingleMetricBox label="Cedi" val={metricas?.cedi} color="teal" />
                                <SingleMetricBox label="% Calidad" val={metricas?.p_calidad} color="blue" />
                                <SingleMetricBox label="% Rechazado" val={metricas?.p_rechazado} color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="text-[11px] font-bold text-indigo-600">
                                ORDENES ENCONTRADAS: <span className="text-gray-900">{filteredOrdenes.length}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={loadData} className="p-1.5 bg-gray-100 text-indigo-600 rounded shadow-sm hover:bg-gray-200">
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button onClick={handleSyncSAP} className="p-1.5 bg-orange-100 text-orange-600 rounded shadow-sm hover:bg-orange-200">
                                    <ArrowUpFromLine size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <SummaryBox title="Cantidad" color="blue" metrics={[
                                { label: 'Muebles', val: stats.programado.muebles },
                                { label: 'Piezas', val: stats.programado.piezas }
                            ]} />
                            <SummaryBox title="Pendiente" color="orange" metrics={[
                                { label: 'Muebles', val: stats.pendiente.muebles },
                                { label: 'Piezas', val: stats.pendiente.piezas }
                            ]} />
                            <SummaryBox title="Reposiciones" color="red" metrics={[
                                { label: 'Pend.', val: stats.reposiciones.muebles },
                                { label: 'Realiz.', val: stats.reposiciones.piezas }
                            ]} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-[1400px] mx-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Cargando...</p>
                        </div>
                    ) : filteredOrdenes.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                            <Search size={48} className="text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No se encontraron órdenes.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrdenes.map((orden) => (
                                <OrderCard
                                    key={orden.id}
                                    orden={orden}
                                    isActive={selectedOrder?.id === orden.id}
                                    onClick={() => setSelectedOrder(orden)}
                                    proceso="Vista General"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Order Modal */}
            {selectedOrder && (
                <EditOrderModal 
                    orden={selectedOrder} 
                    usuarioNombre={usuarioNombre}
                    turno={turno}
                    onClose={() => setSelectedOrder(null)}
                    onSuccess={loadData}
                />
            )}

            {isSyncing && (
                <div className="fixed inset-0 bg-indigo-900/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm">
                        <Loader2 size={64} className="text-indigo-600 animate-spin" />
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold text-gray-900">Sincronizando SAP</h3>
                            <p className="text-gray-500 text-sm">Cargando órdenes desde ERP... esto tardará un par de minutos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function MetricBox({ title, metrics }: { title: string, metrics: { label: string, val: any }[] }) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col min-w-[120px]">
            <div className="bg-gray-100 text-[10px] font-black text-center py-0.5 uppercase text-gray-600">{title}</div>
            <div className="flex divide-x divide-gray-100 bg-white">
                {metrics.map((m, i) => (
                    <div key={i} className="flex-1 px-2 py-1 flex flex-col items-center">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">{m.label}</span>
                        <span className="text-[11px] font-black text-gray-800">{m.val || 0}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SingleMetricBox({ label, val, color }: { label: string, val: any, color: 'red' | 'teal' | 'blue' }) {
    const colorClasses = {
        red: 'border-red-200 text-red-600 bg-red-50',
        teal: 'border-emerald-200 text-emerald-600 bg-emerald-50',
        blue: 'border-blue-200 text-blue-600 bg-blue-50'
    }
    return (
        <div className={`border rounded-lg px-2 py-1 flex flex-col items-center min-w-[70px] ${colorClasses[color]}`}>
            <span className="text-[8px] font-bold uppercase text-center leading-tight">{label}</span>
            <span className="text-[11px] font-black">{val || 0}</span>
        </div>
    )
}

function SummaryBox({ title, color, metrics }: { title: string, color: 'blue' | 'orange' | 'red', metrics: { label: string, val: any }[] }) {
    const colorClasses = {
        blue: { border: 'border-blue-200', header: 'bg-blue-600', text: 'text-blue-600' },
        orange: { border: 'border-orange-200', header: 'bg-orange-500', text: 'text-orange-600' },
        red: { border: 'border-red-200', header: 'bg-red-600', text: 'text-red-600' }
    }
    const theme = colorClasses[color]
    return (
        <div className={`border rounded-xl overflow-hidden min-w-[140px] shadow-sm ${theme.border}`}>
            <div className={`${theme.header} text-white text-[10px] font-black text-center py-0.5 uppercase`}>{title}</div>
            <div className="flex divide-x divide-gray-50 bg-white">
                {metrics.map((m, i) => (
                    <div key={i} className="flex-1 px-3 py-1.5 flex flex-col items-center">
                        <span className={`text-[8px] font-bold uppercase ${theme.text}`}>{m.label}</span>
                        <span className="text-sm font-black text-gray-900">{m.val || 0}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
