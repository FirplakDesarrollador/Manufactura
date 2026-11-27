'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad, Molde } from '@/types/pintura'
import { getOrdenesFabricacion, getRegistrosTrazabilidadHoyMetricas, getAllMoldes } from '@/lib/supabase/queries/fibra'
import { moverTransitoACedi } from '@/lib/supabase/queries/fibra_cedi'
import { Loader2, FileSpreadsheet, ArrowLeftRight, FileCode, ArrowLeft, ChevronsUpDown, Warehouse } from 'lucide-react'
import EstadoEntregaOf from '../EstadoEntregaOf'
import { OrderProcessesPanel } from '../administracion/AdministracionFibraModule'
import { useVerificacionesCedi, BotonVerificado, ConfirmarVerificado, CascoDiablo } from '@/components/muebles/VerificadoCedi'
import EncabezadoFibra, { useMetricasFibra } from '../EncabezadoFibra'
import CediList from './CediList'
import OrdenCard from '@/components/pintura/OrdenCard'
import * as XLSX from 'xlsx'

export default function CediFibraModule({ userEmail }: { userEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
    const [allMoldes, setAllMoldes] = useState<Molde[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
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
                getRegistrosTrazabilidadHoyMetricas(),
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

    // Descargas (27/11/2026): las mismas 4 columnas de CEDI Muebles: OF, SKU, Descripcion y Transito
    // (piezas despachadas a CEDI: en tránsito + ya recibidas)
    const filasReporte = () => filteredOrdenes.map(o => [
        Number(o.orden_fabricacion) || String(o.orden_fabricacion || ''),
        o.producto_sku || '',
        o.producto_descripcion || '',
        (Number(o.transito) || 0) + (Number(o.cedi) || 0),
    ])
    const hoyArchivo = new Date().toISOString().split('T')[0]

    const handleExportCSV = () => {
        const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const lineas = [['OF', 'SKU', 'Descripcion', 'Transito'].map(q).join(','), ...filasReporte().map(r => r.map(q).join(','))]
        const url = URL.createObjectURL(new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a'); link.href = url; link.download = `reporte_cedi_fv_${hoyArchivo}.csv`; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const handleExportExcel = async () => {
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('CEDI FV')
        ws.columns = [{ width: 11 }, { width: 22 }, { width: 72 }, { width: 11 }]
        ws.addTable({
            name: 'CediFibra', ref: 'A1', headerRow: true,
            style: { theme: 'TableStyleMedium7', showRowStripes: true },
            columns: [{ name: 'OF', filterButton: true }, { name: 'SKU', filterButton: true }, { name: 'Descripcion', filterButton: true }, { name: 'Transito', filterButton: true }],
            rows: filasReporte(),
        })
        ws.views = [{ state: 'frozen', ySplit: 1 }]
        const buf = await wb.xlsx.writeBuffer()
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
        const a = document.createElement('a'); a.href = url; a.download = `reporte_cedi_fv_${hoyArchivo}.xlsx`; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const { baseFilteredOrdenes, metrics } = useMetricasFibra(ordenes, registros, searchText, selectedDate)

    const filteredOrdenes = useMemo(() => baseFilteredOrdenes
        .filter(o => (o.transito || 0) > 0 || (o.cedi || 0) > 0)
        .sort((a, b) => {
            const rawA = a.fecha_entrega_lote || a.fecha_ideal_produccion || a.fecha_entrega_estimada
            const rawB = b.fecha_entrega_lote || b.fecha_ideal_produccion || b.fecha_entrega_estimada
            const dateA = rawA ? new Date(rawA).getTime() : Infinity
            const dateB = rawB ? new Date(rawB).getTime() : Infinity
            const valA = isNaN(dateA) ? Infinity : dateA
            const valB = isNaN(dateB) ? Infinity : dateB
            return valA - valB
        }), [baseFilteredOrdenes])

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId)

    // Verificación física de CEDI (casco con cachos), igual que en Muebles; en FV todo va en piezas
    const verif = useVerificacionesCedi(filteredOrdenes.map(o => String(o.orden_fabricacion)), 'Fibra')
    const aEntregar = (o: OrdenFabricacion) => (Number(o.transito) || 0) + (Number(o.cedi) || 0)
    const verificadoDe = (o: OrdenFabricacion) => Math.min(aEntregar(o), verif.porOf.get(String(o.orden_fabricacion)) || 0)
    const totalAEntregar = filteredOrdenes.reduce((t, o) => t + aEntregar(o), 0)
    const totalVerificado = filteredOrdenes.reduce((t, o) => t + verificadoDe(o), 0)
    const totalNoVerificado = totalAEntregar - totalVerificado
    const ordenesLista = filtroVerif === 'no' ? filteredOrdenes.filter(o => verificadoDe(o) < aEntregar(o))
        : filtroVerif === 'si' ? filteredOrdenes.filter(o => verificadoDe(o) > 0) : filteredOrdenes
    const alternarTraz = (id: number) => setTrazAbierta(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            <EncabezadoFibra
                metrics={metrics}
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onClear={() => { setSearchText(''); setSelectedDate('') }}
                loading={loading}
                placeholder="Sku / Of / Pedido / Molde"
                extra={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMoveAllToCedi}
                            disabled={moving}
                            className="h-8 px-3 flex items-center gap-1.5 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                            title="Mover todas las piezas en Tránsito a CEDI"
                        >
                            {moving ? <Loader2 className="animate-spin" size={14} /> : <ArrowLeftRight size={14} />}
                            Mover a CEDI
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="h-8 px-3 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                            title="Exportar reporte a Excel"
                        >
                            <FileSpreadsheet size={14} />
                            Excel
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="h-8 px-3 flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                            title="Exportar reporte a CSV"
                        >
                            <FileCode size={14} />
                            CSV
                        </button>
                    </div>
                }
            />

            {verificarDe && (
                <ConfirmarVerificado
                    orden={verificarDe as any}
                    planta="Fibra"
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
                    <div className="h-full overflow-y-auto p-4 space-y-2">
                        {/* Órdenes a entregar · Piezas a entregar · Verificadas · No verificadas (clic: filtra) */}
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-black uppercase tracking-wide">
                                <Warehouse size={13} /> Órdenes a entregar: <b className="text-indigo-900">{filteredOrdenes.length}</b>
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
                            {verif.error && <span className="normal-case text-[11px] text-[#d14747]">{verif.error}</span>}
                        </div>
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
                                    {/* Tarjeta + franja (Trazabilidad · Componentes entrega · Verificado), como en CEDI Muebles */}
                                    <div className="bg-white border-2 border-gray-300 rounded-lg">
                                        <div className="rounded-t-md overflow-hidden [&>button]:border-0 [&>button]:rounded-none [&>button]:ring-0 [&>button]:shadow-none">
                                            <OrdenCard planta="fv"
                                                orden={o}
                                                isActive={false}
                                                onClick={() => setSelectedOrderId(o.id)}
                                                moldes={allMoldes}
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
                                <OrdenCard planta="fv"
                                    orden={selectedOrder}
                                    isActive={true}
                                    onClick={() => {}}
                                    moldes={allMoldes}
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

