'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { FilaCierreSap, piezasRetiradasPorSap } from '@/lib/fibra/cierreSap'
import { parseDBTimestamp } from '@/lib/utils/date'

// Administración FV: piezas que salieron del proceso porque su OF se cerró en SAP (barrido automático de cada hora).
// Solo informa: quedaron en CEDI y el motivo está en la trazabilidad de cada pieza.
const DIAS = 15

export default function AvisoCierreSap() {
    const [filas, setFilas] = useState<FilaCierreSap[]>([])
    const [abierto, setAbierto] = useState(false)

    useEffect(() => { piezasRetiradasPorSap(DIAS).then(setFilas).catch(() => undefined) }, [])
    if (filas.length === 0) return null

    const ofs = new Set(filas.map(f => f.orden_fabricacion)).size
    return (
        <div className="px-2 sm:px-4 py-1.5 bg-rose-50 border-b border-rose-200 text-xs">
            <button type="button" onClick={() => setAbierto(a => !a)} className="max-w-7xl mx-auto w-full flex items-center gap-2 text-rose-800 font-bold text-left">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="flex-1">
                    {filas.length} pieza(s) de {ofs} OF cerradas en SAP salieron del proceso a CEDI en los últimos {DIAS} días
                </span>
                {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {abierto && (
                <div className="max-w-7xl mx-auto mt-1.5 max-h-56 overflow-y-auto bg-white rounded-lg border border-rose-200">
                    <table className="w-full text-[11px]">
                        <thead className="bg-[#324354] text-white sticky top-0">
                            <tr>
                                <th className="px-2 py-1 text-left">Fecha</th>
                                <th className="px-2 py-1 text-left">OF</th>
                                <th className="px-2 py-1 text-left">Molde</th>
                                <th className="px-2 py-1 text-left">Estaba en</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filas.map((f, i) => (
                                <tr key={`${f.registrer}-${i}`}>
                                    <td className="px-2 py-1 font-mono whitespace-nowrap">{parseDBTimestamp(f.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-2 py-1 font-bold text-[#324354]">{f.orden_fabricacion || '—'}</td>
                                    <td className="px-2 py-1">{f.molde_serial || 'Sin molde'}</td>
                                    <td className="px-2 py-1">{f.estado_antes === 'Empaque' ? 'Digitado' : f.estado_antes === 'Guacales' ? 'Huacales' : f.estado_antes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
