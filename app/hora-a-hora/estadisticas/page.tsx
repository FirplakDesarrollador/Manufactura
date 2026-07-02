"use client";

import { useEffect, useState, useMemo } from "react";
import { EvaluacionHoraHora } from "@/lib/store";
import { fetchEvaluaciones } from "@/lib/db/horaHora";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart2, TrendingUp, AlertTriangle, ShieldCheck, Users, Factory, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient } from "@/lib/supabase/external";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = ['#254153', '#3b82f6', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0f172a', '#334155'];
const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Estadisticas() {
    const [rawData, setRawData] = useState<EvaluacionHoraHora[]>([]);
    const [nameMap, setNameMap] = useState<Record<string, string>>({});

    // Filters
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterMonth, setFilterMonth] = useState<string>("all");
    const [filterDay, setFilterDay] = useState<string>("all");
    const [filterPlanta, setFilterPlanta] = useState<string>("all");
    const [filterUser, setFilterUser] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        // Fetch from Supabase, fallback to localStorage
        fetchEvaluaciones().then(records => {
            if (records.length > 0) {
                setRawData(records);
            } else {
                const raw = localStorage.getItem("historialHoraHora");
                if (raw) setRawData(JSON.parse(raw));
            }
        }).catch((err) => {
            console.error('Error fetching from Supabase:', err);
            const raw = localStorage.getItem("historialHoraHora");
            if (raw) setRawData(JSON.parse(raw));
        });

        // Load usuarios for name resolution
        const supabase = createClient();
        supabase.from('usuarios').select('correo, nombre').then(({ data: u1 }) => {
            if (u1 && u1.length > 0) {
                const m: Record<string, string> = {};
                u1.forEach((u: any) => { if (u.correo && u.nombre) m[u.correo] = u.nombre; });
                setNameMap(m);
            } else {
                const ext = createExternalClient();
                ext.from('usuarios').select('correo, nombre').then(({ data: u2 }) => {
                    if (u2) {
                        const m: Record<string, string> = {};
                        u2.forEach((u: any) => { if (u.correo && u.nombre) m[u.correo] = u.nombre; });
                        setNameMap(m);
                    }
                });
            }
        });
    }, []);

    const resolveName = (v: string | undefined) => {
        if (!v) return "—";
        if (v.includes('@') && nameMap[v]) return nameMap[v];
        return v;
    };

    // Extract unique filter options
    const years = useMemo(() => [...new Set(rawData.map(d => new Date(d.tiempoInicio).getFullYear().toString()))].sort().reverse(), [rawData]);
    const plantas = useMemo(() => [...new Set(rawData.map(d => d.planta).filter(Boolean))].sort(), [rawData]);
    const users = useMemo(() => [...new Set(rawData.map(d => resolveName(d.creadoPor)).filter(v => v !== "—"))].sort(), [rawData, nameMap]);

    const months = useMemo(() => {
        if (filterYear === "all") return [];
        const ms = new Set<number>();
        rawData.forEach(d => {
            const dt = new Date(d.tiempoInicio);
            if (dt.getFullYear().toString() === filterYear) ms.add(dt.getMonth() + 1);
        });
        return [...ms].sort((a, b) => a - b);
    }, [rawData, filterYear]);

    const days = useMemo(() => {
        if (filterYear === "all" || filterMonth === "all") return [];
        const ds = new Set<number>();
        rawData.forEach(d => {
            const dt = new Date(d.tiempoInicio);
            if (dt.getFullYear().toString() === filterYear && (dt.getMonth() + 1).toString() === filterMonth) {
                ds.add(dt.getDate());
            }
        });
        return [...ds].sort((a, b) => a - b);
    }, [rawData, filterYear, filterMonth]);

    // Apply filters
    const data = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && resolveName(d.creadoPor) !== filterUser) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterUser, nameMap]);

    const activeFilters = [filterYear, filterMonth, filterDay, filterPlanta, filterUser].filter(f => f !== "all").length;

    const clearFilters = () => {
        setFilterYear("all"); setFilterMonth("all"); setFilterDay("all");
        setFilterPlanta("all"); setFilterUser("all");
    };

    // KPIs
    const total = data.length;
    const promRend = total > 0 ? data.reduce((s, d) => s + d.rendimiento, 0) / total : 0;
    const promCal = total > 0 ? data.reduce((s, d) => s + d.calidad, 0) / total : 0;
    const hdtPct = total > 0 ? (data.filter(d => d.hdtCumple).length / total) * 100 : 0;
    const promCiclo = total > 0 ? data.reduce((s, d) => s + d.tiempoPromedio, 0) / total : 0;
    const totalDefectos = data.reduce((s, d) => s + d.piezasDefectuosas, 0);

    // Chart data: Tendencia por fecha
    const trendData = useMemo(() => {
        const sorted = [...data].sort((a, b) => a.tiempoInicio - b.tiempoInicio);
        return sorted.map((d, i) => ({
            name: format(new Date(d.tiempoInicio), "dd/MM"),
            rendimiento: Math.min(d.rendimiento, 120),
            calidad: d.calidad,
        }));
    }, [data]);

    // Chart data: Desperdicios
    const wastesData = useMemo(() => {
        const count: Record<string, number> = {};
        data.forEach(ev => (ev.desperdicios || []).forEach(w => { count[w] = (count[w] || 0) + 1; }));
        return Object.entries(count).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [data]);

    // Chart data: Evaluaciones por planta
    const plantaData = useMemo(() => {
        const count: Record<string, { total: number; rend: number; cal: number }> = {};
        data.forEach(d => {
            const p = d.planta || "N/A";
            if (!count[p]) count[p] = { total: 0, rend: 0, cal: 0 };
            count[p].total++;
            count[p].rend += d.rendimiento;
            count[p].cal += d.calidad;
        });
        return Object.entries(count).map(([name, v]) => ({
            name, total: v.total,
            rendimiento: Math.min(v.rend / v.total, 120),
            calidad: v.cal / v.total,
        }));
    }, [data]);

    // Chart data: Calidad por puesto (top 8)
    const puestoData = useMemo(() => {
        const map: Record<string, { sum: number; count: number }> = {};
        data.forEach(d => {
            const p = d.puesto || "N/A";
            if (!map[p]) map[p] = { sum: 0, count: 0 };
            map[p].sum += d.calidad;
            map[p].count++;
        });
        return Object.entries(map)
            .map(([name, v]) => ({ name, calidad: +(v.sum / v.count).toFixed(1), evaluaciones: v.count }))
            .sort((a, b) => b.evaluaciones - a.evaluaciones)
            .slice(0, 8);
    }, [data]);

    // Chart data: Top evaluadores
    const evaluadorData = useMemo(() => {
        const map: Record<string, number> = {};
        data.forEach(d => {
            const n = resolveName(d.creadoPor);
            map[n] = (map[n] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
    }, [data, nameMap]);

    // Chart data: Estado global distribution
    const estadoData = useMemo(() => {
        const map: Record<string, number> = { Verde: 0, Amarillo: 0, Rojo: 0 };
        data.forEach(d => { if (map[d.estadoGlobal] !== undefined) map[d.estadoGlobal]++; });
        return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
    }, [data]);

    const estadoColors: Record<string, string> = { Verde: '#10b981', Amarillo: '#f59e0b', Rojo: '#94a3b8' };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center">
            <header className="w-full bg-[#254153] text-white shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/hora-a-hora"><Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white"><ArrowLeft size={20} /><span className="hidden sm:inline font-bold text-lg">Estadísticas</span></Button></Link>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-2xl tracking-widest leading-none">FIRPLAK</div>
                        <div className="text-[10px] opacity-80 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl p-4 sm:p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Filter Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
                            {activeFilters > 0 && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">{activeFilters} filtro{activeFilters > 1 ? "s" : ""}</Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {activeFilters > 0 && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs gap-1 text-slate-500"><X size={14} /> Limpiar</Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1"><Filter size={14} /> Filtros</Button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-semibold">Año</Label>
                                <Select value={filterYear} onValueChange={v => { if (v !== null) { setFilterYear(v); setFilterMonth("all"); setFilterDay("all"); } }}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos</SelectItem>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-semibold">Mes</Label>
                                <Select value={filterMonth} onValueChange={v => { if (v !== null) { setFilterMonth(v); setFilterDay("all"); } }} disabled={filterYear === "all"}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos</SelectItem>{months.map(m => <SelectItem key={m} value={m.toString()}>{MONTHS[m]}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-semibold">Día</Label>
                                <Select value={filterDay} onValueChange={v => v !== null && setFilterDay(v)} disabled={filterMonth === "all"}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos</SelectItem>{days.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-semibold">Planta</Label>
                                <Select value={filterPlanta} onValueChange={v => v !== null && setFilterPlanta(v)}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todas</SelectItem>{plantas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 font-semibold">Realizado por</Label>
                                <Select value={filterUser} onValueChange={v => v !== null && setFilterUser(v)}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos</SelectItem>{users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                {total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <BarChart2 size={64} className="mb-4 opacity-20" />
                        <p className="text-xl font-medium">No hay datos con los filtros seleccionados</p>
                        <p className="text-sm">Ajusta los filtros o realiza más evaluaciones.</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: "Evaluaciones", value: total.toString(), color: "border-l-slate-500", textColor: "text-slate-700" },
                                { label: "Prom. Rendimiento", value: `${promRend.toFixed(1)}%`, color: "border-l-emerald-500", textColor: promRend >= 90 ? "text-emerald-600" : promRend >= 80 ? "text-amber-500" : "text-slate-500" },
                                { label: "Prom. Calidad", value: `${promCal.toFixed(1)}%`, color: "border-l-blue-500", textColor: promCal >= 90 ? "text-emerald-600" : promCal >= 80 ? "text-amber-500" : "text-slate-500" },
                                { label: "Cumplimiento HDT", value: `${hdtPct.toFixed(0)}%`, color: "border-l-purple-500", textColor: hdtPct >= 90 ? "text-emerald-600" : "text-amber-500" },
                                { label: "Prom. Ciclo", value: `${promCiclo.toFixed(1)}s`, color: "border-l-cyan-500", textColor: "text-cyan-600" },
                                { label: "Total Defectos", value: totalDefectos.toString(), color: "border-l-rose-400", textColor: "text-slate-600" },
                            ].map((kpi, i) => (
                                <Card key={i} className={`shadow-sm border-l-4 ${kpi.color} hover:shadow-md transition-shadow`}>
                                    <CardContent className="p-3 flex flex-col justify-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{kpi.label}</span>
                                        <span className={`text-2xl font-black ${kpi.textColor}`}>{kpi.value}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Row 1: Trend + Estado */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="shadow-md lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Tendencia Rendimiento & Calidad</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="name" fontSize={11} />
                                            <YAxis domain={[0, 120]} fontSize={11} />
                                            <Tooltip formatter={(v: any) => `${v?.toFixed(1)}%`} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Line type="monotone" dataKey="rendimiento" name="Rendimiento %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="calidad" name="Calidad %" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={18} className="text-indigo-500" /> Resultado Global</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72 flex items-center justify-center">
                                    {estadoData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={estadoData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value"
                                                    label={({ name, value }) => `${name === 'Verde' ? 'Óptimo' : name === 'Amarillo' ? 'Alerta' : 'Atención'} (${value})`} labelLine={false}>
                                                    {estadoData.map((e, i) => <Cell key={i} fill={estadoColors[e.name] || '#94a3b8'} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-sm">Sin datos</p>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 2: Desperdicios + Planta */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={18} className="text-purple-500" /> Pareto de Desperdicios</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72">
                                    {wastesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={wastesData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis type="number" fontSize={11} />
                                                <YAxis dataKey="name" type="category" fontSize={10} width={120} tick={{ fill: '#64748b' }} />
                                                <Tooltip />
                                                <Bar dataKey="value" name="Frecuencia" radius={[0, 6, 6, 0]}>
                                                    {wastesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin desperdicios registrados</div>}
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><Factory size={18} className="text-cyan-500" /> KPIs por Planta</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72">
                                    {plantaData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={plantaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis domain={[0, 120]} fontSize={11} />
                                                <Tooltip formatter={(v: any) => `${v?.toFixed(1)}%`} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Bar dataKey="rendimiento" name="Rend. %" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="calidad" name="Calidad %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos</div>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 3: Puesto + Evaluadores */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><BarChart2 size={18} className="text-amber-500" /> Calidad Promedio por Puesto</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72">
                                    {puestoData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={puestoData} margin={{ top: 5, right: 20, left: 30, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={10} angle={-25} tick={{ textAnchor: 'end' }} dx={-2} dy={5} height={60} />
                                                <YAxis domain={[0, 100]} fontSize={11} />
                                                <Tooltip formatter={(v: any) => `${v?.toFixed(1)}%`} />
                                                <Bar dataKey="calidad" name="Calidad %" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                                    {puestoData.map((d, i) => <Cell key={i} fill={d.calidad >= 90 ? '#10b981' : d.calidad >= 80 ? '#f59e0b' : '#94a3b8'} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos</div>}
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2"><Users size={18} className="text-indigo-500" /> Evaluaciones por Supervisor</CardTitle>
                                </CardHeader>
                                <CardContent className="h-72">
                                    {evaluadorData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={evaluadorData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis type="number" fontSize={11} allowDecimals={false} />
                                                <YAxis dataKey="name" type="category" fontSize={10} width={130} tick={{ fill: '#64748b' }} />
                                                <Tooltip />
                                                <Bar dataKey="value" name="Evaluaciones" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos</div>}
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
