'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  CheckCircle2, Circle, Clock, Loader2, Factory, 
  MessageSquare, Calendar, User, Save, Check, 
  History, Plus, BarChart3, Settings, Edit2, Trash2, 
  Copy, ChevronDown, ChevronUp, Info, Search, 
  Filter, AlertCircle, TrendingUp, CheckSquare,
  Lock, Unlock, ShieldCheck, Sun, Moon, Sunrise, Briefcase,
  Eye, ArrowUpDown, ArrowUp, ArrowDown, BarChart2,
  PieChart as PieIcon, Activity, Zap, CheckCircle, RotateCcw
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Header from '@/components/opt-sistemica/Header'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts'

interface Actividad {
  id: string;
  id_planta?: string;
  horario: string;
  actividad: string;
  entregable?: string | null;
  puntos_clave?: string | null;
  tiempo_min: number;
  periodicidad?: string;
  lunes?: boolean;
  martes?: boolean;
  miercoles?: boolean;
  jueves?: boolean;
  viernes?: boolean;
  sub_proceso?: string | null;
}

interface Planta {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface Supervisor {
  id: number;
  nombre: string;
  uuid?: string;
  rol?: string;
  permisos?: any;
}

interface Seguimiento {
  id_actividad: string;
  completado: boolean;
  observaciones: string;
  id_supervisor: number;
}

export type TurnoTipo = 
  | 'turno_1' 
  | 'turno_2' 
  | 'turno_3' 
  | 'turno_4' 
  | 'turno_5' 
  | 'turno_6' 
  | 'turno_7' 
  | 'turno_8' 
  | 'turno_9';

const TURNOS_INFO: Record<TurnoTipo, { 
  id: string; 
  label: string; 
  dias: string; 
  horario: string; 
  horaInicio: string; 
  horaFin: string; 
  icon: any; 
  offsetMinutes: number;
  totalMinutes: number;
}> = {
  turno_1: {
    id: 'Turno 1',
    label: 'Turno 1 (06:00 - 13:20)',
    dias: 'Lunes - Sábado',
    horario: '06:00 - 13:20',
    horaInicio: '06:00',
    horaFin: '13:20',
    icon: Sunrise,
    offsetMinutes: 0,
    totalMinutes: 440 // 7h 20m
  },
  turno_2: {
    id: 'Turno 2',
    label: 'Turno 2 (13:20 - 20:40)',
    dias: 'Lunes - Sábado',
    horario: '13:20 - 20:40',
    horaInicio: '13:20',
    horaFin: '20:40',
    icon: Sun,
    offsetMinutes: 440,
    totalMinutes: 440 // 7h 20m
  },
  turno_3: {
    id: 'Turno 3',
    label: 'Turno 3 (20:40 - 05:52)',
    dias: 'Lunes - Viernes',
    horario: '20:40 - 05:52',
    horaInicio: '20:40',
    horaFin: '05:52',
    icon: Moon,
    offsetMinutes: 880,
    totalMinutes: 552 // 9h 12m
  },
  turno_4: {
    id: 'Turno 4',
    label: 'Turno 4 (21:10 - 04:30)',
    dias: 'Lunes - Sábado',
    horario: '21:10 - 04:30',
    horaInicio: '21:10',
    horaFin: '04:30',
    icon: Moon,
    offsetMinutes: 910,
    totalMinutes: 440 // 7h 20m
  },
  turno_5: {
    id: 'Turno 5',
    label: 'Turno 5 (20:40 - 04:00)',
    dias: 'Lunes - Sábado',
    horario: '20:40 - 04:00',
    horaInicio: '20:40',
    horaFin: '04:00',
    icon: Moon,
    offsetMinutes: 880,
    totalMinutes: 440 // 7h 20m
  },
  turno_6: {
    id: 'Turno 6',
    label: 'Turno 6 (06:00 - 15:12)',
    dias: 'Lunes - Viernes',
    horario: '06:00 - 15:12',
    horaInicio: '06:00',
    horaFin: '15:12',
    icon: Sunrise,
    offsetMinutes: 0,
    totalMinutes: 552 // 9h 12m
  },
  turno_7: {
    id: 'Turno 7',
    label: 'Turno 7 (07:00 - 16:12)',
    dias: 'Lunes - Viernes',
    horario: '07:00 - 16:12',
    horaInicio: '07:00',
    horaFin: '16:12',
    icon: Briefcase,
    offsetMinutes: 60,
    totalMinutes: 552 // 9h 12m
  },
  turno_8: {
    id: 'Turno 8',
    label: 'Turno 8 (08:00 - 17:12)',
    dias: 'Lunes - Viernes',
    horario: '08:00 - 17:12',
    horaInicio: '08:00',
    horaFin: '17:12',
    icon: Briefcase,
    offsetMinutes: 120,
    totalMinutes: 552 // 9h 12m
  },
  turno_9: {
    id: 'Turno 9',
    label: 'Turno 9 (09:00 - 18:12)',
    dias: 'Lunes - Viernes',
    horario: '09:00 - 18:12',
    horaInicio: '09:00',
    horaFin: '18:12',
    icon: Briefcase,
    offsetMinutes: 180,
    totalMinutes: 552 // 9h 12m
  }
};

interface ShiftScheduleItem extends Actividad {
  calculatedHorario: string;
  calculatedDuration: number;
}

const parseHorarioToMinutes = (horario: string): number => {
  if (!horario) return 0;
  const startTime = horario.split('-')[0].trim();
  const parts = startTime.split(':');
  if (parts.length < 2) return 0;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  if (hours >= 1 && hours < 6) {
    hours += 12;
  }
  
  return hours * 60 + minutes;
};

const formatMinutesToHHMM = (min: number): string => {
  const norm = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Algoritmo de cálculo dinámico y reubicación de tiempos según el turno seleccionado
const computeShiftActivities = (rawActs: Actividad[], turnoKey: TurnoTipo): ShiftScheduleItem[] => {
  const turno = TURNOS_INFO[turnoKey];
  if (!rawActs || rawActs.length === 0 || !turno) return [];

  const startMin = parseHorarioToMinutes(turno.horaInicio);
  const totalShiftMin = turno.totalMinutes;

  const sorted = [...rawActs].sort((a, b) => parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario));
  if (sorted.length === 1) {
    const s = startMin;
    const e = s + 10;
    return [{
      ...sorted[0],
      calculatedHorario: `${formatMinutesToHHMM(s)} - ${formatMinutesToHHMM(e)}`,
      calculatedDuration: 10
    }];
  }

  const baseStart = parseHorarioToMinutes(sorted[0].horario);
  const lastAct = sorted[sorted.length - 1];
  const lastBaseStart = parseHorarioToMinutes(lastAct.horario);
  const lastBaseDur = lastAct.tiempo_min || 25;
  const baseTotalSpan = Math.max(1, (lastBaseStart + lastBaseDur) - baseStart);
  const baseSpanAfterFirst = Math.max(1, baseTotalSpan - 10);
  const targetSpanAfterFirst = Math.max(30, totalShiftMin - 10);

  const lastDur = Math.max(15, Math.min(25, Math.round((lastBaseDur * targetSpanAfterFirst) / (baseSpanAfterFirst * 5)) * 5));

  let prevEndOffset = 10;
  const result: ShiftScheduleItem[] = [];

  sorted.forEach((act, index) => {
    if (index === 0) {
      // Actividad 1: siempre al inicio del turno, duración fija de 10 min
      const s = startMin;
      const e = s + 10;
      prevEndOffset = 10;
      result.push({
        ...act,
        calculatedHorario: `${formatMinutesToHHMM(s)} - ${formatMinutesToHHMM(e)}`,
        calculatedDuration: 10
      });
      return;
    }

    if (index === sorted.length - 1) {
      // Última actividad: termina exactamente en la hora final del turno
      const eOffset = totalShiftMin;
      const sOffset = Math.max(prevEndOffset, eOffset - lastDur);
      const s = startMin + sOffset;
      const e = startMin + eOffset;
      const finalDur = eOffset - sOffset;
      result.push({
        ...act,
        calculatedHorario: `${formatMinutesToHHMM(s)} - ${formatMinutesToHHMM(e)}`,
        calculatedDuration: finalDur > 0 ? finalDur : lastDur
      });
      return;
    }

    // Actividades intermedias: proporcionales dentro del marco del turno
    const actBaseStart = parseHorarioToMinutes(act.horario);
    const offsetFromFirst = Math.max(0, actBaseStart - (baseStart + 10));
    const ratio = offsetFromFirst / Math.max(1, baseSpanAfterFirst - lastBaseDur);

    const availableMidSpan = Math.max(20, targetSpanAfterFirst - lastDur);
    let targetStartOffset = 10 + Math.round((ratio * availableMidSpan) / 5) * 5;
    if (targetStartOffset < prevEndOffset) {
      targetStartOffset = prevEndOffset;
    }

    const rawDur = act.tiempo_min || 15;
    let scaledDur = Math.max(10, Math.round((rawDur * targetSpanAfterFirst) / (baseSpanAfterFirst * 5)) * 5);
    
    // Evitar que sobrepase el inicio del cierre de turno
    const maxAllowedEndOffset = totalShiftMin - lastDur;
    if (targetStartOffset + scaledDur > maxAllowedEndOffset) {
      scaledDur = Math.max(5, maxAllowedEndOffset - targetStartOffset);
    }

    const s = startMin + targetStartOffset;
    const e = s + scaledDur;
    prevEndOffset = targetStartOffset + scaledDur;

    result.push({
      ...act,
      calculatedHorario: `${formatMinutesToHHMM(s)} - ${formatMinutesToHHMM(e)}`,
      calculatedDuration: scaledDur
    });
  });

  return result;
};

const shouldHideObservations = (activityName: string): boolean => {
  const name = activityName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/['`´’]/g, "")
    .trim();
    
  const keywordsToHide = [
    "comunicaciones", "puesta a punto", "recurso para el inicio",
    "recursos para el inicio", "acompanamiento frecuente", "desayuno",
    "rrc", "seguimiento a parametros", "rejilla", "ronda", "5s",
    "almuerzo", "entrenamiento", "cierre de turno", "fin de turno"
  ];
  
  return keywordsToHide.some(keyword => name.includes(keyword));
};

export default function BitacoraPage() {
  const router = useRouter();
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial' | 'indicadores' | 'configuracion'>('nueva');

  // Plants & Supervisors
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [selectedPlantaId, setSelectedPlantaId] = useState<string>('');
  const [subSelection, setSubSelection] = useState<'MS_FV' | 'MBL_CEFI'>('MS_FV');
  const [selectedTurno, setSelectedTurno] = useState<TurnoTipo>('turno_1');
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [canConfigure, setCanConfigure] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form (Nueva Bitácora) State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [completados, setCompletados] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [autorias, setAutorias] = useState<Record<string, number>>({});
  const [loadingActs, setLoadingActs] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auto-save State (Tiempo Real)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Shift Close (Cierre de Turno) State
  const [isShiftClosed, setIsShiftClosed] = useState<boolean>(false);
  const [shiftClosedAt, setShiftClosedAt] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [closingShift, setClosingShift] = useState<boolean>(false);

  // Historial State
  const [historialData, setHistorialData] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filterPlantId, setFilterPlantId] = useState<string>('todas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [historialSearch, setHistorialSearch] = useState('');
  const [historialSortKey, setHistorialSortKey] = useState<'fecha' | 'planta' | 'supervisor' | 'pct'>('fecha');
  const [historialSortDir, setHistorialSortDir] = useState<'asc' | 'desc'>('desc');

  const requestHistorialSort = (key: 'fecha' | 'planta' | 'supervisor' | 'pct') => {
    if (historialSortKey === key) {
      setHistorialSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorialSortKey(key);
      setHistorialSortDir('desc');
    }
  };

  const HistorialSortIcon = ({ columnKey }: { columnKey: 'fecha' | 'planta' | 'supervisor' | 'pct' }) => {
    if (historialSortKey !== columnKey) return <ArrowUpDown size={12} className="opacity-40 ml-1 inline-block align-middle" />;
    return historialSortDir === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-white inline-block align-middle" /> 
      : <ArrowDown size={12} className="ml-1 text-white inline-block align-middle" />;
  };

  // Indicadores Analytics Filter State
  const [indicadoresPlantaFilter, setIndicadoresPlantaFilter] = useState<string>('todas');
  const [indicadoresSupervisorFilter, setIndicadoresSupervisorFilter] = useState<string>('todos');
  const [indicadoresPeriodoFilter, setIndicadoresPeriodoFilter] = useState<'todos' | '7dias' | '30dias' | 'esteMes'>('todos');

  // Configuration (Plantillas) State
  const [configPlantaId, setConfigPlantaId] = useState<string>('');
  const [configSubSelection, setConfigSubSelection] = useState<'MS_FV' | 'MBL_CEFI'>('MS_FV');
  const [configActividades, setConfigActividades] = useState<Actividad[]>([]);
  const [loadingConfigActs, setLoadingConfigActs] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Actividad | null>(null);
  const [activityForm, setActivityForm] = useState<Partial<Actividad>>({
    horario: '06:00',
    actividad: '',
    entregable: '',
    puntos_clave: '',
    tiempo_min: 15,
    periodicidad: 'Diaria',
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true
  });
  const [savingActivity, setSavingActivity] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourcePlantId, setCloneSourcePlantId] = useState('');

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [configTurnoPreview, setConfigTurnoPreview] = useState<TurnoTipo>('turno_1');

  // Selected Plant Object helper
  const selectedPlanta = useMemo(() => {
    return plantas.find(p => p.id === selectedPlantaId) || plantas[0] || null;
  }, [plantas, selectedPlantaId]);

  const configPlanta = useMemo(() => {
    return plantas.find(p => p.id === configPlantaId) || plantas[0] || null;
  }, [plantas, configPlantaId]);

  // Recálculo dinámico y reubicación de actividades para el turno seleccionado
  const scheduledActividades = useMemo(() => {
    return computeShiftActivities(actividades, selectedTurno);
  }, [actividades, selectedTurno]);

  const scheduledConfigActividades = useMemo(() => {
    return computeShiftActivities(configActividades, configTurnoPreview);
  }, [configActividades, configTurnoPreview]);

  // Helper para resolver el nombre completo del supervisor / usuario de sesión
  const getSupervisorName = useCallback((id?: number | string | null) => {
    if (!id) {
      return selectedSupervisor?.nombre || "Héctor Jose Chinchilla Trigos";
    }
    const numId = Number(id);
    const found = supervisores.find(s => (numId && s.id === numId) || s.uuid === String(id) || s.correo === String(id));
    if (found && found.nombre && found.nombre.trim() !== "") return found.nombre;
    if (selectedSupervisor && (selectedSupervisor.id === numId || selectedSupervisor.uuid === String(id))) {
      return selectedSupervisor.nombre;
    }
    return selectedSupervisor?.nombre || "Héctor Jose Chinchilla Trigos";
  }, [supervisores, selectedSupervisor]);

  // Historial filtrado y ordenado para la vista tipo tabla
  const filteredAndSortedHistorial = useMemo(() => {
    let result = historialData.filter(item => {
      const q = historialSearch.toLowerCase();
      const sName = getSupervisorName(item.supervisorId).toLowerCase();
      return !q || 
        item.fecha.toLowerCase().includes(q) || 
        item.plantaNombre.toLowerCase().includes(q) || 
        sName.includes(q);
    });

    result.sort((a, b) => {
      let res = 0;
      if (historialSortKey === 'fecha') {
        res = a.fecha.localeCompare(b.fecha);
      } else if (historialSortKey === 'planta') {
        res = a.plantaNombre.localeCompare(b.plantaNombre);
      } else if (historialSortKey === 'supervisor') {
        const sA = getSupervisorName(a.supervisorId);
        const sB = getSupervisorName(b.supervisorId);
        res = sA.localeCompare(sB);
      } else if (historialSortKey === 'pct') {
        const pctA = a.totalTareas > 0 ? a.completadas / a.totalTareas : 0;
        const pctB = b.totalTareas > 0 ? b.completadas / b.totalTareas : 0;
        res = pctA - pctB;
      }
      return historialSortDir === 'asc' ? res : -res;
    });

    return result;
  }, [historialData, historialSearch, historialSortKey, historialSortDir, supervisores, selectedSupervisor, getSupervisorName]);

  // Dataset filtrado para la pestaña de Indicadores y Analítica
  const filteredIndicadoresData = useMemo(() => {
    return historialData.filter(item => {
      if (indicadoresPlantaFilter !== 'todas' && item.plantaId !== indicadoresPlantaFilter) {
        return false;
      }
      if (indicadoresSupervisorFilter !== 'todos' && String(item.supervisorId) !== String(indicadoresSupervisorFilter)) {
        return false;
      }
      if (indicadoresPeriodoFilter !== 'todos') {
        const itemDate = new Date(item.fecha);
        const now = new Date();
        if (indicadoresPeriodoFilter === '7dias') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (indicadoresPeriodoFilter === '30dias') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        } else if (indicadoresPeriodoFilter === 'esteMes') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [historialData, indicadoresPlantaFilter, indicadoresSupervisorFilter, indicadoresPeriodoFilter]);

  // Analytics Metrics Principales
  const analyticsKPIs = useMemo(() => {
    const totalBitacoras = filteredIndicadoresData.length;
    const totalProg = filteredIndicadoresData.reduce((acc, h) => acc + h.totalTareas, 0);
    const totalComp = filteredIndicadoresData.reduce((acc, h) => acc + h.completadas, 0);
    const avgCumplimiento = totalProg > 0 ? Math.round((totalComp / totalProg) * 100) : 0;
    const completas100 = filteredIndicadoresData.filter(h => h.totalTareas > 0 && h.completadas === h.totalTareas).length;
    const tasaCierre = totalBitacoras > 0 ? Math.round((completas100 / totalBitacoras) * 100) : 0;
    
    return {
      totalBitacoras,
      totalProg,
      totalComp,
      avgCumplimiento,
      completas100,
      tasaCierre,
      enProgreso: totalBitacoras - completas100
    };
  }, [filteredIndicadoresData]);

  // Chart 1: Tendencia Temporal de Cumplimiento (%)
  const tendenciaChartData = useMemo(() => {
    const byDate: Record<string, { total: number; completadas: number }> = {};
    filteredIndicadoresData.forEach(item => {
      if (!byDate[item.fecha]) {
        byDate[item.fecha] = { total: 0, completadas: 0 };
      }
      byDate[item.fecha].total += item.totalTareas;
      byDate[item.fecha].completadas += item.completadas;
    });

    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, stat]) => ({
        fecha: fecha.slice(5), // MM-DD
        fechaCompleta: fecha,
        cumplimiento: stat.total > 0 ? Math.round((stat.completadas / stat.total) * 100) : 0,
        completadas: stat.completadas,
        total: stat.total,
        meta: 90
      }));
  }, [filteredIndicadoresData]);

  // Chart 2: Cumplimiento y Volumen por Planta
  const plantaChartData = useMemo(() => {
    const byPlanta: Record<string, { nombre: string; bitacoras: number; total: number; completadas: number }> = {};
    plantas.forEach(p => {
      byPlanta[p.id] = { nombre: p.nombre, bitacoras: 0, total: 0, completadas: 0 };
    });

    filteredIndicadoresData.forEach(item => {
      if (!byPlanta[item.plantaId]) {
        byPlanta[item.plantaId] = { nombre: item.plantaNombre, bitacoras: 0, total: 0, completadas: 0 };
      }
      byPlanta[item.plantaId].bitacoras += 1;
      byPlanta[item.plantaId].total += item.totalTareas;
      byPlanta[item.plantaId].completadas += item.completadas;
    });

    return Object.values(byPlanta)
      .filter(p => p.bitacoras > 0 || indicadoresPlantaFilter === 'todas')
      .map(p => ({
        planta: p.nombre,
        bitacoras: p.bitacoras,
        cumplimiento: p.total > 0 ? Math.round((p.completadas / p.total) * 100) : 0,
        completadas: p.completadas,
        total: p.total
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento);
  }, [plantas, filteredIndicadoresData, indicadoresPlantaFilter]);

  // Chart 3: Desempeño por Supervisor / Responsable
  const supervisorChartData = useMemo(() => {
    const bySup: Record<string, { nombre: string; bitacoras: number; total: number; completadas: number }> = {};
    filteredIndicadoresData.forEach(item => {
      const sId = String(item.supervisorId || 'default');
      const sName = getSupervisorName(item.supervisorId);
      if (!bySup[sId]) {
        bySup[sId] = { nombre: sName, bitacoras: 0, total: 0, completadas: 0 };
      }
      bySup[sId].bitacoras += 1;
      bySup[sId].total += item.totalTareas;
      bySup[sId].completadas += item.completadas;
    });

    return Object.values(bySup).map(s => ({
      supervisor: s.nombre,
      bitacoras: s.bitacoras,
      cumplimiento: s.total > 0 ? Math.round((s.completadas / s.total) * 100) : 0,
      completadas: s.completadas,
      total: s.total
    })).sort((a, b) => b.bitacoras - a.bitacoras);
  }, [filteredIndicadoresData, getSupervisorName]);

  // Chart 4: Estado de Cierre (Donut)
  const donutEstadoData = useMemo(() => {
    return [
      { name: 'Completas (100%)', value: analyticsKPIs.completas100, color: '#59a96a' },
      { name: 'En Progreso (<100%)', value: analyticsKPIs.enProgreso, color: '#deb841' }
    ];
  }, [analyticsKPIs]);

  // Chart 5: Tasa de Ejecución por Bloque de Horario
  const horarioBloquesData = useMemo(() => {
    const blocks = [
      { bloque: 'Inicial (06:00-08:00)', total: 0, completadas: 0 },
      { bloque: 'Media Mañana (08:00-11:30)', total: 0, completadas: 0 },
      { bloque: 'Tarde / Control (11:30-13:00)', total: 0, completadas: 0 },
      { bloque: 'Cierre (13:00+)', total: 0, completadas: 0 }
    ];

    filteredIndicadoresData.forEach(h => {
      if (h.items && Array.isArray(h.items)) {
        h.items.forEach((it: any) => {
          const hor = it.plantillas_actividades?.horario || '06:00';
          const min = parseHorarioToMinutes(hor);
          let bIdx = 0;
          if (min < 480) bIdx = 0;
          else if (min < 690) bIdx = 1;
          else if (min < 780) bIdx = 2;
          else bIdx = 3;

          blocks[bIdx].total += 1;
          if (it.completado) blocks[bIdx].completadas += 1;
        });
      }
    });

    return blocks.map(b => ({
      bloque: b.bloque,
      cumplimiento: b.total > 0 ? Math.round((b.completadas / b.total) * 100) : 0,
      completadas: b.completadas,
      total: b.total
    }));
  }, [filteredIndicadoresData]);

  // Storage key for instant local recovery
  const storageKey = useMemo(() => {
    return `bitacora_draft_${selectedPlantaId}_${selectedDate}_${selectedTurno}_${subSelection}`;
  }, [selectedPlantaId, selectedDate, selectedTurno, subSelection]);

  // 1. Check Auth & Load Initial Data
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email || '');

      // Get user profile
      let { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, uuid, rol, permisos')
        .eq('uuid', session.user.id)
        .maybeSingle();

      if (!userData && session.user.email) {
        const { data: byEmail } = await supabase
          .from('usuarios')
          .select('id, nombre, correo, uuid, rol, permisos')
          .eq('correo', session.user.email)
          .maybeSingle();

        if (byEmail) {
          if (!byEmail.uuid) {
            await supabase.from('usuarios').update({ uuid: session.user.id }).eq('id', byEmail.id);
          }
          userData = { ...byEmail, uuid: session.user.id };
        }
      }

      // Fallback: If not registered yet in usuarios table, extract full name from auth metadata or email
      if (!userData) {
        const metaName = session.user.user_metadata?.full_name || 
                         session.user.user_metadata?.nombre || 
                         session.user.user_metadata?.name || 
                         (session.user.email ? session.user.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Héctor Jose Chinchilla Trigos');
        userData = {
          id: 1,
          nombre: metaName,
          correo: session.user.email || '',
          uuid: session.user.id,
          rol: 'administrador',
          permisos: { configuracion: true, bitacora: true }
        };
      }

      setSelectedSupervisor(userData);
      const role = userData.rol?.toLowerCase();
      const perms = userData.permisos || {};
      const isAdmin = role === 'administrador' || role === 'desarrollador' || role === 'calidad' || role === 'jefe' ||
                      perms.configuracion === true || perms.bitacora === true || perms.bitacora?.administrador === true || perms.bitacora?.editar_plantillas === true;
      setCanConfigure(isAdmin);

      // Load Plantas
      const { data: plantasData } = await supabase.from('plantas').select('id, nombre, descripcion').order('nombre');
      if (plantasData && plantasData.length > 0) {
        setPlantas(plantasData);
        const defaultP = plantasData.find(p => p.nombre === 'Mármol Sintético') || plantasData[0];
        setSelectedPlantaId(defaultP.id);
        setConfigPlantaId(defaultP.id);
      }

      // Load all users to resolve supervisor names accurately
      const { data: allUsers } = await supabase.from('usuarios').select('id, nombre, correo, uuid').order('nombre');
      if (allUsers && allUsers.length > 0) {
        setSupervisores(allUsers);
      } else if (userData) {
        setSupervisores([userData]);
      }

      // Auto detect Shift based on current Colombian hour & minute
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes >= 360 && currentMinutes < 800) {
        // 06:00 - 13:20 -> Turno 1
        setSelectedTurno('turno_1');
      } else if (currentMinutes >= 800 && currentMinutes < 1240) {
        // 13:20 - 20:40 -> Turno 2
        setSelectedTurno('turno_2');
      } else {
        // 20:40 - 05:52 / Noche -> Turno 3
        setSelectedTurno('turno_3');
      }

      setLoading(false);
    }
    init();
  }, [router]);

  // 2. Fetch Activities for Nueva Bitácora Form + Load Local/Cloud State
  const fetchFormActividades = useCallback(async () => {
    if (!selectedPlantaId) return;
    setLoadingActs(true);

    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const parts = selectedDate.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = dayNames[dt.getDay()];

    let query = supabase.from('plantillas_actividades').select('*')
      .eq('id_planta', selectedPlantaId);

    if (dayOfWeek !== 'sabado' && dayOfWeek !== 'domingo') {
      query = query.eq(dayOfWeek, true);
    }

    if (selectedPlanta?.nombre === 'Calidad') {
      if (subSelection === 'MS_FV') {
        query = query.or('sub_proceso.eq.MS_FV,sub_proceso.is.null');
      } else if (subSelection === 'MBL_CEFI') {
        query = query.eq('sub_proceso', 'MBL_CEFI');
      }
    }

    const { data: acts, error: actErr } = await query.order('horario', { ascending: true });

    if (!actErr && acts) {
      const sorted = [...acts].sort((a, b) => parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario));
      setActividades(sorted);
    }

    // Load progress from Supabase
    const { data: progress } = await supabase.from('seguimiento_bitacora').select('id_actividad, completado, observaciones, id_supervisor, created_at')
      .eq('fecha', selectedDate);

    const statusMap: Record<string, boolean> = {};
    const obsMap: Record<string, string> = {};
    const authMap: Record<string, number> = {};

    if (progress && progress.length > 0) {
      progress.forEach((item: Seguimiento) => {
        statusMap[item.id_actividad] = item.completado;
        obsMap[item.id_actividad] = item.observaciones || '';
        authMap[item.id_actividad] = item.id_supervisor;
      });
    }

    // Check LocalStorage for instant un-synced fallback
    try {
      const localSnapshot = localStorage.getItem(storageKey);
      if (localSnapshot) {
        const parsed = JSON.parse(localSnapshot);
        if (parsed.completados) Object.assign(statusMap, parsed.completados);
        if (parsed.observaciones) Object.assign(obsMap, parsed.observaciones);
        if (parsed.isShiftClosed !== undefined) {
          setIsShiftClosed(parsed.isShiftClosed);
          setShiftClosedAt(parsed.shiftClosedAt || null);
        }
      } else {
        setIsShiftClosed(false);
        setShiftClosedAt(null);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    setCompletados(statusMap);
    setObservaciones(obsMap);
    setAutorias(authMap);
    setAutoSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLoadingActs(false);
  }, [selectedPlantaId, selectedPlanta?.nombre, subSelection, selectedDate, storageKey]);

  useEffect(() => {
    if (activeTab === 'nueva') {
      fetchFormActividades();
    }
  }, [fetchFormActividades, activeTab]);

  // 3. Auto-save (Doble Persistencia: Supabase + LocalStorage)
  const autoSaveToSupabase = useCallback(async (
    updatedCompletados: Record<string, boolean>,
    updatedObservaciones: Record<string, string>,
    targetActId?: string
  ) => {
    if (!selectedSupervisor || !selectedDate) return;
    setAutoSaveStatus('saving');

    // Save snapshot to LocalStorage immediately
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        completados: updatedCompletados,
        observaciones: updatedObservaciones,
        isShiftClosed,
        shiftClosedAt,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Determine records to upsert
    const actIds = targetActId ? [targetActId] : Object.keys(updatedCompletados).concat(Object.keys(updatedObservaciones));
    const uniqueIds = Array.from(new Set(actIds));

    if (uniqueIds.length === 0) {
      setAutoSaveStatus('saved');
      return;
    }

    const supId = selectedSupervisor?.id || 1;
    const payload = uniqueIds.map(id => ({
      id_actividad: id,
      fecha: selectedDate,
      id_supervisor: supId,
      completado: updatedCompletados[id] || false,
      observaciones: updatedObservaciones[id] || ''
    }));

    try {
      const { error } = await supabase.from('seguimiento_bitacora').upsert(payload, { onConflict: 'id_actividad, fecha' });
      if (!error) {
        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        console.error('Auto-save error:', error);
      }
    } catch (err) {
      console.error('Auto-save exception:', err);
    }
  }, [selectedSupervisor, selectedDate, storageKey, isShiftClosed, shiftClosedAt]);

  // Interactive Checklist Checkbox (Saves immediately)
  const toggleLocalCompletado = (actividadId: string) => {
    if (isShiftClosed) {
      alert('Esta bitácora ya fue cerrada para este turno. Si necesitas reactivarla, reabre el turno.');
      return;
    }
    const newStatus = !completados[actividadId];
    const updated = { ...completados, [actividadId]: newStatus };
    setCompletados(updated);
    autoSaveToSupabase(updated, observaciones, actividadId);
  };

  // Interactive Textarea with Debounce Auto-save
  const updateLocalObservacion = (actividadId: string, text: string) => {
    if (isShiftClosed) return;
    const updated = { ...observaciones, [actividadId]: text };
    setObservaciones(updated);
    setAutoSaveStatus('saving');

    // Save to LocalStorage immediately
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        completados,
        observaciones: updated,
        isShiftClosed,
        shiftClosedAt,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {}

    // Debounce Supabase upsert by 1200ms
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      autoSaveToSupabase(completados, updated, actividadId);
    }, 1200);
  };

  // 4. Shift Close Action
  const handleConfirmCloseShift = async () => {
    setClosingShift(true);
    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Save final observation if present
    if (handoverNotes.trim() && actividades.length > 0) {
      const lastAct = actividades[actividades.length - 1];
      const existingObs = observaciones[lastAct.id] || '';
      const finalObs = existingObs 
        ? `${existingObs}\n[PASE DE TURNO / NOVEDADES]: ${handoverNotes.trim()}`
        : `[PASE DE TURNO / NOVEDADES]: ${handoverNotes.trim()}`;
      
      const updatedObs = { ...observaciones, [lastAct.id]: finalObs };
      setObservaciones(updatedObs);
      await autoSaveToSupabase(completados, updatedObs);
    } else {
      await autoSaveToSupabase(completados, observaciones);
    }

    setIsShiftClosed(true);
    setShiftClosedAt(nowStr);

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        completados,
        observaciones,
        isShiftClosed: true,
        shiftClosedAt: nowStr,
        handoverNotes,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {}

    setClosingShift(false);
    setShowCloseModal(false);
  };

  const handleReopenShift = () => {
    const confirmReopen = confirm('¿Deseas reabrir el turno para continuar registrando actividades?');
    if (!confirmReopen) return;
    setIsShiftClosed(false);
    setShiftClosedAt(null);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        completados,
        observaciones,
        isShiftClosed: false,
        shiftClosedAt: null,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {}
  };

  // 5. Config Tab Fetch
  const fetchConfigActividades = useCallback(async () => {
    if (!configPlantaId) return;
    setLoadingConfigActs(true);

    let query = supabase.from('plantillas_actividades').select('*')
      .eq('id_planta', configPlantaId);

    if (configPlanta?.nombre === 'Calidad') {
      if (configSubSelection === 'MS_FV') {
        query = query.or('sub_proceso.eq.MS_FV,sub_proceso.is.null');
      } else if (configSubSelection === 'MBL_CEFI') {
        query = query.eq('sub_proceso', 'MBL_CEFI');
      }
    }

    const { data, error } = await query.order('horario', { ascending: true });
    if (!error && data) {
      const sorted = [...data].sort((a, b) => parseHorarioToMinutes(a.horario) - parseHorarioToMinutes(b.horario));
      setConfigActividades(sorted);
    }
    setLoadingConfigActs(false);
  }, [configPlantaId, configPlanta?.nombre, configSubSelection]);

  useEffect(() => {
    if (activeTab === 'configuracion') {
      fetchConfigActividades();
    }
  }, [fetchConfigActividades, activeTab]);

  // 6. Historial Fetch
  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    let query = supabase
      .from('seguimiento_bitacora')
      .select(`
        id_actividad,
        fecha,
        completado,
        observaciones,
        id_supervisor,
        plantillas_actividades (
          id,
          actividad,
          horario,
          id_planta,
          sub_proceso,
          tiempo_min
        )
      `)
      .order('fecha', { ascending: false })
      .limit(200);

    if (filterDate) {
      query = query.eq('fecha', filterDate);
    }

    const { data, error } = await query;
    if (!error && data) {
      const grouped: Record<string, any> = {};
      data.forEach((row: any) => {
        const plantaId = row.plantillas_actividades?.id_planta;
        if (!plantaId) return;
        if (filterPlantId !== 'todas' && plantaId !== filterPlantId) return;

        const key = `${row.fecha}_${plantaId}`;
        const supId = row.id_supervisor || selectedSupervisor?.id || 1;
        if (!grouped[key]) {
          const pl = plantas.find(p => p.id === plantaId);
          grouped[key] = {
            fecha: row.fecha,
            plantaId,
            plantaNombre: pl?.nombre || 'Planta',
            supervisorId: supId,
            totalTareas: 0,
            completadas: 0,
            items: []
          };
        } else if (row.id_supervisor && (!grouped[key].supervisorId || grouped[key].supervisorId === 1)) {
          grouped[key].supervisorId = row.id_supervisor;
        }
        grouped[key].totalTareas += 1;
        if (row.completado) grouped[key].completadas += 1;
        grouped[key].items.push(row);
      });

      setHistorialData(Object.values(grouped));
    }
    setLoadingHistorial(false);
  }, [filterPlantId, filterDate, plantas]);

  useEffect(() => {
    if (activeTab === 'historial' || activeTab === 'indicadores') {
      fetchHistorial();
    }
  }, [fetchHistorial, activeTab]);

  // Config actions
  const handleOpenCreateActivity = () => {
    setEditingActivity(null);
    setActivityForm({
      id_planta: configPlantaId,
      horario: '06:00',
      actividad: '',
      entregable: '',
      puntos_clave: '',
      tiempo_min: 15,
      periodicidad: 'Diaria',
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sub_proceso: configPlanta?.nombre === 'Calidad' ? configSubSelection : null
    });
    setShowActivityModal(true);
  };

  const handleOpenEditActivity = (act: Actividad) => {
    setEditingActivity(act);
    setActivityForm({
      ...act,
      entregable: act.entregable || '',
      puntos_clave: act.puntos_clave || '',
      sub_proceso: act.sub_proceso || (configPlanta?.nombre === 'Calidad' ? configSubSelection : null)
    });
    setShowActivityModal(true);
  };

  const handleSaveActivityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configPlantaId || !activityForm.actividad?.trim()) {
      alert('Por favor escribe el nombre de la actividad.');
      return;
    }

    setSavingActivity(true);
    const payload = {
      ...activityForm,
      id_planta: configPlantaId,
      sub_proceso: configPlanta?.nombre === 'Calidad' ? configSubSelection : null,
      actividad: activityForm.actividad.trim(),
      entregable: activityForm.entregable?.trim() || null,
      puntos_clave: activityForm.puntos_clave?.trim() || null,
      tiempo_min: Number(activityForm.tiempo_min) || 15
    };

    if (!editingActivity) {
      delete payload.id;
    }

    const { error } = await supabase.from('plantillas_actividades').upsert(payload);
    setSavingActivity(false);

    if (error) {
      alert('Error al guardar la actividad: ' + error.message);
    } else {
      setShowActivityModal(false);
      fetchConfigActividades();
    }
  };

  const handleDeleteActivityConfig = async (id: string) => {
    const confirmed = confirm('¿Estás seguro de eliminar esta actividad de la plantilla?');
    if (!confirmed) return;

    const { error } = await supabase.from('plantillas_actividades').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      fetchConfigActividades();
    }
  };

  const handleCloneRoutine = async () => {
    if (!configPlantaId || !cloneSourcePlantId) return;
    const source = plantas.find(p => p.id === cloneSourcePlantId);
    if (!source) return;

    const confirmed = confirm(`¿Deseas importar todas las actividades de "${source.nombre}" hacia "${configPlanta?.nombre}"?`);
    if (!confirmed) return;

    setSavingActivity(true);
    const { data: sourceActs } = await supabase.from('plantillas_actividades').select('*').eq('id_planta', cloneSourcePlantId);
    if (!sourceActs || sourceActs.length === 0) {
      alert('No se encontraron actividades en la planta origen seleccionada.');
      setSavingActivity(false);
      return;
    }

    const newActs = sourceActs.map(a => ({
      id_planta: configPlantaId,
      horario: a.horario,
      actividad: a.actividad,
      entregable: a.entregable,
      puntos_clave: a.puntos_clave,
      tiempo_min: a.tiempo_min,
      periodicidad: a.periodicidad || 'Diaria',
      lunes: a.lunes,
      martes: a.martes,
      miercoles: a.miercoles,
      jueves: a.jueves,
      viernes: a.viernes,
      sub_proceso: configPlanta?.nombre === 'Calidad' ? configSubSelection : null
    }));

    const { error } = await supabase.from('plantillas_actividades').insert(newActs);
    setSavingActivity(false);
    setShowCloneModal(false);

    if (error) {
      alert('Error al clonar: ' + error.message);
    } else {
      alert(`¡Se han importado ${newActs.length} actividades con éxito!`);
      fetchConfigActividades();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // KPIs
  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => completados[a.id]).length;
  const porcentaje = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#324354] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
      </div>
    );
  }

  const ActiveTurnoIcon = TURNOS_INFO[selectedTurno]?.icon || Sunrise;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] relative overflow-x-hidden selection:bg-[#324354] selection:text-white bitacora-scope">
      
      {/* Header Principal */}
      <Header
        title="Bitácora"
        subtitle="Módulo Operativo"
        userEmail={userEmail}
        showLogout={true}
        onLogout={handleLogout}
      />

      {/* SubHeader Unificado (Estilo OPT Operativa / FIRPLAK) */}
      <div className="sticky top-20 bg-white border-b border-[#e2ded5] py-2 px-3 shadow-sm z-40 w-full font-sans">
        <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center items-center overflow-x-auto scrollbar-hide py-0.5">
          
          {/* Historial Tab */}
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeTab === 'historial'
                ? 'bg-[#324354] text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History size={16} />
            <span>Historial</span>
          </button>

          {/* Nueva Bitácora Tab */}
          <button
            onClick={() => setActiveTab('nueva')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeTab === 'nueva'
                ? 'bg-[#324354] text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus size={16} />
            <span>Nueva Bitácora</span>
          </button>

          {/* Indicadores Tab */}
          <button
            onClick={() => setActiveTab('indicadores')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
              activeTab === 'indicadores'
                ? 'bg-[#324354] text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BarChart3 size={16} />
            <span>Indicadores</span>
          </button>

          {/* Configuración Tab (Para Administradores / Jefes) */}
          {canConfigure && (
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'configuracion'
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Settings size={16} />
              <span>Configuración</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        
        {/* ========================================================= */}
        {/* PESTAÑA 1: NUEVA BITÁCORA (Formulario Centralizado con Selector de Turno) */}
        {/* ========================================================= */}
        {activeTab === 'nueva' && (
          <div className="w-full animate-fade-in pb-28 flex flex-col gap-5">
            
            {/* Tarjeta Selectora Superior: Planta, Turno, Sub-proceso, Fecha y Supervisor */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#e2ded5] flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#324354] flex items-center gap-2">
                    <CheckSquare size={20} className="text-[#7B8E90]" />
                    <span>Diligenciamiento de Bitácora Diaria</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Selecciona el turno y la planta para cargar y sincronizar automáticamente las tareas del día
                  </p>
                </div>

                {/* Auto-save status badge */}
                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saving' ? (
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 animate-pulse">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Guardando cambios...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Autoguardado {lastSavedTime ? `(${lastSavedTime})` : 'activo'}</span>
                    </div>
                  )}

                  {isShiftClosed && (
                    <div className="flex items-center gap-1.5 bg-[#324354] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      <Lock size={12} />
                      <span>Turno Cerrado {shiftClosedAt ? `(${shiftClosedAt})` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controles del Formulario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                
                {/* 1. Selector de Turno */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1 flex items-center gap-1">
                    <ActiveTurnoIcon size={14} className="text-[#7B8E90]" />
                    <span>* Turno de Trabajo</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTurno}
                      onChange={(e) => setSelectedTurno(e.target.value as TurnoTipo)}
                      className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354] appearance-none cursor-pointer"
                    >
                      {(Object.keys(TURNOS_INFO) as TurnoTipo[]).map((tKey) => {
                        const t = TURNOS_INFO[tKey];
                        return (
                          <option key={tKey} value={tKey}>
                            {t.id}: {t.dias} ({t.horario})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* 2. Selector de Planta */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    * Planta / Proceso
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPlantaId}
                      onChange={(e) => {
                        setSelectedPlantaId(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354] appearance-none cursor-pointer"
                    >
                      {plantas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* 3. Selector de Fecha */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    Fecha de Ejecución
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                  />
                </div>

                {/* 4. Responsable */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    Responsable / Supervisor
                  </label>
                  <div className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-xs font-semibold text-[#324354] truncate">
                    {selectedSupervisor?.nombre || 'Usuario actual'}
                  </div>
                </div>
              </div>

              {/* Sub-proceso condicional para Calidad */}
              {selectedPlanta?.nombre === 'Calidad' && (
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider">Sub-proceso Calidad:</span>
                  <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setSubSelection('MS_FV')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        subSelection === 'MS_FV'
                          ? 'bg-[#324354] text-white shadow-sm'
                          : 'text-[#324354] hover:bg-white/60'
                      }`}
                    >
                      Mármol y Fibra (MS & FV)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubSelection('MBL_CEFI')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        subSelection === 'MBL_CEFI'
                          ? 'bg-[#324354] text-white shadow-sm'
                          : 'text-[#324354] hover:bg-white/60'
                      }`}
                    >
                      Muebles y CEFI (MBL & CEFI)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Progreso Diario Circular y Cierre de Turno */}
            <div className="bg-[#324354] text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="transparent" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      fill="transparent" 
                      stroke="#7B8E90" 
                      strokeWidth="6" 
                      strokeDasharray={213} 
                      strokeDashoffset={213 - (213 * porcentaje) / 100} 
                      strokeLinecap="round" 
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }} 
                    />
                  </svg>
                  <span className="absolute font-bold text-base">{porcentaje}%</span>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider mb-0.5">
                    Avance {TURNOS_INFO[selectedTurno]?.label}
                  </div>
                  <h3 className="text-xl font-bold mb-0.5">
                    {selectedPlanta?.nombre} {selectedPlanta?.nombre === 'Calidad' ? `(${subSelection === 'MS_FV' ? 'MS & FV' : 'MBL & CEFI'})` : ''}
                  </h3>
                  <p className="text-white/80 text-xs font-medium">
                    {completadas} de {totalActividades} tareas programadas ejecutadas para la fecha.
                  </p>
                </div>
              </div>

              {/* Acciones de Cierre de Turno */}
              <div className="shrink-0 flex items-center gap-2">
                {isShiftClosed ? (
                  <button
                    onClick={handleReopenShift}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border border-white/20"
                  >
                    <Unlock size={14} />
                    <span>Reabrir Registro</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="px-5 py-2.5 bg-[#7B8E90] hover:bg-[#6c7e80] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md hover:scale-105"
                  >
                    <Lock size={14} />
                    <span>Finalizar / Cerrar Turno</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lista Dinámica de Actividades con Horario Adaptado al Turno */}
            {loadingActs ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-[#324354] mx-auto mb-2" size={36} />
                <p className="text-xs text-gray-400 font-bold">Cargando actividades de {selectedPlanta?.nombre}...</p>
              </div>
            ) : actividades.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                <Calendar className="mx-auto text-gray-300 mb-3" size={44} />
                <h4 className="text-sm font-bold text-gray-700 mb-1">No hay actividades programadas para este día</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  No se encontraron tareas configuradas para {selectedPlanta?.nombre} en el día seleccionado.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {scheduledActividades.map((item) => {
                  const isDone = !!completados[item.id];
                  const autorId = autorias[item.id];
                  const hideObs = shouldHideObservations(item.actividad);
                  const isExpanded = !!expanded[item.id];
                  const horarioCalculado = item.calculatedHorario;
                  const duracionCalculada = item.calculatedDuration;

                  return (
                    <div 
                      key={item.id}
                      className="bg-white rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer border border-[#e2ded5] relative"
                      onClick={() => toggleExpanded(item.id)}
                      style={{
                        borderLeft: isDone ? '6px solid #59a96a' : '6px solid #e2ded5',
                        opacity: isShiftClosed ? 0.9 : 1
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Horario Dinámico Recalculado */}
                          <div className="flex flex-col items-center bg-[#324354]/5 rounded-xl py-1.5 px-2.5 min-w-[95px] shrink-0 text-center">
                            <span className="text-xs font-bold text-[#324354] flex items-center gap-1">
                              <Clock size={11} />{horarioCalculado}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">{duracionCalculada} MIN</span>
                          </div>

                          {/* Título de la tarea */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm sm:text-base font-bold text-[#324354] transition-all truncate ${isDone ? 'line-through text-slate-400' : ''}`}>
                              {item.actividad}
                            </h4>
                            {isExpanded && item.entregable && (
                              <p className="text-xs text-[#7B8E90] mt-0.5 font-medium italic">
                                Entregable: {item.entregable}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botón de selección instantáneo (SIEMPRE VISIBLE para llenado ultra-rápido) */}
                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            disabled={isShiftClosed}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLocalCompletado(item.id);
                            }} 
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border cursor-pointer shrink-0 shadow-sm ${
                              isDone 
                                ? 'bg-[#59a96a] border-[#59a96a] text-white shadow-emerald-200 hover:scale-105' 
                                : 'bg-white border-2 border-slate-300 text-slate-300 hover:border-[#59a96a] hover:text-[#59a96a] hover:scale-105'
                            }`}
                            title={isDone ? "Completado (clic para desmarcar)" : "Marcar como completado"}
                          >
                            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                          </button>

                          {/* Chevron de acordeón para ver puntos clave y observaciones */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#324354] hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer"
                            title={isExpanded ? "Ocultar detalles" : "Ver puntos clave y observaciones"}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Detalle expandible con Autoguardado en tiempo real */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-[#e2ded5] flex flex-col gap-3.5" onClick={(e) => e.stopPropagation()}>
                          {item.puntos_clave && (
                            <div className="bg-[#324354]/5 rounded-2xl p-3.5 text-xs text-[#324354]">
                              <h5 className="font-bold mb-1.5 uppercase tracking-wider text-[11px] text-[#7B8E90]">Puntos Clave / Criterios:</h5>
                              <div className="flex flex-col gap-1 font-medium">
                                {item.puntos_clave.split('•').filter(p => p.trim()).map((point, i) => (
                                  <div key={i} className="flex gap-2 items-start">
                                    <span className="text-[#7B8E90] font-bold">•</span>
                                    <span>{point.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!hideObs && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] uppercase tracking-wider text-[#7B8E90]">Observaciones del Turno:</span>
                                <span className="text-[10px] text-gray-400 font-medium italic">Se guarda automáticamente</span>
                              </div>
                              <textarea 
                                disabled={isShiftClosed}
                                placeholder="Añade algún comentario o incidente ocurrido en esta actividad..." 
                                value={observaciones[item.id] || ''} 
                                onChange={(e) => updateLocalObservacion(item.id, e.target.value)} 
                                className="w-full min-h-[60px] border border-[#e2ded5] rounded-xl p-2.5 text-xs outline-none focus:border-[#324354] transition bg-[#F6F3EE] resize-vertical disabled:opacity-60" 
                              />
                            </div>
                          )}

                          {autorId && (
                            <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Info size={11} /> Última actualización por: <strong className="text-slate-500">{getSupervisorName(autorId)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 2: HISTORIAL DE BITÁCORAS (Tabla Tipo Hora a Hora) */}
        {/* ========================================================= */}
        {activeTab === 'historial' && (
          <div className="w-full animate-fade-in pb-28 flex flex-col gap-5">
            
            {/* Cabecera y Filtros de Búsqueda */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#324354]">Bitácoras Guardadas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Historial consolidado de ejecuciones operativas por planta y supervisor</p>
              </div>

              <div className="flex-1 w-full max-w-lg relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="Buscar por fecha, planta, supervisor..."
                    value={historialSearch}
                    onChange={(e) => setHistorialSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-[#324354] shadow-sm focus:outline-none focus:border-[#324354]"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 text-right">
                  {filteredAndSortedHistorial.length} REGISTROS ENCONTRADOS
                </p>
              </div>
            </div>

            {/* Filtros Secundarios: Selector de Planta y Selector de Fecha */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2ded5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={filterPlantId}
                    onChange={(e) => setFilterPlantId(e.target.value)}
                    className="px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="todas">Todas las Plantas</option>
                    {plantas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none"
                />

                {(filterPlantId !== 'todas' || filterDate || historialSearch) && (
                  <button
                    onClick={() => {
                      setFilterPlantId('todas');
                      setFilterDate('');
                      setHistorialSearch('');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-semibold">
                Mostrando {filteredAndSortedHistorial.length} de {historialData.length} bitácoras
              </div>
            </div>

            {/* Tabla Avanzada Estilo Hora a Hora */}
            {loadingHistorial ? (
              <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="animate-spin text-[#324354] mx-auto mb-2" size={38} />
                <p className="text-xs text-gray-400 font-bold">Cargando registros históricos de bitácora...</p>
              </div>
            ) : filteredAndSortedHistorial.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
                <History className="mx-auto text-gray-300 mb-3" size={48} />
                <h4 className="text-sm font-bold text-gray-700 mb-1">No se encontraron bitácoras</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  No hay registros que coincidan con los filtros seleccionados. Prueba cambiando la planta o fecha.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#324354] hover:bg-[#324354]">
                      <TableRow className="hover:bg-[#324354] border-none select-none">
                        <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider w-16 text-center">
                          #
                        </TableHead>
                        <TableHead 
                          className="py-4 font-bold text-white uppercase text-xs tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => requestHistorialSort('fecha')}
                        >
                          Fecha <HistorialSortIcon columnKey="fecha" />
                        </TableHead>
                        <TableHead 
                          className="py-4 font-bold text-white uppercase text-xs tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => requestHistorialSort('planta')}
                        >
                          Planta / Proceso <HistorialSortIcon columnKey="planta" />
                        </TableHead>
                        <TableHead 
                          className="py-4 font-bold text-white uppercase text-xs tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => requestHistorialSort('supervisor')}
                        >
                          Realizado por <HistorialSortIcon columnKey="supervisor" />
                        </TableHead>
                        <TableHead 
                          className="py-4 font-bold text-white uppercase text-xs tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => requestHistorialSort('pct')}
                        >
                          Cumplimiento <HistorialSortIcon columnKey="pct" />
                        </TableHead>
                        <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider text-center">
                          Estado
                        </TableHead>
                        <TableHead className="py-4 font-bold text-white uppercase text-xs tracking-wider text-right w-28 pr-6">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedHistorial.map((reg, idx) => {
                        const pct = reg.totalTareas > 0 ? Math.round((reg.completadas / reg.totalTareas) * 100) : 0;
                        const supName = getSupervisorName(reg.supervisorId);

                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                            
                            {/* 1. Consecutivo */}
                            <TableCell className="py-4 text-center">
                              <span className="font-black text-[#324354] text-xs bg-slate-100 px-2.5 py-1 rounded-md">
                                #{idx + 1}
                              </span>
                            </TableCell>

                            {/* 2. Fecha */}
                            <TableCell className="py-4">
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <Calendar size={13} className="text-[#7B8E90]" />
                                <span>{reg.fecha}</span>
                              </div>
                            </TableCell>

                            {/* 3. Planta */}
                            <TableCell className="py-4">
                              <div className="font-bold text-[#324354] text-xs flex items-center gap-1.5">
                                <Factory size={13} className="text-[#7B8E90]" />
                                <span>{reg.plantaNombre}</span>
                              </div>
                            </TableCell>

                            {/* 4. Supervisor */}
                            <TableCell className="py-4">
                              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <User size={13} className="text-[#7B8E90]" />
                                <span>{supName}</span>
                              </div>
                            </TableCell>

                            {/* 5. Cumplimiento */}
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                                  pct >= 90 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : pct >= 70 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {pct}%
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {reg.completadas}/{reg.totalTareas} tareas
                                </span>
                              </div>
                            </TableCell>

                            {/* 6. Estado */}
                            <TableCell className="py-4 text-center">
                              {pct === 100 ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                  <CheckCircle2 size={11} /> Completa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-[#324354]/10 text-[#324354] border border-[#324354]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                  <Clock size={11} /> En progreso
                                </span>
                              )}
                            </TableCell>

                            {/* 7. Acciones */}
                            <TableCell className="py-4 text-right pr-6">
                              <button
                                onClick={() => {
                                  setSelectedPlantaId(reg.plantaId);
                                  setSelectedDate(reg.fecha);
                                  setActiveTab('nueva');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition cursor-pointer shadow-sm hover:scale-105"
                                title="Abrir y ver esta bitácora"
                              >
                                <Eye size={14} />
                                <span>Ver</span>
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 3: INDICADORES Y ANALÍTICA DE RENDIMIENTO */}
        {/* ========================================================= */}
        {activeTab === 'indicadores' && (
          <div className="w-full animate-fade-in pb-28 flex flex-col gap-6">
            
            {/* 1. Header & Panel de Filtros Interactivos */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#e2ded5] flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div>
                  <h2 className="text-xl font-bold text-[#324354] flex items-center gap-2">
                    <BarChart2 size={22} className="text-[#7B8E90]" />
                    <span>Tablero de Indicadores y Analítica Operativa</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Métricas en tiempo real de cumplimiento, tendencias, efectividad por planta y rendimiento por supervisor
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[#324354] bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
                  <Activity size={14} className="text-emerald-600" />
                  <span>{analyticsKPIs.totalBitacoras} Bitácoras analizadas</span>
                </div>
              </div>

              {/* Filtros Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Filtro Planta */}
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">
                    Planta / Proceso
                  </label>
                  <select
                    value={indicadoresPlantaFilter}
                    onChange={(e) => setIndicadoresPlantaFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="todas">Todas las Plantas</option>
                    {plantas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Supervisor */}
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">
                    Responsable / Supervisor
                  </label>
                  <select
                    value={indicadoresSupervisorFilter}
                    onChange={(e) => setIndicadoresSupervisorFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Todos los Responsables</option>
                    {supervisores.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Período */}
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">
                    Rango de Fecha
                  </label>
                  <select
                    value={indicadoresPeriodoFilter}
                    onChange={(e) => setIndicadoresPeriodoFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Histórico Completo</option>
                    <option value="7dias">Últimos 7 días</option>
                    <option value="30dias">Últimos 30 días</option>
                    <option value="esteMes">Mes Actual</option>
                  </select>
                </div>

                {/* Botón Restablecer */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setIndicadoresPlantaFilter('todas');
                      setIndicadoresSupervisorFilter('todos');
                      setIndicadoresPeriodoFilter('todos');
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <RotateCcw size={13} />
                    <span>Restablecer Filtros</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Top Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* KPI 1: Bitácoras Registradas */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bitácoras Ejecutadas</span>
                  <div className="p-2 bg-[#324354]/10 text-[#324354] rounded-xl">
                    <CheckSquare size={16} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-black text-[#324354]">{analyticsKPIs.totalBitacoras}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    Registros en el período
                  </div>
                </div>
              </div>

              {/* KPI 2: Cumplimiento Promedio */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cumplimiento Global</span>
                  <div className={`p-2 rounded-xl ${
                    analyticsKPIs.avgCumplimiento >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    analyticsKPIs.avgCumplimiento >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-black text-[#324354] flex items-baseline gap-1.5">
                    <span>{analyticsKPIs.avgCumplimiento}%</span>
                    <span className="text-xs font-semibold text-slate-400">/ Meta 90%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        analyticsKPIs.avgCumplimiento >= 90 ? 'bg-emerald-500' :
                        analyticsKPIs.avgCumplimiento >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, analyticsKPIs.avgCumplimiento)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI 3: Tasa de Cierre Completo */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tasa Cierre 100%</span>
                  <div className="p-2 bg-[#7B8E90]/20 text-[#324354] rounded-xl">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-black text-[#324354]">{analyticsKPIs.tasaCierre}%</div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {analyticsKPIs.completas100} completas vs {analyticsKPIs.enProgreso} en curso
                  </div>
                </div>
              </div>

              {/* KPI 4: Total Tareas Ejecutadas */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tareas Ejecutadas</span>
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <Zap size={16} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-black text-[#324354]">
                    {analyticsKPIs.totalComp} <span className="text-base font-semibold text-slate-400">/ {analyticsKPIs.totalProg}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    Actividades programadas
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Fila 1 de Gráficos: Tendencia de Cumplimiento (%) y Estado de Bitácoras */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfico 1: Tendencia Temporal */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#324354]">Evolución y Tendencia de Cumplimiento (%)</h3>
                    <p className="text-[11px] text-gray-400">Tasa de cumplimiento diario en el tiempo con umbral corporativo del 90%</p>
                  </div>
                </div>
                
                <div className="w-full h-72">
                  {tendenciaChartData.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No hay suficientes datos para generar la tendencia.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tendenciaChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#324354" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#7B8E90" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" stroke="#888888" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Cumplimiento']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fechaCompleta || label}
                          contentStyle={{ backgroundColor: '#324354', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <ReferenceLine y={90} stroke="#59a96a" strokeDasharray="3 3" label={{ value: 'Meta (90%)', fill: '#59a96a', fontSize: 10, position: 'top' }} />
                        <Area 
                          type="monotone" 
                          dataKey="cumplimiento" 
                          stroke="#324354" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorCumplimiento)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Donut Estado de Cierre */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#324354]">Estado de Bitácoras</h3>
                  <p className="text-[11px] text-gray-400">Proporción de turnos cerrados con 100% de tareas</p>
                </div>

                <div className="w-full h-56 relative flex items-center justify-center">
                  {analyticsKPIs.totalBitacoras === 0 ? (
                    <div className="text-xs text-gray-400">Sin registros</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutEstadoData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {donutEstadoData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#324354', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-[#324354]">{analyticsKPIs.tasaCierre}%</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Completas</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#59a96a]"></div>
                    <span>100% Completa ({analyticsKPIs.completas100})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#deb841]"></div>
                    <span>En progreso ({analyticsKPIs.enProgreso})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Fila 2 de Gráficos: Cumplimiento por Planta y Acumulado por Supervisor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 3: Cumplimiento por Planta */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#324354]">Cumplimiento Promedio por Planta (%)</h3>
                  <p className="text-[11px] text-gray-400">Efectividad de ejecución según cada proceso de manufactura</p>
                </div>

                <div className="w-full h-72">
                  {plantaChartData.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No hay datos por planta disponibles.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={plantaChartData} margin={{ top: 10, right: 15, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="planta" 
                          stroke="#888888" 
                          fontSize={10} 
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis domain={[0, 100]} stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
                        <Tooltip 
                          formatter={(value: any, name: any, item: any) => [
                            `${value}% (${item.payload.completadas}/${item.payload.total} tareas)`, 
                            'Cumplimiento'
                          ]}
                          contentStyle={{ backgroundColor: '#324354', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="cumplimiento" radius={[6, 6, 0, 0]}>
                          {plantaChartData.map((entry, index) => {
                            const color = entry.cumplimiento >= 90 ? '#59a96a' : entry.cumplimiento >= 70 ? '#deb841' : '#d14747';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 4: Acumulados y Cumplimiento por Supervisor */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#324354]">Bitácoras y Desempeño por Supervisor</h3>
                  <p className="text-[11px] text-gray-400">Volumen de registros y porcentaje de ejecución por responsable</p>
                </div>

                <div className="w-full h-72">
                  {supervisorChartData.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No hay registros por supervisor en el filtro.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supervisorChartData} margin={{ top: 10, right: 15, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="supervisor" 
                          stroke="#888888" 
                          fontSize={10} 
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis domain={[0, 100]} stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
                        <Tooltip 
                          formatter={(value: any, name: any, item: any) => [
                            `${value}% (${item.payload.bitacoras} bitácoras)`, 
                            'Cumplimiento'
                          ]}
                          contentStyle={{ backgroundColor: '#324354', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="cumplimiento" fill="#324354" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Fila 3: Cumplimiento por Franja Horaria y Matriz Comparativa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfico 5: Cumplimiento por Franja Horaria */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#324354]">Efectividad por Franja Horaria</h3>
                  <p className="text-[11px] text-gray-400">Cumplimiento según el momento de la jornada</p>
                </div>

                <div className="w-full h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horarioBloquesData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} stroke="#888888" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="bloque" stroke="#888888" fontSize={9} width={120} />
                      <Tooltip 
                        formatter={(value: any, name: any, item: any) => [
                          `${value}% (${item.payload.completadas}/${item.payload.total} tareas)`, 
                          'Cumplimiento'
                        ]}
                        contentStyle={{ backgroundColor: '#324354', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="cumplimiento" fill="#7B8E90" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabla Resumen de Desempeño Consolidado por Planta */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#324354]">Matriz de Desempeño por Planta</h3>
                  <p className="text-[11px] text-gray-400">Resumen integral de bitácoras, tareas y nivel de servicio operativo</p>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Planta / Proceso</th>
                        <th className="py-2.5 px-3 text-center">Bitácoras</th>
                        <th className="py-2.5 px-3 text-center">Tareas Ejecutadas</th>
                        <th className="py-2.5 px-3 text-center">Cumplimiento</th>
                        <th className="py-2.5 px-3 text-right">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {plantaChartData.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#324354]">{p.planta}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{p.bitacoras}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {p.completadas} / {p.total}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black">
                            {p.cumplimiento}%
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              p.cumplimiento >= 90 ? 'bg-emerald-100 text-emerald-800' :
                              p.cumplimiento >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {p.cumplimiento >= 90 ? 'Óptimo' : p.cumplimiento >= 70 ? 'Aceptable' : 'Alerta'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 4: CONFIGURACIÓN DE PLANTILLAS (Modo Editor idéntico a Nueva Bitácora) */}
        {/* ========================================================= */}
        {activeTab === 'configuracion' && canConfigure && (
          <div className="w-full animate-fade-in pb-28 flex flex-col gap-5">
            
            {/* Tarjeta Selectora Superior: Planta, Sub-proceso y Previsualizador de Turno */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#e2ded5] flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#324354] flex items-center gap-2">
                    <Settings size={20} className="text-[#7B8E90]" />
                    <span>Configuración y Editor de Rutinas</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Modifica o añade tareas en la plantilla base. Los horarios se adaptan automáticamente a todos los turnos.
                  </p>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenCreateActivity}
                    className="px-4 py-2 bg-[#324354] text-white rounded-xl text-xs font-bold hover:bg-[#324354]/90 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} />
                    <span>Añadir Actividad</span>
                  </button>

                  <button
                    onClick={() => {
                      const others = plantas.filter(p => p.id !== configPlantaId);
                      if (others.length > 0) setCloneSourcePlantId(others[0].id);
                      setShowCloneModal(true);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copiar Rutina</span>
                  </button>
                </div>
              </div>

              {/* Controles de Configuración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                
                {/* 1. Selector de Planta */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    * Planta / Proceso
                  </label>
                  <div className="relative">
                    <select
                      value={configPlantaId}
                      onChange={(e) => setConfigPlantaId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354] appearance-none cursor-pointer"
                    >
                      {plantas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* 2. Previsualizador de Turno */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-[#7B8E90]" />
                    <span>* Previsualizar Horarios en:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={configTurnoPreview}
                      onChange={(e) => setConfigTurnoPreview(e.target.value as TurnoTipo)}
                      className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354] appearance-none cursor-pointer"
                    >
                      {(Object.keys(TURNOS_INFO) as TurnoTipo[]).map((tKey) => {
                        const t = TURNOS_INFO[tKey];
                        return (
                          <option key={tKey} value={tKey}>
                            {t.id}: {t.dias} ({t.horario})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* 3. Indicador de Estado del Editor */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    Modo del Módulo
                  </label>
                  <div className="w-full px-3 py-2.5 bg-[#324354]/10 rounded-xl border border-[#324354]/20 text-xs font-bold text-[#324354] flex items-center justify-between">
                    <span>🛠️ Modo Editor Activo</span>
                    <span className="text-[11px] bg-[#324354] text-white px-2 py-0.5 rounded-md font-semibold">
                      {configActividades.length} Actividades
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-proceso condicional para Calidad en Configuración */}
              {configPlanta?.nombre === 'Calidad' && (
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider">Sub-proceso Calidad:</span>
                  <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setConfigSubSelection('MS_FV')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        configSubSelection === 'MS_FV'
                          ? 'bg-[#324354] text-white shadow-sm'
                          : 'text-[#324354] hover:bg-white/60'
                      }`}
                    >
                      Mármol y Fibra (MS & FV)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigSubSelection('MBL_CEFI')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        configSubSelection === 'MBL_CEFI'
                          ? 'bg-[#324354] text-white shadow-sm'
                          : 'text-[#324354] hover:bg-white/60'
                      }`}
                    >
                      Muebles y CEFI (MBL & CEFI)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Banner Informativo Idéntico a Nueva Bitácora */}
            <div className="bg-[#324354] text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <Settings size={28} className="text-[#F6F3EE]" />
                </div>

                <div>
                  <div className="text-xs font-bold text-[#7B8E90] uppercase tracking-wider mb-0.5">
                    Plantilla Base · {TURNOS_INFO[configTurnoPreview]?.label}
                  </div>
                  <h3 className="text-xl font-bold mb-0.5">
                    {configPlanta?.nombre} {configPlanta?.nombre === 'Calidad' ? `(${configSubSelection === 'MS_FV' ? 'MS & FV' : 'MBL & CEFI'})` : ''}
                  </h3>
                  <p className="text-white/80 text-xs font-medium">
                    {configActividades.length} actividades estandarizadas. Los horarios se recalculan según el turno seleccionado.
                  </p>
                </div>
              </div>

              {/* Botón Añadir Actividad */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={handleOpenCreateActivity}
                  className="px-5 py-2.5 bg-[#7B8E90] hover:bg-[#6c7e80] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md hover:scale-105"
                >
                  <Plus size={15} />
                  <span>+ Añadir Actividad</span>
                </button>
              </div>
            </div>

            {/* Lista Editable con la misma estructura visual de Nueva Bitácora */}
            {loadingConfigActs ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-[#324354] mx-auto mb-2" size={36} />
                <p className="text-xs text-gray-400 font-bold">Cargando plantilla de {configPlanta?.nombre}...</p>
              </div>
            ) : configActividades.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                <Settings className="mx-auto text-gray-300 mb-3" size={44} />
                <h4 className="text-sm font-bold text-gray-700 mb-1">Esta planta no tiene actividades en su plantilla</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  Puedes crear una actividad o copiar la rutina de otra planta.
                </p>
                <button
                  onClick={handleOpenCreateActivity}
                  className="px-4 py-2 bg-[#324354] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Añadir primera actividad
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {scheduledConfigActividades.map((item, index) => {
                  const isExpanded = !!expanded[`cfg_${item.id}`];

                  return (
                    <div 
                      key={item.id || index}
                      className="bg-white rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer border border-[#e2ded5] relative"
                      onClick={() => toggleExpanded(`cfg_${item.id}`)}
                      style={{
                        borderLeft: '6px solid #324354'
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          
                          {/* Horario Dinámico */}
                          <div className="flex flex-col items-center bg-[#324354]/5 rounded-xl py-1.5 px-2.5 min-w-[95px] shrink-0 text-center">
                            <span className="text-xs font-bold text-[#324354] flex items-center gap-1">
                              <Clock size={11} />{item.calculatedHorario}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">{item.calculatedDuration} MIN</span>
                          </div>

                          {/* Título de la tarea y entregable */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-[#324354] transition-all truncate">
                              {item.actividad}
                            </h4>
                            {item.entregable && (
                              <p className="text-xs text-[#7B8E90] mt-0.5 font-medium italic">
                                Entregable: {item.entregable}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Días activos + Botones de Acción en Modo Editor */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="hidden md:flex gap-1 mr-2">
                            {['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((d, i) => {
                              const active = (item as any)[d] !== false;
                              const letters = ['L', 'M', 'X', 'J', 'V'];
                              return (
                                <span
                                  key={d}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    active ? 'bg-[#324354] text-white' : 'bg-gray-100 text-gray-300'
                                  }`}
                                >
                                  {letters[i]}
                                </span>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => handleOpenEditActivity(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354]/10 hover:bg-[#324354] text-[#324354] hover:text-white rounded-xl font-bold transition text-xs cursor-pointer"
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => handleDeleteActivityConfig(item.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Eliminar actividad"
                          >
                            <Trash2 size={15} />
                          </button>

                          <div className="text-slate-400 shrink-0 ml-1">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Detalle expandible con Procedimiento y Criterios */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-[#e2ded5] flex flex-col gap-3.5" onClick={(e) => e.stopPropagation()}>
                          {item.puntos_clave ? (
                            <div className="bg-[#324354]/5 rounded-2xl p-3.5 text-xs text-[#324354]">
                              <h5 className="font-bold mb-1.5 uppercase tracking-wider text-[11px] text-[#7B8E90]">Puntos Clave / Criterios:</h5>
                              <div className="flex flex-col gap-1 font-medium">
                                {item.puntos_clave.split('•').filter(p => p.trim()).map((point, i) => (
                                  <div key={i} className="flex gap-2 items-start">
                                    <span className="text-[#7B8E90] font-bold">•</span>
                                    <span>{point.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No hay puntos clave configurados para esta actividad.</p>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                            <span>Horario Base en Plantilla: <strong>{item.horario}</strong> ({item.tiempo_min} min)</span>
                            <button
                              onClick={() => handleOpenEditActivity(item)}
                              className="text-[#324354] font-bold underline hover:text-[#7B8E90] cursor-pointer"
                            >
                              Modificar parámetros →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Botón inferior para Añadir Actividad */}
                <div className="mt-2 text-center">
                  <button
                    onClick={handleOpenCreateActivity}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-[#324354] rounded-2xl text-xs font-bold transition cursor-pointer border-2 border-dashed border-[#324354]/30 hover:border-[#324354] flex items-center justify-center gap-2 mx-auto w-full max-w-sm shadow-sm"
                  >
                    <Plus size={16} />
                    <span>Añadir Otra Actividad</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Finalizar / Cerrar Turno */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-[#324354]/10 text-[#324354] flex items-center justify-center shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#324354]">Cierre de Turno de Bitácora</h3>
                <p className="text-xs text-gray-500">
                  {selectedPlanta?.nombre} · {TURNOS_INFO[selectedTurno]?.label}
                </p>
              </div>
            </div>

            {/* Resumen de Cumplimiento */}
            <div className="bg-[#F6F3EE] p-4 rounded-2xl mb-4 text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-600">Avance Total:</span>
                <span className="font-bold text-sm text-[#324354]">{porcentaje}% ({completadas} / {totalActividades})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-600">Fecha y Turno:</span>
                <span className="font-bold text-[#324354]">{selectedDate} ({TURNOS_INFO[selectedTurno]?.horario})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-600">Supervisor Responsable:</span>
                <span className="font-bold text-[#324354]">{selectedSupervisor?.nombre}</span>
              </div>
            </div>

            {/* Novedades o Pase de Turno */}
            <div className="mb-5 text-xs">
              <label className="font-bold text-gray-700 uppercase block mb-1">
                Novedades Generales / Pase al siguiente Turno (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Indica pendientes críticos, observaciones de máquinas o acuerdos con el siguiente supervisor..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#324354]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={closingShift}
                onClick={handleConfirmCloseShift}
                className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#324354]/90 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {closingShift ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>Confirmar Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir / Editar Actividad en Configuración */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#324354]">
                  {editingActivity ? 'Editar Actividad' : 'Añadir Actividad a la Rutina'}
                </h3>
                <p className="text-xs text-gray-500">
                  {configPlanta?.nombre} {configPlanta?.nombre === 'Calidad' ? `(${configSubSelection === 'MS_FV' ? 'MS & FV' : 'MBL & CEFI'})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActivityConfig} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 uppercase block mb-1">Nombre de la Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. VERIFICAR RECURSOS PARA EL INICIO DEL PROCESO"
                  value={activityForm.actividad || ''}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, actividad: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Horario Base (Turno 1 / 06:00) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 06:00 o 06:00-06:15"
                    value={activityForm.horario || ''}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, horario: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Duración (Minutos) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={activityForm.tiempo_min || 15}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, tiempo_min: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase block mb-1">Puntos Clave / Procedimiento</label>
                <textarea
                  rows={3}
                  placeholder="• Pasos obligatorios&#10;• Criterios de aceptación&#10;• Criterios 5S..."
                  value={activityForm.puntos_clave || ''}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, puntos_clave: e.target.value }))}
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase block mb-1">Entregable (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Tablero diligenciado / Reporte de alertas"
                  value={activityForm.entregable || ''}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, entregable: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase block mb-1">Días en que Aplica:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'lunes', label: 'Lunes' },
                    { key: 'martes', label: 'Martes' },
                    { key: 'miercoles', label: 'Miércoles' },
                    { key: 'jueves', label: 'Jueves' },
                    { key: 'viernes', label: 'Viernes' }
                  ].map(d => {
                    const active = (activityForm as any)[d.key] !== false;
                    return (
                      <label
                        key={d.key}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition text-[11px] ${
                          active
                            ? 'bg-[#324354] text-white border-[#324354]'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setActivityForm(prev => ({ ...prev, [d.key]: e.target.checked }))}
                          className="sr-only"
                        />
                        <span>{d.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingActivity}
                  className="flex-1 py-2 bg-[#324354] text-white font-bold rounded-xl hover:bg-[#324354]/90 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingActivity ? 'Guardando...' : <><Save size={14} /><span>Guardar Actividad</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Copiar Rutina desde otra Planta */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Copy size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#324354]">Importar Rutina a {configPlanta?.nombre}</h3>
                <p className="text-[11px] text-gray-500">Clonar actividades de otra planta</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Selecciona la planta origen desde la que deseas copiar actividades:
            </p>

            <div className="mb-4">
              <select
                value={cloneSourcePlantId}
                onChange={(e) => setCloneSourcePlantId(e.target.value)}
                className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
              >
                {plantas.filter(p => p.id !== configPlantaId).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingActivity || !cloneSourcePlantId}
                onClick={handleCloneRoutine}
                className="flex-1 py-2 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#324354]/90 transition cursor-pointer"
              >
                {savingActivity ? 'Copiando...' : 'Copiar Rutina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
      </footer>
    </div>
  );
}
