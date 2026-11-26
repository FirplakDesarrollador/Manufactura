'use client'

import React from 'react'
import { OrdenMueble } from '@/types/muebles'
import { User, AlertCircle, AlertTriangle, ClipboardList } from 'lucide-react'
import { useFechasSemaforoMuebles } from '@/lib/muebles/fechasSemaforo'
import { format, isBefore, isToday, parseISO, isValid } from 'date-fns'

interface OrderCardProps {
    orden: OrdenMueble
    isActive: boolean
    onClick: () => void
    proceso?: string // 'Corte', 'Enchape', etc.
    onReportDefect?: (orden: OrdenMueble) => void
    /** Franja de acciones al pie de la tarjeta (Administración: Trazabilidad, componentes, Mover OF, Editar, Eliminar) */
    franja?: React.ReactNode
}

export default function OrderCard({ orden, isActive, onClick, proceso = 'Corte', onReportDefect, franja }: OrderCardProps) {
    const semaforo = useFechasSemaforoMuebles()
    const parseSafeDate = (dateStr?: string | null) => {
        if (!dateStr) return null
        try {
            const parsed = parseISO(dateStr)
            return isValid(parsed) ? parsed : null
        } catch {
            return null
        }
    }

    const deliveryDate = parseSafeDate(orden.fecha_entrega_estimada)
    const creationDate = parseSafeDate(orden.created_at)
    
    const formatDateSafe = (d: Date | null, fallback = 'N/A') => {
        if (!d) return fallback
        try {
            return format(d, 'dd/MM/yyyy')
        } catch {
            return fallback
        }
    }

    const reposicionCount = () => {
        if (proceso === 'Corte') return orden.reponer_corte || 0
        if (proceso === 'Enchape') return orden.reponer_enchape || 0
        if (proceso === 'Inspeccion') return orden.reponer_inspeccion || 0
        return 0
    }

    const currentReposiciones = reposicionCount()
    const piecesToReponer = currentReposiciones > 0 ? currentReposiciones : (orden.por_reponer || 0)
    const isReponer = piecesToReponer > 0

    // Pendiente del proceso de esta pantalla (misma regla de antes)
    const isCefi = (orden.planta || '').toLowerCase().includes('cefi') || (orden.producto_sku || '').toUpperCase().startsWith('VCEF')
    const totalPiezas = Number(orden.piezas) || 0
    const programmedMuebles = orden.cantidad || 1
    const piezasPerMueble = totalPiezas / programmedMuebles
    let pendingMuebles = 0
    let pendingPiezas = 0
    if (isCefi) {
        let pending = 0
        switch (proceso) {
            case 'Corte': pending = orden.por_cortar || 0; break
            case 'Enchape': pending = (orden.corte || 0) + (orden.reponer_enchape || 0); break
            case 'Inspeccion': pending = (orden.enchape || 0) + (orden.reponer_inspeccion || 0); break
            case 'Empaque': pending = 0; break
            case 'Digitado': pending = (orden.inspeccion || 0) + (orden.empaque || 0); break
            case 'Transito': pending = orden.digitado || 0; break
            case 'CEDI': pending = orden.transito || 0; break
            default: pending = orden.por_cortar || 0
        }
        pendingPiezas = pending
        const ppm = (totalPiezas > 0 && programmedMuebles > 0) ? (totalPiezas / programmedMuebles) : 1
        pendingMuebles = ppm > 0 ? Math.round(pending / ppm) : pending
    } else {
        switch (proceso) {
            case 'Corte': pendingMuebles = orden.por_cortar || 0; pendingPiezas = Number(orden.piezas_pendientes) || 0; break
            case 'Enchape': pendingMuebles = (orden.corte || 0) + (orden.reponer_enchape || 0); pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            case 'Inspeccion': pendingMuebles = (orden.enchape || 0) + (orden.reponer_inspeccion || 0); pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            case 'Empaque': pendingMuebles = orden.inspeccion || 0; pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            case 'Digitado': pendingMuebles = orden.empaque || 0; pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            case 'Transito': pendingMuebles = orden.digitado || 0; pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            case 'CEDI': pendingMuebles = orden.transito || 0; pendingPiezas = Math.round(pendingMuebles * piezasPerMueble); break
            default: pendingMuebles = orden.por_cortar || 0; pendingPiezas = Number(orden.piezas_pendientes) || 0
        }
    }

    // Fechas del Semáforo (igual que la tarjeta de Fibra); sin dato, las de SAP
    const sem = semaforo?.mapa.get(String(orden.orden_fabricacion).trim())
    const fLiberacion = parseSafeDate(sem?.realLib) || creationDate
    const fPrometida = parseSafeDate(sem?.prometida) || deliveryDate
    const fNivel = parseSafeDate(sem?.idealW)
    const descripcion = orden.producto_descripcion && orden.producto_descripcion.trim() !== '' && !/^sin descripci[oó]n$/i.test(orden.producto_descripcion.trim())
        ? orden.producto_descripcion
        : (orden.producto_sku ? `PRODUCTO (${orden.producto_sku})` : `ORDEN DE FABRICACIÓN #${orden.orden_fabricacion}`)

    // Unidades por proceso (columnas como en Fibra); la del proceso de esta pantalla resaltada
    const resaltado = proceso === 'CEDI' ? 'transito' : proceso === 'Transito' ? 'digitado' : proceso === 'Digitado' ? (isCefi ? 'inspeccion' : 'empaque')
        : proceso === 'Empaque' ? 'inspeccion' : proceso === 'Inspeccion' ? 'enchape' : proceso === 'Enchape' ? 'corte' : proceso === 'Corte' ? 'por_cortar' : ''
    const columnas: { k: string; t: string; v: number | string }[] = [
        { k: 'cantidad', t: 'Cantidad', v: orden.cantidad },
        { k: 'por_cortar', t: 'Programado', v: orden.por_cortar || 0 },
        { k: 'corte', t: 'Corte', v: orden.corte || 0 },
        { k: 'enchape', t: 'Enchape', v: orden.enchape || 0 },
        { k: 'inspeccion', t: 'Inspección', v: orden.inspeccion || 0 },
        ...(!isCefi ? [{ k: 'empaque', t: 'Empaque', v: orden.empaque || 0 }] : []),
        { k: 'digitado', t: 'Digitado', v: orden.digitado || 0 },
        { k: 'transito', t: 'Tránsito', v: orden.transito || 0 },
        { k: 'cedi', t: 'CEDI', v: orden.cedi || 0 },
        { k: 'piezas', t: 'Piezas', v: orden.piezas || 0 },
        { k: 'reponer', t: 'A reponer', v: orden.por_reponer || 0 },
    ]

    return (
        <div
            onClick={onClick}
            className={`w-full bg-white rounded-lg border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col ${
                isActive
                    ? 'border-[#254153] ring-4 ring-[#254153]/10 shadow-lg'
                    : isReponer
                        ? 'border-red-400 hover:border-red-500 hover:shadow-md'
                        : 'border-[#e2ded5] hover:border-[#7B8E90] hover:shadow-md'
            }`}
        >
            {isReponer && (
                <div className="absolute top-0 right-0 z-10 bg-red-600 text-white px-3 py-1 rounded-bl-xl font-bold text-xs flex items-center gap-1 shadow-sm">
                    <AlertCircle size={14} /> REPOSICIÓN · {piecesToReponer}
                </div>
            )}

            <div className="p-3 sm:p-4 flex flex-col xl:flex-row gap-3 xl:gap-4">
                {/* Identificación: OF, pedido, descripción, SKU, fechas y cliente (como la tarjeta de Fibra) */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                        <span className={`text-lg sm:text-xl font-black flex items-center gap-1.5 ${isReponer ? 'text-red-700' : 'text-[#254153]'}`}>
                            <ClipboardList size={18} /> OF: {orden.orden_fabricacion}
                        </span>
                        {orden.numero_pedido && <span className="text-sm font-bold text-[#7B8E90]">Pedido: {orden.numero_pedido}</span>}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${orden.pendiente ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                            {orden.pendiente ? 'Abierta' : 'Cerrada'}
                        </span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-[#254153] uppercase leading-tight mt-1.5 line-clamp-2">{descripcion}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">SKU: {orden.producto_sku}{orden.planta ? ` · ${orden.planta}` : ''}</p>

                    <div className="grid grid-cols-3 gap-2 mt-2.5 max-w-[560px]">
                        <div className="border-l-2 border-slate-300 pl-2">
                            <p className="text-[9px] font-black uppercase text-slate-500 leading-none">Liberación</p>
                            <p className="text-sm font-black text-[#254153] mt-0.5">{formatDateSafe(fLiberacion, '—')}</p>
                        </div>
                        <div className="border-l-2 border-[#d14747] pl-2">
                            <p className="text-[9px] font-black uppercase text-[#d14747] leading-none">Prometida cliente</p>
                            <p className="text-sm font-black text-[#d14747] mt-0.5">{formatDateSafe(fPrometida, '—')}</p>
                        </div>
                        <div className="border-l-2 border-[#59a96a] pl-2">
                            <p className="text-[9px] font-black uppercase text-[#2f7a40] leading-none">Nivel de servicio</p>
                            <p className="text-sm font-black text-[#254153] mt-0.5">{formatDateSafe(fNivel, '—')}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {orden.cliente && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#254153] text-white text-[10px] font-black uppercase max-w-full truncate" title={orden.cliente}>
                                <User size={12} className="shrink-0" /> {orden.cliente}
                            </span>
                        )}
                        {onReportDefect && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onReportDefect(orden) }}
                                className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                                title="Reportar Defecto o Reposición para esta OF"
                            >
                                <AlertTriangle size={12} className="text-amber-600" /> REPORTAR DEFECTO
                            </button>
                        )}
                    </div>
                </div>

                {/* Pendiente en este proceso + unidades por proceso */}
                <div className="flex gap-2 shrink-0 xl:w-[600px]">
                    <div className="w-[92px] shrink-0 rounded-lg bg-[#deb841]/20 border border-[#deb841] flex flex-col items-center justify-center px-1 py-2 text-center" title={`Pendiente en ${proceso}`}>
                        <p className="text-[9px] font-black uppercase text-[#7a5f0e] leading-tight">Pendiente</p>
                        <p className="text-2xl font-black text-[#254153] leading-tight">{pendingMuebles}</p>
                        <p className="text-[10px] font-bold text-[#7a5f0e]">{pendingPiezas} piezas</p>
                    </div>
                    <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 gap-1">
                        {columnas.map(c => (
                            <div key={c.k} className={`rounded-md border px-1 py-1.5 text-center flex flex-col justify-center ${
                                c.k === 'cantidad' ? 'bg-[#254153] border-[#254153]'
                                    : c.k === resaltado ? 'bg-[#deb841]/20 border-[#deb841]'
                                        : c.k === 'cedi' ? 'bg-emerald-50 border-emerald-200'
                                            : c.k === 'reponer' && Number(c.v) > 0 ? 'bg-red-50 border-red-200'
                                                : 'bg-white border-slate-200'}`}>
                                <p className={`text-[8px] sm:text-[9px] font-black uppercase leading-none ${c.k === 'cantidad' ? 'text-white/80' : 'text-slate-500'}`}>{c.t}</p>
                                <p className={`text-base font-black leading-tight mt-0.5 ${c.k === 'cantidad' ? 'text-white' : Number(c.v) ? (c.k === 'reponer' ? 'text-red-700' : 'text-[#254153]') : 'text-slate-300'}`}>{c.v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {franja && (
                <div onClick={e => e.stopPropagation()} className="cursor-default border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-2">
                    {franja}
                </div>
            )}
            {isActive && <div className="h-1 bg-[#254153] w-full" />}
        </div>
    )
}

