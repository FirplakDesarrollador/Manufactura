'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowDown, RefreshCw } from 'lucide-react'
import { EstadoRtm, NOMBRE_ESTADO_RTM, OrdenRtm, cargarOrdenesRtm, disponiblesEn } from '@/lib/superficies/datos'

// Mapa de procesos de Superficies: esquema sencillo del flujo con las unidades y las OF en cada proceso.
// Programado (sin pulir) → Pulido · por digitar → Tránsito (digitado) → CEDI; Reparación debajo de Pulido
// (vuelve a Digitado o va a Saldo / Destrucción). Clic en un proceso: sus órdenes.
const PRINCIPAL: EstadoRtm[] = ['Programado', 'Pulido', 'Transito', 'Cedi']
const COLOR: Record<EstadoRtm, string> = {
    Programado: 'bg-slate-100 border-slate-300 text-slate-800', Pulido: 'bg-[#deb841]/20 border-[#deb841] text-[#7a5f0e]',
    Reparacion: 'bg-orange-50 border-orange-300 text-orange-800', Transito: 'bg-[#7B8E90]/15 border-[#7B8E90] text-[#324354]',
    Cedi: 'bg-emerald-50 border-emerald-300 text-emerald-800', Saldo: 'bg-sky-50 border-sky-300 text-sky-800', Destruccion: 'bg-rose-50 border-rose-300 text-rose-800'
}

export default function MapaProcesosRtm() {
    const [ordenes, setOrdenes] = useState<OrdenRtm[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sel, setSel] = useState<EstadoRtm | null>(null)
    const [recarga, setRecarga] = useState(0)

    useEffect(() => {
        setCargando(true)
        cargarOrdenesRtm().then(o => { setOrdenes(o); setError(null) }).catch(e => setError(e instanceof Error ? e.message : String(e))).finally(() => setCargando(false))
    }, [recarga])

    const tot = useMemo(() => {
        const t = {} as Record<EstadoRtm, { u: number; of: number }>
        ;(['Programado', 'Pulido', 'Reparacion', 'Transito', 'Cedi', 'Saldo', 'Destruccion'] as EstadoRtm[]).forEach(e => {
            const con = ordenes.filter(o => disponiblesEn(o, e) > 0)
            t[e] = { u: con.reduce((a, o) => a + disponiblesEn(o, e), 0), of: con.length }
        })
        return t
    }, [ordenes])

    const Caja = ({ e, chica }: { e: EstadoRtm; chica?: boolean }) => (
        <button type="button" onClick={() => setSel(sel === e ? null : e)}
            className={`rounded-2xl border-2 text-center transition-all ${chica ? 'px-3 py-2 min-w-[120px]' : 'px-4 py-4 min-w-[150px] flex-1'} ${COLOR[e]} ${sel === e ? 'ring-4 ring-[#324354]/30 scale-[1.02]' : 'hover:scale-[1.02]'}`}>
            <p className={`font-black uppercase leading-tight ${chica ? 'text-[10px]' : 'text-[11px]'}`}>{NOMBRE_ESTADO_RTM[e]}</p>
            <p className={`font-black leading-none mt-1 ${chica ? 'text-xl' : 'text-3xl'}`}>{tot[e]?.u ?? 0}</p>
            <p className="text-[10px] font-bold opacity-70 mt-0.5">{tot[e]?.of ?? 0} OF</p>
        </button>
    )

    const ofsSel = sel ? ordenes.filter(o => disponiblesEn(o, sel) > 0) : []

    return (
        <div className="p-2 sm:p-4 space-y-3">
            <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Mapa de procesos · Superficies (RTM)</h2>
                    <button type="button" onClick={() => setRecarga(r => r + 1)} title="Actualizar" className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-[#324354] hover:bg-slate-50">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}

                {/* Flujo principal */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    {PRINCIPAL.map((e, i) => (
                        <React.Fragment key={e}>
                            <Caja e={e} />
                            {i < PRINCIPAL.length - 1 && <ArrowRight className="hidden md:block shrink-0 text-[#7B8E90]" size={26} />}
                            {i < PRINCIPAL.length - 1 && <ArrowDown className="md:hidden self-center text-[#7B8E90]" size={22} />}
                        </React.Fragment>
                    ))}
                </div>
                {/* Reparación (desde Pulido) y sus salidas */}
                <div className="flex flex-wrap items-center gap-3 md:pl-[calc(25%-20px)]">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ArrowDown size={16} /> desde Pulido</span>
                    <Caja e="Reparacion" chica />
                    <ArrowRight className="text-[#7B8E90]" size={18} />
                    <Caja e="Saldo" chica />
                    <Caja e="Destruccion" chica />
                    <span className="text-[10px] text-slate-500">(reparada vuelve a Pulido · por digitar)</span>
                </div>
            </section>

            {sel && (
                <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5]">
                    <h3 className="text-sm font-black text-[#324354] mb-2">{NOMBRE_ESTADO_RTM[sel]} · {ofsSel.length} OF</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#324354] text-white text-[10px] uppercase">
                                <tr><th className="px-2 py-1.5 text-left">OF</th><th className="px-2 py-1.5 text-left">Producto</th><th className="px-2 py-1.5 text-left">Cliente</th><th className="px-2 py-1.5 text-right">Unidades</th><th className="px-2 py-1.5 text-right">Cantidad OF</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ofsSel.map(o => (
                                    <tr key={o.id}><td className="px-2 py-1 font-mono font-bold text-[#324354]">{o.orden_fabricacion}</td><td className="px-2 py-1">{o.producto_descripcion}</td>
                                        <td className="px-2 py-1 text-slate-500">{o.cliente}</td><td className="px-2 py-1 text-right font-black">{disponiblesEn(o, sel)}</td><td className="px-2 py-1 text-right">{o.cantidad}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    )
}
