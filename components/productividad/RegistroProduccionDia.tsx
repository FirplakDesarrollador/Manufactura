'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FAMILIAS, NOMBRE_FAMILIA, NOMBRE_PLANTA_PROD, PLANTAS_PROD, calcularDia, conMinutosDeParos, perdidasPlanta, prodPlanta, type DiaPlanta, type ParametrosProd, type Paro, type PlantaProd } from '@/lib/productividad/calculo'
import { catalogoParos, diaRegistrado, guardarDia, ultimoDia } from '@/lib/productividad/datos'
import { pct, numero } from './graficas'

// Registro diario de productividad por planta (reemplaza llenar las hojas BD_* y BD_PAROS del Excel).
// Los campos que casi no cambian (mano de obra teórica, tiempos, objetivos) se proponen con el último día registrado.

type Campo = { k: string; label: string; col?: keyof DiaPlanta; arrastra?: boolean; ayuda?: string }
const CAMPOS: Record<PlantaProd, { grupo: string; campos: Campo[] }[]> = {
    MS: [
        { grupo: 'Tiempo y personas', campos: [
            { k: 'hora_inicio_produccion', label: 'Hora inicio', arrastra: true }, { k: 'hora_fin_produccion', label: 'Hora fin', arrastra: true },
            { k: 'tiempo_alimentacion', label: 'Alimentación (min)', arrastra: true }, { k: 'tiempo_no_producion', label: 'No producción (min)', arrastra: true },
            { k: 'mo_teorica_ms_t1', label: 'MO teórica T1', arrastra: true }, { k: 'mo_teorica_ms_t2', label: 'MO teórica T2', arrastra: true }, { k: 'mo_teorica_ms_t3', label: 'MO teórica T3', arrastra: true },
            { k: 'tiempo_t1', label: 'Tiempo T1 (min)', arrastra: true }, { k: 'tiempo_t2', label: 'Tiempo T2 (min)', arrastra: true }, { k: 'tiempo_t3', label: 'Tiempo T3 (min)', arrastra: true },
            { k: 'ausentismo_general', label: 'Ausentismo (personas)' }, { k: 'obj_phh', label: 'Objetivo PHH', col: 'obj_phh', arrastra: true },
        ] },
        { grupo: 'Producción', campos: [
            { k: 'real_pintura_linea_1', label: 'Pintura línea 1' }, { k: 'real_pintura_linea_2', label: 'Pintura línea 2' }, { k: 'real_pintura_linea_3', label: 'Pintura línea 3' },
            { k: 'real_vaciado', label: 'Vaciado' }, { k: 'adm', label: 'ADM' }, { k: 'cnc_pulido', label: 'CNC pulido' },
            { k: 'real_acabado', label: 'Acabado (piezas)', col: 'real_piezas' }, { k: 'kg_entregados', label: 'Kg entregados al CEDI', col: 'kg_real' },
            { k: 'mesones', label: 'Mesones' }, { k: 'calidad', label: 'Calidad (%)', ayuda: 'IFI del día, como número (ej. 83)' },
        ] },
    ],
    FV: [
        { grupo: 'Tiempo y personas', campos: [
            { k: 't_laborado', label: 'Tiempo laborado (min)', col: 'tiempo_min', arrastra: true }, { k: 'mo_teorica', label: 'MO teórica', col: 'mo_teorica', arrastra: true },
            { k: 'mo_real', label: 'MO real', col: 'mo_real', arrastra: true }, { k: 'obj_piezas', label: 'Objetivo piezas', col: 'obj_piezas', arrastra: true },
        ] },
        { grupo: 'Producción', campos: [
            { k: 'real_pintura_sencillas', label: 'Pintura sencillas' }, { k: 'real_pintura_hidros', label: 'Pintura hidros' }, { k: 'real_pintura_multis', label: 'Pintura multis' },
            { k: 'real_acabado_sencillas', label: 'Acabado sencillas' }, { k: 'real_acabado_hidros', label: 'Acabado hidros' }, { k: 'real_acabado_multis', label: 'Acabado multis' },
        ] },
    ],
    RTM: [
        { grupo: 'Tiempo y personas', campos: [
            { k: 't_laborado', label: 'Tiempo laborado (min)', col: 'tiempo_min', arrastra: true }, { k: 'mo_teorica', label: 'MO teórica', col: 'mo_teorica', arrastra: true },
            { k: 'mo_real', label: 'MO real', col: 'mo_real', arrastra: true }, { k: 'obj_piezas', label: 'Objetivo piezas', col: 'obj_piezas', arrastra: true },
        ] },
        { grupo: 'Producción', campos: [
            { k: 'rtm_inyeccion', label: 'RTM inyección' }, { k: 'rtm_acabado', label: 'RTM acabado' },
            { k: 'quarzstone_perforadas', label: 'Quarzstone perforadas' }, { k: 'quarzstone_acabado', label: 'Quarzstone acabado' },
        ] },
    ],
    CEFI: [
        { grupo: 'Tiempo y personas', campos: [
            { k: 't_laborado', label: 'Tiempo laborado (min)', col: 'tiempo_min', arrastra: true }, { k: 'mo_teorica', label: 'MO teórica', col: 'mo_teorica', arrastra: true },
            { k: 'mo_real', label: 'MO real', col: 'mo_real', arrastra: true }, { k: 'obj_piezas', label: 'Objetivo piezas', col: 'obj_piezas', arrastra: true },
            { k: 'obj_phh', label: 'Objetivo PHH', col: 'obj_phh', arrastra: true },
        ] },
        { grupo: 'Producción', campos: [
            { k: 'corte_total_piezas_turno_1', label: 'Corte piezas' }, { k: 'corte_muebles_turno_1', label: 'Corte muebles' }, { k: 'laminas_total_dia', label: 'Láminas' },
            { k: 'enchape_total_piezas_dia', label: 'Enchape piezas' }, { k: 'enchape_total_muebles_dia', label: 'Enchape muebles' },
            { k: 'empaque_piezas_fpk', label: 'Empaque piezas FPK' }, { k: 'empaque_muebles_fpk', label: 'Empaque muebles FPK' },
            { k: 'empaque_piezas_turno_1', label: 'Empaque piezas CEFI' }, { k: 'empaque_muebles_turno_1', label: 'Empaque muebles CEFI' },
        ] },
    ],
    MBL: [
        { grupo: 'Tiempo y personas', campos: [
            { k: 't_laborado', label: 'Tiempo laborado (min)', col: 'tiempo_min', arrastra: true }, { k: 'mano_de_obra_teorica', label: 'MO teórica', col: 'mo_teorica', arrastra: true },
            { k: 'mano_de_obra_real', label: 'MO real', col: 'mo_real', arrastra: true }, { k: 'objetivo_piezas', label: 'Objetivo piezas', col: 'obj_piezas', arrastra: true },
            { k: 'obj_phh', label: 'Objetivo PHH', col: 'obj_phh', arrastra: true },
        ] },
        { grupo: 'Producción', campos: [
            { k: 'corte_total_piezas_dia', label: 'Corte piezas' }, { k: 'corte_total_muebles_dia', label: 'Corte muebles' }, { k: 'laminas_total_dia', label: 'Láminas' },
            { k: 'enchape_total_piezas_dia', label: 'Enchape piezas' }, { k: 'enchape_total_muebles_dia', label: 'Enchape muebles' },
            { k: 'taladro_total_piezas_dia', label: 'Taladro piezas (real)', col: 'real_piezas' }, { k: 'taladro_total_muebles_dia', label: 'Taladro muebles' },
            { k: 'total_cajas', label: 'Cajas' }, { k: 'total_reposiciones', label: 'Reposiciones' },
            { k: 'metros_lineales_enchape', label: 'Metros lineales enchape' }, { k: 'm2_procesados', label: 'm² procesados' },
        ] },
    ],
}

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const campoCls = 'w-full h-8 border border-slate-300 rounded-lg px-2 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] bg-white'
const etiqueta = 'text-[10px] font-black uppercase text-slate-500'
const aNum = (s: string) => { const v = Number(String(s).replace(',', '.')); return String(s).trim() === '' || isNaN(v) ? null : v }
const minDeHora = (h: string) => { const m = String(h).match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null }
const vacio = (): Paro => ({ fecha: '', planta: '', proceso: '', familia: '', modo_perdida: '', equipo: '', descripcion: '', minutos: 0, tipo: 'REFLEJADO', area_responsable: '', responsable: '' })

export default function RegistroProduccionDia({ params, onGuardado }: { params: ParametrosProd; onGuardado: () => void }) {
    const [planta, setPlanta] = useState<PlantaProd>('MS')
    const [fecha, setFecha] = useState(hoy())
    const [valores, setValores] = useState<Record<string, string>>({})
    const [paros, setParos] = useState<Paro[]>([])
    const [catalogo, setCatalogo] = useState<Paro[]>([])
    const [estado, setEstado] = useState<{ cargando: boolean; guardando: boolean; existe: boolean; mensaje: { ok: boolean; texto: string } | null }>({ cargando: true, guardando: false, existe: false, mensaje: null })
    const [email, setEmail] = useState<string | null>(null)
    useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)) }, [])

    // Al cambiar planta o fecha: si el día existe se carga; si no, se proponen los valores que se arrastran del último día
    useEffect(() => {
        let vivo = true
        setEstado(e => ({ ...e, cargando: true, mensaje: null }))
        Promise.all([diaRegistrado(planta, fecha), ultimoDia(planta, fecha)]).then(([reg, ult]) => {
            if (!vivo) return
            const base = reg.dia || ult
            const v: Record<string, string> = {}
            for (const g of CAMPOS[planta]) for (const c of g.campos) {
                if (!reg.dia && !c.arrastra) continue
                let val = c.col ? base?.[c.col] : (base?.detalle || {})[c.k]
                if (val == null || val === '') continue
                // Del Excel: horas como fracción del día y calidad como fracción
                if (/hora/.test(c.k) && typeof val === 'number') { const m = Math.round(val * 1440); val = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
                if (c.k === 'calidad' && typeof val === 'number' && val <= 1.5) val = Math.round(val * 1000) / 10
                v[c.k] = String(val)
            }
            setValores(v)
            setParos(reg.paros.length ? reg.paros : [])
            setEstado(e => ({ ...e, cargando: false, existe: !!reg.dia }))
        }).catch(err => vivo && setEstado(e => ({ ...e, cargando: false, mensaje: { ok: false, texto: err instanceof Error ? err.message : String(err) } })))
        return () => { vivo = false }
    }, [planta, fecha])
    useEffect(() => { catalogoParos(planta).then(setCatalogo).catch(() => setCatalogo([])) }, [planta])

    // Día armado con las columnas y el detalle, y sus indicadores calculados con las fórmulas del Excel
    const dia = useMemo<DiaPlanta>(() => {
        const d = { fecha, planta, detalle: {} as Record<string, unknown> } as DiaPlanta
        for (const g of CAMPOS[planta]) for (const c of g.campos) {
            const n = aNum(valores[c.k] ?? '')
            if (c.col) (d as unknown as Record<string, unknown>)[c.col] = n
            if (!c.col || c.k === 'obj_phh') (d.detalle as Record<string, unknown>)[c.k] = /hora/.test(c.k) ? (valores[c.k] || null) : n
        }
        const det = d.detalle as Record<string, unknown>
        if (planta === 'MS') {
            const ini = minDeHora(valores.hora_inicio_produccion || ''), fin = minDeHora(valores.hora_fin_produccion || '')
            d.tiempo_min = ini != null && fin != null ? fin - ini - (aNum(valores.tiempo_alimentacion || '') ?? 0) - (aNum(valores.tiempo_no_producion || '') ?? 0) : null
            det.real_pintura = ['real_pintura_linea_1', 'real_pintura_linea_2', 'real_pintura_linea_3'].reduce((s, k) => s + (aNum(valores[k] || '') ?? 0), 0)
            if (aNum(valores.calidad || '') != null) det.calidad = (aNum(valores.calidad || '') ?? 0) / 100
        }
        if (planta === 'MBL') {
            const pz = aNum(valores.taladro_total_piezas_dia || ''), mu = aNum(valores.taladro_total_muebles_dia || '')
            det.cantidad_piezas_mueble = pz != null && mu ? pz / mu : null
        }
        if (planta === 'CEFI') {
            det.empaque_total_piezas_dia = (aNum(valores.empaque_piezas_fpk || '') ?? 0) + (aNum(valores.empaque_piezas_turno_1 || '') ?? 0)
            det.empaque_total_muebles_dia = (aNum(valores.empaque_muebles_fpk || '') ?? 0) + (aNum(valores.empaque_muebles_turno_1 || '') ?? 0)
        }
        return conMinutosDeParos(calcularDia(d, params), paros.filter(p => (p.descripcion || '').trim() && p.minutos > 0))
    }, [valores, planta, fecha, params, paros])

    const prod = prodPlanta(dia, params)
    const perd = perdidasPlanta(dia)
    const totalPerd = perd ? FAMILIAS.reduce((s, f) => s + perd[f], 0) : null
    const sinFamilia = paros.some(p => (p.descripcion || '').trim() && p.minutos > 0 && (p.tipo || '').toUpperCase() === 'REFLEJADO' && !p.familia)

    // Sugerencias: descripciones del último año con su clasificación más usada
    const sugerencias = useMemo(() => {
        const m = new Map<string, Map<string, number>>()
        for (const p of catalogo) {
            const d = (p.descripcion || '').trim().toUpperCase(); if (!d) continue
            const k = JSON.stringify([p.familia, p.proceso, p.modo_perdida, p.equipo, p.area_responsable].map(x => (x || '').trim().toUpperCase()))
            if (!m.has(d)) m.set(d, new Map()); m.get(d)!.set(k, (m.get(d)!.get(k) || 0) + 1)
        }
        return new Map([...m.entries()].map(([d, cl]) => [d, JSON.parse([...cl.entries()].sort((a, b) => b[1] - a[1])[0][0]) as string[]]))
    }, [catalogo])
    const opciones = (k: keyof Paro) => [...new Set(catalogo.map(p => String(p[k] || '').trim().toUpperCase()).filter(Boolean))].sort()
    const setParo = (i: number, k: keyof Paro, v: string) => setParos(ps => ps.map((p, j) => {
        if (j !== i) return p
        const n = { ...p, [k]: k === 'minutos' ? (aNum(v) ?? 0) : v } as Paro
        // Al elegir una descripción conocida se completan los campos vacíos con su clasificación más usada
        if (k === 'descripcion') {
            const s = sugerencias.get(v.trim().toUpperCase())
            if (s) { const [fam, proc, modo, eq, area] = s; n.familia = n.familia || fam; n.proceso = n.proceso || proc; n.modo_perdida = n.modo_perdida || modo; n.equipo = n.equipo || eq; n.area_responsable = n.area_responsable || area }
        }
        return n
    }))

    const guardar = async () => {
        if (sinFamilia) { setEstado(e => ({ ...e, mensaje: { ok: false, texto: 'Cada paro reflejado necesita su familia (Funcional, Inducido, Explotación o Avería).' } })); return }
        if (!dia.tiempo_min) { setEstado(e => ({ ...e, mensaje: { ok: false, texto: 'Falta el tiempo laborado del día.' } })); return }
        setEstado(e => ({ ...e, guardando: true, mensaje: null }))
        try {
            await guardarDia(dia, paros, params, 'app', email)
            setEstado(e => ({ ...e, guardando: false, existe: true, mensaje: { ok: true, texto: `Guardado ${NOMBRE_PLANTA_PROD[planta]} del ${fecha.split('-').reverse().join('/')}.` } }))
            onGuardado()
        } catch (err) {
            setEstado(e => ({ ...e, guardando: false, mensaje: { ok: false, texto: err instanceof Error ? err.message : String(err) } }))
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <p className={etiqueta}>Planta</p>
                    <div className="flex gap-1 mt-1">{PLANTAS_PROD.map(p => (
                        <button key={p} onClick={() => setPlanta(p)} title={NOMBRE_PLANTA_PROD[p]} className={`h-8 px-3 rounded-lg text-xs font-black ${planta === p ? 'bg-[#324354] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{p}</button>
                    ))}</div>
                </div>
                <div>
                    <p className={etiqueta}>Fecha</p>
                    <input type="date" value={fecha} max={hoy()} onChange={e => e.target.value && setFecha(e.target.value)} className={`${campoCls} w-40 mt-1`} />
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${estado.existe ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                    {estado.cargando ? 'Cargando…' : estado.existe ? 'Este día ya está registrado: al guardar se actualiza' : 'Día nuevo: los valores fijos vienen del último día registrado'}
                </span>
            </div>

            {estado.cargando ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3">
                    <div className="space-y-3">
                        {CAMPOS[planta].map(g => (
                            <div key={g.grupo} className="rounded-xl border border-slate-200 p-3">
                                <h3 className="text-xs font-black uppercase text-[#324354] mb-2">{g.grupo}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {g.campos.map(c => (
                                        <div key={c.k} title={c.ayuda}>
                                            <label className={etiqueta}>{c.label}</label>
                                            <input type={/hora/.test(c.k) ? 'time' : 'number'} inputMode="decimal" step="any" min={0} value={valores[c.k] ?? ''}
                                                onChange={e => setValores(v => ({ ...v, [c.k]: e.target.value }))} className={campoCls} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase text-[#324354]">Paros del día</h3>
                                <span className="text-[10px] text-slate-500">Los reflejados cuentan en las pérdidas; al escribir una causa conocida se completa su clasificación</span>
                            </div>
                            <datalist id="prod-desc">{[...sugerencias.keys()].slice(0, 400).map(d => <option key={d} value={d} />)}</datalist>
                            <datalist id="prod-modo">{opciones('modo_perdida').map(d => <option key={d} value={d} />)}</datalist>
                            <datalist id="prod-equipo">{opciones('equipo').map(d => <option key={d} value={d} />)}</datalist>
                            <datalist id="prod-area">{opciones('area_responsable').map(d => <option key={d} value={d} />)}</datalist>
                            <datalist id="prod-proceso">{opciones('proceso').map(d => <option key={d} value={d} />)}</datalist>
                            {paros.map((p, i) => (
                                <div key={i} className="grid grid-cols-2 md:grid-cols-[2fr_70px_130px_110px_1fr_1fr_1fr_1fr_32px] gap-1.5 items-end border-b border-slate-100 pb-2">
                                    <div className="col-span-2 md:col-span-1"><label className={etiqueta}>Causa</label><input list="prod-desc" value={p.descripcion || ''} onChange={e => setParo(i, 'descripcion', e.target.value)} className={campoCls} placeholder="Descripción del paro" /></div>
                                    <div><label className={etiqueta}>Min</label><input type="number" min={0} value={p.minutos || ''} onChange={e => setParo(i, 'minutos', e.target.value)} className={campoCls} /></div>
                                    <div><label className={etiqueta}>Familia</label>
                                        <select value={(p.familia || '').toUpperCase()} onChange={e => setParo(i, 'familia', e.target.value)} className={`${campoCls} ${!p.familia && (p.tipo || '').toUpperCase() === 'REFLEJADO' && p.descripcion ? 'border-rose-400 bg-rose-50' : ''}`}>
                                            <option value="">—</option>{FAMILIAS.map(f => <option key={f} value={f}>{NOMBRE_FAMILIA[f]}</option>)}
                                        </select></div>
                                    <div><label className={etiqueta}>Tipo</label>
                                        <select value={(p.tipo || 'REFLEJADO').toUpperCase()} onChange={e => setParo(i, 'tipo', e.target.value)} className={campoCls}><option value="REFLEJADO">Reflejado</option><option value="REAL">Real</option></select></div>
                                    <div><label className={etiqueta}>Proceso</label><input list="prod-proceso" value={p.proceso || ''} onChange={e => setParo(i, 'proceso', e.target.value)} className={campoCls} /></div>
                                    <div><label className={etiqueta}>Modo de pérdida</label><input list="prod-modo" value={p.modo_perdida || ''} onChange={e => setParo(i, 'modo_perdida', e.target.value)} className={campoCls} /></div>
                                    <div><label className={etiqueta}>Equipo</label><input list="prod-equipo" value={p.equipo || ''} onChange={e => setParo(i, 'equipo', e.target.value)} className={campoCls} /></div>
                                    <div><label className={etiqueta}>Área responsable</label><input list="prod-area" value={p.area_responsable || ''} onChange={e => setParo(i, 'area_responsable', e.target.value)} className={campoCls} /></div>
                                    <button onClick={() => setParos(ps => ps.filter((_, j) => j !== i))} className="h-8 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg" title="Quitar"><Trash2 size={15} /></button>
                                </div>
                            ))}
                            <button onClick={() => setParos(ps => [...ps, vacio()])} className="h-8 px-3 rounded-lg border border-[#324354] text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]"><Plus size={14} /> Agregar paro</button>
                        </div>
                    </div>

                    {/* Resultado del día con las fórmulas del Excel */}
                    <div className="space-y-2 xl:sticky xl:top-2 self-start">
                        <div className="rounded-xl bg-[#324354] text-white p-3">
                            <p className="text-[10px] font-black uppercase text-white/70">Productividad del día {planta === 'MS' && fecha >= params.inicio_ms_kg ? '(kilos)' : '(piezas)'}</p>
                            <p className="text-3xl font-black">{pct(prod)}</p>
                            <p className="text-[11px] text-white/70">Meta {pct(params.objetivo_productividad, 0)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                            {[
                                ['Tiempo laborado', `${numero(dia.tiempo_min)} min`],
                                ['Objetivo piezas', numero(dia.obj_piezas)],
                                ['Real piezas', numero(dia.real_piezas)],
                                ...(planta === 'MS' ? [['Kg objetivo', numero(dia.kg_objetivo)], ['Kg real', numero(dia.kg_real)], ['Prod. kilos', pct(dia.pct_prod_kg)], ['Prod. piezas', pct(dia.pct_prod_piezas)]] : []),
                                ['Real PHH', numero(dia.real_phh, 2)], ['Objetivo PHH', numero(dia.obj_phh, 2)], ['Prod. PHH', pct(dia.prod_phh)],
                                ['Pérdidas totales', pct(totalPerd)],
                                ...FAMILIAS.map(f => [`· ${NOMBRE_FAMILIA[f]}`, pct(perd?.[f])]),
                                ['Productividad + pérdidas', pct(prod != null && totalPerd != null ? prod + totalPerd : null)],
                            ].map(([a, b]) => <p key={a} className="flex justify-between gap-2"><span className="text-slate-500 font-semibold">{a}</span><span className="font-black text-[#324354]">{b}</span></p>)}
                            <p className="text-[10px] text-slate-400 pt-1">Productividad + pérdidas debería quedar cerca de 100 %: si no, falta reflejar paros o sobran minutos.</p>
                        </div>
                        {estado.mensaje && (
                            <div className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-1.5 ${estado.mensaje.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                                {estado.mensaje.ok && <CheckCircle2 size={14} className="shrink-0 mt-px" />}{estado.mensaje.texto}
                            </div>
                        )}
                        <button onClick={guardar} disabled={estado.guardando} className="w-full h-10 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {estado.guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {estado.existe ? 'Actualizar día' : 'Guardar día'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
