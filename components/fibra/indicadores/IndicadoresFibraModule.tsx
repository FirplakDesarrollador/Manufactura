'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, ChevronRight, Clock, FileText, Inbox, Loader2, Package, RefreshCw } from 'lucide-react'
import { cargarIndicadoresFv, PROCESOS_FV, type Periodo, type ResultadoIndicadores } from '@/lib/fibra/indicadoresFv'
import CargaMoldesTable from '../dashboard/CargaMoldesTable'
import CargaProductosTable from '../dashboard/CargaProductosTable'
import OrdenesTable from '../dashboard/OrdenesTable'

// Dashboard de Control de Piso Fibra (FV), hecho para Fibra (reemplaza el copiado de MS):
// 1. Acumulado del período por proceso, en el orden del flujo, con CEDI resaltado.
// 2. Gráfica acumulada de CEDI (por hora en el día, por día en el mes).
// 3. Indicadores nuevos: tiempo de ciclo Pintura → CEDI, calidad (reparación, saldo, destrucción) e inventario en proceso.
// 4. Tabla hora a hora (o día a día) de todos los procesos FV.
// Se conservan las pestañas de carga de moldes, carga de productos y órdenes.

type Pestana = 'indicadores' | 'cargaMoldes' | 'cargaProductos' | 'ordenes'
const PESTANAS: { id: Pestana; label: string; Icono: React.ElementType }[] = [
    { id: 'indicadores', label: 'Indicadores', Icono: BarChart3 },
    { id: 'cargaMoldes', label: 'Carga moldes', Icono: Inbox },
    { id: 'cargaProductos', label: 'Carga productos', Icono: Package },
    { id: 'ordenes', label: 'Órdenes', Icono: FileText },
]

const hoy = () => new Date().toLocaleDateString('en-CA')
const num = (n: number) => n.toLocaleString('es-CO')
const ESTADO_LABEL: Record<string, string> = { Empaque: 'Guacales (por digitar)', Transito: 'Tránsito', Reparacion: 'Reparación', Desgelcada: 'Desgelcada' }

export default function IndicadoresFibraModule() {
    const [pestana, setPestana] = useState<Pestana>('indicadores')
    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40">
            {/* Nivel 2: pestañas del módulo */}
            <div className="bg-white border-b border-[#e2ded5] px-3 h-10 flex items-center shrink-0 sticky top-0 z-20">
                <div className="w-full flex gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide">
                    {PESTANAS.map(({ id, label, Icono }) => (
                        <button key={id} onClick={() => setPestana(id)}
                            className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${pestana === id ? 'bg-[#324354] text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                            <Icono size={14} /> {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                {pestana === 'indicadores' ? <Indicadores />
                    : pestana === 'cargaMoldes' ? <CargaMoldesTable />
                    : pestana === 'cargaProductos' ? <CargaProductosTable />
                    : <OrdenesTable />}
            </div>
        </div>
    )
}

function Indicadores() {
    const [tipo, setTipo] = useState<'dia' | 'mes'>('dia')
    const [fecha, setFecha] = useState(hoy())
    const [mes, setMes] = useState(hoy().slice(0, 7))
    const [datos, setDatos] = useState<ResultadoIndicadores | null>(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const periodo: Periodo = tipo === 'dia' ? { tipo, fecha } : { tipo, mes }
    const clave = tipo === 'dia' ? fecha : mes
    const cargar = useCallback(async () => {
        setCargando(true); setError(null)
        try { setDatos(await cargarIndicadoresFv(tipo === 'dia' ? { tipo: 'dia', fecha } : { tipo: 'mes', mes })) }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron leer los registros') }
        finally { setCargando(false) }
    }, [tipo, fecha, mes])
    useEffect(() => { cargar() }, [cargar])
    // Día de hoy: se actualiza solo cada 2 minutos
    useEffect(() => {
        if (tipo !== 'dia' || fecha !== hoy()) return
        const t = setInterval(cargar, 120000)
        return () => clearInterval(t)
    }, [tipo, fecha, cargar])

    // Columnas de la tabla: en el día, de 6:00 a 21:00 más cualquier otra hora con registros; en el mes, todos los días
    const columnas = useMemo(() => {
        if (!datos) return []
        if (tipo === 'mes') return datos.cubetas
        return datos.cubetas.filter(c => (Number(c) >= 6 && Number(c) <= 21) || PROCESOS_FV.some(p => datos.conteo[p.id][c] > 0))
    }, [datos, tipo])

    const serieCedi = useMemo(() => {
        if (!datos) return []
        let acumulado = 0
        return columnas.map(c => {
            const enCubeta = datos.conteo.cedi[c] || 0
            acumulado += enCubeta
            return { cubeta: tipo === 'dia' ? `${Number(c)}:00` : String(Number(c)), enCubeta, acumulado }
        })
    }, [datos, columnas, tipo])

    const serieKg = useMemo(() => datos ? columnas.map(c => ({ cubeta: tipo === 'dia' ? `${Number(c)}:00` : String(Number(c)), kg: datos.kgVaciado[c] || 0, piezas: datos.conteo.vaciado[c] || 0 })) : [], [datos, columnas, tipo])
    const kgFmt = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })

    const flujo = PROCESOS_FV.filter(p => p.grupo === 'flujo')
    const calidad = PROCESOS_FV.filter(p => p.grupo === 'calidad')
    const vaciado = datos?.total.vaciado || 0
    const wip = useMemo(() => (datos?.enProceso || []).slice().sort((a, b) => b.piezas - a.piezas), [datos])
    const wipMax = Math.max(1, ...wip.map(w => w.piezas))

    return (
        <div className="p-3 sm:p-4 space-y-3 max-w-[1800px] mx-auto">
            {/* Encabezado de la sección y filtros */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-[#324354] leading-tight">Indicadores Fibra (FV)</h2>
                    <p className="text-[11px] text-slate-500 font-semibold">
                        Piezas registradas en cada proceso {tipo === 'dia' ? 'en el día' : 'en el mes'}
                        {datos && <> · actualizado {new Date(datos.actualizado).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</>}
                        {tipo === 'dia' && fecha === hoy() && ' · se actualiza solo cada 2 min'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {(['dia', 'mes'] as const).map(t => (
                            <button key={t} onClick={() => setTipo(t)}
                                className={`px-3 rounded-md text-[11px] font-bold uppercase ${tipo === t ? 'bg-[#324354] text-white' : 'text-slate-500 hover:text-[#324354]'}`}>{t === 'dia' ? 'Día' : 'Mes'}</button>
                        ))}
                    </div>
                    {tipo === 'dia'
                        ? <input type="date" value={fecha} max={hoy()} onChange={e => e.target.value && setFecha(e.target.value)} className="h-8 px-2 bg-white border border-[#e2ded5] rounded-lg text-xs font-semibold text-[#324354]" />
                        : <input type="month" value={mes} max={hoy().slice(0, 7)} onChange={e => e.target.value && setMes(e.target.value)} className="h-8 px-2 bg-white border border-[#e2ded5] rounded-lg text-xs font-semibold text-[#324354]" />}
                    <button onClick={cargar} disabled={cargando} title="Actualizar"
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#324354] text-white hover:bg-[#254153] disabled:opacity-50">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-3 py-2 rounded-lg bg-[#d14747]/10 border border-[#d14747]/40 text-[#d14747] text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} /> No se pudieron cargar los indicadores: {error}
                </div>
            )}
            {!datos && cargando && (
                <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold"><Loader2 className="animate-spin" size={18} /> Cargando registros…</div>
            )}

            {datos && (
                <>
                    {/* 1. Principal: acumulado por proceso en el orden del flujo */}
                    <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#e2ded5]">
                        <div className="text-xs sm:text-sm font-black text-[#324354] mb-2">Acumulado por proceso</div>
                        <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
                            {flujo.map((p, i) => {
                                const cedi = p.id === 'cedi'
                                return (
                                    <div key={p.id} className="relative">
                                        <div className={`rounded-xl border px-2 py-2 text-center ${cedi ? 'bg-[#59a96a] border-[#59a96a] text-white' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wide ${cedi ? 'text-white/85' : 'text-[#7B8E90]'}`}>{p.label}</div>
                                            <div className={`text-xl sm:text-2xl font-black leading-tight ${cedi ? 'text-white' : datos.total[p.id] ? 'text-[#324354]' : 'text-slate-300'}`}>{num(datos.total[p.id])}</div>
                                        </div>
                                        {i < flujo.length - 1 && <ChevronRight size={14} className="hidden lg:block absolute -right-[11px] top-1/2 -translate-y-1/2 text-slate-300" />}
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                        {/* 2. CEDI acumulado */}
                        <section className="xl:col-span-2 bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#e2ded5]">
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                                <div className="text-xs sm:text-sm font-black text-[#324354]">CEDI acumulado {tipo === 'dia' ? 'por hora' : 'por día'}</div>
                                <div className="text-xs font-bold text-[#2f7a40]">{num(datos.total.cedi)} piezas</div>
                            </div>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={serieCedi} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="cediAcum" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#59a96a" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#59a96a" stopOpacity={0.03} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#eef0f2" vertical={false} />
                                        <XAxis dataKey="cubeta" tick={{ fontSize: 11, fill: '#7B8E90' }} tickLine={false} axisLine={{ stroke: '#e2ded5' }} interval="preserveStartEnd" />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7B8E90' }} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ stroke: '#324354', strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null
                                                const d = payload[0].payload as { cubeta: string; enCubeta: number; acumulado: number }
                                                return (
                                                    <div className="bg-white border border-[#e2ded5] rounded-lg shadow-md px-3 py-2 text-xs">
                                                        <div className="font-black text-[#324354]">{tipo === 'dia' ? d.cubeta : `Día ${d.cubeta}`}</div>
                                                        <div className="text-slate-600">{tipo === 'dia' ? 'En la hora' : 'En el día'}: <b>{num(d.enCubeta)}</b></div>
                                                        <div className="text-[#2f7a40]">Acumulado: <b>{num(d.acumulado)}</b></div>
                                                    </div>
                                                )
                                            }} />
                                        <Area type="monotone" dataKey="acumulado" stroke="#59a96a" strokeWidth={2} fill="url(#cediAcum)" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* 3. Indicadores nuevos */}
                        <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div>
                                <div className="text-[10px] font-black uppercase text-[#7B8E90] flex items-center gap-1"><Clock size={12} /> Tiempo de ciclo Pintura → CEDI</div>
                                {datos.cicloPromedioDias === null
                                    ? <div className="text-sm font-bold text-slate-400 mt-0.5">Sin piezas en CEDI en el período</div>
                                    : <div className="flex items-baseline gap-2"><span className="text-2xl font-black text-[#324354]">{datos.cicloPromedioDias.toLocaleString('es-CO', { maximumFractionDigits: 1 })} días</span><span className="text-[11px] text-slate-500 font-semibold">promedio de {num(datos.cicloPiezas)} pieza(s)</span></div>}
                            </div>
                            <div className="border-t border-slate-100 pt-2">
                                <div className="text-[10px] font-black uppercase text-[#7B8E90] mb-1">Calidad del período</div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {calidad.map(p => (
                                        <div key={p.id} className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-center">
                                            <div className="text-[9px] font-black uppercase text-[#7B8E90]">{p.label}</div>
                                            <div className={`text-lg font-black ${datos.total[p.id] ? 'text-[#d14747]' : 'text-slate-300'}`}>{num(datos.total[p.id])}</div>
                                            <div className="text-[9px] text-slate-400 font-semibold">{vaciado ? `${(100 * datos.total[p.id] / vaciado).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % del vaciado` : 'sin vaciado'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-2">
                                <div className="text-[10px] font-black uppercase text-[#7B8E90] mb-1">Inventario en proceso ahora</div>
                                {wip.length === 0 ? <div className="text-xs text-slate-400 font-semibold">Sin piezas en proceso</div> : (
                                    <div className="space-y-1">
                                        {wip.map(w => (
                                            <div key={w.estado} className="flex items-center gap-2 text-[11px]" title={`${w.piezas} pieza(s) en ${ESTADO_LABEL[w.estado] || w.estado}`}>
                                                <span className="w-32 truncate font-semibold text-slate-600">{ESTADO_LABEL[w.estado] || w.estado}</span>
                                                <span className="flex-1 h-2.5 bg-slate-100 rounded"><span className="block h-full rounded bg-[#324354]" style={{ width: `${(100 * w.piezas) / wipMax}%` }} /></span>
                                                <span className="w-8 text-right font-black text-[#324354]">{num(w.piezas)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Kg vaciados: resina + gelcoat (con la reducción de Parámetros FV) de las piezas vaciadas */}
                    <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#e2ded5]">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                            <div className="text-xs sm:text-sm font-black text-[#324354]">Kg vaciados {tipo === 'dia' ? 'por hora' : 'por día'} <span className="text-[10px] font-semibold text-slate-400">· resina + gelcoat</span></div>
                            <div className="text-xs font-bold text-[#324354]">
                                {kgFmt(datos.kgTotal)} Kg
                                {datos.kgSinDato > 0 && <span className="ml-2 text-[#d14747]" title="Piezas vaciadas cuyo producto no tiene kilos en Parámetros FV: no suman">· {datos.kgSinDato} pieza(s) sin kilos en Parámetros</span>}
                            </div>
                        </div>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={serieKg} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid stroke="#eef0f2" vertical={false} />
                                    <XAxis dataKey="cubeta" tick={{ fontSize: 11, fill: '#7B8E90' }} tickLine={false} axisLine={{ stroke: '#e2ded5' }} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 11, fill: '#7B8E90' }} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#324354', fillOpacity: 0.06 }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null
                                            const d = payload[0].payload as { cubeta: string; kg: number; piezas: number }
                                            return (
                                                <div className="bg-white border border-[#e2ded5] rounded-lg shadow-md px-3 py-2 text-xs">
                                                    <div className="font-black text-[#324354]">{tipo === 'dia' ? d.cubeta : `Día ${d.cubeta}`}</div>
                                                    <div className="text-slate-600">Kg: <b>{kgFmt(d.kg)}</b></div>
                                                    <div className="text-slate-600">Piezas vaciadas: <b>{d.piezas}</b></div>
                                                </div>
                                            )
                                        }} />
                                    <Bar dataKey="kg" fill="#324354" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                        <LabelList dataKey="kg" position="top" formatter={(v: any) => (Number(v) > 0 ? kgFmt(Number(v)) : '')} style={{ fontSize: 10, fill: '#324354', fontWeight: 700 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* 4. Hora a hora (día) o día a día (mes) de todos los procesos */}
                    <section className="bg-white rounded-2xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-black text-[#324354]">{tipo === 'dia' ? 'Hora a hora' : 'Día a día'} por proceso</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#324354] text-white">
                                    <tr>
                                        <th className="sticky left-0 bg-[#324354] px-3 py-2 text-left font-black uppercase text-[10px]">Proceso</th>
                                        {columnas.map(c => <th key={c} className="px-2 py-2 text-center font-bold whitespace-nowrap">{tipo === 'dia' ? `${Number(c)}:00` : Number(c)}</th>)}
                                        <th className="px-3 py-2 text-center font-black uppercase text-[10px] bg-[#254153]">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {PROCESOS_FV.map(p => (
                                        <tr key={p.id} className={p.id === 'cedi' ? 'bg-[#59a96a]/10' : p.grupo === 'calidad' ? 'bg-slate-50/60' : ''}>
                                            <td className={`sticky left-0 px-3 py-1.5 ${p.id === 'cedi' ? 'bg-[#e6f2e9]' : p.grupo === 'calidad' ? 'bg-slate-50' : 'bg-white'}`} ><span className="font-black text-[#324354] whitespace-nowrap">{p.label}</span></td>
                                            {columnas.map(c => {
                                                const v = datos.conteo[p.id][c] || 0
                                                return <td key={c} className={`px-2 py-1.5 text-center ${v ? 'font-black text-[#324354]' : 'text-slate-300'}`}>{v}</td>
                                            })}
                                            <td className="px-3 py-1.5 text-center font-black text-[#324354] bg-slate-50">{num(datos.total[p.id])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
