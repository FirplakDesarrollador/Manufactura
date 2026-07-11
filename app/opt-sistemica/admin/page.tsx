'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

const allowedAdminEmails = ['coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com', 'jakeline.chaverra@firplak.com'];

interface Responsable {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else if (!session.user.email || !allowedAdminEmails.includes(session.user.email)) {
        router.push('/opt-sistemica');
      } else {
        setSession(session);
        setLoading(false);
        fetchResponsables();
      }
    });
  }, [router]);

  const fetchResponsables = async () => {
    const { data } = await supabase
      .from('responsables')
      .select('id, nombre, activo')
      .order('nombre');
    if (data) setResponsables(data);
  };

  const handleAdd = async () => {
    if (!nombre.trim()) { setError('Escribe el nombre del responsable.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('responsables').insert({ nombre: nombre.trim() });
    if (err) {
      setError('Error al guardar.');
    } else {
      setNombre('');
      setSuccess('Responsable agregado.');
      fetchResponsables();
      setTimeout(() => setSuccess(null), 3000);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a "${name}"?`)) return;
    await supabase.from('responsables').delete().eq('id', id);
    fetchResponsables();
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FirplakLogo height={40} color="white" />
          <button onClick={() => router.push('/opt-sistemica')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
            Volver
          </button>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '48px', paddingBottom: '80px', maxWidth: '600px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
            🛡️ Panel de Administración
          </h1>
          <p style={{ color: '#666', marginBottom: '36px' }}>
            Agrega los responsables que aparecerán al agendar las OPT.
          </p>

          {/* Add form */}
          <div className="card" style={{ marginBottom: '28px', borderTop: '4px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '16px' }}>
              ➕ Agregar responsable
            </h2>

            {error && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 16px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 16px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.9rem' }}>
                ✅ {success}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                placeholder="Nombre del responsable"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-primary"
                style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}
              >
                {saving ? '...' : 'Agregar'}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '16px' }}>
              👥 Responsables ({responsables.length})
            </h2>

            {responsables.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No hay responsables registrados aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {responsables.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#f8fafc', borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontWeight: 600, color: '#1f2937' }}>👤 {r.nombre}</span>
                    <button
                      onClick={() => handleDelete(r.id, r.nombre)}
                      style={{
                        background: 'transparent', border: '1px solid #fca5a5',
                        color: '#dc2626', padding: '4px 12px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
