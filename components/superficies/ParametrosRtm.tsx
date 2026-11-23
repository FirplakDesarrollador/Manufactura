'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenRtm, cargarOrdenesRtm, cargarParametrosRtm, guardarParametroRtm } from '@/lib/superficies/datos'
import { BuscadorRtm } from './comunes'

// Parámetros de Superficies: kilos por unidad de cada producto (para "Kg hoy" de los indicadores).
// Lista los productos de las órdenes pendientes y los que ya tienen parámetro.
export default function ParametrosRtm({ usuarioEmail }: { usuarioEmail: string }) {
    const [ordenes, setOrdenes] = useState<OrdenRtm[]>([])
    const [kg, setKg] = useState<Map<string, number | null>>(new Map())
    const [edit, setEdit] = useState<Record<string, string>>({})
    const [guardando, setGuardando] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([cargarOrdenesRtm(), cargarParametrosRtm()])
            .then(([o, k]) => { setOrdenes(o); setKg(k) })
            .catch(e => setError(e instanceof Error ? e.message : String(e)))
    }, [])

    const productos = useMemo(() => {
        const m = new Map<string, string>()
        ordenes.forEach(o => { if (o.producto_sku) m.set(o.producto_sku, o.producto_descripcion || '') })
        kg.forEach((_, sku) => { if (!m.has(sku)) m.set(sku, '') })
        const t = busqueda.trim().toLowerCase()
        return [...m.entries()].map(([sku, descripcion]) => ({ sku, descripcion }))
            .filter(p => !t || p.sku.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t))
            .sort((a, b) => a.sku.localeCompare(b.sku))
    }, [ordenes, kg, busqueda])

    const guardar = async (sku: string) => {
        const txt = (edit[sku] ?? '').trim().replace(',', '.')
        const v = txt === '' ? null : Number(txt)
        if (v != null && (isNaN(v) || v < 0)) { toast.error('Escriba un número válido de kilos.'); return }
        setGuardando(sku)
        try {
            await guardarParametroRtm(sku, v, usuarioEmail)
            setKg(prev => new Map(prev).set(sku, v))
            setEdit(e => { const n = { ...e }; delete n[sku]; return n })
            toast.success(`Parámetro guardado: ${sku}`)
        } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
        finally { setGuardando(null) }
    }

    return (
        <div className="p-2 sm:p-4 space-y-3">
            <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Parámetros de productos (kg por unidad)</h2>
                    <div className="w-full sm:w-80"><BuscadorRtm valor={busqueda} onCambio={setBusqueda} placeholder="SKU o producto…" /></div>
                </div>
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[#324354] text-white text-[10px] uppercase">
                            <tr><th className="px-2 py-2 text-left">SKU</th><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-right">Kg por unidad</th><th className="px-2 py-2" /></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {productos.map(p => {
                                const actual = kg.get(p.sku)
                                const valor = edit[p.sku] ?? (actual == null ? '' : String(actual))
                                const cambiado = edit[p.sku] !== undefined
                                return (
                                    <tr key={p.sku} className="hover:bg-[#F6F3EE]">
                                        <td className="px-2 py-1.5 font-mono text-slate-600">{p.sku}</td>
                                        <td className="px-2 py-1.5 font-semibold text-[#324354]">{p.descripcion || '—'}</td>
                                        <td className="px-2 py-1.5 text-right">
                                            <input value={valor} onChange={e => setEdit(x => ({ ...x, [p.sku]: e.target.value }))} placeholder="—"
                                                className={`h-8 w-24 px-2 rounded-lg border text-right font-bold ${cambiado ? 'border-amber-400 bg-amber-50' : 'border-[#e2ded5]'}`} />
                                        </td>
                                        <td className="px-2 py-1.5 text-right">
                                            {cambiado && (
                                                <button type="button" disabled={guardando === p.sku} onClick={() => guardar(p.sku)}
                                                    className="h-8 px-2.5 rounded-lg bg-[#324354] text-white text-[11px] font-bold inline-flex items-center gap-1">
                                                    {guardando === p.sku ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {productos.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin productos.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
