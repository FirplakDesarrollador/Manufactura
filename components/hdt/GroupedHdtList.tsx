'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FileText, ChevronDown, History } from 'lucide-react'
import { Database } from '@/lib/hdt/database.types'

type HdtRow = Database['public']['Tables']['hdts']['Row']

interface GroupedHdtListProps {
    groupedHdts: Record<string, HdtRow[]>
    action: string
}

const PROCESO_ORDER = [
    'Alistamiento de moldes',
    'Pintura',
    'Contramoldes',
    'Vaciado',
    'Prensado',
    'Desprensado',
    'Desmolde',
    'Pulido',
    'Acabado',
    'Empaque'
]

export default function GroupedHdtList({ groupedHdts, action }: GroupedHdtListProps) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [showVersionsForCode, setShowVersionsForCode] = useState<Record<string, boolean>>({})

    const toggleGroup = (proceso: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [proceso]: !prev[proceso]
        }))
    }

    const toggleVersions = (e: React.MouseEvent, code: string) => {
        e.preventDefault()
        e.stopPropagation()
        setShowVersionsForCode(prev => ({
            ...prev,
            [code]: !prev[code]
        }))
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedHdts)
                .sort(([a], [b]) => {
                    const cleanA = a.toLowerCase().trim()
                    const cleanB = b.toLowerCase().trim()
                    const indexA = PROCESO_ORDER.findIndex(p => p.toLowerCase().trim() === cleanA)
                    const indexB = PROCESO_ORDER.findIndex(p => p.toLowerCase().trim() === cleanB)

                    if (indexA !== -1 && indexB !== -1) return indexA - indexB
                    if (indexA !== -1) return -1
                    if (indexB !== -1) return 1
                    return cleanA.localeCompare(cleanB)
                })
                .map(([proceso, allItems]) => {
                const isExpanded = expandedGroups[proceso]

                // Agrupar por código para identificar versiones
                const itemsByCode = allItems.reduce((acc, item) => {
                    const code = item.codigo
                    if (!acc[code]) acc[code] = []
                    acc[code].push(item)
                    return acc
                }, {} as Record<string, HdtRow[]>)

                const uniqueCodes = Object.keys(itemsByCode)

                return (
                    <div key={proceso} className="space-y-3">
                        {/* Process Header Button */}
                        <button
                            onClick={() => toggleGroup(proceso)}
                            className="w-full flex items-center gap-4 px-4 py-3 bg-white border-2 border-brand-primary/5 hover:border-brand-primary/20 rounded-2xl shadow-sm transition-all group active:scale-[0.99]"
                        >
                            <div className="h-6 w-1.5 bg-brand-primary rounded-full group-hover:scale-y-125 transition-transform"></div>
                            <div className="flex-1 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-brand-primary transition-colors">
                                        {proceso}
                                    </h3>
                                    <span className="text-[10px] font-bold text-zinc-300 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-100">
                                        {uniqueCodes.length} {uniqueCodes.length === 1 ? 'Labor' : 'Labores'}
                                    </span>
                                </div>
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown className={`h-5 w-5 ${isExpanded ? 'text-brand-primary' : 'text-zinc-300'}`} />
                                </div>
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        <div
                            className={`space-y-4 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[5000px] opacity-100 py-1' : 'max-h-0 opacity-0 py-0'
                                }`}
                        >
                            {uniqueCodes.map((code) => {
                                const versions = itemsByCode[code]
                                const current = versions.find(v => v.is_current) || versions[0]
                                const obsoletes = versions.filter(v => v.id !== current.id)
                                const isShowingVersions = showVersionsForCode[code]

                                return (
                                    <div key={code} className="ml-6 space-y-2">
                                        {/* Main Item Card (Current Version) */}
                                        <div className="relative group/card-wrapper">
                                            <Link
                                                href={`/hdt/${action === 'edit' ? 'edit' : 'view'}/${current.id}`}
                                                className="bg-white border-2 border-transparent hover:border-brand-primary p-6 rounded-2xl flex items-center justify-between hover:shadow-lg transition-all group/card block"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="h-14 w-1 flex-shrink-0 bg-brand-primary/10 group-hover/card:bg-brand-primary rounded-full group-hover/card:scale-y-110 transition-all"></div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-zinc-700 group-hover/card:text-brand-primary transition-colors">
                                                            {current.labor || current.proceso || current.codigo}
                                                        </h3>
                                                        <p className="text-zinc-400 text-sm font-medium mt-1">
                                                            Código: <span className="text-zinc-600 font-bold uppercase">{current.codigo}</span>
                                                            <span className="ml-3 px-2 py-1 bg-brand-primary/5 text-brand-primary rounded-lg text-[10px] uppercase font-black italic">V{current.version || 1} VIGENTE</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {obsoletes.length > 0 && (
                                                        <button
                                                            onClick={(e) => toggleVersions(e, code)}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${isShowingVersions ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:border-zinc-300 hover:text-zinc-600'}`}
                                                        >
                                                            <History className="h-3.5 w-3.5" />
                                                            {isShowingVersions ? 'Cerrar versiones' : `${obsoletes.length} versiones anteriores`}
                                                        </button>
                                                    )}

                                                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover/card:bg-brand-primary group-hover/card:text-white transition-all text-zinc-400 border border-zinc-100 group-hover/card:border-transparent">
                                                        <ChevronRight className="h-6 w-6" />
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Nested Version History */}
                                        {isShowingVersions && obsoletes.length > 0 && (
                                            <div className="ml-12 space-y-2 pt-1 pb-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="h-px flex-1 bg-zinc-100"></div>
                                                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">Versiones Anteriores (Solo lectura)</span>
                                                    <div className="h-px flex-1 bg-zinc-100"></div>
                                                </div>
                                                {obsoletes.map((obs) => (
                                                    <Link
                                                        key={obs.id}
                                                        href={`/hdt/view/${obs.id}`}
                                                        className="bg-zinc-50/30 hover:bg-white border border-dashed border-zinc-200 hover:border-orange-300 p-4 rounded-xl flex items-center justify-between hover:shadow-md transition-all group/subcard"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-1 flex-shrink-0 bg-zinc-200 group-hover/subcard:bg-orange-400 rounded-full transition-all"></div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] font-black text-orange-600 italic bg-orange-50 px-2 py-0.5 rounded border border-orange-100">V{obs.version}</span>
                                                                    <span className="text-sm font-bold text-zinc-500 group-hover/subcard:text-zinc-700">{obs.fecha_elaboracion}</span>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5 uppercase tracking-wider">Obsoleta - Click para Visualizar</p>
                                                            </div>
                                                        </div>
                                                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center group-hover/subcard:bg-orange-500 group-hover/subcard:text-white transition-all text-zinc-300 border border-zinc-100 group-hover/subcard:border-transparent">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

