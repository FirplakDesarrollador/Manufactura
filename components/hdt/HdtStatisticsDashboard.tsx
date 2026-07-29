'use client'

import React, { useState, useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts'
import {
    Factory, AlertTriangle, CheckCircle2, XCircle, Info, Award, ShieldAlert,
    ArrowLeft, Home, BarChart3, Search, Layers, BookOpen, ChevronRight, X, Eye, Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface HdtItem {
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

interface HdtStep {
    id: string
    hdt_id: string
    step_no: number | null
    acciones_importantes: string | null
    paso_importante: string | null
    punto_clave: string | null
    razon_punto_clave: string | null
}

interface Empleado {
    nombreCompleto: string
    cargo: string | null
    planta: string | null
    activo: boolean
}

interface Props {
    hdts: HdtItem[]
    hdtSteps: HdtStep[]
    empleados: Empleado[]
}

const COLORS = ['#1b4154', '#87a4ac', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

// Helper to count key points in a string (supports numbered, bulleted, and custom lists)
function countKeyPoints(text: string | null): number {
    if (!text) return 0
    const cleaned = text.trim()
    if (!cleaned) return 0
    const matches = cleaned.match(/(\b\d+\.|\B\u2022|\B-|\B\*)/g)
    if (matches) return matches.length
    const parts = cleaned.split(/[\n/]/).map(p => p.trim()).filter(p => p.length > 5)
    return Math.max(1, parts.length)
}

// Scans an HDT and evaluates its quality based on standard criteria
function evaluateQuality(hdt: HdtItem, steps: HdtStep[]) {
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

type EvaluatedHdt = HdtItem & ReturnType<typeof evaluateQuality>

function normalizeString(str: string): string {
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

function matchesLabor(labor: string | null, cargo: string | null, proceso?: string | null): boolean {
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

export function HdtStatisticsDashboard({ hdts, hdtSteps, empleados }: Props) {
    // 1. NAVIGATION AND LEVEL DRILL-DOWN STATES
    const [activeTab, setActiveTab] = useState<'cobertura' | 'calidad'>('cobertura')
    const [selectedPlantForCoverage, setSelectedPlantForCoverage] = useState<string | null>(null)
    const [selectedPlantForQuality, setSelectedPlantForQuality] = useState<string | null>(null)
    const [selectedHdtForDetail, setSelectedHdtForDetail] = useState<EvaluatedHdt | null>(null)

    const [plantSearchQuery, setPlantSearchQuery] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [qualityFilter, setQualityFilter] = useState<'all' | 'excellent' | 'good' | 'regular' | 'deficient'>('all')
    const [showGuide, setShowGuide] = useState(false)

    // Current active HDTs
    const activeHdts = useMemo(() => hdts.filter(h => h.is_current), [hdts])

    // Evaluated HDTs
    const evaluatedHdts = useMemo(() => {
        return activeHdts.map(h => ({
            ...h,
            ...evaluateQuality(h, hdtSteps)
        }))
    }, [activeHdts, hdtSteps])

    // Unique list of plants normalized
    const plantsList = useMemo(() => {
        const fromHdts = activeHdts.map(h => h.planta).filter((p): p is string => !!p)
        const fromEmps = empleados.map(e => e.planta).filter((p): p is string => !!p)
        const combined = Array.from(new Set([...fromHdts, ...fromEmps]))

        return combined.map(p => {
            let normalized = p
            if (p.toLowerCase() === 'marmol sintetico') normalized = 'Mármol Sintético'
            if (p.toLowerCase() === 'fibra de vidrio') normalized = 'Fibra de Vidrio'
            return {
                original: p,
                display: normalized
            }
        }).sort((a, b) => a.display.localeCompare(b.display))
    }, [activeHdts, empleados])

    // Overall KPI statistics
    const totalHdtsCount = activeHdts.length
    const distinctPlantsCount = plantsList.length
    const overallQualityAvg = useMemo(() => {
        if (evaluatedHdts.length === 0) return 0
        const total = evaluatedHdts.reduce((sum, h) => sum + h.score, 0)
        return Math.round(total / evaluatedHdts.length)
    }, [evaluatedHdts])

    const excellentCount = useMemo(() => {
        return evaluatedHdts.filter(h => h.score >= 90).length
    }, [evaluatedHdts])

    // HDTs count grouped per plant for summary progress bars
    const plantBreakdownList = useMemo(() => {
        const statsMap: Record<string, { count: number; display: string; totalScore: number }> = {}

        plantsList.forEach(p => {
            statsMap[normalizeString(p.original)] = { count: 0, display: p.display, totalScore: 0 }
        })

        evaluatedHdts.forEach(h => {
            if (!h.planta) return
            const norm = normalizeString(h.planta)
            if (!statsMap[norm]) {
                statsMap[norm] = { count: 0, display: h.planta, totalScore: 0 }
            }
            statsMap[norm].count++
            statsMap[norm].totalScore += h.score
        })

        const maxCount = Math.max(...Object.values(statsMap).map(s => s.count), 1)

        return Object.entries(statsMap).map(([key, data]) => ({
            key,
            display: data.display,
            count: data.count,
            avgQuality: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
            pctWidth: Math.round((data.count / maxCount) * 100)
        })).sort((a, b) => b.count - a.count)
    }, [plantsList, evaluatedHdts])

    // Coverage data for a selected plant (when in Cobertura detail mode)
    const plantCoverageDetail = useMemo(() => {
        if (!selectedPlantForCoverage) return null

        const normSelected = normalizeString(selectedPlantForCoverage)
        const activeEmps = empleados.filter(e => e.activo && e.planta && normalizeString(e.planta) === normSelected)
        const plantCargos = Array.from(new Set(activeEmps.map(e => e.cargo).filter((c): c is string => !!c)))
        const plantHdts = activeHdts.filter(h => h.planta && normalizeString(h.planta) === normSelected)

        let coveredCount = 0
        const missingList: string[] = []

        plantCargos.forEach(cargo => {
            const isCovered = plantHdts.some(h => matchesLabor(h.labor, cargo, h.proceso))
            if (isCovered) {
                coveredCount++
            } else {
                missingList.push(cargo)
            }
        })

        const percent = plantCargos.length > 0 ? Math.round((coveredCount / plantCargos.length) * 100) : 0

        return {
            plantName: selectedPlantForCoverage,
            percentage: percent,
            totalCargos: plantCargos.length,
            coveredCargos: coveredCount,
            missingCargos: missingList.sort(),
            empsCount: activeEmps.length
        }
    }, [selectedPlantForCoverage, empleados, activeHdts])

    // Filtered plant lists by search query
    const filteredPlantBreakdownList = useMemo(() => {
        if (!plantSearchQuery.trim()) return plantBreakdownList
        const q = normalizeString(plantSearchQuery)
        return plantBreakdownList.filter(p => normalizeString(p.display).includes(q))
    }, [plantBreakdownList, plantSearchQuery])

    // Quality stats grouped per plant (for Calidad tab level 1)
    const plantQualitySummaryList = useMemo(() => {
        return plantBreakdownList.map(p => {
            const plantHdts = evaluatedHdts.filter(h => h.planta && normalizeString(h.planta) === p.key)
            const excellent = plantHdts.filter(h => h.score >= 90).length
            const good = plantHdts.filter(h => h.score >= 70 && h.score < 90).length
            const regular = plantHdts.filter(h => h.score >= 50 && h.score < 70).length
            const deficient = plantHdts.filter(h => h.score < 50).length

            return {
                ...p,
                totalHdts: plantHdts.length,
                excellent,
                good,
                regular,
                deficient
            }
        })
    }, [plantBreakdownList, evaluatedHdts])

    const filteredPlantQualitySummaryList = useMemo(() => {
        if (!plantSearchQuery.trim()) return plantQualitySummaryList
        const q = normalizeString(plantSearchQuery)
        return plantQualitySummaryList.filter(p => normalizeString(p.display).includes(q))
    }, [plantQualitySummaryList, plantSearchQuery])

    // Filtered HDT list for selected plant in Calidad tab (level 2)
    const plantHdtsQualityList = useMemo(() => {
        if (!selectedPlantForQuality) return []

        const normSelected = normalizeString(selectedPlantForQuality)
        return evaluatedHdts.filter(h => {
            if (!h.planta || normalizeString(h.planta) !== normSelected) return false

            if (qualityFilter === 'excellent' && h.score < 90) return false
            if (qualityFilter === 'good' && (h.score < 70 || h.score >= 90)) return false
            if (qualityFilter === 'regular' && (h.score < 50 || h.score >= 70)) return false
            if (qualityFilter === 'deficient' && h.score >= 50) return false

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase()
                return (
                    (h.codigo && h.codigo.toLowerCase().includes(q)) ||
                    (h.labor && h.labor.toLowerCase().includes(q)) ||
                    (h.proceso && h.proceso.toLowerCase().includes(q))
                )
            }

            return true
        })
    }, [selectedPlantForQuality, evaluatedHdts, qualityFilter, searchQuery])

    return (
        <div className="space-y-6 font-sans pb-12">
            {/* Header Layout matching exact mockup */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                    <Link
                        href="/hdt"
                        className="p-2 rounded-[14px] border border-zinc-200 bg-white text-[#1b4154] hover:bg-zinc-50 font-bold transition-all shadow-sm flex items-center justify-center"
                        title="Volver al módulo HDT"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <Link
                        href="/"
                        className="p-2 rounded-[14px] border border-zinc-200 bg-white text-[#1b4154] hover:bg-zinc-50 font-bold transition-all shadow-sm flex items-center justify-center"
                        title="Ir al Inicio"
                    >
                        <Home className="h-5 w-5" />
                    </Link>
                </div>

                <div className="flex-1 text-center md:text-left md:ml-4">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1b4154] flex items-center justify-center md:justify-start gap-2.5">
                        <BarChart3 className="h-7 w-7 text-[#1b4154]" /> Estadísticas HDT
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            showGuide 
                                ? 'bg-[#1b4154] text-white border-[#1b4154]' 
                                : 'bg-white text-[#1b4154] border-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        <Info className="h-3.5 w-3.5" />
                        Guía de Criterios
                    </button>
                    <div className="text-xs font-black tracking-wider text-zinc-400 uppercase bg-zinc-100/80 px-3.5 py-2 rounded-xl border border-zinc-200/50">
                        {totalHdtsCount} HDTS ACTIVAS
                    </div>
                </div>
            </div>

            {/* Rubric Criteria Guide Modal/Drawer */}
            {showGuide && (
                <div className="bg-white border border-zinc-200 p-5 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#1b4154]">
                            <Award className="h-4 w-4" />
                            <h2 className="text-sm font-black">Guía del Criterio de Calidad de la HDT</h2>
                            <span className="text-[11px] font-bold text-zinc-400">— 100% Total</span>
                        </div>
                        <button onClick={() => setShowGuide(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {[
                            { n: 1, title: 'Acciones Importantes', pct: '20%', desc: 'Suma puntos si cada paso tiene el instructivo detallado con la acción minuciosa.' },
                            { n: 2, title: 'Pasos Importantes',    pct: '20%', desc: 'Suma puntos si los pasos tienen actividades cortas de transformación operativa definidas.' },
                            { n: 3, title: 'Puntos Clave',         pct: '20%', desc: 'Evalúa responder el "¿cómo?" del paso.', warn: 'Máx. 3 puntos clave. Si sobrepasa, se penaliza.' },
                            { n: 4, title: 'Razones del Punto Clave', pct: '15%', desc: 'Explica el porqué o resultado de aplicar el punto clave en cada paso.' },
                            { n: 5, title: 'Prohibido y por qué', pct: '12.5%', desc: 'Registros de lo que NO se debe hacer y sus consecuencias dentro de la HDT.' },
                            { n: 6, title: 'Tratamiento de Anomalías', pct: '12.5%', desc: 'Instrucción sobre cómo actuar frente a comportamientos poco probables o fallas.' },
                        ].map(({ n, title, pct, desc, warn }) => (
                            <div key={n} className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md bg-[#1b4154] flex items-center justify-center text-white text-[10px] font-black shrink-0">{n}</span>
                                        <span className="font-bold text-[#1b4154] text-xs">{title}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-zinc-500">{pct}</span>
                                </div>
                                <p className="text-zinc-500 text-[11px] leading-relaxed">{desc}</p>
                                {warn && (
                                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-amber-700">{warn}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TOP 4 KPI CARDS (Matching user mockup layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: TOTAL HDTS */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200/80 flex flex-col justify-between min-h-[125px]">
                    <span className="text-zinc-400 font-extrabold uppercase tracking-wider text-[11px]">TOTAL HDTS</span>
                    <div className="mt-2">
                        <span className="text-3xl md:text-4xl font-black text-[#1b4154]">{totalHdtsCount}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1 font-medium">versiones vigentes</span>
                </div>

                {/* Card 2: PLANTAS */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200/80 flex flex-col justify-between min-h-[125px]">
                    <span className="text-zinc-400 font-extrabold uppercase tracking-wider text-[11px]">PLANTAS</span>
                    <div className="mt-2">
                        <span className="text-3xl md:text-4xl font-black text-[#1b4154]">{distinctPlantsCount}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1 font-medium">con HDTs activas</span>
                </div>

                {/* Card 3: CALIDAD PROM. */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200/80 flex flex-col justify-between min-h-[125px]">
                    <span className="text-zinc-400 font-extrabold uppercase tracking-wider text-[11px]">CALIDAD PROM.</span>
                    <div className="mt-2">
                        <span className={`text-3xl md:text-4xl font-black ${
                            overallQualityAvg >= 85 ? 'text-emerald-600' : overallQualityAvg >= 70 ? 'text-blue-600' : overallQualityAvg >= 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                            {overallQualityAvg}%
                        </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1 font-medium">
                        {overallQualityAvg >= 85 ? 'Excelente' : overallQualityAvg >= 70 ? 'Buena' : overallQualityAvg >= 50 ? 'Regular' : 'Deficiente'}
                    </span>
                </div>

                {/* Card 4: EXCELENTES (Featured Card with Green Border) */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-emerald-400/80 flex flex-col justify-between min-h-[125px]">
                    <span className="text-emerald-600 font-black uppercase tracking-wider text-[11px]">EXCELENTES</span>
                    <div className="mt-2">
                        <span className="text-3xl md:text-4xl font-black text-emerald-600">{excellentCount}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold mt-1">sobre 90%</span>
                </div>
            </div>

            {/* TAB BAR NAVIGATION (Exact mockup design) */}
            <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-2xl border border-zinc-200/80 shadow-sm inline-flex items-center gap-2">
                    <button
                        onClick={() => {
                            setActiveTab('cobertura')
                            setSelectedPlantForCoverage(null)
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                            activeTab === 'cobertura'
                                ? 'bg-[#1b4154] text-white shadow-md'
                                : 'text-zinc-600 hover:text-[#1b4154] hover:bg-zinc-50'
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        <span>Cobertura del Puesto</span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('calidad')
                            setSelectedPlantForQuality(null)
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                            activeTab === 'calidad'
                                ? 'bg-[#1b4154] text-white shadow-md'
                                : 'text-zinc-600 hover:text-[#1b4154] hover:bg-zinc-50'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        <span>Calidad de la HDT</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}

            {/* TAB 1: COBERTURA DEL PUESTO */}
            {activeTab === 'cobertura' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {!selectedPlantForCoverage ? (
                        /* Level 1: HDTS POR PLANTA (Progress bar view matching mockup) */
                        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
                                <h3 className="text-sm font-black tracking-wide text-[#1b4154] flex items-center gap-2 uppercase">
                                    <Layers className="h-4 w-4 text-[#1b4154]" /> HDTS POR PLANTA
                                </h3>

                                <div className="flex items-center gap-3">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar planta..."
                                            value={plantSearchQuery}
                                            onChange={(e) => setPlantSearchQuery(e.target.value)}
                                            className="pl-8 pr-8 py-1.5 w-full border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1b4154] focus:outline-none bg-white font-medium"
                                        />
                                        {plantSearchQuery && (
                                            <button onClick={() => setPlantSearchQuery('')} className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="hidden lg:inline text-xs text-zinc-400 font-medium">Haz clic en una planta para ver su cobertura</span>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {filteredPlantBreakdownList.length > 0 ? (
                                    filteredPlantBreakdownList.map((plant) => (
                                        <div
                                            key={plant.key}
                                            onClick={() => setSelectedPlantForCoverage(plant.display)}
                                            className="group cursor-pointer space-y-2 p-3 rounded-2xl hover:bg-zinc-50/80 transition-all border border-transparent hover:border-zinc-200/60"
                                        >
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-extrabold text-[#1b4154] group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                    {plant.display}
                                                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </span>
                                                <span className="font-black text-[#1b4154] text-xs">
                                                    {plant.count} <span className="font-bold text-zinc-500">HDTs</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-[#1b4154] h-full rounded-full transition-all duration-500 group-hover:bg-blue-600"
                                                    style={{ width: `${plant.pctWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-zinc-400 text-xs font-medium">
                                        No se encontraron plantas que coincidan con "{plantSearchQuery}".
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Level 2: DETALLE DE COBERTURA DE LA PLANTA SELECCIONADA */
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-200">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setSelectedPlantForCoverage(null)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-[#1b4154] font-bold text-xs hover:bg-zinc-50 transition-all"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Volver a HDTs por Planta
                                </button>
                                <span className="text-sm font-black text-[#1b4154]">
                                    Planta: <span className="text-blue-600">{selectedPlantForCoverage}</span>
                                </span>
                            </div>

                            {plantCoverageDetail && (
                                <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Cobertura de Puestos</span>
                                            <div className="text-3xl font-black text-[#1b4154] mt-1">
                                                {plantCoverageDetail.percentage}%
                                            </div>
                                            <span className="text-[11px] text-zinc-400">
                                                {plantCoverageDetail.coveredCargos} de {plantCoverageDetail.totalCargos} cargos cubiertos
                                            </span>
                                        </div>
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Personal Activo</span>
                                            <div className="text-3xl font-black text-[#1b4154] mt-1">
                                                {plantCoverageDetail.empsCount}
                                            </div>
                                            <span className="text-[11px] text-zinc-400">empleados en sistema</span>
                                        </div>
                                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                                            <span className="text-xs font-bold text-red-600 uppercase">Puestos Sin HDT</span>
                                            <div className="text-3xl font-black text-red-600 mt-1">
                                                {plantCoverageDetail.missingCargos.length}
                                            </div>
                                            <span className="text-[11px] text-red-500 font-medium">requieren estandarizar</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Puestos Cubiertos */}
                                        <div className="space-y-3">
                                            <h4 className="font-extrabold text-emerald-600 text-sm flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" /> Puestos Cubiertos por HDT ({plantCoverageDetail.coveredCargos})
                                            </h4>
                                            <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-2xl p-3 bg-zinc-50/30 space-y-2 text-xs">
                                                {plantCoverageDetail.totalCargos - plantCoverageDetail.missingCargos.length === 0 ? (
                                                    <div className="text-zinc-400 text-center py-6">Ningún cargo cubierto actualmente.</div>
                                                ) : (
                                                    Array.from(new Set(empleados
                                                        .filter(e => e.activo && e.planta && normalizeString(e.planta) === normalizeString(selectedPlantForCoverage))
                                                        .map(e => e.cargo)
                                                        .filter((c): c is string => !!c && !plantCoverageDetail.missingCargos.includes(c))
                                                    ))
                                                    .sort()
                                                    .map((c, i) => {
                                                        const h = activeHdts.find(h => h.planta && normalizeString(h.planta) === normalizeString(selectedPlantForCoverage) && matchesLabor(h.labor, c, h.proceso))
                                                        return (
                                                            <div key={i} className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-zinc-150 shadow-sm">
                                                                <span className="font-bold text-zinc-700">{c}</span>
                                                                {h && (
                                                                    <Link
                                                                        href={`/hdt/view/${h.id}`}
                                                                        title="Ver HDT"
                                                                        className="text-[10px] font-black text-[#1b4154] uppercase bg-[#1b4154]/5 hover:bg-[#1b4154] hover:text-white px-2.5 py-0.5 rounded transition-colors"
                                                                    >
                                                                        {h.codigo}
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Puestos Faltantes */}
                                        <div className="space-y-3">
                                            <h4 className="font-extrabold text-red-600 text-sm flex items-center gap-2">
                                                <ShieldAlert className="h-4 w-4" /> Puestos Faltantes ({plantCoverageDetail.missingCargos.length})
                                            </h4>
                                            <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-2xl p-3 bg-red-50/20 space-y-2 text-xs">
                                                {plantCoverageDetail.missingCargos.length > 0 ? (
                                                    plantCoverageDetail.missingCargos.map((cargo, i) => (
                                                        <div key={i} className="flex items-center gap-2 py-2 px-3 bg-white rounded-xl border border-red-100 shadow-sm text-red-700 font-bold">
                                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                            <span>{cargo}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-emerald-700 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center font-bold">
                                                        🚀 ¡Todos los cargos activos en esta planta están estandarizados!
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: CALIDAD DE LA HDT */}
            {activeTab === 'calidad' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {!selectedPlantForQuality ? (
                        /* Level 1: RESUMEN DE CALIDAD POR PLANTA */
                        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
                                <h3 className="text-sm font-black tracking-wide text-[#1b4154] flex items-center gap-2 uppercase">
                                    <BookOpen className="h-4 w-4 text-[#1b4154]" /> RESUMEN DE CALIDAD HDT POR PLANTA
                                </h3>

                                <div className="flex items-center gap-3">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar planta..."
                                            value={plantSearchQuery}
                                            onChange={(e) => setPlantSearchQuery(e.target.value)}
                                            className="pl-8 pr-8 py-1.5 w-full border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1b4154] focus:outline-none bg-white font-medium"
                                        />
                                        {plantSearchQuery && (
                                            <button onClick={() => setPlantSearchQuery('')} className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="hidden lg:inline text-xs text-zinc-400 font-medium">Haz clic en una planta para ver la calificación de sus HDTs</span>
                                </div>
                            </div>

                            <div className="p-6">
                                {filteredPlantQualitySummaryList.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredPlantQualitySummaryList.map((p) => (
                                            <div
                                                key={p.key}
                                                onClick={() => setSelectedPlantForQuality(p.display)}
                                                className="group cursor-pointer bg-white p-5 rounded-2xl border border-zinc-200/80 hover:border-blue-500 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-black text-[#1b4154] group-hover:text-blue-600 transition-colors text-base">
                                                            {p.display}
                                                        </h4>
                                                        <span className="text-xs text-zinc-400 font-medium">{p.totalHdts} HDTs registradas</span>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                                                        p.avgQuality >= 85 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        p.avgQuality >= 70 ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                        p.avgQuality >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'
                                                    }`}>
                                                        {p.avgQuality}% Prom.
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 text-xs font-medium">
                                                    <div className="flex justify-between text-zinc-500 text-[11px]">
                                                        <span>Excelentes (≥90%):</span>
                                                        <span className="font-bold text-emerald-600">{p.excellent}</span>
                                                    </div>
                                                    <div className="flex justify-between text-zinc-500 text-[11px]">
                                                        <span>Buenas (70-89%):</span>
                                                        <span className="font-bold text-blue-600">{p.good}</span>
                                                    </div>
                                                    <div className="flex justify-between text-zinc-500 text-[11px]">
                                                        <span>Regulares o por mejorar:</span>
                                                        <span className="font-bold text-amber-600">{p.regular + p.deficient}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                                                    <span>Ver HDTs de esta planta</span>
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-zinc-400 text-xs font-medium">
                                        No se encontraron plantas que coincidan con "{plantSearchQuery}".
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Level 2: LISTA Y AUDITORÍA DE HDTs DE LA PLANTA SELECCIONADA */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <button
                                    onClick={() => setSelectedPlantForQuality(null)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-[#1b4154] font-bold text-xs hover:bg-zinc-50 transition-all"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Volver a Resumen de Plantas
                                </button>
                                <h3 className="text-lg font-black text-[#1b4154]">
                                    Calidad HDT en Planta: <span className="text-blue-600">{selectedPlantForQuality}</span> ({plantHdtsQualityList.length})
                                </h3>
                            </div>

                            {/* Filters Bar */}
                            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por código, labor o proceso..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1b4154] focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => setQualityFilter('all')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            qualityFilter === 'all' ? 'bg-[#1b4154] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                        }`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        onClick={() => setQualityFilter('excellent')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            qualityFilter === 'excellent' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                        Excelentes (≥90%)
                                    </button>
                                    <button
                                        onClick={() => setQualityFilter('good')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            qualityFilter === 'good' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                    >
                                        Buenas (70-89%)
                                    </button>
                                    <button
                                        onClick={() => setQualityFilter('regular')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            qualityFilter === 'regular' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        }`}
                                    >
                                        Regulares (&lt;70%)
                                    </button>
                                </div>
                            </div>

                            {/* HDT Table listing */}
                            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                                        <thead className="bg-zinc-50 font-extrabold text-zinc-500 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th scope="col" className="px-6 py-4 text-left">Código / Labor</th>
                                                <th scope="col" className="px-6 py-4 text-left">Proceso</th>
                                                <th scope="col" className="px-6 py-4 text-center">Calificación</th>
                                                <th scope="col" className="px-3 py-4 text-center">Acciones</th>
                                                <th scope="col" className="px-3 py-4 text-center">Pasos</th>
                                                <th scope="col" className="px-3 py-4 text-center">Puntos Clave</th>
                                                <th scope="col" className="px-3 py-4 text-center">Razones</th>
                                                <th scope="col" className="px-3 py-4 text-center">Prohibido</th>
                                                <th scope="col" className="px-3 py-4 text-center">Anomalías</th>
                                                <th scope="col" className="px-4 py-4 text-center">Detalles</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-zinc-150 font-medium">
                                            {plantHdtsQualityList.length > 0 ? (
                                                plantHdtsQualityList.map((hdt) => (
                                                    <tr key={hdt.id} className="hover:bg-zinc-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <Link href={`/hdt/view/${hdt.id}`} className="group block">
                                                                <div className="font-extrabold text-[#1b4154] group-hover:text-blue-600 transition-colors text-sm flex items-center gap-1">
                                                                    {hdt.labor || hdt.proceso || 'Sin nombre'}
                                                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mt-0.5">
                                                                    {hdt.codigo} <span className="ml-1 bg-zinc-100 text-[#1b4154] px-1.5 py-0.5 rounded">V{hdt.version || 1}</span>
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 capitalize">
                                                            {hdt.proceso ? hdt.proceso.toLowerCase() : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1.5 rounded-full font-black text-xs ${
                                                                hdt.score >= 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                hdt.score >= 70 ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                                hdt.score >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'
                                                            }`}>
                                                                {hdt.score}%
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.acciones ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.pasos ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.puntos ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.razon ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.prohibido ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            {hdt.checks.anomalias ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-zinc-300 font-black">✗</span>}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <button
                                                                onClick={() => setSelectedHdtForDetail(hdt)}
                                                                className="p-1.5 rounded-lg bg-zinc-100 text-[#1b4154] hover:bg-[#1b4154] hover:text-white transition-all font-bold"
                                                                title="Ver desglose de puntuación"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center text-zinc-400 text-sm">
                                                        No se encontraron HDTs para mostrar.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DETALLE INDIVIDUAL DE HDT */}
            {selectedHdtForDetail && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 p-6 space-y-5 animate-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-start pb-3 border-b border-zinc-150">
                            <div>
                                <h3 className="text-lg font-black text-[#1b4154]">
                                    {selectedHdtForDetail.labor || selectedHdtForDetail.proceso || 'HDT'}
                                </h3>
                                <div className="text-xs text-zinc-400 font-bold mt-0.5">
                                    Código: <span className="text-[#1b4154]">{selectedHdtForDetail.codigo}</span> | Planta: <span className="text-[#1b4154]">{selectedHdtForDetail.planta}</span>
                                </div>
                            </div>
                            <Link
                                href={`/hdt/view/${selectedHdtForDetail.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b4154] text-white text-xs font-bold hover:bg-[#1b4154]/80 transition-colors"
                            >
                                <Eye className="h-3.5 w-3.5" /> Ver HDT
                            </Link>
                            <button
                                onClick={() => setSelectedHdtForDetail(null)}
                                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Overall Score Badge */}
                        <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border border-zinc-200/60">
                            <span className="text-sm font-extrabold text-zinc-600">Calificación de Calidad:</span>
                            <span className={`px-4 py-1.5 rounded-full text-lg font-black ${
                                selectedHdtForDetail.score >= 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                selectedHdtForDetail.score >= 70 ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                selectedHdtForDetail.score >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                                {selectedHdtForDetail.score}%
                            </span>
                        </div>

                        {/* Criteria Score Breakdown */}
                        <div className="space-y-2.5 text-xs">
                            <h4 className="font-black text-[#1b4154] uppercase tracking-wider text-[11px]">Desglose por Criterio:</h4>

                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Acciones Importantes (20%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.acciones} / 20 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Pasos Importantes (20%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.pasos} / 20 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Puntos Clave (20%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.puntos} / 20 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Razones del Punto Clave (15%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.razon} / 15 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Prohibido y Por Qué (12.5%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.prohibido} / 12.5 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl">
                                <span>Tratamiento de Anomalías (12.5%):</span>
                                <span className="font-extrabold text-[#1b4154]">{selectedHdtForDetail.breakdown.anomalias} / 12.5 pts</span>
                            </div>
                        </div>

                        {/* Warnings section if any */}
                        {selectedHdtForDetail.warnings.length > 0 && (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 space-y-1">
                                <div className="font-bold flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Observaciones encontradas:
                                </div>
                                {selectedHdtForDetail.warnings.map((w, idx) => (
                                    <div key={idx} className="text-[11px] font-medium">• {w}</div>
                                ))}
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-3">
                            <Link
                                href={`/hdt/view/${selectedHdtForDetail.id}`}
                                className="px-5 py-2.5 bg-[#1b4154] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Eye className="h-4 w-4" /> Ir a la HDT
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
