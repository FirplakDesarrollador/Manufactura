'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, History, Loader2, RefreshCw, Search, X } from 'lucide-react'
import { getMovimientosFv, FilaMovimientoFv } from '@/lib/fibra/movimientos'

// Historial de movimientos manuales del Control de piso FV (quién, cuándo, qué pieza, de dónde a dónde)

const ACCIONES: Record<string, string> = {
    mover: 'Cambio de proceso',
    cambiar_mesa: 'Cambio de mesa',
    quitar_mesa: 'Quitó la mesa',
    registrar_desde_programado: 'Registro desde Programado',
    devolver_programado: 'Devuelta a Programado',
    liberar_molde: 'Liberó molde',
    editar_registro: 'Editó registro',
    eliminar_registro: 'Eliminó registro'
}
const ORIGENES: Record<string, string> = { mapa: 'Mapa', importar_excel: 'Excel', moldes: 'Moldes', administracion: 'Administración', pintura: 'Pintura' }
const COLOR_ACCION: Record<string, string> = {
    devolver_programado: 'bg-red-100 text-red-800', eliminar_registro: 'bg-red-100 text-red-800',
    liberar_molde: 'bg-amber-100 text-amber-800', editar_registro: 'bg-amber-100 text-amber-800'
}

const mesaCorta = (m: string | null) => m ? m.replace('-', ' ') : ''
const lado = (estado: string | null, mesa: string | null) => [estado, mesaCorta(mesa)].filter(Boolean).join(' · ') || '—'

export default function HistorialMovimientosFv({ onCerrar, ofInicial = '' }: { onCerrar: () => void; ofInicial?: string }) {
    const [filas, setFilas] = useState<FilaMovimientoFv[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState(ofInicial)

    const cargar = async () => {
        setCargando(true)
        try {
            setFilas(await getMovimientosFv({ limite: 500 }))
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setCargando(false)
        }
    }
    useEffect(() => { cargar() }, [])
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onCerrar])

    const visibles = useMemo(() => {
        const t = busqueda.trim().toLowerCase()
        if (!t) return filas
        return filas.filter(f => [f.orden_fabricacion, f.registrer, f.usuario_email, f.molde_serial, ACCIONES[f.accion]]
            .some(v => String(v ?? '').toLowerCase().includes(t)))
    }, [filas, busqueda])

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl min-h-[80vh] h-[94vh] overflow-hidden flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
                    <div>
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Control de piso FV</span>
                        <h2 className="text-xl font-black text-[#324354] mt-2 flex items-center gap-2"><History className="w-5 h-5" /> Historial de movimientos manuales</h2>
                        <p className="text-xs text-slate-600">Mapa de procesos, Ubicar desde Excel, módulo Moldes y Administración. No se puede editar ni borrar.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="OF, pieza, usuario o molde" autoFocus
                                className="h-8 w-60 pl-7 pr-6 rounded-lg border border-slate-300 text-xs font-semibold text-[#324354] outline-none focus:ring-2 focus:ring-[#59a96a]" />
                            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                        <button onClick={cargar} disabled={cargando} title="Actualizar"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onCerrar} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153]">
                            <X className="w-3.5 h-3.5" /> Cerrar
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200">
                    {error ? (
                        <div className="m-3 p-4 bg-red-50 border border-red-400 text-red-800 rounded-xl font-bold text-sm flex items-center gap-2" role="alert"><AlertTriangle size={18} /> {error}</div>
                    ) : cargando && filas.length === 0 ? (
                        <div className="p-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...</div>
                    ) : visibles.length === 0 ? (
                        <div className="p-6 text-center text-sm font-bold text-slate-500">Sin movimientos{busqueda ? ' con esa búsqueda' : ''}.</div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[#324354] text-white text-[10px] uppercase tracking-wider">
                                <tr>
                                    {['Fecha', 'Usuario', 'Acción', 'OF', 'Pieza', 'Antes', 'Después', 'Molde', 'Origen'].map(h => <th key={h} className="px-2 py-2 text-left font-black whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map(f => (
                                    <tr key={f.id} className="hover:bg-slate-50 align-top">
                                        <td className="px-2 py-1.5 whitespace-nowrap font-mono">{new Date(f.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit' })}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{f.usuario_email.split('@')[0]}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded font-bold ${COLOR_ACCION[f.accion] || 'bg-slate-100 text-slate-700'}`}>{ACCIONES[f.accion] || f.accion}</span></td>
                                        <td className="px-2 py-1.5 font-mono font-bold text-[#324354]">{f.orden_fabricacion || '—'}</td>
                                        <td className="px-2 py-1.5 font-mono text-slate-500">{f.registrer || '—'}</td>
                                        <td className="px-2 py-1.5">{lado(f.estado_antes, f.mesa_antes)}</td>
                                        <td className="px-2 py-1.5 font-semibold">{lado(f.estado_despues, f.mesa_despues)}</td>
                                        <td className="px-2 py-1.5 font-mono">{f.molde_serial || '—'}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{ORIGENES[f.origen] || f.origen}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
