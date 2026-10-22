'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
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
    Pie
} from 'recharts';
import { supabase } from '@/lib/supabase';
import {
    FV_META_IFI,
    FvPieza,
    calcularIfiPorDiaFv,
    calcularIfiPorMesFv,
    calcularParetoFv,
    calcularProductosFv,
    calcularResumenFv
} from '@/lib/calidad/fvCalidad';

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const PARETO_COLORS = [
    '#008080', '#e06634', '#0284c7', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6',
    '#84cc16', '#a855f7', '#06b6d4', '#f97316', '#3b82f6'
];

// Tablero dinámico de Calidad FV (reemplazo del Power BI "BI Calidad FV")
export default function CalidadFVDashboard() {
    const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
    const [selectedMonth, setSelectedMonth] = useState<string>(() => MESES[new Date().getMonth()]);
    const [selectedDay, setSelectedDay] = useState<string>('All');
    const [refSearch, setRefSearch] = useState<string>('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const [piezasAnio, setPiezasAnio] = useState<FvPieza[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Carga todas las piezas del año seleccionado; mes y día se filtran en memoria
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) throw new Error('Sesión no disponible');

            const year = Number(selectedYear);
            const resp = await fetch(`/api/calidad/fv?desde=${year}-01-01&hasta=${year + 1}-01-01`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'Error consultando SharePoint');
            setPiezasAnio(json.piezas || []);
        } catch (err: any) {
            console.warn('Error cargando calidad FV:', err);
            setPiezasAnio([]);
            setLoadError(err?.message || 'Error consultando SharePoint');
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const mesNum = String(MESES.indexOf(selectedMonth) + 1).padStart(2, '0');
    const piezasMes = useMemo(
        () => (selectedMonth === 'All' ? piezasAnio : piezasAnio.filter(p => p.fecha.slice(5, 7) === mesNum)),
        [piezasAnio, selectedMonth, mesNum]
    );
    const piezasPeriodo = useMemo(
        () => (selectedDay === 'All' ? piezasMes : piezasMes.filter(p => p.fecha.slice(8, 10) === selectedDay.padStart(2, '0'))),
        [piezasMes, selectedDay]
    );

    const resumen = useMemo(() => calcularResumenFv(piezasPeriodo), [piezasPeriodo]);
    const pareto = useMemo(() => calcularParetoFv(piezasPeriodo), [piezasPeriodo]);
    const productos = useMemo(() => calcularProductosFv(piezasPeriodo), [piezasPeriodo]);
    const ifiPorDia = useMemo(() => calcularIfiPorDiaFv(piezasMes), [piezasMes]);
    const ifiPorMes = useMemo(() => calcularIfiPorMesFv(piezasAnio, selectedYear, MESES), [piezasAnio, selectedYear]);

    const productosFiltrados = useMemo(() => {
        const q = refSearch.trim().toLowerCase();
        if (!q) return productos;
        return productos.filter(p => p.producto.toLowerCase().includes(q) || p.subdefectos.some(s => s.name.toLowerCase().includes(q)));
    }, [productos, refSearch]);
    const totalConDefecto = productosFiltrados.reduce((acc, p) => acc + p.piezasConDefecto, 0);

    const resetFilters = () => {
        setSelectedYear(String(new Date().getFullYear()));
        setSelectedMonth(MESES[new Date().getMonth()]);
        setSelectedDay('All');
        setRefSearch('');
    };

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: current - 2023 + 1 }, (_, i) => String(current - i));
    }, []);

    return (
        <div className="space-y-3">
            {/* Barra de Filtros FV */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                        <span className="text-slate-400 font-bold">Año</span>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                        <span className="text-slate-400 font-bold">Mes</span>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer capitalize"
                        >
                            <option value="All">Todos</option>
                            {MESES.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs text-xs">
                        <span className="text-slate-400 font-bold">Día</span>
                        <select
                            value={selectedDay}
                            onChange={e => setSelectedDay(e.target.value)}
                            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                        >
                            <option value="All">Todos</option>
                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 font-extrabold rounded-full text-[10px] uppercase tracking-wider border ${
                        loadError
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : piezasAnio.length > 0
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                        {isLoading ? 'Cargando…' : loadError ? 'Error SharePoint' : piezasAnio.length > 0 ? 'SharePoint En Vivo' : 'Sin registros'}
                    </span>
                    <button onClick={resetFilters} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline">
                        Limpiar
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                        title="Recargar datos FV"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    No se pudieron cargar los datos de FV: {loadError}
                </div>
            )}

            {/* 7 Tarjetas KPI de FV */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                    { label: 'Revisadas', value: resumen.piezasRevisadas.toLocaleString('es-CO') },
                    { label: 'Buenas', value: resumen.piezasBuenas.toLocaleString('es-CO') },
                    { label: 'Defectuosas', value: resumen.piezasDefectuosas.toLocaleString('es-CO') }
                ].map(k => (
                    <div key={k.label} className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{k.label}</span>
                        <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{k.value}</span>
                    </div>
                ))}
                <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-rose-800 uppercase truncate">% Moldes</span>
                    <span className="text-base sm:text-lg font-black text-rose-900 mt-0.5">{resumen.pctMoldes.toFixed(1)} %</span>
                </div>
                <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-rose-800 uppercase truncate">% Piel de naranja</span>
                    <span className="text-base sm:text-lg font-black text-rose-900 mt-0.5">{resumen.pctPielNaranja.toFixed(1)} %</span>
                </div>
                <div className="p-2 bg-sky-600 text-white rounded-xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 truncate">DPU</span>
                    <span className="text-base sm:text-lg font-black mt-0.5">{resumen.dpu.toFixed(1)}</span>
                </div>
                <div className="p-2 bg-[#0084d1] text-white rounded-xl shadow-2xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 truncate">IFI (meta {FV_META_IFI}%)</span>
                    <span className="text-base sm:text-lg font-black mt-0.5">{resumen.calidad.toFixed(1)} %</span>
                </div>
            </div>

            {/* Pareto Donut y Detalle por Producto */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-7 bg-white rounded-xl p-3 shadow-xs border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Pareto de causas</h3>
                        <span className="text-[10px] text-slate-400 font-bold">{pareto.length} causas · {resumen.cantidadDefectos} defectos</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-6 space-y-1 max-h-[195px] overflow-y-auto pr-1 scrollbar-thin">
                            {pareto.slice(0, 15).map((d, idx) => (
                                <div key={d.name} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 hover:bg-slate-50 px-1 rounded">
                                    <div className="flex items-center gap-1.5 truncate mr-1.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PARETO_COLORS[idx % PARETO_COLORS.length] }} />
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
                                    <Pie data={pareto.slice(0, 15)} dataKey="cantidad" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2}>
                                        {pareto.slice(0, 15).map((entry, index) => (
                                            <Cell key={`fv-cell-${index}`} fill={PARETO_COLORS[index % PARETO_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any, name: any) => [`${value} defectos`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white rounded-xl p-3 shadow-xs border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Detalle por Producto</h3>
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
                                    <th className="py-1 px-1.5">Producto</th>
                                    <th className="py-1 px-1.5 text-right">Pzs. con defecto</th>
                                    <th className="py-1 px-1.5 text-right">Revisadas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productosFiltrados.map(p => {
                                    const isOpen = !!expanded[p.producto];
                                    return (
                                        <React.Fragment key={p.producto}>
                                            <tr
                                                onClick={() => setExpanded(prev => ({ ...prev, [p.producto]: !prev[p.producto] }))}
                                                className="hover:bg-slate-50 cursor-pointer font-bold text-slate-800 transition-colors"
                                            >
                                                <td className="py-1 px-1.5 flex items-center gap-1">
                                                    {isOpen ? <ChevronDown className="w-3 h-3 text-blue-600 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                                                    <span className="truncate">{p.producto}</span>
                                                </td>
                                                <td className="py-1 px-1.5 text-right font-black text-slate-900">{p.piezasConDefecto}</td>
                                                <td className="py-1 px-1.5 text-right text-slate-600">{p.totalPiezas}</td>
                                            </tr>
                                            {isOpen && p.subdefectos.map(s => (
                                                <tr key={s.name} className="bg-slate-50/80 text-[10px] text-slate-600">
                                                    <td className="py-0.5 pl-6 pr-1.5 border-l-2 border-blue-400 truncate">• {s.name}</td>
                                                    <td className="py-0.5 px-1.5 text-right font-bold text-slate-800">{s.cantidad}</td>
                                                    <td />
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-white border-t border-slate-200 font-black text-slate-900">
                                <tr>
                                    <td className="py-1 px-1.5">Total</td>
                                    <td className="py-1 px-1.5 text-right">{totalConDefecto}</td>
                                    <td className="py-1 px-1.5 text-right">{productosFiltrados.reduce((acc, p) => acc + p.totalPiezas, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tendencias IFI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-8 bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 capitalize">
                            IFI por Día ({selectedMonth === 'All' ? 'todos los meses' : selectedMonth} {selectedYear})
                        </h3>
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="flex items-center gap-1 font-bold text-slate-600">
                                <span className="w-2.5 h-0.5 bg-[#7c3aed]" /> IFI
                            </span>
                            <span className="flex items-center gap-1 font-bold text-slate-600">
                                <span className="w-2.5 h-0.5 bg-[#dc2626]" /> Meta {FV_META_IFI}%
                            </span>
                        </div>
                    </div>
                    <div className="h-[175px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ifiPorDia} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey={selectedMonth === 'All' ? 'fecha' : 'dia'} tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, (max: number) => Math.min(100, Math.max(50, Math.ceil(max / 10) * 10))]} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(val: any) => [`${val} %`, 'IFI']} />
                                <ReferenceLine y={FV_META_IFI} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="calidad" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2.5, fill: '#7c3aed' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5">IFI por Mes ({selectedYear})</h3>
                    <div className="h-[175px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ifiPorMes} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="mes" tickFormatter={val => val.substring(0, 3)} tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, (max: number) => Math.min(100, Math.max(50, Math.ceil(max / 10) * 10))]} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(val: any) => [`${val} %`, 'IFI']} />
                                <ReferenceLine y={FV_META_IFI} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
                                <Bar dataKey="calidad" radius={[4, 4, 0, 0]}>
                                    {ifiPorMes.map((entry, index) => (
                                        <Cell key={`fv-bar-${index}`} fill={entry.mes === selectedMonth ? '#9a3412' : '#d8b4a6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
