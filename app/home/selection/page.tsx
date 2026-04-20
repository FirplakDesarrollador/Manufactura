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
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        )
    }

    const hasApp = (appKey: keyof NonNullable<User['permisos']>) => {
        return user?.permisos && user.permisos[appKey] && 
               (typeof user.permisos[appKey] === 'object' || user.permisos[appKey] === true);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.push('/home')}
                            className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-white">Selección de Módulo</h1>
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Mármol Button */}
                    {hasApp('modulos') && (
                        <button
                            onClick={() => router.push('/marmol')}
                            className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group"
                        >
                            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
                                <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200 text-center">Control de Piso Mármol</span>
                        </button>
                    )}

                    {/* Muebles Button */}
                    {hasApp('muebles') && (
                        <button
                            onClick={() => router.push('/muebles')}
                            className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group"
                        >
                            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
                                <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200 text-center">Manufactura Muebles</span>
                        </button>
                    )}

                    {/* Fibra Button */}
                    {hasApp('fibra') && (
                        <button className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-[#254153] hover:shadow-xl transition-all duration-200 group">
                            <div className="w-20 h-20 bg-[#254153]/10 rounded-full flex items-center justify-center mb-5 group-hover:bg-[#254153] transition-all duration-200">
                                <svg className="w-10 h-10 text-[#254153] group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-200 text-center">Manufactura Fibra</span>
                        </button>
                    )}

                    {/* No Apps Found fallback */}
                    {!hasApp('modulos') && !hasApp('muebles') && !hasApp('fibra') && (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                                <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sin aplicaciones asignadas</h2>
                            <p className="text-gray-600">No tienes permisos para acceder a ninguna aplicación de manufactura. Por favor, contacta al administrador.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
