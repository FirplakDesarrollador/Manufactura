'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Link from 'next/link';
import { isAuthorized } from '@/lib/ficha-rcc/auth';
import { FichaAlerta, Accion } from '@/types';
import Combobox from '@/components/ficha-rcc/Combobox';
import { PLANTAS_LIST } from '@/lib/ficha-rcc/constants';

export default function ContingenciasPage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaAlerta[]>([]);
  const [plantaFiltro, setPlantaFiltro] = useState('');
  const [problemaFiltro, setProblemaFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fichasFiltradas = fichas.filter(ficha => {
    if (plantaFiltro && ficha.planta !== plantaFiltro) return false;
    if (problemaFiltro && !ficha.problema.toLowerCase().includes(problemaFiltro.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      if (!isAuthorized(session.user.email)) {
        router.push('/ficha-rcc/');
        return;
      }

      await fetchFichas();
    };

    checkAuthAndFetch();
  }, [router]);

  const fetchFichas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fichas_alerta')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching:', error);
    } else if (data) {
      // Filtrar solo las fichas que tengan al menos una contingencia
      const filtradas = (data as FichaAlerta[]).filter(
        f => f.contingencias && f.contingencias.length > 0 && f.contingencias.some(c => c.accion.trim() !== '')
      );
      setFichas(filtradas);
    }
    setLoading(false);
  };

  const updateEstado = async (fichaId: string, index: number, nuevoEstado: string, tipo: 'contingencias' | 'erradicaciones') => {
    try {
      setSaving(true);
      
      // Buscar la ficha actual
      const ficha = fichas.find(f => f.id === fichaId);
      if (!ficha) return;

      // Crear copia del array
      const nuevoArray = [...ficha[tipo]];
      nuevoArray[index] = { ...nuevoArray[index], cumplimiento: nuevoEstado };

      // Actualizar en base de datos
      const { error } = await supabase
        .from('fichas_alerta')
        .update({ [tipo]: nuevoArray })
        .eq('id', fichaId);

      if (error) throw error;

      // Actualizar estado local
      setFichas(prev => prev.map(f => {
        if (f.id === fichaId) {
          return { ...f, [tipo]: nuevoArray };
        }
        return f;
      }));

    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar el estado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-gradient)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ maxWidth: '1100px' }}>
      <div className="header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--header-bg)', padding: '20px 40px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <FirplakLogo height="70px" />
          </div>
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
           <button className="btn-secondary">Volver al Panel</button>
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Panel de Contingencias</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Validación de acciones de contingencia y erradicación.</p>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Planta</label>
            <Combobox 
              options={['', ...PLANTAS_LIST]}
              value={plantaFiltro}
              onChange={setPlantaFiltro}
              placeholder="Todas las plantas..."
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Problema</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar por problema..." 
              value={problemaFiltro} 
              onChange={e => setProblemaFiltro(e.target.value)} 
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {fichasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-hover)', borderRadius: '12px' }}>
            No hay acciones registradas para los filtros actuales.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {fichasFiltradas.map(ficha => (
              <div key={ficha.id} style={{ background: 'var(--surface-hover)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Ficha #{ficha.numero_ficha} - {ficha.planta}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      <strong>Problema:</strong> {ficha.problema} | <strong>Fecha:</strong> {new Date(ficha.fecha).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href={`/fichas/${ficha.id}`}>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>Ver Detalle</button>
                  </Link>
                </div>

                {/* Contingencias */}
                {ficha.contingencias && ficha.contingencias.length > 0 && ficha.contingencias.some(c => c.accion.trim() !== '') && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '15px' }}>Acciones de Contingencia</h4>
                    {ficha.contingencias.map((acc, idx) => acc.accion.trim() !== '' && (
                      <div key={`cont-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{acc.accion}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable: {acc.responsable || 'N/A'}</div>
                        </div>
                        <div style={{ width: '200px' }}>
                          <Combobox 
                            options={['Pendiente', 'OK', 'NO OK']}
                            value={acc.cumplimiento || 'Pendiente'}
                            onChange={(val) => updateEstado(ficha.id, idx, val, 'contingencias')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Erradicaciones */}
                {ficha.erradicaciones && ficha.erradicaciones.length > 0 && ficha.erradicaciones.some(e => e.accion.trim() !== '') && (
                  <div>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '15px' }}>Acciones de Erradicación</h4>
                    {ficha.erradicaciones.map((acc, idx) => acc.accion.trim() !== '' && (
                      <div key={`err-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{acc.accion}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable: {acc.responsable || 'N/A'}</div>
                        </div>
                        <div style={{ width: '200px' }}>
                          <Combobox 
                            options={['Pendiente', 'OK', 'NO OK']}
                            value={acc.cumplimiento || 'Pendiente'}
                            onChange={(val) => updateEstado(ficha.id, idx, val, 'erradicaciones')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
