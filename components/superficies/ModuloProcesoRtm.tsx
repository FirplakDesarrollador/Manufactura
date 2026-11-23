'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import EstadoEntregaOf from '@/components/fibra/EstadoEntregaOf'
import { EstadoRtm, NOMBRE_ESTADO_RTM, OrdenRtm, cargarOrdenesRtm, disponiblesEn, moverUnidadesRtm } from '@/lib/superficies/datos'
import { BuscadorRtm, IndicadoresRtm, TarjetaOrdenRtm, coincideOrden } from './comunes'

// Módulo de proceso del Control de Piso Superficies: lista las OF con unidades en el estado de origen y registra por
// cantidad hacia uno de los destinos del proceso (botones). Ej.: Pulido = desde Programado hacia Digitado o Reparación.
export interface AccionProcesoRtm { hacia: EstadoRtm; label: string; clase: string; confirmar?: string }

export default function ModuloProcesoRtm({ titulo, desde, acciones, origen, usuarioEmail, conEntrega = false }: {
    titulo: string; desde: EstadoRtm; acciones: AccionProcesoRtm[]; origen: string; usuarioEmail: string; conEntrega?: boolean
}) {
    const [ordenes, setOrdenes] = useState<OrdenRtm[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [cantidades, setCantidades] = useState<Record<number, string>>({})
    const [guardando, setGuardando] = useState<number | null>(null)
    const [recarga, setRecarga] = useState(0)

    const cargar = useCallback(async () => {
        setCargando(true)
        try { setOrdenes(await cargarOrdenesRtm()); setError(null) }
        catch (e) { setError(e instanceof Error ? e.message : String(e)) }
        finally { setCargando(false) }
    }, [])
    useEffect(() => { void cargar() }, [cargar, recarga])

    const lista = useMemo(() => ordenes.filter(o => disponiblesEn(o, desde) > 0 && coincideOrden(o, busqueda)), [ordenes, desde, busqueda])
    const totalUnidades = lista.reduce((a, o) => a + disponiblesEn(o, desde), 0)

    const registrar = async (o: OrdenRtm, a: AccionProcesoRtm) => {
        const max = disponiblesEn(o, desde)
        const n = Math.floor(Number(cantidades[o.id] || 1))
        if (!(n > 0) || n > max) { toast.error(`La cantidad debe estar entre 1 y ${max}.`); return }
        if (a.confirmar && !confirm(`${a.confirmar}\n\nOF ${o.orden_fabricacion}: ${n} unidad(es).`)) return
        setGuardando(o.id)
        try {
            await moverUnidadesRtm(o, desde, a.hacia, n, usuarioEmail, origen)
            toast.success(`OF ${o.orden_fabricacion}: ${n} unidad(es) a ${NOMBRE_ESTADO_RTM[a.hacia]}`)
            setCantidades(c => ({ ...c, [o.id]: '' }))
            setRecarga(r => r + 1)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setGuardando(null)
        }
    }

    return (
        <div className="min-h-full flex flex-col bg-slate-50/30">
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 space-y-2">
                <IndicadoresRtm ordenes={ordenes} recarga={recarga} />
                <div className="flex items-center gap-2">
                    <BuscadorRtm valor={busqueda} onCambio={setBusqueda} />
                    <button type="button" onClick={() => setRecarga(r => r + 1)} title="Actualizar"
                        className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-[#324354]">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>
            <div className="flex-1 p-2 sm:p-4 space-y-2">
                <p className="text-[#324354] text-xs font-black uppercase">{titulo}: {lista.length} OF · {totalUnidades} unidad(es)</p>
                {error ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>
                ) : cargando && !ordenes.length ? (
                    <div className="text-center py-10 text-slate-500 text-sm">Cargando órdenes…</div>
                ) : lista.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">{busqueda ? 'Ninguna orden coincide con la búsqueda.' : `No hay unidades en ${NOMBRE_ESTADO_RTM[desde]}.`}</div>
                ) : lista.map(o => {
                    const max = disponiblesEn(o, desde)
                    return (
                        <TarjetaOrdenRtm key={o.id} orden={o} resaltar={desde} franja={
                            <div className="flex flex-wrap items-center gap-2">
                                {conEntrega && <EstadoEntregaOf of={o.orden_fabricacion} />}
                                <div className="ml-auto flex flex-wrap items-center gap-2">
                                    <label className="flex items-center gap-1.5 text-[11px] font-black text-[#324354] uppercase">
                                        Cantidad
                                        <input type="number" min={1} max={max} value={cantidades[o.id] ?? ''} placeholder="1"
                                            onChange={e => setCantidades(c => ({ ...c, [o.id]: e.target.value }))}
                                            className="h-9 w-20 px-2 rounded-lg border border-[#e2ded5] bg-white text-sm font-black text-[#324354] text-center outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                                        <span className="text-slate-500 normal-case font-bold">de {max}</span>
                                    </label>
                                    {max > 1 && (
                                        <button type="button" onClick={() => setCantidades(c => ({ ...c, [o.id]: String(max) }))}
                                            className="h-9 px-2.5 rounded-lg border border-[#e2ded5] bg-white text-[11px] font-bold text-[#324354] hover:bg-slate-50">Todas</button>
                                    )}
                                    {acciones.map(a => (
                                        <button key={a.hacia} type="button" disabled={guardando === o.id} onClick={() => registrar(o, a)}
                                            className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 ${a.clase}`}>
                                            {guardando === o.id && <Loader2 size={14} className="animate-spin" />}
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        } />
                    )
                })}
            </div>
        </div>
    )
}
