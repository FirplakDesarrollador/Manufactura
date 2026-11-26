'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenSemi, ProcesoSemi, TipoSemi, ENTRADA, tipoSemi, cargarOrdenesSemi, registrarSemi, coincideSemi } from '@/lib/semielaborados/datos'
import { IndicadoresSemi, BuscadorSemi, TarjetaOrdenSemi } from './comunesSemi'

// Proceso del Control de Piso Semielaborados (Corte, Digitado, Tránsito, Almacén): las OF con unidades por hacer en
// este proceso (las que llegan del anterior); se registra CUÁNTAS terminan el proceso, a nombre del usuario.
export default function ModuloProcesoSemi({ tipo, proceso, usuario }: { tipo: TipoSemi; proceso: ProcesoSemi; usuario: { email: string; nombre: string } }) {
    const NOMBRE_PROCESO = tipoSemi(tipo).procesos
    const [ordenes, setOrdenes] = useState<OrdenSemi[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [cantidades, setCantidades] = useState<Record<number, number>>({})
    const [guardando, setGuardando] = useState<number | null>(null)
    const entrada = ENTRADA[proceso]

    const cargar = useCallback(async () => {
        setError(null)
        try { setOrdenes(await cargarOrdenesSemi(tipo)) } catch (e: any) { setError(e?.message || String(e)); setOrdenes([]) }
    }, [tipo])
    useEffect(() => { cargar() }, [cargar])

    const lista = useMemo(() => (ordenes || [])
        .filter(o => (Number(o[entrada]) || 0) > 0 && coincideSemi(o, busqueda)), [ordenes, entrada, busqueda])

    const registrar = async (o: OrdenSemi) => {
        const max = Number(o[entrada]) || 0
        const n = Math.min(Math.max(0, Math.floor(cantidades[o.id] ?? max)), max)
        if (n <= 0) return
        setGuardando(o.id)
        try {
            await registrarSemi(o, proceso, n, usuario)
            toast.success(`OF ${o.orden_fabricacion}: ${n} unidad(es) registradas en ${NOMBRE_PROCESO[proceso]}`)
            setCantidades(p => { const c = { ...p }; delete c[o.id]; return c })
            await cargar()
        } catch (e: any) {
            toast.error(`No se registró: ${e?.message || e}`)
        } finally { setGuardando(null) }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 space-y-2">
                <IndicadoresSemi ordenes={ordenes || []} tipo={tipo} />
                <div className="flex items-center gap-2">
                    <BuscadorSemi valor={busqueda} onCambio={setBusqueda} />
                    <button onClick={cargar} className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]">
                        <RefreshCw size={14} className={ordenes === null ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-2 sm:p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-[#324354]">{NOMBRE_PROCESO[proceso]} · {lista.length} OF por registrar</p>
                {error && <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-[#d14747]">{error}</div>}
                {ordenes === null && <p className="py-10 text-center text-sm text-slate-400">Cargando órdenes…</p>}
                {ordenes !== null && !lista.length && !error && <p className="py-10 text-center text-sm text-slate-400">No hay órdenes por registrar en {NOMBRE_PROCESO[proceso]}.</p>}
                {lista.map(o => {
                    const max = Number(o[entrada]) || 0
                    const valor = cantidades[o.id] ?? max
                    return (
                        <TarjetaOrdenSemi key={o.id} orden={o} resaltar={entrada}
                            franja={
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="text-[11px] font-bold text-slate-500 mr-auto">Por registrar en {NOMBRE_PROCESO[proceso]}: <b className="text-[#254153]">{max}</b></span>
                                    <label className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                                        Cantidad
                                        <input type="number" min={1} max={max} value={valor}
                                            onChange={e => setCantidades(p => ({ ...p, [o.id]: Number(e.target.value) }))}
                                            className="w-20 h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm font-black text-[#254153] text-center" />
                                    </label>
                                    <button type="button" onClick={() => registrar(o)} disabled={guardando === o.id || !(valor > 0)}
                                        className="h-9 px-4 rounded-lg bg-[#254153] hover:bg-[#1a3040] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                                        {guardando === o.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        Registrar {NOMBRE_PROCESO[proceso]}
                                    </button>
                                </div>
                            } />
                    )
                })}
            </div>
        </div>
    )
}
