'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightLeft, ChevronDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { OrdenMueble } from '@/types/muebles'
import { supabase } from '@/lib/supabase'
import { tipoDeSku, tipoSemi } from '@/lib/semielaborados/datos'

// Administración Muebles / CEFI: mover unidades de la OF entre procesos, HACIA ADELANTE o HACIA ATRÁS (devolución),
// por cantidades (como se lleva Muebles). Se elige Desde (proceso con unidades), Hasta y Cantidad.
//  - Adelante: +cantidad en cada proceso después del origen hasta el destino (como si los operarios lo pasaran).
//  - Atrás: −cantidad en cada proceso después del destino hasta el origen (se deshace; queda en la trazabilidad).
// Así las cuentas de cada proceso (query_of_muebles) cuadran solas. Cada registro queda con el usuario que movió.
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

type Props = { orden: OrdenMueble; planta: string; usuarioNombre: string; userEmail: string; onHecho: () => void
    /** Semielaborados: Programado → Corte → Digitado → Tránsito → Almacén (el campo cedi trae Almacén) */
    variante?: 'semielaborados' }

const FLUJO_SEMIELABORADOS = ['programado', 'corte', 'digitado', 'transito', 'cedi']

// Panel: dónde está cada unidad, destino, cantidad y botón Mover
export default function MoverOfMuebles({ orden, planta, usuarioNombre, userEmail, onHecho, variante }: Props) {
    const esCefi = (planta || orden.planta || '').toLowerCase().includes('cefi')
    // CEFI no usa Empaque
    const flujo = useMemo(() => variante === 'semielaborados'
        // Nombres del tipo de semielaborado (Cajas: Corte/Almacén; Herrajes FV: Herrajes/Almacén; Kits motobomba: Ensamble/CEDI)
        ? FLUJO.filter(e => FLUJO_SEMIELABORADOS.includes(e.id)).map(e => {
            const n = tipoSemi(tipoDeSku(orden.producto_sku)).procesos
            return e.id === 'corte' ? { ...e, label: n.Corte } : e.id === 'cedi' ? { ...e, label: n.Almacen } : e
        })
        : FLUJO.filter(e => !(esCefi && e.id === 'empaque')), [esCefi, variante, orden.producto_sku])
    const cant = (e: Etapa) => Math.max(0, Number(orden[e.campo]) || 0)

    // Desde: por defecto el proceso más avanzado (sin contar CEDI) que tenga unidades; Hasta: el siguiente
    const desdeInicial = useMemo(() => {
        for (let i = flujo.length - 2; i >= 0; i--) if (cant(flujo[i]) > 0) return flujo[i].id
        return flujo.find(e => cant(e) > 0)?.id || 'programado'
    }, [flujo, orden])
    const [desde, setDesde] = useState(desdeInicial)
    const iDesde = flujo.findIndex(e => e.id === desde)
    const [hasta, setHasta] = useState(() => flujo[Math.min(flujo.length - 1, Math.max(0, flujo.findIndex(e => e.id === desdeInicial)) + 1)]?.id || 'digitado')
    const iHasta = flujo.findIndex(e => e.id === hasta)
    const maximo = iDesde >= 0 ? cant(flujo[iDesde]) : 0
    const [cantidad, setCantidad] = useState<number>(maximo)
    useEffect(() => { setCantidad(maximo) }, [maximo])
    const aMover = Math.min(Math.max(0, Math.floor(cantidad || 0)), maximo)
    const haciaAtras = iHasta < iDesde
    const [moviendo, setMoviendo] = useState(false)

    const mover = async () => {
        if (iDesde < 0 || iHasta < 0 || iDesde === iHasta || aMover <= 0) return
        const textoDir = haciaAtras ? 'devolver' : 'pasar'
        if (!confirm(`¿${textoDir === 'devolver' ? 'Devolver' : 'Pasar'} ${aMover} unidad(es) de la OF ${orden.orden_fabricacion} de ${flujo[iDesde].label} a ${flujo[iHasta].label}?`)) return
        setMoviendo(true)
        try {
            // Hacia adelante: +cantidad en cada proceso después del origen hasta el destino (como si lo pasaran los operarios).
            // Hacia atrás: −cantidad en cada proceso después del destino hasta el origen (se deshace ese paso; queda en el historial).
            const ahora = new Date().toISOString()
            const [de, a] = haciaAtras ? [iHasta + 1, iDesde] : [iDesde + 1, iHasta]
            const filas = []
            for (let k = de; k <= a; k++) {
                filas.push({
                    orden_fabricacion: String(orden.orden_fabricacion), cantidad: haciaAtras ? -aMover : aMover,
                    creado_por: userEmail || usuarioNombre, proceso: flujo[k].proceso,
                    cedula_operario: haciaAtras ? 'ADMIN_DEVOLVER' : 'ADMIN_MOVER',
                    nombre_operario: `Administración: ${usuarioNombre}${haciaAtras ? ' (devolución)' : ''}`,
                    fecha_inicio: ahora, taladro: 'NO APLICA', created_at: ahora,
                })
            }
            const { error } = await supabase.from('trazabilidad_muebles').insert(filas)
            if (error) throw error
            toast.success(`OF ${orden.orden_fabricacion}: ${aMover} unidad(es) ${haciaAtras ? 'devueltas' : 'pasaron'} de ${flujo[iDesde].label} a ${flujo[iHasta].label}`)
            onHecho()
        } catch (e: any) {
            toast.error(`No se movió la OF: ${e?.message || e}`)
        } finally {
            setMoviendo(false)
        }
    }

    const aviso = iDesde === iHasta ? 'Elija un proceso de destino distinto al de origen.'
        : maximo <= 0 ? `No hay unidades en ${flujo[iDesde]?.label} para mover.`
            : haciaAtras ? `Devolución: se descuentan ${aMover} unidad(es) de los procesos entre ${flujo[iHasta]?.label} y ${flujo[iDesde]?.label} (queda en la trazabilidad a su nombre).`
                : `Las unidades quedan registradas en cada proceso intermedio hasta ${flujo[iHasta]?.label}, a su nombre.`

    return (
        <div className="rounded-xl border border-[#e2ded5] bg-[#F6F3EE] p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#254153]">
                <ArrowRightLeft size={14} /> Mover OF entre procesos
            </div>
            {/* Dónde está hoy cada unidad: tocar un proceso con unidades lo elige como origen */}
            <div className="flex flex-wrap gap-1">
                {flujo.map(e => (
                    <button key={e.id} type="button" disabled={cant(e) <= 0} onClick={() => setDesde(e.id)} title={cant(e) > 0 ? 'Mover desde aquí' : undefined}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${e.id === desde ? 'ring-2 ring-[#deb841] ' : ''}${cant(e) > 0 ? 'bg-[#254153] text-white border-[#254153]' : 'bg-white text-slate-400 border-slate-200 cursor-default'}`}>
                        {e.label} {cant(e)}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_96px_auto] gap-2 items-end">
                <label>
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Desde</span>
                    <select value={desde} onChange={e => setDesde(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm font-bold text-[#254153]">
                        {flujo.map(e => <option key={e.id} value={e.id} disabled={cant(e) <= 0}>{e.label} ({cant(e)})</option>)}
                    </select>
                </label>
                <label>
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Hasta</span>
                    <select value={hasta} onChange={e => setHasta(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm font-bold text-[#254153]">
                        {flujo.map((e, i) => <option key={e.id} value={e.id} disabled={i === iDesde}>{i < iDesde ? '← ' : ''}{e.label}</option>)}
                    </select>
                </label>
                <label>
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Cant. (máx. {maximo})</span>
                    <input type="number" min={1} max={maximo} value={cantidad} disabled={maximo <= 0}
                        onChange={e => setCantidad(Number(e.target.value))}
                        className="w-full h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm font-black text-[#254153] text-center disabled:opacity-50" />
                </label>
                <button type="button" onClick={mover} disabled={moviendo || aMover <= 0 || iDesde === iHasta}
                    className={`h-9 px-4 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 ${haciaAtras ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#254153] hover:bg-[#1a3040]'}`}>
                    {moviendo ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                    {haciaAtras ? 'Devolver' : 'Mover'}
                </button>
            </div>
            <p className={`text-[10px] ${haciaAtras && maximo > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>{aviso}</p>
        </div>
    )
}

// Botón "Mover OF" de la franja de la tarjeta (como en Fibra): abre el panel en una ventana pequeña
export function BotonMoverOfMuebles(props: Props) {
    const [abierto, setAbierto] = useState(false)
    return (
        <>
            <button type="button" onClick={() => setAbierto(true)}
                className="h-9 px-4 rounded-lg bg-[#254153] hover:bg-[#1a3040] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <ArrowRightLeft size={16} /> Mover OF <ChevronDown size={14} />
            </button>
            {abierto && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3"
                    onMouseDown={e => { if (e.target === e.currentTarget) setAbierto(false) }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-lg font-black text-[#254153]">OF {props.orden.orden_fabricacion}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase truncate">{props.orden.producto_descripcion}</p>
                            </div>
                            <button type="button" onClick={() => setAbierto(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" title="Cerrar"><X size={20} /></button>
                        </div>
                        <MoverOfMuebles {...props} onHecho={() => { setAbierto(false); props.onHecho() }} />
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
