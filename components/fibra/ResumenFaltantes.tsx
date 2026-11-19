'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardList, X, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { estadoRevision, useVersionRevision } from '@/lib/fibra/revisionEntrega'

// Resumen de componentes faltantes para la entrega de un grupo de OF (p. ej. las de Digitado): una fila por componente
// y bodega, con la existencia de la bodega, lo pendiente por descontar en todas las OF que lo usan y cuánto falta.
// La existencia de la bodega es compartida: se compara contra la suma de lo pendiente de esas OF, no OF por OF.

type Fila = {
    item: string; descripcion: string; bodega: string
    existencia: number | null
    pendienteTotal: number
    falta: number
    ordenes: { of: string; pendiente: number; faltante: boolean }[]
}

const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 })

export default function ResumenFaltantes({ ofs }: { ofs: (string | null | undefined)[] }) {
    const [abierto, setAbierto] = useState(false)
    const version = useVersionRevision()
    const [nombres, setNombres] = useState<Record<string, string>>({})

    const lista = useMemo(() => [...new Set(ofs.map(o => String(o ?? '').trim()).filter(Boolean))], [ofs])

    const { filas, sinRevisar } = useMemo(() => {
        void version
        const porClave = new Map<string, Fila>()
        const faltantes = new Set<string>()
        let sinRevisar = 0
        for (const of of lista) {
            const e = estadoRevision(of)
            if (e?.fase !== 'listo') { sinRevisar++; continue }
            for (const d of e.resultado.detalle) {
                if (d.pendiente <= 0) continue
                const k = `${d.item}|${d.bodega}`
                const f = porClave.get(k) || { item: d.item, descripcion: d.descripcion, bodega: d.bodega, existencia: d.existencia, pendienteTotal: 0, falta: 0, ordenes: [] }
                f.pendienteTotal += d.pendiente
                f.ordenes.push({ of, pendiente: d.pendiente, faltante: d.estado === 'faltante' })
                // La existencia más reciente que se conozca (todas las OF consultan la misma bodega)
                if (d.existencia != null) f.existencia = d.existencia
                porClave.set(k, f)
                if (d.estado === 'faltante') faltantes.add(k)
            }
        }
        const filas = [...faltantes].map(k => porClave.get(k)!).map(f => ({
            ...f,
            pendienteTotal: Math.round(f.pendienteTotal * 100) / 100,
            falta: Math.round(Math.max(0, f.pendienteTotal - (f.existencia ?? 0)) * 100) / 100,
            ordenes: [...f.ordenes].sort((a, b) => Number(b.faltante) - Number(a.faltante) || a.of.localeCompare(b.of)),
        })).sort((a, b) => b.falta - a.falta || a.item.localeCompare(b.item))
        return { filas, sinRevisar }
    }, [lista, version])

    // Nombres de las bodegas (SAP) al abrir
    const codigosBodega = useMemo(() => [...new Set(filas.map(f => f.bodega).filter(Boolean))].sort().join(','), [filas])
    useEffect(() => {
        if (!abierto || !codigosBodega) return
        const faltan = codigosBodega.split(',').filter(c => !(c in nombres))
        if (!faltan.length) return
        fetch(`/api/sap/bodegas?codigos=${encodeURIComponent(faltan.join(','))}`, { cache: 'no-store' })
            .then(r => r.json()).then(d => { if (d?.bodegas) setNombres(prev => ({ ...prev, ...d.bodegas })) })
            .catch(() => { /* se muestra solo el código */ })
    }, [abierto, codigosBodega, nombres])

    useEffect(() => {
        if (!abierto) return
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [abierto])

    const comentario = (f: Fila) => f.ordenes.map(o => `OF ${o.of}: ${num(o.pendiente)}${o.faltante ? '' : ' (cubierta)'}`).join(' · ')
    const nombreBodega = (c: string) => nombres[c] ? `${c} · ${nombres[c]}` : c

    // Tabla en texto separado por tabuladores: se pega directo en Excel
    const comoTexto = () => [
        ['SKU', 'Descripción', 'Bodega', 'Existencia bodega', 'Pendiente total', 'Falta', 'Órdenes'].join('\t'),
        ...filas.map(f => [f.item, f.descripcion, nombreBodega(f.bodega), f.existencia == null ? '' : num(f.existencia), num(f.pendienteTotal), num(f.falta), comentario(f)].join('\t')),
    ].join('\n')

    const copiar = async () => {
        try { await navigator.clipboard.writeText(comoTexto()); toast.success('Resumen copiado: péguelo en Excel') }
        catch { toast.error('No se pudo copiar') }
    }
    const descargar = () => {
        const csv = '﻿' + [
            ['SKU', 'Descripción', 'Bodega', 'Existencia bodega', 'Pendiente total', 'Falta', 'Órdenes'],
            ...filas.map(f => [f.item, f.descripcion, nombreBodega(f.bodega), f.existencia ?? '', f.pendienteTotal, f.falta, comentario(f)]),
        ].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        a.download = `faltantes-componentes-${new Date().toISOString().slice(0, 10)}.csv`
        a.click(); URL.revokeObjectURL(a.href)
    }

    if (!filas.length) return null

    return (
        <>
            <button onClick={() => setAbierto(true)}
                className="h-7 px-3 rounded-lg border border-[#d14747]/40 bg-white text-[#d14747] hover:bg-[#d14747]/5 text-[11px] font-bold normal-case tracking-normal flex items-center gap-1.5 shrink-0"
                title="Resumen de los componentes que faltan, con cantidades, bodega y órdenes">
                <ClipboardList size={14} /> Resumen de faltantes ({filas.length})
            </button>

            {abierto && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget) setAbierto(false) }}>
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#e2ded5]">
                            <div>
                                <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Componentes para la entrega</span>
                                <h2 className="text-xl font-black text-[#324354] mt-2">Resumen de faltantes</h2>
                                <p className="text-xs text-[#7B8E90] font-semibold mt-0.5">
                                    {filas.length} componente(s) · {lista.length - sinRevisar} de {lista.length} órdenes revisadas en SAP
                                    {sinRevisar > 0 && <span className="text-[#d14747]"> · {sinRevisar} aún sin revisar (no se incluyen)</span>}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={copiar} className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-xs font-bold flex items-center gap-1.5"
                                    title="Copiar la tabla para pegarla en Excel"><Copy size={15} /> Copiar</button>
                                <button onClick={descargar} className="h-9 px-3 rounded-lg bg-[#324354] hover:bg-[#254153] text-white text-xs font-bold flex items-center gap-1.5"
                                    title="Descargar la tabla en CSV (Excel)"><Download size={15} /> Excel</button>
                                <button onClick={() => setAbierto(false)} className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] hover:bg-[#F6F3EE] text-xs font-bold flex items-center gap-1.5">
                                    <X size={15} /> Cerrar</button>
                            </div>
                        </div>

                        <div className="overflow-auto mt-3 -mx-1 px-1">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-[#324354] text-white text-[10px] uppercase font-bold">
                                        <th className="text-left px-2 py-2 rounded-tl-lg">SKU</th>
                                        <th className="text-left px-2 py-2">Descripción</th>
                                        <th className="text-left px-2 py-2">Bodega</th>
                                        <th className="text-right px-2 py-2" title="Existencia actual de la bodega en SAP">Existencia</th>
                                        <th className="text-right px-2 py-2" title="Suma de lo que falta por descontar en todas las órdenes que usan el componente">Pendiente total</th>
                                        <th className="text-right px-2 py-2" title="Pendiente total − existencia: lo que hay que entrar o trasladar a la bodega">Falta</th>
                                        <th className="text-left px-2 py-2 rounded-tr-lg">Órdenes (pendiente por OF)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filas.map(f => (
                                        <tr key={`${f.item}|${f.bodega}`} className="border-b border-[#F1F5F9] align-top hover:bg-[#F6F3EE]/60">
                                            <td className="px-2 py-1.5 font-bold text-[#324354] whitespace-nowrap">{f.item}</td>
                                            <td className="px-2 py-1.5 text-[#324354] min-w-[180px]">{f.descripcion}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <div className="font-bold text-[#324354]">{f.bodega}</div>
                                                {nombres[f.bodega] && <div className="text-[10px] text-[#7B8E90]">{nombres[f.bodega]}</div>}
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{f.existencia == null ? <span className="text-[#d14747]">sin dato</span> : num(f.existencia)}</td>
                                            <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{num(f.pendienteTotal)}</td>
                                            <td className="px-2 py-1.5 text-right font-black tabular-nums text-[#d14747]">{num(f.falta)}</td>
                                            <td className="px-2 py-1.5 text-[11px] text-[#324354]">
                                                <div className="flex flex-wrap gap-1">
                                                    {f.ordenes.map(o => (
                                                        <span key={o.of} title={o.faltante ? 'A esta OF no le alcanza la existencia' : 'Esta OF sí alcanza, pero suma a lo pendiente de la bodega'}
                                                            className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${o.faltante ? 'border-[#d14747]/40 bg-[#d14747]/5 text-[#d14747] font-bold' : 'border-[#e2ded5] bg-white text-[#7B8E90]'}`}>
                                                            OF {o.of}: {num(o.pendiente)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[10px] text-[#7B8E90] mt-2">
                            La existencia es la de la bodega en SAP y la comparten todas las órdenes. En rojo, las OF a las que no les alcanza; en gris, las que sí alcanzan pero también la consumen.
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
