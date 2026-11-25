"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, AlertCircle, RotateCcw, Loader2 } from "lucide-react";

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
    const [userEmail, setUserEmail] = useState("");
    // El borrador (evaluación, paso y cronómetro) se recupera del equipo antes de mostrar el formulario
    const [listo, setListo] = useState(false);
    const [recuperado, setRecuperado] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
    const router = useRouter();
    const { evaluacionActual, guardarEvaluacion, reset, paso: currentStep, setPaso } = useStore();

    useEffect(() => {
        // Libera espacio del equipo (copias viejas ya subidas) para que el borrador se pueda guardar
        import("@/lib/db/horaHora").then(m => m.limpiarCopiasSubidas()).catch(() => 0);
        Promise.resolve(useStore.persist.rehydrate()).finally(() => {
            const s = useStore.getState();
            if (s.evaluacionActual) setRecuperado(true);
            else if (s.paso !== 0) s.setPaso(0);
            setListo(true);
        });
    }, []);

    // Fetch user session email
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserEmail(data.user.email || "");
            }
        });
    }, []);

    // Cada paso empieza arriba (antes quedaba en la posición del paso anterior y había que devolverse)
    useEffect(() => {
        if (listo) window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentStep, listo]);

    // Mientras se guarda, avisar si intentan cerrar o recargar
    useEffect(() => {
        if (!guardando) return;
        const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", aviso);
        return () => window.removeEventListener("beforeunload", aviso);
    }, [guardando]);

    const handleNext = () => {
        // Step 0 validation is handled internally by BasicInfoStep
        if (currentStep === 1) {
            const planta = evaluacionActual?.planta || "";
            // Ciclos largos (FV, RTM y moldes) y CALID (opcional, desde 1 sin tope): basta 1 ciclo; las demás plantas piden 10
            const esCicloReducido = ["FV", "RTM", "RMOLD", "MOLD", "CALID"].includes(planta);
            const minCiclos = esCicloReducido ? 1 : 10;
            if (!evaluacionActual?.ciclos || evaluacionActual.ciclosTotales < minCiclos) {
                toast.error(`Debes registrar al menos ${minCiclos} ciclo${minCiclos > 1 ? "s" : ""} válido${minCiclos > 1 ? "s" : ""} para continuar.`);
                return;
            }
        }
        if (currentStep === 4) {
            if (!evaluacionActual?.comentarioGeneral || evaluacionActual.comentarioGeneral.trim() === "") {
                toast.error("Las observaciones son un campo obligatorio para todas las personas.");
                return;
            }
        }
        if (currentStep === 5) {
            if (!evaluacionActual?.compromiso || evaluacionActual.compromiso.trim() === "") {
                toast.error("El comentario de compromiso / retroalimentación es un campo obligatorio.");
                return;
            }
            if (!evaluacionActual?.firmaOperario) {
                toast.error("Debe registrar la firma del colaborador antes de continuar.");
                return;
            }
        }
        setPaso(Math.min(currentStep + 1, STEPS.length - 1));
    };

    const handlePrev = () => {
        setPaso(Math.max(currentStep - 1, 0));
    };

    const handleSave = async () => {
        if (guardando) return; // evita doble clic = registro doble
        setGuardando(true);
        setErrorGuardado(null);
        const r = await guardarEvaluacion();
        setGuardando(false);
        if (r.ok) {
            reset(); // borra el borrador del equipo solo cuando la base confirmó
            toast.success(r.consecutivo ? `Evaluación N° ${r.consecutivo} guardada` : "Evaluación guardada");
            router.push("/hora-a-hora/historico");
        } else {
            setErrorGuardado(
                `No se pudo guardar en la base de datos: ${r.error}. ` +
                (r.copiaLocal
                    ? "La evaluación sigue aquí: revise el internet y vuelva a pulsar Guardar. También quedó una copia en este equipo (Historial → Subir)."
                    : "La evaluación sigue aquí: revise el internet y vuelva a pulsar Guardar; no cierre esta pantalla.")
            );
            toast.error("No se guardó la evaluación. Revise el aviso en rojo.");
        }
    };

    const descartar = () => {
        if (!confirm("¿Descartar el Hora a Hora en curso? Se perderá lo registrado y no se puede recuperar.")) return;
        reset();
        setRecuperado(false);
        setErrorGuardado(null);
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

            {/* Solo la barra de avance (el paso se ve en el título de cada tarjeta) */}
            <div className="w-full bg-white border-b border-slate-200 py-2 px-4 shadow-sm z-40">
                <div className="max-w-4xl mx-auto" title={`Paso ${currentStep + 1} de ${STEPS.length}: ${STEPS[currentStep].title}`}>
                    <Progress value={progress} className="h-2 w-full bg-slate-100" />
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl p-4 sm:p-6">
                {recuperado && evaluacionActual && (
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                        <RotateCcw size={16} className="shrink-0" />
                        <span className="flex-1 min-w-[200px]">
                            Se recuperó el Hora a Hora en curso{evaluacionActual.operario ? <> de <b>{evaluacionActual.operario}</b></> : null}
                            {evaluacionActual.planta ? <> ({evaluacionActual.planta})</> : null}. Continúe donde iba.
                        </span>
                        <button type="button" onClick={descartar} className="rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100">
                            Descartar y empezar uno nuevo
                        </button>
                    </div>
                )}
                {errorGuardado && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-[#d14747]">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{errorGuardado}</span>
                    </div>
                )}
                {!listo ? (
                    <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div key={currentStep} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentStep === 0 && <BasicInfoStep onNext={handleNext} />}
                        {currentStep === 1 && <CycleTimeStep />}
                        {currentStep === 2 && <QualityStep />}
                        {currentStep === 3 && <HDTStep />}
                        {currentStep === 4 && <WastesStep />}
                        {currentStep === 5 && <SignatureStep />}
                        {currentStep === 6 && <SummaryStep />}
                    </div>
                )}
                {/* Div espaciador físico para dejar espacio libre entre el contenido y el banner fijo de navegación */}
                {currentStep > 0 && <div className="h-36 w-full shrink-0" />}
            </main>

            {/* Bottom Action Bar for mobile / tablet friendliness */}
            {listo && currentStep > 0 && (
                <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 z-50">
                    <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
                        <Button variant="outline" size="lg" className="border-slate-300 text-slate-600 font-semibold" onClick={handlePrev} disabled={guardando}>
                            <ArrowLeft className="mr-2" size={18} /> <span className="hidden sm:inline">Anterior</span>
                        </Button>

                        {currentStep < STEPS.length - 1 ? (
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-md" onClick={handleNext}>
                                Siguiente <ArrowRight className="ml-2" size={18} />
                            </Button>
                        ) : (
                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md" onClick={handleSave} disabled={guardando}>
                                {guardando ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Save className="mr-2" size={18} />}
                                <span className="hidden sm:inline">{guardando ? "Guardando…" : "Guardar Evaluación"}</span>
                                <span className="sm:hidden">{guardando ? "Guardando…" : "Guardar"}</span>
                            </Button>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}
