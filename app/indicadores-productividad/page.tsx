"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Home, Settings, Construction, Hammer, Clock } from "lucide-react";

export default function IndicadoresProductividadPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            {/* Header */}
            <header className="w-full bg-[#254153] text-white shadow-md p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white font-bold text-sm transition">
                            <ArrowLeft size={18} />
                            <span>Volver al Home</span>
                        </button>
                    </Link>
                    <h1 className="font-bold text-lg md:text-xl uppercase tracking-wider text-center">
                        Indicadores de Productividad
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl tracking-wider leading-none">FIRPLAK</div>
                        <div className="text-[9px] opacity-70 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
                <div className="relative mb-8">
                    {/* Animated Outer Circles/Gears */}
                    <div className="absolute inset-0 bg-[#254153]/5 rounded-full blur-2xl animate-pulse"></div>
                    <div className="w-40 h-40 bg-[#254153]/10 border-2 border-dashed border-[#254153]/30 rounded-full flex items-center justify-center animate-spin duration-10000">
                        <Construction size={72} className="text-[#254153] animate-bounce" />
                    </div>
                    
                    <div className="absolute -top-1 -right-1 w-10 h-10 bg-[#749094]/10 border border-[#749094]/40 rounded-full flex items-center justify-center animate-spin duration-3000">
                        <Settings size={20} className="text-[#749094]" />
                    </div>
                    
                    <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center animate-bounce">
                        <Clock size={24} className="text-amber-500" />
                    </div>
                </div>

                <h2 className="text-4xl font-extrabold text-[#254153] tracking-tight sm:text-5xl mb-4">
                    Módulo en Construcción
                </h2>
                
                <p className="text-lg text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                    Estamos diseñando y programando los tableros de control de productividad de la planta de Firplak. Muy pronto podrás visualizar eficiencias por línea, tiempos muertos e indicadores globales.
                </p>

                {/* Progress bar simulation */}
                <div className="w-full max-w-sm bg-slate-200 h-2.5 rounded-full overflow-hidden mb-10 shadow-inner">
                    <div className="bg-[#254153] h-full rounded-full w-2/3 animate-pulse"></div>
                </div>

                <div className="flex gap-4">
                    <Link href="/">
                        <button className="px-6 py-3 bg-[#254153] hover:bg-[#1c3241] text-white font-bold rounded-xl shadow-lg transition duration-200">
                            Volver al Inicio
                        </button>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm border-t border-slate-100 bg-white">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    );
}
