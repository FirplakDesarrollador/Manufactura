'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import FirplakLogo from '@/components/opt-sistemica/FirplakLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    } else {
      router.push('/opt-sistemica');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #00334a 0%, #001f2d 100%)'
    }}>
      <div className="glass animate-fade-in" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '48px', 
        borderRadius: '24px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
          <FirplakLogo height={50} color="white" />
        </div>
        
        <h1 style={{ 
          color: 'white', 
          fontSize: '1.75rem', 
          fontWeight: 700, 
          marginBottom: '8px' 
        }}>
          OPT SISTÉMICA
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          marginBottom: '32px',
          fontSize: '0.95rem'
        }}>
          Inicia sesión para continuar
        </p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label className="label" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Correo Electrónico</label>
            <input
              type="email"
              className="input-field"
              placeholder="ejemplo@firplak.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="label" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Contraseña</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            />
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.1)', 
              color: '#ff8080', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} Firplak S.A. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
