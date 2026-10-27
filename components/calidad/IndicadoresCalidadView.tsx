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
import {
    MS_FECHA_INICIO_BI,
    MsPiezaNormalizada,
    calcularIfiPorDia,
    calcularIfiPorMes,
    calcularPareto,
    calcularReferencias,
    calcularResumen,
    fetchCatalogoDefectosMs,
    fetchMsReportes,
    fetchProductosMs,
    normalizarPiezas
} from '@/lib/calidad/msCalidad';
import CalidadFVDashboard from '@/components/calidad/CalidadFVDashboard';
import CalidadGeneralIFI from '@/components/calidad/CalidadGeneralIFI';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    ReferenceLine,
    PieChart,
    Pie,
    Legend
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

// Catálogo y colores de Pareto
const PARETO_COLORS = [
    '#008080', '#e06634', '#0284c7', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6',
    '#84cc16', '#a855f7', '#06b6d4', '#f97316', '#3b82f6',
    '#e11d48', '#d97706', '#475569', '#64748b', '#94a3b8'
];

// Meses del año
const MESES = [
    { num: '01', nombre: 'enero' },
    { num: '02', nombre: 'febrero' },
    { num: '03', nombre: 'marzo' },
    { num: '04', nombre: 'abril' },
    { num: '05', nombre: 'mayo' },
    { num: '06', nombre: 'junio' },
    { num: '07', nombre: 'julio' },
    { num: '08', nombre: 'agosto' },
    { num: '09', nombre: 'septiembre' },
    { num: '10', nombre: 'octubre' },
    { num: '11', nombre: 'noviembre' },
    { num: '12', nombre: 'diciembre' }
];

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

    // Filtros de fecha MS
    const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
    const [selectedMonth, setSelectedMonth] = useState<string>(() => MESES[new Date().getMonth()].nombre);
    const [selectedDay, setSelectedDay] = useState<string>('All');

    // Filtros de defectos MS
    const [filterTotalPiezas, setFilterTotalPiezas] = useState<boolean>(true);
    const [filterSoloReparacion, setFilterSoloReparacion] = useState<boolean>(false);

    // Búsqueda en tabla de referencias MS
    const [refSearch, setRefSearch] = useState<string>('');
    const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({});

    // Piezas MS del año seleccionado (Supabase, misma lógica del Power BI "BI Calidad MS")
    const [msPiezasAnio, setMsPiezasAnio] = useState<MsPiezaNormalizada[]>([]);
    const [hasLiveSupabaseData, setHasLiveSupabaseData] = useState<boolean>(false);
    const [msLoadError, setMsLoadError] = useState<string | null>(null);

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

    // Consultar en Supabase todas las piezas MS del año seleccionado.
    // Mes y día se filtran en memoria para que el cambio de filtro sea inmediato.
    const fetchSupabaseData = useCallback(async () => {
        setIsLoading(true);
        setMsLoadError(null);
        try {
            const desde = selectedYear === 'All' ? `${MS_FECHA_INICIO_BI}T00:00:00Z` : `${selectedYear}-01-01T00:00:00Z`;
            const hasta = selectedYear === 'All'
                ? `${new Date().getUTCFullYear() + 1}-01-01T00:00:00Z`
                : `${Number(selectedYear) + 1}-01-01T00:00:00Z`;

            const [rows, catalogo, productos] = await Promise.all([
                fetchMsReportes(supabase, desde, hasta, 'id, created_at, producto_id, defecto, Reparacion'),
                fetchCatalogoDefectosMs(supabase),
                fetchProductosMs(supabase)
            ]);

            const piezas = normalizarPiezas(rows, catalogo, productos);
            setMsPiezasAnio(piezas);
            setHasLiveSupabaseData(piezas.length > 0);
        } catch (err: any) {
            console.warn('Error consultando Supabase para calidad:', err);
            setMsPiezasAnio([]);
            setHasLiveSupabaseData(false);
            setMsLoadError(err?.message || 'Error consultando Supabase');
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear]);

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
        if (activeTab === 'CALIDAD_IFI') {
            void fetchSupabaseData();
        } else if (activeTab === 'SALDOS') {
            void fetchSaldosSupabase();
        }
    }, [fetchSupabaseData, fetchSaldosSupabase, activeTab]);

    // Piezas MS del periodo seleccionado (mes / día dentro del año cargado)
    const msMesNum = MESES.find(m => m.nombre === selectedMonth)?.num;
    const msPiezasMes = useMemo(() => {
        if (selectedMonth === 'All' || !msMesNum) return msPiezasAnio;
        return msPiezasAnio.filter(p => p.fecha.slice(5, 7) === msMesNum);
    }, [msPiezasAnio, selectedMonth, msMesNum]);

    const msPiezasPeriodo = useMemo(() => {
        if (selectedDay === 'All') return msPiezasMes;
        const dd = selectedDay.padStart(2, '0');
        return msPiezasMes.filter(p => p.fecha.slice(8, 10) === dd);
    }, [msPiezasMes, selectedDay]);

    // KPIs, Pareto y referencias MS (medidas del Power BI "BI Calidad MS")
    const metrics = useMemo(() => {
        const r = calcularResumen(msPiezasPeriodo);
        const pareto = calcularPareto(msPiezasPeriodo);
        return {
            pctOpaco: r.pctOpaco.toFixed(1),
            piezasBuenas: r.piezasBuenas,
            piezasDefectuosas: r.piezasDefectuosas,
            piezasRevisadas: r.piezasRevisadas,
            cantidadDefectos: r.cantidadDefectos,
            pctMoldes: r.pctMoldes.toFixed(1),
            dpu: r.dpu.toFixed(1),
            calidad: r.calidad.toFixed(1),
            paretoCausas: pareto,
            totalCausas: pareto.length,
            referencias: calcularReferencias(msPiezasPeriodo)
        };
    }, [msPiezasPeriodo]);

    // Tendencias IFI: por día del mes seleccionado y por mes del año seleccionado
    const ifiPorDia = useMemo(() => calcularIfiPorDia(msPiezasMes), [msPiezasMes]);
    const ifiAnio = selectedYear === 'All' ? String(new Date().getUTCFullYear()) : selectedYear;
    const ifiPorMes = useMemo(
        () => calcularIfiPorMes(msPiezasAnio, ifiAnio, MESES.map(m => m.nombre)),
        [msPiezasAnio, ifiAnio]
    );

    // Filtrar lista de referencias por búsqueda
    const filteredReferencias = useMemo(() => {
        if (!refSearch.trim()) return metrics.referencias;
        const q = refSearch.toLowerCase();
        return metrics.referencias.filter(
            r => r.referencia.toLowerCase().includes(q) ||
                r.subdefectos.some(s => s.name.toLowerCase().includes(q))
        );
    }, [metrics.referencias, refSearch]);

    const toggleRefExpanded = (refName: string) => {
        setExpandedRefs(prev => ({
            ...prev,
            [refName]: !prev[refName]
        }));
    };

    const resetFilters = () => {
        setSelectedYear(String(new Date().getFullYear()));
        setSelectedMonth(MESES[new Date().getMonth()].nombre);
        setSelectedDay('All');
        setFilterTotalPiezas(true);
        setFilterSoloReparacion(false);
        setRefSearch('');
    };

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

    // Función auxiliar para color de semáforo FIRPLAK
    const getSemaforoColor = (val: number) => {
        if (val > 90) return 'text-[#59a96a] bg-emerald-50 border-emerald-200';
        if (val >= 85) return 'text-[#deb841] bg-amber-50 border-amber-200';
        return 'text-[#d14747] bg-rose-50 border-rose-200';
    };

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
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                            Mármol Sintético (MS)
                                        </h2>
                                        <span className={`px-2.5 py-0.5 font-extrabold rounded-full text-[10px] uppercase tracking-wider border ${
                                            msLoadError
                                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                                : hasLiveSupabaseData
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : 'bg-slate-100 text-slate-600 border-slate-300'
                                        }`}>
                                            {isLoading ? 'Cargando…' : msLoadError ? 'Error de conexión' : hasLiveSupabaseData ? 'Supabase En Vivo' : 'Sin registros'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Informe detallado de calidad MS, Pareto de causas, referencias y tendencias de IFI
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Botón de alternancia HTML vs Power BI */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => togglePlantView('ms', 'html')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                                plantViews.ms === 'html'
                                                    ? 'bg-[#324354] text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            <span>Tablero Dinámico</span>
                                        </button>
                                        <button
                                            onClick={() => togglePlantView('ms', 'powerbi')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                                plantViews.ms === 'powerbi'
                                                    ? 'bg-[#0084d1] text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Power BI</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={fetchSupabaseData}
                                        disabled={isLoading}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                        title="Recargar datos MS"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {plantViews.ms === 'powerbi' ? (
                                <div className="w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                                    <iframe
                                        title="Power BI Calidad MS"
                                        src={POWERBI_URL_MS}
                                        className="w-full h-full border-0"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Barra de Filtros MS */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Selector Año */}
                                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                                                <span className="text-slate-400 font-bold">Año</span>
                                                <select
                                                    value={selectedYear}
                                                    onChange={e => setSelectedYear(e.target.value)}
                                                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                                                >
                                                    <option value="All">Todos</option>
                                                    <option value="2026">2026</option>
                                                    <option value="2025">2025</option>
                                                </select>
                                            </div>

                                            {/* Selector Mes */}
                                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                                                <span className="text-slate-400 font-bold">Mes</span>
                                                <select
                                                    value={selectedMonth}
                                                    onChange={e => setSelectedMonth(e.target.value)}
                                                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer capitalize"
                                                >
                                                    <option value="All">Todos</option>
                                                    {MESES.map(m => (
                                                        <option key={m.num} value={m.nombre} className="capitalize">
                                                            {m.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Selector Día */}
                                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                                                <span className="text-slate-400 font-bold">Día</span>
                                                <select
                                                    value={selectedDay}
                                                    onChange={e => setSelectedDay(e.target.value)}
                                                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                                                >
                                                    <option value="All">Todos</option>
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                        <option key={d} value={d.toString()}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Checkbox Total Piezas */}
                                            <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={filterTotalPiezas}
                                                    onChange={e => setFilterTotalPiezas(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span>Total Piezas</span>
                                            </label>

                                            {/* Checkbox Solo Reparación */}
                                            <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={filterSoloReparacion}
                                                    onChange={e => setFilterSoloReparacion(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                                                />
                                                <span>Reparación</span>
                                            </label>

                                            <button
                                                onClick={resetFilters}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </div>

                                    {/* 8 Tarjetas KPI Oficiales de MS */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">% Opaco</span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{metrics.pctOpaco} %</span>
                                        </div>
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">Buenas</span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{metrics.piezasBuenas.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">Defectuosas</span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{metrics.piezasDefectuosas.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">Revisadas</span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{metrics.piezasRevisadas.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">Defectos</span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{metrics.cantidadDefectos.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold text-rose-800 uppercase truncate">% Moldes</span>
                                            <span className="text-base sm:text-lg font-black text-rose-900 mt-0.5">{metrics.pctMoldes} %</span>
                                        </div>
                                        <div className="p-2 bg-sky-600 text-white rounded-xl shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 truncate">DPU</span>
                                            <span className="text-base sm:text-lg font-black mt-0.5">{metrics.dpu}</span>
                                        </div>
                                        <div className="p-2 bg-[#0084d1] text-white rounded-xl shadow-2xs flex flex-col justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 truncate">Calidad</span>
                                            <span className="text-base sm:text-lg font-black mt-0.5">{metrics.calidad} %</span>
                                        </div>
                                    </div>

                                    {/* Gráficos MS: Pareto Donut y Detalle por Referencia */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                        {/* Pareto de Causas */}
                                        <div className="lg:col-span-7 bg-white rounded-xl p-3 shadow-xs border border-slate-200 flex flex-col justify-between">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h3 className="text-xs sm:text-sm font-black text-slate-800">Pareto de causas</h3>
                                                <span className="text-[10px] text-slate-400 font-bold">{metrics.totalCausas} causas</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                                <div className="md:col-span-6 space-y-1 max-h-[195px] overflow-y-auto pr-1 scrollbar-thin">
                                                    {metrics.paretoCausas.slice(0, 10).map((d, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 hover:bg-slate-50 px-1 rounded">
                                                            <div className="flex items-center gap-1.5 truncate mr-1.5">
                                                                <span
                                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: PARETO_COLORS[idx % PARETO_COLORS.length] }}
                                                                />
                                                                <span className="truncate text-slate-700 font-medium">{d.name}</span>
                                                            </div>
                                                            <div className="text-right flex-shrink-0 font-mono text-[10px]">
                                                                <span className="font-bold text-slate-900">{d.cantidad}</span>
                                                                <span className="text-slate-400 ml-0.5">({d.pct}%)</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="md:col-span-6 h-[195px] flex items-center justify-center relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={metrics.paretoCausas.slice(0, 15)}
                                                                dataKey="cantidad"
                                                                nameKey="name"
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={38}
                                                                outerRadius={68}
                                                                paddingAngle={2}
                                                            >
                                                                {metrics.paretoCausas.slice(0, 15).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={PARETO_COLORS[index % PARETO_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value: any, name: any) => [`${value} piezas`, name]} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detalle por Referencia con Acordeón */}
                                        <div className="lg:col-span-5 bg-white rounded-xl p-3 shadow-xs border border-slate-200 flex flex-col">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <h3 className="text-xs sm:text-sm font-black text-slate-800">Detalle por Referencia</h3>
                                                <div className="relative w-36">
                                                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar..."
                                                        value={refSearch}
                                                        onChange={e => setRefSearch(e.target.value)}
                                                        className="w-full pl-6 pr-2 py-0.5 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#324354]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="overflow-y-auto max-h-[195px] scrollbar-thin text-xs">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 text-[10px] border-b border-slate-200">
                                                        <tr>
                                                            <th className="py-1 px-1.5">Referencia</th>
                                                            <th className="py-1 px-1.5 text-right">Piezas Def.</th>
                                                            {filterTotalPiezas && <th className="py-1 px-1.5 text-right">Total Piezas</th>}
                                                            {filterSoloReparacion && <th className="py-1 px-1.5 text-right">Reparación</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {filteredReferencias.map(ref => {
                                                            const isExpanded = !!expandedRefs[ref.referencia];
                                                            return (
                                                                <React.Fragment key={ref.referencia}>
                                                                    <tr
                                                                        onClick={() => toggleRefExpanded(ref.referencia)}
                                                                        className="hover:bg-slate-50 cursor-pointer font-bold text-slate-800 transition-colors"
                                                                    >
                                                                        <td className="py-1 px-1.5 flex items-center gap-1">
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                                                            ) : (
                                                                                <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                            )}
                                                                            <span className="truncate">{ref.referencia}</span>
                                                                        </td>
                                                                        <td className="py-1 px-1.5 text-right font-black text-slate-900">{ref.piezasDefectuosas}</td>
                                                                        {filterTotalPiezas && <td className="py-1 px-1.5 text-right text-slate-600">{ref.totalPiezas}</td>}
                                                                        {filterSoloReparacion && <td className="py-1 px-1.5 text-right text-slate-600">{ref.reparacion}</td>}
                                                                    </tr>
                                                                    {isExpanded && ref.subdefectos.map((s, sIdx) => (
                                                                        <tr key={sIdx} className="bg-slate-50/80 text-[10px] text-slate-600">
                                                                            <td className="py-0.5 pl-6 pr-1.5 border-l-2 border-blue-400 truncate">• {s.name}</td>
                                                                            <td className="py-0.5 px-1.5 text-right font-bold text-slate-800">{s.piezasDefectuosas}</td>
                                                                            {filterTotalPiezas && <td className="py-0.5 px-1.5 text-right">{s.totalPiezas}</td>}
                                                                            {filterSoloReparacion && <td className="py-0.5 px-1.5 text-right">{s.reparacion}</td>}
                                                                        </tr>
                                                                    ))}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gráficos de Tendencia: IFI por Día y por Mes */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                        <div className="lg:col-span-8 bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h3 className="text-xs sm:text-sm font-black text-slate-800 capitalize">
                                                    IFI por Día ({selectedMonth === 'All' ? 'todos los meses' : selectedMonth} {selectedYear === 'All' ? '' : selectedYear})
                                                </h3>
                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <span className="flex items-center gap-1 font-bold text-slate-600">
                                                        <span className="w-2.5 h-0.5 bg-[#0284c7]" /> Calidad Real
                                                    </span>
                                                    <span className="flex items-center gap-1 font-bold text-slate-600">
                                                        <span className="w-2.5 h-0.5 bg-[#dc2626] border-dashed" /> Meta 90%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-[175px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={ifiPorDia} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey={selectedMonth === 'All' ? 'fecha' : 'dia'} tick={{ fontSize: 10 }} />
                                                        <YAxis domain={[(min: number) => Math.max(0, Math.min(60, Math.floor(min / 10) * 10)), 100]} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={(val: any) => [`${val} %`, 'Calidad IFI']} />
                                                        <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
                                                        <Line type="monotone" dataKey="calidad" stroke="#0284c7" strokeWidth={2} dot={{ r: 2.5, fill: '#0284c7' }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-4 bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                                            <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5">IFI por Mes ({ifiAnio})</h3>
                                            <div className="h-[175px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={ifiPorMes} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="mes" tickFormatter={val => val.substring(0, 3)} tick={{ fontSize: 10 }} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={(val: any) => [`${val} %`, 'Calidad']} />
                                                        <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
                                                        <Bar dataKey="calidad" radius={[4, 4, 0, 0]}>
                                                            {ifiPorMes.map((entry, index) => {
                                                                const isSelected = entry.mes === selectedMonth;
                                                                const fillColor = isSelected ? '#9a3412' : '#d8b4a6';
                                                                return <Cell key={`bar-${index}`} fill={fillColor} />;
                                                            })}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
