"use client";

import { useEffect, useState } from "react";
import Header from "@/components/opt-sistemica/Header";
import { createClient } from "@/lib/supabase/client";
import CumplimientoSPDashboard from "@/components/sistema-produccion/CumplimientoSPDashboard";

// Estadísticas de Producción: cumplimiento del Sistema de Producción (como el Power BI "BI SFPK")
export default function EstadisticasSistemaProduccion() {
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        createClient().auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ""));
    }, []);

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans">
            <Header title="Estadísticas de Producción" subtitle="" compact={true} userEmail={userEmail} showLogout={false} />
            <main className="flex-1 w-full max-w-[1800px] mx-auto p-2 sm:p-3">
                <CumplimientoSPDashboard />
            </main>
        </div>
    );
}
