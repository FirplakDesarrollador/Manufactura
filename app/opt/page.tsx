"use client";

import Link from 'next/link'
import Image from 'next/image'
import { FolderClock, CirclePlus, BarChart3, RotateCw, BookOpen, ArrowLeft, ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { createExternalClient } from "@/lib/supabase/external"

export default function OptMenuPage() {
  const [userName, setUserName] = useState("");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const email = data.user.email || "";
        let name = "";

        // Try main DB first
        try {
          const { data: u1 } = await supabase
            .from('usuarios').select('nombre').eq('correo', email).single();
          if (u1?.nombre) name = u1.nombre;
        } catch { /* ignore */ }

        // Fallback: external DB
        if (!name) {
          try {
            const ext = createExternalClient();
            const { data: u2 } = await ext
              .from('usuarios').select('nombre').eq('correo', email).single();
            if (u2?.nombre) name = u2.nombre;
          } catch { /* ignore */ }
        }

        if (!name) name = email;

        setUserName(name);
        const parts = name.split(/[\s@]+/);
        if (parts.length >= 2) {
          setInitials((parts[0][0] + parts[1][0]).toUpperCase());
        } else if (name.length >= 2) {
          setInitials(name.substring(0, 2).toUpperCase());
        }
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative font-sans">
      {/* Header */}
      <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between shadow-sm">
        <Link href="/home">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors" title="Volver al menú principal">
            <ArrowLeft size={24} />
          </button>
        </Link>
        
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest mt-1">inspiring homes</div>
        </div>
        
        {/* User avatar + initials */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs font-semibold leading-tight truncate max-w-[140px]">{userName}</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold shrink-0">
            {initials || "?"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto p-6 pb-20">

        {/* Logo OPT Area */}
        <div className="flex justify-center mb-0">
          <Image
            src="/LOGO OPT.png"
            alt="OPT Logo"
            width={280}
            height={100}
            className="w-full max-w-[320px] h-auto object-contain"
            priority
          />
        </div>

        {/* Navigation Cards Section */}
        <div className="w-full flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-4 sm:gap-6 mt-4">
          
          {/* Histórico */}
          <Link
            href="/observations/opt"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <FolderClock size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Histórico</span>
          </Link>

          {/* Nuevo */}
          <Link
            href="/observations/opt/new"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <CirclePlus size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Nuevo</span>
          </Link>

          {/* Estadísticas */}
          <Link
            href="/observations/opt/statistics"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <BarChart3 size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Estadísticas</span>
          </Link>

          {/* Guía */}
          <Link
            href="/opt/guia"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <BookOpen size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Guía</span>
          </Link>

          {/* Criterios */}
          <Link
            href="/opt/criterios"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <ClipboardCheck size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-xs text-center leading-tight">Criterios Calificación</span>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex justify-between items-end p-8 text-[#254153]">
        <div className="w-10" /> {/* Symmetry spacer */}
        <button
          onClick={() => window.location.reload()}
          className="transition-all hover:rotate-180 duration-700 active:scale-90 text-[#254153]/80 hover:text-[#254153]"
          title="Refrescar página"
        >
          <RotateCw size={44} strokeWidth={2.5} />
        </button>
      </footer>
    </div>
  )
}

