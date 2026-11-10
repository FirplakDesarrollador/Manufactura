'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Boxes, RefreshCw, Search, X, Unlock, AlertTriangle, Loader2 } from 'lucide-react'
import { getMoldesUbicados, liberarMoldes, MoldeUbicado } from '@/lib/supabase/queries/fibra_moldes'

// Moldes por tipo de bañera: estado de cada molde, dónde está la pieza que lo ocupa y botón para liberarlo.
// "Pegado" = molde En uso sin ninguna pieza en Pintura/Vaciado (no se liberó al pasar la pieza).

type FiltroEstado = 'todos' | 'Disponible' | 'en_uso' | 'pegado' | 'En reparacion' | 'otros'

const pegado = (m: MoldeUbicado) => m.estado === 'En uso' && !m.ocupacion

const estiloMolde = (m: MoldeUbicado) => {
    if (pegado(m)) return { caja: 'border-red-300 bg-red-50', badge: 'bg-red-600 text-white', texto: 'En uso · sin pieza' }
    if (m.estado === 'En uso') return { caja: 'border-blue-300 bg-blue-50', badge: 'bg-blue-600 text-white', texto: 'En uso' }
    if (m.estado === 'Disponible') return { caja: 'border-emerald-300 bg-emerald-50/60', badge: 'bg-emerald-600 text-white', texto: 'Disponible' }
    if (m.estado === 'En reparacion') return { caja: 'border-amber-300 bg-amber-50', badge: 'bg-amber-500 text-white', texto: 'En reparación' }
    return { caja: 'border-slate-300 bg-slate-50', badge: 'bg-slate-500 text-white', texto: m.estado }
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fechaCorta = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export default function MoldesFibraModule({ puedeLiberar }: { puedeLiberar: boolean }) {
    const [moldes, setMoldes] = useState<MoldeUbicado[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [planta, setPlanta] = useState<'FV' | 'MS' | 'todas'>('FV')
    const [filtro, setFiltro] = useState<FiltroEstado>('todos')
    const [liberando, setLiberando] = useState(false)

    const cargar = async () => {
        setCargando(true)
        try {
            setMoldes(await getMoldesUbicados())
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setCargando(false)
        }
    }
    useEffect(() => { cargar() }, [])

    const dePlanta = useMemo(() => moldes.filter(m => planta === 'todas' || m.planta === planta), [moldes, planta])
    const conteo = useMemo(() => ({
        disponibles: dePlanta.filter(m => m.estado === 'Disponible').length,
        enUso: dePlanta.filter(m => m.estado === 'En uso' && m.ocupacion).length,
        pegados: dePlanta.filter(pegado),
        reparacion: dePlanta.filter(m => m.estado === 'En reparacion').length,
        otros: dePlanta.filter(m => !['Disponible', 'En uso', 'En reparacion'].includes(m.estado)).length
    }), [dePlanta])

    const grupos = useMemo(() => {
        const t = sinTildes(busqueda.trim())
        const pasa = (m: MoldeUbicado) => {
            if (filtro === 'Disponible' && m.estado !== 'Disponible') return false
            if (filtro === 'en_uso' && !(m.estado === 'En uso' && m.ocupacion)) return false
            if (filtro === 'pegado' && !pegado(m)) return false
            if (filtro === 'En reparacion' && m.estado !== 'En reparacion') return false
            if (filtro === 'otros' && ['Disponible', 'En uso', 'En reparacion'].includes(m.estado)) return false
            return true
        }
        const mapa = new Map<string, MoldeUbicado[]>()
        for (const m of dePlanta) {
            if (!pasa(m)) continue
            if (t && !sinTildes(`${m.tipo} ${m.serial} ${m.ocupacion?.of ?? ''}`).includes(t)) continue
            const lista = mapa.get(m.tipo) ?? []
            lista.push(m)
            mapa.set(m.tipo, lista)
        }
        return [...mapa.entries()]
            .map(([tipo, lista]) => ({ tipo, lista: lista.sort((a, b) => a.serial.localeCompare(b.serial, 'es', { numeric: true })) }))
            // "(Sin tipo de molde)" siempre al final del listado
            .sort((a, b) => Number(a.tipo.startsWith('(')) - Number(b.tipo.startsWith('(')) || a.tipo.localeCompare(b.tipo, 'es'))
    }, [dePlanta, busqueda, filtro])

    const usuario = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) throw new Error('No hay una sesión activa. Inicie sesión para liberar moldes.')
        return user.email
    }

    const liberar = async (lista: MoldeUbicado[]) => {
        if (lista.length === 0) return
        const conPieza = lista.filter(m => m.ocupacion)
        const detalle = lista.slice(0, 15).map(m => `• ${m.serial} · ${m.tipo}${m.ocupacion ? ` (OF ${m.ocupacion.of} en ${m.ocupacion.lugar})` : ''}`).join('\n')
        const conPiezaFv = conPieza.filter(m => m.ocupacion?.planta === 'FV')
        const conPiezaMs = conPieza.filter(m => m.ocupacion?.planta === 'MS')
        const aviso = (conPiezaFv.length > 0
            ? `\n\n⚠ ADVERTENCIA: ${conPiezaFv.length === 1 ? 'la pieza de Fibra que ocupa el molde pasará' : `las ${conPiezaFv.length} piezas de Fibra que ocupan estos moldes pasarán`} a PULIDO (se asume que ya se desmoldaron).`
            : '') + (conPiezaMs.length > 0
            ? `\n\n⚠ ${conPiezaMs.length} molde(s) tienen pieza de Mármol: esa pieza no se mueve desde aquí.`
            : '') + '\n\nTodo queda en el historial de movimientos.'
        if (!confirm(`¿Liberar ${lista.length} molde(s)? Quedarán Disponibles para pintar.\n\n${detalle}${lista.length > 15 ? `\n… y ${lista.length - 15} más` : ''}${aviso}`)) return
        setLiberando(true)
        try {
            await liberarMoldes(lista.map(m => m.id), await usuario())
            toast.success(`${lista.length} molde(s) liberado(s)`)
            await cargar()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e), { duration: 10000 })
        } finally {
            setLiberando(false)
        }
    }

    const chipFiltro = (id: FiltroEstado, etiqueta: string, n: number, color: string) => (
        <button onClick={() => setFiltro(filtro === id ? 'todos' : id)} title={`Ver solo: ${etiqueta}`}
            className={`h-7 px-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-colors ${filtro === id ? 'bg-[#324354] text-white border-[#324354]' : `bg-white ${color}`}`}>
            {etiqueta} <b>{n}</b>
        </button>
    )

    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40 overflow-hidden">
            {/* Barra superior */}
            <div className="bg-white border-b border-[#e2ded5] px-3 py-1.5 shrink-0">
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-2 gap-y-1.5">
                    <div className="flex items-center gap-2 text-[#324354] shrink-0">
                        <Boxes className="w-4 h-4" />
                        <h2 className="text-sm font-black whitespace-nowrap">Moldes</h2>
                        <select value={planta} onChange={e => setPlanta(e.target.value as typeof planta)} title="Planta"
                            className="h-7 px-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-[#254153] outline-none cursor-pointer">
                            <option value="FV">FV</option>
                            <option value="MS">MS</option>
                            <option value="todas">Todas</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-1 shrink-0">
                        {chipFiltro('Disponible', 'Disponibles', conteo.disponibles, 'text-emerald-700 border-emerald-200')}
                        {chipFiltro('en_uso', 'En uso', conteo.enUso, 'text-blue-700 border-blue-200')}
                        {chipFiltro('pegado', 'En uso sin pieza', conteo.pegados.length, 'text-red-700 border-red-200')}
                        {chipFiltro('En reparacion', 'Reparación', conteo.reparacion, 'text-amber-700 border-amber-200')}
                        {conteo.otros > 0 && chipFiltro('otros', 'Otros', conteo.otros, 'text-slate-600 border-slate-200')}
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                        <div className="relative min-w-[120px] flex-1 max-w-72">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar tipo, serial u OF"
                                className="h-7 w-full pl-7 pr-6 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-[#324354] outline-none focus:ring-2 focus:ring-[#59a96a]" />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')} title="Borrar búsqueda"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                        {puedeLiberar && (
                            <button onClick={() => liberar(conteo.pegados)} disabled={liberando || cargando || conteo.pegados.length === 0}
                                title="Liberar todos los moldes que están En uso sin ninguna pieza en Pintura o Vaciado"
                                className="h-7 px-3 flex items-center gap-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 disabled:opacity-40 whitespace-nowrap">
                                {liberando ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />} Liberar sin pieza ({conteo.pegados.length})
                            </button>
                        )}
                        <button onClick={cargar} disabled={cargando} title="Actualizar"
                            className="h-7 w-7 flex items-center justify-center bg-[#324354] text-white rounded-lg hover:bg-[#254153] disabled:opacity-50">
                            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-3">
                {error ? (
                    <div className="p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2" role="alert"><AlertTriangle size={18} /> {error}</div>
                ) : cargando && moldes.length === 0 ? (
                    <div className="p-6 text-center text-sm font-bold text-slate-500">Cargando moldes...</div>
                ) : grupos.length === 0 ? (
                    <div className="p-6 text-center text-sm font-bold text-slate-500">No hay moldes con ese filtro.</div>
                ) : (
                    <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#324354] text-white">
                                <tr className="text-[10px] uppercase tracking-wider">
                                    <th className="px-3 py-2 font-black w-[24%] min-w-[180px]">Tipo de molde</th>
                                    <th className="px-2 py-2 font-black text-center w-16">Moldes</th>
                                    <th className="px-3 py-2 font-black">Referencias de molde · estado y ubicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map(g => {
                                    const disponibles = g.lista.filter(m => m.estado === 'Disponible').length
                                    return (
                                        <tr key={g.tipo} className="border-t border-slate-100 align-top hover:bg-[#F6F3EE]/50">
                                            <td className="px-3 py-2">
                                                <div className="text-xs font-black text-[#324354] leading-tight">{g.tipo.replace(/^MOLDE\s+/i, '')}</div>
                                                {planta === 'todas' && <div className="text-[9px] font-bold text-slate-400 mt-0.5">{g.lista[0].planta}</div>}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <div className="text-sm font-black text-[#324354]">{g.lista.length}</div>
                                                <div className={`text-[9px] font-bold ${disponibles ? 'text-emerald-700' : 'text-red-600'}`}>{disponibles} disp.</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {g.lista.map(m => {
                                                        const e = estiloMolde(m)
                                                        return (
                                                            <div key={m.id} className={`w-[168px] rounded-lg border px-2 py-1 ${e.caja}`}
                                                                title={`${m.tipo} · ${m.serial} · ${m.vueltas} vuelta(s)${m.modificado ? ` · último cambio ${fechaCorta(m.modificado)}${m.modificadoPor ? ` por ${m.modificadoPor}` : ''}` : ''}`}>
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="font-mono text-xs font-black text-[#25323f]">{m.serial}</span>
                                                                    <span className={`text-[8px] font-black uppercase px-1 rounded leading-4 whitespace-nowrap ${e.badge}`}>{e.texto}</span>
                                                                </div>
                                                                <div className="flex items-end justify-between gap-1 mt-0.5 min-h-[20px]">
                                                                    <div className="text-[10px] leading-tight min-w-0">
                                                                        {m.ocupacion ? (
                                                                            <span className="font-bold text-blue-800">
                                                                                {m.ocupacion.planta === 'MS' ? 'MS · ' : ''}OF {m.ocupacion.of}<br />
                                                                                <span className="font-semibold">{m.ocupacion.lugar}</span>
                                                                            </span>
                                                                        ) : pegado(m) ? (
                                                                            <span className="font-bold text-red-700">Sin pieza{m.modificado ? ` desde ${fechaCorta(m.modificado)}` : ''}</span>
                                                                        ) : (
                                                                            <span className="text-slate-500">{m.vueltas} vuelta(s)</span>
                                                                        )}
                                                                    </div>
                                                                    {puedeLiberar && m.estado === 'En uso' && (
                                                                        <button onClick={() => liberar([m])} disabled={liberando}
                                                                            title={m.ocupacion ? 'Liberar el molde aunque tenga una pieza registrada' : 'Liberar molde'}
                                                                            className={`shrink-0 h-5 px-1.5 flex items-center gap-0.5 rounded text-[9px] font-black disabled:opacity-40 ${m.ocupacion ? 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                                                            <Unlock size={10} /> Liberar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
