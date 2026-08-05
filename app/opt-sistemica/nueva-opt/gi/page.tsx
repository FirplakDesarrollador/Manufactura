'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
// import { supabaseFPK } from '@/lib/opt-sistemica/supabase-fpk'; // No longer needed
import Header from '@/components/opt-sistemica/Header';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createExternalClient } from '@/lib/supabase/external';

const questions = [
  { id: '1.1', text: "¿Tiene el tablero actualizado con la información del día anterior?" },
  { id: '1.2', text: "¿Cuando los índices de seguridad no son adecuados, tiene planes de acción acordes?" },
  { id: '1.3', text: "¿Cuando los índices de presentismo no son adecuados, tiene planes de acción acordes?" },
  { id: '1.4', text: "¿Cuando los índices de calidad no son adecuados, tiene planes de acción acordes?" },
  { id: '1.5', text: "¿Cuando los índices de producción no son adecuados, tiene planes de acción acordes?" },
  { id: '1.6', text: "¿Cuando los índices de costo no son adecuados, tiene planes de acción acordes?" },
  { id: '1.7', text: "¿El tablero cumple con lo acordado? (Ciclo PHVA, paretos, gráficas, frecuencia, planes, etc)" },
  { id: '1.8', text: "¿Se está realizando según la bitácora del supervisor la reunión de comunicación?" },
  { id: '1.9', text: "Observe la ejecución de la reunión de comunicación con la tarjeta. ¿Lo hace correctamente?" },
];

export default function GIPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const router = useRouter();

  const [personas, setPersonas] = useState<string[]>([]);
  const [personaEvaluada, setPersonaEvaluada] = useState('');

  // State for responses: { [id]: { value: 'SI' | 'NO' | null, comment: string } }
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

  // Calculate percentage
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

    // Check if all questions are answered
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
          modulo_tipo: 'GI',
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
        .eq('modulo_tipo', 'GI')
        .eq('fecha_programada', todayStr)
        .eq('estado', 'PENDIENTE');

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Reset after a few seconds or allow user to see success
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
            maxHeight: '90vh',
            padding: '35px',
            position: 'relative',
            boxShadow: '0 0 0 8px #4a5d75', // Visual Blue Border
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            borderRadius: '2px' // Sharper edges like the image
          }}>
            {/* Simple Top Right X inside the card area for clarity */}
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

            <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '10px' }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                color: '#1f2937', 
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                GUÍA GESTION DE ESTADISTICAS
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#1f2937' }}>
              <section>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Prepárese para la reunión</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: '10px' }}>
                  <span style={{ fontWeight: 600 }}>1.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Para cualquier desviación realice una observación de puesto de trabajo, encuentre causas y redacte los planes de acción.</p>
                  
                  <span style={{ fontWeight: 600 }}>2.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Revise que los datos del tablero de indicadores estén completos, sin ninguna desviación.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Comparta los resultados</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: '10px' }}>
                  <span style={{ fontWeight: 600 }}>3.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Verifique la asistencia de su equipo y póngalo cómodo.</p>
                  
                  <span style={{ fontWeight: 600 }}>4.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Exponga los resultados, de acuerdo a: Planear, hacer, verificar y actuar de cada uno de los indicadores.</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Felicite los altas estadísticas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: '10px' }}>
                  <span style={{ fontWeight: 600 }}>5.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Resalte a los colaboradores cuyas estadísticas son altas; con nombre propio y dándoles atención. (No se deje desviar).</p>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Disponga el trabajo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: '10px' }}>
                  <span style={{ fontWeight: 600 }}>6.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Informe el plan del día y/o su cumplimiento.</p>
                  
                  <span style={{ fontWeight: 600 }}>7.</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>Anímelos a realizar la labor.</p>
                </div>
              </section>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <FirplakLogo height={50} color="#4a5d75" showSlogan={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      <Header
        title="Gestión de Indicadores (GI)"
        subtitle="Nueva OPT Sistémica"
        backUrl="/opt-sistemica/nueva-opt"
        userEmail={session.user.email}
        showLogout={false}
        actionButton={
          <button 
            onClick={() => setShowGuide(true)} 
            className="px-4 py-2 bg-[#1d1d1b] hover:bg-[#333] border border-white/10 text-white rounded-xl transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>📖</span> Ficha GI
          </button>
        }
      />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            📊 Gestión de Indicadores (GI)
          </h1>

          {success && (
            <div style={{ 
              background: '#ecfdf5', 
              color: '#065f46', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>✅</span>
              <strong>¡Registro guardado exitosamente!</strong>
            </div>
          )}

          {error && (
            <div style={{ 
              background: '#fef2f2', 
              color: '#991b1b', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid #ef4444'
            }}>
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
              <div key={q.id} style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '16px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '16px', fontSize: '1.05rem' }}>
                  {q.id}. {q.text}
                </p>

                {/* SI/NO Toggles */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    onClick={() => handleResponseChange(q.id, 'SI')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid',
                      borderColor: responses[q.id].value === 'SI' ? 'var(--header-bg)' : '#e5e7eb',
                      background: responses[q.id].value === 'SI' ? 'var(--header-bg)' : 'white',
                      color: responses[q.id].value === 'SI' ? 'white' : '#666',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    SI
                  </button>
                  <button
                    onClick={() => handleResponseChange(q.id, 'NO')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid',
                      borderColor: responses[q.id].value === 'NO' ? '#dc2626' : '#e5e7eb',
                      background: responses[q.id].value === 'NO' ? '#dc2626' : 'white',
                      color: responses[q.id].value === 'NO' ? 'white' : '#666',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    NO
                  </button>
                </div>

                {/* Comment Input */}
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

            {/* Aggregates Section */}
            <div style={{ 
              background: 'white', 
              padding: '32px', 
              borderRadius: '20px', 
              border: '2px solid var(--primary)',
              marginTop: '20px'
            }}>
              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Gestión de Indicadores</label>
                <div style={{ 
                  background: '#f9fafb', 
                  padding: '20px', 
                  borderRadius: '12px', 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  color: 'var(--header-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>PLANES ACCIÓN GESTIÓN INDICADORES</label>
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
                {saving ? 'Guardando...' : 'Guardar Registro de GI'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
