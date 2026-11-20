'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, ClipboardEdit, Download, Factory, ListOrdered, Loader2, Search, TrendingUp } from 'lucide-react'
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi'
import {
    FAMILIAS, NOMBRE_FAMILIA, NOMBRE_PLANTA_PROD, PARAMETROS_INICIALES, PLANTAS_PROD, indicadoresFirplak, perdidasPlanta, prodPlanta, promedio,
    type DiaPlanta, type Familia, type ParametrosProd, type Paro, type PlantaProd
} from '@/lib/productividad/calculo'
import { cargarActivas, cargarDias, cargarParametros, cargarParos } from '@/lib/productividad/datos'
import { BarrasH, BarrasPct, Columnas, LineaPct, PerdidasApiladas, RealVsObjetivo, Recuadro, Tarjeta, numero, pct, semaforo } from './graficas'
import RegistroProduccionDia from './RegistroProduccionDia'

// Tablero de Control → Productividad. Reemplaza el Power BI "Nivel de Productividad" (hojas FPK1–FPK4, Top paros,
// PHH MS, PHH MBL-CEFI, MBL1–MBL3) con los datos de Supabase (productividad.sql) y el registro diario.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
type Pestana = 'general' | 'paros' | 'detalle' | 'planta' | 'registro'
const PESTANAS: { id: Pestana; label: string; icono: React.ReactNode }[] = [
    { id: 'general', label: 'General FIRPLAK', icono: <TrendingUp size={14} /> },
    { id: 'paros', label: 'Paros y pérdidas', icono: <BarChart3 size={14} /> },
    { id: 'detalle', label: 'Detalle de paros', icono: <ListOrdered size={14} /> },
    { id: 'planta', label: 'Por planta', icono: <Factory size={14} /> },
    { id: 'registro', label: 'Registrar día', icono: <ClipboardEdit size={14} /> },
]

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const etiquetaMes = (k: string, variosAnios: boolean) => `${MESES[Number(k.slice(5, 7)) - 1].slice(0, 3)}${variosAnios ? ` ${k.slice(2, 4)}` : ''}`
const fechaCorta = (f: string) => `${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}`

interface Periodo { anios: number[]; meses: number[]; semanas: string[]; dias: string[] }
const enPeriodo = (f: string, p: Periodo) =>
    (!p.anios.length || p.anios.includes(Number(f.slice(0, 4)))) && (!p.meses.length || p.meses.includes(Number(f.slice(5, 7)))) &&
    (!p.semanas.length || p.semanas.includes(semanaIso(f).clave)) && (!p.dias.length || p.dias.includes(f))

/** Agrupa por mes y promedia (como el Power BI: promedio de los días). */
function porMes<T extends { fecha: string }>(filas: T[], valor: (x: T) => number | null | undefined) {
    const m = new Map<string, (number | null | undefined)[]>()
    for (const x of filas) { const k = x.fecha.slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k)!.push(valor(x)) }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ k, valor: promedio(v) }))
}
/** Serie diaria si son pocos días, semanal si son muchos. */
function seguimiento<T extends { fecha: string }>(filas: T[], valor: (x: T) => number | null | undefined) {
    const dias = [...new Set(filas.map(f => f.fecha))]
    if (dias.length <= 45) return { gran: 'Diario', datos: filas.map(x => ({ key: x.fecha, label: fechaCorta(x.fecha), titulo: x.fecha.split('-').reverse().join('/'), valor: valor(x) ?? null })) }
    const m = new Map<string, (number | null | undefined)[]>()
    for (const x of filas) { const k = semanaIso(x.fecha).clave; if (!m.has(k)) m.set(k, []); m.get(k)!.push(valor(x)) }
    return { gran: 'Semanal', datos: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, label: `S${Number(k.slice(6))}`, titulo: `Semana ${Number(k.slice(6))} · ${k.slice(0, 4)}`, valor: promedio(v) })) }
}

export default function ProductividadView() {
    const [pestana, setPestana] = useState<Pestana>('general')
    const [dias, setDias] = useState<DiaPlanta[]>([])
    const [activas, setActivas] = useState<Map<string, string>>(new Map())
    const [params, setParams] = useState<ParametrosProd>(PARAMETROS_INICIALES)
    const [paros, setParos] = useState<Paro[] | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [version, setVersion] = useState(0)

    const anioActual = Number(hoy().slice(0, 4))
    const [periodo, setPeriodo] = useState<Periodo>({ anios: [anioActual], meses: [], semanas: [], dias: [] })
    const [plantasSel, setPlantasSel] = useState<string[]>([])

    useEffect(() => {
        let vivo = true
        setCargando(true)
        Promise.all([cargarDias(), cargarActivas(), cargarParametros()])
            .then(([d, a, p]) => { if (!vivo) return; setDias(d); setActivas(a); setParams(p); setError(null) })
            .catch(e => vivo && setError(e instanceof Error ? e.message : String(e)))
            .finally(() => vivo && setCargando(false))
        return () => { vivo = false }
    }, [version])

    // Los paros (≈14 mil filas) se cargan al abrir una pestaña que los usa
    useEffect(() => {
        if (paros || !(pestana === 'paros' || pestana === 'detalle')) return
        cargarParos({ desde: '2023-01-01' }).then(setParos).catch(e => setError(e instanceof Error ? e.message : String(e)))
    }, [pestana, paros])

    // Opciones de filtros con datos
    const fechas = useMemo(() => [...new Set(dias.map(d => d.fecha))].sort(), [dias])
    const aniosDisp = useMemo(() => [...new Set([...fechas.map(f => Number(f.slice(0, 4))), anioActual])].sort((a, b) => b - a), [fechas, anioActual])
    const fechasAnioMes = fechas.filter(f => (!periodo.anios.length || periodo.anios.includes(Number(f.slice(0, 4)))) && (!periodo.meses.length || periodo.meses.includes(Number(f.slice(5, 7)))))
    const variosAnios = (periodo.anios.length || aniosDisp.length) > 1
    const opcSemana = useMemo(() => {
        const m = new Map<string, string>(); fechasAnioMes.forEach(f => { const s = semanaIso(f); m.set(s.clave, `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}`) })
        return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, label]) => ({ value, label }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechasAnioMes.join(), variosAnios])
    const opcDia = fechasAnioMes.filter(f => !periodo.semanas.length || periodo.semanas.includes(semanaIso(f).clave)).map(f => ({ value: f, label: f.split('-').reverse().join('/') }))
    const set = (k: keyof Periodo, v: (string | number)[]) => setPeriodo(p => {
        const n = { ...p, [k]: v } as Periodo
        if (k === 'anios' || k === 'meses') { n.semanas = []; n.dias = [] }
        if (k === 'semanas') n.dias = []
        return n
    })

    const filtros = (
        <div className="flex flex-wrap items-start gap-2 justify-end">
            {pestana !== 'planta' && pestana !== 'registro' && (
                <FiltroPbi compacto titulo="Planta" seleccion={plantasSel} opciones={PLANTAS_PROD.map(p => ({ value: p, label: `${p} · ${NOMBRE_PLANTA_PROD[p]}` }))} onChange={setPlantasSel} onBorrar={() => setPlantasSel([])} puedeBorrar={plantasSel.length > 0} />
            )}
            <FiltroPbi compacto titulo="Año" seleccion={periodo.anios.map(String)} opciones={aniosDisp.map(a => ({ value: String(a), label: String(a) }))} onChange={v => set('anios', v.map(Number))} onBorrar={() => set('anios', [])} puedeBorrar={periodo.anios.length > 0} />
            <FiltroPbi compacto titulo="Mes" seleccion={periodo.meses.map(String)} opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={v => set('meses', v.map(Number))} onBorrar={() => set('meses', [])} puedeBorrar={periodo.meses.length > 0} />
            <FiltroPbi compacto titulo="Semana" seleccion={periodo.semanas} opciones={opcSemana} onChange={v => set('semanas', v)} onBorrar={() => set('semanas', [])} puedeBorrar={periodo.semanas.length > 0} />
            <FiltroPbi compacto titulo="Día" seleccion={periodo.dias} opciones={opcDia} onChange={v => set('dias', v)} onBorrar={() => set('dias', [])} puedeBorrar={periodo.dias.length > 0} />
        </div>
    )

    return (
        <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Productividad de las plantas</h2>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {PESTANAS.map(t => (
                            <button key={t.id} onClick={() => setPestana(t.id)}
                                className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap ${pestana === t.id ? 'bg-[#324354] text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                {t.icono}{t.label}
                            </button>
                        ))}
                    </div>
                </div>
                {pestana !== 'registro' && filtros}
            </div>

            {error && (
                <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-800 flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>
            )}

            {cargando && pestana !== 'registro' ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : pestana === 'general' ? (
                <General dias={dias} activas={activas} params={params} periodo={periodo} plantas={plantasSel as PlantaProd[]} variosAnios={variosAnios} />
            ) : pestana === 'paros' ? (
                paros ? <Paros paros={paros} periodo={periodo} plantas={plantasSel} /> : <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : pestana === 'detalle' ? (
                paros ? <DetalleParos paros={paros} periodo={periodo} plantas={plantasSel} /> : <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : pestana === 'planta' ? (
                <Planta params={params} periodo={periodo} variosAnios={variosAnios} version={version} />
            ) : (
                <RegistroProduccionDia params={params} onGuardado={() => { setVersion(v => v + 1); setParos(null) }} />
            )}
        </section>
    )
}

// ------------------------------------------------------------------------------------------------
// General FIRPLAK (FPK1): productividad ponderada de las plantas activas y pérdidas por familia
// ------------------------------------------------------------------------------------------------
function General({ dias, activas, params, periodo, plantas, variosAnios }: { dias: DiaPlanta[]; activas: Map<string, string>; params: ParametrosProd; periodo: Periodo; plantas: PlantaProd[]; variosAnios: boolean }) {
    const [mesSel, setMesSel] = useState<string | null>(null)
    const todos = useMemo(() => indicadoresFirplak(dias, activas, params, plantas.length ? plantas : PLANTAS_PROD), [dias, activas, params, plantas])
    const ind = todos.filter(i => i.prod != null && enPeriodo(i.fecha, periodo))
    const indSel = mesSel ? ind.filter(i => i.fecha.startsWith(mesSel)) : ind
    const meses = porMes(ind, i => i.prod).map(m => ({ key: m.k, label: etiquetaMes(m.k, variosAnios), titulo: `${MESES[Number(m.k.slice(5, 7)) - 1]} ${m.k.slice(0, 4)}`, valor: m.valor }))
    const seg = seguimiento(indSel, i => i.prod)
    const perdMes = [...new Set(ind.map(i => i.fecha.slice(0, 7)))].sort().map(k => {
        const del = ind.filter(i => i.fecha.startsWith(k))
        const r: Record<string, number | string | null> = { key: k, label: etiquetaMes(k, variosAnios), titulo: `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`, total: promedio(del.map(i => i.totalPerdidas)) }
        FAMILIAS.forEach(f => { r[f] = promedio(del.map(i => i.perdidas?.[f])) })
        return r
    }) as ({ key: string; label: string; total: number | null } & Partial<Record<Familia, number>>)[]
    // Productividad promedio por planta en el periodo (cada planta con su propio indicador)
    const porPlanta = (plantas.length ? plantas : PLANTAS_PROD).map(pl => ({
        key: pl, label: pl, titulo: NOMBRE_PLANTA_PROD[pl],
        valor: promedio(dias.filter(d => d.planta === pl && enPeriodo(d.fecha, periodo) && (!mesSel || d.fecha.startsWith(mesSel))).map(d => prodPlanta(d, params))),
    }))
    const meta = params.objetivo_productividad
    const obj = params.objetivos_perdidas
    const prom = promedio(indSel.map(i => i.prod))
    const perdTot = promedio(indSel.map(i => i.totalPerdidas))
    const colorPerd = (v: number | null, o: number) => (v == null ? undefined : v <= o ? '#59a96a' : v <= o * 1.5 ? '#b8941f' : '#d14747')
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <Tarjeta destacada titulo="Productividad (x̄)" valor={pct(prom)} detalle={`${indSel.length} día(s)`} />
                <Tarjeta titulo="PHH (x̄)" valor={pct(promedio(indSel.map(i => i.phh)))} color={semaforo(promedio(indSel.map(i => i.phh)), meta)} detalle={`meta ${pct(meta, 0)}`} />
                <Tarjeta titulo="Pérdidas totales" valor={pct(perdTot)} color={colorPerd(perdTot, obj.total)} detalle={`obj. ${pct(obj.total, 0)}`} />
                {(['EXPLOTACION', 'AVERIA', 'INDUCIDO', 'FUNCIONAL'] as Familia[]).map(f => {
                    const v = promedio(indSel.map(i => i.perdidas?.[f]))
                    return <Tarjeta key={f} titulo={NOMBRE_FAMILIA[f]} valor={pct(v)} color={colorPerd(v, obj[f])} detalle={`obj. ${pct(obj[f], 0)}`} />
                })}
            </div>
            {mesSel && <p className="text-[11px] font-bold text-[#324354]">Mostrando {MESES[Number(mesSel.slice(5, 7)) - 1]} {mesSel.slice(0, 4)} · <button className="underline" onClick={() => setMesSel(null)}>quitar</button></p>}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Recuadro titulo="Productividad FIRPLAK por mes" alto={300}><BarrasPct datos={meses} meta={meta} onClick={k => setMesSel(s => (s === k ? null : k))} seleccion={mesSel} /></Recuadro>
                <Recuadro titulo={`Seguimiento ${seg.gran.toLowerCase()} FIRPLAK`} alto={300}><LineaPct datos={seg.datos} meta={meta} /></Recuadro>
                <Recuadro titulo="Pérdidas por familia por mes" alto={320}
                    derecha={<span className="text-[10px] font-bold text-slate-500">Objetivo {pct(obj.total, 0)}: explotación {pct(obj.EXPLOTACION, 0)} · averías {pct(obj.AVERIA, 0)} · inducido {pct(obj.INDUCIDO, 0)} · funcional {pct(obj.FUNCIONAL, 0)}</span>}>
                    <PerdidasApiladas datos={perdMes} objetivo={obj.total} />
                </Recuadro>
                <Recuadro titulo="Productividad por planta" alto={320}><BarrasPct datos={porPlanta} meta={meta} /></Recuadro>
            </div>
            <p className="text-[10px] text-slate-400">FIRPLAK = promedio ponderado de las plantas activas cada día (pesos {PLANTAS_PROD.map(p => `${p} ${pct(params.pesos[p], 0)}`).join(' · ')}). MS se mide en kilos desde el {params.inicio_ms_kg.split('-').reverse().join('/')}. Pérdidas = minutos de paros reflejados ÷ tiempo laborado.</p>
        </div>
    )
}

// ------------------------------------------------------------------------------------------------
// Paros y pérdidas (FPK2, FPK3, Top paros): horas de paro por área, planta, modo, equipo y causa
// ------------------------------------------------------------------------------------------------
const horas = (lista: Paro[]) => lista.reduce((s, p) => s + p.minutos, 0) / 60
function agrupar(lista: Paro[], clave: (p: Paro) => string | null, top = 0) {
    const m = new Map<string, number>()
    for (const p of lista) { const k = (clave(p) || 'Sin dato').trim() || 'Sin dato'; m.set(k, (m.get(k) || 0) + p.minutos / 60) }
    const r = [...m.entries()].map(([key, valor]) => ({ key, valor: Math.round(valor * 10) / 10 })).sort((a, b) => b.valor - a.valor)
    return top ? r.slice(0, top) : r
}
const norm = (s: string | null) => (s || '').trim().toUpperCase()

function filtrosParos(paros: Paro[], periodo: Periodo, plantas: string[]) {
    return paros.filter(p => enPeriodo(p.fecha, periodo) && (!plantas.length || plantas.includes(norm(p.planta))))
}

function Paros({ paros, periodo, plantas }: { paros: Paro[]; periodo: Periodo; plantas: string[] }) {
    const [familias, setFamilias] = useState<string[]>([])
    const [tipos, setTipos] = useState<string[]>(['REFLEJADO'])
    const [areas, setAreas] = useState<string[]>([])
    const [sel, setSel] = useState<{ campo: 'area' | 'modo' | 'planta' | 'equipo'; valor: string } | null>(null)
    const base = filtrosParos(paros, periodo, plantas)
    const opc = (f: (p: Paro) => string | null) => [...new Set(base.map(p => norm(f(p))).filter(Boolean))].sort().map(v => ({ value: v, label: v }))
    const filtrados = base.filter(p => (!familias.length || familias.includes(norm(p.familia))) && (!tipos.length || tipos.includes(norm(p.tipo))) && (!areas.length || areas.includes(norm(p.area_responsable))))
    const campo = { area: (p: Paro) => p.area_responsable, modo: (p: Paro) => p.modo_perdida, planta: (p: Paro) => p.planta, equipo: (p: Paro) => p.equipo }
    const conSel = (excepto?: string) => (sel && sel.campo !== excepto ? filtrados.filter(p => (campo[sel.campo](p) || 'Sin dato').trim() === sel.valor) : filtrados)
    const toggle = (c: 'area' | 'modo' | 'planta' | 'equipo') => (k: string) => setSel(s => (s?.campo === c && s.valor === k ? null : { campo: c, valor: k }))
    const total = conSel()
    const averias = total.filter(p => norm(p.familia) === 'AVERIA')
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-2">
                <FiltroPbi compacto titulo="Familia" seleccion={familias} opciones={opc(p => p.familia)} onChange={setFamilias} onBorrar={() => setFamilias([])} puedeBorrar={familias.length > 0} />
                <FiltroPbi compacto titulo="Tipo de paro" seleccion={tipos} opciones={opc(p => p.tipo)} onChange={setTipos} onBorrar={() => setTipos([])} puedeBorrar={tipos.length > 0} />
                <FiltroPbi compacto titulo="Área responsable" seleccion={areas} opciones={opc(p => p.area_responsable)} onChange={setAreas} onBorrar={() => setAreas([])} puedeBorrar={areas.length > 0} />
                {sel && <button onClick={() => setSel(null)} className="h-7 mt-3 px-2.5 rounded-lg bg-[#324354]/10 text-[#324354] text-[11px] font-bold">Quitar selección: {sel.valor} ✕</button>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Tarjeta destacada titulo="Total pérdidas (horas)" valor={numero(horas(total), 1)} detalle={`${numero(total.reduce((s, p) => s + p.minutos, 0))} min`} />
                <Tarjeta titulo="Paros registrados" valor={numero(total.length)} />
                <Tarjeta titulo="Averías (horas)" valor={numero(horas(averias), 1)} detalle={`${averias.length} paro(s)`} />
                <Tarjeta titulo="Tiempo medio por avería (min)" valor={numero(averias.length ? averias.reduce((s, p) => s + p.minutos, 0) / averias.length : null, 0)} detalle="objetivo 20" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Recuadro titulo="Horas de paro por área responsable" alto={280}><Columnas datos={agrupar(conSel('area'), campo.area)} unidad="h" onClick={toggle('area')} seleccion={sel?.campo === 'area' ? sel.valor : null} /></Recuadro>
                <Recuadro titulo="Horas de paro por planta" alto={280}><Columnas datos={agrupar(conSel('planta'), campo.planta)} unidad="h" color="#7B8E90" onClick={toggle('planta')} seleccion={sel?.campo === 'planta' ? sel.valor : null} /></Recuadro>
                <Recuadro titulo="Modo de pérdida (horas)" alto={340}><BarrasH datos={agrupar(conSel('modo'), campo.modo, 12)} unidad="h" onClick={toggle('modo')} seleccion={sel?.campo === 'modo' ? sel.valor : null} /></Recuadro>
                <Recuadro titulo="Top equipos (horas)" alto={340}><BarrasH datos={agrupar(conSel('equipo').filter(p => norm(p.equipo) && norm(p.equipo) !== 'NO APLICA'), campo.equipo, 12)} unidad="h" color="#b8423e" onClick={toggle('equipo')} seleccion={sel?.campo === 'equipo' ? sel.valor : null} /></Recuadro>
            </div>
            <Recuadro titulo="Top causas de paro (horas)" alto={360}><BarrasH datos={agrupar(total, p => p.descripcion, 15)} unidad="h" color="#7B8E90" /></Recuadro>
            <p className="text-[10px] text-slate-400">Por defecto se ven los paros reflejados (los que cuentan en la productividad). Clic en una barra filtra las demás gráficas.</p>
        </div>
    )
}

// ------------------------------------------------------------------------------------------------
// Detalle de paros (FPK4): tabla con búsqueda y descarga a Excel
// ------------------------------------------------------------------------------------------------
function DetalleParos({ paros, periodo, plantas }: { paros: Paro[]; periodo: Periodo; plantas: string[] }) {
    const [buscar, setBuscar] = useState('')
    const [limite, setLimite] = useState(200)
    const b = buscar.trim().toLowerCase()
    const lista = filtrosParos(paros, periodo, plantas).filter(p => !b || [p.descripcion, p.equipo, p.modo_perdida, p.familia, p.proceso, p.area_responsable, p.responsable, p.tipo].some(v => (v || '').toLowerCase().includes(b)))
    const exportar = async () => {
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(lista.map(p => ({ Fecha: p.fecha.split('-').reverse().join('/'), Planta: p.planta, Proceso: p.proceso || '', Familia: p.familia || '', 'Modo de pérdida': p.modo_perdida || '', Equipo: p.equipo || '', Descripción: p.descripcion || '', 'Tiempo (min)': p.minutos, 'Tipo de paro': p.tipo || '', 'Área responsable': p.area_responsable || '', Responsable: p.responsable || '' })))
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Paros'); XLSX.writeFile(wb, `paros-productividad.xlsx`)
    }
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px] max-w-[420px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar causa, equipo, modo, área…" className="w-full h-8 pl-8 pr-2 border border-slate-300 rounded-lg text-xs font-bold text-[#324354] outline-none focus:border-[#324354]" />
                </div>
                <span className="text-xs font-bold text-slate-500">{numero(lista.length)} paro(s) · {numero(horas(lista), 1)} h</span>
                <button onClick={exportar} disabled={!lista.length} className="ml-auto h-8 px-3 rounded-lg border border-[#324354] text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE] disabled:opacity-40"><Download size={14} /> Excel</button>
            </div>
            <div className="overflow-auto max-h-[600px] border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#324354] text-white text-[10px] uppercase">
                        <tr>{['Fecha', 'Planta', 'Familia', 'Proceso', 'Equipo', 'Modo de pérdida', 'Descripción', 'Min', 'Tipo', 'Área'].map(h => <th key={h} className="px-2 py-2 text-left font-bold whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lista.slice(0, limite).map((p, i) => (
                            <tr key={p.id ?? i} className="hover:bg-[#F6F3EE]">
                                <td className="px-2 py-1.5 whitespace-nowrap font-bold text-[#324354]">{p.fecha.split('-').reverse().join('/')}</td>
                                <td className="px-2 py-1.5">{p.planta}</td>
                                <td className="px-2 py-1.5">{p.familia}</td>
                                <td className="px-2 py-1.5">{p.proceso}</td>
                                <td className="px-2 py-1.5">{p.equipo}</td>
                                <td className="px-2 py-1.5">{p.modo_perdida}</td>
                                <td className="px-2 py-1.5 min-w-[220px]">{p.descripcion}</td>
                                <td className="px-2 py-1.5 text-right font-bold">{numero(p.minutos)}</td>
                                <td className="px-2 py-1.5">{p.tipo}</td>
                                <td className="px-2 py-1.5">{p.area_responsable}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {lista.length > limite && <button onClick={() => setLimite(l => l + 500)} className="text-xs font-bold text-[#324354] underline">Ver más ({numero(lista.length - limite)} restantes)</button>}
        </div>
    )
}

// ------------------------------------------------------------------------------------------------
// Por planta (PHH MS, PHH MBL-CEFI, MBL1–MBL3; también FV y RTM)
// ------------------------------------------------------------------------------------------------
const det = (d: DiaPlanta, k: string) => { const v = Number((d.detalle || {})[k]); return isFinite(v) ? v : null }

function Planta({ params, periodo, variosAnios, version }: { params: ParametrosProd; periodo: Periodo; variosAnios: boolean; version: number }) {
    const [planta, setPlanta] = useState<PlantaProd>('MS')
    const [dias, setDias] = useState<DiaPlanta[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        let vivo = true
        setDias(null)
        cargarDias({ plantas: [planta], conDetalle: true }).then(d => vivo && setDias(d)).catch(e => vivo && setError(e instanceof Error ? e.message : String(e)))
        return () => { vivo = false }
    }, [planta, version])
    const meta = params.objetivo_productividad
    const lista = (dias || []).filter(d => enPeriodo(d.fecha, periodo))
    const mes = (v: (d: DiaPlanta) => number | null | undefined) => porMes(lista, v)
    const lbl = (k: string) => ({ key: k, label: etiquetaMes(k, variosAnios) })
    const pctMes = mes(d => prodPlanta(d, params)).map(m => ({ ...lbl(m.k), titulo: `${MESES[Number(m.k.slice(5, 7)) - 1]} ${m.k.slice(0, 4)}`, valor: m.valor }))
    const realObj = (real: (d: DiaPlanta) => number | null, obj: (d: DiaPlanta) => number | null) => {
        const r = mes(real), o = new Map(mes(obj).map(x => [x.k, x.valor]))
        return r.map(x => ({ ...lbl(x.k), real: x.valor, objetivo: o.get(x.k) ?? null }))
    }
    const perdMes = mes(() => 0).map(m => {
        const del = lista.filter(d => d.fecha.startsWith(m.k)).map(d => perdidasPlanta(d)).filter(Boolean) as Record<Familia, number>[]
        const r: Record<string, number | string | null> = { ...lbl(m.k), titulo: `${MESES[Number(m.k.slice(5, 7)) - 1]} ${m.k.slice(0, 4)}` }
        FAMILIAS.forEach(f => { r[f] = promedio(del.map(x => x[f])) })
        r.total = promedio(del.map(x => FAMILIAS.reduce((s, f) => s + x[f], 0)))
        return r
    }) as ({ key: string; label: string; total: number | null } & Partial<Record<Familia, number>>)[]
    const seg = seguimiento(lista, d => prodPlanta(d, params))
    const prom = (v: (d: DiaPlanta) => number | null | undefined) => promedio(lista.map(v))
    const enKg = planta === 'MS' && lista.some(d => d.fecha >= params.inicio_ms_kg)

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {PLANTAS_PROD.map(p => (
                    <button key={p} onClick={() => setPlanta(p)} title={NOMBRE_PLANTA_PROD[p]}
                        className={`h-7 px-3 rounded-lg text-xs font-black ${planta === p ? 'bg-[#324354] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{p} <span className="font-semibold hidden sm:inline">· {NOMBRE_PLANTA_PROD[p]}</span></button>
                ))}
            </div>
            {error && <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-800">{error}</div>}
            {!dias ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        <Tarjeta destacada titulo={`Productividad ${enKg ? '(kg)' : '(piezas)'}`} valor={pct(prom(d => prodPlanta(d, params)))} detalle={`${lista.length} día(s)`} />
                        <Tarjeta titulo="Prod. PHH" valor={pct(prom(d => d.prod_phh))} color={semaforo(prom(d => d.prod_phh), meta)} />
                        <Tarjeta titulo="Real PHH" valor={numero(prom(d => d.real_phh), 2)} detalle={`obj. ${numero(prom(d => d.obj_phh), 2)}`} />
                        <Tarjeta titulo={planta === 'MBL' ? 'Taladro piezas / día' : planta === 'CEFI' ? 'Empaque piezas / día' : 'Piezas / día'} valor={numero(prom(d => d.real_piezas))} detalle={`obj. ${numero(prom(d => d.obj_piezas))}`} />
                        {planta === 'MS' ? <>
                            <Tarjeta titulo="Prod. kilogramos" valor={pct(prom(d => d.pct_prod_kg))} color={semaforo(prom(d => d.pct_prod_kg), meta)} />
                            <Tarjeta titulo="Prod. KG/HH" valor={pct(prom(d => d.pct_prod_kghh))} color={semaforo(prom(d => d.pct_prod_kghh), meta)} />
                        </> : planta === 'MBL' ? <>
                            <Tarjeta titulo="Muebles / día (taladro)" valor={numero(prom(d => det(d, 'taladro_total_muebles_dia')))} />
                            <Tarjeta titulo="Piezas por mueble" valor={numero(prom(d => det(d, 'cantidad_piezas_mueble')), 1)} />
                        </> : <>
                            <Tarjeta titulo="Pérdidas (x̄)" valor={pct(promedio(lista.map(d => { const p = perdidasPlanta(d); return p ? FAMILIAS.reduce((s, f) => s + p[f], 0) : null })))} />
                            <Tarjeta titulo="Mano de obra real (x̄)" valor={numero(prom(d => d.mo_real), 1)} detalle={`teórica ${numero(prom(d => d.mo_teorica), 1)}`} />
                        </>}
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <Recuadro titulo={`Productividad ${planta} por mes`} alto={290}><BarrasPct datos={pctMes} meta={meta} /></Recuadro>
                        <Recuadro titulo={`Seguimiento ${seg.gran.toLowerCase()} ${planta}`} alto={290}><LineaPct datos={seg.datos} meta={meta} /></Recuadro>
                        <Recuadro titulo={planta === 'MBL' ? 'Empaque (taladro) piezas promedio día' : planta === 'CEFI' ? 'Empaque piezas promedio día' : planta === 'MS' ? 'Piezas (acabado) promedio día' : 'Piezas promedio día'} alto={290}>
                            <RealVsObjetivo datos={realObj(d => d.real_piezas, d => d.obj_piezas)} nombreReal="Real" nombreObj="Objetivo" />
                        </Recuadro>
                        <Recuadro titulo="Piezas hora hombre (PHH)" alto={290}><RealVsObjetivo datos={realObj(d => d.real_phh, d => d.obj_phh)} nombreReal="Real PHH" nombreObj="Objetivo PHH" dec={2} /></Recuadro>
                        {planta === 'MS' && <>
                            <Recuadro titulo="Kg entregados al CEDI promedio día" alto={290}><RealVsObjetivo datos={realObj(d => d.kg_real, d => d.kg_objetivo)} nombreReal="Kg real" nombreObj="Kg objetivo" /></Recuadro>
                            <Recuadro titulo="Kilogramos hora hombre (KG/HH)" alto={290}><RealVsObjetivo datos={realObj(d => d.kghh_real, d => d.kghh_objetivo)} nombreReal="KG/HH real" nombreObj="KG/HH objetivo" dec={2} /></Recuadro>
                            <Recuadro titulo="Mesones promedio día" alto={260}><RealVsObjetivo datos={realObj(d => det(d, 'mesones'), () => null)} nombreReal="Mesones" nombreObj="" /></Recuadro>
                        </>}
                        {planta === 'MBL' && <>
                            <Recuadro titulo="Corte, enchape y taladro (piezas promedio día)" alto={290}>
                                <RealVsObjetivo datos={realObj(d => det(d, 'enchape_total_piezas_dia'), d => det(d, 'corte_total_piezas_dia'))} nombreReal="Enchape" nombreObj="Corte" />
                            </Recuadro>
                            <Recuadro titulo="Muebles de taladro promedio día" alto={290}><RealVsObjetivo datos={realObj(d => det(d, 'taladro_total_muebles_dia'), () => null)} nombreReal="Muebles" nombreObj="" /></Recuadro>
                            <Recuadro titulo="m² procesados por mes (promedio día)" alto={260}><RealVsObjetivo datos={realObj(d => det(d, 'm2_procesados'), () => null)} nombreReal="m²" nombreObj="" /></Recuadro>
                            <Recuadro titulo="Metros lineales de enchape (promedio día)" alto={260}><RealVsObjetivo datos={realObj(d => det(d, 'metros_lineales_enchape'), () => null)} nombreReal="Metros" nombreObj="" /></Recuadro>
                        </>}
                        {planta === 'CEFI' && <>
                            <Recuadro titulo="Corte y enchape (piezas promedio día)" alto={290}>
                                <RealVsObjetivo datos={realObj(d => det(d, 'enchape_total_piezas_dia'), d => det(d, 'corte_total_piezas_turno_1'))} nombreReal="Enchape" nombreObj="Corte" />
                            </Recuadro>
                            <Recuadro titulo="Muebles empacados promedio día" alto={290}><RealVsObjetivo datos={realObj(d => det(d, 'empaque_total_muebles_dia'), () => null)} nombreReal="Muebles" nombreObj="" /></Recuadro>
                        </>}
                        <Recuadro titulo={`Pérdidas por familia ${planta} por mes`} alto={300}><PerdidasApiladas datos={perdMes} objetivo={params.objetivos_perdidas.total} /></Recuadro>
                    </div>
                </>
            )}
        </div>
    )
}
