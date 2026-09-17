'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Layers,
  Wrench,
  ShieldAlert,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Technician {
  id: number;
  name: string;
  capacity: number;
  turno?: string;
  documento?: string;
  planta?: string;
  plantas?: string[];
  especialidad?: string;
  authorizedTitles?: string[];
  overloadMarginPercent?: number;
  activo?: boolean;
}

export interface MaintenanceTask {
  id: number;
  csvId?: string;
  code?: string;
  title: string;
  durationMinutes: number;
  durationHours: number;
  frecuencia: number;
  refFrecuencia: number;
  intervencion?: string;
  tipoIntervencion?: string;
  planta?: string;
  plantas?: string[];
  especialidad?: string;
  maquina?: string;
  codigoMaquina?: string | null;
  idMaquina?: number | null;
  idtecs?: number;
  errors: string[];
  isDue: boolean;
  adelantada?: boolean;
  status: 'Pendiente' | 'Completado' | 'Incompleto' | string;
  completedAt?: string;
  motivoIncompleto?: string;
  observaciones?: string;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
  detalle?: string;
  repuestos?: string[];
  isCorrectivo?: boolean;
}

export interface CorrectiveRecord {
  id: number | string;
  codigo: string;
  maquina: string;
  planta: string;
  origen?: string;
  sintoma: string;
  prioridad: 'Alta' | 'Media' | 'Baja' | string;
  tecnico_asignado?: string;
  estado: 'Abierta' | 'En Proceso' | 'Resuelta' | string;
  fecha_reporte: string;
  fecha_limite?: string | null;
  fecha_cierre?: string | null;
  accion_tomada?: string;
  fotos?: string[];
}

interface CalendarioSemanalPlannerProps {
  technicians: Technician[];
  tasks: MaintenanceTask[];
  correctiveRecords: CorrectiveRecord[];
  onUpdateTaskTech?: (taskId: number, newTechId: number) => void;
  onUpdateCorrectivoTech?: (correctivoId: number | string, newTechName: string, newTechId?: number | null) => void;
  onRefreshData?: () => void;
  onOpenAdvanceModal?: () => void;
  onOpenManualModal?: () => void;
}

// Modern harmonious color palettes per technician
const TECH_COLOR_PALETTES = [
  {
    bg: 'bg-purple-50/90 hover:bg-purple-100/90',
    border: 'border-purple-300',
    badgeBg: 'bg-purple-200/80 text-purple-900',
    text: 'text-purple-950',
    subText: 'text-purple-700',
    barFill: 'bg-purple-600',
    accent: '#8b5cf6',
    pill: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    border: 'border-emerald-300',
    badgeBg: 'bg-emerald-200/80 text-emerald-900',
    text: 'text-emerald-950',
    subText: 'text-emerald-700',
    barFill: 'bg-emerald-600',
    accent: '#10b981',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    bg: 'bg-amber-50/90 hover:bg-amber-100/90',
    border: 'border-amber-300',
    badgeBg: 'bg-amber-200/80 text-amber-900',
    text: 'text-amber-950',
    subText: 'text-amber-700',
    barFill: 'bg-amber-500',
    accent: '#f59e0b',
    pill: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    bg: 'bg-sky-50/90 hover:bg-sky-100/90',
    border: 'border-sky-300',
    badgeBg: 'bg-sky-200/80 text-sky-900',
    text: 'text-sky-950',
    subText: 'text-sky-700',
    barFill: 'bg-sky-600',
    accent: '#0284c7',
    pill: 'bg-sky-100 text-sky-800 border-sky-200'
  },
  {
    bg: 'bg-rose-50/90 hover:bg-rose-100/90',
    border: 'border-rose-300',
    badgeBg: 'bg-rose-200/80 text-rose-900',
    text: 'text-rose-950',
    subText: 'text-rose-700',
    barFill: 'bg-rose-600',
    accent: '#e11d48',
    pill: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
    border: 'border-indigo-300',
    badgeBg: 'bg-indigo-200/80 text-indigo-900',
    text: 'text-indigo-950',
    subText: 'text-indigo-700',
    barFill: 'bg-indigo-600',
    accent: '#4f46e5',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    bg: 'bg-teal-50/90 hover:bg-teal-100/90',
    border: 'border-teal-300',
    badgeBg: 'bg-teal-200/80 text-teal-900',
    text: 'text-teal-950',
    subText: 'text-teal-700',
    barFill: 'bg-teal-600',
    accent: '#0d9488',
    pill: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    bg: 'bg-orange-50/90 hover:bg-orange-100/90',
    border: 'border-orange-300',
    badgeBg: 'bg-orange-200/80 text-orange-900',
    text: 'text-orange-950',
    subText: 'text-orange-700',
    barFill: 'bg-orange-600',
    accent: '#ea580c',
    pill: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

export default function CalendarioSemanalPlanner({
  technicians,
  tasks,
  correctiveRecords,
  onUpdateTaskTech,
  onUpdateCorrectivoTech,
  onRefreshData,
  onOpenAdvanceModal,
  onOpenManualModal
}: CalendarioSemanalPlannerProps) {
  // Current Week Reference
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('todos');
  const [selectedPlantaFilter, setSelectedPlantaFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUnassignedTray, setShowUnassignedTray] = useState(true);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedTab, setUnassignedTab] = useState<'todos' | 'correctivos' | 'preventivos'>('todos');

  // Selected Block Detail Modal
  const [inspectModal, setInspectModal] = useState<{
    tech: Technician;
    date: Date;
    preventivos: MaintenanceTask[];
    correctivos: CorrectiveRecord[];
    totalHoras: number;
    pctCarga: number;
  } | null>(null);

  // Quick Assign Modal for Pending Task
  const [quickAssignTask, setQuickAssignTask] = useState<{
    item: any;
    type: 'preventivo' | 'correctivo';
  } | null>(null);

  // Calendar Scroll Ref
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 07:00 AM on mount
  useEffect(() => {
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop = 320;
    }
  }, []);

  // Helper string normalizer
  const normalize = (str?: string | null) => {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Calculate Week Days (Sunday to Saturday or Monday to Sunday)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay(); // 0 is Sunday
    // Set to Sunday of current week
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const fullDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isToday = d.toDateString() === new Date().toDateString();
      days.push({
        date: d,
        dayNumber: d.getDate(),
        monthName: d.toLocaleString('es-ES', { month: 'short' }),
        shortName: dayNames[i],
        fullName: fullDayNames[i],
        isToday,
        isoDate: d.toISOString().slice(0, 10)
      });
    }
    return days;
  }, [currentDate]);

  // Week Title Range (e.g. "13–19 de Septiembre de 2026")
  const weekRangeTitle = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    const month = first.toLocaleString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = first.getFullYear();
    return `${first.getDate()} – ${last.getDate()} de ${capitalizedMonth} de ${year}`;
  }, [weekDays]);

  // Navigate Weeks
  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Color Mapping Helper for Technicians
  const getTechColor = (techIndex: number) => {
    return TECH_COLOR_PALETTES[techIndex % TECH_COLOR_PALETTES.length];
  };

  // Filter Active Technicians with Multipurpose Search Support
  const activeTechnicians = useMemo(() => {
    const q = normalize(searchQuery);

    return technicians.filter(t => {
      if (t.id === 9999 || t.activo === false) return false;
      if (selectedTechFilter !== 'todos' && t.name !== selectedTechFilter) return false;
      if (selectedPlantaFilter !== 'todas' && t.planta && !t.planta.toLowerCase().includes(selectedPlantaFilter.toLowerCase())) return false;
      
      if (!q) return true;

      // 1. Match tech profile
      const matchTechName = normalize(t.name).includes(q);
      const matchTechDoc = normalize(t.documento).includes(q);
      const matchTechPlanta = normalize(t.planta).includes(q) || (t.plantas || []).some(p => normalize(p).includes(q));
      const matchTurno = normalize(t.turno).includes(q);
      if (matchTechName || matchTechDoc || matchTechPlanta || matchTurno) return true;

      // 2. Match any assigned task (code, order, machine, title, plant, instructions)
      const techTasks = tasks.filter(task => task.idtecs === t.id);
      const matchTask = techTasks.some(task => 
        normalize(task.code).includes(q) ||
        normalize(task.csvId).includes(q) ||
        normalize(task.title).includes(q) ||
        normalize(task.maquina).includes(q) ||
        normalize(task.codigoMaquina).includes(q) ||
        normalize(task.planta).includes(q) ||
        normalize(task.detalle).includes(q)
      );
      if (matchTask) return true;

      // 3. Match any assigned corrective record
      const techCorr = correctiveRecords.filter(c => c.tecnico_asignado === t.name);
      const matchCorr = techCorr.some(c =>
        normalize(c.codigo).includes(q) ||
        normalize(c.sintoma).includes(q) ||
        normalize(c.maquina).includes(q) ||
        normalize(c.planta).includes(q) ||
        normalize(c.accion_tomada).includes(q)
      );
      return matchCorr;
    });
  }, [technicians, selectedTechFilter, selectedPlantaFilter, searchQuery, tasks, correctiveRecords]);

  // Unassigned Pending Tasks Tray
  const pendingTasksList = useMemo(() => {
    // 1. Unassigned correctivos
    const unassignedCorrectivos = correctiveRecords.filter(c => {
      const isUnassigned = !c.tecnico_asignado || c.tecnico_asignado === 'Sin asignar' || c.tecnico_asignado === 'Por asignar';
      return isUnassigned && c.estado !== 'Resuelta';
    });

    // 2. Unassigned preventivos
    const unassignedPreventivos = tasks.filter(t => {
      return (t.idtecs === 9999 || !t.idtecs) && t.status !== 'Completado';
    });

    return {
      correctivos: unassignedCorrectivos,
      preventivos: unassignedPreventivos,
      total: unassignedCorrectivos.length + unassignedPreventivos.length
    };
  }, [correctiveRecords, tasks]);

  // Filtered Pending Tasks for Bottom Tray
  const filteredPendingTray = useMemo(() => {
    let list: Array<{
      id: string | number;
      codigo: string;
      title: string;
      type: 'preventivo' | 'correctivo';
      planta: string;
      maquina: string;
      durationHours: number;
      prioridad?: string;
      isTpm?: boolean;
      raw: any;
    }> = [];

    if (unassignedTab === 'todos' || unassignedTab === 'correctivos') {
      pendingTasksList.correctivos.forEach(c => {
        const isTpm = c.origen === 'Tarjeta TPM' || c.codigo.startsWith('TPM-');
        list.push({
          id: c.id,
          codigo: c.codigo,
          title: c.sintoma,
          type: 'correctivo',
          planta: c.planta,
          maquina: c.maquina,
          durationHours: 1.0,
          prioridad: c.prioridad,
          isTpm,
          raw: c
        });
      });
    }

    if (unassignedTab === 'todos' || unassignedTab === 'preventivos') {
      pendingTasksList.preventivos.forEach(p => {
        list.push({
          id: p.id,
          codigo: p.code || `MP-${p.id}`,
          title: p.title,
          type: 'preventivo',
          planta: p.planta || 'MS',
          maquina: p.maquina || 'General',
          durationHours: p.durationHours || 1.0,
          prioridad: 'Media',
          isTpm: false,
          raw: p
        });
      });
    }

    if (unassignedSearch.trim()) {
      const q = unassignedSearch.toLowerCase();
      list = list.filter(item => 
        item.codigo.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.maquina.toLowerCase().includes(q) ||
        item.planta.toLowerCase().includes(q)
      );
    }

    return list;
  }, [pendingTasksList, unassignedTab, unassignedSearch]);

  // Technician Block Calculation for a specific Day and Technician (with Multipurpose Search filter)
  const getTechDayBlockData = (tech: Technician, dayIsoDate: string, isToday: boolean) => {
    const q = normalize(searchQuery);

    let assignedPreventivos = tasks.filter(t => {
      const matchTech = t.idtecs === tech.id;
      if (!matchTech) return false;
      if (isToday) return true;
      return t.isDue || t.status === 'Incompleto';
    });

    let assignedCorrectivos = correctiveRecords.filter(c => {
      const matchName = c.tecnico_asignado === tech.name;
      if (!matchName) return false;
      if (isToday) return c.estado !== 'Resuelta';
      return c.estado === 'En Proceso' || c.estado === 'Abierta';
    });

    // If multipurpose search query is present, filter down to matched items unless tech itself is matched
    if (q) {
      const techMatchedDirectly = normalize(tech.name).includes(q) || normalize(tech.documento).includes(q);
      if (!techMatchedDirectly) {
        assignedPreventivos = assignedPreventivos.filter(task => 
          normalize(task.code).includes(q) ||
          normalize(task.csvId).includes(q) ||
          normalize(task.title).includes(q) ||
          normalize(task.maquina).includes(q) ||
          normalize(task.codigoMaquina).includes(q) ||
          normalize(task.planta).includes(q) ||
          normalize(task.detalle).includes(q)
        );
        assignedCorrectivos = assignedCorrectivos.filter(c =>
          normalize(c.codigo).includes(q) ||
          normalize(c.sintoma).includes(q) ||
          normalize(c.maquina).includes(q) ||
          normalize(c.planta).includes(q) ||
          normalize(c.accion_tomada).includes(q)
        );
      }
    }

    const preventivosHours = assignedPreventivos.reduce((acc, t) => acc + (t.durationHours || 1), 0);
    const correctivosHours = assignedCorrectivos.length * 1.0;
    const totalHoras = Number((preventivosHours + correctivosHours).toFixed(1));

    const capacityBase = tech.capacity || 7.2;
    const pctCarga = Math.round((totalHoras / capacityBase) * 100);

    return {
      preventivos: assignedPreventivos,
      correctivos: assignedCorrectivos,
      totalCount: assignedPreventivos.length + assignedCorrectivos.length,
      prevCount: assignedPreventivos.length,
      corrCount: assignedCorrectivos.length,
      totalHoras,
      capacityBase,
      pctCarga
    };
  };

  // Determine standard shift hours start for visual placement
  const getShiftHourStart = (turno?: string) => {
    const t = (turno || '').toLowerCase();
    if (t.includes('noche') || t.includes('t3')) return 22;
    if (t.includes('tarde') || t.includes('t2')) return 14;
    return 7;
  };

  // 24 Hours Array (0 to 23)
  const hours24 = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour} ${ampm}`;
      const time24 = `${hour.toString().padStart(2, '0')}:00`;
      return { hour, label, time24 };
    });
  }, []);

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-300">
      
      {/* Top Header & Multipurpose Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e2ded5] shadow-xs flex flex-col gap-2.5">
        
        {/* Navigation & Multipurpose Search Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          
          {/* Left: Week Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center bg-[#F6F3EE] p-0.5 rounded-xl border border-[#e2ded5]">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 bg-white text-[#324354] hover:bg-gray-100 font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer"
              >
                Hoy
              </button>
              <div className="flex items-center ml-0.5">
                <button
                  onClick={handlePrevWeek}
                  className="p-1 hover:bg-white text-[#324354] rounded-md transition-all cursor-pointer"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1 hover:bg-white text-[#324354] rounded-md transition-all cursor-pointer"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Week Title Range */}
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#324354]" />
              <h2 className="text-xs sm:text-sm font-bold text-[#324354] tracking-tight">
                {weekRangeTitle}
              </h2>
            </div>
          </div>

          {/* Right: Multipurpose Search & Technician Dropdown */}
          <div className="flex items-center gap-2.5 flex-1 justify-end max-w-xl">
            {/* Multipurpose Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por técnico, orden, máquina, título o planta..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs text-[#324354] placeholder-gray-400 focus:outline-none focus:border-[#324354] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Technician */}
            <div className="w-[180px] shrink-0">
              <select
                value={selectedTechFilter}
                onChange={(e) => setSelectedTechFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los Técnicos ({technicians.filter(t => t.id !== 9999).length})</option>
                {technicians
                  .filter(t => t.id !== 9999)
                  .map(t => (
                    <option key={t.id} value={t.name}>
                      👤 {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* 24/7 WEEKLY CALENDAR GRID (COMPACT ULTRA-READABLE LAYOUT) */}
      <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-xs overflow-hidden flex flex-col">
        
        {/* Days of Week Header (Sticky Top - Compact) */}
        <div className="grid grid-cols-[55px_repeat(7,1fr)] bg-[#324354] text-white sticky top-0 z-30 border-b border-gray-300">
          {/* Hour Corner Box */}
          <div className="py-1.5 px-1 text-center text-[9px] font-bold text-gray-300 border-r border-slate-600/50 flex flex-col items-center justify-center">
            <Clock className="w-3 h-3 mb-0.5 opacity-80" />
            <span>24H</span>
          </div>

          {/* 7 Day Columns Header */}
          {weekDays.map(day => (
            <div
              key={day.isoDate}
              className={`py-1.5 px-1 text-center border-r border-slate-600/40 last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                day.isToday ? 'bg-[#405467]' : ''
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-gray-300">
                  {day.shortName}
                </span>
                <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${
                  day.isToday ? 'bg-emerald-500 text-white shadow-xs' : 'text-white'
                }`}>
                  {day.dayNumber}
                </span>
                <span className="text-[9px] text-gray-300 font-medium">
                  {day.monthName}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 24-Hour Scrollable Body Area (Compact Row Heights) */}
        <div 
          ref={calendarScrollRef}
          className="overflow-y-auto max-h-[600px] relative divide-y divide-gray-100"
        >
          {hours24.map(h => (
            <div
              key={h.hour}
              className="grid grid-cols-[55px_repeat(7,1fr)] min-h-[46px] relative group hover:bg-slate-50/50 transition-colors"
            >
              {/* Hour Label on Left */}
              <div className="py-1 px-1 text-center text-[10px] font-bold text-gray-400 border-r border-[#e2ded5] bg-[#F6F3EE]/40 flex flex-col items-center justify-center select-none">
                <span className="leading-tight">{h.label}</span>
                <span className="text-[8.5px] text-gray-400 font-normal leading-tight">{h.time24}</span>
              </div>

              {/* 7 Days Grid Cells for this Hour */}
              {weekDays.map(day => {
                // Determine which technicians have their consolidated shift block starting at this hour
                const matchingTechs = activeTechnicians.filter(t => {
                  const startHour = getShiftHourStart(t.turno);
                  return startHour === h.hour;
                });

                return (
                  <div
                    key={`${day.isoDate}-${h.hour}`}
                    className={`p-0.5 border-r border-[#e2ded5] last:border-r-0 relative flex flex-col gap-1 transition-colors ${
                      day.isToday ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    {/* Render Consolidated Technician Blocks (Compact) */}
                    {matchingTechs.map((tech, techIdx) => {
                      const palette = getTechColor(techIdx);
                      const blockData = getTechDayBlockData(tech, day.isoDate, day.isToday);

                      return (
                        <div
                          key={tech.id}
                          onClick={() => setInspectModal({
                            tech,
                            date: day.date,
                            preventivos: blockData.preventivos,
                            correctivos: blockData.correctivos,
                            totalHoras: blockData.totalHoras,
                            pctCarga: blockData.pctCarga
                          })}
                          className={`rounded-xl p-1.5 border shadow-2xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${palette.bg} ${palette.border} relative group/block flex flex-col gap-0.5`}
                        >
                          {/* Tech Name + Turno Chip */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <div
                                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
                                style={{ backgroundColor: palette.accent }}
                              >
                                {tech.name.charAt(0)}
                              </div>
                              <span className={`text-[10px] font-bold truncate leading-tight ${palette.text}`}>
                                {tech.name}
                              </span>
                            </div>
                            <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-white/90 border border-gray-200 text-gray-600 flex-shrink-0 leading-tight">
                              {tech.turno || 'Gen'}
                            </span>
                          </div>

                          {/* Metrics Line: Prev & Corr Count */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {blockData.prevCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100/90 text-blue-900 border border-blue-200 leading-tight">
                                <span>🔧 {blockData.prevCount}</span>
                              </span>
                            )}
                            {blockData.corrCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100/90 text-rose-900 border border-rose-200 leading-tight">
                                <span>🚨 {blockData.corrCount}</span>
                              </span>
                            )}
                            {blockData.totalCount === 0 && (
                              <span className="text-[8.5px] text-gray-400 italic leading-tight">
                                0 tareas
                              </span>
                            )}
                          </div>

                          {/* Capacity Load Bar */}
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <div className="flex items-center justify-between text-[8.5px] font-bold">
                              <span className={`${palette.subText} text-[8px]`}>Carga:</span>
                              <span className={`px-1 py-0.2 rounded text-[8.5px] leading-tight ${
                                blockData.pctCarga > 105
                                  ? 'bg-rose-600 text-white font-black'
                                  : blockData.pctCarga >= 85
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {blockData.pctCarga}% ({blockData.totalHoras}h/{blockData.capacityBase}h)
                              </span>
                            </div>

                            <div className="w-full bg-white/90 rounded-full h-1 overflow-hidden border border-gray-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  blockData.pctCarga > 105
                                    ? 'bg-rose-600'
                                    : blockData.pctCarga >= 85
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(blockData.pctCarga, 100)}%` }}
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM TRAY: TAREAS PENDIENTES POR ASIGNAR (POOL) */}
      <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-xs overflow-hidden transition-all">
        
        {/* Tray Header */}
        <div 
          onClick={() => setShowUnassignedTray(!showUnassignedTray)}
          className="p-4 bg-gradient-to-r from-[#324354] to-[#405467] text-white flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Bandeja de Tareas Pendientes por Asignar (Pool de Mantenimiento)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs">
                  {pendingTasksList.total} pendientes
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                Preventivos en espera y órdenes correctivas / Tarjetas TPM listas para programar en el calendario.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              {showUnassignedTray ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tray Body Content */}
        {showUnassignedTray && (
          <div className="p-4 flex flex-col gap-4 bg-[#F6F3EE]/30">
            
            {/* Filter Toolbar for Tray */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setUnassignedTab('todos')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    unassignedTab === 'todos'
                      ? 'bg-[#324354] text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#e2ded5]'
                  }`}
                >
                  Todos ({pendingTasksList.total})
                </button>
                <button
                  onClick={() => setUnassignedTab('correctivos')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    unassignedTab === 'correctivos'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
                  }`}
                >
                  🚨 Correctivos & TPM ({pendingTasksList.correctivos.length})
                </button>
                <button
                  onClick={() => setUnassignedTab('preventivos')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    unassignedTab === 'preventivos'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
                  }`}
                >
                  🔧 Preventivos ({pendingTasksList.preventivos.length})
                </button>
              </div>

              {/* Search in Pending */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  placeholder="Buscar por equipo, código..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
                />
              </div>
            </div>

            {/* Grid of Pending Tasks Cards */}
            {filteredPendingTray.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 font-medium">
                🎉 No hay tareas pendientes de asignación en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1">
                {filteredPendingTray.map(item => (
                  <div
                    key={`${item.type}_${item.id}`}
                    className="bg-white rounded-2xl p-3.5 border border-[#e2ded5] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                          item.isTpm
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : item.type === 'correctivo'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {item.codigo}
                        </span>

                        <span className="text-[10px] text-gray-500 font-semibold">
                          ⏱️ {item.durationHours}h
                        </span>
                      </div>

                      {/* Title & Machine */}
                      <h4 className="text-xs font-bold text-[#324354] line-clamp-2" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 truncate">
                        <span>🏭 {item.planta}</span>
                        <span>•</span>
                        <span className="truncate">{item.maquina}</span>
                      </div>
                    </div>

                    {/* Quick Assign Dropdown */}
                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        Asignar Responsable:
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const selectedT = technicians.find(t => t.name === val || t.id.toString() === val);
                          if (selectedT) {
                            if (item.type === 'correctivo' && onUpdateCorrectivoTech) {
                              onUpdateCorrectivoTech(item.id, selectedT.name, selectedT.id);
                            } else if (item.type === 'preventivo' && onUpdateTaskTech) {
                              onUpdateTaskTech(typeof item.id === 'number' ? item.id : parseInt(item.id), selectedT.id);
                            }
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#F6F3EE] hover:bg-gray-100 rounded-xl border border-[#e2ded5] text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>Seleccionar Técnico...</option>
                        {technicians
                          .filter(t => t.id !== 9999)
                          .map(t => (
                            <option key={t.id} value={t.name}>
                              👤 {t.name} ({t.turno || 'General'})
                            </option>
                          ))}
                      </select>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* INSPECT / DETAIL MODAL FOR A TECHNICIAN DAY BLOCK */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-[#e2ded5] shadow-2xl p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#e2ded5] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#324354] text-white flex items-center justify-center font-bold">
                  {inspectModal.tech.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#324354]">
                    {inspectModal.tech.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {inspectModal.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {' '}• Turno: {inspectModal.tech.turno || 'General'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Load Capacity Summary */}
            <div className="bg-[#F6F3EE] rounded-2xl p-4 border border-[#e2ded5] mb-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carga de Trabajo Asignada</div>
                <div className="text-xl font-bold text-[#324354] mt-0.5">
                  {inspectModal.totalHoras} Horas / {inspectModal.tech.capacity} Horas Base
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  inspectModal.pctCarga > 105
                    ? 'bg-rose-600 text-white'
                    : inspectModal.pctCarga >= 85
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}>
                  {inspectModal.pctCarga}% de Ocupación
                </span>
              </div>
            </div>

            {/* Breakdown: Preventivos & Correctivos */}
            <div className="flex flex-col gap-4">
              
              {/* Correctivos & TPM Section */}
              {inspectModal.correctivos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🚨 Mantenimientos Correctivos / TPM ({inspectModal.correctivos.length})</span>
                  </h4>
                  <div className="divide-y divide-gray-100 border border-rose-200 rounded-2xl overflow-hidden bg-rose-50/20">
                    {inspectModal.correctivos.map(c => (
                      <div key={c.id} className="p-3 hover:bg-white transition-colors flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-100 text-rose-900">
                              {c.codigo}
                            </span>
                            <span className="text-[11px] font-bold text-gray-700">{c.maquina}</span>
                            <span className="text-[10px] text-gray-400">({c.planta})</span>
                          </div>
                          <p className="text-xs font-medium text-[#324354]">{c.sintoma}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.estado === 'Resuelta' ? 'bg-emerald-100 text-emerald-800' :
                          c.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {c.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preventivos Section */}
              {inspectModal.preventivos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🔧 Mantenimientos Preventivos PMP ({inspectModal.preventivos.length})</span>
                  </h4>
                  <div className="divide-y divide-gray-100 border border-blue-200 rounded-2xl overflow-hidden bg-blue-50/20 max-h-60 overflow-y-auto">
                    {inspectModal.preventivos.map(p => (
                      <div key={p.id} className="p-3 hover:bg-white transition-colors flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-100 text-blue-900">
                              {p.code || `#MP-${p.id}`}
                            </span>
                            <span className="text-[11px] font-bold text-gray-700">{p.maquina}</span>
                            <span className="text-[10px] text-gray-400">({p.planta})</span>
                          </div>
                          <p className="text-xs font-medium text-[#324354]">{p.title}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                          ⏱️ {p.durationHours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspectModal.preventivos.length === 0 && inspectModal.correctivos.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  No hay órdenes programadas para este técnico en la fecha seleccionada.
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-4 border-t border-[#e2ded5] flex items-center justify-end">
              <button
                onClick={() => setInspectModal(null)}
                className="px-4 py-2 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#324354]/90 transition-all cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
