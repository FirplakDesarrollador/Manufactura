'use client'
import { parseDBTimestamp } from '@/lib/utils/date';

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RegistroTrazabilidad } from '@/types/pintura'
import { Clock, ChevronDown, X, AlertTriangle } from 'lucide-react'
import { cierreSapDePieza } from '@/lib/fibra/cierreSap'

// Fecha y hora de cada proceso ya registrado de una pieza FV. En la franja se ve por defecto el último proceso; si hay
// más de uno, ese mismo bloque (▾) despliega la lista de todos en orden con el usuario que lo registró. La lista se
// dibuja fija en la pantalla (portal) y se ajusta al borde, para que no quede cortada por la tarjeta ni en el celular.
const PASOS: { label: string; fecha: (r: RegistroTrazabilidad) => string | undefined; usuario?: (r: RegistroTrazabilidad) => string | undefined }[] = [
    { label: 'Pintura', fecha: r => r.pintura_fecha, usuario: r => r.pintura_user_name },
    { label: 'Contramolde', fecha: r => r.contramolde_fecha, usuario: r => r.contramolde_user_name },
    { label: 'Vaciado', fecha: r => r.vaciado_fecha || r.fecha_vaciado, usuario: r => r.vaciado_user_name },
    { label: 'Desmolde', fecha: r => r.desmolde_fecha },
    { label: 'Herrajes', fecha: r => r.herrajes_fecha, usuario: r => r.herrajes_user_name },
    { label: 'Pulido', fecha: r => r.pulido_fecha, usuario: r => r.pulido_user_name },
    // En la base, el ensayo queda en acabado_fecha
    { label: 'Ensayo', fecha: r => r.acabado_fecha, usuario: r => r.acabado_user_name },
    { label: 'Reparación', fecha: r => r.reparacion_fecha, usuario: r => r.reparacion_user_name },
    { label: 'Saldo', fecha: r => r.saldo_fecha, usuario: r => r.saldo_user_name },
    { label: 'Destrucción', fecha: r => r.destruccion_fecha, usuario: r => r.destruccion_user_name },
    { label: 'Huacal', fecha: r => r.empaque_fecha, usuario: r => r.empaque_user_name },
    { label: 'Digitado', fecha: r => r.digitado_fecha, usuario: r => r.digitado_user_name },
    { label: 'Tránsito', fecha: r => r.transito_fecha, usuario: r => r.transito_user_name },
    { label: 'CEDI', fecha: r => r.cedi_fecha, usuario: r => r.cedi_user_name }
]

const formato = (d: Date) => d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ANCHO_LISTA = 340

export default function TrazabilidadPiezaFibra({ registro }: { registro: RegistroTrazabilidad }) {
    // Posición de la lista desplegable (fija en la pantalla, para que nunca quede cortada por la tarjeta)
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
    const abierta = pos !== null
    const lista = useRef<HTMLDivElement>(null)
    const cerrar = () => setPos(null)
    // Si la pieza salió del proceso porque su OF se cerró en SAP, el motivo se muestra en la trazabilidad
    const [cierreSap, setCierreSap] = useState<{ fecha: string; motivo: string } | null>(null)
    useEffect(() => {
        if (!abierta || registro.of_pendiente !== false || registro.estado !== 'Cedi' || !registro.registrer) return
        let vivo = true
        cierreSapDePieza(registro.registrer).then(c => { if (vivo) setCierreSap(c) }).catch(() => undefined)
        return () => { vivo = false }
    }, [abierta, registro.of_pendiente, registro.estado, registro.registrer])

    useEffect(() => {
        if (!abierta) return
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
        // Al desplazar la pantalla se cierra (la lista quedaría flotando); desplazar dentro de la lista no la cierra
        const desplazar = (e: Event) => { if (!lista.current?.contains(e.target as Node)) cerrar() }
        window.addEventListener('keydown', tecla)
        window.addEventListener('scroll', desplazar, true)
        window.addEventListener('resize', cerrar)
        return () => {
            window.removeEventListener('keydown', tecla)
            window.removeEventListener('scroll', desplazar, true)
            window.removeEventListener('resize', cerrar)
        }
    }, [abierta])

    const abrir = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        if (abierta) { cerrar(); return }
        const r = e.currentTarget.getBoundingClientRect()
        const left = Math.max(8, Math.min(r.left, window.innerWidth - ANCHO_LISTA - 8))
        // Si abajo no cabe la lista, se abre hacia arriba
        setPos(window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom
            ? { bottom: window.innerHeight - r.top + 4, left }
            : { top: r.bottom + 4, left })
    }

    const pasos = useMemo(() => PASOS
        .map(p => {
            const f = p.fecha(registro)
            const d = f ? parseDBTimestamp(f) : null
            return d && !isNaN(d.getTime()) ? { label: p.label, fecha: d, usuario: p.usuario?.(registro) } : null
        })
        .filter((p): p is { label: string; fecha: Date; usuario: string | undefined } => p !== null)
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime()), [registro])

    const ultimo = pasos[pasos.length - 1]

    const resumen = (
        <>
            <Clock size={16} className="text-[#7B8E90] shrink-0 hidden sm:block" />
            <div className="text-left">
                <p className="text-[9px] sm:text-[10px] text-[#7B8E90] uppercase font-black leading-none whitespace-nowrap">{ultimo ? `Último proceso: ${ultimo.label}` : 'Trazabilidad'}</p>
                <p className="text-[11px] sm:text-xs font-bold text-[#324354] leading-tight mt-0.5 whitespace-nowrap">{ultimo ? formato(ultimo.fecha) : 'Sin registros'}</p>
            </div>
        </>
    )

    // Con un solo proceso no hay nada que desplegar; con más, el mismo bloque abre la lista de todos los procesos
    if (pasos.length <= 1) return <div className="flex items-center gap-2 min-w-0">{resumen}</div>

    return (
        <div className="min-w-0">
            <button type="button" onClick={abrir} aria-expanded={abierta}
                title={`Ver los ${pasos.length} procesos de la pieza con fecha, hora y usuario`}
                className={`flex items-center gap-2 min-w-0 rounded-lg px-2 py-1 -mx-2 -my-1 border transition-colors ${abierta ? 'bg-white border-[#e2ded5] shadow-sm' : 'border-transparent hover:bg-white hover:border-[#e2ded5]'}`}>
                {resumen}
                <ChevronDown size={14} className={`text-[#324354] shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`} />
            </button>
            {abierta && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150]" onMouseDown={e => { if (e.target === e.currentTarget) cerrar() }} onClick={e => e.stopPropagation()}>
                <div ref={lista} className="fixed bg-white border-2 border-[#324354] rounded-xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
                    style={{ top: pos?.top, bottom: pos?.bottom, left: pos?.left, width: `min(${ANCHO_LISTA}px, calc(100vw - 16px))` }}>
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#e2ded5]">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-[#7B8E90] leading-none">Trazabilidad · {pasos.length} procesos</p>
                            <p className="text-sm font-black text-[#324354] truncate">OF {registro.orden_fabricacion} · Molde {registro.molde_serial || '—'}</p>
                        </div>
                        <button onClick={cerrar} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 shrink-0" title="Cerrar"><X size={16} /></button>
                    </div>
                    <table className="w-full text-[11px]">
                        <thead className="bg-[#324354] text-white">
                            <tr>
                                <th className="px-2 py-1.5 text-left font-bold">Proceso</th>
                                <th className="px-2 py-1.5 text-left font-bold">Fecha y hora</th>
                                <th className="px-2 py-1.5 text-left font-bold">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pasos.map(p => (
                                <tr key={p.label} className={p === ultimo ? 'bg-[#F6F3EE]' : ''}>
                                    <td className="px-2 py-1 font-bold text-[#324354]">{p.label}</td>
                                    <td className="px-2 py-1 font-mono whitespace-nowrap">{formato(p.fecha)}</td>
                                    <td className="px-2 py-1 text-slate-600 truncate max-w-[110px]" title={p.usuario || ''}>{p.usuario || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {cierreSap && (
                        <div className="px-3 py-2 border-t border-rose-200 bg-rose-50 text-[11px] text-rose-800 flex items-start gap-1.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            <span><b>{cierreSap.motivo}</b> · {formato(parseDBTimestamp(cierreSap.fecha))} · Sistema SAP</span>
                        </div>
                    )}
                </div>
                </div>,
                document.body
            )}
        </div>
    )
}
