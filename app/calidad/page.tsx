'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'

interface User {
    id: string
    email?: string
}

export default function CalidadPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [modalModule, setModalModule] = useState('')

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser()

            if (!data.user) {
                router.push('/login')
                return
            }

            setUser({
                id: data.user.id,
                email: data.user.email
            })

            setLoading(false)
        }

        getUser()
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleUnderConstruction = (moduleName: string) => {
        setModalModule(moduleName)
        setShowModal(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] selection:bg-[#324354] selection:text-white">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-[100px]"></div>
                <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-slate-100/50 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#324354]/5 blur-[120px]"></div>
            </div>

            {/* Header */}
            <Header
                title="Calidad"
                subtitle="Módulo Operativo"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 md:py-16 lg:py-20 pt-28">
                <div className="w-full max-w-[1700px] mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 justify-items-center w-full">
                        
                        {/* 1. Indicadores Calidad (Nuevo / En construcción) */}
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => handleUnderConstruction('Indicadores Calidad')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Indicadores Calidad</span>
                            </button>
                        </div>

                        {/* 2. Calidad MS */}
                        <div className="w-full max-w-[290px] aspect-square">
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

                        {/* 3. Respuesta Rápida Calidad RRC */}
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => router.push('/ficha-rcc')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Respuesta Rápida Calidad<br/>RRC</span>
                            </button>
                        </div>

                        {/* 4. Criterios de Calidad */}
                        <div className="w-full max-w-[290px] aspect-square">
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

                        {/* 5. Plan de Vigilancia */}
                        <div className="w-full max-w-[290px] aspect-square">
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

                        {/* 6. QRQC */}
                        <div className="w-full max-w-[290px] aspect-square">
                            <button
                                onClick={() => router.push('/calidad/qrqc')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                    QRQC<br />
                                    <span className="text-xs md:text-sm font-normal italic text-gray-400 group-hover:text-gray-500 transition-colors duration-300 mt-1 block">Quick Response Quality Control</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Premium Under Construction Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-[#e2ded5] text-center transform scale-100 transition-all duration-300">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50">
                            <svg className="w-10 h-10 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-[#324354] mb-3">Módulo en Construcción</h3>
                        <p className="text-gray-500 mb-6 font-medium">El módulo <span className="font-bold text-[#324354]">"{modalModule}"</span> se encuentra actualmente en desarrollo para mejorar nuestros procesos.</p>
                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full py-3 bg-[#324354] text-[#F6F3EE] font-bold rounded-2xl hover:bg-[#324354]/95 hover:shadow-lg transition-all duration-300"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
