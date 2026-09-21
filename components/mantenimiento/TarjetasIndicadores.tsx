'use client';

import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Layers, 
  Cpu, 
  User, 
  Filter,
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

interface TarjetaTpm {
  id: number | string;
  codigo: string;
  tipo_tarjeta: 'roja' | 'azul' | 'amarilla' | 'verde';
  tipo_aviso?: string;
  maquina: string;
  planta: string;
  detectada_por: string;
  descripcion_que: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  accion_inmediata?: string;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
  fecha_apertura: string;
  fecha_cierre?: string;
  fotos?: string[];
}

interface TarjetasIndicadoresProps {
  tarjetas: TarjetaTpm[];
}

export default function TarjetasIndicadores({ tarjetas }: TarjetasIndicadoresProps) {
  const [filterPlanta, setFilterPlanta] = useState<string>('todas');

  // Available plantas
  const plantasList = useMemo(() => {
    const setP = new Set<string>();
    tarjetas.forEach(t => {
      if (t.planta) setP.add(t.planta);
    });
    return Array.from(setP);
  }, [tarjetas]);

  // Filtered dataset
  const data = useMemo(() => {
    if (filterPlanta === 'todas') return tarjetas;
    return tarjetas.filter(t => t.planta === filterPlanta);
  }, [tarjetas, filterPlanta]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const cerradas = data.filter(t => t.estado === 'cerrada').length;
    const enProceso = data.filter(t => t.estado === 'en_proceso').length;
    const abiertas = data.filter(t => t.estado === 'abierta').length;
    const altaPrioridad = data.filter(t => t.prioridad === 'Alta').length;
    const tasaCierre = total > 0 ? Math.round((cerradas / total) * 100) : 0;

    return { total, cerradas, enProceso, abiertas, altaPrioridad, tasaCierre };
  }, [data]);

  // Breakdown by Color / Classification TPM
  const colorData = useMemo(() => {
    const counts = {
      roja: { name: 'Roja (Mtto)', count: 0, color: '#e11d48' },
      azul: { name: 'Azul (Autónomo)', count: 0, color: '#2563eb' },
      amarilla: { name: 'Amarilla (5S)', count: 0, color: '#d97706' },
      verde: { name: 'Verde (Kaizen)', count: 0, color: '#059669' },
    };

    data.forEach(t => {
      if (counts[t.tipo_tarjeta]) {
        counts[t.tipo_tarjeta].count++;
      }
    });

    return Object.values(counts);
  }, [data]);

  // Breakdown by Estado (Pie Chart)
  const estadoData = useMemo(() => {
    return [
      { name: 'Abiertas', value: kpis.abiertas, color: '#f43f5e' },
      { name: 'En Proceso', value: kpis.enProceso, color: '#eab308' },
      { name: 'Cerradas', value: kpis.cerradas, color: '#10b981' },
    ].filter(item => item.value > 0);
  }, [kpis]);

  // Breakdown by Priority
  const prioridadData = useMemo(() => {
    const altas = data.filter(t => t.prioridad === 'Alta').length;
    const medias = data.filter(t => t.prioridad === 'Media').length;
    const bajas = data.filter(t => t.prioridad === 'Baja').length;

    return [
      { name: 'Alta (Crítica)', value: altas, color: '#e11d48' },
      { name: 'Media', value: medias, color: '#f59e0b' },
      { name: 'Baja', value: bajas, color: '#3b82f6' }
    ];
  }, [data]);

  // Breakdown by Planta
  const plantaData = useMemo(() => {
    const map: { [p: string]: { planta: string; rojas: number; azules: number; amarillas: number; verdes: number; total: number } } = {};

    data.forEach(t => {
      const p = t.planta || 'Sin Planta';
      if (!map[p]) {
        map[p] = { planta: p, rojas: 0, azules: 0, amarillas: 0, verdes: 0, total: 0 };
      }
      map[p].total++;
      if (t.tipo_tarjeta === 'roja') map[p].rojas++;
      if (t.tipo_tarjeta === 'azul') map[p].azules++;
      if (t.tipo_tarjeta === 'amarilla') map[p].amarillas++;
      if (t.tipo_tarjeta === 'verde') map[p].verdes++;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  // Top 5 Machines with most anomalies
  const topMaquinas = useMemo(() => {
    const map: { [m: string]: number } = {};
    data.forEach(t => {
      const m = t.maquina || 'No especificada';
      map[m] = (map[m] || 0) + 1;
    });

    return Object.entries(map)
      .map(([maquina, total]) => ({ maquina, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data]);

  // Top Collaborators Reporting
  const topReportantes = useMemo(() => {
    const map: { [u: string]: number } = {};
    data.forEach(t => {
      const u = t.detectada_por || 'Anónimo';
      map[u] = (map[u] || 0) + 1;
    });

    return Object.entries(map)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [data]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* Header Bar of Indicadores */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white px-4 py-3 rounded-2xl border border-[#e2ded5] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#324354] text-white flex items-center justify-center shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#324354] leading-tight">
              Tablero de Indicadores y Gestión TPM
            </h2>
            <p className="text-[11px] text-gray-500">
              Métricas de efectividad, volumetría y comportamiento de tarjetas en planta
            </p>
          </div>
        </div>

        {/* Filter by Plant */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#7B8E90]" />
          <span className="text-xs font-semibold text-gray-600">Filtrar Planta:</span>
          <select
            value={filterPlanta}
            onChange={(e) => setFilterPlanta(e.target.value)}
            className="px-3 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
          >
            <option value="todas">Todas las Plantas ({tarjetas.length})</option>
            {plantasList.map((planta, idx) => (
              <option key={idx} value={planta}>{planta}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Tarjetas */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <Layers className="w-4 h-4 text-[#324354]" />
          </div>
          <div className="text-2xl font-black text-[#324354]">{kpis.total}</div>
          <span className="text-[10px] text-gray-400 mt-1">Tarjetas registradas</span>
        </div>

        {/* Tasa de Cierre */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolución</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-black text-emerald-600">{kpis.tasaCierre}%</div>
            <span className="text-xs text-gray-400 font-semibold">cerradas</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, kpis.tasaCierre)}%` }}
            ></div>
          </div>
        </div>

        {/* Abiertas */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Abiertas</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.abiertas}</div>
          <span className="text-[10px] text-rose-500 mt-1">Pendientes de inicio</span>
        </div>

        {/* En Proceso */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Proceso</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.enProceso}</div>
          <span className="text-[10px] text-amber-600 mt-1">Intervención en curso</span>
        </div>

        {/* Cerradas */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cerradas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{kpis.cerradas}</div>
          <span className="text-[10px] text-emerald-600 mt-1">Anomalías eliminadas</span>
        </div>

        {/* Alta Prioridad */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Críticas</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{kpis.altaPrioridad}</div>
          <span className="text-[10px] text-gray-400 mt-1">Prioridad Alta</span>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Chart 1: Distribución por Clasificación TPM */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#324354] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#324354]" />
              <span>Distribución por Clasificación TPM (Color)</span>
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">Volumen total</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={colorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#324354', color: '#fff', borderRadius: '12px', fontSize: '11px', border: 'none' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Tarjetas" radius={[6, 6, 0, 0]}>
                  {colorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Badges Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
            {colorData.map((c, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-600">{c.name}</span>
                <span className="text-sm font-black text-[#324354]">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Estado de las Tarjetas (Pie Chart) */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#324354] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#324354]" />
              <span>Estado Actual de las Tarjetas</span>
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">Ciclo de vida</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {estadoData.length === 0 ? (
              <div className="text-xs text-gray-400">Sin datos registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {estadoData.map((entry, index) => (
                      <Cell key={`cell-estado-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#324354', color: '#fff', borderRadius: '12px', fontSize: '11px', border: 'none' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Breakdown Summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
            <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex flex-col items-center">
              <span className="text-[10px] font-bold text-rose-700">Abiertas</span>
              <span className="text-sm font-black text-rose-700">{kpis.abiertas}</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100 flex flex-col items-center">
              <span className="text-[10px] font-bold text-amber-700">En Proceso</span>
              <span className="text-sm font-black text-amber-700">{kpis.enProceso}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center">
              <span className="text-[10px] font-bold text-emerald-700">Cerradas</span>
              <span className="text-sm font-black text-emerald-700">{kpis.cerradas}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Tables and Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Top 5 Machines */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#324354] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#7B8E90]" />
              <span>Top 5 Máquinas con Anomalías</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-400">Pareto</span>
          </div>

          <div className="flex flex-col gap-2">
            {topMaquinas.length === 0 ? (
              <div className="text-xs text-gray-400 py-4 text-center">No hay registros de máquinas.</div>
            ) : (
              topMaquinas.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#324354] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#324354] truncate" title={item.maquina}>
                      {item.maquina}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] shrink-0">
                    {item.total} {item.total === 1 ? 'tarjeta' : 'tarjetas'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tarjetas por Planta */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#324354] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7B8E90]" />
              <span>Tarjetas por Planta</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-400">Comparativa</span>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {plantaData.length === 0 ? (
              <div className="text-xs text-gray-400 py-4 text-center">No hay datos de plantas.</div>
            ) : (
              plantaData.map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#324354]">{p.planta}</span>
                    <span className="text-xs font-black text-[#324354]">{p.total} total</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9.5px]">
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 font-bold rounded">🔴 {p.rojas}</span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">🔵 {p.azules}</span>
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 font-bold rounded">🟡 {p.amarillas}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 font-bold rounded">🟢 {p.verdes}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Reportantes */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#324354] flex items-center gap-2">
              <User className="w-4 h-4 text-[#7B8E90]" />
              <span>Colaboradores con más Reportes</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-400">Participación</span>
          </div>

          <div className="flex flex-col gap-2">
            {topReportantes.length === 0 ? (
              <div className="text-xs text-gray-400 py-4 text-center">Sin registros de autores.</div>
            ) : (
              topReportantes.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-[#324354] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {item.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-[#324354] truncate" title={item.nombre}>
                      {item.nombre}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-[#324354] rounded-full font-bold text-[10px] shrink-0">
                    {item.total} {item.total === 1 ? 'reporte' : 'reportes'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
