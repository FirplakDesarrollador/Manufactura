'use client'

import React, { useEffect, useSyncExternalStore } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Aviso de Traslados en la tarjeta de la pieza FV: es lo que cuentan los números rojos del menú por proceso (OF sin
// traslado, con componentes faltantes por trasladar o solicitados sin trasladar, según la última revisión guardada en
// traslados_of_fv). Solo se muestra cuando la OF tiene novedad; así se ve cuál orden es la del aviso.
type Novedad = { estado: 'sin_traslado' | 'faltante' | 'solicitado'; faltantes: number; items: string[] }

let datos = new Map<string, Novedad>()
let cargado = 0
let pidiendo: Promise<void> | null = null
const oyentes = new Set<() => void>()
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f) } }

function cargar() {
    if (pidiendo || Date.now() - cargado < 5 * 60000) return
    pidiendo = (async () => {
        const { data, error } = await supabase.from('traslados_of_fv').select('orden_fabricacion, estado, faltantes, detalle')
            .in('estado', ['sin_traslado', 'faltante', 'solicitado'])
        if (!error) {
            datos = new Map((data || []).map((r: any) => [String(r.orden_fabricacion).trim(), {
                estado: r.estado, faltantes: Number(r.faltantes) || 0,
                items: (Array.isArray(r.detalle) ? r.detalle : []).filter((d: any) => d.estado === 'faltante' || d.estado === 'solicitado')
                    .map((d: any) => `${d.descripcion || d.item}${d.pendiente ? ` (${d.pendiente})` : ''}`),
            }]))
            cargado = Date.now()
            oyentes.forEach(f => f())
        }
        pidiendo = null
    })()
}

const TEXTO: Record<Novedad['estado'], (n: Novedad) => string> = {
    sin_traslado: () => 'Sin traslado',
    faltante: n => `Falta(n) ${n.faltantes || n.items.length} por trasladar`,
    solicitado: () => 'Solicitado sin trasladar',
}

export default function AvisoTrasladoOf({ of }: { of: string | number | null | undefined }) {
    const clave = String(of ?? '').trim()
    const n = useSyncExternalStore(suscribir, () => datos.get(clave), () => undefined)
    useEffect(() => { cargar() }, [])
    if (!n) return null
    return (
        <div className="flex items-center gap-2 min-w-0" title={n.items.length ? `Por trasladar en SAP:\n${n.items.join('\n')}` : 'Revise la pestaña Traslados'}>
            <ArrowRightLeft size={16} className="text-[#d14747] shrink-0" />
            <div className="min-w-0">
                <p className="text-[10px] text-[#7B8E90] uppercase font-black leading-none">Traslado</p>
                <p className="text-xs font-black leading-tight mt-0.5 text-[#d14747] whitespace-nowrap">{TEXTO[n.estado](n)}</p>
            </div>
        </div>
    )
}
