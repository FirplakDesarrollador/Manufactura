'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarAccionReparacion } from '@/lib/supabase/queries/fibra_reparacion'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import AccionesPiezaFibra, { AccionPieza } from '../AccionesPiezaFibra'
import { Wrench, Trash2, CircleDollarSign, PackageCheck, RotateCcw } from 'lucide-react'

interface RegistroReparacionCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Misma tarjeta de los demás módulos de piso FV. El botón principal y las otras opciones dependen de dónde está la pieza
// (los mismos destinos que antes ofrecía la lista desplegable de cada pestaña)
export default function RegistroReparacionCard({ registro, orden, moldes, usuarioEmail, onRefresh }: RegistroReparacionCardProps) {
    const mover = (estado: string) => () => registrarAccionReparacion(registro.registrer || '', usuarioEmail, estado)
    const destruir: AccionPieza = { id: 'Destruccion', label: 'Destrucción', icon: Trash2, clase: 'text-red-600 hover:bg-red-50', confirmar: '¿Está seguro de destruir?', accion: mover('Destruccion') }

    let principal: AccionPieza
    let otras: AccionPieza[]
    let franja: string
    if (registro.estado === 'Saldo') {
        principal = { id: 'Guacales', label: 'Liberar a Guacales', icon: PackageCheck, title: 'Pasar el saldo a Guacales', accion: mover('Guacales') }
        otras = [{ id: 'Reparacion', label: 'Volver a Reparación', icon: Wrench, clase: 'text-orange-600 hover:bg-orange-50', accion: mover('Reparacion') }, destruir]
        franja = 'bg-amber-50/40'
    } else if (registro.estado === 'Destruccion') {
        principal = { id: 'Saldo', label: 'Recuperar como Saldo', icon: CircleDollarSign, title: 'Recuperar la pieza como saldo', accion: mover('Saldo') }
        otras = [{ id: 'Reparacion', label: 'Intentar Reparación', icon: RotateCcw, clase: 'text-orange-600 hover:bg-orange-50', accion: mover('Reparacion') }]
        franja = 'bg-red-50/40'
    } else {
        // Reparación (y reparación larga): el paso normal es volver a Ensayo
        principal = { id: 'Ensayo', label: 'Registrar Reparación', icon: Wrench, title: 'Registrar la reparación y liberar la pieza a Ensayo', accion: mover('Ensayo') }
        otras = [{ id: 'Saldo', label: 'Mover a Saldo', icon: CircleDollarSign, clase: 'text-amber-600 hover:bg-amber-50', accion: mover('Saldo') }, destruir]
        franja = 'bg-orange-50/40'
    }

    const acciones = <AccionesPiezaFibra principal={principal} otras={otras} onHecho={onRefresh} />

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja={franja} />
}
