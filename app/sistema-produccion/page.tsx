"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: string;
    email?: string;
    permisos?: {
        hora_a_hora?: any;
        opt?: any;
        tarjetas_excelencia?: any;
        estadisticas_produccion?: any;
    };
}

export default function SistemaProduccionPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();

            if (!data.user) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('usuarios')
                .select('permisos')
                .eq('uuid', data.user.id)
                .single();

            setUser({
                id: data.user.id,
                email: data.user.email,
                permisos: (userData?.permisos as any) || {}
            });

            setLoading(false);
        };

        getUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const hasHoraAHora = () => !!user?.permisos?.hora_a_hora;
    const hasOpt = () => !!user?.permisos?.opt;
    const hasTarjetasExcelencia = () => !!user?.permisos?.tarjetas_excelencia;
    const hasEstadisticasProduccion = () => !!user?.permisos?.estadisticas_produccion;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.push('/home')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                            title="Volver al Inicio"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full">
                            <svg className="w-6 h-6 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Sistema de Producción</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm text-white/70">Bienvenido</p>
                            <p className="text-white font-semibold">{user?.email || 'Usuario'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-6xl flex flex-wrap justify-center gap-8">
                    {/* Hora a Hora Button */}
                    {hasHoraAHora() && (
                        <button
                            onClick={() => router.push('/hora-a-hora')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">Hora a Hora</span>
                        </button>
                    )}

                    {/* OPT Button */}
                    {hasOpt() && (
                        <button
                            onClick={() => router.push('/opt')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300">OPT</span>
                        </button>
                    )}

                    {/* Tarjetas Excelencia Button */}
                    {hasTarjetasExcelencia() && (
                        <button
                            onClick={() => router.push('/tarjetas-excelencia')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Tarjetas<br/>Excelencia</span>
                        </button>
                    )}

                    {/* Estadísticas Sistema de Producción Button */}
                    {hasEstadisticasProduccion() && (
                        <button
                            onClick={() => router.push('/estadisticas-produccion')}
                            className="w-full sm:w-80 flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border-2 border-gray-100 hover:border-[#254153] hover:shadow-2xl transition-all duration-300 group"
                        >
                            <div className="w-24 h-24 bg-[#254153]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#254153] transition-all duration-300">
                                <svg className="w-12 h-12 text-[#254153] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold text-[#254153] group-hover:text-[#1a2e3b] transition-colors duration-300 text-center">Estadísticas<br/>Sistema</span>
                        </button>
                    )}

                    {!hasHoraAHora() && !hasOpt() && !hasTarjetasExcelencia() && !hasEstadisticasProduccion() && (
                        <div className="text-center py-10">
                            <p className="text-slate-500 font-medium">No tienes permisos para acceder a las opciones de Producción.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    );
}
