'use client'

import React from 'react'
import { supabase } from '@/lib/supabase'
import { OrdenFabricacion, Molde } from '@/types/pintura'
import MoverOf, { MoverApi } from '@/components/common/MoverOf'
import {
    DestinoMovimientoFv, DESTINOS_MOVIMIENTO_FV, moverPiezaFibra, devolverPiezaAProgramadoFv,
    registrarPiezaProgramadoFv, registrarKitReparacionFv
} from '@/lib/supabase/queries/fibra_administracion'
import { ocupacionMoldesFv } from '@/lib/supabase/queries/fibra_moldes'
import { esKitReparacion } from '@/lib/fibra/kitReparacion'
import { registrarMovimientosFv } from '@/lib/fibra/movimientos'

// Mover OF en Administración FV: el botón común (components/common/MoverOf) con los estados y el historial de FV
// (movimientos_fv). No toca piezas en CEDI, Saldo ni Destrucción.
const API_FV: MoverApi = {
    opciones: [
        { id: 'programado', label: 'Programado' },
        { id: 'pintura', label: 'Pintura' },
        { id: 'vaciado', label: 'Vaciado' },
        { id: 'herrajes', label: 'Herrajes' },
        { id: 'pulido', label: 'Pulido' },
        { id: 'ensayo', label: 'Ensayo' },
        { id: 'reparacion', label: 'Reparación' },
        { id: 'huacales', label: 'Huacales' },
        { id: 'digitado', label: 'Digitado' },
        { id: 'transito', label: 'Tránsito' }
    ],
    enProceso: ['Pintura', 'Vaciado', 'Herrajes', 'Pulido', 'Ensayo', 'Reparacion', 'Reparacion_larga', 'Guacales', 'Empaque', 'Transito'],
    ocupanMolde: ['Pintura', 'Vaciado'],
    nombreEstado: { Guacales: 'Huacales', Empaque: 'Digitado', Reparacion: 'Reparación', Reparacion_larga: 'Reparación larga', Transito: 'Tránsito' },
    estadoDestino: d => d === 'programado' ? 'Programado' : DESTINOS_MOVIMIENTO_FV[d as DestinoMovimientoFv].estado,
    esKit: o => esKitReparacion(o.producto_descripcion),
    leerPiezas: async orden => {
        const [{ data: piezas, error }, { data: ids, error: errIds }] = await Promise.all([
            supabase.from('query_trazabilidad_fv').select('registrer, estado, molde_serial').eq('orden_fabricacion', String(orden.orden_fabricacion)),
            supabase.from('trazabilidad_fv').select('registrer, molde_id').eq('orden_fabricacion_id', orden.id)
        ])
        if (error || errIds) throw new Error(`No se pudieron leer las piezas de la OF: ${(error || errIds)?.message}`)
        const moldeDe = new Map((ids || []).map(p => [String(p.registrer), p.molde_id as number | null]))
        return (piezas || []).map(p => ({ id: String(p.registrer), estado: p.estado, molde: p.molde_serial ?? null, moldeId: moldeDe.get(String(p.registrer)) ?? null }))
    },
    ocupacion: async ids => {
        const m = await ocupacionMoldesFv(ids)
        return new Map([...m.entries()].map(([k, v]) => [k, { of: v.of, id: v.registrer }]))
    },
    mover: (p, destino, email, motivo) => moverPiezaFibra(p.id, destino as DestinoMovimientoFv, email, null, 'administracion', motivo),
    devolver: (p, email) => devolverPiezaAProgramadoFv(p.id, email, 'administracion'),
    registrar: async (orden, moldeId, destino, email) => {
        if (moldeId == null) await registrarKitReparacionFv(orden.id, destino as DestinoMovimientoFv, email, null, 'administracion')
        else await registrarPiezaProgramadoFv(orden.id, moldeId, destino as DestinoMovimientoFv, email, null, 'administracion')
    },
    cambiarMolde: async (p, moldeNuevoId, _email, motivo) => {
        const { error } = await supabase.from('trazabilidad_fv').update({ molde_id: moldeNuevoId }).eq('registrer', p.id)
        if (error) throw new Error(`No se pudo cambiar el molde de la pieza: ${error.message}`)
        const { data } = await supabase.from('trazabilidad_fv').select('orden_fabricacion_id').eq('registrer', p.id).maybeSingle()
        await registrarMovimientosFv([{
            origen: 'administracion', accion: 'editar_registro', registrer: p.id, ordenId: data?.orden_fabricacion_id ?? null,
            estadoAntes: p.estado, estadoDespues: p.estado, moldeId: moldeNuevoId,
            detalle: { motivo, molde_antes: p.molde, molde_id_antes: p.moldeId }
        }])
    }
}

export default function MoverOfFibra(props: { orden: OrdenFabricacion; moldes: Molde[]; usuarioEmail?: string; onHecho: () => void }) {
    return <MoverOf api={API_FV} {...props} />
}
