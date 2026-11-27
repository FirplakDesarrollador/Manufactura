'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'

// Devolver unidades al proceso anterior desde los módulos de Muebles / CEFI (queda en la trazabilidad a su nombre):
//  - destino 'inspeccion' (desde Digitado): lo que espera digitado vuelve a Inspección → −Inspección.
//  - destino 'digitado' (desde Tránsito): lo que espera tránsito vuelve a Digitado → −Digitado (y en Muebles −Empaque,
//    el Empaque automático que se registró al digitar, para que las cuentas de la vista sigan cuadrando).
type Destino = 'inspeccion' | 'digitado'
type Props = { orden: OrdenMueble; usuarioNombre: string; userEmail: string; onHecho: () => void; onCerrar: () => void; destino?: Destino }

const CONFIG: Record<Destino, { titulo: string; desde: string; campo: 'inspeccion' | 'digitado'; procesos: (cefi: boolean) => string[] }> = {
    inspeccion: { titulo: 'Inspección', desde: 'por digitar', campo: 'inspeccion', procesos: () => ['Inspeccion'] },
    digitado: { titulo: 'Digitado', desde: 'por pasar a tránsito', campo: 'digitado', procesos: cefi => cefi ? ['Digitado'] : ['Digitado', 'Empaque'] },
}

export default function DevolverInspeccionMuebles({ orden, usuarioNombre, userEmail, onHecho, onCerrar, destino = 'inspeccion' }: Props) {
    const cfg = CONFIG[destino]
    const esCefi = (orden.planta || '').toLowerCase().includes('cefi') || (orden.producto_sku || '').toUpperCase().startsWith('VCEF')
    const maximo = Math.max(0, Number(orden[cfg.campo]) || 0)
    const [cantidad, setCantidad] = useState(maximo)
    const [guardando, setGuardando] = useState(false)
    const aDevolver = Math.min(Math.max(0, Math.floor(cantidad || 0)), maximo)

    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onCerrar() }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [guardando, onCerrar])

    const devolver = async () => {
        if (aDevolver <= 0) return
        setGuardando(true)
        try {
            const ahora = new Date().toISOString()
            const { error } = await supabase.from('trazabilidad_muebles').insert(cfg.procesos(esCefi).map(proceso => ({
                orden_fabricacion: String(orden.orden_fabricacion), cantidad: -aDevolver, proceso,
                creado_por: userEmail || usuarioNombre, cedula_operario: `DEVOLVER_A_${destino.toUpperCase()}`,
                nombre_operario: `${usuarioNombre} (devolución a ${cfg.titulo})`,
                fecha_inicio: ahora, taladro: 'NO APLICA', created_at: ahora,
            })))
            if (error) throw error
            toast.success(`OF ${orden.orden_fabricacion}: ${aDevolver} unidad(es) devueltas a ${cfg.titulo}`)
            onHecho()
        } catch (e: any) {
            toast.error(`No se devolvió: ${e?.message || e}`)
        } finally {
            setGuardando(false)
        }
    }

    if (typeof document === 'undefined') return null
    return createPortal(
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
            onMouseDown={e => { if (e.target === e.currentTarget && !guardando) onCerrar() }}>
            <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-md p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Devolver a {cfg.titulo}</span>
                        <p className="text-xl font-black text-[#324354] mt-2">OF {orden.orden_fabricacion}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase truncate">{orden.producto_descripcion}</p>
                    </div>
                    <button type="button" onClick={onCerrar} disabled={guardando} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" title="Cerrar"><X size={20} /></button>
                </div>
                <label className="block">
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cantidad (máx. {maximo} {cfg.desde})</span>
                    <input type="number" min={1} max={maximo} value={cantidad} disabled={maximo <= 0}
                        onChange={e => setCantidad(Number(e.target.value))}
                        className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-[#F6F3EE] text-lg font-black text-[#254153] text-center disabled:opacity-50" />
                </label>
                <p className="text-[11px] text-slate-500">
                    {maximo <= 0 ? `Esta OF no tiene unidades ${cfg.desde} para devolver.`
                        : `Las ${aDevolver} unidad(es) vuelven a quedar pendientes en ${cfg.titulo} (queda en la trazabilidad a su nombre).`}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onCerrar} disabled={guardando} className="h-10 px-4 rounded-lg bg-white border border-gray-300 text-sm font-bold text-slate-700">Cancelar</button>
                    <button type="button" onClick={devolver} disabled={guardando || aDevolver <= 0}
                        className="h-10 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {guardando ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Devolver
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
