'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion } from '@/types/pintura'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { moverPiezasOrdenFibra, DestinoMovimientoFv } from '@/lib/supabase/queries/fibra_administracion'
import { toast } from 'sonner'
import { Map as MapaIcon, RefreshCw, AlertTriangle, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Search, X } from 'lucide-react'

// Mapa de procesos FV, dibujado con las proporciones del layout de la planta:
// en cada proceso, cuántas OF tienen piezas ahí y cuáles (clic abre el detalle SAP; clic sostenido y arrastrar mueve la OF a otro proceso).

type TipoProceso = 'notificacion' | 'sin-notificacion' | 'espera' | 'virtual'
type Caja = [x1: number, y1: number, x2: number, y2: number]
type Proceso = {
    id: string
    label: string
    sub?: string
    // Procesos unificados en un solo rectángulo: cada nombre conserva su espacio (en columnas o en filas)
    nombres?: string[]
    enColumnas?: boolean
    aislado?: boolean  // proceso que aún no está en el flujo
    sinContador?: boolean  // solo se dibuja el proceso, sin contador de OF ni mensajes
    tipo: TipoProceso
    etapas: string[]   // campos de ordenes_fabricacion_fv que suman en este proceso ([] = sin registro en la app)
    caja: Caja         // posición en el plano del layout (px de la imagen de referencia)
    estados?: string[] // estados de trazabilidad_fv de las piezas en este proceso (permite arrastrar sus OF)
    destino?: DestinoMovimientoFv  // se pueden soltar OF aquí (movimiento manual)
}

// Plano de referencia (imagen "LAYOUT FV"): todo se ubica en % de este rectángulo
const X0 = 0, Y0 = 70, ANCHO = 1340, ALTO = 690
const pos = ([x1, y1, x2, y2]: Caja): React.CSSProperties => ({
    left: `${((x1 - X0) / ANCHO) * 100}%`,
    top: `${((y1 - Y0) / ALTO) * 100}%`,
    width: `${((x2 - x1) / ANCHO) * 100}%`,
    height: `${((y2 - y1) / ALTO) * 100}%`
})
const punto = (x: number, y: number): React.CSSProperties => ({
    left: `${((x - X0) / ANCHO) * 100}%`,
    top: `${((y - Y0) / ALTO) * 100}%`
})

const PROCESOS: Proceso[] = [
    { id: 'vaciado', label: 'Vaciado', tipo: 'notificacion', etapas: ['vaciado'], estados: ['Vaciado'], caja: [693, 81, 885, 244] },
    { id: 'curado', label: 'Zona Curado', sinContador: true, tipo: 'espera', etapas: [], caja: [898, 81, 1160, 318] },
    { id: 'pintura', label: 'Pintura', tipo: 'notificacion', etapas: ['pintura'], estados: ['Pintura'], caja: [1173, 83, 1330, 200] },
    { id: 'huacales', label: 'Huacales', tipo: 'notificacion', etapas: ['empaque'], estados: ['Guacales', 'Empaque'], destino: 'huacales', caja: [218, 450, 328, 641] },
    { id: 'acabado2', label: 'Acabado 2', sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [336, 450, 435, 641] },
    { id: 'ensayo', label: 'Ensayo', tipo: 'notificacion', etapas: ['acabado'], estados: ['Ensayo', 'Acabado'], destino: 'ensayo', caja: [439, 450, 548, 641] },
    { id: 'ensamble', label: 'Ensamble 2 · Ensamble 1 · Acabado', nombres: ['Ensamble 2', 'Ensamble 1', 'Acabado'], enColumnas: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [556, 450, 885, 641] },
    { id: 'pulido', label: 'Pulido', tipo: 'notificacion', etapas: ['pulido'], estados: ['Pulido'], destino: 'pulido', caja: [911, 450, 1059, 641] },
    { id: 'nivelacion', label: 'Desmolde · Herrajes · Nivelación', nombres: ['Desmolde', 'Herrajes', 'Nivelación'], sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1067, 450, 1173, 641] },
    { id: 'reparacion', label: 'Reparación', tipo: 'sin-notificacion', etapas: ['reparacion', 'reparacion_larga'], estados: ['Reparacion', 'Reparacion Larga', 'Reparacion larga', 'ReparacionLarga'], destino: 'reparacion', caja: [336, 650, 435, 747] },
    { id: 'soldadura', label: 'Soldadura', aislado: true, sinContador: true, tipo: 'sin-notificacion', etapas: [], caja: [1067, 660, 1173, 752] },
    // Pasos virtuales (no son procesos físicos): Programado → Pintura … Huacales → Digitado → Tránsito → CEDI
    { id: 'programado', label: 'Programado', sub: 'Pendiente por pintar', tipo: 'virtual', etapas: ['programado'], caja: [1183, 236, 1338, 641] },
    { id: 'digitado', label: 'Digitado', tipo: 'virtual', etapas: ['digitado'], estados: ['Digitado'], destino: 'digitado', caja: [10, 495, 212, 641] },
    { id: 'transito', label: 'Tránsito', tipo: 'virtual', etapas: ['transito'], estados: ['Transito'], destino: 'transito', caja: [10, 295, 340, 430] },
    { id: 'cedi', label: 'CEDI', tipo: 'virtual', etapas: ['cedi'], estados: ['Cedi'], destino: 'cedi', caja: [10, 115, 340, 255] }
]

// Flechas de flujo (centro en px del plano)
const FLECHAS: { x: number; y: number; dir: 'izq' | 'der' | 'arriba' | 'abajo' }[] = [
    { x: 891, y: 140, dir: 'izq' }, { x: 891, y: 196, dir: 'der' },        // Zona Curado ⇄ Vaciado
    { x: 1166, y: 196, dir: 'izq' },                                       // Pintura → Zona Curado
    { x: 1255, y: 220, dir: 'arriba' },                                    // Programado → Pintura
    { x: 1134, y: 438, dir: 'abajo' },                                     // Zona Curado → Desmolde · Herrajes · Nivelación
    ...[1063, 898, 552, 437, 332].map(x => ({ x, y: 620, dir: 'izq' as const })),
    { x: 215, y: 568, dir: 'izq' },                                        // Huacales → Digitado
    { x: 111, y: 462, dir: 'arriba' }, { x: 111, y: 275, dir: 'arriba' },  // Digitado → Tránsito → CEDI
    { x: 375, y: 646, dir: 'arriba' }, { x: 396, y: 646, dir: 'abajo' }    // Acabado 2 ⇄ Reparación
]
const ICONO_FLECHA = { izq: ArrowLeft, der: ArrowRight, arriba: ArrowUp, abajo: ArrowDown }

// Colores del layout: amarillo = punto de notificación, azul = sin notificación, gris = espera
const ESTILO: Record<TipoProceso, { caja: string; chip: string; badge: string; label: string }> = {
    'notificacion': { caja: 'bg-[#FFC000] border-[#d9a400] text-[#25323f]', chip: 'bg-white/85 text-[#25323f] hover:bg-white', badge: 'bg-[#25323f] text-white', label: 'Punto de notificación' },
    'sin-notificacion': { caja: 'bg-[#4472C4] border-[#2f5597] text-white', chip: 'bg-white/20 text-white hover:bg-white/35', badge: 'bg-white text-[#2f5597]', label: 'Proceso sin notificación' },
    'espera': { caja: 'bg-[#d9d9d9] border-[#bfbfbf] text-[#25323f]', chip: 'bg-white/85 text-[#25323f] hover:bg-white', badge: 'bg-[#25323f] text-white', label: 'Tiempo de espera' },
    'virtual': { caja: 'bg-white border-dashed border-slate-400 text-[#25323f]', chip: 'bg-slate-100 text-[#25323f] hover:bg-slate-200', badge: 'bg-[#25323f] text-white', label: 'Paso virtual' }
}

type OfEnProceso = { of: string; ordenId: number; piezas: number; nombre: string; descripcion: string }
type Arrastre = { x: OfEnProceso; origen: Proceso }

// Nombre corto de la bañera ("HIDROMASAJE HONOLULU DERECHA 180X120 BLANCO" → "Honolulu"):
// primera palabra de la descripción que no sea genérica, medida, color ni lado
const PALABRAS_GENERICAS = new Set([
    'HIDROMASAJE', 'HIDRO', 'HIDROAERO', 'AERO', 'AEROMASAJE', 'BAÑERA', 'BANERA', 'BAÑO', 'BANO', 'TINA', 'JACUZZI', 'SPA', 'DUCHA', 'PLATO',
    'RECEPTACULO', 'RECEPTÁCULO', 'MUEBLE', 'LAVAMANOS', 'LAVAPLATOS', 'LAVADERO', 'SEMI', 'SEMIEMPOTRADA',
    'EMPOTRAR', 'EMPOTRADA', 'EXENTA', 'ESQUINERA', 'CORNER', 'OVALADA', 'RECTANGULAR', 'REDONDA', 'KIT',
    'MOD', 'MODELO', 'NUEVA', 'NUEVO', 'PARA', 'CON', 'SIN', 'DEL', 'LAS', 'LOS',
    'DERECHA', 'IZQUIERDA', 'DER', 'IZQ', 'BLANCO', 'BLANCA', 'NEGRO', 'NEGRA', 'GRIS', 'BONE', 'BEIGE'
])
const nombreCorto = (descripcion?: string | null) => {
    const palabras = (descripcion || '').toUpperCase().split(/[^A-ZÁÉÍÓÚÜÑ0-9]+/).filter(Boolean)
    const nombre = palabras.find(p => p.length >= 3 && !/\d/.test(p) && !PALABRAS_GENERICAS.has(p)) || palabras[0] || ''
    return nombre ? nombre.charAt(0) + nombre.slice(1).toLocaleLowerCase('es') : ''
}

export default function MapaProcesosFibraModule() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [detalleOf, setDetalleOf] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [arrastre, setArrastre] = useState<Arrastre | null>(null)
    const [sobre, setSobre] = useState<string | null>(null)
    const [moviendo, setMoviendo] = useState(false)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        const { data, error } = await supabase.from('ordenes_fabricacion_fv').select('*')
        if (error) {
            setError(`No se pudieron cargar las órdenes: ${error.message}`)
            setOrdenes([])
        } else {
            setOrdenes(data || [])
        }
        setCargando(false)
    }

    useEffect(() => { cargar() }, [])

    // OF por proceso (una OF cuenta en un proceso si tiene al menos una pieza ahí)
    const porProceso = useMemo(() => {
        const m: Record<string, OfEnProceso[]> = {}
        const otros: Record<string, number> = { saldo: 0, destruccion: 0 }
        for (const p of PROCESOS) m[p.id] = []
        for (const o of ordenes) {
            const { piezas } = piezasPorEtapa(o)
            for (const p of PROCESOS) {
                const n = p.etapas.reduce((s, e) => s + (piezas[e] || 0), 0)
                if (n > 0) m[p.id].push({ of: String(o.orden_fabricacion ?? ''), ordenId: o.id, piezas: n, nombre: nombreCorto(o.producto_descripcion), descripcion: o.producto_descripcion || '' })
            }
            for (const k of Object.keys(otros)) if ((piezas[k] || 0) > 0) otros[k]++
        }
        for (const id of Object.keys(m)) m[id].sort((a, b) => a.of.localeCompare(b.of, 'es', { numeric: true }))
        return { m, otros }
    }, [ordenes])

    // Buscador: resalta en verde las OF cuyo número o descripción contienen el texto
    const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const termino = sinTildes(busqueda.trim())
    const coincide = (x: OfEnProceso) => termino !== '' && (x.of.includes(termino) || sinTildes(x.descripcion).includes(termino))
    const coincidencias = useMemo(() => {
        if (!termino) return 0
        const ofs = new Set<string>()
        for (const lista of Object.values(porProceso.m)) for (const x of lista) if (coincide(x)) ofs.add(x.of)
        return ofs.size
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [porProceso, termino])

    // Movimiento manual: soltar una OF en otro proceso pasa sus piezas a ese estado y lo registra en la trazabilidad
    const puedeSoltar = (p: Proceso) => !!arrastre && !!p.destino && p.id !== arrastre.origen.id
    const soltar = async (p: Proceso) => {
        const a = arrastre
        setArrastre(null)
        setSobre(null)
        if (!a || !p.destino || p.id === a.origen.id || !a.origen.estados) return
        if (!confirm(`¿Mover la OF ${a.x.of} (${a.x.nombre}) de ${a.origen.label} a ${p.label}?

Se moverán sus ${a.x.piezas} pieza(s) y quedará registrado en la trazabilidad con su usuario y la hora.`)) return
        setMoviendo(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('No hay una sesión activa. Inicie sesión para mover órdenes.')
            const n = await moverPiezasOrdenFibra(a.x.ordenId, a.origen.estados, p.destino, user.email)
            toast.success(`OF ${a.x.of}: ${n} pieza(s) movida(s) de ${a.origen.label} a ${p.label}`)
            await cargar()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setMoviendo(false)
        }
    }

    const caja = (p: Proceso) => {
        const estilo = ESTILO[p.tipo]
        const lista = porProceso.m[p.id]
        const sinCampo = p.etapas.length === 0
        const piezas = lista.reduce((s, x) => s + x.piezas, 0)
        const destinoValido = puedeSoltar(p)
        return (
            <div key={p.id} style={pos(p.caja)}
                title={p.aislado ? `${p.label}: fuera del flujo, no afecta a ningún proceso` : undefined}
                onDragOver={destinoValido ? (e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== p.id) setSobre(p.id) }) : undefined}
                onDragLeave={destinoValido ? (e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null) }) : undefined}
                onDrop={destinoValido ? (e => { e.preventDefault(); soltar(p) }) : undefined}
                className={`absolute rounded border-2 px-1.5 py-1 flex flex-col overflow-hidden transition-shadow ${estilo.caja} ${p.aislado ? 'opacity-60 border-dashed' : ''} ${destinoValido ? (sobre === p.id ? 'ring-4 ring-[#59a96a] z-10' : 'ring-2 ring-[#59a96a]/60') : ''} ${arrastre && !destinoValido && arrastre.origen.id !== p.id ? 'opacity-50' : ''}`}>
                {p.nombres && (
                    // Procesos unificados: cada nombre en su propio espacio, separados por líneas
                    <div className={p.enColumnas ? 'grid divide-x divide-white/40' : 'flex flex-col divide-y divide-white/40'}
                        style={p.enColumnas ? { gridTemplateColumns: `repeat(${p.nombres.length}, minmax(0, 1fr))` } : undefined}>
                        {p.nombres.map(n => (
                            <span key={n} className={`text-[11px] font-black leading-tight ${p.enColumnas ? 'px-1.5 first:pl-0' : 'py-1 first:pt-0'}`}>{n}</span>
                        ))}
                    </div>
                )}
                <div className={`flex items-start justify-between gap-1 ${p.nombres ? 'mt-1' : ''}`}>
                    {!p.nombres && <span className="text-[11px] font-black leading-tight">{p.label}{p.sub && <span className="block text-[9px] font-semibold italic opacity-80">{p.sub}</span>}</span>}
                    {!sinCampo && !p.sinContador && (
                        <span className={`ml-auto shrink-0 text-[9px] font-black px-1 rounded leading-4 ${estilo.badge}`}
                            title={`${lista.length} orden(es) · ${piezas} pieza(s)`}>
                            {lista.length} OF
                        </span>
                    )}
                </div>
                {p.sinContador ? null : sinCampo ? (
                    <div className="mt-auto text-[9px] italic opacity-80 leading-tight">Sin registro en la app</div>
                ) : (
                    <>
                        {p.tipo !== 'virtual' && <div className="text-[9px] font-bold opacity-80 leading-tight">{piezas} pieza(s)</div>}
                        <div className="mt-0.5 flex flex-wrap gap-0.5 content-start overflow-y-auto overflow-x-hidden min-h-0 flex-1">
                            {lista.map(x => (
                                <button key={x.of} onClick={() => setDetalleOf(x.of)}
                                    draggable={!!p.estados && !moviendo}
                                    onDragStart={p.estados ? (e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.of); setArrastre({ x, origen: p }) }) : undefined}
                                    onDragEnd={() => { setArrastre(null); setSobre(null) }}
                                    title={`OF ${x.of} · ${x.descripcion || 'sin descripción'} · ${x.piezas} pieza(s) · clic para ver el detalle SAP${p.estados ? ' · clic sostenido y arrastrar para moverla a otro proceso' : ''}`}
                                    className={`max-w-full flex items-baseline gap-0.5 text-[9px] font-bold px-1 rounded leading-[14px] whitespace-nowrap ${p.estados ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastre?.x.of === x.of && arrastre.origen.id === p.id ? 'opacity-40' : ''} ${coincide(x) ? 'bg-[#59a96a] text-white ring-2 ring-[#3b8f50]' : estilo.chip}`}>
                                    {x.nombre && <span className="truncate min-w-0">{x.nombre}</span>}
                                    <span className="font-mono shrink-0">{x.of.slice(-4)}</span>
                                    {x.piezas > 1 && <sup className="shrink-0 text-[7px]">×{x.piezas}</sup>}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40 overflow-hidden">
            {/* Barra superior */}
            <div className="bg-white border-b border-[#e2ded5] px-3 py-1.5 shrink-0">
                <div className="flex flex-wrap min-[1200px]:flex-nowrap items-center gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1.5 text-[#324354]">
                        <MapaIcon className="w-4 h-4" />
                        <h2 className="text-sm font-black whitespace-nowrap">Mapa de procesos FV</h2>
                    </div>
                    <div className="flex flex-wrap min-[1200px]:flex-nowrap items-center gap-2.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                        {(Object.keys(ESTILO) as TipoProceso[]).map(t => (
                            <span key={t} className="flex items-center gap-1">
                                <span className={`w-3 h-3 rounded-sm border ${ESTILO[t].caja}`} /> {ESTILO[t].label}
                            </span>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500 whitespace-nowrap">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar OF o descripción"
                                className="h-7 w-48 2xl:w-64 pl-7 pr-6 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-[#324354] outline-none focus:ring-2 focus:ring-[#59a96a]" />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')} title="Borrar búsqueda"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                        {termino && (
                            <span className={`px-1.5 py-0.5 rounded font-bold ${coincidencias ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {coincidencias} OF
                            </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">Saldo <b className="text-[#324354]">{porProceso.otros.saldo} OF</b></span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">Destrucción <b className="text-[#324354]">{porProceso.otros.destruccion} OF</b></span>
                        <button onClick={cargar} disabled={cargando}
                            className="h-7 w-7 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar">
                            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Plano: ocupa todo el ancho y el alto disponibles (las cajas se estiran a lo ancho) */}
            <div className="flex-1 overflow-auto p-2 sm:p-3">
                {error ? (
                    <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2" role="alert"><AlertTriangle size={18} /> {error}</div>
                ) : cargando && ordenes.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-[#e2ded5]">Cargando órdenes...</div>
                ) : (
                    <div className="w-full bg-white rounded-xl border border-[#e2ded5] shadow-sm p-2 min-w-[900px]">
                        <div className="relative w-full h-[max(520px,calc(100vh-8rem))]">
                            {PROCESOS.map(caja)}

                            {/* Zona Curado → Desmolde · Herrajes · Nivelación */}
                            <div className="absolute w-[3px] bg-[#00b050] -translate-x-1/2" style={{ ...punto(1134, 318), height: `${((432 - 318) / ALTO) * 100}%` }} />

                            {FLECHAS.map((f, i) => {
                                const Icono = ICONO_FLECHA[f.dir]
                                return <Icono key={i} className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 text-[#00b050] pointer-events-none" strokeWidth={3} style={punto(f.x, f.y)} />
                            })}
                        </div>
                    </div>
                )}
            </div>

            {detalleOf != null && <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)} />}
        </div>
    )
}
