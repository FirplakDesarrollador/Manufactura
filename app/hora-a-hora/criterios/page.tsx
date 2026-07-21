"use client";

import { useEffect, useState } from "react";
import { FileText, Clock, ClipboardCheck, BarChart2, AlertTriangle, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/hora-a-hora/SubHeader";

export default function HoraHoraCriteriosPage() {
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
        title="Hora a Hora"
        subtitle="Criterios de Calificación"
        userEmail={userEmail}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center pb-20">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Page Title Card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="bg-[#254153]/5 py-8 px-8 border-b border-slate-100 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#254153] tracking-tight">
                CRITERIOS DE CALIFICACIÓN HORA A HORA
              </h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
                La calidad y precisión de los registros de medición Hora a Hora se evalúan en base al cumplimiento de estándares de entrada de datos, tiempos mínimos de ciclo y categorización de desperdicios.
              </p>
            </div>

            {/* Grid of Criteria */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Criterio 1 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">20%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">1. Datos Básicos del Puesto</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Evaluación del llenado de los datos de control: selección de Planta, Puesto de Trabajo, Operario evaluado, y nombre del Supervisor que realiza la toma de tiempos.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Diligenciar el 100% de los campos de encabezado.
                </div>
              </div>

              {/* Criterio 2 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
                      <Clock className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full text-sm">30%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">2. Medición de Ciclos</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Valida que se registren los ciclos mínimos obligatorios según la planta para asegurar representatividad estadística (Mínimo 1 ciclo para FV y RTM; Mínimo 10 ciclos para MS, MBL y CEFI).
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Cumplir con los ciclos mínimos según la planta seleccionada.
                </div>
              </div>

              {/* Criterio 3 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm">20%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">3. Verificación HDT</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Califica la revisión del estándar operativo en el puesto, auditando si las condiciones actuales del proceso coinciden con la Hoja de División de Trabajo (HDT) vigente.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Responder a todas las preguntas de validación del estándar HDT.
                </div>
              </div>

              {/* Criterio 4 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm">15%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">4. Reporte de Producción</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Registrar el total de piezas producidas y piezas defectuosas en el intervalo. El sistema calculará el % de Rendimiento y % de Calidad del periodo.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Ingresar piezas totales y buenas mayores o iguales a cero.
                </div>
              </div>

              {/* Criterio 5 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between md:col-span-2 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">15%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">5. Clasificación de Desperdicios (6M)</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Si se reportan piezas defectuosas o tiempos muertos, se debe clasificar la causa raíz bajo las 6M (Mano de obra, Métodos, Materiales, Maquinaria, Medición, Medio Ambiente) para alimentar el análisis de Pareto.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Identificar el tipo de desperdicio y justificar la causa cuando la calidad sea menor al 100%.
                </div>
              </div>

            </div>
          </div>

          {/* Tips Section */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Consejos para un Registro de Alta Calidad</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Registra la Planta Adecuada</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Asegúrate de seleccionar correctamente la planta al inicio, ya que el sistema ajustará automáticamente los límites de ciclos de cronometraje requeridos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Alcanza los Ciclos Mínimos</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    No detengas la medición antes de tiempo. Para plantas como MS, MBL o CEFI debes registrar al menos 10 ciclos para que la muestra sea válida.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Describe Detalladamente los Desperdicios</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Si hay piezas malas, selecciona el tipo de desperdicio y redacta observaciones claras de lo ocurrido (ej. *"Falta de adherencia en borde debido a temperatura baja del encolador"*).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Audita la HDT en Campo</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Observa atentamente si el colaborador sigue el orden secuencial de la HDT y responde honestamente para identificar oportunidades de re-estandarización.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
