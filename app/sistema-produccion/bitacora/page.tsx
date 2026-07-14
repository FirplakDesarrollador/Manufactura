'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

export default function BitacoraPage() {
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
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] relative overflow-x-hidden">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-slate-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#324354]/5 blur-[120px]" />
      </div>

      {/* Header Premium */}
      <Header
        title="Bitácora"
        subtitle="Módulo en Desarrollo"
        backUrl="/sistema-produccion"
        userEmail={session?.user?.email}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-12 pt-28">
        <div className="w-full max-w-lg mx-auto text-center animate-fade-in">
          
          {/* Card Glassmorphism */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-[#e2ded5] shadow-[0_10px_40px_rgba(50,67,84,0.06)] flex flex-col items-center gap-6 md:gap-8">
            
            {/* Maintenance Icon Container with Pulses */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 w-24 h-24 bg-[#7B8E90]/10 rounded-full animate-ping opacity-75" />
              <div className="relative w-24 h-24 bg-[#324354]/5 border border-[#324354]/10 rounded-full flex items-center justify-center text-[#324354] shadow-inner">
                <svg className="w-12 h-12 animate-wiggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            </div>

            {/* Info Texts */}
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl md:text-3xl font-display font-light text-[#324354] tracking-widest uppercase">
                Bitácora en Construcción
              </h2>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-sm mx-auto">
                Estamos trabajando en la implementación de la bitácora para que puedas llevar tus reportes y anotaciones operativas de forma ágil y centralizada.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => router.push('/sistema-produccion')}
              className="mt-2 px-8 py-3 bg-[#324354] hover:bg-[#25323f] text-[#F6F3EE] rounded-xl transition font-semibold text-sm shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Sistema
            </button>

          </div>

        </div>
      </main>

      {/* CSS style tags */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
