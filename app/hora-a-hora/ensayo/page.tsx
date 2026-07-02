"use client";

import { ArrowLeft, FlaskConical, Hourglass } from "lucide-react";
import Link from "next/link";

export default function EnsayoPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/hora-a-hora" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest mt-1">inspiring homes</div>
        </div>
        
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex items-center justify-center pb-20">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden text-center p-8 md:p-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FlaskConical className="w-10 h-10 text-primary animate-pulse" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
            Módulo de Ensayo
          </h1>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
            <Hourglass className="w-3.5 h-3.5 animate-spin" />
            En Desarrollo
          </div>

          <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-8">
            Esta sección está siendo preparada para el registro y seguimiento de los ensayos de manufactura en planta. Muy pronto estará disponible con todas sus funciones.
          </p>

          <Link href="/hora-a-hora">
            <button className="px-6 py-3 bg-[#254153] hover:bg-[#1c3241] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg">
              Volver a Hora-Hora
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
