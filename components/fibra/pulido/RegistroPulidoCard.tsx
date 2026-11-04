'use client'

import React, { useState } from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarPulido } from '@/lib/supabase/queries/fibra_pulido'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import { Trash2, X } from 'lucide-react'

interface RegistroPulidoCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Ícono de pulido: disco de corte (el mismo del menú de módulos FV)
const DiscoCorte = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 3v3.5M21 12h-3.5M12 21v-3.5M3 12h3.5M18.4 5.6l-2.5 2.5M18.4 18.4l-2.5-2.5M5.6 18.4l2.5-2.5M5.6 5.6l2.5 2.5" />
    </svg>
)

// Destinos de la pieza al terminar el pulido (antes lista desplegable + "Mover"). Reparación se decide en Ensayo, no aquí
const DESTINOS = [
    { estado: 'Ensayo', label: 'Registrar Pulido', nota: undefined, destino: 'Ensayo', icon: DiscoCorte, clase: 'bg-[#254153] hover:bg-[#1a2e3b] text-white border-[#254153]' },
    { estado: 'Destruccion', label: 'Destrucción', nota: undefined, destino: 'Destrucción', icon: Trash2, clase: 'bg-white hover:bg-red-50 text-red-600 border-red-200' }
] as const

// Misma tarjeta de Vaciado: orden (OrdenCard) + franja de la pieza con los destinos como botones
export default function RegistroPulidoCard({ registro, orden, moldes, usuarioEmail, onRefresh }: RegistroPulidoCardProps) {
    const [enviando, setEnviando] = useState<string | null>(null)
    const [confirmandoDestruccion, setConfirmandoDestruccion] = useState(false)

    const mover = async (estado: string) => {
        setEnviando(estado)
        try {
            await registrarPulido(registro.registrer || '', usuarioEmail, estado)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un error al registrar el movimiento.')
        } finally {
            setEnviando(null)
            setConfirmandoDestruccion(false)
        }
    }

    const spinner = <div className="animate-spin rounded-full h-4 w-4 border-2 border-current/30 border-t-current" />

    const acciones = (
        <>
        {confirmandoDestruccion ? (
            <>
                <button
                    onClick={() => mover('Destruccion')}
                    disabled={!!enviando}
                    className="h-11 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    {enviando ? spinner : <Trash2 size={16} />}
                    ¿Está seguro de destruir?
                </button>
                <button
                    onClick={() => setConfirmandoDestruccion(false)}
                    disabled={!!enviando}
                    className="h-11 px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                    <X size={14} />
                    Cancelar
                </button>
            </>
        ) : (
            DESTINOS.map(d => {
                const Icono = d.icon
                return (
                    <button
                        key={d.estado}
                        onClick={() => (d.estado === 'Destruccion' ? setConfirmandoDestruccion(true) : mover(d.estado))}
                        disabled={!!enviando}
                        title={`Mover la pieza a ${d.destino}`}
                        className={`h-11 px-4 rounded-lg border font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-50 ${d.clase}`}
                    >
                        {/* La nota va en un segundo renglón, del ancho del ícono y la palabra */}
                        <span className="inline-grid w-min">
                            <span className="flex items-center gap-2 whitespace-nowrap">
                                {enviando === d.estado ? spinner : <Icono size={16} />}
                                {d.label}
                            </span>
                            {d.nota && <span className="text-[8px] font-semibold leading-tight opacity-80 text-center whitespace-nowrap tracking-tight">{d.nota}</span>}
                        </span>
                    </button>
                )
            })
        )}
        </>
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-cyan-50/40" />
}
