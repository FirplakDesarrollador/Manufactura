'use client'

import React from 'react'
import { RegistroTrazabilidad, OrdenFabricacion, Molde } from '@/types/pintura'
import { registrarEmpaque } from '@/lib/supabase/queries/fibra_empaque'
import { revisarEntrega } from '@/lib/fibra/revisionEntrega'
import TarjetaPiezaFibra from '../TarjetaPiezaFibra'
import EstadoEntregaOf from '../EstadoEntregaOf'
import AvisoTrasladoOf from '@/components/fibra/AvisoTrasladoOf'
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
                // Al pasar a guacal se revisan en segundo plano los componentes para la entrega
                accion: async () => { const r = await registrarEmpaque(registro.registrer || '', usuarioEmail); revisarEntrega(registro.orden_fabricacion); return r }
            }}
            onHecho={onRefresh}
            mensajeError="Hubo un error al registrar el guacal."
        />
    )

    return <TarjetaPiezaFibra registro={registro} orden={orden} moldes={moldes} acciones={acciones} franja="bg-emerald-50/40"
        extra={<><EstadoEntregaOf of={registro.orden_fabricacion} /><AvisoTrasladoOf of={registro.orden_fabricacion} /></>} />
}
