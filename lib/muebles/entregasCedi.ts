'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Entregas a CEDI (27/11/2026) de Muebles, CEFI, MS y FV. Una entrega = lo despachado a CEDI entre dos cierres del
// mismo día (tabla cedi_entregas_muebles, cedi_entregas_muebles.sql); la numeración se reinicia cada día.
//  - Muebles / CEFI: registros de Tránsito (trazabilidad_muebles, por cantidad).
//  - MS / FV: piezas digitadas (al digitar la pieza pasa a Tránsito; digitado_fecha), una por pieza.

export type PlantaEntrega = 'Muebles' | 'Cefi' | 'MS' | 'Fibra'
export type ItemEntrega = { of: string; sku: string; descripcion: string; cantidad: number }
export type Entrega = { numero: number; cerradaAt: string | null; cerradaPor: string | null; items: ItemEntrega[]; total: number }
type InfoOf = { sku: string; descripcion: string }

const FALTA_TABLA = /cedi_entregas_muebles|relation|does not exist|schema cache/i

/** Hora de la base: trazabilidad_muebles.created_at es "timestamp" sin zona (llega sin "Z") y está en UTC; sin esto
 *  el navegador la leía como hora local (5 h corrida) y todo caía después de los cierres */
const hora = (v: string) => Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v) ? v : `${v}Z`)

/** Fecha local aaaa-mm-dd */
export const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Movimientos de despacho de hoy: { of, cantidad, t } */
async function movimientosHoy(planta: PlantaEntrega, desde: string): Promise<{ movs: { of: string; cantidad: number; t: number }[]; info: Map<string, InfoOf>; error: string | null }> {
    const info = new Map<string, InfoOf>()
    if (planta === 'Muebles' || planta === 'Cefi') {
        const { data: regs, error } = await supabase.from('trazabilidad_muebles').select('orden_fabricacion, cantidad, created_at')
            .eq('proceso', 'Transito').gte('created_at', desde).order('created_at').limit(10000)
        if (error) return { movs: [], info, error: error.message }
        const ofs = [...new Set((regs || []).map(r => String(r.orden_fabricacion)))]
        const deLaPlanta = new Set<string>()
        for (let i = 0; i < ofs.length; i += 150) {
            const { data } = await supabase.from('ordenes_fabricacion_muebles').select('orden_fabricacion, producto_sku, producto_descripcion, planta')
                .in('orden_fabricacion', ofs.slice(i, i + 150))
            for (const o of data || []) {
                info.set(String(o.orden_fabricacion), { sku: o.producto_sku || '', descripcion: o.producto_descripcion || '' })
                if (String(o.planta) === planta) deLaPlanta.add(String(o.orden_fabricacion))
            }
        }
        return { movs: (regs || []).filter(r => deLaPlanta.has(String(r.orden_fabricacion)))
            .map(r => ({ of: String(r.orden_fabricacion), cantidad: Number(r.cantidad) || 0, t: hora(String(r.created_at)) })), info, error: null }
    }
    const vista = planta === 'MS' ? 'query_trazabilidad_ms' : 'query_trazabilidad_fv'
    const { data: piezas, error } = await supabase.from(vista).select('orden_fabricacion, digitado_fecha, estado')
        .gte('digitado_fecha', desde).in('estado', ['Transito', 'Cedi']).limit(20000)
    if (error) return { movs: [], info, error: error.message }
    const ofs = [...new Set((piezas || []).map(r => String(r.orden_fabricacion)))]
    const tabla = planta === 'MS' ? 'ordenes_fabricacion' : 'ordenes_fabricacion_fibra'
    const cols = planta === 'MS' ? 'orden_fabricacion, producto_sku, producto_descripcion, molde_descripcion' : 'orden_fabricacion, producto_sku, molde_descripcion'
    for (let i = 0; i < ofs.length; i += 150) {
        const { data } = await supabase.from(tabla).select(cols).in('orden_fabricacion', ofs.slice(i, i + 150))
        for (const o of (data || []) as any[]) info.set(String(o.orden_fabricacion), { sku: String(o.producto_sku || '').toUpperCase(), descripcion: o.producto_descripcion || o.molde_descripcion || '' })
    }
    return { movs: (piezas || []).map(r => ({ of: String(r.orden_fabricacion), cantidad: 1, t: hora(String(r.digitado_fecha)) })), info, error: null }
}

async function leerEntregas(planta: PlantaEntrega, extra?: Map<string, InfoOf>): Promise<{ entregas: Entrega[]; error: string | null }> {
    const ini = new Date(); ini.setHours(0, 0, 0, 0)
    const { data: cierres, error: eC } = await supabase.from('cedi_entregas_muebles').select('numero, cerrada_at, cerrada_por')
        .eq('planta', planta).eq('fecha', fechaLocal(ini)).order('numero')
    if (eC) return { entregas: [], error: FALTA_TABLA.test(eC.message) ? 'Falta ejecutar cedi_entregas_muebles.sql en Supabase.' : eC.message }
    const { movs, info, error } = await movimientosHoy(planta, ini.toISOString())
    if (error) return { entregas: [], error }
    // La descripción que trae la pantalla (p. ej. FV) gana si la tabla base no la tiene
    for (const [of, v] of extra || []) { const a = info.get(of); if (!a || !a.descripcion) info.set(of, { sku: a?.sku || v.sku, descripcion: v.descripcion || a?.descripcion || '' }) }

    const cortes = (cierres || []).map(c => ({ numero: Number(c.numero), t: hora(String(c.cerrada_at)), at: c.cerrada_at as string, por: (c.cerrada_por as string) || null }))
    const enCurso = (cortes[cortes.length - 1]?.numero || 0) + 1
    const porEntrega = new Map<number, Map<string, number>>()
    for (const m of movs) {
        const n = cortes.find(c => m.t <= c.t)?.numero ?? enCurso
        const mapa = porEntrega.get(n) || new Map<string, number>(); porEntrega.set(n, mapa)
        mapa.set(m.of, (mapa.get(m.of) || 0) + m.cantidad)
    }
    const armar = (numero: number, at: string | null, por: string | null): Entrega => {
        const items = [...(porEntrega.get(numero) || new Map<string, number>()).entries()]
            .filter(([, c]) => c !== 0)
            .map(([of, cantidad]) => ({ of, cantidad, sku: info.get(of)?.sku || '', descripcion: info.get(of)?.descripcion || '' }))
            .sort((a, b) => a.of.localeCompare(b.of))
        return { numero, cerradaAt: at, cerradaPor: por, items, total: items.reduce((s, i) => s + i.cantidad, 0) }
    }
    const entregas = cortes.map(c => armar(c.numero, c.at, c.por))
    entregas.push(armar(enCurso, null, null))
    return { entregas, error: null }
}

/** Entregas de hoy (cerradas + la en curso, siempre la última) */
export function useEntregasCedi(planta: string, version?: unknown, extra?: Map<string, InfoOf>) {
    const [entregas, setEntregas] = useState<Entrega[]>([])
    const [error, setError] = useState<string | null>(null)
    const cargar = useCallback(async () => {
        const r = await leerEntregas(planta as PlantaEntrega, extra)
        setEntregas(r.entregas); setError(r.error)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planta, extra])
    useEffect(() => { cargar() }, [cargar, version])
    const enCurso = entregas[entregas.length - 1] || null
    return { entregas, enCurso, error, recargar: cargar }
}

/** Cierra la entrega en curso: lo despachado hasta ahora queda como Entrega N */
export async function cerrarEntregaCedi(planta: string, numero: number, usuario: string) {
    const { error } = await supabase.from('cedi_entregas_muebles').insert([{ planta, fecha: fechaLocal(), numero, cerrada_por: usuario }])
    if (error) throw new Error(FALTA_TABLA.test(error.message) ? 'Falta ejecutar cedi_entregas_muebles.sql en Supabase.' : error.message)
}

/** "Total CEDI" (27/11/2026) = suma por OF de las entregas de hoy YA CERRADAS (la en curso no entra), con su total */
function totalCerradas(entregas: Entrega[]): { filas: (string | number)[][]; total: number } {
    const porOf = new Map<string, ItemEntrega>()
    for (const e of entregas) {
        if (!e.cerradaAt) continue
        for (const i of e.items) {
            const a = porOf.get(i.of)
            porOf.set(i.of, a ? { ...a, cantidad: a.cantidad + i.cantidad } : { ...i })
        }
    }
    const items = [...porOf.values()].filter(i => i.cantidad !== 0).sort((a, b) => a.of.localeCompare(b.of))
    return { filas: items.map(i => [Number(i.of) || i.of, i.sku, i.descripcion, i.cantidad]), total: items.reduce((t, i) => t + i.cantidad, 0) }
}

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** CSV separado por entregas (como las hojas del Excel): un .zip con un CSV por entrega de hoy ("Entrega 1.csv",
 *  "Entrega 2.csv", … y la en curso) + "Total CEDI.csv"; columnas OF, SKU, Descripcion, Transito */
export async function descargarCsvEntregas(nombre: string, entregas: Entrega[], total: (string | number)[][]) {
    const csv = (filas: (string | number)[][]) => '﻿' + [['OF', 'SKU', 'Descripcion', 'Transito'], ...filas].map(r => r.map(q).join(',')).join('\r\n')
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    for (const e of entregas) {
        if (!e.items.length) continue
        const filas: (string | number)[][] = e.items.map(i => [i.of, i.sku, i.descripcion, i.cantidad])
        filas.push(['', '', `Total entrega ${e.numero}${e.cerradaAt ? '' : ' (en curso)'}`, e.total])
        zip.file(e.cerradaAt ? `Entrega ${e.numero}.csv` : `Entrega ${e.numero} (en curso).csv`, csv(filas))
    }
    void total
    const tc = totalCerradas(entregas)
    zip.file('Total CEDI.csv', csv([...tc.filas, ['', '', 'Total entregas cerradas', tc.total]]))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = nombre.replace(/\.csv$/i, '.zip'); a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Excel: una hoja por entrega de hoy + la hoja "Total CEDI" = suma de las entregas cerradas (4 columnas, tabla verde) */
export async function descargarExcelEntregas(nombre: string, entregas: Entrega[], total: (string | number)[][]) {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const columnas = [{ name: 'OF', filterButton: true }, { name: 'SKU', filterButton: true }, { name: 'Descripcion', filterButton: true }, { name: 'Transito', filterButton: true }]
    for (const e of entregas) {
        if (!e.items.length) continue
        const h = wb.addWorksheet(e.cerradaAt ? `Entrega ${e.numero}` : `Entrega ${e.numero} (en curso)`)
        h.columns = [{ width: 11 }, { width: 22 }, { width: 72 }, { width: 11 }]
        h.addTable({ name: `Entrega${e.numero}`, ref: 'A1', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true },
            columns: columnas, rows: e.items.map(i => [Number(i.of) || i.of, i.sku, i.descripcion, i.cantidad]) })
        const fin = e.items.length + 2
        h.getCell(`C${fin}`).value = `Total entrega ${e.numero}${e.cerradaAt ? ` · cerrada ${new Date(e.cerradaAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ' (en curso)'}`
        h.getCell(`C${fin}`).font = { bold: true }
        h.getCell(`D${fin}`).value = e.total
        h.getCell(`D${fin}`).font = { bold: true }
        h.views = [{ state: 'frozen', ySplit: 1 }]
    }
    const ws = wb.addWorksheet('Total CEDI')
    ws.columns = [{ width: 11 }, { width: 22 }, { width: 72 }, { width: 11 }]
    void total
    const tc = totalCerradas(entregas)
    ws.addTable({ name: 'TotalCedi', ref: 'A1', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true }, columns: columnas, rows: tc.filas.length ? tc.filas : [['', '', '', 0]] })
    const finT = Math.max(tc.filas.length, 1) + 2
    ws.getCell(`C${finT}`).value = 'Total entregas cerradas'
    ws.getCell(`C${finT}`).font = { bold: true }
    ws.getCell(`D${finT}`).value = tc.total
    ws.getCell(`D${finT}`).font = { bold: true }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
