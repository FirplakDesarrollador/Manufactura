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

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const getWeekNumberSafe = (dateVal: any) => {
    if (!dateVal) return 0;
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 0;
        return getWeekNumber(d);
    } catch {
        return 0;
    }
};

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

interface OPTSistemicaRecord {
    created_at: string;
    percentage: number;
    user_email: string;
    modulo_tipo: string;
}

interface HDTRecord {
    id: string;
    codigo: string;
    proceso: string | null;
    labor: string | null;
    version: number | null;
    fecha_elaboracion: string | null;
    elaboro: string | null;
    planta: string | null;
}


export default function EstadisticasSistemaProduccion() {
    const [hhData, setHhData] = useState<EvaluacionHoraHora[]>([]);
    const [optData, setOptData] = useState<OPTRecord[]>([]);
    const [optSistemicaData, setOptSistemicaData] = useState<OPTSistemicaRecord[]>([]);
    const [hdtData, setHdtData] = useState<HDTRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterMonth, setFilterMonth] = useState<string>("all");
    const [filterPlanta, setFilterPlanta] = useState<string>("all");
    const [filterWeek, setFilterWeek] = useState<string>("all");
    const [filterPersona, setFilterPersona] = useState<string>("all");
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

                // 3. Cargar OPT Sistémica (opt_registros)
                const { data: optSistemicaRecords, error: optSistemicaError } = await supabase
                    .from("opt_registros")
                    .select("created_at, percentage, user_email, modulo_tipo")
                    .order("created_at", { ascending: false });

                if (optSistemicaError) {
                    console.error("Error cargando OPT Sistémica:", optSistemicaError);
                } else if (optSistemicaRecords) {
                    setOptSistemicaData(optSistemicaRecords as OPTSistemicaRecord[]);
                }

                // 4. Cargar HDT (hdts)
                const { data: hdtRecords, error: hdtError } = await supabase
                    .from("hdts")
                    .select("id, codigo, proceso, labor, version, fecha_elaboracion, elaboro, planta")
                    .order("updated_at", { ascending: false });

                if (hdtError) {
                    console.error("Error cargando HDT:", hdtError);
                } else if (hdtRecords) {
                    setHdtData(hdtRecords as HDTRecord[]);
                }
            } catch (err) {
                console.error("Error general cargando datos:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Extraer años, plantas, semanas y personas únicos combinando todos los datasets
    const filterOptions = useMemo(() => {
        const yearsSet = new Set<string>();
        const plantasSet = new Set<string>();
        const weeksSet = new Set<string>();
        const personasSet = new Set<string>();

        hhData.forEach(d => {
            if (d.tiempoInicio) {
                const dt = new Date(d.tiempoInicio);
                yearsSet.add(dt.getFullYear().toString());
                weeksSet.add(getWeekNumberSafe(d.tiempoInicio).toString());
            }
            if (d.planta) plantasSet.add(d.planta);
            if (d.creadoPor) personasSet.add(d.creadoPor.trim());
        });

        optData.forEach(d => {
            if (d.Create_at) {
                const dt = new Date(d.Create_at);
                yearsSet.add(dt.getFullYear().toString());
                weeksSet.add(getWeekNumberSafe(d.Create_at).toString());
            }
            if (d.Planta) plantasSet.add(d.Planta);
            if (d["Created By"]) personasSet.add(d["Created By"].trim());
        });

        optSistemicaData.forEach(d => {
            if (d.created_at) {
                const dt = new Date(d.created_at);
                yearsSet.add(dt.getFullYear().toString());
                weeksSet.add(getWeekNumberSafe(d.created_at).toString());
            }
            if (d.user_email) personasSet.add(d.user_email.trim());
        });

        hdtData.forEach(d => {
            if (d.fecha_elaboracion) {
                try {
                    const dt = new Date(d.fecha_elaboracion);
                    if (!isNaN(dt.getTime())) {
                        yearsSet.add(dt.getFullYear().toString());
                        weeksSet.add(getWeekNumberSafe(d.fecha_elaboracion).toString());
                    }
                } catch {}
            }
            if (d.planta) plantasSet.add(d.planta);
            if (d.elaboro) personasSet.add(d.elaboro.trim());
        });

        return {
            years: Array.from(yearsSet).sort().reverse(),
            plantas: Array.from(plantasSet).sort(),
            weeks: Array.from(weeksSet).sort((a, b) => parseInt(a) - parseInt(b)),
            personas: Array.from(personasSet).sort()
        };
    }, [hhData, optData, optSistemicaData, hdtData]);

    const cleanFilters = () => {
        setFilterYear("all");
        setFilterMonth("all");
        setFilterPlanta("all");
        setFilterWeek("all");
        setFilterPersona("all");
    };

    // Aplicar filtros a Hora a Hora
    const filteredHH = useMemo(() => {
        return hhData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterPlanta !== "all" && d.planta?.toLowerCase() !== filterPlanta.toLowerCase()) return false;
            if (filterWeek !== "all" && getWeekNumberSafe(d.tiempoInicio).toString() !== filterWeek) return false;
            if (filterPersona !== "all" && d.creadoPor?.trim() !== filterPersona) return false;
            return true;
        });
    }, [hhData, filterYear, filterMonth, filterPlanta, filterWeek, filterPersona]);

    // Aplicar filtros a OPT
    const filteredOPT = useMemo(() => {
        return optData.filter(d => {
            if (!d.Create_at) return false;
            const dt = new Date(d.Create_at);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterPlanta !== "all" && d.Planta?.toLowerCase() !== filterPlanta.toLowerCase()) return false;
            if (filterWeek !== "all" && getWeekNumberSafe(d.Create_at).toString() !== filterWeek) return false;
            if (filterPersona !== "all" && d["Created By"]?.trim() !== filterPersona) return false;
            return true;
        });
    }, [optData, filterYear, filterMonth, filterPlanta, filterWeek, filterPersona]);

    // Aplicar filtros a OPT Sistémica
    const filteredOPTSistemica = useMemo(() => {
        return optSistemicaData.filter(d => {
            if (!d.created_at) return false;
            const dt = new Date(d.created_at);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterWeek !== "all" && getWeekNumberSafe(d.created_at).toString() !== filterWeek) return false;
            if (filterPersona !== "all" && d.user_email?.trim() !== filterPersona) return false;
            return true;
        });
    }, [optSistemicaData, filterYear, filterMonth, filterWeek, filterPersona]);

    // Aplicar filtros a HDT
    const filteredHDT = useMemo(() => {
        return hdtData.filter(d => {
            if (filterPlanta !== "all" && d.planta?.toLowerCase() !== filterPlanta.toLowerCase()) return false;
            if (filterPersona !== "all" && d.elaboro?.trim() !== filterPersona) return false;
            if (d.fecha_elaboracion) {
                try {
                    const dt = new Date(d.fecha_elaboracion);
                    if (!isNaN(dt.getTime())) {
                        if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
                        if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
                        if (filterWeek !== "all" && getWeekNumberSafe(d.fecha_elaboracion).toString() !== filterWeek) return false;
                    }
                } catch {}
            }
            return true;
        });
    }, [hdtData, filterYear, filterMonth, filterPlanta, filterWeek, filterPersona]);

    // KPIs Unificados
    const kpis = useMemo(() => {
        const totalEvaluaciones = filteredHH.length + filteredOPT.length + filteredOPTSistemica.length + filteredHDT.length;

        // Rendimiento y calidad promedio Hora a Hora
        const promRendHH = filteredHH.length > 0 
            ? filteredHH.reduce((s, d) => s + (d.rendimiento || 0), 0) / filteredHH.length 
            : 0;
        const promCalHH = filteredHH.length > 0 
            ? filteredHH.reduce((s, d) => s + (d.calidad || 0), 0) / filteredHH.length 
            : 0;

        // Calificación promedio OPT Operativa
        const promCalificOPT = filteredOPT.length > 0
            ? filteredOPT.reduce((s, d) => s + (d.Calificación || 0), 0) / filteredOPT.length
            : 0;

        // Calificación promedio OPT Sistémica
        const promOPTSistPct = filteredOPTSistemica.length > 0
            ? filteredOPTSistemica.reduce((s, d) => s + (d.percentage || 0), 0) / filteredOPTSistemica.length
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
            totalOPTSist: filteredOPTSistemica.length,
            totalHDT: filteredHDT.length,
            promRendHH,
            promCalHH,
            promCalificOPT,
            promOPTSistPct,
            cumpleSegPct,
            cumple5SPct
        };
    }, [filteredHH, filteredOPT, filteredOPTSistemica, filteredHDT]);

    // Gráfico de Barras: Comparación de Evaluaciones registradas por Planta
    const chartPlantaData = useMemo(() => {
        const plantas: Record<string, { name: string, "Hora a Hora": number, "OPT Operativa": number, HDT: number }> = {};
        
        filteredHH.forEach(d => {
            const p = d.planta || "N/A";
            if (!plantas[p]) plantas[p] = { name: p, "Hora a Hora": 0, "OPT Operativa": 0, HDT: 0 };
            plantas[p]["Hora a Hora"]++;
        });

        filteredOPT.forEach(d => {
            const p = d.Planta || "N/A";
            if (!plantas[p]) plantas[p] = { name: p, "Hora a Hora": 0, "OPT Operativa": 0, HDT: 0 };
            plantas[p]["OPT Operativa"]++;
        });

        filteredHDT.forEach(d => {
            const p = d.planta || "N/A";
            if (!plantas[p]) plantas[p] = { name: p, "Hora a Hora": 0, "OPT Operativa": 0, HDT: 0 };
            plantas[p].HDT++;
        });

        return Object.values(plantas);
    }, [filteredHH, filteredOPT, filteredHDT]);

    // Gráfico de Tendencia Unificada (Rendimiento HH vs Calificación OPT Operativa vs OPT Sistémica por Mes)
    const chartTrendData = useMemo(() => {
        const meses: Record<string, { name: string, rendimiento: number, optScore: number, optSistScore: number, countHH: number, countOPT: number, countOPTSist: number }> = {};
        
        filteredHH.forEach(d => {
            const dt = new Date(d.tiempoInicio);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!meses[key]) {
                meses[key] = { name: `${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`, rendimiento: 0, optScore: 0, optSistScore: 0, countHH: 0, countOPT: 0, countOPTSist: 0 };
            }
            meses[key].rendimiento += (d.rendimiento || 0);
            meses[key].countHH++;
        });

        filteredOPT.forEach(d => {
            const dt = new Date(d.Create_at);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!meses[key]) {
                meses[key] = { name: `${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`, rendimiento: 0, optScore: 0, optSistScore: 0, countHH: 0, countOPT: 0, countOPTSist: 0 };
            }
            meses[key].optScore += (d.Calificación || 0);
            meses[key].countOPT++;
        });

        filteredOPTSistemica.forEach(d => {
            const dt = new Date(d.created_at);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!meses[key]) {
                meses[key] = { name: `${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`, rendimiento: 0, optScore: 0, optSistScore: 0, countHH: 0, countOPT: 0, countOPTSist: 0 };
            }
            meses[key].optSistScore += (d.percentage || 0);
            meses[key].countOPTSist++;
        });

        return Object.entries(meses)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, v]) => ({
                name: v.name.split(" ")[0], // solo el nombre del mes
                "Rendimiento (Hora a Hora)": v.countHH > 0 ? Math.round(v.rendimiento / v.countHH) : null,
                "Calificación (OPT Operativa)": v.countOPT > 0 ? Math.round(v.optScore / v.countOPT) : null,
                "Cumplimiento (OPT Sistémica)": v.countOPTSist > 0 ? Math.round(v.optSistScore / v.countOPTSist) : null
            }));
    }, [filteredHH, filteredOPT, filteredOPTSistemica]);

    // Gráfico Radar de Cumplimiento de Parámetros OPT Operativa
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

    // Gráfica por Persona: cantidad de herramientas realizadas por persona
    const chartPersonaData = useMemo(() => {
        const counts: Record<string, { name: string, "Hora a Hora": number, "OPT Operativa": number, "OPT Sistémica": number, HDT: number, Total: number }> = {};
        
        filteredHH.forEach(d => {
            const creator = d.creadoPor?.trim() || "Desconocido";
            if (!counts[creator]) counts[creator] = { name: creator, "Hora a Hora": 0, "OPT Operativa": 0, "OPT Sistémica": 0, HDT: 0, Total: 0 };
            counts[creator]["Hora a Hora"]++;
            counts[creator].Total++;
        });
        
        filteredOPT.forEach(d => {
            const creator = d["Created By"]?.trim() || "Desconocido";
            if (!counts[creator]) counts[creator] = { name: creator, "Hora a Hora": 0, "OPT Operativa": 0, "OPT Sistémica": 0, HDT: 0, Total: 0 };
            counts[creator]["OPT Operativa"]++;
            counts[creator].Total++;
        });

        filteredOPTSistemica.forEach(d => {
            const creator = d.user_email?.trim() || "Desconocido";
            if (!counts[creator]) counts[creator] = { name: creator, "Hora a Hora": 0, "OPT Operativa": 0, "OPT Sistémica": 0, HDT: 0, Total: 0 };
            counts[creator]["OPT Sistémica"]++;
            counts[creator].Total++;
        });

        filteredHDT.forEach(d => {
            const creator = d.elaboro?.trim() || "Desconocido";
            if (!counts[creator]) counts[creator] = { name: creator, "Hora a Hora": 0, "OPT Operativa": 0, "OPT Sistémica": 0, HDT: 0, Total: 0 };
            counts[creator].HDT++;
            counts[creator].Total++;
        });
        
        return Object.values(counts).sort((a, b) => b.Total - a.Total).slice(0, 10);
    }, [filteredHH, filteredOPT, filteredOPTSistemica, filteredHDT]);

    // Desempeño Promedio por Planta: Rendimiento, Calidad HH y Calificación OPT Operativa
    const chartPlantaPerfData = useMemo(() => {
        const stats: Record<string, { name: string, hhCount: number, hhRendTotal: number, hhCalTotal: number, optCount: number, optCalificTotal: number }> = {};
        
        filteredHH.forEach(d => {
            const p = d.planta || "N/A";
            if (!stats[p]) stats[p] = { name: p, hhCount: 0, hhRendTotal: 0, hhCalTotal: 0, optCount: 0, optCalificTotal: 0 };
            stats[p].hhRendTotal += (d.rendimiento || 0);
            stats[p].hhCalTotal += (d.calidad || 0);
            stats[p].hhCount++;
        });

        filteredOPT.forEach(d => {
            const p = d.Planta || "N/A";
            if (!stats[p]) stats[p] = { name: p, hhCount: 0, hhRendTotal: 0, hhCalTotal: 0, optCount: 0, optCalificTotal: 0 };
            stats[p].optCalificTotal += (d.Calificación || 0);
            stats[p].optCount++;
        });

        return Object.values(stats).map(s => ({
            name: s.name,
            "Rendimiento Prom. HH (%)": s.hhCount > 0 ? Math.round(s.hhRendTotal / s.hhCount) : 0,
            "Calidad Prom. HH (%)": s.hhCount > 0 ? Math.round(s.hhCalTotal / s.hhCount) : 0,
            "Calificación Prom. OPT (%)": s.optCount > 0 ? Math.round(s.optCalificTotal / s.optCount) : 0
        }));
    }, [filteredHH, filteredOPT]);

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

    // Cumplimiento Promedio por Módulo de OPT Sistémica
    const optSistModuloData = useMemo(() => {
        const stats: Record<string, { total: number, count: number }> = {};
        filteredOPTSistemica.forEach(d => {
            const mod = d.modulo_tipo || "General";
            if (!stats[mod]) stats[mod] = { total: 0, count: 0 };
            stats[mod].total += (d.percentage || 0);
            stats[mod].count++;
        });
        const friendlyNames: Record<string, string> = {
            "5s": "5S",
            "be": "Búsqueda Eliminación",
            "af": "Análisis Fallas",
            "te": "Tarjetas Excelencia",
            "ee": "Entorno Ergonómico",
            "gi": "Gestión Ideas",
            "opt": "Observación Conducta",
            "bitacora": "Bitácora"
        };
        return Object.entries(stats).map(([k, v]) => ({
            name: friendlyNames[k] || k.toUpperCase(),
            Cumplimiento: Math.round(v.total / v.count),
            Cantidad: v.count
        }));
    }, [filteredOPTSistemica]);

    // Cantidad de HDTs por Planta (Requerimiento de usuario)
    const hdtPlantaData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredHDT.forEach(d => {
            const p = d.planta || "Sin Planta";
            counts[p] = (counts[p] || 0) + 1;
        });
        return Object.entries(counts).map(([name, Cantidad]) => ({
            name,
            Cantidad
        })).sort((a, b) => b.Cantidad - a.Cantidad);
    }, [filteredHDT]);

    // Cantidad de HDTs por Autor/Creador
    const hdtCreatorData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredHDT.forEach(d => {
            const c = d.elaboro?.trim() || "Desconocido";
            counts[c] = (counts[c] || 0) + 1;
        });
        return Object.entries(counts).map(([name, Cantidad]) => ({
            name,
            Cantidad
        })).sort((a, b) => b.Cantidad - a.Cantidad).slice(0, 5);
    }, [filteredHDT]);

    const activeFiltersCount = [filterYear, filterMonth, filterPlanta].filter(f => f !== "all").length;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
                    <p className="text-slate-600 font-medium font-sans">Cargando estadísticas del sistema...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
            {/* Header */}
            <header className="w-full bg-[#324354] text-white shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/home">
                        <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline font-bold">Volver a Producción</span>
                        </Button>
                    </Link>
                    <h1 className="font-display font-light text-lg md:text-xl uppercase tracking-widest">
                        Estadísticas del Sistema
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
                            <Filter size={18} className="text-[#324354]" />
                            <h2 className="font-bold text-[#324354]">Filtros Generales</h2>
                            {activeFiltersCount > 0 && (
                                <Badge className="bg-[#324354] text-white ml-2">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold">Semana</Label>
                            <Select value={filterWeek} onValueChange={(val) => setFilterWeek(val || "all")}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {filterOptions.weeks.map(w => (
                                        <SelectItem key={w} value={w}>Semana {w}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold">Persona</Label>
                            <Select value={filterPersona} onValueChange={(val) => setFilterPersona(val || "all")}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {filterOptions.personas.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="general" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto bg-slate-200/60 p-1 rounded-xl gap-1">
                        <TabsTrigger value="general" className="rounded-lg font-bold py-2.5 data-[state=active]:bg-[#324354] data-[state=active]:text-white text-xs sm:text-sm">
                            Unificada
                        </TabsTrigger>
                        <TabsTrigger value="horahora" className="rounded-lg font-bold py-2.5 data-[state=active]:bg-[#324354] data-[state=active]:text-white text-xs sm:text-sm">
                            Hora Hora
                        </TabsTrigger>
                        <TabsTrigger value="opt_operativa" className="rounded-lg font-bold py-2.5 data-[state=active]:bg-[#324354] data-[state=active]:text-white text-xs sm:text-sm">
                            OPT Operativa
                        </TabsTrigger>
                        <TabsTrigger value="opt_sistemica" className="rounded-lg font-bold py-2.5 data-[state=active]:bg-[#324354] data-[state=active]:text-white text-xs sm:text-sm">
                            OPT Sistémica
                        </TabsTrigger>
                        <TabsTrigger value="hdt" className="rounded-lg font-bold py-2.5 data-[state=active]:bg-[#324354] data-[state=active]:text-white text-xs sm:text-sm">
                            HDT
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Resumen General */}
                    <TabsContent value="general" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#324354]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluaciones Totales</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalEvaluaciones}</span>
                                    <span className="text-[9px] text-slate-400 mt-1 leading-tight">
                                        HH: {kpis.totalHH} | OPT Op: {kpis.totalOPT}<br />
                                        OPT Sis: {kpis.totalOPTSist} | HDT: {kpis.totalHDT}
                                    </span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-emerald-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rendimiento Prom. (HH)</span>
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
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puntaje OPT Operativa</span>
                                    <span className="text-3xl font-black text-indigo-600 mt-1">{kpis.promCalificOPT.toFixed(0)}/100</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Calificación de conducta</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-purple-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumplimiento OPT Sistémica</span>
                                    <span className="text-3xl font-black text-purple-600 mt-1">{kpis.promOPTSistPct.toFixed(0)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Evaluación de módulos</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Unificados */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Comparativa por planta */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Distribución de Registros por Planta</CardTitle>
                                    <CardDescription>Cantidad de herramientas registradas en secciones</CardDescription>
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
                                                <Bar dataKey="Hora a Hora" fill="#324354" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="OPT Operativa" fill="#7B8E90" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="HDT" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tendencia cruzada */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Tendencia Histórica Comparativa</CardTitle>
                                    <CardDescription>Rendimiento (HH) vs Conducta (OPT Op) vs Cumplimiento (OPT Sis)</CardDescription>
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
                                                <Line type="monotone" dataKey="Rendimiento (Hora a Hora)" stroke="#324354" strokeWidth={3} activeDot={{ r: 6 }} connectNulls />
                                                <Line type="monotone" dataKey="Calificación (OPT Operativa)" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} connectNulls />
                                                <Line type="monotone" dataKey="Cumplimiento (OPT Sistémica)" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 6 }} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Nuevas Estadísticas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfica por Persona */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Desempeño de Registros por Persona (Top 10)</CardTitle>
                                    <CardDescription>Cantidad acumulada de registros por supervisor/auditor</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[450px]">
                                    {chartPersonaData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartPersonaData} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                                                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={150} interval={0} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend iconSize={12} iconType="circle" />
                                                <Bar dataKey="Hora a Hora" stackId="a" fill="#324354" />
                                                <Bar dataKey="OPT Operativa" stackId="a" fill="#7B8E90" />
                                                <Bar dataKey="OPT Sistémica" stackId="a" fill="#a855f7" />
                                                <Bar dataKey="HDT" stackId="a" fill="#3b82f6" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Desempeño Promedio por Planta */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Rendimiento y Calidad Promedio por Planta</CardTitle>
                                    <CardDescription>Comparativa agregada de desempeño y calidad de procesos</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[450px]">
                                    {chartPlantaPerfData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartPlantaPerfData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend iconSize={12} iconType="circle" />
                                                <Bar dataKey="Rendimiento Prom. HH (%)" fill="#324354" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Calidad Prom. HH (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Calificación Prom. OPT (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="horahora" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs específicos de Hora a Hora */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#324354]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Auditorías Hora a Hora</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalHH}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Registros del periodo</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-emerald-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rendimiento Promedio</span>
                                    <span className="text-3xl font-black text-emerald-600 mt-1">{kpis.promRendHH.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Meta general: &ge;90%</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-blue-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calidad Promedio</span>
                                    <span className="text-3xl font-black text-blue-600 mt-1">{kpis.promCalHH.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Piezas conformes</span>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Distribución Estado Global */}
                            <Card className="shadow-sm border border-slate-200 lg:col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Estado Global Evaluaciones</CardTitle>
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
                                    <CardTitle className="text-lg font-bold text-[#324354]">Principales Motivos de Desperdicios</CardTitle>
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
                                                <Bar dataKey="value" fill="#7B8E90" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                        </div>

                        {/* Evolución Temporal de Hora a Hora */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-bold text-[#324354]">Evolución del Rendimiento y Calidad</CardTitle>
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
                                                    <stop offset="5%" stopColor="#324354" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#324354" stopOpacity={0}/>
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
                                            <Area type="monotone" dataKey="Rendimiento" stroke="#324354" strokeWidth={2} fillOpacity={1} fill="url(#colorRend)" />
                                            <Area type="monotone" dataKey="Calidad" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: Métricas OPT Operativa */}
                    <TabsContent value="opt_operativa" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs específicos de OPT Operativa */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#324354]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluaciones OPT Op.</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalOPT}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Registros del periodo</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-indigo-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calificación Promedio</span>
                                    <span className="text-3xl font-black text-indigo-600 mt-1">{kpis.promCalificOPT.toFixed(0)}/100</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Comportamiento seguro</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-orange-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumplimiento Seguridad</span>
                                    <span className="text-3xl font-black text-orange-600 mt-1">{kpis.cumpleSegPct.toFixed(0)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Tasa de uso de EPP</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-emerald-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumplimiento 5S</span>
                                    <span className="text-3xl font-black text-emerald-600 mt-1">{kpis.cumple5SPct.toFixed(0)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Orden y Limpieza</span>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Radar de Cumplimiento de Parámetros */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Cumplimiento por Parámetro (Auditoría Conducta)</CardTitle>
                                    <CardDescription>Tasa de aprobación (%) por elemento evaluado</CardDescription>
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
                                                <Radar name="Aprobación %" dataKey="A" stroke="#324354" fill="#324354" fillOpacity={0.3} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Promedio Calificación por Planta */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Puntaje OPT Promedio por Sección</CardTitle>
                                    <CardDescription>Comportamientos seguros promedio por planta</CardDescription>
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
                                                <Bar dataKey="Puntaje" fill="#7B8E90" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {filteredOPT.map((entry, index) => (
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

                    {/* Tab 4: Métricas OPT Sistémica */}
                    <TabsContent value="opt_sistemica" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs específicos de OPT Sistémica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#324354]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Auditorías Realizadas (OPT Sistémica)</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalOPTSist}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Registros totales acumulados</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-purple-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumplimiento Promedio Global</span>
                                    <span className="text-3xl font-black text-purple-600 mt-1">{kpis.promOPTSistPct.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Promedio ponderado de respuestas</span>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cumplimiento Promedio por Módulo */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Cumplimiento por Módulo</CardTitle>
                                    <CardDescription>Porcentaje promedio de cumplimiento en cada módulo evaluado</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {optSistModuloData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={optSistModuloData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="Cumplimiento" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={35}>
                                                    {optSistModuloData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Distribución de Evaluaciones por Módulo */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Auditorías por Módulo (Cantidad)</CardTitle>
                                    <CardDescription>Distribución del volumen de evaluaciones</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {optSistModuloData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={optSistModuloData} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={130} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="Cantidad" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={15} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab 5: Métricas HDT */}
                    <TabsContent value="hdt" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPIs específicos de HDT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="shadow-sm border-l-4 border-l-[#324354]">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hojas de División de Trabajo (HDTs)</span>
                                    <span className="text-3xl font-black text-slate-700 mt-1">{kpis.totalHDT}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">Fichas de estandarización registradas</span>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-l-4 border-l-blue-500">
                                <CardContent className="p-4 flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Versión Promedio de Fichas</span>
                                    <span className="text-3xl font-black text-blue-600 mt-1">
                                        V{(filteredHDT.length > 0 ? (filteredHDT.reduce((s, d) => s + (d.version || 1), 0) / filteredHDT.length) : 1).toFixed(1)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-1">Madurez del estándar</span>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cantidad de HDTs por Planta (Requerimiento de usuario) */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Cantidad de HDT por Planta</CardTitle>
                                    <CardDescription>Cantidad de estándares de trabajo elaborados por sección</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {hdtPlantaData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={hdtPlantaData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="Cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {hdtPlantaData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                            
                            {/* Top Creadores / Autores de HDT */}
                            <Card className="shadow-sm border border-slate-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-[#324354]">Top Elaboradores de HDT</CardTitle>
                                    <CardDescription>Supervisores y analistas líderes en estandarización</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80">
                                    {hdtCreatorData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={hdtCreatorData} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={130} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="Cantidad" fill="#1d4ed8" radius={[0, 4, 4, 0]} barSize={20} />
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
                    href="/home"
                    className="w-14 h-14 bg-[#324354] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                    title="Volver al Menú Principal"
                >
                    <Home size={28} />
                </Link>
            </div>
        </div>
    );
}
