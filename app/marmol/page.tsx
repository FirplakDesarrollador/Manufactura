'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import PinturaModule from '@/components/pintura/PinturaModule'
import DashboardModule from '@/components/dashboard/DashboardModule'
import ContramoldeModule from '@/components/contramoldes/ContramoldeModule'
import VaciadoModule from '@/components/vaciado/VaciadoModule'
import DesmoldeModule from '@/components/desmolde/DesmoldeModule'
import PulidoModule from '@/components/pulido/PulidoModule'
import DigitadoModule from '@/components/digitado/DigitadoModule'
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-[#254153] border-b border-[#1a2e3b] sticky top-0 z-50 shadow-md">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-12">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push('/home/selection')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                                title="Volver a Selección"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold text-white">Manufactura - Mármol</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-gray-200">Bienvenido</p>
                                <p className="text-white font-semibold text-xs">{user?.email || 'Usuario'}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-lg transition text-[10px]"
                            >
                                Cerrar Sesión
                            </button>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-white hover:bg-[#1a2e3b] p-2 rounded-lg transition-colors border border-white/20"
                                title="Toggle Sidebar"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-3rem)] relative">
                {/* Sidebar Backdrop (Mobile only) */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed md:relative inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-lg
                        ${sidebarOpen ? 'translate-x-0 w-52' : '-translate-x-full md:translate-x-0 md:w-0'}
                        overflow-hidden`}
                >
                    <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-3rem)]">

                        {hasPermission('pintura') && (
                            <button
                                onClick={() => setActiveModule('pintura')}
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


                        {hasPermission('digitado') && (
                            <button
                                onClick={() => setActiveModule('digitado')}
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

                        <div className="pt-4 border-t border-gray-200 mt-4">
                            <button
                                onClick={() => router.push('/home/selection')}
                                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full font-medium text-xs"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Volver al Inicio</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 h-[calc(100vh-4rem)] bg-white overflow-hidden relative">
                    <div className="h-full overflow-y-auto">
                        {activeModule === 'pintura' && hasPermission('pintura') ? (
                            <PinturaModule userEmail={user?.email || ''} />
                        ) : activeModule === 'contramoldes' && hasPermission('contramoldes') ? (
                            <ContramoldeModule userEmail={user?.email || ''} />
                        ) : activeModule === 'vaciado' && hasPermission('vaciado') ? (
                            <VaciadoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'desmolde' && hasPermission('desmolde') ? (
                            <DesmoldeModule userEmail={user?.email || ''} />
                        ) : activeModule === 'pulido' && hasPermission('pulido') ? (
                            <PulidoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'digitado' && hasPermission('digitado') ? (
                            <DigitadoModule userEmail={user?.email || ''} />
                        ) : activeModule === 'cedi' && hasPermission('cedi') ? (
                            <CediModule userEmail={user?.email || ''} />
                        ) : activeModule === 'dashboard' && hasPermission('dashboard') ? (
                            <DashboardModule />
                        ) : activeModule === 'parametros' && hasPermission('parametros') ? (
                            <ParametrosModule userEmail={user?.email || ''} />
                        ) : activeModule === 'administracion' && hasPermission('administracion') ? (
                            <AdministracionModule userEmail={user?.email || ''} />
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
