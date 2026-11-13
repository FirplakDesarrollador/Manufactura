'use client'

import { useEffect } from 'react'

// Nombres que se muestran distinto SOLO en pantalla; los registros de la base no se modifican.
// "Carolina Escobar" (también "Carolina Escobar M." y "Carolina Escobar Madrid") ya no trabaja en Firplak:
// la reemplazó Estiven Londoño, que usa su mismo correo (cambio de puesto sin cambio de correo).
// Para dejar de hacerlo, quitar <NombresVisibles /> de app/layout.tsx.
const REEMPLAZOS: [RegExp, string][] = [
    // La "M" solo cuenta como inicial suelta (no cambia, por ejemplo, "Carolina Escobar Mier")
    [/Carolina\s+Escobar(?:\s+Madrid\b|\s+M\.|\s+M\b)?/gi, 'Ederson Estiven Londoño Alvarez'],
]
// No se tocan campos de escritura ni código
const OMITIR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE'])

function corregir(nodo: Node) {
    if (nodo.nodeType === Node.TEXT_NODE) {
        const padre = nodo.parentElement
        if (!padre || OMITIR.has(padre.tagName) || padre.isContentEditable) return
        const texto = nodo.nodeValue || ''
        if (!/carolina/i.test(texto)) return
        let nuevo = texto
        for (const [re, por] of REEMPLAZOS) nuevo = nuevo.replace(re, por)
        if (nuevo !== texto) nodo.nodeValue = nuevo
        return
    }
    if (nodo.nodeType === Node.ELEMENT_NODE && OMITIR.has((nodo as Element).tagName)) return
    nodo.childNodes.forEach(corregir)
}

export default function NombresVisibles() {
    useEffect(() => {
        corregir(document.body)
        const obs = new MutationObserver(cambios => {
            for (const c of cambios) {
                if (c.type === 'characterData') corregir(c.target)
                else c.addedNodes.forEach(corregir)
            }
        })
        obs.observe(document.body, { childList: true, subtree: true, characterData: true })
        return () => obs.disconnect()
    }, [])
    return null
}
