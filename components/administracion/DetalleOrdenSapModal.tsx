'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, Boxes, MessageSquareText, ArrowRightLeft, FileImage, Loader2, RefreshCw, AlertTriangle, List, Layers, Factory } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    componentes: ComponenteSap[]
    faltantes: string[]
}

type Pestana = 'piso' | 'ldm' | 'comentarios' | 'traslados' | 'planos'
type VistaLdm = 'lista' | 'grupos'

const PESTANAS: { id: Pestana; label: string; icon: React.ElementType; pronto?: boolean }[] = [
    { id: 'ldm', label: 'Lista de materiales', icon: Boxes },
    { id: 'comentarios', label: 'Comentarios', icon: MessageSquareText },
    { id: 'traslados', label: 'Traslados', icon: ArrowRightLeft, pronto: true },
    { id: 'planos', label: 'Planos', icon: FileImage, pronto: true }
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

function TablaComponentes({ filas }: { filas: ComponenteSap[] }) {
    return (
        <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#324354] text-white">
                <tr className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2 text-left">Tipo</th>
                    <th className="px-2 py-2 text-left">Nº artículo</th>
                    <th className="px-2 py-2 text-left">Descripción</th>
                    <th className="px-2 py-2 text-right">Cant. base</th>
                    <th className="px-2 py-2 text-right">Cant. requerida</th>
                    <th className="px-2 py-2 text-right">Consumido</th>
                    <th className="px-2 py-2 text-right">Pendiente</th>
                    <th className="px-2 py-2 text-center">UM</th>
                    <th className="px-2 py-2 text-center">Almacén</th>
                    <th className="px-2 py-2 text-left">Emisión</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filas.map(c => {
                    const req = Number(c.cantRequerida), cons = Number(c.consumido)
                    const pendiente = Number.isFinite(req) && Number.isFinite(cons) && c.cantRequerida !== '' && c.consumido !== '' ? req - cons : null
                    return (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 text-center text-slate-400 font-bold">{c.id}</td>
                            <td className="px-2 py-1.5 text-slate-600">{c.tipo}</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-[#324354] whitespace-nowrap select-text">{c.no}</td>
                            <td className="px-2 py-1.5 font-semibold text-slate-800 select-text">{c.descripcion}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{num(c.cantBase)}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold">{num(c.cantRequerida)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{num(c.consumido)}</td>
                            <td className={`px-2 py-1.5 text-right font-mono font-bold ${pendiente != null && pendiente > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{pendiente != null ? num(pendiente) : ''}</td>
                            <td className="px-2 py-1.5 text-center">{c.unidadMedida}</td>
                            <td className="px-2 py-1.5 text-center font-mono">{c.almacen}</td>
                            <td className="px-2 py-1.5 text-slate-600">{c.metodoEmision}</td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

// `piso` (opcional): primera pestaña con la información de la orden en el control de piso (tarjeta y procesos por pieza)
export default function DetalleOrdenSapModal({ ordenFabricacion, onClose, piso }: {
    ordenFabricacion: string | number
    onClose: () => void
    piso?: { label: string; contenido: React.ReactNode }
}) {
    const [pestana, setPestana] = useState<Pestana>(piso ? 'piso' : 'ldm')
    const pestanas: typeof PESTANAS = piso ? [{ id: 'piso', label: piso.label, icon: Factory }, ...PESTANAS] : PESTANAS
    const [vista, setVista] = useState<VistaLdm>('lista')
    const [orden, setOrden] = useState<OrdenSap | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cargando, setCargando] = useState(true)
    const [recarga, setRecarga] = useState(0)

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

    const masaCalc = useMemo(() => {
        if (orden?.masaTeorica != null && Number(orden.masaTeorica) > 0) {
            return Number(orden.masaTeorica)
        }
        if (!orden?.componentes) return null
        const mpLines = orden.componentes.filter(c => {
            const d = sinTildes(c.descripcion || '')
            if (RE_MANO_OBRA.test(d)) return false
            return RE_MATERIA_PESADA.test(d)
        })
        if (mpLines.length > 0) {
            const sum = mpLines.reduce((acc, c) => acc + (Number(c.cantRequerida) || Number(c.cantBase) || 0), 0)
            return sum > 0 ? Number(sum.toFixed(2)) : null
        }
        return null
    }, [orden])

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            {/* Encabezado, datos y pestañas fijos; solo el contenido se desplaza */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl min-h-[80vh] h-[94vh] overflow-hidden flex flex-col gap-3">
                {/* Encabezado */}
                <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Detalle de la orden · SAP</span>
                        <h2 className="text-xl font-black text-[#324354] mt-2">OF {ordenFabricacion}</h2>
                        {orden && (
                            <p className="text-sm font-bold text-slate-700 break-words">{orden.noProducto} · {orden.descripcionProducto}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {consultadoAt && (
                            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap" title="Fecha de la última consulta a SAP de esta orden">
                                {actualizando ? 'Actualizando desde SAP…' : `Datos de SAP del ${new Date(consultadoAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                        )}
                        <button onClick={() => setRecarga(n => n + 1)} disabled={cargando || actualizando}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${cargando || actualizando ? 'animate-spin' : ''}`} /> Consultar de nuevo
                        </button>
                        <button onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153]">
                            <X className="w-3.5 h-3.5" /> Cerrar
                        </button>
                    </div>
                </div>

                {/* Datos generales */}
                {orden && (
                    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 shrink-0">
                        {[
                            ['Estado', orden.estado],
                            ['Tipo', orden.tipo],
                            ['Cant. planificada', num(orden.cantPlanificada)],
                            ['Cant. completada', num(orden.cantCompletada)],
                            ['Almacén', orden.almacen],
                            ['Inicio / Fin', `${orden.fechaInicio} – ${orden.fechaFinalizacion}`],
                            ['Pedido vinculado', orden.pedidoVinculado || '—'],
                            ['Masa teórica', masaCalc != null ? `${num(masaCalc)} Kg` : '—'],
                            ['Gelcoat teórico', gelcoatCalc != null ? `${num(gelcoatCalc)} Kg` : '—']
                        ].map(([label, valor]) => (
                            <div key={label} className={`bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0 ${label === 'Inicio / Fin' ? 'col-span-2' : ''}`}>
                                <div className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">{label}</div>
                                <div className={`text-sm font-black truncate ${
                                    label === 'Estado' && valor === 'Cancelado'
                                        ? 'text-red-600'
                                        : label === 'Masa teórica' || label === 'Gelcoat teórico'
                                            ? 'text-emerald-700'
                                            : 'text-[#324354]'
                                }`} title={String(valor)}>{valor}</div>
                            </div>
                        ))}
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
                    {piso && pestana === 'piso' ? (
                        piso.contenido
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
