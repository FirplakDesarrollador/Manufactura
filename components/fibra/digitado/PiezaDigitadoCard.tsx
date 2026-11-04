'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarDigitado } from '@/lib/supabase/queries/fibra_digitado'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import AccionesPiezaFibra from '../AccionesPiezaFibra'
import { Keyboard } from 'lucide-react'

interface PiezaDigitadoCardProps {
    registro: RegistroTrazabilidad
    orden?: OrdenFabricacion
    moldes: Molde[]
    usuarioEmail: string
    onRefresh: () => void
}

// Vista por pieza de Digitado (misma tarjeta de los demás módulos): "Registrar Digitado" pasa la pieza a Tránsito.
// RegistroDigitadoCard se conserva para las listas por orden (lote) y CEDI.
export default function PiezaDigitadoCard({ registro, orden, moldes, usuarioEmail, onRefresh }: PiezaDigitadoCardProps) {
    const acciones = (
        <AccionesPiezaFibra
            principal={{
                id: 'Transito', label: 'Registrar Digitado', icon: Keyboard, title: 'Registrar el digitado y pasar la pieza a Tránsito',
                accion: () => registrarDigitado(registro.registrer || '', usuarioEmail)
            }}
            onHecho={onRefresh}
            mensajeError="Hubo un error al registrar el digitado."
        />
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-slate-100/60" />
}
