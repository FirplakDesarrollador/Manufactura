'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { UnidadRtm, cargarOrdenesPorId, cargarUnidadesDesde, diaBogota, hoyBogotaRtm } from '@/lib/superficies/datos'

// Dashboard de Superficies: unidades pulidas, digitadas y recibidas en CEDI por día, reparación, saldo y destrucción,
// y los productos con más unidades en el periodo.
const PERIODOS = [7, 15, 30, 60, 90]

export default function DashboardRtm() {
    const [dias, setDias] = useState(30)
    const [unidades, setUnidades] = useState<UnidadRtm[]>([])
    const [productos, setProductos] = useState<Map<number, { of: string; sku: string | null; descripcion: string | null }>>(new Map())
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const desde = useMemo(() => {
        const d = new Date(`${hoyBogotaRtm()}T00:00:00-05:00`)
        d.setDate(d.getDate() - (dias - 1))
        return d
    }, [dias])

    useEffect(() => {
        let vivo = true
        setCargando(true)
        cargarUnidadesDesde(desde.toISOString())
            .then(async u => {
                const p = await cargarOrdenesPorId([...new Set(u.map(x => x.orden_fabricacion_id))])
                if (vivo) { setUnidades(u); setProductos(p); setError(null) }
            })
            .catch(e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) })
            .finally(() => { if (vivo) setCargando(false) })
        return () => { vivo = false }
    }, [desde])

    const desdeDia = diaBogota(desde.toISOString())
    const enPeriodo = (f: string | null) => { const d = diaBogota(f); return !!d && d >= desdeDia }
    const datos = useMemo(() => {
        const porDia = new Map<string, { dia: string; Pulidas: number; Digitadas: number; CEDI: number; Reparación: number }>()
        const sumar = (f: string | null, campo: 'Pulidas' | 'Digitadas' | 'CEDI' | 'Reparación') => {
            const d = diaBogota(f); if (!d || d < desdeDia) return
            if (!porDia.has(d)) porDia.set(d, { dia: d, Pulidas: 0, Digitadas: 0, CEDI: 0, Reparación: 0 })
            porDia.get(d)![campo] += 1
        }
        unidades.forEach(u => { sumar(u.pulido_fecha, 'Pulidas'); sumar(u.digitado_fecha, 'Digitadas'); sumar(u.cedi_fecha, 'CEDI'); sumar(u.reparacion_fecha, 'Reparación') })
        return [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia)).map(x => ({ ...x, etiqueta: `${Number(x.dia.slice(8))}/${Number(x.dia.slice(5, 7))}` }))
    }, [unidades, desdeDia])

    const kpi = useMemo(() => {
        const pulidas = unidades.filter(u => enPeriodo(u.pulido_fecha)).length
        const rep = unidades.filter(u => enPeriodo(u.reparacion_fecha)).length
        return {
            pulidas, rep,
            digitadas: unidades.filter(u => enPeriodo(u.digitado_fecha)).length,
            cedi: unidades.filter(u => enPeriodo(u.cedi_fecha)).length,
            saldo: unidades.filter(u => enPeriodo(u.saldo_fecha)).length,
            destruccion: unidades.filter(u => enPeriodo(u.destruccion_fecha)).length,
            pctRep: pulidas > 0 ? (rep / pulidas) * 100 : 0
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unidades, desdeDia])

    const topProductos = useMemo(() => {
        const m = new Map<string, { descripcion: string; pulidas: number; cedi: number }>()
        unidades.forEach(u => {
            const p = productos.get(u.orden_fabricacion_id)
            const k = p?.sku || '—'
            if (!m.has(k)) m.set(k, { descripcion: p?.descripcion || k, pulidas: 0, cedi: 0 })
            if (enPeriodo(u.pulido_fecha)) m.get(k)!.pulidas++
            if (enPeriodo(u.cedi_fecha)) m.get(k)!.cedi++
        })
        return [...m.entries()].map(([sku, v]) => ({ sku, ...v })).sort((a, b) => b.pulidas - a.pulidas).slice(0, 15)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unidades, productos, desdeDia])

    const tarjetas = [
        { t: 'Pulidas', v: kpi.pulidas, c: 'bg-white' },
        { t: 'Digitadas', v: kpi.digitadas, c: 'bg-white' },
        { t: 'CEDI', v: kpi.cedi, c: 'bg-emerald-50' },
        { t: 'A reparación', v: kpi.rep, c: 'bg-orange-50' },
        { t: '% Reparación', v: `${kpi.pctRep.toFixed(1)} %`, c: 'bg-orange-50' },
        { t: 'Saldo', v: kpi.saldo, c: 'bg-white' },
        { t: 'Destrucción', v: kpi.destruccion, c: 'bg-rose-50' }
    ]

    return (
        <div className="p-2 sm:p-4 space-y-3">
            <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Superficies (RTM) · Producción</h2>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        {PERIODOS.map(p => (
                            <button key={p} type="button" onClick={() => setDias(p)}
                                className={`h-7 px-2.5 rounded-md text-[11px] font-bold ${dias === p ? 'bg-[#324354] text-white' : 'text-slate-600 hover:text-black'}`}>{p} días</button>
                        ))}
                    </div>
                </div>
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {tarjetas.map(x => (
                        <div key={x.t} className={`px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs ${x.c}`}>
                            <p className="text-[10px] font-black uppercase text-slate-500">{x.t}</p>
                            <p className="text-xl font-black text-[#324354] leading-tight">{cargando ? '…' : x.v}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-2">Unidades por día</h3>
                    <div className="h-[max(220px,calc(100dvh-460px))]">
                        {datos.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400">{cargando ? 'Cargando…' : 'Sin registros en el periodo.'}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datos} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Pulidas" fill="#deb841" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Digitadas" fill="#7B8E90" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="CEDI" fill="#59a96a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Reparación" fill="#e07b39" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 overflow-x-auto">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-2">Productos con más unidades pulidas</h3>
                    <table className="w-full text-[11px]">
                        <thead className="text-slate-500 border-b border-slate-200">
                            <tr><th className="text-left py-1">Producto</th><th className="text-left py-1">SKU</th><th className="text-right py-1">Pulidas</th><th className="text-right py-1">CEDI</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topProductos.map(p => (
                                <tr key={p.sku}><td className="py-1 font-semibold text-[#324354]">{p.descripcion}</td><td className="py-1 font-mono text-slate-500">{p.sku}</td>
                                    <td className="py-1 text-right font-black">{p.pulidas}</td><td className="py-1 text-right font-black text-emerald-700">{p.cedi}</td></tr>
                            ))}
                            {topProductos.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin datos.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
