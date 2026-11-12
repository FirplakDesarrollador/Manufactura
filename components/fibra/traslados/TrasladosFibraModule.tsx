'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, ChevronDown, ChevronUp, FileText, Loader2, Plus, RefreshCw, Search, Settings2, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'

// Módulo Traslados (FV): cada OF liberada pendiente con su traslado comparado contra la lista de materiales.
// Se exigen solo los Accesorios y Equipos que no son consumibles de uso común. La revisión la hace
// /api/sap/traslados-fv (automática lunes a viernes 5 a. m., 12 m. y 5 p. m., o con "Revisar ahora").

type EstadoOf = 'completo' | 'solicitado' | 'faltante' | 'sin_traslado' | 'error'
type Fila = {
    item: string; descripcion: string; requerido: number; solicitado: number; trasladado: number; pendiente: number
    estado: 'entregado' | 'solicitado' | 'faltante' | 'no_exigido'; motivo?: string
    grupo?: 'acc' | 'mp' | 'mo'; porDefecto?: boolean; ajuste?: boolean
    sustituto?: { item: string; descripcion: string; cantidad: number }
}
type Documento = { tipo: 'Solicitud' | 'Traslado'; docNum: number; fecha: string; desde: string; hacia: string; estado: string; solicitudBase: number | null; articulos: number }
type Revision = {
    orden_fabricacion: string; estado: EstadoOf; producto_sku: string | null; producto_descripcion: string | null; cantidad: number | null
    exigidos: number; entregados: number; solicitados_pendientes: number; faltantes: number; sustitutos: number
    documentos: Documento[]; detalle: Fila[]; extras: { item: string; descripcion: string; cantidad: number; asignado: boolean }[]
    error: string | null; calculado_at: string
}

const ESTADOS: Record<EstadoOf, { label: string; color: string; punto: string; orden: number }> = {
    sin_traslado: { label: 'Sin traslado', color: 'bg-[#d14747]/10 text-[#d14747] border-[#d14747]/40', punto: 'bg-[#d14747]', orden: 0 },
    faltante: { label: 'Con faltantes', color: 'bg-[#d14747]/10 text-[#d14747] border-[#d14747]/40', punto: 'bg-[#d14747]', orden: 1 },
    solicitado: { label: 'Solicitado sin trasladar', color: 'bg-[#deb841]/20 text-[#7a5f0e] border-[#deb841]', punto: 'bg-[#deb841]', orden: 2 },
    error: { label: 'Error SAP', color: 'bg-slate-100 text-slate-600 border-slate-300', punto: 'bg-slate-400', orden: 3 },
    completo: { label: 'Completo', color: 'bg-[#59a96a]/15 text-[#2f7a40] border-[#59a96a]/50', punto: 'bg-[#59a96a]', orden: 4 },
}
const ESTADO_FILA: Record<Fila['estado'], { label: string; color: string }> = {
    faltante: { label: 'Falta', color: 'bg-[#d14747] text-white' },
    solicitado: { label: 'Solicitado', color: 'bg-[#deb841] text-[#25323f]' },
    entregado: { label: 'Entregado', color: 'bg-[#59a96a] text-white' },
    no_exigido: { label: 'No se exige', color: 'bg-slate-200 text-slate-600' },
}
const num = (n: number) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 3 })
const ORDEN_FILA = { faltante: 0, solicitado: 1, entregado: 2, no_exigido: 3 }

export default function TrasladosFibraModule() {
    const [datos, setDatos] = useState<Revision[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [revisando, setRevisando] = useState<string | null>(null)   // 'todas' o el Nº de OF
    const [aviso, setAviso] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState<EstadoOf | ''>('')
    const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
    const [detalleOf, setDetalleOf] = useState<string | null>(null)
    const [verConsumibles, setVerConsumibles] = useState(false)

    const cargar = useCallback(async () => {
        const { data, error: e } = await supabase.from('traslados_of_fv').select('*')
        if (e) {
            setError(/traslados_of_fv|relation|schema cache/i.test(e.message) ? 'Falta crear las tablas del módulo Traslados: ejecute traslados_fv.sql en Supabase.' : e.message)
            setDatos([]); return
        }
        setError(null)
        setDatos((data || []) as Revision[])
    }, [])
    useEffect(() => { cargar() }, [cargar])

    const revisar = async (of?: string) => {
        setRevisando(of || 'todas'); setAviso(null)
        try {
            const r = await fetch(`/api/sap/traslados-fv${of ? `?of=${of}` : ''}`, { cache: 'no-store' })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
            if (!of) setAviso(`Revisadas ${d.revisadas} OF en ${d.segundos} s.`)
            await cargar()
        } catch (e) {
            setAviso(`No se pudo revisar: ${e instanceof Error ? e.message : 'error'}`)
        } finally { setRevisando(null) }
    }

    const ultima = useMemo(() => (datos || []).reduce((m, d) => d.calculado_at > m ? d.calculado_at : m, ''), [datos])
    const cuenta = (e: EstadoOf) => (datos || []).filter(d => d.estado === e).length
    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        return (datos || [])
            .filter(d => !filtro || d.estado === filtro)
            .filter(d => !q || d.orden_fabricacion.includes(q) || (d.producto_descripcion || '').toLowerCase().includes(q) || (d.producto_sku || '').toLowerCase().includes(q)
                || d.detalle.some(f => f.estado === 'faltante' && (f.item.toLowerCase().includes(q) || f.descripcion.toLowerCase().includes(q))))
            .sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden || b.faltantes - a.faltantes || a.orden_fabricacion.localeCompare(b.orden_fabricacion))
    }, [datos, busqueda, filtro])
    const alternar = (of: string) => setAbiertas(p => { const n = new Set(p); if (n.has(of)) n.delete(of); else n.add(of); return n })

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Indicadores: clic filtra por estado */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200">
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar">
                    {([['', 'OF revisadas', (datos || []).length, 'bg-[#324354]/10 text-[#324354]'],
                        ['completo', 'Completas', cuenta('completo'), 'bg-[#59a96a]/15 text-[#2f7a40]'],
                        ['solicitado', 'Solicitado sin trasladar', cuenta('solicitado'), 'bg-[#deb841]/20 text-[#7a5f0e]'],
                        ['faltante', 'Con faltantes', cuenta('faltante'), 'bg-[#d14747]/10 text-[#d14747]'],
                        ['sin_traslado', 'Sin traslado', cuenta('sin_traslado'), 'bg-[#d14747]/10 text-[#d14747]'],
                        ...(cuenta('error') ? [['error', 'Error SAP', cuenta('error'), 'bg-slate-100 text-slate-600']] : [])] as [EstadoOf | '', string, number, string][]).map(([id, label, valor, color]) => (
                        <button key={label} onClick={() => setFiltro(id)}
                            className={`flex-1 min-w-[96px] px-1.5 py-1.5 rounded-lg border shadow-sm flex flex-col items-center justify-center ${color} ${filtro === id ? 'border-[#324354] ring-2 ring-[#324354]/30' : 'border-[#e2ded5]'}`}>
                            <span className="text-[9px] font-black uppercase opacity-70 leading-tight whitespace-nowrap">{label}</span>
                            <span className="text-sm font-black tracking-tight">{valor}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Controles */}
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-2 sm:gap-3">
                    <div className="basis-full md:basis-0 flex-1 min-w-0 md:min-w-[300px]">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Búsqueda</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="OF / Producto / SKU / Artículo faltante"
                                className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold pb-1.5" title="Revisión automática: lunes a viernes 5:00 a. m., 12:00 m. y 5:00 p. m.">
                        {ultima ? `Última revisión: ${new Date(ultima).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' })}` : 'Sin revisiones'}
                    </div>
                    <button onClick={() => setVerConsumibles(true)} title="Qué artículos se exigen en el traslado de cada OF (Sí / No por artículo)"
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-[11px] font-bold">
                        <Settings2 size={15} /> <span className="hidden sm:inline">Parámetros a revisar</span>
                    </button>
                    <button onClick={() => revisar()} disabled={!!revisando}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#324354] text-white rounded-lg hover:bg-[#254153] transition-colors shadow-sm disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider h-8"
                        title="Comparar ahora todas las OF contra SAP (puede tardar unos minutos)">
                        <RefreshCw size={15} className={revisando === 'todas' ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{revisando === 'todas' ? 'Revisando…' : 'Revisar ahora'}</span>
                    </button>
                </div>
                {aviso && <div className="max-w-7xl mx-auto mt-1.5 text-[11px] font-bold text-[#324354]">{aviso}</div>}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                <div className="max-w-7xl mx-auto space-y-2">
                    <p className="text-[11px] text-slate-500">
                        Se exigen los <b>Accesorios y Equipos</b> de la lista de materiales, sin materias primas pesadas, mano de obra ni consumibles de uso común.
                        Los traslados se identifican por el número de la OF en el comentario del documento en SAP.
                    </p>
                    {error ? (
                        <div className="px-4 py-6 bg-red-50 border border-red-400 text-red-800 text-sm font-bold rounded-xl flex items-center gap-2" role="alert">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" /> {error}
                        </div>
                    ) : !datos ? (
                        <div className="py-16 flex items-center justify-center gap-2 text-slate-500 font-bold text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Cargando…</div>
                    ) : datos.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold italic bg-white rounded-xl border border-[#e2ded5]">
                            Aún no hay revisiones. Oprima "Revisar ahora" o espere la revisión automática.
                        </div>
                    ) : visibles.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold italic bg-white rounded-xl border border-[#e2ded5]">Ninguna OF coincide con el filtro</div>
                    ) : visibles.map(d => {
                        const est = ESTADOS[d.estado]
                        const abierta = abiertas.has(d.orden_fabricacion)
                        const exigidas = d.detalle.filter(f => f.estado !== 'no_exigido').sort((a, b) => ORDEN_FILA[a.estado] - ORDEN_FILA[b.estado] || a.descripcion.localeCompare(b.descripcion))
                        const noExigidas = d.detalle.filter(f => f.estado === 'no_exigido')
                        const extras = d.extras.filter(x => !x.asignado)
                        return (
                            <section key={d.orden_fabricacion} className="bg-white rounded-xl border border-[#e2ded5] shadow-sm">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                                    <span className={`w-3 h-3 rounded-full shrink-0 ${est.punto}`} />
                                    <button onClick={() => setDetalleOf(d.orden_fabricacion)} className="text-sm font-black text-[#324354] hover:underline flex items-center gap-1" title="Detalle de la orden en SAP">
                                        OF {d.orden_fabricacion} <FileText size={13} className="text-[#7B8E90]" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-black text-[#324354] uppercase truncate">{d.producto_descripcion || '—'}</div>
                                        <div className="text-[10px] font-semibold text-[#7B8E90]">SKU: {d.producto_sku || '—'}</div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${est.color}`}>{est.label}</span>
                                    {d.estado !== 'error' && <>
                                        <span className="text-xs font-bold text-slate-600" title="Artículos exigidos entregados">{d.entregados}/{d.exigidos} entregados</span>
                                        {d.faltantes > 0 && <span className="text-xs font-black text-[#d14747]">{d.faltantes} falta(n)</span>}
                                        {d.solicitados_pendientes > 0 && <span className="text-xs font-black text-[#b8962c]">{d.solicitados_pendientes} solicitado(s)</span>}
                                        {d.sustitutos > 0 && <span className="text-xs font-black text-[#7a5f0e]" title="Se trasladó otro artículo en su lugar">{d.sustitutos} sustituto(s)</span>}
                                    </>}
                                    <span className="text-[10px] font-semibold text-slate-500">
                                        {d.documentos.length ? d.documentos.map(x => `${x.tipo === 'Solicitud' ? 'Sol.' : 'Tras.'} ${x.docNum}`).join(' · ') : 'Sin documentos'}
                                    </span>
                                    <button onClick={() => revisar(d.orden_fabricacion)} disabled={!!revisando} title="Revisar solo esta OF contra SAP"
                                        className="p-1.5 rounded-lg text-[#7B8E90] hover:text-[#324354] hover:bg-[#F6F3EE] disabled:opacity-40">
                                        <RefreshCw size={15} className={revisando === d.orden_fabricacion ? 'animate-spin' : ''} />
                                    </button>
                                    <button onClick={() => alternar(d.orden_fabricacion)} className="p-1.5 rounded-lg text-[#7B8E90] hover:text-[#324354] hover:bg-[#F6F3EE]" title={abierta ? 'Ocultar detalle' : 'Ver artículo por artículo'}>
                                        {abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>

                                {abierta && (
                                    <div className="border-t border-[#e2ded5] p-3 space-y-3">
                                        {d.error && <div className="px-3 py-2 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-lg">{d.error}</div>}
                                        {d.documentos.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {d.documentos.map(x => (
                                                    <span key={`${x.tipo}-${x.docNum}`} className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${x.tipo === 'Solicitud' ? 'bg-[#deb841]/15 border-[#deb841]/60 text-[#7a5f0e]' : 'bg-[#59a96a]/10 border-[#59a96a]/40 text-[#2f7a40]'}`}>
                                                        <ArrowRightLeft size={12} className="inline mr-1" />
                                                        {x.tipo === 'Solicitud' ? 'Solicitud' : 'Traslado'} {x.docNum} · {x.fecha} · {x.desde} → {x.hacia} · {x.articulos} art.
                                                        {x.solicitudBase ? ` · de la solicitud ${x.solicitudBase}` : ''}{x.tipo === 'Solicitud' && x.estado ? ` · ${x.estado}` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {exigidas.length > 0 && (
                                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                                <table className="w-full table-fixed text-xs border-collapse">
                                                    <thead className="bg-[#324354] text-white">
                                                        <tr className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                                                            <th className="w-[11%] px-2 py-1.5 text-left">Estado</th>
                                                            <th className="w-[18%] px-2 py-1.5 text-left">Nº artículo</th>
                                                            <th className="px-2 py-1.5 text-left">Descripción</th>
                                                            <th className="w-[9%] px-2 py-1.5 text-right">Requerido</th>
                                                            <th className="w-[9%] px-2 py-1.5 text-right">Solicitado</th>
                                                            <th className="w-[9%] px-2 py-1.5 text-right">Trasladado</th>
                                                            <th className="w-[9%] px-2 py-1.5 text-right">Pendiente</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {exigidas.map(f => (
                                                            <tr key={f.item} className="hover:bg-[#F6F3EE] align-top">
                                                                <td className="px-2 py-1.5"><span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${ESTADO_FILA[f.estado].color}`}>{ESTADO_FILA[f.estado].label}</span></td>
                                                                <td className="px-2 py-1.5 font-mono font-bold text-[#324354] truncate select-text">{f.item}</td>
                                                                <td className="px-2 py-1.5 font-semibold text-slate-800 select-text">
                                                                    <div className="truncate" title={f.descripcion}>{f.descripcion}</div>
                                                                    {f.sustituto && (
                                                                        <div className="mt-0.5 text-[10px] font-bold text-[#7a5f0e] bg-[#deb841]/20 rounded px-1.5 py-0.5 inline-block">
                                                                            Se trasladó otro artículo: {f.sustituto.item} · {f.sustituto.descripcion} ({num(f.sustituto.cantidad)}). Validar.
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-right font-mono">{num(f.requerido)}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono">{num(f.solicitado)}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono font-bold">{num(f.trasladado)}</td>
                                                                <td className={`px-2 py-1.5 text-right font-mono font-black ${f.pendiente > 0 ? 'text-[#d14747]' : 'text-[#2f7a40]'}`}>{num(f.pendiente)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {extras.length > 0 && (
                                            <div className="text-[11px] text-slate-600">
                                                <span className="font-black text-[#324354]">Trasladado que no está en la lista de materiales: </span>
                                                {extras.map(x => `${x.item} ${x.descripcion} (${num(x.cantidad)})`).join(' · ')}
                                            </div>
                                        )}
                                        {noExigidas.length > 0 && (
                                            <details className="text-[11px] text-slate-500">
                                                <summary className="cursor-pointer font-bold text-[#7B8E90]">No se exigen por traslado: {noExigidas.length} artículo(s)</summary>
                                                <div className="mt-1 grid sm:grid-cols-2 gap-x-4">
                                                    {noExigidas.map(f => (
                                                        <div key={f.item} className="truncate" title={f.descripcion}>
                                                            <span className="font-mono">{f.item}</span> · {f.descripcion} · <span className="italic">{f.motivo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                        <div className="text-[10px] text-slate-400">Revisada: {new Date(d.calculado_at).toLocaleString('es-CO')}</div>
                                    </div>
                                )}
                            </section>
                        )
                    })}
                </div>
            </div>

            {verConsumibles && <ParametrosModal datos={datos || []} onClose={() => setVerConsumibles(false)} onRevisar={() => revisar()} />}
            {detalleOf && <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)} />}
        </div>
    )
}

// Parámetros a revisar: listado de artículos de las listas de materiales de las OF revisadas, con Revisar Sí / No.
// El Sí / No del artículo manda sobre la regla por defecto (accesorios sí; consumibles por palabra, materias primas y mano de obra no).
// Elegir lo mismo que la regla quita el ajuste (el artículo vuelve a seguir la regla).
type ArticuloParam = { item: string; descripcion: string; grupo: 'acc' | 'mp' | 'mo'; porDefecto: boolean; motivoDefecto: string; ofs: string[] }
const GRUPO_LABEL: Record<ArticuloParam['grupo'], string> = { acc: 'Accesorios y Equipos', mp: 'Materia prima pesada', mo: 'Mano de obra' }

function ParametrosModal({ datos, onClose, onRevisar }: { datos: Revision[]; onClose: () => void; onRevisar: () => void }) {
    const [pestana, setPestana] = useState<'articulos' | 'palabras'>('articulos')
    const [ajustes, setAjustes] = useState<Map<string, boolean> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cambios, setCambios] = useState(0)
    const [q, setQ] = useState('')
    const [fGrupo, setFGrupo] = useState<'' | ArticuloParam['grupo']>('acc')
    const [fRevisar, setFRevisar] = useState<'' | 'si' | 'no' | 'ajustados'>('')

    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
    }, [onClose])
    const cargarAjustes = useCallback(async () => {
        const { data, error: e } = await supabase.from('traslados_articulos_fv').select('item, revisar')
        if (e) {
            setError(/traslados_articulos_fv|relation|schema cache/i.test(e.message) ? 'Falta crear la tabla de parámetros: ejecute traslados_fv_parametros.sql en Supabase.' : e.message)
            setAjustes(new Map()); return
        }
        setAjustes(new Map((data || []).map(d => [String(d.item), !!d.revisar])))
    }, [])
    useEffect(() => { cargarAjustes() }, [cargarAjustes])

    // Listado: todos los artículos de las listas de materiales de las OF revisadas
    const articulos = useMemo(() => {
        const m = new Map<string, ArticuloParam>()
        for (const d of datos) for (const f of d.detalle) {
            const x = m.get(f.item)
            if (x) { if (!x.ofs.includes(d.orden_fabricacion)) x.ofs.push(d.orden_fabricacion); continue }
            const porDefecto = f.porDefecto ?? f.estado !== 'no_exigido'
            m.set(f.item, {
                item: f.item, descripcion: f.descripcion, grupo: f.grupo || 'acc', porDefecto, ofs: [d.orden_fabricacion],
                motivoDefecto: porDefecto ? 'Accesorio' : (f.motivo && f.motivo !== 'Marcado No revisar' ? f.motivo : 'Regla'),
            })
        }
        return [...m.values()].sort((a, b) => a.descripcion.localeCompare(b.descripcion))
    }, [datos])

    const revisa = (a: ArticuloParam) => ajustes?.get(a.item) ?? a.porDefecto
    const visibles = articulos.filter(a => {
        const t = q.trim().toLowerCase()
        if (t && !a.item.toLowerCase().includes(t) && !a.descripcion.toLowerCase().includes(t)) return false
        if (fGrupo && a.grupo !== fGrupo) return false
        if (fRevisar === 'si' && !revisa(a)) return false
        if (fRevisar === 'no' && revisa(a)) return false
        if (fRevisar === 'ajustados' && !ajustes?.has(a.item)) return false
        return true
    })

    const fijar = async (a: ArticuloParam, revisar: boolean) => {
        setError(null)
        // Igual a la regla: se quita el ajuste
        if (revisar === a.porDefecto) {
            const { error: e } = await supabase.from('traslados_articulos_fv').delete().eq('item', a.item)
            if (e) { setError(e.message); return }
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            const { error: e } = await supabase.from('traslados_articulos_fv').upsert({ item: a.item, descripcion: a.descripcion, revisar, actualizado_por: user?.email ?? null, actualizado_at: new Date().toISOString() }, { onConflict: 'item' })
            if (e) { setError(e.message); return }
        }
        setAjustes(prev => { const n = new Map(prev || []); if (revisar === a.porDefecto) n.delete(a.item); else n.set(a.item, revisar); return n })
        setCambios(c => c + 1)
    }

    const sel = 'h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs text-[#324354] outline-none focus:ring-2 focus:ring-[#7B8E90] cursor-pointer'
    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col gap-3 relative">
                <button onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)" className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-[#7B8E90] hover:text-[#324354] hover:bg-[#F6F3EE]"><X className="w-5 h-5" /></button>
                <div className="pr-9">
                    <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Traslados · Parámetros a revisar</span>
                    <p className="text-xs text-slate-600 mt-2">
                        Indique qué artículos se exigen en el traslado de cada OF. Por defecto se revisan los accesorios y no se revisan los consumibles (reglas por palabra),
                        las materias primas pesadas ni la mano de obra. Lo que marque aquí manda sobre la regla y se aplica en la siguiente revisión.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-[#e2ded5] pb-2">
                    {([['articulos', `Artículos (${articulos.length})`], ['palabras', 'Reglas por palabra']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setPestana(id)}
                            className={`h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs ${pestana === id ? 'bg-[#324354] text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>{label}</button>
                    ))}
                    {cambios > 0 && (
                        <div className="ml-auto flex items-center gap-2 text-[11px] font-bold text-[#7a5f0e] bg-[#deb841]/20 border border-[#deb841] rounded-lg px-2 py-1">
                            {cambios} cambio(s) guardado(s): se aplican al revisar.
                            <button onClick={() => { onRevisar(); onClose() }} className="px-2 py-0.5 rounded bg-[#324354] text-white hover:bg-[#254153]">Revisar ahora</button>
                        </div>
                    )}
                </div>
                {error && <div className="px-3 py-2 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-lg">{error}</div>}

                {pestana === 'palabras' ? <ReglasPalabras /> : (
                    <>
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex-1 min-w-[220px] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nº de artículo o descripción"
                                    className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                            </div>
                            <select value={fGrupo} onChange={e => setFGrupo(e.target.value as typeof fGrupo)} className={sel} title="Grupo">
                                <option value="">Todos los grupos</option>
                                <option value="acc">Accesorios y Equipos</option>
                                <option value="mp">Materia prima pesada</option>
                                <option value="mo">Mano de obra</option>
                            </select>
                            <select value={fRevisar} onChange={e => setFRevisar(e.target.value as typeof fRevisar)} className={sel} title="Revisar">
                                <option value="">Revisar: todos</option>
                                <option value="si">Solo Sí</option>
                                <option value="no">Solo No</option>
                                <option value="ajustados">Solo ajustados a mano</option>
                            </select>
                            <span className="text-[11px] font-bold text-slate-500 pb-1.5">{visibles.length} artículo(s)</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200">
                            <table className="w-full table-fixed text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-[#324354] text-white">
                                    <tr className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                                        <th className="w-[12%] px-2 py-2 text-center">Revisar</th>
                                        <th className="w-[17%] px-2 py-2 text-left">Nº artículo</th>
                                        <th className="px-2 py-2 text-left">Descripción</th>
                                        <th className="w-[14%] px-2 py-2 text-left">Grupo</th>
                                        <th className="w-[7%] px-2 py-2 text-right" title="En cuántas OF revisadas aparece">En OF</th>
                                        <th className="w-[18%] px-2 py-2 text-left">Regla por defecto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!ajustes ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
                                    ) : visibles.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold italic">{articulos.length ? 'Ningún artículo coincide con el filtro' : 'Aún no hay revisiones: oprima "Revisar ahora" para armar el listado'}</td></tr>
                                    ) : visibles.map(a => {
                                        const si = revisa(a), ajustado = ajustes.has(a.item)
                                        return (
                                            <tr key={a.item} className={`hover:bg-[#F6F3EE] ${ajustado ? 'bg-[#deb841]/10' : ''}`}>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex justify-center -space-x-px">
                                                        <button onClick={() => fijar(a, true)} className={`h-6 px-2.5 text-[11px] font-black border rounded-l-md ${si ? 'bg-[#59a96a] border-[#59a96a] text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}>Sí</button>
                                                        <button onClick={() => fijar(a, false)} className={`h-6 px-2.5 text-[11px] font-black border rounded-r-md ${!si ? 'bg-[#7B8E90] border-[#7B8E90] text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}>No</button>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 font-mono font-bold text-[#324354] truncate select-text">{a.item}</td>
                                                <td className="px-2 py-1.5 font-semibold text-slate-800 truncate select-text" title={a.descripcion}>{a.descripcion}</td>
                                                <td className="px-2 py-1.5 text-slate-600 truncate">{GRUPO_LABEL[a.grupo]}</td>
                                                <td className="px-2 py-1.5 text-right font-mono" title={a.ofs.join(', ')}>{a.ofs.length}</td>
                                                <td className="px-2 py-1.5 truncate" title={a.motivoDefecto}>
                                                    <span className={`font-bold ${a.porDefecto ? 'text-[#2f7a40]' : 'text-slate-500'}`}>{a.porDefecto ? 'Sí' : 'No'}</span>
                                                    <span className="text-slate-500"> · {a.motivoDefecto}</span>
                                                    {ajustado && <span className="ml-1 text-[10px] font-black text-[#7a5f0e]">(ajustado)</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// Reglas por palabra: los artículos cuya descripción contenga estas palabras no se revisan por defecto (consumibles)
function ReglasPalabras() {
    const [lista, setLista] = useState<string[] | null>(null)
    const [nuevo, setNuevo] = useState('')
    const [error, setError] = useState<string | null>(null)
    const cargar = useCallback(async () => {
        const { data, error: e } = await supabase.from('traslados_consumibles_fv').select('patron').order('patron')
        if (e) { setError(e.message); setLista([]); return }
        setLista((data || []).map(d => d.patron))
    }, [])
    useEffect(() => { cargar() }, [cargar])
    const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim().replace(/\s+/g, ' ')
    const agregar = async () => {
        const p = normal(nuevo); if (!p) return
        const { data: { user } } = await supabase.auth.getUser()
        const { error: e } = await supabase.from('traslados_consumibles_fv').insert({ patron: p, creado_por: user?.email ?? null })
        if (e) { setError(e.message); return }
        setNuevo(''); setError(null); cargar()
    }
    const quitar = async (p: string) => {
        const { error: e } = await supabase.from('traslados_consumibles_fv').delete().eq('patron', p)
        if (e) { setError(e.message); return }
        cargar()
    }
    return (
        <div className="flex-1 min-h-0 overflow-auto">
            <p className="text-xs text-slate-600">Consumibles de uso común: si la descripción del artículo contiene alguna de estas palabras, por defecto <b>no</b> se revisa (se entrega por otro medio).</p>
            <div className="flex gap-2 mt-2 max-w-lg">
                <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} placeholder="Ej: TUBERIA FLEXIBLE"
                    className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                <button onClick={agregar} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#324354] text-white text-xs font-bold hover:bg-[#254153]"><Plus size={14} /> Agregar</button>
            </div>
            {error && <div className="mt-2 text-xs font-bold text-red-700">{error}</div>}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {!lista ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : lista.map(p => (
                    <span key={p} className="flex items-center gap-1 text-[11px] font-bold bg-[#F6F3EE] border border-[#e2ded5] text-[#324354] rounded-lg pl-2 pr-1 py-0.5">
                        {p}
                        <button onClick={() => quitar(p)} title="Quitar" className="p-0.5 rounded text-[#7B8E90] hover:text-[#d14747]"><Trash2 size={12} /></button>
                    </span>
                ))}
            </div>
        </div>
    )
}
