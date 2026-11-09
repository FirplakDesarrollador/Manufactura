'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Factory, Loader2, Plus } from 'lucide-react';
import Header from '@/components/opt-sistemica/Header';
import CarruselPestanas from '@/components/ui/CarruselPestanas';
import EsquemaPlanta from '@/components/esquema-personal/EsquemaPlanta';
import { supabase } from '@/lib/supabase';
import { Empleado, PlantaEsquema, cargarEmpleadosActivos, cargarPlantas, crearEstructura, puedeEditarEsquema } from '@/lib/esquema-personal';

// Esquema de personal: reúne los esquemas de las plantas. El personal activo viene de Talento Humano.
export default function EsquemaPersonalPage() {
    const router = useRouter();
    const [email, setEmail] = useState<string | undefined>();
    const [editor, setEditor] = useState(false);
    const [plantas, setPlantas] = useState<PlantaEsquema[]>([]);
    const [plantaId, setPlantaId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [errorEmpleados, setErrorEmpleados] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data?.user) { router.push('/login'); return; }
            setEmail(data.user.email || undefined);
            puedeEditarEsquema(data.user.email).then(setEditor);
        });
        cargarEmpleadosActivos().then(setEmpleados).catch(e => setErrorEmpleados(e?.message || 'No se pudo leer Talento Humano'));
    }, [router]);

    const leerPlantas = useCallback(async () => {
        try {
            const p = await cargarPlantas();
            setPlantas(p);
            setError(null);
            // La planta queda en la dirección (?planta=MS) para refrescar o compartir el enlace
            const codigo = new URLSearchParams(window.location.search).get('planta');
            setPlantaId(actual => actual ?? (p.find(x => x.codigo === codigo) || p[0])?.id ?? null);
        } catch (e) {
            setError((e as Error)?.message || 'No se pudieron cargar las plantas');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { leerPlantas(); }, [leerPlantas]);

    const elegir = (p: PlantaEsquema) => {
        setPlantaId(p.id);
        const url = new URL(window.location.href);
        url.searchParams.set('planta', p.codigo);
        window.history.replaceState(null, '', url.toString());
    };

    const nuevaPlanta = async () => {
        const nombre = prompt('Nombre de la planta (ej. Fibra de vidrio):')?.trim();
        if (!nombre) return;
        const codigo = prompt('Código corto (ej. FV):')?.trim().toUpperCase();
        if (!codigo) return;
        if (plantas.some(p => p.codigo === codigo)) { alert(`Ya existe una planta con el código ${codigo}.`); return; }
        const plantaTh = prompt('Planta(s) en Talento Humano para listar su personal, separadas por coma (ej. Fibra de vidrio). Puede dejarlo vacío:')?.trim() || null;
        try {
            const id = await crearEstructura(null, 'esquema_plantas', { codigo, nombre, planta_th: plantaTh, orden: plantas.length + 1 }, email);
            await leerPlantas();
            setPlantaId(id);
        } catch (e) {
            alert((e as Error)?.message || 'No se pudo crear la planta');
        }
    };

    const actual = plantas.find(p => p.id === plantaId) || null;

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col">
            <div className="print:hidden">
                <Header title="Esquema de Personal" subtitle="" compact={true} backUrl="/home" userEmail={email} showLogout={false} />
            </div>

            {/* Segundo nivel: plantas */}
            <div className="w-full bg-white border-b border-[#e2ded5] px-4 shadow-2xs h-10 flex items-center sticky top-12 z-40 print:hidden">
                <CarruselPestanas className="max-w-[1800px] mx-auto">
                    {plantas.map(p => (
                        <button key={p.id} onClick={() => elegir(p)} title={p.nombre}
                            className={`flex items-center gap-1.5 h-7 px-3 font-bold text-[11px] sm:text-xs rounded-lg transition duration-200 whitespace-nowrap shrink-0 ${p.id === plantaId ? 'bg-[#324354] text-white' : 'text-[#324354] hover:bg-slate-100'}`}>
                            <Factory className="w-3.5 h-3.5" /> {p.codigo}
                        </button>
                    ))}
                    {editor && !error && (
                        <button onClick={nuevaPlanta} className="flex items-center gap-1 h-7 px-3 font-bold text-[11px] sm:text-xs rounded-lg text-slate-500 hover:bg-slate-100 border border-dashed border-slate-300 whitespace-nowrap shrink-0">
                            <Plus className="w-3.5 h-3.5" /> Planta
                        </button>
                    )}
                </CarruselPestanas>
            </div>

            <main className="flex-1">
                {cargando ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : error ? (
                    <p className="m-4 max-w-3xl mx-auto text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</p>
                ) : actual ? (
                    <EsquemaPlanta key={actual.id} planta={actual} editor={editor} email={email} empleados={empleados} errorEmpleados={errorEmpleados} onPlantaCambio={leerPlantas} />
                ) : (
                    <p className="m-8 text-center text-sm text-slate-500">Aún no hay plantas en el esquema.{editor ? ' Cree la primera con “+ Planta”.' : ''}</p>
                )}
            </main>
        </div>
    );
}
