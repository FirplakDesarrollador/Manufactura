'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

// Botones de una pieza en los módulos de piso FV: el botón principal "Registrar <proceso>" y, si hay más
// destinos, "Otras opciones ▾". Las opciones con `confirmar` piden confirmación antes de registrar.
export type AccionPieza = {
    id: string
    label: string
    icon: React.ElementType
    title?: string
    clase?: string       // colores de la opción dentro del menú
    confirmar?: string   // texto del botón de confirmación (p. ej. "¿Está seguro de destruir?")
    accion: () => Promise<unknown>
}

interface AccionesPiezaFibraProps {
    principal: AccionPieza
    otras?: AccionPieza[]
    onHecho: () => void
    mensajeError?: string
}

export default function AccionesPiezaFibra({ principal, otras = [], onHecho, mensajeError = 'Hubo un error al registrar el movimiento.' }: AccionesPiezaFibraProps) {
    const [enviando, setEnviando] = useState<string | null>(null)
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [confirmando, setConfirmando] = useState<AccionPieza | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuAbierto) return
        const cerrar = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuAbierto(false) }
        document.addEventListener('mousedown', cerrar)
        return () => document.removeEventListener('mousedown', cerrar)
    }, [menuAbierto])

    const ejecutar = async (a: AccionPieza) => {
        setMenuAbierto(false)
        setEnviando(a.id)
        try {
            await a.accion()
            onHecho()
        } catch (error) {
            console.error('Error:', error)
            alert(mensajeError)
        } finally {
            setEnviando(null)
            setConfirmando(null)
        }
    }

    const elegir = (a: AccionPieza) => (a.confirmar ? (setMenuAbierto(false), setConfirmando(a)) : ejecutar(a))
    const spinner = <div className="animate-spin rounded-full h-4 w-4 border-2 border-current/30 border-t-current" />

    if (confirmando) {
        const Icono = confirmando.icon
        return (
            <>
                <button
                    onClick={() => ejecutar(confirmando)}
                    disabled={!!enviando}
                    className="h-11 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    {enviando ? spinner : <Icono size={16} />}
                    {confirmando.confirmar}
                </button>
                <button
                    onClick={() => setConfirmando(null)}
                    disabled={!!enviando}
                    className="h-11 px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                    <X size={14} />
                    Cancelar
                </button>
            </>
        )
    }

    const IconoPrincipal = principal.icon
    return (
        <>
            <button
                onClick={() => elegir(principal)}
                disabled={!!enviando}
                title={principal.title}
                className="h-11 px-4 bg-[#254153] hover:bg-[#1a2e3b] text-white border border-[#254153] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
                {enviando === principal.id ? spinner : <IconoPrincipal size={16} />}
                {principal.label}
            </button>
            {otras.length > 0 && (
                <div ref={menuRef} className="relative">
                    <button
                        onClick={() => setMenuAbierto(v => !v)}
                        disabled={!!enviando}
                        className="h-11 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        {enviando && enviando !== principal.id ? spinner : null}
                        Otras opciones
                        <ChevronDown size={15} className={`transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
                    </button>
                    {menuAbierto && (
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[11rem] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden divide-y divide-slate-100">
                            {otras.map(a => {
                                const Icono = a.icon
                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => elegir(a)}
                                        title={a.title}
                                        className={`w-full px-3 py-2 text-left text-sm font-bold flex items-center gap-2 whitespace-nowrap ${a.clase || 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <Icono size={15} /> {a.label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
