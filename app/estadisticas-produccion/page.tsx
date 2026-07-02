"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchEvaluaciones } from "@/lib/db/horaHora";
import { EvaluacionHoraHora } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, 
    BarChart2, 
    TrendingUp, 
    ShieldAlert, 
    CheckCircle2, 
    Users, 
    ClipboardCheck, 
    Calendar,
    Activity,
    Layers,
    Filter,
    X,
    Home
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts';

const COLORS = ['#254153', '#749094', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface OPTRecord {
    ID: number;
    Título: string;
    Operario: string;
    Puesto: string;
    "Created By": string;
    Create_at: string;
    Planta: string;
    Calificación: number;
    "Elementos de seguridad": boolean;
    "Puesto con ergonomía": boolean;
    "Puesto ordenado y aseado": boolean;
    "Cumple HDT": boolean;
    "Cumple puesta a punto / plan de control": boolean;
    "Cumple 5S": boolean;
    "Producto conforme": boolean;
    "Herramientas en buen estado": boolean;
    "Operario conoce los defectos de calidad": boolean;
    "Operario conoce sus indicadores": boolean;
    VA: string;
    NVA: string;
}

export default function EstadisticasSistemaProduccion() {
    const [hhData, setHhData] = useState<EvaluacionHoraHora[]>([]);
    const [optData, setOptData] = useState<OPTRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterMonth, setFilterMonth] = useState<string>("all");
    const [filterPlanta, setFilterPlanta] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Cargar Hora a Hora
                const hhRecords = await fetchEvaluaciones().catch((err) => {
                    console.error("Error cargando Hora a Hora:", err);
                    const raw = localStorage.getItem("historialHoraHora");
                    return raw ? JSON.parse(raw) : [];
                });
                setHhData(hhRecords);

                // 2. Cargar OPT del cliente Supabase
                const supabase = createClient();
                const { data: optRecords, error: optError } = await (supabase.from("OPT") as any)
                    .select(`
                        ID, Título, Operario, Puesto, "Created By", Create_at, Planta, Calificación,
                        "Elementos de seguridad", "Puesto con ergonomía", "Puesto ordenado y aseado",
                        "Cumple HDT", "Cumple puesta a punto / plan de control", "Cumple 5S",
                        "Producto conforme", "Herramientas en buen estado", 
                        "Operario conoce los defectos de calidad", "Operario conoce sus indicadores",
                        VA, NVA
                    `)
                    .order("ID", { ascending: false });

                if (optError) {
                    console.error("Error cargando OPT:", optError);
                } else if (optRecords) {
                    setOptData(optRecords as OPTRecord[]);
                }
            } catch (err) {
                console.error("Error general cargando datos:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Extraer años y plantas únicos combinando ambos datasets
    const filterOptions = useMemo(() => {
        const yearsSet = new Set<string>();
        const plantasSet = new Set<string>();

        hhData.forEach(d => {
            if (d.tiempoInicio) yearsSet.add(new Date(d.tiempoInicio).getFullYear().toString());
            if (d.planta) plantasSet.add(d.planta);
        });

        optData.forEach(d => {
            if (d.Create_at) yearsSet.add(new Date(d.Create_at).getFullYear().toString());
            if (d.Planta) plantasSet.add(d.Planta);
        });

        return {
            years: Array.from(yearsSet).sort().reverse(),
            plantas: Array.from(plantasSet).sort()
        };
    }, [hhData, optData]);

    const cleanFilters = () => {
        setFilterYear("all");
        setFilterMonth("all");
        setFilterPlanta("all");
    };

    // Aplicar filtros a Hora a Hora
    const filteredHH = useMemo(() => {
        return hhData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterPlanta !== "all" && d.planta?.toLowerCase() !== filterPlanta.toLowerCase()) return false;
            return true;
        });
    }, [hhData, filterYear, filterMonth, filterPlanta]);

    // Aplicar filtros a OPT
    const filteredOPT = useMemo(() => {
        return optData.filter(d => {
            if (!d.Create_at) return false;
            const dt = new Date(d.Create_at);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterPlanta !== "all" && d.Planta?.toLowerCase() !== filterPlanta.toLowerCase()) return false;
            return true;
        });
    }, [optData, filterYear, filterMonth, filterPlanta]);

    // KPIs Unificados
    const kpis = useMemo(() => {
        const totalEvaluaciones = filteredHH.length + filteredOPT.length;

        // Rendimiento y calidad promedio Hora a Hora
        const promRendHH = filteredHH.length > 0 
            ? filteredHH.reduce((s, d) => s + (d.rendimiento || 0), 0) / filteredHH.length 
            : 0;
        const promCalHH = filteredHH.length > 0 
            ? filteredHH.reduce((s, d) => s + (d.calidad || 0), 0) / filteredHH.length 
            : 0;

        // Calificación promedio OPT
        const promCalificOPT = filteredOPT.length > 0
            ? filteredOPT.reduce((s, d) => s + (d.Calificación || 0), 0) / filteredOPT.length
            : 0;

        // Seguridad (OPT)
        const totalSeg = filteredOPT.filter(d => d["Elementos de seguridad"]).length;
        const cumpleSegPct = filteredOPT.length > 0 ? (totalSeg / filteredOPT.length) * 100 : 0;

        // 5S (OPT)
        const total5S = filteredOPT.filter(d => d["Cumple 5S"]).length;
        const cumple5SPct = filteredOPT.length > 0 ? (total5S / filteredOPT.length) * 100 : 0;

        return {
            totalEvaluaciones,
            totalHH: filteredHH.length,
            totalOPT: filteredOPT.length,
            promRendHH,
            promCalHH,
            promCalificOPT,
            cumpleSegPct,
            cumple5SPct
        };
    }, [filteredHH, filteredOPT]);

    // Gráfico de Barras: Comparación de Evaluaciones registradas por Planta
    const chartPlantaData = useMemo(() => {
        const plantas: Record<string, { name: string, "Hora a Hora": number, OPT: number }> = {};
        
        filteredHH.forEach(d => {
            const p = d.planta || "N/A";
            if (!plantas[p]) plantas[p] = { name: p, "Hora a Hora": 0, OPT: 0 };
            plantas[p]["Hora a Hora"]++;
        });

        filteredOPT.forEach(d => {
            const p = d.Planta || "N/A";
            if (!plantas[p]) plantas[p] = { name: p, "Hora a Hora": 0, OPT: 0 };
            plantas[p].OPT++;
        });

        return Object.values(plantas);
    }, [filteredHH, filteredOPT]);

    // Gráfico de Tendencia Unificada (Rendimiento HH vs Calificación OPT por Mes)
    const chartTrendData = useMemo(() => {
        const meses: Record<string, { name: string, rendimiento: number, optScore: number, countHH: number, countOPT: number }> = {};
        
        // Inicializar últimos 6 meses si es posible o usar los datos disponibles
        filteredHH.forEach(d => {
            const dt = new Date(d.tiempoInicio);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!meses[key]) {
                meses[key] = { name: `${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`, rendimiento: 0, optScore: 0, countHH: 0, countOPT: 0 };
            }
            meses[key].rendimiento += (d.rendimiento || 0);
            meses[key].countHH++;
        });

        filteredOPT.forEach(d => {
            const dt = new Date(d.Create_at);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!meses[key]) {
                meses[key] = { name: `${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`, rendimiento: 0, optScore: 0, countHH: 0, countOPT: 0 };
            }
            meses[key].optScore += (d.Calificación || 0);
            meses[key].countOPT++;
        });

        return Object.entries(meses)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, v]) => ({
                name: v.name.split(" ")[0], // solo el nombre del mes
                "Rendimiento (Hora a Hora)": v.countHH > 0 ? Math.round(v.rendimiento / v.countHH) : null,
                "Calificación (OPT)": v.countOPT > 0 ? Math.round(v.optScore / v.countOPT) : null
            }));
    }, [filteredHH, filteredOPT]);

    // Gráfico Radar de Cumplimiento de Parámetros OPT
    const parameterCompliance = useMemo(() => {
        const total = filteredOPT.length;
        if (total === 0) return [];
        
        let seg = 0, erg = 0, ord = 0, hdt = 0, pc = 0, s5 = 0, prod = 0, herr = 0, def = 0, ind = 0;
        
        filteredOPT.forEach(r => {
            if (r["Elementos de seguridad"]) seg++;
            if (r["Puesto con ergonomía"]) erg++;
            if (r["Puesto ordenado y aseado"]) ord++;
            if (r["Cumple HDT"]) hdt++;
            if (r["Cumple puesta a punto / plan de control"]) pc++;
            if (r["Cumple 5S"]) s5++;
            if (r["Producto conforme"]) prod++;
            if (r["Herramientas en buen estado"]) herr++;
            if (r["Operario conoce los defectos de calidad"]) def++;
            if (r["Operario conoce sus indicadores"]) ind++;
        });

        return [
            { subject: 'Seguridad', A: Math.round((seg / total) * 100), fullMark: 100 },
            { subject: 'Ergonomía', A: Math.round((erg / total) * 100), fullMark: 100 },
            { subject: 'Orden/Aseo', A: Math.round((ord / total) * 100), fullMark: 100 },
            { subject: 'HDT', A: Math.round((hdt / total) * 100), fullMark: 100 },
            { subject: 'Plan de Control', A: Math.round((pc / total) * 100), fullMark: 100 },
            { subject: '5S', A: Math.round((s5 / total) * 100), fullMark: 100 },
            { subject: 'Producto Conforme', A: Math.round((prod / total) * 100), fullMark: 100 },
            { subject: 'Herramientas', A: Math.round((herr / total) * 100), fullMark: 100 },
            { subject: 'Conoc. Defectos', A: Math.round((def / total) * 100), fullMark: 100 },
            { subject: 'Conoc. Indicadores', A: Math.round((ind / total) * 100), fullMark: 100 },
        ];
    }, [filteredOPT]);

    // Gráfico de Torta: Distribución del Estado Global de Hora a Hora
    const hhEstadoData = useMemo(() => {
        const map: Record<string, number> = { Verde: 0, Amarillo: 0, Rojo: 0 };
        filteredHH.forEach(d => {
            if (d.estadoGlobal && map[d.estadoGlobal] !== undefined) {
                map[d.estadoGlobal]++;
            }
        });
        return Object.entries(map)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [filteredHH]);

    const estadoColors: Record<string, string> = { Verde: '#10b981', Amarillo: '#f59e0b', Rojo: '#ef4444' };

    // Gráfico de Desperdicios Hora a Hora (Top 5)
    const wastesData = useMemo(() => {
        const count: Record<string, number> = {};
        filteredHH.forEach(ev => {
            (ev.desperdicios || []).forEach(w => {
                count[w] = (count[w] || 0) + 1;
            });
        });
        return Object.entries(count)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredHH]);

    const activeFiltersCount = [filterYear, filterMonth, filterPlanta].filter(f => f !== "all").length;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]"></div>
                    <p className="text-slate-600 font-medium">Cargando estadísticas del sistema...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="w-full bg-[#254153] text-white shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline font-bold">Volver al Home</span>
                        </Button>
                    </Link>
                    <h1 className="font-bold text-lg md:text-xl uppercase tracking-wider">
                        Estadísticas Sistema de Producción
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl tracking-wider leading-none">FIRPLAK</div>
                        <div className="text-[9px] opacity-70 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-20 space-y-6">
                
                {/* Filtros */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-[#254153]" />
                            <h2 className="font-bold text-[#254153]">Filtros Generales</h2>
                            {activeFiltersCount > 0 && (
                                <Badge className="bg-[#254153] text-white ml-2">
                                    {activeFiltersCount} activo{activeFiltersCount > 1 ? "s" : ""}
                                </Badge>
                            )}
                        </div>
                        {activeFiltersCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={cleanFilters}
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 gap-1"
                            >
                                <X size={14} /> Limpiar Filtros
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold">Año</Label>
                            <Select value={filterYear} onValueChange={(val) => setFilterYear(val || "all")}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {filterOptions.years.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold">Mes</Label>
                            <Select value={filterMonth} onValueChange={(val) => setFilterMonth(val || "all")}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {MONTHS.map((m, idx) => idx > 0 ? (
                                        <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>
                                    ) : null)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold">Planta</Label>
                            <Select value={filterPlanta} onValueChange={(val) => setFilterPlanta(val || "all")}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {filterOptions.plantas.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="general" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-slate-200/60 p-1 rounded-xl">
                        <TabsTrigger value="general" className="rounded-lg font-bold data-[state=active]:bg-[#254153] data-[state=active]:text-white">
                            Resumen Unificado
                        </TabsTrigger>
                        <TabsTrigger value="horahora" className="rounded-lg font-bold data-[state=active]:bg-[#254153] data-[state=active]:text-white">
                            Métricas Hora a Hora
                        </TabsTrigger>
                        <TabsTrigger value="opt" className="rounded-lg font-bold data-[state=active]:bg-[#254153] data-[state=active]:text-white">
                            Métricas OPT
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Resumen General */}
                    <TabsContent value="general" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#254153]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluaciones Totales</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalEvaluaciones}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">HH: {kpis.totalHH} | OPT: {kpis.totalOPT}</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-emerald-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rendimiento Prom.</span>
                                    <span className="text-3xl font-black text-emerald-600 mt-1">{kpis.promRendHH.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Meta: &ge;90%</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-blue-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calidad Prom. (HH)</span>
                                    <span className="text-3xl font-black text-blue-600 mt-1">{kpis.promCalHH.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Muestras Hora a Hora</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-indigo-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puntaje OPT Prom.</span>
                                    <span className="text-3xl font-black text-indigo-600 mt-1">{kpis.promCalificOPT.toFixed(0)}/100</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Calificación de conducta</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-orange-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumplimiento Seguridad</span>
                                    <span className="text-3xl font-black text-orange-600 mt-1">{kpis.cumpleSegPct.toFixed(0)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">EPP en OPTs</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Unificados */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Comparativa por planta */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Distribución de Evaluaciones por Planta</CardTitle>
                                    <CardDescription>Cantidad de registros en el periodo seleccionado</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {chartPlantaData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartPlantaData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend iconSize={12} iconType="circle" />
                                                <Bar dataKey="Hora a Hora" fill="#254153" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="OPT" fill="#749094" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tendencia cruzada */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Tendencia: Rendimiento vs Calificación OPT</CardTitle>
                                    <CardDescription>Evolución mensual comparativa</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {chartTrendData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartTrendData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend iconSize={12} iconType="circle" />
                                                <Line type="monotone" dataKey="Rendimiento (Hora a Hora)" stroke="#254153" strokeWidth={3} activeDot={{ r: 6 }} connectNulls />
                                                <Line type="monotone" dataKey="Calificación (OPT)" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Métricas Hora a Hora */}
                    <TabsContent value="horahora" className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Distribución Estado Global */}
                            <Card className="shadow-sm border border-slate-200 lg:col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Estado Global Evaluaciones</CardTitle>
                                    <CardDescription>Distribución de estados (Semáforo)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-64 flex flex-col items-center justify-center">
                                    {hhEstadoData.length === 0 ? (
                                        <div className="text-slate-400">Sin datos</div>
                                    ) : (
                                        <>
                                            <div className="w-full h-44">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={hhEstadoData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                        >
                                                            {hhEstadoData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={estadoColors[entry.name] || '#64748b'} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex gap-4 text-xs font-semibold mt-2">
                                                {hhEstadoData.map(entry => (
                                                    <div key={entry.name} className="flex items-center gap-1.5">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: estadoColors[entry.name] }}></div>
                                                        <span>{entry.name}: {entry.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Top Desperdicios */}
                            <Card className="shadow-sm border border-slate-200 lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Principales Motivos de Desperdicios</CardTitle>
                                    <CardDescription>Incidencias más reportadas</CardDescription>
                                </CardHeader>
                                <CardContent className="h-64">
                                    {wastesData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin desperdicios registrados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={wastesData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="value" fill="#749094" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                        </div>

                        {/* Evolución Temporal de Hora a Hora */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-bold text-[#254153]">Evolución del Rendimiento y Calidad</CardTitle>
                                <CardDescription>Histórico detallado de las evaluaciones en planta</CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {filteredHH.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart 
                                            data={filteredHH.slice().reverse().map(d => ({
                                                fecha: format(new Date(d.tiempoInicio), "dd/MM"),
                                                Rendimiento: d.rendimiento,
                                                Calidad: d.calidad
                                            }))} 
                                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorRend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#254153" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#254153" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} />
                                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Legend iconSize={12} iconType="circle" />
                                            <Area type="monotone" dataKey="Rendimiento" stroke="#254153" strokeWidth={2} fillOpacity={1} fill="url(#colorRend)" />
                                            <Area type="monotone" dataKey="Calidad" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: Métricas OPT */}
                    <TabsContent value="opt" className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Radar de Cumplimiento de Parámetros */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Cumplimiento por Parámetro</CardTitle>
                                    <CardDescription>Tasa de aprobación (%) en auditorías de conducta</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80 flex items-center justify-center">
                                    {parameterCompliance.length === 0 ? (
                                        <div className="text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={parameterCompliance}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                                                <Radar name="Aprobación %" dataKey="A" stroke="#254153" fill="#254153" fillOpacity={0.3} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Promedio Calificación por Planta */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#254153]">Puntaje OPT Promedio por Planta</CardTitle>
                                    <CardDescription>Comportamientos seguros por sección</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {filteredOPT.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={Object.entries(
                                                    filteredOPT.reduce((acc, curr) => {
                                                        const p = curr.Planta || 'Desconocida';
                                                        if (!acc[p]) acc[p] = { total: 0, count: 0 };
                                                        acc[p].total += (curr.Calificación || 0);
                                                        acc[p].count++;
                                                        return acc;
                                                    }, {} as Record<string, { total: number, count: number }>)
                                                ).map(([name, data]) => ({
                                                    name,
                                                    Puntaje: Math.round(data.total / data.count)
                                                }))}
                                                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="Puntaje" fill="#749094" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {parameterCompliance.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                        </div>
                    </TabsContent>
                </Tabs>

            </main>

            {/* Sticky Home Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <Link
                    href="/"
                    className="w-14 h-14 bg-[#254153] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Home size={28} />
                </Link>
            </div>
        </div>
    );
}
