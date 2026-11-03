'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion } from '@/types/pintura'
import { piezasPorEtapa } from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import DetalleOrdenSapModal from '@/components/administracion/DetalleOrdenSapModal'
import { Map as MapaIcon, RefreshCw, AlertTriangle, ArrowLeft, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react'

// Mapa de procesos FV (solo consulta), dibujado con las proporciones del layout de la planta:
// en cada proceso, cuántas OF tienen piezas ahí y cuáles (últimos 4 dígitos; clic abre el detalle SAP).

type TipoProceso = 'notificacion' | 'sin-notificacion' | 'espera' | 'virtual'
type Caja = [x1: number, y1: number, x2: number, y2: number]
type Proceso = {
    id: string
    label: string
    sub?: string
    tipo: TipoProceso
    etapas: string[]   // campos de ordenes_fabricacion_fv que suman en este proceso ([] = sin registro en la app)
    caja: Caja         // posición en el plano del layout (px de la imagen de referencia)
}

// Plano de referencia (imagen "LAYOUT FV"): todo se ubica en % de este rectángulo
const X0 = 60, Y0 = 70, ANCHO = 1280, ALTO = 690
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
    { id: 'vaciado', label: 'Vaciado', tipo: 'notificacion', etapas: ['vaciado'], caja: [693, 81, 885, 244] },
    { id: 'curado', label: 'Zona Curado', tipo: 'espera', etapas: ['estanteria'], caja: [898, 81, 1160, 318] },
    { id: 'pintura', label: 'Pintura', tipo: 'notificacion', etapas: ['pintura'], caja: [1173, 83, 1330, 200] },
    { id: 'huacales', label: 'Huacales', tipo: 'notificacion', etapas: ['empaque'], caja: [218, 450, 328, 641] },
    { id: 'acabado2', label: 'Acabado 2', tipo: 'sin-notificacion', etapas: [], caja: [336, 450, 435, 641] },
    { id: 'ensayo', label: 'Ensayo', tipo: 'notificacion', etapas: [], caja: [439, 450, 548, 641] },
    { id: 'ensamble2', label: 'Ensamble 2', tipo: 'sin-notificacion', etapas: [], caja: [556, 450, 666, 641] },
    { id: 'ensamble1', label: 'Ensamble 1', tipo: 'sin-notificacion', etapas: [], caja: [670, 450, 779, 641] },
    { id: 'acabado1', label: 'Acabado 1', tipo: 'sin-notificacion', etapas: ['acabado'], caja: [782, 450, 885, 641] },
    { id: 'pulido', label: 'Pulido', tipo: 'notificacion', etapas: ['pulido'], caja: [911, 450, 1059, 641] },
    { id: 'nivelacion', label: 'Nivelación', tipo: 'sin-notificacion', etapas: [], caja: [1067, 450, 1173, 641] },
    { id: 'reparacion', label: 'Reparación', tipo: 'sin-notificacion', etapas: ['reparacion', 'reparacion_larga'], caja: [336, 650, 435, 747] },
    { id: 'soldadura', label: 'Soldadura', tipo: 'sin-notificacion', etapas: [], caja: [1067, 660, 1173, 752] },
    // Pasos virtuales (no son procesos físicos): Programado → Pintura … Huacales → Digitado → Tránsito → CEDI
    { id: 'programado', label: 'Programado', sub: 'Pendiente por pintar', tipo: 'virtual', etapas: ['programado'], caja: [1183, 236, 1338, 641] },
    { id: 'digitado', label: 'Digitado', tipo: 'virtual', etapas: ['digitado'], caja: [100, 545, 200, 605] },
    { id: 'transito', label: 'Tránsito', tipo: 'virtual', etapas: ['transito'], caja: [100, 405, 200, 465] },
    { id: 'cedi', label: 'CEDI', tipo: 'virtual', etapas: ['cedi'], caja: [100, 265, 200, 325] }
]

// Flechas de flujo (centro en px del plano)
const FLECHAS: { x: number; y: number; dir: 'izq' | 'der' | 'arriba' | 'abajo' }[] = [
    { x: 891, y: 140, dir: 'izq' }, { x: 891, y: 196, dir: 'der' },        // Zona Curado ⇄ Vaciado
    { x: 1166, y: 196, dir: 'izq' },                                       // Pintura → Zona Curado
    { x: 1255, y: 220, dir: 'arriba' },                                    // Programado → Pintura
    { x: 1134, y: 438, dir: 'abajo' },                                     // Zona Curado → Nivelación
    ...[1063, 898, 780, 668, 552, 437, 332].map(x => ({ x, y: 620, dir: 'izq' as const })),
    { x: 209, y: 575, dir: 'izq' },                                        // Huacales → Digitado
    { x: 150, y: 485, dir: 'arriba' }, { x: 150, y: 345, dir: 'arriba' },  // Digitado → Tránsito → CEDI
    { x: 1120, y: 651, dir: 'arriba' },                                    // Soldadura → Nivelación
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

type OfEnProceso = { of: string; piezas: number }

export default function MapaProcesosFibraModule() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hora, setHora] = useState('')
    const [detalleOf, setDetalleOf] = useState<string | null>(null)

    const cargar = async () => {
        setCargando(true)
        setError(null)
        const { data, error } = await supabase.from('ordenes_fabricacion_fv').select('*')
        if (error) {
            setError(`No se pudieron cargar las órdenes: ${error.message}`)
            setOrdenes([])
        } else {
            setOrdenes(data || [])
            setHora(new Date().toLocaleString('es-CO'))
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
                if (n > 0) m[p.id].push({ of: String(o.orden_fabricacion ?? ''), piezas: n })
            }
            for (const k of Object.keys(otros)) if ((piezas[k] || 0) > 0) otros[k]++
        }
        for (const id of Object.keys(m)) m[id].sort((a, b) => a.of.localeCompare(b.of, 'es', { numeric: true }))
        return { m, otros }
    }, [ordenes])

    const caja = (p: Proceso) => {
        const estilo = ESTILO[p.tipo]
        const lista = porProceso.m[p.id]
        const sinCampo = p.etapas.length === 0
        const piezas = lista.reduce((s, x) => s + x.piezas, 0)
        return (
            <div key={p.id} style={pos(p.caja)}
                className={`absolute rounded border-2 px-1.5 py-1 flex flex-col overflow-hidden ${estilo.caja}`}>
                <div className="flex items-start justify-between gap-1">
                    <span className="text-[11px] font-black leading-tight">{p.label}{p.sub && <span className="block text-[9px] font-semibold italic opacity-80">{p.sub}</span>}</span>
                    {!sinCampo && (
                        <span className={`shrink-0 text-[9px] font-black px-1 rounded leading-4 ${estilo.badge}`}
                            title={`${lista.length} orden(es) · ${piezas} pieza(s)`}>
                            {lista.length} OF
                        </span>
                    )}
                </div>
                {sinCampo ? (
                    <div className="mt-auto text-[9px] italic opacity-80 leading-tight">Sin registro en la app</div>
                ) : (
                    <>
                        {p.tipo !== 'virtual' && <div className="text-[9px] font-bold opacity-80 leading-tight">{piezas} pieza(s)</div>}
                        <div className="mt-0.5 flex flex-wrap gap-0.5 content-start overflow-y-auto min-h-0 flex-1">
                            {lista.map(x => (
                                <button key={x.of} onClick={() => setDetalleOf(x.of)}
                                    title={`OF ${x.of} · ${x.piezas} pieza(s) · clic para ver el detalle SAP`}
                                    className={`text-[10px] font-mono font-bold px-1 rounded leading-4 ${estilo.chip}`}>
                                    {x.of.slice(-4)}{x.piezas > 1 && <sup className="ml-0.5 text-[7px]">×{x.piezas}</sup>}
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1.5 text-[#324354]">
                        <MapaIcon className="w-4 h-4" />
                        <h2 className="text-sm font-black">Mapa de procesos FV</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-semibold text-slate-600">
                        {(Object.keys(ESTILO) as TipoProceso[]).map(t => (
                            <span key={t} className="flex items-center gap-1">
                                <span className={`w-3 h-3 rounded-sm border ${ESTILO[t].caja}`} /> {ESTILO[t].label}
                            </span>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">Saldo <b className="text-[#324354]">{porProceso.otros.saldo} OF</b></span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">Destrucción <b className="text-[#324354]">{porProceso.otros.destruccion} OF</b></span>
                        {hora && <span className="hidden sm:inline">Actualizado: {hora}</span>}
                        <button onClick={cargar} disabled={cargando}
                            className="h-7 w-7 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50" title="Actualizar">
                            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Plano: conserva las proporciones del layout y se ajusta al alto disponible */}
            <div className="flex-1 overflow-auto p-2 sm:p-3">
                {error ? (
                    <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2" role="alert"><AlertTriangle size={18} /> {error}</div>
                ) : cargando && ordenes.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-[#e2ded5]">Cargando órdenes...</div>
                ) : (
                    <div className="mx-auto bg-white rounded-xl border border-[#e2ded5] shadow-sm p-2 min-w-[900px]"
                        style={{ width: `min(100%, calc((100vh - 9rem) * ${ANCHO / ALTO}))` }}>
                        <div className="relative w-full" style={{ aspectRatio: `${ANCHO} / ${ALTO}` }}>
                            {PROCESOS.map(caja)}

                            {/* Zona Curado → Nivelación: desmolde e instalación de herraje */}
                            <div className="absolute w-[3px] bg-[#00b050] -translate-x-1/2" style={{ ...punto(1134, 318), height: `${((432 - 318) / ALTO) * 100}%` }} />
                            <div className="absolute -translate-x-full text-right text-[10px] font-bold text-slate-600 leading-tight" style={punto(1126, 360)}>Desmolde<br />Instalación herraje</div>

                            {FLECHAS.map((f, i) => {
                                const Icono = ICONO_FLECHA[f.dir]
                                return <Icono key={i} className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 text-[#00b050] pointer-events-none" strokeWidth={3} style={punto(f.x, f.y)} />
                            })}
                        </div>
                        <p className="mt-1 text-[9px] text-slate-400 italic">
                            Cada número es una OF (últimos 4 dígitos; ×N = piezas de esa OF en el proceso). Clic para ver el detalle SAP.
                            Zona Curado = Estantería; Huacales = Empaque; Reparación incluye reparación larga. Digitado, Tránsito y CEDI son pasos virtuales.
                        </p>
                    </div>
                )}
            </div>

            {detalleOf != null && <DetalleOrdenSapModal ordenFabricacion={detalleOf} onClose={() => setDetalleOf(null)} />}
        </div>
    )
}
