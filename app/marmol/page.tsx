'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import React, { useEffect, useState, useCallback } from 'react'
import Header from '@/components/opt-sistemica/Header'
import PinturaModule from '@/components/pintura/PinturaModule'
import DashboardModule from '@/components/dashboard/DashboardModule'
import DesmanchadoMoldes from '@/components/dashboard/DesmanchadoMoldes'
import IconoDesmanchado from '@/components/dashboard/IconoDesmanchado'
import ContramoldeModule from '@/components/contramoldes/ContramoldeModule'
import VaciadoModule from '@/components/vaciado/VaciadoModule'
import DesmoldeModule from '@/components/desmolde/DesmoldeModule'
import PulidoModule from '@/components/pulido/PulidoModule'
import AcabadoModule from '@/components/acabado/AcabadoModule'
import ReparacionModule from '@/components/reparacion/ReparacionModule'
import EmpaqueModule from '@/components/empaque/EmpaqueModule'
import DigitadoModule from '@/components/digitado/DigitadoModule'
import MoldesFibraModule from '@/components/fibra/moldes/MoldesFibraModule'
import TrasladosFibraModule from '@/components/fibra/traslados/TrasladosFibraModule'
import IconoMolde from '@/components/fibra/IconoMolde'

// Bolita roja del menú: órdenes de Digitado con componentes faltantes para la entrega (última revisión de SAP)
// Número rojo tipo notificación (igual que en Fibra): OF con componentes faltantes para la entrega que tienen piezas
// en lo que muestra ese módulo. Sale de la revisión guardada en el servidor (revision_entrega_of), así se ve en
// cualquier equipo aunque el módulo no se haya abierto.
const PIEZAS_POR_MODULO_MS: Record<string, string[]> = {
    // Vaciado, Pulido y Acabado sin aviso (pedido del usuario 26/11/2026)
    desmolde: ['vaciado'],
    reparacion: ['reparacion', 'reparacion_larga'],
    empaque: ['acabado', 'empaque'],
    digitado: ['pulido', 'desgelcada', 'empaque', 'acabado', 'digitado', 'transito'],
    administracion: ['programado', 'pintura', 'vaciado', 'desgelcada', 'estanteria', 'pulido', 'acabado', 'reparacion', 'reparacion_larga', 'empaque', 'digitado', 'transito', 'cedi'],
}
function AvisoNovedades({ n, abierto }: { n?: number; abierto: boolean }) {
    if (!n) return null
    return (
        <b title={`${n} OF con componentes faltantes para la entrega`}
            className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow ${abierto ? 'ml-auto' : 'absolute -top-1 right-0.5'}`}>
            {n > 99 ? '99+' : n}
        </b>
    )
}
import CediModule from '@/components/cedi/CediModule'
import ParametrosModule from '@/components/parametros/ParametrosModule'
import AdministracionModule from '@/components/administracion/AdministracionModule'

interface PermisosModulos {
    cedi?: boolean;
    pulido?: boolean;
    acabado?: boolean;
    empaque?: boolean;
    pintura?: boolean;
    vaciado?: boolean;
    desmolde?: boolean;
    digitado?: boolean;
    prensado?: boolean;
    dashboard?: boolean;
    parametros?: boolean;
    reparacion?: boolean;
    contramoldes?: boolean;
    administracion?: boolean;
    [key: string]: boolean | undefined;
}

interface User {
    id: string
    email?: string
    permisos?: {
        modulos: PermisosModulos
    }
}

export default function MarmorPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeModule, setActiveModule] = useState<string>('')

    const getUserData = useCallback(async () => {
        setLoading(true)
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            router.push('/login')
            return
        }

        // Obtener permisos adicionales de la tabla public.usuarios
        const { data: userData, error } = await supabase
            .from('usuarios')
            .select('permisos')
            .eq('uuid', authUser.id)
            .single()

        if (error) {
            console.error('Error fetching permissions:', error)
        }

        const combinedUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            permisos: (userData?.permisos as any) || { modulos: {} }
        }

        setUser(combinedUser)

        // Definir el módulo activo inicial basado en permisos
        const modulos = combinedUser.permisos?.modulos;
        if (modulos) {
            // Si el módulo por defecto (pintura) no está permitido, buscar el primero que sí lo esté
            if (!modulos['pintura']) {
                const firstAllowed = Object.keys(modulos).find(key => modulos[key] === true);
                if (firstAllowed) {
                    setActiveModule(firstAllowed);
                } else if (modulos['dashboard']) {
                    setActiveModule('dashboard');
                }
            } else {
                setActiveModule('pintura');
            }
        }

        setLoading(false)
    }, [router])

    useEffect(() => {
        getUserData()
    }, [getUserData])

    // En celular el menú arranca recogido (solo íconos), como en Fibra
    useEffect(() => {
        if (window.innerWidth < 768) setSidebarOpen(false)
    }, [])

    // Aviso de Traslados (como Fibra): OF con novedades (sin traslado, con faltantes o solicitado sin trasladar)
    const [novedadesTraslados, setNovedadesTraslados] = useState(0)
    useEffect(() => {
        const contar = async () => {
            const { data, error } = await supabase.from('traslados_of_ms').select('orden_fabricacion').in('estado', ['sin_traslado', 'faltante', 'solicitado'])
            if (!error) setNovedadesTraslados(new Set((data || []).map(r => String(r.orden_fabricacion))).size)
        }
        contar()
        const t = setInterval(contar, 5 * 60000)
        return () => clearInterval(t)
    }, [])

    // Avisos por módulo: OF abiertas de MS con faltantes (revision_entrega_of) y piezas en lo que muestra cada módulo
    const [novedadesProceso, setNovedadesProceso] = useState<Record<string, number>>({})
    useEffect(() => {
        const contar = async () => {
            const { data: rev, error } = await supabase.from('revision_entrega_of').select('orden_fabricacion').eq('estado', 'faltante')
            if (error) return
            const conFaltantes = new Set((rev || []).map(r => String(r.orden_fabricacion).trim()))
            if (!conFaltantes.size) { setNovedadesProceso({}); return }
            const columnas = [...new Set(Object.values(PIEZAS_POR_MODULO_MS).flat())]
            const { data: ofs, error: errOf } = await supabase.from('query_ordenes_fabricacion')
                .select(['orden_fabricacion', ...columnas].join(', ')).in('orden_fabricacion', [...conFaltantes])
            if (errOf) return
            const cuenta: Record<string, number> = {}
            for (const o of (ofs || []) as unknown as Record<string, unknown>[]) {
                for (const [modulo, cols] of Object.entries(PIEZAS_POR_MODULO_MS)) {
                    if (cols.some(c => Number(o[c]) > 0)) cuenta[modulo] = (cuenta[modulo] || 0) + 1
                }
            }
            setNovedadesProceso(cuenta)
        }
        contar()
        const t = setInterval(contar, 5 * 60000)
        return () => clearInterval(t)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]"></div>
            </div>
        )
    }

    if (!user) return null

    const hasPermission = (moduleName: string) => {
        return user.permisos?.modulos?.[moduleName] === true;
    }

    // Menú lateral igual al de Control de Piso Fibra (FV): los procesos que existen en ambas plantas usan el mismo ícono
    // (Pintura, Pulido, Reparación, Digitado, CEDI, Dashboard, Parámetros, Administración); los propios de MS conservan el suyo.
    const trazo = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 }
    const MENU: { id: string; permiso: string; label: string; icono: React.ReactNode }[] = [
        { id: 'pintura', permiso: 'pintura', label: 'Pintura', icono: <path {...trazo} d="M3 7h10a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H3zM15 8.5h2M7 7V4h4v3M6 12l-1.5 8h3.5L9.5 12M10.5 12.5c1 .3 1.5 1 1.5 2M19.5 5.5h.01M21.5 8.5h.01M19.5 11.5h.01M21.5 3h.01M21.5 14h.01" /> },
        { id: 'contramoldes', permiso: 'contramoldes', label: 'Contramoldes', icono: <path {...trazo} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /> },
        // Vaciado: manguera que baja y descarga la mezcla (chorro) dentro del molde
        { id: 'vaciado', permiso: 'vaciado', label: 'Vaciado', icono: <><path {...trazo} d="M2.5 3.5c5 0 8.5 1.5 8.5 5.5v1.5M9 10.5h4v2.5H9z" /><path strokeLinecap="round" strokeWidth={2.5} d="M11 15v2" /><path {...trazo} d="M4 17.5h14l-1.5 4h-11zM8 17.5c.5-1 1.5-1.5 3-1.5s2.5.5 3 1.5" /></> },
        // Desmolde (se hace con aire): lavamanos y una pistola de aire soplándolo
        { id: 'desmolde', permiso: 'desmolde', label: 'Desmolde', icono: <><path {...trazo} d="M2 13.5h12c0 3.3-2.7 5.5-6 5.5s-6-2.2-6-5.5zM8 19v2.5M5.5 21.5h5" /><path {...trazo} d="M13.5 4h7.5v3h-7.5zM11 5.5h2.5M17.5 7l1 4h-2.5l-.5-4" /><path strokeLinecap="round" strokeWidth={1.5} d="M9.5 7l-1.5 2M7 5.5l-2.5 1.5M10 9.5l-.5 2" /></> },
        { id: 'pulido', permiso: 'pulido', label: 'Pulido', icono: <><rect x="2" y="8" width="11" height="5" rx="2.5" strokeWidth={2} /><path {...trazo} d="M13 9h3.5v3H13M8 13v5M5 10.5h3" /><ellipse cx="19.5" cy="10.5" rx="1.5" ry="6" strokeWidth={2} /></> },
        { id: 'acabado', permiso: 'acabado', label: 'Acabado', icono: <path {...trazo} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
        { id: 'reparacion', permiso: 'reparacion', label: 'Reparación', icono: <path {...trazo} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /> },
        { id: 'empaque', permiso: 'empaque', label: 'Empaque', icono: <path {...trazo} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
        { id: 'digitado', permiso: 'digitado', label: 'Digitado', icono: <path {...trazo} d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 12.5h.01M12 12.5h.01M16 12.5h.01M7 16h10" /> },
        { id: 'cedi', permiso: 'cedi', label: 'CEDI', icono: <path {...trazo} d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35ZM6 22V12h12v10M6 15h12M6 18.5h12" /> },
        { id: 'dashboard', permiso: 'dashboard', label: 'Dashboard', icono: <path {...trazo} d="M3 3v18h18M7 15l4-4 3 3 6-6m0 0h-4m4 0v4" /> },
        // Desmanchado: solo consulta (vueltas actuales contra vueltas MTO); lo ve cualquier usuario, como Moldes
        { id: 'desmanchado', permiso: '', label: 'Desmanchado', icono: null },
        { id: 'parametros', permiso: 'parametros', label: 'Parámetros', icono: <path {...trazo} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
        { id: 'administracion', permiso: 'administracion', label: 'Administración', icono: <><path {...trazo} d="M2 21a8 8 0 0 1 10.43-7.62M10 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" /><circle cx="18" cy="18" r="3" strokeWidth={2} /><path {...trazo} d="M18 13.5v1.5M18 21v1.5M21.9 15.75l-1.3.75M15.4 19.5l-1.3.75M14.1 15.75l1.3.75M20.6 19.5l1.3.75" /></> },
        { id: 'tvprensado', permiso: 'prensado', label: 'TV Prensado', icono: <path {...trazo} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mismo banner de toda la app (como Control de Piso Fibra): menú, título, logo y usuario */}
            <Header title="Control de Piso Mármol (MS)" subtitle="" compact={true} userEmail={user?.email} showLogout={true} onLogout={handleSignOut} />

            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {/* Fondo oscuro del menú abierto (solo celular) */}
                {sidebarOpen && (
                    <div className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Espacio de la barra de íconos en celular (el menú abierto flota encima) */}
                <div className="w-12 shrink-0 md:hidden" />
                <aside
                    className={`fixed md:sticky top-12 bottom-0 md:h-[calc(100vh-3rem)] left-0 z-50 md:z-30 shrink-0 transition-all duration-300 ease-in-out bg-white border-r border-[#e2ded5] shadow-sm overflow-hidden
                        ${sidebarOpen ? 'w-52' : 'w-12'}`}
                >
                    <nav onClick={e => { if (window.innerWidth < 768 && (e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[title$="menú de módulos"]')) setSidebarOpen(false) }} className={`p-2 space-y-1 overflow-y-auto h-full ${sidebarOpen ? '' : '[&_button>span]:hidden [&_button]:justify-center [&_button]:px-0'}`}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center space-x-2 px-3 h-8 mb-1 rounded-lg w-full text-[10px] font-black uppercase tracking-wider text-[#324354] bg-[#F6F3EE] hover:bg-[#e2ded5] transition-colors"
                            title={sidebarOpen ? 'Recoger menú de módulos' : 'Abrir menú de módulos'}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
                            </svg>
                            <span className="flex-1 text-left">Módulos MS</span>
                        </button>

                        {MENU.filter(m => !m.permiso || hasPermission(m.permiso)).map(m => (
                            <button
                                key={m.id}
                                onClick={() => setActiveModule(m.id)}
                                title={sidebarOpen ? undefined : m.label}
                                className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === m.id
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                {m.id === 'desmanchado'
                                    ? <IconoDesmanchado className="w-4 h-4 shrink-0" />
                                    : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{m.icono}</svg>}
                                <span>{m.label}</span>
                                <AvisoNovedades n={novedadesProceso[m.id]} abierto={sidebarOpen} />
                            </button>
                        ))}

                        {/* Moldes (igual que en FV, abre con los de MS): consulta para cualquier usuario; liberar pide Administración */}
                        <button
                            onClick={() => setActiveModule('moldes')}
                            title={sidebarOpen ? undefined : 'Moldes'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'moldes'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <IconoMolde />
                            <span>Moldes</span>
                        </button>

                        {/* Traslados: OF abiertas vs. sus traslados en SAP (solo consulta, sin permiso propio, como en Fibra) */}
                        <button
                            onClick={() => setActiveModule('traslados')}
                            title={sidebarOpen ? undefined : `Traslados${novedadesTraslados ? ` · ${novedadesTraslados} OF con novedades` : ''}`}
                            className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'traslados'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12m0 0l-4-4m4 4l-4 4M17 17H5m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span>Traslados</span>
                            {novedadesTraslados > 0 && (
                                <b title={`${novedadesTraslados} OF con faltantes o sin traslado`}
                                    className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[#d14747] text-white text-[10px] font-black leading-[18px] text-center shadow ${sidebarOpen ? 'ml-auto' : 'absolute -top-1 right-0.5'}`}>
                                    {novedadesTraslados > 99 ? '99+' : novedadesTraslados}
                                </b>
                            )}
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        {activeModule === 'traslados' ? (
                            <TrasladosFibraModule planta="ms" />
                        ) : activeModule === 'pintura' && hasPermission('pintura') ? (
                            <PinturaModule userEmail={user?.email || ''} />
                        ) : activeModule === 'contramoldes' && hasPermission('contramoldes') ? (
                            <ContramoldeModule userEmail={user?.email || ''} />
                        ) : activeModule === 'vaciado' && hasPermission('vaciado') ? (
                            <VaciadoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'desmolde' && hasPermission('desmolde') ? (
                            <DesmoldeModule userEmail={user?.email || ''} />
                        ) : activeModule === 'pulido' && hasPermission('pulido') ? (
                            <PulidoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'acabado' && hasPermission('acabado') ? (
                            <AcabadoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'reparacion' && hasPermission('reparacion') ? (
                            <ReparacionModule userEmail={user?.email || ''} />
                        ) : activeModule === 'empaque' && hasPermission('empaque') ? (
                            <EmpaqueModule userEmail={user?.email || ''} />
                        ) : activeModule === 'digitado' && hasPermission('digitado') ? (
                            <DigitadoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'cedi' && hasPermission('cedi') ? (
                            <CediModule userEmail={user?.email || ''} />
                        ) : activeModule === 'dashboard' && hasPermission('dashboard') ? (
                            <DashboardModule />
                        ) : activeModule === 'desmanchado' ? (
                            <div className="p-3 bg-gray-50/50 min-h-full"><DesmanchadoMoldes /></div>
                        ) : activeModule === 'parametros' && hasPermission('parametros') ? (
                            <ParametrosModule userEmail={user?.email || ''} />
                        ) : activeModule === 'administracion' && hasPermission('administracion') ? (
                            <AdministracionModule userEmail={user?.email || ''} />
                        ) : activeModule === 'moldes' ? (
                            <MoldesFibraModule puedeLiberar={hasPermission('administracion')} plantaInicial="MS" />
                        ) : (
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                                <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                                    <div className="text-center">
                                        <div className="w-32 h-32 bg-[#254153]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                            <svg className="w-16 h-16 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <h1 className="text-4xl font-bold text-[#254153] mb-4">
                                            Acceso Restringido
                                        </h1>
                                        <p className="text-xl text-gray-600 mb-8">
                                            No tienes permisos para ver el módulo {activeModule || 'seleccionado'}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div >
    )
}
