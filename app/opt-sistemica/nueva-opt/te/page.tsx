'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createExternalClient } from '@/lib/supabase/external';

const questions = [
  { id: '3.1', text: "¿El operario conoce el estándar de trabajo y los puntos clave?" },
  { id: '3.2', text: "¿Se cumple con el desglose de proceso definido en la hoja de división?" },
  { id: '3.3', text: "¿Las herramientas y materiales están ubicados según el estándar?" },
  { id: '3.4', text: "¿El tiempo de ejecución está dentro de los límites del estándar?" },
  { id: '3.5', text: "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?" },
];

export default function TEPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guidePage, setGuidePage] = useState(1);
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
          modulo_tipo: 'TE',
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
        .eq('modulo_tipo', 'TE')
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
            boxShadow: '0 0 0 8px #4a5d75',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            borderRadius: '2px'
          }}>
            {/* Close Button X */}
            <button 
              onClick={() => { setShowGuide(false); setGuidePage(1); }}
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

            {/* Navigation Arrows */}
            {guidePage === 2 && (
              <button 
                onClick={() => setGuidePage(1)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '5px',
                  transform: 'translateY(-50%)',
                  background: 'rgba(74, 93, 117, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  zIndex: 10,
                  fontSize: '20px',
                  color: '#4a5d75',
                  fontWeight: 900
                }}
              >‹</button>
            )}
            {guidePage === 1 && (
              <button 
                onClick={() => setGuidePage(2)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '5px',
                  transform: 'translateY(-50%)',
                  background: 'rgba(74, 93, 117, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  zIndex: 10,
                  fontSize: '20px',
                  color: '#4a5d75',
                  fontWeight: 900
                }}
              >›</button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '5px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2937', textTransform: 'uppercase' }}>
                DESGLOSE DE PROCESO
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#999', margin: '5px 0' }}>Hoja {guidePage} de 2</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#1f2937' }}>
              {guidePage === 1 ? (
                <>
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>PASO 1: Planee la operación a estandarizar</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>1.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Seleccione el proceso y el operario experto.</p>
                      <span style={{ fontWeight: 600 }}>2.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Informe al colaborador experto de qué se trata la actividad.</p>
                      <span style={{ fontWeight: 600 }}>3.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Prepare el formato Hoja de división.</p>
                      <span style={{ fontWeight: 600 }}>4.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Observe al colaborador realizar la actividad varias veces para entender el proceso.</p>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>PASO 2: Identifique los pasos importantes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>1.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Avanza lentamente hasta que te diga detente.</p>
                      <span style={{ fontWeight: 600 }}>2.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Detente.</p>
                    </div>
                    <div style={{ paddingLeft: '20px', marginTop: '5px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      <p style={{ margin: '2px 0' }}>* ¿Qué estás haciendo? | * ¿Crees que avanzó la operación?</p>
                      <p style={{ margin: '2px 0' }}>* ¿Crees que es un paso importante? | * ¿Cómo lo llamarías?</p>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Puntos Clave y Razones</h3>
                    <div style={{ fontSize: '0.85rem', fontStyle: 'italic', padding: '10px', background: '#f9fafb', borderRadius: '4px' }}>
                      <p style={{ margin: '4px 0' }}><strong>¿Cómo lo hiciste?</strong> (Posición, pirueta, cómo se toma o pone)</p>
                      <p style={{ margin: '4px 0' }}><strong>¿Determina éxito o fracaso?</strong> (Facilidad, seguridad, calidad)</p>
                      <p style={{ margin: '4px 0' }}><strong>¿Cuál es la razón?</strong> Describa la razón lo más claro posible.</p>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>PASO 3: Verifique el aprendizaje</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>1.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Prepara el entrenamiento (puesto de trabajo).</p>
                      <span style={{ fontWeight: 600 }}>2.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Entrene una persona que no conozca el proceso.</p>
                      <span style={{ fontWeight: 600 }}>3.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Valide si aprende.</p>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>PASO 4: Entrene al equipo</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>1.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Si obtuvo resultados entrene el equipo de trabajo.</p>
                      <span style={{ fontWeight: 600 }}>2.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Si encuentra mejoras realícelas y corrija el desglose.</p>
                      <span style={{ fontWeight: 600 }}>3.</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.2' }}>Valide que se entrene todos con las mejoras.</p>
                    </div>
                  </section>

                  <section style={{ borderTop: '2px solid #eee', paddingTop: '10px' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4a5d75', margin: '0 0 5px 0' }}>PASO IMPORTANTE ES:</p>
                    <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>Un segmento lógico de la operación cuando algo pasa que hace avanzar el trabajo.</p>
                    
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4a5d75', margin: '15px 0 5px 0' }}>PUNTO CLAVE</p>
                    <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: '0 0 8px 0' }}>Cualquier cosa en un paso que pueda:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      <li>Hacer o destruir el trabajo.</li>
                      <li>Herir al empleado.</li>
                      <li>Hacer que el trabajo sea más fácil de hacer, por ejemplo "truco", "maña", exactitud de tiempo, un poco de información especial.</li>
                    </ul>
                  </section>

                  <div style={{ marginTop: '10px', textAlign: 'center', background: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1f2937', margin: 0 }}>SI EL TRABAJADOR NO HA APRENDIDO, EL INSTRUCTOR NO HA ENSEÑADO.</p>
                  </div>
                </>
              )}

              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <FirplakLogo height={50} color="#4a5d75" showSlogan={true} />
                <p style={{ fontSize: '0.65rem', color: '#999', textAlign: 'center', marginTop: '10px' }}>© OPT Sistémica</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        title="Trabajo Estandarizado"
        subtitle="Nueva OPT Sistémica"
        backUrl="/opt-sistemica/nueva-opt"
        userEmail={session.user.email}
        showLogout={false}
        actionButton={
          <button 
            onClick={() => setShowGuide(true)} 
            className="px-4 py-2 bg-[#1d1d1b] hover:bg-[#333] border border-white/10 text-white rounded-xl transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>📖</span> Ficha TE
          </button>
        }
      />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            📋 Trabajo estandarizado (TE)
          </h1>

          <div className="card" style={{ marginBottom: '32px', background: 'rgba(118, 149, 152, 0.05)', border: '1px solid var(--primary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Monitoreo de Estándares Operativos</h3>
            <p style={{ color: '#666' }}>Responde las preguntas de verificación para asegurar el cumplimiento del estándar.</p>
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
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Trabajo Estandarizado</label>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>PLANES DE ACCIÓN TRABAJO ESTANDARIZADO</label>
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
                {saving ? 'Guardando...' : 'Guardar Registro de TE'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
