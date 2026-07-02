"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const LEAN_WASTES = [
    "Sobreproducción",
    "Espera / Ocio",
    "Transporte",
    "Sobreprocesamiento",
    "Inventario",
    "Movimiento Innecesario",
    "Defectos / Retrabajos",
    "Talento No Utilizado"
];

export default function WastesStep() {
    const { evaluacionActual, actualizarEvaluacion } = useStore();

    const handleToggle = (waste: string) => {
        const current = evaluacionActual?.desperdicios || [];
        if (current.includes(waste)) {
            actualizarEvaluacion({ desperdicios: current.filter(w => w !== waste) });
        } else {
            actualizarEvaluacion({ desperdicios: [...current, waste] });
        }
    };

    const handleChangeComentario = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        actualizarEvaluacion({ comentarioGeneral: e.target.value });
    };

    const selectedWastes = evaluacionActual?.desperdicios || [];
    const comentario = evaluacionActual?.comentarioGeneral || "";

    return (
        <Card className="shadow-lg border-t-4 border-t-purple-600 animate-in slide-in-from-right fade-in duration-500">
            <CardHeader>
                <CardTitle className="text-2xl text-slate-800">Identificación de Desperdicios Lean</CardTitle>
                <CardDescription>
                    Seleccione los desperdicios que identificó durante la evaluación.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-700 mb-6 uppercase tracking-wider flex items-center justify-between">
                            <span>8 Desperdicios del Lean Manufacturing</span>
                            <span className="bg-purple-100 text-purple-700 py-1 px-3 text-sm rounded-full">{selectedWastes.length} seleccionados</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {LEAN_WASTES.map((waste) => {
                                const checked = selectedWastes.includes(waste);
                                return (
                                    <div
                                        key={waste}
                                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${checked
                                                ? "border-purple-500 bg-purple-50 shadow-md transform sm:hover:scale-105"
                                                : "border-slate-200 bg-white hover:border-purple-200 hover:bg-slate-50"
                                            }`}
                                        onClick={() => handleToggle(waste)}
                                    >
                                        <Checkbox id={`waste-${waste}`} checked={checked} onCheckedChange={() => handleToggle(waste)} className="w-6 h-6 border-2 data-[state=checked]:bg-purple-600" />
                                        <Label
                                            htmlFor={`waste-${waste}`}
                                            className={`text-lg cursor-pointer flex-1 font-medium ${checked ? "text-purple-900" : "text-slate-600"}`}
                                        >
                                            {waste}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <Label htmlFor="comentario" className="text-lg text-slate-700 font-bold mb-3 block">
                            Comentarios Adicionales y Observaciones
                        </Label>
                        <Textarea
                            id="comentario"
                            placeholder="Describa oportunidades de mejora o cualquier observación importante encontrada durante la evaluación..."
                            className="min-h-32 text-base shadow-inner focus-visible:ring-purple-500 border-slate-300"
                            value={comentario}
                            onChange={handleChangeComentario}
                        />
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
