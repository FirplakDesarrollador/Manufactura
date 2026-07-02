"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

export default function QualityStep() {
    const { evaluacionActual, actualizarEvaluacion } = useStore();

    useEffect(() => {
        if (evaluacionActual && evaluacionActual.piezasTotalesCalidad === 0 && evaluacionActual.piezasReales > 0) {
            const defaultTotales = evaluacionActual.piezasReales;
            const buenas = evaluacionActual.piezasBuenas || 0;
            actualizarEvaluacion({
                piezasTotalesCalidad: defaultTotales,
                piezasDefectuosas: Math.max(0, defaultTotales - buenas),
                calidad: defaultTotales > 0 ? (buenas / defaultTotales) * 100 : 0
            });
        }
    }, [evaluacionActual, actualizarEvaluacion]);

    const handleTotalesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const totales = Number(e.target.value);
        const buenas = evaluacionActual?.piezasBuenas || 0;
        const defectuosas = Math.max(0, totales - buenas);
        const calidad = totales > 0 ? (buenas / totales) * 100 : 0;
        
        actualizarEvaluacion({ 
            piezasTotalesCalidad: totales,
            piezasDefectuosas: defectuosas,
            calidad: calidad
        });
    };

    const handleBuenasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const buenas = Number(e.target.value);
        const totales = evaluacionActual?.piezasTotalesCalidad || evaluacionActual?.piezasReales || 0;
        const defectuosas = Math.max(0, totales - buenas);
        const calidad = totales > 0 ? (buenas / totales) * 100 : 0;

        actualizarEvaluacion({ 
            piezasBuenas: buenas,
            piezasDefectuosas: defectuosas,
            calidad: calidad
        });
    };

    const totales = evaluacionActual?.piezasTotalesCalidad || evaluacionActual?.piezasReales || 0;
    const buenas = evaluacionActual?.piezasBuenas || 0;
    const defectuosas = evaluacionActual?.piezasDefectuosas || 0;
    const calidad = evaluacionActual?.calidad || 0;

    const getSemaforoProps = () => {
        if (calidad >= 90) return { icon: <CheckCircle2 size={32} className="text-emerald-500" />, color: "text-emerald-500" };
        if (calidad >= 80) return { icon: <AlertTriangle size={32} className="text-amber-500" />, color: "text-amber-500" };
        return { icon: <XCircle size={32} className="text-rose-500" />, color: "text-rose-500" };
    };

    const semaforo = getSemaforoProps();

    return (
        <Card className="shadow-lg border-t-4 border-t-blue-600 animate-in slide-in-from-right fade-in duration-500">
            <CardHeader>
                <CardTitle className="text-2xl text-slate-800">Evaluación de Calidad</CardTitle>
                <CardDescription>
                    Ingrese la cantidad de piezas revisadas y las piezas que cumplen con el estándar.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="totales" className="text-lg">Piezas Revisadas (Totales)</Label>
                            <Input
                                id="totales"
                                type="number"
                                min="0"
                                value={totales || ""}
                                onChange={handleTotalesChange}
                                className="text-2xl h-14 pl-4 font-mono shadow-inner border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="buenas" className="text-lg">Piezas Buenas (Conformes)</Label>
                            <Input
                                id="buenas"
                                type="number"
                                min="0"
                                max={totales}
                                value={buenas || ""}
                                onChange={handleBuenasChange}
                                className="text-2xl h-14 pl-4 font-mono shadow-inner border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <Label className="text-sm text-slate-500 font-medium">Piezas Defectuosas (Calculado Automáticamente)</Label>
                            <div className="text-3xl font-mono font-bold text-rose-600 mt-2 bg-rose-50 px-4 py-3 rounded-lg border border-rose-100 flex items-center justify-between">
                                <span>{defectuosas}</span>
                                <span className="text-sm font-medium opacity-60 uppercase text-rose-800 tracking-wider">Scrap</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-inner h-full">
                        <h3 className="text-xl font-bold text-slate-700 mb-6 uppercase tracking-wider">Índice de Calidad</h3>

                        <div className="relative w-48 h-48 flex items-center justify-center bg-white rounded-full shadow-lg ring-8 ring-slate-100 mb-8">
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-6xl font-black ${semaforo.color} tabular-nums`}>
                                    {calidad.toFixed(1)}
                                </span>
                                <span className="text-slate-400 font-bold">%</span>
                            </div>
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray="553"
                                    strokeDashoffset={553 - (553 * calidad) / 100}
                                    className={`${semaforo.color} transition-all duration-1000 ease-out`}
                                />
                            </svg>
                        </div>

                        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100">
                            {semaforo.icon}
                            <span className={`font-bold text-lg ${semaforo.color}`}>
                                {calidad >= 90 ? "ÓPTIMO" : calidad >= 80 ? "ALERTA" : "CRÍTICO"}
                            </span>
                        </div>

                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
