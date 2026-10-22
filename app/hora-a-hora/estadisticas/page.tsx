"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { EvaluacionHoraHora } from "@/lib/store";
import { fetchEvaluaciones } from "@/lib/db/horaHora";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, TrendingUp, AlertTriangle, ShieldCheck, Users, Factory, Filter, X, MousePointerClick, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { createExternalClient, isExternalConfigured } from "@/lib/supabase/external";
import Header from "@/components/opt-sistemica/Header";
import SubHeader from "@/components/hora-a-hora/SubHeader";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#254153', '#3b82f6', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0f172a', '#334155'];
const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ESTADO_COLORS: Record<string, string> = { Verde: '#10b981', Amarillo: '#f59e0b', Rojo: '#94a3b8' };

export default function Estadisticas() {
    const [rawData, setRawData] = useState<EvaluacionHoraHora[]>([]);
    const [nameMap, setNameMap] = useState<Record<string, string>>({});
    const [userEmail, setUserEmail] = useState("");

    // Standard Filters
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterMonth, setFilterMonth] = useState<string>("all");
    const [filterDay, setFilterDay] = useState<string>("all");
    const [filterPlanta, setFilterPlanta] = useState<string>("all");
    const [filterUser, setFilterUser] = useState<string>("all");

    // Dynamic Cross-filters
    const [filterDesperdicio, setFilterDesperdicio] = useState<string>("all");
    const [filterPuesto, setFilterPuesto] = useState<string>("all");
    const [filterEstado, setFilterEstado] = useState<string>("all");

    const [showFilters, setShowFilters] = useState(true);

    // Double-click detection refs
    const lastTriggerRef = useRef<Record<string, { id: string; time: number }>>({});
    const lastClickCandidateRef = useRef<Record<string, { id: string; time: number }>>({});

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
            console.warn('Error fetching from Supabase, usando localStorage:', err);
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
            } else if (isExternalConfigured()) {
                const ext = createExternalClient();
                ext.from('usuarios').select('correo, nombre').then(({ data: u2 }) => {
                    if (u2) {
                        const m: Record<string, string> = {};
                        u2.forEach((u: any) => { if (u.correo && u.nombre) m[u.correo] = u.nombre; });
                        setNameMap(m);
                    }
                }).catch(() => {});
            }
        });

        // Fetch user session email
        supabase.auth.getUser().then(({ data: authData }) => {
            if (authData?.user) {
                setUserEmail(authData.user.email || "");
            }
        });
    }, []);

    const resolveName = (v: string | undefined) => {
        if (!v) return "—";
        if (v.includes('@') && nameMap[v]) return nameMap[v];
        return v;
    };

    const getUserName = (d: EvaluacionHoraHora) => {
        return resolveName(d.creadoPor || d.realizadoPor || d.supervisor);
    };

    const isUserMatch = (d: EvaluacionHoraHora, targetUser: string) => {
        if (targetUser === "all") return true;
        const u1 = resolveName(d.creadoPor);
        const u2 = resolveName(d.realizadoPor);
        const u3 = resolveName(d.supervisor);
        return u1 === targetUser || u2 === targetUser || u3 === targetUser;
    };

    // Extract unique filter options from rawData
    const years = useMemo(() => [...new Set(rawData.map(d => new Date(d.tiempoInicio).getFullYear().toString()))].sort().reverse(), [rawData]);
    const plantas = useMemo(() => [...new Set(rawData.map(d => d.planta).filter(Boolean))].sort(), [rawData]);
    const users = useMemo(() => [...new Set(rawData.map(d => getUserName(d)).filter(v => v !== "—"))].sort(), [rawData, nameMap]);

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

    // Base filtered dataset with ALL active filters applied (drives KPIs and trend)
    const data = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterUser, filterDesperdicio, filterPuesto, filterEstado, nameMap]);

    // Specific datasets for cross-filtered charts:
    // When a chart's own dimension is filtered, we keep all options in scope so the user can see comparisons and click another bar!

    // Data for Supervisor chart (all filters EXCEPT filterUser)
    const dataForUserChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterDesperdicio, filterPuesto, filterEstado]);

    // Data for Daily chart (all filters EXCEPT filterDay)
    const dataForDailyChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterPlanta, filterUser, filterDesperdicio, filterPuesto, filterEstado, nameMap]);

    // Data for Planta chart (all filters EXCEPT filterPlanta)
    const dataForPlantaChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterUser, filterDesperdicio, filterPuesto, filterEstado, nameMap]);

    // Data for Waste chart (all filters EXCEPT filterDesperdicio)
    const dataForWasteChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterUser, filterPuesto, filterEstado, nameMap]);

    // Data for Puesto chart (all filters EXCEPT filterPuesto)
    const dataForPuestoChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterEstado !== "all" && d.estadoGlobal !== filterEstado) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterUser, filterDesperdicio, filterEstado, nameMap]);

    // Data for Estado chart (all filters EXCEPT filterEstado)
    const dataForEstadoChart = useMemo(() => {
        return rawData.filter(d => {
            const dt = new Date(d.tiempoInicio);
            if (filterYear !== "all" && dt.getFullYear().toString() !== filterYear) return false;
            if (filterMonth !== "all" && (dt.getMonth() + 1).toString() !== filterMonth) return false;
            if (filterDay !== "all" && dt.getDate().toString() !== filterDay) return false;
            if (filterPlanta !== "all" && d.planta !== filterPlanta) return false;
            if (filterUser !== "all" && !isUserMatch(d, filterUser)) return false;
            if (filterDesperdicio !== "all" && !(d.desperdicios || []).includes(filterDesperdicio)) return false;
            if (filterPuesto !== "all" && d.puesto !== filterPuesto) return false;
            return true;
        });
    }, [rawData, filterYear, filterMonth, filterDay, filterPlanta, filterUser, filterDesperdicio, filterPuesto, nameMap]);

    const activeFiltersList = useMemo(() => {
        const list = [];
        if (filterYear !== "all") list.push({ key: "year", label: `Año: ${filterYear}`, clear: () => setFilterYear("all") });
        if (filterMonth !== "all") list.push({ key: "month", label: `Mes: ${MONTHS[Number(filterMonth)] || filterMonth}`, clear: () => setFilterMonth("all") });
        if (filterDay !== "all") list.push({ key: "day", label: `Día: ${filterDay}`, clear: () => setFilterDay("all") });
        if (filterPlanta !== "all") list.push({ key: "planta", label: `Planta: ${filterPlanta}`, clear: () => setFilterPlanta("all") });
        if (filterUser !== "all") list.push({ key: "user", label: `Supervisor: ${filterUser}`, clear: () => setFilterUser("all") });
        if (filterDesperdicio !== "all") list.push({ key: "desperdicio", label: `Desperdicio: ${filterDesperdicio}`, clear: () => setFilterDesperdicio("all") });
        if (filterPuesto !== "all") list.push({ key: "puesto", label: `Puesto: ${filterPuesto}`, clear: () => setFilterPuesto("all") });
        if (filterEstado !== "all") list.push({ key: "estado", label: `Estado: ${filterEstado}`, clear: () => setFilterEstado("all") });
        return list;
    }, [filterYear, filterMonth, filterDay, filterPlanta, filterUser, filterDesperdicio, filterPuesto, filterEstado]);

    const clearFilters = () => {
        setFilterYear("all");
        setFilterMonth("all");
        setFilterDay("all");
        setFilterPlanta("all");
        setFilterUser("all");
        setFilterDesperdicio("all");
        setFilterPuesto("all");
        setFilterEstado("all");
    };

    // Toggle filter functions
    const toggleUser = (name: string) => setFilterUser(prev => prev === name ? "all" : name);
    const toggleDay = (dayStr: string) => setFilterDay(prev => prev === dayStr ? "all" : dayStr);
    const togglePlanta = (name: string) => setFilterPlanta(prev => prev === name ? "all" : name);
    const toggleDesperdicio = (name: string) => setFilterDesperdicio(prev => prev === name ? "all" : name);
    const togglePuesto = (name: string) => setFilterPuesto(prev => prev === name ? "all" : name);
    const toggleEstado = (name: string) => setFilterEstado(prev => prev === name ? "all" : name);

    // Reliable double-click triggers with debounce
    const handleBarClickCandidate = (filterKey: string, id: string, toggleFn: (val: string) => void) => {
        if (!id) return;
        const now = Date.now();
        const lastTrigger = lastTriggerRef.current[filterKey];
        if (lastTrigger && (now - lastTrigger.time) < 400) {
            return;
        }

        const lastCandidate = lastClickCandidateRef.current[filterKey];
        if (lastCandidate && lastCandidate.id === id && (now - lastCandidate.time) < 500) {
            // Confirmed double click!
            lastTriggerRef.current[filterKey] = { id, time: now };
            lastClickCandidateRef.current[filterKey] = { id: "", time: 0 };
            toggleFn(id);
        } else {
            // First click
            lastClickCandidateRef.current[filterKey] = { id, time: now };
        }
    };

    const handleNativeDoubleClick = (filterKey: string, id: string, toggleFn: (val: string) => void) => {
        if (!id) return;
        const now = Date.now();
        const lastTrigger = lastTriggerRef.current[filterKey];
        if (lastTrigger && (now - lastTrigger.time) < 400) {
            return;
        }
        lastTriggerRef.current[filterKey] = { id, time: now };
        lastClickCandidateRef.current[filterKey] = { id: "", time: 0 };
        toggleFn(id);
    };

    // KPIs (driven by fully filtered `data`)
    const total = data.length;
    const promRend = total > 0 ? data.reduce((s, d) => s + d.rendimiento, 0) / total : 0;
    const promCal = total > 0 ? data.reduce((s, d) => s + d.calidad, 0) / total : 0;
    const hdtPct = total > 0 ? (data.filter(d => d.hdtCumple).length / total) * 100 : 0;
    const promCiclo = total > 0 ? data.reduce((s, d) => s + d.tiempoPromedio, 0) / total : 0;
    const totalDefectos = data.reduce((s, d) => s + d.piezasDefectuosas, 0);

    // Chart data: Tendencia por fecha
    const trendData = useMemo(() => {
        const sorted = [...data].sort((a, b) => a.tiempoInicio - b.tiempoInicio);
        return sorted.map((d) => ({
            name: format(new Date(d.tiempoInicio), "dd/MM"),
            rendimiento: Math.min(d.rendimiento, 120),
            calidad: d.calidad,
        }));
    }, [data]);

    // Chart data: Desperdicios (computed from dataForWasteChart)
    const wastesData = useMemo(() => {
        const count: Record<string, number> = {};
        dataForWasteChart.forEach(ev => (ev.desperdicios || []).forEach(w => { count[w] = (count[w] || 0) + 1; }));
        return Object.entries(count).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [dataForWasteChart]);

    // Chart data: Evaluaciones por planta (computed from dataForPlantaChart)
    const plantaData = useMemo(() => {
        const count: Record<string, { total: number; rend: number; cal: number }> = {};
        dataForPlantaChart.forEach(d => {
            const p = d.planta || "N/A";
            if (!count[p]) count[p] = { total: 0, rend: 0, cal: 0 };
            count[p].total++;
            count[p].rend += d.rendimiento;
            count[p].cal += d.calidad;
        });
        return Object.entries(count).map(([name, v]) => ({
            name,
            total: v.total,
            rendimiento: Math.min(v.rend / v.total, 120),
            calidad: v.cal / v.total,
        }));
    }, [dataForPlantaChart]);

    // Chart data: Calidad por puesto (top 8, computed from dataForPuestoChart)
    const puestoData = useMemo(() => {
        const map: Record<string, { sum: number; count: number }> = {};
        dataForPuestoChart.forEach(d => {
            const p = d.puesto || "N/A";
            if (!map[p]) map[p] = { sum: 0, count: 0 };
            map[p].sum += d.calidad;
            map[p].count++;
        });
        return Object.entries(map)
            .map(([name, v]) => ({ name, calidad: +(v.sum / v.count).toFixed(1), evaluaciones: v.count }))
            .sort((a, b) => b.evaluaciones - a.evaluaciones)
            .slice(0, 8);
    }, [dataForPuestoChart]);

    // Chart data: Registros por persona (Supervisor, computed from dataForUserChart)
    const registrosPorPersona = useMemo(() => {
        const map: Record<string, number> = {};
        dataForUserChart.forEach(d => {
            const n = getUserName(d);
            map[n] = (map[n] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [dataForUserChart, nameMap]);

    // Chart data: Registros diarios del mes seleccionado (computed from dataForDailyChart)
    const registrosDiarios = useMemo(() => {
        const latestDate = rawData.length > 0 
            ? new Date([...rawData].sort((a, b) => b.tiempoInicio - a.tiempoInicio)[0].tiempoInicio)
            : new Date();

        const activeYear = filterYear !== "all" ? Number(filterYear) : latestDate.getFullYear();
        const activeMonth = filterMonth !== "all" ? Number(filterMonth) : (latestDate.getMonth() + 1);

        const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
        
        const counts: Record<number, number> = {};
        for (let i = 1; i <= daysInMonth; i++) {
            counts[i] = 0;
        }

        dataForDailyChart.forEach(d => {
            const dt = new Date(d.tiempoInicio);
            if (dt.getFullYear() === activeYear && (dt.getMonth() + 1) === activeMonth) {
                counts[dt.getDate()]++;
            }
        });

        return Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            return {
                day: dayNum,
                name: dayNum.toString(),
                value: counts[dayNum] || 0,
            };
        });
    }, [dataForDailyChart, rawData, filterYear, filterMonth]);

    const activeMonthName = useMemo(() => {
        const latestDate = rawData.length > 0 
            ? new Date([...rawData].sort((a, b) => b.tiempoInicio - a.tiempoInicio)[0].tiempoInicio)
            : new Date();
        const mIndex = filterMonth !== "all" ? Number(filterMonth) : (latestDate.getMonth() + 1);
        return MONTHS[mIndex] || "Mes actual";
    }, [rawData, filterMonth]);

    // Chart data: Estado global distribution (computed from dataForEstadoChart)
    const estadoData = useMemo(() => {
        const map: Record<string, number> = { Verde: 0, Amarillo: 0, Rojo: 0 };
        dataForEstadoChart.forEach(d => { if (map[d.estadoGlobal] !== undefined) map[d.estadoGlobal]++; });
        return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
    }, [dataForEstadoChart]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans text-[#000000] w-full">
            <Header 
                title="Hora a Hora"
                subtitle="Estadísticas"
                userEmail={userEmail}
            />
            <SubHeader />

            <main className="flex-1 w-full max-w-[1500px] p-4 sm:p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Filter Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-primary">Dashboard Interactivo</h2>
                            {activeFiltersList.length > 0 && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                                    {activeFiltersList.length} filtro{activeFiltersList.length > 1 ? "s" : ""} activo{activeFiltersList.length > 1 ? "s" : ""}
                                </Badge>
                            )}
                            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                <MousePointerClick size={14} className="text-primary animate-pulse" />
                                <span><strong>Doble clic</strong> en una barra para filtrar las demás gráficas</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {activeFiltersList.length > 0 && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                                    <X size={14} /> Limpiar todo
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1 text-xs">
                                <Filter size={14} /> {showFilters ? "Ocultar filtros" : "Filtros"}
                            </Button>
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
                                <Label className="text-xs text-slate-500 font-semibold">Realizado por (Supervisor)</Label>
                                <Select value={filterUser} onValueChange={v => v !== null && setFilterUser(v)}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos</SelectItem>{users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Active Filters Interactive Chips Bar */}
                    {activeFiltersList.length > 0 && (
                        <div className="mt-3 bg-white/90 backdrop-blur rounded-xl border border-slate-200/90 shadow-sm p-3 flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
                                <Filter size={13} className="text-primary" /> Filtros activos:
                            </span>
                            {activeFiltersList.map(f => (
                                <Badge 
                                    key={f.key}
                                    variant="outline"
                                    className="bg-slate-100/90 text-slate-800 border-slate-300 hover:bg-slate-200 gap-1.5 cursor-pointer text-xs font-medium py-1 px-2.5 transition-colors shadow-xs"
                                    onClick={f.clear}
                                    title="Haz clic para quitar este filtro"
                                >
                                    <span>{f.label}</span>
                                    <X size={12} className="text-slate-400 hover:text-red-500 transition-colors" />
                                </Badge>
                            ))}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={clearFilters} 
                                className="h-6 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 ml-auto font-medium"
                            >
                                Limpiar todos
                            </Button>
                        </div>
                    )}
                </div>

                {total === 0 && rawData.length > 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 p-6 text-center my-4">
                        <BarChart2 size={48} className="mb-3 text-slate-300" />
                        <p className="text-lg font-semibold text-slate-700">No hay evaluaciones que coincidan con esta combinación de filtros</p>
                        <p className="text-sm text-slate-400 mb-4 max-w-md">Prueba removiendo alguno de los filtros aplicados para ampliar el rango de búsqueda.</p>
                        <Button onClick={clearFilters} variant="default" size="sm" className="gap-2 bg-primary">
                            <RefreshCw size={14} /> Restablecer filtros
                        </Button>
                    </div>
                ) : total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <BarChart2 size={64} className="mb-4 opacity-20" />
                        <p className="text-xl font-medium">No hay datos registrados</p>
                        <p className="text-sm">Realiza nuevas evaluaciones en Hora a Hora para ver las estadísticas.</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* KPI Cards (Dynamically filtered by current selection) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: "Evaluaciones", value: total.toString(), color: "border-l-slate-500", textColor: "text-slate-700" },
                                { label: "Prom. Rendimiento", value: `${promRend.toFixed(1)}%`, color: "border-l-emerald-500", textColor: promRend >= 90 ? "text-emerald-600" : promRend >= 80 ? "text-amber-500" : "text-slate-500" },
                                { label: "Prom. Calidad", value: `${promCal.toFixed(1)}%`, color: "border-l-blue-500", textColor: promCal >= 90 ? "text-emerald-600" : promCal >= 80 ? "text-amber-500" : "text-slate-500" },
                                { label: "Cumplimiento HDT", value: `${hdtPct.toFixed(0)}%`, color: "border-l-purple-500", textColor: hdtPct >= 90 ? "text-emerald-600" : "text-amber-500" },
                                { label: "Prom. Ciclo", value: `${promCiclo.toFixed(1)}s`, color: "border-l-cyan-500", textColor: "text-cyan-600" },
                                { label: "Total Defectos", value: totalDefectos.toString(), color: "border-l-rose-400", textColor: "text-slate-600" },
                            ].map((kpi, i) => (
                                <Card key={i} className={`shadow-sm border-l-4 ${kpi.color} hover:shadow-md transition-shadow bg-white`}>
                                    <CardContent className="p-3 flex flex-col justify-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{kpi.label}</span>
                                        <span className={`text-2xl font-black ${kpi.textColor}`}>{kpi.value}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Row 1: Registros por Persona + Registros Diarios */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Chart 1: Registros por Persona (Supervisor) */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <Users size={18} className="text-indigo-600" /> Registros por Persona (Supervisor)
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterUser !== "all" 
                                                ? `Filtrando por: ${filterUser} (haz doble clic para quitar)`
                                                : "Haz doble clic en una barra para filtrar las demás gráficas"}
                                        </p>
                                    </div>
                                    {filterUser !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterUser("all")}
                                            title="Quitar filtro de supervisor"
                                        >
                                            {filterUser} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72">
                                    {registrosPorPersona.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={registrosPorPersona} 
                                                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                                                onClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleBarClickCandidate("user", clickedName, toggleUser);
                                                }}
                                                onDoubleClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleNativeDoubleClick("user", clickedName, toggleUser);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    fontSize={10} 
                                                    angle={-25} 
                                                    tick={{ textAnchor: 'end' }} 
                                                    dx={-2} 
                                                    dy={5} 
                                                    height={55} 
                                                />
                                                <YAxis fontSize={11} allowDecimals={false} />
                                                <Tooltip 
                                                    formatter={(v: any, _, item: any) => [
                                                        `${v} registros`,
                                                        item?.payload?.name === filterUser 
                                                            ? 'Seleccionado (doble clic para quitar)' 
                                                            : 'Cantidad (doble clic para filtrar)'
                                                    ]} 
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    name="Registros" 
                                                    radius={[4, 4, 0, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {registrosPorPersona.map((entry, i) => {
                                                        const isSelected = filterUser === entry.name;
                                                        const isDimmed = filterUser !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`user-${i}`} 
                                                                fill={COLORS[i % COLORS.length]} 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2.5 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("user", entry.name, toggleUser);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("user", entry.name, toggleUser);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin registros</div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Chart 2: Registros Diarios */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <TrendingUp size={18} className="text-emerald-500" /> Registros Diarios del Mes ({activeMonthName})
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterDay !== "all" 
                                                ? `Filtrando por: Día ${filterDay} (haz doble clic para quitar)`
                                                : "Haz doble clic en un día para filtrar las demás gráficas"}
                                        </p>
                                    </div>
                                    {filterDay !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterDay("all")}
                                            title="Quitar filtro de día"
                                        >
                                            Día {filterDay} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72">
                                    {registrosDiarios.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={registrosDiarios} 
                                                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                                onClick={(state: any) => {
                                                    const clickedDay = (state?.activeLabel || state?.activePayload?.[0]?.payload?.name || state?.activePayload?.[0]?.payload?.day)?.toString();
                                                    if (clickedDay) handleBarClickCandidate("day", clickedDay, toggleDay);
                                                }}
                                                onDoubleClick={(state: any) => {
                                                    const clickedDay = (state?.activeLabel || state?.activePayload?.[0]?.payload?.name || state?.activePayload?.[0]?.payload?.day)?.toString();
                                                    if (clickedDay) handleNativeDoubleClick("day", clickedDay, toggleDay);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={11} />
                                                <YAxis fontSize={11} allowDecimals={false} />
                                                <Tooltip 
                                                    formatter={(v: any, _, item: any) => [
                                                        `${v} registros`,
                                                        item?.payload?.name === filterDay 
                                                            ? 'Seleccionado (doble clic para quitar)' 
                                                            : 'Cantidad (doble clic para filtrar)'
                                                    ]} 
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    name="Registros" 
                                                    radius={[4, 4, 0, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {registrosDiarios.map((entry, i) => {
                                                        const isSelected = filterDay === entry.name;
                                                        const isDimmed = filterDay !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`day-${i}`} 
                                                                fill={isSelected ? "#254153" : "#7B8E90"} 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("day", entry.name, toggleDay);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("day", entry.name, toggleDay);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin registros</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 2: Trend + Estado */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Chart 3: Tendencia Rendimiento & Calidad */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200 lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                        <TrendingUp size={18} className="text-emerald-500" /> Tendencia Rendimiento & Calidad
                                    </CardTitle>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Evolución cronológica de evaluaciones bajo los filtros actuales
                                    </p>
                                </CardHeader>
                                <CardContent className="h-72">
                                    {trendData.length > 0 ? (
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
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos para la tendencia</div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Chart 4: Resultado Global */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <ShieldCheck size={18} className="text-indigo-500" /> Resultado Global
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterEstado !== "all" 
                                                ? `Filtrando por: ${filterEstado} (haz doble clic para quitar)` 
                                                : "Haz doble clic en un segmento para filtrar"}
                                        </p>
                                    </div>
                                    {filterEstado !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-slate-100 text-slate-800 border border-slate-300 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterEstado("all")}
                                            title="Quitar filtro de estado"
                                        >
                                            {filterEstado} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72 flex items-center justify-center">
                                    {estadoData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={estadoData} 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={50} 
                                                    outerRadius={85} 
                                                    paddingAngle={4} 
                                                    dataKey="value"
                                                    cursor="pointer"
                                                    label={({ name, value }) => `${name === 'Verde' ? 'Óptimo' : name === 'Amarillo' ? 'Alerta' : 'Atención'} (${value})`} 
                                                    labelLine={false}
                                                >
                                                    {estadoData.map((e, i) => {
                                                        const isSelected = filterEstado === e.name;
                                                        const isDimmed = filterEstado !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`estado-${i}`} 
                                                                fill={ESTADO_COLORS[e.name] || '#94a3b8'} 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 3 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleBarClickCandidate("estado", e.name, toggleEstado);
                                                                }}
                                                                onDoubleClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleNativeDoubleClick("estado", e.name, toggleEstado);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(v: any, _, item: any) => [
                                                        `${v} evaluaciones`,
                                                        item?.payload?.name === filterEstado ? 'Seleccionado (doble clic para quitar)' : 'Total (doble clic para filtrar)'
                                                    ]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-sm">Sin datos</p>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 3: Desperdicios + Planta */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Chart 5: Pareto de Desperdicios */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <AlertTriangle size={18} className="text-purple-600" /> Pareto de Desperdicios
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterDesperdicio !== "all" 
                                                ? `Filtrando por: ${filterDesperdicio} (haz doble clic para quitar)` 
                                                : "Haz doble clic en un desperdicio para filtrar"}
                                        </p>
                                    </div>
                                    {filterDesperdicio !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterDesperdicio("all")}
                                            title="Quitar filtro de desperdicio"
                                        >
                                            {filterDesperdicio} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72">
                                    {wastesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={wastesData} 
                                                layout="vertical" 
                                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                                onClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleBarClickCandidate("waste", clickedName, toggleDesperdicio);
                                                }}
                                                onDoubleClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleNativeDoubleClick("waste", clickedName, toggleDesperdicio);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis type="number" fontSize={11} allowDecimals={false} />
                                                <YAxis dataKey="name" type="category" fontSize={10} width={120} tick={{ fill: '#64748b' }} />
                                                <Tooltip 
                                                    formatter={(v: any, _, item: any) => [
                                                        `${v} veces`,
                                                        item?.payload?.name === filterDesperdicio ? 'Seleccionado (doble clic para quitar)' : 'Frecuencia (doble clic para filtrar)'
                                                    ]}
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    name="Frecuencia" 
                                                    radius={[0, 6, 6, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {wastesData.map((entry, i) => {
                                                        const isSelected = filterDesperdicio === entry.name;
                                                        const isDimmed = filterDesperdicio !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`waste-${i}`} 
                                                                fill={COLORS[i % COLORS.length]} 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("waste", entry.name, toggleDesperdicio);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("waste", entry.name, toggleDesperdicio);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin desperdicios registrados</div>}
                                </CardContent>
                            </Card>

                            {/* Chart 6: KPIs por Planta */}
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <Factory size={18} className="text-cyan-600" /> KPIs por Planta
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterPlanta !== "all" 
                                                ? `Filtrando por: ${filterPlanta} (haz doble clic para quitar)` 
                                                : "Haz doble clic en una planta para filtrar"}
                                        </p>
                                    </div>
                                    {filterPlanta !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-200 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterPlanta("all")}
                                            title="Quitar filtro de planta"
                                        >
                                            {filterPlanta} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72">
                                    {plantaData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={plantaData} 
                                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                                onClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleBarClickCandidate("planta", clickedName, togglePlanta);
                                                }}
                                                onDoubleClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleNativeDoubleClick("planta", clickedName, togglePlanta);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis domain={[0, 120]} fontSize={11} />
                                                <Tooltip formatter={(v: any) => `${v?.toFixed(1)}%`} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Bar 
                                                    dataKey="rendimiento" 
                                                    name="Rend. %" 
                                                    radius={[4, 4, 0, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {plantaData.map((entry, i) => {
                                                        const isSelected = filterPlanta === entry.name;
                                                        const isDimmed = filterPlanta !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`rend-${i}`} 
                                                                fill="#10b981" 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("planta", entry.name, togglePlanta);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("planta", entry.name, togglePlanta);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                                <Bar 
                                                    dataKey="calidad" 
                                                    name="Calidad %" 
                                                    radius={[4, 4, 0, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {plantaData.map((entry, i) => {
                                                        const isSelected = filterPlanta === entry.name;
                                                        const isDimmed = filterPlanta !== "all" && !isSelected;
                                                        return (
                                                            <Cell 
                                                                key={`cal-${i}`} 
                                                                fill="#3b82f6" 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("planta", entry.name, togglePlanta);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("planta", entry.name, togglePlanta);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos</div>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 4: Calidad Promedio por Puesto */}
                        <div className="grid grid-cols-1 gap-6">
                            <Card className="shadow-md transition-all hover:shadow-lg border-slate-200">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                            <BarChart2 size={18} className="text-amber-500" /> Calidad Promedio por Puesto
                                        </CardTitle>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {filterPuesto !== "all" 
                                                ? `Filtrando por puesto: ${filterPuesto} (haz doble clic para quitar)` 
                                                : "Haz doble clic en un puesto para filtrar"}
                                        </p>
                                    </div>
                                    {filterPuesto !== "all" && (
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 cursor-pointer gap-1 text-xs shrink-0 py-0.5"
                                            onClick={() => setFilterPuesto("all")}
                                            title="Quitar filtro de puesto"
                                        >
                                            {filterPuesto} <X size={12} />
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="h-72">
                                    {puestoData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={puestoData} 
                                                margin={{ top: 5, right: 20, left: 30, bottom: 25 }}
                                                onClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleBarClickCandidate("puesto", clickedName, togglePuesto);
                                                }}
                                                onDoubleClick={(state: any) => {
                                                    const clickedName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name;
                                                    if (clickedName) handleNativeDoubleClick("puesto", clickedName, togglePuesto);
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    fontSize={10} 
                                                    angle={-25} 
                                                    tick={{ textAnchor: 'end' }} 
                                                    dx={-2} 
                                                    dy={5} 
                                                    height={60} 
                                                />
                                                <YAxis domain={[0, 100]} fontSize={11} />
                                                <Tooltip formatter={(v: any) => `${v?.toFixed(1)}%`} />
                                                <Bar 
                                                    dataKey="calidad" 
                                                    name="Calidad %" 
                                                    radius={[4, 4, 0, 0]} 
                                                    cursor="pointer"
                                                >
                                                    {puestoData.map((d, i) => {
                                                        const isSelected = filterPuesto === d.name;
                                                        const isDimmed = filterPuesto !== "all" && !isSelected;
                                                        const baseColor = d.calidad >= 90 ? '#10b981' : d.calidad >= 80 ? '#f59e0b' : '#94a3b8';
                                                        return (
                                                            <Cell 
                                                                key={`puesto-${i}`} 
                                                                fill={baseColor} 
                                                                opacity={isDimmed ? 0.22 : 1}
                                                                stroke={isSelected ? "#0f172a" : "none"}
                                                                strokeWidth={isSelected ? 2.5 : 0}
                                                                className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBarClickCandidate("puesto", d.name, togglePuesto);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNativeDoubleClick("puesto", d.name, togglePuesto);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Bar>
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
