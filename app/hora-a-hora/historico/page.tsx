"use client";

import { useEffect, useState, useMemo } from "react";
import { EvaluacionHoraHora } from "@/lib/store";
import { fetchEvaluaciones, updateEvaluacion, deleteEvaluacion, insertEvaluacion } from "@/lib/db/horaHora";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, X, TrendingUp, BarChart2, ShieldCheck, ShieldX, Clock, Trash2, PenLine, Edit2, User, Save, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown, CloudUpload, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient } from "@/lib/supabase/external";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/hora-a-hora/SubHeader";

// Semáforo Firplak de los indicadores (meta 90 %): verde ≥ 90 %, amarillo de 80 a 90 %, rojo por debajo de 80 %
const colorSemaforo = (val: number) => val >= 90 ? 'text-[#3b8f50]' : val >= 80 ? 'text-[#b8962c]' : 'text-[#d14747]';

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, resolveUserName }: { item: EvaluacionHoraHora; onClose: () => void; resolveUserName: (v: string | undefined) => string }) {
    const getKPIStyle = (val: number) => {
        // Mismo semáforo Firplak de la tabla: verde ≥ 90 %, amarillo 80–90 %, rojo < 80 %
        if (val >= 90) return { color: "text-[#3b8f50]", bg: "bg-[#59a96a]/10 border-[#59a96a]/40", bar: "bg-[#59a96a]", label: "CUMPLE", labelBg: "bg-[#59a96a]" };
        if (val >= 80) return { color: "text-[#b8962c]", bg: "bg-[#deb841]/10 border-[#deb841]/50", bar: "bg-[#deb841]", label: "ATENCIÓN", labelBg: "bg-[#deb841]" };
        return { color: "text-[#d14747]", bg: "bg-[#d14747]/10 border-[#d14747]/40", bar: "bg-[#d14747]", label: "NO CUMPLE", labelBg: "bg-[#d14747]" };
    };
    const rSt = getKPIStyle(item.rendimiento);
    const qSt = getKPIStyle(item.calidad);

    // Achica la letra cuando el texto es largo, para que los números no se salgan del recuadro (tamaños compactos)
    const fitFontSize = (text: string, base: "4xl" | "2xl" = "4xl") => {
        const len = text.length;
        if (base === "4xl") {
            if (len <= 7) return "text-2xl";
            if (len <= 9) return "text-xl";
            return "text-lg";
        }
        if (len <= 7) return "text-lg";
        return "text-base";
    };
    // Segundos → minutos (con coma decimal), p. ej. 2160 s = 36,0 min
    const enMinutos = (seg: number) => `${(seg / 60).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min`;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 overflow-hidden animate-in zoom-in-95 fade-in duration-300">

                {/* Header */}
                <div className="bg-[#254153] text-white px-5 py-3 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Detalle Hora Hora</p>
                            {item.consecutivo > 0 && (
                                <span className="bg-white/20 text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-white/30">
                                    #{item.consecutivo}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-black leading-tight">{item.operario}</h2>
                        <p className="text-xs opacity-80 mt-0.5">{item.puesto} · {item.linea} ({item.planta})</p>
                        <p className="text-[11px] opacity-60 mt-0.5">
                            {format(new Date(item.tiempoInicio), "dd/MM/yyyy HH:mm")}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors mt-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-3">

                    {/* Realizado por */}
                    {item.creadoPor && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                            <User size={16} className="text-[#254153] shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hora Hora realizado por</p>
                                <p className="text-sm font-bold text-slate-800">{resolveUserName(item.creadoPor)}</p>
                            </div>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl border-2 px-3 py-2 ${rSt.bg}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp size={13} /> Rendimiento
                                </span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${rSt.labelBg}`}>{rSt.label}</span>
                            </div>
                            <p className={`${fitFontSize(`${item.rendimiento.toFixed(1)}%`)} font-black tabular-nums mt-1 truncate ${rSt.color}`}>{item.rendimiento.toFixed(1)}%</p>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${rSt.bar}`} style={{ width: `${Math.min(item.rendimiento, 100)}%` }} />
                            </div>
                        </div>
                        <div className={`rounded-xl border-2 px-3 py-2 ${qSt.bg}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <BarChart2 size={13} /> Calidad
                                </span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${qSt.labelBg}`}>{qSt.label}</span>
                            </div>
                            <p className={`${fitFontSize(`${item.calidad.toFixed(1)}%`)} font-black tabular-nums mt-1 truncate ${qSt.color}`}>{item.calidad.toFixed(1)}%</p>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${qSt.bar}`} style={{ width: `${Math.min(item.calidad, 100)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Tiempos de ciclo */}
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-2">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Clock size={13} /> Tiempos de Ciclo
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Teórico</p>
                                <p className={`${fitFontSize(`${item.tiempoCicloTeorico}s`, "2xl")} font-black text-slate-700 truncate leading-tight`}>{item.tiempoCicloTeorico}s</p>
                                <p className="text-xs font-bold text-slate-500">{enMinutos(item.tiempoCicloTeorico)}</p>
                            </div>
                            <div className="flex items-center justify-center text-slate-300 font-bold text-lg">VS</div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wider">Prom. Real</p>
                                <p className={`${fitFontSize(`${item.tiempoPromedio.toFixed(1)}s`, "2xl")} font-black text-blue-700 truncate leading-tight`}>{item.tiempoPromedio.toFixed(1)}s</p>
                                <p className="text-xs font-bold text-blue-500">{enMinutos(item.tiempoPromedio)}</p>
                            </div>
                        </div>
                        <p className="text-center text-[11px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                            {item.ciclosTotales} ciclos válidos · {item.piezasReales} piezas reales
                        </p>
                    </div>

                    {/* Calidad detalle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detalle de Calidad</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="min-w-0">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Inspeccionadas</p>
                                <p className={`${fitFontSize(`${item.piezasTotalesCalidad}`, "2xl")} font-black text-slate-700 truncate`}>{item.piezasTotalesCalidad}</p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-emerald-500 font-semibold mb-1">Buenas</p>
                                <p className={`${fitFontSize(`${item.piezasBuenas}`, "2xl")} font-black text-emerald-700 truncate`}>{item.piezasBuenas}</p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-400 font-semibold mb-1">Defectos</p>
                                <p className={`${fitFontSize(`${item.piezasDefectuosas}`, "2xl")} font-black text-slate-600 truncate`}>{item.piezasDefectuosas}</p>
                            </div>
                        </div>
                    </div>

                    {/* HDT */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 ${item.hdtCumple ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                            {item.hdtCumple
                                ? <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
                                : <ShieldX size={22} className="text-slate-400 shrink-0" />
                            }
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Desglose de Trabajo (HDT)</p>
                                <p className={`font-black text-sm ${item.hdtCumple ? "text-emerald-700" : "text-slate-600"}`}>
                                    {item.hdtCumple ? "Cumple el estándar" : "En proceso de mejora"}
                                </p>
                            </div>
                        </div>
                        <span className={`text-xl font-black ${item.hdtCumple ? "text-emerald-600" : "text-slate-400"}`}>
                            {item.hdtCumple ? "✓" : "○"}
                        </span>
                    </div>

                    {/* Desperdicios */}
                    {item.desperdicios?.length > 0 && (
                        <div className="px-3 py-2 rounded-xl border-2 bg-purple-50 border-purple-200">
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
                        <div className="px-3 py-2 rounded-xl border border-slate-200 bg-white">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Comentarios y Observaciones</p>
                            <p className="text-sm text-slate-700 italic">"{item.comentarioGeneral}"</p>
                        </div>
                    )}

                    {/* Compromiso / Retroalimentación */}
                    {item.compromiso && (
                        <div className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/40">
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Compromiso / Retroalimentación</p>
                            <p className="text-sm text-indigo-900 italic">"{item.compromiso}"</p>
                        </div>
                    )}

                    {/* Firma */}
                    {(item as any).firmaOperario && (
                        <div className="px-3 py-2 rounded-xl border border-slate-200 bg-white">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                <PenLine size={13} /> Firma del Colaborador
                            </p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={(item as any).firmaOperario} alt="Firma del colaborador" className="border border-slate-100 rounded-lg w-full max-h-24 object-contain bg-slate-50" />
                        </div>
                    )}

                </div>

                <div className="px-4 pb-4">
                    <Button onClick={onClose} className="w-full bg-[#254153] hover:bg-[#254153]/90 font-bold text-white">
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
    const [realizadoPor, setRealizadoPor] = useState(item.realizadoPor || item.creadoPor || "");
    const [compromiso, setCompromiso] = useState(item.compromiso || "");
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
            realizadoPor,
            compromiso,
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
                                Calidad: <span className="font-bold text-[#254153]">{((piezasBuenas / piezasTotales) * 100).toFixed(1)}%</span> · Defectos: <span className="font-bold">{Math.max(piezasTotales - piezasBuenas, 0)}</span>
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

                    {/* Realizado Por */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Realizado por</Label>
                        <Input placeholder="Nombre de quien realizó..." value={realizadoPor} onChange={e => setRealizadoPor(e.target.value)} className="text-sm font-medium" />
                    </div>

                    {/* Comentarios */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comentarios y Observaciones</Label>
                        <Textarea placeholder="Observaciones adicionales..." value={comentario} onChange={e => setComentario(e.target.value)} className="min-h-24 text-sm" />
                    </div>

                    {/* Compromiso / Retroalimentación */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Compromiso / Retroalimentación</Label>
                        <Textarea placeholder="Compromisos o retroalimentación con el colaborador..." value={compromiso} onChange={e => setCompromiso(e.target.value)} className="min-h-24 text-sm border-indigo-200 focus-visible:ring-indigo-500" />
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
    // Registros que solo están en este equipo (el guardado en la base falló) y error al cargar
    const [pendientes, setPendientes] = useState<Set<string>>(new Set());
    const [subiendo, setSubiendo] = useState<string | null>(null);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({
        key: 'tiempoInicio',
        direction: 'desc'
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        // Fetch from Supabase, merge with localStorage
        // Registros guardados en este equipo que no llegaron a la base se muestran como pendientes por subir
        let locales: EvaluacionHoraHora[] = [];
        try { locales = JSON.parse(localStorage.getItem("historialHoraHora") || "[]"); } catch { locales = []; }
        fetchEvaluaciones().then(records => {
            const enBase = new Set(records.map(r => r.id));
            const vistos = new Set<string>();
            const unicos = <T extends { id: string }>(lista: T[]) => lista.filter(x => x?.id && !vistos.has(x.id) && (vistos.add(x.id), true));
            const deBase = unicos(records);
            const soloLocales = unicos(locales.filter(l => l?.id && !enBase.has(l.id)));
            setPendientes(new Set(soloLocales.map(l => l.id)));
            setData([...deBase, ...soloLocales]);
            // La copia del equipo solo guarda lo que NO está en la base (antes guardaba todo con firmas y llenaba el almacenamiento)
            try { localStorage.setItem("historialHoraHora", JSON.stringify(soloLocales)); } catch { /* sin acceso */ }
        }).catch((err) => {
            console.error('Error fetching from Supabase:', err);
            setErrorCarga(`No se pudieron cargar los registros de la base de datos: ${err?.message || err}. Solo se muestran los guardados en este equipo.`);
            const vistos = new Set<string>();
            const unicos = locales.filter(l => l?.id && !vistos.has(l.id) && (vistos.add(l.id), true));
            setPendientes(new Set(unicos.map(l => l.id)));
            setData([...unicos].reverse());
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

    const filteredAndSortedData = useMemo(() => {
        // Busca sin tildes en todo lo que se ve en la fila (incluye correo, nombre del que lo hizo y fecha dd/mm/aaaa)
        const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const q = norm(searchTerm.trim());
        let result = [...data].filter(item => {
            if (!q) return true;
            const fecha = item.tiempoInicio ? new Date(item.tiempoInicio) : null;
            const fechaTxt = fecha && !isNaN(fecha.getTime())
                ? `${format(fecha, "dd/MM/yyyy")} ${format(fecha, "d/M/yyyy")} ${format(fecha, "d/M/yy")} ${format(fecha, "dd/MM/yy")}` : "";
            return norm([
                item.linea, item.operario, item.planta, item.puesto, item.creadoPor, item.creadoPorEmail,
                item.realizadoPor, resolveUserName(item.creadoPor), item.supervisor, item.consecutivo?.toString(), fechaTxt
            ].filter(Boolean).join(" | ")).includes(q);
        });

        if (sortConfig) {
            result.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                if (sortConfig.key === 'consecutivo') {
                    valA = a.consecutivo || 0;
                    valB = b.consecutivo || 0;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                } else if (sortConfig.key === 'tiempoInicio') {
                    valA = new Date(a.tiempoInicio).getTime();
                    valB = new Date(b.tiempoInicio).getTime();
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                } else if (sortConfig.key === 'plantaPuesto') {
                    valA = `${a.planta || ''} ${a.puesto || ''}`.toLowerCase();
                    valB = `${b.planta || ''} ${b.puesto || ''}`.toLowerCase();
                } else if (sortConfig.key === 'operario') {
                    valA = (a.operario || '').toLowerCase();
                    valB = (b.operario || '').toLowerCase();
                } else if (sortConfig.key === 'realizadoPor') {
                    valA = resolveUserName(a.creadoPor).toLowerCase();
                    valB = resolveUserName(b.creadoPor).toLowerCase();
                } else if (sortConfig.key === 'rendimiento' || sortConfig.key === 'calidad') {
                    valA = (a as any)[sortConfig.key] || 0;
                    valB = (b as any)[sortConfig.key] || 0;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                } else if (sortConfig.key === 'hdt') {
                    valA = a.hdtCumple ? 1 : 0;
                    valB = b.hdtCumple ? 1 : 0;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data, searchTerm, sortConfig, nameMap]);

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="opacity-30 ml-1 inline-block align-middle" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="ml-1 text-white inline-block align-middle" /> 
            : <ArrowDown size={14} className="ml-1 text-white inline-block align-middle" />;
    };

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

    const quitarDeEsteEquipo = (id: string) => {
        try {
            const historial = JSON.parse(localStorage.getItem("historialHoraHora") || "[]");
            localStorage.setItem("historialHoraHora", JSON.stringify(historial.filter((h: any) => h?.id !== id)));
        } catch { /* sin almacenamiento local */ }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!pendientes.has(id)) {
            try {
                await deleteEvaluacion(id);
            } catch (err: any) {
                alert(`No se pudo eliminar el registro: ${err?.message || err}`);
                return;
            }
        }
        quitarDeEsteEquipo(id);
        setPendientes(prev => { const n = new Set(prev); n.delete(id); return n; });
        setData(prev => prev.filter(e => e.id !== id));
        setEditing(null);
    };

    // Sube a la base un registro que solo quedó guardado en este equipo
    const subirPendiente = async (item: EvaluacionHoraHora) => {
        setSubiendo(item.id);
        try {
            const consecutivo = await insertEvaluacion(item);
            const actualizado = { ...item, consecutivo };
            try {
                const historial = JSON.parse(localStorage.getItem("historialHoraHora") || "[]");
                localStorage.setItem("historialHoraHora", JSON.stringify(historial.map((h: any) => h?.id === item.id ? actualizado : h)));
            } catch { /* sin almacenamiento local */ }
            setPendientes(prev => { const n = new Set(prev); n.delete(item.id); return n; });
            setData(prev => prev.map(e => e.id === item.id ? actualizado : e));
        } catch (err: any) {
            alert(`No se pudo subir el registro a la base de datos: ${err?.message || err?.details || err}`);
        } finally {
            setSubiendo(null);
        }
    };

    const [editing, setEditing] = useState<EvaluacionHoraHora | null>(null);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans text-[#000000] w-full">
            <Header 
                title="Hora a Hora"
                subtitle="Histórico"
                userEmail={currentUserEmail}
            />
            <SubHeader />

            <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 py-3 sm:px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="mb-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <h2 className="text-lg font-bold text-[#254153]">Observaciones Guardadas</h2>

                    <div className="flex-1 w-full max-w-lg relative mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <Input
                            placeholder="Buscar por #, Línea, Operario, Realizado por..."
                            className="pl-9 h-8 text-xs shadow-sm rounded-md border-slate-300 focus-visible:ring-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 absolute right-0">
                            {filteredAndSortedData.length} REGISTROS ENCONTRADOS
                        </p>
                    </div>
                </div>

                {errorCarga && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-400 text-red-800 rounded-lg font-bold text-sm flex items-center gap-2" role="alert">
                        <AlertTriangle size={18} /> {errorCarga}
                    </div>
                )}
                {pendientes.size > 0 && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-400 text-amber-900 rounded-lg text-sm flex items-center gap-2" role="alert">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span><b>{pendientes.size} registro(s) solo están guardados en este equipo</b>: no llegaron a la base de datos y nadie más los ve. Use el botón <b>Subir</b> de cada fila (marcadas en ámbar).</span>
                    </div>
                )}

                <div className="bg-white rounded-none shadow-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="table-fixed w-full min-w-[900px]">
                            <TableHeader className="bg-[#254153] hover:bg-[#254153]">
                                <TableRow className="hover:bg-[#254153] border-none select-none">
                                    <TableHead 
                                        className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors w-[5%] whitespace-normal leading-tight"
                                        onClick={() => requestSort('consecutivo')}
                                    >
                                        # <SortIcon columnKey="consecutivo" />
                                    </TableHead>
                                    <TableHead 
                                        className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors w-[11%] whitespace-normal leading-tight"
                                        onClick={() => requestSort('tiempoInicio')}
                                    >
                                        Fecha <SortIcon columnKey="tiempoInicio" />
                                    </TableHead>
                                    <TableHead 
                                        className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors w-[19%] whitespace-normal leading-tight"
                                        onClick={() => requestSort('plantaPuesto')}
                                    >
                                        Planta / Puesto <SortIcon columnKey="plantaPuesto" />
                                    </TableHead>
                                    <TableHead 
                                        className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors w-[19%] whitespace-normal leading-tight"
                                        onClick={() => requestSort('operario')}
                                    >
                                        Operario <SortIcon columnKey="operario" />
                                    </TableHead>
                                    <TableHead 
                                        className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors w-[19%] whitespace-normal leading-tight"
                                        onClick={() => requestSort('realizadoPor')}
                                    >
                                        Realizado por <SortIcon columnKey="realizadoPor" />
                                    </TableHead>
                                    <TableHead className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors text-center w-[9%] whitespace-normal leading-tight" onClick={() => requestSort('rendimiento')}>
                                        Rendimiento <SortIcon columnKey="rendimiento" />
                                    </TableHead>
                                    <TableHead className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors text-center w-[8%] whitespace-normal leading-tight" onClick={() => requestSort('calidad')}>
                                        Calidad <SortIcon columnKey="calidad" />
                                    </TableHead>
                                    <TableHead className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider bg-[#254153] cursor-pointer hover:bg-[#3b5998] transition-colors text-center w-[6%] whitespace-normal leading-tight" onClick={() => requestSort('hdt')}>
                                        HDT <SortIcon columnKey="hdt" />
                                    </TableHead>
                                    <TableHead className="py-2 h-auto font-bold text-white uppercase text-[11px] tracking-wider text-right w-[4%] bg-[#254153]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center text-slate-400 font-medium">
                                            No hay registros para mostrar.
                                          </TableCell>
                                    </TableRow>
                                ) : filteredAndSortedData.map((item) => {
                                    const isOwner = currentUserEmail && (item.creadoPorEmail === currentUserEmail || item.creadoPor === currentUserEmail);
                                    return (
                                        // Clic en cualquier parte de la fila abre el detalle
                                        <TableRow key={item.id} onClick={() => setSelected(item)} title="Clic para ver el detalle"
                                            className={`transition-colors cursor-pointer text-xs ${pendientes.has(item.id) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-100'}`}>
                                            <TableCell className="py-1.5 whitespace-normal break-words align-middle">
                                                {pendientes.has(item.id) ? (
                                                    <button onClick={e => { e.stopPropagation(); subirPendiente(item) }} disabled={subiendo === item.id}
                                                        title="Este registro solo está en este equipo: subirlo a la base de datos"
                                                        className="flex items-center gap-1 h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold disabled:opacity-50">
                                                        <CloudUpload size={14} /> {subiendo === item.id ? 'Subiendo…' : 'Subir'}
                                                    </button>
                                                ) : (
                                                    <span className="font-black text-[#254153] text-sm">{item.consecutivo || "—"}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5 whitespace-normal break-words align-middle">
                                                <div className="font-medium text-slate-800">{format(new Date(item.tiempoInicio), "dd/MM/yyyy")} <span className="text-slate-500 font-normal">{format(new Date(item.tiempoInicio), "HH:mm")}</span></div>
                                            </TableCell>
                                            <TableCell className="py-1.5 whitespace-normal break-words align-middle">
                                                <div className="text-slate-800"><b>{item.planta}</b> <span className="text-slate-500">· {item.puesto}</span></div>
                                            </TableCell>
                                            <TableCell className="py-1.5 whitespace-normal break-words align-middle">
                                                <div className="font-medium text-slate-800">{item.operario}</div>
                                            </TableCell>
                                            <TableCell className="py-1.5 whitespace-normal break-words align-middle">
                                                <div className="text-xs text-slate-600 font-medium leading-snug">{item.realizadoPor || resolveUserName(item.creadoPor)}</div>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-center whitespace-normal">
                                                <span className={`font-mono font-bold ${colorSemaforo(item.rendimiento)}`}>{item.rendimiento.toFixed(1)}%</span>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-center whitespace-normal">
                                                <span className={`font-mono font-bold ${colorSemaforo(item.calidad)}`}>{item.calidad.toFixed(1)}%</span>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-center whitespace-normal">
                                                <span className={`font-bold ${item.hdtCumple ? 'text-[#3b8f50]' : 'text-[#d14747]'}`}>{item.hdtCumple ? 'Sí' : 'No'}</span>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    {isOwner && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700"
                                                            title="Editar registro"
                                                            onClick={() => setEditing(item)}
                                                        >
                                                            <Edit2 size={14} />
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
