"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

export default function HDTStep() {
    const { evaluacionActual, actualizarEvaluacion } = useStore();

    const handleCumple = (cumple: boolean) => {
        actualizarEvaluacion({ hdtCumple: cumple });
        if (cumple) {
            actualizarEvaluacion({ hdtComentario: "" });
        }
    };

    const handleChangeComentario = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        actualizarEvaluacion({ hdtComentario: e.target.value });
    };

    const cumple = evaluacionActual?.hdtCumple;
    const comentario = evaluacionActual?.hdtComentario || "";

    return (
        <Card className="shadow-lg border-t-4 border-t-emerald-600 animate-in slide-in-from-right fade-in duration-500">
            <CardHeader>
                <CardTitle className="text-2xl text-slate-800">Cumplimiento HDT (Hoja de Trabajo)</CardTitle>
                <CardDescription>
                    Evalúe si el operario sigue el método establecido en el estándar.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8 flex flex-col items-center">

                    <div className="w-full max-w-2xl bg-slate-50 p-8 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center gap-6">
                        <h3 className="text-xl font-medium text-slate-700 text-center">
                            ¿Cumple con el desglose de trabajo?
                        </h3>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={() => handleCumple(true)}
                                className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-4 transition-all duration-300 shadow-md transform hover:scale-105 ${cumple === true
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-500/30 ring-4 ring-emerald-500/20"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
                                    }`}
                            >
                                <div className={`p-4 rounded-full ${cumple === true ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <Check size={48} strokeWidth={3} />
                                </div>
                                <span className="text-xl font-bold uppercase tracking-wider">Cumple</span>
                            </button>

                            <button
                                onClick={() => handleCumple(false)}
                                className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-4 transition-all duration-300 shadow-md transform hover:scale-105 ${cumple === false
                                        ? "border-rose-500 bg-rose-50 text-rose-700 shadow-rose-500/30 ring-4 ring-rose-500/20"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-rose-300"
                                    }`}
                            >
                                <div className={`p-4 rounded-full ${cumple === false ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <X size={48} strokeWidth={3} />
                                </div>
                                <span className="text-xl font-bold uppercase tracking-wider">No Cumple</span>
                            </button>
                        </div>
                    </div>

                    {cumple === false && (
                        <div className="w-full max-w-2xl bg-rose-50 p-6 rounded-xl border border-rose-200 animate-in slide-in-from-top-4 fade-in duration-300">
                            <Label htmlFor="hdtComentario" className="text-lg text-rose-800 font-bold mb-3 block">
                                Comentario Obligatorio <span className="text-rose-600">*</span>
                            </Label>
                            <Textarea
                                id="hdtComentario"
                                placeholder="Describa brevemente por qué no se cumple el HDT..."
                                className="min-h-32 text-base border-rose-300 focus-visible:ring-rose-500 resize-none shadow-inner"
                                value={comentario}
                                onChange={handleChangeComentario}
                                required
                            />
                            {!comentario.trim() && <p className="text-rose-600 text-sm mt-2 font-medium">Debe ingresar un comentario para continuar.</p>}
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );
}
