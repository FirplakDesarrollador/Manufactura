"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OptSistemicaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        router.push('/opt-sistemica/nueva-opt');
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center font-sans">
      <div className="text-[#324354] text-xl font-semibold">Cargando...</div>
    </div>
  );
}
