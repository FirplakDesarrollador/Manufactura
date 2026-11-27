'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { OrdenMueble, TrazabilidadRecord } from '@/types/muebles'
import { getOrdenesMuebles, getTrazabilidadMueblesHoy, registrarTrazabilidadMueble } from '@/lib/supabase/queries/muebles'
import EncabezadoMuebles from './EncabezadoMuebles'
import OrderCard from './OrderCard'
import HistorialTrazabilidadModal from './HistorialTrazabilidadModal'
import EstadoEntregaOf from '../fibra/EstadoEntregaOf'
import { useVerificacionesCedi, BotonVerificado, ConfirmarVerificado, CascoDiablo } from './VerificadoCedi'
import TrazabilidadModal from './TrazabilidadModal'
import {
    Search, Eraser, Loader2, Calendar, ArrowLeftRight,
    ArrowLeft, FileSpreadsheet, FileCode, Warehouse, ClipboardList
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

interface CediModuleProps {
    userEmail: string
    turno: string
    usuarioNombre: string
    plantaMuebles: string
}

export default function CediModule({ userEmail, turno, usuarioNombre, plantaMuebles }: CediModuleProps) {
    const [ordenes, setOrdenes] = useState<OrdenMueble[]>([])
    const [trazabilidad, setTrazabilidad] = useState<TrazabilidadRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [fechaFiltro, setFechaFiltro] = useState<string | null>(null)
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
    const [selectedOrden, setSelectedOrden] = useState<OrdenMueble | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [trazabilidadDe, setTrazabilidadDe] = useState<OrdenMueble | null>(null)
    const [verificarDe, setVerificarDe] = useState<OrdenMueble | null>(null)
    const [moving, setMoving] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [ordenesData, trazData] = await Promise.all([
                getOrdenesMuebles(plantaMuebles, true),
                getTrazabilidadMueblesHoy(plantaMuebles)
            ])
            setOrdenes(ordenesData)
            setTrazabilidad(trazData || [])
        } catch (error) {
            console.error('Error loading Cedi data:', error)
            toast.error('Error al cargar datos de CEDI')
        } finally {
            setLoading(false)
        }
    }, [plantaMuebles])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Stats globales (no afectadas por filtros)
    const today = new Date().toISOString().split('T')[0]
    const totalDigitado = ordenes.reduce((s, o) => s + (o.digitado || 0), 0)
    const totalTransito = ordenes.reduce((s, o) => s + (o.transito || 0), 0)
    const totalCediHoy  = trazabilidad
        .filter(r => r.proceso === 'Cedi' && (r.created_at || '').split('T')[0] === today)
        .reduce((s, r) => s + (r.cantidad || 0), 0)

    // Mover masivo Transito -> CEDI
    const handleMoveAllToCedi = async () => {
        const ordenesToMove = ordenes.filter(o => (o.transito || 0) > 0)
        if (ordenesToMove.length === 0) {
            toast.error('No hay piezas en transito para mover')
            return
        }
        if (!confirm(`Mover todos los muebles (${ordenesToMove.length} ordenes) de Transito a CEDI?`)) return

        setMoving(true)
        try {
            for (const o of ordenesToMove) {
                await registrarTrazabilidadMueble({
                    orden_fabricacion: o.orden_fabricacion || '',
                    cantidad: o.transito || 0,
                    creado_por: usuarioNombre,
                    proceso: 'Cedi',
                    cedula_operario: 'CEDI_BULK',
                    nombre_operario: usuarioNombre,
                    fecha_inicio: new Date().toISOString()
                })
            }
            toast.success('Muebles movidos a CEDI correctamente')
            loadData()
        } catch (error) {
            console.error('Error in bulk move:', error)
            toast.error('Error al realizar el movimiento masivo')
        } finally {
            setMoving(false)
        }
    }

    // Reporte
    const getReportData = () => {
        const headers = ['OF', 'Pedido', 'Cliente', 'SKU', 'Descripcion', 'Cantidad', 'Digitado', 'Transito', 'Cedi', 'Fecha Entrega']
        const rows = filteredOrdenes.map(o => [
            o.orden_fabricacion || '',
            o.numero_pedido || '',
            o.cliente || '',
            o.producto_sku || '',
            o.producto_descripcion || '',
            o.cantidad || 0,
            o.digitado || 0,
            o.transito || 0,
            o.cedi || 0,
            o.fecha_entrega_estimada || ''
        ])
        return { headers, rows }
    }

    const handleExportCSV = () => {
        // Mismas 4 columnas del Excel: OF, SKU, Descripcion, Transito (en tránsito + recibido en CEDI)
        const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const lineas = [['OF', 'SKU', 'Descripcion', 'Transito'].map(q).join(','),
            ...filteredOrdenes.map(o => [o.orden_fabricacion, o.producto_sku, o.producto_descripcion, (Number(o.transito) || 0) + (Number(o.cedi) || 0)].map(q).join(','))]
        const url = URL.createObjectURL(new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `reporte_cedi_muebles_${today}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Excel de CEDI (27/11/2026): solo OF, SKU, Descripción y Tránsito (lo despachado a CEDI: en tránsito + recibido),
    // como tabla con filtros, filas alternadas en verde y anchos ajustados para leer la descripción completa
    const handleExportExcel = async () => {
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('CEDI Muebles')
        ws.columns = [{ width: 11 }, { width: 22 }, { width: 72 }, { width: 11 }]
        ws.addTable({
            name: 'CediMuebles', ref: 'A1', headerRow: true,
            style: { theme: 'TableStyleMedium7', showRowStripes: true },
            columns: [{ name: 'OF', filterButton: true }, { name: 'SKU', filterButton: true }, { name: 'Descripcion', filterButton: true }, { name: 'Transito', filterButton: true }],
            rows: filteredOrdenes.map(o => [
                Number(o.orden_fabricacion) || String(o.orden_fabricacion || ''),
                o.producto_sku || '',
                o.producto_descripcion || '',
                (Number(o.transito) || 0) + (Number(o.cedi) || 0),
            ]),
        })
        ws.views = [{ state: 'frozen', ySplit: 1 }]
        const buf = await wb.xlsx.writeBuffer()
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
        const a = document.createElement('a'); a.href = url; a.download = `reporte_cedi_muebles_${today}.xlsx`; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    // Filtrado
    const filteredOrdenes = ordenes.filter(o => {
        const search = searchText.toLowerCase()
        const matchesSearch = !searchText || (
            (o.orden_fabricacion?.toLowerCase() || '').includes(search) ||
            (o.numero_pedido?.toLowerCase() || '').includes(search) ||
            (o.producto_descripcion?.toLowerCase() || '').includes(search) ||
            (o.producto_sku?.toLowerCase() || '').includes(search) ||
            (o.cliente?.toLowerCase() || '').includes(search)
        )
        const matchesFecha = !fechaFiltro || (o.fecha_entrega_estimada || '').includes(fechaFiltro)
        const hasPieces = (o.transito || 0) > 0 || (o.cedi || 0) > 0
        return matchesSearch && matchesFecha && hasPieces
    }).sort((a, b) => {
        const dateA = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : Infinity
        const dateB = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : Infinity
        return (isNaN(dateA) ? Infinity : dateA) - (isNaN(dateB) ? Infinity : dateB)
    })

    const selectedOrder = ordenes.find(o => o.id === selectedOrderId) ?? null
    // Verificación física de CEDI (casco con cachos): total por OF y total del día
    const verif = useVerificacionesCedi(filteredOrdenes.map(o => String(o.orden_fabricacion)), plantaMuebles)
    // A entregar = en tránsito + recibido en CEDI (muebles). Verificado por OF hasta ese total; el resto, no verificado
    const aEntregar = (o: OrdenMueble) => (Number(o.transito) || 0) + (Number(o.cedi) || 0)
    const verificadoDe = (o: OrdenMueble) => Math.min(aEntregar(o), verif.porOf.get(String(o.orden_fabricacion)) || 0)
    const totalAEntregar = filteredOrdenes.reduce((s, o) => s + aEntregar(o), 0)
    const totalVerificado = filteredOrdenes.reduce((s, o) => s + verificadoDe(o), 0)
    const totalNoVerificado = totalAEntregar - totalVerificado
    // Filtro por verificación: clic en "Verificados" (OF con algo verificado) o "No verificados" (OF con algo sin verificar)
    const [filtroVerif, setFiltroVerif] = useState<'todos' | 'si' | 'no'>('todos')
    const soloNoVerificados = filtroVerif === 'no'
    const ordenesLista = filtroVerif === 'no' ? filteredOrdenes.filter(o => verificadoDe(o) < aEntregar(o))
        : filtroVerif === 'si' ? filteredOrdenes.filter(o => verificadoDe(o) > 0) : filteredOrdenes

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Encabezado único de Muebles / CEFI (igual en Administración y todos los módulos) */}
            <EncabezadoMuebles
                ordenes={ordenes}
                plantaMuebles={plantaMuebles}
                searchText={searchText}
                setSearchText={setSearchText}
                fecha={fechaFiltro || ''}
                setFecha={v => setFechaFiltro(v || null)}
                onRefresh={() => loadData()}
                loading={loading}
                version={ordenes}
                resaltado="transito"
                acciones={<>
                    <button type="button" onClick={handleMoveAllToCedi} disabled={moving} title="Pasar todo lo que está en tránsito a CEDI"
                        className="h-9 px-3 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
                        {moving ? <Loader2 className="animate-spin" size={15} /> : <ArrowLeftRight size={15} />} Mover a CEDI
                    </button>
                    <button type="button" onClick={handleExportExcel} title="Exportar a Excel"
                        className="h-9 px-3 shrink-0 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5">
                        <FileSpreadsheet size={15} /> Excel
                    </button>
                    <button type="button" onClick={handleExportCSV} title="Exportar a CSV"
                        className="h-9 px-3 shrink-0 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5">
                        <FileCode size={15} /> CSV
                    </button>
                </>}
            />
            <div className="px-4 pt-2 bg-white">

                {/* Órdenes a entregar · Total muebles a entregar · Verificados · No verificados (clic: filtra) */}
                <div className="mt-2 px-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-black uppercase tracking-wide">
                        <Warehouse size={13} /> Órdenes a entregar: <b className="text-indigo-900">{filteredOrdenes.length}</b>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-wide" title="Muebles en tránsito más los ya recibidos en CEDI">
                        Total muebles a entregar: <b className="text-[#254153]">{totalAEntregar.toLocaleString('es-CO')}</b>
                    </span>
                    <button type="button" onClick={() => setFiltroVerif(v => v === 'si' ? 'todos' : 'si')}
                        title={filtroVerif === 'si' ? 'Ver todas las órdenes' : 'Mostrar solo las órdenes con muebles verificados'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-black uppercase tracking-wide transition-colors ${filtroVerif === 'si' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                        <CascoDiablo size={14} /> Verificados: <b>{totalVerificado.toLocaleString('es-CO')}</b>
                        {filtroVerif === 'si' && <span className="ml-1 normal-case font-bold">· filtrando ✕</span>}
                    </button>
                    <button type="button" onClick={() => setFiltroVerif(v => v === 'no' ? 'todos' : 'no')}
                        title={soloNoVerificados ? 'Ver todas las órdenes' : 'Mostrar solo las órdenes con muebles sin verificar'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-black uppercase tracking-wide transition-colors ${soloNoVerificados ? 'bg-[#d14747] border-[#d14747] text-white' : 'bg-rose-50 border-rose-200 text-[#d14747] hover:bg-rose-100'}`}>
                        No verificados: <b>{totalNoVerificado.toLocaleString('es-CO')}</b>
                        {soloNoVerificados && <span className="ml-1 normal-case font-bold">· filtrando ✕</span>}
                    </button>
                    {verif.error && <span className="normal-case text-[11px] text-[#d14747]">{verif.error}</span>}
                </div>
            </div>

            {/* Area de contenido (master-detail) */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedOrderId || !selectedOrder ? (
                    <div className="h-full overflow-y-auto p-4 space-y-3 max-w-7xl mx-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                <Loader2 className="animate-spin text-indigo-500" size={48} />
                                <span className="font-bold uppercase tracking-widest animate-pulse">Cargando ordenes...</span>
                            </div>
                        ) : ordenesLista.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase text-lg italic bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                Sin ordenes en transito o CEDI
                            </div>
                        ) : (
                            ordenesLista.map(o => (
                                <div key={o.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <OrderCard
                                        orden={o}
                                        isActive={false}
                                        onClick={() => {
                                            setSelectedOrderId(o.id)
                                            setSelectedOrden(o)
                                            setIsModalOpen(true)
                                        }}
                                        proceso="Cedi"
                                        resaltarSku
                                        franja={
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button type="button" onClick={() => setTrazabilidadDe(o)}
                                            className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#254153] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-50">
                                            <ClipboardList size={16} /> Trazabilidad
                                        </button>
                                                <div className="flex-1 min-w-[220px]">
                                                    <EstadoEntregaOf of={o.orden_fabricacion} />
                                                </div>
                                                <div className="ml-auto">
                                                    <BotonVerificado orden={o} verificado={verif.porOf.get(String(o.orden_fabricacion)) || 0} onClick={() => setVerificarDe(o)} />
                                                </div>
                                            </div>
                                        }
                                    />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                            <button
                                onClick={() => setSelectedOrderId(null)}
                                className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:text-indigo-700 transition-colors mb-3 w-fit group"
                            >
                                <div className="bg-indigo-50 p-1 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <ArrowLeft size={16} />
                                </div>
                                Volver a la lista
                            </button>
                            <div className="pointer-events-none opacity-90 scale-[0.98] origin-left">
                                <OrderCard
                                    orden={selectedOrder}
                                    isActive={true}
                                    onClick={() => {}}
                                    proceso="Cedi"
                                    resaltarSku
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {trazabilidadDe && (
                <HistorialTrazabilidadModal orden={trazabilidadDe} onClose={() => setTrazabilidadDe(null)} onSuccess={() => loadData()} />
            )}

            {verificarDe && (
                <ConfirmarVerificado
                    orden={verificarDe}
                    planta={plantaMuebles}
                    verificado={verif.porOf.get(String(verificarDe.orden_fabricacion)) || 0}
                    usuario={userEmail || usuarioNombre}
                    onCerrar={() => setVerificarDe(null)}
                    onHecho={() => { setVerificarDe(null); verif.recargar() }}
                />
            )}

            {/* Modal Trazabilidad */}
            {selectedOrden && (
                <TrazabilidadModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedOrderId(null)
                        setSelectedOrden(null)
                    }}
                    orden={selectedOrden}
                    proceso="Cedi"
                    usuarioNombre={usuarioNombre || 'Usuario'}
                    turno={turno}
                    userEmail={userEmail}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        setSelectedOrderId(null)
                        setSelectedOrden(null)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const bgColors: Record<string, string> = {
        blue:   'bg-blue-600',
        orange: 'bg-orange-500',
        green:  'bg-green-600',
        slate:  'bg-slate-600',
    }
    return (
        <div className={`${bgColors[color]} text-white px-4 py-2 rounded-xl min-w-[80px] flex flex-col items-center shadow-lg border border-black/5`}>
            <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>
            <span className="text-lg font-black">{value}</span>
        </div>
    )
}
