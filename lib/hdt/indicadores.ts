// Indicadores de las HDT (compartidos por Estadísticas HDT y el Sistema de Producción → Trabajo Estandarizado)

export interface HdtItem {
    id: string
    codigo: string
    proceso: string | null
    labor: string | null
    version: number | null
    fecha_elaboracion: string | null
    prohibido_y_porque: string | null
    tratamiento_anomalias: string | null
    planta: string | null
    is_current: boolean
}

export interface HdtStep {
    id: string
    hdt_id: string
    step_no: number | null
    acciones_importantes: string | null
    paso_importante: string | null
    punto_clave: string | null
    razon_punto_clave: string | null
}

// Helper to count key points in a string (supports numbered, bulleted, and custom lists)
export function countKeyPoints(text: string | null): number {
    if (!text) return 0
    const cleaned = text.trim()
    if (!cleaned) return 0
    const matches = cleaned.match(/(\b\d+\.|\B\u2022|\B-|\B\*)/g)
    if (matches) return matches.length
    const parts = cleaned.split(/[\n/]/).map(p => p.trim()).filter(p => p.length > 5)
    return Math.max(1, parts.length)
}

// Scans an HDT and evaluates its quality based on standard criteria
export function evaluateQuality(hdt: HdtItem, steps: HdtStep[]) {
    const hdtSteps = steps.filter(s => s.hdt_id === hdt.id)
    const totalSteps = hdtSteps.length

    const hasProhibido = hdt.prohibido_y_porque !== null && hdt.prohibido_y_porque.trim() !== ''
    const hasAnomalias = hdt.tratamiento_anomalias !== null && hdt.tratamiento_anomalias.trim() !== ''

    let stepsWithActionsCount = 0
    let stepsWithPasoCount = 0
    let stepsWithPuntosCount = 0
    let stepsWithRazonCount = 0
    let stepWarnings: string[] = []
    let totalKeysExceeded = false

    hdtSteps.forEach(step => {
        if (step.acciones_importantes && step.acciones_importantes.trim() !== '') stepsWithActionsCount++
        if (step.paso_importante && step.paso_importante.trim() !== '') stepsWithPasoCount++

        const keyPointsCount = countKeyPoints(step.punto_clave)
        if (keyPointsCount > 0) {
            stepsWithPuntosCount++
            if (keyPointsCount > 3) {
                totalKeysExceeded = true
                stepWarnings.push(`Paso ${step.step_no || ''}: Tiene ${keyPointsCount} puntos clave (máx. 3).`)
            }
        }

        if (step.razon_punto_clave && step.razon_punto_clave.trim() !== '') stepsWithRazonCount++
    })

    const pctActions = totalSteps > 0 ? (stepsWithActionsCount / totalSteps) * 20 : 0
    const pctPasos = totalSteps > 0 ? (stepsWithPasoCount / totalSteps) * 20 : 0

    let pctPuntos = 0
    if (totalSteps > 0) {
        let puntosScore = 0
        hdtSteps.forEach(step => {
            const kp = countKeyPoints(step.punto_clave)
            if (kp > 0 && kp <= 3) {
                puntosScore += 1.0
            } else if (kp > 3) {
                puntosScore += 0.5
            }
        })
        pctPuntos = (puntosScore / totalSteps) * 20
    }

    const pctRazon = totalSteps > 0 ? (stepsWithRazonCount / totalSteps) * 15 : 0
    const pctProhibido = hasProhibido ? 12.5 : 0
    const pctAnomalias = hasAnomalias ? 12.5 : 0

    const rawScore = pctActions + pctPasos + pctPuntos + pctRazon + pctProhibido + pctAnomalias
    const score = Math.round(Number(rawScore.toFixed(2)))

    return {
        score,
        breakdown: {
            acciones: pctActions,
            pasos: pctPasos,
            puntos: pctPuntos,
            razon: pctRazon,
            prohibido: pctProhibido,
            anomalias: pctAnomalias,
        },
        checks: {
            acciones: totalSteps > 0 && stepsWithActionsCount === totalSteps,
            pasos: totalSteps > 0 && stepsWithPasoCount === totalSteps,
            puntos: totalSteps > 0 && stepsWithPuntosCount === totalSteps && !totalKeysExceeded,
            razon: totalSteps > 0 && stepsWithRazonCount === totalSteps,
            prohibido: hasProhibido,
            anomalias: hasAnomalias,
        },
        warnings: stepWarnings,
        hasExceededPoints: totalKeysExceeded
    }
}

export type EvaluatedHdt = HdtItem & ReturnType<typeof evaluateQuality>

export function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim()
}

function cleanTitleWords(str: string | null): string[] {
    if (!str) return []
    const noiseWords = new Set([
        'ms', 'fv', 'cefi', 'mb', 'fpk', 'a', 'b', 'c', 'i', 'ii', 'iii',
        'auxiliar', 'operario', 'tecnico', 'analista', 'lider', 'coordinador',
        'de', 'del', 'la', 'el', 'los', 'las', 'y', 'para', 'linea', 'puesto'
    ])

    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !noiseWords.has(w))
}

function getWordStem(word: string): string {
    if (word.length <= 3) return word
    return word.replace(/(dora|dor|das|dos|da|do|cion|miento|ero|era|er|ar|ir|s)$/, '')
}

export function matchesLabor(labor: string | null, cargo: string | null, proceso?: string | null): boolean {
    if (!cargo) return false
    const hdtTitle = `${labor || ''} ${proceso || ''}`.trim()
    if (!hdtTitle) return false

    const normHdt = hdtTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
    const normCargo = cargo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")

    if (normHdt.includes(normCargo) || normCargo.includes(normHdt)) {
        return true
    }

    const hdtWords = cleanTitleWords(hdtTitle)
    const cargoWords = cleanTitleWords(cargo)

    if (hdtWords.length === 0 || cargoWords.length === 0) return false

    const hdtStems = hdtWords.map(getWordStem)
    const cargoStems = cargoWords.map(getWordStem)

    for (const cStem of cargoStems) {
        if (cStem.length < 3) continue
        for (const hStem of hdtStems) {
            if (hStem.length < 3) continue
            if (hStem === cStem || hStem.includes(cStem) || cStem.includes(hStem)) {
                return true
            }
            // Shared-prefix check: catches same-root variations with different endings
            // e.g. "pintor" / "pintura", "desmolda" / "desmolde"
            const minLen = Math.min(cStem.length, hStem.length)
            if (minLen >= 5) {
                const prefixLen = Math.max(4, Math.floor(minLen * 0.75))
                if (cStem.substring(0, prefixLen) === hStem.substring(0, prefixLen)) {
                    return true
                }
            }
        }
    }

    return false
}

