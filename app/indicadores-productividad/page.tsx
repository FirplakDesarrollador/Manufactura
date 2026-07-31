"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, SlidersHorizontal, BarChart3, TrendingUp, ShieldCheck, Search, Filter, Share2, Download, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";

// Datos Simulados Nivel de Servicio
const nivelServicioDaily = [
    { day: "1", val: 90.0 },
    { day: "2", val: 88.72 },
    { day: "3", val: 84.42 },
    { day: "6", val: 79.61 },
    { day: "7", val: 78.50 },
    { day: "8", val: 86.03 },
    { day: "9", val: 81.51 },
    { day: "10", val: 86.61 },
    { day: "14", val: 86.65 },
    { day: "15", val: 91.01 },
    { day: "16", val: 75.50 },
    { day: "17", val: 84.00 },
    { day: "21", val: 78.55 },
    { day: "22", val: 68.40 },
    { day: "23", val: 64.71 },
    { day: "24", val: 80.65 },
    { day: "27", val: 82.51 },
    { day: "28", val: 76.42 },
    { day: "29", val: 68.91 }
];

const nivelServicioMonthly = [
    { month: "January", val: 67.44, active: false },
    { month: "February", val: 73.70, active: false },
    { month: "March", val: 82.05, active: false },
    { month: "April", val: 76.19, active: false },
    { month: "May", val: 77.08, active: false },
    { month: "June", val: 72.75, active: false },
    { month: "July", val: 80.82, active: true }
];

// Datos Simulados Productividad
const productividadDaily = [
    { day: "1", val: 85.0 },
    { day: "2", val: 82.5 },
    { day: "3", val: 88.1 },
    { day: "6", val: 80.4 },
    { day: "7", val: 84.2 },
    { day: "8", val: 87.0 },
    { day: "9", val: 81.9 },
    { day: "10", val: 83.5 },
    { day: "14", val: 86.0 },
    { day: "15", val: 89.4 },
    { day: "16", val: 78.0 },
    { day: "17", val: 82.1 },
    { day: "21", val: 84.5 },
    { day: "22", val: 79.8 },
    { day: "23", val: 75.2 },
    { day: "24", val: 83.0 },
    { day: "27", val: 85.2 },
    { day: "28", val: 81.4 },
    { day: "29", val: 82.5 }
];

const productividadMonthly = [
    { month: "January", val: 78.20, active: false },
    { month: "February", val: 81.00, active: false },
    { month: "March", val: 85.40, active: false },
    { month: "April", val: 79.10, active: false },
    { month: "May", val: 83.60, active: false },
    { month: "June", val: 80.20, active: false },
    { month: "July", val: 82.50, active: true }
];

// Datos Simulados Calidad
const calidadDaily = [
    { day: "1", val: 88.2 },
    { day: "2", val: 86.0 },
    { day: "3", val: 83.4 },
    { day: "6", val: 81.2 },
    { day: "7", val: 85.0 },
    { day: "8", val: 87.5 },
    { day: "9", val: 82.1 },
    { day: "10", val: 84.8 },
    { day: "14", val: 88.0 },
    { day: "15", val: 85.5 },
    { day: "16", val: 79.2 },
    { day: "17", val: 83.0 },
    { day: "21", val: 80.5 },
    { day: "22", val: 76.4 },
    { day: "23", val: 72.1 },
    { day: "24", val: 81.5 },
    { day: "27", val: 83.4 },
    { day: "28", val: 79.0 },
    { day: "29", val: 80.9 }
];

const calidadMonthly = [
    { month: "January", val: 75.10, active: false },
    { month: "February", val: 79.30, active: false },
    { month: "March", val: 84.20, active: false },
    { month: "April", val: 81.00, active: false },
    { month: "May", val: 82.40, active: false },
    { month: "June", val: 78.90, active: false },
    { month: "July", val: 80.90, active: true }
];

export default function IndicadoresProductividadPage() {
    const [viewMode, setViewMode] = useState<"bi" | "manual" | "nivel-servicio" | "productividad" | "calidad">("bi");

    // States for manual indicators
    const [nivelServicio, setNivelServicio] = useState<number>(72.4);
    const [productividadPct, setProductividadPct] = useState<number>(82.5);
    const [productividadPz, setProductividadPz] = useState<number>(467);
    const [productividadKg, setProductividadKg] = useState<number>(4951);
    const [calidad, setCalidad] = useState<number>(80.9);
    const [presentismo, setPresentismo] = useState<number>(98.6);
    const [accidentes, setAccidentes] = useState<number>(1);

    // Editing states for custom formatting
    const [editingCard, setEditingCard] = useState<string | null>(null);

    // Color logic thresholds matching the dashboard styling
    const getCardColor = (type: string, value: number) => {
        switch (type) {
            case "nivelServicio":
                return value >= 90 ? "bg-[#59a96a]" : value >= 80 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadPct":
                return value >= 90 ? "bg-[#59a96a]" : value >= 80 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadPz":
                return value >= 630 ? "bg-[#59a96a]" : value >= 550 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "productividadKg":
                return value >= 6300 ? "bg-[#59a96a]" : value >= 5500 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "calidad":
                return value >= 90 ? "bg-[#59a96a]" : value >= 85 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "presentismo":
                return value >= 100 ? "bg-[#59a96a]" : value >= 95 ? "bg-[#deb841]" : "bg-[#d14747]";
            case "accidentes":
                return value === 0 ? "bg-[#59a96a]" : "bg-[#d14747]";
            default:
                return "bg-slate-100";
        }
    };

    // Componente para simular el informe Power BI / SharePoint (exacto a la 2da imagen)
    const renderSimulatedReport = (
        metricName: string,
        kpiVal: string,
        okCount: number,
        noCount: number,
        totalCount: number,
        dailyData: Array<{ day: string; val: number }>,
        monthlyData: Array<{ month: string; val: number; active: boolean }>,
        accentColor: string = "#0084ff"
    ) => {
        return (
            <div className="w-full bg-white rounded-2xl shadow-xl border border-[#d1d5db] overflow-hidden font-sans text-slate-800">
                {/* SHAREPOINT BROWSER TOP BAR */}
                <div className="bg-[#004e8c] text-white px-4 py-2 flex items-center justify-between text-xs select-none">
                    <div className="flex items-center gap-3">
                        <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="bg-white/80 rounded-xs" />
                            ))}
                        </div>
                        <span className="font-semibold tracking-wide">SharePoint</span>
                    </div>
                    <div className="flex-1 max-w-md mx-6 relative">
                        <input
                            type="text"
                            readOnly
                            value="firplaksa.sharepoint.com/sites/FIRPLAKMANUFACTURA/SitePages/Informes-Manufactura.aspx"
                            className="w-full bg-white/10 text-white text-xs px-8 py-1 rounded border border-white/20 outline-none truncate font-mono text-center"
                        />
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-medium">Publicado 3/9/2026</span>
                    </div>
                </div>

                {/* SHAREPOINT ACTION RIBBON */}
                <div className="bg-[#f3f4f6] border-b border-[#e5e7eb] px-4 py-1.5 flex items-center justify-between text-xs text-slate-700 select-none">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-slate-900">+ Nuevo</span>
                        <span className="hover:text-black cursor-pointer">Promover</span>
                        <span className="hover:text-black cursor-pointer">Detalles de página</span>
                        <span className="hover:text-black cursor-pointer">Vista previa</span>
                        <span className="hover:text-black cursor-pointer">Analíticas</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <Share2 size={13} className="cursor-pointer hover:text-black" />
                        <Download size={13} className="cursor-pointer hover:text-black" />
                    </div>
                </div>

                {/* POWER BI DASHBOARD CANVAS CONTAINER */}
                <div className="p-4 md:p-6 bg-white flex flex-col gap-6">
                    
                    {/* TOP ROW: FIRPLAK BADGE + KPI CALLOUT + FILTERS + SUMMARY TABLE */}
                    <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-6">
                        
                        {/* LEFT: FIRPLAK LOGO & BIG KPI CALLOUT */}
                        <div className="space-y-3 shrink-0">
                            <div className="bg-[#0084ff] text-white px-5 py-2 rounded-lg font-black text-lg tracking-wider inline-block uppercase shadow-sm">
                                FIRPLAK
                                <span className="block text-[10px] font-bold tracking-widest bg-white/20 mt-0.5 px-1 rounded text-center">
                                    {metricName}
                                </span>
                            </div>
                            <div className="text-5xl sm:text-6xl font-black text-[#1e293b] tracking-tight">
                                {kpiVal}
                            </div>
                        </div>

                        {/* CENTER: POWER BI SLICERS / FILTERS */}
                        <div className="flex-1 space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold block">Familia Producción</label>
                                    <select disabled className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800">
                                        <option>All</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold block">Month</label>
                                    <select disabled className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800">
                                        <option>All</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold block">Semana</label>
                                    <select disabled className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800">
                                        <option>All</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold block">Day</label>
                                    <select disabled className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800">
                                        <option>All</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold block">Year</label>
                                    <select disabled className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800">
                                        <option>2026</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 pt-1">
                                <span>Fecha: Last 1 Select</span>
                                <span className="text-slate-400">| No filters applied</span>
                            </div>
                        </div>

                        {/* RIGHT: SUMMARY MATRIX TABLE */}
                        <div className="shrink-0 bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono select-none shadow-xs">
                            <table className="w-full border-collapse text-[11px] text-right">
                                <thead>
                                    <tr className="border-b border-slate-300 text-slate-600 font-sans text-[10px]">
                                        <th className="px-2 py-1 text-left">Year</th>
                                        <th className="px-2 py-1">OK</th>
                                        <th className="px-2 py-1">NO</th>
                                        <th className="px-2 py-1">TOTAL</th>
                                        <th className="px-2 py-1">% CUMPLIMIENTO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-100 font-medium">
                                        <td className="px-2 py-1 text-left font-sans">2026</td>
                                        <td className="px-2 py-1">{okCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1">{noCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1">{totalCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1 font-bold text-slate-900">{kpiVal}</td>
                                    </tr>
                                    <tr className="font-bold bg-slate-50">
                                        <td className="px-2 py-1 text-left font-sans">Total</td>
                                        <td className="px-2 py-1">{okCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1">{noCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1">{totalCount.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1 text-[#0084ff]">{kpiVal}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>

                    {/* MIDDLE CHART: % CUMPLIMIENTO BY DAY (LINE CHART EXACT TO IMAGE 2) */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 tracking-wide">
                            % CUMPLIMIENTO by Day
                        </h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                    <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: any) => [`${value}%`, '% Cumplimiento']} labelFormatter={(label) => `Día ${label}`} />
                                    <Line
                                        type="monotone"
                                        dataKey="val"
                                        stroke={accentColor}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: accentColor, strokeWidth: 1, stroke: "#ffffff" }}
                                        activeDot={{ r: 6, fill: accentColor }}
                                    >
                                        <LabelList dataKey="val" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#334155' }} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* BOTTOM CHART: % CUMPLIMIENTO BY MONTH (BAR CHART EXACT TO IMAGE 2) */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 tracking-wide">
                            % CUMPLIMIENTO by Month
                        </h4>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: any) => [`${value}%`, '% Cumplimiento']} />
                                    <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                        {monthlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.active ? accentColor : "#93c5fd"} />
                                        ))}
                                        <LabelList dataKey="val" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#334155' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* POWER BI BOTTOM FOOTER BAR */}
                <div className="bg-[#f8fafc] border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 select-none">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs inline-block"></span>
                            Microsoft Power BI
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                            <ChevronLeft size={13} className="cursor-pointer hover:text-black" />
                            <span>1 de 3</span>
                            <ChevronRight size={13} className="cursor-pointer hover:text-black" />
                        </div>
                        <span className="text-[11px] font-mono">94%</span>
                        <Maximize2 size={13} className="cursor-pointer hover:text-black" />
                    </div>
                </div>

            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col justify-between font-sans text-[#000000]">
            {/* Header */}
            <header className="w-full bg-[#324354] text-white shadow-md p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/home">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white font-bold text-sm transition cursor-pointer">
                            <ArrowLeft size={18} />
                            <span>Volver al Home</span>
                        </button>
                    </Link>
                    <h1 className="font-display font-light text-lg md:text-xl uppercase tracking-widest text-center">
                        Tablero de Control
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl tracking-wider leading-none">FIRPLAK</div>
                        <div className="text-[9px] opacity-70 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Sub-Header Actions: 5 PESTAÑAS (BI, MANUAL, NIVEL DE SERVICIO, PRODUCTIVIDAD, CALIDAD) */}
            <div className="w-full bg-white border-b border-[#e2ded5] py-3 px-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-2.5 sm:gap-3">
                    <button
                        onClick={() => setViewMode("bi")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "bi"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <LayoutGrid size={16} />
                        <span>Tablero BI</span>
                    </button>
                    <button
                        onClick={() => setViewMode("manual")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "manual"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <SlidersHorizontal size={16} />
                        <span>Tablero Manual</span>
                    </button>
                    <button
                        onClick={() => setViewMode("nivel-servicio")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "nivel-servicio"
                                ? "bg-[#0084ff] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <BarChart3 size={16} />
                        <span>Nivel de Servicio</span>
                    </button>
                    <button
                        onClick={() => setViewMode("productividad")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "productividad"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <TrendingUp size={16} />
                        <span>Productividad</span>
                    </button>
                    <button
                        onClick={() => setViewMode("calidad")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "calidad"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <ShieldCheck size={16} />
                        <span>Calidad</span>
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-20">
                {viewMode === "bi" ? (
                    <div className="w-full h-[650px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Tablero BI Productividad"
                            width="100%"
                            height="100%"
                            src="https://app.powerbi.com/view?r=eyJrIjoiN2MxNmUwZTUtYTY0MC00MmFjLWI2ZjctMDYzNDJlODU4MTk0IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9"
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : viewMode === "nivel-servicio" ? (
                    renderSimulatedReport(
                        "NIVEL DE SERVICIO",
                        "80.82 %",
                        2185,
                        664,
                        2849,
                        nivelServicioDaily,
                        nivelServicioMonthly,
                        "#0084ff"
                    )
                ) : viewMode === "productividad" ? (
                    renderSimulatedReport(
                        "PRODUCTIVIDAD",
                        "82.50 %",
                        4520,
                        959,
                        5479,
                        productividadDaily,
                        productividadMonthly,
                        "#324354"
                    )
                ) : viewMode === "calidad" ? (
                    renderSimulatedReport(
                        "CALIDAD DE PLANTA",
                        "80.90 %",
                        2305,
                        544,
                        2849,
                        calidadDaily,
                        calidadMonthly,
                        "#59a96a"
                    )
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        
                        {/* Top Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                            {/* Card 1: Nivel de Servicio */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META NIVEL DE SERVICIO = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("nivelServicio", nivelServicio)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "nivelServicio" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={nivelServicio}
                                                    onChange={(e) => setNivelServicio(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("nivelServicio")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {nivelServicio.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Nivel Servicio (%)
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Productividad % */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (%) = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadPct", productividadPct)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadPct" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={productividadPct}
                                                    onChange={(e) => setProductividadPct(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadPct")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadPct.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (%)
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Productividad PZ */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (PZ) = 630
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadPz", productividadPz)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadPz" ? (
                                            <input
                                                type="number"
                                                value={productividadPz}
                                                onChange={(e) => setProductividadPz(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadPz")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadPz.toLocaleString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (PZ)
                                    </span>
                                </div>
                            </div>

                            {/* Card 4: Productividad KG */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PROD. (KG) = 6300
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("productividadKg", productividadKg)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "productividadKg" ? (
                                            <input
                                                type="number"
                                                value={productividadKg}
                                                onChange={(e) => setProductividadKg(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("productividadKg")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {productividadKg.toLocaleString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (KG)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {/* Card 5: Calidad */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META CALIDAD = 90%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("calidad", calidad)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "calidad" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={calidad}
                                                    onChange={(e) => setCalidad(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("calidad")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {calidad.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Calidad
                                    </span>
                                </div>
                            </div>

                            {/* Card 6: Presentismo */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META PRESENTISMO = 100%
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("presentismo", presentismo)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "presentismo" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={presentismo}
                                                    onChange={(e) => setPresentismo(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => setEditingCard(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                                />
                                                <span className="text-4xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("presentismo")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {presentismo.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Presentismo
                                    </span>
                                </div>
                            </div>

                            {/* Card 7: Seguridad (Accidentes) */}
                            <div className="flex flex-col space-y-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-tight text-center uppercase">
                                    META SEGURIDAD = 0
                                </span>
                                <div className={`flex-1 min-h-[160px] flex flex-col justify-between p-6 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor("accidentes", accidentes)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingCard === "accidentes" ? (
                                            <input
                                                type="number"
                                                value={accidentes}
                                                onChange={(e) => setAccidentes(parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingCard(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-5xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-1"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingCard("accidentes")}
                                                className="cursor-pointer hover:bg-black/5 px-4 py-2 rounded-xl text-5xl font-black text-center tracking-tight transition"
                                            >
                                                {accidentes}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Accidentes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm border-t border-[#e2ded5] bg-white">
                &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
            </footer>
        </div>
    );
}
