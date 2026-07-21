"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Info, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/opt-sistemica/SubHeader";

export default function OptSistemicaGuiaPage() {
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
        subtitle="Guía"
        backUrl="/sistema-produccion"
        userEmail={userEmail}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center pb-20">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Main Card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-[#0284c7] rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Principios de la OPT Sistémica</h1>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              La Observación Preventiva del Trabajo (OPT) Sistémica es una herramienta de liderazgo diseñada para acompañar y retroalimentar a los líderes de sección en la correcta implementación de herramientas operativas en el piso de la fábrica.
            </p>

            <div className="space-y-6 mt-6">
              
              <div className="flex gap-4 items-start border-l-2 border-dashed border-slate-200 pl-4 py-1">
                <div className="text-lg font-black text-[#0284c7]">1</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">El Objetivo es Ayudar y Formar</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    El propósito de la OPT Sistémica no es juzgar, calificar ni penalizar a los líderes. La intención fundamental es acompañarles de forma cercana en sus retos de gestión diarios, ayudándoles a consolidar la disciplina de control en el piso.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start border-l-2 border-dashed border-slate-200 pl-4 py-1">
                <div className="text-lg font-black text-[#0284c7]">2</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Mantén un Foco Claro</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Al realizar la auditoría, enfócate en los aspectos específicos de la sección. Si identificas desviaciones significativas en alguna de las herramientas, detente para acompañar al líder, aportando retroalimentación concreta antes de finalizar.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start border-l-2 border-dashed border-slate-200 pl-4 py-1">
                <div className="text-lg font-black text-[#0284c7]">3</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Entiende la Causa Raíz de las Dificultades</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Utiliza las preguntas del formato como un mapa guía para detonar conversaciones analíticas. No te limites al checklist; indaga los motivos subyacentes por los cuales la herramienta no se cumple o tiene dificultades de adopción.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start border-l-2 border-dashed border-slate-200 pl-4 py-1">
                <div className="text-lg font-black text-[#0284c7]">4</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Escucha Activamente al Líder</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Evita proponer planes de acción o soluciones apresuradas antes de comprender a fondo la perspectiva del responsable. La escucha receptiva y respetuosa es indispensable para encontrar los factores condicionantes del proceso.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start border-l-2 border-dashed border-slate-200 pl-4 py-1">
                <div className="text-lg font-black text-[#0284c7]">5</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Evalúa los Hechos en el Terreno Real</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Audita la ejecución directamente en el lugar, momento y con los objetos reales (Gemba). No te limites a revisar reportes en papel o registros firmados; observa de manera práctica cómo se despliega la herramienta en el día a día.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Info Card */}
          <div className="w-full bg-[#324354] rounded-3xl shadow-lg p-8 text-white flex flex-col md:flex-row gap-6 items-center">
            <div className="p-4 bg-white/10 rounded-2xl text-white shrink-0">
              <Info className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Importante: El Lugar Real (Gemba)</h2>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                Para validar una herramienta como *Entrenamiento Estandarizado (EE)*, dirígete al puesto donde se imparte el entrenamiento y observa al instructor y al aprendiz en acción. El terreno de la planta revela las oportunidades reales de mejora que los documentos escritos no logran reflejar.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
