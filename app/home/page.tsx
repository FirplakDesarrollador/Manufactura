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

        let { data: userData } = await supabase
            .from('usuarios')
            .select('id, permisos')
            .eq('uuid', authUser.id)
            .maybeSingle()

        if (!userData && authUser.email) {
            // Auto-vinculación por correo electrónico (insensible a mayúsculas/minúsculas)
            const { data: emailUser } = await supabase
                .from('usuarios')
                .select('id, permisos')
                .ilike('correo', authUser.email)
                .maybeSingle()

            if (emailUser) {
                await supabase
                    .from('usuarios')
                    .update({ uuid: authUser.id })
                    .eq('id', emailUser.id)
                userData = emailUser
            }
        }

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
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
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
        return !!user?.permisos?.mtto_autonomo || !!user?.permisos?.opt;
    }

    const hasSistemaProduccion = () => {
        return true;
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            {/* Header */}
            <Header
                title="Manufactura"
                subtitle="Panel de Módulos"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 py-12 md:py-16 lg:py-20 pt-6 md:pt-8 lg:pt-10">
                <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center w-full">
                        {/* Control de Piso Button */}
                        {hasManufactura() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/home/selection')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Control de piso</span>
                                </button>
                            </div>
                        )}

                        {/* Calidad Button */}
                        {hasCalidad() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/calidad')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Calidad</span>
                                </button>
                            </div>
                        )}

                        {/* Sistema de Producción Button */}
                        {hasSistemaProduccion() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/sistema-produccion')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Sistema de<br/>Producción</span>
                                </button>
                            </div>
                        )}

                        {/* Mantenimiento Button */}
                        {hasMttoAutonomo() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/mantenimiento')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Mantenimiento</span>
                                </button>
                            </div>
                        )}

                        {/* Indicadores Productividad Button */}
                        {hasIndicadoresProductividad() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/indicadores-productividad')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Indicadores<br/>Productividad</span>
                                </button>
                            </div>
                        )}

                        {/* Asistencia Button */}
                        {hasAsistencia() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/asistencia')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Asistencia</span>
                                </button>
                            </div>
                        )}

                        {/* Configuración Button */}
                        {hasConfiguracion() && (
                            <div className="w-full max-w-[260px] aspect-square">
                                <button
                                    onClick={() => router.push('/configuracion')}
                                    className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                        <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Configuración</span>
                                </button>
                            </div>
                        )}

                        {/* Talento Humano Shortcut Button */}
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => window.open(`https://talentohumano.vercel.app?email=${encodeURIComponent(user?.email || '')}`, '_blank')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                                    Talento Humano<br />
                                    <span className="text-xs md:text-sm font-normal italic text-gray-400 group-hover:text-gray-500 transition-colors duration-300 mt-1 block">Atajo</span>
                                </span>
                            </button>
                        </div>

                        {/* Cultura Button */}
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => router.push('/cultura')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Cultura</span>
                            </button>
                        </div>

                        {/* Inventarios Button */}
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => router.push('/inventarios')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Inventarios</span>
                            </button>
                        </div>

                        {/* Consulta SAP Button */}
                        <div className="w-full max-w-[260px] aspect-square">
                            <button
                                onClick={() => router.push('/consulta-sap')}
                                className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:bg-[#324354] transition-all duration-300">
                                    <svg className="w-8 h-8 md:w-12 md:h-12 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                </div>
                                <span className="text-[15px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">Consulta SAP</span>
                            </button>
                        </div>

                        {!hasManufactura() && !hasCalidad() && !hasConfiguracion() && !hasIndicadoresProductividad() && !hasAsistencia() && !hasMttoAutonomo() && !hasSistemaProduccion() && (
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
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
