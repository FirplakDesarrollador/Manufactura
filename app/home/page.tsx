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
        configuracion?: any;
        hora_a_hora?: any;
        ficha_rcc?: any;
        opt?: any;
        tarjetas_excelencia?: any;
        estadisticas_produccion?: any;
        indicadores_productividad?: any;
        opt_sistemica?: any;
        asistencia?: any;
        sistema_produccion?: any;
        mtto_autonomo?: any;
        hdt?: any;
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
            fibra: '/fibra',
            configuracion: '/configuracion',
            tarjetas_excelencia: '/tarjetas-excelencia',
            estadisticas_produccion: '/estadisticas-produccion',
            opt_sistemica: '/opt-sistemica',
            indicadores_productividad: '/indicadores-productividad',
            asistencia: '/asistencia',
            sistema_produccion: '/sistema-produccion',
            hdt: '/hdt'
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

    const hasConfiguracion = () => {
        return !!user?.permisos?.configuracion;
    }

    const hasIndicadoresProductividad = () => {
        return !!user?.permisos?.indicadores_productividad;
    }
    
    const hasAsistencia = () => {
        return !!user?.permisos?.asistencia;
    }

    const hasMttoAutonomo = () => {
        // Por ahora lo habilitamos si tiene el permiso o si tiene opt
        return !!user?.permisos?.mtto_autonomo || !!user?.permisos?.opt;
    }

    const hasSistemaProduccion = () => {
        // Por ahora lo mostramos por defecto para que puedas verlo
        return true;
    }

    const hasHdt = () => {
        return true;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center space-x-3 shrink-0">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full">
                            <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Firplak</h1>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-white/60 uppercase tracking-widest">Bienvenido</p>
                            <p className="text-sm font-semibold text-white max-w-[220px] truncate" title={user?.email || 'Usuario'}>
                                {user?.email || 'Usuario'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium text-sm whitespace-nowrap"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
                <div className="w-full max-w-[1800px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 justify-items-center mx-auto">
                    {/* Control de Piso Button */}
                    {hasManufactura() && (
                        <button
                            onClick={() => router.push('/home/selection')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Control de piso</span>
                        </button>
                    )}

                    {/* Calidad Button */}
                    {hasCalidad() && (
                        <button
                            onClick={() => router.push('/calidad')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Calidad</span>
                        </button>
                    )}



                    {/* Configuración Button */}
                    {hasConfiguracion() && (
                        <button
                            onClick={() => router.push('/configuracion')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Configuración</span>
                        </button>
                    )}

                    {/* Indicadores Productividad Button */}
                    {hasIndicadoresProductividad() && (
                        <button
                            onClick={() => router.push('/indicadores-productividad')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Indicadores<br/>Productividad</span>
                        </button>
                    )}

                    {/* Asistencia Button */}
                    {hasAsistencia() && (
                        <button
                            onClick={() => router.push('/asistencia')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Asistencia</span>
                        </button>
                    )}

                    {/* Mtto Autonomo Button */}
                    {hasMttoAutonomo() && (
                        <button
                            onClick={() => router.push('/mtto-autonomo')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Mtto Autónomo</span>
                        </button>
                    )}

                    {/* Sistema de Producción Button */}
                    {hasSistemaProduccion() && (
                        <button
                            onClick={() => router.push('/sistema-produccion')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Sistema de<br/>Producción</span>
                        </button>
                    )}

                    {/* HDT Button */}
                    {hasHdt() && (
                        <button
                            onClick={() => router.push('/hdt')}
                            className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">HDT</span>
                        </button>
                    )}

                    {/* Talento Humano Shortcut Button */}
                    <button
                        onClick={() => window.open(`https://talentohumano.vercel.app?email=${encodeURIComponent(user?.email || '')}`, '_blank')}
                        className="w-full aspect-square flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                    >
                        <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:bg-[#254153] transition-all duration-300">
                            <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="text-xl md:text-2xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center leading-tight">
                            Talento Humano<br />
                            <span className="text-sm md:text-base font-normal italic text-gray-400 group-hover:text-gray-500 transition-colors duration-300 mt-1 block">Atajo</span>
                        </span>
                    </button>

                    {!hasManufactura() && !hasCalidad() && !hasConfiguracion() && !hasIndicadoresProductividad() && !hasAsistencia() && !hasMttoAutonomo() && !hasSistemaProduccion() && !hasHdt() && (
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
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
