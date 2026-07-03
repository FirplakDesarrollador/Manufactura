'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

export default function BitacoraPage() {
  const [selection, setSelection] = useState<'MS_FV' | 'MBL_CEFI' | null>(null);
  const router = useRouter();

  if (!selection) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <header className="header" style={{ padding: '12px 0' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FirplakLogo height={35} color="white" />
            <button onClick={() => router.push('/opt-sistemica/nueva-opt')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
              Volver
            </button>
          </div>
        </header>

        <main className="container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          paddingTop: '80px' 
        }}>
          <div className="animate-fade-in" style={{ textAlign: 'center', width: '100%', maxWidth: '800px' }}>
            <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '40px' }}>
              📔 Selección de Bitácora
            </h1>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '30px',
              width: '100%'
            }}>
              <button 
                onClick={() => setSelection('MS_FV')}
                className="card"
                style={{
                  height: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.3s ease',
                  background: 'white'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏭</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--header-bg)' }}>MS y FV</h2>
              </button>

              <button 
                onClick={() => setSelection('MBL_CEFI')}
                className="card"
                style={{
                  height: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.3s ease',
                  background: 'white'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📦</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--header-bg)' }}>MBL y CEFI</h2>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Specific content based on selection
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <header className="header" style={{ padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FirplakLogo height={35} color="white" />
          <button onClick={() => setSelection(null)} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>
            Cambiar Bitácora
          </button>
        </div>
      </header>
      <main className="container" style={{ paddingTop: '60px' }}>
        <div className="animate-fade-in">
          <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '20px' }}>
            📔 Bitácora: {selection === 'MS_FV' ? 'MS y FV' : 'MBL y CEFI'}
          </h1>
          <div className="card">
            <p style={{ color: '#666', fontSize: '1.2rem' }}>
              {selection === 'MS_FV' 
                ? 'Módulo de Seguimiento diario de novedades y eventos relevantes para MS y FV.' 
                : 'Módulo de Seguimiento diario de novedades y eventos relevantes para MBL y CEFI.'}
            </p>
            <div style={{ marginTop: '40px', padding: '20px', border: '2px dashed #ddd', borderRadius: '12px', textAlign: 'center', color: '#999' }}>
              {selection === 'MS_FV' 
                ? 'Aquí va el contenido de la bitácora MS y FV que ya creamos.' 
                : 'Contenido de MBL y CEFI en desarrollo...'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
