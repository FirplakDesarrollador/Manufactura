'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createExternalClient } from '@/lib/supabase/external';

const questions = [
  { id: '2.1', text: "Revise el plan de entrenamiento. ¿Están incluídos todos los procesos y operarios?, ¿Está al día?, ¿El líder lo utiliza para gestionar las competencias de su equipo?" },
  { id: '2.2', text: "Pídale la hoja individual de progreso de la persona. Revise si esta actualizada y completamente diligenciada." },
  { id: '2.3', text: "Verifique la implementación del desglose y el entrenamiento en el puesto de trabajo (Pregunte por pasos importantes, puntos claves y razones a un colaborador)." },
  { id: '2.4', text: "Observe la ejecución de la herramienta con la tarjeta. ¿Lo hace correctamente?" },
];

export default function EEPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<'PREPARARSE' | 'INSTRUIR' | null>(null);
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
          modulo_tipo: 'EE',
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
        .eq('modulo_tipo', 'EE')
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
      {activeGuide && (
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
            {/* Close Button X */}
            <button 
              onClick={() => setActiveGuide(null)}
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

            {/* ERROR: Wait, I should implement the full content for the other guides too */}
            {activeGuide === 'PREPARARSE' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '5px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f2937', textTransform: 'uppercase' }}>
                    CÓMO PREPARARSE PARA INSTRUIR
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#1f2937' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', fontStyle: 'italic' }}>Antes de la instrucción:</p>
                  
                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>1. TENER UN HORARIO DE ENTRENAMIENTO.</h3>
                    <div style={{ paddingLeft: '15px', fontSize: '0.85rem', color: '#444' }}>
                      <p style={{ margin: '4px 0' }}>Quien debe ser entrenado...</p>
                      <p style={{ margin: '4px 0' }}>Para qué trabajo...</p>
                      <p style={{ margin: '4px 0' }}>En qué fecha...</p>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>2. DIVIDIR EL TRABAJO.</h3>
                    <div style={{ paddingLeft: '15px', fontSize: '0.85rem', color: '#444' }}>
                      <p style={{ margin: '8px 0' }}>Haga una lista de <strong>Pasos importantes.</strong></p>
                      <p style={{ margin: '8px 0' }}>Seleccione <strong>Puntos clave.</strong></p>
                      <p style={{ margin: '8px 0', fontStyle: 'italic' }}>Los aspectos de seguridad son siempre Puntos Clave.</p>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>3. TENER TODO LISTO.</h3>
                    <p style={{ paddingLeft: '15px', fontSize: '0.85rem', color: '#444', margin: 0 }}>
                      Equipo adecuado, materiales, herramientas y otras cosas que ayuden a la instrucción.
                    </p>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>4. ARREGLAR EL LUGAR DE TRABAJO.</h3>
                    <p style={{ paddingLeft: '15px', fontSize: '0.85rem', color: '#444', margin: 0 }}>
                      Tal como está en las actuales condiciones de trabajo.
                    </p>
                  </section>
                </div>
              </>
            )}

            {activeGuide === 'INSTRUIR' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '5px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2937', textTransform: 'uppercase' }}>
                    CÓMO INSTRUIR
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#1f2937' }}>
                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Paso 1 - PREPARAR AL EMPLEADO</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <li>Ponerle cómodo al aprendiz.</li>
                      <li>Mencione el trabajo.</li>
                      <li>Averigüe cuanto sabe del trabajo.</li>
                      <li>Interésele en aprender el trabajo.</li>
                      <li>Póngale en el lugar correcto.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Paso 2 - PRESENTAR EL TRABAJO</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <li>Enuncie, muestre e ilustre <strong>PASOS IMPORTANTES</strong>, uno por uno.</li>
                      <li>Hágalo de nuevo, acentuando <strong>PUNTOS CLAVE.</strong></li>
                      <li>Hágalo de nuevo, diciendo razones para los Puntos Clave.</li>
                      <li style={{ listStyle: 'none', marginTop: '5px', fontStyle: 'italic' }}>Enseñe claramente, completamente y con paciencia, pero no dé más información de la que pueda digerir.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Paso 3 - INTENTAR EL TRABAJO</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <li>Póngale a trabajar - corrija sus errores.</li>
                      <li>Haga que explique cada <strong>PASO IMPORTANT</strong> mientras efectúa el trabajo de nuevo.</li>
                      <li>Pídale que explique cada <strong>PUNTO CLAVE</strong> mientras efectúa el trabajo de nuevo.</li>
                      <li>Pídale que explique cada <strong>razón para los puntos clave</strong> mientras efectúa el trabajo de nuevo.</li>
                      <li style={{ listStyle: 'none', marginTop: '5px', fontStyle: 'italic' }}>Asegúrese que comprenda. Continúe hasta que UD. esté seguro de que él/ella sabe.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px' }}>Paso 4 - SEGUIMIENTO</h3>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <li>Déjelo solo con el trabajo.</li>
                      <li>Designe a quien le va a prestar ayuda.</li>
                      <li>Revísele frecuentemente.</li>
                      <li>Motívele a que haga preguntas.</li>
                      <li>Empiece a disminuir la ayuda.</li>
                    </ul>
                  </section>
                </div>
              </>
            )}

            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <FirplakLogo height={50} color="#4a5d75" showSlogan={true} />
            </div>
          </div>
        </div>
      )}

      <Header
        title="Entrenamiento Estandarizado"
        subtitle="Nueva OPT Sistémica"
        backUrl="/opt-sistemica/nueva-opt"
        userEmail={session.user.email}
        showLogout={false}
        actionButton={
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveGuide('PREPARARSE')} 
              className="px-3 py-1.5 bg-[#1d1d1b] hover:bg-[#333] border border-white/10 text-white rounded-xl transition font-semibold text-xs whitespace-nowrap shadow-sm hover:shadow-md cursor-pointer"
            >
              📖 Prepararse
            </button>
            <button 
              onClick={() => setActiveGuide('INSTRUIR')} 
              className="px-3 py-1.5 bg-[#1d1d1b] hover:bg-[#333] border border-white/10 text-white rounded-xl transition font-semibold text-xs whitespace-nowrap shadow-sm hover:shadow-md cursor-pointer"
            >
              📖 Instruir
            </button>
          </div>
        }
      />

      <main className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', fontWeight: 700, marginBottom: '24px' }}>
            🎓 Entrenamiento estandarizado (EE)
          </h1>

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
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>% Trabajo y Entrenamiento Estandarizado</label>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', fontSize: '2.5rem', fontWeight: 800, color: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#999' }}>%</span>
                  {percentage}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label className="label" style={{ fontSize: '1.1rem', fontWeight: 700 }}>PLANES DE ACCIÓN TE y EE</label>
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
                {saving ? 'Guardando...' : 'Guardar Registro de EE'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
