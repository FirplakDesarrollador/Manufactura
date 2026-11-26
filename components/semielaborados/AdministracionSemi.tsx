'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpFromLine, ClipboardList, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenSemi, cargarOrdenesSemi, coincideSemi, comoOrdenMueble } from '@/lib/semielaborados/datos'
import { IndicadoresSemi, BuscadorSemi, TarjetaOrdenSemi } from './comunesSemi'
import { BotonMoverOfMuebles } from '@/components/muebles/MoverOfMuebles'
import EditOrderModal from '@/components/muebles/EditOrderModal'
import HistorialTrazabilidadModal from '@/components/muebles/HistorialTrazabilidadModal'
import EstadoEntregaOf from '@/components/fibra/EstadoEntregaOf'

// Administración del Control de Piso Semielaborados (como la de Fibra): cada OF con Trazabilidad, componentes para
// la entrega, Mover OF (adelante o atrás, con cantidad), Editar y Eliminar. Las OF llegan de SAP con la misma
// sincronización de Muebles (las cajas, SKU PEMP…, quedan en la planta Semielaborados).
export default function AdministracionSemi({ usuario }: { usuario: { email: string; nombre: string } }) {
    const [ordenes, setOrdenes] = useState<OrdenSemi[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [visibles, setVisibles] = useState(30)
    const [editar, setEditar] = useState<{ o: OrdenSemi; eliminar: boolean } | null>(null)
    const [trazabilidadDe, setTrazabilidadDe] = useState<OrdenSemi | null>(null)
    const [sincronizando, setSincronizando] = useState(false)

    const cargar = useCallback(async () => {
        setError(null)
        try { setOrdenes(await cargarOrdenesSemi()) } catch (e: any) { setError(e?.message || String(e)); setOrdenes([]) }
    }, [])
    useEffect(() => { cargar() }, [cargar])

    const lista = useMemo(() => (ordenes || []).filter(o => coincideSemi(o, busqueda)), [ordenes, busqueda])

    const sincronizar = async () => {
        setSincronizando(true)
        try {
            const r = await fetch('/api/sap/liberacion-muebles', { cache: 'no-store' })
            const d = await r.json().catch(() => ({}))
            if (!r.ok || d.success === false) throw new Error(d.error || `Error ${r.status}`)
            toast.success('Órdenes actualizadas desde SAP')
            await cargar()
        } catch (e: any) {
            toast.error(`No se pudo sincronizar con SAP: ${e?.message || e}`)
        } finally { setSincronizando(false) }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-2 sm:px-4 py-2 bg-white border-b border-slate-200 space-y-2">
                <IndicadoresSemi ordenes={ordenes || []} />
                <div className="flex flex-wrap items-center gap-2">
                    <BuscadorSemi valor={busqueda} onCambio={setBusqueda} />
                    <button onClick={cargar} className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#324354] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F3EE]">
                        <RefreshCw size={14} className={ordenes === null ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <button onClick={sincronizar} disabled={sincronizando} title="Traer de SAP las OF liberadas (Muebles, CEFI y Semielaborados)"
                        className="h-9 px-3 rounded-lg bg-[#324354] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#254153] disabled:opacity-50">
                        {sincronizando ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpFromLine size={14} />} Cargar órdenes
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-2 sm:p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-[#324354]">Órdenes abiertas · {lista.length}</p>
                {error && <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-[#d14747]">{error}</div>}
                {ordenes === null && <p className="py-10 text-center text-sm text-slate-400">Cargando órdenes…</p>}
                {ordenes !== null && !lista.length && !error && <p className="py-10 text-center text-sm text-slate-400">Sin órdenes abiertas.</p>}
                {lista.slice(0, visibles).map(o => (
                    <TarjetaOrdenSemi key={o.id} orden={o}
                        franja={
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => setTrazabilidadDe(o)}
                                    className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#254153] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-50">
                                    <ClipboardList size={16} /> Trazabilidad
                                </button>
                                <div className="flex-1 min-w-[220px]"><EstadoEntregaOf of={o.orden_fabricacion} /></div>
                                <div className="flex items-center gap-2 ml-auto">
                                    <BotonMoverOfMuebles orden={comoOrdenMueble(o)} planta="Semielaborados" variante="semielaborados"
                                        usuarioNombre={usuario.nombre} userEmail={usuario.email} onHecho={cargar} />
                                    <button type="button" onClick={() => setEditar({ o, eliminar: false })}
                                        className="h-9 px-3 rounded-lg border border-[#e2ded5] bg-white text-[#254153] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-slate-50">
                                        <Pencil size={15} /> Editar
                                    </button>
                                    <button type="button" onClick={() => setEditar({ o, eliminar: true })}
                                        className="h-9 px-3 rounded-lg border border-rose-200 bg-white text-[#d14747] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-rose-50">
                                        <Trash2 size={15} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        } />
                ))}
                {lista.length > visibles && (
                    <button type="button" onClick={() => setVisibles(v => v + 30)}
                        className="w-full py-3 rounded-xl border border-[#e2ded5] bg-white text-[#254153] text-sm font-bold hover:bg-[#F6F3EE]">
                        Mostrar 30 más ({lista.length - visibles} restantes)
                    </button>
                )}
            </div>

            {editar && (
                <EditOrderModal key={`${editar.o.id}-${editar.eliminar}`} orden={comoOrdenMueble(editar.o)} abrirEliminar={editar.eliminar}
                    usuarioNombre={usuario.nombre} turno="1" userEmail={usuario.email}
                    onClose={() => setEditar(null)} onSuccess={cargar} />
            )}
            {trazabilidadDe && (
                <HistorialTrazabilidadModal orden={comoOrdenMueble(trazabilidadDe)} onClose={() => setTrazabilidadDe(null)} onSuccess={cargar} />
            )}
        </div>
    )
}
