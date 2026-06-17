"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, User, Clock, CheckSquare, Trash2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient } from "@/lib/supabase/external";

export default function SummaryStep() {
    const { evaluacionActual } = useStore();
    const [currentUser, setCurrentUser] = useState<string>("");

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data }) => {
            if (data?.user) {
                const email = data.user.email || "";
                let nombre = "";

                // Try main DB
                try {
                    const { data: u1 } = await supabase
                        .from('usuarios').select('nombre').eq('correo', email).single();
                    if (u1?.nombre) nombre = u1.nombre;
                } catch { /* ignore */ }

                // Fallback: external
                if (!nombre) {
                    try {
                        const ext = createExternalClient();
                        const { data: u2 } = await ext
                            .from('usuarios').select('nombre').eq('correo', email).single();
                        if (u2?.nombre) nombre = u2.nombre;
                    } catch { /* ignore */ }
                }

                setCurrentUser(nombre || email);
            }
        });
    }, []);

    if (!evaluacionActual) return null;

    const getKPIProps = (val: number) => {
        if (val >= 90) return { icon: <CheckCircle2 size={40} className="text-emerald-500" />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (val >= 80) return { icon: <AlertTriangle size={40} className="text-amber-500" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
        return { icon: <XCircle size={40} className="text-rose-500" />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" };
    };

    const rProps = getKPIProps(evaluacionActual.rendimiento);
    const qProps = getKPIProps(evaluacionActual.calidad);

    return (
        <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">

            <div className="bg-slate-800 text-white rounded-2xl p-6 md:p-8 shadow-2xl">
                <h2 className="text-3xl font-black tracking-tight mb-2">Resumen Final</h2>
                <p className="text-slate-300 font-medium">Revisa los resultados antes de guardar la evaluación.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Basic Info Summary */}
                <Card className="shadow-lg border-t-4 border-t-slate-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><User className="text-slate-400" /> Información General</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                            <div>
                                <dt className="text-slate-500 font-semibold mb-1 uppercase text-xs tracking-wider">Línea / Proceso</dt>
                                <dd className="font-bold text-slate-800 text-base">{evaluacionActual.linea} ({evaluacionActual.planta})</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 font-semibold mb-1 uppercase text-xs tracking-wider">Operario</dt>
                                <dd className="font-bold text-slate-800 text-base">{evaluacionActual.operario}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 font-semibold mb-1 uppercase text-xs tracking-wider">Puesto</dt>
                                <dd className="font-bold text-slate-800 text-base">{evaluacionActual.puesto}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 font-semibold mb-1 uppercase text-xs tracking-wider">Hora Hora realizado por</dt>
                                <dd className="font-bold text-slate-800 text-base">{currentUser || evaluacionActual.supervisor || "—"}</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                {/* Global KPIs */}
                <div className="flex flex-col gap-6">
                    <div className={`p-6 rounded-2xl border-2 flex items-center justify-between shadow-md transition-all ${rProps.bg} ${rProps.border}`}>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-1">Rendimiento</p>
                            <p className={`text-4xl font-black tabular-nums ${rProps.color}`}>
                                {evaluacionActual.rendimiento.toFixed(1)}%
                            </p>
                        </div>
                        {rProps.icon}
                    </div>

                    <div className={`p-6 rounded-2xl border-2 flex items-center justify-between shadow-md transition-all ${qProps.bg} ${qProps.border}`}>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-1">Calidad</p>
                            <p className={`text-4xl font-black tabular-nums ${qProps.color}`}>
                                {evaluacionActual.calidad.toFixed(1)}%
                            </p>
                        </div>
                        {qProps.icon}
                    </div>
                </div>

                {/* Times Summary */}
                <Card className="shadow-md border-t-4 border-t-blue-500">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><Clock className="text-blue-500" /> Tiempos de Ciclo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-center bg-slate-50 p-4 rounded-xl flex-1 border border-slate-100">
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Teórico</span>
                                <span className="text-2xl font-black text-slate-700">{evaluacionActual.tiempoCicloTeorico}s</span>
                            </div>
                            <div className="mx-4 text-slate-300 font-bold">VS</div>
                            <div className="text-center bg-blue-50 p-4 rounded-xl flex-1 border border-blue-100">
                                <span className="block text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Prom. Real</span>
                                <span className="text-2xl font-black text-blue-700">{evaluacionActual.tiempoPromedio.toFixed(1)}s</span>
                            </div>
                        </div>
                        <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider">
                            {evaluacionActual.ciclosTotales} ciclos válidos medidos
                        </p>
                    </CardContent>
                </Card>

                {/* HDT & Wastes */}
                <Card className="shadow-md border-t-4 border-t-purple-500">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><CheckSquare className="text-purple-500" /> Evaluación Cualitativa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="border-b border-slate-100 pb-4">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Desglose de Trabajo (HDT)</span>
                            {evaluacionActual.hdtCumple ? (
                                <div className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-sm">
                                    <CheckCircle2 size={16} className="mr-2" /> CUMPLE
                                </div>
                            ) : (
                                <div>
                                    <div className="inline-flex items-center text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full text-sm mb-2">
                                        <XCircle size={16} className="mr-2" /> NO CUMPLE
                                    </div>
                                    <p className="text-sm bg-rose-50/50 p-3 rounded text-rose-800 border-l-2 border-rose-300 italic">
                                        "{evaluacionActual.hdtComentario}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Desperdicios Identificados ({evaluacionActual.desperdicios.length})
                            </span>
                            {evaluacionActual.desperdicios.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {evaluacionActual.desperdicios.map(w => (
                                        <Badge key={w} variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                                            {w}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-slate-500 italic">Ningún desperdicio registrado.</span>
                            )}
                        </div>

                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
