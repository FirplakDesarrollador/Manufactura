'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

const questions = [
  { id: '6.1', text: "Elija una zona del puesto de trabajo, ¿Puede observarse que en la primera S que no hay elementos innecesarios? ¿en la segunda S todos los elementos estan ordenados?" },
  { id: '6.2', text: "¿Las actividades de la 3s (Limpiar) están definidas, documentadas y se evidencia uso del Cheklist de limpieza?" },
  { id: '6.3', text: "Solicite el estado de referencia de la zona, ¿Existe Mapa (4S Estandarizar)? ¿Observe el puesto de trabajo o área y ¿se cumple el estandar con demarcación?" },
  { id: '6.4', text: "Solicite la última rejilla de observación de 5s ¿Esta lleva a la mejora del estado de referencia?" },
  { id: '6.5', text: "Existe una herramienta que hace posible que los colaboradores o cualquier persona comunique necesidades de mejora ¿hay disciplina en su uso?" },
];

export default function CincoSPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [responses, setResponses] = useState<Record<string, { value: 'SI' | 'NO' | null, comment: string }>>(
    questions.reduce((acc, q) => ({ ...acc, [q.id]: { value: null, comment: '' } }), {})
  );

  const [actionPlans, setActionPlans] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setLoading(false);
      }
    });
  }, [router]);

  const percentage = useMemo(() => {
    const siCount = Object.values(responses).filter(r => r.value === 'SI').length;
    return ((siCount / questions.length) * 100).toFixed(2);
  }, [responses]);

  const handleResponseChange = (id: string, value: 'SI' | 'NO') => {
    setResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], value }
    }));
  };

  const handleCommentChange = (id: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], comment }
    }));
  };

  const handleSave = async () => {
    const unanswered = Object.entries(responses).filter(([_, r]) => r.value === null);
    if (unanswered.length > 0) {
      setError(`Por favor responde todas las preguntas (${unanswered.length} por contestar).`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: insertError } = await supabase
        .from('opt_registros')
        .insert({
          user_id: session.user.id,
          user_email: session.user.email,
          modulo_tipo: '5S',
          percentage: parseFloat(percentage),
          responses: responses,
          action_plans: actionPlans
        });

      if (insertError) throw insertError;

      // Automatically mark as executed in planning if matches
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase
        .from('opt_planificacion')
        .update({ estado: 'EJECUTADA' })
        .eq('responsable_email', session.user.email)
        .eq('modulo_tipo', '5S')
        .eq('fecha_programada', todayStr)
        .eq('estado', 'PENDIENTE');

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError('Error al guardar el registro. Verifica tu conexión o permisos.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FirplakLogo height={40} color="white" />
          <button onClick={() => router.push('/opt-sistemica/nueva-opt')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
            Volver
          </button>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            🧹 Rejilla de Observación 5'S
          </h1>

          {success && (
            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>✅</span>
              <strong>¡Registro de 5'S guardado exitosamente!</strong>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #ef4444' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {questions.map((q) => (
              <div key={q.id} style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '16px', fontSize: '1.05rem' }}>
                  {q.id}. {q.text}
                </p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    onClick={() => handleResponseChange(q.id, 'SI')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid',
                      borderColor: responses[q.id].value === 'SI' ? 'var(--header-bg)' : '#e5e7eb',
                      background: responses[q.id].value === 'SI' ? 'var(--header-bg)' : 'white',
                      color: responses[q.id].value === 'SI' ? 'white' : '#666',
                      fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    SI
                  </button>
                  <button
                    onClick={() => handleResponseChange(q.id, 'NO')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid',
                      borderColor: responses[q.id].value === 'NO' ? '#dc2626' : '#e5e7eb',
                      background: responses[q.id].value === 'NO' ? '#dc2626' : 'white',
                      color: responses[q.id].value === 'NO' ? 'white' : '#666',
                      fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    NO
                  </button>
                </div>

                <div>
                  <label className="label">Comentario {q.id}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Escribe un comentario opcional..."
                    value={responses[q.id].comment}
                    onChange={(e) => handleCommentChange(q.id, e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '2px solid var(--primary)', marginTop: '20px' }}>
              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Cumplimiento 5'S</label>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>OBSERVACIONES / PLANES DE ACCIÓN</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: '120px', padding: '16px' }}
                  placeholder="Describe las observaciones o planes de acción..."
                  value={actionPlans}
                  onChange={(e) => setActionPlans(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary" 
                style={{ width: '100%', padding: '18px', fontSize: '1.25rem' }}
              >
                {saving ? 'Guardando...' : "Guardar Registro 5'S"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
