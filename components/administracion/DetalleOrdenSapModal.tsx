'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, Boxes, MessageSquareText, ArrowRightLeft, FileImage, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'

// Detalle de una orden de fabricación consultado en SAP (misma ruta que Consulta SAP).
// Lo que SAP no entregue llega en `faltantes` y se muestra como error, nunca con valores por defecto.
type ComponenteSap = {
    id: number
    tipo: string
    no: string
    descripcion: string
    cantBase: number | string
    cantRequerida: number | string
    consumido: number | string
    unidadMedida: string
    almacen: string
    metodoEmision: string
}

type OrdenSap = {
    noOrden: string
    estado: string
    tipo: string
    noProducto: string
    descripcionProducto: string
    cantPlanificada: number | string
    cantCompletada: number
    almacen: string
    fechaInicio: string
    fechaFinalizacion: string
    pedidoVinculado: string
    comentarios: string
    componentes: ComponenteSap[]
    faltantes: string[]
}

type Pestana = 'ldm' | 'comentarios' | 'traslados' | 'planos'

const PESTANAS: { id: Pestana; label: string; icon: React.ElementType; pronto?: boolean }[] = [
    { id: 'ldm', label: 'Lista de materiales', icon: Boxes },
    { id: 'comentarios', label: 'Comentarios', icon: MessageSquareText },
    { id: 'traslados', label: 'Traslados', icon: ArrowRightLeft, pronto: true },
    { id: 'planos', label: 'Planos', icon: FileImage, pronto: true }
]

const num = (v: number | string) => {
    const n = Number(v)
    return Number.isFinite(n) && v !== '' ? n.toLocaleString('es-CO', { maximumFractionDigits: 4 }) : String(v ?? '')
}

export default function DetalleOrdenSapModal({ ordenFabricacion, onClose }: { ordenFabricacion: string | number; onClose: () => void }) {
    const [pestana, setPestana] = useState<Pestana>('ldm')
    const [orden, setOrden] = useState<OrdenSap | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cargando, setCargando] = useState(true)
    const [recarga, setRecarga] = useState(0)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    useEffect(() => {
        let vigente = true
        setCargando(true)
        setError(null)
        setOrden(null)
        const docNum = String(ordenFabricacion ?? '').trim()
        if (!/^\d+$/.test(docNum)) {
            setError(`La orden "${docNum}" no es un número de orden de SAP válido`)
            setCargando(false)
            return
        }
        fetch(`/api/sap/production-orders/${docNum}`)
            .then(async r => {
                const data = await r.json().catch(() => ({}))
                if (!vigente) return
                if (!r.ok) setError(data.error || `Error al consultar SAP (${r.status})`)
                else setOrden(data)
            })
            .catch(() => { if (vigente) setError('Error de conexión con SAP') })
            .finally(() => { if (vigente) setCargando(false) })
        return () => { vigente = false }
    }, [ordenFabricacion, recarga])

    const articulos = useMemo(() => (orden?.componentes || []), [orden])

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl min-h-[80vh] max-h-[94vh] overflow-y-auto flex flex-col gap-3">
                {/* Encabezado */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">Detalle de la orden · SAP</span>
                        <h2 className="text-xl font-black text-[#324354] mt-2">OF {ordenFabricacion}</h2>
                        {orden && (
                            <p className="text-sm font-bold text-slate-700 break-words">{orden.noProducto} · {orden.descripcionProducto}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setRecarga(n => n + 1)} disabled={cargando}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} /> Consultar de nuevo
                        </button>
                        <button onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-[#324354] text-white hover:bg-[#254153]">
                            <X className="w-3.5 h-3.5" /> Cerrar
                        </button>
                    </div>
                </div>

                {/* Datos generales */}
                {orden && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {[
                            ['Estado', orden.estado],
                            ['Tipo', orden.tipo],
                            ['Cant. planificada', num(orden.cantPlanificada)],
                            ['Cant. completada', num(orden.cantCompletada)],
                            ['Almacén', orden.almacen],
                            ['Inicio / Fin', `${orden.fechaInicio} – ${orden.fechaFinalizacion}`],
                            ['Pedido vinculado', orden.pedidoVinculado || '—']
                        ].map(([label, valor]) => (
                            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
                                <div className="text-[10px] font-black uppercase text-slate-500">{label}</div>
                                <div className={`text-sm font-black truncate ${label === 'Estado' && valor === 'Cancelado' ? 'text-red-600' : 'text-[#324354]'}`} title={String(valor)}>{valor}</div>
                            </div>
                        ))}
                    </div>
                )}

                {orden && orden.faltantes?.length > 0 && (
                    <div className="px-3 py-2 bg-red-50 border border-red-400 text-red-800 text-xs font-semibold rounded-lg flex items-start gap-2" role="alert">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>SAP no entregó o no se reconoce: {orden.faltantes.join(' · ')}. Verifique en SAP antes de usar estos datos.</span>
                    </div>
                )}

                {/* Pestañas */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-[#e2ded5] pb-2">
                    {PESTANAS.map(p => {
                        const Icono = p.icon
                        const activa = pestana === p.id
                        return (
                            <button key={p.id} onClick={() => !p.pronto && setPestana(p.id)} disabled={p.pronto}
                                title={p.pronto ? 'Disponible pronto' : p.label}
                                className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${activa ? 'bg-[#324354] text-white shadow-md' : p.pronto ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                <Icono size={14} /> <span>{p.label}{p.pronto ? ' · pronto' : ''}</span>
                                {p.id === 'ldm' && orden && <span className={`ml-1 px-1.5 rounded text-[10px] ${activa ? 'bg-white/20' : 'bg-slate-200'}`}>{articulos.length}</span>}
                            </button>
                        )
                    })}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-h-0">
                    {cargando ? (
                        <div className="h-full min-h-[200px] flex items-center justify-center gap-2 text-slate-500 font-bold text-sm">
                            <Loader2 className="w-5 h-5 animate-spin" /> Consultando la orden en SAP...
                        </div>
                    ) : error ? (
                        <div className="px-4 py-6 bg-red-50 border border-red-400 text-red-800 text-sm font-bold rounded-xl flex items-center gap-2" role="alert">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" /> {error}
                        </div>
                    ) : orden && pestana === 'ldm' ? (
                        articulos.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-bold italic bg-slate-50 rounded-xl border border-slate-200">SAP no devolvió componentes para esta orden</div>
                        ) : (
                            <div className="overflow-auto rounded-xl border border-slate-200">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 bg-[#324354] text-white">
                                        <tr className="text-[10px] uppercase tracking-wider">
                                            <th className="px-2 py-2 text-center">#</th>
                                            <th className="px-2 py-2 text-left">Tipo</th>
                                            <th className="px-2 py-2 text-left">Nº artículo</th>
                                            <th className="px-2 py-2 text-left">Descripción</th>
                                            <th className="px-2 py-2 text-right">Cant. base</th>
                                            <th className="px-2 py-2 text-right">Cant. requerida</th>
                                            <th className="px-2 py-2 text-right">Consumido</th>
                                            <th className="px-2 py-2 text-right">Pendiente</th>
                                            <th className="px-2 py-2 text-center">UM</th>
                                            <th className="px-2 py-2 text-center">Almacén</th>
                                            <th className="px-2 py-2 text-left">Emisión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {articulos.map(c => {
                                            const req = Number(c.cantRequerida), cons = Number(c.consumido)
                                            const pendiente = Number.isFinite(req) && Number.isFinite(cons) && c.cantRequerida !== '' && c.consumido !== '' ? req - cons : null
                                            return (
                                                <tr key={c.id} className="hover:bg-slate-50">
                                                    <td className="px-2 py-1.5 text-center text-slate-400 font-bold">{c.id}</td>
                                                    <td className="px-2 py-1.5 text-slate-600">{c.tipo}</td>
                                                    <td className="px-2 py-1.5 font-mono font-bold text-[#324354] whitespace-nowrap select-text">{c.no}</td>
                                                    <td className="px-2 py-1.5 font-semibold text-slate-800 select-text">{c.descripcion}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono">{num(c.cantBase)}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono font-bold">{num(c.cantRequerida)}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono">{num(c.consumido)}</td>
                                                    <td className={`px-2 py-1.5 text-right font-mono font-bold ${pendiente != null && pendiente > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{pendiente != null ? num(pendiente) : ''}</td>
                                                    <td className="px-2 py-1.5 text-center">{c.unidadMedida}</td>
                                                    <td className="px-2 py-1.5 text-center font-mono">{c.almacen}</td>
                                                    <td className="px-2 py-1.5 text-slate-600">{c.metodoEmision}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : orden && pestana === 'comentarios' ? (
                        <div className="p-4 bg-[#F6F3EE] border border-[#e2ded5] rounded-xl text-sm text-slate-800 whitespace-pre-wrap select-text min-h-[120px]">
                            {orden.comentarios || <span className="italic text-slate-400">La orden no tiene comentarios en SAP</span>}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
