'use client'

import { useEffect, useState } from 'react'

// Caché en memoria del navegador (mientras la página esté abierta) para los tableros del Tablero de Control:
// al cambiar de pestaña y volver, lo ya consultado aparece de inmediato. Vence a los 5 minutos: después se vuelve a
// consultar, así los datos del día no se quedan viejos.
const VIGENCIA_MS = 5 * 60 * 1000
const almacen = new Map<string, { t: number; v: unknown }>()

export function leerCache<T>(clave: string, vigenciaMs = VIGENCIA_MS): T | undefined {
    const e = almacen.get(clave)
    if (!e) return undefined
    if (Date.now() - e.t > vigenciaMs) { almacen.delete(clave); return undefined }
    return e.v as T
}

export function guardarCache(clave: string, v: unknown) {
    // Se conserva la hora de la primera carga: así la vigencia cuenta desde que se consultó, no desde el último cambio
    const previo = almacen.get(clave)
    almacen.set(clave, { t: previo?.t ?? Date.now(), v })
}

// useState que arranca con lo guardado en caché (si está vigente) y guarda cada cambio
export function useEstadoEnCache<T>(clave: string, inicial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [valor, setValor] = useState<T>(() => leerCache<T>(clave) ?? inicial)
    useEffect(() => { guardarCache(clave, valor) }, [clave, valor])
    return [valor, setValor]
}
