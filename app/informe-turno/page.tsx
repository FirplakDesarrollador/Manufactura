'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hammer, Factory } from 'lucide-react';
import Header from '@/components/opt-sistemica/Header';
import CarruselPestanas from '@/components/ui/CarruselPestanas';
import FormularioRmold from '@/components/informe-turno/FormularioRmold';
import { supabase } from '@/lib/supabase';

// Plantas del Informe de Turno. Reparación de Moldes es la primera; las de producción vendrán después.
type PlantaInforme = 'RMOLD' | 'MS' | 'FV' | 'MBL' | 'CEFI' | 'QZ';
const PLANTAS: { id: PlantaInforme; label: string; nombre: string; activa: boolean }[] = [
    { id: 'RMOLD', label: 'RMOLD', nombre: 'Reparación de Moldes', activa: true },
    { id: 'MS', label: 'MS', nombre: 'Mármol Sintético', activa: false },
    { id: 'FV', label: 'FV', nombre: 'Fibra de Vidrio', activa: false },
    { id: 'MBL', label: 'MBL', nombre: 'Muebles', activa: false },
    { id: 'CEFI', label: 'CEFI', nombre: 'CEFI', activa: false },
    { id: 'QZ', label: 'QZ', nombre: 'Cuarzo', activa: false }
];

export default function InformeTurnoPage() {
    const router = useRouter();
    const [email, setEmail] = useState<string | undefined>();
    const [planta, setPlanta] = useState<PlantaInforme>('RMOLD');

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data?.user) router.push('/login');
            else setEmail(data.user.email || undefined);
        });
        // La planta queda en la dirección (?planta=RMOLD) para refrescar o compartir el enlace
        const p = new URLSearchParams(window.location.search).get('planta') as PlantaInforme | null;
        if (p && PLANTAS.some(x => x.id === p && x.activa)) setPlanta(p);
    }, [router]);

    const elegir = (p: PlantaInforme) => {
        setPlanta(p);
        const url = new URL(window.location.href);
        url.searchParams.set('planta', p);
        window.history.replaceState(null, '', url.toString());
    };

    const actual = PLANTAS.find(p => p.id === planta)!;

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col">
            <Header title="Informe de Turno" subtitle="" compact={true} backUrl="/home" userEmail={email} showLogout={false} />

            {/* Segundo nivel: plantas */}
            <div className="w-full bg-white border-b border-[#e2ded5] px-4 shadow-2xs h-10 flex items-center sticky top-12 z-40">
                <CarruselPestanas className="max-w-[1800px] mx-auto">
                    {PLANTAS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => p.activa && elegir(p.id)}
                            disabled={!p.activa}
                            title={p.activa ? p.nombre : `${p.nombre}: próximamente`}
                            className={`flex items-center gap-1.5 h-7 px-3 font-bold text-[11px] sm:text-xs rounded-lg transition duration-200 whitespace-nowrap shrink-0 ${
                                planta === p.id
                                    ? 'bg-[#324354] text-white shadow-md'
                                    : p.activa ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer' : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {p.id === 'RMOLD' ? <Hammer size={14} /> : <Factory size={14} />}
                            <span>{p.label}</span>
                            {!p.activa && <span className="text-[9px] font-bold">· pronto</span>}
                        </button>
                    ))}
                </CarruselPestanas>
            </div>

            <main className="flex-1 w-full max-w-[1500px] mx-auto p-2 sm:p-4 pb-8 animate-in fade-in duration-300">
                {actual.id === 'RMOLD' && <FormularioRmold />}
            </main>
        </div>
    );
}
