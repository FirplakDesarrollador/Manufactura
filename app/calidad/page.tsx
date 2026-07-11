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
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col">
            {/* Header */}
            <Header
                title="Calidad"
                subtitle="Módulo Operativo"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl flex flex-wrap justify-center gap-8">
                    {hasCalidad() && (
                        <button
                            onClick={() => router.push('/calidad/ms')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#324354] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#324354]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#324354] group-hover:text-[#1a2e3b] transition-colors duration-300">Calidad MS</span>
                        </button>
                    )}

                    {hasFichaRrc() && (
                        <button
                            onClick={() => router.push('/ficha-rcc')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#324354] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#324354]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#324354] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Ficha RRC</span>
                        </button>
                    )}

                    {!hasCalidad() && !hasFichaRrc() && (
                        <div className="text-center py-10">
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
