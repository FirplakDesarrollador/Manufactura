'use client'

import React from 'react'
import { getRegistrosParaEmpaque } from '@/lib/supabase/queries/fibra_empaque'
import ModuloPiezasFibra from '../ModuloPiezasFibra'
import RegistroEmpaqueCard from './RegistroEmpaqueCard'

export default function EmpaqueFibraModule({ userEmail }: { userEmail: string }) {
    return (
        <ModuloPiezasFibra
            cargarPiezas={getRegistrosParaEmpaque}
            tituloLista="Piezas pendientes de guacal"
            sinPiezas="No hay piezas pendientes de guacal"
            renderPieza={p => <RegistroEmpaqueCard {...p} usuarioEmail={userEmail} />}
        />
    )
}
