'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import TarjetasFallaList from '@/components/mtto-autonomo/TarjetasFallaList';
import { useRouter } from 'next/navigation';

export default function TarjetasFallaPage() {
  const router = useRouter();
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || '');

        const { data, error } = await supabase
          .from('tarjetas_falla_anomalia')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTarjetas(data || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error al cargar tarjetas de anomalías');
      } finally {
        setLoading(false);
      }
    };
    initPage();
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
        subtitle="Tarjetas de Anomalías"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 flex justify-center p-6 md:p-10 w-full">
        <div className="w-full max-w-[1450px]">
          <div className="greeting-section" style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1.2rem', justifyContent: 'space-between', width: '100%', margin: '0 auto 3rem auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <div style={{ backgroundColor: '#F1F5F9', padding: '12px', borderRadius: '16px', color: '#1B2B41' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L135.37,53.31a16,16,0,0,0,0,22.63L148,88.58,110.6,126l-11.31-11.31a16,16,0,0,0-22.63,0L32,159.37a16,16,0,0,0,0,22.63l44.68,44.68a16,16,0,0,0,22.63,0l44.69-44.69a16,16,0,0,0,0-22.63l-11.31-11.31L170,110.6l12.63,12.63a16,16,0,0,0,22.63,0l24.68-24.68A16,16,0,0,0,227.31,73.37ZM132,170.69,87.31,215.37,42.63,170.69,87.31,126Zm84-84-24.68,24.68L170,89.31l24.69-24.68,21.31,21.31Z"></path>
                </svg>
              </div>
              <div>
                <h1 className="greeting-title" style={{ fontSize: '2.2rem', margin: 0, fontFamily: "'Inter', sans-serif" }}>Tarjetas de Anomalías</h1>
                <p className="greeting-subtitle" style={{ margin: 0, fontFamily: "'Inter', sans-serif" }}>Gestión de fallas y anomalías detectadas en planta</p>
              </div>
            </div>
          </div>

          <TarjetasFallaList initialData={tarjetas} />

          {errorMsg && (
            <p style={{ textAlign: 'center', marginTop: '3rem', color: '#ff4d4f', fontSize: '0.8rem', opacity: 0.7 }}>
              * Error al cargar datos: {errorMsg}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
