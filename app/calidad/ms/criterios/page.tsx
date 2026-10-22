'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Maximize2, Search, X } from 'lucide-react'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
import type { Defecto as CriterioCalidad } from '@/components/calidad/DefectModal'

interface DefectoMS {
    id: number
    Defecto?: string
    defecto?: string
    nombre?: string
    Nombre?: string
}

// Quita el prefijo numérico "12. " o "12 - " del nombre
const cleanName = (name: string) => (name || '').replace(/^\s*\d+[\.\-\s]+/, '').trim()

// Consulta (solo lectura) de los criterios de calidad MS con la misma cuadrícula del registro en línea
export default function CriteriosCalidadMsPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | undefined>()
    const [defects, setDefects] = useState<DefectoMS[]>([])
    const [criterios, setCriterios] = useState<CriterioCalidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserEmail(user.email)

            const [defRes, critRes] = await Promise.all([
                supabase.from('ms_defectos').select('*').order('id'),
                supabase.from('criterios_calidad_plantas').select('*').eq('planta', 'Ms')
            ])
            if (defRes.error) console.warn('Error cargando ms_defectos:', defRes.error)
            if (critRes.error) console.warn('Error cargando criterios_calidad_plantas:', critRes.error)
            setDefects(defRes.data || [])
            setCriterios(critRes.data || [])
            setLoading(false)
        }
        void load()
    }, [router])

    // Cada defecto de MS con su criterio: el código del criterio es el número del defecto
    // (numeración unificada con unificar_criterios_ms.sql)
    const items = useMemo(() => {
        const byCode = new Map(criterios.map(c => [String(c.codigo).trim(), c]))
        return defects.map(d => {
            const rawName = d.Defecto || d.defecto || d.nombre || d.Nombre || 'Defecto'
            return { id: d.id, nombre: cleanName(rawName), criterio: byCode.get(String(d.id)) || null }
        })
    }, [defects, criterios])

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return items
        return items.filter(i =>
            String(i.id).includes(term) ||
            i.nombre.toLowerCase().includes(term) ||
            (i.criterio?.responsable || '').toLowerCase().includes(term)
        )
    }, [items, searchTerm])

    const conCriterio = items.filter(i => i.criterio).length

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Header
                title="Calidad MS"
                subtitle=""
                compact={true}
                userEmail={userEmail}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />

            {/* Control Bar */}
            <div className="bg-gray-50 border-b border-gray-200 h-14 sticky top-[56px] z-40 flex items-center shadow-xs">
                <div className="max-w-[1800px] w-full mx-auto px-4 flex items-center justify-between relative h-full">
                    <div className="flex items-center gap-3 max-w-[560px] xl:max-w-[640px] flex-1">
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="BUSCAR DEFECTO, NÚMERO O RESPONSABLE"
                                className="w-full h-10 bg-white border border-gray-300 rounded pl-9 pr-3 text-[#254153] font-bold text-xs md:text-sm focus:border-[#254153] outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-20">
                        <CalidadMsNavButtons activeTab="criterios" hasSettingsPermission={true} />
                    </div>

                    <div className="flex items-center ml-auto shrink-0">
                        <span className="text-sm font-bold text-gray-800">
                            Criterios: {conCriterio} / {items.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <main className="flex-1 w-full bg-white p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#254153] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                        {filteredItems.map(item => {
                            const isOpen = expandedId === item.id
                            const c = item.criterio
                            return (
                                <React.Fragment key={item.id}>
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : item.id)}
                                        className={`p-3 border transition-all duration-200 flex flex-col justify-between w-full text-left min-h-[90px] ${
                                            isOpen
                                                ? 'bg-[#324354] border-[#324354] text-white shadow-md'
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <h3 className="text-sm font-medium leading-tight mb-2">
                                            {item.id}. {item.nombre}
                                        </h3>
                                        <div className="flex items-center justify-between gap-2 mt-auto">
                                            <span className={`text-[10px] font-bold truncate ${isOpen ? 'text-white/70' : 'text-gray-400'}`}>
                                                {c ? (c.responsable || 'Sin responsable') : 'Sin criterio registrado'}
                                            </span>
                                            {c && (
                                                <span className="flex gap-0.5 shrink-0" title="Zonas definidas">
                                                    <span className={`w-2 h-2 rounded-full ${c.rojo ? 'bg-red-500' : 'bg-gray-200'}`} />
                                                    <span className={`w-2 h-2 rounded-full ${c.naranja ? 'bg-amber-500' : 'bg-gray-200'}`} />
                                                    <span className={`w-2 h-2 rounded-full ${c.amarillo ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                                                    <span className={`w-2 h-2 rounded-full ${c.verde ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Panel de detalle a lo ancho de la cuadrícula */}
                                    {isOpen && (
                                        <div className="col-span-full bg-white rounded-2xl p-5 border-2 border-[#324354] shadow-xl my-1">
                                            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                                                <div>
                                                    <span className="text-xs font-black text-[#324354] bg-[#324354]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                        Defecto {item.id} • Mármol Sintético
                                                    </span>
                                                    <h3 className="text-xl font-black text-[#324354] mt-2">{item.nombre}</h3>
                                                </div>
                                                <button
                                                    onClick={() => setExpandedId(null)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#324354] text-xs font-bold rounded-xl transition flex items-center gap-1"
                                                >
                                                    <X size={14} />
                                                    <span>Cerrar</span>
                                                </button>
                                            </div>

                                            {!c ? (
                                                <p className="text-sm text-slate-500 font-medium py-6 text-center">
                                                    Este defecto aún no tiene criterio de calidad registrado. Puede crearse desde Criterios de Calidad.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
                                                    <div className="lg:col-span-4">
                                                        <div
                                                            onClick={() => c.foto && setZoomedImage(c.foto)}
                                                            className={`w-full h-56 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative ${
                                                                c.foto ? 'cursor-zoom-in bg-slate-900 group' : 'bg-slate-50'
                                                            }`}
                                                        >
                                                            {c.foto ? (
                                                                <>
                                                                    <img src={c.foto} alt={item.nombre} className="w-full h-full object-contain" />
                                                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                                                        <Maximize2 size={12} />
                                                                        <span>Ampliar</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-400">Sin imagen ilustrativa</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="lg:col-span-8 space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Responsable de la causa</span>
                                                                <span className="text-sm font-bold text-[#324354] whitespace-pre-line">{c.responsable || 'No especificado'}</span>
                                                            </div>
                                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo detectarlo?</span>
                                                                <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{c.detectarlo || 'No especificado'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo evitarlo / acción correctiva?</span>
                                                            <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{c.evitarlo || 'No especificado'}</p>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <span className="text-xs font-black text-[#324354] uppercase tracking-wider block">
                                                                Máximo permitido por zona
                                                            </span>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                                {[
                                                                    { label: 'Zona Roja', value: c.rojo, cls: 'bg-red-50/70 border-red-500 text-red-700', txt: 'text-red-950' },
                                                                    { label: 'Zona Naranja', value: c.naranja, cls: 'bg-amber-50/70 border-amber-500 text-amber-700', txt: 'text-amber-950' },
                                                                    { label: 'Zona Amarilla', value: c.amarillo, cls: 'bg-yellow-50/70 border-yellow-500 text-yellow-700', txt: 'text-yellow-950' },
                                                                    { label: 'Zona Verde', value: c.verde, cls: 'bg-emerald-50/70 border-emerald-500 text-emerald-700', txt: 'text-emerald-950' }
                                                                ].map(z => (
                                                                    <div key={z.label} className={`p-3 border-l-4 rounded-xl space-y-0.5 ${z.cls}`}>
                                                                        <span className="text-[10px] font-black uppercase">{z.label}</span>
                                                                        <p className={`text-xs font-bold whitespace-pre-line ${z.txt}`}>{z.value || 'N/A'}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                )}

                {!loading && filteredItems.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-16">No hay defectos que coincidan con &quot;{searchTerm}&quot;.</p>
                )}
            </main>

            <footer className="py-4 px-4 bg-[#254153] text-[9px] font-bold text-white/30 uppercase tracking-[0.5em] flex justify-between items-center">
                <span>© {new Date().getFullYear()} Firplak Engineering</span>
                <span>Secure Terminal v4.0.2</span>
            </footer>

            {/* Zoom de imagen */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img src={zoomedImage} alt="Detalle del defecto" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
        </div>
    )
}
