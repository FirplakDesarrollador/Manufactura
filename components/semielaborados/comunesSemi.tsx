'use client'

import React from 'react'
import { ClipboardList, Search, User, X } from 'lucide-react'
import CarruselPestanas from '@/components/ui/CarruselPestanas'
import type { OrdenSemi } from '@/lib/semielaborados/datos'

// Piezas comunes del Control de Piso Semielaborados: indicadores, buscador y tarjeta de la OF (diseño de Fibra).

const fmt = (f: string | null | undefined) => {
    if (!f) return '—'
    const m = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(f)
}

export function IndicadoresSemi({ ordenes }: { ordenes: OrdenSemi[] }) {
    const s = (k: keyof OrdenSemi) => ordenes.reduce((a, o) => a + (Number(o[k]) || 0), 0)
    const tarjetas: { t: string; v: number; c: string }[] = [
        { t: 'OF abiertas', v: ordenes.length, c: 'bg-[#324354]/10 text-[#324354]' },
        { t: 'Cantidad', v: s('cantidad'), c: 'bg-[#324354]/10 text-[#324354]' },
        { t: 'Programado', v: s('programado'), c: 'bg-[#324354]/10 text-[#324354]' },
        { t: 'Corte', v: s('corte'), c: 'bg-[#deb841]/20 text-[#7a5f0e]' },
        { t: 'Digitado', v: s('digitado'), c: 'bg-[#59a96a]/15 text-[#2f7a40]' },
        { t: 'Tránsito', v: s('transito'), c: 'bg-[#59a96a]/15 text-[#2f7a40]' },
        { t: 'Almacén', v: s('almacen'), c: 'bg-[#324354] text-white' },
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

export function BuscadorSemi({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
    return (
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={valor} onChange={e => onCambio(e.target.value)} placeholder="OF / Producto / Pedido / Cliente…"
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
            {valor && <button type="button" onClick={() => onCambio('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Limpiar"><X size={15} /></button>}
        </div>
    )
}

// Tarjeta de la OF: datos, fechas del Semáforo, cliente y unidades por proceso; abajo la franja del módulo
export function TarjetaOrdenSemi({ orden, resaltar, franja }: { orden: OrdenSemi; resaltar?: keyof OrdenSemi; franja?: React.ReactNode }) {
    const cont: { t: string; k: keyof OrdenSemi | 'cantidad' }[] = [
        { t: 'Cantidad', k: 'cantidad' }, { t: 'Programado', k: 'programado' }, { t: 'Corte', k: 'corte' },
        { t: 'Digitado', k: 'digitado' }, { t: 'Tránsito', k: 'transito' }, { t: 'Almacén', k: 'almacen' },
    ]
    return (
        <div className="bg-white border-2 border-[#e2ded5] rounded-lg overflow-hidden">
            <div className="p-3 flex flex-col xl:flex-row gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                        <span className="text-lg font-black text-[#254153] flex items-center gap-1.5"><ClipboardList size={17} /> OF: {orden.orden_fabricacion}</span>
                        {orden.numero_pedido && <span className="text-sm font-bold text-[#7B8E90]">Pedido: {orden.numero_pedido}</span>}
                    </div>
                    <p className="text-base font-black text-[#254153] uppercase leading-tight mt-1 line-clamp-2">{orden.producto_descripcion}</p>
                    <p className="text-[11px] font-semibold text-slate-500">SKU: {orden.producto_sku}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 max-w-[520px]">
                        <div className="border-l-2 border-slate-300 pl-2">
                            <p className="text-[9px] font-black uppercase text-slate-500 leading-none">Liberación</p>
                            <p className="text-sm font-black text-[#254153] mt-0.5">{fmt(orden.fecha_real_liberacion || orden.created_at)}</p>
                        </div>
                        <div className="border-l-2 border-[#d14747] pl-2">
                            <p className="text-[9px] font-black uppercase text-[#d14747] leading-none">Prometida cliente</p>
                            <p className="text-sm font-black text-[#d14747] mt-0.5">{fmt(orden.fecha_prometida_entrega || orden.fecha_entrega_estimada)}</p>
                        </div>
                        <div className="border-l-2 border-[#59a96a] pl-2">
                            <p className="text-[9px] font-black uppercase text-[#2f7a40] leading-none">Nivel de servicio</p>
                            <p className="text-sm font-black text-[#254153] mt-0.5">{fmt(orden.fecha_ideal_entrega_produccion)}</p>
                        </div>
                    </div>
                    {orden.cliente && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[#254153] text-white text-[10px] font-black uppercase max-w-full truncate" title={orden.cliente}>
                            <User size={12} className="shrink-0" /> {orden.cliente}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 shrink-0 xl:w-[520px] content-start">
                    {cont.map(c => {
                        const v = Number(orden[c.k as keyof OrdenSemi]) || 0
                        return (
                            <div key={c.k} className={`rounded-md border px-1 py-2 text-center ${c.k === 'cantidad' ? 'bg-[#254153] border-[#254153]' : c.k === resaltar ? 'bg-[#deb841]/20 border-[#deb841]' : c.k === 'almacen' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                <p className={`text-[9px] font-black uppercase leading-none ${c.k === 'cantidad' ? 'text-white/80' : 'text-slate-500'}`}>{c.t}</p>
                                <p className={`text-lg font-black leading-tight mt-0.5 ${c.k === 'cantidad' ? 'text-white' : v ? 'text-[#254153]' : 'text-slate-300'}`}>{v}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
            {franja && <div className="border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-2">{franja}</div>}
        </div>
    )
}
