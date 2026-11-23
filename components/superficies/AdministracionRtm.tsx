'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightLeft, History, Loader2, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoRtm, MovimientoRtm, NOMBRE_ESTADO_RTM, OrdenRtm, cargarMovimientosRtm, cargarOrdenesRtm, disponiblesEn, moverUnidadesRtm } from '@/lib/superficies/datos'
import { BuscadorRtm, IndicadoresRtm, TarjetaOrdenRtm, coincideOrden } from './comunes'

// Administración de Superficies: todas las OF pendientes con sus unidades por proceso, "Mover" para corregir a mano
// (de cualquier proceso a cualquier otro, por cantidad) e historial de todos los registros y movimientos.
const ESTADOS: EstadoRtm[] = ['Programado', 'Pulido', 'Reparacion', 'Transito', 'Cedi', 'Saldo', 'Destruccion']

export default function AdministracionRtm({ usuarioEmail }: { usuarioEmail: string }) {
    const [pestana, setPestana] = useState<'of' | 'historial'>('of')
    const [ordenes, setOrdenes] = useState<OrdenRtm[]>([])
    const [movs, setMovs] = useState<MovimientoRtm[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [recarga, setRecarga] = useState(0)
    const [mover, setMover] = useState<{ orden: OrdenRtm; desde: EstadoRtm; hacia: EstadoRtm; cantidad: string } | null>(null)
    const [moviendo, setMoviendo] = useState(false)
    const [sincronizando, setSincronizando] = useState(false)

    // Trae de SAP las órdenes liberadas (la misma carga de MS y FV; las de familia RTM/RTMM quedan en Superficies)
    const actualizarSap = async () => {
        setSincronizando(true)
        try {
            const res = await fetch('/api/sap/ordenes-liberadas', { cache: 'no-store' })
            const j = await res.json().catch(() => ({}))
            if (!res.ok || j.error) throw new Error(j.message || j.error || `Error ${res.status}`)
            if (j.avisoSuperficies) toast.error(j.avisoSuperficies, { duration: 10000 })
            else toast.success(`SAP: ${j.totalSuperficies ?? 0} orden(es) de Superficies actualizadas${j.totalSuperficiesCerradas ? ` · ${j.totalSuperficiesCerradas} cerrada(s)` : ''}`)
            setRecarga(r => r + 1)
        } catch (e) {
            toast.error(`No se pudo actualizar desde SAP: ${e instanceof Error ? e.message : e}`, { duration: 10000 })
        } finally {
            setSincronizando(false)
        }
    }

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const [o, m] = await Promise.all([cargarOrdenesRtm(), cargarMovimientosRtm(500)])
            setOrdenes(o); setMovs(m); setError(null)
        } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
        finally { setCargando(false) }
    }, [])
    useEffect(() => { void cargar() }, [cargar, recarga])

    const lista = useMemo(() => ordenes.filter(o => coincideOrden(o, busqueda)), [ordenes, busqueda])
    const movsFiltrados = useMemo(() => {
        const t = busqueda.trim().toLowerCase()
        return t ? movs.filter(m => [m.orden_fabricacion, m.usuario_email, m.estado_antes, m.estado_despues].some(v => String(v || '').toLowerCase().includes(t))) : movs
    }, [movs, busqueda])

    const abrirMover = (o: OrdenRtm) => {
        const desde = ESTADOS.find(e => disponiblesEn(o, e) > 0) || 'Programado'
        setMover({ orden: o, desde, hacia: desde === 'Programado' ? 'Pulido' : 'Programado', cantidad: '1' })
    }
    const ejecutarMover = async () => {
        if (!mover) return
        const max = disponiblesEn(mover.orden, mover.desde)
        const n = Math.floor(Number(mover.cantidad))
        if (!(n > 0) || n > max) { toast.error(`La cantidad debe estar entre 1 y ${max}.`); return }
        if (mover.desde === mover.hacia) { toast.error('Elija un proceso de destino distinto.'); return }
        setMoviendo(true)
        try {
            await moverUnidadesRtm(mover.orden, mover.desde, mover.hacia, n, usuarioEmail, 'administracion', `Mover OF (Administración)`)
            toast.success(`OF ${mover.orden.orden_fabricacion}: ${n} unidad(es) de ${NOMBRE_ESTADO_RTM[mover.desde]} a ${NOMBRE_ESTADO_RTM[mover.hacia]}`)
            setMover(null)
            setRecarga(r => r + 1)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setMoviendo(false)
        }
    }

    return (
        <div className="min-h-full flex flex-col bg-slate-50/30">
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 space-y-2">
                <IndicadoresRtm ordenes={ordenes} recarga={recarga} />
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        {([['of', 'Órdenes de fabricación'], ['historial', 'Historial']] as const).map(([k, t]) => (
                            <button key={k} type="button" onClick={() => setPestana(k)}
                                className={`h-8 px-3 rounded-md text-xs font-bold ${pestana === k ? 'bg-[#324354] text-white' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                        ))}
                    </div>
                    <BuscadorRtm valor={busqueda} onCambio={setBusqueda} />
                    <button type="button" onClick={actualizarSap} disabled={sincronizando} title="Traer de SAP las órdenes liberadas de Superficies"
                        className="h-9 px-3 shrink-0 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                        {sincronizando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar SAP
                    </button>
                    <button type="button" onClick={() => setRecarga(r => r + 1)} title="Actualizar"
                        className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-[#324354]">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 space-y-2">
                {error ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>
                ) : pestana === 'of' ? (
                    <>
                        <p className="text-[#324354] text-xs font-black uppercase">Órdenes pendientes: {lista.length}</p>
                        {lista.map(o => (
                            <TarjetaOrdenRtm key={o.id} orden={o} franja={
                                <div className="flex justify-end">
                                    <button type="button" onClick={() => abrirMover(o)}
                                        className="h-9 px-3 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold flex items-center gap-1.5">
                                        <ArrowRightLeft size={15} /> Mover unidades
                                    </button>
                                </div>
                            } />
                        ))}
                        {!cargando && lista.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No hay órdenes de Superficies pendientes.</div>}
                    </>
                ) : (
                    <div className="bg-white rounded-xl border border-[#e2ded5] overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead className="bg-[#324354] text-white text-[10px] uppercase">
                                <tr>{['Fecha', 'Usuario', 'Origen', 'OF', 'Antes', 'Después', 'Cant.', 'Detalle'].map(h => <th key={h} className="px-2 py-2 text-left font-black whitespace-nowrap">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {movsFiltrados.map(m => (
                                    <tr key={m.id} className="hover:bg-[#F6F3EE]">
                                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit' })}</td>
                                        <td className="px-2 py-1.5">{m.usuario_email.split('@')[0]}</td>
                                        <td className="px-2 py-1.5 capitalize">{m.origen}</td>
                                        <td className="px-2 py-1.5 font-mono font-bold text-[#324354]">{m.orden_fabricacion}</td>
                                        <td className="px-2 py-1.5">{NOMBRE_ESTADO_RTM[m.estado_antes as EstadoRtm] || m.estado_antes}</td>
                                        <td className="px-2 py-1.5 font-semibold">{NOMBRE_ESTADO_RTM[m.estado_despues as EstadoRtm] || m.estado_despues}</td>
                                        <td className="px-2 py-1.5 font-black text-right">{m.cantidad}</td>
                                        <td className="px-2 py-1.5 text-slate-500">{typeof m.detalle?.motivo === 'string' ? m.detalle.motivo : '—'}</td>
                                    </tr>
                                ))}
                                {movsFiltrados.length === 0 && <tr><td colSpan={8} className="px-2 py-8 text-center text-slate-500">Sin movimientos.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {mover && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget && !moviendo) setMover(null) }}>
                    <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-[#e2ded5] flex items-start justify-between gap-3">
                            <div>
                                <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Mover unidades</span>
                                <h3 className="text-xl font-black text-[#324354] mt-2">OF {mover.orden.orden_fabricacion}</h3>
                                <p className="text-xs text-slate-600">{mover.orden.producto_descripcion}</p>
                            </div>
                            <button type="button" onClick={() => setMover(null)} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={18} /></button>
                        </div>
                        <div className="p-4 sm:p-5 space-y-3 text-sm">
                            <label className="block">
                                <span className="text-[11px] font-black uppercase text-slate-500">Desde</span>
                                <select value={mover.desde} onChange={e => setMover({ ...mover, desde: e.target.value as EstadoRtm })}
                                    className="mt-1 w-full h-10 px-2 rounded-lg border border-[#e2ded5] font-bold text-[#324354]">
                                    {ESTADOS.map(e => <option key={e} value={e} disabled={disponiblesEn(mover.orden, e) === 0}>{NOMBRE_ESTADO_RTM[e]} ({disponiblesEn(mover.orden, e)})</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[11px] font-black uppercase text-slate-500">Hacia</span>
                                <select value={mover.hacia} onChange={e => setMover({ ...mover, hacia: e.target.value as EstadoRtm })}
                                    className="mt-1 w-full h-10 px-2 rounded-lg border border-[#e2ded5] font-bold text-[#324354]">
                                    {ESTADOS.filter(e => e !== mover.desde).map(e => <option key={e} value={e}>{NOMBRE_ESTADO_RTM[e]}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[11px] font-black uppercase text-slate-500">Cantidad (máx. {disponiblesEn(mover.orden, mover.desde)})</span>
                                <input type="number" min={1} max={disponiblesEn(mover.orden, mover.desde)} value={mover.cantidad}
                                    onChange={e => setMover({ ...mover, cantidad: e.target.value })}
                                    className="mt-1 w-full h-10 px-2 rounded-lg border border-[#e2ded5] font-black text-[#324354]" />
                            </label>
                            {mover.hacia === 'Programado' && <p className="text-[11px] text-amber-700 font-bold">Volver a Programado borra el registro de esas unidades (queda en el historial).</p>}
                        </div>
                        <div className="bg-[#F6F3EE] border-t border-[#e2ded5] px-4 py-3 flex justify-end gap-2">
                            <button type="button" disabled={moviendo} onClick={() => setMover(null)} className="h-9 px-4 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-xs font-bold">Cancelar</button>
                            <button type="button" disabled={moviendo} onClick={ejecutarMover}
                                className="h-9 px-4 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                                {moviendo ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />} Mover
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
