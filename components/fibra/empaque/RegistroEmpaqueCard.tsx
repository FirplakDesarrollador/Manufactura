'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarEmpaque } from '@/lib/supabase/queries/fibra_empaque'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import AccionesPiezaFibra from '../AccionesPiezaFibra'
import { PackageCheck } from 'lucide-react'

interface RegistroEmpaqueCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Misma tarjeta de los demás módulos de piso FV: "Registrar Guacal" (pasa a Empaque, pendiente de digitar)
export default function RegistroEmpaqueCard({ registro, orden, moldes, usuarioEmail, onRefresh }: RegistroEmpaqueCardProps) {
    const acciones = (
        <AccionesPiezaFibra
            principal={{
                id: 'Empaque', label: 'Registrar Guacal', icon: PackageCheck, title: 'Registrar la pieza en guacal',
                accion: () => registrarEmpaque(registro.registrer || '', usuarioEmail)
            }}
            onHecho={onRefresh}
            mensajeError="Hubo un error al registrar el guacal."
        />
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-emerald-50/40" />
}
