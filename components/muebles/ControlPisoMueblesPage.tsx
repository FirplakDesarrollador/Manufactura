'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import CorteModule from '@/components/muebles/CorteModule'
import EnchapeModule from '@/components/muebles/EnchapeModule'
import InspeccionModule from '@/components/muebles/InspeccionModule'
import EmpaqueModule from '@/components/muebles/EmpaqueModule'
import DigitadoModule, { grupoDigitadoMuebles } from '@/components/muebles/DigitadoModule'
import { useFaltantesGrupo } from '@/lib/fibra/revisionEntrega'

// Bolita roja del menú: órdenes de Digitado con componentes faltantes para la entrega (última revisión de SAP)
function AvisoFaltantesDigitado({ planta, abierto }: { planta: string; abierto: boolean }) {
    const n = useFaltantesGrupo(grupoDigitadoMuebles(planta))
    if (!n) return null
    return (
        <b title={`${n} OF con componentes faltantes para la entrega`}
            className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow ${abierto ? 'ml-auto' : 'absolute -top-1 right-0.5'}`}>
            {n > 99 ? '99+' : n}
        </b>
    )
}
import TransitoModule from '@/components/muebles/TransitoModule'
import TrasladosFibraModule from '@/components/fibra/traslados/TrasladosFibraModule'
import MapaProcesosMuebles from '@/components/muebles/MapaProcesosMuebles'

// Número rojo tipo notificación (igual al de Fibra): OF con novedades de traslado en ese proceso
function AvisoNovedades({ n, abierto, texto }: { n?: number; abierto: boolean; texto: string }) {
    if (!n) return null
    return (
        <b title={`${n} ${texto}`}
            className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow ${abierto ? 'ml-auto' : 'absolute -top-1 right-0.5'}`}>
            {n > 99 ? '99+' : n}
        </b>
    )
}
import CediModule from '@/components/muebles/CediModule'
import AdministracionModule from '@/components/muebles/AdministracionModule'
import DefectosModule from '@/components/muebles/DefectosModule'
import PanelDefectosModule from '@/components/muebles/PanelDefectosModule'
import DashboardModule from '@/components/muebles/DashboardModule'
import SeguimientoModule from '@/components/muebles/SeguimientoModule'
import ConfigurarTurnosModal from '@/components/muebles/ConfigurarTurnosModal'
import ConfigurarSupervisoresModal from '@/components/muebles/ConfigurarSupervisoresModal'
import CambiarPlantaModal from '@/components/muebles/CambiarPlantaModal'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import Header from '@/components/opt-sistemica/Header'
import { getMetricasMueblesHoy } from '@/lib/supabase/queries/muebles'
import { setTareaActiva } from '@/lib/supabase/queries/usuarios'

// Control de Piso de Muebles (MBL, /muebles) y de CEFI (/cefi): misma pantalla, cada planta con su propia entrada.
// La planta la fija la ruta (no el perfil del usuario); "Cambiar planta" lleva a la otra.
export type PlantaMuebles = 'Muebles' | 'Cefi'
export const RUTA_PLANTA: Record<PlantaMuebles, string> = { Muebles: '/muebles', Cefi: '/cefi' }

export default function ControlPisoMueblesPage({ planta }: { planta: PlantaMuebles }) {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeModule, setActiveModule] = useState('corte')
    const [isTurnosModalOpen, setIsTurnosModalOpen] = useState(false)
    const [isSupervisoresModalOpen, setIsSupervisoresModalOpen] = useState(false)
    const [isPlantaModalOpen, setIsPlantaModalOpen] = useState(false)
    // Avisos rojos (como Fibra): OF con novedades de traslado (sin traslado, con faltantes o solicitado sin trasladar)
    // en total y por proceso (el proceso donde están sus unidades por trabajar)
    const [novedadesTraslados, setNovedadesTraslados] = useState(0)
    const [novedadesProceso, setNovedadesProceso] = useState<Record<string, number>>({})
    const [faltantesAdmin, setFaltantesAdmin] = useState(0)
    useEffect(() => {
        const tabla = planta === 'Cefi' ? 'traslados_of_cefi' : 'traslados_of_mbl'
        const contar = async () => {
            const { data, error } = await supabase.from(tabla).select('orden_fabricacion').in('estado', ['sin_traslado', 'faltante', 'solicitado'])
            if (error) return
            const ofs = [...new Set((data || []).map(r => String(r.orden_fabricacion)))]
            setNovedadesTraslados(ofs.length)
            if (!ofs.length) { setNovedadesProceso({}); return }
            const { data: q, error: errQ } = await supabase.from('query_of_muebles')
                .select('orden_fabricacion, por_cortar, corte, enchape, inspeccion').in('orden_fabricacion', ofs.slice(0, 1000)).eq('pendiente', true)
            if (errQ) return
            // Cada módulo muestra lo que le llega del proceso anterior
            const cuenta: Record<string, number> = {}
            const sumar = (m: string) => { cuenta[m] = (cuenta[m] || 0) + 1 }
            for (const o of q || []) {
            }
            setNovedadesProceso(cuenta)
        }
        // Administración (como Fibra y Mármol): OF abiertas de la planta con "Falta(n) componente(s)" en Componentes entrega
        const contarAdmin = async () => {
            const { data: rev, error } = await supabase.from('revision_entrega_of').select('orden_fabricacion').eq('estado', 'faltante')
            if (error) return
            const ofs = [...new Set((rev || []).map(r => String(r.orden_fabricacion).trim()))]
            if (!ofs.length) { setFaltantesAdmin(0); return }
            const { data: abiertas, error: errOf } = await supabase.from('ordenes_fabricacion_muebles').select('orden_fabricacion')
                .eq('planta', planta === 'Cefi' ? 'Cefi' : 'Muebles').eq('pendiente', true).in('orden_fabricacion', ofs)
            if (!errOf) setFaltantesAdmin(new Set((abiertas || []).map(o => String(o.orden_fabricacion))).size)
        }
        contarAdmin()
        contar()
        const t = setInterval(() => { contar(); contarAdmin() }, 5 * 60000)
        return () => clearInterval(t)
    }, [planta])

    useEffect(() => {
        const getUser = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
                // Fetch user profile for permissions and name
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('uuid', user.id)
                    .single()
                
                if (profile) {
                    setProfile(profile)
                    // Si el usuario tenía alguna tarea_activa residual, limpiarla para que no se quede pegado
                    if (profile.tarea_activa && user?.email) {
                        setTareaActiva(user.email, null).catch(console.error)
                    }
                    if (profile.modulo_predeterminado_muebles) {
                        setActiveModule(profile.modulo_predeterminado_muebles.toLowerCase())
                    }
                }
            }
            setLoading(false)
        }
        getUser()
    }, [router])

    useEffect(() => {
        // Empaque ya no es un proceso (CEFI nunca lo usó; Muebles desde 26/11/2026)
        if (activeModule === 'empaque') {
            setActiveModule('corte')
        }
    }, [planta, activeModule])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) return (
      <div className="min-h-screen bg-[#254153] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
    if (!user) return null

    const menuItems = [
        { id: 'corte', label: 'Corte', permission: 'corte', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z" />
            </svg>
        )},
        { id: 'enchape', label: 'Enchape', permission: 'enchape', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        )},
        { id: 'inspeccion', label: 'Inspección', permission: 'inspeccion', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        )},
        { id: 'empaque', label: 'Empaque', permission: 'empaque', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )},
        { id: 'digitado', label: 'Digitado', permission: 'digitado', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )},
        { id: 'transito', label: 'Transito', permission: 'transito', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
        )},
        { id: 'cedi', label: 'CEDI', permission: 'cedi', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        )},
        { id: 'administracion', label: 'Administración', permission: 'administracion', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )},
        { id: 'defectos', label: 'Defectos', permission: 'defectos', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )},
        { id: 'panel', label: 'Panel Defectos', permission: 'panel', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )},
        { id: 'dashboard', label: 'Dashboard', permission: 'dashboard', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
        )},
        { id: 'seguimiento', label: 'Seguimiento', permission: 'seguimiento', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        )}
    ]

    const utilityItems = [
        { id: 'turnos', label: 'Turnos', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )},
        { id: 'supervisores', label: 'Supervisores', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        )},
        { id: 'cambiar_planta', label: planta === 'Cefi' ? 'Ir a Muebles' : 'Ir a CEFI', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        )}
    ]

    const filteredMenuItems = menuItems.filter(item => {
        // Empaque ya no es un proceso en Muebles ni en CEFI
        if (item.id === 'empaque') {
            return false;
        }

        if (!profile) return true; // Show all while loading profile
        if (profile.rol === 'desarrollador' || profile.rol === 'director') return true;
        return profile.permisos?.muebles?.[item.permission] === true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mismo banner de toda la app (como Control de Piso MS y FV): menú, título, logo y usuario */}
            <Header title={`Control de Piso ${planta === 'Cefi' ? 'CEFI' : 'Muebles (MBL)'}`} subtitle="" compact={true}
                userEmail={user?.email} showLogout={true} onLogout={handleSignOut} />

            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {/* Fondo oscuro del menú abierto (solo celular) */}
                {sidebarOpen && (
                    <div className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Menú lateral igual al de MS y FV: recogible a solo íconos */}
                <div className="w-12 shrink-0 md:hidden" />
                <aside
                    className={`fixed md:sticky top-12 bottom-0 md:h-[calc(100vh-3rem)] left-0 z-50 md:z-30 shrink-0 transition-all duration-300 ease-in-out bg-white border-r border-[#e2ded5] shadow-sm overflow-hidden
                        ${sidebarOpen ? 'w-52' : 'w-12'}`}
                >
                    <nav onClick={e => { if (window.innerWidth < 768 && (e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[title$="menú de módulos"]')) setSidebarOpen(false) }}
                        className={`p-2 space-y-1 overflow-y-auto h-full [&_button>svg]:w-4 [&_button>svg]:h-4 [&_button>svg]:shrink-0 ${sidebarOpen ? '' : '[&_button>span]:hidden [&_button]:justify-center [&_button]:px-0'}`}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center space-x-2 px-3 h-8 mb-1 rounded-lg w-full text-[10px] font-black uppercase tracking-wider text-[#324354] bg-[#F6F3EE] hover:bg-[#e2ded5] transition-colors"
                            title={sidebarOpen ? 'Recoger menú de módulos' : 'Abrir menú de módulos'}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
                            </svg>
                            <span className="flex-1 text-left">Módulos {planta === 'Cefi' ? 'CEFI' : 'MBL'}</span>
                        </button>

                        {filteredMenuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveModule(item.id)}
                                title={sidebarOpen ? undefined : item.label}
                                className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === item.id
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                                {item.id === 'digitado' && <AvisoFaltantesDigitado planta={planta} abierto={sidebarOpen} />}
                                {item.id === 'administracion' && <AvisoNovedades n={faltantesAdmin} abierto={sidebarOpen} texto="OF con componentes faltantes para la entrega" />}
                                {item.id !== 'digitado' && item.id !== 'administracion' && <AvisoNovedades n={novedadesProceso[item.id]} abierto={sidebarOpen} texto="OF con faltantes o sin traslado en este proceso" />}
                            </button>
                        ))}

                        {/* Traslados: OF abiertas vs. sus traslados en SAP (solo consulta, sin permiso propio, como en Fibra) */}
                        <button
                            onClick={() => setActiveModule('traslados')}
                            title={sidebarOpen ? undefined : `Traslados${novedadesTraslados ? ` · ${novedadesTraslados} OF con novedades` : ''}`}
                            className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'traslados'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'}`}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12m0 0l-4-4m4 4l-4 4M17 17H5m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span>Traslados</span>
                            <AvisoNovedades n={novedadesTraslados} abierto={sidebarOpen} texto="OF con faltantes o sin traslado" />
                        </button>

                        {/* Mapa de procesos: solo consulta, sin permiso propio */}
                        <button
                            onClick={() => setActiveModule('mapa')}
                            title={sidebarOpen ? undefined : 'Mapa de procesos'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'mapa'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'}`}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Mapa de procesos</span>
                        </button>

                        <div className="pt-2 border-t border-[#e2ded5] mt-2 space-y-1">
                            {utilityItems.map((item) => (
                                <button
                                    key={item.id}
                                    title={sidebarOpen ? undefined : item.label}
                                    onClick={() => {
                                      if (item.id === 'cambiar_planta') {
                                        setIsPlantaModalOpen(true);
                                      } else if (item.id === 'turnos') {
                                        setIsTurnosModalOpen(true);
                                      } else if (item.id === 'supervisores') {
                                        setIsSupervisoresModalOpen(true);
                                      } else {
                                        setActiveModule(item.id);
                                      }
                                    }}
                                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]"
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden relative">
                    <ErrorBoundary fallbackTitle="Error al cargar el módulo de Muebles">
                        <div className="h-full overflow-y-auto">
                            {activeModule === 'traslados' ? (
                                <TrasladosFibraModule planta={planta === 'Cefi' ? 'cefi' : 'mbl'} />
                            ) : activeModule === 'mapa' ? (
                                <MapaProcesosMuebles plantaMuebles={planta} />
                            ) : activeModule === 'corte' ? (
                                <CorteModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'enchape' ? (
                                <EnchapeModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'inspeccion' ? (
                                <InspeccionModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'empaque' ? (
                                <EmpaqueModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'digitado' ? (
                                <DigitadoModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'transito' ? (
                                <TransitoModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'cedi' ? (
                                <CediModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'administracion' ? (
                                <AdministracionModule 
                                    userEmail={user?.email || ''} 
                                    turno="1" 
                                    usuarioNombre={profile?.nombre || user?.email || 'Usuario'}
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'defectos' ? (
                                <DefectosModule 
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'panel' ? (
                                <PanelDefectosModule 
                                    plantaMuebles={planta}
                                    turno={profile?.turno || '1'}
                                />
                            ) : activeModule === 'dashboard' ? (
                                <DashboardModule 
                                    plantaMuebles={planta}
                                />
                            ) : activeModule === 'seguimiento' ? (
                                <SeguimientoModule
                                    plantaMuebles={planta}
                                />
                            ) : (
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                                    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                                        <div className="text-center">
                                            <div className="w-32 h-32 bg-[#254153]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                                <svg className="w-16 h-16 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <h1 className="text-4xl font-bold text-[#254153] mb-4 capitalize">
                                                Módulo {activeModule.replace('_', ' ')}
                                            </h1>
                                            <p className="text-xl text-gray-600 mb-8">
                                                Este módulo se encuentra en desarrollo. Por favor selecciona otro del menú lateral.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ErrorBoundary>
                </main>
            </div>
            {/* Turnos Modal */}
            {isTurnosModalOpen && (
                <ConfigurarTurnosModal 
                    onClose={() => setIsTurnosModalOpen(false)}
                />
            )}
            {/* Supervisores Modal */}
            {isSupervisoresModalOpen && (
                <ConfigurarSupervisoresModal 
                    onClose={() => setIsSupervisoresModalOpen(false)}
                />
            )}
            {/* Cambiar Planta Modal */}
            {isPlantaModalOpen && (
                <CambiarPlantaModal 
                    userUuid={user.id}
                    currentPlant={planta}
                    onClose={() => setIsPlantaModalOpen(false)}
                    onPlantChanged={async () => {
                        setIsPlantaModalOpen(false)
                        router.push(RUTA_PLANTA[planta === 'Cefi' ? 'Muebles' : 'Cefi'])
                    }}
                />
            )}
        </div >
    )
}
