"use client";

import { useEffect, useState } from "react";
import { Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Header from "@/components/opt-sistemica/Header";

export default function FivesSPage() {
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

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
        title="5'S"
        subtitle="Módulo Operativo"
        backUrl="/sistema-produccion"
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 flex items-center justify-center pb-20">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_25px_rgba(50,67,84,0.04)] border border-[#e2ded5] p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="mx-auto w-20 h-20 bg-[#F6F3EE] border border-[#e2ded5] rounded-3xl flex items-center justify-center text-[#324354] shadow-sm">
            <Hammer className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Módulo en Construcción</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Estamos trabajando para traer el módulo de control y auditorías 5'S a la plataforma muy pronto.
            </p>
          </div>

          <button 
            onClick={() => router.push('/sistema-produccion')}
            className="w-full py-3 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
          >
            Volver al Menú Principal
          </button>
          
        </div>
      </main>
    </div>
  );
}
