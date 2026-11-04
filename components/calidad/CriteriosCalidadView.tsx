'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Search } from 'lucide-react'
import NuevoDefectoMsModal from '@/components/calidad/NuevoDefectoMsModal'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
import CriterioDetallePanel from '@/components/calidad/CriterioDetallePanel'
import { CODIGOS_CRITERIOS_ANTIGUOS, CriterioCalidad, PLANTAS_CRITERIOS, plantaCriterios } from '@/lib/calidad/criterios'
import { puedeEditarCalidad, permisosCalidadMs } from '@/lib/calidad/permisos'
import {
    EstadisticasDefectosMs,
    MS_FECHA_INICIO_BI,
    calcularEstadisticasDefectos,
    fetchMsReportes,
    normalizarPiezas
} from '@/lib/calidad/msCalidad'

interface DefectoMS {
    id: number
    Defecto?: string
    defecto?: string
    nombre?: string
    Nombre?: string
    Al_amarilla?: number | null
    Al_azul?: number | null
    Al_roja?: number | null
    Requiere_Foto?: boolean | null
    Requiere_Referencia_Molde?: boolean | null
}

interface ItemCriterio {
    key: string
    numero: number
    defectoId: number | null // id en ms_defectos (solo MS)
    config: DefectoMS | null
    nombre: string
    criterio: CriterioCalidad | null
}

// Quita el prefijo numérico "12. " o "12 - " del nombre
const cleanName = (name: string) => (name || '').replace(/^\s*\d+[\.\-\s]+/, '').trim()
const NUEVO = '__nuevo__'

interface CriteriosCalidadViewProps {
    plantaInicial?: string
    // true solo al entrar desde Calidad MS: muestra sus 7 botones de navegación cuando la planta es MS
    mostrarBotonesMs?: boolean
}

// Criterios de aceptación y rechazo de todas las plantas, con la cuadrícula y el detalle de Calidad MS.
// MS usa el catálogo del registro diario (ms_defectos); las demás plantas, solo sus criterios.
// Zona sin tolerancia: máximo permitido 0 o "NO SE ACEPTA" (se pinta su color en la tarjeta)
const sinTolerancia = (v?: string | null) => {
    const t = String(v ?? '').trim().toUpperCase()
    return t === '0' || t.includes('NO SE ACEPTA')
}

export default function CriteriosCalidadView({ plantaInicial = 'Ms', mostrarBotonesMs = false }: CriteriosCalidadViewProps) {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | undefined>()
    const [planta, setPlanta] = useState(plantaInicial)
    const [defects, setDefects] = useState<DefectoMS[]>([])
    const [criterios, setCriterios] = useState<CriterioCalidad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedKey, setExpandedKey] = useState<string | null>(null)
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)
    const [canEdit, setCanEdit] = useState(false)
    const [canConfig, setCanConfig] = useState(false)
    const [canEditMs, setCanEditMs] = useState(false)
    // Nuevo defecto de MS (catálogo ms_defectos) y detalle que se abre en edición al crearlo
    const [nuevoMsOpen, setNuevoMsOpen] = useState(false)
    const [editarAlAbrir, setEditarAlAbrir] = useState<string | null>(null)
    const [stats, setStats] = useState<EstadisticasDefectosMs | null>(null)
    const [statsLoading, setStatsLoading] = useState(false)
    const [statsError, setStatsError] = useState<string | null>(null)

    const esMs = planta === 'Ms'
    const plantaInfo = plantaCriterios(planta)

    // La planta elegida queda en la dirección (?planta=Fv) para compartir o recargar
    useEffect(() => {
        const pedida = new URLSearchParams(window.location.search).get('planta')
        const desdeUrl = pedida ? CODIGOS_CRITERIOS_ANTIGUOS[pedida] || pedida : null
        if (desdeUrl && PLANTAS_CRITERIOS.some(p => p.codigo === desdeUrl)) setPlanta(desdeUrl)
    }, [])

    const cambiarPlanta = (codigo: string) => {
        setPlanta(codigo)
        setExpandedKey(null)
        setSearchTerm('')
        const url = new URL(window.location.href)
        url.searchParams.set('planta', codigo)
        window.history.replaceState(null, '', url.toString())
    }

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
                supabase.from('criterios_calidad_plantas').select('*'),
                supabase.from('usuarios').select('nombre, correo, rol, permisos').ilike('correo', user.email || '').maybeSingle()
            ])
            // Permisos de Calidad MS por botón: Criterios (ver/editar) y Configuración (ver/editar)
            const permMs = permisosCalidadMs(userRes.data as any)
            setCanEditMs(permMs.criterios === 'editar')
            setCanEdit(puedeEditarCalidad(userRes.data) || permMs.criterios === 'editar')
            setCanConfig(permMs.configuracion === 'editar')
            if (defRes.error) console.warn('Error cargando ms_defectos:', defRes.error)
            if (critRes.error) console.warn('Error cargando criterios_calidad_plantas:', critRes.error)
            setDefects(defRes.data || [])
            setCriterios(critRes.data || [])
            setLoading(false)
        }
        void load()
    }, [router])

    // Estadísticas del registro diario MS: se calculan la primera vez que se ve MS
    useEffect(() => {
        if (!esMs || loading || stats || statsLoading || statsError) return
        const cargar = async () => {
            setStatsLoading(true)
            try {
                const catalogo = new Map<number, string>(defects.map(d => [Number(d.id), String(d.Defecto || d.defecto || '')]))
                const hasta = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
                const rows = await fetchMsReportes(supabase, `${MS_FECHA_INICIO_BI}T00:00:00Z`, `${hasta}T00:00:00Z`, 'id, created_at, defecto')
                setStats(calcularEstadisticasDefectos(normalizarPiezas(rows, catalogo)))
            } catch (err: any) {
                console.warn('Error calculando estadísticas de defectos:', err)
                setStatsError(err?.message || 'Error consultando el registro diario')
            } finally {
                setStatsLoading(false)
            }
        }
        void cargar()
    }, [esMs, loading, stats, statsLoading, statsError, defects])

    const items = useMemo<ItemCriterio[]>(() => {
        const dePlanta = criterios.filter(c => c.planta === planta)
        if (planta === 'Ms') {
            // El número visible está en el nombre ("68. Pestaña…") y puede ser distinto del id interno;
            // el criterio se vincula por id_defecto_ms o, en su defecto, por código = número visible.
            const byDefectoId = new Map(dePlanta.filter(c => c.id_defecto_ms != null).map(c => [Number(c.id_defecto_ms), c]))
            const byCode = new Map(dePlanta.map(c => [String(c.codigo).trim(), c]))
            return defects
                .map(d => {
                    const rawName = d.Defecto || d.defecto || d.nombre || d.Nombre || 'Defecto'
                    const match = rawName.match(/^\s*(\d+)/)
                    const numero = match ? Number(match[1]) : d.id
                    return {
                        key: `ms-${d.id}`,
                        numero,
                        defectoId: d.id,
                        config: d,
                        nombre: cleanName(rawName),
                        criterio: byDefectoId.get(d.id) || byCode.get(String(numero)) || null
                    }
                })
                .sort((a, b) => a.numero - b.numero)
        }
        return dePlanta
            .map((c, idx) => ({
                key: `c-${c.id}`,
                numero: Number.isFinite(Number(c.codigo)) && String(c.codigo).trim() !== '' ? Number(c.codigo) : idx + 1,
                defectoId: null,
                config: null,
                nombre: cleanName(c.defecto),
                criterio: c
            }))
            .sort((a, b) => a.numero - b.numero)
    }, [defects, criterios, planta])

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return items
        return items.filter(i =>
            String(i.numero).includes(term) ||
            i.nombre.toLowerCase().includes(term) ||
            (i.criterio?.responsable || '').toLowerCase().includes(term)
        )
    }, [items, searchTerm])

    const conCriterio = items.filter(i => i.criterio).length
    const siguienteNumero = items.reduce((max, i) => Math.max(max, i.numero), 0) + 1
    const itemAbierto = expandedKey && expandedKey !== NUEVO ? items.find(i => i.key === expandedKey) || null : null

    const guardarCriterio = (saved: CriterioCalidad) => {
        setCriterios(prev => (prev.some(x => x.id === saved.id) ? prev.map(x => (x.id === saved.id ? saved : x)) : [...prev, saved]))
        if (expandedKey === NUEVO && saved.id) setExpandedKey(`c-${saved.id}`)
    }

    const eliminarCriterio = async (c: CriterioCalidad) => {
        const { error } = await supabase.from('criterios_calidad_plantas').delete().eq('id', c.id)
        if (error) {
            alert(`No se pudo eliminar el criterio: ${error.message}`)
            return
        }
        setCriterios(prev => prev.filter(x => x.id !== c.id))
        setExpandedKey(null)
    }

    const panelComun = {
        planta,
        plantaNombre: plantaInfo.nombre,
        canEdit: esMs ? canEditMs : canEdit,
        onClose: () => setExpandedKey(null),
        onZoom: setZoomedImage,
        onSaved: guardarCriterio,
        mostrarEstadisticas: esMs,
        editarIdentidad: !esMs
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Header
                title="Criterios de Aceptación y Rechazo"
                subtitle=""
                compact={true}
                userEmail={userEmail}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />

            {/* Barra de controles: buscador | botones de Calidad MS (solo en MS y si se entró desde Calidad MS) | planta y contador */}
            <div className="bg-gray-50 border-b border-gray-200 py-1.5 min-[1200px]:py-0 min-[1200px]:h-10 sticky top-[48px] z-40 flex items-center shadow-xs">
                <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-4 flex flex-wrap items-center justify-between min-[1200px]:grid min-[1200px]:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] min-[1200px]:gap-4 gap-2 relative min-[1200px]:h-full">
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-min min-[1200px]:max-w-[340px] 2xl:max-w-[480px]">
                        <div className="relative flex-1 min-w-[150px] [contain:inline-size]">
                            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="BUSCAR DEFECTO, NÚMERO O RESPONSABLE"
                                className="w-full h-7 bg-white border border-gray-300 rounded pl-7 pr-2.5 text-[#254153] font-bold text-[11px] focus:border-[#254153] outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="order-3 min-[1200px]:order-none w-full min-[1200px]:w-auto flex justify-center z-20">
                        {esMs && mostrarBotonesMs && <CalidadMsNavButtons activeTab="criterios" hasSettingsPermission={true} />}
                    </div>

                    <div className="order-2 min-[1200px]:order-none flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto sm:ml-auto min-[1200px]:ml-0 min-[1200px]:justify-self-end">
                        {(esMs ? canEditMs : canEdit) && (
                            <button
                                onClick={() => (esMs ? setNuevoMsOpen(true) : setExpandedKey(NUEVO))}
                                className="h-7 px-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded text-[11px] font-bold flex items-center gap-1.5 shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Nuevo defecto</span>
                            </button>
                        )}
                        <div className="flex items-center gap-1 h-7 bg-white border border-gray-300 rounded px-2 shrink-0" title={plantaInfo.titulo}>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Planta</span>
                            <select
                                value={planta}
                                onChange={e => cambiarPlanta(e.target.value)}
                                className="bg-transparent font-black text-[#254153] text-xs outline-none cursor-pointer"
                            >
                                {PLANTAS_CRITERIOS.map(p => (
                                    <option key={p.codigo} value={p.codigo} title={p.nombre}>
                                        {p.sigla}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="text-xs font-bold text-gray-800 shrink-0 whitespace-nowrap">
                            {esMs ? `Criterios: ${conCriterio} / ${items.length}` : `Defectos: ${items.length}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Cuadrícula de defectos */}
            <main className="flex-1 w-full bg-white p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#254153] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                        {filteredItems.map(item => {
                            const isOpen = expandedKey === item.key
                            const c = item.criterio
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setExpandedKey(isOpen ? null : item.key)}
                                    className={`p-3 border transition-all duration-200 flex flex-col justify-between w-full text-left min-h-[90px] ${
                                        isOpen
                                            ? 'bg-[#324354] border-[#324354] text-white shadow-md'
                                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <h3 className="text-sm font-medium leading-tight mb-2">
                                        {item.numero}. {item.nombre}
                                    </h3>
                                    <div className="flex items-center justify-between gap-2 mt-auto">
                                        <span className={`text-[10px] font-bold truncate ${isOpen ? 'text-white/70' : 'text-gray-400'}`}>
                                            {c ? (c.responsable || 'Sin responsable') : 'Sin criterio registrado'}
                                        </span>
                                        {c && (
                                            <span className="flex gap-0.5 shrink-0" title="Zonas en color: no se permite ningún defecto (máximo 0 o no se acepta)">
                                                <span className={`w-2 h-2 rounded-full ${sinTolerancia(c.rojo) ? 'bg-red-500' : 'bg-gray-200'}`} />
                                                <span className={`w-2 h-2 rounded-full ${sinTolerancia(c.naranja) ? 'bg-amber-500' : 'bg-gray-200'}`} />
                                                <span className={`w-2 h-2 rounded-full ${sinTolerancia(c.amarillo) ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                                                <span className={`w-2 h-2 rounded-full ${sinTolerancia(c.verde) ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                            </span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {!loading && filteredItems.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-16">
                        {searchTerm
                            ? `No hay defectos que coincidan con "${searchTerm}".`
                            : `${plantaInfo.nombre} aún no tiene criterios registrados.${canEdit ? ' Usa "Nuevo defecto" para crear el primero.' : ''}`}
                    </p>
                )}
            </main>


            {/* Ventana de detalle (consulta y edición con el mismo diseño) */}
            {itemAbierto && (
                <CriterioDetallePanel
                    key={itemAbierto.key}
                    {...panelComun}
                    numero={itemAbierto.numero}
                    idDefectoMs={itemAbierto.defectoId}
                    nombreDefecto={itemAbierto.nombre}
                    criterio={itemAbierto.criterio}
                    configRegistro={itemAbierto.config}
                    canConfig={canConfig}
                    onConfigSaved={cfg => setDefects(prev => prev.map(d => (d.id === itemAbierto.defectoId ? { ...d, ...cfg } : d)))}
                    estadistica={itemAbierto.defectoId != null ? stats?.porDefecto.get(itemAbierto.defectoId) ?? null : null}
                    estadisticasInfo={stats ? { desde: stats.desde, hasta: stats.hasta, diasProduccion: stats.diasProduccion } : null}
                    estadisticasLoading={statsLoading}
                    estadisticasError={statsError}
                    onDelete={!esMs && itemAbierto.criterio ? () => eliminarCriterio(itemAbierto.criterio as CriterioCalidad) : undefined}
                    iniciarEditando={editarAlAbrir === itemAbierto.key}
                />
            )}
            {nuevoMsOpen && (
                <NuevoDefectoMsModal
                    defectos={defects}
                    onClose={() => setNuevoMsOpen(false)}
                    onCreated={(defecto, criterio) => {
                        setDefects(prev => [...prev, defecto])
                        if (criterio) setCriterios(prev => [...prev, criterio])
                        setNuevoMsOpen(false)
                        // Abre el detalle del defecto nuevo en edición para completar su criterio
                        setEditarAlAbrir(`ms-${defecto.id}`)
                        setExpandedKey(`ms-${defecto.id}`)
                    }}
                />
            )}
            {expandedKey === NUEVO && (
                <CriterioDetallePanel
                    key={`${NUEVO}-${planta}`}
                    {...panelComun}
                    numero={siguienteNumero}
                    idDefectoMs={null}
                    nombreDefecto=""
                    criterio={null}
                    iniciarEditando
                />
            )}

            {/* Zoom de imagen */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img src={zoomedImage} alt="Detalle del defecto" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
        </div>
    )
}
