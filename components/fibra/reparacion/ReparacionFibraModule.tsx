'use client'

import React, { useCallback, useState } from 'react'
import { getRegistrosReparacion, ReparacionTab } from '@/lib/supabase/queries/fibra_reparacion'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import RegistroReparacionCard from './RegistroReparacionCard'
import { Wrench, CircleDollarSign, Trash2 } from 'lucide-react'

const PESTANAS: { id: ReparacionTab; label: string; icon: React.ElementType; lista: string }[] = [
    { id: 'Reparacion', label: 'Reparación', icon: Wrench, lista: 'Piezas en reparación' },
    { id: 'Saldo', label: 'Saldo', icon: CircleDollarSign, lista: 'Piezas en saldo' },
    { id: 'Destruccion', label: 'Destrucción', icon: Trash2, lista: 'Piezas en destrucción' }
]

export default function ReparacionFibraModule({ userEmail }: { userEmail: string }) {
    const [activeTab, setActiveTab] = useState<ReparacionTab>('Reparacion')
    const cargarPiezas = useCallback(() => getRegistrosReparacion(activeTab), [activeTab])
    const pestana = PESTANAS.find(p => p.id === activeTab)!

    return (
        <ModuloPiezasFibra
            cargarPiezas={cargarPiezas}
            tituloLista={pestana.lista}
            sinPiezas={`No hay ${pestana.lista.toLowerCase()}`}
            renderPieza={p => <RegistroReparacionCard {...p} usuarioEmail={userEmail} />}
            extra={
                <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {PESTANAS.map(t => {
                        const Icono = t.icon
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === t.id ? 'bg-[#254153] text-white' : 'text-slate-500 hover:text-[#254153]'}`}
                            >
                                <Icono size={14} />
                                {t.label}
                            </button>
                        )
                    })}
                </div>
            }
        />
    )
}
