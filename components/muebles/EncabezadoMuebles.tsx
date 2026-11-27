'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, RefreshCw, Search } from 'lucide-react'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'
import { getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'

// Encabezado único de Control de Piso Muebles / CEFI (Administración y todos los módulos de proceso), 26/11/2026:
//  - Barra: buscador · fecha (entrega/creación) · acciones del módulo · actualizar · % Calidad.
//  - Un renglón con 9 recuadros = unidades que ESTÁN en cada estado (suma de las OF que se ven; mismo cálculo que
//    las tarjetas) + "Entregas hoy" (lo recibido hoy en CEDI: muebles, piezas, m² y m).

type Medidas = { m2: number; ml: number; und: number; pzs: number }

const esCefiOf = (o: any) => String(o.planta || '').toLowerCase().includes('cefi') || String(o.producto_sku || '').toUpperCase().startsWith('VCEF')

// Lo registrado hoy por proceso (muebles, piezas, m², m), compartido entre pantallas por 1 minuto
const cacheHoy = new Map<string, { t: number; p: Promise<Record<string, Medidas>> }>()
function leerHoy(planta: string, forzar: boolean): Promise<Record<string, Medidas>> {
    const c = cacheHoy.get(planta)
    if (c && !forzar && Date.now() - c.t < 60_000) return c.p
    const p = (async () => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const { data: regs, error } = await supabase.from('trazabilidad_muebles').select('orden_fabricacion, proceso, cantidad')
            .gte('created_at', hoy.toISOString()).limit(10000)
        if (error || !regs?.length) return {}
        const ofs = [...new Set(regs.map(r => String(r.orden_fabricacion)))]
        const porUnidad = new Map<string, { m2: number; ml: number; ppm: number; cefi: boolean }>()
        for (let i = 0; i < ofs.length; i += 150) {
            const { data } = await supabase.from('query_of_muebles').select('orden_fabricacion, cantidad, canto, rh_metros, piezas, planta, producto_sku')
                .in('orden_fabricacion', ofs.slice(i, i + 150))
            for (const o of data || []) {
                if (o.planta !== planta) continue
                const c = Number(o.cantidad) || 0
                // CEFI registra piezas; Muebles registra muebles (ppm = piezas por mueble)
                if (c > 0) porUnidad.set(String(o.orden_fabricacion), { m2: (Number(o.rh_metros) || 0) / c, ml: (Number(o.canto) || 0) / c, ppm: (Number(o.piezas) || 0) / c, cefi: esCefiOf(o) })
            }
        }
        const total: Record<string, Medidas> = {}
        for (const r of regs) {
            const u = porUnidad.get(String(r.orden_fabricacion))
            if (!u) continue
            const t = (total[String(r.proceso || '').toLowerCase()] ||= { m2: 0, ml: 0, und: 0, pzs: 0 })
            const n = Number(r.cantidad) || 0
            t.m2 += n * u.m2; t.ml += n * u.ml
            if (u.cefi) { t.pzs += n; t.und += u.ppm ? n / u.ppm : 0 } else { t.und += n; t.pzs += n * u.ppm }
        }
        return total
    })()
    cacheHoy.set(planta, { t: Date.now(), p })
    return p
}

type Props = {
    ordenes: OrdenMueble[]
    plantaMuebles: string
    searchText: string
    setSearchText: (v: string) => void
    placeholder?: string
    fecha: string
    setFecha: (v: string) => void
    dateType?: 'entrega' | 'creacion'
    setDateType?: (v: 'entrega' | 'creacion') => void
    onRefresh: () => void
    loading?: boolean
    calidad?: number | string | null
    /** Botones propios del módulo (van antes de Actualizar) */
    acciones?: React.ReactNode
    /** Recargar "Entregas hoy" cuando cambie (p. ej. la lista de órdenes) */
    version?: unknown
}

export default function EncabezadoMuebles({ ordenes, plantaMuebles, searchText, setSearchText, placeholder, fecha, setFecha,
    dateType = 'entrega', setDateType, onRefresh, loading, calidad, acciones, version }: Props) {
    const [hoy, setHoy] = useState<Record<string, Medidas>>({})
    // % Calidad: si el módulo no lo trae (CEDI), se lee del indicador del día
    const [calidadPropia, setCalidadPropia] = useState<number | string | null>(null)
    useEffect(() => {
        if (calidad !== undefined) return
        let vivo = true
        getMetricasMueblesHoy('1').then(m => { if (vivo) setCalidadPropia((m?.[0] as any)?.p_calidad ?? null) }).catch(() => {})
        return () => { vivo = false }
    }, [calidad])
    const calidadVer = calidad !== undefined ? calidad : calidadPropia
    useEffect(() => {
        let vivo = true
        leerHoy(plantaMuebles, version !== undefined).then(r => { if (vivo) setHoy(r) }).catch(() => {})
        return () => { vivo = false }
    }, [plantaMuebles, version])

    const resumen = useMemo(() => {
        const campos: { k: string; t: string; ayuda: string; leer: (o: any) => number }[] = [
            { k: 'cantidad', t: 'Cantidad', ayuda: 'Cantidad total de las OF', leer: o => Number(o.cantidad) || 0 },
            { k: 'por_cortar', t: 'Programado', ayuda: 'Aún sin cortar', leer: o => Number(o.por_cortar) || 0 },
            { k: 'corte', t: 'Corte', ayuda: 'Cortados, esperando enchape', leer: o => Number(o.corte) || 0 },
            { k: 'enchape', t: 'Enchape', ayuda: 'Enchapados, esperando inspección', leer: o => Number(o.enchape) || 0 },
            { k: 'inspeccion', t: 'Inspección', ayuda: 'Inspeccionados, esperando digitado', leer: o => (Number(o.inspeccion) || 0) + (Number(o.empaque) || 0) },
            { k: 'reponer', t: 'Pzs a reponer', ayuda: 'Piezas sueltas por reponer', leer: o => Number(o.por_reponer) || 0 },
            { k: 'digitado', t: 'Digitado', ayuda: 'Digitados, esperando tránsito', leer: o => Number(o.digitado) || 0 },
            { k: 'transito', t: 'Tránsito', ayuda: 'En tránsito, por recibir en CEDI', leer: o => Number(o.transito) || 0 },
            { k: 'cedi', t: 'CEDI', ayuda: 'Recibidos en CEDI', leer: o => Number(o.cedi) || 0 },
        ]
        const cefi = plantaMuebles === 'Cefi'
        return campos.map(c => {
            let v = 0, otra = 0
            for (const o of ordenes) {
                const n = c.leer(o); v += n
                if (c.k === 'reponer') continue
                const ppm = (Number(o.piezas) || 0) / (Number(o.cantidad) || 1)
                otra += esCefiOf(o) ? (ppm ? n / ppm : 0) : n * ppm
            }
            return { ...c, v, sub: c.k === 'reponer' ? 'piezas' : `${Math.round(otra).toLocaleString('es-CO')} ${cefi ? 'und' : 'pzs'}` }
        })
    }, [ordenes, plantaMuebles])

    const entregas = hoy.cedi
    return (
        <div className="bg-white px-3 py-2 border-b border-gray-200">
            <div className="max-w-[1400px] mx-auto flex flex-col gap-2">
                {/* Barra: buscador (ocupa el espacio libre) · fecha · acciones · actualizar · % Calidad */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder={placeholder || 'Buscar por SKU, OF, pedido o cliente'} value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="h-9 flex items-center rounded-lg border border-gray-300 bg-gray-50 overflow-hidden shrink-0">
                        <button type="button" onClick={() => setDateType?.(dateType === 'entrega' ? 'creacion' : 'entrega')} disabled={!setDateType}
                            className={`h-full px-2.5 flex items-center gap-1.5 text-white text-[10px] font-black uppercase ${dateType === 'entrega' ? 'bg-indigo-600' : 'bg-purple-600'}`}
                            title={!setDateType ? 'Fecha de entrega' : dateType === 'entrega' ? 'Filtrando por fecha de entrega (clic: fecha de creación)' : 'Filtrando por fecha de creación (clic: fecha de entrega)'}>
                            <Calendar size={15} /> {dateType === 'entrega' ? 'Entrega' : 'Creación'}
                        </button>
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                            title={dateType === 'entrega' ? 'Fecha de entrega' : 'Fecha de creación'}
                            className="h-full px-2 bg-transparent text-xs font-bold outline-none" />
                    </div>
                    {acciones}
                    <button type="button" onClick={onRefresh} title="Actualizar" className="h-9 w-9 shrink-0 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg border border-gray-200 hover:bg-gray-200">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="h-9 px-3 shrink-0 rounded-lg border border-blue-200 bg-blue-50 flex items-center gap-2" title="% de calidad del día">
                        <span className="text-[10px] font-black uppercase text-blue-600 whitespace-nowrap">% Calidad</span>
                        <span className="text-base font-black text-[#254153]">{calidadVer ?? '—'}</span>
                    </div>
                </div>

                {/* 9 estados (suma de las OF que se ven) + Entregas hoy */}
                <div className="grid grid-cols-[repeat(9,minmax(0,1fr))_minmax(0,2.5fr)] gap-1.5 min-w-0">
                    {resumen.map(r => (
                        <div key={r.k} title={r.ayuda}
                            className={`rounded-md border px-1 py-1.5 h-[68px] text-center flex flex-col justify-center gap-0.5 min-w-0 ${
                                r.k === 'cantidad' ? 'bg-[#254153] border-[#254153]'
                                    : r.k === 'cedi' ? 'bg-emerald-50 border-emerald-200'
                                        : r.k === 'reponer' && r.v > 0 ? 'bg-red-50 border-red-200'
                                            : 'bg-white border-slate-200'}`}>
                            <p className={`text-[8px] sm:text-[9px] font-black uppercase leading-none whitespace-nowrap ${r.k === 'cantidad' ? 'text-white/80' : 'text-slate-500'}`}>{r.t}</p>
                            <p className={`text-base font-black leading-tight ${r.k === 'cantidad' ? 'text-white' : r.k === 'reponer' && r.v > 0 ? 'text-red-700' : r.v ? 'text-[#254153]' : 'text-slate-300'}`}>{r.v.toLocaleString('es-CO')}</p>
                            {r.v !== 0 && r.k !== 'inspeccion' && <p className={`text-[9px] font-bold leading-none opacity-60 ${r.k === 'cantidad' ? 'text-white' : 'text-slate-500'}`}>{r.sub}</p>}
                        </div>
                    ))}
                    <div title="Recibido hoy en CEDI (acumulado del día)" className="rounded-md border border-emerald-300 bg-emerald-600 px-1.5 py-1.5 h-[68px] flex flex-col justify-center min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase leading-none text-white/85 text-center whitespace-nowrap">Entregas hoy</p>
                        <div className="grid grid-cols-4 gap-0.5 mt-1 text-center">
                            {[
                                { l: 'Muebles', v: Math.round(entregas?.und || 0) },
                                { l: 'Piezas', v: Math.round(entregas?.pzs || 0) },
                                { l: 'm²', v: Math.round(entregas?.m2 || 0) },
                                { l: 'm', v: Math.round(entregas?.ml || 0) },
                            ].map(x => (
                                <div key={x.l} className="min-w-0">
                                    <p className="text-sm font-black text-white leading-tight whitespace-nowrap">{x.v.toLocaleString('es-CO')}</p>
                                    <p className="text-[8px] font-bold text-white/75 leading-none">{x.l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
