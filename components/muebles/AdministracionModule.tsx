'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenMueble, MetricasMuebles } from '@/types/muebles'
import { getOrdenesMuebles, getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { supabase } from '@/lib/supabase'
import OrderCard from './OrderCard'
import EditOrderModal from './EditOrderModal'
import HistorialTrazabilidadModal from './HistorialTrazabilidadModal'
import { BotonMoverOfMuebles } from './MoverOfMuebles'
import EstadoEntregaOf from '../fibra/EstadoEntregaOf'
import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
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
    Package,
    Download
} from 'lucide-react'
import * as XLSX from 'xlsx'
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
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [dateType, setDateType] = useState<'entrega' | 'creacion'>('entrega')
    const [selectedPlanta, setSelectedPlanta] = useState<string>('todas')
    const [selectedEstado, setSelectedEstado] = useState<string>('todas')
    const [selectedOrder, setSelectedOrder] = useState<OrdenMueble | null>(null)
    // Franja de cada OF: Eliminar abre la confirmación; Trazabilidad abre el historial
    const [eliminarDirecto, setEliminarDirecto] = useState(false)
    const [trazabilidadDe, setTrazabilidadDe] = useState<OrdenMueble | null>(null)
    // Se muestran por partes (la revisión de componentes de entrega consulta SAP por cada OF visible)
    const [visibles, setVisibles] = useState(30)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, metricasData] = await Promise.all([
                // Solo las abiertas de esta planta: pedir todas (abiertas y cerradas, ~26.000) supera el tiempo máximo de la base y no cargaba nada
                getOrdenesMuebles(plantaMuebles, true),
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
        setStartDate('')
        setEndDate('')
        setSelectedPlanta('todas')
        setSelectedEstado('todas')
    }

    const filteredOrdenes = useMemo(() => {
        const search = searchText.toLowerCase()
        return ordenes.filter((orden) => {
            // Plant filter
            const matchesPlanta = selectedPlanta === 'todas' || 
                (orden.planta || '').toLowerCase() === selectedPlanta.toLowerCase()

            // Estado filter (Abierta / Cerrada)
            const matchesEstado = selectedEstado === 'todas' ||
                (selectedEstado === 'abierta' ? orden.pendiente === true : orden.pendiente === false)

            // Search filter
            const matchesSearch = !search ||
                (orden.producto_descripcion || '').toLowerCase().includes(search) ||
                (orden.orden_fabricacion || '').toLowerCase().includes(search) ||
                (orden.numero_pedido || '').toLowerCase().includes(search) ||
                (orden.producto_sku || '').toLowerCase().includes(search) ||
                (orden.cliente || '').toLowerCase().includes(search) ||
                (orden.planta || '').toLowerCase().includes(search) ||
                (orden.pendiente ? 'abierta' : 'cerrada').includes(search)

            // Date filter (Single or Range)
            const ordenDateStr = dateType === 'entrega' 
                ? orden.fecha_entrega_estimada 
                : orden.created_at
            
            // Ese día exacto (por texto aaaa-mm-dd, sin corrimiento de zona horaria)
            const matchesDate = !startDate || String(ordenDateStr || '').slice(0, 10) === startDate

            return matchesPlanta && matchesEstado && matchesSearch && matchesDate
        })
    }, [ordenes, searchText, startDate, endDate, dateType, selectedPlanta, selectedEstado])

    const handleSyncSAP = async () => {
        if (!confirm('¿Desea cargar y sincronizar las órdenes de Muebles y Cefi desde SAP Service Layer?')) {
            return
        }

        setIsSyncing(true)
        const toastId = toast.loading('Cargando órdenes de Muebles desde SAP Service Layer...')
        try {
            const response = await fetch('/api/sap/liberacion-muebles', { method: 'GET', cache: 'no-store' });
            let count = 0;
            if (response.ok) {
                const json = await response.json();
                count = json?.totalSincronizadas || 0;
                toast.success('¡Carga exitosa! Se sincronizaron ' + count + ' órdenes de Muebles/Cefi', { id: toastId });
            } else {
                toast.success('Actualizando órdenes de Muebles...', { id: toastId });
            }
            await loadData();
        } catch (error) {
            console.error('Error syncing with SAP:', error);
            toast.error('Error al sincronizar con SAP: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            await loadData();
        } finally {
            setIsSyncing(false);
        }
    }

    const handleDownloadExcel = () => {
        if (filteredOrdenes.length === 0) {
            toast.error('No hay datos para exportar')
            return
        }

        try {
            const dataToExport = filteredOrdenes.map(o => ({
                'OF': o.orden_fabricacion,
                'Estado': o.pendiente ? 'ABIERTA' : 'CERRADA',
                'Pedido': o.numero_pedido,
                'Cliente': o.cliente,
                'Planta': o.planta || 'N/A',
                'Producto': o.producto_descripcion,
                'SKU': o.producto_sku,
                'Cant. Muebles': o.cantidad,
                'Cant. Piezas': o.piezas,
                'F. Entrega': o.fecha_entrega_estimada ? new Date(o.fecha_entrega_estimada).toLocaleDateString() : 'N/A',
                'F. Creación': o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A',
                'Corte (Tot)': o.sum_cortados ?? o.corte ?? 0,
                'Enchape (Tot)': o.sum_enchapado ?? o.enchape ?? 0,
                'Inspección (Tot)': o.sum_inspeccion ?? o.inspeccion ?? 0,
                'Empaque (Tot)': o.sum_empacado ?? o.empaque ?? 0,
                'Digitado (Tot)': o.sum_digitado ?? o.digitado ?? 0,
                'Transito': o.sum_transito ?? o.transito ?? 0,
                'CEDI': o.sum_cedi ?? o.cedi ?? 0,
                'A Reponer': o.por_reponer ?? 0
            }))

            const ws = XLSX.utils.json_to_sheet(dataToExport)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Ordenes Muebles')
            
            // Auto size columns
            const colWidths = Object.keys(dataToExport[0]).map(key => ({
                wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row]).length)) + 2
            }))
            ws['!cols'] = colWidths

            XLSX.writeFile(wb, `Reporte_Ordenes_Muebles_${new Date().toISOString().split('T')[0]}.xlsx`)
            toast.success('Excel generado correctamente')
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            toast.error('Error al generar el archivo Excel')
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
            {/* Encabezado compacto (26/11/2026): un renglón de filtros y otro de indicadores. Sin fecha final ni filtro de
                estado (Administración solo carga OF abiertas); la fecha filtra ese día exacto, como en Fibra. */}
            <div className="bg-white px-3 py-2 border-b border-gray-200">
                <div className="max-w-[1400px] mx-auto flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[180px] max-w-[420px]">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Sku / Of / Pedido / Cliente"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-300 rounded-lg text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            onClick={() => setDateType(dateType === 'entrega' ? 'creacion' : 'entrega')}
                            className={`h-8 w-8 flex items-center justify-center rounded-lg text-white shadow-sm shrink-0 ${dateType === 'entrega' ? 'bg-indigo-600' : 'bg-purple-600'}`}
                            title={dateType === 'entrega' ? 'Filtrando por fecha de entrega (clic: fecha de creación)' : 'Filtrando por fecha de creación (clic: fecha de entrega)'}
                        >
                            <Calendar size={16} />
                        </button>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title={dateType === 'entrega' ? 'Fecha de entrega' : 'Fecha de creación'}
                            className="h-8 px-2 bg-gray-50 border border-gray-300 rounded-lg text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="text-[11px] font-bold text-indigo-600 whitespace-nowrap">
                            ÓRDENES: <span className="text-gray-900">{filteredOrdenes.length}</span>
                        </div>
                        <button onClick={loadData} title="Actualizar" className="h-8 w-8 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg shadow-sm hover:bg-gray-200">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleSyncSAP} title="Cargar órdenes de SAP" className="h-8 w-8 flex items-center justify-center bg-orange-100 text-orange-600 rounded-lg shadow-sm hover:bg-orange-200">
                            <ArrowUpFromLine size={16} />
                        </button>
                        <div className="flex gap-2 ml-auto">
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

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
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
                            {filteredOrdenes.slice(0, visibles).map((orden) => (
                                <OrderCard
                                    key={orden.id}
                                    orden={orden}
                                    isActive={selectedOrder?.id === orden.id}
                                    onClick={() => { setEliminarDirecto(false); setSelectedOrder(orden) }}
                                    proceso="Vista General"
                                    franja={
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => setTrazabilidadDe(orden)}
                                                className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#254153] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-50">
                                                <ClipboardList size={16} /> Trazabilidad
                                            </button>
                                            <div className="flex-1 min-w-[220px]">
                                                <EstadoEntregaOf of={orden.orden_fabricacion} />
                                            </div>
                                            <div className="flex items-center gap-2 ml-auto">
                                                <BotonMoverOfMuebles orden={orden} planta={plantaMuebles} usuarioNombre={usuarioNombre} userEmail={userEmail} onHecho={loadData} />
                                                <button type="button" onClick={() => { setEliminarDirecto(false); setSelectedOrder(orden) }}
                                                    className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#254153] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-50">
                                                    <Pencil size={15} /> Editar
                                                </button>
                                                <button type="button" onClick={() => { setEliminarDirecto(true); setSelectedOrder(orden) }}
                                                    className="h-9 px-3 rounded-lg border border-rose-200 bg-white text-[#d14747] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-rose-50">
                                                    <Trash2 size={15} /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    }
                                />
                            ))}
                            {filteredOrdenes.length > visibles && (
                                <button type="button" onClick={() => setVisibles(v => v + 30)}
                                    className="w-full py-3 rounded-xl border border-[#e2ded5] bg-white text-[#254153] text-sm font-bold hover:bg-[#F6F3EE]">
                                    Mostrar 30 más ({filteredOrdenes.length - visibles} restantes)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Order Modal */}
            {selectedOrder && (
                <EditOrderModal 
                    key={`${selectedOrder.id}-${eliminarDirecto}`}
                    abrirEliminar={eliminarDirecto}
                    orden={selectedOrder}
                    usuarioNombre={usuarioNombre}
                    turno={turno}
                    userEmail={userEmail}
                    onClose={() => setSelectedOrder(null)}
                    onSuccess={loadData}
                />
            )}

            {trazabilidadDe && (
                <HistorialTrazabilidadModal orden={trazabilidadDe} onClose={() => setTrazabilidadDe(null)} onSuccess={loadData} />
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
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col min-w-[120px] shrink-0">
            <div className="bg-gray-100 text-[10px] font-black text-center py-0.5 uppercase text-gray-600">{title}</div>
            <div className="flex divide-x divide-gray-100 bg-white">
                {metrics.map((m, i) => (
                    <div key={i} className="flex-1 px-2 py-0.5 flex flex-col items-center leading-tight">
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
        <div className={`border rounded-lg px-2 py-1 flex flex-col items-center justify-center min-w-[70px] shrink-0 ${colorClasses[color]}`}>
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
        <div className={`border rounded-lg overflow-hidden min-w-[120px] shadow-sm ${theme.border}`}>
            <div className={`${theme.header} text-white text-[10px] font-black text-center py-0.5 uppercase`}>{title}</div>
            <div className="flex divide-x divide-gray-50 bg-white">
                {metrics.map((m, i) => (
                    <div key={i} className="flex-1 px-2 py-0.5 flex flex-col items-center leading-tight">
                        <span className={`text-[8px] font-bold uppercase ${theme.text}`}>{m.label}</span>
                        <span className="text-sm font-black text-gray-900">{m.val || 0}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
