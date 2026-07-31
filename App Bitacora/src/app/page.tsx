"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, User, LogOut } from "lucide-react";

const ADMIN_EMAIL = 'coordinacioncalidad@firplak.com';

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  uuid: string;
  correo: string;
}

export default function RootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    async function checkAuthAndFetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Buscar por UUID
      let { data: userData, error } = await supabase
        .from('usuarios')
        .select('id, nombre, rol, uuid, correo')
        .eq('uuid', session.user.id)
        .single();

      // 2. Si no encontró por UUID, buscar por correo (primer login de responsable nuevo)
      if (error || !userData) {
        const { data: byEmail } = await supabase
          .from('usuarios')
          .select('id, nombre, rol, uuid, correo')
          .eq('correo', session.user.email)
          .is('uuid', null)
          .single();

        if (byEmail) {
          // Vincular el UUID automáticamente
          await supabase
            .from('usuarios')
            .update({ uuid: session.user.id })
            .eq('id', byEmail.id);
          userData = { ...byEmail, uuid: session.user.id };
        }
      }

      if (userData) {
        setUsuario(userData);
      }
      setLoading(false);
    }
    checkAuthAndFetchUser();
  }, [router]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F7F4EC' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
      </div>
    );
  }

  const isAdmin = usuario?.correo === ADMIN_EMAIL;

  // Cards layout configuration matching the screenshot format
  const allCards = [
    {
      emoji: "📋",
      title: "Llenar Bitácora",
      desc: "Registrar y completar el seguimiento de actividades diarias en cada proceso y planta.",
      btnText: "Comenzar",
      btnBg: "#769598",
      btnHoverBg: "#5f797b",
      topBorder: "8px solid #769598",
      onClick: () => router.push('/bitacora'),
      adminOnly: false
    },
    {
      emoji: "⚙️",
      title: "Crear/Modificar Bitácora",
      desc: "Configurar plantas, procesos y plantillas de actividades diarias del sistema.",
      btnText: "Configurar",
      btnBg: "#769598",
      btnHoverBg: "#5f797b",
      topBorder: "8px solid #769598",
      onClick: () => router.push('/admin'),
      adminOnly: true
    },
    {
      emoji: "📊",
      title: "Indicadores",
      desc: "Visualizar el desempeño y las métricas de cumplimiento en tiempo real.",
      btnText: "Ver Dashboard",
      btnBg: "#1a1a1a",
      btnHoverBg: "#000000",
      topBorder: "8px solid #1a1a1a",
      onClick: () => router.push('/indicadores'),
      adminOnly: false
    },
    {
      emoji: "🛡️",
      title: "Administrador",
      desc: "Gestión de usuarios y responsables del sistema de bitácoras.",
      btnText: "Gestionar",
      btnBg: "#1a1a1a",
      btnHoverBg: "#000000",
      topBorder: "8px solid #1a1a1a",
      onClick: () => router.push('/admin-general'),
      adminOnly: true
    }
  ];

  const cards = allCards.filter(c => !c.adminOnly || isAdmin);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F7F4EC', 
      padding: '40px 20px 100px',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div className="container animate-fade-in">
        
        {/* Header con Bienvenida */}
        <header style={{ 
          marginBottom: '50px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 51, 74, 0.1)',
          paddingBottom: '24px'
        }}>
          <div>
            <h1 style={{ color: '#002b36', fontSize: '2.4rem', fontWeight: 800, marginBottom: '6px' }}>
              Panel Principal
            </h1>
            <p style={{ color: '#555', fontSize: '1.1rem', fontWeight: 400 }}>
              Bienvenido al sistema de gestión de bitácoras de Firplak S.A.
            </p>
          </div>
          
          {usuario && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00334a', fontWeight: 700, fontSize: '1.1rem' }}>
                <div style={{ background: '#769598', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                  {usuario.nombre.charAt(0)}
                </div>
                {usuario.nombre}
              </div>
              <button 
                onClick={handleLogout} 
                style={{ 
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer', 
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px',
                  padding: 0, fontWeight: 600, transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseOut={(e) => e.currentTarget.style.color = '#888'}
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          )}
        </header>

        {/* Grid de Botones/Tarjetas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '32px',
          maxWidth: '1100px',
          margin: '0 auto',
          paddingTop: '10px'
        }}>
          {cards.map((card, index) => (
            <div 
              key={index}
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '32px 28px 28px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.04)',
                borderTop: card.topBorder,
                borderLeft: '1px solid #f0edf0',
                borderRight: '1px solid #f0edf0',
                borderBottom: '1px solid #e5e3e5',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'default'
              }}
              className="dashboard-card"
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 20px 30px rgba(0, 0, 0, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Emojis con tamaño y estilo del screenshot */}
              <div style={{ 
                fontSize: '2.5rem', 
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {card.emoji}
              </div>

              {/* Título */}
              <h2 style={{ 
                fontSize: '1.6rem', 
                fontWeight: 700, 
                color: '#1a1a1a', 
                marginBottom: '12px',
                textAlign: 'left'
              }}>
                {card.title}
              </h2>

              {/* Descripción */}
              <p style={{ 
                color: '#666', 
                fontSize: '0.95rem', 
                lineHeight: 1.6,
                marginBottom: '28px',
                textAlign: 'left',
                flex: 1
              }}>
                {card.desc}
              </p>

              {/* Botón de Acción exactamente como el screenshot */}
              <button
                onClick={card.onClick}
                style={{
                  background: card.btnBg,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  width: '90%',
                  margin: '0 auto',
                  display: 'block',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = card.btnHoverBg;
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = card.btnBg;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {card.btnText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
