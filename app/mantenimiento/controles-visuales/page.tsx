'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';
import Header from '@/components/opt-sistemica/Header';
import { CV_TABLA, rutaPlanta } from '@/lib/controles-visuales';

export default function ControlesVisualesPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [plantas, setPlantas] = useState<string[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || '');

        const { data: pData } = (await supabaseTH.from('plantas').select('planta').order('planta')) as {
          data: { planta: string | null }[] | null;
        };
        const lista = Array.from(new Set((pData || []).map((p) => p.planta).filter(Boolean) as string[]));
        setPlantas(lista);

        const { data: cData, error } = await supabase.from(CV_TABLA).select('planta').eq('activo', true);
        if (error) throw error;
        const c: Record<string, number> = {};
        (cData || []).forEach((row: { planta: string }) => {
          c[row.planta] = (c[row.planta] || 0) + 1;
        });
        setConteos(c);
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const plantasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    // Solo se listan las plantas que ya tienen controles visuales
    const conControles = Object.keys(conteos).sort((a, b) => a.localeCompare(b, 'es'));
    return term ? conControles.filter((p) => p.toLowerCase().includes(term)) : conControles;
  }, [busqueda, conteos]);

  // Plantas sin controles: se ofrecen para crear el primero
  const plantasSinControles = useMemo(() => plantas.filter((p) => !conteos[p]), [plantas, conteos]);

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

      <main className="flex-1 flex justify-center p-6 md:p-10 w-full">
        <div className="w-full max-w-[1200px] space-y-8">
          <div className="flex flex-col items-center text-center space-y-4" style={{ marginBottom: '1.5rem' }}>
            <h1 className="text-3xl md:text-4xl font-light text-[#324354] uppercase tracking-wider font-sans">
              Controles Visuales
            </h1>
            <div className="w-20 h-1 bg-[#324354] rounded-full"></div>
            <p className="text-sm text-slate-500 max-w-xl">
              Elige la planta para ver, crear, subir o reimprimir sus controles visuales.
            </p>

            <div className="flex w-full flex-wrap items-center justify-center gap-3" style={{ marginTop: '1rem' }}>
            <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '480px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#94A3B8" viewBox="0 0 256 256" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true">
                <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
              </svg>
              <input
                type="text"
                aria-label="Buscar planta"
                placeholder="Buscar planta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 18px 12px 46px',
                  backgroundColor: 'white',
                  border: '1px solid #e2ded5',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  color: '#324354',
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              />
            </div>

            {/* Plantas que aún no tienen controles: se elige una para crear su primer control */}
            {plantasSinControles.length > 0 && (
              <select
                aria-label="Crear el primer control de otra planta"
                value=""
                onChange={(e) => e.target.value && router.push(`${rutaPlanta(e.target.value)}/editor`)}
                style={{
                  flex: '0 1 280px',
                  padding: '12px 14px',
                  backgroundColor: 'white',
                  border: '1px solid #e2ded5',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  color: '#324354',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <option value="">+ Nuevo control en otra planta...</option>
                {plantasSinControles.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            </div>
          </div>

          {/* Flex centrado: con pocas plantas las tarjetas quedan en el centro y no pegadas a la izquierda */}
          <div className="flex flex-wrap justify-center gap-6">
            {plantasFiltradas.length === 0 ? (
              <div className="w-full text-center py-10">
                <p className="text-slate-500 font-medium">
                  {busqueda.trim() ? 'No se encontraron plantas.' : 'Aún no hay plantas con controles visuales.'}
                </p>
              </div>
            ) : (
              plantasFiltradas.map((planta, index) => (
                <Link
                  href={rutaPlanta(planta)}
                  key={planta}
                  className="module-card-icon"
                  style={{ animationDelay: `${index * 0.08}s`, width: '260px', padding: '2rem 1.5rem', gap: '0.75rem', textDecoration: 'none' }}
                >
                  <div className="icon-container" style={{ width: '60px', height: '60px', borderRadius: '14px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                      <path d="M8 8h8M8 12h8M8 16h5" />
                    </svg>
                  </div>
                  <h3 className="card-title-centered" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{planta}</h3>
                  <span className="text-xs text-slate-500">
                    {`${conteos[planta]} control${conteos[planta] === 1 ? '' : 'es'}`}
                  </span>
                </Link>
              ))
            )}
          </div>

          {errorMsg && (
            <p style={{ textAlign: 'center', marginTop: '3rem', color: '#b42318', fontSize: '0.85rem' }}>
              * {errorMsg}. Si es la primera vez, ejecuta el archivo controles_visuales.sql en Supabase.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
