'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarEnsayoConDestino } from '@/lib/supabase/queries/fibra_ensayo'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import AccionesPiezaFibra from '../AccionesPiezaFibra'
import { FlaskConical, Wrench, Trash2 } from 'lucide-react'

interface RegistroEnsayoCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Misma tarjeta de Vaciado y Pulido: "Registrar Ensayo" (pasa a Guacales) y, desplegables, Reparación o Destrucción
export default function RegistroEnsayoCard({ registro, orden, moldes, usuarioEmail, onRefresh }: RegistroEnsayoCardProps) {
    const mover = (destino: 'Guacales' | 'Reparacion' | 'Destruccion') => () => registrarEnsayoConDestino(registro.registrer || '', usuarioEmail, destino)

    const acciones = (
        <AccionesPiezaFibra
            principal={{ id: 'Guacales', label: 'Registrar Ensayo', icon: FlaskConical, title: 'Registrar el ensayo y pasar la pieza a Guacales', accion: mover('Guacales') }}
            otras={[
                { id: 'Reparacion', label: 'Reparación', icon: Wrench, clase: 'text-orange-600 hover:bg-orange-50', accion: mover('Reparacion') },
                { id: 'Destruccion', label: 'Destrucción', icon: Trash2, clase: 'text-red-600 hover:bg-red-50', confirmar: '¿Está seguro de destruir?', accion: mover('Destruccion') }
            ]}
            onHecho={onRefresh}
            mensajeError="Hubo un error al registrar el ensayo."
        />
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-purple-50/40" />
}
