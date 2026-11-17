'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { PiezaVaciado } from './pesosVaciado'

// Gelcoat y resina por pieza de cada OF (tarjetas de Pintura y Vaciado FV), consultados a SAP una vez por OF mientras la
// pantalla está abierta y de a una OF a la vez (en la misma sesión de SAP las consultas en paralelo se bloquean).
export type EstadoPesos = { fase: 'cargando' } | { fase: 'listo'; piezas: PiezaVaciado[] } | { fase: 'error'; mensaje: string }

const estados = new Map<string, EstadoPesos>()
const oyentes = new Set<() => void>()
let cola: Promise<unknown> = Promise.resolve()

function pedir(of: string) {
    if (estados.has(of)) return
    estados.set(of, { fase: 'cargando' })
    const turno = cola.then(async () => {
        const r = await fetch(`/api/sap/pesos-vaciado-fv?of=${of}`, { cache: 'no-store' })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
        return d.piezas as PiezaVaciado[]
    })
    cola = turno.catch(() => undefined)
    turno.then(piezas => estados.set(of, { fase: 'listo', piezas }))
        .catch(e => estados.set(of, { fase: 'error', mensaje: e instanceof Error ? e.message : 'Error consultando SAP' }))
        .finally(() => oyentes.forEach(f => f()))
}

export function usePesosVaciado(of: unknown, activo: boolean): EstadoPesos | undefined {
    const clave = String(of ?? '').trim()
    const valido = activo && /^\d+$/.test(clave)
    const estado = useSyncExternalStore(
        f => { oyentes.add(f); return () => { oyentes.delete(f) } },
        () => valido ? estados.get(clave) : undefined,
        () => undefined,
    )
    useEffect(() => { if (valido) pedir(clave) }, [clave, valido])
    return estado
}
