'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--background)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <FirplakLogo height={60} color="var(--header-bg)" className="animate-pulse" />
          <p style={{ marginTop: '20px', color: '#666', fontWeight: 500 }}>Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  const allowedAdminEmails = ['coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com', 'jakeline.chaverra@firplak.com'];
  const isAdmin = session && session.user.email && allowedAdminEmails.includes(session.user.email);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <FirplakLogo height={40} color="white" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              {session.user.email}
            </span>
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '60px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', marginBottom: '8px', fontWeight: 700 }}>
            Bienvenido,
          </h1>
          <p style={{ color: '#666', fontSize: '1.2rem', marginBottom: '40px' }}>
            Sistema <strong style={{ color: 'var(--primary)' }}>OPT SISTÉMICA</strong> - Dashboard Principal
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '32px',
            marginBottom: '40px'
          }}>
            {/* Agendamiento */}
            <div 
              className="card" 
              style={{ borderTop: '6px solid var(--primary)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => router.push('/opt-sistemica/agendamiento')}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📅</div>
              <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem' }}>Agendamiento</h3>
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Planifica y asigna las observaciones a realizar para cada responsable.
              </p>
              <button className="btn-primary" style={{ marginTop: '24px', width: '100%', background: 'var(--primary)' }}>
                Planear
              </button>
            </div>

            {/* Nueva OPT */}
            <div 
              className="card" 
              style={{ borderTop: '6px solid var(--primary)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => router.push('/opt-sistemica/nueva-opt')}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📝</div>
              <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem' }}>Nueva OPT</h3>
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Iniciar un nuevo registro de observación sistémica y sus indicadores asociados.
              </p>
              <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }}>
                Comenzar
              </button>
            </div>

            {/* Historial */}
            <div 
              className="card" 
              style={{ borderTop: '6px solid var(--header-bg)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => router.push('/opt-sistemica/historial')}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🕒</div>
              <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem' }}>Historial</h3>
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Consulta y gestiona los registros históricos de observaciones realizadas.
              </p>
              <button className="btn-primary" style={{ marginTop: '24px', width: '100%', background: 'var(--header-bg)' }}>
                Ver Registros
              </button>
            </div>

            {/* Indicadores */}
            <div 
              className="card" 
              style={{ borderTop: '6px solid var(--accent)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => router.push('/opt-sistemica/indicadores')}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📊</div>
              <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem' }}>Indicadores</h3>
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Visualiza el desempeño y las métricas de cumplimiento en tiempo real.
              </p>
              <button className="btn-primary" style={{ marginTop: '24px', width: '100%', background: 'var(--accent)' }}>
                Ver Dashboard
              </button>
            </div>

            {/* Administrador (Only for authorized users) */}
            {isAdmin && (
              <div 
                className="card" 
                style={{ borderTop: '6px solid var(--accent)', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => router.push('/opt-sistemica/admin')}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🛡️</div>
                <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem' }}>Administrador</h3>
                <p style={{ color: '#666', lineHeight: 1.6 }}>
                  Acceso exclusivo para coordinación de calidad y administración del sistema.
                </p>
                <button className="btn-primary" style={{ marginTop: '24px', width: '100%', background: 'var(--accent)' }}>
                  Gestionar
                </button>
              </div>
            )}
          </div>
        </div>
      </main>


      <footer style={{ 
        textAlign: 'center', 
        padding: '40px 0', 
        color: '#999', 
        fontSize: '0.9rem' 
      }}>
        <p>Desarrollado para Firplak S.A. &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
