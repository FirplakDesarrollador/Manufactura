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

export function ChipEntregasHoy({ entregas, error }: { entregas: Entrega[]; error: string | null }) {
    const enCurso = entregas[entregas.length - 1]
    return (
        <>
            <span className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black uppercase tracking-wide"
                title="Entregas de hoy a CEDI (lo despachado entre cierres)">
                Entregas hoy:
                {entregas.filter(e => e.cerradaAt).map(e => (
                    <b key={e.numero} className="px-1.5 rounded bg-white/70 text-[#254153]"
                        title={`Cerrada ${new Date(e.cerradaAt as string).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}>#{e.numero}: {e.total}</b>
                ))}
                {enCurso && <b className="px-1.5 rounded bg-[#deb841] text-[#254153]">#{enCurso.numero} en curso: {enCurso.total}</b>}
            </span>
            {error && <span className="normal-case text-[11px] text-[#d14747]">{error}</span>}
        </>
    )
}
