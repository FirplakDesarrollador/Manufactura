'use client'
import { parseDBTimestamp } from '@/lib/utils/date';

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RegistroTrazabilidad } from '@/types/pintura'
import { Clock, ChevronDown } from 'lucide-react'

// Fecha y hora de cada proceso ya registrado de una pieza FV. En la franja se ve el último;
// si hay más de uno, "Trazabilidad ▾" despliega todos en orden con el usuario que lo registró.
const PASOS: { label: string; fecha: (r: RegistroTrazabilidad) => string | undefined; usuario?: (r: RegistroTrazabilidad) => string | undefined }[] = [
    { label: 'Pintura', fecha: r => r.pintura_fecha, usuario: r => r.pintura_user_name },
    { label: 'Contramolde', fecha: r => r.contramolde_fecha, usuario: r => r.contramolde_user_name },
    { label: 'Vaciado', fecha: r => r.vaciado_fecha || r.fecha_vaciado, usuario: r => r.vaciado_user_name },
    { label: 'Desmolde', fecha: r => r.desmolde_fecha },
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
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!abierta) return
        const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierta(false) }
        document.addEventListener('mousedown', cerrar)
        return () => document.removeEventListener('mousedown', cerrar)
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
        <div ref={ref} className="relative flex items-center gap-2">
            <Clock size={16} className="text-amber-600 shrink-0" />
            <div>
                <p className="text-[10px] text-gray-500 uppercase font-black leading-none">{ultimo ? `Último proceso: ${ultimo.label}` : 'Trazabilidad'}</p>
                <p className="text-xs font-bold text-gray-900 leading-tight mt-0.5">{ultimo ? formato(ultimo.fecha) : 'Sin registros'}</p>
            </div>
            {pasos.length > 1 && (
                <button
                    onClick={() => setAbierta(v => !v)}
                    className="h-7 px-2 ml-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1"
                    title="Ver la fecha y hora de cada proceso de la pieza"
                >
                    Trazabilidad ({pasos.length})
                    <ChevronDown size={14} className={`transition-transform ${abierta ? 'rotate-180' : ''}`} />
                </button>
            )}
            {abierta && (
                <div className="absolute left-0 top-full mt-1 z-20 w-80 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
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
                                <tr key={p.label} className={p === ultimo ? 'bg-amber-50' : ''}>
                                    <td className="px-2 py-1 font-bold text-[#324354]">{p.label}</td>
                                    <td className="px-2 py-1 font-mono whitespace-nowrap">{formato(p.fecha)}</td>
                                    <td className="px-2 py-1 text-slate-600 truncate max-w-[110px]" title={p.usuario || ''}>{p.usuario || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
