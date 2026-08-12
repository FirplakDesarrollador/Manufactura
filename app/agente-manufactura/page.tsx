'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'

export default function AgenteManufacturaPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserEmail(user.email || '')
            setLoading(false)
        }
        checkAuth()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            <Header
                title="Agente Manufactura"
                subtitle="Agente Inteligente Autónomo"
                userEmail={userEmail}
                showLogout={true}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
                {/* Hero Banner / Badge */}
                <div className="bg-gradient-to-r from-[#324354] via-[#283643] to-[#1e293b] rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-[#7B8E90]/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 space-y-6 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            <span>MÓDULO EN CONSTRUCCIÓN</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-light tracking-wide text-white">
                            Agente Autónomo de Manufactura
                        </h1>

                        <p className="text-base sm:text-lg text-[#F6F3EE]/80 leading-relaxed font-light">
                            Estamos desarrollando un asistente avanzado con inteligencia de datos en tiempo real. 
                            El Agente monitoreará la planta continuamente, sintetizará informes automáticos y emitirá alertas preventivas antes de que ocurran desviaciones operativas o bajas estadísticas.
                        </p>

                        <div className="pt-2 flex flex-wrap gap-4 items-center">
                            <button
                                onClick={() => router.push('/home')}
                                className="px-6 py-3 bg-[#7B8E90] hover:bg-[#6c7d7f] text-white rounded-2xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Volver al Panel Principal
                            </button>
                        </div>
                    </div>
                </div>

                {/* Capabilities Section */}
                <div className="space-y-6">
                    <div className="border-b border-[#e2ded5] pb-4">
                        <h2 className="text-2xl font-bold text-[#324354]">Capacidades en Desarrollo</h2>
                        <p className="text-sm text-slate-500">Funcionalidades clave que integrará el Agente Inteligente de Firplak</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Capability 1 */}
                        <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                            <div className="w-14 h-14 bg-[#324354]/10 rounded-2xl flex items-center justify-center text-[#324354]">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#324354]">Análisis en Tiempo Real</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Procesamiento continuo de datos de producción, flujo de piezas, tiempos de proceso y ritmo de plantas en vivo.
                            </p>
                        </div>

                        {/* Capability 2 */}
                        <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                            <div className="w-14 h-14 bg-[#324354]/10 rounded-2xl flex items-center justify-center text-[#324354]">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#324354]">Generación de Informes</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Creación automática de resúmenes ejecutivos por turno, análisis de tendencias y consolidación de desperdicios.
                            </p>
                        </div>

                        {/* Capability 3 */}
                        <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                            <div className="w-14 h-14 bg-[#324354]/10 rounded-2xl flex items-center justify-center text-[#324354]">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#324354]">Alertas Proactivas</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Detección temprana de bajas estadísticas, cuellos de botella y alertas de calidad/seguridad antes de impactar el plan.
                            </p>
                        </div>

                        {/* Capability 4 */}
                        <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                            <div className="w-14 h-14 bg-[#324354]/10 rounded-2xl flex items-center justify-center text-[#324354]">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#324354]">Integración Sistémica</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Conexión directa con OPT, Hora a Hora, Estandarización HDT y el Tablero de Control de Productividad.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress / Roadmap Card */}
                <div className="bg-white rounded-3xl p-8 border border-[#e2ded5] shadow-sm space-y-4">
                    <h3 className="text-xl font-bold text-[#324354]">Hoja de Ruta del Agente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#324354]">Fase 1</span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800">Definición de Arquitectura y Métricas</h4>
                            <p className="text-xs text-slate-500 mt-1">Estructuración de flujos de datos y conexión con las tablas base en Supabase.</p>
                        </div>

                        <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#324354]">Fase 2 (En Progreso)</span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800">Diseño de Interfaz & Agente</h4>
                            <p className="text-xs text-slate-500 mt-1">Incorporación en la plataforma y modelado de reglas de aviso proactivo.</p>
                        </div>

                        <div className="p-[#F6F3EE] p-4 rounded-2xl border border-[#e2ded5] opacity-60">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#324354]">Fase 3</span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800">Despliegue y Actuación en Vivo</h4>
                            <p className="text-xs text-slate-500 mt-1">Activación de análisis predictivo e informes interactivos en tiempo real.</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    )
}
