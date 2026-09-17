'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Briefcase,
  CalendarDays,
  ChevronsUpDown,
  User,
  ExternalLink
} from 'lucide-react';

export interface Technician {
  id: number;
  name: string;
  capacity: number;
  turno: string;
  documento?: string;
  planta?: string;
  plantas?: string[];
  especialidad?: string;
  authorizedTitles: string[];
  overloadMarginPercent?: number;
  activo?: boolean;
}

export interface MaintenanceTask {
  id: number;
  csvId: string;
  code: string;
  title: string;
  durationMinutes: number;
  durationHours: number;
  idtecs: number;
  idtecsCandidates: number[];
  tipoIntervencion: string;
  techTurno?: string;
  frecuencia: number;
  refFrecuencia: number;
  errors: string[];
  adelantada: boolean;
  isDue: boolean;
  detalle: string;
  maquina: string;
  codigoMaquina?: string | null;
  idMaquina?: number | null;
  planta: string;
  plantas?: string[];
  especialidad?: string;
  status: 'Pendiente' | 'Incompleto' | 'Completado' | string;
  observations?: string;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
  activo?: boolean;
}

export interface CorrectiveRecord {
  id: number | string;
  codigo: string;
  maquina: string;
  planta: string;
  origen?: string;
  sintoma: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  tecnico_asignado?: string;
  estado: 'Abierta' | 'En Proceso' | 'Resuelta' | string;
  fecha_reporte: string;
  fecha_limite?: string | null;
  fecha_cierre?: string | null;
  accion_tomada?: string;
  fotos?: string[];
}

interface PlannerTecnicosColumnasProps {
  technicians: Technician[];
  tasks: MaintenanceTask[];
  correctiveRecords: CorrectiveRecord[];
  onUpdateTaskTech: (taskId: number, newTechId: number) => void;
  onUpdateCorrectivoTech: (correctivoId: number | string, newTechName: string, newTechId?: number | null) => void;
  onRefreshData?: () => void;
  syncing?: boolean;
  onOpenPortalForTech?: (techId: number) => void;
}

export type TaskTimeCategory = 'atrasadas' | 'hoy' | 'proximas';

export interface EnrichedTaskCardData {
  uniqueKey: string;
  tipo: 'preventivo' | 'correctivo';
  item: MaintenanceTask | CorrectiveRecord;
  category: TaskTimeCategory;
  rawTimestamp: number;
  dateLabel: string;
  dateStatus: 'overdue' | 'today' | 'upcoming';
  code: string;
  cleanCode: string;
  title: string;
  maquina?: string;
  planta?: string;
  durationHours: number;
  prioridad?: 'Alta' | 'Media' | 'Baja';
  currentTechId?: number;
}

// Tech color palette for column headers
const TECH_HEADER_PALETTES = [
  { border: 'border-purple-200', bg: 'bg-purple-50/90', badge: 'bg-purple-600 text-white', lightBadge: 'bg-purple-100 text-purple-800 border-purple-200', text: 'text-purple-950' },
  { border: 'border-emerald-200', bg: 'bg-emerald-50/90', badge: 'bg-emerald-600 text-white', lightBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'text-emerald-950' },
  { border: 'border-amber-200', bg: 'bg-amber-50/90', badge: 'bg-amber-500 text-white', lightBadge: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-950' },
  { border: 'border-rose-200', bg: 'bg-rose-50/90', badge: 'bg-rose-600 text-white', lightBadge: 'bg-rose-100 text-rose-800 border-rose-200', text: 'text-rose-950' },
  { border: 'border-cyan-200', bg: 'bg-cyan-50/90', badge: 'bg-cyan-600 text-white', lightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200', text: 'text-cyan-950' },
  { border: 'border-indigo-200', bg: 'bg-indigo-50/90', badge: 'bg-indigo-600 text-white', lightBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'text-indigo-950' },
  { border: 'border-teal-200', bg: 'bg-teal-50/90', badge: 'bg-teal-600 text-white', lightBadge: 'bg-teal-100 text-teal-800 border-teal-200', text: 'text-teal-950' },
  { border: 'border-blue-200', bg: 'bg-blue-50/90', badge: 'bg-blue-600 text-white', lightBadge: 'bg-blue-100 text-blue-800 border-blue-200', text: 'text-blue-950' },
];

export default function PlannerTecnicosColumnas({
  technicians,
  tasks,
  correctiveRecords,
  onUpdateTaskTech,
  onUpdateCorrectivoTech,
  onOpenPortalForTech,
}: PlannerTecnicosColumnasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [animatingCardId, setAnimatingCardId] = useState<string | number | null>(null);
  const [sectionsOpenState, setSectionsOpenState] = useState<Record<string, boolean>>({});
  const [areAllOpen, setAreAllOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<{
    tipo: 'preventivo' | 'correctivo';
    item: MaintenanceTask | CorrectiveRecord;
  } | null>(null);

  // Normalize helper
  const normalize = (text?: string | null) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // All valid technicians (excluding super-tech pool 9999)
  const allValidTechs = useMemo(() => {
    return technicians.filter(t => t.id !== 9999);
  }, [technicians]);

  // Global Expand / Collapse All Accordions
  const toggleAllSections = () => {
    const nextState = !areAllOpen;
    setAreAllOpen(nextState);
    const newMap: Record<string, boolean> = {};
    ['unassigned', ...allValidTechs.map(t => `tech-${t.id}`)].forEach(prefix => {
      ['atrasadas', 'hoy', 'proximas'].forEach(cat => {
        newMap[`${prefix}-${cat}`] = nextState;
      });
    });
    setSectionsOpenState(newMap);
  };

  const isSectionOpen = (sectionKey: string) => {
    return sectionsOpenState[sectionKey] !== undefined ? sectionsOpenState[sectionKey] : areAllOpen;
  };

  const toggleSection = (sectionKey: string) => {
    setSectionsOpenState(prev => {
      const current = prev[sectionKey] !== undefined ? prev[sectionKey] : areAllOpen;
      return { ...prev, [sectionKey]: !current };
    });
  };

  // Text search matcher
  const matchesSearch = (item: {
    code?: string;
    title?: string;
    maquina?: string;
    planta?: string;
    sintoma?: string;
    tecnico?: string;
  }) => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);
    return (
      normalize(item.code).includes(q) ||
      normalize(item.title).includes(q) ||
      normalize(item.maquina).includes(q) ||
      normalize(item.planta).includes(q) ||
      normalize(item.sintoma).includes(q) ||
      normalize(item.tecnico).includes(q)
    );
  };

  // Helper: Categorize tasks into Atrasadas, Hoy, Próximas with timestamps for sorting
  const categorizeTask = (task: MaintenanceTask): { category: TaskTimeCategory; dateLabel: string; dateStatus: 'overdue' | 'today' | 'upcoming'; rawTimestamp: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (task.fechaApertura) {
      const taskDate = new Date(task.fechaApertura);
      taskDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const dayNum = taskDate.getDate();
      const monthStr = taskDate.toLocaleDateString('es-ES', { month: 'short' });
      const formattedDate = `${dayNum} ${monthStr}`;

      if (diffDays < 0) {
        return { category: 'atrasadas', dateLabel: formattedDate, dateStatus: 'overdue', rawTimestamp: taskDate.getTime() };
      }
      if (diffDays === 0) {
        return { category: 'hoy', dateLabel: 'Hoy', dateStatus: 'today', rawTimestamp: taskDate.getTime() };
      }
      return { category: 'proximas', dateLabel: formattedDate, dateStatus: 'upcoming', rawTimestamp: taskDate.getTime() };
    }

    const ref = task.refFrecuencia || 0;
    const freq = task.frecuencia || 1;

    if (ref > freq) {
      const daysOverdue = ref - freq;
      const overdueDate = new Date(today);
      overdueDate.setDate(today.getDate() - daysOverdue);
      const dayNum = overdueDate.getDate();
      const monthStr = overdueDate.toLocaleDateString('es-ES', { month: 'short' });
      return {
        category: 'atrasadas',
        dateLabel: `${dayNum} ${monthStr}`,
        dateStatus: 'overdue',
        rawTimestamp: overdueDate.getTime()
      };
    }

    if (ref === freq || task.isDue) {
      return {
        category: 'hoy',
        dateLabel: 'Hoy',
        dateStatus: 'today',
        rawTimestamp: today.getTime()
      };
    }

    const daysRemaining = Math.max(1, freq - ref);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysRemaining);
    const dayNum = futureDate.getDate();
    const monthStr = futureDate.toLocaleDateString('es-ES', { month: 'short' });
    return {
      category: 'proximas',
      dateLabel: `${dayNum} ${monthStr}`,
      dateStatus: 'upcoming',
      rawTimestamp: futureDate.getTime()
    };
  };

  const categorizeCorrectivo = (corr: CorrectiveRecord): { category: TaskTimeCategory; dateLabel: string; dateStatus: 'overdue' | 'today' | 'upcoming'; rawTimestamp: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const refDateStr = corr.fecha_limite || corr.fecha_reporte;
    if (refDateStr) {
      const corrDate = new Date(refDateStr);
      corrDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((corrDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const dayNum = corrDate.getDate();
      const monthStr = corrDate.toLocaleDateString('es-ES', { month: 'short' });
      const formattedDate = `${dayNum} ${monthStr}`;

      if (diffDays < 0) {
        return { category: 'atrasadas', dateLabel: formattedDate, dateStatus: 'overdue', rawTimestamp: corrDate.getTime() };
      }
      if (diffDays === 0) {
        return { category: 'hoy', dateLabel: 'Hoy', dateStatus: 'today', rawTimestamp: corrDate.getTime() };
      }
      return { category: 'proximas', dateLabel: formattedDate, dateStatus: 'upcoming', rawTimestamp: corrDate.getTime() };
    }

    return { category: 'hoy', dateLabel: 'Hoy', dateStatus: 'today', rawTimestamp: today.getTime() };
  };

  // 1. Group Unassigned / Pool Column Items
  const unassignedData = useMemo(() => {
    const unassignedItems: EnrichedTaskCardData[] = [];

    // Preventives
    tasks.forEach(t => {
      const isUnassigned = t.idtecs === 9999 || !technicians.some(tech => tech.id === t.idtecs);
      if (!isUnassigned) return;
      if (!matchesSearch({ code: t.code || t.csvId, title: t.title, maquina: t.maquina, planta: t.planta })) return;

      const { category, dateLabel, dateStatus, rawTimestamp } = categorizeTask(t);
      const codeStr = t.code || t.csvId || `MP-${t.id}`;
      const cleanCode = codeStr.replace(/^\[+|\]+$/g, '').trim();
      const cleanDuration = Math.round((t.durationHours || 0.5) * 10) / 10;

      unassignedItems.push({
        uniqueKey: `prev-${t.id}`,
        tipo: 'preventivo',
        item: t,
        category,
        rawTimestamp,
        dateLabel,
        dateStatus,
        code: codeStr,
        cleanCode,
        title: t.title,
        maquina: t.maquina,
        planta: t.planta,
        durationHours: cleanDuration,
        currentTechId: t.idtecs,
      });
    });

    // Correctives
    correctiveRecords.forEach(c => {
      if (c.estado === 'Resuelta') return;
      const isUnassigned = !c.tecnico_asignado || c.tecnico_asignado === 'Sin asignar' || c.tecnico_asignado === 'Por asignar';
      if (!isUnassigned) return;
      if (!matchesSearch({ code: c.codigo, sintoma: c.sintoma, maquina: c.maquina, planta: c.planta })) return;

      const { category, dateLabel, dateStatus, rawTimestamp } = categorizeCorrectivo(c);
      const codeStr = c.codigo || `CORR-${c.id}`;
      const cleanCode = codeStr.replace(/^\[+|\]+$/g, '').trim();

      unassignedItems.push({
        uniqueKey: `corr-${c.id}`,
        tipo: 'correctivo',
        item: c,
        category,
        rawTimestamp,
        dateLabel,
        dateStatus,
        code: codeStr,
        cleanCode,
        title: c.sintoma,
        maquina: c.maquina,
        planta: c.planta,
        durationHours: 1.0,
        prioridad: c.prioridad,
        currentTechId: 9999,
      });
    });

    // Sort chronologically (oldest / earliest date first)
    const atrasadas = unassignedItems
      .filter(i => i.category === 'atrasadas')
      .sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    const hoy = unassignedItems
      .filter(i => i.category === 'hoy')
      .sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    const proximas = unassignedItems
      .filter(i => i.category === 'proximas')
      .sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    const totalHours = unassignedItems.reduce((sum, i) => sum + i.durationHours, 0);

    return {
      all: unassignedItems,
      atrasadas,
      hoy,
      proximas,
      totalCount: unassignedItems.length,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [tasks, correctiveRecords, searchQuery, technicians]);

  // 2. Group Each Technician Column Items & Sort: Active by Atrasadas Descending, Inactive at the very end
  const techColumnsData = useMemo(() => {
    const mapped = allValidTechs.map((tech, index) => {
      const isInactive = tech.activo === false || tech.turno === 'INACTIVO';
      const palette = isInactive
        ? { border: 'border-slate-300', bg: 'bg-slate-100/90', badge: 'bg-slate-500 text-white', lightBadge: 'bg-slate-200 text-slate-700 border-slate-300', text: 'text-slate-800' }
        : TECH_HEADER_PALETTES[index % TECH_HEADER_PALETTES.length];

      const techItems: EnrichedTaskCardData[] = [];

      // Preventives assigned to this tech
      tasks.forEach(t => {
        if (t.idtecs !== tech.id) return;
        if (!matchesSearch({ code: t.code || t.csvId, title: t.title, maquina: t.maquina, planta: t.planta, tecnico: tech.name })) return;

        const { category, dateLabel, dateStatus, rawTimestamp } = categorizeTask(t);
        const codeStr = t.code || t.csvId || `MP-${t.id}`;
        const cleanCode = codeStr.replace(/^\[+|\]+$/g, '').trim();
        const cleanDuration = Math.round((t.durationHours || 0.5) * 10) / 10;

        techItems.push({
          uniqueKey: `prev-${t.id}`,
          tipo: 'preventivo',
          item: t,
          category,
          rawTimestamp,
          dateLabel,
          dateStatus,
          code: codeStr,
          cleanCode,
          title: t.title,
          maquina: t.maquina,
          planta: t.planta,
          durationHours: cleanDuration,
          currentTechId: t.idtecs,
        });
      });

      // Correctives assigned to this tech
      correctiveRecords.forEach(c => {
        if (c.estado === 'Resuelta') return;
        if (!c.tecnico_asignado) return;
        const matchesName =
          normalize(c.tecnico_asignado) === normalize(tech.name) ||
          normalize(c.tecnico_asignado).includes(normalize(tech.name)) ||
          normalize(tech.name).includes(normalize(c.tecnico_asignado));
        if (!matchesName) return;
        if (!matchesSearch({ code: c.codigo, sintoma: c.sintoma, maquina: c.maquina, planta: c.planta, tecnico: tech.name })) return;

        const { category, dateLabel, dateStatus, rawTimestamp } = categorizeCorrectivo(c);
        const codeStr = c.codigo || `CORR-${c.id}`;
        const cleanCode = codeStr.replace(/^\[+|\]+$/g, '').trim();

        techItems.push({
          uniqueKey: `corr-${c.id}`,
          tipo: 'correctivo',
          item: c,
          category,
          rawTimestamp,
          dateLabel,
          dateStatus,
          code: codeStr,
          cleanCode,
          title: c.sintoma,
          maquina: c.maquina,
          planta: c.planta,
          durationHours: 1.0,
          prioridad: c.prioridad,
          currentTechId: tech.id,
        });
      });

      // Sort chronologically (oldest / earliest date first across all sub-categories)
      const atrasadas = techItems
        .filter(i => i.category === 'atrasadas')
        .sort((a, b) => a.rawTimestamp - b.rawTimestamp);
      const hoy = techItems
        .filter(i => i.category === 'hoy')
        .sort((a, b) => a.rawTimestamp - b.rawTimestamp);
      const proximas = techItems
        .filter(i => i.category === 'proximas')
        .sort((a, b) => a.rawTimestamp - b.rawTimestamp);

      const prevCount = techItems.filter(i => i.tipo === 'preventivo').length;
      const corrCount = techItems.filter(i => i.tipo === 'correctivo').length;

      // Carga del día: se calcula ÚNICAMENTE con las órdenes asignadas a "Hoy"
      const activeWorkloadHours = hoy.reduce((sum, i) => sum + i.durationHours, 0);
      const totalHoras = Math.round(activeWorkloadHours * 10) / 10;
      const capacityBase = tech.capacity || 7.2;
      const pctCarga = Math.round((totalHoras / capacityBase) * 100);

      return {
        tech,
        palette,
        isInactive,
        all: techItems,
        atrasadas,
        hoy,
        proximas,
        prevCount,
        corrCount,
        totalCount: techItems.length,
        totalHoras,
        capacityBase,
        pctCarga,
      };
    });

    // Sort: Active technicians first (by most atrasadas descending, then totalCount desc), Inactive at the very end
    return mapped.sort((a, b) => {
      if (a.isInactive !== b.isInactive) {
        return a.isInactive ? 1 : -1;
      }
      if (b.atrasadas.length !== a.atrasadas.length) {
        return b.atrasadas.length - a.atrasadas.length;
      }
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return a.tech.name.localeCompare(b.tech.name);
    });
  }, [allValidTechs, tasks, correctiveRecords, searchQuery]);

  // Overall stats
  const totalOrdersAssigned = useMemo(() => {
    return techColumnsData.reduce((sum, col) => sum + col.totalCount, 0);
  }, [techColumnsData]);

  // Reassignment handlers
  const handleTaskReassign = (taskId: number, newTechIdStr: string) => {
    const newTechId = parseInt(newTechIdStr, 10);
    setAnimatingCardId(taskId);
    onUpdateTaskTech(taskId, newTechId);
    setTimeout(() => setAnimatingCardId(null), 800);
  };

  const handleCorrectivoReassign = (corrId: number | string, newTechVal: string) => {
    setAnimatingCardId(corrId);
    if (newTechVal === '9999' || newTechVal === 'sin_asignar') {
      onUpdateCorrectivoTech(corrId, 'Sin asignar', null);
    } else {
      const selectedTech = technicians.find(t => t.id.toString() === newTechVal || t.name === newTechVal);
      if (selectedTech) {
        onUpdateCorrectivoTech(corrId, selectedTech.name, selectedTech.id);
      } else {
        onUpdateCorrectivoTech(corrId, newTechVal, null);
      }
    }
    setTimeout(() => setAnimatingCardId(null), 800);
  };

  return (
    <div className="flex flex-col gap-2.5 animate-in fade-in duration-300 -mt-1">
      
      {/* --------------------------------------------------------------------- */}
      {/* COMPACT TOP BAR: MULTIPURPOSE SEARCH & GLOBAL TOGGLE ALL BUTTON */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl px-3.5 py-2 border border-[#e2ded5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Left: Search Bar + Global Toggle All Accordions Button */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Multipurpose Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por técnico, orden, maquina, título o planta..."
              className="w-full pl-8 pr-7 py-1 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs text-[#324354] placeholder-gray-400 focus:outline-none focus:border-[#324354] transition-all"
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

          {/* Button to Expand / Collapse All Sections Across All Columns */}
          <button
            type="button"
            onClick={toggleAllSections}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#F6F3EE] hover:bg-[#eae5dc] text-[#324354] rounded-xl border border-[#e2ded5] text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
            title={areAllOpen ? 'Contraer/Ocultar todos los recuadros' : 'Desplegar todos los recuadros'}
          >
            {areAllOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#324354]" />
                <span className="hidden sm:inline">Ocultar Todo</span>
                <span className="sm:hidden">Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#324354]" />
                <span className="hidden sm:inline">Desplegar Todo</span>
                <span className="sm:hidden">Desplegar</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Status Indicators Row */}
        <div className="flex items-center gap-2.5 text-xs text-gray-600 flex-wrap shrink-0">
          <span className="flex items-center gap-1 font-medium">
            <Users className="w-3.5 h-3.5 text-[#324354]" />
            <strong className="text-[#324354]">{techColumnsData.filter(t => !t.isInactive).length}</strong> Técnicos Activos ({allValidTechs.length} en panel)
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <strong className="text-emerald-800">{totalOrdersAssigned}</strong> Órdenes Asignadas
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-amber-800 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <strong className="text-amber-900">{unassignedData.totalCount}</strong> Pendientes por Asignar ({unassignedData.totalHours}h)
          </span>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* HORIZONTAL PLANNER BOARD COLUMNS (WITH COLLAPSIBLE SUBTITLE ACCORDIONS) */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-0.5 items-start min-h-[660px] select-none scrollbar-thin">
        
        {/* =================================================================== */}
        {/* COLUMN 1: PENDIENTES POR ASIGNAR (UNASSIGNED POOL) */}
        {/* =================================================================== */}
        <div className="w-[235px] sm:w-[245px] flex-shrink-0 flex flex-col bg-slate-100/90 rounded-2xl border-2 border-dashed border-amber-300 shadow-2xs overflow-hidden">
          
          {/* Header */}
          <div className="p-2.5 bg-gradient-to-r from-amber-100/90 to-amber-50/90 border-b border-amber-200 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shadow-2xs flex-shrink-0">
                  ⏳
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-amber-950 leading-tight truncate">
                    Pendientes por Asignar
                  </h3>
                  <span className="text-[9px] text-amber-700 font-medium truncate block">
                    Pool de Espera / Sin Técnico
                  </span>
                </div>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs flex-shrink-0">
                {unassignedData.totalCount}
              </span>
            </div>

            <div className="flex items-center justify-between text-[9.5px] font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/60 mt-0.5">
              <span>Horas estimadas:</span>
              <span>{unassignedData.totalHours}h acum.</span>
            </div>
          </div>

          {/* Cards Body Categorized with Collapsible Subtitles */}
          <div className="p-2 flex flex-col gap-2 overflow-y-auto max-h-[720px]">
            {unassignedData.totalCount === 0 ? (
              <div className="py-8 px-2 text-center flex flex-col items-center justify-center gap-1.5 text-gray-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
                <p className="text-[11px] font-bold text-gray-600">¡Al día!</p>
                <p className="text-[9.5px] text-gray-400">Sin tareas pendientes.</p>
              </div>
            ) : (
              <>
                {/* 1. ATRASADAS (Collapsible) */}
                {unassignedData.atrasadas.length > 0 && (
                  <TaskGroupSection
                    title="Atrasadas"
                    count={unassignedData.atrasadas.length}
                    variant="atrasadas"
                    items={unassignedData.atrasadas}
                    technicians={technicians}
                    isOpen={isSectionOpen('unassigned-atrasadas')}
                    onToggle={() => toggleSection('unassigned-atrasadas')}
                    animatingCardId={animatingCardId}
                    onReassignTask={handleTaskReassign}
                    onReassignCorrectivo={handleCorrectivoReassign}
                    onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                  />
                )}

                {/* 2. HOY (Collapsible) */}
                {unassignedData.hoy.length > 0 && (
                  <TaskGroupSection
                    title="Hoy"
                    count={unassignedData.hoy.length}
                    variant="hoy"
                    items={unassignedData.hoy}
                    technicians={technicians}
                    isOpen={isSectionOpen('unassigned-hoy')}
                    onToggle={() => toggleSection('unassigned-hoy')}
                    animatingCardId={animatingCardId}
                    onReassignTask={handleTaskReassign}
                    onReassignCorrectivo={handleCorrectivoReassign}
                    onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                  />
                )}

                {/* 3. PRÓXIMAS (Collapsible) */}
                {unassignedData.proximas.length > 0 && (
                  <TaskGroupSection
                    title="Próximas"
                    count={unassignedData.proximas.length}
                    variant="proximas"
                    items={unassignedData.proximas}
                    technicians={technicians}
                    isOpen={isSectionOpen('unassigned-proximas')}
                    onToggle={() => toggleSection('unassigned-proximas')}
                    animatingCardId={animatingCardId}
                    onReassignTask={handleTaskReassign}
                    onReassignCorrectivo={handleCorrectivoReassign}
                    onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLUMNS 2..N: EACH TECHNICIAN COLUMN (ORDERED BY ATRASADAS DESC, INACTIVES LAST) */}
        {/* =================================================================== */}
        {techColumnsData.map(({ tech, palette, isInactive, atrasadas, hoy, proximas, prevCount, corrCount, totalCount, totalHoras, capacityBase, pctCarga }) => {
          
          let semaforoBadgeClass = 'bg-[#59a96a] text-white';
          let progressBarClass = 'bg-[#59a96a]';

          if (isInactive) {
            semaforoBadgeClass = 'bg-slate-400 text-white';
            progressBarClass = 'bg-slate-300';
          } else if (pctCarga > 85 && pctCarga <= 100) {
            semaforoBadgeClass = 'bg-[#deb841] text-white';
            progressBarClass = 'bg-[#deb841]';
          } else if (pctCarga > 100) {
            semaforoBadgeClass = 'bg-[#d14747] text-white';
            progressBarClass = 'bg-[#d14747]';
          }

          return (
            <div
              key={tech.id}
              className={`w-[235px] sm:w-[245px] flex-shrink-0 flex flex-col bg-white rounded-2xl border ${palette.border} shadow-2xs overflow-hidden ${
                isInactive ? 'opacity-85 hover:opacity-100 transition-opacity' : ''
              }`}
            >
              
              {/* Header (2-Row Layout so Technician Name is Fully Displayed) */}
              <div className={`p-2.5 ${palette.bg} border-b ${palette.border} flex flex-col gap-1.5`}>
                
                {/* Row 1: Tech Avatar + Full Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-5 h-5 rounded-lg ${palette.badge} flex items-center justify-center text-[10px] font-black shadow-2xs flex-shrink-0`}>
                    {tech.name.charAt(0)}
                  </div>
                  <h3 className={`font-bold text-xs ${palette.text} leading-tight truncate flex-1`} title={tech.name}>
                    {tech.name}
                  </h3>
                </div>

                {/* Row 2: Turno / Planta (Left) and [👤 Ver] + [X ord.] (Right) */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center gap-1 text-[9px] text-gray-600 min-w-0">
                    <span className="font-bold px-1.5 py-0.2 rounded bg-white/80 border border-gray-200/60 shadow-2xs text-gray-800">
                      {isInactive ? 'Inactivo' : (tech.turno ? `Turno ${tech.turno}` : 'Gen')}
                    </span>
                    {tech.planta && (
                      <span className="text-gray-600 font-medium truncate max-w-[85px]" title={tech.planta}>
                        • {tech.planta}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenPortalForTech?.(tech.id)}
                      className="px-1.5 py-0.5 rounded-lg bg-white/95 hover:bg-[#324354] text-gray-700 hover:text-white border border-gray-200 shadow-2xs text-[9px] font-bold flex items-center gap-0.5 transition-all cursor-pointer hover:shadow-xs active:scale-95"
                      title={`Abrir portal / detalle de ${tech.name}`}
                    >
                      <User className="w-2.5 h-2.5" />
                      <span>Ver</span>
                    </button>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${palette.lightBadge} flex-shrink-0 shadow-2xs`}>
                      {totalCount} ord.
                    </span>
                  </div>
                </div>

                {/* Daily Workload Box */}
                <div className="bg-white/95 rounded-xl p-1.5 border border-gray-200/70 shadow-2xs flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9.5px] font-bold">
                    <span className="text-gray-700">Carga del Día:</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${semaforoBadgeClass}`}>
                      {pctCarga}% ({totalHoras}h / {capacityBase}h)
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden border border-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                      style={{ width: `${Math.min(pctCarga, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[8.5px] text-gray-500 font-medium">
                    <span className="text-blue-700 font-bold">🔧 {prevCount} Prev.</span>
                    <span className="text-rose-700 font-bold">🚨 {corrCount} Corr.</span>
                  </div>
                </div>

              </div>

              {/* Cards Categorized by Collapsible Subtitles */}
              <div className="p-2 flex flex-col gap-2 overflow-y-auto max-h-[720px] bg-slate-50/50">
                {totalCount === 0 ? (
                  <div className="py-8 px-2 text-center flex flex-col items-center justify-center gap-1 text-gray-400">
                    <Briefcase className="w-5 h-5 text-gray-300" />
                    <p className="text-[10px] font-medium text-gray-400">Sin tareas asignadas</p>
                  </div>
                ) : (
                  <>
                    {/* 1. ATRASADAS (X) - Collapsible */}
                    {atrasadas.length > 0 && (
                      <TaskGroupSection
                        title="Atrasadas"
                        count={atrasadas.length}
                        variant="atrasadas"
                        items={atrasadas}
                        technicians={technicians}
                        isOpen={isSectionOpen(`tech-${tech.id}-atrasadas`)}
                        onToggle={() => toggleSection(`tech-${tech.id}-atrasadas`)}
                        animatingCardId={animatingCardId}
                        onReassignTask={handleTaskReassign}
                        onReassignCorrectivo={handleCorrectivoReassign}
                        onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                      />
                    )}

                    {/* 2. HOY (Y) - Collapsible */}
                    {hoy.length > 0 && (
                      <TaskGroupSection
                        title="Hoy"
                        count={hoy.length}
                        variant="hoy"
                        items={hoy}
                        technicians={technicians}
                        isOpen={isSectionOpen(`tech-${tech.id}-hoy`)}
                        onToggle={() => toggleSection(`tech-${tech.id}-hoy`)}
                        animatingCardId={animatingCardId}
                        onReassignTask={handleTaskReassign}
                        onReassignCorrectivo={handleCorrectivoReassign}
                        onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                      />
                    )}

                    {/* 3. PRÓXIMAS (Z) - Collapsible */}
                    {proximas.length > 0 && (
                      <TaskGroupSection
                        title="Próximas"
                        count={proximas.length}
                        variant="proximas"
                        items={proximas}
                        technicians={technicians}
                        isOpen={isSectionOpen(`tech-${tech.id}-proximas`)}
                        onToggle={() => toggleSection(`tech-${tech.id}-proximas`)}
                        animatingCardId={animatingCardId}
                        onReassignTask={handleTaskReassign}
                        onReassignCorrectivo={handleCorrectivoReassign}
                        onOpenDetail={(tipo, item) => setDetailModalItem({ tipo, item })}
                      />
                    )}
                  </>
                )}
              </div>

            </div>
          );
        })}

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* QUICK DETAIL MODAL */}
      {/* --------------------------------------------------------------------- */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 flex flex-col gap-3.5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                detailModalItem.tipo === 'preventivo' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {detailModalItem.tipo === 'preventivo' ? '🔧 Mantenimiento Preventivo (PMP)' : '🚨 Mantenimiento Correctivo'}
              </span>
              <button
                onClick={() => setDetailModalItem(null)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col gap-2.5 text-xs text-gray-700">
              <div>
                <span className="text-gray-400 font-medium">Código:</span>
                <p className="font-bold text-[#324354]">
                  {detailModalItem.tipo === 'preventivo'
                    ? (detailModalItem.item as MaintenanceTask).code || (detailModalItem.item as MaintenanceTask).csvId
                    : (detailModalItem.item as CorrectiveRecord).codigo}
                </p>
              </div>

              <div>
                <span className="text-gray-400 font-medium">Título / Descripción:</span>
                <p className="font-bold text-[#324354]">
                  {detailModalItem.tipo === 'preventivo'
                    ? (detailModalItem.item as MaintenanceTask).title
                    : (detailModalItem.item as CorrectiveRecord).sintoma}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#F6F3EE] p-2.5 rounded-xl">
                <div>
                  <span className="text-gray-400 font-medium">Máquina / Equipo:</span>
                  <p className="font-bold text-[#324354]">{detailModalItem.item.maquina || 'Sin máquina'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Planta:</span>
                  <p className="font-bold text-[#324354]">{detailModalItem.item.planta || 'Sin planta'}</p>
                </div>
              </div>

              {detailModalItem.tipo === 'preventivo' && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 font-medium">Detalle del procedimiento:</span>
                  <p className="bg-slate-50 p-2 rounded-lg border border-gray-200 text-gray-600 max-h-28 overflow-y-auto text-[11px]">
                    {(detailModalItem.item as MaintenanceTask).detalle || 'Sin detalle adicional'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-3.5 py-1.5 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#25323f] cursor-pointer"
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

// =============================================================================
// SUB-SECTION COMPONENT: COLLAPSIBLE WITH ACCORDION ARROW
// =============================================================================
interface TaskGroupSectionProps {
  title: 'Atrasadas' | 'Hoy' | 'Próximas' | string;
  count: number;
  variant: 'atrasadas' | 'hoy' | 'proximas';
  items: EnrichedTaskCardData[];
  technicians: Technician[];
  isOpen: boolean;
  onToggle: () => void;
  animatingCardId: string | number | null;
  onReassignTask: (taskId: number, newTechIdStr: string) => void;
  onReassignCorrectivo: (corrId: number | string, newTechVal: string) => void;
  onOpenDetail: (tipo: 'preventivo' | 'correctivo', item: MaintenanceTask | CorrectiveRecord) => void;
}

function TaskGroupSection({
  title,
  count,
  variant,
  items,
  technicians,
  isOpen,
  onToggle,
  animatingCardId,
  onReassignTask,
  onReassignCorrectivo,
  onOpenDetail,
}: TaskGroupSectionProps) {

  const headerStyles = {
    atrasadas: {
      bg: 'bg-rose-50/90 hover:bg-rose-100/90 text-rose-800 border-rose-200',
      badge: 'bg-rose-600 text-white',
      icon: '🚨'
    },
    hoy: {
      bg: 'bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-800 border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      icon: '🟢'
    },
    proximas: {
      bg: 'bg-sky-50/90 hover:bg-sky-100/90 text-sky-800 border-sky-200',
      badge: 'bg-sky-600 text-white',
      icon: '📅'
    },
  }[variant];

  return (
    <div className="flex flex-col gap-1.5">
      
      {/* Category Subtitle Header with Clickable Accordion Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`px-2 py-1 rounded-lg border ${headerStyles.bg} flex items-center justify-between shadow-2xs cursor-pointer transition-all active:scale-[0.99] select-none`}
        title={isOpen ? 'Clic para contraer' : 'Clic para desplegar'}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] shrink-0">{headerStyles.icon}</span>
          <span className="text-[10.5px] font-bold tracking-tight truncate">
            {title} ({count})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${headerStyles.badge}`}>
            {count}
          </span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 opacity-70 transition-transform" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 opacity-70 transition-transform" />
          )}
        </div>
      </button>

      {/* Cards List (Collapsible Content) */}
      {isOpen && (
        <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
          {items.map(cardData => (
            <MaintenanceCard
              key={cardData.uniqueKey}
              cardData={cardData}
              technicians={technicians}
              isAnimating={
                cardData.tipo === 'preventivo'
                  ? animatingCardId === (cardData.item as MaintenanceTask).id
                  : animatingCardId === (cardData.item as CorrectiveRecord).id
              }
              onReassign={(newTechVal) => {
                if (cardData.tipo === 'preventivo') {
                  onReassignTask((cardData.item as MaintenanceTask).id, newTechVal);
                } else {
                  onReassignCorrectivo((cardData.item as CorrectiveRecord).id, newTechVal);
                }
              }}
              onOpenDetail={() => onOpenDetail(cardData.tipo, cardData.item)}
            />
          ))}
        </div>
      )}

    </div>
  );
}

// =============================================================================
// REUSABLE MAINTENANCE CARD (COMPACT WITH ULTRA-SLEEK REASSIGN TRIGGER BUTTON)
// =============================================================================
interface MaintenanceCardProps {
  cardData: EnrichedTaskCardData;
  technicians: Technician[];
  isAnimating?: boolean;
  onReassign: (newTechIdStr: string) => void;
  onOpenDetail: () => void;
}

function MaintenanceCard({
  cardData,
  technicians,
  isAnimating,
  onReassign,
  onOpenDetail,
}: MaintenanceCardProps) {
  
  const { tipo, cleanCode, title, maquina, planta, durationHours, prioridad, currentTechId, dateLabel, dateStatus } = cardData;
  const isCorrectivo = tipo === 'correctivo';

  // Date pill styling
  const dateBadgeStyle = {
    overdue: 'bg-rose-50 text-rose-700 border-rose-200 font-black',
    today: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
    upcoming: 'bg-sky-50 text-sky-800 border-sky-200 font-medium',
  }[dateStatus];

  // Clean duration formatted (avoid 0.3333333333333h)
  const displayDuration = Number(durationHours.toFixed(1));

  return (
    <div
      className={`bg-white rounded-xl p-2 border border-[#e2ded5] shadow-2xs hover:shadow-xs transition-all flex flex-col gap-1 group relative ${
        isAnimating ? 'ring-2 ring-emerald-500 scale-[1.01] bg-emerald-50/40' : ''
      }`}
    >
      
      {/* Top Line: Tag Badge, Execution Date/Deadline & Duration */}
      <div className="flex items-center justify-between gap-1">
        
        {/* Code Tag Badge - sutil / discreto en gris */}
        <span
          className={`px-1.5 py-0.5 rounded text-[8.5px] font-medium font-mono border tracking-tight leading-tight truncate max-w-[95px] ${
            isCorrectivo
              ? 'bg-rose-50/60 text-rose-700/80 border-rose-200/60'
              : 'bg-slate-100 text-slate-500 border-slate-200/80'
          }`}
          title={cleanCode}
        >
          [{cleanCode}]
        </span>

        {/* Right Badges: Execution Date & Duration */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-1.5 py-0.2 rounded text-[8.5px] border flex items-center gap-0.5 leading-tight ${dateBadgeStyle}`}
            title={`Plazo / Fecha: ${dateLabel}`}
          >
            <CalendarDays className="w-2.5 h-2.5 opacity-80" />
            <span>{dateLabel}</span>
          </span>

          <span className="text-[8.5px] font-bold text-gray-500 shrink-0">
            ⏱️ {displayDuration}h
          </span>
        </div>
      </div>

      {/* Title / Description */}
      <div
        onClick={onOpenDetail}
        className="cursor-pointer group-hover:text-blue-900 transition-colors"
        title="Clic para ver detalle"
      >
        <h4 className="font-bold text-[10.5px] text-[#324354] leading-tight line-clamp-2">
          {title}
        </h4>
      </div>

      {/* Footer Line: Machine & Plant (Left) + Sleek Reassign Button (Right) */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-gray-100 mt-0.5">
        
        {/* Machine & Plant */}
        <div className="flex items-center gap-1 text-[9px] text-gray-500 font-medium min-w-0 flex-1 truncate">
          <span className="shrink-0">🏭</span>
          <span className="font-semibold text-gray-700 shrink-0">{planta || 'FIRPLAK'}</span>
          {maquina && (
            <>
              <span className="text-gray-300">•</span>
              <span className="truncate text-gray-500">{maquina}</span>
            </>
          )}
        </div>

        {/* Compact Reassign Trigger Button */}
        <div className="relative inline-flex items-center shrink-0">
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F6F3EE] hover:bg-[#eae5dc] border border-[#e2ded5] text-[9px] font-bold text-[#324354] transition-all cursor-pointer shadow-2xs">
            <span className="text-[9.5px]">⇄</span>
            <span>Reasignar</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </div>

          {/* Invisible Overlay Select */}
          <select
            value={currentTechId !== undefined && currentTechId !== null ? currentTechId.toString() : '9999'}
            onChange={(e) => onReassign(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title="Clic para reasignar técnico o mover a pendientes"
          >
            <option value="9999">⏳ Mover a Pendientes / Pool</option>
            <option disabled value="">──────────────</option>
            {technicians
              .filter(t => t.id !== 9999 && t.activo !== false)
              .map(t => (
                <option key={t.id} value={t.id.toString()}>
                  👤 {t.name} ({t.turno || 'Gen'})
                </option>
              ))}
          </select>
        </div>

      </div>

    </div>
  );
}
