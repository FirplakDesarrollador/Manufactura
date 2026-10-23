'use client';

import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    RefreshCw, 
    Calendar, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    Boxes,
    Wrench,
    Sparkles
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid,
    Legend
} from 'recharts';
import { toast } from 'sonner';

export interface CuadroPlantaHoraHora {
    key: 'MS' | 'FV' | 'RTM' | 'MBL' | 'CEFI' | 'RMOLD';
    nombre: string;
    subtitulo: string;
    calidad: number;
    metaDia: number;
    realDia: number;
    cumplimientoPct: number;
    unidad: string;
    puntos: {
        hora: string;
        metaAcum: number;
        realAcum: number;
        realHora: number;
    }[];
}

const PLANT_ICONS: Record<string, React.ReactNode> = {
    MS: <Boxes size={18} className="text-cyan-400" />,
    FV: <Layers size={18} className="text-blue-400" />,
    RTM: <Sparkles size={18} className="text-purple-400" />,
    MBL: <Boxes size={18} className="text-amber-400" />,
    CEFI: <Boxes size={18} className="text-teal-400" />,
    RMOLD: <Wrench size={18} className="text-rose-400" />,
};

interface Props {
    fecha?: string;
}

export default function HoraAHoraPlantasView({ fecha: initialFecha }: Props) {
    const [fecha, setFecha] = useState<string>(() => {
        if (initialFecha) return initialFecha;
        const now = new Date();
        const offset = -5; // Colombia UTC-5
        const colDate = new Date(now.getTime() + (offset * 3600000));
        return colDate.toISOString().split('T')[0];
    });

    const [bloques, setBloques] = useState<CuadroPlantaHoraHora[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const loadData = async (targetFecha = fecha) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/indicadores/hora-a-hora?fecha=${targetFecha}`);
            if (!res.ok) throw new Error('Error en consulta');
            const json = await res.json();
            if (json.success && Array.isArray(json.bloques)) {
                setBloques(json.bloques);
            }
        } catch (error) {
            console.error('Error cargando cuadro de mando hora a hora:', error);
            toast.error('Error al cargar datos del cuadro de mando');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(fecha);
    }, [fecha]);

    // Semáforo dinámico de FIRPLAK: Verde >90%, Amarillo 85-90%, Rojo <85%
    const getSemaforoColor = (val: number) => {
        if (val >= 90) return { bg: 'bg-[#59a96a]/15 text-[#246132] border-[#59a96a]/40', badge: 'bg-[#59a96a]', text: 'text-[#59a96a]' };
        if (val >= 85) return { bg: 'bg-[#deb841]/15 text-[#735a16] border-[#deb841]/40', badge: 'bg-[#deb841]', text: 'text-[#deb841]' };
        return { bg: 'bg-[#d14747]/15 text-[#791c1c] border-[#d14747]/40', badge: 'bg-[#d14747]', text: 'text-[#d14747]' };
    };

    return (
        <div className="flex flex-col gap-3 animate-in fade-in duration-300">
            {/* Barra superior compacta con Fecha y Actualizar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#324354] text-white rounded-lg">
                        <Clock size={16} className="text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">
                            Cuadro de Mando Hora a Hora — Plantas
                        </h2>
                        <p className="text-[10.5px] text-gray-500 font-medium">
                            Avance acumulado vs Meta diagonal y Calidad en tiempo real
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                        <Calendar size={13} className="text-slate-500" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Fecha:</span>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
                        />
                    </div>

                    <button
                        onClick={() => loadData(fecha)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#324354] hover:bg-[#253342] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Cuadrícula de 6 Bloques: 3 arriba (MS, FV, RTM) y 3 abajo (MBL, CEFI, RMOLD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {bloques.map((b) => {
                    const semCalidad = getSemaforoColor(b.calidad);
                    const semCumplimiento = getSemaforoColor(b.cumplimientoPct);

                    return (
                        <div 
                            key={b.key}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition-all"
                        >
                            {/* Cabecera del Bloque */}
                            <div className="px-3.5 py-2.5 bg-[#324354] text-white flex items-center justify-between border-b border-[#253342]">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-white/10 rounded-md">
                                        {PLANT_ICONS[b.key] || <Boxes size={16} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xs sm:text-sm tracking-wide text-white leading-tight">
                                            {b.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-300 font-medium">
                                            {b.subtitulo}
                                        </p>
                                    </div>
                                </div>

                                {/* Calidad en Tiempo Real */}
                                <div 
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 shadow-inner"
                                    title="Calidad actual en tiempo real"
                                >
                                    <ShieldCheck size={14} className="text-cyan-300" />
                                    <div className="text-right">
                                        <span className="text-[9px] uppercase tracking-wider text-slate-300 block font-semibold leading-none">
                                            Calidad
                                        </span>
                                        <span className="text-xs font-black text-white leading-none">
                                            {b.calidad.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen Numérico: Meta, Real y Cumplimiento */}
                            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-slate-50/70 border-b border-gray-200 py-1.5 px-2 text-center">
                                <div>
                                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">
                                        Meta Día
                                    </span>
                                    <span className="text-xs sm:text-sm font-black text-gray-800">
                                        {b.metaDia.toLocaleString('es-CO')} <span className="text-[9px] font-normal text-gray-500">{b.unidad}</span>
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">
                                        Real Acum
                                    </span>
                                    <span className="text-xs sm:text-sm font-black text-gray-900">
                                        {b.realDia.toLocaleString('es-CO')} <span className="text-[9px] font-normal text-gray-500">{b.unidad}</span>
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-[9.5px] uppercase font-bold text-gray-400 block">
                                        Cumplimiento
                                    </span>
                                    <span className={`text-[11px] font-black px-1.5 py-0.2 rounded border ${semCumplimiento.bg}`}>
                                        {b.cumplimientoPct}%
                                    </span>
                                </div>
                            </div>

                            {/* Gráfica de Mando de Control (Ejes X y Y con Diagonal Meta vs Realidad Subiendo) */}
                            <div className="p-2.5 flex-1 flex flex-col justify-between">
                                <div className="h-[155px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={b.puntos}
                                            margin={{ top: 8, right: 12, left: -20, bottom: -4 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="hora" 
                                                tick={{ fill: '#64748b', fontSize: 9.5 }}
                                                axisLine={{ stroke: '#cbd5e1' }}
                                                tickLine={false}
                                                interval={1}
                                            />
                                            <YAxis 
                                                tick={{ fill: '#64748b', fontSize: 9.5 }}
                                                axisLine={false}
                                                tickLine={false}
                                                domain={[0, (dataMax: number) => Math.max(dataMax, b.metaDia) + Math.round(b.metaDia * 0.1)]}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    padding: '6px 10px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)'
                                                }}
                                                formatter={(value: any, name: any) => {
                                                    if (name === 'metaAcum') return [`${value} ${b.unidad}`, 'Meta Diagonal'];
                                                    if (name === 'realAcum') return [`${value} ${b.unidad}`, 'Real Acumulado'];
                                                    return [value, name];
                                                }}
                                                labelFormatter={(label) => `Hora: ${label}`}
                                            />
                                            {/* Línea Diagonal de Meta (Referencia) */}
                                            <Line 
                                                type="linear"
                                                dataKey="metaAcum" 
                                                name="metaAcum"
                                                stroke="#94a3b8" 
                                                strokeWidth={2}
                                                strokeDasharray="4 4" 
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                            {/* Línea de Realidad Subiendo */}
                                            <Line 
                                                type="monotone" 
                                                dataKey="realAcum" 
                                                name="realAcum"
                                                stroke="#00838f" 
                                                strokeWidth={3}
                                                dot={{ r: 2.5, fill: '#00838f', strokeWidth: 1, stroke: '#fff' }}
                                                activeDot={{ r: 5, fill: '#00bcd4' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Leyenda del Gráfico */}
                                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 pt-1 border-t border-gray-100 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3.5 h-[2px] bg-slate-400 border-b border-dashed border-slate-500"></div>
                                        <span>Meta Diagonal</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3.5 h-[3px] bg-[#00838f] rounded-full"></div>
                                        <span className="font-bold text-gray-700">Real Acumulado</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
