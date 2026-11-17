'use client'
import { parseDBTimestamp } from '@/lib/utils/date';

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { RegistroTrazabilidad } from '@/types/pintura'
import { Clock, ChevronDown, X } from 'lucide-react'

// Fecha y hora de cada proceso ya registrado de una pieza FV. En la franja se ve el último;
// si hay más de uno, "Traz. ▾" abre todos en orden con el usuario que lo registró, en una ventana centrada en la pantalla
// (como desplegable se cortaba en el celular).
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

export default function TrazabilidadPiezaFibra({ registro }: { registro: RegistroTrazabilidad }) {
    const [abierta, setAbierta] = useState(false)

    useEffect(() => {
        if (!abierta) return
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false) }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [abierta])

    const pasos = useMemo(() => PASOS
        .map(p => {
            const f = p.fecha(registro)
            const d = f ? parseDBTimestamp(f) : null
            return d && !isNaN(d.getTime()) ? { label: p.label, fecha: d, usuario: p.usuario?.(registro) } : null
        })
        .filter((p): p is { label: string; fecha: Date; usuario: string | undefined } => p !== null)
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime()), [registro])

    const ultimo = pasos[pasos.length - 1]

    return (
        <div className="flex items-center gap-2 min-w-0">
            <Clock size={16} className="text-[#7B8E90] shrink-0 hidden sm:block" />
            <div>
                <p className="text-[9px] sm:text-[10px] text-[#7B8E90] uppercase font-black leading-none whitespace-nowrap">{ultimo ? `Último proceso: ${ultimo.label}` : 'Trazabilidad'}</p>
                <p className="text-[11px] sm:text-xs font-bold text-[#324354] leading-tight mt-0.5 whitespace-nowrap">{ultimo ? formato(ultimo.fecha) : 'Sin registros'}</p>
            </div>
            {pasos.length > 1 && (
                <button
                    onClick={e => { e.stopPropagation(); setAbierta(true) }}
                    className="h-7 px-2 ml-1 shrink-0 whitespace-nowrap rounded-lg border border-[#e2ded5] bg-white hover:bg-[#F6F3EE] text-[11px] font-bold text-[#324354] flex items-center gap-1"
                    title="Ver la fecha y hora de cada proceso de la pieza"
                >
                    Traz. ({pasos.length})
                    <ChevronDown size={14} />
                </button>
            )}
            {abierta && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-3"
                    onMouseDown={e => { if (e.target === e.currentTarget) setAbierta(false) }} onClick={e => e.stopPropagation()}>
                <div className="w-full max-w-sm bg-white border-2 border-[#324354] rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#e2ded5]">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-[#7B8E90] leading-none">Trazabilidad</p>
                            <p className="text-sm font-black text-[#324354] truncate">OF {registro.orden_fabricacion} · Serial {registro.molde_serial}</p>
                        </div>
                        <button onClick={() => setAbierta(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 shrink-0" title="Cerrar"><X size={16} /></button>
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
                </div>
                </div>,
                document.body
            )}
        </div>
    )
}
