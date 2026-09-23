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
  ExternalLink,
  Plus,
  AlertTriangle,
  Wrench,
  Building2
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
  isSubHeaderOpen?: boolean;
  onUpdateTaskTech: (taskId: number, newTechId: number) => void;
  onUpdateCorrectivoTech: (correctivoId: number | string, newTechName: string, newTechId?: number | null) => void;
  onRefreshData?: () => void;
  syncing?: boolean;
  onOpenPortalForTech?: (techId: number) => void;
  onOpenNewCorrectivo?: () => void;
  onOpenNewTpm?: () => void;
  onSaveTask?: (taskId: number, updates: Partial<MaintenanceTask>) => Promise<boolean>;
  onSaveCorrectivo?: (corrId: number | string, updates: Partial<CorrectiveRecord>) => Promise<boolean>;
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
  isSubHeaderOpen = true,
  onUpdateTaskTech,
  onUpdateCorrectivoTech,
  onOpenPortalForTech,
  onOpenNewCorrectivo,
  onOpenNewTpm,
  onSaveTask,
  onSaveCorrectivo,
}: PlannerTecnicosColumnasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [animatingCardId, setAnimatingCardId] = useState<string | number | null>(null);
  const [sectionsOpenState, setSectionsOpenState] = useState<Record<string, boolean>>({});
  const [areAllOpen, setAreAllOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<{
    tipo: 'preventivo' | 'correctivo';
    item: MaintenanceTask | CorrectiveRecord;
  } | null>(null);

  // Edit form states
  const [prevEditForm, setPrevEditForm] = useState<Partial<MaintenanceTask>>({});
  const [corrEditForm, setCorrEditForm] = useState<Partial<CorrectiveRecord>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState<'success' | 'error' | null>(null);
  const [editModalTab, setEditModalTab] = useState<'general' | 'ejecucion'>('general');

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

  // Helper: Parse date string in LOCAL time to avoid UTC timezone offset shifts (e.g. 2026-09-23 becoming 22 sept)
  const parseLocalDate = (dateStr?: string | null): Date => {
    if (!dateStr || dateStr === '—' || dateStr === '-') return new Date();
    const clean = String(dateStr).trim();
    if (clean.length >= 10 && clean[4] === '-' && clean[7] === '-') {
      const parts = clean.split(/[ T]/);
      const dateParts = parts[0].split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      return new Date(year, month, day);
    }
    const d = new Date(clean.replace(/-/g, '/'));
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Helper: Categorize tasks into Atrasadas, Hoy, Próximas with timestamps for sorting
  const categorizeTask = (task: MaintenanceTask): { category: TaskTimeCategory; dateLabel: string; dateStatus: 'overdue' | 'today' | 'upcoming'; rawTimestamp: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (task.fechaApertura) {
      const taskDate = parseLocalDate(task.fechaApertura);
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
      const corrDate = parseLocalDate(refDateStr);
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
    const prevCount = unassignedItems.filter(i => i.tipo === 'preventivo').length;
    const corrCount = unassignedItems.filter(i => i.tipo === 'correctivo').length;

    return {
      all: unassignedItems,
      atrasadas,
      hoy,
      proximas,
      totalCount: unassignedItems.length,
      totalHours: Math.round(totalHours * 10) / 10,
      prevCount,
      corrCount,
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

  // Open full edit modal and populate form fields
  const handleOpenEdit = (tipo: 'preventivo' | 'correctivo', item: MaintenanceTask | CorrectiveRecord) => {
    if (tipo === 'preventivo') {
      const t = item as MaintenanceTask;
      setPrevEditForm({
        title: t.title || '',
        detalle: t.detalle || '',
        durationMinutes: t.durationMinutes || 60,
        status: t.status || 'Pendiente',
        observations: (t as MaintenanceTask & { observations?: string }).observations || '',
        fechaApertura: (t as MaintenanceTask & { fechaApertura?: string }).fechaApertura
          ? String((t as MaintenanceTask & { fechaApertura?: string }).fechaApertura).slice(0, 16)
          : '',
        fechaCierre: (t as MaintenanceTask & { fechaCierre?: string }).fechaCierre
          ? String((t as MaintenanceTask & { fechaCierre?: string }).fechaCierre).slice(0, 16)
          : '',
        idtecs: t.idtecs,
        maquina: t.maquina || '',
        planta: t.planta || '',
      });
    } else {
      const c = item as CorrectiveRecord;
      setCorrEditForm({
        sintoma: c.sintoma || '',
        maquina: c.maquina || '',
        planta: c.planta || '',
        prioridad: c.prioridad || 'Alta',
        estado: c.estado || 'Abierta',
        tecnico_asignado: c.tecnico_asignado || '',
        fecha_limite: c.fecha_limite ? String(c.fecha_limite).slice(0, 10) : '',
        fecha_cierre: c.fecha_cierre ? String(c.fecha_cierre).slice(0, 10) : '',
        accion_tomada: c.accion_tomada || '',
      });
    }
    setEditFeedback(null);
    setEditModalTab('general');
    setDetailModalItem({ tipo, item });
  };

  const handleSaveEdit = async () => {
    if (!detailModalItem) return;
    setSavingEdit(true);
    try {
      let success = true;
      if (detailModalItem.tipo === 'preventivo') {
        const task = detailModalItem.item as MaintenanceTask;
        success = (await onSaveTask?.(task.id, prevEditForm)) ?? true;
      } else {
        const corr = detailModalItem.item as CorrectiveRecord;
        success = (await onSaveCorrectivo?.(corr.id, corrEditForm)) ?? true;
      }
      setEditFeedback(success !== false ? 'success' : 'error');
      if (success !== false) {
        setTimeout(() => { setDetailModalItem(null); setEditFeedback(null); }, 1400);
      }
    } catch {
      setEditFeedback('error');
    } finally {
      setSavingEdit(false);
    }
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
      {/* COMPACT STICKY TOP SUBHEADER: SEARCH, ACTION BUTTONS (+ Correctivo, + TPM) & STATS */}
      {/* --------------------------------------------------------------------- */}
      <div className={`sticky ${isSubHeaderOpen ? 'top-[122px]' : 'top-[84px]'} z-30 bg-[#F6F3EE] pt-0.5 pb-1 font-sans transition-all duration-300`}>
        <div className="bg-white rounded-xl px-2.5 py-1 border border-[#e2ded5] shadow-2xs flex flex-row items-center gap-2 w-full">
          
          {/* Left Group: Search Bar (grows to fill space) + Toggle All Accordions Button */}
          <div className="flex flex-row items-center gap-1.5 flex-1 min-w-0 flex-nowrap">
            {/* Multipurpose Search Bar - fills all available space */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por técnico, orden, maquina, título o planta..."
                className="w-full pl-7 pr-6 py-1 bg-[#F6F3EE] rounded-lg border border-[#e2ded5] text-xs text-[#324354] placeholder-gray-400 focus:outline-none focus:border-[#324354] transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Button to Expand / Collapse All Sections Across All Columns */}
            <button
              type="button"
              onClick={toggleAllSections}
              className="flex items-center gap-1 px-2 py-1 bg-[#F6F3EE] hover:bg-[#eae5dc] text-[#324354] rounded-lg border border-[#e2ded5] text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
              title={areAllOpen ? 'Contraer/Ocultar todos los recuadros' : 'Desplegar todos los recuadros'}
            >
              {areAllOpen ? (
                <>
                  <ChevronUp className="w-3 h-3 text-[#324354]" />
                  <span>Ocultar Todo</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 text-[#324354]" />
                  <span>Desplegar Todo</span>
                </>
              )}
            </button>
          </div>

          {/* Middle Group: Action Buttons (+ Correctivo & + TPM - Single +) */}
          <div className="flex flex-row items-center gap-1.5 shrink-0 flex-nowrap">
            {/* + Correctivo Button */}
            <button
              type="button"
              onClick={onOpenNewCorrectivo}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 border border-rose-700"
              title="Reportar y generar nueva orden de mantenimiento correctivo"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Correctivo</span>
            </button>

            {/* + TPM Button */}
            <button
              type="button"
              onClick={onOpenNewTpm}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#324354] hover:bg-[#25323f] active:scale-95 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 border border-[#25323f]"
              title="Crear nueva tarjeta TPM / Mantenimiento Autónomo"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>TPM</span>
            </button>
          </div>

          {/* Right Group: Status Indicators Row (Compact & Cleaned) */}
          <div className="flex flex-row items-center gap-1.5 text-[11px] text-gray-600 shrink-0 flex-nowrap whitespace-nowrap">
            <span className="flex items-center gap-1 font-medium bg-[#F6F3EE] px-2 py-0.5 rounded-lg border border-[#e2ded5] whitespace-nowrap">
              <Users className="w-3 h-3 text-[#324354]" />
              <strong className="text-[#324354]">{techColumnsData.filter(t => !t.isInactive).length}</strong> Técnicos Activos
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-200 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <strong className="text-emerald-800">{totalOrdersAssigned}</strong> OT Asignadas
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-amber-900 font-medium bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200 whitespace-nowrap">
              <Clock className="w-3 h-3 text-amber-600" />
              <strong className="text-amber-900">{unassignedData.totalCount}</strong> Pendientes por Asignar <span className="text-amber-700">({unassignedData.totalHours}h)</span>
            </span>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* HORIZONTAL PLANNER BOARD COLUMNS (WITH COLLAPSIBLE SUBTITLE ACCORDIONS) */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 items-start select-none scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        
        {/* =================================================================== */}
        {/* COLUMN 1: PENDIENTES POR ASIGNAR (UNASSIGNED POOL) */}
        {/* =================================================================== */}
        <div
          className="w-[235px] sm:w-[245px] flex-shrink-0 flex flex-col rounded-2xl border-2 border-dashed border-amber-300 overflow-hidden shadow-2xs"
          style={{ height: isSubHeaderOpen ? 'calc(100vh - 172px)' : 'calc(100vh - 132px)' }}
        >
          
          {/* Column Header - fixed at top, cards scroll below */}
          <div className="p-2.5 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200 flex flex-col gap-1 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shadow-2xs flex-shrink-0">
                  <Clock className="w-3 h-3 text-white" />
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

            <div className="bg-white/90 rounded-xl p-1.5 border border-amber-200/70 shadow-2xs flex flex-col gap-1 mt-0.5">
              <div className="flex items-center justify-between text-[9.5px] font-bold text-amber-900">
                <span>Horas estimadas:</span>
                <span>{unassignedData.totalHours}h acum.</span>
              </div>

              <div className="flex items-center justify-between text-[8.5px] text-gray-500 font-medium pt-0.5 border-t border-amber-100">
                <span className="text-blue-700 font-bold flex items-center gap-0.5">
                  <span className="text-[10px]">🔧</span> {unassignedData.prevCount} Prev.
                </span>
                <span className="text-rose-700 font-bold flex items-center gap-0.5">
                  <span className="text-[10px]">🚨</span> {unassignedData.corrCount} Corr.
                </span>
              </div>
            </div>
          </div>

          {/* Cards Body — internal scroll */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent">
            {unassignedData.totalCount === 0 ? (
              <div className="py-8 px-2 bg-slate-100/90 rounded-2xl border border-amber-200 text-center flex flex-col items-center justify-center gap-1.5 text-gray-400">
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
                    onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
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
                    onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
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
                    onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
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
              className={`w-[235px] sm:w-[245px] flex-shrink-0 flex flex-col ${palette.border} border rounded-2xl overflow-hidden shadow-2xs ${
                isInactive ? 'opacity-85 hover:opacity-100 transition-opacity' : ''
              }`}
              style={{ height: isSubHeaderOpen ? 'calc(100vh - 172px)' : 'calc(100vh - 132px)' }}
            >
              
              {/* Column Header - fixed at top */}
              <div className={`p-2.5 ${palette.bg} border-b ${palette.border} flex flex-col gap-1.5 flex-shrink-0`}>
                
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

              {/* Cards body — internal scroll */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {totalCount === 0 ? (
                  <div className="py-8 px-2 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center gap-1 text-gray-400">
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
                        onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
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
                        onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
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
                        onOpenDetail={(tipo, item) => handleOpenEdit(tipo, item)}
                      />
                    )}
                  </>
                )}
              </div>

            </div>
          );
        })}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FULL EDIT MODAL */}
      {/* ------------------------------------------------------------------ */}
      {detailModalItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailModalItem(null); }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[92vh]">

            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between shrink-0 ${
              detailModalItem.tipo === 'preventivo' ? 'bg-[#324354]' : 'bg-rose-700'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{detailModalItem.tipo === 'preventivo' ? '🔧' : '🚨'}</span>
                <div>
                  <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                    {detailModalItem.tipo === 'preventivo' ? 'Mantenimiento Preventivo (PMP)' : 'Mantenimiento Correctivo'}
                  </p>
                  <h3 className="text-white font-black text-sm font-mono tracking-tight">
                    {detailModalItem.tipo === 'preventivo'
                      ? ((detailModalItem.item as MaintenanceTask).code || (detailModalItem.item as MaintenanceTask).csvId)
                      : (detailModalItem.item as CorrectiveRecord).codigo}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 bg-[#F6F3EE] px-6 shrink-0">
              <button
                onClick={() => setEditModalTab('general')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  editModalTab === 'general' ? 'border-[#324354] text-[#324354]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                📋 Información General
              </button>
              <button
                onClick={() => setEditModalTab('ejecucion')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  editModalTab === 'ejecucion' ? 'border-[#324354] text-[#324354]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {detailModalItem.tipo === 'preventivo' ? '⚙️ Ejecución' : '🔧 Resolución'}
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">

              {/* ── PREVENTIVO ── */}
              {detailModalItem.tipo === 'preventivo' && (
                <>
                  {editModalTab === 'general' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Título de la Tarea</label>
                        <input type="text" value={prevEditForm.title || ''}
                          onChange={(e) => setPrevEditForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          placeholder="Descripción de la tarea..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Máquina / Equipo</label>
                          <input type="text" value={prevEditForm.maquina || ''}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, maquina: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Planta</label>
                          <input type="text" value={prevEditForm.planta || ''}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, planta: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Técnico Asignado</label>
                          <select value={(prevEditForm.idtecs || 9999).toString()}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, idtecs: parseInt(e.target.value) }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          >
                            <option value="9999">Sin asignar (Pool)</option>
                            {technicians.filter(t => t.id !== 9999 && t.activo !== false).map(t => (
                              <option key={t.id} value={t.id.toString()}>👤 {t.name} ({t.turno})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Duración (minutos)</label>
                          <input type="number" min={5} step={5} value={prevEditForm.durationMinutes || 60}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm font-bold text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Detalle del Procedimiento</label>
                        <textarea value={prevEditForm.detalle || ''}
                          onChange={(e) => setPrevEditForm(f => ({ ...f, detalle: e.target.value }))}
                          rows={4} placeholder="Pasos del procedimiento, instrucciones técnicas..."
                          className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {editModalTab === 'ejecucion' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Estado de la Orden</label>
                        <div className="flex gap-2">
                          {(['Pendiente', 'Incompleto', 'Completado'] as const).map(s => (
                            <button key={s} type="button"
                              onClick={() => setPrevEditForm(f => ({ ...f, status: s }))}
                              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all cursor-pointer active:scale-95 ${
                                prevEditForm.status === s
                                  ? s === 'Completado' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                  : s === 'Incompleto' ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                  : 'bg-[#324354] text-white border-[#25323f] shadow-sm'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {s === 'Pendiente' ? '⏳' : s === 'Incompleto' ? '🔄' : '✅'} {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Fecha de Apertura</label>
                          <input type="datetime-local" value={prevEditForm.fechaApertura || ''}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, fechaApertura: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Fecha de Cierre</label>
                          <input type="datetime-local" value={prevEditForm.fechaCierre || ''}
                            onChange={(e) => setPrevEditForm(f => ({ ...f, fechaCierre: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Observaciones de Ejecución</label>
                        <textarea value={prevEditForm.observations || ''}
                          onChange={(e) => setPrevEditForm(f => ({ ...f, observations: e.target.value }))}
                          rows={5} placeholder="Registra hallazgos, comentarios y observaciones de la ejecución..."
                          className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── CORRECTIVO ── */}
              {detailModalItem.tipo === 'correctivo' && (
                <>
                  {editModalTab === 'general' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Síntoma / Descripción del Problema</label>
                        <textarea value={corrEditForm.sintoma || ''}
                          onChange={(e) => setCorrEditForm(f => ({ ...f, sintoma: e.target.value }))}
                          rows={3} placeholder="Describe el síntoma o falla observada..."
                          className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Máquina / Equipo</label>
                          <input type="text" value={corrEditForm.maquina || ''}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, maquina: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Planta</label>
                          <input type="text" value={corrEditForm.planta || ''}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, planta: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Prioridad</label>
                          <select value={corrEditForm.prioridad || 'Alta'}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, prioridad: e.target.value as 'Alta' | 'Media' | 'Baja' }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm font-bold text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          >
                            <option value="Alta">🔴 Alta — Crítica</option>
                            <option value="Media">🟡 Media — Moderada</option>
                            <option value="Baja">🟢 Baja — Bajo impacto</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Técnico Asignado</label>
                          <select value={corrEditForm.tecnico_asignado || ''}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, tecnico_asignado: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          >
                            <option value="">Sin asignar</option>
                            {technicians.filter(t => t.id !== 9999 && t.activo !== false).map(t => (
                              <option key={t.id} value={t.name}>👤 {t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {editModalTab === 'ejecucion' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Estado del Correctivo</label>
                        <div className="flex gap-2">
                          {(['Abierta', 'En Proceso', 'Resuelta'] as const).map(s => (
                            <button key={s} type="button"
                              onClick={() => setCorrEditForm(f => ({ ...f, estado: s }))}
                              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all cursor-pointer active:scale-95 ${
                                corrEditForm.estado === s
                                  ? s === 'Resuelta' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                  : s === 'En Proceso' ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                  : 'bg-rose-600 text-white border-rose-700 shadow-sm'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {s === 'Abierta' ? '🔴' : s === 'En Proceso' ? '🔄' : '✅'} {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Fecha Límite</label>
                          <input type="date" value={corrEditForm.fecha_limite || ''}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, fecha_limite: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Fecha de Cierre / Resolución</label>
                          <input type="date" value={corrEditForm.fecha_cierre || ''}
                            onChange={(e) => setCorrEditForm(f => ({ ...f, fecha_cierre: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Acción Tomada / Solución Aplicada</label>
                        <textarea value={corrEditForm.accion_tomada || ''}
                          onChange={(e) => setCorrEditForm(f => ({ ...f, accion_tomada: e.target.value }))}
                          rows={5} placeholder="Describe la solución, repuestos usados, tiempo de intervención..."
                          className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-sm text-[#324354] focus:outline-none focus:border-[#324354] transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-[#F6F3EE] shrink-0">
              <div className="min-h-[20px]">
                {editFeedback === 'success' && (
                  <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                    <span className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[9px]">✓</span>
                    Guardado exitosamente
                  </span>
                )}
                {editFeedback === 'error' && (
                  <span className="text-rose-700 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                    <span className="w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-white text-[9px]">!</span>
                    Error al guardar. Verifica e intenta de nuevo.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 bg-white text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-100 cursor-pointer border border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-5 py-2 bg-[#324354] hover:bg-[#25323f] text-white font-bold rounded-xl text-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {savingEdit ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                  ) : (
                    '💾 Guardar Cambios'
                  )}
                </button>
              </div>
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

          <span className="text-[8.5px] font-bold text-gray-500 shrink-0 inline-flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5 opacity-70 shrink-0 inline" />
            <span>{displayDuration}h</span>
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
          <Building2 className="w-2.5 h-2.5 shrink-0 text-gray-400" />
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
            <option value="9999">Mover a Pendientes / Pool</option>
            <option disabled value="">────────────────</option>
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
