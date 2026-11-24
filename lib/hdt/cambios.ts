// Mide cuánto cambió una HDT respecto a como estaba al abrirla, para decidir si al guardar
// se crea una nueva versión automáticamente (cambios grandes) o se guarda sobre la misma (ajustes pequeños).

export const UMBRAL_PALABRAS = 5
export const UMBRAL_CARACTERES = 35

type Texto = string | null | undefined
export interface HdtComparable {
    hdt: Record<string, unknown>
    steps: Record<string, unknown>[]
}

// Campos de contenido que cuentan como cambio (no cuentan fecha, versión, elaboró ni aprobó)
const CAMPOS_HDT = ['planta', 'proceso', 'labor', 'herramientas', 'insumos', 'epp', 'prohibido_y_porque', 'tratamiento_anomalias']
const CAMPOS_PASO = ['acciones_importantes', 'paso_importante', 'punto_clave', 'razon_punto_clave']

const normalizar = (s: Texto) => String(s ?? '').replace(/\r\n?/g, '\n').trim()

// Quita lo que es igual al inicio y al final de las dos listas
function recortar<T>(a: T[], b: T[]): [T[], T[]] {
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    let j = 0
    while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++
    return [a.slice(i, a.length - j), b.slice(i, b.length - j)]
}

// Palabras cambiadas: las que se quitaron o agregaron (la mayor de las dos), usando la subsecuencia común más larga
function palabrasCambiadas(antes: string, despues: string): number {
    const [a, b] = recortar(antes.split(/\s+/).filter(Boolean), despues.split(/\s+/).filter(Boolean))
    if (!a.length || !b.length) return Math.max(a.length, b.length)
    if (a.length * b.length > 4_000_000) return Math.max(a.length, b.length) // textos enormes: estimación sin LCS
    let prev = new Array(b.length + 1).fill(0)
    for (let i = 1; i <= a.length; i++) {
        const cur = new Array(b.length + 1).fill(0)
        for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
        prev = cur
    }
    const comun = prev[b.length]
    return Math.max(a.length - comun, b.length - comun)
}

// Caracteres cambiados: tamaño del tramo distinto después de quitar lo igual al inicio y al final
function caracteresCambiados(antes: string, despues: string): number {
    const [a, b] = recortar([...antes], [...despues])
    return Math.max(a.length, b.length)
}

export function medirCambios(antes: HdtComparable, despues: HdtComparable) {
    let palabras = 0
    let caracteres = 0
    const sumar = (x: Texto, y: Texto) => {
        const a = normalizar(x), b = normalizar(y)
        if (a === b) return
        palabras += palabrasCambiadas(a, b)
        caracteres += caracteresCambiados(a, b)
    }
    for (const c of CAMPOS_HDT) sumar(antes.hdt[c] as Texto, despues.hdt[c] as Texto)
    const n = Math.max(antes.steps.length, despues.steps.length)
    for (let i = 0; i < n; i++) {
        for (const c of CAMPOS_PASO) sumar(antes.steps[i]?.[c] as Texto, despues.steps[i]?.[c] as Texto)
    }
    return { palabras, caracteres, nuevaVersion: palabras > UMBRAL_PALABRAS || caracteres > UMBRAL_CARACTERES }
}
