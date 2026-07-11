'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

export default function CulturaPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#324354] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#324354] selection:text-white">
      {/* Background Image with Opacity and Blur overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: "url('/cultura-bg.jpg')" }}
      />
      {/* Overlay to ensure readability (Crema color with 88% opacity) */}
      <div className="fixed inset-0 z-0 bg-[#F6F3EE]/88 backdrop-blur-[3px]" />

      {/* Header Premium */}
      <Header
        title="Cultura"
        subtitle="Propósito y Comportamientos"
        backUrl="/home"
        userEmail={session?.user?.email}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 md:gap-6 animate-fade-in">

          {/* Core Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Nuestro Propósito (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="pl-2">
                <h3 className="text-xl md:text-2xl font-light text-[#324354] tracking-wide uppercase font-sans">
                  Nuestro Propósito
                </h3>
                <div className="h-[3px] w-12 bg-[#7B8E90] mt-1.5 rounded-full" />
              </div>

              {/* Purpose Cards */}
              <div className="flex flex-col gap-4 flex-1">
                
                {/* Purpose Item 1 */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-[0_4px_20px_rgba(50,67,84,0.02)] hover:shadow-[0_12px_30px_rgba(50,67,84,0.08)] hover:border-[#324354]/20 transition-all duration-300 group flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#324354]/5 flex items-center justify-center text-[#324354] group-hover:bg-[#324354] group-hover:text-white transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.0} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
                    <strong className="font-bold text-[#324354]">Mejoramos</strong> <i>la experiencia de</i> <strong className="font-bold text-[#324354]">habitar, creando soluciones</strong> <i>para los</i> <strong className="font-bold text-[#324354]">hogares</strong> <i>de Colombia y América.</i>
                  </p>
                </div>

                {/* Purpose Item 2 */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-[0_4px_20px_rgba(50,67,84,0.02)] hover:shadow-[0_12px_30px_rgba(50,67,84,0.08)] hover:border-[#324354]/20 transition-all duration-300 group flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#324354]/5 flex items-center justify-center text-[#324354] group-hover:bg-[#324354] group-hover:text-white transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.0} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
                    <i>Somos una</i> <strong className="font-bold text-[#324354]">plataforma</strong> <i>para el</i> <strong className="font-bold text-[#324354]">progreso</strong> <i>de</i> <strong className="font-bold text-[#324354]">nuestra gente</strong> <i>y sus</i> <strong className="font-bold text-[#324354]">familias.</strong>
                  </p>
                </div>

              </div>
            </div>

            {/* Right Column: 5 Comportamientos (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="pl-2">
                <h3 className="text-xl md:text-2xl font-light text-[#324354] tracking-wide uppercase font-sans">
                  5 Comportamientos / Valores
                </h3>
                <div className="h-[3px] w-12 bg-[#7B8E90] mt-1.5 rounded-full" />
              </div>

              {/* Behavior List */}
              <div className="flex flex-col gap-2.5 flex-1 justify-between">
                {[
                  "Hacemos felices a nuestros clientes",
                  "Jugamos a ganar en equipo",
                  "Generamos confianza",
                  "Siempre buscamos hacerlo mejor",
                  "Nos cuidamos y a los que siguen"
                ].map((behavior, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/80 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-[#e2ded5] shadow-[0_2px_10px_rgba(50,67,84,0.01)] hover:shadow-[0_8px_20px_rgba(50,67,84,0.05)] hover:border-[#324354]/15 hover:translate-x-1.5 transition-all duration-300 flex items-center gap-3 sm:gap-4 group"
                  >
                    {/* Number Badge */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-[#324354]/5 flex items-center justify-center font-display font-light text-[#324354] text-base sm:text-lg group-hover:bg-[#324354] group-hover:text-[#F6F3EE] transition-colors duration-300 shadow-sm">
                      {idx + 1}
                    </div>
                    {/* Behavior Description */}
                    <span className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                      {behavior}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* CSS Styles for animations (defined in line or class) */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
