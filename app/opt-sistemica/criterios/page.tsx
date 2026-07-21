"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, CheckCircle2, TrendingDown, Users, BookOpen, GraduationCap, BarChart3, Star, Search, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/opt-sistemica/SubHeader";

export default function OptSistemicaCriteriosPage() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email || "");
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] w-full">
      <Header 
        title="OPT Sistémica"
        subtitle="Criterios de Calificación"
        backUrl="/sistema-produccion"
        userEmail={userEmail}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center pb-20">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Main Title Card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="bg-[#324354]/5 py-8 px-8 border-b border-slate-100 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-tight">
                CRITERIOS DE CALIFICACIÓN OPT SISTÉMICA
              </h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
                La calificación final de cada módulo auditado se basa en el porcentaje de respuestas positivas frente a los estándares de gestión de planta.
              </p>
            </div>

            {/* Grid of Criteria */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GI */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs font-bold bg-blue-50 px-3 py-1 rounded-full">Gestión de Indicadores</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">Tableros y Reuniones</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Se audita el llenado del tablero del día anterior, la correspondencia de planes de acción en desviaciones de seguridad, calidad, costo o entrega, y el uso correcto de la tarjeta de comunicación.
                  </p>
                </div>
              </div>

              {/* EE */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs font-bold bg-cyan-50 px-3 py-1 rounded-full">Entrenamiento Estandarizado</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">Competencias del Personal</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Verifica el estado del plan de entrenamiento de operarios, diligenciamiento de hojas individuales de progreso y comprobación del desglose de procesos de manera práctica en el puesto.
                  </p>
                </div>
              </div>

              {/* BE */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs font-bold bg-purple-50 px-3 py-1 rounded-full">Bajas Estadísticas</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">Desempeño Individual</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Mide el conocimiento del ciclo de bajas estadísticas por parte del líder y evalúa si se están ejecutando y documentando planes específicos para las personas en rendimiento desfavorable.
                  </p>
                </div>
              </div>

              {/* AF */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full">Acompañamiento Frecuente</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">Seguimiento en Planta</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Audita la frecuencia y la calidad de las interacciones del líder documentadas en la bitácora, además de corroborar con los operarios si efectivamente reciben feedback correctivo.
                  </p>
                </div>
              </div>

              {/* 5S */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow md:col-span-2">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Star className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs font-bold bg-amber-50 px-3 py-1 rounded-full">Estándares 5S</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">Orden, Limpieza y Mejora Continua</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Mide la clasificación, el orden visual de las herramientas, el uso de mapas de referencia (4S Estandarizar), la disciplina en el checklist de limpieza y el uso de los buzones de necesidades de los colaboradores.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Rango de Evaluación */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Niveles de Cumplimiento</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <div className="text-xl font-extrabold text-emerald-700">80% - 100%</div>
                <div className="text-xs font-bold text-emerald-600 mt-1 uppercase">Satisfactorio</div>
                <p className="text-[11px] text-slate-600 mt-2">La herramienta se encuentra madura y disciplinada en el área.</p>
              </div>
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <div className="text-xl font-extrabold text-amber-700">50% - 79%</div>
                <div className="text-xs font-bold text-amber-600 mt-1 uppercase">Alerta / Atención</div>
                <p className="text-[11px] text-slate-600 mt-2">Se requieren acciones correctivas rápidas para resolver desviaciones.</p>
              </div>
              <div className="p-5 rounded-2xl bg-red-50 border border-red-100 text-center">
                <div className="text-xl font-extrabold text-red-700">0% - 49%</div>
                <div className="text-xs font-bold text-red-600 mt-1 uppercase">Crítico</div>
                <p className="text-[11px] text-slate-600 mt-2">Inadmisible. Falta acompañamiento prioritario al líder de sección.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
