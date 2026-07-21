'use client'

import React, { useState, useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { Factory, AlertTriangle, CheckCircle2, XCircle, Info, Award, ShieldAlert, ArrowLeft, BarChart3, ListFilter, Search } from 'lucide-react'
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
    // Try to match bullet points or numbered lists (e.g. "1.", "2.", "•", "-", "*")
    const matches = cleaned.match(/(\b\d+\.|\B\u2022|\B-|\B\*)/g)
    if (matches) return matches.length
    // If no explicit list markers, split by slashes / or newlines to estimate items
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

    // Rubric Scores (Max 100%)
    // 1. Acciones importantes: 20%
    // 2. Pasos importantes: 20%
    // 3. Puntos clave (existentes y <= 3): 20% (if kp > 3, we penalize by 50% for that step)
    // 4. Razones del punto clave: 15%
    // 5. Prohibido y por qué: 12.5%
    // 6. Tratamiento de anomalías: 12.5%

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
                puntosScore += 0.5 // 50% penalty
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

// Normalizes name for matching plants and cargos
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "")      // Alphanumeric only
        .trim()
}

// Flexible matching system for cargo vs labor
function matchesLabor(labor: string | null, cargo: string | null): boolean {
    if (!labor || !cargo) return false
    const l = normalizeString(labor)
    const c = normalizeString(cargo)
    // Direct match or either contains the other
    return l === c || l.includes(c) || c.includes(l)
}

export function HdtStatisticsDashboard({ hdts, hdtSteps, empleados }: Props) {
    // 1. STATE FILTERS
    const [selectedPlant, setSelectedPlant] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showGuide, setShowGuide] = useState(false)

    // Normalize plants data
    const plantsList = useMemo(() => {
        // Collect plants from BOTH employees and HDTs to make sure we cover all bases
        const fromHdts = hdts.map(h => h.planta).filter((p): p is string => !!p)
        const fromEmps = empleados.map(e => e.planta).filter((p): p is string => !!p)
        const combined = Array.from(new Set([...fromHdts, ...fromEmps]))
        
        // Return structured list with normalization helper
        return combined.map(p => {
            // Friendly mapping
            let normalized = p
            if (p.toLowerCase() === 'marmol sintetico') normalized = 'Mármol Sintético'
            if (p.toLowerCase() === 'fibra de vidrio') normalized = 'Fibra de Vidrio'
            return {
                original: p,
                display: normalized
            }
        }).sort((a, b) => a.display.localeCompare(b.display))
    }, [hdts, empleados])

    // Filtered HDT list depending on selected plant
    const hdtsInPlant = useMemo(() => {
        return hdts.filter(h => {
            if (!selectedPlant) return true
            return h.planta && normalizeString(h.planta) === normalizeString(selectedPlant)
        })
    }, [hdts, selectedPlant])

    // Evaluated HDT listings
    const evaluatedHdts = useMemo(() => {
        return hdtsInPlant.map(h => {
            const evalResult = evaluateQuality(h, hdtSteps)
            return {
                ...h,
                ...evalResult
            }
        })
    }, [hdtsInPlant, hdtSteps])

    // Search and filter on evaluated HDT listings
    const searchedHdts = useMemo(() => {
        return evaluatedHdts.filter(h => {
            const q = searchQuery.toLowerCase()
            return (
                (h.codigo && h.codigo.toLowerCase().includes(q)) ||
                (h.labor && h.labor.toLowerCase().includes(q)) ||
                (h.proceso && h.proceso.toLowerCase().includes(q))
            )
        })
    }, [evaluatedHdts, searchQuery])

    // 2. COVERAGE METRICS
    // Computes coverage by checking positions of active employees in target plant
    const coverageData = useMemo(() => {
        if (!selectedPlant) {
            return { percentage: 0, totalCargos: 0, coveredCargos: 0, missingCargos: [], empsCount: 0 }
        }

        // Active employees in target plant
        const activeEmps = empleados.filter(e => e.activo && e.planta && normalizeString(e.planta) === normalizeString(selectedPlant))
        
        // Unique positions (cargos)
        const plantCargos = Array.from(new Set(activeEmps.map(e => e.cargo).filter((c): c is string => !!c)))
        
        // HDTs for this plant
        const plantHdts = hdts.filter(h => h.is_current && h.planta && normalizeString(h.planta) === normalizeString(selectedPlant))

        let coveredCount = 0
        const missingList: string[] = []

        plantCargos.forEach(cargo => {
            const isCovered = plantHdts.some(h => matchesLabor(h.labor, cargo))
            if (isCovered) {
                coveredCount++
            } else {
                missingList.push(cargo)
            }
        })

        const percent = plantCargos.length > 0 ? Math.round((coveredCount / plantCargos.length) * 100) : 0

        return {
            percentage: percent,
            totalCargos: plantCargos.length,
            coveredCargos: coveredCount,
            missingCargos: missingList.sort(),
            empsCount: activeEmps.length
        }
    }, [empleados, hdts, selectedPlant])

    // 3. QUALITY STATS
    const avgQuality = useMemo(() => {
        if (evaluatedHdts.length === 0) return 0
        const total = evaluatedHdts.reduce((sum, h) => sum + h.score, 0)
        return Math.round(total / evaluatedHdts.length)
    }, [evaluatedHdts])

    // Quality distribution (criterias fulfillment rate)
    const criteriaCompliance = useMemo(() => {
        if (evaluatedHdts.length === 0) return []
        const total = evaluatedHdts.length
        let checks = { acciones: 0, pasos: 0, puntos: 0, razon: 0, prohibido: 0, anomalias: 0 }

        evaluatedHdts.forEach(h => {
            if (h.checks.acciones) checks.acciones++
            if (h.checks.pasos) checks.pasos++
            if (h.checks.puntos) checks.puntos++
            if (h.checks.razon) checks.razon++
            if (h.checks.prohibido) checks.prohibido++
            if (h.checks.anomalias) checks.anomalias++
        })

        return [
            { criteria: 'Acciones Imp. (20%)', score: Math.round((checks.acciones / total) * 100) },
            { criteria: 'Pasos Imp. (20%)', score: Math.round((checks.pasos / total) * 100) },
            { criteria: 'Puntos Clave (20%)', score: Math.round((checks.puntos / total) * 100) },
            { criteria: 'Razones (15%)', score: Math.round((checks.razon / total) * 100) },
            { criteria: 'Prohibidos (12.5%)', score: Math.round((checks.prohibido / total) * 100) },
            { criteria: 'Anomalías (12.5%)', score: Math.round((checks.anomalias / total) * 100) },
        ]
    }, [evaluatedHdts])

    // Quality ranges groups for pie chart
    const qualityRangesDistribution = useMemo(() => {
        let excelent = 0 // 90 - 100
        let good = 0 // 70 - 89
        let regular = 0 // 50 - 69
        let deficient = 0 // < 50

        evaluatedHdts.forEach(h => {
            if (h.score >= 90) excelent++
            else if (h.score >= 70) good++
            else if (h.score >= 50) regular++
            else deficient++
        })

        return [
            { name: 'Excelente (90% - 100%)', value: excelent, color: '#10b981' },
            { name: 'Bueno (70% - 89%)', value: good, color: '#3b82f6' },
            { name: 'Regular (50% - 69%)', value: regular, color: '#f59e0b' },
            { name: 'Deficiente (< 50%)', value: deficient, color: '#ef4444' },
        ].filter(r => r.value > 0)
    }, [evaluatedHdts])

    // Average Quality by Plant (if no specific plant is selected)
    const plantQualityChart = useMemo(() => {
        const stats: Record<string, { total: number, count: number }> = {}
        hdts.forEach(h => {
            if (!h.planta) return
            const res = evaluateQuality(h, hdtSteps)
            const cleanPlant = h.planta.toUpperCase()
            if (!stats[cleanPlant]) stats[cleanPlant] = { total: 0, count: 0 }
            stats[cleanPlant].total += res.score
            stats[cleanPlant].count++
        })

        return Object.entries(stats).map(([name, data]) => ({
            name: name === 'MARMOL SINTETICO' ? 'M. Sintético' : name === 'FIBRA DE VIDRIO' ? 'F. Vidrio' : name,
            'Calidad Promedio (%)': Math.round(data.total / data.count)
        })).sort((a, b) => b['Calidad Promedio (%)'] - a['Calidad Promedio (%)'])
    }, [hdts, hdtSteps])

    return (
        <div className="space-y-6 font-sans">
            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                    <Link
                        href="/hdt"
                        className="p-2 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
                        title="Volver al menú de HDT"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#1b4154] flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-[#1b4154]" /> Tablero de Estadísticas de HDT
                        </h1>
                        <p className="text-sm font-medium text-zinc-500 mt-1">
                            Monitoreo de la calidad de estructuración y la cobertura de posiciones operativas.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black border transition-all ${
                            showGuide 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-white text-[#1b4154] border-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        <Info className="h-4 w-4" />
                        Guía de Criterios
                    </button>

                    <div className="relative flex-1 md:flex-initial">
                        <ListFilter className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        <select
                            value={selectedPlant}
                            onChange={(e) => setSelectedPlant(e.target.value)}
                            className="pl-9 pr-8 py-2.5 w-full md:w-56 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold text-[#1b4154] appearance-none cursor-pointer"
                        >
                            <option value="">Todas las Plantas</option>
                            {plantsList.map(p => (
                                <option key={p.original} value={p.original}>
                                    {p.display}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Quality Rubric Interactive Guide */}
            {showGuide && (
                <div className="bg-white border-2 border-brand-primary/20 p-6 rounded-3xl shadow-lg space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 text-[#1b4154]">
                        <Award className="h-6 w-6" />
                        <h2 className="text-xl font-black">Guía del Criterio de Calidad de la HDT (100% Total)</h2>
                    </div>
                    <p className="text-[#2d414d] text-sm leading-relaxed">
                        Para calificar una HDT, evaluamos de forma automatizada la presencia de los 6 pilares estructurales obligatorios. La fórmula es la siguiente:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-medium text-xs">
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-[#1b4154]">1. Acciones Importantes (20%)</span>
                            <p className="text-zinc-500 text-[11px]">Suma puntos si cada paso tiene el instructivo detallado con la acción minuciosa.</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-[#1b4154]">2. Pasos Importantes (20%)</span>
                            <p className="text-zinc-500 text-[11px]">Suma puntos si los pasos tienen actividades cortas de transformación operativa definidas.</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-emerald-600">3. Puntos Clave (20%)</span>
                            <p className="text-zinc-500 text-[11px]">Evalúa responder el "¿cómo?" del paso. **Máximo 3 puntos clave**. Si sobrepasa 3, se aplica penalización.</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-[#1b4154]">4. Razones del Punto Clave (15%)</span>
                            <p className="text-zinc-500 text-[11px]">Explica el porqué o resultado de aplicar el punto clave en cada paso.</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-amber-600">5. Prohibido y por qué (12.5%)</span>
                            <p className="text-zinc-500 text-[11px]">Registros globales de lo que NO se debe hacer y sus consecuencias dentro de la HDT.</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                            <span className="font-bold text-amber-600">6. Tratamiento de Anomalías (12.5%)</span>
                            <p className="text-zinc-500 text-[11px]">Instrucción sobre cómo actuar frente a comportamientos poco probables o fallas.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-150 flex flex-col justify-between min-h-[120px]">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Total HDTs</span>
                    <span className="text-3xl font-black text-[#1b4154] mt-2">{hdtsInPlant.length}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 font-medium">Versiones vigentes</span>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-150 flex flex-col justify-between min-h-[120px]">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Calidad Promedio</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={`text-3xl font-black ${
                            avgQuality >= 85 ? 'text-emerald-600' : avgQuality >= 70 ? 'text-blue-600' : avgQuality >= 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                            {avgQuality}%
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 font-medium">Cumplimiento estructural</span>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-150 flex flex-col justify-between min-h-[120px]">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Cobertura del Puesto</span>
                    {selectedPlant ? (
                        <>
                            <span className="text-3xl font-black text-[#1b4154] mt-2">{coverageData.percentage}%</span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-medium">
                                {coverageData.coveredCargos} de {coverageData.totalCargos} cargos cubiertos
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-sm font-bold text-zinc-400 mt-4 italic">Selecciona una planta</span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-medium">Para calcular cobertura</span>
                        </>
                    )}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-150 flex flex-col justify-between min-h-[120px]">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Puestos Sin HDT</span>
                    {selectedPlant ? (
                        <>
                            <span className={`text-3xl font-black mt-2 ${coverageData.missingCargos.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {coverageData.missingCargos.length}
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-medium">
                                Operando sin estándar formal
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-sm font-bold text-zinc-400 mt-4 italic">Selecciona una planta</span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-medium">Para ver faltantes</span>
                        </>
                    )}
                </div>
            </div>

            {/* Charts View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Average Quality details */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-150 space-y-4">
                    <h3 className="text-lg font-black text-[#1b4154]">Cumplimiento por Criterio Estructural</h3>
                    <div className="h-64 w-full">
                        {evaluatedHdts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={criteriaCompliance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                    <XAxis dataKey="criteria" tick={{ fontSize: 9, fill: '#6b7280' }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(val) => [`${val}%`, 'Cumplimiento']} contentStyle={{ borderRadius: '8px' }} />
                                    <Bar dataKey="score" fill="#1b4154" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {criteriaCompliance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">Sin datos para graficar.</div>
                        )}
                    </div>
                </div>

                {/* Chart 2: Quality Ranges or Quality by plant */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-150 space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-black text-[#1b4154]">
                            {selectedPlant ? 'Rangos de Calidad Distribuida' : 'Calidad Promedio por Planta'}
                        </h3>
                    </div>
                    
                    <div className="h-64 w-full flex items-center justify-center">
                        {selectedPlant ? (
                            qualityRangesDistribution.length > 0 ? (
                                <div className="flex flex-col md:flex-row items-center gap-6 w-full h-full">
                                    <div className="h-full w-full md:w-2/3">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={qualityRangesDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {qualityRangesDistribution.map((entry, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full md:w-1/3 text-xs">
                                        {qualityRangesDistribution.map((entry, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="h-3.5 w-3.5 rounded" style={{ backgroundColor: entry.color }}></div>
                                                <span className="text-zinc-650 font-bold">{entry.name}: <span className="font-extrabold text-[#1b4154]">{entry.value}</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-zinc-400 text-sm">Sin datos para graficar.</div>
                            )
                        ) : (
                            plantQualityChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={plantQualityChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                                        <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(val) => [`${val}%`, 'Calidad Promedio']} contentStyle={{ borderRadius: '8px' }} />
                                        <Bar dataKey="Calidad Promedio (%)" fill="#87a4ac" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                            {plantQualityChart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry['Calidad Promedio (%)'] >= 80 ? '#10b981' : entry['Calidad Promedio (%)'] >= 60 ? '#3b82f6' : '#f59e0b'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-zinc-400 text-sm">Sin datos para graficar.</div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Position Coverage Split Screens (Only when a plant is selected) */}
            {selectedPlant && (
                <div className="bg-white p-6 rounded-3xl border border-zinc-150 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                        <h3 className="text-lg font-black text-[#1b4154]">Análisis de Cobertura de Puestos: {coverageData.totalCargos} Cargos Detectados</h3>
                        <span className="text-xs bg-slate-100 text-slate-600 border px-3 py-1 rounded-full font-bold">
                            Total Empleados Activos: {coverageData.empsCount}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Covered list check */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                                <CheckCircle2 className="h-4.5 w-4.5" /> Puestos Cubiertos por HDT ({coverageData.coveredCargos})
                            </h4>
                            <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-2 text-xs">
                                {coverageData.totalCargos > 0 ? (
                                    coverageData.totalCargos - coverageData.missingCargos.length === 0 ? (
                                        <div className="text-zinc-400 text-center py-8">Ningún cargo cubierto actualmente.</div>
                                    ) : (
                                        // Collect covered list
                                        Array.from(new Set(empleados
                                            .filter(e => e.activo && e.planta && normalizeString(e.planta) === normalizeString(selectedPlant))
                                            .map(e => e.cargo)
                                            .filter((c): c is string => !!c && !coverageData.missingCargos.includes(c))
                                        ))
                                        .sort()
                                        .map((c, i) => {
                                            // Find which HDT covers it
                                            const h = hdtsInPlant.find(h => matchesLabor(h.labor, c))
                                            return (
                                                <div key={i} className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-zinc-100 shadow-sm">
                                                    <span className="font-bold text-zinc-700">{c}</span>
                                                    {h && (
                                                        <span className="text-[10px] font-black text-[#1b4154] uppercase bg-[#1b4154]/5 px-2.5 py-0.5 rounded">
                                                            {h.codigo}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )
                                ) : (
                                    <div className="text-zinc-400 text-center py-8">No hay cargos registrados.</div>
                                )}
                            </div>
                        </div>

                        {/* Missing list alert */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-[#ef4444] text-sm flex items-center gap-1.5">
                                <ShieldAlert className="h-4.5 w-4.5" /> Puestos Faltantes de Estandarizar ({coverageData.missingCargos.length})
                            </h4>
                            <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-2xl p-4 bg-red-50/30 space-y-2 text-xs">
                                {coverageData.missingCargos.length > 0 ? (
                                    coverageData.missingCargos.map((cargo, i) => (
                                        <div key={i} className="flex items-center gap-2 py-2 px-3 bg-white rounded-xl border border-red-100 shadow-sm text-red-700">
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                            <span className="font-bold">{cargo}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-emerald-700 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center font-bold">
                                        🚀 ¡Felicitaciones! Todos los cargos activos están cubiertos por un estándar de HDT.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HDT Quality Table Listing */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-150 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-100">
                    <div>
                        <h3 className="text-lg font-black text-[#1b4154]">Lista de Auditorías de Calidad ({searchedHdts.length})</h3>
                        <p className="text-xs text-zinc-400">Calificación estructural calculada sobre los 6 criterios estándar de trabajo.</p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-450" />
                        <input
                            type="text"
                            placeholder="Buscar código, labor o proceso..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto border border-zinc-200 rounded-2xl">
                    <table className="min-w-full divide-y divider-zinc-200 text-xs">
                        <thead className="bg-zinc-50 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left">Código / Labor</th>
                                <th scope="col" className="px-6 py-4 text-left">Planta / Proceso</th>
                                <th scope="col" className="px-6 py-4 text-center">Calificación</th>
                                <th scope="col" className="px-4 py-4 text-center">Acciones</th>
                                <th scope="col" className="px-4 py-4 text-center">Pasos</th>
                                <th scope="col" className="px-4 py-4 text-center">Puntos Clave</th>
                                <th scope="col" className="px-4 py-4 text-center">Razones</th>
                                <th scope="col" className="px-4 py-4 text-center">Prohibido</th>
                                <th scope="col" className="px-4 py-4 text-center">Anomalías</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-100 font-medium">
                            {searchedHdts.length > 0 ? (
                                searchedHdts.map((hdt) => (
                                    <React.Fragment key={hdt.id}>
                                        <tr className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/hdt/view/${hdt.id}`} className="font-extrabold text-brand-primary hover:underline">
                                                    {hdt.labor || hdt.proceso || 'Sin nombre'}
                                                </Link>
                                                <div className="text-[10px] text-zinc-400 mt-0.5 tracking-wider uppercase font-bold">
                                                    {hdt.codigo} <span className="ml-1 text-[#1b4154] bg-[#1b4154]/5 px-1.5 py-0.5 rounded">V{hdt.version || 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">
                                                <div className="font-bold text-zinc-650">{hdt.planta || 'Sin planta'}</div>
                                                <div className="text-[10px] text-zinc-400 capitalize mt-0.5">{hdt.proceso ? hdt.proceso.toLowerCase() : ''}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-full font-black text-sm ${
                                                    hdt.score >= 90 ? 'bg-emerald-50 text-emerald-600' :
                                                    hdt.score >= 70 ? 'bg-blue-50 text-blue-600' :
                                                    hdt.score >= 50 ? 'bg-amber-50 text-amber-550' : 'bg-red-50 text-red-500'
                                                }`}>
                                                    {hdt.score}%
                                                </span>
                                            </td>
                                            {/* Column Checks */}
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.acciones ? (
                                                    <span className="text-emerald-500 font-black">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300 font-black">✗</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.pasos ? (
                                                    <span className="text-emerald-500 font-black">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300 font-black">✗</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.puntos ? (
                                                    <span className="text-emerald-500 font-black">✓</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="text-zinc-300 font-black">✗</span>
                                                        {hdt.hasExceededPoints && (
                                                            <span title="Excede 3 puntos clave en algún paso.">
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.razon ? (
                                                    <span className="text-emerald-500 font-black">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300 font-black">✗</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.prohibido ? (
                                                    <span className="text-emerald-500 font-black font-sans">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300 font-black">✗</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {hdt.checks.anomalias ? (
                                                    <span className="text-emerald-500 font-black">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300 font-black">✗</span>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Multi-keypoint Warning Display row */}
                                        {hdt.warnings.length > 0 && (
                                            <tr className="bg-amber-50/20 text-[10px] text-amber-700">
                                                <td colSpan={9} className="px-6 py-2 border-b border-zinc-100">
                                                    <div className="flex flex-wrap gap-x-4 items-center">
                                                        <span className="font-bold flex items-center gap-1 text-amber-600">
                                                            <AlertTriangle className="h-3 w-3" /> Advertencias:
                                                        </span>
                                                        {hdt.warnings.map((w, idx) => (
                                                            <span key={idx}>{w}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-zinc-400 text-sm">
                                        No se encontraron HDTs para mostrar con los filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
