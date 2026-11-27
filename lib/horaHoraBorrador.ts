'use client'

import type { StateStorage } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'

// Borrador del Hora a Hora en curso, en TRES lugares (problema en Android: al bloquear el celular, Chrome cierra la
// página; si el localStorage —5 MB, compartido con las copias que llevan la firma— estaba lleno, el borrador no se
// guardaba y al volver se perdía todo sin aviso):
//   1. IndexedDB del celular: mucho más espacio que localStorage; se le pide al navegador que no lo borre.
//   2. localStorage: copia de respaldo (y para leer los borradores guardados antes de este cambio).
//   3. Supabase (tabla hora_hora_borradores, una fila por usuario): copia en la nube; si el celular borró todo,
//      al abrir la evaluación se recupera de ahí.
// Estado visible para el usuario: "Guardado hh:mm" o el aviso de que no se pudo guardar.

const BD = 'firplak-hora-hora'
const TABLA = 'kv'

function abrirBd(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('Sin IndexedDB')); return }
        const req = indexedDB.open(BD, 1)
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(TABLA)) req.result.createObjectStore(TABLA) }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}
async function idbGet(k: string): Promise<string | null> {
    const db = await abrirBd()
    return new Promise((resolve, reject) => {
        const r = db.transaction(TABLA, 'readonly').objectStore(TABLA).get(k)
        r.onsuccess = () => resolve((r.result as string | undefined) ?? null)
        r.onerror = () => reject(r.error)
    })
}
async function idbSet(k: string, v: string | null): Promise<void> {
    const db = await abrirBd()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TABLA, 'readwrite')
        if (v === null) tx.objectStore(TABLA).delete(k); else tx.objectStore(TABLA).put(v, k)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

// ── Estado del guardado (para el indicador de la pantalla) ──
export type EstadoGuardado = { ultimo: number | null; equipo: boolean; nube: 'ok' | 'error' | 'pendiente' | 'sin_tabla' | null; error: string | null }
let estado: EstadoGuardado = { ultimo: null, equipo: true, nube: null, error: null }
const oyentes = new Set<(e: EstadoGuardado) => void>()
const avisar = (c: Partial<EstadoGuardado>) => { estado = { ...estado, ...c }; oyentes.forEach(f => f(estado)) }
export const estadoGuardado = () => estado
export function oirGuardado(f: (e: EstadoGuardado) => void) { oyentes.add(f); return () => { oyentes.delete(f) } }

// ── Copia en la nube (con espera: no sube en cada tecla) ──
let temporizador: ReturnType<typeof setTimeout> | null = null
let ultimoValor: string | null = null
async function emailUsuario(): Promise<string | null> {
    try { const { data } = await createClient().auth.getUser(); return data.user?.email || null } catch { return null }
}
async function subirNube(valor: string | null) {
    const email = await emailUsuario()
    if (!email) return
    const sb = createClient()
    const { error } = valor === null
        ? await sb.from('hora_hora_borradores').delete().eq('usuario_email', email)
        : await sb.from('hora_hora_borradores').upsert({ usuario_email: email, datos: JSON.parse(valor), actualizado_at: new Date().toISOString() }, { onConflict: 'usuario_email' })
    if (error) avisar({ nube: /hora_hora_borradores|relation|schema cache/i.test(error.message) ? 'sin_tabla' : 'error' })
    else avisar({ nube: 'ok' })
}
function programarNube(valor: string | null) {
    ultimoValor = valor
    avisar({ nube: 'pendiente' })
    if (temporizador) clearTimeout(temporizador)
    temporizador = setTimeout(() => { temporizador = null; void subirNube(ultimoValor) }, valor === null ? 0 : 2500)
}
// Si la página se va a ocultar (bloquear el celular, cambiar de app), sube ya lo pendiente
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && temporizador) { clearTimeout(temporizador); temporizador = null; void subirNube(ultimoValor) }
    })
}

/** Lee el borrador de la nube del usuario (si el celular no tiene ninguno) */
export async function leerBorradorNube(): Promise<{ datos: any; actualizado_at: string } | null> {
    const email = await emailUsuario()
    if (!email) return null
    const { data, error } = await createClient().from('hora_hora_borradores').select('datos, actualizado_at').eq('usuario_email', email).maybeSingle()
    if (error || !data) return null
    return data as any
}

let persistenciaPedida = false
export const almacenamientoBorrador: StateStorage = {
    getItem: async (k) => {
        if (!persistenciaPedida && typeof navigator !== 'undefined' && navigator.storage?.persist) { persistenciaPedida = true; navigator.storage.persist().catch(() => 0) }
        try { const v = await idbGet(k); if (v) return v } catch { /* sin IndexedDB: se usa localStorage */ }
        try { return localStorage.getItem(k) } catch { return null }
    },
    setItem: async (k, v) => {
        let ok = false
        try { await idbSet(k, v); ok = true } catch { /* se intenta en localStorage */ }
        try { localStorage.setItem(k, v); ok = true } catch { /* lleno: queda IndexedDB y la nube */ }
        avisar({ ultimo: Date.now(), equipo: ok, error: ok ? null : 'No se pudo guardar en este celular (almacenamiento lleno o bloqueado). Queda la copia en la nube.' })
        programarNube(v)
    },
    removeItem: async (k) => {
        try { await idbSet(k, null) } catch { /* nada */ }
        try { localStorage.removeItem(k) } catch { /* nada */ }
        avisar({ ultimo: null, error: null })
        programarNube(null)
    },
}
