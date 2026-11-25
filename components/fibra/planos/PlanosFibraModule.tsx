'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart3, ChevronDown, ExternalLink, FileText, History, Loader2, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import {
    PROCESOS_PLANO, Plano, ProcesoPlano, baneraDeArchivo, cargarBanerasFv, cargarPlanos, mismaBanera, modeloBanera, nombreProceso, nombreVisible,
    hashArchivo, planoRepetido, puedeEditarPlanos, quitarPlano, subirPlano, tituloModelo, urlPlano
} from '@/lib/fibra-planos'
import IndicadoresPlanos from './IndicadoresPlanos'

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fecha = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

// Abre el PDF en otra pestaña. La pestaña se abre antes de pedir la URL firmada para que el navegador no la bloquee.
async function abrirPdf(p: Plano, onError: (m: string) => void) {
    const ventana = window.open('', '_blank')
    try {
        const url = await urlPlano(p.pdf_path)
        if (ventana) ventana.location.href = url
        else window.location.href = url
    } catch (e) {
        ventana?.close()
        onError((e as Error).message || 'No se pudo abrir el plano')
    }
}

// hash: undefined mientras se calcula. repetido: plano vigente igual (mismo contenido o mismo nombre de archivo).
// enLista: el mismo PDF ya está más arriba en esta carga.
type Carga = { archivo: File; banera: string; hash?: string | null; repetido?: Plano | null; enLista?: boolean }

export default function PlanosFibraModule({ userEmail }: { userEmail: string }) {
    const [planos, setPlanos] = useState<Plano[]>([])
    const [baneras, setBaneras] = useState<string[]>([])
    const [editor, setEditor] = useState(false)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
    const [buscar, setBuscar] = useState('')
    const [proceso, setProceso] = useState<ProcesoPlano | null>(null)
    const [cargar, setCargar] = useState<{ proceso: ProcesoPlano | null; banera?: string } | null>(null)
    const [historial, setHistorial] = useState<{ banera: string; proceso: ProcesoPlano } | null>(null)
    const [menu, setMenu] = useState<{ titulo: string; proceso: ProcesoPlano; lista: Plano[]; rect: DOMRect } | null>(null)
    const cerrarMenu = useCallback(() => setMenu(null), [])
    // Vista preliminar del PDF dentro de la página (url firmada de 1 hora)
    const [vista, setVista] = useState<{ p: Plano; url: string | null } | null>(null)
    const verPdf = (p: Plano) => {
        setVista({ p, url: null })
        urlPlano(p.pdf_path)
            .then(url => setVista(v => (v && v.p.id === p.id ? { p, url } : v)))
            .catch(e => { setVista(null); setAviso({ ok: false, texto: (e as Error).message || 'No se pudo abrir el plano' }) })
    }

    const leer = useCallback(async () => {
        setCargando(true)
        try {
            setPlanos(await cargarPlanos())
            setError(null)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        leer()
        puedeEditarPlanos(userEmail).then(setEditor).catch(() => setEditor(false))
        cargarBanerasFv().then(setBaneras).catch(() => setBaneras([]))
    }, [leer, userEmail])

    const vigentes = useMemo(() => planos.filter(p => p.activo), [planos])
    const vigente = useCallback((banera: string, proc: string) => vigentes.find(p => p.proceso === proc && mismaBanera(p.banera, banera)) || null, [vigentes])

    // Una sola fila por bañera (nombre general del modelo). Todos los PDF de ese modelo quedan en su fila,
    // en la columna de su proceso; si un proceso tiene varios, se ven en una lista al tocar la celda.
    const todos = useMemo(() => {
        const porModelo = new Map<string, Plano[]>()
        vigentes.forEach(p => { const k = modeloBanera(p.banera); porModelo.set(k, [...(porModelo.get(k) || []), p]) })
        return [...porModelo.entries()].map(([k, lista]) => {
            const titulo = tituloModelo([...new Set(lista.map(p => p.banera.trim()))])
            const porProceso = new Map<string, Plano[]>()
            lista.forEach(p => porProceso.set(p.proceso, [...(porProceso.get(p.proceso) || []), p]))
            porProceso.forEach(l => l.sort((a, b) => a.banera.localeCompare(b.banera, 'es')))
            return { clave: k, titulo, porProceso, texto: sinTildes(`${titulo} ${lista.map(p => p.banera).join(' ')}`) }
        }).sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
    }, [vigentes])
    const grupos = useMemo(() => {
        const q = sinTildes(buscar.trim())
        return todos
            .filter(g => !q || q.split(' ').every(x => g.texto.includes(x)))
            .filter(g => !proceso || g.porProceso.has(proceso))
    }, [todos, buscar, proceso])
    const [verIndicadores, setVerIndicadores] = useState(false)

    const conteo = (proc: string) => vigentes.filter(p => p.proceso === proc).length
    const columnas = proceso ? PROCESOS_PLANO.filter(p => p.id === proceso) : PROCESOS_PLANO
    const fallo = (m: string) => setAviso({ ok: false, texto: m })

    const quitar = async (p: Plano) => {
        if (!confirm(`¿Quitar el plano de ${nombreProceso(p.proceso)} de ${p.banera}? Queda en el historial.`)) return
        try {
            await quitarPlano(p)
            setAviso({ ok: true, texto: `Plano de ${nombreProceso(p.proceso)} de ${p.banera} quitado.` })
            leer()
        } catch (e) { fallo((e as Error).message) }
    }

    // Celda de una bañera en un proceso: un PDF se abre directo; varios (o las acciones de edición) van en una lista
    const celda = (titulo: string, col: ProcesoPlano, lista: Plano[]) => {
        const abrirMenu = (e: React.MouseEvent<HTMLElement>) => setMenu({ titulo, proceso: col, lista, rect: e.currentTarget.getBoundingClientRect() })
        return (
            <td key={col} className="px-1.5 py-1 border-b border-r border-[#e2ded5] text-center">
                {lista.length === 1 ? (
                    <div className="inline-flex items-center">
                        <button type="button" onClick={() => verPdf(lista[0])} title={`${nombreVisible(lista[0].banera)} · cargado ${fecha(lista[0].created_at)}`}
                            className={`h-7 px-2 bg-white border border-[#324354]/25 text-[#324354] text-[11px] font-black flex items-center gap-1 hover:bg-[#324354] hover:text-white transition-colors ${editor ? 'rounded-l-lg' : 'rounded-lg'}`}>
                            <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        {editor && (
                            <button type="button" title="Opciones" onClick={abrirMenu}
                                className="h-7 px-1 rounded-r-lg bg-white border border-l-0 border-[#324354]/25 text-[#324354] hover:bg-[#F6F3EE]"><ChevronDown className="w-3.5 h-3.5" /></button>
                        )}
                    </div>
                ) : lista.length > 1 ? (
                    <button type="button" onClick={abrirMenu}
                        className="h-7 px-2 rounded-lg bg-[#F6F3EE] border border-[#e2ded5] text-[#324354] text-[11px] font-black inline-flex items-center gap-1 hover:border-[#324354]">
                        <FileText className="w-3.5 h-3.5" /> {lista.length} PDF <ChevronDown className="w-3 h-3" />
                    </button>
                ) : editor ? (
                    <button type="button" onClick={() => setCargar({ proceso: col })} className="h-7 px-2 rounded-lg text-[11px] font-bold text-slate-300 hover:text-[#324354] hover:bg-slate-100 inline-flex items-center gap-0.5"><Plus className="w-3 h-3" /> Cargar</button>
                ) : <span className="text-slate-300">—</span>}
            </td>
        )
    }

    const anteriores = historial ? planos.filter(p => p.proceso === historial.proceso && mismaBanera(p.banera, historial.banera)) : []

    return (
        <div className="p-3 sm:p-4 space-y-3 bg-[#F6F3EE] min-h-full">
            {/* Encabezado */}
            <div className="bg-white rounded-2xl border border-[#e2ded5] p-3 flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#324354] mr-2 flex items-center gap-1.5"><FileText className="w-5 h-5" /> Planos</h2>
                <div className="relative flex-1 min-w-[180px] max-w-[340px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar bañera…"
                        className="w-full h-8 border border-slate-300 rounded-lg pl-7 pr-2 text-sm outline-none focus:border-[#324354]" />
                </div>
                <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => setProceso(null)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold ${!proceso ? 'bg-[#324354] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Todos</button>
                    {PROCESOS_PLANO.map(p => (
                        <button key={p.id} type="button" onClick={() => setProceso(proceso === p.id ? null : p.id)}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${proceso === p.id ? 'bg-[#324354] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                            {p.nombre} <span className="opacity-60">{conteo(p.id)}</span>
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={leer} title="Actualizar" className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                        <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" onClick={() => setVerIndicadores(v => !v)}
                        className={`h-8 px-3 rounded-lg text-xs font-black flex items-center gap-1 border ${verIndicadores ? 'bg-[#324354] text-white border-[#324354]' : 'border-[#324354] text-[#324354] hover:bg-[#324354]/5'}`}>
                        <BarChart3 className="w-4 h-4" /> {verIndicadores ? 'Ver tabla' : 'Indicadores'}
                    </button>
                    {editor && (
                        <button type="button" onClick={() => setCargar({ proceso })}
                            className="h-8 px-3 rounded-lg bg-[#324354] text-white text-xs font-black flex items-center gap-1 hover:bg-[#254153]">
                            <Upload className="w-4 h-4" /> Cargar planos
                        </button>
                    )}
                </div>
            </div>

            {aviso && (
                <p className={`text-xs font-bold rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 ${aviso.ok ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'}`}>
                    {aviso.texto}
                    <button type="button" onClick={() => setAviso(null)}><X className="w-3.5 h-3.5" /></button>
                </p>
            )}

            {error ? (
                <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</p>
            ) : cargando && !planos.length ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : verIndicadores ? (
                <IndicadoresPlanos grupos={todos} onVer={titulo => { setBuscar(titulo); setProceso(null); setVerIndicadores(false) }} />
            ) : (
                <div className="bg-white rounded-2xl border border-[#e2ded5] overflow-auto max-h-[calc(100dvh-11rem)]">
                    <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm table-fixed">
                        <thead>
                            <tr>
                                <th className="text-left px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white bg-[#324354] sticky left-0 top-0 z-30 w-[260px] min-w-[260px]">Bañera</th>
                                {columnas.map(p => (
                                    <th key={p.id} className="text-center px-2 py-2 text-[11px] font-black uppercase tracking-wider text-[#324354] bg-[#e2ded5] border-l border-white sticky top-0 z-20 leading-tight">{p.nombre}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grupos.map(g => (
                                <tr key={g.clave} className="hover:bg-[#F6F3EE]/60">
                                    <td className="px-3 py-1.5 border-b border-r border-[#e2ded5] sticky left-0 bg-white text-[12px] font-bold text-[#324354]">{g.titulo}</td>
                                    {columnas.map(col => celda(g.titulo, col.id, g.porProceso.get(col.id) || []))}
                                </tr>
                            ))}
                            {!grupos.length && (
                                <tr><td colSpan={columnas.length + 1} className="px-3 py-10 text-center text-sm text-slate-400">
                                    {vigentes.length ? 'Ninguna bañera coincide con la búsqueda.' : `Aún no hay planos cargados.${editor ? ' Use “Cargar planos”.' : ''}`}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {vista && <VistaPdf vista={vista} onPestana={() => abrirPdf(vista.p, fallo)} onCerrar={() => setVista(null)} />}

            {menu && (
                <MenuPdfs rect={menu.rect} titulo={`${nombreProceso(menu.proceso)} · ${menu.titulo}`} lista={menu.lista} editor={editor}
                    versiones={p => planos.filter(x => x.proceso === p.proceso && mismaBanera(x.banera, p.banera)).length}
                    onAbrir={p => { setMenu(null); verPdf(p) }}
                    onHistorial={p => { setMenu(null); setHistorial({ banera: p.banera, proceso: p.proceso }) }}
                    onReemplazar={p => { setMenu(null); setCargar({ proceso: p.proceso, banera: p.banera }) }}
                    onQuitar={p => { setMenu(null); quitar(p) }}
                    onAgregar={() => { const pr = menu.proceso; setMenu(null); setCargar({ proceso: pr }) }}
                    onCerrar={cerrarMenu} />
            )}

            {cargar && (
                <CargarPlanos inicial={cargar} baneras={baneras} vigente={vigente} vigentes={vigentes} email={userEmail}
                    onCerrar={() => setCargar(null)}
                    onListo={texto => { setCargar(null); setAviso({ ok: true, texto }); leer() }} />
            )}

            {historial && (
                <Ventana titulo={`${nombreProceso(historial.proceso)} · ${nombreVisible(historial.banera)}`} chip="Versiones" onCerrar={() => setHistorial(null)}>
                    <div className="divide-y divide-slate-100">
                        {anteriores.map(p => (
                            <div key={p.id} className="py-2 flex items-center gap-3">
                                <button type="button" onClick={() => verPdf(p)} className="h-7 px-2 rounded-lg bg-white border border-[#324354]/25 text-[#324354] text-[11px] font-black flex items-center gap-1 hover:bg-[#324354] hover:text-white transition-colors shrink-0">
                                    <FileText className="w-3.5 h-3.5" /> v{p.version}
                                </button>
                                <div className="min-w-0 text-[12px] leading-tight">
                                    <span className="block font-bold text-[#324354] truncate">{p.nombre_archivo || 'Plano'}{p.activo && <span className="ml-1 text-emerald-700">· vigente</span>}</span>
                                    <span className="block text-slate-500">{fecha(p.created_at)} · {p.usuario_email || '—'}{p.observacion ? ` · ${p.observacion}` : ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Ventana>
            )}
        </div>
    )
}

function Ventana({ titulo, chip, onCerrar, children, bloqueada = false }: { titulo: string; chip: string; onCerrar: () => void; children: React.ReactNode; bloqueada?: boolean }) {
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !bloqueada) onCerrar() }
        document.addEventListener('keydown', tecla)
        return () => document.removeEventListener('keydown', tecla)
    }, [onCerrar, bloqueada])
    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget && !bloqueada) onCerrar() }}>
            <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3 p-4 pb-2">
                    <div>
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">{chip}</span>
                        <h3 className="text-xl font-black text-[#324354] mt-1.5">{titulo}</h3>
                    </div>
                    <button type="button" onClick={onCerrar} disabled={bloqueada} title="Cerrar" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-4 pb-4">{children}</div>
            </div>
        </div>
    )
}

// Carga de uno o varios PDF de un proceso: cada archivo es el plano de una bañera (el nombre sale del archivo y se puede corregir)
function CargarPlanos({ inicial, baneras, vigente, vigentes, email, onCerrar, onListo }: {
    inicial: { proceso: ProcesoPlano | null; banera?: string }
    baneras: string[]
    vigente: (banera: string, proceso: string) => Plano | null
    vigentes: Plano[]
    email: string
    onCerrar: () => void
    onListo: (texto: string) => void
}) {
    // Sin proceso marcado por defecto: se elige siempre, para no cargar planos en el proceso equivocado
    const [proceso, setProceso] = useState<ProcesoPlano | null>(inicial.proceso)
    const [cargas, setCargas] = useState<Carga[]>([])
    const [observacion, setObservacion] = useState('')
    const [subiendo, setSubiendo] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const input = useRef<HTMLInputElement>(null)
    const unaBanera = !!inicial.banera

    const agregar = (files: FileList | null) => {
        if (!files?.length) return
        const pdfs = [...files].filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
        if (pdfs.length < files.length) setError('Solo se cargan archivos PDF; los demás se ignoraron.')
        else setError(null)
        const nuevas: Carga[] = pdfs.map(f => ({ archivo: f, banera: inicial.banera || baneraDeArchivo(f.name) }))
        setCargas(c => (unaBanera ? nuevas.slice(0, 1) : [...c, ...nuevas]))
        // Huella de cada PDF para detectar repetidos (ya cargados o dos veces en esta misma carga)
        nuevas.forEach(n => {
            hashArchivo(n.archivo).then(hash => setCargas(l => marcarRepetidos(l.map(x => (x.archivo === n.archivo ? { ...x, hash } : x)))))
        })
    }

    const marcarRepetidos = (l: Carga[]) => l.map((c, i) => ({
        ...c,
        repetido: c.hash === undefined ? c.repetido : planoRepetido(c.archivo, c.hash, vigentes),
        enLista: l.slice(0, i).some(o => (c.hash && o.hash === c.hash) || (o.archivo.name.toLowerCase() === c.archivo.name.toLowerCase() && o.archivo.size === c.archivo.size))
    }))
    const validas = cargas.filter(c => c.hash !== undefined && !c.repetido && !c.enLista)
    const calculando = cargas.some(c => c.hash === undefined)
    const repetidos = cargas.length - validas.length - cargas.filter(c => c.hash === undefined).length

    const guardar = async () => {
        if (!proceso) { setError('Elija el proceso al que pertenecen los planos.'); return }
        if (calculando) return
        const vacias = validas.filter(c => !c.banera.trim())
        if (vacias.length) { setError('Escriba la bañera de cada plano.'); return }
        setError(null)
        let hechos = 0
        try {
            for (let i = 0; i < cargas.length; i++) {
                const c = cargas[i]
                if (!validas.includes(c)) continue
                setSubiendo(i)
                await subirPlano(c.banera, proceso, c.archivo, vigente(c.banera, proceso), observacion, email, c.hash)
                hechos++
            }
            onListo(`${hechos} plano(s) de ${nombreProceso(proceso)} cargado(s).`)
        } catch (e) {
            setCargas(c => c.filter(x => !validas.slice(0, hechos).includes(x)))
            setError(`${hechos ? `Se cargaron ${hechos}. ` : ''}${(e as Error).message}`)
        } finally {
            setSubiendo(null)
        }
    }

    const ocupado = subiendo != null
    return (
        <Ventana titulo={unaBanera ? inicial.banera! : 'Cargar planos'} chip={unaBanera ? 'Cargar plano' : 'Planos FV'} onCerrar={onCerrar} bloqueada={ocupado}>
            <div className="space-y-3">
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${proceso ? 'text-slate-500' : 'text-rose-700'}`}>Proceso {!proceso && '· elija uno'}</label>
                    <div className="flex flex-wrap gap-1">
                        {PROCESOS_PLANO.map(p => (
                            <button key={p.id} type="button" disabled={ocupado} onClick={() => setProceso(p.id)}
                                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold ${proceso === p.id ? 'bg-[#324354] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{p.nombre}</button>
                        ))}
                    </div>
                </div>

                <div>
                    <input ref={input} type="file" accept="application/pdf,.pdf" multiple={!unaBanera} className="hidden" onChange={e => { agregar(e.target.files); e.target.value = '' }} />
                    <button type="button" disabled={ocupado} onClick={() => input.current?.click()}
                        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); agregar(e.dataTransfer.files) }}
                        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-bold text-slate-500 hover:border-[#324354] hover:text-[#324354] flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5" />
                        {unaBanera ? 'Elegir el PDF del plano' : 'Elegir o arrastrar los PDF (uno por bañera)'}
                        <span className="text-[10px] font-medium text-slate-400">Solo PDF, hasta 30 MB cada uno</span>
                    </button>
                </div>

                {cargas.length > 0 && (
                    <div className="border border-[#e2ded5] rounded-xl divide-y divide-slate-100">
                        <datalist id="baneras-fv">{baneras.map(b => <option key={b} value={b} />)}</datalist>
                        {cargas.map((c, i) => {
                            const actual = c.banera.trim() && proceso ? vigente(c.banera, proceso) : null
                            const malo = !!c.repetido || !!c.enLista
                            return (
                                <div key={i} className={`p-2 flex items-center gap-2 ${subiendo === i ? 'bg-sky-50' : malo ? 'bg-rose-50/60' : ''}`}>
                                    <FileText className="w-4 h-4 text-[#324354] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <input value={c.banera} list="baneras-fv" disabled={ocupado || unaBanera} placeholder="Bañera"
                                            onChange={e => setCargas(l => l.map((x, j) => (j === i ? { ...x, banera: e.target.value } : x)))}
                                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] disabled:bg-slate-50" />
                                        <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                                            {c.archivo.name} · {(c.archivo.size / 1024 / 1024).toFixed(1)} MB
                                            {!malo && actual && <b className="text-amber-700"> · reemplaza la v{actual.version} (queda en el historial)</b>}
                                            {c.hash === undefined && <span className="text-slate-400"> · revisando si está repetido…</span>}
                                        </span>
                                        {c.repetido && <span className="block text-[11px] font-bold text-rose-700 mt-0.5">Repetido: ya está cargado en {nombreProceso(c.repetido.proceso)} · {nombreVisible(c.repetido.banera)}. No se subirá.</span>}
                                        {!c.repetido && c.enLista && <span className="block text-[11px] font-bold text-rose-700 mt-0.5">Repetido: este PDF ya está más arriba en la lista. No se subirá.</span>}
                                    </div>
                                    {subiendo === i ? <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                                        : !ocupado && <button type="button" title="Quitar de la lista" onClick={() => setCargas(l => l.filter((_, j) => j !== i))} className="p-1 rounded text-slate-400 hover:text-rose-600"><X className="w-4 h-4" /></button>}
                                </div>
                            )
                        })}
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Observación (opcional)</label>
                    <input value={observacion} onChange={e => setObservacion(e.target.value)} disabled={ocupado} placeholder="Ej. Cambio de cota en la cantonera lateral"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#324354]" />
                </div>

                {repetidos > 0 && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{repetidos} PDF repetido(s): no se subirán. Quítelos de la lista o déjelos; se omiten al cargar.</p>}
                {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex justify-end gap-2 -mx-4 -mb-4 px-4 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] rounded-b-2xl">
                    <button type="button" onClick={onCerrar} disabled={ocupado} className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-sm font-bold text-slate-700 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={ocupado || !validas.length || !proceso || calculando}
                        className="px-4 py-1.5 rounded-lg bg-[#324354] text-white text-sm font-black flex items-center gap-1.5 disabled:opacity-40">
                        {ocupado ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</> : <><Upload className="w-4 h-4" /> Cargar {validas.length || ''} plano(s){proceso ? ` de ${nombreProceso(proceso)}` : ''}</>}
                    </button>
                </div>
            </div>
        </Ventana>
    )
}

// Lista de los PDF de una celda (bañera × proceso), con posición fija para que la tabla no la recorte
function MenuPdfs({ rect, titulo, lista, editor, versiones, onAbrir, onHistorial, onReemplazar, onQuitar, onAgregar, onCerrar }: {
    rect: DOMRect
    titulo: string
    lista: Plano[]
    editor: boolean
    versiones: (p: Plano) => number
    onAbrir: (p: Plano) => void
    onHistorial: (p: Plano) => void
    onReemplazar: (p: Plano) => void
    onQuitar: (p: Plano) => void
    onAgregar: () => void
    onCerrar: () => void
}) {
    const caja = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar() }
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
        const mover = (e: Event) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar() }
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', tecla)
        window.addEventListener('scroll', mover, true)
        window.addEventListener('resize', onCerrar)
        return () => {
            document.removeEventListener('mousedown', fuera)
            document.removeEventListener('keydown', tecla)
            window.removeEventListener('scroll', mover, true)
            window.removeEventListener('resize', onCerrar)
        }
    }, [onCerrar])

    const ancho = 340
    const abajo = rect.bottom + 320 < window.innerHeight || rect.top < 320
    const izquierda = Math.max(8, Math.min(rect.left + rect.width / 2 - ancho / 2, window.innerWidth - ancho - 8))
    const icono = 'p-1 rounded text-slate-400 hover:text-[#324354] hover:bg-slate-100 shrink-0'
    return (
        <div ref={caja} style={{ position: 'fixed', left: izquierda, width: ancho, ...(abajo ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }) }}
            className="z-[60] bg-white border border-[#e2ded5] rounded-xl shadow-xl overflow-hidden">
            <div className="px-3 py-2 bg-[#F6F3EE] border-b border-[#e2ded5] text-[11px] font-black uppercase tracking-wider text-[#324354] truncate">{titulo}</div>
            <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                {lista.map(p => (
                    <div key={p.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#F6F3EE]/60">
                        <button type="button" onClick={() => onAbrir(p)} className="flex-1 min-w-0 flex items-center gap-2 text-left" title={p.banera}>
                            <FileText className="w-4 h-4 text-[#324354] shrink-0" />
                            <span className="min-w-0">
                                <span className="block text-[12px] font-bold text-[#324354] leading-tight truncate">{nombreVisible(p.banera)}</span>
                                <span className="block text-[10px] text-slate-500 leading-tight">{fecha(p.created_at)}{p.version > 1 ? ` · v${p.version}` : ''}</span>
                            </span>
                        </button>
                        {versiones(p) > 1 && <button type="button" title="Versiones anteriores" onClick={() => onHistorial(p)} className={icono}><History className="w-3.5 h-3.5" /></button>}
                        {editor && <button type="button" title="Reemplazar por un plano nuevo" onClick={() => onReemplazar(p)} className={icono}><Upload className="w-3.5 h-3.5" /></button>}
                        {editor && <button type="button" title="Quitar plano" onClick={() => onQuitar(p)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                ))}
            </div>
            {editor && (
                <button type="button" onClick={onAgregar} className="w-full px-3 py-2 border-t border-[#e2ded5] text-[11px] font-black text-[#324354] hover:bg-[#F6F3EE] flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar PDF a este proceso
                </button>
            )}
        </div>
    )
}

// Vista preliminar: el PDF dentro de la página. En tablets que no muestran PDF incrustados, "Abrir en pestaña nueva".
function VistaPdf({ vista, onPestana, onCerrar }: { vista: { p: Plano; url: string | null }; onPestana: () => void; onCerrar: () => void }) {
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
        document.addEventListener('keydown', tecla)
        return () => document.removeEventListener('keydown', tecla)
    }, [onCerrar])
    const { p, url } = vista
    return (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
            <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e2ded5]">
                    <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md shrink-0">{nombreProceso(p.proceso)}</span>
                    <h3 className="text-base sm:text-lg font-black text-[#324354] truncate flex-1" title={p.banera}>{nombreVisible(p.banera)}</h3>
                    <button type="button" onClick={onPestana} className="h-8 px-3 rounded-lg border border-[#324354]/25 text-[#324354] text-xs font-black flex items-center gap-1.5 hover:bg-[#F6F3EE] shrink-0">
                        <ExternalLink className="w-4 h-4" /> <span className="hidden sm:inline">Abrir en pestaña nueva</span>
                    </button>
                    <button type="button" onClick={onCerrar} title="Cerrar" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 bg-[#F6F3EE]">
                    {url
                        ? <iframe src={url} title={p.banera} className="w-full h-full border-0" />
                        : <div className="h-full flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>}
                </div>
            </div>
        </div>
    )
}
