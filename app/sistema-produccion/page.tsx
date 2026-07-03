'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface User {
    id: string
    email?: string
    permisos?: {
        hora_a_hora?: any;
        opt?: any;
        opt_sistemica?: any;
        estadisticas_produccion?: any;
        tarjetas_excelencia?: any;
    }
}

export default function SistemaProduccionPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const getUserData = useCallback(async () => {
        setLoading(true)
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            router.push('/login')
            return
        }

        const { data: userData } = await supabase
            .from('usuarios')
            .select('permisos')
            .eq('uuid', authUser.id)
            .single()

        const combinedUser: User = {
            id: authUser.id,
            email: authUser.email,
            permisos: (userData?.permisos as any) || {}
        }

        setUser(combinedUser)
        setLoading(false)
    }, [router])

    useEffect(() => {
        getUserData()
    }, [getUserData])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#254153] to-[#12232f] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white border-t-transparent"></div>
            </div>
        )
    }

    const hasApp = (appKey: keyof NonNullable<User['permisos']>) => {
        return user?.permisos && user.permisos[appKey] && 
               (typeof user.permisos[appKey] === 'object' || user.permisos[appKey] === true);
    }
    
    // Some are combinations
    const hasOptSistemica = () => {
        return hasApp('opt_sistemica') || hasApp('opt');
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-[#254153] selection:text-white">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[100px]"></div>
                <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-teal-50/50 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#254153]/5 blur-[120px]"></div>
            </div>

            {/* Premium Header */}
            <header className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm sticky top-0">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/home')}
                            className="group flex items-center justify-center w-11 h-11 bg-white hover:bg-slate-50 border border-gray-200 hover:border-[#254153]/30 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
                            title="Volver al Inicio"
                        >
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-[#254153] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#254153] to-[#407393]">
                                Sistema de Producción
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide">Módulo Operativo</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right hidden md:block max-w-[200px] lg:max-w-[300px]">
                            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Bienvenido</p>
                            <p className="text-sm font-semibold text-gray-700 truncate" title={user?.email || 'Usuario'}>{user?.email || 'Usuario'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-white border border-red-100 text-red-600 hover:text-white group transition-all duration-300 shadow-sm hover:shadow-md hover:border-transparent"
                        >
                            <span className="absolute inset-0 bg-red-600 w-full h-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            <span className="relative z-10 font-semibold text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16">
                
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight mb-3">
                        ¿Qué deseas consultar hoy?
                    </h2>
                    <p className="text-gray-500 font-medium max-w-xl mx-auto">
                        Selecciona una de las herramientas a continuación para acceder a la gestión y métricas del sistema.
                    </p>
                </div>

                <div className="w-full max-w-[1600px] flex flex-wrap justify-center gap-6 md:gap-8">
                    
                    {/* Hora a Hora Button */}
                    {hasApp('hora_a_hora') && (
                        <button
                            onClick={() => router.push('/hora-a-hora')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(37,65,83,0.15)] hover:border-[#254153]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#254153] group-hover:border-[#254153] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#254153] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#254153] transition-colors duration-300 text-center">Hora a Hora</span>
                        </button>
                    )}

                    {/* OPT Button */}
                    {hasApp('opt') && (
                        <button
                            onClick={() => router.push('/opt')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(37,65,83,0.15)] hover:border-[#254153]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#254153] group-hover:border-[#254153] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#254153] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#254153] transition-colors duration-300 text-center">OPT</span>
                        </button>
                    )}

                    {/* OPT Sistémica Button */}
                    {hasOptSistemica() && (
                        <button
                            onClick={() => router.push('/opt-sistemica')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(37,65,83,0.15)] hover:border-[#254153]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#254153] group-hover:border-[#254153] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#254153] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#254153] transition-colors duration-300 text-center">OPT Sistémica</span>
                        </button>
                    )}

                    {/* Estadísticas Sistema Button */}
                    {hasApp('estadisticas_produccion') && (
                        <button
                            onClick={() => router.push('/estadisticas-produccion')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(37,65,83,0.15)] hover:border-[#254153]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#254153] group-hover:border-[#254153] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#254153] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#254153] transition-colors duration-300 text-center">Estadísticas Sistema</span>
                        </button>
                    )}

                    {/* Tarjetas Excelencia Button */}
                    {hasApp('tarjetas_excelencia') && (
                        <button
                            onClick={() => router.push('/tarjetas-excelencia')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(37,65,83,0.15)] hover:border-[#254153]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#254153] group-hover:border-[#254153] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#254153] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#254153] transition-colors duration-300 text-center">Tarjetas Excelencia</span>
                        </button>
                    )}

                    {!hasApp('hora_a_hora') && !hasApp('opt') && !hasOptSistemica() && !hasApp('estadisticas_produccion') && !hasApp('tarjetas_excelencia') && (
                        <div className="w-full max-w-lg py-20 px-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-50 rounded-full mb-6 ring-8 ring-amber-50/50">
                                <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">Sin aplicaciones asignadas</h2>
                            <p className="text-gray-500 font-medium">No tienes permisos para acceder a ninguna de estas aplicaciones. Por favor, contacta a tu administrador.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
