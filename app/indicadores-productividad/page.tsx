"use client";

import React, { useState } from "react";
import { LayoutGrid, SlidersHorizontal, BarChart3, TrendingUp, ShieldCheck, UserX, Search, Filter, Calendar, Share2, Download, Maximize2, ChevronLeft, ChevronRight, Edit3, Users } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";
import Header from "@/components/opt-sistemica/Header";

// Plant keys supported
type PlantKey = "MS" | "FV" | "QZ" | "MBL" | "CEFI";

interface PlantMetrics {
    nivelServicioMeta: number;
    nivelServicioReal: number;
    productividadPctMeta: number;
    productividadPzMeta: number;
    productividadPzReal: number;
    hasSecondUnit: boolean;
    secondUnitName: "KG" | "MBL";
    secondUnitMeta: number;
    secondUnitReal: number;
    mesonesMeta?: number;
    mesonesReal?: number;
    calidadMeta: number;
    calidadReal: number;
    totalPersonas: number;
    ausentismos: number;
    presentismoMeta: number;
    accidentesMeta: number;
    accidentesReal: number;
}

const INITIAL_PLANT_DATA: Record<PlantKey, PlantMetrics> = {
    MS: {
        nivelServicioMeta: 90,
        nivelServicioReal: 80.0,
        productividadPctMeta: 90,
        productividadPzMeta: 550,
        productividadPzReal: 450,
        hasSecondUnit: true,
        secondUnitName: "KG",
        secondUnitMeta: 5500,
        secondUnitReal: 4500,
        mesonesMeta: 50,
        mesonesReal: 50,
        calidadMeta: 90,
        calidadReal: 82.0,
        totalPersonas: 65,
        ausentismos: 3,
        presentismoMeta: 100,
        accidentesMeta: 0,
        accidentesReal: 0,
    },
    FV: {
        nivelServicioMeta: 90,
        nivelServicioReal: 80.0,
        productividadPctMeta: 90,
        productividadPzMeta: 30,
        productividadPzReal: 25,
        hasSecondUnit: false,
        secondUnitName: "KG",
        secondUnitMeta: 0,
        secondUnitReal: 0,
        calidadMeta: 35,
        calidadReal: 25.0,
        totalPersonas: 22,
        ausentismos: 0,
        presentismoMeta: 100,
        accidentesMeta: 0,
        accidentesReal: 0,
    },
    QZ: {
        nivelServicioMeta: 90,
        nivelServicioReal: 100.0,
        productividadPctMeta: 90,
        productividadPzMeta: 15,
        productividadPzReal: 7,
        hasSecondUnit: false,
        secondUnitName: "KG",
        secondUnitMeta: 0,
        secondUnitReal: 0,
        calidadMeta: 90,
        calidadReal: 95.0,
        totalPersonas: 1,
        ausentismos: 1,
        presentismoMeta: 100,
        accidentesMeta: 0,
        accidentesReal: 0,
    },
    MBL: {
        nivelServicioMeta: 90,
        nivelServicioReal: 95.0,
        productividadPctMeta: 90,
        productividadPzMeta: 2700,
        productividadPzReal: 2430,
        hasSecondUnit: true,
        secondUnitName: "MBL",
        secondUnitMeta: 250,
        secondUnitReal: 200,
        calidadMeta: 90,
        calidadReal: 95.0,
        totalPersonas: 13,
        ausentismos: 1,
        presentismoMeta: 100,
        accidentesMeta: 0,
        accidentesReal: 0,
    },
    CEFI: {
        nivelServicioMeta: 90,
        nivelServicioReal: 80.0,
        productividadPctMeta: 90,
        productividadPzMeta: 2300,
        productividadPzReal: 2100,
        hasSecondUnit: true,
        secondUnitName: "MBL",
        secondUnitMeta: 200,
        secondUnitReal: 200,
        calidadMeta: 90,
        calidadReal: 95.0,
        totalPersonas: 12,
        ausentismos: 1,
        presentismoMeta: 100,
        accidentesMeta: 0,
        accidentesReal: 0,
    },
};

// URLs de Power BI cargadas desde variables de entorno para no exponerlas en el código fuente
const POWERBI_URLS = {
    tableroBI: process.env.NEXT_PUBLIC_POWERBI_TABLERO_BI ?? "",
    nivelServicio: process.env.NEXT_PUBLIC_POWERBI_NIVEL_SERVICIO ?? "",
    productividad: process.env.NEXT_PUBLIC_POWERBI_PRODUCTIVIDAD ?? "",
    calidadGeneral: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_GENERAL ?? "",
    calidadMS: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MS ?? "",
    calidadFV: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_FV ?? "",
    calidadMBL: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MBL ?? "",
    calidadCEFI: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_CEFI ?? "",
    calidadMoldes: process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MOLDES ?? "",
    ausentismo: process.env.NEXT_PUBLIC_POWERBI_AUSENTISMO ?? "",
};

export default function IndicadoresProductividadPage() {
    // View mode state (Default: "automatico")
    const [viewMode, setViewMode] = useState<"automatico" | "manual" | "bi" | "nivel-servicio" | "productividad" | "calidad" | "ausentismo">("automatico");
    const [calidadSubTab, setCalidadSubTab] = useState<"general" | "ms" | "fv" | "mbl" | "cefi" | "moldes">("ms");

    // Plant selector state
    const [selectedPlant, setSelectedPlant] = useState<PlantKey>("MS");

    // Manual date field (DD/MM/AAAA) defaulting to YESTERDAY
    const getYesterdayFormatted = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dd = String(yesterday.getDate()).padStart(2, "0");
        const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
        const yyyy = yesterday.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };
    const [fechaManual, setFechaManual] = useState<string>(getYesterdayFormatted());

    // Separate Plant Data States for Manual and Automático dashboards
    const [manualPlantData, setManualPlantData] = useState<Record<PlantKey, PlantMetrics>>(INITIAL_PLANT_DATA);
    const [autoPlantData, setAutoPlantData] = useState<Record<PlantKey, PlantMetrics>>(INITIAL_PLANT_DATA);

    // Active plant data depending on selected tab
    const plantData = viewMode === "automatico" ? autoPlantData : manualPlantData;
    const setPlantData = viewMode === "automatico" ? setAutoPlantData : setManualPlantData;

    // Editing states for values or metas
    const [editingKey, setEditingKey] = useState<string | null>(null);

    const currentData = plantData[selectedPlant];

    // Helper to update state for current plant
    const updateCurrentPlant = (fields: Partial<PlantMetrics>) => {
        setPlantData((prev) => ({
            ...prev,
            [selectedPlant]: {
                ...prev[selectedPlant],
                ...fields,
            },
        }));
    };

    // Calculate dynamic Productividad %: (piezasReal / piezasMeta) * 100
    const calcProdPctReal = currentData.productividadPzMeta > 0
        ? (currentData.productividadPzReal / currentData.productividadPzMeta) * 100
        : 0;

    // Calculate dynamic Presentismo %: ((totalPersonas - ausentismos) / totalPersonas) * 100
    const calcPresentismoReal = currentData.totalPersonas > 0
        ? ((currentData.totalPersonas - currentData.ausentismos) / currentData.totalPersonas) * 100
        : 100;

    // Color semáforo logic:
    // Porcentaje del valor real sobre la meta:
    // Verde: > 90% del cumplimiento sobre la meta (o >= 90%)
    // Amarillo: >= 85% y <= 90% sobre la meta
    // Rojo: < 85% sobre la meta
    const getCardColor = (realVal: number, metaVal: number, isAccidentes = false, isNoApplies = false) => {
        if (isNoApplies) return "bg-slate-200 border-slate-300 text-slate-400 opacity-80";
        if (isAccidentes) return realVal === 0 ? "bg-[#59a96a]" : "bg-[#d14747]";
        if (metaVal <= 0) return "bg-[#59a96a]";

        const pctOfMeta = (realVal / metaVal) * 100;
        if (pctOfMeta > 90) return "bg-[#59a96a]";
        if (pctOfMeta >= 85) return "bg-[#deb841]";
        return "bg-[#d14747]";
    };

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col justify-between font-sans text-[#000000]">
            {/* Header */}
            <Header
                title="Tablero de Control"
                subtitle="Indicadores de Productividad"
                backUrl="/home"
                showLogout={false}
            />

            {/* Sub-Header Actions */}
            <div className="w-full bg-white border-b border-[#e2ded5] py-2.5 px-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-3">
                    {/* 1. Tablero Automático */}
                    <button
                        onClick={() => setViewMode("automatico")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "automatico"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <SlidersHorizontal size={15} />
                        <span>Tablero Automático</span>
                    </button>

                    {/* 2. Tablero Manual */}
                    <button
                        onClick={() => setViewMode("manual")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "manual"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <SlidersHorizontal size={15} />
                        <span>Tablero Manual</span>
                    </button>

                    {/* 3. Control de Piso MS */}
                    <button
                        onClick={() => setViewMode("bi")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "bi"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <LayoutGrid size={15} />
                        <span>Control de Piso MS</span>
                    </button>

                    {/* 4. Nivel de Servicio */}
                    <button
                        onClick={() => setViewMode("nivel-servicio")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "nivel-servicio"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <BarChart3 size={15} />
                        <span>Nivel de Servicio</span>
                    </button>

                    {/* 5. Productividad */}
                    <button
                        onClick={() => setViewMode("productividad")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "productividad"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <TrendingUp size={15} />
                        <span>Productividad</span>
                    </button>

                    {/* 6. Calidad */}
                    <button
                        onClick={() => setViewMode("calidad")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "calidad"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <ShieldCheck size={15} />
                        <span>Calidad</span>
                    </button>

                    {/* 7. Ausentismo */}
                    <button
                        onClick={() => setViewMode("ausentismo")}
                        className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs sm:text-sm rounded-xl transition duration-200 cursor-pointer ${
                            viewMode === "ausentismo"
                                ? "bg-[#324354] text-white shadow-md"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                    >
                        <UserX size={15} />
                        <span>Ausentismo</span>
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 pb-6">
                {viewMode === "bi" ? (
                    <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                        <iframe
                            title="Control de Piso MS"
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
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => setCalidadSubTab("general")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "general"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad General Plantas
                            </button>
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
                            <button
                                onClick={() => setCalidadSubTab("mbl")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "mbl"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad MBL
                            </button>
                            <button
                                onClick={() => setCalidadSubTab("cefi")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "cefi"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad CEFI
                            </button>
                            <button
                                onClick={() => setCalidadSubTab("moldes")}
                                className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                                    calidadSubTab === "moldes"
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                            >
                                Calidad Moldes
                            </button>
                        </div>
                        <div className="w-full h-[750px] bg-white rounded-3xl shadow-sm border border-[#e2ded5] overflow-hidden">
                            <iframe
                                title={`Power BI Calidad ${calidadSubTab}`}
                                width="100%"
                                height="100%"
                                src={
                                    calidadSubTab === "general" ? POWERBI_URLS.calidadGeneral :
                                    calidadSubTab === "ms" ? POWERBI_URLS.calidadMS :
                                    calidadSubTab === "fv" ? POWERBI_URLS.calidadFV :
                                    calidadSubTab === "mbl" ? POWERBI_URLS.calidadMBL :
                                    calidadSubTab === "cefi" ? POWERBI_URLS.calidadCEFI :
                                    POWERBI_URLS.calidadMoldes
                                }
                                frameBorder="0"
                                allowFullScreen={true}
                            ></iframe>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Header Bar with Plant Selector & Date Field DD/MM/AAAA */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1.5 border-b border-[#e2ded5]">
                            {/* Plant Filter Box */}
                            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#e2ded5] shadow-sm">
                                <Filter size={16} className="text-[#324354]" />
                                <span className="text-xs font-extrabold text-[#324354] uppercase tracking-wide">
                                    PLANTA:
                                </span>
                                <div className="flex items-center gap-1.5 ml-1">
                                    {(["MS", "FV", "QZ", "MBL", "CEFI"] as PlantKey[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => {
                                                setSelectedPlant(p);
                                                setEditingKey(null);
                                            }}
                                            className={`px-3.5 py-1 rounded-lg font-black text-xs transition-all duration-200 cursor-pointer ${
                                                selectedPlant === p
                                                    ? "bg-[#324354] text-white shadow-sm scale-105"
                                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Manual Date Field (DD/MM/AAAA) in top right */}
                            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-[#e2ded5] shadow-sm">
                                <Calendar size={16} className="text-[#324354]" />
                                <span className="text-xs font-extrabold text-[#324354] uppercase tracking-wide">
                                    FECHA:
                                </span>
                                <input
                                    type="text"
                                    value={fechaManual}
                                    onChange={(e) => setFechaManual(e.target.value)}
                                    placeholder="DD/MM/AAAA"
                                    className="w-28 text-xs font-black text-center text-[#324354] bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-[#324354] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Top Cards Grid (Ajustado la altura a 175px para cubrir perfectamente el espacio inferior) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Card 1: Nivel de Servicio */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META NIVEL DE SERVICIO = </span>
                                    {editingKey === "meta_nivelServicio" ? (
                                        <input
                                            type="number"
                                            value={currentData.nivelServicioMeta}
                                            onChange={(e) => updateCurrentPlant({ nivelServicioMeta: parseFloat(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-14 px-1 text-center bg-white border border-slate-300 rounded font-bold"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_nivelServicio")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed"
                                        >
                                            {currentData.nivelServicioMeta}%
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.nivelServicioReal, currentData.nivelServicioMeta)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingKey === "real_nivelServicio" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={currentData.nivelServicioReal}
                                                    onChange={(e) => updateCurrentPlant({ nivelServicioReal: parseFloat(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-0.5"
                                                />
                                                <span className="text-3xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingKey("real_nivelServicio")}
                                                className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                            >
                                                {currentData.nivelServicioReal.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Nivel Servicio (%)
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Productividad % (Calculado: Piezas Real / Meta) */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META PROD. (%) = </span>
                                    {editingKey === "meta_productividadPct" ? (
                                        <input
                                            type="number"
                                            value={currentData.productividadPctMeta}
                                            onChange={(e) => updateCurrentPlant({ productividadPctMeta: parseFloat(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-14 px-1 text-center bg-white border border-slate-300 rounded font-bold"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_productividadPct")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed"
                                        >
                                            {currentData.productividadPctMeta}%
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(calcProdPctReal, currentData.productividadPctMeta)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        <span className="px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap">
                                            {calcProdPctReal.toFixed(1)} %
                                        </span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (%) <span className="text-[10px] opacity-75 font-semibold lowercase block">(calculado: piezas real/meta)</span>
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Productividad PZ */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META PROD. (PZ) = </span>
                                    {editingKey === "meta_productividadPz" ? (
                                        <input
                                            type="number"
                                            value={currentData.productividadPzMeta}
                                            onChange={(e) => updateCurrentPlant({ productividadPzMeta: parseInt(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-16 px-1 text-center bg-white border border-slate-300 rounded font-bold text-slate-900"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_productividadPz")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed text-[#324354] font-black"
                                        >
                                            {currentData.productividadPzMeta}
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.productividadPzReal, currentData.productividadPzMeta)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingKey === "real_productividadPz" ? (
                                            <input
                                                type="number"
                                                value={currentData.productividadPzReal}
                                                onChange={(e) => updateCurrentPlant({ productividadPzReal: parseInt(e.target.value) || 0 })}
                                                onBlur={() => setEditingKey(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-0.5"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingKey("real_productividadPz")}
                                                className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                            >
                                                {currentData.productividadPzReal.toLocaleString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Productividad (PZ)
                                    </span>
                                </div>
                            </div>

                            {/* Card 4 (Top Grid): Mesones (solo en MS) o Productividad (KG / MBL / NO APLICA) */}
                            {selectedPlant === "MS" ? (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                        <span>META MESONES = </span>
                                        {editingKey === "meta_mesones" ? (
                                            <input
                                                type="number"
                                                value={currentData.mesonesMeta ?? 50}
                                                onChange={(e) => updateCurrentPlant({ mesonesMeta: parseInt(e.target.value) || 0 })}
                                                onBlur={() => setEditingKey(null)}
                                                autoFocus
                                                className="w-16 px-1 text-center bg-white border border-slate-300 rounded font-bold text-slate-900"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => setEditingKey("meta_mesones")}
                                                className="cursor-pointer hover:underline underline-offset-2 decoration-dashed text-[#324354] font-black"
                                            >
                                                {currentData.mesonesMeta ?? 50}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.mesonesReal ?? 50, currentData.mesonesMeta ?? 50)}`}>
                                        <div className="flex-1 flex items-center justify-center text-slate-950">
                                            {editingKey === "real_mesones" ? (
                                                <input
                                                    type="number"
                                                    value={currentData.mesonesReal ?? 50}
                                                    onChange={(e) => updateCurrentPlant({ mesonesReal: parseInt(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-0.5"
                                                />
                                            ) : (
                                                <span 
                                                    onClick={() => setEditingKey("real_mesones")}
                                                    className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                                >
                                                    {(currentData.mesonesReal ?? 50).toLocaleString("es-CO")}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                            Mesones
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-2">
                                    {currentData.hasSecondUnit ? (
                                        <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                            <span>META PROD. ({currentData.secondUnitName}) = </span>
                                            {editingKey === "meta_secondUnit" ? (
                                                <input
                                                    type="number"
                                                    value={currentData.secondUnitMeta}
                                                    onChange={(e) => updateCurrentPlant({ secondUnitMeta: parseInt(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="w-16 px-1 text-center bg-white border border-slate-300 rounded font-bold text-slate-900"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => setEditingKey("meta_secondUnit")}
                                                    className="cursor-pointer hover:underline underline-offset-2 decoration-dashed text-[#324354] font-black"
                                                >
                                                    {currentData.secondUnitMeta}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-400 tracking-tight text-center uppercase">
                                            PROD. (KG / MBL) = NO APLICA
                                        </span>
                                    )}
                                    
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.secondUnitReal, currentData.secondUnitMeta, false, !currentData.hasSecondUnit)}`}>
                                        <div className="flex-1 flex items-center justify-center text-slate-950">
                                            {!currentData.hasSecondUnit ? (
                                                <span className="text-2xl font-black text-slate-400 tracking-wider whitespace-nowrap">
                                                    NO APLICA
                                                </span>
                                            ) : editingKey === "real_secondUnit" ? (
                                                <input
                                                    type="number"
                                                    value={currentData.secondUnitReal}
                                                    onChange={(e) => updateCurrentPlant({ secondUnitReal: parseInt(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-0.5"
                                                />
                                            ) : (
                                                <span 
                                                    onClick={() => setEditingKey("real_secondUnit")}
                                                    className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                                >
                                                    {currentData.secondUnitReal.toLocaleString("es-CO")}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                            Productividad ({currentData.hasSecondUnit ? currentData.secondUnitName : "N/A"})
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Cards Grid */}
                        <div className={`grid grid-cols-1 ${selectedPlant === "MS" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3 max-w-5xl"} gap-5 mx-auto`}>
                            {/* Card Productividad (KG) - Reubicado en fila 2 para la planta MS */}
                            {selectedPlant === "MS" && (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                        <span>META PROD. ({currentData.secondUnitName}) = </span>
                                        {editingKey === "meta_secondUnit" ? (
                                            <input
                                                type="number"
                                                value={currentData.secondUnitMeta}
                                                onChange={(e) => updateCurrentPlant({ secondUnitMeta: parseInt(e.target.value) || 0 })}
                                                onBlur={() => setEditingKey(null)}
                                                autoFocus
                                                className="w-16 px-1 text-center bg-white border border-slate-300 rounded font-bold text-slate-900"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => setEditingKey("meta_secondUnit")}
                                                className="cursor-pointer hover:underline underline-offset-2 decoration-dashed text-[#324354] font-black"
                                            >
                                                {currentData.secondUnitMeta}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.secondUnitReal, currentData.secondUnitMeta, false, !currentData.hasSecondUnit)}`}>
                                        <div className="flex-1 flex items-center justify-center text-slate-950">
                                            {editingKey === "real_secondUnit" ? (
                                                <input
                                                    type="number"
                                                    value={currentData.secondUnitReal}
                                                    onChange={(e) => updateCurrentPlant({ secondUnitReal: parseInt(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-36 py-0.5"
                                                />
                                            ) : (
                                                <span 
                                                    onClick={() => setEditingKey("real_secondUnit")}
                                                    className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                                >
                                                    {currentData.secondUnitReal.toLocaleString("es-CO")}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                            Productividad ({currentData.secondUnitName})
                                        </span>
                                    </div>
                                </div>
                            )}
                            {/* Card 5: Calidad */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META CALIDAD = </span>
                                    {editingKey === "meta_calidad" ? (
                                        <input
                                            type="number"
                                            value={currentData.calidadMeta}
                                            onChange={(e) => updateCurrentPlant({ calidadMeta: parseFloat(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-14 px-1 text-center bg-white border border-slate-300 rounded font-bold"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_calidad")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed"
                                        >
                                            {currentData.calidadMeta}%
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.calidadReal, currentData.calidadMeta)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingKey === "real_calidad" ? (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={currentData.calidadReal}
                                                    onChange={(e) => updateCurrentPlant({ calidadReal: parseFloat(e.target.value) || 0 })}
                                                    onBlur={() => setEditingKey(null)}
                                                    autoFocus
                                                    className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-0.5"
                                                />
                                                <span className="text-3xl font-extrabold text-slate-950">%</span>
                                            </div>
                                        ) : (
                                            <span 
                                                onClick={() => setEditingKey("real_calidad")}
                                                className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                            >
                                                {currentData.calidadReal.toFixed(1)} %
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Calidad
                                    </span>
                                </div>
                            </div>

                            {/* Card 6: Presentismo (Calculado: (Total - Ausentismos) / Total) */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META PRESENTISMO = </span>
                                    {editingKey === "meta_presentismo" ? (
                                        <input
                                            type="number"
                                            value={currentData.presentismoMeta}
                                            onChange={(e) => updateCurrentPlant({ presentismoMeta: parseFloat(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-14 px-1 text-center bg-white border border-slate-300 rounded font-bold"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_presentismo")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed"
                                        >
                                            {currentData.presentismoMeta}%
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(calcPresentismoReal, currentData.presentismoMeta)}`}>
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-950">
                                        {editingKey === "real_ausentismos" ? (
                                            <div className="flex flex-col items-center gap-1 bg-white/40 p-2 rounded-xl">
                                                <div className="flex items-center gap-2 text-xs font-extrabold">
                                                    <span>Faltas / Ausentismos:</span>
                                                    <input
                                                        type="number"
                                                        value={currentData.ausentismos}
                                                        onChange={(e) => updateCurrentPlant({ ausentismos: parseInt(e.target.value) || 0 })}
                                                        className="w-14 p-0.5 text-center bg-white border rounded font-black text-slate-900"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-extrabold">
                                                    <span>Total Personal:</span>
                                                    <input
                                                        type="number"
                                                        value={currentData.totalPersonas}
                                                        onChange={(e) => updateCurrentPlant({ totalPersonas: parseInt(e.target.value) || 1 })}
                                                        className="w-14 p-0.5 text-center bg-white border rounded font-black text-slate-900"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setEditingKey(null)}
                                                    className="mt-0.5 px-2.5 py-0.5 bg-[#324354] text-white rounded text-xs font-bold"
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setEditingKey("real_ausentismos")}
                                                className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl flex flex-col items-center transition"
                                            >
                                                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap">
                                                    {calcPresentismoReal.toFixed(1)} %
                                                </span>
                                                <span className="text-xs font-extrabold text-slate-900/80 mt-0.5 whitespace-nowrap">
                                                    ({currentData.ausentismos} ausentismos / {currentData.totalPersonas} pers.)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Presentismo
                                    </span>
                                </div>
                            </div>

                            {/* Card 7: Seguridad (Accidentes) */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase">
                                    <span>META SEGURIDAD = </span>
                                    {editingKey === "meta_accidentes" ? (
                                        <input
                                            type="number"
                                            value={currentData.accidentesMeta}
                                            onChange={(e) => updateCurrentPlant({ accidentesMeta: parseInt(e.target.value) || 0 })}
                                            onBlur={() => setEditingKey(null)}
                                            autoFocus
                                            className="w-14 px-1 text-center bg-white border border-slate-300 rounded font-bold"
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingKey("meta_accidentes")}
                                            className="cursor-pointer hover:underline underline-offset-2 decoration-dashed"
                                        >
                                            {currentData.accidentesMeta}
                                        </span>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.accidentesReal, currentData.accidentesMeta, true)}`}>
                                    <div className="flex-1 flex items-center justify-center text-slate-950">
                                        {editingKey === "real_accidentes" ? (
                                            <input
                                                type="number"
                                                value={currentData.accidentesReal}
                                                onChange={(e) => updateCurrentPlant({ accidentesReal: parseInt(e.target.value) || 0 })}
                                                onBlur={() => setEditingKey(null)}
                                                autoFocus
                                                className="bg-white/30 border border-black/10 rounded-lg text-slate-950 text-4xl font-black text-center focus:ring-2 focus:ring-[#324354] focus:outline-none w-32 py-0.5"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => setEditingKey("real_accidentes")}
                                                className="cursor-pointer hover:bg-black/5 px-2 py-1 rounded-xl text-3xl sm:text-4xl lg:text-5xl font-black text-center tracking-tight whitespace-nowrap transition"
                                            >
                                                {currentData.accidentesReal}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider text-center mt-2">
                                        Accidentes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}



