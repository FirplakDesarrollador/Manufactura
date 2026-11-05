"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid, SlidersHorizontal, BarChart3, TrendingUp, ShieldCheck, UserX, Search, Filter, Calendar, Share2, Download, Maximize2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit3, Wrench, Building2, Activity, Users, RefreshCw, CheckCircle2, Clock, Hammer } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";
import Header from "@/components/opt-sistemica/Header";
import CarruselPestanas from "@/components/ui/CarruselPestanas";
import { supabase } from "@/lib/supabase";
import IndicadoresCalidadView, { MAIN_SUBHEADER_TABS, type MainTabKey } from "@/components/calidad/IndicadoresCalidadView";
import HoraAHoraPlantasView from "@/components/indicadores/HoraAHoraPlantasView";
import RmoldDashboard from "@/components/indicadores/RmoldDashboard";

// Plant keys supported
type PlantKey = "MS" | "FV" | "QZ" | "MBL" | "CEFI" | "RMOLD";

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
        calidadMeta: 35, // Meta IFI FV del Power BI "BI Calidad FV"
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
    RMOLD: {
        nivelServicioMeta: 90,
        nivelServicioReal: 85.0,
        productividadPctMeta: 90,
        productividadPzMeta: 24,
        productividadPzReal: 24,
        hasSecondUnit: false,
        secondUnitName: "KG",
        secondUnitMeta: 0,
        secondUnitReal: 0,
        calidadMeta: 90,
        calidadReal: 92.0,
        totalPersonas: 10,
        ausentismos: 0,
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

// Pestañas del Tablero de Control (segundo nivel), en este orden
type VistaTablero = "hora-a-hora" | "tablero" | "bi" | "nivel-servicio" | "productividad" | "calidad" | "mantenimiento" | "sistema-produccion" | "rmold" | "variacion" | "ausentismo";
const PESTANAS_TABLERO: { id: VistaTablero; label: string; icon: React.ReactNode }[] = [
    { id: "hora-a-hora", label: "Tiempo Real", icon: <Clock size={14} /> },
    { id: "tablero", label: "Tablero de Control", icon: <SlidersHorizontal size={14} /> },
    { id: "bi", label: "Control de Piso", icon: <LayoutGrid size={14} /> },
    { id: "nivel-servicio", label: "Nivel de Servicio", icon: <BarChart3 size={14} /> },
    { id: "productividad", label: "Productividad", icon: <TrendingUp size={14} /> },
    { id: "calidad", label: "Calidad", icon: <ShieldCheck size={14} /> },
    { id: "mantenimiento", label: "Mantenimiento", icon: <Wrench size={14} /> },
    { id: "sistema-produccion", label: "Sistema de Producción", icon: <Building2 size={14} /> },
    { id: "rmold", label: "RMOLD", icon: <Hammer size={14} /> },
    { id: "variacion", label: "Variación", icon: <Activity size={14} /> },
    { id: "ausentismo", label: "Ausentismo", icon: <UserX size={14} /> }
];

// Pestañas nuevas que aún no tienen tablero
const VISTAS_EN_CONSTRUCCION: Partial<Record<VistaTablero, string>> = {
    mantenimiento: "Indicadores de mantenimiento (preventivo, correctivo, TPM y disponibilidad de máquinas).",
    "sistema-produccion": "Indicadores del Sistema de Producción (5S, auditorías y bitácora).",
    variacion: "Variación de los indicadores frente a la meta y al periodo anterior."
};

export default function IndicadoresProductividadPage() {
    // View mode state (Default: "tablero")
    const [viewMode, setViewMode] = useState<VistaTablero>("tablero");
    // Tercer nivel (pestañas de Calidad): se despliega u oculta con la flecha del botón Calidad
    const [calidadMenuAbierto, setCalidadMenuAbierto] = useState(true);
    const [calidadTab, setCalidadTab] = useState<MainTabKey>("CALIDAD_IFI");

    // La pestaña queda en la dirección (?vista=calidad&sub=CALIDAD_IFI) para que al refrescar o compartir
    // el enlace se abra la misma vista
    const [urlLeida, setUrlLeida] = useState(false);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const vista = params.get("vista");
        const sub = params.get("sub");
        if (vista && PESTANAS_TABLERO.some(p => p.id === vista)) setViewMode(vista as VistaTablero);
        if (sub && MAIN_SUBHEADER_TABS.some(t => t.id === sub)) setCalidadTab(sub as MainTabKey);
        setUrlLeida(true);
    }, []);
    useEffect(() => {
        if (!urlLeida) return;
        const url = new URL(window.location.href);
        url.searchParams.set("vista", viewMode);
        if (viewMode === "calidad") url.searchParams.set("sub", calidadTab);
        else url.searchParams.delete("sub");
        window.history.replaceState(null, "", url.toString());
    }, [urlLeida, viewMode, calidadTab]);

    // Plant selector state
    const [selectedPlant, setSelectedPlant] = useState<PlantKey>("MS");

    // Fecha hábil anterior a hoy por defecto (en formato YYYY-MM-DD para el input type="date")
    const getPreviousBusinessDayISO = () => {
        const date = new Date();
        const dayOfWeek = date.getDay(); // 0: Dom, 1: Lun, 2: Mar, ..., 6: Sáb

        if (dayOfWeek === 1) {
            // Si hoy es Lunes -> Viernes (-3 días)
            date.setDate(date.getDate() - 3);
        } else if (dayOfWeek === 0) {
            // Si hoy es Domingo -> Viernes (-2 días)
            date.setDate(date.getDate() - 2);
        } else if (dayOfWeek === 6) {
            // Si hoy es Sábado -> Viernes (-1 día)
            date.setDate(date.getDate() - 1);
        } else {
            // Martes a Viernes -> Ayer (-1 día)
            date.setDate(date.getDate() - 1);
        }

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [fechaISO, setFechaISO] = useState<string>(getPreviousBusinessDayISO());
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [loadingNS, setLoadingNS] = useState<boolean>(false);

    // Unified Plant Data State: stores initial/automatic values and user edits
    const [plantData, setPlantData] = useState<Record<PlantKey, PlantMetrics>>(INITIAL_PLANT_DATA);

    // Función para consultar Nivel de Servicio y Calidad en tiempo real
    const fetchNivelServicio = async (targetFecha: string) => {
        try {
            setLoadingNS(true);
            // Calidad MS se lee de tablas con RLS: la API necesita el token de la sesión
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            const [resNS, resCalidad] = await Promise.all([
                fetch(`/api/indicadores/nivel-servicio?fecha=${targetFecha}`),
                fetch(`/api/indicadores/calidad?fecha=${targetFecha}`, {
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                })
            ]);

            const jsonNS = resNS.ok ? await resNS.json() : null;
            const jsonCalidad = resCalidad.ok ? await resCalidad.json() : null;

            setPlantData((prev) => {
                const updated = { ...prev };

                // Actualizar Nivel de Servicio automático
                if (jsonNS?.success && jsonNS.plantas) {
                    for (const [pKey, vals] of Object.entries(jsonNS.plantas)) {
                        const pk = pKey as PlantKey;
                        if (updated[pk]) {
                            const valNum = (vals as any).nivelServicio;
                            if (typeof valNum === "number") {
                                updated[pk] = {
                                    ...updated[pk],
                                    nivelServicioReal: valNum,
                                };
                            }
                        }
                    }
                }

                // Actualizar Calidad (%) automático
                if (jsonCalidad?.success && jsonCalidad.plantas) {
                    for (const [pKey, vals] of Object.entries(jsonCalidad.plantas)) {
                        const pk = pKey as PlantKey;
                        if (updated[pk]) {
                            const calNum = (vals as any).calidad;
                            if (typeof calNum === "number") {
                                updated[pk] = {
                                    ...updated[pk],
                                    calidadReal: calNum,
                                };
                            }
                        }
                    }
                }

                return updated;
            });

            const now = new Date();
            const horaStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastUpdated(horaStr);
        } catch (err) {
            console.error("Error fetching live Indicadores:", err);
        } finally {
            setLoadingNS(false);
        }
    };

    // Consultar automáticamente los valores automáticos al entrar
    useEffect(() => {
        void fetchNivelServicio(fechaISO);
    }, []);

    // Editing states for values or metas
    const [editingKey, setEditingKey] = useState<string | null>(null);

    const currentData = plantData[selectedPlant];

    // Helper to update state for current plant (permite modificar cualquier valor)
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

    // Color semáforo unificado para todos los recuadros de todas las plantas:
    // Verde: > 90%
    // Amarillo: 85% - 90% (>= 85% y <= 90%)
    // Rojo: < 85%
    // Excepción única: Accidentes (0 es verde, mayor a 0 es rojo)
    const getCardColor = (valOrPct: number, isAccidentes = false, isNoApplies = false) => {
        if (isNoApplies) return "bg-slate-200 border-slate-300 text-slate-400 opacity-80";
        if (isAccidentes) return valOrPct === 0 ? "bg-[#59a96a]" : "bg-[#d14747]";

        // Umbrales sobre meta 90; para otra meta se desplaza el valor (ej. calidad: real - meta + 90)
        if (valOrPct > 90) return "bg-[#59a96a]";
        if (valOrPct >= 85) return "bg-[#deb841]";
        return "bg-[#d14747]";
    };

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col justify-between font-sans text-[#000000]">
            {/* Header */}
            <Header
                title="Tablero de Control"
                subtitle=""
                compact={true}
                backUrl="/home"
                showLogout={false}
            />

            {/* Sub-Header Actions (segundo nivel): pegado debajo del banner (h-12) */}
            <div className="w-full bg-white border-b border-[#e2ded5] px-4 shadow-2xs h-10 flex items-center sticky top-12 z-40">
                <CarruselPestanas className="max-w-[1800px] mx-auto">
                    {PESTANAS_TABLERO.map(p => {
                        const activa = viewMode === p.id;
                        const esCalidad = p.id === "calidad";
                        return (
                            <button
                                key={p.id}
                                onClick={() => {
                                    // Calidad: su flecha despliega u oculta el tercer nivel (pestañas de Calidad)
                                    if (esCalidad && activa) setCalidadMenuAbierto(v => !v);
                                    else {
                                        setViewMode(p.id);
                                        if (esCalidad) setCalidadMenuAbierto(true);
                                    }
                                }}
                                title={esCalidad && activa ? (calidadMenuAbierto ? "Ocultar pestañas de Calidad" : "Mostrar pestañas de Calidad") : p.label}
                                className={`flex items-center gap-1.5 h-7 px-3 font-bold text-[11px] sm:text-xs rounded-lg transition duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                                    activa ? "bg-[#324354] text-white shadow-md" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                            >
                                {p.icon}
                                <span>{p.label}</span>
                                {esCalidad && (activa && calidadMenuAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                            </button>
                        );
                    })}
                </CarruselPestanas>
            </div>

            {/* Tercer nivel: pestañas de Calidad, pegado al segundo y con su misma altura */}
            {viewMode === "calidad" && calidadMenuAbierto && (
                <div className="w-full bg-white border-b border-[#e2ded5] px-4 shadow-2xs h-10 flex items-center sticky top-[88px] z-30">
                    <CarruselPestanas className="max-w-[1800px] mx-auto">
                        {MAIN_SUBHEADER_TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setCalidadTab(t.id)}
                                className={`flex items-center gap-1.5 h-7 px-3 font-bold text-[11px] sm:text-xs rounded-lg transition duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                                    calidadTab === t.id
                                        ? "bg-[#324354] text-white shadow-md"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </CarruselPestanas>
                </div>
            )}

            {/* Main Area */}
            <main className={`flex-1 w-full mx-auto ${viewMode === "calidad" || viewMode === "hora-a-hora" || viewMode === "rmold" ? "max-w-[1900px] p-2 sm:p-4 pb-6" : "max-w-7xl p-3 sm:p-4 pb-6"}`}>
                {viewMode === "hora-a-hora" ? (
                    <div className="w-full animate-in fade-in duration-300">
                        <HoraAHoraPlantasView fecha={fechaISO} />
                    </div>
                ) : viewMode === "bi" ? (
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
                ) : VISTAS_EN_CONSTRUCCION[viewMode] ? (
                    <div className="w-full bg-white rounded-3xl shadow-sm border border-[#e2ded5] p-10 flex flex-col items-center justify-center text-center gap-2 min-h-[320px] animate-in fade-in duration-300">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">En construcción</span>
                        <h2 className="text-lg font-black text-[#324354]">{PESTANAS_TABLERO.find(p => p.id === viewMode)?.label}</h2>
                        <p className="text-sm text-slate-500 max-w-md">{VISTAS_EN_CONSTRUCCION[viewMode]}</p>
                    </div>
                ) : viewMode === "rmold" ? (
                    <div className="w-full animate-in fade-in duration-300">
                        <RmoldDashboard />
                    </div>
                ) : viewMode === "calidad" ? (
                    <div className="w-full animate-in fade-in duration-300">
                        <IndicadoresCalidadView showMainHeader={false} tab={calidadTab} onTabChange={setCalidadTab} ocultarPestanas />
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
                                    {(["MS", "FV", "QZ", "MBL", "CEFI", "RMOLD"] as PlantKey[]).map((p) => (
                                        <button
                                            key={p}
                                            title={p === "RMOLD" ? "Reparación de Moldes (RMOLD)" : undefined}
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

                            {/* Selector de Fecha con Calendario Interactivo, Botón Buscar e Indicador de Actualización */}
                            <div className="flex flex-wrap items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-xl border border-[#e2ded5] shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} className="text-[#324354]" />
                                    <span className="text-xs font-extrabold text-[#324354] uppercase tracking-wide">
                                        FECHA:
                                    </span>
                                    <input
                                        type="date"
                                        value={fechaISO}
                                        onChange={(e) => {
                                            const newFecha = e.target.value;
                                            setFechaISO(newFecha);
                                            if (newFecha) {
                                                void fetchNivelServicio(newFecha);
                                            }
                                        }}
                                        className="text-xs font-bold text-[#324354] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-[#324354] focus:outline-none cursor-pointer"
                                    />
                                </div>

                                {/* Botón Actualizar */}
                                <button
                                    onClick={() => fetchNivelServicio(fechaISO)}
                                    disabled={loadingNS}
                                    title="Recargar valores automáticos para esta fecha"
                                    className="flex items-center gap-1.5 bg-[#324354] hover:bg-[#25323f] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw size={13} className={loadingNS ? "animate-spin" : ""} />
                                    <span>{loadingNS ? "Actualizando..." : "Actualizar"}</span>
                                </button>

                                {/* Indicador de Estado Actualizado */}
                                {lastUpdated && !loadingNS && (
                                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2 py-1 rounded-lg animate-in fade-in duration-300">
                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                        <span>Automático ({lastUpdated})</span>
                                    </div>
                                )}
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.nivelServicioReal)}`}>
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(calcProdPctReal)}`}>
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(calcProdPctReal)}`}>
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
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.mesonesMeta && currentData.mesonesMeta > 0 ? (((currentData.mesonesReal ?? 50) / currentData.mesonesMeta) * 100) : 100)}`}>
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
                                    
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.secondUnitMeta > 0 ? ((currentData.secondUnitReal / currentData.secondUnitMeta) * 100) : 0, false, !currentData.hasSecondUnit)}`}>
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
                                    <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.secondUnitMeta > 0 ? ((currentData.secondUnitReal / currentData.secondUnitMeta) * 100) : 0, false, !currentData.hasSecondUnit)}`}>
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.calidadReal - currentData.calidadMeta + 90)}`}>
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(calcPresentismoReal)}`}>
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
                                <div className={`flex-1 min-h-[175px] flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-sm border border-black/5 transition-colors duration-500 ${getCardColor(currentData.accidentesReal, true)}`}>
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



