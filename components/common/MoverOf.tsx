'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightLeft, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { moldesDeOrden } from '@/lib/fibra/moldesOrden'

// Administración (FV y MS): mover rápido la OF a un proceso (de Programado a Tránsito). Solo en Administración.
// Si la OF tiene más de una unidad para mover, se escoge cuáles (unidad por unidad); con una sola viene marcada.
//  - Las piezas en proceso pasan al proceso elegido; cada movimiento queda en el historial de la planta.
//  - Las unidades en Programado (cantidad − piezas registradas) se registran con un molde libre de la referencia
//    (el de menos vueltas, se puede cambiar); los kits de reparación de FV no usan molde.
//  - Si una pieza vuelve a Pintura/Vaciado y su molde lo ocupa otra pieza, se le asigna otro molde libre.
//  - A Programado: se devuelve la pieza (se borra su registro y queda copia en el historial).
// Lo propio de cada planta (estados, tablas, historial) llega en "api" (FV: MoverOfFibra; MS: MoverOfMs).
export type OpcionMover = { id: string; label: string }
export type PiezaMover = { id: string; estado: string; molde: string | null; moldeId: number | null }
export interface MoverApi {
    opciones: OpcionMover[]
    enProceso: string[]                       // estados de origen que se pueden mover
    ocupanMolde: string[]                     // estados en los que la pieza ocupa el molde
    nombreEstado: Record<string, string>
    estadoDestino: (destino: string) => string
    esKit?: (orden: OrdenFabricacion) => boolean
    leerPiezas: (orden: OrdenFabricacion) => Promise<PiezaMover[]>
    ocupacion: (moldeIds: number[]) => Promise<Map<number, { of: string; id: string }>>
    mover: (p: PiezaMover, destino: string, email: string, motivo: string) => Promise<void>
    devolver: (p: PiezaMover, email: string) => Promise<void>
    registrar: (orden: OrdenFabricacion, moldeId: number | null, destino: string, email: string) => Promise<void>
    cambiarMolde: (p: PiezaMover, moldeNuevoId: number, email: string, motivo: string) => Promise<void>
}

export default function MoverOf({ api, orden, moldes, usuarioEmail, onHecho }: {
    api: MoverApi; orden: OrdenFabricacion; moldes: Molde[]; usuarioEmail?: string; onHecho: () => void
}) {
    // Posición de la lista (fija en la pantalla, en un portal): así no la corta el área con desplazamiento
    const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
    const abierto = pos !== null
    const setAbierto = (v: boolean) => { if (!v) setPos(null) }
    const [moviendo, setMoviendo] = useState(false)
    const caja = useRef<HTMLDivElement>(null)
    const lista = useRef<HTMLDivElement>(null)
    const ALTO_LISTA = 370
    const abrir = () => {
        if (abierto) { setPos(null); return }
        const r = caja.current?.getBoundingClientRect()
        if (!r) return
        const right = Math.max(8, window.innerWidth - r.right)
        // Se abre hacia abajo si cabe; si no, hacia arriba
        setPos(window.innerHeight - r.bottom >= ALTO_LISTA + 8 || r.top < ALTO_LISTA
            ? { top: r.bottom + 4, right }
            : { bottom: window.innerHeight - r.top + 4, right })
    }

    useEffect(() => {
        if (!abierto) return
        const fuera = (e: MouseEvent) => { const t = e.target as Node; if (!caja.current?.contains(t) && !lista.current?.contains(t)) setPos(null) }
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null) }
        // Al desplazar o cambiar el tamaño de la pantalla se cierra (la lista quedaría flotando)
        const cerrar = (e: Event) => { if (!lista.current?.contains(e.target as Node)) setPos(null) }
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', tecla)
        window.addEventListener('scroll', cerrar, true)
        window.addEventListener('resize', cerrar)
        return () => {
            document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla)
            window.removeEventListener('scroll', cerrar, true); window.removeEventListener('resize', cerrar)
        }
    }, [abierto])

    // Unidades de la OF que se pueden mover: cada pieza en proceso y cada unidad que sigue en Programado.
    // registrer = identificador de la pieza en la planta (FV: registrer; MS: id del registro).
    // necesitaMolde: la unidad entra a Pintura/Vaciado (o se registra desde Programado) y su molde no está libre:
    // se le propone otro molde libre de la referencia (moldeNuevoId), que el usuario puede cambiar.
    type Unidad = {
        key: string; registrer?: string; estado: string; molde?: string | null; moldeId?: number | null
        necesitaMolde?: boolean; ocupadoPor?: string; moldeNuevoId?: number | null
    }
    const [eleccion, setEleccion] = useState<{ op: OpcionMover; unidades: Unidad[]; sel: Set<string>; libres: Molde[]; kit: boolean } | null>(null)

    const mover = async (op: OpcionMover) => {
        setAbierto(false)
        if (!usuarioEmail) { toast.error('No hay una sesión activa.'); return }
        let todas: PiezaMover[]
        try { todas = await api.leerPiezas(orden) } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); return }

        const estadoDestino = api.estadoDestino(op.id)
        const entraAMolde = api.ocupanMolde.includes(estadoDestino)
        const cantidad = Number(orden.cantidad || orden.programado || 0)
        const enProgramado = op.id === 'programado' ? 0 : Math.max(0, cantidad - todas.length)
        const kit = api.esKit?.(orden) ?? false

        const unidades: Unidad[] = [
            ...todas.filter(p => api.enProceso.includes(p.estado) && p.estado !== estadoDestino)
                .map(p => ({ key: p.id, registrer: p.id, estado: p.estado, molde: p.molde, moldeId: p.moldeId })),
            ...Array.from({ length: enProgramado }, (_, i) => ({ key: `prog-${i}`, estado: 'Programado', necesitaMolde: !kit }))
        ]
        if (unidades.length === 0) { toast.info(`La OF ${orden.orden_fabricacion} no tiene unidades para mover a ${op.label}.`); return }

        // Ocupación de los moldes: de la referencia (para los libres) y los propios de las piezas que vuelven a Pintura/Vaciado
        let libres: Molde[] = []
        const vuelvenAMolde = entraAMolde ? unidades.filter(u => u.registrer && u.moldeId && !api.ocupanMolde.includes(u.estado)) : []
        if (!kit && (enProgramado > 0 || vuelvenAMolde.length > 0)) {
            const ref = moldesDeOrden(orden, moldes)
            const consultar = [...new Set([...ref.map(m => m.id), ...vuelvenAMolde.map(u => u.moldeId as number)])]
            let ocupados = new Map<number, { of: string; id: string }>()
            try { ocupados = await api.ocupacion(consultar) } catch (e) {
                toast.error(`No se pudo revisar la ocupación de los moldes: ${e instanceof Error ? e.message : e}`); return
            }
            libres = ref.filter(m => m.estado === 'Disponible' && !ocupados.has(m.id)).sort((a, b) => a.vueltas_actuales - b.vueltas_actuales)
            for (const u of vuelvenAMolde) {
                const o = ocupados.get(u.moldeId as number)
                if (o && o.id !== u.registrer) { u.necesitaMolde = true; u.ocupadoPor = o.of }
            }
        }
        // Se reparte un molde libre distinto a cada unidad que lo necesita
        let siguiente = 0
        for (const u of unidades) if (u.necesitaMolde) u.moldeNuevoId = libres[siguiente++]?.id ?? null

        // Con una sola unidad queda marcada; con más, ninguna (se escoge unidad por unidad)
        setEleccion({ op, unidades, sel: new Set(unidades.length === 1 && !(unidades[0].necesitaMolde && !unidades[0].moldeNuevoId) ? [unidades[0].key] : []), libres, kit })
    }

    const ejecutar = async (op: OpcionMover, elegidas: Unidad[], kit: boolean) => {
        if (!usuarioEmail) return
        setMoviendo(true)
        let hechas = 0
        const errores: string[] = []
        try {
            for (const u of elegidas) {
                try {
                    if (u.registrer) {
                        const pieza: PiezaMover = { id: u.registrer, estado: u.estado, molde: u.molde ?? null, moldeId: u.moldeId ?? null }
                        if (op.id === 'programado') { await api.devolver(pieza, usuarioEmail); hechas++; continue }
                        // Su molde lo ocupa otra pieza: primero se cambia al molde libre elegido (queda en el historial)
                        if (u.necesitaMolde) {
                            if (!u.moldeNuevoId) throw new Error(`La unidad del molde ${u.molde} no tiene un molde libre asignado.`)
                            await api.cambiarMolde(pieza, u.moldeNuevoId, usuarioEmail, `Cambio de molde para volver a ${op.label}: el molde ${u.molde} lo ocupa la OF ${u.ocupadoPor}`)
                        }
                        await api.mover(pieza, op.id, usuarioEmail, `Mover OF a ${op.label} (Administración)`)
                    } else if (op.id !== 'programado') {
                        if (!kit && !u.moldeNuevoId) throw new Error('Una unidad en Programado no tiene molde libre asignado.')
                        await api.registrar(orden, kit ? null : (u.moldeNuevoId as number), op.id, usuarioEmail)
                    }
                    hechas++
                } catch (e) { errores.push(e instanceof Error ? e.message : String(e)) }
            }
        } finally {
            setMoviendo(false)
            setEleccion(null)
            onHecho()
        }
        if (errores.length) toast.error(`OF ${orden.orden_fabricacion}: ${hechas} unidad(es) movidas a ${op.label}, ${errores.length} con error: ${errores[0]}`, { duration: 12000 })
        else toast.success(`OF ${orden.orden_fabricacion}: ${hechas} unidad(es) en ${op.label}`)
    }

    return (
        <div ref={caja} className="relative">
            <button type="button" onClick={abrir} disabled={moviendo}
                className="h-9 px-3 rounded-lg border border-[#324354] bg-[#324354] text-white hover:bg-[#254153] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                title="Mover todas las piezas de la OF a otro proceso">
                {moviendo ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                {moviendo ? 'Moviendo…' : 'Mover OF'}
                {!moviendo && <ChevronDown size={14} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />}
            </button>
            {abierto && typeof document !== 'undefined' && createPortal(
                <div ref={lista} style={{ top: pos?.top, bottom: pos?.bottom, right: pos?.right }}
                    className="fixed z-[150] w-48 bg-white border-2 border-[#324354] rounded-xl shadow-2xl overflow-hidden">
                    <p className="px-3 py-1.5 text-[10px] font-black uppercase text-[#7B8E90] border-b border-[#e2ded5]">Llevar la OF a…</p>
                    {api.opciones.map(op => (
                        <button key={op.id} type="button" onClick={() => mover(op)}
                            className="w-full text-left px-3 py-1.5 text-xs font-bold text-[#324354] hover:bg-[#F6F3EE]">
                            {op.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
            {eleccion && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget && !moviendo) setEleccion(null) }}
                    onKeyDown={e => { if (e.key === 'Escape' && !moviendo) setEleccion(null) }}>
                    <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-[#e2ded5]">
                            <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Mover a {eleccion.op.label}</span>
                            <h3 className="text-xl font-black text-[#324354] mt-2">OF {orden.orden_fabricacion}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">Marque las unidades que se mueven a <b>{eleccion.op.label}</b>. Cada movimiento queda en el historial.</p>
                        </div>
                        <div className="overflow-y-auto p-3 sm:p-4 space-y-1.5">
                            <label className="flex items-center gap-2 px-2 py-1 text-[11px] font-black uppercase text-[#7B8E90] cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-[#324354]"
                                    checked={eleccion.sel.size > 0 && eleccion.sel.size === eleccion.unidades.filter(u => !(u.necesitaMolde && !u.moldeNuevoId)).length}
                                    onChange={e => setEleccion({ ...eleccion, sel: new Set(e.target.checked ? eleccion.unidades.filter(u => !(u.necesitaMolde && !u.moldeNuevoId)).map(u => u.key) : []) })} />
                                Seleccionar todas ({eleccion.unidades.length})
                            </label>
                            {eleccion.unidades.map((u, i) => {
                                const marcada = eleccion.sel.has(u.key)
                                const sinMolde = !!u.necesitaMolde && !u.moldeNuevoId
                                // Moldes que puede escoger esta unidad: el suyo y los libres que no tenga otra unidad
                                const usados = new Set(eleccion.unidades.filter(x => x.key !== u.key && x.moldeNuevoId).map(x => x.moldeNuevoId))
                                const opciones = eleccion.libres.filter(m => !usados.has(m.id))
                                const cambiarMolde = (id: number) => setEleccion({ ...eleccion, unidades: eleccion.unidades.map(x => x.key === u.key ? { ...x, moldeNuevoId: id } : x) })
                                return (
                                    <div key={u.key} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-xl border ${marcada ? 'bg-[#324354]/5 border-[#324354]' : 'bg-white border-[#e2ded5]'} ${sinMolde ? 'opacity-60' : ''}`}>
                                        <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 accent-[#324354]" disabled={sinMolde} checked={marcada}
                                                onChange={() => {
                                                    const sel = new Set(eleccion.sel)
                                                    if (sel.has(u.key)) sel.delete(u.key); else sel.add(u.key)
                                                    setEleccion({ ...eleccion, sel })
                                                }} />
                                            <span className="text-xs font-black text-[#324354] w-14 shrink-0">Unidad {i + 1}</span>
                                            <span className="text-xs font-bold text-slate-700 flex-1 min-w-0">
                                                {u.registrer ? <>Molde <b>{u.molde || 'sin molde'}</b></> : eleccion.kit ? 'Kit sin molde' : 'En Programado'}
                                                {u.ocupadoPor && <span className="block text-[10px] font-bold text-amber-700">Su molde lo ocupa la OF {u.ocupadoPor}: se cambia de molde</span>}
                                            </span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#deb841]/20 text-[#7a5f0e] shrink-0">{api.nombreEstado[u.estado] || u.estado}</span>
                                        </label>
                                        {u.necesitaMolde && (
                                            sinMolde
                                                ? <span className="basis-full text-[10px] font-bold text-red-700 pl-7">No hay moldes libres de la referencia (revise el módulo Moldes).</span>
                                                : <label className="basis-full flex items-center gap-2 pl-7 text-[11px] font-bold text-slate-600">
                                                    {u.registrer ? 'Nuevo molde' : 'Se registra con el molde'}
                                                    <select value={u.moldeNuevoId ?? ''} onChange={e => cambiarMolde(Number(e.target.value))}
                                                        className="h-7 px-2 rounded-lg border border-[#e2ded5] bg-white text-xs font-bold text-[#324354]">
                                                        {opciones.map(m => <option key={m.id} value={m.id}>{m.serial} · {m.vueltas_actuales} vueltas</option>)}
                                                    </select>
                                                </label>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="bg-[#F6F3EE] border-t border-[#e2ded5] px-4 py-3 flex justify-end gap-2">
                            <button type="button" disabled={moviendo} onClick={() => setEleccion(null)}
                                className="h-9 px-4 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-xs font-bold hover:bg-slate-50">Cancelar</button>
                            <button type="button" disabled={moviendo || eleccion.sel.size === 0}
                                onClick={() => ejecutar(eleccion.op, eleccion.unidades.filter(u => eleccion.sel.has(u.key)), eleccion.kit)}
                                className="h-9 px-4 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                                {moviendo ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                                Mover {eleccion.sel.size} unidad(es) a {eleccion.op.label}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
