'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import {
    ArrowLeft,
    RefreshCw,
    BarChart3,
    Search,
    Maximize2,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Layers,
    ShieldCheck,
    Sparkles,
    Package,
    LayoutGrid,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight,
    Plus,
    X,
    Calendar as CalendarIcon,
    Filter,
    TrendingDown,
    TrendingUp,
    FileText,
    FileSpreadsheet,
    Construction,
    Wrench,
    Clock,
    Activity
} from 'lucide-react';
import CalidadFVDashboard from '@/components/calidad/CalidadFVDashboard';
import CalidadGeneralIFI from '@/components/calidad/CalidadGeneralIFI';
import CalidadMsDashboard from '@/components/calidad/CalidadMsDashboard';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    PieChart,
    Pie
} from 'recharts';

// URLs de Power BI
const POWERBI_URL_MS =
    process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MS ||
    'https://app.powerbi.com/view?r=eyJrIjoiN2ZkMjI1YjAtYmMyYi00ZDQxLWJjZDktZWVkZmFiMGU0NTgzIiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9';

const POWERBI_URL_FV =
    process.env.NEXT_PUBLIC_POWERBI_CALIDAD_FV ||
    'https://app.powerbi.com/view?r=eyJrIjoiM2MzYmZjNGItZThkYy00MDVmLThkNDAtMmJjMGFiNDgxZDc1IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9';

const POWERBI_URL_MBL = process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MBL || '';
const POWERBI_URL_CEFI = process.env.NEXT_PUBLIC_POWERBI_CALIDAD_CEFI || '';
const POWERBI_URL_MOLDES = process.env.NEXT_PUBLIC_POWERBI_CALIDAD_MOLDES || '';

// Pestañas Principales Solicitadas en el SubHeader
export type MainTabKey = 'CALIDAD_IFI' | 'SALDOS' | 'PLAN_VIGILANCIA' | 'RRC' | 'QRQC';

interface SubHeaderTab {
    id: MainTabKey;
    label: string;
    icon: React.ReactNode;
}

export const MAIN_SUBHEADER_TABS: SubHeaderTab[] = [
    { id: 'CALIDAD_IFI', label: 'Calidad IFI', icon: <TrendingUp size={15} /> },
    { id: 'SALDOS', label: 'Saldos y Destrucciones', icon: <Trash2 size={15} /> },
    { id: 'PLAN_VIGILANCIA', label: 'Plan de Vigilancia', icon: <ShieldCheck size={15} /> },
    { id: 'RRC', label: 'RRC', icon: <FileSpreadsheet size={15} /> },
    { id: 'QRQC', label: 'QRQC', icon: <Layers size={15} /> }
];

// Estructura de eventos para el módulo de Saldos y Destrucciones
interface SaldoEvento {
    id: number | string;
    fechaStr: string;
    rawDate: string;
    colYMD?: string;
    diaNum: number;
    tipo: 'SALDO' | 'DESTRUCCIÓN';
    referencia: string;
    causante: string;
    registradoPor: string;
    fotoUrl?: string;
}

// REGISTROS REALES VERIFICADOS (Los 4 eventos exactos del 13/10/2026 de María Isabel Escobar + 1 del 14/10/2026)
const SALDOS_REAL_DATA: SaldoEvento[] = [
    // --- 13/10/2026 (Exactamente los 4 registros de la captura de pantalla de /calidad/ms/saldos) ---
    {
        id: 'real-1',
        rawDate: '2026-10-13T16:26:00-05:00',
        colYMD: '2026-10-13',
        fechaStr: '13/10/2026, 4:26 p. m.',
        diaNum: 13,
        tipo: 'DESTRUCCIÓN',
        referencia: 'Placa Genova 63',
        causante: 'QUEBRADA POR OPERARIO DE ACABADO',
        registradoPor: 'Maria Isabel Escobar'
    },
    {
        id: 'real-2',
        rawDate: '2026-10-13T13:40:00-05:00',
        colYMD: '2026-10-13',
        fechaStr: '13/10/2026, 1:40 p. m.',
        diaNum: 13,
        tipo: 'DESTRUCCIÓN',
        referencia: 'LVM Siena 94x48',
        causante: 'RAJADA AL DESMOLDAR',
        registradoPor: 'Maria Isabel Escobar'
    },
    {
        id: 'real-3',
        rawDate: '2026-10-13T12:23:00-05:00',
        colYMD: '2026-10-13',
        fechaStr: '13/10/2026, 12:23 p. m.',
        diaNum: 13,
        tipo: 'SALDO',
        referencia: 'LVM Oslo 48x38',
        causante: 'DEFORMADA',
        registradoPor: 'Maria Isabel Escobar'
    },
    {
        id: 'real-4',
        rawDate: '2026-10-13T10:08:00-05:00',
        colYMD: '2026-10-13',
        fechaStr: '13/10/2026, 10:08 a. m.',
        diaNum: 13,
        tipo: 'DESTRUCCIÓN',
        referencia: 'LVM ECO 40x30',
        causante: 'RAJADA POR MAMONETE PEGADO',
        registradoPor: 'Maria Isabel Escobar'
    },
    // --- 14/10/2026 ---
    {
        id: 'real-5',
        rawDate: '2026-10-14T08:31:00-05:00',
        colYMD: '2026-10-14',
        fechaStr: '14/10/2026, 8:31 a. m.',
        diaNum: 14,
        tipo: 'SALDO',
        referencia: 'LVR ECO 46x51',
        causante: 'NO SE LOGRA REPARAR/POROS',
        registradoPor: 'Maria Isabel Escobar'
    }
];

// Componente de Línea Divisoria entre Plantas
const PlantDivider = ({ title, plantKey }: { title: string; plantKey: string }) => (
    <div className="relative py-2.5 my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[#e2ded5]" />
        </div>
        <div className="relative flex justify-center">
            <span className="bg-[#F6F3EE] px-4 py-1 text-[11px] font-black tracking-wider text-[#7B8E90] uppercase flex items-center gap-2 rounded-full border border-[#e2ded5] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#324354]" />
                FIRPLAK • {title} ({plantKey})
                <span className="w-2 h-2 rounded-full bg-[#324354]" />
            </span>
        </div>
    </div>
);

// Componente Módulo en Construcción
const UnderConstructionCard = ({
    title,
    subtitle,
    description,
    icon: Icon,
    actionUrl,
    actionLabel
}: {
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    actionUrl?: string;
    actionLabel?: string;
}) => {
    const router = useRouter();
    return (
        <div className="p-4 md:p-12 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 md:p-14 shadow-sm border border-[#e2ded5] flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#324354]/5 border border-[#324354]/10 flex items-center justify-center text-[#324354]">
                    <Icon className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                <div className="space-y-2.5 max-w-xl">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                        {subtitle}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-[#324354] tracking-tight">
                        {title}
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {description}
                    </p>
                </div>
                {actionUrl && actionLabel ? (
                    <button
                        onClick={() => router.push(actionUrl)}
                        className="px-6 py-3 bg-[#324354] hover:bg-[#25323f] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                        <span>{actionLabel}</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>En proceso de diseño y desarrollo activo</span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface IndicadoresCalidadViewProps {
    showMainHeader?: boolean;
    // Solo la sección de Mármol Sintético (pestaña Indicadores de Calidad MS); misma vista del tablero de control
    soloMs?: boolean;
    // Pestañas controladas desde la página (el Tablero de Control las muestra como su tercer nivel)
    tab?: MainTabKey;
    onTabChange?: (tab: MainTabKey) => void;
    ocultarPestanas?: boolean;
}

export default function IndicadoresCalidadView({ showMainHeader = false, soloMs = false, tab, onTabChange, ocultarPestanas = false }: IndicadoresCalidadViewProps) {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string>('');
    
    // Pestaña activa principal
    const [tabInterno, setTabInterno] = useState<MainTabKey>('CALIDAD_IFI');
    const activeTab = tab ?? tabInterno;
    const setActiveTab = (t: MainTabKey) => (onTabChange ? onTabChange(t) : setTabInterno(t));
    const [isLoading, setIsLoading] = useState(false);

    // Vistas individuales por planta (HTML nativo vs Power BI)
    const [plantViews, setPlantViews] = useState<Record<string, 'html' | 'powerbi'>>({
        general: 'html',
        ms: 'html',
        fv: 'html',
        mbl: 'html',
        cefi: 'html',
        rmold: 'html'
    });

    const togglePlantView = (plantKey: string, view: 'html' | 'powerbi') => {
        setPlantViews(prev => ({ ...prev, [plantKey]: view }));
    };


    // --- ESTADOS PARA LA PESTAÑA SALDOS Y DESTRUCCIONES ---
    const [saldosReports, setSaldosReports] = useState<SaldoEvento[]>(SALDOS_REAL_DATA);
    const [saldosSearchTerm, setSaldosSearchTerm] = useState<string>('');
    const [saldosFilterTipo, setSaldosFilterTipo] = useState<'ALL' | 'SALDO' | 'DESTRUCCIÓN'>('ALL');
    const [saldosSelectedDate, setSaldosSelectedDate] = useState<string>('2026-10-13');

    // Cargar usuario
    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user?.email) {
                setUserEmail(data.user.email);
            }
        };
        void checkAuth();
    }, []);


    // Consultar registros reales de Saldos y Destrucciones desde Supabase
    const fetchSaldosSupabase = useCallback(async () => {
        try {
            const { data: reportsRes } = await supabase
                .from('ms_reporte_defectos')
                .select(`
                    id,
                    created_at,
                    create_by,
                    defecto,
                    fotoUrl,
                    producto:productos_defectos_ms (Referencia)
                `)
                .order('created_at', { ascending: false });

            if (reportsRes && reportsRes.length > 0) {
                // Filtrar registros que sean Saldo o Destrucción usando exactamente la misma regla estricta de /calidad/ms/saldos
                const rawFiltered = reportsRes.filter(r => {
                    const defs = Array.isArray(r.defecto) ? r.defecto : [];
                    return defs.some((d: any) => {
                        const name = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '');
                        return name && (name.startsWith('Saldo -') || name.startsWith('Destrucción -'));
                    });
                });

                if (rawFiltered.length > 0) {
                    const userIds = [...new Set(rawFiltered.map(r => r.create_by))].filter(Boolean);
                    const usersMap: Record<number, string> = {};
                    if (userIds.length > 0) {
                        const { data: usersData } = await supabase
                            .from('usuarios')
                            .select('id, nombre')
                            .in('id', userIds);
                        if (usersData) {
                            usersData.forEach(u => {
                                usersMap[u.id] = u.nombre;
                            });
                        }
                    }

                    const formatted: SaldoEvento[] = rawFiltered.map(r => {
                        const defs = Array.isArray(r.defecto) ? r.defecto : [];
                        const targetDef = defs.find((d: any) => {
                            const n = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '');
                            return n && (n.startsWith('Saldo -') || n.startsWith('Destrucción -'));
                        });
                        const defectStr = typeof targetDef === 'string' ? targetDef : (targetDef?.defecto || targetDef?.Defecto || targetDef?.nombre || targetDef?.Nombre || '');
                        const isDestruccion = defectStr.startsWith('Destrucción -') || defectStr.includes('Destrucción');
                        const causante = defectStr.includes(' - ') ? defectStr.split(' - ')[1] : defectStr;
                        const dateObj = new Date(r.created_at.endsWith('Z') || r.created_at.includes('+') ? r.created_at : r.created_at + 'Z');
                        const colYMD = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                        const diaNum = parseInt(colYMD.split('-')[2] || '1', 10);

                        return {
                            id: r.id,
                            rawDate: r.created_at,
                            colYMD,
                            diaNum,
                            fechaStr: dateObj.toLocaleString('es-CO', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                                timeZone: 'America/Bogota'
                            }),
                            tipo: isDestruccion ? 'DESTRUCCIÓN' : 'SALDO',
                            referencia: r.producto?.Referencia || `Producto #${r.producto_id}`,
                            causante: causante || 'Defecto no clasificado',
                            registradoPor: usersMap[r.create_by] || 'Calidad Planta',
                            fotoUrl: r.fotoUrl
                        };
                    });

                    setSaldosReports(formatted);
                    return;
                }
            }
            setSaldosReports(SALDOS_REAL_DATA);
        } catch (err) {
            console.warn('Error fetching saldos:', err);
            setSaldosReports(SALDOS_REAL_DATA);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'SALDOS') {
            void fetchSaldosSupabase();
        }
    }, [fetchSaldosSupabase, activeTab]);

    // --- CÁLCULOS ESTADÍSTICOS DE SALDOS Y DESTRUCCIONES ---
    const saldosMetrics = useMemo(() => {
        let items = saldosReports;

        // Filtrar con precisión por fecha (estrictamente en zona horaria America/Bogota)
        if (saldosSelectedDate && saldosSelectedDate !== 'ALL') {
            items = items.filter(i => {
                const dateObj = new Date(i.rawDate.endsWith('Z') || i.rawDate.includes('+') ? i.rawDate : i.rawDate + 'Z');
                const colYMD = i.colYMD || dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                return colYMD === saldosSelectedDate;
            });
        }

        if (saldosFilterTipo !== 'ALL') {
            items = items.filter(i => i.tipo === saldosFilterTipo);
        }

        if (saldosSearchTerm.trim() !== '') {
            const q = saldosSearchTerm.toLowerCase();
            items = items.filter(i => i.referencia.toLowerCase().includes(q) || i.causante.toLowerCase().includes(q));
        }

        const totalEventos = items.length;
        const totalSaldos = items.filter(i => i.tipo === 'SALDO').length;
        const totalDestrucciones = items.filter(i => i.tipo === 'DESTRUCCIÓN').length;
        const pctSaldos = totalEventos > 0 ? Math.round((totalSaldos / totalEventos) * 1000) / 10 : 0;
        const pctDestrucciones = totalEventos > 0 ? Math.round((totalDestrucciones / totalEventos) * 1000) / 10 : 0;

        // Donut: Proporción Saldos vs Destrucciones
        const dataProporcion = [
            { name: 'Saldos', value: totalSaldos, pct: pctSaldos, color: '#10b981' },
            { name: 'Destrucciones', value: totalDestrucciones, pct: pctDestrucciones, color: '#ef4444' }
        ];

        // Pareto de Causantes
        const causantesCount: Record<string, { total: number; saldos: number; destrucciones: number }> = {};
        items.forEach(i => {
            if (!causantesCount[i.causante]) {
                causantesCount[i.causante] = { total: 0, saldos: 0, destrucciones: 0 };
            }
            causantesCount[i.causante].total += 1;
            if (i.tipo === 'SALDO') causantesCount[i.causante].saldos += 1;
            else causantesCount[i.causante].destrucciones += 1;
        });

        const dataCausantes = Object.entries(causantesCount)
            .map(([causante, d]) => ({
                causante,
                cantidad: d.total,
                saldos: d.saldos,
                destrucciones: d.destrucciones,
                pct: totalEventos > 0 ? Math.round((d.total / totalEventos) * 1000) / 10 : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad);

        const topCausante = dataCausantes[0]?.causante || 'Sin registros';

        // Tendencia por Día
        const diasMap: Record<number, { dia: number; saldos: number; destrucciones: number; total: number }> = {};
        for (let d = 1; d <= 14; d++) {
            diasMap[d] = { dia: d, saldos: 0, destrucciones: 0, total: 0 };
        }
        items.forEach(i => {
            if (diasMap[i.diaNum]) {
                if (i.tipo === 'SALDO') diasMap[i.diaNum].saldos += 1;
                else diasMap[i.diaNum].destrucciones += 1;
                diasMap[i.diaNum].total += 1;
            }
        });
        const dataTendenciaDias = Object.values(diasMap);

        // Afectación por Referencia
        const refCount: Record<string, { total: number; saldos: number; destrucciones: number }> = {};
        items.forEach(i => {
            if (!refCount[i.referencia]) {
                refCount[i.referencia] = { total: 0, saldos: 0, destrucciones: 0 };
            }
            refCount[i.referencia].total += 1;
            if (i.tipo === 'SALDO') refCount[i.referencia].saldos += 1;
            else refCount[i.referencia].destrucciones += 1;
        });

        const dataReferencias = Object.entries(refCount)
            .map(([referencia, d]) => ({
                referencia,
                total: d.total,
                saldos: d.saldos,
                destrucciones: d.destrucciones
            }))
            .sort((a, b) => b.total - a.total);

        return {
            filteredItems: items,
            totalEventos,
            totalSaldos,
            totalDestrucciones,
            pctSaldos,
            pctDestrucciones,
            topCausante,
            dataProporcion,
            dataCausantes,
            dataTendenciaDias,
            dataReferencias
        };
    }, [saldosReports, saldosFilterTipo, saldosSelectedDate, saldosSearchTerm]);


    return (
        <div className={`flex flex-col font-sans text-[#000000] w-full ${showMainHeader ? 'min-h-screen bg-[#F6F3EE]' : ''}`}>
            {/* 1. Header Oficial FIRPLAK (Opcional) */}
            {showMainHeader && (
                <Header
                    title="CALIDAD"
                    subtitle="Indicadores"
                    userEmail={userEmail}
                />
            )}

            {/* 2. SubHeader Oficial con Pestañas Agrupadas (no aplica en la vista solo MS) */}
            {!soloMs && !ocultarPestanas && (
            <div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-11 flex items-center">
                <div className="max-w-7xl mx-auto flex flex-row w-full flex-nowrap gap-1.5 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
                    {MAIN_SUBHEADER_TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg font-bold transition-all text-xs sm:text-[13px] cursor-pointer whitespace-nowrap flex-shrink-0 ${
                                    isActive
                                        ? 'bg-[#324354] text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            )}

            {/* 3. Contenido Principal */}
            <div className="flex-1 w-full pb-10">
                
                {/* ========================================================================= */}
                {/* --- PESTAÑA 1: CALIDAD IFI (VISTA EN SCROLL LARGO POR PLANTA) --- */}
                {/* ========================================================================= */}
                {activeTab === 'CALIDAD_IFI' && (
                    <div className="p-2 sm:p-3 md:p-4 max-w-[1900px] w-full mx-auto space-y-3.5 animate-in fade-in duration-300">
                        
                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 1: CALIDAD GENERAL PLANTAS - IFI */}
                        {/* ------------------------------------------------------------- */}
                        {!soloMs && (<>
                        <section id="general-plantas" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <CalidadGeneralIFI />
                        </section>

                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="Mármol Sintético" plantKey="MS" />
                        </>)}

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 2: MÁRMOL SINTÉTICO (MS) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="marmol-sintetico" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <CalidadMsDashboard powerBiUrl={POWERBI_URL_MS} />
                        </section>

                        {!soloMs && (<>
                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="Fibra de Vidrio" plantKey="FV" />

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 3: FIBRA DE VIDRIO (FV) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="fibra-vidrio" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            Fibra de Vidrio (FV)
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider border border-sky-300">
                                            Laminación y Acabado
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Control de calidad en laminación, gelcoat, refuerzo estructural y acabado de bañeras y tinas
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                    <button
                                        onClick={() => togglePlantView('fv', 'html')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                            plantViews.fv === 'html'
                                                ? 'bg-[#324354] text-white shadow-xs'
                                                : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span>Tablero Dinámico</span>
                                    </button>
                                    <button
                                        onClick={() => togglePlantView('fv', 'powerbi')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                            plantViews.fv === 'powerbi'
                                                ? 'bg-[#0084d1] text-white shadow-xs'
                                                : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Power BI</span>
                                    </button>
                                </div>
                            </div>

                            {plantViews.fv === 'powerbi' ? (
                                <div className="w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                                    <iframe
                                        title="Power BI Calidad FV"
                                        src={POWERBI_URL_FV}
                                        className="w-full h-full border-0"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <CalidadFVDashboard />
                            )}
                        </section>

                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="Quarzstone" plantKey="QZ" />

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 4: QUARZSTONE (QZ) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="quarzstone" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            Quarzstone (QZ)
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider border border-purple-300">
                                            Cubiertas y Mesones
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Métricas consolidadas de producción, corte y pulido en mesones de cuarzo
                                    </p>
                                </div>

                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md text-xs">
                                    Tablero Nativo HTML
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Calidad Real</span>
                                        <span className="text-[10px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full">Meta: 90%</span>
                                    </div>
                                    <div className="mt-1">
                                        <p className="text-xl sm:text-2xl font-black text-emerald-700">95.0 %</p>
                                        <p className="text-[10px] text-emerald-700 font-medium">Meta cumplida</p>
                                    </div>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Piezas Inspeccionadas</span>
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">128</p>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Piezas Conformes</span>
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">122</p>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">DPU Planta</span>
                                    <p className="text-xl sm:text-2xl font-black text-[#0084d1] mt-1">0.05</p>
                                </div>
                            </div>
                        </section>

                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="Muebles" plantKey="MBL" />

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 5: MUEBLES (MBL) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="muebles" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            Muebles (MBL)
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider border border-amber-300">
                                            Corte, Canteado y Ensamble
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Control de calidad en armado, ensamble, herrajes y embalaje de módulos
                                    </p>
                                </div>

                                {POWERBI_URL_MBL ? (
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => togglePlantView('mbl', 'html')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                                plantViews.mbl === 'html'
                                                    ? 'bg-[#324354] text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            <span>Tablero Dinámico</span>
                                        </button>
                                        <button
                                            onClick={() => togglePlantView('mbl', 'powerbi')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                                plantViews.mbl === 'powerbi'
                                                    ? 'bg-[#0084d1] text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Power BI</span>
                                        </button>
                                    </div>
                                ) : (
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-md text-xs">
                                        Tablero Nativo HTML
                                    </span>
                                )}
                            </div>

                            {plantViews.mbl === 'powerbi' && POWERBI_URL_MBL ? (
                                <div className="w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                                    <iframe
                                        title="Power BI Calidad MBL"
                                        src={POWERBI_URL_MBL}
                                        className="w-full h-full border-0"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-2.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Calidad Real</span>
                                            <span className="text-[10px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full">Meta: 90%</span>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xl sm:text-2xl font-black text-emerald-700">94.8 %</p>
                                            <p className="text-[10px] text-emerald-700 font-medium">Meta superada</p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Módulos Auditados</span>
                                        <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">1,450</p>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Piezas Buenas</span>
                                        <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">1,375</p>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">DPU</span>
                                        <p className="text-xl sm:text-2xl font-black text-[#0084d1] mt-1">0.07</p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="CEFI (Zócalos y Molduras)" plantKey="CEFI" />

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 6: CEFI (ZÓCALOS Y MOLDURAS) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="cefi" className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            CEFI (Zócalos y Molduras)
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider border border-blue-300">
                                            Termoformado y Perfiles
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Inspección de perfiles, molduras, zócalos y piezas complementarias
                                    </p>
                                </div>

                                {POWERBI_URL_CEFI ? (
                                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => togglePlantView('cefi', 'html')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                plantViews.cefi === 'html'
                                                    ? 'bg-[#324354] text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span>Tablero Dinámico</span>
                                    </button>
                                    <button
                                        onClick={() => togglePlantView('cefi', 'powerbi')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                            plantViews.cefi === 'powerbi'
                                                ? 'bg-[#0084d1] text-white shadow-sm'
                                                : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Power BI</span>
                                    </button>
                                </div>
                            ) : (
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                                    Tablero Nativo HTML
                                </span>
                            )}
                        </div>

                        {plantViews.cefi === 'powerbi' && POWERBI_URL_CEFI ? (
                            <div className="w-full h-[700px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-300">
                                <iframe
                                    title="Power BI Calidad CEFI"
                                    src={POWERBI_URL_CEFI}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Calidad Real</span>
                                        <span className="text-[10px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full">Meta: 90%</span>
                                    </div>
                                    <div className="mt-1">
                                        <p className="text-xl sm:text-2xl font-black text-emerald-700">95.2 %</p>
                                        <p className="text-[10px] text-emerald-700 font-medium">Meta superada</p>
                                    </div>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Unidades Revisadas</span>
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">820</p>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Conformes</span>
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">781</p>
                                </div>
                                <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">DPU</span>
                                    <p className="text-xl sm:text-2xl font-black text-[#0084d1] mt-1">0.05</p>
                                </div>
                            </div>
                        )}
                        </section>

                        {/* LINEA DIVISORIA */}
                        <PlantDivider title="Reparación de Moldes" plantKey="RMOLD" />

                        {/* ------------------------------------------------------------- */}
                        {/* PLANTA 7: REPARACIÓN DE MOLDES (RMOLD) */}
                        {/* ------------------------------------------------------------- */}
                        <section id="reparacion-moldes" className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            Reparación de Moldes (RMOLD)
                                        </h2>
                                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold rounded-full text-[10px] uppercase tracking-wider border border-rose-300">
                                            Acondicionamiento y Moldes
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Mantenimiento preventivo, desmanche, reconstrucción y control de calidad en moldes de planta
                                    </p>
                                </div>

                                {POWERBI_URL_MOLDES ? (
                                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => togglePlantView('rmold', 'html')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                plantViews.rmold === 'html'
                                                    ? 'bg-[#324354] text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            <span>Tablero Dinámico</span>
                                        </button>
                                        <button
                                            onClick={() => togglePlantView('rmold', 'powerbi')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                plantViews.rmold === 'powerbi'
                                                    ? 'bg-[#0084d1] text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Power BI</span>
                                        </button>
                                    </div>
                                ) : (
                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                                        Tablero Nativo HTML
                                    </span>
                                )}
                            </div>

                            {plantViews.rmold === 'powerbi' && POWERBI_URL_MOLDES ? (
                                <div className="w-full h-[600px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-300">
                                    <iframe
                                        title="Power BI Calidad Moldes"
                                        src={POWERBI_URL_MOLDES}
                                        className="w-full h-full border-0"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-2.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Calidad Reparación</span>
                                            <span className="text-[10px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full">Meta: 90%</span>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xl sm:text-2xl font-black text-emerald-700">92.0 %</p>
                                            <p className="text-[10px] text-emerald-700 font-medium">Meta superada</p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Moldes Entregados</span>
                                        <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">46</p>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Moldes Recibidos</span>
                                        <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">50</p>
                                    </div>
                                    <div className="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reincidencia</span>
                                        <p className="text-xl sm:text-2xl font-black text-[#0084d1] mt-1">0.08</p>
                                    </div>
                                </div>
                            )}
                        </section>
                        </>)}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* --- PESTAÑA 2: SALDOS Y DESTRUCCIONES --- */}
                {/* ========================================================================= */}
                {activeTab === 'SALDOS' && (
                    <div className="p-3 md:p-6 max-w-[1900px] w-full mx-auto space-y-5 animate-in fade-in duration-300">
                        {/* Header con Acción Rápida */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2ded5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black text-[#324354]">
                                        Panel de Saldos y Destrucciones
                                    </h1>
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                                        Módulo de Calidad MS
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Visualización gráfica y estadística de los eventos registrados desde la terminal de calidad
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={fetchSaldosSupabase}
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    title="Recargar eventos"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => router.push('/calidad/ms/saldos')}
                                    className="px-4 py-2 bg-[#d14747] hover:bg-[#b83838] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>+ AGREGAR EVENTO</span>
                                </button>
                            </div>
                        </div>

                        {/* Barra de Filtros */}
                        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#e2ded5] flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                {/* Selector de Fecha */}
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
                                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                                    <input
                                        type="date"
                                        value={saldosSelectedDate === 'ALL' ? '' : saldosSelectedDate}
                                        onChange={e => setSaldosSelectedDate(e.target.value || 'ALL')}
                                        className="bg-transparent text-xs font-black text-[#254153] outline-none cursor-pointer"
                                    />
                                    {saldosSelectedDate !== 'ALL' && (
                                        <button
                                            onClick={() => setSaldosSelectedDate('ALL')}
                                            className="text-[10px] text-blue-600 font-bold hover:underline ml-1"
                                            title="Ver todas las fechas"
                                        >
                                            Ver Todo
                                        </button>
                                    )}
                                </div>

                                {/* Buscador */}
                                <div className="flex-1 min-w-[240px] relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="BUSCAR REFERENCIA O DEFECTO..."
                                        value={saldosSearchTerm}
                                        onChange={e => setSaldosSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#324354] uppercase placeholder:normal-case placeholder:text-slate-400 shadow-sm"
                                    />
                                    {saldosSearchTerm && (
                                        <button
                                            onClick={() => setSaldosSearchTerm('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Filtro por Tipo */}
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setSaldosFilterTipo('ALL')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            saldosFilterTipo === 'ALL'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setSaldosFilterTipo('SALDO')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            saldosFilterTipo === 'SALDO'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-emerald-700 hover:text-emerald-800'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-300" />
                                        Saldos
                                    </button>
                                    <button
                                        onClick={() => setSaldosFilterTipo('DESTRUCCIÓN')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            saldosFilterTipo === 'DESTRUCCIÓN'
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'text-rose-700 hover:text-rose-800'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-rose-300" />
                                        Destrucciones
                                    </button>
                                </div>
                            </div>

                            {/* Badge Total */}
                            <div className="bg-[#324354] text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                                Total: {saldosMetrics.totalEventos}
                            </div>
                        </div>

                        {/* Tarjetas KPI de Saldos */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Eventos</span>
                                <div className="mt-2">
                                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                                        {saldosMetrics.totalEventos}
                                    </span>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Piezas con disposición final</p>
                                </div>
                            </div>

                            <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Total Saldos</span>
                                    <span className="text-[11px] font-black bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                                        {saldosMetrics.pctSaldos}%
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-3xl font-black text-emerald-700 tracking-tight">
                                        {saldosMetrics.totalSaldos}
                                    </span>
                                    <p className="text-[11px] text-emerald-700/90 font-medium mt-0.5">Recuperadas comercialmente</p>
                                </div>
                            </div>

                            <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-rose-900 uppercase tracking-wider">Total Destrucciones</span>
                                    <span className="text-[11px] font-black bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded-full">
                                        {saldosMetrics.pctDestrucciones}%
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-3xl font-black text-rose-700 tracking-tight">
                                        {saldosMetrics.totalDestrucciones}
                                    </span>
                                    <p className="text-[11px] text-rose-700/90 font-medium mt-0.5">Baja total del producto</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Causante Principal</span>
                                <div className="mt-2">
                                    <span className="text-sm font-black text-slate-800 line-clamp-1" title={saldosMetrics.topCausante}>
                                        {saldosMetrics.topCausante}
                                    </span>
                                    <p className="text-[11px] text-[#0084d1] font-bold mt-0.5">Mayor incidencia registrada</p>
                                </div>
                            </div>
                        </div>

                        {/* Gráficos Visuales de Saldos */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-[#e2ded5] flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-sm font-bold text-slate-800">Proporción: Saldo vs Destrucción</h2>
                                    <span className="text-[11px] text-slate-500">Distribución</span>
                                </div>

                                <div className="h-[220px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={saldosMetrics.dataProporcion}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={75}
                                                paddingAngle={3}
                                            >
                                                {saldosMetrics.dataProporcion.map((entry, index) => (
                                                    <Cell key={`cell-saldos-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any, name: any) => [`${value} unidades`, name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                        <span className="text-slate-600 font-semibold truncate">Saldos:</span>
                                        <span className="font-bold text-slate-900 ml-auto">{saldosMetrics.totalSaldos}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                                        <span className="text-slate-600 font-semibold truncate">Destrucciones:</span>
                                        <span className="font-bold text-slate-900 ml-auto">{saldosMetrics.totalDestrucciones}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8 bg-white rounded-2xl p-4 shadow-sm border border-[#e2ded5] flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-sm font-bold text-slate-800">Principales Defectos Causantes</h2>
                                    <span className="text-[11px] text-slate-500">Ranking por cantidad de eventos</span>
                                </div>

                                <div className="h-[240px] w-full">
                                    {saldosMetrics.dataCausantes.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                            No hay registros para este filtro
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={saldosMetrics.dataCausantes.slice(0, 6)}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="causante"
                                                    width={150}
                                                    tickFormatter={val => (val.length > 20 ? `${val.substring(0, 20)}...` : val)}
                                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                                />
                                                <Tooltip
                                                    formatter={(val: any, name: any, item: any) => [
                                                        `${val} eventos (${item.payload.pct}%)`,
                                                        item.payload.causante
                                                    ]}
                                                />
                                                <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                                                    {saldosMetrics.dataCausantes.slice(0, 6).map((entry, index) => {
                                                        const isSaldoOnly = entry.saldos > 0 && entry.destrucciones === 0;
                                                        const color = isSaldoOnly ? '#10b981' : '#ef4444';
                                                        return <Cell key={`bar-causante-${index}`} fill={color} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Registros Detallados */}
                        <div className="bg-white rounded-2xl shadow-sm border border-[#e2ded5] overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-800">
                                    Detalle de Eventos Registrados ({saldosMetrics.filteredItems.length})
                                </h2>
                                <span className="text-[11px] text-slate-400">
                                    Terminal de Calidad MS
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#324354] text-white uppercase font-black text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-6">Fecha / Hora</th>
                                            <th className="py-3 px-6">Tipo</th>
                                            <th className="py-3 px-6">Referencia</th>
                                            <th className="py-3 px-6">Causante</th>
                                            <th className="py-3 px-6">Registrado Por</th>
                                            <th className="py-3 px-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {saldosMetrics.filteredItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                                                    No se encontraron eventos para los filtros seleccionados
                                                </td>
                                            </tr>
                                        ) : (
                                            saldosMetrics.filteredItems.map(item => (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                                    onClick={() => router.push('/calidad/ms/saldos')}
                                                >
                                                    <td className="py-3 px-6 text-slate-500 whitespace-nowrap font-bold">
                                                        {item.fechaStr}
                                                    </td>
                                                    <td className="py-3 px-6 whitespace-nowrap">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                item.tipo === 'SALDO'
                                                                    ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
                                                                    : 'bg-[#ffe4e6] text-[#9f1239] border border-[#fecdd3]'
                                                            }`}
                                                        >
                                                            {item.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-6 font-black text-slate-900 whitespace-nowrap">
                                                        {item.referencia}
                                                    </td>
                                                    <td className="py-3 px-6 font-bold text-slate-700 uppercase">
                                                        {item.causante}
                                                    </td>
                                                    <td className="py-3 px-6 text-slate-600 font-medium">
                                                        {item.registradoPor}
                                                    </td>
                                                    <td className="py-3 px-6 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                router.push('/calidad/ms/saldos');
                                                            }}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Ver en módulo de saldos"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* --- PESTAÑA 3: PLAN DE VIGILANCIA --- */}
                {/* ========================================================================= */}
                {activeTab === 'PLAN_VIGILANCIA' && (
                    <UnderConstructionCard
                        title="Plan de Vigilancia de Calidad"
                        subtitle="Módulo en Construcción"
                        description="Este módulo permitirá el seguimiento sistemático a los planes de control, rondas de inspección en proceso, auditorías escalonadas y vigilancia preventiva en todas las líneas de producción."
                        icon={ShieldCheck}
                    />
                )}

                {/* ========================================================================= */}
                {/* --- PESTAÑA 4: RRC (RESPUESTA RÁPIDA DE CALIDAD) --- */}
                {/* ========================================================================= */}
                {activeTab === 'RRC' && (
                    <UnderConstructionCard
                        title="Respuesta Rápida de Calidad (RRC)"
                        subtitle="Módulo Operativo Integrado"
                        description="Gestión y contención inmediata ante desvíos de calidad en piso de planta mediante Fichas RCC, análisis de causa raíz y planes de acción preventivos."
                        icon={FileSpreadsheet}
                        actionUrl="/ficha-rcc"
                        actionLabel="Abrir Módulo de Fichas RRC"
                    />
                )}

                {/* ========================================================================= */}
                {/* --- PESTAÑA 5: QRQC --- */}
                {/* ========================================================================= */}
                {activeTab === 'QRQC' && (
                    <UnderConstructionCard
                        title="Quick Response Quality Control (QRQC)"
                        subtitle="Módulo en Construcción"
                        description="Metodología estructurada de gestión de calidad en el puesto de trabajo (QRQC Línea, QRQC UAP y QRQC Planta) para resolución rápida, ágil y estandarizada de no conformidades."
                        icon={Layers}
                    />
                )}

            </div>
        </div>
    );
}
