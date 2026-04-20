'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function HomePage() {
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

        // Lógica de redirección automática si solo tiene UNA aplicación total
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
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        )
    }

    const hasManufactura = () => {
        const p = user?.permisos;
        return !!(p?.modulos || p?.muebles || p?.fibra);
    }

    const hasCalidad = () => {
        return !!user?.permisos?.calidad;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full">
                            <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">ImpacSoft</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm text-white/70">Bienvenido</p>
                            <p className="text-white font-semibold">{user?.email || 'Usuario'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium text-sm"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Control de Piso Button */}
                    {hasManufactura() && (
                        <button
                            onClick={() => router.push('/home/selection')}
                            className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Manufactura</span>
                        </button>
                    )}

                    {/* Calidad Button */}
                    {hasCalidad() && (
                        <button
                            onClick={() => router.push('/calidad')}
                            className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Calidad</span>
                        </button>
                    )}

                    {!hasManufactura() && !hasCalidad() && (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                                <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sin accesos configurados</h2>
                            <p className="text-gray-600">No tienes permisos para acceder a ningún módulo. Contacta al soporte técnico.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} ImpacSoft. Todos los derechos reservados.
            </footer>
        </div>
    )
}
