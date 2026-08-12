'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FirplakLogo from '@/components/FirplakLogo';
import { Loader2, Mail, Lock } from 'lucide-react';

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

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError("Credenciales incorrectas o error de conexión.");
        setLoading(false);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError("Ocurrió un error inesperado.");
      setLoading(false);
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
        borderRadius: '32px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
          <FirplakLogo height={60} color="white" />
        </div>
        
        <h1 style={{ 
          color: 'white', 
          fontSize: '2rem', 
          fontWeight: 800, 
          marginBottom: '8px' 
        }}>
          Bitácora Firplak
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          marginBottom: '32px',
          fontSize: '1rem'
        }}>
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', marginLeft: '4px' }}>Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
              <input
                type="email"
                placeholder="ejemplo@firplak.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ 
                  width: '100%',
                  padding: '14px 14px 14px 48px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', marginLeft: '4px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ 
                  width: '100%',
                  padding: '14px 14px 14px 48px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.15)', 
              color: '#ff8080', 
              padding: '14px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              fontSize: '0.9rem',
              textAlign: 'center',
              border: '1px solid rgba(220, 38, 38, 0.2)'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '16px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} Firplak S.A.
          </p>
        </div>
      </div>
    </div>
  );
}
