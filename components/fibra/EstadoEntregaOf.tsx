'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, Loader2, PackageSearch, RefreshCw, X } from 'lucide-react'
import { proximaActualizacion, revisarEntrega, useRevisionEntrega, type ComponenteEntrega, type ResultadoEntrega } from '@/lib/fibra/revisionEntrega'

// Aviso de la tarjeta (Digitado y Tránsito): "Analizando componentes para la entrega…" mientras se revisa en SAP, en
// segundo plano, que la bodega (MP-03) tenga lo que falta por descontar de cada componente de la OF (todo menos mano
// de obra); luego "OK" o lo que falta. Al tocarlo abre el análisis componente por componente.
// Nunca muestra OK sin revisión: sin dato o con error, lo dice.
// `desde` se conserva por compatibilidad (la revisión ya no depende de la fecha de llegada).
export default function EstadoEntregaOf({ of }: { of: string | number | null | undefined; desde?: string | null }) {
    const estado = useRevisionEntrega(of)
    const [abierto, setAbierto] = useState(false)
    const caja = 'flex items-center gap-2 min-w-0'
    const titulo = <p className="text-[10px] text-[#7B8E90] uppercase font-black leading-none">Componentes entrega</p>
    const otraVez = (clase: string) => (
        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); revisarEntrega(of) }} className={clase} title="Volver a revisar"><RefreshCw size={11} /></span>
    )

    if (!estado || estado.fase === 'analizando') {
        return (
            <div className={caja} title="Revisando en SAP que la bodega tenga todo lo que se descuenta al entregar la OF">
                <Loader2 size={16} className="text-sky-600 animate-spin shrink-0" />
                <div>{titulo}<p className="text-xs font-bold text-sky-700 leading-tight mt-0.5">Analizando componentes para la entrega…</p></div>
            </div>
        )
    }

    if (estado.fase === 'error') {
        return (
            <div className={caja} title={estado.mensaje}>
                <AlertTriangle size={16} className="text-slate-500 shrink-0" />
                <div>{titulo}<p className="text-xs font-bold text-slate-600 leading-tight mt-0.5 flex items-center gap-1.5">No se pudo revisar {otraVez('text-[#324354] hover:text-sky-700 cursor-pointer')}</p></div>
            </div>
        )
    }

    const r = estado.resultado
    const vista = VISTA[r.estado]
    const { Icono } = vista
    const fechaRev = new Date(r.calculado_at)
    const revisado = fechaRev.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    const revisadoCorto = fechaRev.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' })
    return (
        <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={e => { e.stopPropagation(); setAbierto(true) }} title="Ver el análisis de componentes"
                className={`${caja} text-left rounded-lg px-2 py-1 -ml-2 -my-1 hover:bg-white hover:shadow-sm transition-colors`}>
                <Icono size={16} className={`${vista.color} shrink-0`} />
                <div className="min-w-0">
                    {titulo}
                    {/* Un solo renglón: estado, conteo y hora de la revisión */}
                    <p className={`text-xs font-black leading-tight mt-0.5 flex items-center gap-1.5 whitespace-nowrap ${vista.color}`}>
                        {vista.texto(r)}
                        <span className="text-[10px] font-semibold text-slate-500">{r.cubiertos}/{r.exigidos}</span>
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"
                            title={estado.errorActualizar
                                ? `No se pudo actualizar (${estado.errorActualizar}); se muestra la revisión del ${revisado}`
                                : `Revisado ${revisado}. Se actualiza sola cada hora en punto (próxima: ${proximaActualizacion()})`}>
                            · {revisadoCorto}
                            {estado.actualizando && <Loader2 size={10} className="animate-spin text-sky-700" />}
                            {estado.errorActualizar && <AlertTriangle size={10} className="text-amber-600" />}
                        </span>
                    </p>
                </div>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); revisarEntrega(of) }} disabled={estado.actualizando} title="Actualizar: consultar SAP de nuevo" aria-label="Actualizar"
                className="h-7 w-7 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] flex items-center justify-center shrink-0 disabled:opacity-50">
                <RefreshCw size={13} className={estado.actualizando ? 'animate-spin' : ''} />
            </button>
            {abierto && createPortal(<AnalisisEntrega of={String(of)} r={r} onClose={() => setAbierto(false)} />, document.body)}
        </div>
    )
}

const VISTA: Record<ResultadoEntrega['estado'], { Icono: React.ElementType; color: string; texto: (r: ResultadoEntrega) => string }> = {
    completo: { Icono: CheckCircle2, color: 'text-[#2f7a40]', texto: () => 'OK' },
    faltante: { Icono: AlertTriangle, color: 'text-[#d14747]', texto: r => `Falta(n) ${r.faltantes} componente(s)` },
    sin_dato: { Icono: HelpCircle, color: 'text-slate-600', texto: r => `Sin dato de ${r.sin_dato} componente(s)` },
}
const ESTADO_FILA: Record<ComponenteEntrega['estado'], { label: string; chip: string; orden: number }> = {
    faltante: { label: 'Falta', chip: 'bg-[#d14747] text-white', orden: 0 },
    sin_dato: { label: 'Sin dato', chip: 'bg-slate-500 text-white', orden: 1 },
    ok: { label: 'Cubierto', chip: 'bg-[#59a96a] text-white', orden: 2 },
    consumido: { label: 'Ya descontado', chip: 'bg-slate-200 text-slate-600', orden: 3 },
}
const num = (v: number | null) => v === null ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 })

// Ventana con el análisis: resumen arriba y la tabla con lo que falta primero (estándar de ventanas Firplak)
function AnalisisEntrega({ of, r, onClose }: { of: string; r: ResultadoEntrega; onClose: () => void }) {
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [onClose])
    const vista = VISTA[r.estado]
    const filas = [...r.detalle].sort((a, b) => ESTADO_FILA[a.estado].orden - ESTADO_FILA[b.estado].orden || a.descripcion.localeCompare(b.descripcion))
    const faltan = r.detalle.filter(d => d.estado === 'faltante')
    const hora = new Date(r.calculado_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' })

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Componentes para la entrega</span>
                        <h2 className="text-xl font-black text-[#324354] mt-2">OF {of}</h2>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Revisado {hora}. Se compara lo que falta por descontar de cada componente (requerido − ya consumido en SAP) contra la existencia de su bodega. No incluye mano de obra.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => revisarEntrega(of)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-xs font-bold" title="Consultar SAP de nuevo">
                            <RefreshCw size={14} /> Volver a revisar
                        </button>
                        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Cerrar"><X size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className={`rounded-xl border px-3 py-1.5 ${r.estado === 'completo' ? 'bg-[#59a96a]/15 border-[#59a96a]/50' : r.estado === 'faltante' ? 'bg-[#d14747]/10 border-[#d14747]/40' : 'bg-slate-100 border-slate-300'}`}>
                        <div className="text-[10px] font-black uppercase text-slate-500">Resultado</div>
                        <div className={`text-base font-black ${vista.color}`}>{vista.texto(r)}</div>
                    </div>
                    {[['Componentes revisados', r.exigidos], ['Cubiertos', r.cubiertos], ['Faltan', r.faltantes + (r.sin_dato ? ` · ${r.sin_dato} sin dato` : '')]].map(([l, v]) => (
                        <div key={l as string} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                            <div className="text-[10px] font-black uppercase text-slate-500">{l}</div>
                            <div className="text-base font-black text-[#324354]">{v}</div>
                        </div>
                    ))}
                </div>

                {faltan.length > 0 && (
                    <div className="rounded-xl border border-[#d14747]/40 bg-[#d14747]/5 px-3 py-2 text-xs">
                        <div className="font-black text-[#d14747] uppercase text-[10px] mb-1 flex items-center gap-1"><PackageSearch size={13} /> Qué falta exactamente</div>
                        <ul className="space-y-0.5">
                            {faltan.map(d => (
                                <li key={`${d.item}|${d.bodega}`} className="font-semibold text-slate-700">
                                    <span className="font-black">{d.descripcion}</span> <span className="text-slate-400">({d.item})</span>: se necesitan <b>{num(d.pendiente)}</b>, hay <b>{num(d.existencia)}</b> en {d.bodega} → faltan <b className="text-[#d14747]">{num(Math.max(0, d.pendiente - (d.existencia ?? 0)))}</b>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#324354] text-white">
                            <tr className="text-[10px] uppercase">
                                <th className="px-2 py-2 text-left">Estado</th>
                                <th className="px-2 py-2 text-left">Artículo</th>
                                <th className="px-2 py-2 text-left">Descripción</th>
                                <th className="px-2 py-2 text-center">Bodega</th>
                                <th className="px-2 py-2 text-right">Requerido</th>
                                <th className="px-2 py-2 text-right">Consumido</th>
                                <th className="px-2 py-2 text-right">Por descontar</th>
                                <th className="px-2 py-2 text-right">Existencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filas.map(d => (
                                <tr key={`${d.item}|${d.bodega}`} className={d.estado === 'faltante' ? 'bg-[#d14747]/5' : ''}>
                                    <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${ESTADO_FILA[d.estado].chip}`}>{ESTADO_FILA[d.estado].label}</span></td>
                                    <td className="px-2 py-1.5 font-semibold text-slate-600 whitespace-nowrap">{d.item}</td>
                                    <td className="px-2 py-1.5 font-bold text-[#324354]">{d.descripcion}</td>
                                    <td className="px-2 py-1.5 text-center text-slate-600">{d.bodega || '—'}</td>
                                    <td className="px-2 py-1.5 text-right">{num(d.requerido)}</td>
                                    <td className="px-2 py-1.5 text-right">{num(d.consumido)}</td>
                                    <td className="px-2 py-1.5 text-right font-black">{num(d.pendiente)}</td>
                                    <td className={`px-2 py-1.5 text-right font-black ${d.estado === 'faltante' ? 'text-[#d14747]' : 'text-[#324354]'}`}>{d.existencia === null ? 'Sin dato' : num(d.existencia)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">La existencia es la de toda la bodega en SAP: la comparten las demás OF que usan el mismo componente.</p>
            </div>
        </div>
    )
}
