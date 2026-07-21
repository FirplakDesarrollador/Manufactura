"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/opt/SubHeader";

export default function OptGuiaPage() {
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
        title="OPT Operativa"
        subtitle="Guía"
        userEmail={userEmail}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="flex-1 p-6 flex justify-center pb-20">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          
          <div className="bg-primary/5 py-6 px-8 border-b border-slate-100 text-center">
            <h1 className="text-2xl font-bold text-[#254153] tracking-tight">GUÍA OBSERVACIÓN DE PUESTO DE TRABAJO (OPT)</h1>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Paso 1 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#254153] text-white text-xs py-1 px-2 rounded-md">PASO 1</span>
                Prepárese para observar
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">1.</span>
                  <span>Identifique el puesto de trabajo y el operario a evaluar.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">2.</span>
                  <span>Verifique que el operario cuente con todos los elementos de seguridad y protección personal requeridos.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">3.</span>
                  <span>Revise la Hoja de División de Trabajo (HDT) y plan de control aplicable al puesto.</span>
                </li>
              </ul>
            </section>

            {/* Paso 2 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#254153] text-white text-xs py-1 px-2 rounded-md">PASO 2</span>
                Observe el puesto y proceso
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">4.</span>
                  <span>Evalúe la ergonomía: posturas correctas, alturas de trabajo y apoyos necesarios del colaborador.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">5.</span>
                  <span>Verifique el orden y aseo (norma 5S) y asegúrese de que las herramientas estén en óptimo estado y limpias.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">6.</span>
                  <span>Observe el flujo de trabajo para identificar actividades de Valor Agregado (VA) y No Valor Agregado (NVA).</span>
                </li>
              </ul>
            </section>

            {/* Paso 3 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#254153] text-white text-xs py-1 px-2 rounded-md">PASO 3</span>
                Valore el conocimiento y calidad
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">7.</span>
                  <span>Dialogue con el operario sobre el conocimiento de sus indicadores y metas de productividad del día.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">8.</span>
                  <span>Confirme que el operario conozca y sepa identificar los defectos de calidad comunes y el estado conforme del producto.</span>
                </li>
              </ul>
            </section>

            {/* Paso 4 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#254153] text-white text-xs py-1 px-2 rounded-md">PASO 4</span>
                Retroalimente y registre
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">9.</span>
                  <span>Realice una retroalimentación positiva y aborde constructivamente las desviaciones encontradas.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254153]">10.</span>
                  <span>Registre las observaciones detalladas en el formulario para iniciar los planes de mejora correspondientes.</span>
                </li>
              </ul>
            </section>

            {/* Conclusion */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-lg font-bold text-[#254153] italic">Asegúrese de fomentar una cultura de seguridad, orden y calidad en el puesto de trabajo.</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
