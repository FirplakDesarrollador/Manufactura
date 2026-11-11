'use client'

import React, { useState } from 'react'
import { Nut } from 'lucide-react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { getRegistrosParaHerrajes, registrarHerrajes } from '@/lib/supabase/queries/fibra_herrajes'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'

// Instalación Herrajes: punto de notificación entre Vaciado y Pulido (un solo botón: Registrar Herrajes)
function RegistroHerrajesCard({ registro, orden, moldes, usuarioEmail, onRefresh }: {
    registro: RegistroTrazabilidad; orden?: OrdenFabricacion; moldes: Molde[]; usuarioEmail: string; onRefresh: () => void
}) {
    const [enviando, setEnviando] = useState(false)

    const registrar = async () => {
        setEnviando(true)
        try {
            await registrarHerrajes(registro.registrer || '', usuarioEmail)
            onRefresh()
        } catch (error) {
            console.error('Error:', error)
            alert(error instanceof Error ? error.message : 'Hubo un error al registrar herrajes.')
        } finally {
            setEnviando(false)
        }
    }

    const acciones = (
        <button onClick={registrar} disabled={enviando}
            title="Registrar la instalación de herrajes: la pieza pasa a Pulido y su molde queda libre"
            className="h-11 px-4 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 bg-[#254153] hover:bg-[#1a2e3b] text-white border-[#254153]">
            {enviando ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current/30 border-t-current" /> : <Nut size={16} />}
            Registrar Herrajes
        </button>
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-amber-50/40" />
}

export default function HerrajesFibraModule({ userEmail }: { userEmail: string }) {
    return (
        <ModuloPiezasFibra
            cargarPiezas={getRegistrosParaHerrajes}
            tituloLista="Piezas pendientes de instalación de herrajes"
            sinPiezas="No hay piezas pendientes de herrajes"
            renderPieza={p => <RegistroHerrajesCard {...p} usuarioEmail={userEmail} />}
        />
    )
}
