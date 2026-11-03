'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import { useEffect, useState, useCallback } from 'react'
import PinturaFibraModule from '@/components/fibra/PinturaFibraModule'
import DashboardFibraModule from '@/components/fibra/dashboard/DashboardFibraModule'
import ContramoldeFibraModule from '@/components/fibra/contramoldes/ContramoldeFibraModule'
import VaciadoFibraModule from '@/components/fibra/vaciado/VaciadoFibraModule'
import DesmoldeFibraModule from '@/components/fibra/desmolde/DesmoldeFibraModule'
import PulidoFibraModule from '@/components/fibra/pulido/PulidoFibraModule'
import AcabadoFibraModule from '@/components/fibra/acabado/AcabadoFibraModule'
import ReparacionFibraModule from '@/components/fibra/reparacion/ReparacionFibraModule'
import EmpaqueFibraModule from '@/components/fibra/empaque/EmpaqueFibraModule'
import DigitadoFibraModule from '@/components/fibra/digitado/DigitadoFibraModule'
import CediFibraModule from '@/components/fibra/cedi/CediFibraModule'
import ParametrosFibraModule from '@/components/fibra/parametros/ParametrosFibraModule'
import AdministracionFibraModule from '@/components/fibra/administracion/AdministracionFibraModule'
import BuscadorOrdenesFibraModule from '@/components/fibra/buscador/BuscadorOrdenesFibraModule'
import MapaProcesosFibraModule from '@/components/fibra/mapa/MapaProcesosFibraModule'



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
        const checkPerm = (m: string) => modulos?.[m] === true || fibraPerms?.[m] === true;

        if (modulos || fibraPerms) {
            if (!checkPerm('pintura')) {
                const priorityModules = ['pintura', 'contramoldes', 'vaciado', 'desmolde', 'pulido', 'acabado', 'reparacion', 'empaque', 'digitado', 'cedi', 'dashboard', 'parametros', 'administracion'];
                const firstAllowed = priorityModules.find(m => checkPerm(m));
                if (firstAllowed) {
                    setActiveModule(firstAllowed);
                } else if (checkPerm('dashboard')) {
                    setActiveModule('dashboard');
                } else {
                    // El buscador es solo consulta: lo ve cualquier usuario de la planta
                    setActiveModule('buscador');
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
        return user.permisos?.modulos?.[moduleName] === true || (user.permisos as any)?.fibra?.[moduleName] === true;
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

                        {/* Buscador de órdenes: solo consulta, sin permiso propio */}
                        <button
                            onClick={() => setActiveModule('buscador')}
                            title={sidebarOpen ? undefined : 'Buscador'}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'buscador'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Buscador</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                <span>Pintura</span>
                            </button>
                        )}

                        {hasPermission('contramoldes') && (
                            <button
                                onClick={() => setActiveModule('contramoldes')}
                                title={sidebarOpen ? undefined : 'Contramoldes'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'contramoldes'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                                <span>Contramoldes</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span>Vaciado</span>
                            </button>
                        )}

                        {hasPermission('desmolde') && (
                            <button
                                onClick={() => setActiveModule('desmolde')}
                                title={sidebarOpen ? undefined : 'Desmolde'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'desmolde'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Desmolde</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span>Pulido</span>
                            </button>
                        )}

                        {hasPermission('acabado') && (
                            <button
                                onClick={() => setActiveModule('acabado')}
                                title={sidebarOpen ? undefined : 'Acabado'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'acabado'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                <span>Acabado</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Reparación</span>
                            </button>
                        )}

                        {hasPermission('empaque') && (
                            <button
                                onClick={() => setActiveModule('empaque')}
                                title={sidebarOpen ? undefined : 'Empaque'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'empaque'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <span>Empaque</span>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Administración</span>
                            </button>
                        )}

                        {hasPermission('prensado') && (
                            <button
                                onClick={() => setActiveModule('tvprensado')}
                                title={sidebarOpen ? undefined : 'TV Prensado'}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-xs w-full ${activeModule === 'tvprensado'
                                    ? 'bg-[#254153] text-white'
                                    : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>TV Prensado</span>
                            </button>
                        )}

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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span>Mapa de procesos</span>
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 h-[calc(100vh-3rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        {activeModule === 'buscador' ? (
                            <BuscadorOrdenesFibraModule />
                        ) : activeModule === 'mapa' ? (
                            <MapaProcesosFibraModule />
                        ) :activeModule === 'pintura' && hasPermission('pintura') ? (
                            <PinturaFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'contramoldes' && hasPermission('contramoldes') ? (
                            <ContramoldeFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'vaciado' && hasPermission('vaciado') ? (
                            <VaciadoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'desmolde' && hasPermission('desmolde') ? (
                            <DesmoldeFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'pulido' && hasPermission('pulido') ? (
                            <PulidoFibraModule userEmail={user?.email || ''} />
                        ) : activeModule === 'acabado' && hasPermission('acabado') ? (
                            <AcabadoFibraModule userEmail={user?.email || ''} />
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
