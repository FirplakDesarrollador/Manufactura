'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import { ChevronDown, PaintRoller, Search } from 'lucide-react'
import { moldesDisponiblesOrden } from '@/lib/fibra/moldesOrden'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'

// Franja de registro de Pintura en cada orden (mismo estilo de la franja de pieza de Vaciado y los demás módulos):
// a la izquierda el molde de ESA orden (con buscador) y a la derecha "Pintar". El kit de reparación no lleva molde.
interface Props {
    orden: OrdenFabricacion
    allMoldes: Molde[]
    enviando: boolean
    onPintar: (molde: Molde | null) => Promise<boolean>   // true si quedó registrado (limpia el molde)
}

export default function PintarOrdenFranja({ orden, allMoldes, enviando, onPintar }: Props) {
    const kit = esKitReparacion(orden.producto_descripcion)
    const [molde, setMolde] = useState<Molde | null>(null)
    const [abierto, setAbierto] = useState(false)
    const [busqueda, setBusqueda] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!abierto) return
        const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
        document.addEventListener('mousedown', cerrar)
        return () => document.removeEventListener('mousedown', cerrar)
    }, [abierto])

    // Moldes de la orden; con texto busca entre todos; si la orden no tiene molde asignado, se ofrecen todos
    const propios = useMemo(() => moldesDisponiblesOrden(orden, allMoldes), [orden, allMoldes])
    const opciones = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        if (q) return allMoldes.filter(m => [m.serial, m.molde_descripcion, m.molde_sku].some(v => (v || '').toLowerCase().includes(q)))
        return propios.length ? propios : allMoldes
    }, [busqueda, propios, allMoldes])

    const sinProgramado = (orden.programado || 0) <= 0
    const puede = !enviando && !sinProgramado && (kit || !!molde)

    const pintar = async () => {
        if (await onPintar(kit ? null : molde)) setMolde(null)
    }

    return (
        <div className="rounded-b-md border-t-2 border-[#e2ded5] bg-[#F6F3EE] px-3 py-1 flex flex-row items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
                {kit ? (
                    <div className="min-h-9 px-3 py-1 text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg flex items-center">
                        Kit de reparación: sin molde, pasa directo a Digitado.
                    </div>
                ) : (
                    <div ref={ref} className="relative">
                        <button type="button" onClick={() => setAbierto(v => !v)}
                            className="w-full h-9 px-3 bg-white border border-[#e2ded5] rounded-lg flex items-center justify-between gap-2 text-left hover:border-[#324354] transition-colors">
                            <span className="min-w-0">
                                <span className="block text-[9px] sm:text-[10px] text-[#7B8E90] uppercase font-black leading-none">Molde</span>
                                <span className={`block text-xs sm:text-sm font-black truncate leading-none mt-0.5 ${molde ? 'text-[#324354]' : 'text-slate-400'}`}>
                                    {molde ? `${molde.serial} · ${molde.vueltas_actuales}v · ${molde.estado}` : propios.length ? 'Elija el molde' : 'Sin molde asignado: busque'}
                                </span>
                            </span>
                            <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                        </button>
                        {abierto && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-slate-100 bg-slate-50 relative">
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar molde…"
                                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                                </div>
                                <div className="max-h-[220px] overflow-y-auto">
                                    {opciones.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-slate-400 text-center">No se encontraron moldes</div>
                                    ) : opciones.map(m => (
                                        <button type="button" key={m.id}
                                            onClick={() => { setMolde(m); avisarMantenimiento(m); setAbierto(false); setBusqueda('') }}
                                            className={`w-full px-3 py-2 text-left hover:bg-[#F6F3EE] flex justify-between items-center border-b border-slate-50 last:border-0 ${molde?.id === m.id ? 'bg-[#F6F3EE]' : ''}`}>
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-bold text-[#324354]">{m.serial}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${m.estado === 'Disponible' ? 'bg-emerald-100 text-emerald-800' : m.estado === 'En uso' ? 'bg-amber-100 text-amber-800' : m.estado === 'Reparación' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{m.estado}</span>
                                            </span>
                                            <span className="text-xs text-[#7B8E90] font-bold">{m.vueltas_actuales}v</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <button type="button" onClick={pintar} disabled={!puede}
                title={sinProgramado ? 'La orden no tiene piezas programadas' : !kit && !molde ? 'Elija el molde' : 'Registrar la pieza en Pintura'}
                className="h-9 px-3 sm:px-4 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0">
                {enviando ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <PaintRoller size={16} />}
                Pintar
            </button>
        </div>
    )
}

// Mismo aviso que antes: molde nuevo (encerar) o para desmanchar al llegar a sus vueltas de mantenimiento
function avisarMantenimiento(molde: Molde) {
    const limite = molde.vueltas_mto_atipicas > 0 ? molde.vueltas_mto_atipicas - 1 : molde.vueltas_mto - 1
    if (molde.vueltas_actuales < limite) return
    const nuevo = molde.vueltas_mto_atipicas === 1
    alert(nuevo
        ? `🆕 Molde nuevo 🆕\n\nEl ${molde.molde_descripcion} # ${molde.serial} Se debe encerar en el puesto`
        : `⚠️ Molde para desmanchar ⚠️\n\nEl ${molde.molde_descripcion} # ${molde.serial} Se debe sacar para desmanchar`)
}
