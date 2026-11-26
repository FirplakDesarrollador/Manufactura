'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { plantaDeMolde } from '@/lib/supabase/queries/fibra_moldes'
import { serialConT, limiteDesmanchado } from '@/lib/supabase/queries/pintura'
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react'
import IconoDesmanchado from './IconoDesmanchado'

// Moldes de Mármol: vueltas actuales contra su límite de desmanchado (columna Vueltas_Desmanchado de la tabla moldes).
// Lógica de salida: si vueltas actuales >= Vueltas_Desmanchado (y el límite es mayor que cero) el molde sale solo:
// Supabase lo deja estado "Por desmanchar" y Estado_reparacion "En espera-produccion".
// 1 = Por desmanchar (o ya llegó al límite) → sacarlo a desmanchar.
// 2 = le faltan 2 vueltas o menos (o va en el 85 %) → próximo a desmanchar.
// 3 = ya está en desmanchado: tiene una reparación abierta en Registro moldes (BD_moldes) por "Límite de vueltas
//     alcanzado" / "Desmanchado", sin entregar. Es la misma lista que muestra esa app.
// Los demás moldes en reparación (otros daños) no entran en 1, 2 ni 3.

interface MoldeVueltas {
    id: number
    serial: string
    estado: string
    estado_reparacion: string | null
    nombre_articulo: string | null
    vueltas_actuales: number
    mto: number                    // límite de desmanchado (Vueltas_Desmanchado)
    modified_at: string | null
    desmanche: { fechaEntrada: string | null } | null   // reparación de desmanchado abierta en BD_moldes
}

type Nivel = 'sacar' | 'proximo' | 'desmanchando' | 'reparacion' | 'ok' | 'sin_mto'

const FALTAN_PROXIMO = 2
const PORC_PROXIMO = 0.85

const enReparacion = (estado: string) => /reparac/i.test(estado || '')
const porDesmanchar = (estado: string) => /por desmanchar/i.test(estado || '')

const nivelDe = (m: MoldeVueltas): Nivel => {
    if (porDesmanchar(m.estado)) return 'sacar'
    if (enReparacion(m.estado)) return m.desmanche ? 'desmanchando' : 'reparacion'
    if (!(m.mto > 0)) return 'sin_mto'
    if (m.vueltas_actuales >= m.mto) return 'sacar'
    if (m.mto - m.vueltas_actuales <= FALTAN_PROXIMO || m.vueltas_actuales / m.mto >= PORC_PROXIMO) return 'proximo'
    return 'ok'
}

const claveSerial = (s: string | null | undefined) => (s || '').trim().toLowerCase()

// Reparaciones de desmanchado abiertas en Registro moldes (BD_moldes): serial → fecha de entrada
async function cargarDesmanchesAbiertos(): Promise<Map<string, string | null>> {
    const mapa = new Map<string, string | null>()
    const { data, error } = await supabase
        .from('BD_moldes')
        .select('"CODIGO MOLDE", ESTADO, "DEFECTOS A REPARAR", "FECHA ENTRADA"')
        .not('ESTADO', 'ilike', '%entregado%')
    if (error) {
        console.error('No se pudo leer Registro moldes (BD_moldes):', error)
        return mapa
    }
    for (const r of (data || []) as Record<string, string | null>[]) {
        if (/destru/i.test(r['ESTADO'] || '')) continue
        if (!/vueltas|desmanch/i.test(r['DEFECTOS A REPARAR'] || '')) continue
        const k = claveSerial(r['CODIGO MOLDE'])
        const f = r['FECHA ENTRADA']
        if (!mapa.has(k) || (f && (mapa.get(k) || '') < f)) mapa.set(k, f)
    }
    return mapa
}

// Fecha de entrada a desmanchado (FECHA ENTRADA de Registro moldes; si no hay, la última modificación del molde).
// Las fechas sin hora (AAAA-MM-DD) se leen a mediodía para que no se corran un día por la zona horaria.
const aFecha = (fecha: string | null) => fecha ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00` : fecha) : null
const entradaDe = (m: MoldeVueltas) => m.desmanche?.fechaEntrada || m.modified_at
const diasDesde = (fecha: string | null) => {
    const d = aFecha(fecha)
    if (!d) return null
    const ms = Date.now() - d.getTime()
    return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86400000)) : null
}
const fechaCorta = (fecha: string | null) =>
    aFecha(fecha)?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) ?? '—'

async function cargarMoldesMs(): Promise<MoldeVueltas[]> {
    const filas: {
        id: number; serial: string; estado: string; Estado_reparacion: string | null; nombre_articulo: string | null
        vueltas_actuales: number | null; Vueltas_Desmanchado: number | null; Vuletas_MTO: number | null; modified_at: string | null
    }[] = []
    const desmanches = cargarDesmanchesAbiertos()
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase
            .from('moldes')
            .select('id, serial, estado, Estado_reparacion, nombre_articulo, vueltas_actuales, Vueltas_Desmanchado, Vuletas_MTO, modified_at')
            .neq('estado', 'Destruido')
            .order('id')
            .range(desde, desde + 999)
        if (error) throw new Error(`No se pudieron leer los moldes: ${error.message}`)
        filas.push(...(data || []))
        if (!data || data.length < 1000) break
    }
    const abiertos = await desmanches
    return filas
        .filter(m => plantaDeMolde(m.nombre_articulo || '') === 'MS' && !serialConT(m.serial))
        .map(m => ({
            id: m.id,
            serial: m.serial,
            estado: m.estado,
            estado_reparacion: m.Estado_reparacion,
            nombre_articulo: m.nombre_articulo,
            vueltas_actuales: Number(m.vueltas_actuales || 0),
            mto: limiteDesmanchado(m),
            modified_at: m.modified_at,
            desmanche: abiertos.has(claveSerial(m.serial)) ? { fechaEntrada: abiertos.get(claveSerial(m.serial)) ?? null } : null
        }))
}

const ESTILO_NIVEL: Record<Nivel, { texto: string; clase: string }> = {
    sacar: { texto: '1 · Sacar a desmanchar', clase: 'bg-red-100 text-red-800 border-red-300' },
    proximo: { texto: '2 · Próximo', clase: 'bg-amber-100 text-amber-800 border-amber-300' },
    desmanchando: { texto: '3 · En desmanchado', clase: 'bg-sky-100 text-sky-800 border-sky-300' },
    reparacion: { texto: 'En reparación (otro daño)', clase: 'bg-gray-100 text-gray-600 border-gray-300' },
    ok: { texto: 'Al día', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sin_mto: { texto: 'Sin límite de vueltas', clase: 'bg-gray-100 text-gray-500 border-gray-200' }
}

function BarraVueltas({ actuales, mto, nivel }: { actuales: number; mto: number; nivel: Nivel }) {
    const pct = mto > 0 ? Math.min(100, Math.round((actuales / mto) * 100)) : 0
    const color = nivel === 'sacar' ? 'bg-red-500' : nivel === 'proximo' ? 'bg-amber-500' : 'bg-emerald-500'
    return (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
            <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    )
}

const TONOS = {
    rojo: { borde: 'border-red-300', fondo: 'bg-red-600', numero: '#dc2626', texto: 'text-red-700' },
    ambar: { borde: 'border-amber-300', fondo: 'bg-amber-500', numero: '#d97706', texto: 'text-amber-700' },
    azul: { borde: 'border-sky-300', fondo: 'bg-sky-600', numero: '#0284c7', texto: 'text-sky-700' }
}

function ListaNivel({ numero, titulo, ayuda, moldes, tono, vacio, detalle }: {
    numero: number; titulo: string; ayuda: string; moldes: MoldeVueltas[]; tono: keyof typeof TONOS; vacio: string
    detalle: (m: MoldeVueltas) => { principal: React.ReactNode; secundario: string }
}) {
    const t = TONOS[tono]
    return (
        <section className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col ${t.borde}`}>
            <div className={`flex items-center gap-3 px-4 py-3 ${t.fondo} text-white`}>
                <span className="h-10 w-10 shrink-0 rounded-full bg-white/95 flex items-center justify-center text-xl font-black" style={{ color: t.numero }}>
                    {numero}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black uppercase tracking-wide leading-tight">{titulo}</h3>
                    <p className="text-[11px] font-semibold opacity-90 leading-tight">{ayuda}</p>
                </div>
                <span className="text-3xl font-black tabular-nums">{moldes.length}</span>
            </div>
            {moldes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                    <p className="text-sm font-medium">{vacio}</p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                    {moldes.map(m => {
                        const d = detalle(m)
                        return (
                            <li key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-[#254153]">{m.serial}</p>
                                    <p className="text-[11px] text-gray-500 truncate">{m.nombre_articulo || 'Sin nombre'} · {m.estado}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-lg font-black tabular-nums ${t.texto}`}>{d.principal}</p>
                                    <p className="text-[10px] font-bold text-gray-500">{d.secundario}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? '' : 's'}`

export default function DesmanchadoMoldes() {
    const [moldes, setMoldes] = useState<MoldeVueltas[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState<'todos' | Nivel>('todos')

    const cargar = async () => {
        setCargando(true)
        setError(null)
        try {
            setMoldes(await cargarMoldesMs())
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar los moldes')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const sacar = useMemo(() => moldes.filter(m => nivelDe(m) === 'sacar')
        .sort((a, b) => (b.vueltas_actuales - b.mto) - (a.vueltas_actuales - a.mto)), [moldes])
    const proximos = useMemo(() => moldes.filter(m => nivelDe(m) === 'proximo')
        .sort((a, b) => (a.mto - a.vueltas_actuales) - (b.mto - b.vueltas_actuales)), [moldes])
    // Los que llevan más días en desmanchado, primero
    const desmanchando = useMemo(() => moldes.filter(m => nivelDe(m) === 'desmanchando')
        .sort((a, b) => (entradaDe(a) || '').localeCompare(entradaDe(b) || '')), [moldes])
    const alDia = useMemo(() => moldes.filter(m => nivelDe(m) === 'ok').length, [moldes])

    const tabla = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        const orden: Record<Nivel, number> = { sacar: 0, proximo: 1, desmanchando: 2, ok: 3, reparacion: 4, sin_mto: 5 }
        return moldes
            .filter(m => filtro === 'todos' || nivelDe(m) === filtro)
            .filter(m => !q || m.serial.toLowerCase().includes(q) || (m.nombre_articulo || '').toLowerCase().includes(q))
            .sort((a, b) => orden[nivelDe(a)] - orden[nivelDe(b)]
                || (b.mto > 0 ? b.vueltas_actuales / b.mto : 0) - (a.mto > 0 ? a.vueltas_actuales / a.mto : 0))
    }, [moldes, busqueda, filtro])

    return (
        <div className="space-y-4 pb-4">
            {/* Encabezado */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-[#254153] rounded-lg text-white shadow">
                        <IconoDesmanchado className="w-6 h-6" />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-[#254153]">Desmanchado de moldes</h2>
                        <p className="text-xs text-gray-500">Vueltas actuales de cada molde de Mármol contra su límite de desmanchado.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={14} /> {alDia} al día
                    </span>
                    <button
                        onClick={cargar}
                        disabled={cargando}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                        title="Actualizar"
                        aria-label="Actualizar"
                    >
                        <RefreshCw className={cargando ? 'animate-spin' : ''} size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {cargando && !moldes.length ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00bcd4]" />
                    <span className="text-sm font-medium">Cargando moldes…</span>
                </div>
            ) : (
                <>
                    {/* 1, 2 y 3 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <ListaNivel
                            numero={1}
                            titulo="Sacar a desmanchar"
                            ayuda="Por desmanchar: llegaron a su límite de vueltas"
                            moldes={sacar}
                            tono="rojo"
                            vacio="Ningún molde para desmanchar"
                            detalle={m => {
                                const demas = m.vueltas_actuales - m.mto
                                return {
                                    principal: <>{m.vueltas_actuales}<span className="text-xs text-gray-400 font-bold"> / {m.mto || '—'}</span></>,
                                    // Cumplió sus vueltas: le queda 1 vuelta extra; con la extra usada queda bloqueado
                                    secundario: demas > 0
                                        ? 'Vuelta extra usada · BLOQUEADO'
                                        : m.estado === 'En uso'
                                            ? 'Completa sus vueltas: al desmoldar queda Por desmanchar'
                                            : `${porDesmanchar(m.estado) ? 'Por desmanchar' : 'Cumplió sus vueltas'} · queda 1 vuelta extra`
                                }
                            }}
                        />
                        <ListaNivel
                            numero={2}
                            titulo="Próximos a desmanchar"
                            ayuda={`Les faltan ${FALTAN_PROXIMO} vueltas o menos`}
                            moldes={proximos}
                            tono="ambar"
                            vacio="Ningún molde próximo a desmanchar"
                            detalle={m => {
                                const faltan = m.mto - m.vueltas_actuales
                                return {
                                    principal: <>{m.vueltas_actuales}<span className="text-xs text-gray-400 font-bold"> / {m.mto}</span></>,
                                    secundario: `Falta${faltan === 1 ? '' : 'n'} ${plural(faltan, 'vuelta')}`
                                }
                            }}
                        />
                        <ListaNivel
                            numero={3}
                            titulo="En desmanchado"
                            ayuda="En reparación por desmanchado (Registro moldes)"
                            moldes={desmanchando}
                            tono="azul"
                            vacio="Ningún molde en desmanchado"
                            detalle={m => {
                                const dias = diasDesde(entradaDe(m))
                                return {
                                    principal: dias == null ? '—' : <>{dias}<span className="text-xs text-gray-400 font-bold"> {dias === 1 ? 'día' : 'días'}</span></>,
                                    secundario: `Entró ${fechaCorta(entradaDe(m))}`
                                }
                            }}
                        />
                    </div>

                    {/* Todos los moldes */}
                    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-sm font-black text-[#254153] mr-auto flex items-center gap-2">
                                <Clock size={16} className="text-[#00bcd4]" /> Vueltas de todos los moldes
                                <span className="text-xs font-bold text-gray-400">({tabla.length})</span>
                            </h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    placeholder="Buscar serial o molde"
                                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/40"
                                />
                            </div>
                            <select
                                value={filtro}
                                onChange={e => setFiltro(e.target.value as typeof filtro)}
                                className="py-1.5 px-2 text-sm border border-gray-200 rounded-lg bg-white"
                                aria-label="Filtrar por estado de desmanchado"
                            >
                                <option value="todos">Todos</option>
                                <option value="sacar">1 · Sacar a desmanchar</option>
                                <option value="proximo">2 · Próximos</option>
                                <option value="desmanchando">3 · En desmanchado</option>
                                <option value="ok">Al día</option>
                                <option value="reparacion">En reparación (otro daño)</option>
                                <option value="sin_mto">Sin límite de vueltas</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-[#00a3e0] text-white text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-black">Serial</th>
                                        <th className="text-left px-4 py-2 font-black">Molde</th>
                                        <th className="text-left px-4 py-2 font-black">Estado</th>
                                        <th className="text-right px-4 py-2 font-black">Vueltas actuales</th>
                                        <th className="text-right px-4 py-2 font-black">Límite desmanchado</th>
                                        <th className="px-4 py-2 font-black w-40">Avance</th>
                                        <th className="text-left px-4 py-2 font-black">Desmanchado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tabla.map(m => {
                                        const nivel = nivelDe(m)
                                        const estilo = ESTILO_NIVEL[nivel]
                                        const enRep = nivel === 'desmanchando' || nivel === 'reparacion'
                                        return (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-black text-[#254153] whitespace-nowrap">{m.serial}</td>
                                                <td className="px-4 py-2 text-gray-600">{m.nombre_articulo || '—'}</td>
                                                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{m.estado}</td>
                                                <td className="px-4 py-2 text-right font-black tabular-nums">{m.vueltas_actuales}</td>
                                                <td className="px-4 py-2 text-right font-bold tabular-nums text-gray-600">{m.mto > 0 ? m.mto : '—'}</td>
                                                <td className="px-4 py-2">
                                                    {enRep
                                                        ? <span className="text-[11px] text-gray-400">Desde {fechaCorta(entradaDe(m))}</span>
                                                        : <BarraVueltas actuales={m.vueltas_actuales} mto={m.mto} nivel={nivel} />}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md border ${estilo.clase}`}>
                                                        {estilo.texto}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {!tabla.length && (
                                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay moldes con ese filtro</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
