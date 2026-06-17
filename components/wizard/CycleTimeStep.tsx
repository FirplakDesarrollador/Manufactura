"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, Pause, Plus, Trash2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CycleTimeStep() {
    const { evaluacionActual, agregarCiclo, marcarCicloInvalido } = useStore();

    // Stopwatch State
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0); // in ms

    // Manual State
    const [manualTime, setManualTime] = useState("");

    // Common UI State
    const ciclos = evaluacionActual?.ciclos || [];
    const validos = ciclos.filter(c => c.valido).length;
    const invalidos = ciclos.length - validos;

    const minTime = validos > 0 ? Math.min(...ciclos.filter(c => c.valido).map(c => c.duracion)) : 0;
    const maxTime = validos > 0 ? Math.max(...ciclos.filter(c => c.valido).map(c => c.duracion)) : 0;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning && startTime) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isRunning, startTime]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        const ds = Math.floor((ms % 1000) / 100).toString(); // deciseconds
        return `${m}:${s}.${ds}`;
    };

    const startStopwatch = () => {
        setIsRunning(true);
        setStartTime(Date.now() - elapsedTime);
    };

    const pauseStopwatch = () => {
        setIsRunning(false);
    };

    const stopStopwatch = () => {
        setIsRunning(false);
        setStartTime(null);
        setElapsedTime(0);
    };

    const recordCycleFromStopwatch = () => {
        if (!isRunning || !startTime) return;

        const now = Date.now();
        const durationSecs = Number(((now - startTime) / 1000).toFixed(1));

        agregarCiclo({
            id: crypto.randomUUID(),
            numero: ciclos.length + 1,
            timestampInicio: startTime,
            timestampFin: now,
            duracion: durationSecs,
            valido: true
        });

        // Reset for next lap automatically
        setStartTime(now);
        setElapsedTime(0);
        toast.success(`Ciclo ${ciclos.length + 1} registrado: ${durationSecs}s`);
    };

    const addManualCycle = () => {
        const time = parseFloat(manualTime);
        if (isNaN(time) || time <= 0) {
            toast.error("Ingrese un tiempo válido mayor a 0.");
            return;
        }

        const now = Date.now();
        agregarCiclo({
            id: crypto.randomUUID(),
            numero: ciclos.length + 1,
            timestampInicio: now - (time * 1000),
            timestampFin: now,
            duracion: time,
            valido: true
        });

        setManualTime("");
        toast.success(`Ciclo ${ciclos.length + 1} registrado manualmente: ${time}s`);
    };

    const invalidateCycle = (id: string) => {
        const reason = prompt("Razón de invalidación (Material, Máquina, Método, Mano de obra, Espera, Otro):");
        if (reason) {
            marcarCicloInvalido(id, reason);
            toast.info("Ciclo marcado como inválido.");
        }
    };

    const getRendimientoColor = (r: number) => {
        if (r >= 90) return "text-emerald-500";
        if (r >= 80) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">

            {/* Live KPI Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <Card className="shadow-md bg-white border-l-4 border-l-blue-500">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Ciclos Válidos</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-extrabold ${validos >= 10 ? 'text-emerald-600' : 'text-slate-700'}`}>{validos}</span>
                            <span className="text-xs text-slate-400">/ 10 mín.</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md bg-white border-l-4 border-l-purple-500">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">T. Promedio</span>
                        <span className="text-3xl font-extrabold text-slate-700">
                            {evaluacionActual?.tiempoPromedio?.toFixed(1) || "0.0"} <span className="text-base font-normal text-slate-400">s</span>
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-md bg-white border-l-4 border-l-orange-500">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Piezas Reales</span>
                        <span className="text-3xl font-extrabold text-slate-700">{validos}</span>
                    </CardContent>
                </Card>

                <Card className="shadow-md bg-white border-l-4 border-l-emerald-500">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Rendimiento</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-4xl font-extrabold ${getRendimientoColor(evaluacionActual?.rendimiento || 0)}`}>
                                {evaluacionActual?.rendimiento?.toFixed(1) || "0.0"}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

            </div>

            <Card className="shadow-lg border-0 overflow-hidden ring-1 ring-slate-200">
                <Tabs defaultValue="cronometro" className="w-full">
                    <div className="bg-slate-100 p-2 rounded-t-xl hidden md:block">
                        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12">
                            <TabsTrigger value="cronometro" className="text-base font-medium">Cronómetro Operativo</TabsTrigger>
                            <TabsTrigger value="manual" className="text-base font-medium">Registro Manual</TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="md:hidden bg-slate-100 p-2">
                        <TabsList className="grid w-full grid-cols-2 h-10">
                            <TabsTrigger value="cronometro">Cronómetro</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>
                    </div>

                    <CardContent className="p-6 md:p-10">

                        <TabsContent value="cronometro" className="flex flex-col items-center space-y-10 py-6 focus-visible:outline-none">

                            <div className="relative flex justify-center items-center w-64 h-64 md:w-80 md:h-80 rounded-full bg-slate-50 shadow-inner ring-4 ring-slate-100 border-8 border-slate-200">
                                <div className={`font-mono text-5xl md:text-7xl tracking-tighter tabular-nums ${isRunning ? 'text-blue-600' : 'text-slate-800'}`}>
                                    {formatTime(elapsedTime)}
                                </div>
                                {isRunning && (
                                    <div className="absolute top-8 text-blue-500 flex items-center gap-2 animate-pulse">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div> Registrando
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col w-full max-w-md space-y-4">

                                {!isRunning && elapsedTime === 0 ? (
                                    <Button size="lg" className="w-full h-20 text-2xl font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 hover:scale-105 transition-all shadow-xl shadow-emerald-500/20" onClick={startStopwatch}>
                                        <Play className="mr-3" size={32} fill="currentColor" /> Iniciar Medición
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {!isRunning ? (
                                            <Button size="lg" className="h-20 text-xl font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20" onClick={startStopwatch}>
                                                <Play className="mr-2" size={24} fill="currentColor" /> Reanudar
                                            </Button>
                                        ) : (
                                            <Button size="lg" className="h-20 text-xl font-bold rounded-2xl bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20 text-white" onClick={pauseStopwatch}>
                                                <Pause className="mr-2" size={24} fill="currentColor" /> Pausar
                                            </Button>
                                        )}

                                        <Button size="lg" className="h-20 text-xl font-bold rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-500/20 text-white" onClick={stopStopwatch}>
                                            <Square className="mr-2" size={24} fill="currentColor" /> Finalizar
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    size="lg"
                                    disabled={!isRunning}
                                    className="w-full h-24 text-3xl font-extrabold rounded-2xl bg-slate-900 text-white hover:bg-black shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                    onClick={recordCycleFromStopwatch}
                                >
                                    <Plus className="mr-3 text-emerald-400" size={40} strokeWidth={3} /> CICLO
                                </Button>

                                <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 flex gap-3 text-sm">
                                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                    <p>Se deben registrar mínimo <strong>10 ciclos</strong> de trabajo para avanzar en el Hora-Hora. Los tiempos se pueden tomar con el cronómetro o digitarlos manualmente.</p>
                                </div>

                            </div>

                        </TabsContent>

                        <TabsContent value="manual" className="focus-visible:outline-none">
                            <div className="max-w-md mx-auto py-8 flex flex-col gap-6">
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 flex gap-3 text-sm">
                                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                    <p>En este modo ingresas la duración total en segundos de cada ciclo utilizando un cronómetro externo.</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-lg">Tiempo del Ciclo (segundos)</Label>
                                    <div className="flex gap-4">
                                        <Input
                                            type="number"
                                            min="1"
                                            step="0.1"
                                            placeholder="Ej. 45"
                                            className="text-2xl h-16 px-6 shadow-inner focus-visible:ring-blue-500"
                                            value={manualTime}
                                            onChange={(e) => setManualTime(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addManualCycle()}
                                        />
                                        <Button size="icon" className="h-16 w-16 bg-blue-600 hover:bg-blue-700 shrink-0 rounded-xl shadow-md" onClick={addManualCycle}>
                                            <Plus size={32} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                    </CardContent>
                </Tabs>
            </Card>

            {/* Cycle List */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2"><Clock className="text-blue-500" /> Registro de Ciclos</CardTitle>
                        <CardDescription>Detalle de los tiempos capturados</CardDescription>
                    </div>
                    {validos > 0 && (
                        <div className="text-xs font-mono bg-white px-3 py-1 rounded-full border text-slate-500 shadow-sm">
                            Min: <span className="text-emerald-600 font-bold">{minTime.toFixed(1)}s</span> | Max: <span className="text-rose-600 font-bold">{maxTime.toFixed(1)}s</span>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {ciclos.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p>No hay ciclos medidos.</p>
                            <p className="text-sm mt-1">Registe al menos 10 para continuar.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left font-medium text-slate-600">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-lg">Ciclo</th>
                                        <th className="px-6 py-4">Duración</th>
                                        <th className="px-6 py-4">Estado / Causa</th>
                                        <th className="px-6 py-4 text-right rounded-tr-lg">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {[...ciclos].reverse().map((c) => (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!c.valido ? 'bg-rose-50/50 hover:bg-rose-50/50 opacity-80' : ''}`}>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-800">#{c.numero}</td>
                                            <td className="px-6 py-4 font-mono text-lg">{c.duracion.toFixed(1)} s</td>
                                            <td className="px-6 py-4">
                                                {c.valido ? (
                                                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Válido</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">{c.causaInvalido || "Inválido"}</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {c.valido && (
                                                    <Button variant="ghost" size="sm" onClick={() => invalidateCycle(c.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-100">
                                                        <XCircle size={18} className="mr-1" /> Invalidar
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
