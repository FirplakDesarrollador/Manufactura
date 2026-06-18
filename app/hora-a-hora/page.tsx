"use client";

import Image from "next/image";
import Link from "next/link";
import { PlusCircle, BarChart2, FolderClock, RotateCw, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient } from "@/lib/supabase/external";
import { logout } from "@/app/hora-a-hora/login/actions";

export default function Home() {
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
    <div className="min-h-screen bg-white flex flex-col relative font-sans">
      {/* Header */}
      <header className="w-full bg-[#254153] text-white h-20 px-6 flex items-center justify-between">
        <div className="w-10"></div> {/* Spacer for centering */}
        
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest mt-1">inspiring homes</div>
        </div>
        
        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs font-semibold leading-tight truncate max-w-[140px]">{userName}</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold shrink-0">
            {initials || "?"}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-16">
          <div className="relative w-[200px] h-[200px] md:w-[250px] md:h-[250px]">
            <Image
              src="/LOGO_HORA-HORA.png"
              alt="Hora-Hora Logo"
              fill
              className="object-contain"
              style={{ mixBlendMode: 'multiply', filter: 'contrast(1.5) brightness(1.15)' }}
              priority
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 max-w-5xl">
          
          <Link href="/hora-a-hora/historico" className="group">
            <div className="w-36 h-36 md:w-48 md:h-48 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
              <FolderClock className="w-10 h-10 text-primary opacity-80" strokeWidth={1.5} />
              <span className="text-sm font-medium text-slate-600">Histórico</span>
            </div>
          </Link>

          <Link href="/hora-a-hora/nueva-evaluacion" className="group">
            <div className="w-36 h-36 md:w-48 md:h-48 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
              <PlusCircle className="w-10 h-10 text-primary opacity-80" strokeWidth={1.5} />
              <span className="text-sm font-medium text-slate-600">Nuevo</span>
            </div>
          </Link>

          <Link href="/hora-a-hora/estadisticas" className="group">
            <div className="w-36 h-36 md:w-48 md:h-48 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
              <BarChart2 className="w-10 h-10 text-primary opacity-80" strokeWidth={1.5} />
              <span className="text-sm font-medium text-slate-600">Estadísticas</span>
            </div>
          </Link>

          <Link href="/hora-a-hora/guia" className="group">
            <div className="w-36 h-36 md:w-48 md:h-48 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
              <BookOpen className="w-10 h-10 text-primary opacity-80" strokeWidth={1.5} />
              <span className="text-sm font-medium text-slate-600">Guía</span>
            </div>
          </Link>

        </div>
      </main>

      {/* Refresh Button */}
      <div className="absolute bottom-8 right-8">
        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full hover:bg-slate-100" onClick={() => window.location.reload()}>
          <RotateCw className="w-6 h-6 text-primary" />
        </Button>
      </div>

    </div>
  );
}
