'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

const subModules = [
  { id: '5s', name: "5'S", icon: '⭐', description: 'Evaluación y seguimiento de los estándares de las 5S.' },
  { id: 'be', name: 'Gestión de bajas estadísticas (BE)', icon: '📉', description: 'Registro y seguimiento de la gestión de bajas estadísticas.' },
  { id: 'af', name: 'Acompañamiento frecuente (A/F)', icon: '🤝', description: 'Registro de actividades de acompañamiento en planta.' },
  { id: 'bitacora', name: 'Bitácora', icon: '📔', description: 'Seguimiento diario de novedades y eventos relevantes.' },
  { id: 'ee', name: 'Entrenamiento estandarizado (EE)', icon: '🎓', description: 'Registro y control de capacitaciones bajo estándares.' },
  { id: 'gi', name: 'Gestión de indicadores (GI)', icon: '📊', description: 'Monitoreo de KPI y métricas de desempeño.' },
  { id: 'opt', name: 'OPT', icon: '🔍', description: 'Observación Preventiva del Trabajo y seguridad.' },
  { id: 'te', name: 'Trabajo estandarizado (TE)', icon: '📋', description: 'Verificación de cumplimiento de estándares operativos.' },
];

export default function NuevaOptPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasReadPrinciples, setHasReadPrinciples] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) return null;

  if (!hasReadPrinciples) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <header className="header" style={{ padding: '12px 0' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FirplakLogo height={35} color="white" />
            <button onClick={() => router.push('/opt-sistemica')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
              Salir
            </button>
          </div>
        </header>

        <main className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          <div className="animate-fade-in card" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ color: 'var(--header-bg)', fontSize: '2.5rem', marginBottom: '24px', fontWeight: 700 }}>
              Principios
            </h1>
            
            <p style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--accent)', fontWeight: 600 }}>
              Recuerde los principios de la OPT:
            </p>

            <div style={{ color: '#333', fontSize: '1.05rem', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>1.</strong> Su objetivo no es calificar o evaluar a los líderes, su objetivo es ayudarles. 
                Así el primer fundamento es: haga esta OPT con el interés genuino de ayudarle al líder y crearle disciplina.
              </p>

              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>2.</strong> Observe con un foco, en realidad si usted observa que hay falencias en alguna herramienta 
                deténgase en ella y no abandone al líder hasta haberle ayudado.
              </p>

              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>3.</strong> No importa cuanto tiempo tarde, las preguntas son una guía, comprenda que el sentido 
                de la pregunta es encontrar dificultades del líder y sus causas.
              </p>

              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>4.</strong> Mientras observa no piense en soluciones, entienda y escuche al líder hasta encontrar las causas.
              </p>

              <p style={{ marginBottom: '32px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>5.</strong> Observe el hecho real, lugar real y objeto real. Los documentos son registros, 
                son papeles, no son los hechos. Observe al líder mientras ejecuta la herramienta, no se centre en el papel.
              </p>

              <div style={{ 
                background: '#f0f4f5', 
                padding: '24px', 
                borderRadius: '12px', 
                borderLeft: '4px solid var(--header-bg)',
                marginBottom: '40px'
              }}>
                <p>
                  <strong style={{ color: 'var(--header-bg)' }}>Lugar Real:</strong> el lugar real es donde el líder ejecuta la herramienta. 
                  Si quiere observar por ejemplo entrenamiento estandarizado, observe un entrenamiento.
                </p>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}
              onClick={() => setHasReadPrinciples(true)}
            >
              He leído los principios y deseo Continuar
            </button>
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: '0.8rem' }}>
          <p>Firplak S.A. &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FirplakLogo height={35} color="white" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>{session.user.email}</span>
            <button 
              onClick={() => router.push('/opt-sistemica')}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '40px' }}>
        <div className="animate-fade-in">
          <button 
            onClick={() => router.push('/opt-sistemica')}
            style={{ 
              background: 'transparent', 
              color: 'var(--primary)', 
              border: 'none', 
              padding: '0', 
              marginBottom: '20px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            ← Volver
          </button>

          <h1 style={{ color: 'var(--accent)', fontSize: '2.2rem', marginBottom: '8px', fontWeight: 700 }}>
            Nueva OPT
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '40px' }}>
            Selecciona el módulo para iniciar el registro.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px',
            marginBottom: '60px'
          }}>
            {subModules.map((module) => (
              <div 
                key={module.id}
                className="card" 
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px'
                }}
                onClick={() => router.push(`/opt-sistemica/nueva-opt/${module.id}`)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 51, 74, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{module.icon}</div>
                <h3 style={{ marginBottom: '12px', color: 'var(--accent)', fontSize: '1.25rem' }}>{module.name}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.5, flex: 1 }}>
                  {module.description}
                </p>
                <div style={{ 
                  marginTop: '20px', 
                  color: 'var(--primary)', 
                  fontWeight: 600, 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Ingresar →
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: '0.9rem' }}>
        <p>Desarrollado para Firplak S.A. &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
