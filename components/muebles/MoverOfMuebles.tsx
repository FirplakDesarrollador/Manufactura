'use client'

import React, { useMemo, useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'

// Administración Muebles / CEFI: jalar la OF desde el proceso donde esté hasta el proceso que se elija (igual que
// "Mover OF" en Fibra, pero por CANTIDADES, que es como se lleva Muebles). Las unidades que están antes del destino
// se registran en cada proceso intermedio, como si los operarios las hubieran pasado (trazabilidad_muebles); así las
// vistas de cada proceso cuadran solas. Solo hacia adelante. Cada registro queda con el usuario que movió.
type Etapa = { id: string; campo: keyof OrdenMueble; label: string; proceso?: string }

// Orden del flujo; "proceso" = nombre con el que se registra en trazabilidad_muebles
const FLUJO: Etapa[] = [
    { id: 'programado', campo: 'por_cortar', label: 'Programado' },
    { id: 'corte', campo: 'corte', label: 'Corte', proceso: 'Corte' },
    { id: 'enchape', campo: 'enchape', label: 'Enchape', proceso: 'Enchape' },
    { id: 'inspeccion', campo: 'inspeccion', label: 'Inspección', proceso: 'Inspeccion' },
    { id: 'empaque', campo: 'empaque', label: 'Empaque', proceso: 'Empaque' },
    { id: 'digitado', campo: 'digitado', label: 'Digitado', proceso: 'Digitado' },
    { id: 'transito', campo: 'transito', label: 'Tránsito', proceso: 'Transito' },
    { id: 'cedi', campo: 'cedi', label: 'CEDI', proceso: 'Cedi' },
]

export default function MoverOfMuebles({ orden, planta, usuarioNombre, userEmail, onHecho }: {
    orden: OrdenMueble; planta: string; usuarioNombre: string; userEmail: string; onHecho: () => void
}) {
    const esCefi = (planta || orden.planta || '').toLowerCase().includes('cefi')
    // CEFI no usa Empaque
    const flujo = useMemo(() => FLUJO.filter(e => !(esCefi && e.id === 'empaque')), [esCefi])
    const cant = (e: Etapa) => Math.max(0, Number(orden[e.campo]) || 0)
    const [destino, setDestino] = useState('digitado')
    const [moviendo, setMoviendo] = useState(false)

    const iDestino = flujo.findIndex(e => e.id === destino)
    // Unidades que se jalan: todo lo que esté en las etapas anteriores al destino
    const aMover = flujo.slice(0, Math.max(0, iDestino)).reduce((s, e) => s + cant(e), 0)

    const mover = async () => {
        if (iDestino <= 0 || aMover <= 0) return
        if (!confirm(`¿Jalar ${aMover} unidad(es) de la OF ${orden.orden_fabricacion} hasta ${flujo[iDestino].label}?`)) return
        setMoviendo(true)
        try {
            // Cada proceso k (hasta el destino) recibe las unidades que estaban en las etapas anteriores a él
            const ahora = new Date().toISOString()
            const filas = []
            for (let k = 1; k <= iDestino; k++) {
                const cantidad = flujo.slice(0, k).reduce((s, e) => s + cant(e), 0)
                if (cantidad <= 0) continue
                filas.push({
                    orden_fabricacion: String(orden.orden_fabricacion), cantidad, creado_por: userEmail || usuarioNombre,
                    proceso: flujo[k].proceso, cedula_operario: 'ADMIN_MOVER', nombre_operario: `Administración: ${usuarioNombre}`,
                    fecha_inicio: ahora, taladro: 'NO APLICA', created_at: ahora,
                })
            }
            const { error } = await supabase.from('trazabilidad_muebles').insert(filas)
            if (error) throw error
            toast.success(`OF ${orden.orden_fabricacion}: ${aMover} unidad(es) pasaron a ${flujo[iDestino].label}`)
            onHecho()
        } catch (e: any) {
            toast.error(`No se movió la OF: ${e?.message || e}`)
        } finally {
            setMoviendo(false)
        }
    }

    return (
        <div className="rounded-xl border border-[#e2ded5] bg-[#F6F3EE] p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#254153]">
                <ArrowRightLeft size={14} /> Mover OF a un proceso
            </div>
            {/* Dónde está hoy cada unidad */}
            <div className="flex flex-wrap gap-1">
                {flujo.map(e => (
                    <span key={e.id} className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${cant(e) > 0 ? 'bg-[#254153] text-white border-[#254153]' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {e.label} {cant(e)}
                    </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <select value={destino} onChange={e => setDestino(e.target.value)}
                    className="flex-1 h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm font-bold text-[#254153]">
                    {flujo.slice(1).map(e => <option key={e.id} value={e.id}>Hasta {e.label}</option>)}
                </select>
                <button type="button" onClick={mover} disabled={moviendo || aMover <= 0}
                    className="h-9 px-4 rounded-lg bg-[#254153] hover:bg-[#1a3040] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                    {moviendo ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                    Mover {aMover > 0 ? `(${aMover})` : ''}
                </button>
            </div>
            <p className="text-[10px] text-slate-500">
                {aMover > 0
                    ? `Se jalan las ${aMover} unidad(es) que están antes de ${flujo[iDestino]?.label}; quedan registradas en cada proceso intermedio a su nombre.`
                    : `No hay unidades antes de ${flujo[iDestino]?.label} para mover.`}
            </p>
        </div>
    )
}
