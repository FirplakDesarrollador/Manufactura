"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/hora-a-hora/SubHeader";

export default function GuiaPage() {
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-[#000000]">
      <Header 
        title="Hora a Hora"
        subtitle="Guía"
        userEmail={userEmail}
      />
      <SubHeader />

      {/* Main Content */}
      <main className="flex-1 p-6 flex justify-center pb-20">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          
          <div className="bg-[#324354]/5 py-6 px-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-[#324354] text-center tracking-tight">GUÍA HORA HORA</h1>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Paso 1 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#324354] text-white text-xs py-1 px-2 rounded-md font-bold">PASO 1</span>
                Preparese para observar
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">1.</span>
                  <span>Encuentre los resultados del desempeño (rendimiento y calidad)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">2.</span>
                  <span>Prepare el formato HORA HORA</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">3.</span>
                  <span>Observe al colaborador, para definir desviaciones (6M Y 8 Desperdicios)</span>
                </li>
              </ul>
            </section>

            {/* Paso 2 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#324354] text-white text-xs py-1 px-2 rounded-md font-bold">PASO 2</span>
                Obtenga hechos
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">4.</span>
                  <span>Haga que el colaborador se sienta comodo (digale los resultados rendimiento y calidad)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">5.</span>
                  <span>Reconozca el trabajo cuando este lo amerite; felicitelo si va mejor del minimo esperado. De lo contrario no le diga nada.</span>
                </li>
              </ul>
            </section>

            {/* Paso 3 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#324354] text-white text-xs py-1 px-2 rounded-md font-bold">PASO 3</span>
                Ayudelo a mejorar
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">6.</span>
                  <span>Ponga en causa al colaborador.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">7.</span>
                  <span>Hagale caer en cuenta los puntos a mejorar. Preguntele hasta que el colaborador se de cuenta.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">8.</span>
                  <span>Ayudele hasta que haga la labor correctamente.</span>
                </li>
              </ul>
            </section>

            {/* Paso 4 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-[#324354] text-white text-xs py-1 px-2 rounded-md font-bold">PASO 4</span>
                Comprobar resultados
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">9.</span>
                  <span>Animelo a realizar la labor teniendo en cuenta los puntos corregidos.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#324354]">10.</span>
                  <span>Pongalo a producir.</span>
                </li>
              </ul>
            </section>

            {/* Conclusion */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-lg font-bold text-[#324354] italic">Asegúrese de haber ayudado al colaborador</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
