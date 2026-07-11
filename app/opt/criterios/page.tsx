"use client";

import { ArrowLeft, FileText, MessageSquare, AlignLeft, AlertTriangle, Clock, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function CriteriosPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="w-32 flex items-center">
          <Link href="/opt" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Volver al menú OPT">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
        
        <h1 className="font-bold text-base sm:text-lg md:text-xl uppercase tracking-wider text-center flex-1 truncate px-2">
          Criterios de Calificación
        </h1>
        
        <div className="w-32 flex justify-end">
          <img
            src="/firplak-logo.png"
            alt="Firplak Logo"
            className="brightness-0 invert object-contain max-h-[32px]"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center pb-20">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Page Title Card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="bg-[#254153]/5 py-8 px-8 border-b border-slate-100 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#254153] tracking-tight">
                CRITERIOS DE CALIFICACIÓN DE OPT
              </h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl mx-auto">
                La calificación final de cada Observación de Puesto de Trabajo se calcula automáticamente de 0% a 100% evaluando la calidad, precisión y profundidad de la información registrada.
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
                  <h3 className="text-lg font-bold text-slate-800 mb-2">1. Datos Básicos Completos</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Evaluación del llenado de información fundamental: título de la OPT, planta, puesto, operario evaluado y responsable del registro.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Llenar el 100% de los datos de encabezado.
                </div>
              </div>

              {/* Criterio 2 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">30%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">2. Llenado de Observaciones</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Mide el número de campos de comentarios descriptivos diligenciados dentro de las 11 categorías evaluadas.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Escribir comentarios en mínimo 4 de las categorías.
                </div>
              </div>

              {/* Criterio 3 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <AlignLeft className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm">20%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">3. Nivel de Detalle</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Mide la calidad de la redacción calculando el promedio de caracteres de las observaciones registradas. Evita respuestas de una sola palabra.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Puntaje: 20% si el promedio supera los 40 caracteres; 10% si supera 15.
                </div>
              </div>

              {/* Criterio 4 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">15%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">4. Congruencia de Hallazgos</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Premia la concordancia entre los checks y los textos. Si marcas que algo "No Cumple", obligatoriamente debes registrar el porqué en las observaciones.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Máximo: 15% al justificar fallas; 10% al justificar aciertos; 5% si todo cumple sin comentarios.
                </div>
              </div>

              {/* Criterio 5 */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between md:col-span-2 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Clock className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm">15%</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">5. Análisis de Valor Agregado (VA/NVA)</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Monitorea la medición del desempeño del puesto determinando cuántas actividades del operario agregan valor (VA) y cuáles representan desperdicio (NVA).
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                  Requisito: Registrar las cantidades de VA / NVA y redactar la justificación/análisis de la medición.
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
              <h2 className="text-xl font-bold text-slate-800">Tips Clave para Conseguir un 100%</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Diligencia todos los campos iniciales</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Antes de comenzar la observación física, selecciona la planta, el puesto y el operario evaluado. Asegúrate de incluir el tema o título.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Sé detallado en tus descripciones</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    En lugar de escribir observaciones cortas como "correcto" o "no tiene", describe la situación: *"El operario mantiene una postura ergonómica con apoyo lumbar adecuado"*.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Comenta al menos 4 secciones</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Aunque el operario cumpla todos los aspectos, elige al menos 4 categorías para registrar buenas prácticas u observaciones del puesto de trabajo.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Completa la sección de VA/NVA</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Mide y registra el conteo de actividades de Valor Agregado (VA) y de No Valor Agregado (NVA). Explica detalladamente en el cuadro de texto qué desperdicios se detectaron.
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
