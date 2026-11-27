'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, RefreshCw, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OrdenMueble } from '@/types/muebles'

// Mapa de procesos de Muebles / CEFI: una sola fila con los procesos de la planta, cuántas OF y unidades hay en cada
// uno (OF abiertas, query_of_muebles). Clic en un proceso: abajo sus OF. Solo consulta.
type Paso = { id: string; campo: keyof OrdenMueble; label: string; color: string }

// Nombre = estado en que está la unidad (como el Control de Piso MS); campo = dato de la vista
const PASOS: Paso[] = [
    { id: 'programado', campo: 'por_cortar', label: 'Programado', color: 'bg-slate-100 text-[#324354] border-slate-300' },
    { id: 'corte', campo: 'corte', label: 'Corte', color: 'bg-[#deb841]/15 text-[#7a5f0e] border-[#deb841]/60' },
    { id: 'enchape', campo: 'enchape', label: 'Enchape', color: 'bg-[#deb841]/15 text-[#7a5f0e] border-[#deb841]/60' },
    { id: 'inspeccion', campo: 'inspeccion', label: 'Inspección', color: 'bg-[#deb841]/15 text-[#7a5f0e] border-[#deb841]/60' },
    { id: 'empaque', campo: 'empaque', label: 'Empaque', color: 'bg-[#deb841]/15 text-[#7a5f0e] border-[#deb841]/60' },
    { id: 'digitado', campo: 'digitado', label: 'Digitado', color: 'bg-[#59a96a]/15 text-[#2f7a40] border-[#59a96a]/50' },
    { id: 'transito', campo: 'transito', label: 'Tránsito', color: 'bg-[#59a96a]/15 text-[#2f7a40] border-[#59a96a]/50' },
    { id: 'cedi', campo: 'cedi', label: 'CEDI', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
]

export default function MapaProcesosMuebles({ plantaMuebles }: { plantaMuebles: string }) {
    const esCefi = plantaMuebles.toLowerCase() === 'cefi'
    // Empaque ya no es un proceso (CEFI nunca; Muebles desde 26/11/2026)
    void esCefi
    const pasos = useMemo(() => PASOS.filter(p => p.id !== 'empaque'), [])
    const [ordenes, setOrdenes] = useState<OrdenMueble[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [elegido, setElegido] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')

    const cargar = useCallback(async () => {
        setOrdenes(null); setError(null)
        const filas: OrdenMueble[] = []
        for (let desde = 0; ; desde += 1000) {
            const { data, error: e } = await supabase.from('query_of_muebles').select('*')
                .eq('pendiente', true).eq('planta', plantaMuebles).order('id', { ascending: false }).range(desde, desde + 999)
            if (e) { setError(`No se pudieron leer las órdenes: ${e.message}`); setOrdenes([]); return }
            filas.push(...((data || []) as OrdenMueble[]))
            if (!data || data.length < 1000) break
        }
        setOrdenes(filas)
    }, [plantaMuebles])
    useEffect(() => { cargar() }, [cargar])

    const n = (o: OrdenMueble, p: Paso) => Math.max(0, Number(o[p.campo]) || 0)
    const resumen = useMemo(() => pasos.map(p => {
        const con = (ordenes || []).filter(o => n(o, p) > 0)
        return { paso: p, ofs: con.length, unidades: con.reduce((s, o) => s + n(o, p), 0) }
    }), [pasos, ordenes])

    const pasoElegido = pasos.find(p => p.id === elegido) || null
    const lista = useMemo(() => {
        if (!pasoElegido || !ordenes) return []
        const q = busqueda.trim().toLowerCase()
        return ordenes.filter(o => n(o, pasoElegido) > 0)
            .filter(o => !q || [o.orden_fabricacion, o.producto_descripcion, o.producto_sku, o.numero_pedido, o.cliente].some(v => String(v || '').toLowerCase().includes(q)))
    }, [pasoElegido, ordenes, busqueda])

    return (
        <div className="p-3 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Mapa de procesos · {esCefi ? 'CEFI' : 'Muebles'}</h2>
                    <p className="text-[11px] text-slate-500">OF abiertas y unidades en cada proceso. Toque un proceso para ver sus órdenes.</p>
                </div>
                <button onClick={cargar} className="h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]">
                    <RefreshCw size={14} className={ordenes === null ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {error && <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-[#d14747]">{error}</div>}

            {/* Una sola fila: proceso → proceso → … (se desplaza en pantallas angostas) */}
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
                {resumen.map(({ paso, ofs, unidades }, i) => (
                    <React.Fragment key={paso.id}>
                        <button onClick={() => setElegido(elegido === paso.id ? null : paso.id)}
                            className={`shrink-0 min-w-[118px] flex-1 rounded-xl border-2 px-2 py-3 text-center transition-all ${paso.color} ${elegido === paso.id ? 'ring-4 ring-[#324354]/25 border-[#324354]' : 'hover:shadow-md'}`}>
                            <p className="text-[10px] font-black uppercase tracking-wider">{paso.label}</p>
                            <p className="text-2xl font-black leading-tight mt-1">{ordenes === null ? '…' : unidades}</p>
                            <p className="text-[10px] font-bold opacity-80">{ordenes === null ? '' : `${ofs} OF`}</p>
                        </button>
                        {i < resumen.length - 1 && <ChevronRight className="shrink-0 self-center text-slate-300" size={18} />}
                    </React.Fragment>
                ))}
            </div>

            {pasoElegido && (
                <div className="bg-white rounded-xl border border-[#e2ded5] shadow-sm">
                    <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase text-[#324354] mr-auto">{pasoElegido.label} · {lista.length} OF</p>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="OF / Producto / Pedido / Cliente"
                                className="w-full h-8 pl-8 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
                        {lista.map(o => (
                            <div key={o.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                                <span className="font-black text-[#324354] w-24 shrink-0">OF {o.orden_fabricacion}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="font-bold text-[#324354] uppercase block truncate">{o.producto_descripcion}</span>
                                    <span className="text-[10px] text-slate-500">SKU {o.producto_sku}{o.cliente ? ` · ${o.cliente}` : ''}</span>
                                </span>
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#324354] text-white font-black">{n(o, pasoElegido)} / {o.cantidad}</span>
                            </div>
                        ))}
                        {!lista.length && <p className="px-3 py-6 text-center text-xs text-slate-400">Sin órdenes en este proceso.</p>}
                    </div>
                </div>
            )}
        </div>
    )
}
