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
import { toast } from "sonner";
import Header from "@/components/opt-sistemica/Header";
import { createClient } from "@/lib/supabase/client";
import SubHeader from "@/components/hora-a-hora/SubHeader";

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
    const [userEmail, setUserEmail] = useState("");
    const router = useRouter();
    const { evaluacionActual, cerrarEvaluacion, reset } = useStore();

    // Reset store when entering a new evaluation
    useEffect(() => {
        reset();
    }, [reset]);

    // Fetch user session email
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserEmail(data.user.email || "");
            }
        });
    }, []);

    const handleNext = () => {
        // Step 0 validation is handled internally by BasicInfoStep
        if (currentStep === 1) {
            const planta = evaluacionActual?.planta || "";
            const esCicloReducido = planta === "FV" || planta === "RTM";
            const minCiclos = esCicloReducido ? 1 : 10;
            if (!evaluacionActual?.ciclos || evaluacionActual.ciclosTotales < minCiclos) {
                toast.error(`Debes registrar al menos ${minCiclos} ciclo${minCiclos > 1 ? "s" : ""} válido${minCiclos > 1 ? "s" : ""} para continuar.`);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center font-sans text-[#000000] w-full">
            <Header 
                title="Hora a Hora"
                subtitle="Nueva Evaluación"
                userEmail={userEmail}
            />
            <SubHeader />

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
            <main className="flex-1 w-full max-w-5xl p-4 sm:p-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {currentStep === 0 && <BasicInfoStep onNext={handleNext} />}
                    {currentStep === 1 && <CycleTimeStep />}
                    {currentStep === 2 && <QualityStep />}
                    {currentStep === 3 && <HDTStep />}
                    {currentStep === 4 && <WastesStep />}
                    {currentStep === 5 && <SignatureStep />}
                    {currentStep === 6 && <SummaryStep />}
                </div>
                {/* Div espaciador físico para dejar espacio libre entre el contenido y el banner fijo de navegación */}
                {currentStep > 0 && <div className="h-36 w-full shrink-0" />}
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
