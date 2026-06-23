'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Link from 'next/link';
import { isAuthorized } from '@/lib/ficha-rcc/auth';

// Correos autorizados para el módulo de administrador
const ADMIN_EMAILS = [
  'coordinacioncalidad@firplak.com', 
  'estiven.londono@firplak.com', 
  'estiven.londoño@firplak.com'
];

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorizedUser, setIsAuthorizedUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        // Verificamos si el usuario es administrador
        const userEmail = session.user.email?.toLowerCase() || '';
        const adminFound = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
        setIsAdmin(adminFound);
        setIsAuthorizedUser(isAuthorized(userEmail));
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background-start)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '40px', padding: '40px 20px' }}>
      
      {/* Logo Firplak Estetizado */}
      <div style={{ 
        background: 'var(--header-bg)', 
        padding: '30px 60px', 
        borderRadius: '25px', 
        boxShadow: '0 15px 40px rgba(0,0,0,0.15)', 
        marginBottom: '20px',
        transition: 'transform 0.3s ease'
      }}>
        <FirplakLogo height="100px" />
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, 
        gap: '30px', 
        maxWidth: '1100px', 
        width: '100%' 
      }}>
        
        {/* Módulo 1: Nueva Ficha */}
        <Link href="/ficha-rcc/fichas/crear" style={{ textDecoration: 'none' }}>
           <div className="glass-panel" style={{ 
             padding: '40px', 
             textAlign: 'center', 
             cursor: 'pointer', 
             transition: 'all 0.3s ease', 
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             gap: '20px', 
             height: '100%',
             borderTop: '5px solid var(--header-bg)',
             boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
           }}
           onMouseOver={e => {
             e.currentTarget.style.transform = 'translateY(-10px)';
             e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1)';
           }}
           onMouseOut={e => {
             e.currentTarget.style.transform = 'translateY(0)';
             e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
           }}>
              <div style={{ background: 'var(--header-bg)', color: '#fff', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '36px', fontWeight: 'bold' }}>+</div>
              <h2 style={{ margin: 0, color: 'var(--header-bg)', fontSize: '24px', fontWeight: '800' }}>Nueva Ficha de Alerta</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>Registrar un nuevo hallazgo o defecto detectado en cualquiera de las plantas.</p>
           </div>
        </Link>

        {/* Módulo 2: Historial */}
        <Link href="/ficha-rcc/historial" style={{ textDecoration: 'none' }}>
           <div className="glass-panel" style={{ 
             padding: '40px', 
             textAlign: 'center', 
             cursor: 'pointer', 
             transition: 'all 0.3s ease', 
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             gap: '20px', 
             height: '100%',
             borderTop: '5px solid var(--accent)',
             boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
           }}
           onMouseOver={e => {
             e.currentTarget.style.transform = 'translateY(-10px)';
             e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1)';
           }}
           onMouseOut={e => {
             e.currentTarget.style.transform = 'translateY(0)';
             e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
           }}>
              <div style={{ background: 'var(--accent)', color: 'var(--surface)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 style={{ margin: 0, color: 'var(--header-bg)', fontSize: '24px', fontWeight: '800' }}>Historial de Fichas</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>Consulta y seguimiento de todas las fichas generadas anteriormente.</p>
           </div>
        </Link>

        {/* Módulo 3: Administrador (Solo Admins) */}
        {isAdmin && (
          <Link href="/ficha-rcc/admin" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ 
              padding: '40px', 
              textAlign: 'center', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px', 
              height: '100%',
              borderTop: '5px solid var(--header-bg)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
            }}>
                <div style={{ background: 'var(--header-bg)', color: '#fff', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
                <h2 style={{ margin: 0, color: 'var(--header-bg)', fontSize: '24px', fontWeight: '800' }}>Administrador</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>Gestionar catálogos de defectos y configuraciones del sistema.</p>
            </div>
          </Link>
        )}

        {/* Módulo 4: Contingencias (Solo Autorizados) */}
        {isAuthorizedUser && (
          <Link href="/ficha-rcc/contingencias" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ 
              padding: '40px', 
              textAlign: 'center', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px', 
              height: '100%',
              borderTop: '5px solid var(--accent)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
            }}>
                <div style={{ background: 'var(--accent)', color: 'var(--surface)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h2 style={{ margin: 0, color: 'var(--header-bg)', fontSize: '24px', fontWeight: '800' }}>Contingencias</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>Validar estado OK/NO OK de las acciones de contingencia.</p>
            </div>
          </Link>
        )}

        {/* Módulo 5: Asistencia (Solo Autorizados) */}
        {isAuthorizedUser && (
          <Link href="/ficha-rcc/asistencia" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ 
              padding: '40px', 
              textAlign: 'center', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px', 
              height: '100%',
              borderTop: '5px solid var(--header-bg)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
            }}>
                <div style={{ background: 'var(--header-bg)', color: '#fff', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h2 style={{ margin: 0, color: 'var(--header-bg)', fontSize: '24px', fontWeight: '800' }}>Asistencia Diaria</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>Registro y control de asistencia del personal responsable.</p>
            </div>
          </Link>
        )}
      </div>

      <button 
        onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
        className="btn-secondary" 
        style={{ marginTop: '30px', padding: '12px 24px' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}
