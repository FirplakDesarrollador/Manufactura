'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'

interface User {
    id: string
    email?: string
    permisos?: {
        modulos?: any;
        muebles?: any;
        fibra?: any;
        calidad?: any;
    }
}

export default function SelectionPage() {
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

        // Redirección automática si solo tiene una aplicación
        const appPaths: Record<string, string> = {
            modulos: '/marmol',
            muebles: '/muebles',
            calidad: '/calidad',
            fibra: '/fibra'
        };

        const availableApps = Object.keys(combinedUser.permisos || {}).filter(key => 
            appPaths[key] && combinedUser.permisos![key as keyof NonNullable<User['permisos']>]
        );

        if (availableApps.length === 1) {
            router.push(appPaths[availableApps[0]]);
        } else {
            setLoading(false)
        }
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

    return (
        <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] relative overflow-x-hidden selection:bg-[#324354] selection:text-white">
            
            {/* Background Subtle Gradient */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-slate-200/40 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#324354]/5 blur-[120px]" />
            </div>

            {/* Premium Header - matching Calidad's styling */}
            <Header
                title="Control de Piso"
                subtitle="Selección de Módulo"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Custom fonts and scoped styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Jost:wght@300;400;500;600&display=swap');
                body {
                    font-family: 'Montserrat', sans-serif !important;
                }
            `}} />

            {/* Main Content Container with max width 1700px to align cards perfectly */}
            <main className="relative z-10 flex-1 flex flex-col justify-start p-6 md:p-12 pt-32 max-w-[1700px] mx-auto w-full">
                
                {/* Responsive grid with 5 columns on PC */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 justify-items-center w-full">
                    
                    {/* Mármol Button */}
                    {hasApp('modulos') && (
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => router.push('/marmol')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                    Control de Piso Mármol
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Muebles Button */}
                    {hasApp('muebles') && (
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => router.push('/muebles')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                    Control de piso Muebles
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Fibra Button */}
                    {hasApp('fibra') && (
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => router.push('/fibra')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                    Control de piso Fibra
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Fallback layout in case no permissions are configured */}
                    {!hasApp('modulos') && !hasApp('muebles') && !hasApp('fibra') && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100/80 rounded-full mb-4">
                                <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2 font-sans">Sin aplicaciones asignadas</h2>
                            <p className="text-gray-600 max-w-md font-sans">No tienes permisos habilitados para acceder a ninguna de las aplicaciones de control de piso de manufactura.</p>
                        </div>
                    )}

                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm z-10 relative">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
