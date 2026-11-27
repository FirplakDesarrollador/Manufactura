'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'

// CEDI Muebles / CEFI (27/11/2026): el operario de CEDI marca "Verificado" mientras revisa físicamente la entrega de
// cada OF y confirma la cantidad. Tabla cedi_verificaciones_muebles (cedi_verificaciones_muebles.sql).

/** Casco de obra con cachos de diablo: el del que verifica (con cariño). */
export function CascoDiablo({ size = 18, className = '' }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* cachos */}
            <path d="M6.2 9.6C4.4 8.2 3.9 5.6 4.6 3.4c.8 2 2.1 3.4 3.8 4.3" />
            <path d="M17.8 9.6c1.8-1.4 2.3-4 1.6-6.2-.8 2-2.1 3.4-3.8 4.3" />
            {/* casco */}
            <path d="M5 15.5a7 6.6 0 0 1 14 0" />
            <path d="M12 9v3.6M9.2 9.7l.6 3M14.8 9.7l-.6 3" />
            <rect x="2.8" y="15.5" width="18.4" height="2.6" rx="1.3" />
        </svg>
    )
}

const FALTA_TABLA = /cedi_verificaciones_muebles|relation|does not exist|schema cache/i

/** Total verificado por OF y lo verificado hoy en la planta. */
export function useVerificacionesCedi(ofs: string[], planta: string) {
    const [porOf, setPorOf] = useState<Map<string, number>>(new Map())
    const [hoy, setHoy] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const clave = ofs.join(',')
    const cargar = useCallback(async () => {
        const mapa = new Map<string, number>()
        for (let i = 0; i < ofs.length; i += 150) {
            const { data, error } = await supabase.from('cedi_verificaciones_muebles').select('orden_fabricacion, cantidad')
                .in('orden_fabricacion', ofs.slice(i, i + 150))
            if (error) { setError(FALTA_TABLA.test(error.message) ? 'Falta ejecutar cedi_verificaciones_muebles.sql en Supabase.' : error.message); return }
            for (const r of data || []) mapa.set(String(r.orden_fabricacion), (mapa.get(String(r.orden_fabricacion)) || 0) + (Number(r.cantidad) || 0))
        }
        const ini = new Date(); ini.setHours(0, 0, 0, 0)
        const { data: d } = await supabase.from('cedi_verificaciones_muebles').select('cantidad')
            .eq('planta', planta).gte('created_at', ini.toISOString())
        setPorOf(mapa); setHoy((d || []).reduce((s, r) => s + (Number(r.cantidad) || 0), 0)); setError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, planta])
    useEffect(() => { cargar() }, [cargar])
    return { porOf, hoy, error, recargar: cargar }
}

/** Botón de la franja: "Verificado" con el casco; en verde con la cantidad cuando ya hay verificación. */
export function BotonVerificado({ orden, verificado, onClick }: { orden: OrdenMueble; verificado: number; onClick: () => void }) {
    const enCamino = (Number(orden.transito) || 0) + (Number(orden.cedi) || 0)
    const completo = verificado > 0 && verificado >= enCamino
    return (
        <button type="button" onClick={onClick}
            title={verificado > 0 ? `${verificado} unidad(es) verificada(s) de esta OF` : 'Marcar la entrega física como verificada'}
            className={`h-9 px-3 rounded-lg text-xs sm:text-sm font-black flex items-center gap-1.5 border transition-colors ${
                completo ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                    : verificado > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-white border-[#254153] text-[#254153] hover:bg-slate-50'}`}>
            <CascoDiablo size={20} />
            Verificado
            {verificado > 0 && <span className={`ml-0.5 px-1.5 rounded-md text-[11px] ${completo ? 'bg-white/20' : 'bg-emerald-200/70'}`}>{verificado}{enCamino ? `/${enCamino}` : ''}</span>}
        </button>
    )
}

/** Ventana para confirmar la cantidad verificada. */
export function ConfirmarVerificado({ orden, planta, verificado, usuario, onCerrar, onHecho }:
    { orden: OrdenMueble; planta: string; verificado: number; usuario: string; onCerrar: () => void; onHecho: () => void }) {
    const enCamino = (Number(orden.transito) || 0) + (Number(orden.cedi) || 0)
    const sugerido = Math.max(1, enCamino - verificado) || Number(orden.transito) || 1
    const maximo = Math.max(1, Number(orden.cantidad) || 1)
    const [cantidad, setCantidad] = useState<number>(Math.min(sugerido, maximo))
    const [guardando, setGuardando] = useState(false)
    useEffect(() => {
        const t = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onCerrar() }
        window.addEventListener('keydown', t); return () => window.removeEventListener('keydown', t)
    }, [guardando, onCerrar])

    const confirmar = async () => {
        const n = Math.floor(cantidad || 0)
        if (n <= 0 || n > maximo) return
        setGuardando(true)
        const { error } = await supabase.from('cedi_verificaciones_muebles').insert([{
            orden_fabricacion: String(orden.orden_fabricacion), planta, cantidad: n, verificado_por: usuario,
        }])
        setGuardando(false)
        if (error) { toast.error(FALTA_TABLA.test(error.message) ? 'Falta ejecutar cedi_verificaciones_muebles.sql en Supabase.' : `No se guardó: ${error.message}`); return }
        toast.success(`OF ${orden.orden_fabricacion}: ${n} unidad(es) verificada(s)`)
        onHecho()
    }

    // Deshacer (27/11/2026): si se verificó por error, se borran las verificaciones de esta OF (queda en 0)
    const deshacer = async () => {
        if (!confirm(`¿Deshacer la verificación de la OF ${orden.orden_fabricacion}? Las ${verificado} unidad(es) verificadas vuelven a quedar sin verificar.`)) return
        setGuardando(true)
        const { error } = await supabase.from('cedi_verificaciones_muebles').delete()
            .eq('orden_fabricacion', String(orden.orden_fabricacion)).eq('planta', planta)
        setGuardando(false)
        if (error) { toast.error(`No se deshizo: ${error.message}`); return }
        toast.success(`OF ${orden.orden_fabricacion}: verificación deshecha`)
        onHecho()
    }

    if (typeof document === 'undefined') return null
    return createPortal(
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
            onMouseDown={e => { if (e.target === e.currentTarget && !guardando) onCerrar() }}>
            <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-md p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">
                            <CascoDiablo size={16} /> Verificación física CEDI
                        </span>
                        <p className="text-xl font-black text-[#324354] mt-2">OF {orden.orden_fabricacion}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase truncate">{orden.producto_descripcion}</p>
                    </div>
                    <button type="button" onClick={onCerrar} disabled={guardando} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" title="Cerrar"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-slate-200 py-1.5"><p className="text-[9px] font-black uppercase text-slate-500">Tránsito</p><p className="text-lg font-black text-[#254153]">{Number(orden.transito) || 0}</p></div>
                    <div className="rounded-lg border border-slate-200 py-1.5"><p className="text-[9px] font-black uppercase text-slate-500">CEDI</p><p className="text-lg font-black text-[#254153]">{Number(orden.cedi) || 0}</p></div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-1.5"><p className="text-[9px] font-black uppercase text-emerald-700">Ya verificado</p><p className="text-lg font-black text-emerald-800">{verificado}</p></div>
                </div>
                <label className="block">
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cantidad verificada ahora</span>
                    <input type="number" min={1} max={maximo} value={cantidad} onChange={e => setCantidad(Number(e.target.value))}
                        className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-[#F6F3EE] text-lg font-black text-[#254153] text-center" />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                    {verificado > 0 && (
                        <button type="button" onClick={deshacer} disabled={guardando} title="Quita la verificación de esta OF (si se marcó por error)"
                            className="mr-auto h-10 px-3 rounded-lg bg-white border border-rose-300 text-[#d14747] hover:bg-rose-50 text-sm font-bold disabled:opacity-40">
                            Deshacer verificación
                        </button>
                    )}
                    <button type="button" onClick={onCerrar} disabled={guardando} className="h-10 px-4 rounded-lg bg-white border border-gray-300 text-sm font-bold text-slate-700">Cancelar</button>
                    <button type="button" onClick={confirmar} disabled={guardando || !(cantidad > 0) || cantidad > maximo}
                        className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center gap-1.5 disabled:opacity-40">
                        {guardando ? <Loader2 size={16} className="animate-spin" /> : <CascoDiablo size={18} />} Confirmar verificado
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
