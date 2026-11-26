'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    DashboardVigilanciaData,
    cargarIndicadoresVigilancia,
    PlantaVigilanciaKey,
    CumplimientoItemResult,
    CumplimientoProcesoResult,
    clasificarSemaforo
} from '@/lib/calidad/vigilanciaIndicadores';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    TrendingUp,
    RefreshCw,
    Search,
    Layers,
    ArrowLeft,
    Filter,
    BarChart3,
    ChevronRight,
    Sparkles,
    Calendar,
    Award,
    Activity
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    ReferenceLine
} from 'recharts';

interface IndicadoresVigilanciaViewProps {
    plantaInicial?: PlantaVigilanciaKey | null;
    onBack?: () => void;
}

const COLOR_SEMAFORO = {
    excelente: '#59a96a', // Verde FIRPLAK
    alerta: '#deb841',    // Amarillo FIRPLAK
    critico: '#d14747'    // Rojo FIRPLAK
};

export default function IndicadoresVigilanciaView({
    plantaInicial = null,
    onBack
}: IndicadoresVigilanciaViewProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardVigilanciaData | null>(null);
    const [selectedPlanta, setSelectedPlanta] = useState<PlantaVigilanciaKey | 'todas'>(plantaInicial || 'todas');
    const [diasFiltro, setDiasFiltro] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProcesoId, setSelectedProcesoId] = useState<string>('todos');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await cargarIndicadoresVigilancia(diasFiltro);
            setData(res);
        } catch (err) {
            console.error('Error cargando indicadores de vigilancia:', err);
        } finally {
            setLoading(false);
        }
    }, [diasFiltro]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (plantaInicial) {
            setSelectedPlanta(plantaInicial);
        }
    }, [plantaInicial]);

    // Resumen según la planta seleccionada
    const currentViewMetrics = useMemo(() => {
        if (!data) return null;

        if (selectedPlanta === 'todas') {
            return {
                nombre: 'Consolidado Todas las Plantas',
                cumplimiento: data.cumplimientoGlobal,
                totalAuditorias: data.totalAuditorias,
                totalChequeos: data.totalChequeos,
                totalCumplen: data.totalChequeosCumplen,
                itemsEnAlerta: data.itemsEnAlerta,
                estado: clasificarSemaforo(data.cumplimientoGlobal)
            };
        }

        const plantaObj = data.plantas.find((p) => p.plantaKey === selectedPlanta);
        if (!plantaObj) return null;

        const alertasPlanta = plantaObj.procesos.flatMap((pr) => pr.items).filter((it) => it.porcentaje < 85).length;

        return {
            nombre: plantaObj.nombre,
            cumplimiento: plantaObj.porcentaje,
            totalAuditorias: plantaObj.totalRegistros,
            totalChequeos: plantaObj.totalChequeos,
            totalCumplen: plantaObj.chequeosCumplen,
            itemsEnAlerta: alertasPlanta,
            estado: plantaObj.estado
        };
    }, [data, selectedPlanta]);

    // Procesos disponibles para el selector de sub-filtro
    const availableProcesos = useMemo(() => {
        if (!data) return [];
        if (selectedPlanta === 'todas') {
            return data.plantas.flatMap((p) => p.procesos);
        }
        const pl = data.plantas.find((p) => p.plantaKey === selectedPlanta);
        return pl ? pl.procesos : [];
    }, [data, selectedPlanta]);

    // Items filtrados por texto y proceso para la tabla / matriz detallada
    const filteredItems = useMemo(() => {
        if (!data) return [];

        let procesos: CumplimientoProcesoResult[] = [];
        if (selectedPlanta === 'todas') {
            procesos = data.plantas.flatMap((p) => p.procesos);
        } else {
            const pl = data.plantas.find((p) => p.plantaKey === selectedPlanta);
            if (pl) procesos = pl.procesos;
        }

        if (selectedProcesoId !== 'todos') {
            procesos = procesos.filter((p) => p.id === selectedProcesoId);
        }

        const itemsList: (CumplimientoItemResult & { procesoNombre: string; plantaNombre: string; tabla: string })[] = [];

        for (const pr of procesos) {
            const plParent = data.plantas.find((p) => p.plantaKey === pr.plantaKey);
            for (const it of pr.items) {
                if (
                    searchQuery.trim() === '' ||
                    it.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (it.descripcion && it.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    pr.nombre.toLowerCase().includes(searchQuery.toLowerCase())
                ) {
                    itemsList.push({
                        ...it,
                        procesoNombre: pr.nombre,
                        plantaNombre: plParent?.nombre || pr.plantaKey,
                        tabla: pr.tabla
                    });
                }
            }
        }

        return itemsList;
    }, [data, selectedPlanta, selectedProcesoId, searchQuery]);

    // Datos para la gráfica de plantas
    const plantasChartData = useMemo(() => {
        if (!data) return [];
        return data.plantas.map((pl) => ({
            name: pl.codigoOficial,
            fullName: pl.nombre,
            cumplimiento: pl.porcentaje,
            total: pl.totalRegistros,
            fill: COLOR_SEMAFORO[pl.estado]
        }));
    }, [data]);

    // Datos para la gráfica de procesos
    const procesosChartData = useMemo(() => {
        if (!data) return [];
        const procs = availableProcesos;
        return procs.map((pr) => ({
            name: pr.nombre.length > 14 ? pr.nombre.substring(0, 13) + '…' : pr.nombre,
            fullName: pr.nombre,
            cumplimiento: pr.porcentaje,
            total: pr.totalRegistros,
            fill: COLOR_SEMAFORO[pr.estado]
        }));
    }, [data, availableProcesos]);

    // Datos para puntos críticos (ítems con menor cumplimiento)
    const puntosCriticosChartData = useMemo(() => {
        if (!data) return [];
        const source =
            selectedPlanta === 'todas'
                ? data.puntosCriticos
                : data.puntosCriticos.filter((it) => it.planta.toLowerCase().includes(selectedPlanta.toLowerCase()));

        return source.slice(0, 7).map((it) => ({
            name: it.nombre.length > 20 ? it.nombre.substring(0, 19) + '…' : it.nombre,
            fullName: `${it.nombre} (${it.proceso})`,
            cumplimiento: it.porcentaje,
            fill: COLOR_SEMAFORO[it.estado]
        }));
    }, [data, selectedPlanta]);

    const getBadgeClass = (estado: 'excelente' | 'alerta' | 'critico') => {
        if (estado === 'excelente') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (estado === 'alerta') return 'bg-amber-100 text-amber-800 border-amber-300';
        return 'bg-red-100 text-red-800 border-red-300';
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
            {/* --- CABECERA DE CONTROL SUPERIOR --- */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Volver al Menú"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-[#0099e5]" />
                                <h1 className="text-xl sm:text-2xl font-bold text-[#324354] tracking-tight">
                                    Indicadores de Cumplimiento · Plan de Vigilancia
                                </h1>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                Seguimiento cuantitativo a cada ítem y parámetro auditado en las plantas operativas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                        {/* Filtro de Tiempo */}
                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                            <button
                                onClick={() => setDiasFiltro(null)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    diasFiltro === null
                                        ? 'bg-white text-[#324354] shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Histórico
                            </button>
                            <button
                                onClick={() => setDiasFiltro(30)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    diasFiltro === 30
                                        ? 'bg-white text-[#324354] shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                30 Días
                            </button>
                            <button
                                onClick={() => setDiasFiltro(7)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    diasFiltro === 7
                                        ? 'bg-white text-[#324354] shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                7 Días
                            </button>
                        </div>

                        {/* Botón Refrescar */}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                            title="Recargar datos"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0099e5]' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtro por Plantas (Pills) */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Planta:</span>
                    {[
                        { key: 'todas', label: 'Todas las Plantas' },
                        { key: 'ms', label: 'Mármol Sintético (MS)' },
                        { key: 'fv', label: 'Fibra de Vidrio (FV)' },
                        { key: 'muebles', label: 'Muebles (MBL)' },
                        { key: 'cefi', label: 'CEFI' },
                        { key: 'moldes', label: 'Moldes' }
                    ].map((tab) => {
                        const isSelected = selectedPlanta === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setSelectedPlanta(tab.key as any);
                                    setSelectedProcesoId('todos');
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-[#324354] text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- CARDS DE KPIS PRINCIPALES (4 TARJETAS) --- */}
            {currentViewMetrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* KPI 1: Cumplimiento General */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Cumplimiento Promedio
                            </span>
                            <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getBadgeClass(
                                    currentViewMetrics.estado
                                )}`}
                            >
                                Meta: 90%
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span
                                className="text-3xl sm:text-4xl font-black tracking-tight"
                                style={{ color: COLOR_SEMAFORO[currentViewMetrics.estado] }}
                            >
                                {currentViewMetrics.cumplimiento}%
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                {currentViewMetrics.cumplimiento >= 90
                                    ? 'Conforme'
                                    : currentViewMetrics.cumplimiento >= 85
                                    ? 'En observación'
                                    : 'Crítico'}
                            </span>
                        </div>
                        {/* Barra de progreso */}
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, currentViewMetrics.cumplimiento)}%`,
                                    backgroundColor: COLOR_SEMAFORO[currentViewMetrics.estado]
                                }}
                            />
                        </div>
                    </div>

                    {/* KPI 2: Total Auditorías */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Registros Realizados
                            </span>
                            <Layers className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#324354] tracking-tight">
                                {currentViewMetrics.totalAuditorias.toLocaleString('es-CO')}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">Hojas de vigilancia capturadas</p>
                        </div>
                        <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-2 w-fit">
                            ✓ Datos 100% sincronizados
                        </div>
                    </div>

                    {/* KPI 3: Total Chequeos de Ítems */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Chequeos Evaluados
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                                {currentViewMetrics.totalCumplen.toLocaleString('es-CO')}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold ml-1">
                                / {currentViewMetrics.totalChequeos.toLocaleString('es-CO')}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">Parámetros que cumplieron</p>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-2 w-fit">
                            {(currentViewMetrics.totalChequeos - currentViewMetrics.totalCumplen).toLocaleString('es-CO')}{' '}
                            no conformidades
                        </div>
                    </div>

                    {/* KPI 4: Ítems en Alerta */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Puntos en Alerta
                            </span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="mt-2">
                            <span
                                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                                    currentViewMetrics.itemsEnAlerta > 0 ? 'text-[#d14747]' : 'text-emerald-600'
                                }`}
                            >
                                {currentViewMetrics.itemsEnAlerta}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {currentViewMetrics.itemsEnAlerta === 1
                                    ? 'Ítem con cumplimiento < 85%'
                                    : 'Ítems con cumplimiento < 85%'}
                            </p>
                        </div>
                        <div
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md mt-2 w-fit ${
                                currentViewMetrics.itemsEnAlerta > 0
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}
                        >
                            {currentViewMetrics.itemsEnAlerta > 0 ? 'Requiere plan de acción' : 'Estándar bajo control'}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN DE GRÁFICAS (2 COLUMNAS RESPONSIVAS CON RECHARTS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* GRÁFICA 1: Cumplimiento por Planta o por Proceso */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#324354]">
                                {selectedPlanta === 'todas'
                                    ? 'Cumplimiento por Planta (%)'
                                    : `Cumplimiento por Proceso en ${currentViewMetrics?.nombre} (%)`}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Comparativo contra la meta estándar corporativa del 90%
                            </p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            Semáforo FIRPLAK
                        </span>
                    </div>

                    <div className="mt-4 h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={selectedPlanta === 'todas' ? plantasChartData : procesosChartData}
                                margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    interval={0}
                                    angle={-10}
                                    textAnchor="end"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const p = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                                                    <p className="font-bold text-slate-100">{p.fullName || p.name}</p>
                                                    <p className="text-emerald-400 font-extrabold text-sm">
                                                        Cumplimiento: {p.cumplimiento}%
                                                    </p>
                                                    <p className="text-slate-300 text-[11px]">
                                                        Registros auditados: {p.total}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    y={90}
                                    stroke="#59a96a"
                                    strokeDasharray="4 4"
                                    strokeWidth={2}
                                    label={{ value: 'Meta: 90%', position: 'insideTopRight', fill: '#59a96a', fontSize: 11 }}
                                />
                                <Bar dataKey="cumplimiento" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                    {(selectedPlanta === 'todas' ? plantasChartData : procesosChartData).map(
                                        (entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        )
                                    )}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICA 2: Puntos Críticos (Menor Cumplimiento) */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#324354]">
                                Puntos Críticos de Calidad (Menor Cumplimiento)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Ítems con menor tasa de cumplimiento (prioridad de acción preventiva)
                            </p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded-md">
                            Atención Inmediata
                        </span>
                    </div>

                    <div className="mt-4 h-[290px] w-full">
                        {puntosCriticosChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={puntosCriticosChartData}
                                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#475569' }}
                                        width={140}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const p = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                                                        <p className="font-bold text-slate-100">{p.fullName}</p>
                                                        <p className="text-red-400 font-extrabold text-sm">
                                                            Cumplimiento: {p.cumplimiento}%
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine
                                        x={90}
                                        stroke="#59a96a"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                    />
                                    <Bar dataKey="cumplimiento" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                        {puntosCriticosChartData.map((entry, index) => (
                                            <Cell key={`crit-cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <Award className="w-12 h-12 text-emerald-500 mb-2" />
                                <p className="text-sm font-bold text-slate-700">¡Excelente desempeño!</p>
                                <p className="text-xs text-slate-500 max-w-xs mt-1">
                                    No se encontraron ítems por debajo del 90% de cumplimiento en este periodo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MATRIZ DETALLADA DE ÍTEMS AUDITADOS --- */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[#0099e5]" />
                            <h2 className="text-base sm:text-lg font-bold text-[#324354]">
                                Matriz Detallada de Ítems Auditados
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Evaluación individual de cada parámetro inspeccionado en las plantas operativas
                        </p>
                    </div>

                    {/* Filtros de búsqueda y proceso */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Selector de sub-proceso */}
                        <select
                            value={selectedProcesoId}
                            onChange={(e) => setSelectedProcesoId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0099e5]/30 cursor-pointer"
                        >
                            <option value="todos">Todos los Procesos ({availableProcesos.length})</option>
                            {availableProcesos.map((proc) => (
                                <option key={proc.id} value={proc.id}>
                                    {proc.nombre}
                                </option>
                            ))}
                        </select>

                        {/* Buscador de texto */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar ítem o parámetro..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0099e5]/30 text-slate-800 placeholder-slate-400 w-full sm:w-56"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-3">Ítem / Parámetro Evaluado</th>
                                <th className="p-3">Proceso</th>
                                <th className="p-3">Planta</th>
                                <th className="p-3 text-center">Evaluaciones</th>
                                <th className="p-3 text-center">Cumple</th>
                                <th className="p-3 text-center">No Cumple</th>
                                <th className="p-3 text-center">Cumplimiento (%)</th>
                                <th className="p-3 text-center">Semáforo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, idx) => {
                                    const semaforoColor = COLOR_SEMAFORO[item.estado];
                                    return (
                                        <tr key={`${item.tabla}-${item.columna}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3 font-semibold text-slate-800">
                                                <div>{item.nombre}</div>
                                                {item.descripcion && (
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        {item.descripcion}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                                                {item.procesoNombre}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                    {item.plantaNombre}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-700">
                                                {item.totalEvaluaciones}
                                            </td>
                                            <td className="p-3 text-center font-bold text-emerald-600">
                                                {item.cumplen}
                                            </td>
                                            <td className="p-3 text-center font-bold text-red-500">
                                                {item.noCumplen}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span
                                                        className="font-black text-xs"
                                                        style={{ color: semaforoColor }}
                                                    >
                                                        {item.porcentaje}%
                                                    </span>
                                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, item.porcentaje)}%`,
                                                                backgroundColor: semaforoColor
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(
                                                        item.estado
                                                    )}`}
                                                >
                                                    {item.estado === 'excelente'
                                                        ? 'Excelente (>90%)'
                                                        : item.estado === 'alerta'
                                                        ? 'Observación (85-90%)'
                                                        : 'Crítico (<85%)'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No se encontraron ítems que coincidan con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                    <p>
                        Mostrando <strong className="text-slate-800">{filteredItems.length}</strong> parámetros auditados
                    </p>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#59a96a]" />
                            <span>≥ 90% Conforme</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#deb841]" />
                            <span>85% - 89.9% Alerta</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#d14747]" />
                            <span>&lt; 85% Crítico</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
