'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import PinturaModule from '@/components/pintura/PinturaModule'
import DashboardModule from '@/components/dashboard/DashboardModule'
import ContramoldeModule from '@/components/contramoldes/ContramoldeModule'
import VaciadoModule from '@/components/vaciado/VaciadoModule'
import DesmoldeModule from '@/components/desmolde/DesmoldeModule'
import PulidoModule from '@/components/pulido/PulidoModule'
import AcabadoModule from '@/components/acabado/AcabadoModule'
import ReparacionModule from '@/components/reparacion/ReparacionModule'
import EmpaqueModule from '@/components/empaque/EmpaqueModule'
import DigitadoModule from '@/components/digitado/DigitadoModule'
import CediModule from '@/components/cedi/CediModule'
import ParametrosModule from '@/components/parametros/ParametrosModule'
import AdministracionModule from '@/components/administracion/AdministracionModule'


export default function MarmorPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeModule, setActiveModule] = useState('pintura')

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            } else {
                setUser(user)
            }
        }
        getUser()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-[#254153] border-b border-[#1a2e3b] sticky top-0 z-50 shadow-md">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
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
                                <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-white">Manufactura - Mármol</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm text-gray-200">Bienvenido</p>
                                <p className="text-sm font-semibold text-white">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
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

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`${sidebarOpen ? 'w-64' : 'w-0'
                        } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden shadow-lg`}
                >
                    <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">

                        <button
                            onClick={() => setActiveModule('pintura')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'pintura'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            <span>Pintura</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('contramoldes')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'contramoldes'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                            <span>Contramoldes</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('vaciado')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'vaciado'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span>Vaciado</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('desmolde')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'desmolde'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Desmolde</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('pulido')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'pulido'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Pulido</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('acabado')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'acabado'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Acabado</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('reparacion')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'reparacion'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Reparación</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('empaque')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'empaque'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span>Empaque</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('digitado')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'digitado'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Digitado</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('cedi')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'cedi'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <span>CEDI</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('dashboard')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'dashboard'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('parametros')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'parametros'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            <span>Parámetros</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('administracion')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'administracion'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Administración</span>
                        </button>

                        <button
                            onClick={() => setActiveModule('tvprensado')}
                            className={`flex items-center space-x-3 px-4 py-4 rounded-lg transition-colors font-medium text-base w-full ${activeModule === 'tvprensado'
                                ? 'bg-[#254153] text-white'
                                : 'text-gray-700 hover:bg-[#254153]/10 hover:text-[#254153]'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>TV Prensado</span>
                        </button>

                        <div className="pt-4 border-t border-gray-200 mt-4">
                            <button
                                onClick={() => router.push('/home/selection')}
                                className="flex items-center space-x-3 px-4 py-4 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full font-medium text-base"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Volver al Inicio</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'} h-[calc(100vh-4rem)] bg-white`}>
                    {activeModule === 'pintura' ? (
                        <PinturaModule userEmail={user?.email || ''} />
                    ) : activeModule === 'contramoldes' ? (
                        <ContramoldeModule userEmail={user?.email || ''} />
                    ) : activeModule === 'vaciado' ? (
                        <VaciadoModule userEmail={user?.email || ''} />
                    ) : activeModule === 'desmolde' ? (
                        <DesmoldeModule userEmail={user?.email || ''} />
                    ) : activeModule === 'pulido' ? (
                        <PulidoModule userEmail={user?.email || ''} />
                    ) : activeModule === 'acabado' ? (
                        <AcabadoModule userEmail={user?.email || ''} />
                    ) : activeModule === 'reparacion' ? (
                        <ReparacionModule userEmail={user?.email || ''} />
                    ) : activeModule === 'empaque' ? (
                        <EmpaqueModule userEmail={user?.email || ''} />
                    ) : activeModule === 'digitado' ? (
                        <DigitadoModule userEmail={user?.email || ''} />
                    ) : activeModule === 'cedi' ? (
                        <CediModule userEmail={user?.email || ''} />
                    ) : activeModule === 'dashboard' ? (
                        <DashboardModule />
                    ) : activeModule === 'parametros' ? (
                        <ParametrosModule userEmail={user?.email || ''} />
                    ) : activeModule === 'administracion' ? (
                        <AdministracionModule userEmail={user?.email || ''} />
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
                                        Módulo {activeModule}
                                    </h1>
                                    <p className="text-xl text-gray-600 mb-8">
                                        Este módulo se encuentra en desarrollo. Por favor selecciona otro del menú lateral.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div >
    )
}
