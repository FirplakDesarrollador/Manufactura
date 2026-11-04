'use client'

import React from 'react'
import { getRegistrosParaEnsayo } from '@/lib/supabase/queries/fibra_ensayo'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import RegistroEnsayoCard from './RegistroEnsayoCard'

export default function EnsayoFibraModule({ userEmail }: { userEmail: string }) {
    return (
        <ModuloPiezasFibra
            cargarPiezas={getRegistrosParaEnsayo}
            tituloLista="Piezas pendientes de ensayo"
            sinPiezas="No hay piezas pendientes de ensayo"
            renderPieza={p => <RegistroEnsayoCard {...p} usuarioEmail={userEmail} />}
        />
    )
}
