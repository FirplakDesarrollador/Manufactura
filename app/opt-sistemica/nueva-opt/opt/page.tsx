'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

const questions = [
  { id: '1.1', text: "¿El colaborador utiliza los EPP de acuerdo con el estándar y el análisis de riesgos?" },
  { id: '1.2', text: "¿El puesto de trabajo se encuentra libre de riesgos, condiciones inseguras y obstáculos?" },
  { id: '1.3', text: "¿Se realiza la tarea siguiendo el procedimiento seguro y el estándar operativo?" },
  { id: '1.4', text: "¿El colaborador demuestra conocimiento sobre los riesgos críticos asociados a su labor?" },
  { id: '1.5', text: "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?" },
];

export default function OPTModulePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
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
          modulo_tipo: 'OPT',
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
        .eq('modulo_tipo', 'OPT')
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
    <div style={{ minHeight: '100vh', background: '#f8f9fa', position: 'relative' }}>
      {/* Guide Modal (Top Level) */}
      {showGuide && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          {/* Main Card */}
          <div style={{
            background: 'white',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '95vh',
            padding: '25px',
            position: 'relative',
            boxShadow: '0 0 0 8px #4a5d75', // Visual Blue Border
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            borderRadius: '2px'
          }}>
            <button 
              onClick={() => setShowGuide(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                border: 'none',
                background: '#f3f4f6',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
                zIndex: 10
              }}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '5px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2937', textTransform: 'uppercase' }}>
                GUÍA OBSERVACIÓN DE PUESTO DE TRABAJO (OPT)
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#1f2937' }}>
              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Prepárese para observar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>1.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>De acuerdo al plan de OPT encuentre resultados de desempeño (rendimiento y calidad) del colaborador.</p>
                  <span style={{ fontWeight: 600 }}>2.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Prepare el FORMATO OPT con sus documentos requeridos.</p>
                  <span style={{ fontWeight: 600 }}>3.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Diríjase a un lugar donde pueda observarlo de manera cómoda sin que este se dé cuenta, en estado indisponible.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Haga observación lejana y cercana</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>4.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Observe al colaborador de manera lejana, para definir desviaciones (6 M's), tiempos de operación, actividades que agregan valor y las que no lo hacen.</p>
                  <span style={{ fontWeight: 600 }}>5.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Tome los tiempos de cada actividad y analícelos.</p>
                  <span style={{ fontWeight: 600 }}>6.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Observe al colaborador de manera cercana, identificando las 6 M's y 8 desperdicios.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Obtenga hechos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>7.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Obtenga opiniones sentimientos y hechos del colaborador.</p>
                  <span style={{ fontWeight: 600 }}>8.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Siempre reconozca el trabajo cuando lo amerite.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Actúe sobre los hallazgos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>9.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Redacte los hallazgos, analizando causas, estableciendo acciones e identificando responsables.</p>
                  <span style={{ fontWeight: 600 }}>10.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Los planes de acción expóngalos en su tablero de comunicación y asegúrese que se ejecuten.</p>
                </div>
              </section>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontWeight: 400, fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '15px', color: '#444', textAlign: 'center' }}>
                  *Ayudar: Hacer algo de manera desinteresada para otra persona por aliviarle el trabajo, para que consiga un determinado fin, para evitar una situación de aprieto o riesgo que le pueda afectar.
                </p>
                <FirplakLogo height={50} color="#4a5d75" showSlogan={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FirplakLogo height={40} color="white" />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowGuide(true)} 
              className="btn-primary" 
              style={{ background: 'var(--accent)', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 800 }}
            >
              📖 Ficha OPT
            </button>
            <button onClick={() => router.push('/opt-sistemica/nueva-opt')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
              Volver
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            🔍 OPT (Obs. Puesto de Trabajo)
          </h1>

          <div className="card" style={{ marginBottom: '32px', background: 'rgba(118, 149, 152, 0.05)', border: '1px solid var(--primary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Observación del Puesto de Trabajo</h3>
            <p style={{ color: '#666' }}>Realiza la observación sistemática del puesto de trabajo para identificar desviaciones y oportunidades de mejora.</p>
          </div>

          {success && (
            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>✅</span>
              <strong>¡Registro guardado exitosamente!</strong>
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
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Cumplimiento OPT</label>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>PLANES DE ACCIÓN OPT</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: '120px', padding: '16px' }}
                  placeholder="Describe los planes de acción necesarios..."
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
                {saving ? 'Guardando...' : 'Guardar Registro de OPT'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
