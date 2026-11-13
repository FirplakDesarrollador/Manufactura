'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import {
    updateOrdenFabricacion,
    deleteOrdenFabricacion,
    updateRegistroTrazabilidad,
    deleteRegistroTrazabilidad
} from '@/lib/supabase/queries/fibra_administracion'
import { getAllMoldes } from '@/lib/supabase/queries/fibra'
import OrdenCard from '@/components/pintura/OrdenCard'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import {
    RefreshCw,
    Search,
    Calendar,
    Eraser,
    Edit2,
    Trash2,
    X,
    ChevronsUpDown,
    ArrowRightLeft
} from 'lucide-react'
import { toast } from 'sonner'

// Procesos del Mapa de procesos FV (mismo orden del flujo); una OF está en un proceso si tiene al menos una pieza ahí
const PROCESOS_FILTRO: { id: string; label: string; etapas: string[] }[] = [
    { id: 'programado', label: 'Programado', etapas: ['programado'] },
    { id: 'pintura', label: 'Pintura', etapas: ['pintura'] },
    { id: 'vaciado', label: 'Vaciado', etapas: ['vaciado'] },
    { id: 'herrajes', label: 'Herrajes', etapas: ['herrajes'] },
    { id: 'pulido', label: 'Pulido', etapas: ['pulido'] },
    { id: 'ensayo', label: 'Ensayo', etapas: ['acabado'] },
    { id: 'reparacion', label: 'Reparación', etapas: ['reparacion', 'reparacion_larga'] },
    { id: 'huacales', label: 'Huacales', etapas: ['empaque'] },
    { id: 'digitado', label: 'Digitado', etapas: ['digitado'] },
    { id: 'transito', label: 'Tránsito', etapas: ['transito'] },
    { id: 'cedi', label: 'CEDI', etapas: ['cedi'] },
    { id: 'saldo', label: 'Saldo', etapas: ['saldo'] },
    { id: 'destruccion', label: 'Destrucción', etapas: ['destruccion'] }
]

export default function AdministracionFibraModule({ userEmail }: { userEmail?: string }) {
    // userEmail available for future use
    void userEmail;
    const [activeTab, setActiveTab] = useState<'of' | 'trazabilidad'>('of')
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [procesoFiltro, setProcesoFiltro] = useState('')
    const [expandedRegistros, setExpandedRegistros] = useState<Set<string | number>>(new Set())
    const [expandedOrdenes, setExpandedOrdenes] = useState<Set<number>>(new Set())
    // Orden cuyo detalle de SAP (lista de materiales, comentarios…) está abierto

    // Modal State
    const [editModal, setEditModal] = useState<{
        type: 'of' | 'registro',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item: any
    } | null>(null)
    const [transferModal, setTransferModal] = useState<RegistroTrazabilidad | null>(null)
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            // Optimized: Fetch active orders and last 1000 traceability records
            // This prevents loading the entire historical database which was causing lag
            const todayStr = new Date().toISOString().split('T')[0]
            const [ofRes, trazRes, moldesData] = await Promise.all([
                supabase.from('ordenes_fabricacion_fv')
                    .select('*')
                    .order('fecha_entrega_estimada', { ascending: true }),
                supabase.from('query_trazabilidad_fv')
                    .select('*')
                    .or(`estado.neq.Cedi,cedi_fecha.gte.${todayStr}`)
                    .order('vaciado_fecha', { ascending: false })
                    .limit(10000),
                getAllMoldes()
            ])
            setOrdenes(ofRes.data || [])
            setRegistros(trazRes.data || [])
            setAllMoldes(moldesData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Búsqueda en base de datos si el usuario ingresa un número de OF, pedido o SKU específico
    useEffect(() => {
        const query = searchText.trim()
        if (query.length < 3) return

        let isMounted = true
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('query_trazabilidad_fv')
                .select('*')
                .or(`orden_fabricacion.ilike.%${query}%,numero_pedido.ilike.%${query}%,producto_sku.ilike.%${query}%,molde_serial.ilike.%${query}%`)
                .order('vaciado_fecha', { ascending: false })
                .limit(500)

            if (isMounted && data && data.length > 0) {
                setRegistros(prev => {
                    const existingIds = new Set(prev.map(r => r.id))
                    const newRecords = data.filter(r => !existingIds.has(r.id))
                    return newRecords.length > 0 ? [...prev, ...newRecords] : prev
                })
            }
        }, 300)

        return () => {
            isMounted = false
            clearTimeout(timer)
        }
    }, [searchText])

    const ordenesBuscadas = useMemo(() => {
        const search = searchText.toLowerCase()
        const filtered = ordenes.filter(o => {
            const matchesSearch = !search ||
                (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
                (o.pedido?.toLowerCase() || '').includes(search) ||
                (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
                (o.producto_sku?.toLowerCase() || '').includes(search) ||
                (o.molde_descripcion?.toLowerCase() || '').includes(search) ||
                (o.cliente?.toLowerCase() || '').includes(search)

            const matchesDate = !selectedDate || (o.fecha_ideal_produccion && o.fecha_ideal_produccion.split('T')[0] === selectedDate)

            return matchesSearch && matchesDate
        })

        return filtered.sort((a, b) => {
            const rawA = a.fecha_entrega_lote || a.fecha_ideal_produccion || a.fecha_entrega_estimada
            const rawB = b.fecha_entrega_lote || b.fecha_ideal_produccion || b.fecha_entrega_estimada
            const dateA = rawA ? new Date(rawA).getTime() : Infinity
            const dateB = rawB ? new Date(rawB).getTime() : Infinity
            const valA = isNaN(dateA) ? Infinity : dateA
            const valB = isNaN(dateB) ? Infinity : dateB
            return valA - valB
        })
    }, [ordenes, searchText, selectedDate])

    // Procesos en que tiene piezas cada orden (según la búsqueda y la fecha, sin el filtro de proceso)
    const procesosPorOrden = useMemo(() => {
        const m = new Map<number, Set<string>>()
        for (const o of ordenesBuscadas) {
            const { piezas } = piezasPorEtapa(o)
            m.set(o.id, new Set(PROCESOS_FILTRO.filter(p => p.etapas.some(e => (piezas[e] || 0) > 0)).map(p => p.id)))
        }
        return m
    }, [ordenesBuscadas])

    const conteoProcesos = useMemo(() => {
        const c: Record<string, number> = {}
        for (const p of PROCESOS_FILTRO) c[p.id] = 0
        for (const s of procesosPorOrden.values()) for (const id of s) c[id]++
        return c
    }, [procesosPorOrden])

    const filteredOrdenes = useMemo(() =>
        procesoFiltro ? ordenesBuscadas.filter(o => procesosPorOrden.get(o.id)?.has(procesoFiltro)) : ordenesBuscadas,
        [ordenesBuscadas, procesosPorOrden, procesoFiltro])

    const filteredRegistros = useMemo(() => {
        const search = searchText.toLowerCase()
        return registros.filter(r => {
            const matchesSearch = !search ||
                (r.orden_fabricacion?.toLowerCase() || '').includes(search) ||
                (r.numero_pedido?.toLowerCase() || '').includes(search) ||
                (r.producto_descripcion?.toLowerCase() || '').includes(search) ||
                (r.producto_sku?.toLowerCase() || '').includes(search) ||
                (r.molde_descripcion?.toLowerCase() || '').includes(search)

            // For registros, date filtering might be complex but we follow FF pattern
            return matchesSearch
        })
    }, [registros, searchText])

    // Summary Calculations (matching FF logic)
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]

        // Use filteredRegistros to ensure indicators reflect the search
        const baseRegistros = filteredRegistros

        // Filters for traceability counts today
        const vaciadoToday = baseRegistros.filter(r => (r.vaciado_fecha || '').split('T')[0] === today)
        const pinturaToday = baseRegistros.filter(r => (r.pintura_fecha || '').split('T')[0] === today)
        const acabadoToday = baseRegistros.filter(r => (r.acabado_fecha || '').split('T')[0] === today)

        // Kilograms: Current Transito + Cedi Today (Matches FF logic for 3407.8kg)
        const transitoRecords = baseRegistros.filter(r => r.estado === 'Transito')
        const cediToday = baseRegistros.filter(r => (r.cedi_fecha || '').split('T')[0] === today)
        
        const totalKilos = [...transitoRecords, ...cediToday]
            .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

        return {
            cantidad: filteredOrdenes.reduce((acc, o) => acc + (o.cantidad_programada || o.cantidad || 0), 0),
            programado: filteredOrdenes.reduce((acc, o) => acc + (o.programado || 0), 0),
            pintura: pinturaToday.length,
            desgelcada: 0,
            vaciado: vaciadoToday.length,
            acabado: acabadoToday.length,
            saldo: filteredOrdenes.reduce((acc, o) => acc + (o.saldo || 0), 0),
            digitado: filteredOrdenes.reduce((acc, o) => acc + (o.digitado || 0), 0),
            transito: filteredOrdenes.reduce((acc, o) => acc + (o.transito || 0), 0),
            cedi: cediToday.length,
            kilos: totalKilos
        }
    }, [filteredOrdenes, filteredRegistros])

    const handleDelete = async (type: 'of' | 'registro', id: any) => {
        if (!confirm('¿Seguro que desea eliminar este registro? ESTA ACCIÓN NO SE PUEDE DESHACER.')) return

        try {
            if (type === 'of') await deleteOrdenFabricacion(id)
            else await deleteRegistroTrazabilidad(id)
            alert('Eliminado correctamente')
            loadData()
        } catch {
            alert('Error al eliminar')
        }
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editModal) return
        setSaving(true)
        try {
            const { type, item } = editModal
            if (type === 'of') {
                const sumEtapas = (item.pintura || 0) + (item.pulido || 0) + (item.reparacion || 0) + (item.saldo || 0) + (item.empaque || 0) + (item.transito || 0) + (item.vaciado || 0) + (item.herrajes || 0) + (item.estanteria || 0) + (item.acabado || 0) + (item.reparacion_larga || 0) + (item.digitado || 0) + (item.cedi || 0)
                if (item.cantidad !== undefined && item.cantidad < sumEtapas) {
                    alert(`No se puede actualizar: La cantidad fijada (${item.cantidad}) es inferior a las piezas ya existentes en las etapas (${sumEtapas}).`)
                    setSaving(false)
                    return
                }
                await updateOrdenFabricacion(item.id, item)
            } else {
                await updateRegistroTrazabilidad(item.id, item)
            }
            alert('Actualizado correctamente')
            setEditModal(null)
            loadData()
        } catch {
            alert('Error al actualizar')
        } finally {
            setSaving(false)
        }
    }

    const handleTransfer = async (registro: RegistroTrazabilidad, targetOrden: OrdenFabricacion) => {
        const targetCantidad = Math.max(0, targetOrden.cantidad || targetOrden.cantidad_programada || 0)
        const targetSumEtapas = (targetOrden.pintura || 0) + (targetOrden.pulido || 0) + (targetOrden.reparacion || 0) + (targetOrden.saldo || 0) + (targetOrden.empaque || 0) + (targetOrden.transito || 0) + (targetOrden.vaciado || 0) + (targetOrden.herrajes || 0) + (targetOrden.estanteria || 0) + (targetOrden.acabado || 0) + (targetOrden.reparacion_larga || 0) + (targetOrden.digitado || 0) + (targetOrden.cedi || 0)

        if (targetCantidad > 0 && targetSumEtapas >= targetCantidad) {
            toast.error(`No se puede transferir: La orden de destino ${targetOrden.orden_fabricacion} ya cuenta con la cantidad máxima permitida (${targetCantidad} piezas).`)
            return
        }

        if (!confirm(`¿Está seguro que desea transferir esta pieza a la orden ${targetOrden.orden_fabricacion}?`)) return

        setSaving(true)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateRegistroTrazabilidad(registro.registrer || String(registro.id), { orden_fabricacion_id: targetOrden.id } as any)
            toast.success(`Pieza transferida a la orden ${targetOrden.orden_fabricacion}`)
            setTransferModal(null)
            loadData()
        } catch (error) {
            console.error('Error al transferir:', error)
            toast.error('Error al transferir la pieza')
        } finally {
            setSaving(false)
        }
    }

    const toggleRegistro = (id: string | number) => {
        setExpandedRegistros(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleOrden = (id: number) => {
        setExpandedOrdenes(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const allRegistrosExpanded = filteredRegistros.length > 0 &&
        filteredRegistros.every(registro => expandedRegistros.has(registro.registrer || String(registro.id)))
    const allOrdenesExpanded = filteredOrdenes.length > 0 &&
        filteredOrdenes.every(orden => expandedOrdenes.has(orden.id))

    const toggleAllVisible = () => {
        if (activeTab === 'trazabilidad') {
            setExpandedRegistros(allRegistrosExpanded ? new Set() : new Set(filteredRegistros.map(registro => registro.registrer || String(registro.id))))
            return
        }

        setExpandedOrdenes(allOrdenesExpanded ? new Set() : new Set(filteredOrdenes.map(orden => orden.id)))
    }

    const handleCargarOrdenes = async () => {
        if (!confirm('¿Desea sincronizar y cargar las órdenes de fabricación desde SAP Service Layer?')) return

        setSyncing(true)
        const toastId = toast.loading('Cargando órdenes desde SAP Service Layer...')

        try {
            const response = await fetch('/api/sap/ordenes-liberadas', {
                method: 'GET',
                cache: 'no-store'
            })

            if (response.ok) {
                toast.success('Órdenes cargadas y sincronizadas exitosamente', { id: toastId })
                // Las 4 fechas del Semáforo se traen en la misma carga; si fallan se avisa (las órdenes sí quedaron)
                const resultado = await response.json().catch(() => null)
                if (resultado?.avisoFechasSemaforo) toast.error(resultado.avisoFechasSemaforo, { duration: 12000 })
                const { recargarFechasSemaforoFv } = await import('@/lib/fibra/fechasSemaforo')
                recargarFechasSemaforoFv()
                await loadData()
            } else {
                toast.success('Actualizando lista de órdenes...', { id: toastId })
                await loadData()
            }
        } catch (error) {
            console.error('Error al cargar órdenes:', error)
            await loadData()
            toast.success('Órdenes actualizadas en el panel', { id: toastId })
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">
            {/* Indicadores (mismo estilo que el encabezado de Control de Piso FV) */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200">
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar">
                    <StatCard label="Cantidad" value={stats.cantidad} color="bg-[#324354]/10 text-[#324354]" />
                    <StatCard label="Programado" value={stats.programado} color="bg-[#324354]/10 text-[#324354]" />
                    <StatCard label="Pintura Hoy" value={stats.pintura} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Desgelcada" value={stats.desgelcada} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Vaciado Hoy" value={stats.vaciado} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Ensayo Hoy" value={stats.acabado} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Saldo" value={stats.saldo} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Digitado" value={stats.digitado} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Transito" value={stats.transito} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Cedi Hoy" value={stats.cedi} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Kg Hoy" value={stats.kilos.toFixed(1)} color="bg-[#324354] text-white" />
                </div>
            </div>

            {/* Controls */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-2 sm:gap-3">
                    <div className="basis-full md:basis-0 flex-1 min-w-0 md:min-w-[300px]">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Búsqueda Global</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Sku / Of / Pedido / Molde / Cliente"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]"
                            />
                        </div>
                    </div>

                    {/* Filtrar por proceso (procesos del Mapa de procesos FV): solo las OF con piezas en ese proceso */}
                    {activeTab === 'of' && (
                        <div className="w-52">
                            <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Proceso</label>
                            <select value={procesoFiltro} onChange={e => setProcesoFiltro(e.target.value)}
                                className={`w-full h-8 px-2.5 border rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90] cursor-pointer ${procesoFiltro ? 'bg-[#deb841]/20 border-[#deb841] text-[#25323f]' : 'bg-slate-50 border-slate-200 text-[#324354]'}`}>
                                <option value="">Todos los procesos</option>
                                {PROCESOS_FILTRO.map(p => (
                                    <option key={p.id} value={p.id} disabled={conteoProcesos[p.id] === 0 && procesoFiltro !== p.id}>
                                        {p.label} ({conteoProcesos[p.id]})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="w-40 sm:w-48">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Filtrar Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="date"
                                value={selectedDate || ''}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => { setSearchText(''); setSelectedDate(null); setProcesoFiltro(''); }}
                        className="h-8 w-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
                        title="Limpiar filtros"
                    >
                        <X size={16} />
                    </button>


                    <button
                        onClick={handleCargarOrdenes}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#324354] text-white rounded-lg hover:bg-[#254153] transition-colors shadow-sm disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider h-8 self-end"
                        title="Cargar Órdenes de Fabricación desde SAP"
                    >
                        <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Cargar Órdenes</span>
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center bg-white px-4 border-b border-slate-200">
                <TabButton
                    active={activeTab === 'of'}
                    label="Órdenes de Fabricación"
                    onClick={() => setActiveTab('of')}
                />
                <TabButton
                    active={activeTab === 'trazabilidad'}
                    label="Registros de Trazabilidad"
                    onClick={() => setActiveTab('trazabilidad')}
                />
                {/* Total según los filtros aplicados */}
                <span className="ml-auto shrink-0 px-3 py-1 bg-[#324354] text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm"
                    title={searchText || selectedDate || (activeTab === 'of' && procesoFiltro) ? 'Con filtros aplicados' : undefined}>
                    Total {activeTab === 'of' ? 'Órdenes' : 'Registros'}: {activeTab === 'of' ? filteredOrdenes.length : filteredRegistros.length}
                    {(searchText || selectedDate || (activeTab === 'of' && procesoFiltro)) && ' (filtrado)'}
                </span>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 overflow-auto p-4 content-scrollbar">
                {activeTab === 'of' ? (
                    <div className="max-w-7xl mx-auto space-y-3">
                        {loading ? (
                            <div className="p-20 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-slate-200">
                                Cargando datos...
                            </div>
                        ) : filteredOrdenes.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-slate-200">
                                No se encontraron órdenes
                            </div>
                        ) : (
                            filteredOrdenes.map((item) => (
                                <div key={item.id} className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                {/* Misma tarjeta de los módulos de piso FV (detalle junto a "Moldes") y franja inferior con las acciones */}
                                <div className="bg-white border-2 border-gray-300 rounded-lg">
                                    <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none">
                                        <OrdenCard planta="fv"
                                            orden={item}
                                            isActive={false}
                                            onClick={() => setEditModal({ type: 'of', item })}
                                            moldes={allMoldes}
                                        />
                                    </div>
                                    <div className="rounded-b-md border-t-2 border-gray-200 bg-slate-50 px-3 py-1.5 flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => toggleOrden(item.id)}
                                            className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${expandedOrdenes.has(item.id) ? 'bg-[#324354] text-white border-[#324354]' : 'bg-white text-[#324354] border-[#e2ded5] hover:bg-[#F6F3EE]'}`}
                                            title={expandedOrdenes.has(item.id) ? 'Ocultar procesos de la orden' : 'Ver procesos de la orden'}
                                        >
                                            <ChevronsUpDown size={15} />
                                            {expandedOrdenes.has(item.id) ? 'Ocultar piezas' : 'Ver piezas'}
                                        </button>
                                        <div className="ml-auto flex gap-2">
                                            <button
                                                onClick={() => setEditModal({ type: 'of', item })}
                                                className="h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                title="Editar Orden"
                                            >
                                                <Edit2 size={15} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete('of', item.id)}
                                                className="h-8 px-3 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                title="Eliminar Orden"
                                            >
                                                <Trash2 size={15} />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {expandedOrdenes.has(item.id) && (
                                    <OrderProcessesPanel
                                        orden={item}
                                        registros={getRegistrosByOrden(registros, item.orden_fabricacion)}
                                        onEdit={(registro) => setEditModal({ type: 'registro', item: registro })}
                                        onDelete={(registro) => handleDelete('registro', registro.registrer)}
                                        onTransfer={(registro) => setTransferModal(registro)}
                                    />
                                )}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-max">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
                                    <th className="p-4">Acciones</th>
                                    <th className="p-4">Pieza (Id)</th>
                                    <th className="p-4">OF / Pedido</th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Molde</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Última Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="p-20 text-center text-slate-400 font-bold italic">Cargando datos...</td>
                                    </tr>
                                ) : filteredRegistros.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-20 text-center text-slate-400 font-bold italic">No se encontraron registros</td>
                                    </tr>
                                ) : (
                                    filteredRegistros.map((item) => (
                                        <React.Fragment key={item.registrer || item.id}>
                                        <tr className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => toggleRegistro(item.registrer || item.id || '')}
                                                    className={`p-1.5 rounded transition-colors ${expandedRegistros.has(item.registrer || item.id || '') ? 'bg-[#324354] text-white' : 'text-[#324354] hover:bg-[#F6F3EE]'}`}
                                                    title={expandedRegistros.has(item.registrer || item.id || '') ? 'Ocultar procesos' : 'Ver procesos'}
                                                >
                                                    <ChevronsUpDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditModal({ type: 'registro', item })}
                                                    className="p-1.5 text-[#324354] hover:bg-[#F6F3EE] rounded transition-colors"
                                                    title="Editar registro"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setTransferModal(item)}
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                    title="Transferir a otra orden"
                                                >
                                                    <ArrowRightLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete('registro', item.registrer || item.id || '')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                            <td className="p-4 text-[11px] font-black text-[#324354]">#{item.registrer || item.id}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{item.orden_fabricacion}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">P: {item.numero_pedido}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{item.producto_descripcion}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{item.producto_sku}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{item.molde_serial}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{item.molde_descripcion}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded-full bg-[#324354]/10 text-[#324354] font-black text-[9px] uppercase">
                                                    {item.estado}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[11px] font-bold text-slate-400">
                                                {item.pintura_fecha ? new Date(item.pintura_fecha).toLocaleDateString('es-ES') : '-'}
                                            </td>
                                        </tr>
                                        {expandedRegistros.has(item.registrer || item.id || '') && (
                                            <tr>
                                                <td colSpan={10} className="bg-slate-50/70 p-4">
                                                    <TraceProcessTimeline registro={item} />
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">
                                {editModal.type === 'of' ? 'Editar Orden' : 'Editar Registro'} #{editModal.item.id}
                            </h2>
                            <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            {editModal.type === 'of' ? (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
                                        <input
                                            value={editModal.item.cliente || ''}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, cliente: e.target.value } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#7B8E90] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cantidad</label>
                                            <input
                                                type="number"
                                                value={editModal.item.cantidad || 0}
                                                onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, cantidad: parseInt(e.target.value) } })}
                                                className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#7B8E90] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Saldo</label>
                                            <input
                                                type="number"
                                                value={editModal.item.saldo || 0}
                                                onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, saldo: parseInt(e.target.value) } })}
                                                className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#7B8E90] outline-none"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Estado</label>
                                        <select
                                            value={editModal.item.estado || ''}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, estado: e.target.value } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#7B8E90] outline-none"
                                        >
                                            <option value="Pintura">Pintura</option>
                                            <option value="Desgelcada">Desgelcada</option>
                                            <option value="Vaciado">Vaciado</option>
                                            <option value="Herrajes">Herrajes</option>
                                            <option value="Pulido">Pulido</option>
                                            <option value="Ensayo">Ensayo</option>
                                            <option value="Guacales">Guacales</option>
                                            <option value="Acabado">Acabado</option>
                                            <option value="Empaque">Empaque</option>
                                            <option value="Digitado">Digitado</option>
                                            <option value="Transito">Transito</option>
                                            <option value="Cedi">Cedi</option>
                                            <option value="Estanteria">Estantería</option>
                                            <option value="Reparacion">Reparación</option>
                                            <option value="Saldo">Saldo</option>
                                            <option value="Destruccion">Destrucción</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Kilos Vaciados</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editModal.item.kilos_vaciados || 0}
                                            onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, kilos_vaciados: parseFloat(e.target.value) } })}
                                            className="w-full p-3 bg-slate-100 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#7B8E90] outline-none"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditModal(null)}
                                    className="flex-1 p-3 font-black text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-[#324354] p-3 rounded-xl font-black text-white shadow-lg shadow-slate-200 hover:bg-[#254153] transition-all active:scale-95 disabled:bg-slate-300"
                                >
                                    {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {transferModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Transferir Pieza #{transferModal.id}</h2>
                                <p className="text-xs text-slate-500 font-bold mt-1">Órdenes compatibles para transferir</p>
                            </div>
                            <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
                            {(() => {
                                const compatibles = ordenes.filter(o =>
                                    o.producto_sku === transferModal.producto_sku &&
                                    (o.programado || o.cantidad_programada || 0) > 0 &&
                                    o.orden_fabricacion !== transferModal.orden_fabricacion
                                );

                                if (compatibles.length === 0) {
                                    return (
                                        <div className="text-center p-8 text-slate-400 font-bold text-sm bg-white rounded-xl border border-slate-200 shadow-sm">
                                            No se encontraron órdenes compatibles.
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-2">
                                        {compatibles.map(o => (
                                            <div key={o.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:border-emerald-200 transition-colors">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-slate-400 font-black uppercase truncate">{o.producto_descripcion || o.producto_sku}</div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="font-bold text-sm text-slate-800">{o.orden_fabricacion}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">P: {(o as any).numero_pedido || o.pedido}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleTransfer(transferModal, o)}
                                                    disabled={saving}
                                                    className="shrink-0 p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Transferir a esta orden"
                                                >
                                                    <ArrowRightLeft size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string, value: string | number, color: string }) {
    return (
        <div className={`flex-1 min-w-[76px] px-1.5 py-1.5 rounded-lg border border-[#e2ded5] shadow-sm flex flex-col items-center justify-center ${color}`}>
            <span className="text-[9px] font-black uppercase opacity-70 leading-tight whitespace-nowrap">{label}</span>
            <span className="text-sm font-black tracking-tight">{value}</span>
        </div>
    )
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${active ? 'border-[#324354] text-[#324354] bg-[#F6F3EE]/60' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
            {label}
        </button>
    )
}



const TRACE_STAGES: Array<{
    label: string
    dateKey: keyof RegistroTrazabilidad
    userKey: keyof RegistroTrazabilidad
}> = [
    { label: 'Pintura', dateKey: 'pintura_fecha', userKey: 'pintura_user_name' },
    { label: 'Vaciado', dateKey: 'vaciado_fecha', userKey: 'vaciado_user_name' },
    { label: 'Herrajes', dateKey: 'herrajes_fecha', userKey: 'herrajes_user_name' },
    { label: 'Pulido', dateKey: 'pulido_fecha', userKey: 'pulido_user_name' },
    { label: 'Ensayo', dateKey: 'acabado_fecha', userKey: 'acabado_user_name' },
    { label: 'Reparacion', dateKey: 'reparacion_fecha', userKey: 'reparacion_user_name' },
    { label: 'Guacales', dateKey: 'empaque_fecha', userKey: 'empaque_user_name' },
    { label: 'Digitado', dateKey: 'digitado_fecha', userKey: 'digitado_user_name' },
    { label: 'Transito', dateKey: 'transito_fecha', userKey: 'transito_user_name' },
    { label: 'Cedi', dateKey: 'cedi_fecha', userKey: 'cedi_user_name' },
    { label: 'Saldo', dateKey: 'saldo_fecha', userKey: 'saldo_user_name' },
    { label: 'Destruccion', dateKey: 'destruccion_fecha', userKey: 'destruccion_user_name' }
]

// También lo usa el Buscador de órdenes FV en modo solo consulta (sin onEdit/onDelete/onTransfer)
export function OrderProcessesPanel({
    orden,
    registros: parentRegistros,
    onEdit,
    onDelete,
    onTransfer
}: {
    orden: OrdenFabricacion
    registros: RegistroTrazabilidad[]
    onEdit?: (registro: RegistroTrazabilidad) => void
    onDelete?: (registro: RegistroTrazabilidad) => void
    onTransfer?: (registro: RegistroTrazabilidad) => void
}) {
    const [fetchedRegistros, setFetchedRegistros] = useState<RegistroTrazabilidad[] | null>(parentRegistros && parentRegistros.length > 0 ? parentRegistros : null)
    const [loadingRecords, setLoadingRecords] = useState(false)

    useEffect(() => {
        let isMounted = true
        setLoadingRecords(true)
        supabase
            .from('query_trazabilidad_fv')
            .select('*')
            .eq('orden_fabricacion', orden.orden_fabricacion)
            .order('pintura_fecha', { ascending: false })
            .then(
                ({ data, error }) => {
                    if (isMounted) {
                        setLoadingRecords(false)
                        if (!error && data) {
                            setFetchedRegistros(data)
                        }
                    }
                },
                () => {
                    if (isMounted) setLoadingRecords(false)
                }
            )

        return () => { isMounted = false }
    }, [orden.orden_fabricacion])

    const registros = fetchedRegistros !== null ? fetchedRegistros : parentRegistros

    const handleDeleteRecord = (registro: RegistroTrazabilidad) => {
        onDelete?.(registro)
        if (fetchedRegistros) {
            setFetchedRegistros(prev => prev ? prev.filter(r => (r.registrer || r.id) !== (registro.registrer || registro.id)) : null)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-[#324354]">Procesos de la orden</div>
                    <div className="text-[12px] font-semibold text-slate-500">
                        OF {orden.orden_fabricacion} · {registros.length} registro{registros.length === 1 ? '' : 's'} encontrado{registros.length === 1 ? '' : 's'}
                    </div>
                </div>
                {loadingRecords && (
                    <div className="text-xs text-[#7B8E90] font-bold flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando historial completo...
                    </div>
                )}
            </div>
            {loadingRecords && registros.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-[12px] font-bold text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#7B8E90]" /> Consultando piezas registradas en trazabilidad...
                </div>
            ) : registros.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-[12px] font-bold text-slate-400">
                    No hay registros de trazabilidad cargados para esta orden.
                </div>
            ) : (
                <div className="space-y-2">
                    {registros.map((registro, idx) => (
                        <div key={registro.registrer || registro.id || idx} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-[12px]">
                                <div className="flex flex-wrap gap-4">
                                    <InfoPill label="ID" value={registro.registrer || registro.id || '-'} />
                                    <InfoPill label="Estado" value={registro.estado || '-'} />
                                    <InfoPill label="Pedido" value={registro.numero_pedido || registro.pedido || '-'} />
                                    <InfoPill label="Molde" value={registro.molde_serial || '-'} />
                                </div>
                                {(onEdit || onTransfer || onDelete) && <div className="flex gap-2">
                                    <button onClick={() => onEdit?.(registro)} className="p-1.5 text-[#324354] hover:bg-[#F6F3EE] rounded transition-colors" title="Editar registro">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onTransfer?.(registro)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Transferir a otra orden">
                                        <ArrowRightLeft size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteRecord(registro)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar registro">
                                        <Trash2 size={16} />
                                    </button>
                                </div>}
                            </div>
                            <TraceProcessTimeline registro={registro} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function TraceProcessTimeline({ registro }: { registro: RegistroTrazabilidad }) {
    const stages = getVisibleStages(registro)

    return (
        <div className="flex flex-wrap justify-center gap-2">
            {stages.length === 0 ? (
                <div className="text-[12px] font-semibold text-slate-400 py-4">Sin fechas de proceso registradas</div>
            ) : stages.map(stage => (
                <StageBadge
                    key={stage.label}
                    label={stage.label}
                    date={stage.date}
                    user={stage.user}
                    active={stage.label === registro.estado}
                />
            ))}
        </div>
    )
}

function InfoPill({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="font-semibold text-slate-700">
            <span className="text-[#7B8E90]">{label}: </span>{value}
        </div>
    )
}

function StageBadge({ label, date, user, active }: { label: string, date: string, user?: string, active: boolean }) {
    return (
        <div className={`w-[174px] min-h-[64px] rounded-lg border px-3 py-2 text-center shadow-sm ${active ? 'bg-[#deb841]/25 border-[#deb841]' : 'bg-white border-slate-200'}`}>
            <div className="text-[12px] leading-none text-[#7B8E90] font-semibold">{label}</div>
            <div className="text-[12px] leading-tight text-slate-700 mt-1">{formatProcessDate(date)}</div>
            <div className="text-[11px] leading-tight text-slate-600 truncate" title={user || ''}>{user || 'Sin operario'}</div>
        </div>
    )
}

function getVisibleStages(item: RegistroTrazabilidad) {
    return TRACE_STAGES
        .map(stage => {
            const date = item[stage.dateKey]
            const user = item[stage.userKey]

            return {
                label: stage.label,
                date: typeof date === 'string' ? date : '',
                user: typeof user === 'string' ? user : undefined
            }
        })
        .filter(stage => stage.date.length > 0)
}

function getRegistrosByOrden(registros: RegistroTrazabilidad[], ordenFabricacion?: string) {
    if (!ordenFabricacion) return []

    return registros
        .filter(registro => registro.orden_fabricacion === ordenFabricacion)
        .sort((a, b) => {
            const aDate = getVisibleStages(a)[0]?.date || ''
            const bDate = getVisibleStages(b)[0]?.date || ''
            return aDate.localeCompare(bDate)
        })
}

function formatProcessDate(value: string) {
    let dateStr = value;
    if (dateStr.includes('T') && !dateStr.endsWith('Z') && !/(?:(o as any).numero_pedido || o.pedido+|-)(o as any).numero_pedido || o.pedidod{2}:(o as any).numero_pedido || o.pedidod{2}$/.test(dateStr)) {
        dateStr += 'Z';
    }
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return value

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}
