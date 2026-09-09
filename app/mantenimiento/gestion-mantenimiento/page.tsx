'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Undo2,
  ArrowRight,
  LogOut,
  Search,
  Wrench,
  Building2,
  Cpu,
  Layers,
  Check,
  FileSpreadsheet,
  Settings,
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  History,
  BookOpen,
  Hammer,
  Lightbulb,
  FileText,
  HelpCircle,
  FolderOpen,
  Pencil,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import * as XLSX from 'xlsx';

// Interfaces
interface Technician {
  id: number;
  name: string;
  capacity: number; // 7.2h base standard
  turno: string;
  documento?: string;
  authorizedTitles: string[];
  overloadMarginPercent?: number; // e.g. 10 for 10% extra buffer
}

interface SystemSettings {
  baseCapacity: number; // default 7.2
  defaultOverloadMargin: number; // default 10%
  warningThresholdPercent: number; // default 80%
  turnoMode: 'strict' | 'flexible';
}

interface MaintenanceTask {
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
  planta: string;
  status: 'Pendiente' | 'Incompleto' | 'Completado' | string;
  observations?: string;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
}

interface HistoryRecord {
  id?: number | string;
  'Título'?: string;
  'ESTADO'?: string;
  'TECNICO'?: string;
  'FECHA DE APERTURA'?: string;
  'FECHA DE CIERRE'?: string;
  'COMENTARIO DE EJECUCION'?: string;
  created_at?: string;
}

interface CorrectiveRecord {
  id: number | string;
  codigo: string;
  maquina: string;
  planta: string;
  sintoma: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  tecnico_asignado?: string;
  estado: 'Abierta' | 'En Proceso' | 'Resuelta';
  fecha_reporte: string;
  accion_tomada?: string;
}

type TabType = 'planificador' | 'tecnico' | 'preventivo' | 'correctivo' | 'historial' | 'configuracion' | 'indicadores';

const DAILY_CAPACITY_LIMIT = 7.2;

export default function GestionMantenimientoPage() {
  const router = useRouter();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('planificador');

  // Core Data State
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Planner View State
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceSearch, setAdvanceSearch] = useState('');

  // Preventivo (PMP) View State & Filters (Base Maestra Fija)
  const [preventivoSearch, setPreventivoSearch] = useState('');
  const [preventivoPlanta, setPreventivoPlanta] = useState('Todas');
  const [preventivoFrecuencia, setPreventivoFrecuencia] = useState('Todas');
  const [preventivoTurno, setPreventivoTurno] = useState('Todos');

  // Edit Task (Preventivo Base) State
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);

  // Historial View State & Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyEstado, setHistoryEstado] = useState('Todos');
  const [historyTecnico, setHistoryTecnico] = useState('Todos');

  // Correctivo View State & Filters
  const [correctivoSearch, setCorrectivoSearch] = useState('');
  const [correctivoPrioridad, setCorrectivoPrioridad] = useState('Todas');
  const [correctivoEstado, setCorrectivoEstado] = useState('Todos');
  const [showCorrectivoModal, setShowCorrectivoModal] = useState(false);
  const [correctiveRecords, setCorrectiveRecords] = useState<CorrectiveRecord[]>([
    {
      id: 1,
      codigo: 'CORR-0101',
      maquina: 'Prensa Hidráulica 02',
      planta: 'Mármol Sintético',
      sintoma: 'Fuga de aceite hidráulico en manguera de retorno',
      prioridad: 'Alta',
      tecnico_asignado: 'Anderson David Plata Peña',
      estado: 'En Proceso',
      fecha_reporte: '2026-09-08 08:30',
      accion_tomada: 'Ajuste de acople rápido y reemplazo de empaque O-Ring'
    },
    {
      id: 2,
      codigo: 'CORR-0102',
      maquina: 'Cabina de Pintura C-0154',
      planta: 'Mármol Sintético',
      sintoma: 'Pérdida de presión en regulador neumático secundario',
      prioridad: 'Media',
      tecnico_asignado: 'Carlos Alberto Giraldo Mazo',
      estado: 'Resuelta',
      fecha_reporte: '2026-09-07 14:15',
      accion_tomada: 'Limpieza de filtro sinterizado y purga de condensado'
    },
    {
      id: 3,
      codigo: 'CORR-0103',
      maquina: 'Sierra Escuadradora 01',
      planta: 'Muebles',
      sintoma: 'Vibración anómala en eje de disco incisor',
      prioridad: 'Alta',
      tecnico_asignado: 'Gustavo Adolfo Gonzalez Londoño',
      estado: 'Abierta',
      fecha_reporte: '2026-09-08 11:20',
      accion_tomada: 'Pendiente de inspección de rodamientos de alta velocidad'
    }
  ]);

  const [newCorrectivoForm, setNewCorrectivoForm] = useState({
    maquina: '',
    planta: 'Mármol Sintético',
    sintoma: '',
    prioridad: 'Alta' as 'Alta' | 'Media' | 'Baja',
    tecnico_asignado: '',
    accion_tomada: ''
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    baseCapacity: 7.2,
    defaultOverloadMargin: 10,
    warningThresholdPercent: 80,
    turnoMode: 'strict'
  });
  const [systemSavedFeedback, setSystemSavedFeedback] = useState(false);

  // Edit Technician State
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [showEditTechModal, setShowEditTechModal] = useState(false);

  // Helper to compute effective capacity with overload margin
  const getTechEffectiveCapacity = (tech: Technician) => {
    if (tech.id === 9999) return 999;
    const base = tech.capacity || systemSettings.baseCapacity;
    const margin = tech.overloadMarginPercent !== undefined ? tech.overloadMarginPercent : systemSettings.defaultOverloadMargin;
    return base * (1 + margin / 100);
  };

  // Technician Portal State
  const [activeTechId, setActiveTechId] = useState<number | null>(null);
  const [portalDocSearch, setPortalDocSearch] = useState('');
  const [portalError, setPortalError] = useState('');

  // Modals & Feedback
  const [showTechModal, setShowTechModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ [taskId: number]: boolean }>({});

  // Form states for manual additions
  const [newTechForm, setNewTechForm] = useState({
    id: '',
    name: '',
    turno: 'PR',
    documento: '',
    capacity: '7.2',
    overloadMarginPercent: '10'
  });

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    durationMinutes: 60,
    frecuencia: 30,
    refFrecuencia: 30,
    intervencion: 'PR',
    planta: 'Mármol Sintético',
    maquina: '',
    detalle: ''
  });

  // Debounce ref for Supabase auto-saving observations & timestamps
  const debounceTimers = useRef<{ [taskId: number]: NodeJS.Timeout }>({});

  // Normalize string for loose comparison
  const normalize = (str: string) => {
    return (str || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const getCol = (row: any, ...keys: string[]) => {
    if (!row) return '';
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const match = rowKeys.find(rk => normalize(rk) === normalize(k));
      if (match && row[match] !== undefined && row[match] !== null) {
        return row[match];
      }
    }
    return '';
  };

  const parseNumeric = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = val.toString().replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const areTurnosCompatible = (taskTurno?: string, techTurno?: string) => {
    if (!taskTurno || !techTurno) return true;
    const tTask = normalize(taskTurno);
    const tTech = normalize(techTurno);

    if (tTask.includes('prnp') || tTech.includes('prnp') || tTech.includes('general')) return true;
    if (tTask === 'pr' || tTask.includes('produccion')) {
      return tTech === 'pr' || tTech.includes('produccion') || tTech.includes('prnp');
    }
    if (tTask === 'np' || tTask.includes('paro')) {
      return tTech === 'np' || tTech.includes('paro') || tTech.includes('prnp');
    }
    return true;
  };

  const getTurnoLabel = (turno?: string) => {
    if (!turno) return 'General';
    const t = turno.toUpperCase();
    if (t === 'PR') return 'Producción (PR)';
    if (t === 'NP') return 'Paro de Planta (NP)';
    if (t === 'PRNP') return 'Producción y Paro (PRNP)';
    return turno;
  };

  const getLocalDatetimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const formatDateForSupabase = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return dateStr.replace('T', ' ') + ':00';
  };

  // 1. Check Auth & Load Local / Supabase Data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setUserEmail(session.user.email || '');
      } catch (err) {
        console.error('Auth verification failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    const savedSettings = localStorage.getItem('techflow_system_settings');
    if (savedSettings) {
      try {
        setSystemSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }
  }, [router]);

  // Fetch Supabase History Records
  const fetchHistoryRecords = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('Mantenimientos ejecutados')
        .select('*')
        .order('id', { ascending: false });
      if (!error && data) {
        setHistoryRows(data);
      }
    } catch (e) {
      console.warn('Error fetching Supabase history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch Correctivo Records from Supabase (tarjetas_falla_anomalia)
  const fetchCorrectivoRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('tarjetas_falla_anomalia')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped: CorrectiveRecord[] = data.map((d: any, index: number) => ({
          id: d.id || index + 1,
          codigo: d.codigo || `ANOM-${d.id || index + 1}`,
          maquina: d.maquina || d.equipo || 'Equipo General',
          planta: d.planta || 'Mármol Sintético',
          sintoma: d.descripcion_anomalia || d.sintoma || d.falla || 'Falla reportada',
          prioridad: (d.prioridad as any) || 'Alta',
          tecnico_asignado: d.tecnico_asignado || d.responsable || 'Por asignar',
          estado: (d.estado as any) || 'Abierta',
          fecha_reporte: d.created_at ? d.created_at.slice(0, 16).replace('T', ' ') : getLocalDatetimeString().replace('T', ' '),
          accion_tomada: d.accion_correctiva || d.observacion || ''
        }));
        setCorrectiveRecords(mapped);
      }
    } catch (e) {
      console.warn('Error fetching Supabase corrective cards:', e);
    }
  };

  // 2. Fetch Data from API / SharePoint & Supabase
  const fetchData = async (showNotification = false) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sharepoint', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        processSharePointData(json.data.mantenimientos || [], json.data.tecnicos || []);
        fetchHistoryRecords();
        fetchCorrectivoRecords();
        if (showNotification) {
          alert('¡Sincronización con SharePoint y Supabase completada exitosamente!');
        }
      } else {
        throw new Error('Respuesta inválida desde SharePoint');
      }
    } catch (err: any) {
      console.warn('Error fetching SharePoint:', err);
      const localTechs = localStorage.getItem('techflow_v2_technicians');
      const localTasks = localStorage.getItem('techflow_v2_tasks');
      if (localTechs && localTasks) {
        setTechnicians(JSON.parse(localTechs));
        setTasks(JSON.parse(localTasks));
      }
      fetchHistoryRecords();
      fetchCorrectivoRecords();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchData();
      const savedTech = sessionStorage.getItem('techflow_active_tech_id');
      if (savedTech) {
        setActiveTechId(parseInt(savedTech));
      }
    }
  }, [loading]);

  // 3. Process raw data & merge with Supabase statuses
  const processSharePointData = async (mantenimientosRaw: any[], jornadasRaw: any[]) => {
    const techMap: { [id: number]: Technician } = {};
    jornadasRaw.forEach(row => {
      const id = parseInt(getCol(row, 'ID', 'IDTECS', 'TECNICO')) || 0;
      const nombre = getCol(row, 'NOMBRE', 'TECNICO', 'NAME');
      const turno = getCol(row, 'JORNADA', 'TURNO', 'SHIFT') || 'General';
      const documento = getCol(row, 'DOCUMENTO', 'CEDULA', 'DOCUMENT');
      const tituloAutorizado = getCol(row, 'TITULO', 'TAREA', 'AUTORIZACION');

      if (id === 0 || !nombre) return;

      if (!techMap[id]) {
        techMap[id] = {
          id: id,
          name: nombre,
          capacity: DAILY_CAPACITY_LIMIT,
          turno: turno,
          documento: documento,
          authorizedTitles: []
        };
      }

      if (tituloAutorizado && !techMap[id].authorizedTitles.includes(normalize(tituloAutorizado))) {
        techMap[id].authorizedTitles.push(normalize(tituloAutorizado));
      }
    });

    // Merge with any custom technician overrides in localStorage
    let storedTechs: Technician[] = [];
    const localTechsStr = localStorage.getItem('techflow_v2_techs');
    if (localTechsStr) {
      try {
        storedTechs = JSON.parse(localTechsStr);
      } catch (e) {}
    }

    const newTechnicians = Object.values(techMap).map(t => {
      const stored = storedTechs.find(st => st.id === t.id);
      if (stored) {
        return {
          ...t,
          name: stored.name || t.name,
          turno: stored.turno || t.turno,
          documento: stored.documento || t.documento,
          capacity: stored.capacity || t.capacity,
          overloadMarginPercent: stored.overloadMarginPercent !== undefined ? stored.overloadMarginPercent : (t.overloadMarginPercent !== undefined ? t.overloadMarginPercent : 10)
        };
      }
      return {
        ...t,
        overloadMarginPercent: t.overloadMarginPercent !== undefined ? t.overloadMarginPercent : 10
      };
    });

    storedTechs.forEach(st => {
      if (!newTechnicians.find(t => t.id === st.id) && st.id !== 9999) {
        newTechnicians.push(st);
      }
    });

    if (!newTechnicians.find(t => t.id === 9999)) {
      newTechnicians.push({
        id: 9999,
        name: 'Super técnico (Reasignaciones)',
        capacity: 999,
        turno: 'General',
        authorizedTitles: []
      });
    }

    let supabaseRows: any[] = [];
    try {
      const { data, error } = await supabase.from('Mantenimientos ejecutados').select('*');
      if (!error && data) {
        supabaseRows = data;
        setHistoryRows(data);
      }
    } catch (e) {
      console.warn('Error fetching Supabase execution records:', e);
    }

    let localTasks: MaintenanceTask[] = [];
    const localTasksStr = localStorage.getItem('techflow_v2_tasks');
    if (localTasksStr) {
      try {
        localTasks = JSON.parse(localTasksStr);
      } catch (e) {}
    }

    const newTasks: MaintenanceTask[] = [];
    let taskCounter = 1;
    const techHoursMap: { [techId: number]: number } = {};
    newTechnicians.forEach(t => { techHoursMap[t.id] = 0; });

    mantenimientosRaw.forEach(row => {
      const title = getCol(row, 'TITULO', 'Titulo', 'titulo', 'TAREA', 'tarea', 'TASK');
      const tiempoMinutos = parseNumeric(getCol(row, 'TIEMPO DE EJECUCION', 'TIEMPO DE EJECUCIÓN', 'TIEMPO', 'DURACION', 'MINUTOS'));
      const maintenanceCsvId = getCol(row, 'ID', 'CONSECUTIVO', 'TICKET', 'CODIGO', 'NUMERO');
      const detalle = getCol(row, 'DETALLE', 'detalle', 'DETALLES', 'DESCRIPCION') || '';
      const maquina = getCol(row, 'MAQUINA', 'maquina', 'EQUIPO') || 'No especificada';
      const planta = getCol(row, 'PLANTA', 'planta', 'SEDE') || 'No especificada';

      const idtecsRaw = getCol(row, 'IDTECS', 'idtecs', 'TECNICOS', 'TECNICO');
      const idtecsList = idtecsRaw
        .toString()
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0);

      const tipoIntervencion = getCol(row, 'TIPO DE INTERVENCION', 'TIPO DE INTERVENCIÓN', 'INTERVENCION', 'TURNO');
      const frecuencia = parseNumeric(getCol(row, 'FRECUENCIA', 'frecuencia', 'FREQ'));
      const refFrecuencia = parseNumeric(getCol(row, 'REF FRECUENCIA', 'ref frecuencia', 'REF', 'DIAS'));

      if (!title) return;

      const isValidFrequency = refFrecuencia >= frecuencia;

      let bestCandidate: number | null = null;
      let bestErrors: string[] = [];
      let bestScore = -999;

      idtecsList.forEach(candidateId => {
        if (candidateId === 9999) return;
        const tech = newTechnicians.find(t => t.id === candidateId);
        const candidateErrors: string[] = [];

        if (!tech) {
          candidateErrors.push('tecnico_no_encontrado');
        } else {
          if (!areTurnosCompatible(tipoIntervencion, tech.turno)) {
            candidateErrors.push('turno_incorrecto');
          }
          if (!tech.authorizedTitles.includes(normalize(title))) {
            candidateErrors.push('no_autorizado');
          }
          const currentHours = techHoursMap[candidateId] || 0;
          const taskHours = tiempoMinutos / 60;
          const effectiveCap = getTechEffectiveCapacity(tech);
          if (isValidFrequency && (currentHours + taskHours) > (effectiveCap + 0.0001)) {
            candidateErrors.push('exceso_capacidad');
          }
        }

        const score = 4 - candidateErrors.length;
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidateId;
          bestErrors = candidateErrors;
        }
      });

      const techExists = newTechnicians.some(t => t.id === bestCandidate);
      if (bestCandidate === null || !techExists || (bestErrors && bestErrors.includes('exceso_capacidad'))) {
        const isExceso = bestErrors && bestErrors.includes('exceso_capacidad');
        bestCandidate = 9999;
        if (!bestErrors) bestErrors = [];
        bestErrors = bestErrors.filter(e => e !== 'exceso_capacidad');
        if (isExceso) {
          bestErrors.push('exceso_capacidad_reorganizado');
        } else if (!bestErrors.includes('requiere_asignacion_manual')) {
          bestErrors.push('requiere_asignacion_manual');
        }
      }

      const matchingLocal = localTasks.find(t => (maintenanceCsvId && t.csvId === maintenanceCsvId) || t.title === title);
      const wasAdelantada = matchingLocal ? !!matchingLocal.adelantada : false;
      const isDueFinal = isValidFrequency || wasAdelantada;
      const finalCandidate = (matchingLocal && matchingLocal.idtecs && matchingLocal.idtecs !== 9999) ? matchingLocal.idtecs : bestCandidate;

      if (isDueFinal && finalCandidate !== 9999) {
        techHoursMap[finalCandidate] = (techHoursMap[finalCandidate] || 0) + (tiempoMinutos / 60);
      }

      if (!isDueFinal) {
        bestErrors.push('frecuencia_insuficiente');
      }

      const assignedTechObj = newTechnicians.find(t => t.id === finalCandidate);
      const techTurno = assignedTechObj ? assignedTechObj.turno : '';

      const techNameStr = assignedTechObj ? assignedTechObj.name : finalCandidate.toString();
      const sRow = supabaseRows.find(r => r['Título'] === title && (r['TECNICO'] === techNameStr || r['TECNICO'] === finalCandidate.toString()));

      const finalStatus = sRow?.['ESTADO'] || matchingLocal?.status || 'Pendiente';
      const finalObs = sRow?.['COMENTARIO DE EJECUCION'] || matchingLocal?.observations || '';
      const finalApertura = sRow?.['FECHA DE APERTURA'] || matchingLocal?.fechaApertura || (finalCandidate !== 9999 ? getLocalDatetimeString() : null);
      const finalCierre = sRow?.['FECHA DE CIERRE'] || matchingLocal?.fechaCierre || null;

      newTasks.push({
        id: parseInt(maintenanceCsvId) || (Date.now() + taskCounter++),
        csvId: maintenanceCsvId || `MP-${taskCounter}`,
        code: getCol(row, 'CODIGO', 'codigo', 'TICKET') || `MP-${Math.floor(100 + Math.random() * 900)}`,
        title: title,
        durationMinutes: tiempoMinutos,
        durationHours: tiempoMinutos / 60,
        idtecs: finalCandidate,
        idtecsCandidates: idtecsList,
        tipoIntervencion: tipoIntervencion,
        techTurno: techTurno,
        frecuencia: frecuencia,
        refFrecuencia: refFrecuencia,
        errors: wasAdelantada ? bestErrors.filter(e => e !== 'frecuencia_insuficiente') : bestErrors,
        adelantada: wasAdelantada,
        isDue: isDueFinal,
        detalle: detalle,
        maquina: maquina,
        planta: planta,
        status: finalStatus,
        observations: finalObs,
        fechaApertura: finalApertura,
        fechaCierre: finalCierre
      });
    });

    setTechnicians(newTechnicians);
    setTasks(newTasks);

    if (newTechnicians.length > 0 && (selectedTechId === null || !newTechnicians.some(t => t.id === selectedTechId))) {
      setSelectedTechId(newTechnicians[0].id);
    }

    localStorage.setItem('techflow_v2_technicians', JSON.stringify(newTechnicians));
    localStorage.setItem('techflow_v2_tasks', JSON.stringify(newTasks));
  };

  const persistState = (updatedTasks: MaintenanceTask[], updatedTechs: Technician[]) => {
    setTasks(updatedTasks);
    setTechnicians(updatedTechs);
    localStorage.setItem('techflow_v2_tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('techflow_v2_technicians', JSON.stringify(updatedTechs));
    localStorage.setItem('techflow_v2_techs', JSON.stringify(updatedTechs));
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    let currentTask: MaintenanceTask | null = null;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const item = { ...t, status: newStatus };
        if (newStatus === 'Completado' && !item.fechaCierre) {
          item.fechaCierre = getLocalDatetimeString();
        }
        if (newStatus === 'Completado') {
          item.refFrecuencia = 0;
          item.isDue = false;
        }
        currentTask = item;
        return item;
      }
      return t;
    });

    persistState(updated, technicians);

    if (currentTask) {
      const task = currentTask as MaintenanceTask;
      const tech = technicians.find(t => t.id === task.idtecs);
      const techName = tech ? tech.name : 'Super técnico';

      try {
        await supabase.from('Mantenimientos ejecutados').upsert({
          'Título': task.title,
          'ESTADO': task.status,
          'TECNICO': techName,
          'FECHA DE APERTURA': formatDateForSupabase(task.fechaApertura),
          'FECHA DE CIERRE': formatDateForSupabase(task.fechaCierre),
          'COMENTARIO DE EJECUCION': task.observations || ''
        }, { onConflict: 'Título,TECNICO' });

        setSaveFeedback(prev => ({ ...prev, [taskId]: true }));
        fetchHistoryRecords();
        setTimeout(() => {
          setSaveFeedback(prev => ({ ...prev, [taskId]: false }));
        }, 2000);
      } catch (err) {
        console.error('Error actualizando estado en Supabase:', err);
      }
    }
  };

  const handleUpdateDetails = (taskId: number, obs: string, fechaApertura: string | null, fechaCierre: string | null) => {
    let currentTask: MaintenanceTask | null = null;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const item = {
          ...t,
          observations: obs,
          fechaApertura: fechaApertura,
          fechaCierre: fechaCierre
        };
        currentTask = item;
        return item;
      }
      return t;
    });

    persistState(updated, technicians);

    if (debounceTimers.current[taskId]) {
      clearTimeout(debounceTimers.current[taskId]);
    }

    debounceTimers.current[taskId] = setTimeout(async () => {
      if (!currentTask) return;
      const task = currentTask as MaintenanceTask;
      const tech = technicians.find(t => t.id === task.idtecs);
      const techName = tech ? tech.name : 'Super técnico';

      try {
        await supabase.from('Mantenimientos ejecutados').upsert({
          'Título': task.title,
          'ESTADO': task.status || 'Pendiente',
          'TECNICO': techName,
          'FECHA DE APERTURA': formatDateForSupabase(task.fechaApertura),
          'FECHA DE CIERRE': formatDateForSupabase(task.fechaCierre),
          'COMENTARIO DE EJECUCION': task.observations || ''
        }, { onConflict: 'Título,TECNICO' });

        setSaveFeedback(prev => ({ ...prev, [taskId]: true }));
        fetchHistoryRecords();
        setTimeout(() => {
          setSaveFeedback(prev => ({ ...prev, [taskId]: false }));
        }, 2500);
      } catch (err) {
        console.error('Error guardando detalles en Supabase:', err);
      }
    }, 800);
  };

  const handleAssignTask = async (taskId: number, techId: number, forceAdvance = false, stayOnCurrentTech = false) => {
    const assignedTech = technicians.find(t => t.id === techId);
    let assignedTask: MaintenanceTask | null = null;

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const isAdvance = forceAdvance || t.adelantada || (!t.isDue && techId !== 9999);
        const isDue = isAdvance || (t.refFrecuencia >= t.frecuencia);

        let errors = t.errors.filter(e =>
          e !== 'tecnico_no_encontrado' &&
          e !== 'turno_incorrecto' &&
          e !== 'no_autorizado' &&
          e !== 'exceso_capacidad' &&
          e !== 'requiere_asignacion_manual' &&
          e !== 'exceso_capacidad_reorganizado' &&
          (isDue ? e !== 'frecuencia_insuficiente' : true)
        );

        if (!isDue && !errors.includes('frecuencia_insuficiente')) {
          errors.push('frecuencia_insuficiente');
        }

        if (assignedTech && assignedTech.id !== 9999) {
          if (!areTurnosCompatible(t.tipoIntervencion, assignedTech.turno)) {
            errors.push('turno_incorrecto');
          }
          if (!assignedTech.authorizedTitles.includes(normalize(t.title))) {
            errors.push('no_autorizado');
          }
          const currentTechHours = tasks
            .filter(other => other.idtecs === techId && other.id !== taskId && other.isDue)
            .reduce((sum, other) => sum + other.durationHours, 0);
          const effectiveCap = getTechEffectiveCapacity(assignedTech);
          if (isDue && (currentTechHours + t.durationHours) > (effectiveCap + 0.0001)) {
            errors.push('exceso_capacidad');
          }
        } else if (!assignedTech || techId === 9999) {
          errors.push('tecnico_no_encontrado');
        }

        const newFechaApertura = t.fechaApertura ? t.fechaApertura : getLocalDatetimeString();

        assignedTask = {
          ...t,
          idtecs: techId,
          adelantada: isAdvance,
          isDue: isDue,
          errors: errors,
          fechaApertura: newFechaApertura
        };
        return assignedTask;
      }
      return t;
    });

    persistState(updated, technicians);
    if (!stayOnCurrentTech && techId !== 9999) setSelectedTechId(techId);

    if (assignedTask && assignedTech && assignedTech.id !== 9999) {
      const task = assignedTask as MaintenanceTask;
      try {
        await supabase.from('Mantenimientos ejecutados').upsert({
          'Título': task.title,
          'ESTADO': task.status || 'Pendiente',
          'TECNICO': assignedTech.name,
          'FECHA DE APERTURA': formatDateForSupabase(task.fechaApertura)
        }, { onConflict: 'Título,TECNICO' });
        fetchHistoryRecords();
      } catch (err) {
        console.error('Error al registrar asignación en Supabase:', err);
      }
    }
  };

  const handleToggleAdvance = (taskId: number, isChecked: boolean) => {
    let assignedTechId: number | null = null;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const isDue = isChecked || (t.refFrecuencia >= t.frecuencia);
        let errors = t.errors.filter(e => e !== 'frecuencia_insuficiente');
        if (!isDue) {
          errors.push('frecuencia_insuficiente');
        }
        if (isChecked && t.idtecs && t.idtecs !== 9999 && technicians.some(tech => tech.id === t.idtecs && tech.id !== 9999)) {
          assignedTechId = t.idtecs;
          errors = errors.filter(e => e !== 'tecnico_no_encontrado' && e !== 'requiere_asignacion_manual');
        }
        return {
          ...t,
          adelantada: isChecked,
          isDue: isDue,
          errors: errors,
          fechaApertura: isChecked && !t.fechaApertura ? getLocalDatetimeString() : t.fechaApertura
        };
      }
      return t;
    });

    persistState(updated, technicians);
    if (assignedTechId) setSelectedTechId(assignedTechId);
  };

  const handleUnassignTask = (taskId: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const isDue = t.refFrecuencia >= t.frecuencia;
        let errors = ['tecnico_no_encontrado'].concat(
          t.errors.filter(e => e !== 'turno_incorrecto' && e !== 'no_autorizado' && e !== 'tecnico_no_encontrado' && e !== 'frecuencia_insuficiente')
        );
        if (!isDue) errors.push('frecuencia_insuficiente');
        return {
          ...t,
          idtecs: 9999,
          adelantada: false,
          isDue: isDue,
          errors: errors
        };
      }
      return t;
    });
    persistState(updated, technicians);
  };

  const handleDeleteTech = (techId: number) => {
    const current = technicians.find(t => t.id === techId);
    if (!current) return;
    if (confirm(`¿Estás seguro de quitar a "${current.name}" de la jornada de hoy? Sus tareas volverán al pool general.`)) {
      const updatedTasks = tasks.map(t =>
        t.idtecs === techId
          ? {
              ...t,
              idtecs: 9999,
              errors: ['tecnico_no_encontrado'].concat(t.errors.filter(e => e !== 'tecnico_no_encontrado'))
            }
          : t
      );
      const updatedTechs = technicians.filter(t => t.id !== techId);
      persistState(updatedTasks, updatedTechs);
      if (selectedTechId === techId) {
        setSelectedTechId(updatedTechs.length > 0 ? updatedTechs[0].id : null);
      }
    }
  };

  const handleAddTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(newTechForm.id) || Date.now();
    const name = newTechForm.name.trim();
    if (!name) return;

    const newTech: Technician = {
      id: id,
      name: name,
      turno: newTechForm.turno,
      documento: newTechForm.documento.trim() || undefined,
      capacity: parseFloat(newTechForm.capacity) || systemSettings.baseCapacity,
      overloadMarginPercent: parseFloat(newTechForm.overloadMarginPercent) || systemSettings.defaultOverloadMargin,
      authorizedTitles: []
    };

    const updatedTechs = [...technicians.filter(t => t.id !== 9999), newTech];
    const superTech = technicians.find(t => t.id === 9999);
    if (superTech) updatedTechs.push(superTech);

    persistState(tasks, updatedTechs);
    setSelectedTechId(id);
    setShowTechModal(false);
    setNewTechForm({ id: '', name: '', turno: 'PR', documento: '', capacity: '7.2', overloadMarginPercent: '10' });
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const newTask: MaintenanceTask = {
      id: Date.now(),
      csvId: `MP-MAN-${Math.floor(100 + Math.random() * 900)}`,
      code: `MP-${Math.floor(100 + Math.random() * 900)}`,
      title: newTaskForm.title.trim(),
      durationMinutes: newTaskForm.durationMinutes,
      durationHours: newTaskForm.durationMinutes / 60,
      idtecs: 9999,
      idtecsCandidates: [],
      tipoIntervencion: newTaskForm.intervencion,
      frecuencia: newTaskForm.frecuencia,
      refFrecuencia: newTaskForm.refFrecuencia,
      errors: newTaskForm.refFrecuencia >= newTaskForm.frecuencia ? ['tecnico_no_encontrado'] : ['frecuencia_insuficiente', 'tecnico_no_encontrado'],
      adelantada: false,
      isDue: newTaskForm.refFrecuencia >= newTaskForm.frecuencia,
      detalle: newTaskForm.detalle.trim(),
      maquina: newTaskForm.maquina.trim() || 'General',
      planta: newTaskForm.planta.trim() || 'Mármol Sintético',
      status: 'Pendiente',
      observations: '',
      fechaApertura: null,
      fechaCierre: null
    };

    const updatedTasks = [newTask, ...tasks];
    persistState(updatedTasks, technicians);
    setShowTaskModal(false);
    setNewTaskForm({
      title: '',
      durationMinutes: 60,
      frecuencia: 30,
      refFrecuencia: 30,
      intervencion: 'PR',
      planta: 'Mármol Sintético',
      maquina: '',
      detalle: ''
    });
  };

  // Preventivo Task Edit & Delete Handlers
  const handleOpenEditTask = (task: MaintenanceTask) => {
    setEditingTask({ ...task });
    setShowEditTaskModal(true);
  };

  const handleSaveTaskEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const durHours = (editingTask.durationMinutes || 60) / 60;
    const isDue = editingTask.adelantada || (editingTask.refFrecuencia >= editingTask.frecuencia);

    const updatedTask: MaintenanceTask = {
      ...editingTask,
      durationHours: durHours,
      isDue: isDue
    };

    const updatedTasks = tasks.map(t => (t.id === editingTask.id ? updatedTask : t));
    persistState(updatedTasks, technicians);
    setShowEditTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: number) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    if (confirm(`¿Estás seguro de eliminar el mantenimiento "${taskToDelete.title}" de la base maestra de programación?`)) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      persistState(updatedTasks, technicians);
    }
  };

  // Corrective Add Handler
  const handleAddCorrectivoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorrectivoForm.maquina.trim() || !newCorrectivoForm.sintoma.trim()) return;

    const newRecord: CorrectiveRecord = {
      id: Date.now(),
      codigo: `CORR-${Math.floor(1000 + Math.random() * 9000)}`,
      maquina: newCorrectivoForm.maquina.trim(),
      planta: newCorrectivoForm.planta,
      sintoma: newCorrectivoForm.sintoma.trim(),
      prioridad: newCorrectivoForm.prioridad,
      tecnico_asignado: newCorrectivoForm.tecnico_asignado || 'Por asignar',
      estado: 'Abierta',
      fecha_reporte: getLocalDatetimeString().replace('T', ' '),
      accion_tomada: newCorrectivoForm.accion_tomada.trim()
    };

    setCorrectiveRecords([newRecord, ...correctiveRecords]);
    setShowCorrectivoModal(false);
    setNewCorrectivoForm({
      maquina: '',
      planta: 'Mármol Sintético',
      sintoma: '',
      prioridad: 'Alta',
      tecnico_asignado: '',
      accion_tomada: ''
    });

    try {
      await supabase.from('tarjetas_falla_anomalia').insert({
        equipo: newRecord.maquina,
        planta: newRecord.planta,
        descripcion_anomalia: newRecord.sintoma,
        prioridad: newRecord.prioridad,
        tecnico_asignado: newRecord.tecnico_asignado,
        estado: newRecord.estado,
        accion_correctiva: newRecord.accion_tomada
      });
    } catch (err) {
      console.warn('Error guardando correctivo en Supabase:', err);
    }
  };

  // Edit Technician Handlers
  const handleOpenEditTech = (tech: Technician) => {
    setEditingTech({ ...tech });
    setShowEditTechModal(true);
  };

  const handleSaveTechEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;

    const updatedTechs = technicians.map(t => (t.id === editingTech.id ? editingTech : t));
    persistState(tasks, updatedTechs);
    setShowEditTechModal(false);
    setEditingTech(null);
  };

  // System Settings Handler
  const handleSaveSystemSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('techflow_system_settings', JSON.stringify(systemSettings));
    setSystemSavedFeedback(true);
    setTimeout(() => setSystemSavedFeedback(false), 3000);
  };

  // Portal Login Handler
  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const query = normalize(portalDocSearch);
    if (!query) return;

    const found = technicians.find(t =>
      (t.documento && normalize(t.documento) === query) ||
      t.id.toString() === query ||
      normalize(t.name).includes(query)
    );

    if (found) {
      setActiveTechId(found.id);
      sessionStorage.setItem('techflow_active_tech_id', found.id.toString());
      setPortalError('');
      setPortalDocSearch('');
    } else {
      setPortalError('No se encontró ningún técnico con esa identificación o ID.');
    }
  };

  // Memoized Planner Calculations
  const filteredTechs = useMemo(() => {
    if (!searchQuery.trim()) return technicians;
    const q = normalize(searchQuery);
    return technicians.filter(t =>
      normalize(t.name).includes(q) ||
      t.id.toString().includes(q) ||
      normalize(t.turno).includes(q)
    );
  }, [technicians, searchQuery]);

  const currentSelectedTech = useMemo(() => {
    return technicians.find(t => t.id === selectedTechId) || null;
  }, [technicians, selectedTechId]);

  const selectedTechTasks = useMemo(() => {
    if (!selectedTechId) return [];
    return tasks.filter(t => t.idtecs === selectedTechId && t.isDue);
  }, [tasks, selectedTechId]);

  const waitingTasks = useMemo(() => {
    return tasks.filter(t => t.idtecs === 9999);
  }, [tasks]);

  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.isDue && t.idtecs !== 9999);
  }, [tasks]);

  const conflictedTasks = useMemo(() => {
    return tasks.filter(t => t.errors.length > 0 && t.isDue);
  }, [tasks]);

  const hasOverload = useMemo(() => {
    return technicians.some(tech => {
      if (tech.id === 9999) return false;
      const totalHours = tasks
        .filter(t => t.idtecs === tech.id && t.isDue)
        .reduce((sum, t) => sum + t.durationHours, 0);
      return totalHours > getTechEffectiveCapacity(tech);
    });
  }, [technicians, tasks, systemSettings]);

  // Preventivo (PMP) Memoized Calculations & Filtered Data
  const plantOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.planta && t.planta.trim() !== '' && t.planta !== 'Todas') set.add(t.planta); });
    return ['Todas', ...Array.from(set)];
  }, [tasks]);

  const frecuenciaOptions = useMemo(() => {
    const set = new Set<number>();
    tasks.forEach(t => { if (t.frecuencia) set.add(t.frecuencia); });
    return ['Todas', ...Array.from(set).sort((a, b) => a - b).map(f => `${f}d`)];
  }, [tasks]);

  const filteredPreventivoTasks = useMemo(() => {
    return tasks.filter(task => {
      if (preventivoSearch.trim()) {
        const q = normalize(preventivoSearch);
        const matches =
          normalize(task.title).includes(q) ||
          normalize(task.code).includes(q) ||
          normalize(task.csvId).includes(q) ||
          normalize(task.maquina).includes(q) ||
          normalize(task.detalle).includes(q) ||
          normalize(task.planta).includes(q);
        if (!matches) return false;
      }

      if (preventivoPlanta !== 'Todas' && task.planta !== preventivoPlanta) {
        return false;
      }

      if (preventivoFrecuencia !== 'Todas') {
        const freqNum = parseInt(preventivoFrecuencia.replace('d', ''));
        if (task.frecuencia !== freqNum) return false;
      }

      if (preventivoTurno !== 'Todos') {
        const tInter = normalize(task.tipoIntervencion || '');
        const pTurno = normalize(preventivoTurno);
        if (!tInter.includes(pTurno) && !pTurno.includes(tInter)) return false;
      }

      return true;
    });
  }, [tasks, preventivoSearch, preventivoPlanta, preventivoFrecuencia, preventivoTurno]);

  // Historial Memoized Filtered Records
  const filteredHistoryRows = useMemo(() => {
    return historyRows.filter(row => {
      if (historySearch.trim()) {
        const q = normalize(historySearch);
        const matchTitle = normalize(row['Título'] || '').includes(q);
        const matchTech = normalize(row['TECNICO'] || '').includes(q);
        const matchObs = normalize(row['COMENTARIO DE EJECUCION'] || '').includes(q);
        if (!matchTitle && !matchTech && !matchObs) return false;
      }

      if (historyEstado !== 'Todos') {
        if ((row['ESTADO'] || 'Pendiente') !== historyEstado) return false;
      }

      if (historyTecnico !== 'Todos') {
        if ((row['TECNICO'] || '') !== historyTecnico) return false;
      }

      return true;
    });
  }, [historyRows, historySearch, historyEstado, historyTecnico]);

  // Correctivo Filtered Records
  const filteredCorrectivos = useMemo(() => {
    return correctiveRecords.filter(c => {
      if (correctivoSearch.trim()) {
        const q = normalize(correctivoSearch);
        const matches =
          normalize(c.codigo).includes(q) ||
          normalize(c.maquina).includes(q) ||
          normalize(c.sintoma).includes(q) ||
          normalize(c.tecnico_asignado || '').includes(q);
        if (!matches) return false;
      }

      if (correctivoPrioridad !== 'Todas' && c.prioridad !== correctivoPrioridad) {
        return false;
      }

      if (correctivoEstado !== 'Todos' && c.estado !== correctivoEstado) {
        return false;
      }

      return true;
    });
  }, [correctiveRecords, correctivoSearch, correctivoPrioridad, correctivoEstado]);

  // Excel Export for Preventivo
  const handleDownloadPreventivoExcel = () => {
    if (filteredPreventivoTasks.length === 0) {
      alert('No hay datos en el plan preventivo para exportar con los filtros actuales.');
      return;
    }

    try {
      const dataToExport = filteredPreventivoTasks.map(t => {
        const tech = technicians.find(tc => tc.id === t.idtecs);
        return {
          'Código': t.csvId || t.code,
          'Mantenimiento / Tarea': t.title,
          'Planta': t.planta,
          'Máquina / Equipo': t.maquina,
          'Frecuencia (Días)': t.frecuencia,
          'Ref. Días (Actual)': t.refFrecuencia,
          'Duración (Min)': t.durationMinutes,
          'Duración (Hrs)': Number(t.durationHours.toFixed(2)),
          'Turno Requerido': t.tipoIntervencion || 'General',
          'Técnico Asignado': tech ? tech.name : 'Super técnico (Pool)',
          'Estado': t.status || 'Pendiente',
          'Adelantada': t.adelantada ? 'Sí' : 'No',
          'Al Día (Due)': t.isDue ? 'Sí' : 'No',
          'Fecha Apertura': t.fechaApertura ? t.fechaApertura.replace('T', ' ') : '',
          'Fecha Cierre': t.fechaCierre ? t.fechaCierre.replace('T', ' ') : '',
          'Observaciones / Detalle': t.observations || t.detalle || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Preventivo PMP');

      const colWidths = Object.keys(dataToExport[0]).map(key => ({
        wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Plan_Preventivo_PMP_FIRPLAK_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exportando preventivo a Excel:', err);
      alert('Hubo un error al generar el archivo Excel.');
    }
  };

  // Excel Export for Historial
  const handleDownloadHistorialExcel = () => {
    if (filteredHistoryRows.length === 0) {
      alert('No hay registros en el historial para exportar.');
      return;
    }

    try {
      const dataToExport = filteredHistoryRows.map((r, index) => ({
        '#': index + 1,
        'Mantenimiento': r['Título'] || '',
        'Técnico Responsable': r['TECNICO'] || '',
        'Estado': r['ESTADO'] || 'Pendiente',
        'Fecha Apertura': r['FECHA DE APERTURA'] || '',
        'Fecha Cierre': r['FECHA DE CIERRE'] || '',
        'Comentarios / Observaciones': r['COMENTARIO DE EJECUCION'] || ''
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial Mantenimientos');

      const colWidths = Object.keys(dataToExport[0]).map(key => ({
        wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Historial_Ejecuciones_FIRPLAK_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exportando historial a Excel:', err);
      alert('Hubo un error al generar el archivo Excel de historial.');
    }
  };

  // Excel Export for Correctivo
  const handleDownloadCorrectivoExcel = () => {
    if (filteredCorrectivos.length === 0) {
      alert('No hay registros correctivos para exportar.');
      return;
    }

    try {
      const dataToExport = filteredCorrectivos.map(c => ({
        'Código': c.codigo,
        'Equipo / Máquina': c.maquina,
        'Planta': c.planta,
        'Síntoma / Falla': c.sintoma,
        'Prioridad': c.prioridad,
        'Técnico Asignado': c.tecnico_asignado || 'Sin asignar',
        'Estado': c.estado,
        'Fecha Reporte': c.fecha_reporte,
        'Acción Correctiva': c.accion_tomada || ''
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Correctivos');

      const colWidths = Object.keys(dataToExport[0]).map(key => ({
        wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Mantenimientos_Correctivos_FIRPLAK_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exportando correctivos a Excel:', err);
      alert('Hubo un error al generar el archivo Excel.');
    }
  };

  // Portal Technician Object
  const currentPortalTech = useMemo(() => {
    return technicians.find(t => t.id === activeTechId) || null;
  }, [technicians, activeTechId]);

  const portalTechTasks = useMemo(() => {
    if (!activeTechId) return [];
    return tasks.filter(t => t.idtecs === activeTechId && t.isDue);
  }, [tasks, activeTechId]);

  // SubHeader Navigation Items matching FIRPLAK Pattern
  const subNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'planificador', label: 'Planificador', icon: <Layers size={16} /> },
    { id: 'tecnico', label: 'Portal Técnicos', icon: <User size={16} /> },
    { id: 'preventivo', label: 'Preventivo (PMP)', icon: <FileSpreadsheet size={16} /> },
    { id: 'correctivo', label: 'Correctivo', icon: <AlertTriangle size={16} /> },
    { id: 'historial', label: 'Historial', icon: <History size={16} /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings size={16} /> },
    { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#324354] animate-spin" />
          <span className="text-[#324354] font-bold text-sm">Cargando Gestor de Mantenimiento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-[#000000] font-sans flex flex-col selection:bg-[#324354] selection:text-white pb-16">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-slate-100/50 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#324354]/5 blur-[120px]"></div>
      </div>

      {/* Main Top Header */}
      <Header
        title="Mantenimiento"
        subtitle="Gestión de Mantenimiento y Asignación de Técnicos"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      {/* SubHeader with Main Functions matching FIRPLAK System */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-white border-b border-[#e2ded5] py-2 px-3 shadow-xs font-sans">
        <div className="max-w-[1700px] mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
          {subNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'historial') {
                    fetchHistoryRecords();
                  }
                  if (item.id === 'correctivo') {
                    fetchCorrectivoRecords();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 flex-1 flex flex-col gap-5">

        {/* ========================================================================= */}
        {/* VIEW 1: PLANIFICADOR (ADMIN PLANNER DASHBOARD) */}
        {/* ========================================================================= */}
        {activeTab === 'planificador' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#324354] flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#324354]">{technicians.filter(t => t.id !== 9999).length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Técnicos Jornada</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{activeTasks.length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Programadas Hoy</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600">{waitingTasks.length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">En Espera / Pool</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-rose-600">{conflictedTasks.length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Con Observación</div>
                </div>
              </div>
            </div>

            {/* Action Row - Sincronizar SharePoint (Positioned right below 4th KPI card) */}
            <div className="flex items-center justify-end -mt-1">
              <button
                onClick={() => fetchData(true)}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#324354] text-[#324354] hover:bg-[#324354] hover:text-white font-bold rounded-xl text-xs transition-all duration-200 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Sincronizar tareas desde SharePoint"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Sincronizando...' : 'Sincronizar SharePoint'}</span>
              </button>
            </div>

            {/* Main Planner Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Technicians List (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#324354]">Técnicos de la Jornada</h2>
                  <button
                    onClick={() => setShowTechModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354]/10 hover:bg-[#324354] text-[#324354] hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Técnico</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar técnico por nombre, ID o turno..."
                    className="w-full pl-10 pr-4 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs sm:text-sm focus:outline-none focus:border-[#324354] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
                  {filteredTechs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No se encontraron técnicos para la búsqueda.
                    </div>
                  ) : (
                    filteredTechs.map(tech => {
                      const totalHours = tasks
                        .filter(t => t.idtecs === tech.id && t.isDue)
                        .reduce((sum, t) => sum + t.durationHours, 0);
                      const activeCount = tasks.filter(t => t.idtecs === tech.id && t.isDue).length;
                      const effCap = getTechEffectiveCapacity(tech);
                      const margin = tech.overloadMarginPercent !== undefined ? tech.overloadMarginPercent : systemSettings.defaultOverloadMargin;
                      const warnLimit = effCap * (systemSettings.warningThresholdPercent / 100);
                      const percentage = Math.min((totalHours / effCap) * 100, 100);
                      const isOverloaded = totalHours > effCap;
                      const isSelected = selectedTechId === tech.id;

                      let barColor = 'bg-[#59a96a]';
                      if (totalHours > warnLimit && totalHours <= effCap) barColor = 'bg-[#deb841]';
                      if (totalHours > effCap) barColor = 'bg-[#d14747]';

                      return (
                        <div
                          key={tech.id}
                          onClick={() => setSelectedTechId(tech.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                            isSelected
                              ? 'bg-[#324354]/5 border-[#324354] shadow-md ring-1 ring-[#324354]'
                              : 'bg-white hover:bg-slate-50 border-[#e2ded5]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-sm sm:text-base text-[#324354] flex items-center gap-2">
                                <span>{tech.name}</span>
                                {tech.id === 9999 && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">POOL</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Turno: <strong>{getTurnoLabel(tech.turno)}</strong> · ID: {tech.id}
                              </div>
                              {tech.id !== 9999 && margin > 0 && (
                                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                  Buffer extra: +{margin}% ({tech.capacity || systemSettings.baseCapacity}h base)
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-sm ${isOverloaded ? 'text-rose-600' : 'text-[#324354]'}`}>
                                {totalHours.toFixed(1)}h
                                <span className="text-xs text-gray-400 font-normal"> / {tech.id === 9999 ? '∞' : `${effCap.toFixed(1)}h`}</span>
                              </div>
                              <div className="text-[11px] text-gray-400">{activeCount} tareas</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {tech.id !== 9999 && (
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Selected Technician Details & Tasks (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] flex flex-col gap-5 min-h-[500px]">
                {currentSelectedTech ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e2ded5]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-[#324354]">{currentSelectedTech.name}</h2>
                          {currentSelectedTech.id === 9999 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">POOL DE ESPERA</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Turno: <strong>{getTurnoLabel(currentSelectedTech.turno)}</strong> · ID: {currentSelectedTech.id} {currentSelectedTech.documento ? `· Cédula: ${currentSelectedTech.documento}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#324354]">
                            {selectedTechTasks.reduce((sum, t) => sum + t.durationHours, 0).toFixed(1)}h
                            <span className="text-xs text-gray-400 font-normal"> / {currentSelectedTech.id === 9999 ? '∞' : `${getTechEffectiveCapacity(currentSelectedTech).toFixed(1)}h`}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {currentSelectedTech.id !== 9999
                              ? `${Math.round((selectedTechTasks.reduce((sum, t) => sum + t.durationHours, 0) / getTechEffectiveCapacity(currentSelectedTech)) * 100)}% ocupado hoy`
                              : `${selectedTechTasks.length} tareas en espera`}
                          </div>
                        </div>

                        {currentSelectedTech.id !== 9999 && (
                          <button
                            onClick={() => handleDeleteTech(currentSelectedTech.id)}
                            title="Quitar técnico de la jornada de hoy"
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Task Actions Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-[#324354] uppercase tracking-wider">
                        {currentSelectedTech.id === 9999 ? 'Tareas en Espera / Pool' : `Mantenimientos a Ejecutar Hoy (${selectedTechTasks.length})`}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAdvanceModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adelantar Mantenimientos</span>
                        </button>
                        <button
                          onClick={() => setShowTaskModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-[#324354] hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Mantenimiento Manual</span>
                        </button>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1">
                      {selectedTechTasks.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-10 h-10 text-gray-300" />
                          <span>No hay mantenimientos programados para este técnico hoy.</span>
                          <span className="text-xs">Usa el botón "Adelantar Mantenimientos" para asignarle tareas adicionales.</span>
                        </div>
                      ) : (
                        selectedTechTasks.map(task => {
                          const hasAlert = task.errors.length > 0;
                          return (
                            <div
                              key={task.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                                hasAlert
                                  ? 'bg-amber-50/40 border-amber-300'
                                  : 'bg-[#F6F3EE]/50 border-[#e2ded5] hover:border-[#324354]'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="px-2 py-0.5 bg-[#324354] text-white text-[11px] font-bold rounded-md shrink-0">
                                      #{task.csvId || task.code}
                                    </span>
                                    <span className="font-bold text-[#324354] text-sm sm:text-base leading-snug">{task.title}</span>
                                  </div>

                                  <div className="text-xs text-gray-600 flex items-center gap-3 flex-wrap mt-1">
                                    <span className="flex items-center gap-1 text-[#324354] font-semibold">
                                      <Clock className="w-3.5 h-3.5 text-[#7B8E90]" />
                                      {task.durationMinutes} min ({task.durationHours.toFixed(1)}h)
                                    </span>
                                    <span>· Frecuencia: {task.frecuencia}d (Ref: {task.refFrecuencia}d)</span>
                                    <span className="font-medium text-[#324354]">🏭 {task.planta}</span>
                                    <span className="font-medium text-[#324354]">⚙️ {task.maquina}</span>
                                  </div>

                                  {task.detalle && (
                                    <div className="mt-2 text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-gray-200">
                                      <strong className="text-[#324354]">Detalle:</strong> {task.detalle}
                                    </div>
                                  )}

                                  {/* Badges */}
                                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                                    {task.adelantada && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">
                                        ⚡ Validación Adelantada
                                      </span>
                                    )}
                                    {task.errors.includes('turno_incorrecto') && (
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                                        ⚠️ Turno Diferente ({task.tipoIntervencion})
                                      </span>
                                    )}
                                    {task.errors.includes('no_autorizado') && (
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                                        ⚠️ No Autorizado
                                      </span>
                                    )}
                                    {task.errors.includes('exceso_capacidad_reorganizado') && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                                        ⚠️ Reasignado por Capacidad (&gt;7.2h)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
                                  {/* Status Selector */}
                                  <select
                                    value={task.status || 'Pendiente'}
                                    onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                                    className="w-28 sm:w-32 px-2.5 py-1 rounded-lg border border-[#e2ded5] bg-white text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354] shadow-xs cursor-pointer"
                                  >
                                    <option value="Pendiente">⏳ Pendiente</option>
                                    <option value="Incompleto">⚠️ Incompleto</option>
                                    <option value="Completado">✅ Completado</option>
                                  </select>

                                  {currentSelectedTech.id === 9999 ? (
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (e.target.value) handleAssignTask(task.id, parseInt(e.target.value), true);
                                      }}
                                      className="w-28 sm:w-32 px-2 py-1 rounded-lg border border-purple-300 bg-purple-50 text-xs font-bold text-purple-800 focus:outline-none cursor-pointer truncate"
                                    >
                                      <option value="">Asignar a...</option>
                                      {technicians.filter(t => t.id !== 9999).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="flex flex-col sm:items-end gap-1 shrink-0">
                                      <button
                                        onClick={() => handleUnassignTask(task.id)}
                                        title="Devolver al Pool de espera"
                                        className="text-[11px] text-gray-500 hover:text-[#324354] flex items-center gap-1 py-0.5 px-1.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Undo2 className="w-3 h-3" />
                                        <span>Devolver</span>
                                      </button>
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleAssignTask(task.id, parseInt(e.target.value), true, true);
                                            e.target.value = "";
                                          }
                                        }}
                                        className="w-28 sm:w-32 px-2 py-1 rounded-lg border border-[#324354]/20 bg-white hover:bg-[#F6F3EE] text-[11px] font-semibold text-[#324354] focus:outline-none focus:border-[#324354] transition-all cursor-pointer truncate shadow-xs"
                                        title="Reasignar a otro técnico"
                                      >
                                        <option value="" disabled>⇄ Reasignar...</option>
                                        {technicians
                                          .filter(t => t.id !== currentSelectedTech.id && t.id !== 9999)
                                          .map(t => (
                                            <option key={t.id} value={t.id}>
                                              {t.name} ({getTurnoLabel(t.turno)})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Dates & Observations */}
                              <div className="pt-2 border-t border-gray-200/60 flex flex-col gap-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Fecha Apertura:</label>
                                    <input
                                      type="datetime-local"
                                      value={task.fechaApertura || ''}
                                      onChange={(e) => handleUpdateDetails(task.id, task.observations || '', e.target.value, task.fechaCierre || null)}
                                      className="w-full px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Fecha Cierre:</label>
                                    <input
                                      type="datetime-local"
                                      value={task.fechaCierre || ''}
                                      onChange={(e) => handleUpdateDetails(task.id, task.observations || '', task.fechaApertura || null, e.target.value)}
                                      className="w-full px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <textarea
                                    value={task.observations || ''}
                                    onChange={(e) => handleUpdateDetails(task.id, e.target.value, task.fechaApertura || null, task.fechaCierre || null)}
                                    placeholder="Observaciones de ejecución del mantenimiento..."
                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs resize-y min-h-[40px] focus:outline-none focus:border-[#324354]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    Selecciona un técnico de la lista izquierda para gestionar su agenda.
                  </div>
                )}
              </div>
            </div>

            {/* Advance Pool Modal */}
            {showAdvanceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#e2ded5] flex flex-col gap-4 max-h-[85vh]">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#324354]">Pool de Mantenimientos para Adelantar</h3>
                      <p className="text-xs text-gray-500">Mantenimientos cuya frecuencia aún no se cumple, pero que pueden ser anticipados.</p>
                    </div>
                    <button
                      onClick={() => setShowAdvanceModal(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={advanceSearch}
                      onChange={(e) => setAdvanceSearch(e.target.value)}
                      placeholder="Buscar por código, título o máquina..."
                      className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
                    {tasks.filter(t => !t.isDue || t.adelantada).length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-xs">
                        No hay tareas pendientes en el pool de anticipación.
                      </div>
                    ) : (
                      tasks
                        .filter(t => !t.isDue || t.adelantada)
                        .filter(t => {
                          if (!advanceSearch) return true;
                          const q = normalize(advanceSearch);
                          return normalize(t.title).includes(q) || normalize(t.code).includes(q) || normalize(t.maquina).includes(q);
                        })
                        .map(task => {
                          const candidateTechs = technicians.filter(tech =>
                            tech.id !== 9999 &&
                            areTurnosCompatible(task.tipoIntervencion, tech.turno)
                          );

                          return (
                            <div key={task.id} className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold text-xs text-[#324354] flex items-center gap-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#324354] text-white rounded">#{task.csvId || task.code}</span>
                                    <span>{task.title}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Frecuencia: {task.frecuencia}d (Ref: {task.refFrecuencia}d) · {task.durationMinutes} min · {task.planta} · {task.maquina}
                                  </div>
                                </div>
                                <label className="flex items-center gap-1 text-xs font-semibold text-purple-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={task.adelantada}
                                    onChange={(e) => handleToggleAdvance(task.id, e.target.checked)}
                                    className="rounded text-[#324354] focus:ring-0"
                                  />
                                  <span>Adelantar</span>
                                </label>
                              </div>

                              <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) handleAssignTask(task.id, parseInt(e.target.value), true);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-xl border border-[#324354]/30 bg-white text-xs font-bold text-[#324354] focus:outline-none"
                                >
                                  <option value="">Asignar a Técnico...</option>
                                  {candidateTechs.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({getTurnoLabel(t.turno)})</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PORTAL DE TÉCNICOS */}
        {/* ========================================================================= */}
        {activeTab === 'tecnico' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
            
            {!currentPortalTech ? (
              /* Step 1: Login by Cédula or ID */
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.06)] text-center flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-[#324354]/10 text-[#324354] flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#324354]">Portal de Consulta del Técnico</h2>
                  <p className="text-sm text-gray-500 mt-1">Ingresa tu número de Cédula o ID de técnico para ver y reportar tus mantenimientos asignados hoy.</p>
                </div>

                <form onSubmit={handlePortalLogin} className="w-full max-w-md flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={portalDocSearch}
                      onChange={(e) => setPortalDocSearch(e.target.value)}
                      placeholder="Ej. 1010232658 o ID: 1"
                      className="w-full px-4 py-3 bg-[#F6F3EE] rounded-2xl border border-gray-300 text-center font-bold text-lg text-[#324354] focus:outline-none focus:border-[#324354]"
                    />
                  </div>
                  {portalError && (
                    <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      {portalError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#324354] text-white font-bold rounded-2xl shadow-md hover:bg-[#324354]/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ingresar a mis Mantenimientos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Quick select from active techs */}
                <div className="pt-4 border-t border-gray-100 w-full">
                  <div className="text-xs text-gray-400 font-semibold mb-3">O selecciona tu perfil directo de la jornada:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {technicians.filter(t => t.id !== 9999).map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTechId(t.id);
                          sessionStorage.setItem('techflow_active_tech_id', t.id.toString());
                        }}
                        className="px-3 py-1.5 bg-[#F6F3EE] hover:bg-[#324354] hover:text-white text-xs font-semibold text-[#324354] rounded-xl transition-all border border-gray-200 cursor-pointer"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Tech Task Execution List */
              <div className="flex flex-col gap-6">
                
                {/* Tech Profile Banner */}
                <div className="bg-[#324354] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">{currentPortalTech.name}</h2>
                      <p className="text-xs sm:text-sm text-slate-300">
                        Turno: <strong>{getTurnoLabel(currentPortalTech.turno)}</strong> · ID: {currentPortalTech.id} {currentPortalTech.documento ? `· Cédula: ${currentPortalTech.documento}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center sm:text-right bg-white/10 px-4 py-2 rounded-2xl">
                      <div className="text-xl font-bold">
                        {portalTechTasks.filter(t => t.status === 'Completado').length} / {portalTechTasks.length}
                      </div>
                      <div className="text-[10px] text-slate-300 uppercase">Completados Hoy</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTechId(null);
                        sessionStorage.removeItem('techflow_active_tech_id');
                      }}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
                      title="Cerrar sesión del técnico"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tech Tasks */}
                <div className="flex flex-col gap-4">
                  {portalTechTasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center text-gray-400 border border-[#e2ded5]">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <h3 className="text-lg font-bold text-[#324354]">No tienes mantenimientos asignados hoy</h3>
                      <p className="text-xs text-gray-500 mt-1">Si requieres tareas, consulta con tu supervisor o planificador de turno.</p>
                    </div>
                  ) : (
                    portalTechTasks.map(task => {
                      const isComplete = task.status === 'Completado';
                      const isIncomplete = task.status === 'Incompleto';

                      return (
                        <div
                          key={task.id}
                          className={`p-5 sm:p-6 bg-white rounded-3xl border transition-all flex flex-col gap-4 shadow-sm ${
                            isComplete ? 'border-emerald-300 bg-emerald-50/20' : isIncomplete ? 'border-rose-300 bg-rose-50/20' : 'border-[#e2ded5]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 bg-[#324354] text-white text-xs font-bold rounded-lg">
                                  #{task.csvId || task.code}
                                </span>
                                <h3 className="font-bold text-base sm:text-lg text-[#324354]">{task.title}</h3>
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap mt-1.5">
                                <span className="font-bold text-[#324354]">⏱️ {task.durationMinutes} min ({task.durationHours.toFixed(1)}h)</span>
                                <span>🏭 Planta: <strong>{task.planta}</strong></span>
                                <span>⚙️ Máquina: <strong>{task.maquina}</strong></span>
                              </div>
                              {task.detalle && (
                                <div className="mt-2 text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                                  <strong className="text-[#324354]">Instrucción / Detalle:</strong> {task.detalle}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Estado Actual</label>
                              <select
                                value={task.status || 'Pendiente'}
                                onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                                className="px-3 py-2 bg-white border border-[#324354] rounded-xl text-xs font-bold text-[#324354] shadow-sm focus:outline-none cursor-pointer"
                              >
                                <option value="Pendiente">⏳ Pendiente</option>
                                <option value="Incompleto">⚠️ Incompleto</option>
                                <option value="Completado">✅ Completado</option>
                              </select>
                            </div>
                          </div>

                          {/* Fechas y Observaciones */}
                          <div className="pt-3 border-t border-gray-200 flex flex-col gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Fecha y Hora de Apertura:</label>
                                <input
                                  type="datetime-local"
                                  value={task.fechaApertura || ''}
                                  onChange={(e) => handleUpdateDetails(task.id, task.observations || '', e.target.value, task.fechaCierre || null)}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Fecha y Hora de Cierre:</label>
                                <input
                                  type="datetime-local"
                                  value={task.fechaCierre || ''}
                                  onChange={(e) => handleUpdateDetails(task.id, task.observations || '', task.fechaApertura || null, e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Observaciones de Ejecución:</label>
                              <textarea
                                value={task.observations || ''}
                                onChange={(e) => handleUpdateDetails(task.id, e.target.value, task.fechaApertura || null, task.fechaCierre || null)}
                                placeholder="Describe el estado de la máquina, piezas cambiadas o incidencias encontradas..."
                                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#324354] min-h-[60px]"
                              />
                            </div>

                            {saveFeedback[task.id] && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-in fade-in">
                                <Check className="w-3.5 h-3.5" />
                                <span>¡Actualizado y guardado en Supabase!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PREVENTIVO (PMP) - BASE MAESTRA DE PROGRAMACIÓN FIJA */}
        {/* ========================================================================= */}
        {activeTab === 'preventivo' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Master Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#e2ded5] shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#324354]/5 flex items-center justify-center text-[#324354]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#324354]">Base Maestra de Programación (Preventivo PMP)</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Catálogo fijo de estándares preventivos, frecuencias de mantenimiento, máquinas asignadas y turnos operativos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3.5 py-2 bg-[#F6F3EE] border border-gray-200 rounded-xl text-[#324354] whitespace-nowrap">
                  Total Registros Base: <strong>{tasks.length}</strong>
                </span>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Mantenimiento</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#324354] text-sm sm:text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#7B8E90]" />
                  <span>Filtros de Catálogo ({filteredPreventivoTasks.length} de {tasks.length} estándares)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPreventivoExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#324354] text-[#324354] hover:bg-[#324354] hover:text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Sincronizando...' : 'Sincronizar SharePoint'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPreventivoSearch('');
                      setPreventivoPlanta('Todas');
                      setPreventivoFrecuencia('Todas');
                      setPreventivoTurno('Todos');
                    }}
                    className="text-xs text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer ml-1"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={preventivoSearch}
                    onChange={(e) => setPreventivoSearch(e.target.value)}
                    placeholder="Buscar por título, código, máquina..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
                  />
                </div>

                {/* Planta */}
                <div>
                  <select
                    value={preventivoPlanta}
                    onChange={(e) => setPreventivoPlanta(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    {plantOptions.map(p => (
                      <option key={p} value={p}>Planta: {p}</option>
                    ))}
                  </select>
                </div>

                {/* Frecuencia */}
                <div>
                  <select
                    value={preventivoFrecuencia}
                    onChange={(e) => setPreventivoFrecuencia(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    {frecuenciaOptions.map(f => (
                      <option key={f} value={f}>Frecuencia: {f}</option>
                    ))}
                  </select>
                </div>

                {/* Turno Requerido */}
                <div>
                  <select
                    value={preventivoTurno}
                    onChange={(e) => setPreventivoTurno(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Turno: Todos</option>
                    <option value="PR">Producción (PR)</option>
                    <option value="NP">Paro de Planta (NP)</option>
                    <option value="PRNP">Producción y Paro (PRNP)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preventivo Master Table */}
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#324354] text-white sticky top-0 z-20">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-center w-12">#</th>
                      <th className="py-3.5 px-4 font-bold">Código</th>
                      <th className="py-3.5 px-4 font-bold min-w-[260px]">Título del Mantenimiento / Detalle</th>
                      <th className="py-3.5 px-3 font-bold">Planta</th>
                      <th className="py-3.5 px-3 font-bold">Máquina / Equipo</th>
                      <th className="py-3.5 px-3 font-bold text-center">Frecuencia Base</th>
                      <th className="py-3.5 px-3 font-bold text-center">Duración Estándar</th>
                      <th className="py-3.5 px-3 font-bold text-center">Turno</th>
                      <th className="py-3.5 px-4 font-bold min-w-[180px]">Técnicos Habilitados</th>
                      <th className="py-3.5 px-4 font-bold text-center w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPreventivoTasks.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400">
                          No se encontraron mantenimientos en la base con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredPreventivoTasks.map((task, idx) => {
                        const candidateTechs = technicians.filter(t =>
                          t.id !== 9999 && (
                            (task.idtecsCandidates && task.idtecsCandidates.includes(t.id)) ||
                            (t.authorizedTitles && t.authorizedTitles.includes(normalize(task.title)))
                          )
                        );

                        return (
                          <tr key={task.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#324354] whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-mono text-[11px]">
                                #{task.csvId || task.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#324354]">
                              <div className="font-bold text-xs sm:text-sm">{task.title}</div>
                              {task.detalle ? (
                                <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{task.detalle}</div>
                              ) : (
                                <div className="text-[10px] text-gray-400 italic mt-0.5">Sin observaciones técnicas</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-gray-700 font-semibold whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-[#F6F3EE] rounded-md border text-[11px]">
                                {task.planta}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-700 font-medium whitespace-nowrap">{task.maquina}</td>
                            <td className="py-3 px-3 text-center font-bold text-[#324354] whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-md font-bold">
                                {task.frecuencia}d
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-gray-700 whitespace-nowrap">
                              <strong>{task.durationMinutes}m</strong> ({task.durationHours.toFixed(1)}h)
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 font-bold text-[#324354] rounded text-[11px]">
                                {task.tipoIntervencion || 'General'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {candidateTechs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {candidateTechs.map(ct => (
                                    <span key={ct.id} className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium rounded">
                                      {ct.name.split(' ')[0]} {ct.name.split(' ')[1] ? ct.name.split(' ')[1][0] + '.' : ''}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Todos los técnicos del turno</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditTask(task)}
                                  className="p-1.5 text-[#324354] hover:bg-white hover:text-blue-600 hover:border-gray-300 rounded-xl transition-all cursor-pointer border border-transparent"
                                  title="Editar mantenimiento base"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white hover:border-gray-300 rounded-xl transition-all cursor-pointer border border-transparent"
                                  title="Eliminar de la base"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: CORRECTIVO (TARJETAS DE ANOMALÍAS & FALLAS) */}
        {/* ========================================================================= */}
        {activeTab === 'correctivo' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Quick Metrics Bar for Correctivo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-[#324354]">{correctiveRecords.length}</div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Total Correctivos Reportados</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-rose-600">
                  {correctiveRecords.filter(c => c.prioridad === 'Alta').length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Prioridad Alta / Críticos 🚨</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-amber-600">
                  {correctiveRecords.filter(c => c.estado === 'Abierta' || c.estado === 'En Proceso').length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">En Atención / Pendientes ⏳</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-emerald-600">
                  {correctiveRecords.filter(c => c.estado === 'Resuelta').length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Resueltos / Cerrados ✅</div>
              </div>
            </div>

            {/* Filter Bar for Correctivo */}
            <div className="bg-white rounded-3xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#324354] text-sm sm:text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#7B8E90]" />
                  <span>Filtros de Mantenimiento Correctivo ({filteredCorrectivos.length} registrados)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCorrectivoModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#324354]/90 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Reportar Correctivo</span>
                  </button>
                  <button
                    onClick={handleDownloadCorrectivoExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setCorrectivoSearch('');
                      setCorrectivoPrioridad('Todas');
                      setCorrectivoEstado('Todos');
                    }}
                    className="text-xs text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer ml-1"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={correctivoSearch}
                    onChange={(e) => setCorrectivoSearch(e.target.value)}
                    placeholder="Buscar por equipo, síntoma, código..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
                  />
                </div>

                <div>
                  <select
                    value={correctivoPrioridad}
                    onChange={(e) => setCorrectivoPrioridad(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="Todas">Prioridad: Todas</option>
                    <option value="Alta">🚨 Alta (Crítica)</option>
                    <option value="Media">⚠️ Media</option>
                    <option value="Baja">ℹ️ Baja</option>
                  </select>
                </div>

                <div>
                  <select
                    value={correctivoEstado}
                    onChange={(e) => setCorrectivoEstado(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Estado: Todos</option>
                    <option value="Abierta">🔴 Abierta</option>
                    <option value="En Proceso">🟡 En Proceso</option>
                    <option value="Resuelta">🟢 Resuelta</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Correctivo Table */}
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#324354] text-white sticky top-0 z-20">
                    <tr>
                      <th className="py-3 px-4 font-bold">Código</th>
                      <th className="py-3 px-4 font-bold min-w-[160px]">Equipo / Máquina</th>
                      <th className="py-3 px-3 font-bold">Planta</th>
                      <th className="py-3 px-4 font-bold min-w-[240px]">Síntoma / Falla Detectada</th>
                      <th className="py-3 px-3 font-bold text-center">Prioridad</th>
                      <th className="py-3 px-4 font-bold">Técnico Asignado</th>
                      <th className="py-3 px-3 font-bold text-center">Estado</th>
                      <th className="py-3 px-4 font-bold min-w-[200px]">Acción Correctiva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCorrectivos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          No hay registros de correctivos con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredCorrectivos.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#324354]">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded font-mono text-[11px]">
                              {item.codigo}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#324354]">
                            {item.maquina}
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-600">{item.planta}</td>
                          <td className="py-3 px-4 text-[#324354] font-medium">
                            {item.sintoma}
                            <div className="text-[10px] text-gray-400 mt-0.5">Reportado: {item.fecha_reporte}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              item.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' :
                              item.prioridad === 'Media' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.prioridad}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#324354]">
                            {item.tecnico_asignado || 'Sin asignar'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              item.estado === 'Resuelta' ? 'bg-emerald-100 text-emerald-800' :
                              item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {item.accion_tomada ? (
                              <div className="bg-slate-50 p-2 rounded-xl border text-[11px]">
                                {item.accion_tomada}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">En evaluación</span>
                            )}
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
        {/* VIEW 5: HISTORIAL DE EJECUCIONES */}
        {/* ========================================================================= */}
        {activeTab === 'historial' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Quick Metrics Bar for Historial */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-[#324354]">{historyRows.length}</div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Total Registros Históricos</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-emerald-600">
                  {historyRows.filter(r => (r['ESTADO'] || '').toLowerCase() === 'completado').length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Completados ✅</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-amber-600">
                  {historyRows.filter(r => (r['ESTADO'] || '').toLowerCase() === 'pendiente' || !r['ESTADO']).length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Pendientes ⏳</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
                <div className="text-2xl font-bold text-rose-600">
                  {historyRows.filter(r => (r['ESTADO'] || '').toLowerCase() === 'incompleto').length}
                </div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Incompletos ⚠️</div>
              </div>
            </div>

            {/* Filter Bar for Historial */}
            <div className="bg-white rounded-3xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#324354] text-sm sm:text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#7B8E90]" />
                  <span>Filtros del Historial ({filteredHistoryRows.length} registros)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchHistoryRecords}
                    disabled={historyLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F6F3EE] text-[#324354] hover:bg-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    onClick={handleDownloadHistorialExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryEstado('Todos');
                      setHistoryTecnico('Todos');
                    }}
                    className="text-xs text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer ml-1"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar por título, técnico u observación..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
                  />
                </div>

                {/* Estado */}
                <div>
                  <select
                    value={historyEstado}
                    onChange={(e) => setHistoryEstado(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Estado: Todos</option>
                    <option value="Completado">✅ Completado</option>
                    <option value="Pendiente">⏳ Pendiente</option>
                    <option value="Incompleto">⚠️ Incompleto</option>
                  </select>
                </div>

                {/* Técnico */}
                <div>
                  <select
                    value={historyTecnico}
                    onChange={(e) => setHistoryTecnico(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Técnico: Todos</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Historial Table */}
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#324354] text-white sticky top-0 z-20">
                    <tr>
                      <th className="py-3 px-4 font-bold text-center w-12">#</th>
                      <th className="py-3 px-4 font-bold min-w-[240px]">Título de Mantenimiento</th>
                      <th className="py-3 px-4 font-bold min-w-[180px]">Técnico Responsable</th>
                      <th className="py-3 px-3 font-bold text-center">Estado</th>
                      <th className="py-3 px-4 font-bold">Fecha Apertura</th>
                      <th className="py-3 px-4 font-bold">Fecha Cierre</th>
                      <th className="py-3 px-4 font-bold min-w-[260px]">Observaciones / Comentario de Ejecución</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredHistoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          {historyLoading ? 'Cargando registros históricos...' : 'No se encontraron registros en el historial.'}
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryRows.map((row, idx) => {
                        const estado = row['ESTADO'] || 'Pendiente';
                        const isComplete = estado.toLowerCase() === 'completado';
                        const isIncomplete = estado.toLowerCase() === 'incompleto';

                        return (
                          <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#324354]">
                              {row['Título'] || 'Mantenimiento General'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#324354]">
                              👤 {row['TECNICO'] || 'Sin asignar'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isComplete ? 'bg-emerald-100 text-emerald-800' :
                                isIncomplete ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isComplete ? '✅ ' : isIncomplete ? '⚠️ ' : '⏳ '}{estado}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                              {row['FECHA DE APERTURA'] ? row['FECHA DE APERTURA'].replace('T', ' ') : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                              {row['FECHA DE CIERRE'] ? row['FECHA DE CIERRE'].replace('T', ' ') : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {row['COMENTARIO DE EJECUCION'] ? (
                                <div className="bg-slate-50 p-2 rounded-xl border border-gray-200 text-xs">
                                  {row['COMENTARIO DE EJECUCION']}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Sin observaciones registradas</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7: CONFIGURACIÓN */}
        {/* ========================================================================= */}
        {activeTab === 'configuracion' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            
            {/* Technicians Configuration Panel */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#7B8E90]" />
                    <span>Gestión de Técnicos y Capacidad</span>
                  </h3>
                  <p className="text-xs text-gray-500">Configura turnos, datos de identificación, capacidad base y márgenes de sobrecarga individual.</p>
                </div>

                <button
                  onClick={() => setShowTechModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Técnico</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1">
                {technicians.filter(t => t.id !== 9999).map(tech => {
                  const effCap = getTechEffectiveCapacity(tech);
                  const margin = tech.overloadMarginPercent !== undefined ? tech.overloadMarginPercent : systemSettings.defaultOverloadMargin;
                  const baseCap = tech.capacity || systemSettings.baseCapacity;

                  return (
                    <div key={tech.id} className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200/80 hover:border-[#324354]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-[#324354] flex items-center gap-2 flex-wrap">
                          <span>{tech.name}</span>
                          <span className="text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-md font-semibold text-gray-600">ID: {tech.id}</span>
                          {tech.documento && (
                            <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded-md">CC: {tech.documento}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Turno: <strong>{getTurnoLabel(tech.turno)}</strong></span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                            Sobrecarga: +{margin}% extra
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Títulos asignados: {tech.authorizedTitles.length > 0 ? tech.authorizedTitles.length : 'Todos los del plan'}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#324354]">
                            {effCap.toFixed(1)}h programables
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Base: {baseCap.toFixed(1)}h/día
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTech(tech)}
                            className="p-2 text-[#324354] hover:bg-white hover:text-blue-600 rounded-xl transition-all cursor-pointer border border-transparent hover:border-gray-200"
                            title="Modificar parámetros del técnico"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTech(tech.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all cursor-pointer border border-transparent hover:border-gray-200"
                            title="Eliminar técnico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Global Settings & SharePoint */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Interactive System Parameters Form */}
              <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3">
                  <h3 className="font-bold text-[#324354] text-base flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-[#7B8E90]" />
                    <span>Parámetros del Sistema</span>
                  </h3>
                  {systemSavedFeedback && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> ¡Guardado!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSystemSettings} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Jornada Diaria Estándar Base (Horas)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="4"
                        max="12"
                        value={systemSettings.baseCapacity}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, baseCapacity: parseFloat(e.target.value) || 7.2 }))}
                        className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                        required
                      />
                      <span className="text-xs font-bold text-gray-500 whitespace-nowrap">h / día</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Horas laborales estándar estipuladas por turno en planta.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-700">
                        Margen de Sobrecarga / Buffer Extra (%)
                      </label>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        +{systemSettings.defaultOverloadMargin}% ({(systemSettings.baseCapacity * (1 + systemSettings.defaultOverloadMargin / 100)).toFixed(2)}h efectivas)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="40"
                        step="5"
                        value={systemSettings.defaultOverloadMargin}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, defaultOverloadMargin: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-[#324354] cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={systemSettings.defaultOverloadMargin}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, defaultOverloadMargin: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-[#F6F3EE] rounded-lg border border-gray-300 text-xs font-bold text-center text-[#324354]"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      ⚡ Permite programar tareas adicionales sobre el límite para mantener a los técnicos llenos y sin tiempos muertos ante imprevistos.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Alerta de Capacidad en Semáforo (% de ocupación)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        step="5"
                        value={systemSettings.warningThresholdPercent}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, warningThresholdPercent: parseInt(e.target.value) || 80 }))}
                        className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                        required
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Cambia el indicador a amarillo al alcanzar {systemSettings.warningThresholdPercent}% ({((systemSettings.baseCapacity * (1 + systemSettings.defaultOverloadMargin / 100)) * (systemSettings.warningThresholdPercent / 100)).toFixed(1)}h).
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Compatibilidad de Turnos
                    </label>
                    <select
                      value={systemSettings.turnoMode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, turnoMode: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none"
                    >
                      <option value="strict">Estricto (PR con PR, NP con NP)</option>
                      <option value="flexible">Flexible (Permite PRNP y flexibilidad operativa)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Guardar Parámetros del Sistema</span>
                  </button>
                </form>
              </div>

              {/* SharePoint Status */}
              <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
                <h3 className="font-bold text-[#324354] text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Conexión SharePoint y Supabase</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Los planes de mantenimiento se sincronizan desde las listas maestras de SharePoint en Microsoft 365 con validación en Supabase.
                </p>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
                  <span>Estado: Conectado</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>

                <button
                  onClick={() => fetchData(true)}
                  disabled={syncing}
                  className="w-full py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs hover:bg-[#324354]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Forzar Sincronización'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8: INDICADORES */}
        {/* ========================================================================= */}
        {activeTab === 'indicadores' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-500 uppercase">Tasa Cumplimiento Hoy</div>
                <div className="text-3xl font-bold text-[#324354]">
                  {activeTasks.length > 0
                    ? `${Math.round((activeTasks.filter(t => t.status === 'Completado').length / activeTasks.length) * 100)}%`
                    : '0%'}
                </div>
                <div className="text-xs text-gray-400">
                  {activeTasks.filter(t => t.status === 'Completado').length} de {activeTasks.length} tareas completadas
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-500 uppercase">Horas Programadas Hoy</div>
                <div className="text-3xl font-bold text-emerald-600">
                  {activeTasks.reduce((sum, t) => sum + t.durationHours, 0).toFixed(1)}h
                </div>
                <div className="text-xs text-gray-400">
                  En {technicians.filter(t => t.id !== 9999).length} técnicos activos
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-500 uppercase">Técnicos Sobrecargados</div>
                <div className="text-3xl font-bold text-rose-600">
                  {technicians.filter(tech => {
                    if (tech.id === 9999) return false;
                    const hours = tasks.filter(t => t.idtecs === tech.id && t.isDue).reduce((sum, t) => sum + t.durationHours, 0);
                    return hours > getTechEffectiveCapacity(tech);
                  }).length}
                </div>
                <div className="text-xs text-gray-400">Exceden la capacidad programable</div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-500 uppercase">Mantenimientos Vencidos</div>
                <div className="text-3xl font-bold text-amber-600">
                  {tasks.filter(t => t.refFrecuencia >= t.frecuencia).length}
                </div>
                <div className="text-xs text-gray-400">Ref. Frecuencia &gt;= Frecuencia</div>
              </div>
            </div>

            {/* Load Balance Per Tech */}
            <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-lg text-[#324354] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#7B8E90]" />
                  <span>Ocupación y Balance de Horas por Técnico</span>
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  Capacidad Base: {systemSettings.baseCapacity}h + Buffer de Sobrecarga
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technicians.filter(t => t.id !== 9999).map(tech => {
                  const hours = tasks.filter(t => t.idtecs === tech.id && t.isDue).reduce((sum, t) => sum + t.durationHours, 0);
                  const effCap = getTechEffectiveCapacity(tech);
                  const margin = tech.overloadMarginPercent !== undefined ? tech.overloadMarginPercent : systemSettings.defaultOverloadMargin;
                  const warnLimit = effCap * (systemSettings.warningThresholdPercent / 100);
                  const percentage = Math.min((hours / effCap) * 100, 100);
                  const taskCount = tasks.filter(t => t.idtecs === tech.id && t.isDue).length;
                  const isOver = hours > effCap;

                  let barColor = 'bg-[#59a96a]';
                  if (hours > warnLimit && hours <= effCap) barColor = 'bg-[#deb841]';
                  if (hours > effCap) barColor = 'bg-[#d14747]';

                  return (
                    <div key={tech.id} className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-[#324354]">{tech.name}</div>
                          <div className="text-xs text-gray-500">
                            Turno: {getTurnoLabel(tech.turno)} · {taskCount} tareas
                            {margin > 0 && <span className="text-emerald-700 ml-1.5 font-medium">(+{margin}% buffer)</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${isOver ? 'text-rose-600' : 'text-[#324354]'}`}>
                            {hours.toFixed(1)}h / {effCap.toFixed(1)}h
                          </div>
                          <div className="text-[10px] text-gray-400">{Math.round((hours / effCap) * 100)}% ocupado</div>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribution by Plant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
                <h3 className="font-bold text-base text-[#324354] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#7B8E90]" />
                  <span>Distribución de Tareas por Planta</span>
                </h3>
                <div className="flex flex-col gap-2.5">
                  {plantOptions.filter(p => p !== 'Todas').map(planta => {
                    const plantTasks = tasks.filter(t => t.planta === planta);
                    const percent = Math.round((plantTasks.length / tasks.length) * 100) || 0;
                    return (
                      <div key={planta} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-[#324354]">
                          <span>{planta}</span>
                          <span>{plantTasks.length} tareas ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#324354] h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
                <h3 className="font-bold text-base text-[#324354] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#7B8E90]" />
                  <span>Distribución por Frecuencia de Mantenimiento</span>
                </h3>
                <div className="flex flex-col gap-2.5">
                  {frecuenciaOptions.filter(f => f !== 'Todas').map(freq => {
                    const freqNum = parseInt(freq.replace('d', ''));
                    const freqTasks = tasks.filter(t => t.frecuencia === freqNum);
                    const percent = Math.round((freqTasks.length / tasks.length) * 100) || 0;
                    return (
                      <div key={freq} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-[#324354]">
                          <span>Cada {freq}</span>
                          <span>{freqTasks.length} tareas ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Modal: Add Technician */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5]">
            <h3 className="text-xl font-bold text-[#324354] mb-4">Añadir Nuevo Técnico</h3>
            <form onSubmit={handleAddTechSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newTechForm.name}
                  onChange={(e) => setNewTechForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Juan Pérez"
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">ID Técnico</label>
                  <input
                    type="number"
                    value={newTechForm.id}
                    onChange={(e) => setNewTechForm(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="Ej. 17"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Turno</label>
                  <select
                    value={newTechForm.turno}
                    onChange={(e) => setNewTechForm(prev => ({ ...prev, turno: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="PR">Producción (PR)</option>
                    <option value="NP">Paro de Planta (NP)</option>
                    <option value="PRNP">Producción y Paro (PRNP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Cédula / Documento (Opcional)</label>
                <input
                  type="text"
                  value={newTechForm.documento}
                  onChange={(e) => setNewTechForm(prev => ({ ...prev, documento: e.target.value }))}
                  placeholder="Ej. 1010232658"
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Capacidad Base (Horas)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="12"
                    value={newTechForm.capacity}
                    onChange={(e) => setNewTechForm(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Margen Sobrecarga (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={newTechForm.overloadMarginPercent}
                    onChange={(e) => setNewTechForm(prev => ({ ...prev, overloadMarginPercent: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none font-semibold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer"
                >
                  Añadir Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Technician Parameters */}
      {showEditTechModal && editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#7B8E90]" />
                  <span>Modificar Técnico</span>
                </h3>
                <p className="text-xs text-gray-500">Ajusta los datos, turno y límites de sobrecarga del técnico.</p>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-100 rounded-lg font-bold text-gray-600">ID: {editingTech.id}</span>
            </div>

            <form onSubmit={handleSaveTechEdit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editingTech.name}
                  onChange={(e) => setEditingTech(prev => prev ? { ...prev, name: e.target.value } : null)}
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Turno</label>
                  <select
                    value={editingTech.turno}
                    onChange={(e) => setEditingTech(prev => prev ? { ...prev, turno: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none"
                  >
                    <option value="PR">Producción (PR)</option>
                    <option value="NP">Paro de Planta (NP)</option>
                    <option value="PRNP">Producción y Paro (PRNP)</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Cédula / CC</label>
                  <input
                    type="text"
                    value={editingTech.documento || ''}
                    onChange={(e) => setEditingTech(prev => prev ? { ...prev, documento: e.target.value } : null)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Capacidad Base (Horas)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="12"
                    value={editingTech.capacity}
                    onChange={(e) => setEditingTech(prev => prev ? { ...prev, capacity: parseFloat(e.target.value) || 7.2 } : null)}
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-bold text-[#324354] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Margen Extra (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={editingTech.overloadMarginPercent !== undefined ? editingTech.overloadMarginPercent : systemSettings.defaultOverloadMargin}
                    onChange={(e) => setEditingTech(prev => prev ? { ...prev, overloadMarginPercent: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-bold text-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time calculated effective capacity box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-semibold">Capacidad Total Programable:</span>
                  <strong className="text-emerald-800 text-sm">
                    {(editingTech.capacity * (1 + (editingTech.overloadMarginPercent !== undefined ? editingTech.overloadMarginPercent : systemSettings.defaultOverloadMargin) / 100)).toFixed(2)} horas/día
                  </strong>
                </div>
                <p className="text-[10px] text-emerald-700">
                  {editingTech.capacity}h base + {(editingTech.overloadMarginPercent !== undefined ? editingTech.overloadMarginPercent : systemSettings.defaultOverloadMargin)}% sobrecarga adicional para asegurar jornada continua.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditTechModal(false); setEditingTech(null); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Maintenance Task */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e2ded5] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#324354] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#7B8E90]" />
                  <span>Nuevo Mantenimiento Base (PMP)</span>
                </h3>
                <p className="text-xs text-gray-500">Registra un nuevo estándar preventivo fijo en el catálogo maestro.</p>
              </div>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Título del Mantenimiento</label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Ajuste y Calibración de Válvulas"
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Detalle / Procedimiento Técnico</label>
                <textarea
                  value={newTaskForm.detalle}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, detalle: e.target.value }))}
                  placeholder="Descripción detallada de la rutina de mantenimiento..."
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354] min-h-[50px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta</label>
                  <input
                    type="text"
                    value={newTaskForm.planta}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, planta: e.target.value }))}
                    placeholder="Ej. RTM / Mármol"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquina / Equipo</label>
                  <input
                    type="text"
                    value={newTaskForm.maquina}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, maquina: e.target.value }))}
                    placeholder="Ej. Prensa Hidráulica 01"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Duración Estándar (Minutos)</label>
                  <input
                    type="number"
                    value={newTaskForm.durationMinutes}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, durationMinutes: parseFloat(e.target.value) || 0 }))}
                    min="10"
                    step="5"
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Turno Requerido</label>
                  <select
                    value={newTaskForm.intervencion}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, intervencion: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="PR">Producción (PR)</option>
                    <option value="NP">Paro de Planta (NP)</option>
                    <option value="PRNP">Producción y Paro (PRNP)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Frecuencia Estándar (Días)</label>
                <input
                  type="number"
                  value={newTaskForm.frecuencia}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, frecuencia: parseFloat(e.target.value) || 0, refFrecuencia: parseFloat(e.target.value) || 0 }))}
                  min="1"
                  required
                  placeholder="Ej. 30"
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer"
                >
                  Guardar en Catálogo Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Maintenance Task (Preventivo Base) */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e2ded5] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#7B8E90]" />
                  <span>Modificar Mantenimiento Base</span>
                </h3>
                <p className="text-xs text-gray-500">Actualiza la ficha técnica y parámetros del estándar preventivo.</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-100 font-mono font-bold text-gray-700 rounded-lg">
                #{editingTask.csvId || editingTask.code}
              </span>
            </div>

            <form onSubmit={handleSaveTaskEdit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Título del Mantenimiento</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Detalle / Procedimiento Técnico</label>
                <textarea
                  value={editingTask.detalle || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, detalle: e.target.value } : null)}
                  placeholder="Detalle o instrucciones del mantenimiento..."
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354] min-h-[55px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta</label>
                  <input
                    type="text"
                    value={editingTask.planta || ''}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, planta: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquina / Equipo</label>
                  <input
                    type="text"
                    value={editingTask.maquina || ''}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, maquina: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Duración (Minutos)</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={editingTask.durationMinutes}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, durationMinutes: parseFloat(e.target.value) || 0 } : null)}
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Turno Requerido</label>
                  <select
                    value={editingTask.tipoIntervencion || 'PR'}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, tipoIntervencion: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="PR">Producción (PR)</option>
                    <option value="NP">Paro de Planta (NP)</option>
                    <option value="PRNP">Producción y Paro (PRNP)</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Frecuencia Base (Días)</label>
                <input
                  type="number"
                  min="1"
                  value={editingTask.frecuencia}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, frecuencia: parseFloat(e.target.value) || 0 } : null)}
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Técnicos Autorizados / Candidatos</label>
                <div className="max-h-32 overflow-y-auto p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 flex flex-col gap-1.5 text-xs">
                  {technicians.filter(t => t.id !== 9999).map(tech => {
                    const isSelected = editingTask.idtecsCandidates?.includes(tech.id);
                    return (
                      <label key={tech.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={(e) => {
                            const current = editingTask.idtecsCandidates || [];
                            const updated = e.target.checked
                              ? [...current, tech.id]
                              : current.filter(id => id !== tech.id);
                            setEditingTask(prev => prev ? { ...prev, idtecsCandidates: updated } : null);
                          }}
                          className="rounded accent-[#324354]"
                        />
                        <span className="font-semibold text-[#324354]">{tech.name}</span>
                        <span className="text-[10px] text-gray-500">({getTurnoLabel(tech.turno)})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Report Corrective Maintenance */}
      {showCorrectivoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e2ded5] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[#324354] mb-4">Reportar Mantenimiento Correctivo / Anomalía</h3>
            <form onSubmit={handleAddCorrectivoSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Equipo / Máquina</label>
                  <input
                    type="text"
                    value={newCorrectivoForm.maquina}
                    onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, maquina: e.target.value }))}
                    placeholder="Ej. Prensa Hidráulica 02"
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta</label>
                  <input
                    type="text"
                    value={newCorrectivoForm.planta}
                    onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Descripción de la Avería / Síntoma</label>
                <textarea
                  value={newCorrectivoForm.sintoma}
                  onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, sintoma: e.target.value }))}
                  placeholder="Describe la anomalía detectada, ruido, fuga o falla de funcionamiento..."
                  required
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nivel de Prioridad</label>
                  <select
                    value={newCorrectivoForm.prioridad}
                    onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="Alta">🚨 Alta (Crítica)</option>
                    <option value="Media">⚠️ Media</option>
                    <option value="Baja">ℹ️ Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Técnico Asignado</label>
                  <select
                    value={newCorrectivoForm.tecnico_asignado}
                    onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, tecnico_asignado: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="">Seleccionar técnico...</option>
                    {technicians.filter(t => t.id !== 9999).map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Acción Correctiva Preliminar</label>
                <textarea
                  value={newCorrectivoForm.accion_tomada}
                  onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, accion_tomada: e.target.value }))}
                  placeholder="Acciones tomadas para mitigar o reparar la falla..."
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none min-h-[50px]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCorrectivoModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer"
                >
                  Guardar Correctivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
