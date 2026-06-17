"use client";

import { useEffect, useState } from "react";
import { EvaluacionHoraHora } from "@/lib/store";
import { fetchEvaluaciones, updateEvaluacion, deleteEvaluacion } from "@/lib/db/horaHora";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Search, X, TrendingUp, BarChart2, ShieldCheck, ShieldX, Clock, Trash2, PenLine, Edit2, User, Save, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient } from "@/lib/supabase/external";

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, resolveUserName }: { item: EvaluacionHoraHora; onClose: () => void; resolveUserName: (v: string | undefined) => string }) {
    const getKPIStyle = (val: number) => {
        if (val >= 90) return { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", label: "CUMPLE", labelBg: "bg-emerald-500" };
        if (val >= 80) return { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-400", label: "ATENCIÓN", labelBg: "bg-amber-400" };
        return { color: "text-slate-700", bg: "bg-slate-50 border-slate-200", bar: "bg-slate-400", label: "EN PROCESO", labelBg: "bg-slate-500" };
    };
    const rSt = getKPIStyle(item.rendimiento);
    const qSt = getKPIStyle(item.calidad);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in zoom-in-95 fade-in duration-300">

                {/* Header */}
                <div className="bg-primary text-white px-6 py-5 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Detalle Hora Hora</p>
                            {item.consecutivo > 0 && (
                                <span className="bg-white/20 text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-white/30">
                                    #{item.consecutivo}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black">{item.operario}</h2>
                        <p className="text-sm opacity-80 mt-0.5">{item.puesto} · {item.linea} ({item.planta})</p>
                        <p className="text-xs opacity-60 mt-1">
                            {format(new Date(item.tiempoInicio), "dd/MM/yyyy HH:mm")}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors mt-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Realizado por */}
                    {item.creadoPor && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <User size={16} className="text-primary shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hora Hora realizado por</p>
                                <p className="text-sm font-bold text-slate-800">{resolveUserName(item.creadoPor)}</p>
                            </div>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`rounded-2xl border-2 p-4 ${rSt.bg}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp size={13} /> Rendimiento
                                </span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${rSt.labelBg}`}>{rSt.label}</span>
                            </div>
                            <p className={`text-4xl font-black tabular-nums mt-1 ${rSt.color}`}>{item.rendimiento.toFixed(1)}%</p>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                                <div className={`h-full rounded-full ${rSt.bar}`} style={{ width: `${Math.min(item.rendimiento, 100)}%` }} />
                            </div>
                        </div>
                        <div className={`rounded-2xl border-2 p-4 ${qSt.bg}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <BarChart2 size={13} /> Calidad
                                </span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${qSt.labelBg}`}>{qSt.label}</span>
                            </div>
                            <p className={`text-4xl font-black tabular-nums mt-1 ${qSt.color}`}>{item.calidad.toFixed(1)}%</p>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                                <div className={`h-full rounded-full ${qSt.bar}`} style={{ width: `${Math.min(item.calidad, 100)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Tiempos de ciclo */}
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Clock size={13} /> Tiempos de Ciclo
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Teórico</p>
                                <p className="text-2xl font-black text-slate-700">{item.tiempoCicloTeorico}s</p>
                            </div>
                            <div className="flex items-center justify-center text-slate-300 font-bold text-lg">VS</div>
                            <div>
                                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Prom. Real</p>
                                <p className="text-2xl font-black text-blue-700">{item.tiempoPromedio.toFixed(1)}s</p>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-500 font-semibold mt-3 uppercase tracking-wider">
                            {item.ciclosTotales} ciclos válidos · {item.piezasReales} piezas reales
                        </p>
                    </div>

                    {/* Calidad detalle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Detalle de Calidad</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold mb-1">Inspeccionadas</p>
                                <p className="text-2xl font-black text-slate-700">{item.piezasTotalesCalidad}</p>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-500 font-semibold mb-1">Buenas</p>
                                <p className="text-2xl font-black text-emerald-700">{item.piezasBuenas}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold mb-1">Defectos</p>
                                <p className="text-2xl font-black text-slate-600">{item.piezasDefectuosas}</p>
                            </div>
                        </div>
                    </div>

                    {/* HDT */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${item.hdtCumple ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                            {item.hdtCumple
                                ? <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
                                : <ShieldX size={22} className="text-slate-400 shrink-0" />
                            }
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Desglose de Trabajo (HDT)</p>
                                <p className={`font-black text-base ${item.hdtCumple ? "text-emerald-700" : "text-slate-600"}`}>
                                    {item.hdtCumple ? "Cumple el estándar" : "En proceso de mejora"}
                                </p>
                            </div>
                        </div>
                        <span className={`text-2xl font-black ${item.hdtCumple ? "text-emerald-600" : "text-slate-400"}`}>
                            {item.hdtCumple ? "✓" : "○"}
                        </span>
                    </div>

                    {/* Desperdicios */}
                    {item.desperdicios?.length > 0 && (
                        <div className="p-4 rounded-xl border-2 bg-purple-50 border-purple-200">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                <Trash2 size={13} /> Desperdicios identificados ({item.desperdicios.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {item.desperdicios.map(w => (
                                    <span key={w} className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">{w}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comentario */}
                    {item.comentarioGeneral && (
                        <div className="p-4 rounded-xl border border-slate-200 bg-white">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Comentarios y Observaciones</p>
                            <p className="text-sm text-slate-700 italic">"{item.comentarioGeneral}"</p>
                        </div>
                    )}

                    {/* Firma */}
                    {(item as any).firmaOperario && (
                        <div className="p-4 rounded-xl border border-slate-200 bg-white">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                                <PenLine size={13} /> Firma del Colaborador
                            </p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={(item as any).firmaOperario} alt="Firma del colaborador" className="border border-slate-100 rounded-lg w-full max-h-32 object-contain bg-slate-50" />
                        </div>
                    )}

                </div>

                <div className="px-6 pb-6">
                    <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 font-bold">
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const LEAN_WASTES = [
    "Sobreproducción", "Espera / Ocio", "Transporte", "Sobreprocesamiento",
    "Inventario", "Movimiento Innecesario", "Defectos / Retrabajos", "Talento No Utilizado"
];
const PROCESOS_POR_PLANTA: Record<string, string[]> = {
    "MS": ["ACABADO", "DESMOLDE", "EMPAQUE", "PINTURA", "PULIDO", "VACIADO"],
    "FV": ["ACABADO", "DESMOLDE", "EMPAQUE", "GEL COAT", "LAMINADO", "VACIADO"],
};

function EditModal({ item, onClose, onSave, onDelete }: { item: EvaluacionHoraHora; onClose: () => void; onSave: (updated: EvaluacionHoraHora) => void; onDelete: (id: string) => void }) {
    // Basic info
    const [planta, setPlanta] = useState(item.planta);
    const [linea, setLinea] = useState(item.linea);
    const [puesto, setPuesto] = useState(item.puesto);
    const [operario, setOperario] = useState(item.operario);
    const [tiempoCicloTeorico, setTiempoCicloTeorico] = useState(item.tiempoCicloTeorico);
    // Cycles
    const [ciclos, setCiclos] = useState(item.ciclos?.map(c => ({ ...c })) || []);
    // Quality
    const [piezasTotales, setPiezasTotales] = useState(item.piezasTotalesCalidad);
    const [piezasBuenas, setPiezasBuenas] = useState(item.piezasBuenas);
    // HDT
    const [hdtCumple, setHdtCumple] = useState(item.hdtCumple);
    const [hdtComentario, setHdtComentario] = useState(item.hdtComentario || "");
    // Wastes & comments
    const [desperdicios, setDesperdicios] = useState<string[]>(item.desperdicios || []);
    const [comentario, setComentario] = useState(item.comentarioGeneral || "");
    const [saved, setSaved] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const updateCycleDuration = (id: string, dur: number) => setCiclos(p => p.map(c => c.id === id ? { ...c, duracion: dur } : c));
    const toggleCycleValid = (id: string) => setCiclos(p => p.map(c => c.id === id ? { ...c, valido: !c.valido } : c));
    const removeCycle = (id: string) => setCiclos(p => p.filter(c => c.id !== id));
    const lineas = PROCESOS_POR_PLANTA[planta] || [];

    const toggleWaste = (w: string) => {
        setDesperdicios(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
    };

    const handleSave = () => {
        const validCycles = ciclos.filter(c => c.valido);
        const ciclosTotales = validCycles.length;
        const tiempoPromedio = ciclosTotales > 0 ? validCycles.reduce((s, c) => s + c.duracion, 0) / ciclosTotales : 0;
        const piezasReales = ciclosTotales;
        const piezasTeoricas = tiempoCicloTeorico > 0 ? Math.floor(item.tiempoTotal / tiempoCicloTeorico) : 0;
        const rendimiento = piezasTeoricas > 0 ? (piezasReales / piezasTeoricas) * 100 : 0;
        const defectos = Math.max(piezasTotales - piezasBuenas, 0);
        const calidad = piezasTotales > 0 ? (piezasBuenas / piezasTotales) * 100 : 0;

        let estadoGlobal: 'Verde' | 'Amarillo' | 'Rojo' = 'Verde';
        if (rendimiento < 80 || calidad < 80 || !hdtCumple) estadoGlobal = 'Rojo';
        else if (rendimiento < 90 || calidad < 90) estadoGlobal = 'Amarillo';

        const updated: EvaluacionHoraHora = {
            ...item,
            planta, linea, puesto, operario, tiempoCicloTeorico,
            ciclos, ciclosTotales, tiempoPromedio, piezasReales, piezasTeoricas, rendimiento,
            piezasTotalesCalidad: piezasTotales,
            piezasBuenas,
            piezasDefectuosas: defectos,
            calidad,
            hdtCumple,
            hdtComentario,
            desperdicios,
            comentarioGeneral: comentario,
            estadoGlobal,
        };

        onSave(updated);
        setSaved(true);
        setTimeout(() => onClose(), 600);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 fade-in duration-300">

                {/* Header */}
                <div className="bg-amber-500 text-white px-6 py-5 flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Editar Registro {item.consecutivo ? `#${item.consecutivo}` : ""}</p>
                        <h2 className="text-xl font-black">{operario}</h2>
                        <p className="text-sm opacity-80">{puesto} · {linea} ({planta})</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors mt-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* ── Información General ── */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><User size={13} /> Información General</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Planta</Label>
                                <select value={planta} onChange={e => { setPlanta(e.target.value); setLinea(""); }} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold"><option value="MS">MS</option><option value="FV">FV</option></select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Línea / Proceso</Label>
                                <select value={linea} onChange={e => setLinea(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold"><option value="">Seleccione...</option>{lineas.map(l => <option key={l} value={l}>{l}</option>)}</select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Puesto</Label>
                                <Input value={puesto} onChange={e => setPuesto(e.target.value)} className="font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Operario</Label>
                                <Input value={operario} onChange={e => setOperario(e.target.value)} className="font-bold" />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <Label className="text-xs text-slate-500">Tiempo Ciclo Teórico (seg)</Label>
                                <Input type="number" min="1" value={tiempoCicloTeorico} onChange={e => setTiempoCicloTeorico(Number(e.target.value))} className="font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* ── Tiempos de Ciclo ── */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1"><Clock size={13} /> Tiempos de Ciclo ({ciclos.length} mediciones)</p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {ciclos.length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center py-4">No hay ciclos registrados.</p>
                            ) : ciclos.map((c, i) => (
                                <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${c.valido ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 opacity-60"}`}>
                                    <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">#{i + 1}</span>
                                    <Input type="number" min="0" step="0.1" value={c.duracion} onChange={e => updateCycleDuration(c.id, Number(e.target.value))} className="w-24 h-8 text-sm font-bold text-center" />
                                    <span className="text-xs text-slate-400">seg</span>
                                    <div className="flex-1" />
                                    <button type="button" onClick={() => toggleCycleValid(c.id)} className={`text-xs font-bold px-2 py-1 rounded-full border transition-all ${c.valido ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-200 text-slate-500 border-slate-300 line-through"}`}>{c.valido ? "Válido" : "Inválido"}</button>
                                    <button type="button" onClick={() => removeCycle(c.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Eliminar ciclo"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        {ciclos.filter(c => c.valido).length > 0 && (
                            <p className="text-xs text-blue-600 font-semibold mt-3 pt-2 border-t border-blue-200">
                                Promedio válidos: <span className="font-black">{(ciclos.filter(c => c.valido).reduce((s, c) => s + c.duracion, 0) / ciclos.filter(c => c.valido).length).toFixed(1)}s</span>
                                {" · "}{ciclos.filter(c => c.valido).length} ciclos válidos
                            </p>
                        )}
                    </div>

                    {/* Calidad */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calidad</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Piezas Inspeccionadas</Label>
                                <Input type="number" min="0" value={piezasTotales} onChange={e => setPiezasTotales(Number(e.target.value))} className="font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Piezas Buenas</Label>
                                <Input type="number" min="0" max={piezasTotales} value={piezasBuenas} onChange={e => setPiezasBuenas(Number(e.target.value))} className="font-bold" />
                            </div>
                        </div>
                        {piezasTotales > 0 && (
                            <p className="text-xs text-slate-500 mt-2">
                                Calidad: <span className="font-bold text-primary">{((piezasBuenas / piezasTotales) * 100).toFixed(1)}%</span> · Defectos: <span className="font-bold">{Math.max(piezasTotales - piezasBuenas, 0)}</span>
                            </p>
                        )}
                    </div>

                    {/* HDT */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Desglose de Trabajo (HDT)</p>
                        <div className="flex gap-3 mb-3">
                            <Button
                                type="button"
                                size="sm"
                                variant={hdtCumple === true ? "default" : "outline"}
                                className={hdtCumple === true ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                onClick={() => setHdtCumple(true)}
                            >
                                ✓ Cumple
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={hdtCumple === false ? "default" : "outline"}
                                className={hdtCumple === false ? "bg-slate-600 hover:bg-slate-700" : ""}
                                onClick={() => setHdtCumple(false)}
                            >
                                ○ No cumple
                            </Button>
                        </div>
                        {hdtCumple === false && (
                            <Textarea
                                placeholder="Describa por qué no cumple..."
                                value={hdtComentario}
                                onChange={e => setHdtComentario(e.target.value)}
                                className="min-h-20 text-sm"
                            />
                        )}
                    </div>

                    {/* Desperdicios */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Desperdicios ({desperdicios.length} seleccionados)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {LEAN_WASTES.map(w => {
                                const checked = desperdicios.includes(w);
                                return (
                                    <div
                                        key={w}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${checked ? "border-purple-400 bg-purple-50 font-medium" : "border-slate-200 bg-white hover:border-purple-200"}`}
                                        onClick={() => toggleWaste(w)}
                                    >
                                        <Checkbox checked={checked} onCheckedChange={() => toggleWaste(w)} className="data-[state=checked]:bg-purple-600 w-5 h-5" />
                                        <span className={checked ? "text-purple-900" : "text-slate-600"}>{w}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comentarios */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comentarios y Observaciones</Label>
                        <Textarea placeholder="Observaciones adicionales..." value={comentario} onChange={e => setComentario(e.target.value)} className="min-h-24 text-sm" />
                    </div>

                </div>

                <div className="px-6 pb-6 space-y-3">
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1 font-bold">Cancelar</Button>
                        <Button onClick={handleSave} className={`flex-1 font-bold gap-2 ${saved ? "bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"}`}>
                            {saved ? <><CheckCircle2 size={18} /> Guardado</> : <><Save size={18} /> Guardar Cambios</>}
                        </Button>
                    </div>
                    {!showDeleteConfirm ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full text-center text-xs text-slate-400 hover:text-rose-500 transition-colors py-2 underline underline-offset-2">Eliminar este registro</button>
                    ) : (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center space-y-3 animate-in fade-in duration-200">
                            <p className="text-sm font-bold text-rose-700">¿Seguro que deseas eliminar este registro?</p>
                            <p className="text-xs text-rose-500">Esta acción no se puede deshacer.</p>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancelar</Button>
                                <Button size="sm" onClick={() => { onDelete(item.id); onClose(); }} className="flex-1 bg-rose-600 hover:bg-rose-700 font-bold">Sí, eliminar</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Historico() {
    const [data, setData] = useState<EvaluacionHoraHora[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selected, setSelected] = useState<EvaluacionHoraHora | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [nameMap, setNameMap] = useState<Record<string, string>>({});

    useEffect(() => {
        // Fetch from Supabase, merge with localStorage
        fetchEvaluaciones().then(records => {
            if (records.length > 0) {
                setData(records);
            } else {
                // No records in Supabase, try localStorage
                const raw = localStorage.getItem("historialHoraHora");
                if (raw) setData(JSON.parse(raw).reverse());
            }
        }).catch((err) => {
            console.error('Error fetching from Supabase:', err);
            const raw = localStorage.getItem("historialHoraHora");
            if (raw) setData(JSON.parse(raw).reverse());
        });

        // Get logged-in user
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: authData }) => {
            if (authData?.user) {
                setCurrentUserEmail(authData.user.email || "");
            }
        });

        // Load all usuarios to build email→name map
        // Try main DB first (where auth.users lives), fallback to external
        const authSupa = createClient();
        authSupa.from('usuarios').select('correo, nombre').then(({ data: usuarios, error }) => {
            if (usuarios && usuarios.length > 0) {
                const map: Record<string, string> = {};
                usuarios.forEach((u: any) => {
                    if (u.correo && u.nombre) map[u.correo] = u.nombre;
                });
                setNameMap(map);
            } else {
                // Fallback: try external DB
                const ext = createExternalClient();
                ext.from('usuarios').select('correo, nombre').then(({ data: extUsuarios }) => {
                    if (extUsuarios) {
                        const map: Record<string, string> = {};
                        extUsuarios.forEach((u: any) => {
                            if (u.correo && u.nombre) map[u.correo] = u.nombre;
                        });
                        setNameMap(map);
                    }
                });
            }
        });
    }, []);

    // Resolve a creadoPor value (could be email or name) to display name
    const resolveUserName = (creadoPor: string | undefined) => {
        if (!creadoPor) return "—";
        // If it's an email, look up the name
        if (creadoPor.includes('@') && nameMap[creadoPor]) {
            return nameMap[creadoPor];
        }
        return creadoPor;
    };

    const filteredData = data.filter(item =>
        (item.linea || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.operario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.planta || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.puesto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.creadoPor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.consecutivo?.toString() || "").includes(searchTerm)
    );

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'Verde': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Óptimo</Badge>;
            case 'Amarillo': return <Badge className="bg-amber-500 hover:bg-amber-600">Alerta</Badge>;
            case 'Rojo': return <Badge className="bg-rose-500 hover:bg-rose-600">Crítico</Badge>;
            default: return <Badge variant="outline">Pendiente</Badge>;
        }
    };

    const handleSaveEdit = async (updated: EvaluacionHoraHora) => {
        try {
            await updateEvaluacion(updated);
        } catch (err) {
            console.error('Error updating in Supabase:', err);
        }
        setData(prev => prev.map(e => e.id === updated.id ? updated : e));
        setEditing(null);
    };

    const handleDeleteRecord = async (id: string) => {
        try {
            await deleteEvaluacion(id);
        } catch (err) {
            console.error('Error deleting from Supabase:', err);
        }
        setData(prev => prev.filter(e => e.id !== id));
        setEditing(null);
    };

    const [editing, setEditing] = useState<EvaluacionHoraHora | null>(null);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center">
            <header className="w-full bg-primary text-primary-foreground shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline font-bold text-lg">Histórico Hora-Hora</span>
                        </Button>
                    </Link>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
                        <div className="text-[10px] opacity-80 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between mt-6">
                    <h2 className="text-2xl font-bold text-primary">Observaciones Guardadas</h2>

                    <div className="flex-1 w-full max-w-lg relative mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Buscar por #, Línea, Operario, Realizado por..."
                            className="pl-10 h-10 shadow-sm rounded-md border-slate-300 focus-visible:ring-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 absolute right-0">
                            {filteredData.length} REGISTROS ENCONTRADOS
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-primary hover:bg-primary">
                                <TableRow className="hover:bg-primary border-none">
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider rounded-tl-lg w-12">#</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider">Fecha</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider">Planta / Puesto</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider">Operario</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider">Realizado por</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider">KPIs</TableHead>
                                    <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider text-right rounded-tr-lg">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center text-slate-400 font-medium">
                                            No hay registros para mostrar.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.map((item) => {
                                    const isOwner = currentUserEmail && (item.creadoPorEmail === currentUserEmail || item.creadoPor === currentUserEmail);
                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="py-4">
                                                <span className="font-black text-primary text-sm">{item.consecutivo || "—"}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="font-medium text-slate-800">{format(new Date(item.tiempoInicio), "dd/MM/yyyy")}</div>
                                                <div className="text-xs text-slate-500">{format(new Date(item.tiempoInicio), "HH:mm")}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="font-bold text-slate-800">{item.planta}</div>
                                                <div className="text-xs text-slate-500">{item.puesto}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="text-sm font-medium text-slate-800">{item.operario}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="text-xs text-slate-600 font-medium truncate max-w-[160px]">{resolveUserName(item.creadoPor)}</div>
                                            </TableCell>
                                            <TableCell className="py-4 text-xs">
                                                <div><span className="font-semibold w-16 inline-block">Rend:</span> <span className={`font-mono font-bold ${item.rendimiento >= 90 ? 'text-emerald-600' : item.rendimiento >= 80 ? 'text-amber-500' : 'text-slate-500'}`}>{item.rendimiento.toFixed(1)}%</span></div>
                                                <div><span className="font-semibold w-16 inline-block">Calidad:</span> <span className={`font-mono font-bold ${item.calidad >= 90 ? 'text-emerald-600' : item.calidad >= 80 ? 'text-amber-500' : 'text-slate-500'}`}>{item.calidad.toFixed(1)}%</span></div>
                                                <div><span className="font-semibold w-16 inline-block">HDT:</span> <span className={`font-bold ${item.hdtCumple ? 'text-emerald-600' : 'text-slate-500'}`}>{item.hdtCumple ? 'Sí' : 'No'}</span></div>
                                            </TableCell>
                                            <TableCell className="py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                                                        title="Ver detalle"
                                                        onClick={() => setSelected(item)}
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                    {isOwner && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700"
                                                            title="Editar registro"
                                                            onClick={() => setEditing(item)}
                                                        >
                                                            <Edit2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {selected && <DetailModal item={selected} onClose={() => setSelected(null)} resolveUserName={resolveUserName} />}
            {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} onDelete={handleDeleteRecord} />}
        </div>
    );
}
