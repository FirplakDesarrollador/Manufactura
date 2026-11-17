'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Revisión de componentes para la entrega (FV): cuando una pieza llega a guacal (pendiente de digitar) o pasa a Tránsito,
// se revisa en segundo plano en SAP que la bodega de cada componente (MP-03) tenga lo que falta por descontar de la OF,
// salvo la mano de obra (/api/sap/entrega-fv?of=NNN). El resultado se guarda en memoria mientras la pantalla está abierta.
// Una OF a la vez: en la misma sesión de SAP las consultas en paralelo se bloquean entre sí.
// Actualización programada: a cada hora en punto se vuelven a revisar las OF que están en pantalla. Mientras se
// actualiza se sigue viendo el resultado anterior; solo cambia cuando llega el nuevo (igual con el botón Actualizar).

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
    // `actualizando`: se está consultando SAP de nuevo; se muestra el resultado anterior. `errorActualizar`: falló la
    // última actualización y se conserva el resultado anterior.
    | { fase: 'listo'; resultado: ResultadoEntrega; actualizando?: boolean; errorActualizar?: string }
    | { fase: 'error'; mensaje: string }

const UNA_HORA = 60 * 60000

const estados = new Map<string, EstadoRevision>()
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(f => f())

// Último resultado de cada OF, aparte del estado visible y guardado en el navegador: si ya hubo una revisión, nunca se
// vuelve a "Analizando…" (ni al recargar la página); se muestra ese resultado mientras llega el nuevo.
const CLAVE_GUARDADO = 'fv-revision-entrega'
const ultimos = new Map<string, ResultadoEntrega>()
try {
    if (typeof window !== 'undefined') {
        const guardado = JSON.parse(window.localStorage.getItem(CLAVE_GUARDADO) || '{}') as Record<string, ResultadoEntrega>
        const limite = Date.now() - 3 * 24 * UNA_HORA
        for (const [of, r] of Object.entries(guardado)) {
            if (r && new Date(r.calculado_at).getTime() > limite) { ultimos.set(of, r); estados.set(of, { fase: 'listo', resultado: r }) }
        }
    }
} catch { /* sin almacenamiento del navegador: solo memoria */ }
const guardarUltimo = (of: string, r: ResultadoEntrega) => {
    ultimos.set(of, r)
    try { window.localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(Object.fromEntries(ultimos))) } catch { /* ignorar */ }
}

const fijar = (of: string, e: EstadoRevision) => {
    if (e.fase === 'listo' && !e.actualizando && !e.errorActualizar) guardarUltimo(of, e.resultado)
    estados.set(of, e); avisar()
}

let cola: Promise<unknown> = Promise.resolve()
const enCurso = new Map<string, Promise<void>>()

/** Revisa la OF en segundo plano. `forzar`: vuelve a consultar aunque ya haya un resultado (al registrar el paso). */
export function revisarEntrega(ofEntrada: string | number | null | undefined, forzar = true): Promise<void> {
    const of = String(ofEntrada ?? '').trim()
    if (!/^\d+$/.test(of)) return Promise.resolve()
    const actual = enCurso.get(of)
    if (actual) return actual
    const visible = estados.get(of)
    if (!forzar && visible?.fase === 'listo') return Promise.resolve()
    const anterior = visible?.fase === 'listo' ? visible.resultado : ultimos.get(of)

    // Con un resultado anterior se sigue mostrando hasta que llegue el nuevo
    if (anterior) fijar(of, { fase: 'listo', resultado: anterior, actualizando: true })
    else fijar(of, { fase: 'analizando' })

    const turno = cola.then(async () => {
        const r = await fetch(`/api/sap/entrega-fv?of=${of}`, { cache: 'no-store' })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
        return d as ResultadoEntrega
    })
    cola = turno.catch(() => undefined)
    const tarea = turno
        .then(resultado => fijar(of, { fase: 'listo', resultado }))
        .catch(e => {
            const mensaje = e instanceof Error ? e.message : 'Error consultando SAP'
            if (anterior) fijar(of, { fase: 'listo', resultado: anterior, errorActualizar: mensaje })
            else fijar(of, { fase: 'error', mensaje })
        })
        .finally(() => enCurso.delete(of))
    enCurso.set(of, tarea)
    return tarea
}

// OF en pantalla (una tarjeta puede montarse varias veces: se cuentan)
const enPantalla = new Map<string, number>()
let reloj: ReturnType<typeof setTimeout> | null = null

function actualizarPantalla() {
    for (const of of enPantalla.keys()) revisarEntrega(of, true)
}
function programarHora() {
    if (reloj) return
    const ahora = new Date()
    const siguiente = new Date(ahora); siguiente.setMinutes(0, 0, 0); siguiente.setHours(siguiente.getHours() + 1)
    reloj = setTimeout(() => { reloj = null; actualizarPantalla(); if (enPantalla.size) programarHora() }, siguiente.getTime() - ahora.getTime())
}
function montar(of: string) {
    enPantalla.set(of, (enPantalla.get(of) || 0) + 1)
    programarHora()
}
function desmontar(of: string) {
    const n = (enPantalla.get(of) || 0) - 1
    if (n > 0) enPantalla.set(of, n); else enPantalla.delete(of)
    if (!enPantalla.size && reloj) { clearTimeout(reloj); reloj = null }
}

/** Hora (texto) de la próxima actualización programada. */
export function proximaActualizacion(): string {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
    return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

/** Estado de la revisión de una OF; la lanza al mostrarse la tarjeta si aún no se ha revisado o tiene más de una hora. */
export function useRevisionEntrega(of: string | number | null | undefined): EstadoRevision | undefined {
    const clave = String(of ?? '').trim()
    const estado = useSyncExternalStore(
        f => { oyentes.add(f); return () => { oyentes.delete(f) } },
        () => estados.get(clave),
        () => undefined,
    )
    useEffect(() => {
        if (!clave) return
        const previo = estados.get(clave)
        const viejo = previo?.fase === 'listo' && Date.now() - new Date(previo.resultado.calculado_at).getTime() > UNA_HORA
        revisarEntrega(clave, viejo)
        montar(clave)
        return () => desmontar(clave)
    }, [clave])
    return estado
}
