'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import Link from 'next/link';
import Header from '@/components/opt-sistemica/Header';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContingenciasAuth, setIsContingenciasAuth] = useState(false);
  const [isAsistenciaAuth, setIsAsistenciaAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const userEmail = session.user.email?.toLowerCase() || '';
        
        // Consultar los permisos desde la tabla usuarios
        const { data: userData } = await supabase
          .from('usuarios')
          .select('permisos')
          .eq('correo', userEmail)
          .single();
          
        const permisos = userData?.permisos || {};
        const fichaPermisos = permisos.ficha_rcc;
        
        // Manejar formato nuevo (objeto)
        if (typeof fichaPermisos === 'object' && fichaPermisos !== null) {
          setIsAdmin(fichaPermisos.administrador === true);
          setIsContingenciasAuth(fichaPermisos.contingencias === true);
          setIsAsistenciaAuth(fichaPermisos.asistencia === true);
        } else {
          // Si es booleano (legacy) o undefined, por defecto no damos admin ni contingencias
          setIsAdmin(false);
          setIsContingenciasAuth(false);
          setIsAsistenciaAuth(false);
        }
        
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#324354] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      {/* Header */}
      <Header
        title="Respuesta Rápida Calidad"
        subtitle="RRC"
        userEmail={user?.email}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center w-full max-w-7xl mx-auto px-4 md:px-8">
          
          {/* Módulo 1: Nueva Ficha */}
          <div className="w-full max-w-[260px] aspect-square">
            <Link href="/ficha-rcc/fichas/crear" className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group text-center no-underline">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#324354] transition-all duration-300">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-[16px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight mb-1">Nueva Ficha de Alerta</span>
              <span className="text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 transition-colors duration-300 line-clamp-2 px-1">Registrar un nuevo hallazgo o defecto detectado.</span>
            </Link>
          </div>

          {/* Módulo 2: Historial */}
          <div className="w-full max-w-[260px] aspect-square">
            <Link href="/ficha-rcc/historial" className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group text-center no-underline">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#324354] transition-all duration-300">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[16px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight mb-1">Historial de Fichas</span>
              <span className="text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 transition-colors duration-300 line-clamp-2 px-1">Consulta y seguimiento de todas las fichas generadas.</span>
            </Link>
          </div>

          {/* Módulo 3: Administrador */}
          {isAdmin && (
            <div className="w-full max-w-[260px] aspect-square">
              <Link href="/ficha-rcc/admin" className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group text-center no-underline">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#324354] transition-all duration-300">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </div>
                <span className="text-[16px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight mb-1">Administrador</span>
                <span className="text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 transition-colors duration-300 line-clamp-2 px-1">Gestionar catálogos de defectos y configuraciones.</span>
              </Link>
            </div>
          )}

          {/* Módulo 4: Contingencias */}
          {isContingenciasAuth && (
            <div className="w-full max-w-[260px] aspect-square">
              <Link href="/ficha-rcc/contingencias" className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group text-center no-underline">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#324354] transition-all duration-300">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-[16px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight mb-1">Contingencias</span>
                <span className="text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 transition-colors duration-300 line-clamp-2 px-1">Validar estado de las acciones de contingencia.</span>
              </Link>
            </div>
          )}

          {/* Módulo 5: Asistencia */}
          {isAsistenciaAuth && (
            <div className="w-full max-w-[260px] aspect-square">
              <Link href="/ficha-rcc/asistencia" className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group text-center no-underline">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-[#324354]/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#324354] transition-all duration-300">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-[#324354] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-[16px] sm:text-lg lg:text-xl font-bold text-[#324354] group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight mb-1">Asistencia Diaria</span>
                <span className="text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 transition-colors duration-300 line-clamp-2 px-1">Registro y control de asistencia de personal.</span>
              </Link>
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
