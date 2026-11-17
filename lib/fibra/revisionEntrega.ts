'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Revisión de componentes para la entrega (FV): cuando una pieza llega a guacal (pendiente de digitar) o pasa a Tránsito,
// se revisa en segundo plano en SAP que la bodega de cada componente (MP-03) tenga lo que falta por descontar de la OF,
// salvo la mano de obra (/api/sap/entrega-fv?of=NNN). El resultado se guarda en memoria mientras la pantalla está abierta.
// Una OF a la vez: en la misma sesión de SAP las consultas en paralelo se bloquean entre sí.

export type ComponenteEntrega = {
    item: string; descripcion: string; bodega: string; requerido: number; consumido: number; pendiente: number
    existencia: number | null; estado: 'ok' | 'consumido' | 'faltante' | 'sin_dato'
}
export type ResultadoEntrega = {
    estado: 'completo' | 'faltante' | 'sin_dato'
    exigidos: number; cubiertos: number; faltantes: number; sin_dato: number
    detalle: ComponenteEntrega[]
    calculado_at: string
}
export type EstadoRevision =
    | { fase: 'analizando' }
    | { fase: 'listo'; resultado: ResultadoEntrega }
    | { fase: 'error'; mensaje: string }

const estados = new Map<string, EstadoRevision>()
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(f => f())
const fijar = (of: string, e: EstadoRevision) => { estados.set(of, e); avisar() }

let cola: Promise<unknown> = Promise.resolve()
const enCurso = new Map<string, Promise<void>>()

/** Revisa la OF en segundo plano. `forzar`: vuelve a consultar aunque ya haya un resultado (al registrar el paso). */
export function revisarEntrega(ofEntrada: string | number | null | undefined, forzar = true): Promise<void> {
    const of = String(ofEntrada ?? '').trim()
    if (!/^\d+$/.test(of)) return Promise.resolve()
    const actual = enCurso.get(of)
    if (actual) return actual
    if (!forzar && estados.get(of)?.fase === 'listo') return Promise.resolve()

    fijar(of, { fase: 'analizando' })
    const turno = cola.then(async () => {
        const r = await fetch(`/api/sap/entrega-fv?of=${of}`, { cache: 'no-store' })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
        return d as ResultadoEntrega
    })
    cola = turno.catch(() => undefined)
    const tarea = turno
        .then(resultado => fijar(of, { fase: 'listo', resultado }))
        .catch(e => fijar(of, { fase: 'error', mensaje: e instanceof Error ? e.message : 'Error consultando SAP' }))
        .finally(() => enCurso.delete(of))
    enCurso.set(of, tarea)
    return tarea
}

/** Estado de la revisión de una OF; la lanza al mostrarse la tarjeta si aún no se ha revisado. */
export function useRevisionEntrega(of: string | number | null | undefined): EstadoRevision | undefined {
    const clave = String(of ?? '').trim()
    const estado = useSyncExternalStore(
        f => { oyentes.add(f); return () => { oyentes.delete(f) } },
        () => estados.get(clave),
        () => undefined,
    )
    useEffect(() => { if (clave) revisarEntrega(clave, false) }, [clave])
    return estado
}
