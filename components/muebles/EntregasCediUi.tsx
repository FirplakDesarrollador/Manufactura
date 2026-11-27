'use client'

import React, { useState } from 'react'
import { Loader2, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { cerrarEntregaCedi, Entrega } from '@/lib/muebles/entregasCedi'

// Botón "Cerrar entrega N" y resumen "Entregas hoy" de CEDI (Muebles, CEFI, MS y FV), 27/11/2026

export function BotonCerrarEntrega({ planta, enCurso, usuario, unidad, onHecho }:
    { planta: string; enCurso: Entrega | null; usuario: string; unidad: string; onHecho: () => void }) {
    const [cerrando, setCerrando] = useState(false)
    const cerrar = async () => {
        if (!enCurso) return
        if (!confirm(`¿Cerrar la Entrega ${enCurso.numero} con ${enCurso.total} ${unidad} (${enCurso.items.length} OF)? Lo que se despache después irá a la Entrega ${enCurso.numero + 1}.`)) return
        setCerrando(true)
        try {
            await cerrarEntregaCedi(planta, enCurso.numero, usuario)
            toast.success(`Entrega ${enCurso.numero} cerrada: ${enCurso.total} ${unidad}`)
            onHecho()
        } catch (e: any) {
            toast.error(`No se cerró la entrega: ${e?.message || e}`)
        } finally {
            setCerrando(false)
        }
    }
    return (
        <button type="button" onClick={cerrar} disabled={cerrando || !enCurso || enCurso.total <= 0}
            title="Cierra la entrega en curso: lo despachado a CEDI hasta ahora queda como esta entrega"
            className="h-9 px-3 shrink-0 bg-[#deb841] hover:bg-[#c9a535] text-[#254153] rounded-lg font-black text-xs flex items-center gap-1.5 disabled:opacity-50">
            {cerrando ? <Loader2 className="animate-spin" size={15} /> : <Warehouse size={15} />} Cerrar entrega {enCurso?.numero ?? 1}
        </button>
    )
}

/** Selección de entrega: null = la en curso (por defecto), 'todas' o el número de una entrega cerrada */
export type SeleccionEntrega = number | 'todas' | null

/** OF que se ven según la entrega elegida. En curso = solo lo despachado después del último cierre: al cerrar la
 *  entrega queda en 0 y se va llenando con lo que llega del proceso anterior. */
export function filtrarPorEntrega<T extends { orden_fabricacion?: unknown }>(lista: T[], entregas: Entrega[], sel: SeleccionEntrega): T[] {
    if (sel === 'todas') return lista
    const e = sel === null ? entregas[entregas.length - 1] : entregas.find(x => x.numero === sel)
    const ofs = new Set((e?.items || []).map(i => i.of))
    return lista.filter(o => ofs.has(String(o.orden_fabricacion)))
}

export function ChipEntregasHoy({ entregas, error, seleccion, onSeleccion }:
    { entregas: Entrega[]; error: string | null; seleccion?: SeleccionEntrega; onSeleccion?: (s: SeleccionEntrega) => void }) {
    const enCurso = entregas[entregas.length - 1]
    const total = entregas.reduce((t, e) => t + e.total, 0)
    const clase = (activo: boolean, curso = false) => `px-1.5 rounded ${activo ? (curso ? 'bg-[#deb841] text-[#254153] ring-2 ring-[#254153]/30' : 'bg-[#254153] text-white') : (curso ? 'bg-[#deb841]/50 text-[#254153] hover:bg-[#deb841]' : 'bg-white/70 text-[#254153] hover:bg-white')}`
    return (
        <>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black uppercase tracking-wide whitespace-nowrap"
                title="Entregas de hoy a CEDI (lo despachado entre cierres). Clic: ver lo que se entregó">
                Entregas hoy <b className="text-[#254153]">{total.toLocaleString('es-CO')}</b>:
                {onSeleccion && <button type="button" onClick={() => onSeleccion('todas')} className={clase(seleccion === 'todas')}>Todas</button>}
                {entregas.filter(e => e.cerradaAt).map(e => (
                    <button type="button" key={e.numero} disabled={!onSeleccion} onClick={() => onSeleccion?.(e.numero)}
                        title={`Cerrada ${new Date(e.cerradaAt as string).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                        className={clase(seleccion === e.numero)}>#{e.numero}: {e.total}</button>
                ))}
                {enCurso && <button type="button" disabled={!onSeleccion} onClick={() => onSeleccion?.(null)} className={clase(seleccion === null, true)}>#{enCurso.numero} en curso: {enCurso.total}</button>}
            </span>
            {error && <span className="normal-case text-[11px] text-[#d14747]">{error}</span>}
        </>
    )
}
