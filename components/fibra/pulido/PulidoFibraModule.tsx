'use client'

import React from 'react'
import { getRegistrosParaPulido } from '@/lib/supabase/queries/fibra_pulido'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import RegistroPulidoCard from './RegistroPulidoCard'

export default function PulidoFibraModule({ userEmail }: { userEmail: string }) {
    return (
        <ModuloPiezasFibra
            cargarPiezas={getRegistrosParaPulido}
            tituloLista="Piezas pendientes de pulido"
            sinPiezas="No hay piezas pendientes de pulido"
            renderPieza={p => <RegistroPulidoCard {...p} usuarioEmail={userEmail} />}
        />
    )
}
