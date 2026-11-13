"use client";

import { useEffect, useState } from "react";
import Header from "@/components/opt-sistemica/Header";
import { supabase } from "@/lib/supabase";
import ReglasMedicionView from "@/components/sistema-produccion/ReglasMedicionView";

// Sistema de Producción → Reglas de Medición del Sistema (a quién aplica cada herramienta, metas y cálculo)
export default function ReglasMedicionPage() {
    const [userEmail, setUserEmail] = useState("");
    useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || "")); }, []);
    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans">
            <Header title="Reglas de Medición" subtitle="" compact={true} userEmail={userEmail} showLogout={false} />
            <main className="flex-1 w-full max-w-[1800px] mx-auto p-2 sm:p-3">
                <ReglasMedicionView />
            </main>
        </div>
    );
}
