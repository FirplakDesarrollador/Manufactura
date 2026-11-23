'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Search, X, ClipboardList } from 'lucide-react'
import CarruselPestanas from '@/components/ui/CarruselPestanas'
import { OrdenRtm, UnidadRtm, cargarUnidadesDesde, cargarParametrosRtm, diaBogota, hoyBogotaRtm } from '@/lib/superficies/datos'

// Piezas comunes del Control de Piso Superficies (RTM): indicadores de la planta, buscador y tarjeta de la orden.

const fmtFecha = (f: string | null | undefined) => {
    if (!f) return '—'
    const m = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(f)
}

// Indicadores del día y de la planta (una sola fila; carrusel si no caben)
export function IndicadoresRtm({ ordenes, recarga }: { ordenes: OrdenRtm[]; recarga?: number }) {
    const [unidadesHoy, setUnidadesHoy] = useState<UnidadRtm[]>([])
    const [kg, setKg] = useState<Map<string, number | null>>(new Map())
    useEffect(() => {
        const hoy = hoyBogotaRtm()
        cargarUnidadesDesde(new Date(`${hoy}T00:00:00-05:00`).toISOString()).then(setUnidadesHoy).catch(() => setUnidadesHoy([]))
        cargarParametrosRtm().then(setKg).catch(() => setKg(new Map()))
    }, [recarga])
    const m = useMemo(() => {
        const hoy = hoyBogotaRtm()
        const skuDe = new Map(ordenes.map(o => [o.id, o.producto_sku || '']))
        const cediHoy = unidadesHoy.filter(u => diaBogota(u.cedi_fecha) === hoy)
        return {
            cantidad: ordenes.reduce((a, o) => a + Number(o.cantidad || 0), 0),
            programado: ordenes.reduce((a, o) => a + o.programado, 0),
            pulidoHoy: unidadesHoy.filter(u => diaBogota(u.pulido_fecha) === hoy).length,
            porDigitar: ordenes.reduce((a, o) => a + o.pulido, 0),
            reparacion: ordenes.reduce((a, o) => a + o.reparacion, 0),
            transito: ordenes.reduce((a, o) => a + o.transito, 0),
            digitadoHoy: unidadesHoy.filter(u => diaBogota(u.digitado_fecha) === hoy).length,
            cediHoy: cediHoy.length,
            kgHoy: cediHoy.reduce((a, u) => a + (kg.get(skuDe.get(u.orden_fabricacion_id) || '') || 0), 0)
        }
    }, [ordenes, unidadesHoy, kg])
    const tarjetas: { t: string; v: string | number; c: string }[] = [
        { t: 'Cantidad', v: m.cantidad, c: 'bg-[#324354]/10 text-[#324354]' },
        { t: 'Programado', v: m.programado, c: 'bg-[#324354]/10 text-[#324354]' },
        { t: 'Pulido hoy', v: m.pulidoHoy, c: 'bg-[#deb841]/20 text-[#7a5f0e]' },
        { t: 'Por digitar', v: m.porDigitar, c: 'bg-[#deb841]/20 text-[#7a5f0e]' },
        { t: 'Reparación', v: m.reparacion, c: 'bg-orange-50 text-orange-700' },
        { t: 'Digitado hoy', v: m.digitadoHoy, c: 'bg-[#59a96a]/15 text-[#2f7a40]' },
        { t: 'Tránsito', v: m.transito, c: 'bg-[#59a96a]/15 text-[#2f7a40]' },
        { t: 'CEDI hoy', v: m.cediHoy, c: 'bg-[#59a96a]/15 text-[#2f7a40]' },
        { t: 'Kg hoy', v: m.kgHoy.toFixed(1), c: 'bg-[#324354] text-white' }
    ]
    return (
        <CarruselPestanas>
            {tarjetas.map(x => (
                <div key={x.t} className={`shrink-0 w-[104px] px-2 py-1.5 rounded-xl border border-[#e2ded5] shadow-2xs text-center ${x.c}`}>
                    <p className="text-[9px] font-black uppercase opacity-80 leading-none">{x.t}</p>
                    <p className="text-lg font-black leading-tight mt-0.5">{x.v}</p>
                </div>
            ))}
        </CarruselPestanas>
    )
}

export function BuscadorRtm({ valor, onCambio, placeholder = 'OF / Producto / Pedido / Cliente…' }: { valor: string; onCambio: (v: string) => void; placeholder?: string }) {
    return (
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={valor} onChange={e => onCambio(e.target.value)} placeholder={placeholder}
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
            {valor && <button type="button" onClick={() => onCambio('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Limpiar"><X size={15} /></button>}
        </div>
    )
}

export const coincideOrden = (o: OrdenRtm, q: string) => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    return [o.orden_fabricacion, o.producto_descripcion, o.producto_sku, o.numero_pedido, o.cliente].some(v => String(v || '').toLowerCase().includes(t))
}

// Tarjeta de la orden: datos, fechas del Semáforo y unidades por proceso; abajo la franja con las acciones del módulo
export function TarjetaOrdenRtm({ orden, resaltar, franja }: { orden: OrdenRtm; resaltar?: string; franja?: React.ReactNode }) {
    const cont: { t: string; v: number; k: string }[] = [
        { t: 'Cantidad', v: Number(orden.cantidad), k: 'cantidad' },
        { t: 'Programado', v: orden.programado, k: 'Programado' },
        { t: 'Por digitar', v: orden.pulido, k: 'Pulido' },
        { t: 'Reparación', v: orden.reparacion, k: 'Reparacion' },
        { t: 'Tránsito', v: orden.transito, k: 'Transito' },
        { t: 'CEDI', v: orden.cedi, k: 'Cedi' },
        { t: 'Saldo', v: orden.saldo, k: 'Saldo' },
        { t: 'Destrucción', v: orden.destruccion, k: 'Destruccion' }
    ]
    return (
        <div className="bg-white border-2 border-[#e2ded5] rounded-lg">
            <div className="p-3 flex flex-col lg:flex-row gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="text-lg font-black text-[#324354] flex items-center gap-1"><ClipboardList size={16} /> OF: {orden.orden_fabricacion}</span>
                        {orden.numero_pedido && <span className="text-xs font-bold text-[#7B8E90]">Pedido: {orden.numero_pedido}</span>}
                        {orden.familia && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#324354]/10 text-[#324354]">{orden.familia}</span>}
                    </div>
                    <p className="text-sm font-black text-[#324354] uppercase leading-tight mt-1">{orden.producto_descripcion}</p>
                    <p className="text-[11px] text-slate-500">SKU: {orden.producto_sku}{orden.cliente ? ` · ${orden.cliente}` : ''}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-[10px]">
                        <span><b className="text-slate-500 uppercase">Liberación</b> <b className="text-[#324354] text-xs">{fmtFecha(orden.fecha_real_liberacion || orden.fecha_ideal_produccion)}</b></span>
                        <span><b className="text-rose-600 uppercase">Prometida cliente</b> <b className="text-rose-700 text-xs">{fmtFecha(orden.fecha_prometida_entrega || orden.fecha_entrega_estimada)}</b></span>
                        <span><b className="text-emerald-700 uppercase">Nivel de servicio</b> <b className="text-[#324354] text-xs">{fmtFecha(orden.fecha_ideal_entrega_produccion)}</b></span>
                    </div>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 shrink-0 lg:w-[520px]">
                    {cont.map(c => (
                        <div key={c.k} className={`rounded-md border px-1 py-1 text-center ${c.k === resaltar ? 'bg-[#deb841]/20 border-[#deb841]' : c.k === 'cantidad' ? 'bg-[#324354] border-[#324354] text-white' : c.k === 'Cedi' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <p className={`text-[8px] font-black uppercase leading-none ${c.k === 'cantidad' ? 'text-white/80' : 'text-slate-500'}`}>{c.t}</p>
                            <p className={`text-base font-black leading-tight ${c.k === 'cantidad' ? 'text-white' : c.v ? 'text-[#324354]' : 'text-slate-300'}`}>{c.v}</p>
                        </div>
                    ))}
                </div>
            </div>
            {franja && <div className="rounded-b-md border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1.5">{franja}</div>}
        </div>
    )
}
