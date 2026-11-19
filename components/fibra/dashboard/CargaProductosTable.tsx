'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Search } from 'lucide-react'
import { getOrdenesFabricacion } from '@/lib/supabase/queries/fibra'
import type { OrdenFabricacion } from '@/types/pintura'

// Carga de productos de FIBRA (antes leía la vista de Mármol query_carga_productos y, si no había datos, mostraba
// productos de ejemplo inventados): las OF pendientes de Fibra agrupadas por producto, con la cantidad, lo programado
// (por iniciar), lo que está en proceso en planta y lo que ya llegó a CEDI.

type Fila = { sku: string; descripcion: string; grupo: string; ordenes: number; cantidad: number; programado: number; enProceso: number; cedi: number }

const n = (v: unknown) => Math.max(0, Number(v) || 0)
const enProceso = (o: OrdenFabricacion) =>
    n(o.pintura) + n(o.vaciado) + n(o.herrajes) + n(o.pulido) + n(o.acabado) + n(o.reparacion) + n(o.reparacion_larga) + n(o.empaque) + n(o.digitado) + n(o.transito)
// Grupo = primera palabra de la descripción (HIDROMASAJE, HIDROAERO, BAÑERA, FALDON, KIT…)
const grupo = (d: string) => (d.trim().split(/\s+/)[0] || '—').toUpperCase()

export default function CargaProductosTable() {
    const [filas, setFilas] = useState<Fila[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cargando, setCargando] = useState(false)
    const [busqueda, setBusqueda] = useState('')

    const cargar = async () => {
        setCargando(true); setError(null)
        try {
            const ordenes = await getOrdenesFabricacion()
            const mapa = new Map<string, Fila>()
            for (const o of ordenes) {
                const sku = String(o.producto_sku || '').trim() || '—'
                const desc = String(o.producto_descripcion || '').trim()
                const f = mapa.get(sku) || { sku, descripcion: desc, grupo: grupo(desc), ordenes: 0, cantidad: 0, programado: 0, enProceso: 0, cedi: 0 }
                f.ordenes++; f.cantidad += n(o.cantidad || o.cantidad_programada); f.programado += n(o.programado)
                f.enProceso += enProceso(o); f.cedi += n(o.cedi)
                mapa.set(sku, f)
            }
            setFilas([...mapa.values()].sort((a, b) => b.programado - a.programado || b.cantidad - a.cantidad))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron leer las órdenes de Fibra')
        } finally { setCargando(false) }
    }
    useEffect(() => { cargar() }, [])

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return (filas || []).filter(f => !q || f.sku.toLowerCase().includes(q) || f.descripcion.toLowerCase().includes(q) || f.grupo.toLowerCase().includes(q))
    }, [filas, busqueda])
    const tot = visibles.reduce((a, f) => ({ ordenes: a.ordenes + f.ordenes, cantidad: a.cantidad + f.cantidad, programado: a.programado + f.programado, enProceso: a.enProceso + f.enProceso, cedi: a.cedi + f.cedi }), { ordenes: 0, cantidad: 0, programado: 0, enProceso: 0, cedi: 0 })

    return (
        <div className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar SKU, producto o grupo…"
                        className="w-full h-8 pl-9 pr-3 bg-white border border-[#e2ded5] rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                </div>
                <button onClick={cargar} disabled={cargando} className="h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE] disabled:opacity-50">
                    <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Recargar
                </button>
                <span className="text-xs font-bold text-[#324354] bg-[#324354]/10 px-2 py-1 rounded-lg">{visibles.length} producto(s)</span>
            </div>

            {error && <div className="px-3 py-2 rounded-lg bg-[#d14747]/10 border border-[#d14747]/40 text-[#d14747] text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}

            <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-sm overflow-auto">
                {filas === null ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold"><Loader2 className="animate-spin" size={18} /> Cargando órdenes de Fibra…</div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-[#324354] text-white sticky top-0">
                            <tr className="text-[10px] uppercase">
                                <th className="px-3 py-2 text-left">SKU</th>
                                <th className="px-3 py-2 text-left">Producto</th>
                                <th className="px-3 py-2 text-left">Grupo</th>
                                <th className="px-3 py-2 text-right">OF</th>
                                <th className="px-3 py-2 text-right">Cantidad</th>
                                <th className="px-3 py-2 text-right">Programado</th>
                                <th className="px-3 py-2 text-right">En proceso</th>
                                <th className="px-3 py-2 text-right">CEDI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibles.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">No hay órdenes de Fibra pendientes{busqueda ? ' que coincidan' : ''}</td></tr>
                            ) : visibles.map(f => (
                                <tr key={f.sku} className="hover:bg-slate-50">
                                    <td className="px-3 py-1.5 font-bold text-[#324354] whitespace-nowrap">{f.sku}</td>
                                    <td className="px-3 py-1.5 font-semibold text-slate-700">{f.descripcion || '—'}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{f.grupo}</td>
                                    <td className="px-3 py-1.5 text-right font-bold text-[#324354]">{f.ordenes}</td>
                                    <td className="px-3 py-1.5 text-right">{f.cantidad}</td>
                                    <td className={`px-3 py-1.5 text-right font-black ${f.programado ? 'text-[#7a5f0e]' : 'text-slate-300'}`}>{f.programado}</td>
                                    <td className={`px-3 py-1.5 text-right font-bold ${f.enProceso ? 'text-[#324354]' : 'text-slate-300'}`}>{f.enProceso}</td>
                                    <td className={`px-3 py-1.5 text-right font-bold ${f.cedi ? 'text-[#2f7a40]' : 'text-slate-300'}`}>{f.cedi}</td>
                                </tr>
                            ))}
                        </tbody>
                        {visibles.length > 0 && (
                            <tfoot className="bg-[#F6F3EE] font-black text-[#324354] sticky bottom-0">
                                <tr>
                                    <td className="px-3 py-2" colSpan={3}>Totales ({visibles.length} productos)</td>
                                    <td className="px-3 py-2 text-right">{tot.ordenes}</td>
                                    <td className="px-3 py-2 text-right">{tot.cantidad}</td>
                                    <td className="px-3 py-2 text-right">{tot.programado}</td>
                                    <td className="px-3 py-2 text-right">{tot.enProceso}</td>
                                    <td className="px-3 py-2 text-right">{tot.cedi}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>
        </div>
    )
}
