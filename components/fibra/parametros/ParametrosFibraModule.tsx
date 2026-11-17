'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckSquare, Info, Loader2, Percent, RefreshCw, Save, Search, Square, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Parámetros FV: resina y gelcoat por pieza (Bañera / Faldón) de cada producto de Fibra, calculados desde la lista de
// materiales de SAP (/api/sap/productos-fv → tabla productos_fv_pesos), y la reducción en % que define la planta para cada
// material, como en Mármol: Kg app = Kg SAP × (1 − % / 100). Antes esta pantalla mostraba los productos de MS.

type Fila = {
    producto_sku: string; producto_descripcion: string | null
    resina_banera_kg: number | null; resina_banera_tipo: string | null; gelcoat_banera_kg: number | null
    resina_faldon_kg: number | null; resina_faldon_tipo: string | null; gelcoat_faldon_kg: number | null
    error: string | null; calculado_at: string | null
    porcentaje_reduccion_resina: number; porcentaje_reduccion_gelcoat: number
    modified_at: string | null; modified_by: string | null
}
type Material = 'resina' | 'gelcoat'

const kg = (v: number | null) => v === null || v === undefined ? null : Math.round(v * 100) / 100
const fmt = (v: number | null) => v === null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 2 })
const aplicar = (v: number | null, pct: number) => v === null ? null : kg(v * (1 - (Number(pct) || 0) / 100))
const fecha = (s: string | null) => s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ParametrosFibraModule({ userEmail }: { userEmail: string }) {
    const [filas, setFilas] = useState<Fila[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [material, setMaterial] = useState<Material>('resina')
    const [pct, setPct] = useState('0')
    const [sel, setSel] = useState<Set<string>>(new Set())
    const [guardando, setGuardando] = useState(false)
    const [sync, setSync] = useState<{ hechos: number; total: number; errores: number } | null>(null)
    const cancelar = useRef(false)

    const cargar = useCallback(async () => {
        setCargando(true)
        const todas: Fila[] = []
        for (let i = 0; ; i += 1000) {
            const { data, error: e } = await supabase.from('productos_fv_pesos').select('*').order('producto_descripcion').range(i, i + 999)
            if (e) { setError(/productos_fv_pesos|relation|schema cache/i.test(e.message) ? 'Falta crear la tabla: ejecute productos_fv_pesos.sql en Supabase.' : e.message); break }
            todas.push(...((data || []) as Fila[]))
            if (!data || data.length < 1000) { setError(null); break }
        }
        setFilas(todas); setCargando(false)
    }, [])
    useEffect(() => { cargar() }, [cargar])

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        // Los productos sin datos de SAP (error o sin kilos) van al final; el resto en orden alfabético
        const sinDatos = (f: Fila) => !!f.error || [f.resina_banera_kg, f.resina_faldon_kg, f.gelcoat_banera_kg, f.gelcoat_faldon_kg].every(v => v === null)
        return filas
            .filter(f => !q || f.producto_sku.toLowerCase().includes(q) || (f.producto_descripcion || '').toLowerCase().includes(q))
            .sort((a, b) => Number(sinDatos(a)) - Number(sinDatos(b)) || (a.producto_descripcion || '').localeCompare(b.producto_descripcion || ''))
    }, [filas, busqueda])
    const todosSel = visibles.length > 0 && visibles.every(f => sel.has(f.producto_sku))
    const alternarTodos = () => setSel(p => { const n = new Set(p); visibles.forEach(f => todosSel ? n.delete(f.producto_sku) : n.add(f.producto_sku)); return n })
    const alternar = (sku: string) => setSel(p => { const n = new Set(p); if (n.has(sku)) n.delete(sku); else n.add(sku); return n })
    const sinDato = filas.filter(f => f.error).length

    // Actualiza desde SAP por lotes (uno a la vez); primero los productos de las OF pendientes de Fibra
    const actualizarSap = async () => {
        cancelar.current = false
        setSync({ hechos: 0, total: 0, errores: 0 }); setError(null)
        try {
            const r = await fetch('/api/sap/productos-fv?accion=lista', { cache: 'no-store' })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
            const { data: ofs } = await supabase.from('ordenes_fabricacion_fv').select('producto_sku')
            const prioridad = new Set((ofs || []).map((o: any) => String(o.producto_sku || '').trim()))
            const skus: string[] = (d.productos as { sku: string }[]).map(p => p.sku).sort((a, b) => Number(prioridad.has(b)) - Number(prioridad.has(a)))
            let errores = 0
            setSync({ hechos: 0, total: skus.length, errores })
            for (let i = 0; i < skus.length; i += 10) {
                if (cancelar.current) break
                const lote = skus.slice(i, i + 10)
                const rr = await fetch(`/api/sap/productos-fv?accion=calcular&skus=${encodeURIComponent(lote.join(','))}`, { cache: 'no-store' })
                const dd = await rr.json().catch(() => ({}))
                if (!rr.ok) throw new Error(dd.error || `Error ${rr.status}`)
                errores += dd.conError || 0
                setSync({ hechos: Math.min(i + 10, skus.length), total: skus.length, errores })
                if ((i / 10) % 10 === 9) cargar()   // va mostrando lo calculado
            }
        } catch (e) {
            setError(`No se pudo actualizar desde SAP: ${e instanceof Error ? e.message : 'error'}`)
        } finally {
            await cargar(); setSync(null)
        }
    }

    const guardar = async () => {
        const v = Number(String(pct).replace(',', '.'))
        if (!sel.size) return alert('Seleccione al menos un producto')
        if (!(v >= 0 && v < 100)) return alert('El % de reducción debe estar entre 0 y 99')
        if (!confirm(`¿Reducir ${material === 'resina' ? 'la resina' : 'el gelcoat'} en ${v} % a ${sel.size} producto(s)?`)) return
        setGuardando(true)
        const { error: e } = await supabase.from('productos_fv_pesos')
            .update({ [material === 'resina' ? 'porcentaje_reduccion_resina' : 'porcentaje_reduccion_gelcoat']: v, modified_at: new Date().toISOString(), modified_by: userEmail })
            .in('producto_sku', [...sel])
        setGuardando(false)
        if (e) return alert(`No se pudo guardar: ${e.message}`)
        setSel(new Set()); setPct('0'); cargar()
    }

    const celda = (sap: number | null, red: number, tipo?: string | null) => sap === null
        ? <span className="text-slate-300">—</span>
        : (
            <div className="leading-tight" title={`SAP ${fmt(sap)} Kg${red ? ` − ${red} %` : ''}${tipo ? ` · resina ${tipo.toLowerCase()}` : ''}`}>
                <div className="font-black text-[#324354]">{fmt(aplicar(sap, red))}</div>
                <div className="text-[9px] text-slate-400 font-semibold">{red ? `SAP ${fmt(sap)}` : tipo || 'SAP'}</div>
            </div>
        )

    return (
        <div className="h-full flex flex-col bg-[#F6F3EE]/40">
            {/* Barra de herramientas */}
            <div className="bg-white border-b border-[#e2ded5] px-3 sm:px-4 py-2 shrink-0 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Búsqueda</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="SKU / producto"
                                className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">Reducir</label>
                        <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            {(['resina', 'gelcoat'] as const).map(m => (
                                <button key={m} onClick={() => setMaterial(m)} className={`px-3 rounded-md text-[11px] font-bold uppercase ${material === m ? 'bg-[#324354] text-white' : 'text-slate-500 hover:text-[#324354]'}`}>{m === 'resina' ? 'Resina' : 'Gelcoat'}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[#324354] uppercase mb-1 block">% de reducción</label>
                        <div className="relative w-24">
                            <input value={pct} onChange={e => setPct(e.target.value)} inputMode="decimal"
                                className="w-full h-8 pl-3 pr-7 bg-white border border-[#e2ded5] rounded-lg font-black text-sm text-[#324354] text-right outline-none focus:ring-2 focus:ring-[#7B8E90]" />
                            <Percent size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                    <button onClick={guardar} disabled={guardando || !sel.size}
                        className="h-8 px-3 rounded-lg bg-[#324354] text-white text-[11px] font-bold uppercase flex items-center gap-1.5 hover:bg-[#254153] disabled:opacity-40">
                        {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Aplicar ({sel.size})
                    </button>
                    {sync ? (
                        <button onClick={() => { cancelar.current = true }} className="h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-[11px] font-bold flex items-center gap-1.5" title="Detener la actualización">
                            <Loader2 size={14} className="animate-spin" /> {sync.total ? `${sync.hechos}/${sync.total}` : 'Leyendo SAP…'} <X size={13} />
                        </button>
                    ) : (
                        <button onClick={actualizarSap} className="h-8 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-[11px] font-bold flex items-center gap-1.5"
                            title="Recalcular resina y gelcoat de todos los productos FV desde la lista de materiales de SAP (primero los de las OF pendientes)">
                            <RefreshCw size={14} /> Actualizar desde SAP
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold">
                    <span className="text-slate-500">PRODUCTOS: <b className="text-[#324354]">{visibles.length}</b></span>
                    <span className="text-[#2f7a40]">SELECCIONADOS: {sel.size}</span>
                    {sinDato > 0 && <span className="text-[#d14747]">SIN DATO EN SAP: {sinDato}</span>}
                    <span className="text-slate-400 font-semibold flex items-center gap-1"><Info size={12} /> Kilos por pieza para 1 unidad. Kg app = Kg SAP menos el % de reducción de cada material.</span>
                </div>
                {sync && sync.total > 0 && (
                    <div className="h-1.5 bg-slate-100 rounded"><div className="h-full bg-[#59a96a] rounded transition-all" style={{ width: `${(100 * sync.hechos) / sync.total}%` }} /></div>
                )}
                {error && <div className="px-3 py-1.5 rounded-lg bg-[#d14747]/10 border border-[#d14747]/40 text-[#d14747] text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
            </div>

            {/* Tabla */}
            <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
                {cargando && !filas.length ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold"><Loader2 className="animate-spin" size={18} /> Cargando productos…</div>
                ) : !filas.length ? (
                    <div className="py-16 text-center text-slate-500 text-sm font-semibold">Aún no hay productos calculados. Oprima <b>"Actualizar desde SAP"</b>.</div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#e2ded5] shadow-sm overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-[#324354] text-white sticky top-0 z-10">
                                <tr className="text-[10px] uppercase">
                                    <th rowSpan={2} className="px-2 py-2 w-8"><button onClick={alternarTodos} title="Seleccionar todos los visibles">{todosSel ? <CheckSquare size={16} /> : <Square size={16} />}</button></th>
                                    <th rowSpan={2} className="px-2 py-2 text-left">SKU</th>
                                    <th rowSpan={2} className="px-2 py-2 text-left">Producto</th>
                                    <th colSpan={3} className="px-2 pt-2 pb-0.5 text-center border-l border-white/20">Resina (Kg)</th>
                                    <th colSpan={3} className="px-2 pt-2 pb-0.5 text-center border-l border-white/20">Gelcoat (Kg)</th>
                                    <th rowSpan={2} className="px-2 py-2 text-left border-l border-white/20">Últ. modif.</th>
                                </tr>
                                <tr className="text-[10px] uppercase">
                                    <th className="px-2 pb-2 text-right border-l border-white/20">Bañera</th>
                                    <th className="px-2 pb-2 text-right">Faldón</th>
                                    <th className="px-2 pb-2 text-right">% red.</th>
                                    <th className="px-2 pb-2 text-right border-l border-white/20">Bañera</th>
                                    <th className="px-2 pb-2 text-right">Faldón</th>
                                    <th className="px-2 pb-2 text-right">% red.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map(f => (
                                    <tr key={f.producto_sku} onClick={() => alternar(f.producto_sku)} className={`cursor-pointer ${sel.has(f.producto_sku) ? 'bg-[#59a96a]/10' : 'hover:bg-slate-50'}`}>
                                        <td className="px-2 py-1.5 text-[#324354]">{sel.has(f.producto_sku) ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}</td>
                                        <td className="px-2 py-1.5 font-bold text-[#324354] whitespace-nowrap">{f.producto_sku}</td>
                                        <td className="px-2 py-1.5 font-semibold text-slate-700 min-w-[220px]">
                                            {/* Descripción completa: si es larga baja a otro renglón */}
                                            <div className="break-words leading-snug">{f.producto_descripcion || '—'}</div>
                                            {f.error && <div className="text-[10px] font-bold text-[#d14747] break-words">{f.error}</div>}
                                        </td>
                                        <td className="px-2 py-1.5 text-right border-l border-slate-100">{celda(f.resina_banera_kg, f.porcentaje_reduccion_resina, f.resina_banera_tipo)}</td>
                                        <td className="px-2 py-1.5 text-right">{celda(f.resina_faldon_kg, f.porcentaje_reduccion_resina, f.resina_faldon_tipo)}</td>
                                        <td className={`px-2 py-1.5 text-right font-black ${f.porcentaje_reduccion_resina ? 'text-[#d14747]' : 'text-slate-300'}`}>{fmt(f.porcentaje_reduccion_resina)} %</td>
                                        <td className="px-2 py-1.5 text-right border-l border-slate-100">{celda(f.gelcoat_banera_kg, f.porcentaje_reduccion_gelcoat)}</td>
                                        <td className="px-2 py-1.5 text-right">{celda(f.gelcoat_faldon_kg, f.porcentaje_reduccion_gelcoat)}</td>
                                        <td className={`px-2 py-1.5 text-right font-black ${f.porcentaje_reduccion_gelcoat ? 'text-[#d14747]' : 'text-slate-300'}`}>{fmt(f.porcentaje_reduccion_gelcoat)} %</td>
                                        <td className="px-2 py-1.5 border-l border-slate-100 text-[10px] text-slate-500 whitespace-nowrap">
                                            <div>{fecha(f.modified_at)}</div>
                                            <div className="truncate max-w-[140px]" title={f.modified_by || ''}>{f.modified_by || ''}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
