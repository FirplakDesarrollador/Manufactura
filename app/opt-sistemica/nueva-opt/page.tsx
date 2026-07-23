'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/opt-sistemica/supabase';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/opt-sistemica/SubHeader';
import { Star, TrendingDown, Users, BookOpen, GraduationCap, BarChart3, Search, ClipboardList, Wrench } from 'lucide-react';

const subModules = [
  { id: '5s', name: "5'S", icon: '⭐', description: 'Evaluación y seguimiento de los estándares de las 5S.' },
  { id: 'be', name: 'Gestión de bajas estadísticas (BE)', icon: '📉', description: 'Registro y seguimiento de la gestión de bajas estadísticas.' },
  { id: 'af', name: 'Acompañamiento frecuente (A/F)', icon: '🤝', description: 'Registro de actividades de acompañamiento en planta.' },
  { id: 'bitacora', name: 'Bitácora', icon: '📔', description: 'Seguimiento diario de novedades y eventos relevantes.' },
  { id: 'ee', name: 'Entrenamiento estandarizado (EE)', icon: '🎓', description: 'Registro y control de capacitaciones bajo estándares.' },
  { id: 'gi', name: 'Gestión de indicadores (GI)', icon: '📊', description: 'Monitoreo de KPI y métricas de desempeño.' },
  { id: 'opt', name: 'OPT', icon: '🔍', description: 'Observación Preventiva del Trabajo y seguridad.' },
  { id: 'te', name: 'Trabajo estandarizado (TE)', icon: '📋', description: 'Verificación de cumplimiento de estándares operativos.' },
  { id: 'ma', name: 'Mantenimiento Autónomo (MA)', icon: '🔧', description: 'Inspección de máquinas, checklist autónomo, estado de tablero, entrenamiento e HILU.' }
];

const getModuleIcon = (id: string, className: string) => {
  switch (id) {
    case '5s': return <Star className={className} size={28} />;
    case 'be': return <TrendingDown className={className} size={28} />;
    case 'af': return <Users className={className} size={28} />;
    case 'bitacora': return <BookOpen className={className} size={28} />;
    case 'ee': return <GraduationCap className={className} size={28} />;
    case 'gi': return <BarChart3 className={className} size={28} />;
    case 'opt': return <Search className={className} size={28} />;
    case 'te': return <ClipboardList className={className} size={28} />;
    case 'ma': return <Wrench className={className} size={28} />;
    default: return <ClipboardList className={className} size={28} />;
  }
};

export default function NuevaOptPage() {
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

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white w-full">
      {/* Header */}
      <Header
        title="Nueva OPT"
        subtitle="Registro Sistémico"
        backUrl="/sistema-produccion"
        userEmail={session.user.email}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="animate-fade-in w-full max-w-[1600px] flex flex-wrap justify-center gap-6 md:gap-8">
          {subModules.map((module) => (
            <button 
              key={module.id}
              onClick={() => router.push(`/opt-sistemica/nueva-opt/${module.id}`)}
              className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                {getModuleIcon(module.id, "text-[#324354] group-hover:text-white transition-colors duration-500")}
              </div>
              
              <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                {module.name}
                <span className="block text-xs md:text-sm font-normal text-gray-400 group-hover:text-gray-500 mt-1.5 transition-colors duration-300 leading-normal max-w-[200px]">
                  {module.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: '0.9rem' }}>
        <p>Desarrollado para Firplak S.A. &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
