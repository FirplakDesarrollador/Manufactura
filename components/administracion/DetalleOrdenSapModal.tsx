'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, ArrowDown, ArrowUp, ArrowUpDown, Boxes, MessageSquareText, ArrowRightLeft, FileImage, Loader2, RefreshCw, AlertTriangle, List, Layers, Factory, MonitorSmartphone, Clipboard, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFechasSemaforoFv } from '@/lib/fibra/fechasSemaforo'

const fechaCorta = (iso: string | null | undefined) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—'

// Detalle de una orden de fabricación consultado en SAP (misma ruta que Consulta SAP).
// Lo que SAP no entregue llega en `faltantes` y se muestra como error, nunca con valores por defecto.
type ComponenteSap = {
    id: number
    tipo: string
    no: string
    descripcion: string
    cantBase: number | string
    cantRequerida: number | string
    consumido: number | string
    unidadMedida: string
    almacen: string
    metodoEmision: string
}

type OrdenSap = {
    noOrden: string
    estado: string
    tipo: string
    noProducto: string
    descripcionProducto: string
    cantPlanificada: number | string
    cantCompletada: number
    almacen: string
    fechaInicio: string
    fechaFinalizacion: string
    pedidoVinculado: string
    comentarios: string
    masaTeorica?: number | string | null
    gelcoatTeorico?: number | string | null
    // Peso de vaciado por pieza (Bañera / Faldón): resina Virgen (FV 4891) o Cargada (Palatal) y su gelcoat
    vaciado?: { pieza: string; resinaTipo: string; resinaKg: number; gelcoatKg: number | null }[]
    componentes: ComponenteSap[]
    faltantes: string[]
}

type Pestana = 'ldm' | 'comentarios' | 'trazabilidad' | 'traslados' | 'planos' | 'sap'
type VistaLdm = 'lista' | 'grupos'

const PESTANAS: { id: Pestana; label: string; icon: React.ElementType; pronto?: boolean }[] = [
    { id: 'ldm', label: 'Resumen Materiales', icon: Boxes },
    { id: 'comentarios', label: 'Comentarios', icon: MessageSquareText },
    { id: 'trazabilidad', label: 'Trazabilidad', icon: Factory, pronto: true },
    { id: 'traslados', label: 'Traslados', icon: ArrowRightLeft },
    { id: 'planos', label: 'Planos', icon: FileImage, pronto: true },
    // Misma pantalla de Consulta SAP → Consulta Ordenes, con esta orden ya consultada
    { id: 'sap', label: 'Vista SAP', icon: MonitorSmartphone }
]

// Clasificación por la descripción del artículo (SAP no trae este grupo).
// Mano de obra: mano de obra y todo lo que diga CIF.
// Materias primas pesadas: resinas, peróxido, gelcoat, cargas minerales, refuerzos de fibra, ceras y similares.
// Lo demás: accesorios y equipos.
type Grupo = 'mp' | 'acc' | 'mo'
const GRUPOS: { id: Grupo; label: string; color: string }[] = [
    { id: 'acc', label: 'Accesorios y Equipos', color: 'border-l-sky-500' },
    { id: 'mp', label: 'Materias Primas Pesadas', color: 'border-l-amber-500' },
    { id: 'mo', label: 'Mano de Obra', color: 'border-l-emerald-500' }
]
const RE_MANO_OBRA = /\bMANO\s+(DE\s+)?OBRA\b|\bCIF\b/
const RE_MATERIA_PESADA = new RegExp('\\b(' + [
    'RESINAS?', 'PEROXIDOS?', 'GEL\\s?COAT', 'GRANICALCIO', 'OMYA', 'CARBONATOS?', 'ROVING', 'WOVEN', 'WOVING',
    'CERAS?', 'ESTIRENO', 'CATALIZADOR', 'MEKP', 'COBALTO', 'ACELERANTE', 'PIGMENTOS?', 'PASTA\\s+PIGMENT\\w*',
    'MASILLA', 'TALCO', 'MICROESFERAS?', 'SILICE', 'ARENA', 'DESMOLDANTE', 'ALCOHOL\\s+POLIVINILICO', 'ACETONA',
    'MATT?', 'FIBRA\\s+(DE\\s+)?VIDRIO', 'TRIHIDRATO', 'ALUMINA', 'CARGA\\s+MINERAL'
].join('|') + ')\\b')

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
function grupoDe(c: ComponenteSap): Grupo {
    const d = sinTildes(c.descripcion || '')
    if (RE_MANO_OBRA.test(d)) return 'mo'
    if (RE_MATERIA_PESADA.test(d)) return 'mp'
    return 'acc'
}

const num = (v: number | string) => {
    const n = Number(v)
    return Number.isFinite(n) && v !== '' ? n.toLocaleString('es-CO', { maximumFractionDigits: 4 }) : String(v ?? '')
}

type ColMat = "id" | "tipo" | "no" | "descripcion" | "cantBase" | "cantRequerida"
const COLS_MAT: { col: ColMat; texto: string; ancho: string; alin: string; num?: boolean }[] = [
    { col: "id", texto: "#", ancho: "w-[6%]", alin: "justify-center", num: true },
    { col: "tipo", texto: "Tipo", ancho: "w-[10%]", alin: "justify-start" },
    { col: "no", texto: "Nº artículo", ancho: "w-[19%]", alin: "justify-start" },
    { col: "descripcion", texto: "Descripción", ancho: "", alin: "justify-start" },
    { col: "cantBase", texto: "Cant. base", ancho: "w-[11%]", alin: "justify-end", num: true },
    { col: "cantRequerida", texto: "Cant. requerida", ancho: "w-[13%]", alin: "justify-end", num: true },
]

function TablaComponentes({ filas }: { filas: ComponenteSap[] }) {
    // Orden por columna: clic en el título ordena, otro clic invierte (números de mayor a menor, textos de A a Z)
    const [orden, setOrden] = useState<{ col: ColMat; asc: boolean } | null>(null)
    const ordenar = (col: ColMat, esNum?: boolean) => setOrden(o => o?.col === col ? { col, asc: !o.asc } : { col, asc: !esNum || col === "id" })
    const vistas = useMemo(() => {
        if (!orden) return filas
        const n = (v: number | string) => { const x = Number(v); return Number.isFinite(x) && v !== "" ? x : -Infinity }
        return [...filas].sort((a, b) => {
            const va = a[orden.col], vb = b[orden.col]
            const c = orden.col === "id" || orden.col === "cantBase" || orden.col === "cantRequerida"
                ? n(va) - n(vb)
                : String(va ?? "").localeCompare(String(vb ?? ""), "es", { numeric: true })
            return orden.asc ? c : -c
        })
    }, [filas, orden])
    // Solo lo necesario, cada material en un renglón (la descripción larga se corta con "…" y se ve completa al pasar el mouse)
    return (
        <table className="w-full table-fixed text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#324354] text-white">
                <tr className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {COLS_MAT.map(({ col, texto, ancho, alin, num: esNum }) => {
                        const activa = orden?.col === col
                        const Icono = !activa ? ArrowUpDown : orden!.asc ? ArrowUp : ArrowDown
                        return (
                            <th key={col} className={`${ancho} px-2 py-2`}>
                                <button type="button" onClick={() => ordenar(col, esNum)} title="Clic para ordenar"
                                    className={`w-full flex items-center gap-1 ${alin} uppercase tracking-wider hover:text-[#deb841] ${activa ? "text-[#deb841]" : ""}`}>
                                    {texto}
                                    <Icono className={`w-3 h-3 shrink-0 ${activa ? "" : "opacity-50"}`} />
                                </button>
                            </th>
                        )
                    })}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {vistas.map(c => (
                    <tr key={c.id} className="hover:bg-[#F6F3EE] whitespace-nowrap">
                        <td className="px-2 py-1.5 text-center text-slate-400 font-bold">{c.id}</td>
                        <td className="px-2 py-1.5 text-slate-600 truncate">{c.tipo}</td>
                        <td className="px-2 py-1.5 font-mono font-bold text-[#324354] select-text truncate">{c.no}</td>
                        <td className="px-2 py-1.5 font-semibold text-slate-800 select-text truncate" title={c.descripcion}>{c.descripcion}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{num(c.cantBase)}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold">{num(c.cantRequerida)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// Traslados de la OF en SAP: solicitudes de traslado y traslados cuyo comentario trae el número de la OF
type LineaTraslado = { item: string; descripcion: string; cantidad: number; desde: string; hacia: string }
type DocTraslado = { tipo: 'Solicitud' | 'Traslado'; docNum: number; fecha: string; desde: string; hacia: string; estado: string; comentario: string; solicitudBase: number | null; lineas: LineaTraslado[] }

function TrasladosOrden({ ordenFabricacion }: { ordenFabricacion: string | number }) {
    const [datos, setDatos] = useState<{ solicitudes: DocTraslado[]; traslados: DocTraslado[] } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
    useEffect(() => {
        let vigente = true
        setDatos(null); setError(null)
        fetch(`/api/sap/production-orders/${encodeURIComponent(String(ordenFabricacion).trim())}/traslados`)
            .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || `Error ${r.status}`); return d })
            .then(d => { if (vigente) setDatos({ solicitudes: d.solicitudes || [], traslados: d.traslados || [] }) })
            .catch(e => { if (vigente) setError(e instanceof Error ? e.message : 'Error consultando traslados') })
        return () => { vigente = false }
    }, [ordenFabricacion])

    if (error) return (
        <div className="px-4 py-6 bg-red-50 border border-red-400 text-red-800 text-sm font-bold rounded-xl flex items-center gap-2" role="alert">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" /> {error}
        </div>
    )
    if (!datos) return (
        <div className="h-full min-h-[200px] flex items-center justify-center gap-2 text-slate-500 font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Buscando traslados de la OF en SAP...
        </div>
    )
    const docs = [...datos.solicitudes, ...datos.traslados]
    if (docs.length === 0) return (
        <div className="p-10 text-center text-slate-400 font-bold italic bg-slate-50 rounded-xl border border-slate-200">
            SAP no tiene solicitudes de traslado ni traslados con la OF {String(ordenFabricacion)} en el comentario
        </div>
    )
    const alternar = (k: string) => setAbiertos(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n })
    return (
        <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
                {datos.solicitudes.length} solicitud(es) de traslado y {datos.traslados.length} traslado(s). SAP no liga el traslado a la OF: se identifican por el número de la OF en el comentario.
            </p>
            {docs.map(d => {
                const k = `${d.tipo}-${d.docNum}`
                const abierto = abiertos.has(k)
                const unidades = d.lineas.reduce((a, l) => a + l.cantidad, 0)
                return (
                    <section key={k} className={`rounded-xl border border-[#e2ded5] border-l-4 ${d.tipo === 'Solicitud' ? 'border-l-[#deb841]' : 'border-l-[#59a96a]'} bg-white`}>
                        <button type="button" onClick={() => alternar(k)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-left hover:bg-[#F6F3EE] rounded-r-xl">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${d.tipo === 'Solicitud' ? 'bg-[#deb841]/25 text-[#7a5f0e]' : 'bg-[#59a96a]/15 text-[#2f7a40]'}`}>
                                {d.tipo === 'Solicitud' ? 'Solicitud de traslado' : 'Traslado'}
                            </span>
                            <span className="text-sm font-black text-[#324354]">Nº {d.docNum}</span>
                            <span className="text-xs font-bold text-slate-600">{d.fecha}</span>
                            <span className="text-xs font-bold text-[#324354]">{d.desde} → {d.hacia}</span>
                            {d.tipo === 'Solicitud' && d.estado && <span className="text-[11px] font-bold text-slate-500">{d.estado}</span>}
                            {d.solicitudBase && <span className="text-[11px] font-semibold text-[#7B8E90]">de la solicitud {d.solicitudBase}</span>}
                            <span className="ml-auto text-[11px] font-bold text-slate-500">{d.lineas.length} artículo(s) · {num(unidades)} und.</span>
                            {abierto ? <ChevronUp className="w-4 h-4 text-[#7B8E90]" /> : <ChevronDown className="w-4 h-4 text-[#7B8E90]" />}
                        </button>
                        {abierto && (
                            <table className="w-full table-fixed text-xs border-collapse">
                                <thead className="bg-[#324354] text-white">
                                    <tr className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                                        <th className="w-[20%] px-2 py-1.5 text-left">Nº artículo</th>
                                        <th className="px-2 py-1.5 text-left">Descripción</th>
                                        <th className="w-[12%] px-2 py-1.5 text-right">Cantidad</th>
                                        <th className="w-[16%] px-2 py-1.5 text-center">Desde → Hacia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {d.lineas.map((l, i) => (
                                        <tr key={i} className="hover:bg-[#F6F3EE] whitespace-nowrap">
                                            <td className="px-2 py-1.5 font-mono font-bold text-[#324354] truncate select-text">{l.item}</td>
                                            <td className="px-2 py-1.5 font-semibold text-slate-800 truncate select-text" title={l.descripcion}>{l.descripcion}</td>
                                            <td className="px-2 py-1.5 text-right font-mono font-bold">{num(l.cantidad)}</td>
                                            <td className="px-2 py-1.5 text-center font-mono text-slate-600">{l.desde} → {l.hacia}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                )
            })}
        </div>
    )
}

// `piso` (opcional): contenido de la pestaña Trazabilidad (tarjeta de la orden y procesos por pieza en el control de piso)
export default function DetalleOrdenSapModal({ ordenFabricacion, onClose, piso }: {
    ordenFabricacion: string | number
    onClose: () => void
    piso?: { label: string; contenido: React.ReactNode }
}) {
    // Siempre abre en Resumen Materiales, por grupos
    const [pestana, setPestana] = useState<Pestana>('ldm')
    const pestanas: typeof PESTANAS = PESTANAS.map(p => p.id === 'trazabilidad' && piso ? { ...p, pronto: false } : p)
    const [vista, setVista] = useState<VistaLdm>('grupos')
    const [orden, setOrden] = useState<OrdenSap | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cargando, setCargando] = useState(true)
    const [recarga, setRecarga] = useState(0)

    const fondoPresionado = useRef(false)
    // Fechas del Semáforo de la OF (las mismas de la tarjeta de Fibra); si la OF no está en el Semáforo no se muestran
    const semaforo = useFechasSemaforoFv()
    const fechasSem = semaforo?.mapa.get(String(ordenFabricacion ?? '').trim())
    const hoyIso = new Date().toLocaleDateString('en-CA')

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // Copia guardada en Supabase (sap_ordenes_detalle): la ventana abre al instante con ella y por detrás consulta
    // SAP; si SAP responde, se muestra y se guarda lo nuevo. Si SAP falla, queda la copia con su fecha y el aviso.
    const [consultadoAt, setConsultadoAt] = useState<string | null>(null)
    const [actualizando, setActualizando] = useState(false)
    const [avisoCopia, setAvisoCopia] = useState<string | null>(null)

    useEffect(() => {
        let vigente = true
        setCargando(true)
        setError(null)
        setOrden(null)
        setConsultadoAt(null)
        setAvisoCopia(null)
        const docNum = String(ordenFabricacion ?? '').trim()
        if (!/^\d+$/.test(docNum)) {
            setError(`La orden "${docNum}" no es un número de orden de SAP válido`)
            setCargando(false)
            return
        }
        const forzado = recarga > 0
        let hayCopia = false

        const leerCopia = async () => {
            if (forzado) return
            const { data, error: errCopia } = await supabase.from('sap_ordenes_detalle')
                .select('datos, consultado_at').eq('orden_fabricacion', docNum).maybeSingle()
            if (!vigente) return
            if (errCopia) {
                setAvisoCopia(/sap_ordenes_detalle|relation|schema cache/i.test(errCopia.message)
                    ? 'No se guardan copias de SAP: ejecute sap_ordenes_detalle.sql en Supabase.'
                    : `No se pudo leer la copia guardada: ${errCopia.message}`)
                return
            }
            if (data?.datos) {
                hayCopia = true
                setOrden(data.datos as OrdenSap)
                setConsultadoAt(data.consultado_at)
                setCargando(false)
            }
        }

        const consultarSap = async () => {
            setActualizando(true)
            try {
                const r = await fetch(`/api/sap/production-orders/${docNum}`)
                const data = await r.json().catch(() => ({}))
                if (!vigente) return
                if (!r.ok) throw new Error(data.error || `Error al consultar SAP (${r.status})`)
                const ahora = new Date().toISOString()
                setOrden(data)
                setConsultadoAt(ahora)
                setError(null)
                const { data: { user } } = await supabase.auth.getUser()
                const { error: errGuardar } = await supabase.from('sap_ordenes_detalle')
                    .upsert({ orden_fabricacion: docNum, datos: data, consultado_at: ahora, consultado_por: user?.email ?? null }, { onConflict: 'orden_fabricacion' })
                if (errGuardar && vigente) setAvisoCopia(/sap_ordenes_detalle|relation|schema cache/i.test(errGuardar.message)
                    ? 'No se guardan copias de SAP: ejecute sap_ordenes_detalle.sql en Supabase.'
                    : `No se pudo guardar la copia de SAP: ${errGuardar.message}`)
            } catch (e) {
                if (!vigente) return
                const msg = e instanceof Error ? e.message : 'Error de conexión con SAP'
                if (hayCopia) setAvisoCopia(`No se pudo actualizar desde SAP (${msg}). Se muestra la copia guardada.`)
                else setError(msg === 'Failed to fetch' ? 'Error de conexión con SAP' : msg)
            } finally {
                if (vigente) { setActualizando(false); setCargando(false) }
            }
        }

        leerCopia().catch(() => {}).finally(() => { if (vigente) consultarSap() })
        return () => { vigente = false }
    }, [ordenFabricacion, recarga])

    // Siempre en orden alfabético por descripción (en la lista y dentro de cada grupo); # conserva la línea de SAP
    const articulos = useMemo(() => [...(orden?.componentes || [])].sort((a, b) =>
        (a.descripcion || '').localeCompare(b.descripcion || '', 'es', { sensitivity: 'base', numeric: true }) || a.id - b.id), [orden])
    const porGrupo = useMemo(() => {
        const m: Record<Grupo, ComponenteSap[]> = { acc: [], mp: [], mo: [] }
        articulos.forEach(c => m[grupoDe(c)].push(c))
        return m
    }, [articulos])

    const gelcoatCalc = useMemo(() => {
        if (orden?.gelcoatTeorico != null && Number(orden.gelcoatTeorico) > 0) {
            return Number(orden.gelcoatTeorico)
        }
        if (!orden?.componentes) return null
        const gelLines = orden.componentes.filter(c => {
            const d = sinTildes(c.descripcion || '')
            const no = (c.no || '').toUpperCase()
            return d.includes('GELCOAT') || d.includes('GEL COAT') || no.startsWith('PGEL')
        })
        if (gelLines.length > 0) {
            const sum = gelLines.reduce((acc, c) => acc + (Number(c.cantRequerida) || Number(c.cantBase) || 0), 0)
            return sum > 0 ? Number(sum.toFixed(3)) : null
        }
        return null
    }, [orden])

    // Masa teórica = resina de vaciado (bañera + faldón) calculada por la API; si no hay bloques de vaciado queda "—"
    const masaCalc = orden?.masaTeorica != null && Number(orden.masaTeorica) > 0 ? Number(orden.masaTeorica) : null
    const detalleVaciado = (orden?.vaciado || []).map(p => `${p.pieza}: ${num(p.resinaKg)} Kg ${p.resinaTipo}${p.gelcoatKg != null ? ` · gelcoat ${num(p.gelcoatKg)}` : ''}`).join('\n')

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            // Clic por fuera cierra: se cierra al soltar (click) para que el clic no caiga en la tarjeta de atrás,
            // y solo si también se presionó en el fondo (arrastrar texto desde adentro no la cierra)
            onMouseDown={e => { fondoPresionado.current = e.target === e.currentTarget }}
            onClick={e => { if (e.target === e.currentTarget && fondoPresionado.current) onClose(); fondoPresionado.current = false }}>
            {/* Encabezado, datos y pestañas fijos; solo el contenido se desplaza */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-[1600px] min-h-[80vh] h-[96vh] overflow-hidden flex flex-col gap-3 relative">
                {/* Encabezado */}
                <div className="flex flex-wrap items-start justify-between gap-3 shrink-0 pr-9">
                    {/* Mismo encabezado de la tarjeta de orden FV: OF y Pedido | descripción y SKU; debajo las fechas del Semáforo */}
                    <div className="min-w-0 flex-1 max-w-[760px]">
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 items-start">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1 text-[#324354]">
                                    <Clipboard size={18} className="shrink-0" />
                                    <h2 className="text-lg font-black text-[#324354] whitespace-nowrap">OF: {ordenFabricacion}</h2>
                                </div>
                                <div className="text-xs font-bold text-[#7B8E90] whitespace-nowrap mt-0.5">Pedido: {orden?.pedidoVinculado || 'Sin pedido'}</div>
                            </div>
                            <div className="min-w-0 pl-3 border-l border-[#e2ded5]">
                                <div className="text-lg font-black text-[#324354] leading-tight uppercase break-words">
                                    {orden?.descripcionProducto || (cargando ? 'Consultando…' : 'Sin descripción')}
                                </div>
                                <div className="text-[11px] font-semibold text-[#7B8E90] mt-0.5 select-text">SKU: {orden?.noProducto || '—'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md whitespace-nowrap">Detalle de la orden · SAP</span>
                        {consultadoAt && (
                            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap" title="Fecha de la última consulta a SAP de esta orden">
                                {actualizando ? 'Actualizando desde SAP…' : `Datos de SAP del ${new Date(consultadoAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                        )}
                        <button onClick={() => setRecarga(n => n + 1)} disabled={cargando || actualizando}
                            title="Consultar de nuevo en SAP" aria-label="Consultar de nuevo en SAP"
                            className="p-1.5 rounded-lg bg-white border border-slate-300 text-[#324354] hover:bg-[#F6F3EE] disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${cargando || actualizando ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {/* Cerrar: X en la esquina superior derecha (también cierra con clic por fuera y con Escape) */}
                    <button onClick={onClose} title="Cerrar (Esc)" aria-label="Cerrar"
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-[#7B8E90] hover:text-[#324354] hover:bg-[#F6F3EE] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Fechas del Semáforo y datos de la orden en la misma fila, alineados */}
                {(orden || (fechasSem && (fechasSem.realLib || fechasSem.lote || fechasSem.idealW))) && (
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 shrink-0">
                        {fechasSem && (fechasSem.realLib || fechasSem.lote || fechasSem.idealW) && (
                            <div className="grid grid-cols-3 gap-3 shrink-0 w-full lg:w-[460px]"
                                    title={fechasSem.actualizadas ? `Fechas del Semáforo traídas el ${new Date(fechasSem.actualizadas).toLocaleString('es-CO')}` : undefined}>
                                    {([
                                        { nombre: 'Liberación', valor: fechasSem.realLib, tono: '#7B8E90', ayuda: 'Real Liberación · columna O del Semáforo' },
                                        { nombre: 'Prometida Cliente', valor: fechasSem.lote, tono: '#deb841', atrasada: !!fechasSem.lote && fechasSem.lote < hoyIso, ayuda: 'Fecha Entrega Lote · columna T del Semáforo (en rojo si ya pasó)' },
                                        { nombre: 'Nivel de Servicio', valor: fechasSem.idealW, tono: '#59a96a', ayuda: 'Fecha Ideal Entrega Producción [NS] · columna W del Semáforo' }
                                    ] as { nombre: string; valor?: string | null; tono: string; atrasada?: boolean; ayuda: string }[]).map(fe => (
                                        <div key={fe.nombre} title={fe.ayuda} className="pl-2 border-l-[3px]" style={{ borderLeftColor: fe.atrasada ? '#d14747' : fe.tono }}>
                                            <div className={`text-[9px] leading-3 font-bold uppercase ${fe.atrasada ? 'text-[#d14747]' : 'text-[#7B8E90]'}`}>{fe.nombre}</div>
                                            <div className={`text-sm leading-5 font-black ${fe.atrasada ? 'text-[#d14747]' : 'text-[#324354]'}`}>{fechaCorta(fe.valor)}</div>
                                        </div>
                                    ))}
                                </div>
                        )}
                        {orden && (
                            // items-end: si Cantidad Resina / Gelcoat necesitan 2 renglones (bañera y faldón), crecen hacia arriba, no empujan la tabla
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 min-w-0 items-end">
                                {[
                                    ['Estado', orden.estado],
                                    ['Cant. planificada', num(orden.cantPlanificada)],
                                    ['Cant. completada', num(orden.cantCompletada)]
                                ].map(([label, valor]) => (
                                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
                                        <div className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap truncate">{label}</div>
                                        <div className={`text-sm font-black truncate ${label === 'Estado' && valor === 'Cancelado' ? 'text-red-600' : 'text-[#324354]'}`} title={String(valor)}>{valor}</div>
                                    </div>
                                ))}
                                {([
                                    { label: 'Cantidad Resina', total: masaCalc, piezas: (orden.vaciado || []).map(p => ({ pieza: p.pieza, kg: p.resinaKg, extra: p.resinaTipo })) },
                                    { label: 'Gelcoat teórico', total: gelcoatCalc, piezas: (orden.vaciado || []).filter(p => p.gelcoatKg != null).map(p => ({ pieza: p.pieza, kg: p.gelcoatKg as number, extra: '' })) }
                                ]).map(({ label, total, piezas }) => {
                                    const varias = piezas.length > 1
                                    return (
                                        <div key={label} title={label === 'Cantidad Resina' && detalleVaciado ? detalleVaciado : undefined}
                                            className={`bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0 ${varias ? '-mt-[18px]' : ''}`}>
                                            <div className="flex items-baseline justify-between gap-1">
                                                <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap truncate">{label}</span>
                                                {varias && total != null && <span className="text-[11px] font-black text-emerald-700 whitespace-nowrap">{num(total)} Kg</span>}
                                            </div>
                                            {total == null ? (
                                                <div className="text-sm font-black text-[#324354]">—</div>
                                            ) : varias ? (
                                                // Un renglón por pieza: Bañera / Faldón con sus kilos (y tipo de resina)
                                                piezas.map(p => (
                                                    <div key={p.pieza} className="text-[12px] leading-[17px] font-bold text-emerald-700 whitespace-nowrap truncate">
                                                        <span className="text-slate-500 font-semibold">{p.pieza}</span> {num(p.kg)} Kg{p.extra ? <span className="text-[#7B8E90]"> · {p.extra}</span> : null}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-sm font-black text-emerald-700 truncate">
                                                    {num(total)} Kg{piezas[0]?.extra ? <span className="text-[#7B8E90] font-bold"> · {piezas[0].extra}</span> : null}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {avisoCopia && (
                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg flex items-start gap-2 shrink-0" role="alert">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" /> <span>{avisoCopia}</span>
                    </div>
                )}

                {orden && orden.faltantes?.length > 0 && (
                    <div className="px-3 py-2 bg-red-50 border border-red-400 text-red-800 text-xs font-semibold rounded-lg flex items-start gap-2 shrink-0" role="alert">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>SAP no entregó o no se reconoce: {orden.faltantes.join(' · ')}. Verifique en SAP antes de usar estos datos.</span>
                    </div>
                )}

                {/* Pestañas */}
                <div className="flex items-center gap-2 border-b border-[#e2ded5] pb-2 shrink-0">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0">
                        {pestanas.map(p => {
                            const Icono = p.icon
                            const activa = pestana === p.id
                            return (
                                <button key={p.id} onClick={() => !p.pronto && setPestana(p.id)} disabled={p.pronto}
                                    title={p.pronto ? 'Disponible pronto' : p.label}
                                    className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${activa ? 'bg-[#324354] text-white shadow-md' : p.pronto ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                    <Icono size={14} /> <span>{p.label}{p.pronto ? ' · pronto' : ''}</span>
                                    {p.id === 'ldm' && orden && <span className={`ml-1 px-1.5 rounded text-[10px] ${activa ? 'bg-white/20' : 'bg-slate-200'}`}>{articulos.length}</span>}
                                </button>
                            )
                        })}
                    </div>
                    {/* Vista de la lista de materiales: completa o por grupos */}
                    {orden && pestana === 'ldm' && articulos.length > 0 && (
                        <div className="ml-auto flex -space-x-px shrink-0">
                            {([['lista', 'Lista', List], ['grupos', 'Por grupos', Layers]] as const).map(([id, label, Icono], i) => (
                                <button key={id} onClick={() => setVista(id)} title={id === 'grupos' ? 'Accesorios y Equipos · Materias Primas Pesadas · Mano de Obra' : 'Lista completa'}
                                    className={`flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold border whitespace-nowrap ${i === 0 ? 'rounded-l-lg' : 'rounded-r-lg'} ${vista === id ? 'bg-[#324354] text-white border-[#324354]' : 'bg-white text-[#324354] border-slate-300 hover:bg-slate-50'}`}>
                                    <Icono size={14} /> {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contenido (única zona con desplazamiento) */}
                <div className="flex-1 min-h-0 overflow-auto">
                    {piso && pestana === 'trazabilidad' ? (
                        piso.contenido
                    ) : pestana === 'traslados' ? (
                        <TrasladosOrden ordenFabricacion={ordenFabricacion} />
                    ) : pestana === 'sap' ? (
                        // Consulta SAP incrustada (misma visualización del módulo), ocupa todo el contenido
                        <iframe title={`Vista SAP OF ${ordenFabricacion}`} src={`/consulta-sap?embed=1&of=${encodeURIComponent(String(ordenFabricacion).trim())}`}
                            className="w-full h-full min-h-[480px] rounded-xl border border-[#e2ded5] bg-[#F6F3EE]" />
                    ) : cargando ? (
                        <div className="h-full min-h-[200px] flex items-center justify-center gap-2 text-slate-500 font-bold text-sm">
                            <Loader2 className="w-5 h-5 animate-spin" /> Consultando la orden en SAP...
                        </div>
                    ) : error ? (
                        <div className="px-4 py-6 bg-red-50 border border-red-400 text-red-800 text-sm font-bold rounded-xl flex items-center gap-2" role="alert">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" /> {error}
                        </div>
                    ) : orden && pestana === 'ldm' ? (
                        articulos.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-bold italic bg-slate-50 rounded-xl border border-slate-200">SAP no devolvió componentes para esta orden</div>
                        ) : vista === 'lista' ? (
                            <div className="rounded-xl border border-slate-200">
                                <TablaComponentes filas={articulos} />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {GRUPOS.map(g => (
                                    <section key={g.id} className={`rounded-xl border border-slate-200 border-l-4 ${g.color}`}>
                                        <div className="flex items-center justify-between px-3 py-2 bg-[#F6F3EE] rounded-tr-xl">
                                            <h3 className="text-sm font-black text-[#324354]">{g.label}</h3>
                                            <span className="text-[11px] font-bold text-slate-500">{porGrupo[g.id].length} artículo(s)</span>
                                        </div>
                                        {porGrupo[g.id].length === 0 ? (
                                            <div className="px-3 py-3 text-xs italic text-slate-400">Sin artículos en este grupo</div>
                                        ) : (
                                            <TablaComponentes filas={porGrupo[g.id]} />
                                        )}
                                    </section>
                                ))}
                                <p className="text-[10px] text-slate-400 italic">Grupos asignados por la descripción del artículo (SAP no trae esta clasificación).</p>
                            </div>
                        )
                    ) : orden && pestana === 'comentarios' ? (
                        <div className="p-4 bg-[#F6F3EE] border border-[#e2ded5] rounded-xl text-sm text-slate-800 whitespace-pre-wrap select-text min-h-[120px]">
                            {orden.comentarios || <span className="italic text-slate-400">La orden no tiene comentarios en SAP</span>}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
