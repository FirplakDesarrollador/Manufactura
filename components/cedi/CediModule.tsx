'use client'

import React, { useState, useEffect } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoy, getAllMoldes } from '@/lib/supabase/queries/pintura'
import { moverTransitoACedi } from '@/lib/supabase/queries/cedi'
import { Search, Eraser, Loader2, Calendar, Info, FileSpreadsheet, ArrowLeftRight, FileCode, ArrowLeft, ChevronsUpDown, Warehouse, RefreshCw } from 'lucide-react'
import EstadoEntregaOf from '../fibra/EstadoEntregaOf'
import { OrderProcessesPanel } from '../administracion/AdministracionModule'
import { useVerificacionesCedi, BotonVerificado, ConfirmarVerificado, CascoDiablo } from '@/components/muebles/VerificadoCedi'
import { useEntregasCedi, descargarCsvEntregas, descargarExcelEntregas } from '@/lib/muebles/entregasCedi'
import { BotonCerrarEntrega, ChipEntregasHoy, filtrarPorEntrega, SeleccionEntrega } from '@/components/muebles/EntregasCediUi'
import CediList from './CediList'
import OrdenCard from '../pintura/OrdenCard'
import * as XLSX from 'xlsx'

export default function CediModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [moving, setMoving] = useState(false)
    const [trazAbierta, setTrazAbierta] = useState<Set<number>>(new Set())
    const [verificarDe, setVerificarDe] = useState<OrdenFabricacion | null>(null)
    const [filtroVerif, setFiltroVerif] = useState<'todos' | 'si' | 'no'>('todos')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [oData, rData, mData] = await Promise.all([
                getOrdenesFabricacion(),
                getRegistrosTrazabilidadHoy(),
                getAllMoldes()
            ])
            setOrdenes(oData)
            setRegistros(rData)
            setAllMoldes(mData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMoveAllToCedi = async () => {
        const transitoCount = registros.filter(r => r.estado === 'Transito').length
        if (transitoCount === 0) {
            alert('No hay piezas en Transito para mover.')
            return
        }

        if (!confirm(`¿Está seguro que desea mover ${transitoCount} piezas de Transito a Cedi?`)) return

        setMoving(true)
        try {
            await moverTransitoACedi(userEmail)
            alert('Piezas movidas exitosamente.')
            loadData()
        } catch (error) {
            console.error('Error moving to CEDI:', error)
            alert('Error al mover piezas.')
        } finally {
            setMoving(false)
        }
    }

    // Descargas (27/11/2026): las mismas 4 columnas de CEDI Muebles y FV: OF, SKU, Descripcion y Transito
    // (piezas despachadas a CEDI: en tránsito + ya recibidas)
    const filasReporte = () => filteredOrdenes.map(o => [
        Number(o.orden_fabricacion) || String(o.orden_fabricacion || ''),
        (o.producto_sku || o.sku || '').toUpperCase(),
        o.producto_descripcion || '',
        (Number(o.transito) || 0) + (Number(o.cedi) || 0),
    ])
    // Descargas: una hoja (Excel) o columna Entrega (CSV) por cada entrega de hoy + "Total CEDI"
    const handleExportCSV = () => descargarCsvEntregas(`reporte_cedi_ms_${new Date().toISOString().split('T')[0]}.csv`, entregasCedi.entregas, filasReporte())
    const handleExportExcel = () => descargarExcelEntregas(`reporte_cedi_ms_${new Date().toISOString().split('T')[0]}.xlsx`, entregasCedi.entregas, filasReporte())

    const filteredOrdenes = ordenes.filter(o => {
        const search = searchText.toLowerCase()
        const matchesSearch = !searchText || (
            (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
            (o.pedido?.toLowerCase() || '').includes(search) ||
            (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (o.producto_sku?.toLowerCase() || '').includes(search) ||
            (o.molde_descripcion?.toLowerCase() || '').includes(search) ||
            (o.cliente?.toLowerCase() || '').includes(search)
        )

        const matchesFecha = !fechaFiltro || (
            o.fecha_ideal_produccion === fechaFiltro ||
            o.fecha_entrega_estimada === fechaFiltro
        )

        const hasPieces = (o.transito || 0) > 0 || (o.cedi || 0) > 0

        return matchesSearch && matchesFecha && hasPieces
    }).sort((a, b) => {
        const dateA = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : Infinity
        const dateB = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : Infinity
        const valA = isNaN(dateA) ? Infinity : dateA
        const valB = isNaN(dateB) ? Infinity : dateB
        return valA - valB
    })

    const todayStr = new Date().toLocaleDateString('es-ES')

    const today = new Date().toISOString().split('T')[0]
    
    // Global Totals (Not affected by filters, matching reference app)
    const totalDigitado = registros.filter(r => r.estado === 'Digitado').length
    const totalTransito = registros.filter(r => r.estado === 'Transito').length
    const countCediHoy = registros.filter(r => 
        r.estado === 'Cedi' && 
        (r.cedi_fecha || '').split('T')[0] === today
    ).length

    // Kilogramos: Current Transito + Cedi Today (Matches reference app logic)
    const transitoRecords = registros.filter(r => r.estado === 'Transito')
    const cediTodayRecords = registros.filter(r => r.estado === 'Cedi' && (r.cedi_fecha || '').split('T')[0] === today)
    
    const totalKilogramos = [...transitoRecords, ...cediTodayRecords]
        .reduce((acc, r) => acc + (Number(r.kilos_vaciados) || 0), 0)

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    // Verificación física de CEDI (casco con cachos), igual que en Muebles y FV; en MS todo va en piezas
    const verif = useVerificacionesCedi(filteredOrdenes.map(o => String(o.orden_fabricacion)), 'MS')
    // Entregas del día (Entrega 1, 2, …): piezas digitadas (pasan a Tránsito) entre cierres
    const entregasCedi = useEntregasCedi('MS', registros)
    const aEntregar = (o: OrdenFabricacion) => (Number(o.transito) || 0) + (Number(o.cedi) || 0)
    const verificadoDe = (o: OrdenFabricacion) => Math.min(aEntregar(o), verif.porOf.get(String(o.orden_fabricacion)) || 0)
    // Entrega que se ve (por defecto la en curso; al cerrarla queda en 0); los contadores siguen esa selección
    const [entregaSel, setEntregaSel] = useState<SeleccionEntrega>(null)
    const baseLista = filtrarPorEntrega(filteredOrdenes, entregasCedi.entregas, entregaSel)
    const totalAEntregar = baseLista.reduce((t, o) => t + aEntregar(o), 0)
    const totalVerificado = baseLista.reduce((t, o) => t + verificadoDe(o), 0)
    const totalNoVerificado = totalAEntregar - totalVerificado
    const ordenesLista = filtroVerif === 'no' ? baseLista.filter(o => verificadoDe(o) < aEntregar(o))
        : filtroVerif === 'si' ? baseLista.filter(o => verificadoDe(o) > 0) : baseLista
    const alternarTraz = (id: number) => setTrazAbierta(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Summary Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Sku / Of / Pedido / Molde"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="p-2 bg-blue-600 text-white rounded-lg"><Calendar size={18} /></button>
                        <button onClick={() => { setSearchText(''); setFechaFiltro(null); }} className="p-2 bg-orange-500 text-white rounded-lg"><Eraser size={18} /></button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-2">
                        <StatCard label="Digitado" value={totalDigitado} color="blue" />
                        <StatCard label="Transito" value={totalTransito} color="orange" />
                        <StatCard label="Cedi" value={countCediHoy} color="green" />
                        <StatCard label="Kilogramos" value={totalKilogramos.toFixed(1) as any} color="slate" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 items-center pl-4 border-l border-slate-200">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="flex flex-col items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 border border-blue-100"
                        >
                            {moving ? <Loader2 className="animate-spin" size={20} /> : <ArrowLeftRight size={20} />}
                            <span className="text-[9px] font-black uppercase mt-1">Mover a Cedi</span>
                        </button>
                        
                        <BotonCerrarEntrega planta="MS" enCurso={entregasCedi.enCurso} usuario={userEmail} unidad="pieza(s)" onHecho={entregasCedi.recargar} />
                        <div className="h-10 w-px bg-slate-200 mx-1" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase text-center">Exportar Reporte</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md shadow-green-100 active:scale-95 group"
                                    title="Exportar a Excel"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span className="text-[10px] font-black uppercase">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md shadow-slate-200 active:scale-95 group"
                                    title="Exportar a CSV"
                                >
                                    <FileCode size={16} />
                                    <span className="text-[10px] font-black uppercase">CSV</span>
                                </button>
                            </div>
                        </div>
                        {/* Actualizar: vuelve a leer órdenes, piezas, entregas y verificaciones */}
                        <button type="button" onClick={() => { loadData(); entregasCedi.recargar(); verif.recargar() }} disabled={loading}
                            title="Actualizar datos (órdenes, entregas y verificaciones)"
                            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
                {/* Órdenes a entregar · Piezas a entregar · Verificadas · No verificadas (clic: filtra) */}
                <div className="mt-2 px-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-black uppercase tracking-wide">
                        <Warehouse size={13} /> Órdenes: <b className="text-indigo-900">{baseLista.length}</b>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-wide" title="Piezas en tránsito más las ya recibidas en CEDI">
                        Piezas a entregar: <b className="text-[#254153]">{totalAEntregar.toLocaleString('es-CO')}</b>
                    </span>
                    <button type="button" onClick={() => setFiltroVerif(v => v === 'si' ? 'todos' : 'si')}
                        title={filtroVerif === 'si' ? 'Ver todas las órdenes' : 'Mostrar solo las órdenes con piezas verificadas'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-black uppercase tracking-wide transition-colors ${filtroVerif === 'si' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                        <CascoDiablo size={14} /> Verificadas: <b>{totalVerificado.toLocaleString('es-CO')}</b>
                        {filtroVerif === 'si' && <span className="ml-1 normal-case font-bold">· filtrando ✕</span>}
                    </button>
                    <button type="button" onClick={() => setFiltroVerif(v => v === 'no' ? 'todos' : 'no')}
                        title={filtroVerif === 'no' ? 'Ver todas las órdenes' : 'Mostrar solo las órdenes con piezas sin verificar'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-black uppercase tracking-wide transition-colors ${filtroVerif === 'no' ? 'bg-[#d14747] border-[#d14747] text-white' : 'bg-rose-50 border-rose-200 text-[#d14747] hover:bg-rose-100'}`}>
                        No verificadas: <b>{totalNoVerificado.toLocaleString('es-CO')}</b>
                        {filtroVerif === 'no' && <span className="ml-1 normal-case font-bold">· filtrando ✕</span>}
                    </button>
                    <ChipEntregasHoy entregas={entregasCedi.entregas} error={entregasCedi.error} seleccion={entregaSel} onSeleccion={setEntregaSel} />
                    {verif.error && <span className="normal-case text-[11px] text-[#d14747]">{verif.error}</span>}
                </div>
            </div>

            {verificarDe && (
                <ConfirmarVerificado
                    orden={verificarDe as any}
                    planta="MS"
                    verificado={verif.porOf.get(String(verificarDe.orden_fabricacion)) || 0}
                    usuario={userEmail}
                    onCerrar={() => setVerificarDe(null)}
                    onHecho={() => { setVerificarDe(null); verif.recargar() }}
                />
            )}

            {/* Content area */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedOrderId || !selectedOrder ? (
                    // Selection View
                    <div className="h-full overflow-y-auto p-4 space-y-3 max-w-7xl mx-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                <Loader2 className="animate-spin text-blue-500" size={48} />
                                <span className="font-bold uppercase tracking-widest animate-pulse">Cargando órdenes...</span>
                            </div>
                        ) : ordenesLista.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase text-lg italic bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                Sin ordenes halladas
                            </div>
                        ) : (
                            ordenesLista.map(o => (
                                <div key={o.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Tarjeta + franja (Trazabilidad · Componentes entrega · Verificado), como en CEDI Muebles y FV */}
                                    <div className="bg-white border-2 border-gray-300 rounded-lg">
                                        <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none">
                                            <OrdenCard
                                                orden={o}
                                                isActive={false}
                                                onClick={() => setSelectedOrderId(o.id)}
                                                moldes={allMoldes}
                                                resaltarSku
                                            />
                                        </div>
                                        <div className="rounded-b-md border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                            <button type="button" onClick={() => alternarTraz(o.id)}
                                                className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors ${trazAbierta.has(o.id) ? 'bg-[#324354] text-white border-[#324354]' : 'bg-white text-[#324354] border-[#e2ded5] hover:bg-[#F6F3EE]'}`}
                                                title={trazAbierta.has(o.id) ? 'Ocultar procesos de la orden' : 'Ver procesos de la orden'}>
                                                <ChevronsUpDown size={15} />
                                                {trazAbierta.has(o.id) ? 'Ocultar trazabilidad' : 'Trazabilidad'}
                                            </button>
                                            <EstadoEntregaOf of={o.orden_fabricacion} />
                                            <div className="ml-auto">
                                                <BotonVerificado orden={o as any} verificado={verif.porOf.get(String(o.orden_fabricacion)) || 0} onClick={() => setVerificarDe(o)} />
                                            </div>
                                        </div>
                                    </div>
                                    {trazAbierta.has(o.id) && <OrderProcessesPanel orden={o} registros={[]} />}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    // Detail View
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                            <button
                                onClick={() => setSelectedOrderId(null)}
                                className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:text-blue-700 transition-colors mb-3 w-fit group"
                            >
                                <div className="bg-blue-50 p-1 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <ArrowLeft size={16} />
                                </div>
                                Volver a la lista
                            </button>
                            <div className="pointer-events-none opacity-90 scale-[0.98] origin-left">
                                <OrdenCard
                                    orden={selectedOrder}
                                    isActive={true}
                                    onClick={() => {}}
                                    moldes={allMoldes}
                                    resaltarSku
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <CediList
                                order={selectedOrder}
                                userEmail={userEmail}
                                onRefresh={loadData}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    const bgColors: Record<string, string> = {
        blue: 'bg-blue-600',
        orange: 'bg-orange-500',
        green: 'bg-green-600',
        slate: 'bg-slate-600'
    }
    return (
        <div className={`${bgColors[color]} text-white px-4 py-2 rounded-xl min-w-[80px] flex flex-col items-center shadow-lg border border-black/5`}>
            <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>
            <span className="text-lg font-black">{value}</span>
        </div>
    )
}
