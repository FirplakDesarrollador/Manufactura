'use client'

import React, { useMemo } from 'react'
import { OrdenFabricacion, RegistroTrazabilidad } from '@/types/pintura'
import { Search, X, Calendar, RefreshCw } from 'lucide-react'
import { useKgPorSku } from '@/lib/fibra/kgProductoFv'
import { parseDBTimestamp } from '@/lib/utils/date'

// Encabezado común de los módulos de piso FV (Pintura, Vaciado…): indicadores del día y barra de búsqueda,
// fecha, limpiar y Actualizar SAP. Las métricas y el filtro base son los mismos de Administración.

export function useMetricasFibra(ordenes: OrdenFabricacion[], trazabilidad: RegistroTrazabilidad[], searchText: string, selectedDate: string) {
    // Base filter for metrics (matches Administration)
    const baseFilteredOrdenes = useMemo(() => {
        const search = (searchText || '').toLowerCase()
        return ordenes.filter((orden) => {
            const matchesSearch = !search ||
                (orden.producto_descripcion || '').toLowerCase().includes(search) ||
                (orden.orden_fabricacion || '').toLowerCase().includes(search) ||
                (orden.pedido || (orden as any).numero_pedido || '').toLowerCase().includes(search) ||
                (orden.molde_descripcion || '').toLowerCase().includes(search) ||
                (orden.producto_sku || '').toLowerCase().includes(search) ||
                (orden.molde_sku || '').toLowerCase().includes(search) ||
                (orden.cliente || orden.cliente_nombre || '').toLowerCase().includes(search)

            const matchesDate = !selectedDate ||
                (orden.fecha_entrega_lote &&
                    orden.fecha_entrega_lote.includes(selectedDate)) ||
                (orden.fecha_ideal_produccion &&
                    orden.fecha_ideal_produccion.includes(selectedDate)) ||
                (!orden.fecha_ideal_produccion &&
                    orden.fecha_entrega_estimada &&
                    orden.fecha_entrega_estimada.includes(selectedDate))

            return matchesSearch && matchesDate
        })
    }, [ordenes, searchText, selectedDate])

    // Kilos por producto (resina + gelcoat con la reducción de Parámetros FV)
    const kgPorSku = useKgPorSku()

    // Calculate metrics to match reference app (FlutterFlow)
    const metrics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]

        // 1. Quantity & Programmed (Totals for all filtered orders)
        const totalCantidad = baseFilteredOrdenes.reduce((sum, o) => sum + Math.max(0, o.cantidad_programada || o.cantidad || 0), 0)
        const totalProgramado = baseFilteredOrdenes.reduce((sum, o) => sum + Math.max(0, o.programado || 0), 0)

        // 2. Daily Production (From traceability)
        const vaciadoToday = trazabilidad.filter(t => {
            const vDate = (t.vaciado_fecha || t.fecha_vaciado || '').split('T')[0]
            return vDate === today
        })

        const pinturaToday = trazabilidad.filter(t => {
            const pDate = (t.pintura_fecha || '').split('T')[0]
            return pDate === today
        })

        const pulidoToday = trazabilidad.filter(t => (t.pulido_fecha || '').split('T')[0] === today)
        const huacalesToday = trazabilidad.filter(t => (t.empaque_fecha || '').split('T')[0] === today)

        const acabadoToday = trazabilidad.filter(t => {
            const aDate = (t.acabado_fecha || '').split('T')[0]
            return aDate === today
        })
        const cediToday = trazabilidad.filter(t => (t.cedi_fecha || '').split('T')[0] === today)

        // Kg Hoy: resina + gelcoat (con la reducción de Parámetros FV) de las piezas vaciadas hoy (día local).
        // Pieza cuyo producto no tiene kilos en Parámetros → no suma y se cuenta como "sin dato".
        const hoyLocal = new Date().toLocaleDateString('en-CA')
        let totalKilos = 0, kgSinDato = 0
        for (const t of trazabilidad) {
            const f = t.vaciado_fecha || t.fecha_vaciado
            if (!f || parseDBTimestamp(f).toLocaleDateString('en-CA') !== hoyLocal) continue
            const kg = kgPorSku?.get(String((t as any).producto_sku || '').trim())
            if (kg === undefined) kgSinDato++
            else totalKilos += kg
        }

        // Derive transito from filtered orders so it respects the search filter exactly
        const transitoFiltered = baseFilteredOrdenes.reduce((sum, o) => sum + Math.max(0, o.transito || 0), 0)

        return {
            cantidad: totalCantidad,
            programado: totalProgramado,
            pintura: pinturaToday.length,
            desgelcada: 0,
            vaciado: vaciadoToday.length,
            pulido: pulidoToday.length,
            huacales: huacalesToday.length,
            acabado: acabadoToday.length,
            saldo: baseFilteredOrdenes.reduce((sum, o) => sum + Math.max(0, o.saldo || 0), 0),
            digitado: trazabilidad.filter(t => t.estado === 'Digitado').length,
            transito: transitoFiltered,
            cedi: cediToday.length,
            kilogramos: parseFloat(totalKilos.toFixed(1)),
            kgSinDato: kgPorSku ? kgSinDato : 0,
            kgCargando: !kgPorSku
        }
    }, [baseFilteredOrdenes, trazabilidad, kgPorSku])

    return { baseFilteredOrdenes, metrics }
}

type Metricas = ReturnType<typeof useMetricasFibra>['metrics']

interface EncabezadoFibraProps {
    metrics: Metricas
    searchText: string
    onSearchChange: (v: string) => void
    selectedDate: string
    onDateChange: (v: string) => void
    onClear: () => void
    onSyncSap?: () => void   // sin él no se muestra "Actualizar SAP"
    syncing?: boolean
    loading: boolean
    placeholder?: string
    extra?: React.ReactNode   // controles propios del módulo (p. ej. pestañas de Vaciado), a la derecha
}

export default function EncabezadoFibra({ metrics, searchText, onSearchChange, selectedDate, onDateChange, onClear, onSyncSap, syncing, loading, placeholder = 'Producto / OF / Pedido / ...', extra }: EncabezadoFibraProps) {
    return (
        <>
            {/* Indicadores con colores Firplak: navy = órdenes, amarillo = procesos de planta, verde = salida, Kg en navy sólido */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200">
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar">
                    <StatCard label="Cantidad" value={metrics.cantidad} color="bg-[#324354]/10 text-[#324354]" />
                    <StatCard label="Programado" value={metrics.programado} color="bg-[#324354]/10 text-[#324354]" />
                    <StatCard label="Pintura" value={metrics.pintura} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Desgelcada" value={metrics.desgelcada} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Vaciado" value={metrics.vaciado} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Pulido" value={metrics.pulido} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Ensayo" value={metrics.acabado} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Huacales" value={metrics.huacales} color="bg-[#deb841]/20 text-[#7a5f0e]" />
                    <StatCard label="Digitado" value={metrics.digitado} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Transito" value={metrics.transito} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Cedi Hoy" value={metrics.cedi} color="bg-[#59a96a]/15 text-[#2f7a40]" />
                    <StatCard label="Kg Hoy" value={metrics.kgCargando ? '…' : `${metrics.kilogramos.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${metrics.kgSinDato ? '*' : ''}`} color="bg-[#324354] text-white"
                        title={`Resina + gelcoat de las piezas vaciadas hoy (con la reducción de Parámetros).${metrics.kgSinDato ? ` * ${metrics.kgSinDato} pieza(s) sin kilos en Parámetros: no suman.` : ''}`} />
                </div>
            </div>

            {/* Controles: en celular búsqueda, fecha, limpiar y SAP en un solo renglón (sin títulos) */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-1.5 sm:gap-3">
                    <div className="basis-0 flex-1 min-w-[96px] md:min-w-[300px]">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 hidden sm:block">Búsqueda Global</label>
                        <div className="relative">
                            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={searchText}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full h-8 pl-7 sm:pl-9 pr-2 sm:pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]"
                            />
                        </div>
                    </div>

                    <div className="w-[112px] sm:w-48 shrink-0">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 hidden sm:block">Filtrar Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" size={15} />
                            <input
                                type="date"
                                value={selectedDate || ''}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-full h-8 pl-1.5 sm:pl-9 pr-1 sm:pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onClear}
                        className="h-8 w-8 shrink-0 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"
                        title="Limpiar filtros"
                    >
                        <X size={16} />
                    </button>

                    {onSyncSap && (
                    <button
                        onClick={onSyncSap}
                        disabled={syncing || loading}
                        className="shrink-0 flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-[#324354] text-white rounded-lg hover:bg-[#254153] transition-colors shadow-sm disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider h-8 self-end"
                        title="Sincronizar y recargar órdenes desde SAP"
                    >
                        <RefreshCw size={15} className={syncing || loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Actualizar SAP</span>
                    </button>
                    )}

                    {extra && <div className="basis-full sm:basis-auto">{extra}</div>}
                </div>
            </div>
        </>
    )
}

function StatCard({ label, value, color, title }: { label: string, value: string | number, color: string, title?: string }) {
    return (
        <div title={title} className={`flex-1 min-w-[64px] sm:min-w-[76px] px-1 sm:px-1.5 py-1.5 rounded-lg border border-[#e2ded5] shadow-sm flex flex-col items-center justify-center ${color}`}>
            <span className="text-[9px] font-black uppercase opacity-70 leading-tight whitespace-nowrap">{label}</span>
            <span className="text-sm font-black tracking-tight">{value}</span>
        </div>
    )
}
