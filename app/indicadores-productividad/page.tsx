"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, SlidersHorizontal, BarChart3, TrendingUp, ShieldCheck, UserX, Search, Filter, Share2, Download, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
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

// URLs de Power BI cargadas desde variables de entorno para no exponerlas en el código fuente
const POWERBI_URLS = {
    tableroBI: process.env.NEXT_PUBLIC_POWERBI_TABLERO_BI ?? "",
    nivelServicio: process.env.NEXT_PUBLIC_POWERBI_NIVEL_SERVICIO ?? "",
    productividad: process.env.NEXT_PUBLIC_POWERBI_PRODUCTIVIDAD ?? "",
    calidadMS: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MS ?? "",
    calidadFV: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_FV ?? "",
    ausentismo: process.env.NEXT_PUBLIC_POWERBI_AUSENTISMO ?? "",
};

export default function IndicadoresProductividadPage() {
    const [viewMode, setViewMode] = useState<"bi" | "manual" | "nivel-servicio" | "productividad" | "calidad" | "ausentismo">("bi");
    const [calidadSubTab, setCalidadSubTab] = useState<"ms" | "fv">("ms");

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
                                ? "bg-[#324354] text-white shadow-md"
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
                    <button
                        onClick={() => setViewMode("ausentismo")}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "ausentismo"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <UserX size={16} />
                        <span>Ausentismo</span>
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-20">
                {viewMode === "bi" ? (
                    <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Tablero BI Productividad"
                            width="100%"
                            height="100%"
                            src={POWERBI_URLS.tableroBI}
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : viewMode === "nivel-servicio" ? (
                    <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Power BI Nivel de Servicio"
                            width="100%"
                            height="100%"
                            src={POWERBI_URLS.nivelServicio}
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : viewMode === "productividad" ? (
                    <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Power BI Nivel de Productividad"
                            width="100%"
                            height="100%"
                            src={POWERBI_URLS.productividad}
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : viewMode === "ausentismo" ? (
                    <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Power BI Ausentismo"
                            width="100%"
                            height="100%"
                            src={POWERBI_URLS.ausentismo}
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full border-none"
                        ></iframe>
                    </div>
                ) : viewMode === "calidad" ? (
                    <div className="space-y-4">
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setCalidadSubTab("ms")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "ms"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad MS
                            </button>
                            <button
                                onClick={() => setCalidadSubTab("fv")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "fv"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad FV
                            </button>
                        </div>
                        <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                            <iframe
                                title={calidadSubTab === "ms" ? "Power BI Calidad MS" : "Power BI Calidad FV"}
                                width="100%"
                                height="100%"
                                src={calidadSubTab === "ms" ? POWERBI_URLS.calidadMS : POWERBI_URLS.calidadFV}
                                frameBorder="0"
                                allowFullScreen={true}
                            ></iframe>
                        </div>
                    </div>
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
