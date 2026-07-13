'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

export default function ControlesVisualesPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');
      setLoading(false);
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Mantenimiento"
        subtitle="Controles Visuales"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 flex justify-center items-center p-6 w-full">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#324354] mb-3">Módulo en construcción</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Estamos trabajando para brindarte la mejor experiencia en controles visuales. ¡Pronto estará disponible!
          </p>
          <button
            onClick={() => router.push('/mtto-autonomo')}
            className="btn-primary w-full"
          >
            Volver a Mantenimiento
          </button>
        </div>
      </main>
    </div>
  );
}
