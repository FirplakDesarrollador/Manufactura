'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import { useEffect, useState, useCallback } from 'react'
import PinturaFibraModule from '@/components/fibra/PinturaFibraModule'
import DashboardFibraModule from '@/components/fibra/dashboard/DashboardFibraModule'
import VaciadoFibraModule from '@/components/fibra/vaciado/VaciadoFibraModule'
import PulidoFibraModule from '@/components/fibra/pulido/PulidoFibraModule'
import HerrajesFibraModule from '@/components/fibra/herrajes/HerrajesFibraModule'
import EnsayoFibraModule from '@/components/fibra/ensayo/EnsayoFibraModule'
import ReparacionFibraModule from '@/components/fibra/reparacion/ReparacionFibraModule'
import EmpaqueFibraModule from '@/components/fibra/empaque/EmpaqueFibraModule'
import DigitadoFibraModule from '@/components/fibra/digitado/DigitadoFibraModule'
import CediFibraModule from '@/components/fibra/cedi/CediFibraModule'
import ParametrosFibraModule from '@/components/fibra/parametros/ParametrosFibraModule'
import AdministracionFibraModule from '@/components/fibra/administracion/AdministracionFibraModule'
import MapaProcesosFibraModule from '@/components/fibra/mapa/MapaProcesosFibraModule'
import PlanosFibraModule from '@/components/fibra/planos/PlanosFibraModule'
import MoldesFibraModule from '@/components/fibra/moldes/MoldesFibraModule'



interface PermisosModulos {
    cedi?: boolean;
    pulido?: boolean;
    acabado?: boolean;
    ensayo?: boolean;
    empaque?: boolean;
    pintura?: boolean;
    vaciado?: boolean;
    digitado?: boolean;
    prensado?: boolean;
    dashboard?: boolean;
    parametros?: boolean;
    reparacion?: boolean;
    administracion?: boolean;
    [key: string]: boolean | undefined;
}

interface User {
    id: string
    email?: string
    permisos?: {
        modulos?: PermisosModulos
        fibra?: PermisosModulos
        [key: string]: any
    }
}

export default function FibraPage() {
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

        // Definir el módulo activo inicial basado en permisos (modulos o fibra)
        const modulos = combinedUser.permisos?.modulos;
        const fibraPerms = (combinedUser.permisos as any)?.fibra;
        const checkPerm = (m: string) => {
            // Herrajes: permiso propio o el de Vaciado / Pulido (los mismos operarios)
            if (m === 'herrajes') return ['herrajes', 'vaciado', 'pulido'].some(k => modulos?.[k] === true || fibraPerms?.[k] === true)
            if (m === 'ensayo') {
                return modulos?.ensayo === true || fibraPerms?.ensayo === true || modulos?.acabado === true || fibraPerms?.acabado === true
            }
            return modulos?.[m] === true || fibraPerms?.[m] === true
        }

        if (modulos || fibraPerms) {
            if (!checkPerm('pintura')) {
                const priorityModules = ['pintura', 'vaciado', 'herrajes', 'pulido', 'ensayo', 'reparacion', 'empaque', 'digitado', 'cedi', 'dashboard', 'parametros', 'administracion'];
                const firstAllowed = priorityModules.find(m => checkPerm(m));
                if (firstAllowed) {
                    setActiveModule(firstAllowed);
                } else if (checkPerm('dashboard')) {
                    setActiveModule('dashboard');
                } else {
                    // El mapa de procesos es solo consulta: lo ve cualquier usuario de la planta
                    setActiveModule('mapa');
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

    useEffect(() => {
        if (window.innerWidth < 768) setSidebarOpen(false)
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
        const fibra = (user.permisos as any)?.fibra
        const modulos = user.permisos?.modulos
        if (moduleName === 'herrajes') return ['herrajes', 'vaciado', 'pulido'].some(k => modulos?.[k] === true || fibra?.[k] === true)
        if (moduleName === 'ensayo') {
            return modulos?.ensayo === true || fibra?.ensayo === true || modulos?.acabado === true || fibra?.acabado === true
        }
        return modulos?.[moduleName] === true || fibra?.[moduleName] === true
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header title="Control de Piso Fibra (FV)" subtitle="" compact={true} userEmail={user?.email} showLogout={true} onLogout={handleSignOut} />

            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {/* Sidebar Backdrop (Mobile only) */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                {/* Espacio que ocupa la barra de íconos en celular (el menú abierto flota encima) */}
                <div className="w-12 shrink-0 md:hidden" />
                <aside
                    className={`fixed md:sticky top-12 bottom-0 md:h-[calc(100vh-3rem)] left-0 z-50 md:z-30 shrink-0 transition-all duration-300 ease-in-out bg-white border-r border-[#e2ded5] shadow-sm overflow-hidden
                        ${sidebarOpen ? 'w-52' : 'w-12'}`}
                >
                    <nav onClick={e => { if (window.innerWidth < 768 && (e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[title$="menú de módulos"]')) setSidebarOpen(false) }} className={`p-2 space-y-1 overflow-y-auto h-full ${sidebarOpen ? '' : '[&_button>span]:hidden [&_button]:justify-center [&_button]:px-0'}`}>
                        {/* Abrir / recoger el menú de módulos (antes era el botón ≡ del encabezado propio de Fibra) */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center space-x-2 px-3 h-8 mb-1 rounded-lg w-full text-[10px] font-black uppercase tracking-wider text-[#324354] bg-[#F6F3EE] hover:bg-[#e2ded5] transition-colors"
                            title={sidebarOpen ? 'Recoger menú de módulos' : 'Abrir menú de módulos'}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
                            </svg>
                            <span className="flex-1 text-left">Módulos FV</span>
                        </button>

                        {hasPermission('pintura') && (
                            <button
                                onClick={() => setActiveModule('pintura')}
                                title={sidebarOpen ? undefined : 'Pintura'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'pintura'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h10a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H3zM15 8.5h2M7 7V4h4v3M6 12l-1.5 8h3.5L9.5 12M10.5 12.5c1 .3 1.5 1 1.5 2M19.5 5.5h.01M21.5 8.5h.01M19.5 11.5h.01M21.5 3h.01M21.5 14h.01" />
                                </svg>
                                <span>Pintura</span>
                            </button>
                        )}

                        {hasPermission('vaciado') && (
                            <button
                                onClick={() => setActiveModule('vaciado')}
                                title={sidebarOpen ? undefined : 'Vaciado'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'vaciado'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/* Vaciado: rodillo aireador de fibra de vidrio (rodillo con ranuras, alambre doblado y mango) */}
                                    <rect x="2.5" y="3" width="13" height="5.5" rx="2.75" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeWidth={1.5} d="M6 3.5v4.5M9 3.5v4.5M12 3.5v4.5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 5.75H19v5.75l-6 2.5V16" />
                                    <path strokeLinecap="round" strokeWidth={3.5} d="M13 16.5v4.5" />
                                </svg>
                                <span>Vaciado</span>
                            </button>
                        )}

                        {hasPermission('herrajes') && (
                            <button
                                onClick={() => setActiveModule('herrajes')}
                                title={sidebarOpen ? undefined : 'Herrajes'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'herrajes'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                {/* Instalación Herrajes: matriz (bastidor) metálica con travesaños y pernos */}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="16" rx="1.5" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16M3 12h18" />
                                    <path strokeLinecap="round" strokeWidth={3} d="M9 12h.01M15 12h.01" />
                                </svg>
                                <span>Herrajes</span>
                            </button>
                        )}

                        {hasPermission('pulido') && (
                            <button
                                onClick={() => setActiveModule('pulido')}
                                title={sidebarOpen ? undefined : 'Pulido'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'pulido'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/* Pulidora: cuerpo, cabezal, disco y mango lateral */}
                                    <rect x="2" y="8" width="11" height="5" rx="2.5" strokeWidth={2} />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9h3.5v3H13M8 13v5M5 10.5h3" />
                                    <ellipse cx="19.5" cy="10.5" rx="1.5" ry="6" strokeWidth={2} />
                                </svg>
                                <span>Pulido</span>
                            </button>
                        )}

                        {hasPermission('ensayo') && (
                            <button
                                onClick={() => setActiveModule('ensayo')}
                                title={sidebarOpen ? undefined : 'Ensayo'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'ensayo'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/* Ensayo: bañera de hidromasaje completa, con grifería y burbujas de los chorros */}
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 11.5h19v2.5a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5zM7 19l-1 2M17 19l1 2M5 11.5V5.5a2 2 0 0 1 3.6-1.2" />
                                    <path strokeLinecap="round" strokeWidth={2.5} d="M11 8.5h.01M14.5 7h.01M18 8.5h.01" />
                                </svg>
                                <span>Ensayo</span>
                            </button>
                        )}

                        {hasPermission('reparacion') && (
                            <button
                                onClick={() => setActiveModule('reparacion')}
                                title={sidebarOpen ? undefined : 'Reparación'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'reparacion'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                                <span>Reparación</span>
                            </button>
                        )}

                        {hasPermission('empaque') && (
                            <button
                                onClick={() => setActiveModule('empaque')}
                                title={sidebarOpen ? undefined : 'Guacales'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'empaque'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18v14H3zM3 9.5h18M3 14.5h18M7 5v14M17 5v14" />
                                </svg>
                                <span>Guacales</span>
                            </button>
                        )}

                        {hasPermission('digitado') && (
                            <button
                                onClick={() => setActiveModule('digitado')}
                                title={sidebarOpen ? undefined : 'Digitado'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'digitado'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 12.5h.01M12 12.5h.01M16 12.5h.01M7 16h10" />
                                </svg>
                                <span>Digitado</span>
                            </button>
                        )}

                        {hasPermission('cedi') && (
                            <button
                                onClick={() => setActiveModule('cedi')}
                                title={sidebarOpen ? undefined : 'CEDI'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'cedi'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35ZM6 22V12h12v10M6 15h12M6 18.5h12" />
                                </svg>
                                <span>CEDI</span>
                            </button>
                        )}

                        {hasPermission('dashboard') && (
                            <button
                                onClick={() => setActiveModule('dashboard')}
                                title={sidebarOpen ? undefined : 'Dashboard'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'dashboard'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>Dashboard</span>
                            </button>
                        )}

                        {hasPermission('parametros') && (
                            <button
                                onClick={() => setActiveModule('parametros')}
                                title={sidebarOpen ? undefined : 'Parámetros'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'parametros'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                <span>Parámetros</span>
                            </button>
                        )}

                        {hasPermission('administracion') && (
                            <button
                                onClick={() => setActiveModule('administracion')}
                                title={sidebarOpen ? undefined : 'Administración'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'administracion'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/* Escudo con visto bueno: control y supervisión */}
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4" />
                                </svg>
                                <span>Administración</span>
                            </button>
                        )}

                        {/* Planos: los ve cualquier usuario de la planta; cargarlos pide el permiso fibra.planos */}
                        <button
                            onClick={() => setActiveModule('planos')}
                            title={sidebarOpen ? undefined : 'Planos'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'planos'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5M8 9h2" />
                            </svg>
                            <span>Planos</span>
                        </button>

                        {/* Moldes: consulta para cualquier usuario de la planta; liberar pide el permiso de Administración */}
                        <button
                            onClick={() => setActiveModule('moldes')}
                            title={sidebarOpen ? undefined : 'Moldes'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'moldes'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {/* Cajas apiladas: moldes */}
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l4-2 4 2v5l-4 2-4-2zM13 7l4-2 4 2v5l-4 2-4-2zM8 14l4-2 4 2v5l-4 2-4-2z" />
                            </svg>
                            <span>Moldes</span>
                        </button>

                        {/* Mapa de procesos: solo consulta, sin permiso propio */}
                        <button
                            onClick={() => setActiveModule('mapa')}
                            title={sidebarOpen ? undefined : 'Mapa de procesos'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'mapa'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Mapa de procesos</span>
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        {activeModule === 'mapa' ? (
                            <MapaProcesosFibraModule />
                        ) : activeModule === 'moldes' ? (
                            <MoldesFibraModule puedeLiberar={hasPermission('administracion')} />
                        ) : activeModule === 'planos' ? (
                            <PlanosFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'pintura' && hasPermission('pintura') ? (
                            <PinturaFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'vaciado' && hasPermission('vaciado') ? (
                            <VaciadoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'herrajes' && hasPermission('herrajes') ? (
                            <HerrajesFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'pulido' && hasPermission('pulido') ? (
                            <PulidoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'ensayo' && hasPermission('ensayo') ? (
                            <EnsayoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'reparacion' && hasPermission('reparacion') ? (
                            <ReparacionFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'empaque' && hasPermission('empaque') ? (
                            <EmpaqueFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'digitado' && hasPermission('digitado') ? (
                            <DigitadoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'cedi' && hasPermission('cedi') ? (
                            <CediFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'dashboard' && hasPermission('dashboard') ? (
                            <DashboardFibraModule />
                        ) : activeModule === 'parametros' && hasPermission('parametros') ? (
                            <ParametrosFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'administracion' && hasPermission('administracion') ? (
                            <AdministracionFibraModule userEmail={user?.email || ''} />
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
