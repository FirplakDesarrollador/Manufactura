'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'

export default function CalidadPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    interface User {
        id: string
        email?: string
        permisos?: {
            calidad?: any;
            ficha_rcc?: any;
        }
    }

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser()

            if (!data.user) {
                router.push('/login')
                return
            }

            const { data: userData } = await supabase
                .from('usuarios')
                .select('permisos')
                .eq('uuid', data.user.id)
                .single()

            setUser({
                id: data.user.id,
                email: data.user.email,
                permisos: userData?.permisos || {}
            } as any)

            setLoading(false)
        }

        getUser()
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const hasCalidad = () => {
        return !!user?.permisos?.calidad;
    }

    const hasFichaRrc = () => {
        return !!user?.permisos?.ficha_rcc;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            {/* Header */}
            <Header
                title="Calidad"
                subtitle="Módulo Operativo"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center w-full max-w-6xl mx-auto px-4 md:px-8">
                    {hasCalidad() && (
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => router.push('/calidad/ms')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Calidad MS</span>
                            </button>
                        </div>
                    )}

                    {hasFichaRrc() && (
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => router.push('/ficha-rcc')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Respuesta Rapida Calidad<br/>RRC</span>
                            </button>
                        </div>
                    )}

                    {hasCalidad() && (
                        <>
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/calidad/criterios')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Criterios de<br/>Calidad</span>
                                </button>
                            </div>

                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/calidad/vigilancia')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Plan de<br/>Vigilancia</span>
                                </button>
                            </div>
                        </>
                    )}

                    {!hasCalidad() && !hasFichaRrc() && (
                        <div className="text-center py-10 col-span-full">
                            <p className="text-slate-500 font-medium">No tienes permisos para acceder a las opciones de Calidad.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
