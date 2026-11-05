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
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4 md:py-6">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 justify-items-center w-full">
            {subModules.map((module) => (
              <div key={module.id} className="w-full max-w-[165px] 2xl:max-w-[220px] aspect-square">
                <button 
                  onClick={() => router.push(`/opt-sistemica/nueva-opt/${module.id}`)}
                  className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 bg-white rounded-2xl shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] hover:shadow-[0_15px_30px_rgba(50,67,84,0.12)] hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-11 h-11 md:w-14 md:h-14 2xl:w-16 2xl:h-16 bg-[#324354]/5 rounded-full flex items-center justify-center mb-2 2xl:mb-3 [&_svg]:w-6 [&_svg]:h-6 md:[&_svg]:w-7 md:[&_svg]:h-7 2xl:[&_svg]:w-8 2xl:[&_svg]:h-8 group-hover:bg-[#324354] transition-all duration-300 shadow-sm">
                    {getModuleIcon(module.id, "text-[#324354] group-hover:text-white transition-colors duration-300")}
                  </div>
                  
                  <span className="text-[13px] sm:text-sm 2xl:text-base font-bold text-[#324354] transition-colors duration-300 text-center leading-tight">
                    {module.name}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-2 text-center text-gray-400 text-xs">
        <p>Desarrollado para Firplak S.A. &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
