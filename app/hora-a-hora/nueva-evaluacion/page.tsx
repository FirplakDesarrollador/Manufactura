"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Play, Square, Pause, AlertCircle } from "lucide-react";

// Wizard Steps
import BasicInfoStep from "@/components/wizard/BasicInfoStep";
import CycleTimeStep from "@/components/wizard/CycleTimeStep";
import QualityStep from "@/components/wizard/QualityStep";
import HDTStep from "@/components/wizard/HDTStep";
import WastesStep from "@/components/wizard/WastesStep";
import SignatureStep from "@/components/wizard/SignatureStep";
import SummaryStep from "@/components/wizard/SummaryStep";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // we installed sonner

const STEPS = [
    { id: 0, title: "Generales" },
    { id: 1, title: "Tiempos" },
    { id: 2, title: "Calidad" },
    { id: 3, title: "HDT" },
    { id: 4, title: "Desperdicios" },
    { id: 5, title: "Firma" },
    { id: 6, title: "Resumen" },
];

export default function NuevaEvaluacion() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();
    const { evaluacionActual, cerrarEvaluacion, reset } = useStore();

    // Reset store when entering a new evaluation
    useEffect(() => {
        reset();
    }, [reset]);

    const handleNext = () => {
        // Step 0 validation is handled internally by BasicInfoStep
        if (currentStep === 1) {
            if (!evaluacionActual?.ciclos || evaluacionActual.ciclosTotales < 10) {
                toast.error("Debes registrar al menos 10 ciclos válidos para continuar.");
                return;
            }
        }
        if (currentStep === 5) {
            if (!evaluacionActual?.firmaOperario) {
                toast.error("Debe registrar la firma del colaborador antes de continuar.");
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const handlePrev = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleSave = () => {
        cerrarEvaluacion();
        toast.success("Evaluación guardada exitosamente");
        router.push("/hora-a-hora/historico");
    };

    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center">
            {/* Top Navbar */}
            <header className="w-full bg-[#254153] text-white shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white" onClick={() => router.push("/hora-a-hora")}>
                        <ArrowLeft size={20} />
                        <span className="font-bold text-base md:text-lg">Nueva Evaluación</span>
                    </Button>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl md:text-2xl tracking-widest leading-none">FIRPLAK</div>
                        <div className="text-[8px] md:text-[10px] opacity-80 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Progress Bar Area */}
            <div className="w-full bg-white border-b border-slate-200 py-3 px-4 shadow-sm z-40">
                <div className="max-w-4xl mx-auto flex flex-col items-center">
                    <div className="text-sm md:text-base font-bold text-primary mb-2 text-center uppercase tracking-wide">
                        Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
                    </div>
                    <Progress value={progress} className="h-2 w-full bg-slate-100" />
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl p-4 sm:p-6 pb-40">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {currentStep === 0 && <BasicInfoStep onNext={handleNext} />}
                    {currentStep === 1 && <CycleTimeStep />}
                    {currentStep === 2 && <QualityStep />}
                    {currentStep === 3 && <HDTStep />}
                    {currentStep === 4 && <WastesStep />}
                    {currentStep === 5 && <SignatureStep />}
                    {currentStep === 6 && <SummaryStep />}
                </div>
            </main>

            {/* Bottom Action Bar for mobile / tablet friendliness */}
            {currentStep > 0 && (
                <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 z-50">
                    <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
                        <Button variant="outline" size="lg" className="border-slate-300 text-slate-600 font-semibold" onClick={handlePrev}>
                            <ArrowLeft className="mr-2" size={18} /> <span className="hidden sm:inline">Anterior</span>
                        </Button>

                        {currentStep < STEPS.length - 1 ? (
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-md" onClick={handleNext}>
                                Siguiente <ArrowRight className="ml-2" size={18} />
                            </Button>
                        ) : (
                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md" onClick={handleSave}>
                                <Save className="mr-2" size={18} /> <span className="hidden sm:inline">Guardar Evaluación</span>
                                <span className="sm:hidden">Guardar</span>
                            </Button>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}
