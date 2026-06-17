"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GuiaPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full bg-primary text-primary-foreground h-20 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest mt-1">inspiring homes</div>
        </div>
        
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex justify-center pb-20">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          
          <div className="bg-primary/5 py-6 px-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-primary text-center tracking-tight">GUÍA HORA HORA</h1>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Paso 1 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-primary text-white text-xs py-1 px-2 rounded-md">PASO 1</span>
                Preparese para observar
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">1.</span>
                  <span>Encuentre los resultados del desempeño (rendimiento y calidad)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">2.</span>
                  <span>Prepare el formato HORA HORA</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">3.</span>
                  <span>Observe al colaborador, para definir desviaciones (6M Y 8 Desperdicios)</span>
                </li>
              </ul>
            </section>

            {/* Paso 2 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-primary text-white text-xs py-1 px-2 rounded-md">PASO 2</span>
                Obtenga hechos
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">4.</span>
                  <span>Haga que el colaborador se sienta comodo (digale los resultados rendimiento y calidad)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">5.</span>
                  <span>Reconozca el trabajo cuando este lo amerite; felicitelo si va mejor del minimo esperado. De lo contrario no le diga nada.</span>
                </li>
              </ul>
            </section>

            {/* Paso 3 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-primary text-white text-xs py-1 px-2 rounded-md">PASO 3</span>
                Ayudelo a mejorar
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">6.</span>
                  <span>Ponga en causa al colaborador.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">7.</span>
                  <span>Hagale caer en cuenta los puntos a mejorar. Preguntele hasta que el colaborador se de cuenta.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">8.</span>
                  <span>Ayudele hasta que haga la labor correctamente.</span>
                </li>
              </ul>
            </section>

            {/* Paso 4 */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-primary text-white text-xs py-1 px-2 rounded-md">PASO 4</span>
                Comprobar resultados
              </h2>
              <ul className="space-y-3 text-slate-600 ml-2">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">9.</span>
                  <span>Animelo a realizar la labor teniendo en cuenta los puntos corregidos.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">10.</span>
                  <span>Pongalo a producir.</span>
                </li>
              </ul>
            </section>

            {/* Conclusion */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-lg font-bold text-primary italic">Asegúrese de haber ayudado al colaborador</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
