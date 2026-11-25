'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Revisión de componentes para la entrega (MS, FV, Muebles, CEFI). La hace el SERVIDOR y queda guardada en la tabla
// revision_entrega_of, una sola para todos los equipos:
//  - Cron de cada hora (todas las plantas): OF con faltantes / sin dato / error cada hora; OF en OK cada 3 horas.
//  - Al abrir una pantalla se lee lo guardado (las OF nunca revisadas se consultan en SAP en ese momento).
//  - Botón "Actualizar componentes" (las OF de la planta en pantalla) y ↻ de una OF: consultan SAP ya, en bloque.
//  - Al registrar Empaque/Digitado de una pieza se revisa su OF de inmediato.
// Mientras se actualiza se sigue viendo el resultado anterior; solo cambia cuando llega el nuevo.

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

type Fila = {
    orden_fabricacion: string; estado: 'completo' | 'faltante' | 'sin_dato' | 'error'
    exigidos: number; cubiertos: number; faltantes: number; sin_dato: number
    detalle: ComponenteEntrega[]; error: string | null; calculado_at: string
}

const UNA_HORA = 60 * 60000
const LOTE_LEER = 100
const LOTE_FORZAR = 60

const estados = new Map<string, EstadoRevision>()
const oyentes = new Set<() => void>()
let version = 0
const avisar = () => { version++; oyentes.forEach(f => f()) }
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f) } }

// Último resultado de cada OF guardado también en el navegador: se muestra al instante al abrir (y alimenta las
// bolitas del menú con el módulo cerrado) mientras llega lo del servidor.
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
let guardarPendiente: ReturnType<typeof setTimeout> | null = null
const guardarUltimo = (of: string, r: ResultadoEntrega) => {
    ultimos.set(of, r)
    if (guardarPendiente) return
    guardarPendiente = setTimeout(() => {
        guardarPendiente = null
        try { window.localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(Object.fromEntries(ultimos))) } catch { /* ignorar */ }
    }, 500)
}

const fijar = (of: string, e: EstadoRevision, silencioso = false) => {
    if (e.fase === 'listo' && !e.actualizando) guardarUltimo(of, e.resultado)
    estados.set(of, e)
    if (!silencioso) avisar()
}
const anteriorDe = (of: string): ResultadoEntrega | undefined => {
    const v = estados.get(of)
    return v?.fase === 'listo' ? v.resultado : ultimos.get(of)
}
const deFila = (f: Fila): EstadoRevision => {
    if (f.estado === 'error') {
        const previo = anteriorDe(f.orden_fabricacion)
        return previo ? { fase: 'listo', resultado: previo, errorActualizar: f.error || 'Error consultando SAP' } : { fase: 'error', mensaje: f.error || 'Error consultando SAP' }
    }
    return {
        fase: 'listo',
        resultado: { estado: f.estado, exigidos: f.exigidos, cubiertos: f.cubiertos, faltantes: f.faltantes, sin_dato: f.sin_dato, detalle: f.detalle || [], calculado_at: f.calculado_at },
        errorActualizar: f.error || undefined,
    }
}

// Una consulta al servidor a la vez (detrás, SAP no admite consultas en paralelo en la misma sesión)
let cola: Promise<unknown> = Promise.resolve()
const forzando = new Set<string>()

async function enviar(ofs: string[], forzar: boolean, planta?: string) {
    const lote = forzar ? LOTE_FORZAR : LOTE_LEER
    for (let i = 0; i < ofs.length; i += lote) {
        const parte = ofs.slice(i, i + lote)
        const turno = cola.then(async () => {
            const r = await fetch('/api/revision-entrega', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
                body: JSON.stringify({ ofs: parte, forzar, planta }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
            return (d.filas || []) as Fila[]
        })
        cola = turno.catch(() => undefined)
        try {
            const filas = await turno
            const vistas = new Set<string>()
            for (const f of filas) { vistas.add(f.orden_fabricacion); fijar(f.orden_fabricacion, deFila(f), true) }
            for (const of of parte) if (!vistas.has(of)) fijar(of, { fase: 'error', mensaje: 'Sin respuesta del servidor' }, true)
        } catch (e) {
            const mensaje = e instanceof Error ? e.message : 'Error consultando la revisión'
            for (const of of parte) {
                const previo = anteriorDe(of)
                fijar(of, previo ? { fase: 'listo', resultado: previo, errorActualizar: mensaje } : { fase: 'error', mensaje }, true)
            }
        } finally {
            for (const of of parte) forzando.delete(of)
            avisar()
        }
    }
}

/** Consulta SAP ya para estas OF (botón general o ↻). Se sigue viendo el resultado anterior mientras llega el nuevo. */
function forzarRevision(ofsEntrada: string[], planta?: string): Promise<void> {
    const ofs = [...new Set(ofsEntrada.map(o => String(o ?? '').trim()).filter(o => /^\d+$/.test(o) && !forzando.has(o)))]
    if (!ofs.length) return Promise.resolve()
    for (const of of ofs) {
        forzando.add(of)
        const previo = anteriorDe(of)
        fijar(of, previo ? { fase: 'listo', resultado: previo, actualizando: true } : { fase: 'analizando' }, true)
    }
    avisar()
    return enviar(ofs, true, planta)
}

/** Revisa una OF en SAP ya (↻ de la tarjeta, o al registrar Empaque/Digitado de una pieza). */
export function revisarEntrega(ofEntrada: string | number | null | undefined): Promise<void> {
    return forzarRevision([String(ofEntrada ?? '')])
}

// Lectura de lo guardado: las tarjetas que aparecen en pantalla se juntan y se piden en una sola consulta
const porLeer = new Set<string>()
let relojLeer: ReturnType<typeof setTimeout> | null = null
function pedirLectura(of: string) {
    porLeer.add(of)
    if (!relojLeer) relojLeer = setTimeout(() => {
        relojLeer = null
        const ofs = [...porLeer]; porLeer.clear()
        let cambio = false
        for (const o of ofs) if (!estados.has(o)) { estados.set(o, { fase: 'analizando' }); cambio = true }
        if (cambio) avisar()
        enviar(ofs, false)
    }, 200)
}

// OF en pantalla (una tarjeta puede montarse varias veces: se cuentan)
const enPantalla = new Map<string, number>()
let reloj: ReturnType<typeof setTimeout> | null = null

// Después de cada hora en punto (cuando ya corrió el cron del servidor) se relee lo guardado de las OF en pantalla
function programarRelectura() {
    if (reloj) return
    const ahora = new Date()
    const siguiente = new Date(ahora); siguiente.setMinutes(6, 0, 0)
    if (siguiente <= ahora) siguiente.setHours(siguiente.getHours() + 1)
    reloj = setTimeout(() => {
        reloj = null
        if (enPantalla.size) { enviar([...enPantalla.keys()], false); programarRelectura() }
    }, siguiente.getTime() - ahora.getTime())
}
function montar(of: string) {
    enPantalla.set(of, (enPantalla.get(of) || 0) + 1)
    programarRelectura()
}
function desmontar(of: string) {
    const n = (enPantalla.get(of) || 0) - 1
    if (n > 0) enPantalla.set(of, n); else enPantalla.delete(of)
    if (!enPantalla.size && reloj) { clearTimeout(reloj); reloj = null }
}

/** Botón general "Actualizar componentes": consulta SAP ya, en bloque, las OF de la planta que están en pantalla. */
export function actualizarTodasEnPantalla(planta?: string) {
    return forzarRevision([...enPantalla.keys()], planta)
}

/** true mientras alguna OF en pantalla se está revisando (para el giro del botón general). */
export function useRevisionEnCurso(): boolean {
    return useSyncExternalStore(
        suscribir,
        () => [...enPantalla.keys()].some(of => { const e = estados.get(of); return e?.fase === 'analizando' || (e?.fase === 'listo' && !!e.actualizando) }),
        () => false,
    )
}

/** Estado actual de la revisión de una OF (sin lanzarla). */
export function estadoRevision(of: string | number | null | undefined): EstadoRevision | undefined {
    return estados.get(String(of ?? '').trim())
}

/** true si la OF tiene componentes faltantes (con el último resultado conocido, aunque se esté actualizando). */
export function tieneFaltantes(of: string | number | null | undefined): boolean {
    const e = estadoRevision(of)
    return e?.fase === 'listo' && e.resultado.estado === 'faltante'
}

/** Se vuelve a renderizar cada vez que cambia alguna revisión (para ordenar listas por estado). */
export function useVersionRevision(): number {
    return useSyncExternalStore(suscribir, () => version, () => 0)
}

// Grupos de OF (p. ej. las órdenes del Digitado MS) guardados en el navegador, para que el menú cuente las OF con
// faltantes aunque el módulo no esté abierto.
const CLAVE_GRUPOS = 'revision-entrega-grupos'
const grupos = new Map<string, string[]>()
try {
    if (typeof window !== 'undefined') {
        for (const [k, v] of Object.entries(JSON.parse(window.localStorage.getItem(CLAVE_GRUPOS) || '{}') as Record<string, string[]>)) {
            if (Array.isArray(v)) grupos.set(k, v)
        }
    }
} catch { /* ignorar */ }

/** Registra las OF de un grupo (reemplaza las anteriores). */
export function fijarGrupo(nombre: string, ofs: (string | null | undefined)[]) {
    const lista = [...new Set(ofs.map(o => String(o ?? '').trim()).filter(o => /^\d+$/.test(o)))].sort()
    const previa = grupos.get(nombre)
    if (previa && previa.join(',') === lista.join(',')) return
    grupos.set(nombre, lista)
    try { window.localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(Object.fromEntries(grupos))) } catch { /* ignorar */ }
    avisar()
}

/** Cantidad de OF del grupo con componentes faltantes. */
export function useFaltantesGrupo(nombre: string): number {
    return useSyncExternalStore(suscribir, () => (grupos.get(nombre) || []).filter(tieneFaltantes).length, () => 0)
}

/** Hora (texto) de la próxima actualización programada del servidor. */
export function proximaActualizacion(): string {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
    return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

/** Estado de la revisión de una OF; al mostrarse la tarjeta se lee lo guardado en el servidor. */
export function useRevisionEntrega(of: string | number | null | undefined): EstadoRevision | undefined {
    const clave = String(of ?? '').trim()
    const estado = useSyncExternalStore(suscribir, () => estados.get(clave), () => undefined)
    useEffect(() => {
        if (!/^\d+$/.test(clave)) return
        pedirLectura(clave)
        montar(clave)
        return () => desmontar(clave)
    }, [clave])
    return estado
}
