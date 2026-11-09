'use client'

import React, { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { PROCESOS_PLANO, Plano } from '@/lib/fibra-planos'

type Grupo = { clave: string; titulo: string; porProceso: Map<string, Plano[]> }

const VERDE = '#59a96a'
const AMARILLO = '#deb841'
const ROJO = '#d14747'

// Indicadores de Planos FV, en torno a tres preguntas: qué bañeras están completas,
// a cuáles les falta información (y qué procesos) y cuáles tienen más planos.
export default function IndicadoresPlanos({ grupos, onVer }: { grupos: Grupo[]; onVer: (titulo: string) => void }) {
    const [grupo, setGrupo] = useState<'todas' | 'completas' | 'pocas' | 'muchas'>('todas')
    const [orden, setOrden] = useState<'faltan' | 'planos' | 'nombre'>('faltan')

    const d = useMemo(() => {
        const n = PROCESOS_PLANO.length
        const filas = grupos.map(g => {
            const conteo = PROCESOS_PLANO.map(p => (g.porProceso.get(p.id) || []).length)
            const faltan = PROCESOS_PLANO.filter((_, i) => !conteo[i])
            return { ...g, conteo, faltan, planos: conteo.reduce((s, x) => s + x, 0) }
        })
        const casillas = filas.length * n
        const llenas = filas.reduce((s, f) => s + (n - f.faltan.length), 0)
        return {
            n,
            filas,
            pct: casillas ? Math.round((llenas / casillas) * 100) : 0,
            llenas,
            casillas,
            planos: filas.reduce((s, f) => s + f.planos, 0),
            completas: filas.filter(f => !f.faltan.length),
            pocas: filas.filter(f => f.faltan.length > 0 && f.faltan.length <= 2),
            muchas: filas.filter(f => f.faltan.length > 2),
            procesos: PROCESOS_PLANO.map((p, i) => ({ ...p, sin: filas.filter(f => !f.conteo[i]).map(f => f.titulo), pdf: filas.reduce((s, f) => s + f.conteo[i], 0) }))
        }
    }, [grupos])

    const lista = (grupo === 'completas' ? d.completas : grupo === 'pocas' ? d.pocas : grupo === 'muchas' ? d.muchas : d.filas)
        .slice()
        .sort((a, b) => orden === 'planos' ? b.planos - a.planos || a.titulo.localeCompare(b.titulo, 'es')
            : orden === 'nombre' ? a.titulo.localeCompare(b.titulo, 'es')
            : a.faltan.length - b.faltan.length || b.planos - a.planos)
    const maxPlanos = Math.max(1, ...d.filas.map(f => f.planos))

    if (!d.filas.length) return <p className="bg-white rounded-2xl border border-[#e2ded5] px-4 py-10 text-center text-sm text-slate-400">Aún no hay planos cargados para calcular indicadores.</p>

    const elegir = (k: typeof grupo) => setGrupo(grupo === k ? 'todas' : k)

    return (
        <div className="space-y-3">
            {/* 1. Avance general */}
            <section className="bg-white rounded-2xl border border-[#e2ded5] p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-black text-[#324354]">Avance de la información de planos</h3>
                        <p className="text-[12px] text-slate-500">
                            {d.filas.length} bañeras × {d.n} procesos = {d.casillas} planos esperados. Hay <b className="text-[#324354]">{d.llenas}</b> con plano ({d.planos} PDF en total).
                        </p>
                    </div>
                    <span className="text-3xl font-black text-[#324354] leading-none">{d.pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-[#F6F3EE] overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-[#324354]" style={{ width: `${d.pct}%` }} />
                </div>
            </section>

            {/* 2. Cómo están las bañeras (clic = filtra la tabla de abajo) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TarjetaGrupo activo={grupo === 'completas'} onClick={() => elegir('completas')} titulo="Completas" valor={d.completas.length} color={VERDE} texto={`Tienen plano en los ${d.n} procesos`} />
                <TarjetaGrupo activo={grupo === 'pocas'} onClick={() => elegir('pocas')} titulo="Les falta poco" valor={d.pocas.length} color={AMARILLO} texto="Les faltan 1 o 2 procesos" />
                <TarjetaGrupo activo={grupo === 'muchas'} onClick={() => elegir('muchas')} titulo="Les falta mucho" valor={d.muchas.length} color={ROJO} texto="Les faltan 3 procesos o más" />
            </div>

            {/* 3. Qué falta en cada proceso */}
            <section className="bg-white rounded-2xl border border-[#e2ded5] p-4">
                <h3 className="text-sm font-black text-[#324354] mb-2">¿Qué falta en cada proceso?</h3>
                <div className="divide-y divide-slate-100">
                    {d.procesos.map(p => {
                        const con = d.filas.length - p.sin.length
                        return (
                            <div key={p.id} className="py-2 grid grid-cols-1 md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.4fr)] gap-x-4 gap-y-1 items-center">
                                <span className="text-[13px] font-black text-[#324354]">{p.nombre}</span>
                                <span className="flex items-center gap-2">
                                    <span className="flex-1 h-2.5 rounded-full bg-[#F6F3EE] overflow-hidden">
                                        <span className="block h-full rounded-full bg-[#324354]" style={{ width: `${(con / d.filas.length) * 100}%` }} />
                                    </span>
                                    <span className="text-[12px] text-slate-600 whitespace-nowrap"><b className="text-[#324354]">{con}</b> de {d.filas.length}</span>
                                </span>
                                <span className="text-[11px] text-slate-500 leading-snug">
                                    {!p.sin.length ? <span className="font-bold" style={{ color: VERDE }}>Todas las bañeras tienen plano</span>
                                        : p.sin.length === d.filas.length ? <span className="font-bold" style={{ color: ROJO }}>Ninguna bañera tiene plano todavía</span>
                                        : <>Faltan <b className="text-[#324354]">{p.sin.length}</b>: {p.sin.join(', ')}</>}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* 4. Estado de cada bañera */}
            <section className="bg-white rounded-2xl border border-[#e2ded5] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-black text-[#324354]">
                        Estado por bañera
                        {grupo !== 'todas' && <button type="button" onClick={() => setGrupo('todas')} className="ml-2 text-[11px] font-bold text-slate-500 hover:underline">· ver todas</button>}
                    </h3>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        Ordenar por
                        <select value={orden} onChange={e => setOrden(e.target.value as typeof orden)} className="h-7 border border-slate-300 rounded-lg px-1.5 text-[11px] font-bold text-[#324354] bg-white">
                            <option value="faltan">Más completas primero</option>
                            <option value="planos">Más planos</option>
                            <option value="nombre">Nombre</option>
                        </select>
                    </label>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[12px]">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <th className="text-left px-2 pb-1.5 w-[170px]">Bañera</th>
                                {PROCESOS_PLANO.map(p => <th key={p.id} className="px-1 pb-1.5 leading-tight w-[86px]">{p.nombre}</th>)}
                                <th className="text-left px-2 pb-1.5 w-[150px]">Planos</th>
                                <th className="text-left px-2 pb-1.5">Le falta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map(f => {
                                const color = !f.faltan.length ? VERDE : f.faltan.length <= 2 ? AMARILLO : ROJO
                                return (
                                    <tr key={f.clave} onClick={() => onVer(f.titulo)} title="Ver sus planos" className="cursor-pointer group">
                                        <td className="px-2 py-1.5 border-t border-slate-100 group-hover:bg-[#F6F3EE]">
                                            <span className="flex items-center gap-1.5 font-bold text-[#324354]">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} /> {f.titulo}
                                            </span>
                                        </td>
                                        {f.conteo.map((c, i) => (
                                            <td key={PROCESOS_PLANO[i].id} className="px-1 py-1.5 border-t border-slate-100 text-center group-hover:bg-[#F6F3EE]">
                                                {c ? <span className="inline-flex items-center justify-center w-7 h-6 rounded-md bg-[#324354] text-white text-[11px] font-black" title={`${c} PDF`}>{c}</span>
                                                    : <span className="inline-block w-7 h-6 rounded-md border border-dashed border-slate-300" title="Sin plano" />}
                                            </td>
                                        ))}
                                        <td className="px-2 py-1.5 border-t border-slate-100 group-hover:bg-[#F6F3EE]">
                                            <span className="flex items-center gap-1.5">
                                                <span className="flex-1 h-2 rounded-full bg-[#F6F3EE] overflow-hidden"><span className="block h-full rounded-full bg-[#7B8E90]" style={{ width: `${(f.planos / maxPlanos) * 100}%` }} /></span>
                                                <span className="font-black text-[#324354] w-5 text-right">{f.planos}</span>
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 border-t border-slate-100 text-[11px] group-hover:bg-[#F6F3EE]">
                                            <span className="flex items-center justify-between gap-2">
                                                {f.faltan.length ? <span className="text-slate-600">{f.faltan.map(p => p.nombre).join(', ')}</span> : <span className="font-bold" style={{ color: VERDE }}>Nada, está completa</span>}
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#324354] shrink-0" />
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {!lista.length && <tr><td colSpan={d.n + 3} className="px-2 py-6 text-center text-slate-400">No hay bañeras en este grupo.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1"><span className="inline-flex items-center justify-center w-5 h-4 rounded bg-[#324354] text-white text-[9px] font-black">2</span> PDF cargados</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-5 h-4 rounded border border-dashed border-slate-300" /> Sin plano</span>
                    <span>Clic en una bañera para ver sus planos.</span>
                </p>
            </section>
        </div>
    )
}

// Tarjeta de un grupo de bañeras (completas, les falta poco, les falta mucho); clic filtra la tabla
function TarjetaGrupo({ titulo, valor, texto, color, activo, onClick }: { titulo: string; valor: number; texto: string; color: string; activo: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className={`text-left bg-white rounded-xl border px-3 py-2.5 transition ${activo ? 'ring-2 ring-[#324354] border-[#324354]' : 'border-[#e2ded5] hover:border-[#324354]/40'}`}>
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /> {titulo}
            </span>
            <span className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-black leading-none text-[#324354]">{valor}</span>
                <span className="text-[12px] font-semibold text-slate-500">{valor === 1 ? 'bañera' : 'bañeras'}</span>
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">{texto}</span>
        </button>
    )
}
