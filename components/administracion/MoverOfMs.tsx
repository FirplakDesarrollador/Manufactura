'use client'

import React from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import MoverOf, { MoverApi } from '@/components/common/MoverOf'
import {
    DESTINOS_MS, DestinoMs, OCUPAN_MOLDE_MS, verificarHistorialMs, ocupacionMoldesMs, moverPiezaMs,
    devolverPiezaMsAProgramado, registrarPiezaProgramadoMs, cambiarMoldePiezaMs
} from '@/lib/marmol/moverPiezaMs'

// Mover OF en Administración MS: el mismo botón de FV (components/common/MoverOf) con los estados de Mármol y su
// historial (movimientos_ms). No toca piezas en CEDI, Saldo ni Destrucción.
// "Digitado" = empaque registrado (estado Empaque): la pieza queda en el módulo Digitado, pendiente de digitar.
// Para dejarla pendiente de empaque se usa "Acabado" (el módulo Empaque lista las piezas en Acabado).
const API_MS: MoverApi = {
    opciones: [
        { id: 'programado', label: 'Programado' },
        { id: 'pintura', label: 'Pintura' },
        { id: 'vaciado', label: 'Vaciado' },
        { id: 'pulido', label: 'Pulido' },
        { id: 'acabado', label: 'Acabado' },
        { id: 'reparacion', label: 'Reparación' },
        { id: 'empaque', label: 'Digitado' },
        { id: 'transito', label: 'Tránsito' }
    ],
    enProceso: ['Pintura', 'Vaciado', 'Desgelcada', 'Pulido', 'Acabado', 'Estanteria', 'Reparacion', 'Reparacion_larga', 'Empaque', 'Digitado', 'Transito'],
    ocupanMolde: OCUPAN_MOLDE_MS,
    nombreEstado: { Empaque: 'Digitado (empacada)', Estanteria: 'Estantería', Reparacion: 'Reparación', Reparacion_larga: 'Reparación larga', Transito: 'Tránsito' },
    estadoDestino: d => d === 'programado' ? 'Programado' : DESTINOS_MS[d as DestinoMs].estado,
    leerPiezas: async orden => {
        await verificarHistorialMs()
        const { data, error } = await supabase.from('query_trazabilidad_ms').select('id, estado, molde_serial, molde_id').eq('orden_fabricacion_id', orden.id)
        if (error) throw new Error(`No se pudieron leer las piezas de la OF: ${error.message}`)
        return (data || []).map(p => ({ id: String(p.id), estado: p.estado, molde: p.molde_serial ?? null, moldeId: p.molde_id ?? null }))
    },
    ocupacion: ocupacionMoldesMs,
    mover: (p, destino, email, motivo) => moverPiezaMs(Number(p.id), destino as DestinoMs, email, motivo),
    devolver: (p, email) => devolverPiezaMsAProgramado(Number(p.id), email),
    registrar: async (orden, moldeId, destino, email) => {
        if (moldeId == null) throw new Error('La unidad en Programado no tiene molde asignado.')
        await registrarPiezaProgramadoMs(orden.id, String(orden.orden_fabricacion), moldeId, destino as DestinoMs, email)
    },
    cambiarMolde: (p, moldeNuevoId, _email, motivo) => cambiarMoldePiezaMs(Number(p.id), moldeNuevoId, motivo, p.molde, p.moldeId)
}

export default function MoverOfMs(props: { orden: OrdenFabricacion; moldes: Molde[]; usuarioEmail?: string; onHecho: () => void }) {
    return <MoverOf api={API_MS} {...props} />
}
