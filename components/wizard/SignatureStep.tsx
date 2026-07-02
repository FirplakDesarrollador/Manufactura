"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, PenLine, BookOpen, TrendingUp, ShieldCheck, ShieldX, Trash2, BarChart2 } from "lucide-react";

// ─── Guía data con highlights ─────────────────────────────────────────────────
type GuiaItem = {
    num: number;
    text: string;
    highlight: boolean;
};
type GuiaPaso = {
    title: string;
    titleHighlight: boolean;
    items: GuiaItem[];
};

const GUIA_PASOS: GuiaPaso[] = [
    {
        title: "PASO 1: Preparese para observar",
        titleHighlight: false,
        items: [
            { num: 1, text: "Encuentre los resultados del desempeño (rendimiento y calidad)", highlight: false },
            { num: 2, text: "Prepare el formato HORA HORA", highlight: false },
            { num: 3, text: "Observe al colaborador, para definir desviaciones (6M Y 8 Desperdicios)", highlight: false },
        ],
    },
    {
        title: "PASO 2: Obtenga hechos",
        titleHighlight: false,
        items: [
            { num: 4, text: "Haga que el colaborador se sienta comodo (digale los resultados rendimiento y calidad)", highlight: false },
            { num: 5, text: "Reconozca el trabajo cuando este lo amerite; felicitelo si va mejor del minimo esperado. De lo contrario no le diga nada.", highlight: true },
        ],
    },
    {
        title: "PASO 3: Ayudelo a mejorar",
        titleHighlight: true,
        items: [
            { num: 6, text: "Ponga en causa al colaborador.", highlight: true },
            { num: 7, text: "Hagale caer en cuenta los puntos a mejorar. Preguntele hasta que el colaborador se de cuenta.", highlight: true },
            { num: 8, text: "Ayudele hasta que haga la labor correctamente.", highlight: true },
        ],
    },
    {
        title: "PASO 4: Comprobar resultados",
        titleHighlight: false,
        items: [
            { num: 9, text: "Animelo a realizar la labor teniendo en cuenta los puntos corregidos.", highlight: true },
            { num: 10, text: "Pongalo a producir.", highlight: false },
        ],
    },
];

// ─── Signature Canvas ─────────────────────────────────────────────────────────
function SignatureCanvas({ defaultValue, onSave }: { defaultValue?: string; onSave: (dataUrl: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [hasSignature, setHasSignature] = useState(!!defaultValue);
    const hasInitialized = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !defaultValue || hasInitialized.current) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.src = defaultValue;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            hasInitialized.current = true;
        };
    }, [defaultValue]);

    const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX;
        const clientY = e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        isDrawing.current = true;
        const touch = "touches" in e ? e.touches[0] : e as MouseEvent;
        lastPos.current = getPos(touch, canvas);
    }, []);

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !lastPos.current) return;

        const touch = "touches" in e ? e.touches[0] : e as MouseEvent;
        const currentPos = getPos(touch, canvas);

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPos.current = currentPos;
        setHasSignature(true);
    }, []);

    const endDraw = useCallback(() => {
        isDrawing.current = false;
        lastPos.current = null;
        const canvas = canvasRef.current;
        if (canvas && hasSignature) {
            onSave(canvas.toDataURL("image/png"));
        }
    }, [hasSignature, onSave]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener("mousedown", startDraw);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", endDraw);
        canvas.addEventListener("mouseleave", endDraw);
        canvas.addEventListener("touchstart", startDraw, { passive: false });
        canvas.addEventListener("touchmove", draw, { passive: false });
        canvas.addEventListener("touchend", endDraw);

        return () => {
            canvas.removeEventListener("mousedown", startDraw);
            canvas.removeEventListener("mousemove", draw);
            canvas.removeEventListener("mouseup", endDraw);
            canvas.removeEventListener("mouseleave", endDraw);
            canvas.removeEventListener("touchstart", startDraw);
            canvas.removeEventListener("touchmove", draw);
            canvas.removeEventListener("touchend", endDraw);
        };
    }, [startDraw, draw, endDraw]);

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSave("");
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
                <span className="text-sm text-slate-500 italic">Firma del colaborador observado</span>
                <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    onClick={clear}
                    className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 shadow-md rounded-xl"
                >
                    <Trash2 size={16} />
                    Borrar Firma
                </Button>
            </div>
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden group hover:border-primary/50 transition-colors">
                <canvas
                    ref={canvasRef}
                    width={900}
                    height={220}
                    className="w-full touch-none cursor-crosshair"
                    style={{ display: "block" }}
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-2">
                        <PenLine size={28} className="opacity-40" />
                        <span className="text-sm font-medium opacity-60">Firme aquí con su dedo o cursor</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Results Mini-card ────────────────────────────────────────────────────────
function KpiBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
    );
}

function ResultsSummary() {
    const { evaluacionActual } = useStore();
    if (!evaluacionActual) return null;

    const { rendimiento, calidad, hdtCumple, desperdicios, operario, puesto, planta, linea } = evaluacionActual;

    const getStatus = (val: number) => {
        if (val >= 90) return { label: "CUMPLE", bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500" };
        if (val >= 80) return { label: "ATENCIÓN", bg: "bg-amber-400", text: "text-amber-700", light: "bg-amber-50 border-amber-200", bar: "bg-amber-400" };
        return { label: "EN PROCESO", bg: "bg-slate-500", text: "text-slate-700", light: "bg-slate-50 border-slate-200", bar: "bg-slate-400" };
    };

    const rSt = getStatus(rendimiento);
    const qSt = getStatus(calidad);

    const globalOk = rendimiento >= 90 && calidad >= 90 && hdtCumple;
    const globalWarn = !globalOk && rendimiento >= 80 && calidad >= 80;

    return (
        <Card className="shadow-xl border-0 overflow-hidden">
            {/* Header banner */}
            <div className={`px-6 py-5 ${
                globalOk ? "bg-emerald-600" : globalWarn ? "bg-amber-500" : "bg-primary"
            } text-white`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-0.5">Resultados de la evaluación</p>
                        <h2 className="text-2xl font-black tracking-tight">{operario}</h2>
                        <p className="text-sm opacity-80 mt-0.5">{puesto} · {linea} ({planta})</p>
                    </div>
                    {(globalOk || globalWarn) && (
                        <div className="px-4 py-2 rounded-xl font-black text-lg bg-white/20 backdrop-blur-sm border border-white/30">
                            {globalOk ? "✅ APROBADO" : "⚠️ ATENCIÓN"}
                        </div>
                    )}
                </div>
            </div>

            <CardContent className="p-6 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Rendimiento */}
                    <div className={`rounded-2xl border-2 p-4 ${rSt.light}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp size={13} /> Rendimiento
                            </span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${rSt.bg}`}>{rSt.label}</span>
                        </div>
                        <p className={`text-4xl font-black tabular-nums mt-1 ${rSt.text}`}>{rendimiento.toFixed(1)}%</p>
                        <div className="mt-3">
                            <KpiBar value={rendimiento} color={rSt.bar} />
                        </div>
                    </div>

                    {/* Calidad */}
                    <div className={`rounded-2xl border-2 p-4 ${qSt.light}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <BarChart2 size={13} /> Calidad
                            </span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${qSt.bg}`}>{qSt.label}</span>
                        </div>
                        <p className={`text-4xl font-black tabular-nums mt-1 ${qSt.text}`}>{calidad.toFixed(1)}%</p>
                        <div className="mt-3">
                            <KpiBar value={calidad} color={qSt.bar} />
                        </div>
                    </div>
                </div>

                {/* HDT Row */}
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${hdtCumple ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                        {hdtCumple
                            ? <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                            : <ShieldX size={24} className="text-slate-400 shrink-0" />
                        }
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Desglose de Trabajo (HDT)</p>
                            <p className={`font-black text-base ${hdtCumple ? "text-emerald-700" : "text-slate-600"}`}>
                                {hdtCumple ? "Cumple el estándar" : "En proceso de mejora"}
                            </p>
                        </div>
                    </div>
                    <span className={`text-2xl font-black ${hdtCumple ? "text-emerald-600" : "text-slate-400"}`}>
                        {hdtCumple ? "✓" : "○"}
                    </span>
                </div>

                {/* Desperdicios */}
                {desperdicios.length > 0 && (
                    <div className="p-4 rounded-xl border-2 bg-purple-50 border-purple-200">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                            <Trash2 size={13} /> Desperdicios identificados ({desperdicios.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {desperdicios.map(w => (
                                <span key={w} className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
                                    {w}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-xs text-center text-slate-400 italic">
                    Al firmar, el colaborador confirma que recibió retroalimentación sobre estos resultados.
                </p>
            </CardContent>
        </Card>
    );
}

// ─── Main Step ─────────────────────────────────────────────────────────────────
export default function SignatureStep() {
    const { evaluacionActual, actualizarEvaluacion } = useStore();

    const handleSignatureSave = (dataUrl: string) => {
        actualizarEvaluacion({ firmaOperario: dataUrl });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">

            {/* ─── Guía Recordatorio ──────────────────────────────────────────── */}
            <Card className="shadow-lg border-t-4 border-t-amber-400">
                <CardHeader>
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                        <BookOpen size={22} className="text-amber-500" />
                        Recordatorio: Guía Hora Hora
                    </CardTitle>
                    <CardDescription>
                        Repase estos pasos antes de solicitar la firma del colaborador.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-5">
                        {GUIA_PASOS.map((paso) => (
                            <section key={paso.title}>
                                <h3
                                    className={`font-bold text-base mb-2 px-1 rounded ${
                                        paso.titleHighlight
                                            ? "bg-yellow-300 text-slate-900 inline-block px-2 py-0.5"
                                            : "text-slate-800"
                                    }`}
                                >
                                    {paso.title}
                                </h3>
                                <ul className="space-y-2 ml-2">
                                    {paso.items.map((item) => (
                                        <li key={item.num} className="flex gap-2 text-sm">
                                            <span className="font-bold text-primary shrink-0">{item.num}.</span>
                                            <span
                                                className={`leading-snug rounded ${
                                                    item.highlight
                                                        ? "bg-yellow-200 text-slate-900 px-1.5 py-0.5 font-medium"
                                                        : "text-slate-600"
                                                }`}
                                            >
                                                {item.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}

                        <div className="pt-3 border-t border-slate-100 text-center">
                            <p className="text-sm font-bold text-primary italic">
                                Asegúrese de haber ayudado al colaborador
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Resumen de Resultados ───────────────────────────────────────── */}
            <ResultsSummary />

            {/* ─── Firma ──────────────────────────────────────────────────────── */}
            <Card className="shadow-lg border-t-4 border-t-primary mb-24 md:mb-32">
                <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
                    <div>
                        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                            <PenLine size={22} className="text-primary" />
                            Firma del Colaborador
                        </CardTitle>
                        <CardDescription>
                            Una vez realizada la retroalimentación, el colaborador debe firmar a continuación.
                        </CardDescription>
                    </div>
                    {evaluacionActual?.firmaOperario ? (
                        <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                            Firma Registrada
                        </span>
                    ) : (
                        <span className="inline-flex items-center bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 shadow-sm animate-pulse">
                            Firma Pendiente
                        </span>
                    )}
                </CardHeader>
                <CardContent>
                    <SignatureCanvas defaultValue={evaluacionActual?.firmaOperario} onSave={handleSignatureSave} />
                </CardContent>
            </Card>
        </div>
    );
}
