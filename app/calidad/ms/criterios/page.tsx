'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search } from 'lucide-react'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
import CriterioDetallePanel from '@/components/calidad/CriterioDetallePanel'
import type { Defecto as CriterioCalidad } from '@/components/calidad/DefectModal'
import { puedeEditarCalidad } from '@/lib/calidad/permisos'

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
    const [canEdit, setCanEdit] = useState(false)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserEmail(user.email)

            const [defRes, critRes, userRes] = await Promise.all([
                supabase.from('ms_defectos').select('*').order('id'),
                supabase.from('criterios_calidad_plantas').select('*').eq('planta', 'Ms'),
                supabase.from('usuarios').select('nombre, correo, rol').ilike('correo', user.email || '').maybeSingle()
            ])
            setCanEdit(puedeEditarCalidad(userRes.data))
            if (defRes.error) console.warn('Error cargando ms_defectos:', defRes.error)
            if (critRes.error) console.warn('Error cargando criterios_calidad_plantas:', critRes.error)
            setDefects(defRes.data || [])
            setCriterios(critRes.data || [])
            setLoading(false)
        }
        void load()
    }, [router])

    // Cada defecto de MS con su criterio. El número visible está en el nombre ("68. Pestaña…")
    // y puede ser distinto del id interno; el criterio se vincula por id_defecto_ms
    // (corregir_criterios_ms.sql) o, en su defecto, por código = número visible.
    const items = useMemo(() => {
        const byDefectoId = new Map(criterios.filter(c => c.id_defecto_ms != null).map(c => [Number(c.id_defecto_ms), c]))
        const byCode = new Map(criterios.map(c => [String(c.codigo).trim(), c]))
        return defects
            .map(d => {
                const rawName = d.Defecto || d.defecto || d.nombre || d.Nombre || 'Defecto'
                const match = rawName.match(/^\s*(\d+)/)
                const numero = match ? Number(match[1]) : d.id
                return {
                    id: numero,
                    defectoId: d.id,
                    nombre: cleanName(rawName),
                    criterio: byDefectoId.get(d.id) || byCode.get(String(numero)) || null
                }
            })
            .sort((a, b) => a.id - b.id)
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
            <div className="bg-gray-50 border-b border-gray-200 py-2 xl:py-0 xl:h-14 sticky top-[56px] z-40 flex items-center shadow-xs">
                <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-4 flex flex-wrap items-center justify-between xl:grid xl:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] xl:gap-4 gap-2 relative xl:h-full">
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-min xl:max-w-[440px] 2xl:max-w-[520px]">
                        <div className="relative flex-1 min-w-[150px] [contain:inline-size]">
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

                    <div className="order-3 xl:order-none w-full xl:w-auto flex justify-center z-20">
                        <CalidadMsNavButtons activeTab="criterios" hasSettingsPermission={true} />
                    </div>

                    <div className="order-2 xl:order-none flex items-center justify-center sm:justify-end w-full sm:w-auto sm:ml-auto xl:ml-0 xl:justify-self-end">
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
                                        onClick={() => {
                                            setExpandedId(isOpen ? null : item.id)
                                        }}
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

                                    {/* Panel de detalle a lo ancho de la cuadrícula (consulta y edición con el mismo diseño) */}
                                    {isOpen && (
                                        <CriterioDetallePanel
                                            planta="Ms"
                                            plantaNombre="Mármol Sintético"
                                            numero={item.id}
                                            idDefectoMs={item.defectoId}
                                            nombreDefecto={item.nombre}
                                            criterio={c}
                                            canEdit={canEdit}
                                            onClose={() => setExpandedId(null)}
                                            onZoom={setZoomedImage}
                                            onSaved={saved =>
                                                setCriterios(prev =>
                                                    prev.some(x => x.id === saved.id) ? prev.map(x => (x.id === saved.id ? saved : x)) : [...prev, saved]
                                                )
                                            }
                                        />
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
