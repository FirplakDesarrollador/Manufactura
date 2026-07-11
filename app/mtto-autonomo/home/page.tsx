"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function HomePage() {
  const [userName, setUserName] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      // Import dynamicly or assume it's imported at top
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const email = user.email;
        const namePart = email.split('@')[0];
        const firstName = namePart ? namePart.split('.')[0] : 'Usuario';
        const finalName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'Usuario';
        setUserName(finalName);
      } else {
        setUserName('Usuario');
      }
    }
    fetchUser();
  }, []);

  const modules = [
    { 
      title: "Puestas a Punto", 
      path: "/mtto-autonomo/puestas-a-punto", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M228.87,83.14a28,28,0,0,0-12-16.05L202,57.17a36,36,0,0,0-62.83-9.59l-19,25.32a36,36,0,0,0-10,34.4l-64.8,64.8a28,28,0,0,0,0,39.6l10.61,10.61a28,28,0,0,0,39.6,0l64.8-64.8a36,36,0,0,0,34.4-10l25.32-19A36,36,0,0,0,228.87,83.14ZM92.11,205.51a12,12,0,0,1-17,0l-10.6-10.61a12,12,0,0,1,0-17L129.28,113a36,36,0,0,0,30.68,30.69ZM215.42,112.5l-25.31,19c-.3.23-.62.44-.94.65l-26.6-26.6a8,8,0,0,0-11.31,11.31l26.6,26.6q-.31.47-.65.94l-19,25.31a20,20,0,0,1-32.93-9c-2.48-9.88,1-20.15,8.81-26L143,124a8,8,0,0,0,0-11.32L116,85.64a8,8,0,0,0-11.31,0L95.8,94.5a20,20,0,0,1-26-8.81,20,20,0,0,1,9-32.93l25.32-19a20,20,0,0,1,34.89,5.32L148.89,59a28,28,0,0,0,12,16.05A20,20,0,0,1,215.42,112.5Z"></path></svg> 
    },
    { 
      title: "Tarjetas de Anomalías", 
      path: "/mtto-autonomo/tarjetas-falla", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,104v40a8,8,0,0,0,16,0V104a8,8,0,0,0-16,0Zm20,80a12,12,0,1,1-12-12A12,12,0,0,1,140,184Z"></path></svg>
    },
    { 
      title: "Estándares LILAC", 
      path: "#", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M168,144a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h40A8,8,0,0,1,168,144Zm-48,40h16a8,8,0,0,0,0-16H120a8,8,0,0,0,0,16ZM216,40V216a24,24,0,0,1-24,24H64a24,24,0,0,1-24-24V40A24,24,0,0,1,64,16H192A24,24,0,0,1,216,40Zm-16,0a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8ZM96,96a12,12,0,1,1-12-12A12,12,0,0,1,96,96Zm0,48a12,12,0,1,1-12-12A12,12,0,0,1,96,144Zm0,48a12,12,0,1,1-12-12A12,12,0,0,1,96,192Zm72-104H120a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path></svg>
    },
    { 
      title: "Controles Visuales", 
      path: "#", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.59-19.18-26.78-36.63C200.75,69,168.1,56,128,56S55.25,69,35.47,88.13C17.28,105.58,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.59,19.18,26.78,36.63C55.25,187,87.9,200,128,200s72.75-13,92.53-32.13c18.19-17.45,26.43-35.84,26.78-36.63A8,8,0,0,0,247.31,124.76ZM128,184c-35.35,0-63.5-10.9-80.66-26.4C33.31,144.91,26.4,131.7,24.3,128c2.1-3.7,9-16.91,23.04-29.6C64.5,82.9,92.65,72,128,72s63.5,10.9,80.66,26.4C222.69,111.09,229.6,124.3,231.7,128c-2.1,3.7-9,16.91-23.04,29.6C191.5,173.1,163.35,184,128,184Zm0-94a38,38,0,1,0,38,38A38.05,38.05,0,0,0,128,90Zm0,60a22,22,0,1,1,22-22A22,22,0,0,1,128,150Z"></path></svg>
    },
    { 
      title: "Lecciones LUP", 
      path: "#", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-5.39-1l-36.14,12L54.46,180a8,8,0,0,0-1-5.39A88,88,0,1,1,128,216ZM144,112a16,16,0,1,1-16-16A16,16,0,0,1,144,112Z"></path></svg>
    },
    { 
      title: "Principio de Máquina", 
      path: "#", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 256 256"><path d="M226.71,137.45h0l-31.54,9.66a72,72,0,0,1,0,17.78l31.54,9.66a8,8,0,0,1,5.32,9.86l-13.66,42a8,8,0,0,1-9.42,5.55l-32.55-6A72.16,72.16,0,0,1,161,236.44l-6,32.55a8,8,0,0,1-5.55,6.42l-42-13.66a8,8,0,0,1-5-9.86v0l9.66-31.54a72,72,0,0,1-17.78,0L84.69,251.89a8,8,0,0,1-9.86,5.32l-42-13.66A8,8,0,0,1,27.3,234.13l6-32.55A72.16,72.16,0,0,1,18,186.1l-32.55,6a8,8,0,0,1-6.42-5.55l-13.66-42a8,8,0,0,1,5-9.86v0l31.54-9.66a72,72,0,0,1,0-17.78l-31.54-9.66a8,8,0,0,1-5.32-9.86l13.66-42A8,8,0,0,1-6.72,40L25.83,46a72.16,72.16,0,0,1,15.42-15.42l-6-32.55A8,8,0,0,1,40.8-8.38l42,13.66a8,8,0,0,1,5,9.86v0l-9.66,31.54a72,72,0,0,1,17.78,0l9.66-31.54a8,8,0,0,1,9.86-5.32l42,13.66a8,8,0,0,1,6.42,9.42l-6,32.55A72.16,72.16,0,0,1,173.28,81.3l32.55-6a8,8,0,0,1,6.42,5.55l13.66,42A8,8,0,0,1,226.71,137.45ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path></svg>
    }
  ];

  return (
    <div className="home-container-centered fade-in" style={{ paddingTop: '2.5rem' }}>
      
      {/* Header con Logo */}
      {/* Header con Logo Eliminado por Reducción de Espacio */}

      {showBanner && (
        <section className="fade-in" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '4rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '1450px' }}>
            {/* Botón para cerrar la imagen */}
            <button 
              onClick={() => setShowBanner(false)}
              aria-label="Cerrar bienvenida"
              title="Cerrar"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #eef2f5',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                color: 'var(--primary-color)',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'}
            >
              ✕
            </button>
            <img 
              src="/Imagen1.png" 
              alt="Mensaje de Bienvenida FIRPLAK" 
              style={{ width: '90%', display: 'block', margin: '0 auto', borderRadius: '16px', boxShadow: '0 8px 30px rgba(26,68,91,0.1)' }} 
            />
          </div>
        </section>
      )}

      <div className="greeting-section">
        <h1 className="greeting-title">¡Hola {userName}!</h1>
        <h2 className="greeting-subtitle">¿Qué quieres hacer?</h2>
      </div>

      <div className="modules-grid-centered">
        {modules.map((mod, index) => (
          <Link href={mod.path} key={index} className="module-card-icon" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="icon-container">
              {mod.icon}
            </div>
            <h3 className="card-title-centered">{mod.title}</h3>
          </Link>
        ))}
      </div>

      <div className="app-footer" style={{ marginTop: 'auto', paddingTop: '3rem', paddingBottom: '1rem' }}>
        <p>FIRPLAK S.A. | INSPIRANDO HOGARES | MANTENIMIENTO AUTÓNOMO</p>
      </div>
    </div>
  );
}

