'use client'

import React, { useState } from 'react'
import { getRegistrosParaDigitado } from '@/lib/supabase/queries/fibra_digitado'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import PiezaDigitadoCard from './PiezaDigitadoCard'
import DigitadoLoteFibra from './DigitadoLoteFibra'
import { Keyboard, Layers } from 'lucide-react'

// Digitado: por pieza (misma vista de los demás módulos, piezas en guacal) o en lote por orden (vista anterior)
export default function DigitadoFibraModule({ userEmail }: { userEmail: string }) {
    const [vista, setVista] = useState<'pieza' | 'lote'>('pieza')

    const pestanas = (
        <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {([['pieza', 'Por pieza', Keyboard], ['lote', 'En lote por orden', Layers]] as const).map(([id, label, Icono]) => (
                <button
                    key={id}
                    onClick={() => setVista(id)}
                    className={`flex items-center gap-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${vista === id ? 'bg-[#254153] text-white' : 'text-slate-500 hover:text-[#254153]'}`}
                >
                    <Icono size={14} />
                    {label}
                </button>
            ))}
        </div>
    )

    if (vista === 'lote') return <DigitadoLoteFibra userEmail={userEmail} extra={pestanas} />

    return (
        <ModuloPiezasFibra
            cargarPiezas={getRegistrosParaDigitado}
            tituloLista="Piezas pendientes de digitar"
            sinPiezas="No hay piezas en guacal pendientes de digitar"
            renderPieza={p => <PiezaDigitadoCard {...p} usuarioEmail={userEmail} />}
            extra={pestanas}
        />
    )
}
