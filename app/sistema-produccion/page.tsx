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
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
            </div>
        )
    }

    const hasApp = (appKey: keyof NonNullable<User['permisos']>) => {
        return user?.permisos && user.permisos[appKey] && 
               (typeof user.permisos[appKey] === 'object' || user.permisos[appKey] === true);
    }
    
    const hasOptSistemica = () => {
        return hasApp('opt_sistemica') || hasApp('opt');
    }

    const hasHdt = () => {
        return true;
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-[100px]"></div>
                <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-slate-100/50 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#324354]/5 blur-[120px]"></div>
            </div>

            {/* Premium Header */}
            <header className="relative z-50 bg-[#324354] border-b border-[#324354] shadow-md sticky top-0">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/home')}
                            className="group flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300 shadow-sm"
                            title="Volver al Inicio"
                        >
                            <svg className="w-5 h-5 text-[#F6F3EE] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-display font-light text-white tracking-widest uppercase">
                                Sistema de Producción
                            </h1>
                            <p className="text-xs sm:text-sm text-[#F6F3EE]/70 font-medium tracking-wide">Módulo Operativo</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6 min-w-0 shrink-0">
                        <div className="text-right hidden md:block max-w-[200px] lg:max-w-[300px] min-w-0">
                            <p className="text-[10px] text-[#F6F3EE]/60 font-bold tracking-widest uppercase">Bienvenido</p>
                            <p className="text-sm font-semibold text-white truncate" title={user?.email || 'Usuario'}>{user?.email || 'Usuario'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-[#7B8E90] hover:bg-[#6c7d7f] text-white rounded-xl transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md shrink-0"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16">
                
                <div className="w-full max-w-[1600px] flex flex-wrap justify-center gap-6 md:gap-8">
                    
                    {/* HDT Button */}
                    {hasHdt() && (
                        <button
                            onClick={() => router.push('/hdt')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                HDT
                                <span className="block text-base font-bold text-gray-600 group-hover:text-[#324354] mt-1 transition-colors duration-300">Hoja División de Trabajo</span>
                                <span className="block text-xs md:text-sm font-normal italic text-gray-400 group-hover:text-gray-500 mt-1 transition-colors duration-300">Estandarización</span>
                            </span>
                        </button>
                    )}

                    {/* Hora a Hora Button */}
                    {hasApp('hora_a_hora') && (
                        <button
                            onClick={() => router.push('/hora-a-hora')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">Hora a Hora</span>
                        </button>
                    )}

                    {/* OPT Operativa Button */}
                    {hasApp('opt') && (
                        <button
                            onClick={() => router.push('/opt')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">OPT Operativa</span>
                        </button>
                    )}

                    {/* OPT Sistémica Button */}
                    {hasOptSistemica() && (
                        <button
                            onClick={() => router.push('/opt-sistemica')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">OPT Sistémica</span>
                        </button>
                    )}

                    {/* Estadísticas del Sistema Button */}
                    {hasApp('estadisticas_produccion') && (
                        <button
                            onClick={() => router.push('/estadisticas-produccion')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">Estadísticas del Sistema</span>
                        </button>
                    )}

                    {/* Tarjetas Excelencia Button */}
                    {hasApp('tarjetas_excelencia') && (
                        <button
                            onClick={() => router.push('/tarjetas-excelencia')}
                            className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                                <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">Tarjetas Excelencia</span>
                        </button>
                    )}

                    {/* Bitácora Button */}
                    <button
                        onClick={() => router.push('/sistema-produccion/bitacora')}
                        className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                            <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">Bitácora</span>
                    </button>

                    {/* Auditorías Button */}
                    <button
                        onClick={() => router.push('/sistema-produccion/auditorias')}
                        className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                            <svg className="w-8 h-8 text-[#324354] group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center">Auditorías</span>
                    </button>

                    {!hasApp('hora_a_hora') && !hasApp('opt') && !hasOptSistemica() && !hasApp('estadisticas_produccion') && !hasApp('tarjetas_excelencia') && !hasHdt() && (
                        <div className="w-full max-w-lg py-20 px-8 text-center bg-white rounded-3xl border border-[#e2ded5] shadow-sm">
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
