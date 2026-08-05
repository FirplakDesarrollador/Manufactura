'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createExternalClient } from '@/lib/supabase/external';

const questions = [
  { id: '4.1', text: "¿El líder conoce el ciclo para implementar la gestión de bajas estadísticas? (Evalué la frecuencia según los resultados de los colaboradores y/o el grupo según el tablero)" },
  { id: '4.2', text: "¿El líder está gestionando las bajas estadísticas?" },
  { id: '4.3', text: "¿Las acciones y compromisos de bajas estadísticas son adecuados?" },
  { id: '4.4', text: "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?" },
];

export default function BEPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const router = useRouter();

  const [personas, setPersonas] = useState<string[]>([]);
  const [personaEvaluada, setPersonaEvaluada] = useState('');

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

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const externalSupabase = createExternalClient();
        const { data, error: err } = await externalSupabase
          .from('empleados')
          .select('nombreCompleto')
          .eq('activo', true)
          .order('nombreCompleto', { ascending: true });
        if (!err && data) {
          setPersonas(data.map((d: any) => d.nombreCompleto));
        }
      } catch (err) {
        console.error('Error fetching empleados:', err);
      }
    };
    fetchPersonas();
  }, []);

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
    if (!personaEvaluada) {
      setError('Por favor selecciona la persona a quien se le realiza la OPT.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
          modulo_tipo: 'BE',
          persona_evaluada: personaEvaluada,
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
        .eq('modulo_tipo', 'BE')
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
            maxWidth: '460px',
            maxHeight: '95vh',
            padding: '25px',
            position: 'relative',
            boxShadow: '0 0 0 8px #4a5d75',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            borderRadius: '2px'
          }}>
            {/* Close Button X */}
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
              <h2 style={{ 
                fontSize: '1.2rem', 
                fontWeight: 800, 
                color: '#1f2937', 
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                GUÍA HORA HORA
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#1f2937' }}>
              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>PASO 1: Prepárese para observar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>1.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Encuentre los resultados del desempeño (rendimiento y calidad)</p>
                  
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>2.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Prepare el formato HORA HORA</p>

                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>3.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Observe al colaborador, para definir desviaciones (6M Y 8 Desperdicios)</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>PASO 2: Obtenga hechos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>4.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Haga que el colaborador se sienta cómodo (dígale los resultados rendimiento y calidad)</p>
                  
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>5.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Reconozca el trabajo cuando esté lo amerite; felicítelo si va mejor del mínimo esperado. De lo contrario no le diga nada.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>PASO 3: Ayúdelo a mejorar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>6.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Ponga en causa al colaborador.</p>
                  
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>7.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Hágale caer en cuenta los puntos a mejorar. Pregúntele hasta que el colaborador se dé cuenta.</p>

                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>8.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Ayúdele hasta que haga la labor correctamente.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>PASO 4: Comprobar resultados</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>9.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Anímelo a realizar la labor teniendo en cuenta los puntos corregidos.</p>
                  
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>10.</span>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.2' }}>Póngalo a producir.</p>
                </div>
              </section>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '10px', color: '#4a5d75' }}>Asegúrese de haber ayudado al colaborador</p>
                <FirplakLogo height={50} color="#4a5d75" showSlogan={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        title="Gestión de Bajas Estadísticas"
        subtitle="Nueva OPT Sistémica"
        backUrl="/opt-sistemica/nueva-opt"
        userEmail={session.user.email}
        showLogout={false}
        actionButton={
          <button 
            onClick={() => setShowGuide(true)} 
            className="px-4 py-2 bg-[#1d1d1b] hover:bg-[#333] border border-white/10 text-white rounded-xl transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>📖</span> Ficha BE
          </button>
        }
      />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            📉 Gestión de Bajas Estadísticas
          </h1>

          <div className="card" style={{ marginBottom: '32px', background: 'rgba(118, 149, 152, 0.05)', border: '1px solid var(--primary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Gestión de Bajas Estadísticas</h3>
            <p style={{ color: '#666' }}>Responde las preguntas de observación para este módulo.</p>
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
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SearchableSelect
                name="persona_evaluada"
                label="Persona a quien se le realiza la OPT"
                options={personas}
                placeholder="Buscar y seleccionar persona..."
                required={true}
                defaultValue={personaEvaluada}
                onValueChange={setPersonaEvaluada}
              />
            </div>

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
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Gestión de Bajas Estadísticas</label>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>PLANES DE ACCIÓN GESTIÓN BAJAS ESTADÍSTICAS</label>
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
                {saving ? 'Guardando...' : 'Guardar Registro de Gestión de Bajas'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
