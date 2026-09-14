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
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Camera,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import Header from '@/components/opt-sistemica/Header';
import * as XLSX from 'xlsx';
import { obtenerCodigoPlanta, normalizarPlanta, NomenclaturaPlanta, NOMENCLATURA_PLANTAS_DEFAULT } from '@/lib/nomenclaturaPlantas';

export interface Empleado {
  id: number | string;
  nombreCompleto: string;
  cargo?: string;
  planta?: string;
  activo?: boolean;
}

export const parseTechPlantas = (val?: string | string[] | null, catalogo: NomenclaturaPlanta[] = []): string[] => {
  if (!val) return ['MS'];
  if (Array.isArray(val)) {
    const list = val
      .map(v => obtenerCodigoPlanta(v, catalogo))
      .filter(c => c && c.toUpperCase() !== 'MECÁNICO' && c.toUpperCase() !== 'MECANICO');
    return list.length > 0 ? Array.from(new Set(list)) : ['MS'];
  }
  const parts = val.toString().split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return ['MS'];
  const list = parts
    .map(p => obtenerCodigoPlanta(p, catalogo))
    .filter(c => c && c.toUpperCase() !== 'MECÁNICO' && c.toUpperCase() !== 'MECANICO');
  return list.length > 0 ? Array.from(new Set(list)) : ['MS'];
};

// Interfaces
interface Technician {
  id: number;
  name: string;
  capacity: number; // 7.2h base standard
  turno: string;
  documento?: string;
  planta?: string; // Código corto oficial o lista separada por comas (ej: MS, CEFI, ACR)
  plantas?: string[]; // Array de códigos cortos asignados
  especialidad?: string;
  authorizedTitles: string[];
  overloadMarginPercent?: number; // e.g. 10 for 10% extra buffer
  activo?: boolean;
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
  codigoMaquina?: string | null;
  idMaquina?: number | null;
  planta: string;
  status: 'Pendiente' | 'Incompleto' | 'Completado' | string;
  observations?: string;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
  activo?: boolean;
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

type TabType = 'planificador' | 'tecnico' | 'preventivo' | 'correctivo' | 'historial' | 'configuracion' | 'indicadores' | 'maquinas';

const DAILY_CAPACITY_LIMIT = 7.2;

export default function GestionMantenimientoPage() {
  const router = useRouter();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('planificador');

  // Core Data State
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [maquinasCatalogo, setMaquinasCatalogo] = useState<any[]>([]);
  const [plantasNomenclatura, setPlantasNomenclatura] = useState<NomenclaturaPlanta[]>(NOMENCLATURA_PLANTAS_DEFAULT);
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
  type PmpSortField = 'id' | 'code' | 'title' | 'detalle' | 'planta' | 'maquina' | 'frecuencia' | 'refFrecuencia' | 'durationMinutes' | 'tipoIntervencion' | 'tecnicos' | 'activo';
  const [pmpSortField, setPmpSortField] = useState<PmpSortField>('id');
  const [pmpSortAsc, setPmpSortAsc] = useState<boolean>(true);

  const handlePmpSort = (field: PmpSortField) => {
    if (pmpSortField === field) {
      setPmpSortAsc(!pmpSortAsc);
    } else {
      setPmpSortField(field);
      setPmpSortAsc(true);
    }
  };

  // Edit Task & Detail View (Preventivo Base) State
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<MaintenanceTask | null>(null);

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
  const [techConfigSearch, setTechConfigSearch] = useState('');

  // Empleados State (Talento Humano DB)
  const [empleadosList, setEmpleadosList] = useState<Empleado[]>([]);
  const [showAddEmpDropdown, setShowAddEmpDropdown] = useState(false);
  const [showEditEmpDropdown, setShowEditEmpDropdown] = useState(false);

  // Máquinas y Equipos View State & Filters
  const [maquinasSearch, setMaquinasSearch] = useState('');
  const [maquinasPlanta, setMaquinasPlanta] = useState('Todas');
  const [maquinasCriticidad, setMaquinasCriticidad] = useState('Todas');
  const [maquinasEstado, setMaquinasEstado] = useState('Todos');
  const [maquinasSortColumn, setMaquinasSortColumn] = useState<string>('nombre_equipo');
  const [maquinasSortAsc, setMaquinasSortAsc] = useState<boolean>(true);
  const [maquinasPage, setMaquinasPage] = useState<number>(1);
  const [maquinasPageSize, setMaquinasPageSize] = useState<number>(50);
  const [selectedMachineModal, setSelectedMachineModal] = useState<any | null>(null);
  const [zoomMachineImage, setZoomMachineImage] = useState<string | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<{ id: number; nombre: string; codigo?: string; planta?: string } | null>(null);
  const [deletingMachine, setDeletingMachine] = useState<boolean>(false);

  // Machine Create / Edit Modal State
  const [showMachineFormModal, setShowMachineFormModal] = useState(false);
  const [machineFormMode, setMachineFormMode] = useState<'create' | 'edit'>('create');
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null);
  const [savingMachine, setSavingMachine] = useState(false);
  const [uploadingMachinePhoto, setUploadingMachinePhoto] = useState(false);
  const machineFileInputRef = useRef<HTMLInputElement>(null);
  const [machineFormTab, setMachineFormTab] = useState<'general' | 'specs' | 'financial' | 'media'>('general');
  const [machineFormData, setMachineFormData] = useState({
    nombre_equipo: '',
    nombre_alterno: '',
    codigo_equipo: '',
    activo_fijo: '',
    tipo: '',
    estado: 'ACTIVO',
    marca: '',
    modelo: '',
    caracteristicas: '',
    fecha_compra: '',
    fecha_instalacion: '',
    valor_compra: '',
    valor_nuevo: '',
    planta: 'Mármol Sintético',
    proceso: '',
    clasificacion: '',
    criticidad: '',
    bodega: '',
    factura: '',
    fotos: '',
    planos: '',
    manuales: '',
    estandares: '',
    proveedor_nombre: '',
    proveedor_contacto: '',
    proveedor_telefono: '',
    proveedor_email: '',
    notas: ''
  });

  const formatCOP = (val?: number | null) => {
    if (!val || isNaN(val)) return 'Sin registro';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const renderMachineCriticidad = (criticidad?: string | null) => {
    switch (criticidad?.toUpperCase()) {
      case 'A':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">A · Alta</span>;
      case 'B':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">B · Media</span>;
      case 'C':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">C · Baja</span>;
      default:
        return <span className="text-gray-400 font-bold text-xs">-</span>;
    }
  };

  const renderMachineEstado = (estado?: string | null) => {
    const est = (estado || '').toUpperCase();
    if (est.includes('ACTIVO') || est.includes('ACTIVA') || est.includes('OPERATIVA')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          ACTIVO
        </span>
      );
    }
    if (est.includes('MANTENIMIENTO') || est.includes('REPARACION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          EN MTTO
        </span>
      );
    }
    if (est.includes('INACTIVO') || est.includes('BAJA') || est.includes('OBSOLETO')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
          INACTIVO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
        {estado || 'ACTIVO'}
      </span>
    );
  };

  const getPmpForMachine = (m: any) => {
    if (!m || !tasks || tasks.length === 0) return [];
    const code = (m.codigo_equipo || '').trim().toUpperCase();
    const name = normalize(m.nombre_equipo || '');
    const alt = normalize(m.nombre_alterno || '');

    return tasks.filter(p => {
      const pTitle = normalize(p.title || '');
      const pCode = (p.code || p.csvId || '').toUpperCase();
      const pMaq = normalize(p.maquina || '');

      if (code && code !== '-' && code !== 'N/A' && code !== '0') {
        const escaped = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
        if (regex.test(p.title || '') || regex.test(pCode) || regex.test(p.maquina || '')) {
          return true;
        }
      }

      if (pMaq && (pMaq === name || (alt && pMaq === alt))) return true;
      if (name.length >= 5 && (pMaq.includes(name) || name.includes(pMaq))) return true;
      return false;
    });
  };

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
  const [newTechForm, setNewTechForm] = useState<{
    id: string;
    name: string;
    turno: string;
    documento: string;
    planta: string;
    plantas: string[];
    capacity: string;
    overloadMarginPercent: string;
  }>({
    id: '',
    name: '',
    turno: 'PR',
    documento: '',
    planta: 'MS',
    plantas: ['MS'],
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
    if (t === 'INACTIVO') return 'Inactivo';
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

  // Realtime subscription & initial fetch for nomenclatura_plantas (auto-syncs with configuration changes)
  useEffect(() => {
    const fetchPlantas = async () => {
      try {
        const { data } = await supabase
          .from('nomenclatura_plantas')
          .select('*')
          .order('nombre_oficial', { ascending: true });
        if (data && data.length > 0) {
          setPlantasNomenclatura(data);
        } else if (data && data.length === 0) {
          setPlantasNomenclatura([]);
        }
      } catch (e) {
        console.warn('Error loading nomenclatura_plantas:', e);
      }
    };
    fetchPlantas();

    const channel = supabase
      .channel('plantas_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nomenclatura_plantas' }, () => {
        fetchPlantas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime / initial fetch for empleados from Talento Humano
  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const { data, error } = await supabaseTalentoHumano
          .from('empleados')
          .select('id, nombreCompleto, cargo, planta, activo')
          .eq('activo', true)
          .order('nombreCompleto', { ascending: true });
        if (data && data.length > 0) {
          setEmpleadosList(data);
        }
      } catch (err) {
        console.warn('Error loading empleados from Talento Humano:', err);
      }
    };
    fetchEmpleados();
  }, []);

  // Fetch Supabase History Records from mantenimiento_ordenes
  const fetchHistoryRecords = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('mantenimiento_ordenes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mappedHistory: HistoryRecord[] = data.map((d: any) => ({
          id: d.id,
          'Título': d.titulo || d['Título'] || 'Mantenimiento',
          'ESTADO': d.estado || d['ESTADO'] || 'Completado',
          'TECNICO': d.tecnico_nombre || d['TECNICO'] || 'Técnico',
          'FECHA DE APERTURA': d.fecha_apertura || d['FECHA DE APERTURA'] || '',
          'FECHA DE CIERRE': d.fecha_cierre || d['FECHA DE CIERRE'] || '',
          'COMENTARIO DE EJECUCION': d.comentarios_ejecucion || d['COMENTARIO DE EJECUCION'] || '',
          created_at: d.created_at
        }));
        setHistoryRows(mappedHistory);
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

  // Helper to cross-match a preventive plan with the official machines catalog
  const matchPlanWithMaquina = (p: any, catalog: any[]): { matched: any | null; codigo: string | null; nombre: string } => {
    if (!catalog || catalog.length === 0) {
      return { matched: null, codigo: null, nombre: p.maquina || 'Equipo General' };
    }

    const rawTitle = (p.titulo || '').toUpperCase();
    const rawCode = (p.codigo || '').toUpperCase();
    const rawMaq = (p.maquina || '').toUpperCase();
    const rawPlant = (p.planta || '').toUpperCase();

    const normTitle = normalize(p.titulo || '');
    const normCode = normalize(p.codigo || '');
    const normMaq = normalize(p.maquina || '');
    const normPlant = normalize(p.planta || '');

    // 1. Check if machine code (codigo_equipo) is present in title, code, or machine field
    const withCodes = catalog.filter(m => {
      const c = (m.codigo_equipo || '').trim();
      return c && c !== '-' && c !== 'N/A' && c !== '0' && c.length >= 2;
    });

    // Sort by code length descending so "C-0244" matches before "02"
    withCodes.sort((a, b) => (b.codigo_equipo?.length || 0) - (a.codigo_equipo?.length || 0));

    for (const m of withCodes) {
      const c = (m.codigo_equipo || '').trim().toUpperCase();
      const escaped = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(rawTitle) || regex.test(rawCode) || regex.test(rawMaq)) {
        return {
          matched: m,
          codigo: m.codigo_equipo,
          nombre: m.nombre_equipo || p.maquina
        };
      }
    }

    // 2. Exact name match (normalized)
    for (const m of catalog) {
      const mNameNorm = normalize(m.nombre_equipo || '');
      const mAltNorm = normalize(m.nombre_alterno || '');
      if (normMaq && (mNameNorm === normMaq || mAltNorm === normMaq)) {
        return {
          matched: m,
          codigo: m.codigo_equipo || null,
          nombre: m.nombre_equipo
        };
      }
    }

    // 3. Same plant partial match
    const samePlant = catalog.filter(m => {
      const mPlantNorm = normalize(m.planta || '');
      return normPlant && mPlantNorm && (mPlantNorm.includes(normPlant) || normPlant.includes(mPlantNorm));
    });

    for (const m of samePlant) {
      const mNameNorm = normalize(m.nombre_equipo || '');
      if (normMaq.length >= 4 && (mNameNorm.includes(normMaq) || normMaq.includes(mNameNorm))) {
        return {
          matched: m,
          codigo: m.codigo_equipo || null,
          nombre: m.nombre_equipo
        };
      }
      if (normTitle.length >= 5 && mNameNorm.length >= 5 && normTitle.includes(mNameNorm)) {
        return {
          matched: m,
          codigo: m.codigo_equipo || null,
          nombre: m.nombre_equipo
        };
      }
    }

    // 4. Any plant partial match
    for (const m of catalog) {
      const mNameNorm = normalize(m.nombre_equipo || '');
      if (normMaq.length >= 5 && (mNameNorm.includes(normMaq) || normMaq.includes(mNameNorm))) {
        return {
          matched: m,
          codigo: m.codigo_equipo || null,
          nombre: m.nombre_equipo
        };
      }
    }

    return {
      matched: null,
      codigo: null,
      nombre: p.maquina || 'Equipo General'
    };
  };

  // 2. Fetch Data 100% from Supabase Native Tables
  const fetchData = async (showNotification = false) => {
    setSyncing(true);
    try {
      // 0. Nomenclatura Maestra de Plantas desde Supabase (16 plantas activas o las que existan en la DB)
      try {
        const { data: plantasData } = await supabase
          .from('nomenclatura_plantas')
          .select('*')
          .order('nombre_oficial', { ascending: true });
        if (plantasData && plantasData.length > 0) {
          setPlantasNomenclatura(plantasData);
        } else if (plantasData && plantasData.length === 0) {
          setPlantasNomenclatura([]);
        }
      } catch (pErr) {
        console.warn('Error cargando nomenclatura_plantas:', pErr);
      }

      // 1. Configuración del sistema
      const { data: configData } = await supabase
        .from('mantenimiento_configuracion')
        .select('*')
        .single();
      if (configData) {
        setSystemSettings({
          baseCapacity: parseFloat(configData.capacidad_base_horas) || 7.2,
          defaultOverloadMargin: parseFloat(configData.margen_sobrecarga_pct) || 10,
          warningThresholdPercent: parseFloat(configData.umbral_alerta_pct) || 80,
          turnoMode: configData.modo_turnos === 'strict' ? 'strict' : 'flexible'
        });
      }

      // 2. Técnicos desde Supabase (Activos e Inactivos)
      const { data: tecnicosData, error: tecErr } = await supabase
        .from('mantenimiento_tecnicos')
        .select('*')
        .order('id', { ascending: true });

      // 3. Catálogo Oficial de Máquinas y Equipos
      let allMaquinas: any[] = [];
      let fromMaq = 0;
      const stepMaq = 1000;
      let hasMoreMaq = true;

      while (hasMoreMaq) {
        const { data: mData } = await supabase
          .from('maquinas_equipos')
          .select('*')
          .range(fromMaq, fromMaq + stepMaq - 1)
          .order('nombre_equipo', { ascending: true });

        if (mData && mData.length > 0) {
          allMaquinas = allMaquinas.concat(mData);
          if (mData.length < stepMaq) hasMoreMaq = false;
          else fromMaq += stepMaq;
        } else {
          hasMoreMaq = false;
        }
      }
      setMaquinasCatalogo(allMaquinas);

      // 4. Planes Preventivos Maestros (PMP) desde Supabase
      const { data: preventivosData, error: prevErr } = await supabase
        .from('mantenimiento_planes_preventivos')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: true });

      // 5. Órdenes / Estados del día desde Supabase
      const { data: ordenesData } = await supabase
        .from('mantenimiento_ordenes')
        .select('*')
        .order('created_at', { ascending: false });

      if (tecnicosData && preventivosData) {
        processSupabaseData(preventivosData, tecnicosData, ordenesData || [], allMaquinas);
        fetchHistoryRecords();
        fetchCorrectivoRecords();
        if (showNotification) {
          alert('¡Datos sincronizados y actualizados desde Supabase!');
        }
      } else {
        throw new Error(tecErr?.message || prevErr?.message || 'Error cargando datos de Supabase');
      }
    } catch (err: any) {
      console.warn('Error fetching Supabase:', err);
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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      const validTabs: TabType[] = ['planificador', 'tecnico', 'preventivo', 'correctivo', 'historial', 'configuracion', 'indicadores', 'maquinas'];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData();
      const savedTech = sessionStorage.getItem('techflow_active_tech_id');
      if (savedTech) {
        setActiveTechId(parseInt(savedTech));
      }
    }
  }, [loading]);

  // 3. Process Supabase Data & Planner Scheduling Algorithm
  const processSupabaseData = (preventivosRaw: any[], tecnicosRaw: any[], ordenesRaw: any[], maquinasRaw?: any[]) => {
    const machinesList = maquinasRaw && maquinasRaw.length > 0 ? maquinasRaw : maquinasCatalogo;
    const newTechnicians: Technician[] = tecnicosRaw.map(t => {
      const pList = parseTechPlantas(t.planta || t.especialidad, plantasNomenclatura);
      const pStr = pList.join(', ');
      return {
        id: t.id,
        name: t.nombre,
        capacity: parseFloat(t.capacidad_horas) || systemSettings.baseCapacity || DAILY_CAPACITY_LIMIT,
        turno: t.activo === false ? 'INACTIVO' : (t.turno || 'General'),
        documento: t.documento || '',
        planta: pStr,
        plantas: pList,
        especialidad: pStr,
        authorizedTitles: (t.titulos_autorizados || []).map(normalize),
        overloadMarginPercent: 10,
        activo: t.activo !== false
      };
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

    const techHoursMap: { [techId: number]: number } = {};
    newTechnicians.forEach(t => { techHoursMap[t.id] = 0; });

    let localTasks: MaintenanceTask[] = [];
    const localTasksStr = localStorage.getItem('techflow_v2_tasks');
    if (localTasksStr) {
      try {
        localTasks = JSON.parse(localTasksStr);
      } catch (e) {}
    }

    const newTasks: MaintenanceTask[] = [];

    preventivosRaw.forEach(p => {
      const title = p.titulo;
      const tiempoMinutos = p.duracion_minutos || 60;
      const id = p.id;
      const codigo = p.codigo || `MP-${p.id}`;
      const detalle = p.detalle_instrucciones || '';
      const maquina = p.maquina || 'Equipo General';
      const planta = p.planta || 'Mármol Sintético';
      const idtecsList: number[] = Array.isArray(p.id_tecnicos_autorizados) ? p.id_tecnicos_autorizados : [];
      const tipoIntervencion = p.tipo_intervencion || 'NP';
      const frecuencia = p.frecuencia_dias || 15;
      const refFrecuencia = p.ref_frecuencia || 15;

      if (!title) return;

      // Cross-match with official catalog
      const matchResult = matchPlanWithMaquina(p, machinesList);
      const codigoMaquina = matchResult.codigo || null;
      const idMaquina = matchResult.matched?.id || null;
      const finalMaquinaName = matchResult.nombre || maquina;
      const finalPlanta = p.planta ? obtenerCodigoPlanta(p.planta, plantasNomenclatura) : (matchResult.matched?.planta ? obtenerCodigoPlanta(matchResult.matched.planta, plantasNomenclatura) : 'MS');

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
          if (tech.authorizedTitles.length > 0 && !tech.authorizedTitles.includes(normalize(title))) {
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

      const matchingLocal = localTasks.find(t => t.id === id || t.title === title);
      const matchingOrden = ordenesRaw.find(o => o.id_plan_preventivo === id || o.titulo === title);

      const wasAdelantada = matchingOrden ? !!matchingOrden.adelantada : (matchingLocal ? !!matchingLocal.adelantada : false);
      const isDueFinal = isValidFrequency || wasAdelantada;
      const finalCandidate = (matchingOrden && matchingOrden.id_tecnico) 
        ? matchingOrden.id_tecnico 
        : ((matchingLocal && matchingLocal.idtecs && matchingLocal.idtecs !== 9999) ? matchingLocal.idtecs : bestCandidate);

      if (isDueFinal && finalCandidate !== 9999) {
        techHoursMap[finalCandidate] = (techHoursMap[finalCandidate] || 0) + (tiempoMinutos / 60);
      }

      if (!isDueFinal) {
        bestErrors.push('frecuencia_insuficiente');
      }

      const assignedTechObj = newTechnicians.find(t => t.id === finalCandidate);
      const techTurno = assignedTechObj ? assignedTechObj.turno : '';

      const finalStatus = matchingOrden?.estado || matchingLocal?.status || 'Pendiente';
      const finalObs = matchingOrden?.comentarios_ejecucion || matchingLocal?.observations || '';
      const finalApertura = matchingOrden?.fecha_apertura || matchingLocal?.fechaApertura || (finalCandidate !== 9999 ? getLocalDatetimeString() : null);
      const finalCierre = matchingOrden?.fecha_cierre || matchingLocal?.fechaCierre || null;

      newTasks.push({
        id: id,
        csvId: `MP-${id}`,
        code: codigo,
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
        maquina: finalMaquinaName,
        codigoMaquina: codigoMaquina,
        idMaquina: idMaquina,
        planta: finalPlanta,
        status: finalStatus,
        observations: finalObs,
        fechaApertura: finalApertura,
        fechaCierre: finalCierre,
        activo: p.activo !== false
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
        await supabase.from('mantenimiento_ordenes').insert({
          id_plan_preventivo: task.id,
          codigo: task.code,
          titulo: task.title,
          maquina: task.maquina,
          planta: task.planta,
          id_tecnico: tech?.id !== 9999 ? tech?.id : null,
          tecnico_nombre: techName,
          turno: tech?.turno || 'General',
          fecha_programada: new Date().toISOString().slice(0, 10),
          duracion_estimada_min: task.durationMinutes,
          estado: task.status,
          fecha_apertura: formatDateForSupabase(task.fechaApertura),
          fecha_cierre: formatDateForSupabase(task.fechaCierre),
          comentarios_ejecucion: task.observations || '',
          adelantada: !!task.adelantada
        });

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
        await supabase.from('mantenimiento_ordenes').insert({
          id_plan_preventivo: task.id,
          codigo: task.code,
          titulo: task.title,
          maquina: task.maquina,
          planta: task.planta,
          id_tecnico: tech?.id !== 9999 ? tech?.id : null,
          tecnico_nombre: techName,
          turno: tech?.turno || 'General',
          fecha_programada: new Date().toISOString().slice(0, 10),
          duracion_estimada_min: task.durationMinutes,
          estado: task.status || 'Pendiente',
          fecha_apertura: formatDateForSupabase(task.fechaApertura),
          fecha_cierre: formatDateForSupabase(task.fechaCierre),
          comentarios_ejecucion: task.observations || '',
          adelantada: !!task.adelantada
        });

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
          if (assignedTech.authorizedTitles.length > 0 && !assignedTech.authorizedTitles.includes(normalize(t.title))) {
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
        await supabase.from('mantenimiento_ordenes').insert({
          id_plan_preventivo: task.id,
          codigo: task.code,
          titulo: task.title,
          maquina: task.maquina,
          planta: task.planta,
          id_tecnico: assignedTech.id,
          tecnico_nombre: assignedTech.name,
          turno: assignedTech.turno,
          fecha_programada: new Date().toISOString().slice(0, 10),
          duracion_estimada_min: task.durationMinutes,
          estado: task.status || 'Pendiente',
          fecha_apertura: formatDateForSupabase(task.fechaApertura),
          adelantada: !!task.adelantada
        });
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

  const handleDeleteTech = async (techId: number) => {
    const current = technicians.find(t => t.id === techId);
    if (!current) return;
    if (confirm(`¿Estás seguro de desactivar a "${current.name}"?`)) {
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
      try {
        await supabase.from('mantenimiento_tecnicos').update({ activo: false }).eq('id', techId);
      } catch (err) {
        console.warn('Error desactivando técnico en Supabase:', err);
      }
    }
  };

  const handleAddTechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTechForm.name.trim();
    if (!name) return;

    let newTechId = parseInt(newTechForm.id) || Date.now();
    const isInactive = newTechForm.turno === 'INACTIVO';
    const pList = newTechForm.plantas && newTechForm.plantas.length > 0 ? newTechForm.plantas : ['MS'];
    const pStr = pList.join(', ');

    try {
      const { data } = await supabase.from('mantenimiento_tecnicos').insert([{
        nombre: name,
        documento: newTechForm.documento.trim() || undefined,
        turno: newTechForm.turno,
        planta: pStr,
        especialidad: pStr,
        capacidad_horas: parseFloat(newTechForm.capacity) || systemSettings.baseCapacity,
        activo: !isInactive
      }]).select().single();

      if (data) {
        newTechId = data.id;
      }
    } catch (err) {
      console.warn('Error guardando técnico en Supabase:', err);
    }

    const newTech: Technician = {
      id: newTechId,
      name: name,
      turno: newTechForm.turno,
      documento: newTechForm.documento.trim() || undefined,
      planta: pStr,
      plantas: pList,
      especialidad: pStr,
      capacity: parseFloat(newTechForm.capacity) || systemSettings.baseCapacity,
      overloadMarginPercent: parseFloat(newTechForm.overloadMarginPercent) || systemSettings.defaultOverloadMargin,
      authorizedTitles: [],
      activo: !isInactive
    };

    const updatedTechs = [...technicians.filter(t => t.id !== 9999), newTech];
    const superTech = technicians.find(t => t.id === 9999);
    if (superTech) updatedTechs.push(superTech);

    persistState(tasks, updatedTechs);
    setSelectedTechId(newTechId);
    setShowTechModal(false);
    setNewTechForm({ id: '', name: '', turno: 'PR', documento: '', planta: 'MS', plantas: ['MS'], capacity: '7.2', overloadMarginPercent: '10' });
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    let createdId = Date.now();
    const codigoGen = `MP-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const { data } = await supabase.from('mantenimiento_planes_preventivos').insert([{
        codigo: codigoGen,
        titulo: newTaskForm.title.trim(),
        duracion_minutos: newTaskForm.durationMinutes,
        tipo_intervencion: newTaskForm.intervencion,
        turno_requerido: 'General',
        frecuencia_dias: newTaskForm.frecuencia,
        ref_frecuencia: newTaskForm.refFrecuencia,
        id_tecnicos_autorizados: [],
        detalle_instrucciones: newTaskForm.detalle.trim(),
        maquina: newTaskForm.maquina.trim() || 'General',
        planta: newTaskForm.planta.trim() || 'Mármol Sintético',
        activo: true
      }]).select().single();

      if (data) {
        createdId = data.id;
      }
    } catch (err) {
      console.warn('Error guardando PMP en Supabase:', err);
    }

    const newTask: MaintenanceTask = {
      id: createdId,
      csvId: `MP-${createdId}`,
      code: codigoGen,
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

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
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

    try {
      await supabase.from('mantenimiento_planes_preventivos').update({
        codigo: editingTask.code,
        titulo: editingTask.title,
        maquina: editingTask.maquina,
        planta: editingTask.planta,
        duracion_minutos: editingTask.durationMinutes,
        tipo_intervencion: editingTask.tipoIntervencion,
        frecuencia_dias: editingTask.frecuencia,
        ref_frecuencia: editingTask.refFrecuencia,
        id_tecnicos_autorizados: editingTask.idtecsCandidates,
        detalle_instrucciones: editingTask.detalle
      }).eq('id', editingTask.id);
    } catch (err) {
      console.warn('Error actualizando PMP en Supabase:', err);
    }

    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: number) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    if (confirm(`¿Estás seguro de eliminar el mantenimiento "${taskToDelete.title}" de la base maestra de Supabase?`)) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      persistState(updatedTasks, technicians);
      try {
        await supabase.from('mantenimiento_planes_preventivos').delete().eq('id', taskId);
      } catch (err) {
        console.warn('Error eliminando PMP en Supabase:', err);
      }
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
    const currentPlantas = parseTechPlantas(tech.planta || tech.especialidad, plantasNomenclatura);
    setEditingTech({
      ...tech,
      plantas: currentPlantas,
      planta: currentPlantas.join(', ')
    });
    setShowEditTechModal(true);
  };

  const handleSaveTechEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;

    const isInactive = editingTech.turno === 'INACTIVO';
    const plantasArray = editingTech.plantas && editingTech.plantas.length > 0
      ? editingTech.plantas
      : (editingTech.planta ? parseTechPlantas(editingTech.planta, plantasNomenclatura) : ['MS']);
    const plantasStr = plantasArray.join(', ');

    const updatedTech: Technician = {
      ...editingTech,
      plantas: plantasArray,
      planta: plantasStr,
      especialidad: plantasStr,
      activo: !isInactive
    };

    const updatedTechs = technicians.map(t => (t.id === editingTech.id ? updatedTech : t));
    persistState(tasks, updatedTechs);
    setShowEditTechModal(false);

    try {
      await supabase.from('mantenimiento_tecnicos').update({
        nombre: updatedTech.name,
        documento: updatedTech.documento,
        turno: updatedTech.turno,
        planta: plantasStr,
        especialidad: plantasStr,
        capacidad_horas: updatedTech.capacity,
        activo: !isInactive
      }).eq('id', editingTech.id);
    } catch (err) {
      console.warn('Error actualizando técnico en Supabase:', err);
    }

    setEditingTech(null);
  };

  // System Settings Handler
  const handleSaveSystemSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('techflow_system_settings', JSON.stringify(systemSettings));
    setSystemSavedFeedback(true);

    try {
      await supabase.from('mantenimiento_configuracion').upsert({
        id: 1,
        capacidad_base_horas: systemSettings.baseCapacity,
        margen_sobrecarga_pct: systemSettings.defaultOverloadMargin,
        umbral_alerta_pct: systemSettings.warningThresholdPercent,
        modo_turnos: systemSettings.turnoMode
      });
    } catch (err) {
      console.warn('Error guardando configuración en Supabase:', err);
    }

    setTimeout(() => setSystemSavedFeedback(false), 3000);
  };

  // Máquinas y Equipos Handlers (Creación, Edición y Guardado en Supabase)
  const resetMachineForm = () => {
    setMachineFormData({
      nombre_equipo: '',
      nombre_alterno: '',
      codigo_equipo: '',
      activo_fijo: '',
      tipo: '',
      estado: 'ACTIVO',
      marca: '',
      modelo: '',
      caracteristicas: '',
      fecha_compra: '',
      fecha_instalacion: '',
      valor_compra: '',
      valor_nuevo: '',
      planta: uniqueMaquinasPlantas[0] || 'Mármol Sintético',
      proceso: '',
      clasificacion: '',
      criticidad: '',
      bodega: '',
      factura: '',
      fotos: '',
      planos: '',
      manuales: '',
      estandares: '',
      proveedor_nombre: '',
      proveedor_contacto: '',
      proveedor_telefono: '',
      proveedor_email: '',
      notas: ''
    });
    setEditingMachineId(null);
    setMachineFormTab('general');
    if (machineFileInputRef.current) {
      machineFileInputRef.current.value = '';
    }
  };

  const handleMachinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar los 10MB.');
      return;
    }

    setUploadingMachinePhoto(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `maquinas/${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fichas-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Error subiendo a Supabase Storage (fichas-media), usando base64:', uploadError);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setMachineFormData(prev => ({ ...prev, fotos: base64data }));
        };
        reader.readAsDataURL(file);
      } else {
        const { data: urlData } = supabase.storage.from('fichas-media').getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          setMachineFormData(prev => ({ ...prev, fotos: urlData.publicUrl }));
        }
      }
    } catch (err: any) {
      console.error('Error procesando fotografía de máquina:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setMachineFormData(prev => ({ ...prev, fotos: base64data }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingMachinePhoto(false);
      if (machineFileInputRef.current) {
        machineFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMachinePhoto = () => {
    setMachineFormData(prev => ({ ...prev, fotos: '' }));
    if (machineFileInputRef.current) {
      machineFileInputRef.current.value = '';
    }
  };

  const handleOpenCreateMachine = () => {
    resetMachineForm();
    setMachineFormMode('create');
    setShowMachineFormModal(true);
  };

  const handleOpenEditMachine = (m: any) => {
    if (!m) return;
    setEditingMachineId(m.id);
    setMachineFormMode('edit');
    setMachineFormTab('general');
    setMachineFormData({
      nombre_equipo: m.nombre_equipo || '',
      nombre_alterno: m.nombre_alterno || '',
      codigo_equipo: m.codigo_equipo || '',
      activo_fijo: m.activo_fijo || '',
      tipo: m.tipo || '',
      estado: m.estado || 'ACTIVO',
      marca: m.marca || '',
      modelo: m.modelo || '',
      caracteristicas: m.caracteristicas || '',
      fecha_compra: m.fecha_compra || '',
      fecha_instalacion: m.fecha_instalacion || '',
      valor_compra: m.valor_compra ? String(m.valor_compra) : '',
      valor_nuevo: m.valor_nuevo ? String(m.valor_nuevo) : '',
      planta: m.planta || 'Mármol Sintético',
      proceso: m.proceso || '',
      clasificacion: m.clasificacion || '',
      criticidad: m.criticidad || '',
      bodega: m.bodega || '',
      factura: m.factura || '',
      fotos: m.fotos || '',
      planos: m.planos || '',
      manuales: m.manuales || '',
      estandares: m.estandares || '',
      proveedor_nombre: m.proveedor_nombre || '',
      proveedor_contacto: m.proveedor_contacto || '',
      proveedor_telefono: m.proveedor_telefono || '',
      proveedor_email: m.proveedor_email || '',
      notas: m.notas || ''
    });
    setShowMachineFormModal(true);
  };

  const handleSaveMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineFormData.nombre_equipo.trim()) {
      alert('El nombre del equipo o máquina es obligatorio.');
      return;
    }

    setSavingMachine(true);
    try {
      const payload: any = {
        nombre_equipo: machineFormData.nombre_equipo.trim(),
        nombre_alterno: machineFormData.nombre_alterno.trim() || null,
        codigo_equipo: machineFormData.codigo_equipo.trim().toUpperCase() || null,
        activo_fijo: machineFormData.activo_fijo.trim() || null,
        tipo: machineFormData.tipo.trim() || null,
        estado: machineFormData.estado || 'ACTIVO',
        marca: machineFormData.marca.trim() || null,
        modelo: machineFormData.modelo.trim() || null,
        caracteristicas: machineFormData.caracteristicas.trim() || null,
        fecha_compra: machineFormData.fecha_compra || null,
        fecha_instalacion: machineFormData.fecha_instalacion || null,
        valor_compra: machineFormData.valor_compra ? parseFloat(machineFormData.valor_compra) : null,
        valor_nuevo: machineFormData.valor_nuevo ? parseFloat(machineFormData.valor_nuevo) : null,
        planta: machineFormData.planta || null,
        proceso: machineFormData.proceso.trim() || null,
        clasificacion: machineFormData.clasificacion || null,
        criticidad: machineFormData.criticidad || null,
        bodega: machineFormData.bodega.trim() || null,
        factura: machineFormData.factura.trim() || null,
        fotos: machineFormData.fotos.trim() || null,
        planos: machineFormData.planos.trim() || null,
        manuales: machineFormData.manuales.trim() || null,
        estandares: machineFormData.estandares.trim() || null,
        proveedor_nombre: machineFormData.proveedor_nombre.trim() || null,
        proveedor_contacto: machineFormData.proveedor_contacto.trim() || null,
        proveedor_telefono: machineFormData.proveedor_telefono.trim() || null,
        proveedor_email: machineFormData.proveedor_email.trim() || null,
        notas: machineFormData.notas.trim() || null
      };

      if (machineFormMode === 'create') {
        const { data, error } = await supabase
          .from('maquinas_equipos')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMaquinasCatalogo(prev => [data, ...prev]);
          setSelectedMachineModal(data);
          alert('¡Máquina o equipo creado exitosamente en Supabase!');
        }
      } else if (machineFormMode === 'edit' && editingMachineId) {
        const { data, error } = await supabase
          .from('maquinas_equipos')
          .update(payload)
          .eq('id', editingMachineId)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMaquinasCatalogo(prev => prev.map(m => (m.id === editingMachineId ? data : m)));
          if (selectedMachineModal && selectedMachineModal.id === editingMachineId) {
            setSelectedMachineModal(data);
          }
          alert('¡Ficha técnica de máquina actualizada correctamente en Supabase!');
        }
      }

      setShowMachineFormModal(false);
      resetMachineForm();
    } catch (err: any) {
      console.error('Error guardando máquina en Supabase:', err);
      alert('Error al guardar la máquina: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingMachine(false);
    }
  };

  const handleRequestDeleteMachine = (m: any) => {
    if (!m) return;
    setMachineToDelete({
      id: m.id,
      nombre: m.nombre_equipo || 'Equipo sin nombre',
      codigo: m.codigo_equipo || '',
      planta: m.planta || ''
    });
  };

  const handleConfirmDeleteMachine = async () => {
    if (!machineToDelete) return;
    const { id, nombre } = machineToDelete;

    setDeletingMachine(true);
    try {
      const { error } = await supabase
        .from('maquinas_equipos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMaquinasCatalogo(prev => prev.filter(m => m.id !== id));
      if (selectedMachineModal && selectedMachineModal.id === id) {
        setSelectedMachineModal(null);
      }
      setShowMachineFormModal(false);
      setMachineToDelete(null);
      alert(`¡La máquina "${nombre}" fue eliminada permanentemente de Supabase!`);
    } catch (err: any) {
      console.error('Error eliminando máquina en Supabase:', err);
      alert('Error al eliminar la máquina: ' + (err.message || 'Error desconocido'));
    } finally {
      setDeletingMachine(false);
    }
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
    plantasNomenclatura.filter(p => p.activo !== false).forEach(p => {
      set.add(p.codigo);
      set.add(p.nombre_oficial);
    });
    tasks.forEach(t => { if (t.planta && t.planta.trim() !== '' && t.planta !== 'Todas') set.add(t.planta); });
    return ['Todas', ...Array.from(set)];
  }, [tasks, plantasNomenclatura]);

  const frecuenciaOptions = useMemo(() => {
    const set = new Set<number>();
    tasks.forEach(t => { if (t.frecuencia) set.add(t.frecuencia); });
    return ['Todas', ...Array.from(set).sort((a, b) => a - b).map(f => `${f}d`)];
  }, [tasks]);

  const filteredPreventivoTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      if (preventivoSearch.trim()) {
        const q = normalize(preventivoSearch);
        const matches =
          normalize(task.title).includes(q) ||
          normalize(task.code).includes(q) ||
          normalize(task.csvId).includes(q) ||
          normalize(task.maquina).includes(q) ||
          normalize(task.codigoMaquina || '').includes(q) ||
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

    return [...filtered].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (pmpSortField) {
        case 'id':
          valA = a.id || 0;
          valB = b.id || 0;
          break;
        case 'code':
          valA = (a.code || a.csvId || '').toLowerCase();
          valB = (b.code || b.csvId || '').toLowerCase();
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'detalle':
          valA = (a.detalle || '').toLowerCase();
          valB = (b.detalle || '').toLowerCase();
          break;
        case 'planta':
          valA = (a.planta || '').toLowerCase();
          valB = (b.planta || '').toLowerCase();
          break;
        case 'maquina':
          valA = `${a.codigoMaquina || ''} ${a.maquina || ''}`.toLowerCase();
          valB = `${b.codigoMaquina || ''} ${b.maquina || ''}`.toLowerCase();
          break;
        case 'frecuencia':
          valA = a.frecuencia || 0;
          valB = b.frecuencia || 0;
          break;
        case 'refFrecuencia':
          valA = a.refFrecuencia || 0;
          valB = b.refFrecuencia || 0;
          break;
        case 'durationMinutes':
          valA = a.durationMinutes || 0;
          valB = b.durationMinutes || 0;
          break;
        case 'tipoIntervencion':
          valA = (a.tipoIntervencion || '').toLowerCase();
          valB = (b.tipoIntervencion || '').toLowerCase();
          break;
        case 'tecnicos':
          valA = (a.idtecsCandidates || []).length;
          valB = (b.idtecsCandidates || []).length;
          break;
        case 'activo':
          valA = a.activo !== false ? 1 : 0;
          valB = b.activo !== false ? 1 : 0;
          break;
        default:
          valA = a.id || 0;
          valB = b.id || 0;
      }

      if (valA < valB) return pmpSortAsc ? -1 : 1;
      if (valA > valB) return pmpSortAsc ? 1 : -1;
      return 0;
    });
  }, [tasks, preventivoSearch, preventivoPlanta, preventivoFrecuencia, preventivoTurno, pmpSortField, pmpSortAsc]);

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

  // Máquinas y Equipos Memoized Filtered & Sorted Records
  const uniqueMaquinasPlantas = useMemo(() => {
    const set = new Set<string>();
    plantasNomenclatura.filter(p => p.activo !== false).forEach(p => {
      set.add(p.nombre_oficial);
    });
    maquinasCatalogo.forEach(m => {
      if (m.planta && m.planta.trim() !== '') set.add(m.planta.trim());
    });
    return Array.from(set).sort();
  }, [maquinasCatalogo, plantasNomenclatura]);

  // Pre-indexed PMP counts per machine (O(1) Instant Lookup - Eliminates all search lag)
  const machinePmpCountsMap = useMemo(() => {
    const counts = new Map<number, number>();
    if (!tasks || tasks.length === 0 || !maquinasCatalogo || maquinasCatalogo.length === 0) return counts;

    const tasksByName = new Map<string, number>();
    const tasksById = new Map<number, number>();

    tasks.forEach(t => {
      if (t.idMaquina) {
        tasksById.set(t.idMaquina, (tasksById.get(t.idMaquina) || 0) + 1);
      }
      const tMaq = normalize(t.maquina || '');
      if (tMaq) tasksByName.set(tMaq, (tasksByName.get(tMaq) || 0) + 1);
    });

    maquinasCatalogo.forEach(m => {
      if (tasksById.has(m.id)) {
        counts.set(m.id, tasksById.get(m.id)!);
        return;
      }
      const code = (m.codigo_equipo || '').toUpperCase().trim();
      const name = normalize(m.nombre_equipo || '');
      const alt = normalize(m.nombre_alterno || '');

      let cnt = 0;
      if (code && code !== '-' && code !== 'N/A' && code !== '0' && code.length >= 2) {
        for (let i = 0; i < tasks.length; i++) {
          const p = tasks[i];
          const pCode = (p.code || p.csvId || '').toUpperCase();
          const pTitle = (p.title || '').toUpperCase();
          const pMaq = (p.maquina || '').toUpperCase();
          if (pCode.includes(code) || pTitle.includes(code) || pMaq.includes(code)) {
            cnt++;
          }
        }
      } else {
        cnt = (tasksByName.get(name) || 0) + (alt ? (tasksByName.get(alt) || 0) : 0);
      }
      counts.set(m.id, cnt);
    });

    return counts;
  }, [tasks, maquinasCatalogo]);

  const filteredMaquinasList = useMemo(() => {
    const q = maquinasSearch.trim().toLowerCase();

    const list = maquinasCatalogo.filter(m => {
      if (q) {
        const code = (m.codigo_equipo || '').toLowerCase();
        const name = (m.nombre_equipo || '').toLowerCase();
        const alt = (m.nombre_alterno || '').toLowerCase();
        const brand = (m.marca || '').toLowerCase();
        const model = (m.modelo || '').toLowerCase();
        const plant = (m.planta || '').toLowerCase();
        const process = (m.proceso || '').toLowerCase();

        if (
          !code.includes(q) &&
          !name.includes(q) &&
          !alt.includes(q) &&
          !brand.includes(q) &&
          !model.includes(q) &&
          !plant.includes(q) &&
          !process.includes(q)
        ) {
          return false;
        }
      }

      if (maquinasPlanta !== 'Todas' && m.planta !== maquinasPlanta) {
        return false;
      }

      if (maquinasCriticidad !== 'Todas' && m.criticidad !== maquinasCriticidad) {
        return false;
      }

      if (maquinasEstado !== 'Todos') {
        const est = (m.estado || '').toUpperCase();
        const isAct = est.includes('ACTIVO') || est.includes('ACTIVA') || est.includes('OPERATIVA') || !est;
        if (maquinasEstado === 'Activos' && !isAct) return false;
        if (maquinasEstado === 'Inactivos' && isAct) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      switch (maquinasSortColumn) {
        case 'codigo_equipo':
          valA = (a.codigo_equipo || '').toLowerCase();
          valB = (b.codigo_equipo || '').toLowerCase();
          break;
        case 'nombre_equipo':
          valA = (a.nombre_equipo || '').toLowerCase();
          valB = (b.nombre_equipo || '').toLowerCase();
          break;
        case 'marca':
          valA = `${a.marca || ''} ${a.modelo || ''}`.toLowerCase();
          valB = `${b.marca || ''} ${b.modelo || ''}`.toLowerCase();
          break;
        case 'planta':
          valA = (a.planta || '').toLowerCase();
          valB = (b.planta || '').toLowerCase();
          break;
        case 'criticidad':
          valA = a.criticidad || 'Z';
          valB = b.criticidad || 'Z';
          break;
        case 'estado':
          valA = (a.estado || '').toLowerCase();
          valB = (b.estado || '').toLowerCase();
          break;
        default:
          valA = (a.nombre_equipo || '').toLowerCase();
          valB = (b.nombre_equipo || '').toLowerCase();
      }
      if (valA < valB) return maquinasSortAsc ? -1 : 1;
      if (valA > valB) return maquinasSortAsc ? 1 : -1;
      return 0;
    });
  }, [maquinasCatalogo, maquinasSearch, maquinasPlanta, maquinasCriticidad, maquinasEstado, maquinasSortColumn, maquinasSortAsc]);

  const totalMaquinasPages = Math.ceil(filteredMaquinasList.length / maquinasPageSize) || 1;

  const paginatedMaquinasList = useMemo(() => {
    const start = (maquinasPage - 1) * maquinasPageSize;
    return filteredMaquinasList.slice(start, start + maquinasPageSize);
  }, [filteredMaquinasList, maquinasPage, maquinasPageSize]);

  // Excel Export for Preventivo
  const handleDownloadPreventivoExcel = () => {
    if (filteredPreventivoTasks.length === 0) {
      alert('No hay datos en el plan preventivo para exportar con los filtros actuales.');
      return;
    }

    try {
      const dataToExport = filteredPreventivoTasks.map(t => {
        const candidateNames = (t.idtecsCandidates || [])
          .map(cid => {
            const tech = technicians.find(tc => tc.id === cid);
            return tech ? tech.name : `#${cid}`;
          })
          .join(', ');

        return {
          'ID': t.id,
          'Código': t.code || t.csvId,
          'Mantenimiento / Tarea': t.title,
          'Detalle / Instrucciones': t.detalle || '',
          'Planta': t.planta,
          'Máquinas y Equipos': t.maquina,
          'Frecuencia Base (Días)': t.frecuencia,
          'Ref. Frecuencia (Días)': t.refFrecuencia,
          'Duración (Min)': t.durationMinutes,
          'Duración (Hrs)': Number(t.durationHours.toFixed(2)),
          'Turno Requerido': t.tipoIntervencion || 'General',
          'Técnicos Habilitados': candidateNames || 'Todos',
          'Estado': t.activo !== false ? 'Activo' : 'Inactivo'
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
        'Máquinas y Equipos': c.maquina,
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
    { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
    { id: 'maquinas', label: 'Máquinas y Equipos', icon: <Cpu size={16} /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings size={16} /> },
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
        title="Gestor de Mantenimiento"
        subtitle="Planificación y Asignación de Técnicos"
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

            {/* Action Row - Sincronizar / Actualizar Supabase (Positioned right below 4th KPI card) */}
            <div className="flex items-center justify-end -mt-1">
              <button
                onClick={() => fetchData(true)}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#324354] text-[#324354] hover:bg-[#324354] hover:text-white font-bold rounded-xl text-xs transition-all duration-200 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Actualizar datos directamente desde Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Actualizando...' : 'Actualizar Datos'}</span>
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
            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#324354] text-sm sm:text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#7B8E90]" />
                  <span>Filtros de Catálogo ({filteredPreventivoTasks.length} de {tasks.length} estándares)</span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Mantenimiento</span>
                  </button>
                  <button
                    onClick={handleDownloadPreventivoExcel}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
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
                    placeholder="Buscar por título, código, máquina, detalle..."
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

            {/* Preventivo Master Table with Full Columns & Column Sorting */}
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#324354] text-white sticky top-0 z-20 shadow-xs">
                    <tr>
                      {/* ID */}
                      <th
                        onClick={() => handlePmpSort('id')}
                        className="py-3.5 px-3 font-bold text-center w-14 cursor-pointer select-none hover:bg-[#3d5166] transition-colors"
                        title="Clic para ordenar por ID"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span># ID</span>
                          {pmpSortField === 'id' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Código */}
                      <th
                        onClick={() => handlePmpSort('code')}
                        className="py-3.5 px-3.5 font-bold cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Código/Nomenclatura"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Código / Nomenclatura</span>
                          {pmpSortField === 'code' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Título */}
                      <th
                        onClick={() => handlePmpSort('title')}
                        className="py-3.5 px-4 font-bold min-w-[240px] cursor-pointer select-none hover:bg-[#3d5166] transition-colors"
                        title="Clic para ordenar por Título del Mantenimiento"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Título del Mantenimiento</span>
                          {pmpSortField === 'title' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Planta */}
                      <th
                        onClick={() => handlePmpSort('planta')}
                        className="py-3.5 px-3 font-bold cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Planta"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Planta</span>
                          {pmpSortField === 'planta' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Máquina */}
                      <th
                        onClick={() => handlePmpSort('maquina')}
                        className="py-3.5 px-3 font-bold cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Máquinas y Equipos"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Máquinas y Equipos</span>
                          {pmpSortField === 'maquina' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Frecuencia Base */}
                      <th
                        onClick={() => handlePmpSort('frecuencia')}
                        className="py-3.5 px-3 font-bold text-center cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Frecuencia Base (Días)"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Frecuencia Base</span>
                          {pmpSortField === 'frecuencia' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Ref. Frecuencia */}
                      <th
                        onClick={() => handlePmpSort('refFrecuencia')}
                        className="py-3.5 px-3 font-bold text-center cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Referencia de Frecuencia"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Ref. Frecuencia</span>
                          {pmpSortField === 'refFrecuencia' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Duración Estándar */}
                      <th
                        onClick={() => handlePmpSort('durationMinutes')}
                        className="py-3.5 px-3 font-bold text-center cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Duración Estándar"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Duración</span>
                          {pmpSortField === 'durationMinutes' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Turno */}
                      <th
                        onClick={() => handlePmpSort('tipoIntervencion')}
                        className="py-3.5 px-3 font-bold text-center cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Turno Requerido"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Turno</span>
                          {pmpSortField === 'tipoIntervencion' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Técnicos Habilitados */}
                      <th
                        onClick={() => handlePmpSort('tecnicos')}
                        className="py-3.5 px-4 font-bold min-w-[180px] cursor-pointer select-none hover:bg-[#3d5166] transition-colors"
                        title="Clic para ordenar por cantidad de técnicos habilitados"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Técnicos Habilitados</span>
                          {pmpSortField === 'tecnicos' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Estado */}
                      <th
                        onClick={() => handlePmpSort('activo')}
                        className="py-3.5 px-3 font-bold text-center cursor-pointer select-none hover:bg-[#3d5166] transition-colors whitespace-nowrap"
                        title="Clic para ordenar por Estado Activo"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Estado</span>
                          {pmpSortField === 'activo' ? (
                            pmpSortAsc ? <ArrowUp className="w-3.5 h-3.5 text-amber-300" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </th>

                      {/* Acciones */}
                      <th className="py-3.5 px-4 font-bold text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPreventivoTasks.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-gray-400">
                          No se encontraron mantenimientos en la base de datos con los filtros seleccionados.
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
                          <tr 
                            key={task.id || idx} 
                            onClick={() => setViewingTask(task)}
                            className="hover:bg-slate-100/90 active:bg-slate-200/50 cursor-pointer transition-colors group"
                            title="Haz clic para ver la ficha técnica y procedimiento completo"
                          >
                            {/* ID */}
                            <td className="py-3.5 px-3 text-center font-bold text-gray-400 whitespace-nowrap">
                              <span className="font-mono text-[11px] text-slate-500 group-hover:text-[#324354] font-semibold">#{task.id}</span>
                            </td>

                            {/* Código / Nomenclatura */}
                            <td className="py-3.5 px-3.5 font-bold text-[#324354] whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-mono text-[11px] group-hover:bg-white group-hover:border-slate-300 transition-colors">
                                {task.code || task.csvId}
                              </span>
                            </td>

                            {/* Título */}
                            <td className="py-3.5 px-4 text-[#324354] font-bold text-xs sm:text-sm">
                              <div className="flex items-center gap-1.5">
                                <span>{task.title}</span>
                              </div>
                            </td>

                            {/* Planta */}
                            <td className="py-3.5 px-3 text-gray-700 font-semibold whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-[#F6F3EE] rounded-md border border-[#e2ded5] text-[11px] font-bold text-[#324354]">
                                {obtenerCodigoPlanta(task.planta, plantasNomenclatura)}
                              </span>
                            </td>

                            {/* Máquina / Equipo */}
                            <td className="py-3.5 px-3 text-gray-800 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {task.codigoMaquina && (
                                  <span className="px-1.5 py-0.5 bg-[#324354]/10 text-[#324354] border border-[#324354]/20 rounded text-[10px] font-mono font-bold shrink-0">
                                    {task.codigoMaquina}
                                  </span>
                                )}
                                <span className="font-semibold text-gray-800">{task.maquina}</span>
                              </div>
                            </td>

                            {/* Frecuencia Base */}
                            <td className="py-3.5 px-3 text-center font-bold text-[#324354] whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-md font-bold text-[11px]">
                                {task.frecuencia}d
                              </span>
                            </td>

                            {/* Ref. Frecuencia */}
                            <td className="py-3.5 px-3 text-center font-bold text-slate-700 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                                task.refFrecuencia >= task.frecuencia 
                                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}>
                                {task.refFrecuencia}d
                              </span>
                            </td>

                            {/* Duración Estándar */}
                            <td className="py-3.5 px-3 text-center font-medium text-gray-700 whitespace-nowrap">
                              <strong>{task.durationMinutes}m</strong> <span className="text-[11px] text-gray-500">({task.durationHours.toFixed(1)}h)</span>
                            </td>

                            {/* Turno */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 font-bold text-[#324354] border border-slate-200 rounded text-[11px]">
                                {task.tipoIntervencion || 'General'}
                              </span>
                            </td>

                            {/* Técnicos Habilitados */}
                            <td className="py-3.5 px-4">
                              {candidateTechs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {candidateTechs.map(ct => (
                                    <span key={ct.id} className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium rounded whitespace-nowrap">
                                      {ct.name.split(' ')[0]} {ct.name.split(' ')[1] ? ct.name.split(' ')[1][0] + '.' : ''}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Todos los técnicos del turno</span>
                              )}
                            </td>

                            {/* Estado (Activo) */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                task.activo !== false 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-gray-100 text-gray-500 border-gray-300'
                              }`}>
                                {task.activo !== false ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditTask(task);
                                  }}
                                  className="p-1.5 text-[#324354] hover:bg-white hover:text-blue-600 hover:border-gray-300 rounded-xl transition-all cursor-pointer border border-transparent"
                                  title="Editar mantenimiento base"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
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
                      <th className="py-3 px-4 font-bold min-w-[160px]">Máquinas y Equipos</th>
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
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-7 animate-in fade-in duration-300">
            
            {/* ========================================================================= */}
            {/* SECCIÓN 1: TÉCNICOS (Gestión de Técnicos y Capacidad) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2ded5] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">1</span>
                    <Users className="w-5 h-5 text-[#7B8E90]" />
                    <span>Gestión de Técnicos y Capacidad</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Gestión de cuadrilla en 3 columnas operativas: PR (Producción), NP (No Producción) e Inactivos.</p>
                </div>

                <button
                  onClick={() => setShowTechModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Técnico</span>
                </button>
              </div>

              {/* Buscador de Técnicos, Cédulas y Turnos */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={techConfigSearch}
                  onChange={(e) => setTechConfigSearch(e.target.value)}
                  placeholder="Buscar técnico por nombre, cédula (CC), ID o turno..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs sm:text-sm font-medium text-[#324354] focus:outline-none focus:border-[#324354] transition-all"
                />
                {techConfigSearch && (
                  <button
                    onClick={() => setTechConfigSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 3 Columnas: PR - Producción | NP - No Producción | Inactivos */}
              {(() => {
                const query = normalize(techConfigSearch);
                const allValidTechs = technicians.filter(t => t.id !== 9999);
                const filtered = allValidTechs.filter(t => {
                  if (!query) return true;
                  return (
                    normalize(t.name).includes(query) ||
                    (t.documento && normalize(t.documento).includes(query)) ||
                    t.id.toString().includes(query) ||
                    normalize(t.turno).includes(query) ||
                    (t.planta && normalize(t.planta).includes(query)) ||
                    normalize(getTurnoLabel(t.turno)).includes(query)
                  );
                });

                const colPR = filtered.filter(t => {
                  const tr = (t.turno || '').toUpperCase();
                  return tr !== 'INACTIVO' && (tr === 'PR' || tr.includes('PRODUCCION'));
                });

                const colNP = filtered.filter(t => {
                  const tr = (t.turno || '').toUpperCase();
                  return tr !== 'INACTIVO' && (tr === 'NP' || tr === 'PRNP' || tr === 'GENERAL' || tr.includes('PARO') || (!tr.includes('PRODUCCION') && tr !== 'PR'));
                });

                const colInactivos = filtered.filter(t => {
                  const tr = (t.turno || '').toUpperCase();
                  return tr === 'INACTIVO' || tr === 'INACTIVOS' || (t as any).activo === false;
                });

                const renderTechCard = (tech: Technician, badgeColor: string) => {
                  const effCap = getTechEffectiveCapacity(tech);
                  const margin = tech.overloadMarginPercent !== undefined ? tech.overloadMarginPercent : systemSettings.defaultOverloadMargin;
                  const baseCap = tech.capacity || systemSettings.baseCapacity;
                  const isInactive = (tech.turno || '').toUpperCase() === 'INACTIVO';
                  const techPlantas = parseTechPlantas(tech.planta || tech.especialidad, plantasNomenclatura);
                  const activePlantasCount = plantasNomenclatura.filter(p => p.activo !== false).length;
                  const isAllPlants = activePlantasCount > 0 && (techPlantas.length >= activePlantasCount || (tech.planta || '').trim().toLowerCase() === 'todas');

                  return (
                    <div
                      key={tech.id}
                      className={`p-3.5 bg-white rounded-2xl border transition-all flex flex-col gap-2.5 shadow-2xs ${
                        isInactive
                          ? 'border-gray-200 opacity-75 hover:opacity-100'
                          : 'border-[#e2ded5] hover:border-[#324354]/40 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Nombre Completo en 1 o 2 filas sin puntos suspensivos (...) */}
                          <div className="font-bold text-xs sm:text-[13px] text-[#324354] leading-snug break-words" title={tech.name}>
                            {tech.name}
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono font-bold">
                              ID: {tech.id}
                            </span>
                            {tech.documento && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono">
                                CC: {tech.documento}
                              </span>
                            )}
                            {isAllPlants ? (
                              <span
                                className="text-[10px] px-2 py-0.5 bg-sky-100 border border-sky-300 rounded text-sky-900 font-bold flex items-center gap-1 shadow-2xs"
                                title="Planta / Especialidad: Todas las Plantas"
                              >
                                <span>🏭</span>
                                <span>Todas</span>
                              </span>
                            ) : (
                              techPlantas.map(cod => (
                                <span
                                  key={cod}
                                  className="text-[10px] px-1.5 py-0.5 bg-sky-50 border border-sky-200 rounded text-sky-800 font-bold flex items-center gap-1"
                                  title={`Planta / Especialidad: ${cod}`}
                                >
                                  <span>🏭</span>
                                  <span>{cod}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditTech(tech)}
                            className="p-1.5 text-[#324354] hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-all cursor-pointer"
                            title="Modificar técnico"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTech(tech.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Desactivar técnico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${badgeColor}`}>
                          {getTurnoLabel(tech.turno)}
                        </span>
                        {!isInactive ? (
                          <div className="text-right">
                            <span className="font-bold text-[#324354]">{effCap.toFixed(1)}h</span>
                            <span className="text-gray-400 text-[10px] ml-1">({baseCap.toFixed(1)}h +{margin}%)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold italic">Inactivo en planta</span>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    
                    {/* Columna 1: PR - Producción */}
                    <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-emerald-200/80 flex flex-col gap-3 min-h-[300px]">
                      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/70">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                            PR · Producción
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200">
                          {colPR.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {colPR.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-xs italic">
                            No hay técnicos asignados a Producción (PR)
                          </div>
                        ) : (
                          colPR.map(tech => renderTechCard(tech, 'bg-emerald-50 text-emerald-700 border border-emerald-200'))
                        )}
                      </div>
                    </div>

                    {/* Columna 2: NP - No Producción */}
                    <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-sky-200/80 flex flex-col gap-3 min-h-[300px]">
                      <div className="flex items-center justify-between pb-2.5 border-b border-sky-200/70">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-sky-950">
                            NP · No Producción
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold text-xs rounded-full border border-sky-200">
                          {colNP.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {colNP.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-xs italic">
                            No hay técnicos asignados a No Producción (NP)
                          </div>
                        ) : (
                          colNP.map(tech => renderTechCard(tech, 'bg-sky-50 text-sky-700 border border-sky-200'))
                        )}
                      </div>
                    </div>

                    {/* Columna 3: Inactivos */}
                    <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-300/80 flex flex-col gap-3 min-h-[300px]">
                      <div className="flex items-center justify-between pb-2.5 border-b border-gray-300/70">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                            Inactivos
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-bold text-xs rounded-full border border-gray-300">
                          {colInactivos.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {colInactivos.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-xs italic">
                            No hay técnicos inactivos
                          </div>
                        ) : (
                          colInactivos.map(tech => renderTechCard(tech, 'bg-gray-100 text-gray-600 border border-gray-200'))
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 2: TIPO DE INTERVENCIÓN */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
              <div className="border-b border-[#e2ded5] pb-4">
                <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">2</span>
                  <Wrench className="w-5 h-5 text-[#7B8E90]" />
                  <span>Tipo de Intervención</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Estándar y condiciones operativas requeridas en planta para la ejecución del mantenimiento.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1: No Producción (NP) */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-rose-200/80 hover:border-rose-300 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-mono font-black text-xs rounded-lg border border-rose-200">
                      NP
                    </span>
                    <span className="text-[11px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      Paro Requerido
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#324354]">No Producción / Paro de Planta</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Mantenimientos que exigen que la máquina o línea productiva esté completamente detenida por seguridad técnica o acceso mecánico profundo.
                  </p>
                  <div className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-200/60 mt-auto">
                    💡 Ej: Calibración interna, cambio de rodamientos de eje principal, revisión de reductores.
                  </div>
                </div>

                {/* Card 2: En Producción (PR) */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-emerald-200/80 hover:border-emerald-300 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-mono font-black text-xs rounded-lg border border-emerald-200">
                      PR
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      En Operación
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#324354]">En Producción (Línea Activa)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Tareas preventivas, sensoriales y de inspección rutinaria que se pueden ejecutar con la máquina en marcha sin afectar el flujo de fabricación.
                  </p>
                  <div className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-200/60 mt-auto">
                    💡 Ej: Inspección de manómetros, termografía, lubricación externa de guías, verificación de fugas.
                  </div>
                </div>

                {/* Card 3: Producción y Paro (PRNP) */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-amber-200/80 hover:border-amber-300 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-mono font-black text-xs rounded-lg border border-amber-200">
                      PRNP
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                      Condición Flexible
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#324354]">Producción y Paro (Mixto)</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Procedimientos versátiles donde la fase de alistamiento se realiza en marcha y el ajuste fino en una detención corta o programada.
                  </p>
                  <div className="text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-200/60 mt-auto">
                    💡 Ej: Cambio de filtros con bypass, inspección previa y ajuste en cambio de turno.
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 3: PARÁMETROS DEL SISTEMA */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">3</span>
                    <SlidersHorizontal className="w-5 h-5 text-[#7B8E90]" />
                    <span>Parámetros del Sistema</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Control de jornada base, algoritmos de ocupación de cuadrilla y persistencia en Supabase.</p>
                </div>
                {systemSavedFeedback && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" /> ¡Parámetros Guardados!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveSystemSettings} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Jornada Base */}
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

                  {/* Margen de Sobrecarga */}
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
                      ⚡ Permite programar tareas adicionales sobre el límite para absorber imprevistos.
                    </p>
                  </div>

                  {/* Alerta Semáforo */}
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

                  {/* Compatibilidad de Turnos */}
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
                    <p className="text-[11px] text-gray-400 mt-1">Modo estricto vs flexible para validación en el planificador.</p>
                  </div>
                </div>

                <div className="flex items-center justify-start pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Guardar Parámetros del Sistema</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 4: PERIODICIDAD, TIEMPOS Y FORMACIÓN DE FLUJOS */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-6">
              <div className="border-b border-[#e2ded5] pb-4">
                <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">4</span>
                  <Clock className="w-5 h-5 text-[#7B8E90]" />
                  <span>Periodicidad, Tiempos y Formación de Flujos</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Estructura estandarizada de nomenclatura para la codificación y lectura unificada de rutinas.</p>
              </div>

              {/* Formato Maestra Banner: [D01MSNPT30] */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-[#324354] via-[#2c3d4f] to-[#1e293b] rounded-2xl text-white flex flex-col gap-3 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#deb841]">
                    Estructura Maestra de Nomenclatura
                  </span>
                  <span className="text-[11px] text-gray-300 font-mono">
                    [ Periodicidad + Planta + Tipo Intervención + Tiempo ]
                  </span>
                </div>

                <div className="flex items-center justify-center py-2">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 font-mono font-black text-2xl sm:text-3xl tracking-widest text-center">
                    <span className="text-amber-300">D01</span>
                    <span className="text-sky-300">MS</span>
                    <span className="text-rose-300">NP</span>
                    <span className="text-emerald-300">T30</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-white/15">
                  <div>
                    <span className="font-bold text-amber-300 block font-mono">D01</span>
                    <span className="text-gray-300 text-[11px]">Periodicidad (Diario)</span>
                  </div>
                  <div>
                    <span className="font-bold text-sky-300 block font-mono">MS</span>
                    <span className="text-gray-300 text-[11px]">Planta (Mármol Sint.)</span>
                  </div>
                  <div>
                    <span className="font-bold text-rose-300 block font-mono">NP</span>
                    <span className="text-gray-300 text-[11px]">Intervención (Paro)</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-300 block font-mono">T30</span>
                    <span className="text-gray-300 text-[11px]">Tiempo (30 Minutos)</span>
                  </div>
                </div>
              </div>

              {/* Grid 4 Columnas / Tablas de Consulta Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Periodicidad */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200/80 flex flex-col gap-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354] flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#7B8E90]" />
                    <span>Periodicidad</span>
                  </h4>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">D01:</strong> <span className="text-gray-600">Diario</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">D02:</strong> <span className="text-gray-600">Cada 2 días</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">D03:</strong> <span className="text-gray-600">Cada 3 días</span></div>
                    <div className="text-[10px] text-gray-400 text-center py-0.5">···</div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">S01:</strong> <span className="text-gray-600">Semanal (7d)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">S02:</strong> <span className="text-gray-600">Cada 2 semanas</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">S04:</strong> <span className="text-gray-600">Mensual (4 sem)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">S26:</strong> <span className="text-gray-600">Cada 24/26 sem</span></div>
                    <div className="text-[10px] text-gray-400 text-center py-0.5">···</div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">A01:</strong> <span className="text-gray-600">Anual</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-[#324354]">A02:</strong> <span className="text-gray-600">Cada 2 años</span></div>
                  </div>
                </div>

                {/* 2. Tipo de Intervención */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200/80 flex flex-col gap-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354] flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <Wrench className="w-3.5 h-3.5 text-[#7B8E90]" />
                    <span>Tipo Intervención</span>
                  </h4>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="p-2 bg-white rounded-xl border border-gray-200">
                      <strong className="font-mono text-rose-700 block">NP</strong>
                      <span className="text-gray-600 text-[11px]">No Producción (Paro de Planta requerido)</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-gray-200">
                      <strong className="font-mono text-emerald-700 block">PR</strong>
                      <span className="text-gray-600 text-[11px]">En Producción (Línea activa)</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-gray-200">
                      <strong className="font-mono text-amber-700 block">PRNP</strong>
                      <span className="text-gray-600 text-[11px]">Producción y Paro (Flexible)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Planta */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200/80 flex flex-col gap-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354] flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <Building2 className="w-3.5 h-3.5 text-[#7B8E90]" />
                    <span>Planta / Sección</span>
                  </h4>
                  <div className="flex flex-col gap-1.5 text-xs max-h-[260px] overflow-y-auto pr-1">
                    {plantasNomenclatura.filter(p => p.activo !== false).map(p => (
                      <div key={p.codigo} className="flex items-center justify-between py-0.5 border-b border-gray-200/40 last:border-0">
                        <strong className="font-mono text-sky-800 text-[11px]">{p.codigo}:</strong>
                        <span className="text-gray-700 text-[11px] text-right truncate ml-1">{p.nombre_oficial}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-0.5 border-b border-gray-200/40">
                      <strong className="font-mono text-sky-800 text-[11px]">EX:</strong>
                      <span className="text-gray-700 text-[11px] text-right">Proveedor Externo</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-b border-gray-200/40">
                      <strong className="font-mono text-sky-800 text-[11px]">MOL:</strong>
                      <span className="text-gray-700 text-[11px] text-right">Moldes</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <strong className="font-mono text-sky-800 text-[11px]">CEDI:</strong>
                      <span className="text-gray-700 text-[11px] text-right">Logística</span>
                    </div>
                  </div>
                </div>

                {/* 4. Tiempo */}
                <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200/80 flex flex-col gap-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354] flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <Clock className="w-3.5 h-3.5 text-[#7B8E90]" />
                    <span>Tiempo Estándar</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 italic">
                    Tiempo de ejecución en minutos del mantenimiento:
                  </p>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T15:</strong> <span className="text-gray-600">15 minutos (0.25h)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T30:</strong> <span className="text-gray-600">30 minutos (0.5h)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T60:</strong> <span className="text-gray-600">1 hora (60 min)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T120:</strong> <span className="text-gray-600">2 horas (120 min)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T240:</strong> <span className="text-gray-600">4 horas (240 min)</span></div>
                    <div className="flex justify-between py-0.5"><strong className="font-mono text-emerald-800">T420:</strong> <span className="text-gray-600">7 horas (Jornada)</span></div>
                  </div>
                </div>

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

        {/* ========================================================================= */}
        {/* VIEW 9: MÁQUINAS Y EQUIPOS (TAB NATIVO INTEGRADO) */}
        {/* ========================================================================= */}
        {activeTab === 'maquinas' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={maquinasSearch}
                    onChange={(e) => {
                      setMaquinasSearch(e.target.value);
                      setMaquinasPage(1);
                    }}
                    placeholder="Buscar por código, nombre de equipo, marca, modelo o proceso..."
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-xs sm:text-sm text-[#324354] placeholder-gray-400 focus:outline-none focus:border-[#324354] transition-all"
                  />
                  {maquinasSearch && (
                    <button
                      onClick={() => {
                        setMaquinasSearch('');
                        setMaquinasPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                  {/* Planta */}
                  <select
                    value={maquinasPlanta}
                    onChange={(e) => {
                      setMaquinasPlanta(e.target.value);
                      setMaquinasPage(1);
                    }}
                    className="px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-xs font-semibold text-[#324354] focus:outline-none"
                  >
                    <option value="Todas">Planta: Todas</option>
                    {uniqueMaquinasPlantas.map(planta => (
                      <option key={planta} value={planta}>{planta}</option>
                    ))}
                  </select>

                  {/* Criticidad */}
                  <select
                    value={maquinasCriticidad}
                    onChange={(e) => {
                      setMaquinasCriticidad(e.target.value);
                      setMaquinasPage(1);
                    }}
                    className="px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-xs font-semibold text-[#324354] focus:outline-none"
                  >
                    <option value="Todas">Criticidad: Todas</option>
                    <option value="A">Criticidad A (Alta)</option>
                    <option value="B">Criticidad B (Media)</option>
                    <option value="C">Criticidad C (Baja)</option>
                  </select>

                  {/* Estado */}
                  <select
                    value={maquinasEstado}
                    onChange={(e) => {
                      setMaquinasEstado(e.target.value);
                      setMaquinasPage(1);
                    }}
                    className="px-3 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-200 text-xs font-semibold text-[#324354] focus:outline-none"
                  >
                    <option value="Todos">Estado: Todos</option>
                    <option value="Activos">Solo Activos / Operativos</option>
                    <option value="Inactivos">Solo Inactivos / Baja</option>
                  </select>

                  {/* Nueva Máquina Button */}
                  <button
                    type="button"
                    onClick={handleOpenCreateMachine}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Máquina</span>
                  </button>
                </div>
              </div>

              {/* Status counter */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <span>
                  Mostrando <strong className="text-[#324354]">{filteredMaquinasList.length}</strong> de <strong className="text-[#324354]">{maquinasCatalogo.length}</strong> máquinas y equipos registrados
                </span>
              </div>
            </div>

            {/* Machines Table */}
            <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F6F3EE] text-[#324354] text-xs font-bold uppercase tracking-wider border-b border-[#e2ded5]">
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'codigo_equipo') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('codigo_equipo'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors w-28"
                      >
                        <div className="flex items-center gap-1">
                          <span>Código</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'nombre_equipo') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('nombre_equipo'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Máquinas y Equipos</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'marca') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('marca'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Marca / Modelo</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'planta') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('planta'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Planta / Proceso</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'criticidad') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('criticidad'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors text-center w-28"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Criticidad</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (maquinasSortColumn === 'estado') setMaquinasSortAsc(!maquinasSortAsc);
                          else { setMaquinasSortColumn('estado'); setMaquinasSortAsc(true); }
                        }}
                        className="py-3.5 px-4 cursor-pointer hover:bg-gray-200/60 transition-colors text-center w-28"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Estado</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-center w-28">
                        <span>Rutinas PMP</span>
                      </th>
                      <th className="py-3.5 px-4 text-right w-24">
                        <span>Ficha</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ded5] text-xs sm:text-sm">
                    {paginatedMaquinasList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <Cpu className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="font-semibold">No se encontraron máquinas ni equipos con los filtros seleccionados.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedMaquinasList.map(m => {
                        const linkedPmpCount = machinePmpCountsMap.get(m.id) || 0;
                        return (
                          <tr 
                            key={m.id}
                            onClick={() => setSelectedMachineModal(m)}
                            className="hover:bg-[#F6F3EE]/60 transition-colors cursor-pointer group"
                          >
                            {/* Código */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-slate-100 font-mono font-bold text-slate-800 rounded-md text-xs border border-slate-200 inline-block">
                                {m.codigo_equipo || '-'}
                              </span>
                            </td>

                            {/* Nombre y Foto */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {m.fotos ? (
                                  <img 
                                    src={m.fotos.split(',')[0].trim()} 
                                    alt={m.nombre_equipo}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomMachineImage(m.fotos.split(',')[0].trim());
                                    }}
                                    className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0 hover:scale-110 transition-transform cursor-zoom-in"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                                    <Cpu className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-[#324354] group-hover:text-blue-900 transition-colors truncate">
                                    {m.nombre_equipo}
                                  </div>
                                  {m.nombre_alterno && (
                                    <div className="text-[11px] text-gray-400 truncate">
                                      Alt: {m.nombre_alterno}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Marca / Modelo */}
                            <td className="py-3 px-4 text-gray-600">
                              <div className="font-medium text-[#324354]">{m.marca || '-'}</div>
                              {m.modelo && <div className="text-[11px] text-gray-400">{m.modelo}</div>}
                            </td>

                            {/* Planta / Proceso */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">
                                {m.planta || 'No asignada'}
                              </span>
                              {m.proceso && (
                                <div className="text-[11px] text-gray-400 mt-0.5">{m.proceso}</div>
                              )}
                            </td>

                            {/* Criticidad */}
                            <td className="py-3 px-4 text-center">
                              {renderMachineCriticidad(m.criticidad)}
                            </td>

                            {/* Estado */}
                            <td className="py-3 px-4 text-center">
                              {renderMachineEstado(m.estado)}
                            </td>

                            {/* Rutinas PMP */}
                            <td className="py-3 px-4 text-center">
                              {linkedPmpCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Wrench className="w-3 h-3" />
                                  <span>{linkedPmpCount}</span>
                                </span>
                              ) : (
                                <span className="text-gray-300 font-bold text-xs">-</span>
                              )}
                            </td>

                            {/* Ver Ficha */}
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMachineModal(m);
                                }}
                                className="px-3 py-1 bg-gray-100 group-hover:bg-[#324354] group-hover:text-white text-gray-700 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ficha</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {filteredMaquinasList.length > 0 && (
                <div className="px-6 py-4 bg-[#F6F3EE] border-t border-[#e2ded5] flex items-center justify-between flex-wrap gap-3 text-xs">
                  <div className="text-gray-600 font-medium">
                    Mostrando del <strong className="text-[#324354]">{(maquinasPage - 1) * maquinasPageSize + 1}</strong> al{' '}
                    <strong className="text-[#324354]">{Math.min(maquinasPage * maquinasPageSize, filteredMaquinasList.length)}</strong> de{' '}
                    <strong className="text-[#324354]">{filteredMaquinasList.length}</strong> equipos
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaquinasPage(prev => Math.max(prev - 1, 1))}
                      disabled={maquinasPage === 1}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#324354] font-bold rounded-xl border border-gray-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>

                    <span className="px-3 py-1 bg-[#324354] text-white font-bold rounded-xl">
                      Página {maquinasPage} de {totalMaquinasPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setMaquinasPage(prev => Math.min(prev + 1, totalMaquinasPages))}
                      disabled={maquinasPage >= totalMaquinasPages}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#324354] font-bold rounded-xl border border-gray-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 9 END */}

      </main>

      {/* Modal: Add Technician */}
      {showTechModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#324354] mb-4">Añadir Nuevo Técnico</h3>
            <form onSubmit={handleAddTechSubmit} className="flex flex-col gap-4">
              {/* Nombre Completo con Catálogo de Empleados */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                    <span>Nombre Completo</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                      BD Empleados
                    </span>
                  </label>
                  {newTechForm.name && (
                    <button
                      type="button"
                      onClick={() => setNewTechForm(prev => ({ ...prev, name: '', documento: '' }))}
                      className="text-[11px] text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newTechForm.name}
                    onChange={(e) => {
                      setNewTechForm(prev => ({ ...prev, name: e.target.value }));
                      setShowAddEmpDropdown(true);
                    }}
                    onFocus={() => setShowAddEmpDropdown(true)}
                    placeholder="Buscar o seleccionar empleado por nombre o cédula..."
                    required
                    className="w-full pl-3 pr-9 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddEmpDropdown(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    title="Desplegar lista de empleados"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAddEmpDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown flotante con empleados */}
                {showAddEmpDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10010]" 
                      onClick={() => setShowAddEmpDropdown(false)} 
                    />
                    <div className="absolute z-[10020] left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-[#e2ded5] max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1 animate-in fade-in">
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
                        <span>Catálogo de Empleados ({(() => {
                          const q = normalize(newTechForm.name.trim());
                          if (!q) return empleadosList.length;
                          return empleadosList.filter(e => normalize(e.nombreCompleto || '').includes(q) || (e.id || '').toString().includes(q) || normalize(e.cargo || '').includes(q)).length;
                        })()})</span>
                        <span className="text-[9px] text-emerald-600 lowercase font-normal">autocompleta cédula al elegir</span>
                      </div>
                      {(() => {
                        const q = normalize(newTechForm.name.trim());
                        const filtered = !q
                          ? empleadosList
                          : empleadosList.filter(e => 
                              normalize(e.nombreCompleto || '').includes(q) || 
                              (e.id || '').toString().includes(q) || 
                              normalize(e.cargo || '').includes(q) ||
                              normalize(e.planta || '').includes(q)
                            );
                        
                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center text-xs text-gray-500 italic">
                              No se encontraron coincidencias. Puedes escribir el nombre manualmente.
                            </div>
                          );
                        }

                        return filtered.slice(0, 40).map(emp => {
                          const cleanName = emp.nombreCompleto.replace(/\s+/g, ' ').trim();
                          const docStr = emp.id.toString().trim();
                          const isSelected = newTechForm.name.trim().toLowerCase() === cleanName.toLowerCase();
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setNewTechForm(prev => ({
                                  ...prev,
                                  name: cleanName,
                                  documento: docStr
                                }));
                                setShowAddEmpDropdown(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${
                                isSelected ? 'bg-[#324354] text-white' : 'hover:bg-[#F6F3EE] text-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="truncate">{cleanName}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ml-1 ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  CC: {docStr}
                                </span>
                              </div>
                              {(emp.cargo || emp.planta) && (
                                <div className={`text-[10px] truncate flex items-center gap-1.5 ${
                                  isSelected ? 'text-white/80' : 'text-gray-500'
                                }`}>
                                  {emp.cargo && <span>{emp.cargo}</span>}
                                  {emp.cargo && emp.planta && <span>•</span>}
                                  {emp.planta && <span>{emp.planta}</span>}
                                </div>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
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
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Cédula / CC</label>
                  <input
                    type="text"
                    value={newTechForm.documento}
                    onChange={(e) => setNewTechForm(prev => ({ ...prev, documento: e.target.value }))}
                    placeholder="Ej. 1010232658"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
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
                  <option value="INACTIVO">Inactivo</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Multiple selection for Plantas / Especialidades */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Planta / Especialidad <span className="text-[10px] text-gray-400 font-normal normal-case">(Múltiple selección)</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setNewTechForm(prev => ({
                        ...prev,
                        plantas: plantasNomenclatura.filter(p => p.activo !== false).map(p => p.codigo)
                      }))}
                      className="text-[#324354] hover:underline cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => setNewTechForm(prev => ({ ...prev, plantas: [] }))}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-[#F6F3EE] rounded-2xl border border-gray-300 max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
                  {plantasNomenclatura.filter(p => p.activo !== false).map(p => {
                    const isSelected = (newTechForm.plantas || []).includes(p.codigo);
                    return (
                      <button
                        key={p.codigo}
                        type="button"
                        onClick={() => {
                          setNewTechForm(prev => {
                            const curr = prev.plantas || [];
                            const next = isSelected ? curr.filter(c => c !== p.codigo) : [...curr, p.codigo];
                            return { ...prev, plantas: next };
                          });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#324354] text-white border-[#324354] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'border border-gray-300 text-transparent'
                        }`}>
                          ✓
                        </span>
                        <span><strong className="font-bold">{p.codigo}</strong> - {p.nombre_oficial}</span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const activeCount = plantasNomenclatura.filter(p => p.activo !== false).length;
                  const isAll = activeCount > 0 && (newTechForm.plantas?.length || 0) >= activeCount;
                  return (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 px-1">
                      <span>{isAll ? 'Todas las plantas seleccionadas' : `${newTechForm.plantas?.length || 0} plantas seleccionadas`}</span>
                      {newTechForm.plantas && newTechForm.plantas.length > 0 && (
                        <span className="font-semibold text-[#324354] truncate max-w-[200px]">
                          {isAll ? 'Todas' : newTechForm.plantas.join(', ')}
                        </span>
                      )}
                    </div>
                  );
                })()}
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
              {/* Nombre Completo con Catálogo de Empleados */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1.5">
                    <span>Nombre Completo</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                      BD Empleados
                    </span>
                  </label>
                  {editingTech.name && (
                    <button
                      type="button"
                      onClick={() => setEditingTech(prev => prev ? ({ ...prev, name: '', documento: '' }) : null)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={editingTech.name}
                    onChange={(e) => {
                      setEditingTech(prev => prev ? ({ ...prev, name: e.target.value }) : null);
                      setShowEditEmpDropdown(true);
                    }}
                    onFocus={() => setShowEditEmpDropdown(true)}
                    placeholder="Buscar o seleccionar empleado por nombre o cédula..."
                    required
                    className="w-full pl-3 pr-9 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditEmpDropdown(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    title="Desplegar lista de empleados"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showEditEmpDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown flotante con empleados */}
                {showEditEmpDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10010]" 
                      onClick={() => setShowEditEmpDropdown(false)} 
                    />
                    <div className="absolute z-[10020] left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-[#e2ded5] max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1 animate-in fade-in">
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
                        <span>Catálogo de Empleados ({(() => {
                          const q = normalize(editingTech.name.trim());
                          if (!q) return empleadosList.length;
                          return empleadosList.filter(e => normalize(e.nombreCompleto || '').includes(q) || (e.id || '').toString().includes(q) || normalize(e.cargo || '').includes(q)).length;
                        })()})</span>
                        <span className="text-[9px] text-emerald-600 lowercase font-normal">autocompleta cédula al elegir</span>
                      </div>
                      {(() => {
                        const q = normalize(editingTech.name.trim());
                        const filtered = !q
                          ? empleadosList
                          : empleadosList.filter(e => 
                              normalize(e.nombreCompleto || '').includes(q) || 
                              (e.id || '').toString().includes(q) || 
                              normalize(e.cargo || '').includes(q) ||
                              normalize(e.planta || '').includes(q)
                            );
                        
                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center text-xs text-gray-500 italic">
                              No se encontraron coincidencias. Puedes escribir el nombre manualmente.
                            </div>
                          );
                        }

                        return filtered.slice(0, 40).map(emp => {
                          const cleanName = emp.nombreCompleto.replace(/\s+/g, ' ').trim();
                          const docStr = emp.id.toString().trim();
                          const isSelected = editingTech.name.trim().toLowerCase() === cleanName.toLowerCase();
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setEditingTech(prev => prev ? ({
                                  ...prev,
                                  name: cleanName,
                                  documento: docStr
                                }) : null);
                                setShowEditEmpDropdown(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${
                                isSelected ? 'bg-[#324354] text-white' : 'hover:bg-[#F6F3EE] text-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="truncate">{cleanName}</span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ml-1 ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  CC: {docStr}
                                </span>
                              </div>
                              {(emp.cargo || emp.planta) && (
                                <div className={`text-[10px] truncate flex items-center gap-1.5 ${
                                  isSelected ? 'text-white/80' : 'text-gray-500'
                                }`}>
                                  {emp.cargo && <span>{emp.cargo}</span>}
                                  {emp.cargo && emp.planta && <span>•</span>}
                                  {emp.planta && <span>{emp.planta}</span>}
                                </div>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
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
                    <option value="INACTIVO">Inactivo</option>
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

              {/* Multiple selection for Plantas / Especialidades */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Planta / Especialidad <span className="text-[10px] text-gray-400 font-normal normal-case">(Múltiple selección)</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEditingTech(prev => {
                        if (!prev) return null;
                        const allCodes = plantasNomenclatura.filter(p => p.activo !== false).map(p => p.codigo);
                        return { ...prev, plantas: allCodes, planta: allCodes.join(', ') };
                      })}
                      className="text-[#324354] hover:underline cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => setEditingTech(prev => prev ? ({ ...prev, plantas: [], planta: '' }) : null)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-[#F6F3EE] rounded-2xl border border-gray-300 max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
                  {plantasNomenclatura.filter(p => p.activo !== false).map(p => {
                    const currentSelected = editingTech.plantas || parseTechPlantas(editingTech.planta || editingTech.especialidad, plantasNomenclatura);
                    const isSelected = currentSelected.includes(p.codigo);
                    return (
                      <button
                        key={p.codigo}
                        type="button"
                        onClick={() => {
                          setEditingTech(prev => {
                            if (!prev) return null;
                            const curr = prev.plantas || parseTechPlantas(prev.planta || prev.especialidad, plantasNomenclatura);
                            const next = isSelected ? curr.filter(c => c !== p.codigo) : [...curr, p.codigo];
                            return { ...prev, plantas: next, planta: next.join(', ') };
                          });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#324354] text-white border-[#324354] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'border border-gray-300 text-transparent'
                        }`}>
                          ✓
                        </span>
                        <span><strong className="font-bold">{p.codigo}</strong> - {p.nombre_oficial}</span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const currentSelected = editingTech.plantas || parseTechPlantas(editingTech.planta, plantasNomenclatura);
                  const activeCount = plantasNomenclatura.filter(p => p.activo !== false).length;
                  const isAll = activeCount > 0 && currentSelected.length >= activeCount;
                  return (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 px-1">
                      <span>{isAll ? 'Todas las plantas seleccionadas' : `${currentSelected.length} plantas seleccionadas`}</span>
                      {currentSelected.length > 0 && (
                        <span className="font-semibold text-[#324354] truncate max-w-[200px]">
                          {isAll ? 'Todas' : currentSelected.join(', ')}
                        </span>
                      )}
                    </div>
                  );
                })()}
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquinas y Equipos</label>
                  <input
                    list="maquinas-catalogo-options"
                    type="text"
                    value={newTaskForm.maquina}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = maquinasCatalogo.find(m => 
                        `${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`.toLowerCase() === val.toLowerCase() ||
                        m.nombre_equipo?.toLowerCase() === val.toLowerCase() ||
                        (m.codigo_equipo && m.codigo_equipo.toLowerCase() === val.toLowerCase())
                      );
                      if (matched) {
                        setNewTaskForm(prev => ({
                          ...prev,
                          maquina: matched.nombre_equipo,
                          planta: obtenerCodigoPlanta(matched.planta || prev.planta)
                        }));
                      } else {
                        setNewTaskForm(prev => ({ ...prev, maquina: val }));
                      }
                    }}
                    placeholder="Buscar o seleccionar equipo..."
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta (Código Corto)</label>
                  <select
                    value={obtenerCodigoPlanta(newTaskForm.planta, plantasNomenclatura)}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  >
                    {plantasNomenclatura.filter(p => p.activo !== false).map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} - {p.nombre_oficial}
                      </option>
                    ))}
                  </select>
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquinas y Equipos</label>
                  <input
                    list="maquinas-catalogo-options"
                    type="text"
                    value={editingTask.maquina || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = maquinasCatalogo.find(m => 
                        `${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`.toLowerCase() === val.toLowerCase() ||
                        m.nombre_equipo?.toLowerCase() === val.toLowerCase() ||
                        (m.codigo_equipo && m.codigo_equipo.toLowerCase() === val.toLowerCase())
                      );
                      if (matched) {
                        setEditingTask(prev => prev ? {
                          ...prev,
                          maquina: matched.nombre_equipo,
                          codigoMaquina: matched.codigo_equipo || null,
                          idMaquina: matched.id || null,
                          planta: obtenerCodigoPlanta(matched.planta || prev.planta)
                        } : null);
                      } else {
                        setEditingTask(prev => prev ? { ...prev, maquina: val } : null);
                      }
                    }}
                    placeholder="Buscar o seleccionar equipo..."
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta (Código Corto)</label>
                  <select
                    value={obtenerCodigoPlanta(editingTask.planta, plantasNomenclatura)}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, planta: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  >
                    {plantasNomenclatura.filter(p => p.activo !== false).map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} - {p.nombre_oficial}
                      </option>
                    ))}
                  </select>
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
                  step="1"
                  min="1"
                  value={editingTask.frecuencia}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, frecuencia: parseFloat(e.target.value) || 0 } : null)}
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold"
                />
              </div>

              {/* Técnicos Autorizados Selector */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">
                  Técnicos Autorizados (Matriz de Habilidades)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto bg-[#F6F3EE] p-2.5 rounded-xl border border-gray-200">
                  {technicians.filter(t => t.id !== 9999).map(t => {
                    const isChecked = editingTask.idtecsCandidates?.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-gray-800 p-1 rounded-lg hover:bg-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const curList = editingTask.idtecsCandidates || [];
                            const newList = e.target.checked 
                              ? [...curList, t.id]
                              : curList.filter(id => id !== t.id);
                            setEditingTask(prev => prev ? { ...prev, idtecsCandidates: newList } : null);
                          }}
                          className="w-4 h-4 text-[#324354] rounded border-gray-300"
                        />
                        <span className="truncate">{t.name}</span>
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#324354] mb-4">Reportar Mantenimiento Correctivo / Anomalía</h3>
            <form onSubmit={handleAddCorrectivoSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquinas y Equipos</label>
                  <input
                    list="maquinas-catalogo-options"
                    type="text"
                    value={newCorrectivoForm.maquina}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = maquinasCatalogo.find(m => 
                        `${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`.toLowerCase() === val.toLowerCase() ||
                        m.nombre_equipo?.toLowerCase() === val.toLowerCase() ||
                        (m.codigo_equipo && m.codigo_equipo.toLowerCase() === val.toLowerCase())
                      );
                      if (matched) {
                        setNewCorrectivoForm(prev => ({
                          ...prev,
                          maquina: matched.nombre_equipo,
                          planta: obtenerCodigoPlanta(matched.planta || prev.planta)
                        }));
                      } else {
                        setNewCorrectivoForm(prev => ({ ...prev, maquina: val }));
                      }
                    }}
                    placeholder="Buscar o seleccionar equipo..."
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta (Código Corto)</label>
                  <select
                    value={obtenerCodigoPlanta(newCorrectivoForm.planta, plantasNomenclatura)}
                    onChange={(e) => setNewCorrectivoForm(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    {plantasNomenclatura.filter(p => p.activo !== false).map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} - {p.nombre_oficial}
                      </option>
                    ))}
                  </select>
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
                  Reportar Correctivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Datalist for Searchable Machines Catalog */}
      <datalist id="maquinas-catalogo-options">
        {maquinasCatalogo.map(m => (
          <option 
            key={m.id} 
            value={`${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`}
          >
            {m.planta ? `Planta: ${obtenerCodigoPlanta(m.planta)}` : ''} {m.marca ? `· ${m.marca}` : ''}
          </option>
        ))}
      </datalist>

      {/* Modal: View Maintenance Task Details (Ficha Técnica Completa) */}
      {viewingTask && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingTask(null);
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#e2ded5] max-h-[85vh] overflow-y-auto flex flex-col gap-5 relative my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and Code */}
            <div className="flex items-start justify-between border-b border-[#e2ded5] pb-4">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold text-slate-800 rounded-lg text-xs border border-slate-200">
                    #{viewingTask.csvId || viewingTask.code}
                  </span>
                  <span className="px-2.5 py-1 bg-[#F6F3EE] rounded-lg border border-[#e2ded5] text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="font-bold text-[#324354]">{obtenerCodigoPlanta(viewingTask.planta)}</span>
                    <span className="text-gray-400">·</span>
                    <span>{viewingTask.planta}</span>
                  </span>
                  {viewingTask.adelantada && (
                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">
                      ⚡ Mantenimiento Adelantado
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#324354] leading-snug mt-1">
                  {viewingTask.title}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingTask(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Technical Instructions Box */}
            <div className="bg-[#F6F3EE] p-4 sm:p-5 rounded-2xl border border-[#e2ded5] flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#7B8E90]" />
                <span>Procedimiento Técnico e Instrucciones de Mantenimiento</span>
              </h4>
              {viewingTask.detalle ? (
                <div className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-normal bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
                  {viewingTask.detalle}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic bg-white p-4 rounded-xl border border-gray-200/80">
                  Sin observaciones o instrucciones adicionales registradas en la base de datos.
                </div>
              )}
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Máquinas y Equipos</span>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {viewingTask.codigoMaquina && (
                    <span className="px-1.5 py-0.5 bg-[#324354]/10 text-[#324354] border border-[#324354]/20 rounded text-[10px] font-mono font-bold shrink-0">
                      {viewingTask.codigoMaquina}
                    </span>
                  )}
                  <strong className="text-[#324354] text-xs sm:text-sm font-bold block truncate" title={viewingTask.maquina}>
                    {viewingTask.maquina}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Frecuencia Base</span>
                <strong className="text-blue-800 text-xs sm:text-sm font-bold block">
                  {viewingTask.frecuencia} días
                </strong>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Ref. Frecuencia</span>
                <strong className="text-slate-700 text-xs sm:text-sm font-bold block">
                  {viewingTask.refFrecuencia} días
                </strong>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Duración Estándar</span>
                <strong className="text-[#324354] text-xs sm:text-sm font-bold block">
                  {viewingTask.durationMinutes}m ({viewingTask.durationHours.toFixed(1)}h)
                </strong>
              </div>
            </div>

            {/* Turno y Técnicos Habilitados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col gap-1.5">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Turno Requerido</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 font-bold text-[#324354] border border-slate-200 rounded-lg text-xs">
                    {getTurnoLabel(viewingTask.tipoIntervencion)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col gap-1.5">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Técnicos Habilitados</span>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                  {(() => {
                    const candidateTechs = technicians.filter(t =>
                      t.id !== 9999 && (
                        (viewingTask.idtecsCandidates && viewingTask.idtecsCandidates.includes(t.id)) ||
                        (t.authorizedTitles && t.authorizedTitles.includes(normalize(viewingTask.title)))
                      )
                    );
                    if (candidateTechs.length === 0) {
                      return <span className="text-gray-400 italic text-xs">Habilitado para todos los técnicos del turno</span>;
                    }
                    return candidateTechs.map(ct => (
                      <span key={ct.id} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-md">
                        {ct.name} ({getTurnoLabel(ct.turno)})
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e2ded5]">
              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const taskToEdit = viewingTask;
                  setViewingTask(null);
                  handleOpenEditTask(taskToEdit);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all shadow-xs"
              >
                <Pencil className="w-4 h-4" />
                <span>Editar Estándar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ficha Técnica de Máquinas y Equipos */}
      {selectedMachineModal && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedMachineModal(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-[#e2ded5] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-[#e2ded5] bg-white shrink-0 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedMachineModal.codigo_equipo && (
                    <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold text-slate-800 rounded-lg text-xs border border-slate-200">
                      {selectedMachineModal.codigo_equipo}
                    </span>
                  )}
                  {selectedMachineModal.activo_fijo && (
                    <span className="px-2 py-0.5 bg-gray-100 font-mono text-gray-600 rounded-md text-[11px]">
                      AF: {selectedMachineModal.activo_fijo}
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-[#F6F3EE] rounded-lg border border-[#e2ded5] text-xs font-semibold text-gray-700">
                    {selectedMachineModal.planta || 'Sin planta'}
                  </span>
                  {selectedMachineModal.proceso && (
                    <span className="text-xs text-gray-500">
                      · {selectedMachineModal.proceso}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#324354] leading-tight truncate">
                  {selectedMachineModal.nombre_equipo}
                </h3>
                {selectedMachineModal.nombre_alterno && (
                  <p className="text-xs text-gray-500 italic truncate">
                    Nombre Alterno: {selectedMachineModal.nombre_alterno}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditMachine(selectedMachineModal)}
                  className="px-3.5 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar Ficha</span>
                </button>
                <button 
                  onClick={() => setSelectedMachineModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="px-6 py-6 sm:px-8 sm:py-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {/* Photo + General Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Photo Box */}
                <div className="md:col-span-1 bg-[#F6F3EE] rounded-2xl border border-gray-200 p-3 flex flex-col items-center justify-center min-h-[160px]">
                  {selectedMachineModal.fotos ? (
                    <div className="relative group cursor-zoom-in w-full h-full flex items-center justify-center">
                      <img 
                        src={selectedMachineModal.fotos.split(',')[0].trim()} 
                        alt={selectedMachineModal.nombre_equipo}
                        onClick={() => setZoomMachineImage(selectedMachineModal.fotos.split(',')[0].trim())}
                        className="max-h-48 w-full object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs">
                        Clic para ampliar
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-6">
                      <Cpu className="w-12 h-12 mx-auto mb-1 opacity-30" />
                      <span className="text-xs">Sin fotografía registrada</span>
                    </div>
                  )}
                </div>

                {/* General Info */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Marca</span>
                    <strong className="text-[#324354] text-sm block truncate">{selectedMachineModal.marca || 'N/A'}</strong>
                  </div>
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Modelo</span>
                    <strong className="text-[#324354] text-sm block truncate">{selectedMachineModal.modelo || 'N/A'}</strong>
                  </div>
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Tipo</span>
                    <strong className="text-[#324354] text-sm block truncate">{selectedMachineModal.tipo || 'N/A'}</strong>
                  </div>
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Criticidad</span>
                    <div className="mt-0.5">{renderMachineCriticidad(selectedMachineModal.criticidad)}</div>
                  </div>
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Estado</span>
                    <div className="mt-0.5">{renderMachineEstado(selectedMachineModal.estado)}</div>
                  </div>
                  <div className="p-3 bg-[#F6F3EE] rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Ubicación / Bodega</span>
                    <strong className="text-[#324354] text-xs block truncate">{selectedMachineModal.bodega || 'General'}</strong>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-[#F6F3EE] p-4.5 rounded-2xl border border-gray-200 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#7B8E90]" />
                  <span>Especificaciones y Características Técnicas</span>
                </h4>
                <div className="text-xs sm:text-sm text-gray-800 bg-white p-4 rounded-xl border border-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedMachineModal.caracteristicas || 'No hay especificaciones técnicas detalladas registradas en el catálogo.'}
                </div>
              </div>

              {/* Financial & Purchase Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Fecha de Compra</span>
                  <strong className="text-[#324354] text-xs">{selectedMachineModal.fecha_compra || 'Sin fecha'}</strong>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Fecha Instalación</span>
                  <strong className="text-[#324354] text-xs">{selectedMachineModal.fecha_instalacion || 'Sin fecha'}</strong>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Valor de Compra</span>
                  <strong className="text-[#324354] text-xs">{formatCOP(selectedMachineModal.valor_compra)}</strong>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-gray-400 font-bold block text-[10px] uppercase mb-0.5">Factura</span>
                  <strong className="text-[#324354] text-xs truncate block">{selectedMachineModal.factura || 'Sin registro'}</strong>
                </div>
              </div>

              {/* Provider Info */}
              {(selectedMachineModal.proveedor_nombre || selectedMachineModal.proveedor_contacto || selectedMachineModal.proveedor_telefono) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Información de Proveedor / Servicio Técnico
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Proveedor:</span>
                      <strong className="text-slate-800">{selectedMachineModal.proveedor_nombre || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Contacto:</span>
                      <strong className="text-slate-800">{selectedMachineModal.proveedor_contacto || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Teléfono / Email:</span>
                      <strong className="text-slate-800">
                        {selectedMachineModal.proveedor_telefono || selectedMachineModal.proveedor_email || '-'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked PMP Preventative Routines */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-[#7B8E90]" />
                    <span>Planes Preventivos Vinculados a este Equipo</span>
                  </h4>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                    {getPmpForMachine(selectedMachineModal).length} Rutina(s)
                  </span>
                </div>

                {getPmpForMachine(selectedMachineModal).length === 0 ? (
                  <div className="p-4 bg-[#F6F3EE] rounded-xl text-center text-xs text-gray-500">
                    No hay rutinas de mantenimiento preventivo registradas específicamente para esta máquina.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {getPmpForMachine(selectedMachineModal).map(pmp => (
                      <div 
                        key={pmp.id} 
                        onClick={() => {
                          setSelectedMachineModal(null);
                          setViewingTask(pmp);
                        }}
                        className="p-3 bg-white hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-[11px]">
                              #{pmp.code || pmp.csvId}
                            </span>
                            <span className="font-bold text-xs text-[#324354] group-hover:text-blue-900">
                              {pmp.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Frecuencia: Cada {pmp.frecuencia} días · Duración: {pmp.durationMinutes} min · Turno: {pmp.tipoIntervencion}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-gray-100 group-hover:bg-[#324354] group-hover:text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                        >
                          Ver Detalle
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 sm:px-8 sm:py-4 border-t border-[#e2ded5] bg-[#F6F3EE] shrink-0 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRequestDeleteMachine(selectedMachineModal)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Máquina</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMachineModal(null)}
                  className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-all border border-gray-200"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditMachine(selectedMachineModal)}
                  className="px-5 py-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar Máquina</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario Crear / Editar Máquina en Supabase */}
      {showMachineFormModal && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowMachineFormModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-[#e2ded5] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-[#e2ded5] bg-white shrink-0 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    machineFormMode === 'create' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {machineFormMode === 'create' ? '+ Nuevo Registro' : '✏️ Edición Técnica'}
                  </span>
                  {editingMachineId && (
                    <span className="text-xs font-mono font-bold text-gray-400">
                      ID: #{editingMachineId}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#324354]">
                  {machineFormMode === 'create' ? 'Registrar Nueva Máquina o Equipo' : `Editar Ficha: ${machineFormData.nombre_equipo || 'Máquina'}`}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowMachineFormModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fixed Navigation Tabs inside Form */}
            <div className="px-6 py-2.5 sm:px-8 sm:py-2.5 bg-[#F6F3EE] border-b border-[#e2ded5] shrink-0 flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-[#324354]">
              <button
                type="button"
                onClick={() => setMachineFormTab('general')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  machineFormTab === 'general' ? 'bg-[#324354] text-white shadow-xs' : 'text-gray-600 hover:text-[#324354] bg-white/70'
                }`}
              >
                1. Identificación y Estado
              </button>
              <button
                type="button"
                onClick={() => setMachineFormTab('specs')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  machineFormTab === 'specs' ? 'bg-[#324354] text-white shadow-xs' : 'text-gray-600 hover:text-[#324354] bg-white/70'
                }`}
              >
                2. Especificaciones Técnicas
              </button>
              <button
                type="button"
                onClick={() => setMachineFormTab('financial')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  machineFormTab === 'financial' ? 'bg-[#324354] text-white shadow-xs' : 'text-gray-600 hover:text-[#324354] bg-white/70'
                }`}
              >
                3. Financiero y Proveedor
              </button>
              <button
                type="button"
                onClick={() => setMachineFormTab('media')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  machineFormTab === 'media' ? 'bg-[#324354] text-white shadow-xs' : 'text-gray-600 hover:text-[#324354] bg-white/70'
                }`}
              >
                4. Enlaces y Multimedia
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form 
              onSubmit={handleSaveMachineSubmit} 
              onKeyDown={(e) => {
                // Prevent accidental submit when pressing Enter in text inputs
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Hidden File Input for Machine Primary Photo */}
              <input
                type="file"
                ref={machineFileInputRef}
                accept="image/*"
                onChange={handleMachinePhotoUpload}
                className="hidden"
              />
              <div className="px-6 py-6 sm:px-8 sm:py-6 overflow-y-auto flex-1 flex flex-col gap-4">
                {/* TAB 1: IDENTIFICACIÓN Y ESTADO */}
                {machineFormTab === 'general' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                    {/* Primary Photo Banner / Avatar in Tab 1 */}
                    <div className="sm:col-span-2 flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200">
                      <div className="relative group shrink-0">
                        {machineFormData.fotos ? (
                          <img
                            src={machineFormData.fotos.split(',')[0].trim()}
                            alt="Foto equipo"
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-[#324354]/20 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setZoomMachineImage(machineFormData.fotos.split(',')[0].trim())}
                            title="Clic para ampliar"
                          />
                        ) : (
                          <div 
                            onClick={() => machineFileInputRef.current?.click()}
                            className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-[#324354] flex flex-col items-center justify-center text-gray-400 hover:text-[#324354] cursor-pointer transition-colors shadow-2xs"
                          >
                            <Camera className="w-7 h-7 mb-0.5 opacity-60" />
                            <span className="text-[10px] font-bold">+ Foto</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-1 text-center sm:text-left min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
                            Fotografía Principal del Equipo
                          </span>
                          {machineFormData.fotos && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                              ✓ Asignada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Foto principal del equipo para las tablas, tarjetas de catálogo y fichas técnicas.
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => machineFileInputRef.current?.click()}
                            disabled={uploadingMachinePhoto}
                            className="px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {uploadingMachinePhoto ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Subiendo...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>{machineFormData.fotos ? 'Cambiar Foto' : 'Cargar Foto Adjunta'}</span>
                              </>
                            )}
                          </button>
                          {machineFormData.fotos && (
                            <button
                              type="button"
                              onClick={handleRemoveMachinePhoto}
                              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                            >
                              Quitar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMachineFormTab('media')}
                            className="text-xs text-blue-700 hover:underline font-semibold ml-auto"
                          >
                            Opciones Multimedia →
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                        Nombre Oficial del Equipo / Máquina <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={machineFormData.nombre_equipo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, nombre_equipo: e.target.value }))}
                        placeholder="Ej. Prensa Hidráulica 02"
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nombre Alterno / Alias</label>
                      <input
                        type="text"
                        value={machineFormData.nombre_alterno}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, nombre_alterno: e.target.value }))}
                        placeholder="Ej. Prensa Principal Línea 1"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Código de Equipo</label>
                      <input
                        type="text"
                        value={machineFormData.codigo_equipo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, codigo_equipo: e.target.value }))}
                        placeholder="Ej. C-0154 o PH-02"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-mono font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Activo Fijo (SAP)</label>
                      <input
                        type="text"
                        value={machineFormData.activo_fijo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, activo_fijo: e.target.value }))}
                        placeholder="Ej. AF-100234"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-mono text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta</label>
                      <select
                        value={normalizarPlanta(machineFormData.planta, plantasNomenclatura)}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, planta: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none"
                      >
                        {plantasNomenclatura.filter(p => p.activo !== false).map(p => (
                          <option key={p.codigo} value={p.nombre_oficial}>
                            {p.codigo} - {p.nombre_oficial}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Proceso / Sección</label>
                      <input
                        type="text"
                        value={machineFormData.proceso}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, proceso: e.target.value }))}
                        placeholder="Ej. Pulido, Ensamble, Corte"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Estado Operativo</label>
                      <select
                        value={machineFormData.estado}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-bold text-[#324354] focus:outline-none"
                      >
                        <option value="ACTIVO">ACTIVO (Operativo)</option>
                        <option value="EN MANTENIMIENTO">EN MANTENIMIENTO</option>
                        <option value="INACTIVO">INACTIVO / FUERA DE SERVICIO</option>
                        <option value="OBSOLETO">OBSOLETO / BAJA</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Criticidad</label>
                      <select
                        value={machineFormData.criticidad}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, criticidad: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-bold text-[#324354] focus:outline-none"
                      >
                        <option value="">Sin Clasificar</option>
                        <option value="A">A · Alta (Crítico)</option>
                        <option value="B">B · Media (Moderado)</option>
                        <option value="C">C · Baja (Bajo impacto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Clasificación</label>
                      <select
                        value={machineFormData.clasificacion}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, clasificacion: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none"
                      >
                        <option value="">Ninguna</option>
                        <option value="A">Clase A</option>
                        <option value="B">Clase B</option>
                        <option value="C">Clase C</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 2: ESPECIFICACIONES TÉCNICAS */}
                {machineFormTab === 'specs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Marca</label>
                      <input
                        type="text"
                        value={machineFormData.marca}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, marca: e.target.value }))}
                        placeholder="Ej. DeWalt, Bosch, Siemens"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Modelo</label>
                      <input
                        type="text"
                        value={machineFormData.modelo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, modelo: e.target.value }))}
                        placeholder="Ej. DWS713-B3A"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Tipo de Equipo</label>
                      <input
                        type="text"
                        value={machineFormData.tipo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, tipo: e.target.value }))}
                        placeholder="Ej. Neumático, Hidráulico, Eléctrico, Mecánico"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Ubicación / Bodega</label>
                      <input
                        type="text"
                        value={machineFormData.bodega}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, bodega: e.target.value }))}
                        placeholder="Ej. Bodega Principal / Cuarto 5'S"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                        Características y Especificaciones Técnicas Detalladas
                      </label>
                      <textarea
                        value={machineFormData.caracteristicas}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, caracteristicas: e.target.value }))}
                        placeholder="Voltaje, amperaje, capacidad en toneladas/kW, tipo de aceite, dimensiones, tolerancias..."
                        rows={4}
                        className="w-full p-3 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: FINANCIERO Y PROVEEDOR */}
                {machineFormTab === 'financial' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Fecha de Compra</label>
                      <input
                        type="date"
                        value={machineFormData.fecha_compra}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, fecha_compra: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Fecha de Instalación</label>
                      <input
                        type="date"
                        value={machineFormData.fecha_instalacion}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, fecha_instalacion: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Valor de Compra (COP)</label>
                      <input
                        type="number"
                        value={machineFormData.valor_compra}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, valor_compra: e.target.value }))}
                        placeholder="Ej. 15000000"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Valor de Reposición / Nuevo (COP)</label>
                      <input
                        type="number"
                        value={machineFormData.valor_nuevo}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, valor_nuevo: e.target.value }))}
                        placeholder="Ej. 18000000"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Factura de Compra</label>
                      <input
                        type="text"
                        value={machineFormData.factura}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, factura: e.target.value }))}
                        placeholder="Ej. FAC-998812"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nombre Proveedor</label>
                      <input
                        type="text"
                        value={machineFormData.proveedor_nombre}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, proveedor_nombre: e.target.value }))}
                        placeholder="Ej. Maquinaria Industrial S.A.S"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Contacto Proveedor</label>
                      <input
                        type="text"
                        value={machineFormData.proveedor_contacto}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, proveedor_contacto: e.target.value }))}
                        placeholder="Ej. Ing. Carlos Restrepo"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Teléfono / Celular</label>
                      <input
                        type="text"
                        value={machineFormData.proveedor_telefono}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, proveedor_telefono: e.target.value }))}
                        placeholder="Ej. +57 300 123 4567"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Email Proveedor</label>
                      <input
                        type="email"
                        value={machineFormData.proveedor_email}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, proveedor_email: e.target.value }))}
                        placeholder="Ej. soporte@proveedor.com"
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: MULTIMEDIA Y ENLACES */}
                {machineFormTab === 'media' && (
                  <div className="flex flex-col gap-5 animate-in fade-in">
                    {/* Primary Image Upload Card */}
                    <div className="p-4.5 bg-[#F6F3EE] rounded-2xl border border-gray-200 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-[#7B8E90]" />
                          <span>Fotografía Principal del Equipo (Adjunto / Supabase Storage)</span>
                        </label>
                        {machineFormData.fotos && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                            ✓ Foto Principal Activa
                          </span>
                        )}
                      </div>

                      {uploadingMachinePhoto ? (
                        <div className="py-10 px-4 bg-white rounded-2xl border-2 border-dashed border-[#324354]/40 flex flex-col items-center justify-center text-center gap-3 shadow-2xs">
                          <Loader2 className="w-9 h-9 animate-spin text-[#324354]" />
                          <div>
                            <p className="text-sm font-bold text-[#324354]">Subiendo fotografía a Supabase Storage...</p>
                            <p className="text-xs text-gray-500 mt-0.5">Por favor espera mientras se procesa el archivo.</p>
                          </div>
                        </div>
                      ) : machineFormData.fotos ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                          <div className="relative group w-32 h-32 shrink-0 bg-[#F6F3EE] rounded-xl overflow-hidden border border-gray-300 shadow-2xs flex items-center justify-center">
                            <img 
                              src={machineFormData.fotos.split(',')[0].trim()} 
                              alt="Foto Principal" 
                              className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform"
                              onClick={() => setZoomMachineImage(machineFormData.fotos.split(',')[0].trim())}
                            />
                          </div>
                          <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
                            <div className="text-xs text-gray-600">
                              <strong className="text-[#324354] block mb-1">Imagen principal vinculada a la máquina:</strong>
                              <div className="font-mono text-[11px] bg-[#F6F3EE] p-2 rounded-lg border border-gray-200 break-all max-h-16 overflow-y-auto text-gray-600">
                                {machineFormData.fotos}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => machineFileInputRef.current?.click()}
                                className="px-3.5 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Reemplazar Fotografía</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setZoomMachineImage(machineFormData.fotos.split(',')[0].trim())}
                                className="px-3 py-1.5 bg-[#F6F3EE] hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-300 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver / Ampliar</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveMachinePhoto}
                                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer sm:ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar Foto</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => machineFileInputRef.current?.click()}
                          className="py-8 px-4 bg-white hover:bg-gray-50 transition-colors rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#324354] flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs"
                        >
                          <div className="p-3 bg-[#F6F3EE] rounded-full border border-gray-200 group-hover:scale-110 transition-transform mb-2 text-[#324354]">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-[#324354]">
                            Haz clic aquí para cargar la fotografía del equipo
                          </p>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm">
                            Sube un archivo de imagen desde tu computador (JPG, PNG, WEBP, GIF — hasta 10MB)
                          </p>
                          <button
                            type="button"
                            className="mt-3 px-4 py-1.5 bg-[#324354] text-white rounded-xl text-xs font-bold group-hover:bg-[#324354]/90 transition-all pointer-events-none shadow-xs"
                          >
                            Seleccionar Archivo de Imagen
                          </button>
                        </div>
                      )}

                      {/* Manual URL input fallback & SharePoint Notice */}
                      <div className="pt-2 border-t border-gray-200/80">
                        <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                          O ingresa / edita la URL directamente (Opcional):
                        </label>
                        <input
                          type="text"
                          value={machineFormData.fotos}
                          onChange={(e) => setMachineFormData(prev => ({ ...prev, fotos: e.target.value }))}
                          placeholder="https://... o ruta pública de imagen"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs text-[#324354] focus:outline-none focus:border-[#324354]"
                        />
                        {machineFormData.fotos && (machineFormData.fotos.includes('sharepoint.com') || machineFormData.fotos.includes('AllItems.aspx')) && (
                          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Aviso sobre enlace de SharePoint:</strong> El enlace actual pertenece al explorador web de SharePoint y requiere inicio de sesión, por lo que no se muestra como imagen directa. Te recomendamos utilizar el botón superior <strong>"Cargar Fotografía Principal"</strong> para subir el archivo directamente a la base de datos de Manufactura.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Planos Técnicos */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">URL Planos Técnicos</label>
                      <input
                        type="text"
                        value={machineFormData.planos}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, planos: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    {/* Manuales */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">URL Manuales de Usuario / Servicio</label>
                      <input
                        type="text"
                        value={machineFormData.manuales}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, manuales: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>

                    {/* Notas */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Notas y Observaciones Generales</label>
                      <textarea
                        value={machineFormData.notas}
                        onChange={(e) => setMachineFormData(prev => ({ ...prev, notas: e.target.value }))}
                        placeholder="Observaciones de calidad de dato, estado físico, recomendaciones..."
                        rows={3}
                        className="w-full p-3 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm text-[#324354] focus:outline-none focus:border-[#324354]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer Actions */}
              <div className="px-6 py-4 sm:px-8 sm:py-4 border-t border-[#e2ded5] bg-[#F6F3EE] shrink-0 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowMachineFormModal(false)}
                  disabled={savingMachine}
                  className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all border border-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMachine}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  {savingMachine ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando en Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{machineFormMode === 'create' ? 'Crear Máquina en Supabase' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox: Zoom Machine Image */}
      {zoomMachineImage && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setZoomMachineImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomMachineImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1 cursor-pointer"
            >
              <X className="w-7 h-7" />
            </button>
            <img 
              src={zoomMachineImage} 
              alt="Foto ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* Modal: Gran Mensaje de Atención / Confirmación Crítica para Eliminar Máquina */}
      {machineToDelete && (
        <div 
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingMachine) {
              setMachineToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-300 flex flex-col items-center text-center gap-5 relative animate-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big Alert Icon */}
            <div className="w-20 h-20 rounded-full bg-rose-100 border-4 border-rose-200 flex items-center justify-center text-rose-600 shadow-md">
              <AlertTriangle className="w-10 h-10 stroke-[2.5] animate-pulse" />
            </div>

            {/* Warning Header */}
            <div className="flex flex-col gap-1.5">
              <span className="px-3.5 py-1 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-full self-center shadow-xs">
                ⚠️ ¡ATENCIÓN CRÍTICA!
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#324354] leading-tight">
                ¿Confirmas la eliminación permanente de este equipo?
              </h3>
            </div>

            {/* Machine Target Info Card */}
            <div className="w-full bg-[#F6F3EE] p-4 rounded-2xl border border-gray-200 text-left flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {machineToDelete.codigo && (
                  <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-xs border border-slate-200">
                    {machineToDelete.codigo}
                  </span>
                )}
                {machineToDelete.planta && (
                  <span className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs font-semibold border border-gray-200">
                    Planta: {machineToDelete.planta}
                  </span>
                )}
                <span className="text-xs font-mono text-gray-400 ml-auto">
                  ID #{machineToDelete.id}
                </span>
              </div>
              <strong className="text-base text-[#324354] font-black break-words">
                {machineToDelete.nombre}
              </strong>
            </div>

            {/* Irreversible Impact Notice */}
            <div className="w-full bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-left flex items-start gap-2.5 text-xs text-rose-900 leading-relaxed font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-950 font-bold mb-0.5">Esta acción es irreversible:</strong>
                El registro será borrado definitivamente de la base de datos de <strong>Supabase</strong>. Toda la ficha técnica, especificaciones y enlaces asociados se perderán.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setMachineToDelete(null)}
                disabled={deletingMachine}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs sm:text-sm transition-all border border-gray-300 cursor-pointer disabled:opacity-50"
              >
                No, Cancelar y Conservar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteMachine}
                disabled={deletingMachine}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingMachine ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



