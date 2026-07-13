'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import { FichaAlerta, PlantaEnum } from '@/types';
import Header from '@/components/opt-sistemica/Header';
import Link from 'next/link';

const ADMIN_EMAILS = [
  'coordinacioncalidad@firplak.com', 
  'estiven.londono@firplak.com'
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fichas, setFichas] = useState<FichaAlerta[]>([]);
  const [filtroPlanta, setFiltroPlanta] = useState<PlantaEnum | 'Todas'>('Todas');
  const [busquedaDefecto, setBusquedaDefecto] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const userEmail = session.user.email?.toLowerCase() || '';
        setIsAdmin(ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail));
        fetchFichas();
      }
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchFichas = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('fichas_alerta')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filtroPlanta !== 'Todas') {
        query = query.eq('planta', filtroPlanta);
      }

      const { data, error } = await query;
      
      // If table doesn't exist yet, this will error (code 42P01).
      // We catch it and show empty list since user might not have ran SQL yet.
      if (error && error.code !== '42P01') {
         throw error;
      }
      setFichas(data || []);
    } catch (err: any) {
      console.error('Error fetching fichas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFichas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPlanta]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evitar navegar a la ficha
    if (!confirm('¿Estás seguro de que deseas eliminar esta ficha de alerta? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase
        .from('fichas_alerta')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Actualizar lista local
      setFichas(fichas.filter(f => f.id !== id));
      alert('Ficha eliminada correctamente.');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const filteredFichas = fichas.filter(ficha => {
    const cumplePlanta = filtroPlanta === 'Todas' || ficha.planta === filtroPlanta;
    const cumpleBusqueda = ficha.problema.toLowerCase().includes(busquedaDefecto.toLowerCase()) || 
                          ficha.responsable.toLowerCase().includes(busquedaDefecto.toLowerCase()) ||
                          (ficha.numero_ficha && ficha.numero_ficha.toString().includes(busquedaDefecto));
    return cumplePlanta && cumpleBusqueda;
  });

  // Agrupación para "Carpetas de Defectos"
  const agrupacionDefectos = fichas.reduce((acc, ficha) => {
    const key = `${ficha.planta} - ${ficha.problema}`;
    if (!acc[key]) {
      acc[key] = { planta: ficha.planta, problema: ficha.problema, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { planta: string; problema: string; count: number }>);

  const carpetas = Object.values(agrupacionDefectos).sort((a, b) => b.count - a.count);

  if (loading && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="home-container w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-6">
      <Header
        title="Respuesta Rápida Calidad"
        subtitle="RRC"
        userEmail={user?.email}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* Carpetas de Defectos - Solo se muestran si se ha seleccionado una planta específica */}
      {filtroPlanta !== 'Todas' && (
        <div style={{ marginBottom: '32px' }}>
           <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                 <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              Carpetas por Defectos ({filtroPlanta})
           </h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {carpetas.length === 0 ? (
                  <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>No hay defectos registrados aún para esta planta.</div>
              ) : (
                carpetas.slice(0, 12).map((carpeta, i) => (
                  <div 
                      key={i} 
                      onClick={() => {
                          setBusquedaDefecto(carpeta.problema);
                      }}
                      className="glass-panel" 
                      style={{ 
                          padding: '16px', 
                          cursor: 'pointer', 
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderLeft: `4px solid ${i % 2 === 0 ? 'var(--primary)' : 'var(--header-bg)'}`
                      }}
                      onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                      }}
                      onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                      }}
                  >
                      <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{carpeta.problema}</span>
                      <span style={{ fontSize: '13px', color: 'var(--primary)' }}>{carpeta.count} {carpeta.count === 1 ? 'ficha' : 'fichas'}</span>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      <div className="glass-panel mb-8 p-4 md:p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 className="text-xl font-semibold m-0">Historial de Fichas</h2>
            <Link href="/ficha-rcc/fichas/crear" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px', width: 'auto' }}>
                 + Nueva Ficha
              </button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Buscar por defecto o responsable..." 
              className="input-field w-full sm:w-[280px] !mb-0 p-2.5" 
              value={busquedaDefecto}
              onChange={(e) => setBusquedaDefecto(e.target.value)}
            />
            <select 
              className="input-field w-full sm:w-[220px] !mb-0 p-2.5" 
              value={filtroPlanta}
              onChange={(e) => setFiltroPlanta(e.target.value as any)}
            >
              <option value="Todas">Todas las Plantas</option>
              <option value="Mármol Sintético">Mármol Sintético</option>
              <option value="Fibra de vidrio">Fibra de vidrio</option>
              <option value="Muebles">Muebles</option>
              <option value="Cefi">Cefi</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : filteredFichas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No se encontraron fichas de alerta.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}># Ficha</th>
                  <th style={{ padding: '12px' }}>Planta</th>
                  <th style={{ padding: '12px' }}>Fecha</th>
                  <th style={{ padding: '12px' }}>Problema</th>
                  <th style={{ padding: '12px' }}>Responsable</th>
                  <th style={{ padding: '12px' }}>Estado</th>
                  <th style={{ padding: '12px' }}>Fotos</th>
                  {isAdmin && <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredFichas.map(ficha => (
                  <tr 
                    key={ficha.id} 
                    onClick={() => router.push(`/ficha-rcc/fichas/${ficha.id}`)}
                    style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} 
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>#{ficha.numero_ficha || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'rgba(118, 149, 152, 0.15)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                        {ficha.planta}
                      </span>
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{ficha.fecha}</td>
                    <td style={{ padding: '12px' }}>{ficha.problema}</td>
                    <td style={{ padding: '12px' }}>{ficha.responsable}</td>
                    <td style={{ padding: '12px' }}>
                      {ficha.seguimiento_d3 ? 'Trazabilidad Completa' : 'En Seguimiento'}
                    </td>
                    <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {ficha.foto_piezas_ok ? (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--primary)' }}>
                                    <img src={ficha.foto_piezas_ok} alt="OK" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>N/A</div>
                            )}
                            {ficha.foto_piezas_nok ? (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--text)' }}>
                                    <img src={ficha.foto_piezas_nok} alt="NO OK" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>N/A</div>
                            )}
                        </div>
                    </td>
                    {isAdmin && (
                       <td style={{ padding: '12px', textAlign: 'center' }}>
                         <button 
                           onClick={(e) => handleDelete(e, ficha.id)}
                           style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: '8px' }}
                           title="Eliminar Ficha"
                         >
                           <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                             <polyline points="3 6 5 6 21 6"></polyline>
                             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                             <line x1="10" y1="11" x2="10" y2="17"></line>
                             <line x1="14" y1="11" x2="14" y2="17"></line>
                           </svg>
                         </button>
                       </td>
                     )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
