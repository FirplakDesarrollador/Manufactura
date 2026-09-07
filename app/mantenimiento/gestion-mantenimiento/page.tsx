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
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

// Interfaces
interface Technician {
  id: number;
  name: string;
  capacity: number; // 7.2h max
  turno: string;
  documento?: string;
  authorizedTitles: string[];
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

const DAILY_CAPACITY_LIMIT = 7.2;

// Utility functions
function cleanHeader(header: any): string {
  return String(header == null ? '' : header)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
}

function normalize(str: any): string {
  return String(str == null ? '' : str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeTurno(val: any): string {
  const norm = normalize(val);
  if (norm === '010' || norm === '10' || norm === 'PR' || norm.includes('PRODUC')) return 'PR';
  if (norm === '020' || norm === '20' || norm === 'NP' || norm.includes('PARO') || norm.includes('PLANTA')) return 'NP';
  if (norm === '065' || norm === '65' || norm === 'PRNP' || norm.includes('COMBINA') || norm.includes('AMBOS')) return 'PRNP';
  return norm;
}

function areTurnosCompatible(taskTurno: string, techTurno: string): boolean {
  const taskT = normalizeTurno(taskTurno);
  const techT = normalizeTurno(techTurno);
  if (taskT === techT) return true;
  if (techT === 'PRNP' && (taskT === 'PR' || taskT === 'NP')) return true;
  return false;
}

function getTurnoLabel(turno: string): string {
  const t = normalizeTurno(turno);
  if (t === 'PR') return 'Producción (PR)';
  if (t === 'NP') return 'Paro de Planta (NP)';
  if (t === 'PRNP') return 'Producción y Paro (PRNP)';
  return turno || 'General';
}

function getLocalDatetimeString(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatDateForSupabase(datetimeStr: string | null | undefined): string | null {
  if (!datetimeStr) return null;
  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function getCol(row: any, ...candidates: string[]): string {
  const keys = Object.keys(row);
  const cleanCandidates = candidates.map(c => cleanHeader(c));
  for (const candidate of cleanCandidates) {
    const key = keys.find(k => cleanHeader(k) === candidate);
    if (key !== undefined && row[key] !== undefined && row[key] !== '') return String(row[key]);
  }
  for (const candidate of cleanCandidates) {
    if (candidate.length < 4) continue;
    const key = keys.find(k => cleanHeader(k).includes(candidate));
    if (key !== undefined && row[key] !== undefined && row[key] !== '') return String(row[key]);
  }
  return '';
}

function parseNumeric(val: any): number {
  if (val === undefined || val === null) return 0;
  const cleaned = val.toString().trim().replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function GestionMantenimientoModule() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'tecnico'>('admin');

  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Portal Técnico states
  const [cedulaInput, setCedulaInput] = useState('');
  const [activeTechId, setActiveTechId] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ [taskId: number]: boolean }>({});

  // Modals
  const [showTechModal, setShowTechModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTechForm, setNewTechForm] = useState({ id: '', name: '', turno: 'PR' });
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    detalle: '',
    durationMinutes: 120,
    idtecs: '',
    intervencion: 'PR',
    frecuencia: 30,
    refFrecuencia: 35,
    planta: 'Planta Principal',
    maquina: ''
  });

  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 1. Auth check and initial load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // 2. Fetch data from SharePoint & Supabase
  const fetchData = async (showNotification = false) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sharepoint');
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        processSharePointData(json.data.mantenimientos || [], json.data.tecnicos || []);
        if (showNotification) {
          alert('¡Sincronización con SharePoint completada exitosamente!');
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

    const newTechnicians = Object.values(techMap);
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
          if (isValidFrequency && (currentHours + taskHours) > (DAILY_CAPACITY_LIMIT + 0.0001)) {
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
      const techName = tech ? tech.name : task.idtecs.toString();

      try {
        const { data: existing } = await supabase
          .from('Mantenimientos ejecutados')
          .select('Título')
          .eq('Título', task.title)
          .eq('TECNICO', techName);

        const payload = {
          'Título': task.title,
          'ESTADO': newStatus,
          'TECNICO': techName,
          'FECHA DE CIERRE': formatDateForSupabase(task.fechaCierre)
        };

        if (existing && existing.length > 0) {
          await supabase.from('Mantenimientos ejecutados').update(payload).eq('Título', task.title).eq('TECNICO', techName);
        } else {
          await supabase.from('Mantenimientos ejecutados').insert([payload]);
        }
      } catch (err) {
        console.error('Error actualizando estado en Supabase:', err);
      }
    }
  };

  const handleUpdateDetails = (taskId: number, observations: string, apertura: string | null, cierre: string | null) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, observations, fechaApertura: apertura, fechaCierre: cierre };
      }
      return t;
    });
    persistState(updated, technicians);

    const key = `task_${taskId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);

    saveTimeoutRef.current[key] = setTimeout(async () => {
      const task = updated.find(t => t.id === taskId);
      if (!task) return;
      const tech = technicians.find(t => t.id === task.idtecs);
      const techName = tech ? tech.name : task.idtecs.toString();

      try {
        const { data: existing } = await supabase
          .from('Mantenimientos ejecutados')
          .select('Título')
          .eq('Título', task.title)
          .eq('TECNICO', techName);

        const payload = {
          'Título': task.title,
          'ESTADO': task.status || 'Pendiente',
          'TECNICO': techName,
          'COMENTARIO DE EJECUCION': observations,
          'FECHA DE APERTURA': formatDateForSupabase(apertura),
          'FECHA DE CIERRE': formatDateForSupabase(cierre)
        };

        if (existing && existing.length > 0) {
          await supabase.from('Mantenimientos ejecutados').update(payload).eq('Título', task.title).eq('TECNICO', techName);
        } else {
          await supabase.from('Mantenimientos ejecutados').insert([payload]);
        }

        setSaveFeedback(prev => ({ ...prev, [taskId]: true }));
        setTimeout(() => {
          setSaveFeedback(prev => ({ ...prev, [taskId]: false }));
        }, 2500);
      } catch (err) {
        console.error('Error guardando detalles en Supabase:', err);
      }
    }, 800);
  };

  const handleAssignTask = async (taskId: number, techId: number, forceAdvance = false) => {
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
          if (isDue && (currentTechHours + t.durationHours) > (DAILY_CAPACITY_LIMIT + 0.0001)) {
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
    if (techId !== 9999) setSelectedTechId(techId);

    if (assignedTask && assignedTech && assignedTech.id !== 9999) {
      const task = assignedTask as MaintenanceTask;
      try {
        await supabase.from('Mantenimientos ejecutados').upsert({
          'Título': task.title,
          'ESTADO': task.status || 'Pendiente',
          'TECNICO': assignedTech.name,
          'FECHA DE APERTURA': formatDateForSupabase(task.fechaApertura)
        }, { onConflict: 'Título,TECNICO' });
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
              errors: ['tecnico_no_encontrado'].concat(
                t.errors.filter(e => e !== 'turno_incorrecto' && e !== 'no_autorizado' && e !== 'tecnico_no_encontrado')
              )
            }
          : t
      );
      const updatedTechs = technicians.filter(t => t.id !== techId);
      persistState(updatedTasks, updatedTechs);
      setSelectedTechId(updatedTechs.length > 0 ? updatedTechs[0].id : null);
    }
  };

  const handleAddTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(newTechForm.id);
    if (!idNum || !newTechForm.name.trim()) {
      alert('Por favor ingresa un ID numérico y el nombre del técnico.');
      return;
    }
    if (technicians.some(t => t.id === idNum)) {
      alert('Ya existe un técnico con este ID en la jornada.');
      return;
    }

    const newTech: Technician = {
      id: idNum,
      name: newTechForm.name.trim(),
      capacity: DAILY_CAPACITY_LIMIT,
      turno: newTechForm.turno,
      authorizedTitles: []
    };

    const updatedTechs = [...technicians, newTech];
    persistState(tasks, updatedTechs);
    setSelectedTechId(newTech.id);
    setShowTechModal(false);
    setNewTechForm({ id: '', name: '', turno: 'PR' });
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const assignedId = parseInt(newTaskForm.idtecs) || 9999;
    const isDue = newTaskForm.refFrecuencia >= newTaskForm.frecuencia;
    const durHours = newTaskForm.durationMinutes / 60;

    const newTask: MaintenanceTask = {
      id: Date.now(),
      csvId: `MP-${Math.floor(1000 + Math.random() * 9000)}`,
      code: `MP-${Math.floor(100 + Math.random() * 900)}`,
      title: newTaskForm.title.trim(),
      durationMinutes: newTaskForm.durationMinutes,
      durationHours: durHours,
      idtecs: assignedId,
      idtecsCandidates: assignedId !== 9999 ? [assignedId] : [],
      tipoIntervencion: newTaskForm.intervencion,
      frecuencia: newTaskForm.frecuencia,
      refFrecuencia: newTaskForm.refFrecuencia,
      errors: !isDue ? ['frecuencia_insuficiente'] : [],
      adelantada: false,
      isDue: isDue,
      detalle: newTaskForm.detalle.trim(),
      maquina: newTaskForm.maquina.trim() || 'No especificada',
      planta: newTaskForm.planta.trim() || 'Planta Principal',
      status: 'Pendiente',
      fechaApertura: assignedId !== 9999 ? getLocalDatetimeString() : null
    };

    const updatedTasks = [newTask, ...tasks];
    persistState(updatedTasks, technicians);
    setShowTaskModal(false);
    setNewTaskForm({
      title: '',
      detalle: '',
      durationMinutes: 120,
      idtecs: '',
      intervencion: 'PR',
      frecuencia: 30,
      refFrecuencia: 35,
      planta: 'Planta Principal',
      maquina: ''
    });
  };

  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.isDue && t.idtecs !== 0 && technicians.some(tech => tech.id === t.idtecs));
  }, [tasks, technicians]);

  const waitingTasks = useMemo(() => {
    return tasks.filter(t => !t.isDue || t.idtecs === 0 || t.idtecs === 9999 || !technicians.some(tech => tech.id === t.idtecs));
  }, [tasks, technicians]);

  const conflictedTasks = useMemo(() => {
    return tasks.filter(t => t.isDue && t.errors.some(e => e === 'turno_incorrecto' || e === 'no_autorizado' || e === 'tecnico_no_encontrado'));
  }, [tasks]);

  const hasOverload = useMemo(() => {
    return technicians.some(tech => {
      if (tech.id === 9999) return false;
      const totalHours = tasks.filter(t => t.idtecs === tech.id && t.isDue).reduce((sum, t) => sum + t.durationHours, 0);
      return totalHours > tech.capacity;
    });
  }, [technicians, tasks]);

  const filteredTechs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return technicians.filter(tech => {
      const label = getTurnoLabel(tech.turno).toLowerCase();
      return tech.name.toLowerCase().includes(q) || tech.turno.toLowerCase().includes(q) || label.includes(q) || tech.id.toString().includes(q);
    });
  }, [technicians, searchQuery]);

  const currentSelectedTech = useMemo(() => {
    return technicians.find(t => t.id === selectedTechId);
  }, [technicians, selectedTechId]);

  const selectedTechTasks = useMemo(() => {
    if (!currentSelectedTech) return [];
    return tasks.filter(t => t.idtecs === currentSelectedTech.id && t.isDue);
  }, [tasks, currentSelectedTech]);

  const selectedTechHours = useMemo(() => {
    return selectedTechTasks.reduce((sum, t) => sum + t.durationHours, 0);
  }, [selectedTechTasks]);

  const poolTasks = useMemo(() => {
    const list = tasks.filter(t =>
      !t.isDue ||
      t.idtecs === 0 ||
      t.idtecs === 9999 ||
      !technicians.some(tech => tech.id === t.idtecs && tech.id !== 9999)
    );
    return list.sort((a, b) => {
      const remA = (Number(a.frecuencia) || 0) - (Number(a.refFrecuencia) || 0);
      const remB = (Number(b.frecuencia) || 0) - (Number(b.refFrecuencia) || 0);
      return remA - remB;
    });
  }, [tasks, technicians]);

  const currentPortalTech = useMemo(() => {
    return technicians.find(t => t.id === activeTechId);
  }, [technicians, activeTechId]);

  const portalTechTasks = useMemo(() => {
    if (!currentPortalTech) return [];
    return tasks.filter(t => t.idtecs === currentPortalTech.id && t.isDue);
  }, [tasks, currentPortalTech]);

  const portalTechHours = useMemo(() => {
    return portalTechTasks.reduce((sum, t) => sum + t.durationHours, 0);
  }, [portalTechTasks]);

  const handleLoginTechnician = (techId: number) => {
    setActiveTechId(techId);
    sessionStorage.setItem('techflow_active_tech_id', techId.toString());
  };

  const handleSearchCedula = (e: React.FormEvent) => {
    e.preventDefault();
    const rawQuery = cedulaInput.trim();
    if (!rawQuery) return;

    const cleanDigits = rawQuery.replace(/[^0-9]/g, '');
    const found = technicians.find(t => {
      const docClean = (t.documento || '').replace(/[^0-9]/g, '');
      if (cleanDigits && docClean && docClean === cleanDigits) return true;
      if (t.id.toString() === rawQuery) return true;
      if (normalize(t.name).includes(normalize(rawQuery))) return true;
      return false;
    });

    if (found) {
      handleLoginTechnician(found.id);
    } else {
      alert(`No se encontró ningún técnico con Cédula/ID: "${rawQuery}". Verifica los datos o consulta al administrador.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
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

      <main className="relative z-10 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 flex-1 flex flex-col gap-6">
        
        {/* Top Control Bar: Mode Switcher & Sync */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.04)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#324354] text-white flex items-center justify-center shadow-md shadow-[#324354]/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#324354] tracking-tight">Gestor de Mantenimiento</h1>
              <p className="text-xs sm:text-sm text-[#7B8E90] font-medium">Control de Carga Máxima (7.2h/día) y Validación Cruzada SharePoint - Supabase</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            {/* Tab Switcher */}
            <div className="bg-[#F6F3EE] p-1 rounded-2xl border border-[#e2ded5] flex items-center gap-1">
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'admin'
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'text-[#324354] hover:bg-white/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Panel Planificador</span>
              </button>
              <button
                onClick={() => setActiveTab('tecnico')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'tecnico'
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'text-[#324354] hover:bg-white/60'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Portal de Técnicos</span>
              </button>
            </div>

            {/* Sync Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#324354] text-[#324354] hover:bg-[#324354] hover:text-white font-semibold rounded-2xl text-xs sm:text-sm transition-all duration-300 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar SharePoint'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: ADMIN PLANNER DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'admin' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
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

            {/* Alert Banner for Overcapacity or Conflicts */}
            {(hasOverload || conflictedTasks.length > 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">Atención de Planificación:</span> Se han detectado técnicos que exceden el límite de 7.2 horas diarias o tareas asignadas con alertas de turno/autorización. Las tareas en exceso han sido automáticamente reasignadas al <strong>Super técnico</strong> para su redistribución.
                </div>
              </div>
            )}

            {/* Main Planner Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Technicians List (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#324354]">Técnicos de la Jornada</h2>
                  <button
                    onClick={() => setShowTechModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354]/10 hover:bg-[#324354] text-[#324354] hover:text-white text-xs font-bold rounded-xl transition-all"
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
                      const percentage = Math.min((totalHours / tech.capacity) * 100, 100);
                      const isOverloaded = totalHours > tech.capacity;
                      const isSelected = selectedTechId === tech.id;

                      let barColor = 'bg-[#59a96a]';
                      if (totalHours > 5.5 && totalHours <= 7.2) barColor = 'bg-[#deb841]';
                      if (totalHours > 7.2) barColor = 'bg-[#d14747]';

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
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-sm ${isOverloaded ? 'text-rose-600' : 'text-[#324354]'}`}>
                                {totalHours.toFixed(1)}h
                                <span className="text-xs text-gray-400 font-normal"> / {tech.capacity === 999 ? '∞' : `${tech.capacity.toFixed(1)}h`}</span>
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
                        <h2 className="text-xl font-bold text-[#324354]">{currentSelectedTech.name}</h2>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Turno: <strong>{getTurnoLabel(currentSelectedTech.turno)}</strong> · ID: {currentSelectedTech.id} {currentSelectedTech.documento ? `· Cédula: ${currentSelectedTech.documento}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <div className="text-lg sm:text-2xl font-bold text-[#324354]">
                          {selectedTechHours.toFixed(1)}h <span className="text-sm font-normal text-gray-400">/ {currentSelectedTech.capacity === 999 ? '∞' : `${currentSelectedTech.capacity.toFixed(1)}h`}</span>
                        </div>
                        <div className={`text-xs font-bold ${selectedTechHours > currentSelectedTech.capacity ? 'text-rose-600' : 'text-[#7B8E90]'}`}>
                          {currentSelectedTech.capacity === 999 ? 'Bolsa de asignaciones' : `${Math.round((selectedTechHours / currentSelectedTech.capacity) * 100)}% ocupado hoy`}
                        </div>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#324354] uppercase tracking-wider">
                        Mantenimientos a Ejecutar Hoy ({selectedTechTasks.length})
                      </h3>
                      {currentSelectedTech.id !== 9999 && (
                        <button
                          onClick={() => handleDeleteTech(currentSelectedTech.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar de jornada</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {selectedTechTasks.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl p-6">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p className="font-semibold text-[#324354]">No hay mantenimientos activos asignados</p>
                          <p className="text-xs mt-1">Asigna tareas desde el Pool de mantenimientos ubicado abajo.</p>
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
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="px-2 py-0.5 bg-[#324354] text-white text-[11px] font-bold rounded-md">
                                      #{task.csvId || task.code}
                                    </span>
                                    <span className="font-bold text-[#324354] text-sm sm:text-base">{task.title}</span>
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
                                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                                  {/* Status Selector */}
                                  <select
                                    value={task.status || 'Pendiente'}
                                    onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-[#e2ded5] bg-white text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
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
                                      className="px-3 py-1.5 rounded-xl border border-purple-300 bg-purple-50 text-xs font-bold text-purple-800 focus:outline-none"
                                    >
                                      <option value="">Asignar a...</option>
                                      {technicians.filter(t => t.id !== 9999).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => handleUnassignTask(task.id)}
                                      title="Devolver al Pool de espera"
                                      className="text-xs text-gray-500 hover:text-[#324354] flex items-center gap-1 p-1"
                                    >
                                      <Undo2 className="w-3.5 h-3.5" />
                                      <span>Devolver</span>
                                    </button>
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

            {/* Bottom Section: Unassigned & Waiting Pool */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e2ded5]">
                <div>
                  <h2 className="text-lg font-bold text-[#324354] flex items-center gap-2">
                    <span>📋 Pool General de Mantenimientos</span>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                      {poolTasks.length} disponibles
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mantenimientos en espera de cumplimiento de frecuencia o pendientes de asignar a un técnico de jornada.
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Mantenimiento Manual</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {poolTasks.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    No hay mantenimientos pendientes en el pool.
                  </div>
                ) : (
                  poolTasks.map(task => {
                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          task.adelantada
                            ? 'bg-purple-50/40 border-purple-300'
                            : 'bg-[#F6F3EE]/40 border-[#e2ded5] hover:border-[#324354]'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 bg-[#324354] text-white text-[10px] font-bold rounded">
                              #{task.csvId || task.code}
                            </span>
                            <span className="text-xs font-bold text-[#324354]">⏱️ {task.durationMinutes} min</span>
                          </div>

                          <h4 className="font-bold text-sm text-[#324354] leading-snug">{task.title}</h4>

                          <div className="text-[11px] text-gray-600 flex flex-col gap-0.5">
                            <div>🏭 Planta: <strong>{task.planta}</strong> · ⚙️ <strong>{task.maquina}</strong></div>
                            <div>
                              Frecuencia: <strong>{task.frecuencia}d</strong> (Ref: {task.refFrecuencia}d) · Turno: <strong>{getTurnoLabel(task.tipoIntervencion)}</strong>
                            </div>
                          </div>

                          {task.detalle && (
                            <p className="text-[11px] text-gray-500 bg-white p-2 rounded-lg border border-gray-200 line-clamp-2">
                              {task.detalle}
                            </p>
                          )}

                          <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#324354] font-medium">
                              <input
                                type="checkbox"
                                checked={task.adelantada}
                                onChange={(e) => handleToggleAdvance(task.id, e.target.checked)}
                                className="rounded text-[#324354] focus:ring-0"
                              />
                              <span>Adelantar fecha de validación</span>
                            </label>
                          </div>
                        </div>

                        {/* Assign dropdown */}
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleAssignTask(task.id, parseInt(e.target.value), true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-[#324354]/30 bg-white text-xs font-bold text-[#324354] focus:outline-none"
                          >
                            <option value="">Asignar a Técnico...</option>
                            {technicians.filter(t => t.id !== 9999).map(t => (
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

        {/* ========================================================================= */}
        {/* VIEW 2: TECHNICIAN CONSULTATION PORTAL */}
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

                <form onSubmit={handleSearchCedula} className="w-full max-w-md flex flex-col gap-3">
                  <div className="text-left">
                    <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Cédula / Documento / ID</label>
                    <input
                      type="text"
                      value={cedulaInput}
                      onChange={(e) => setCedulaInput(e.target.value)}
                      placeholder="Ej. 10, 100, 1000456..."
                      autoFocus
                      className="w-full px-4 py-3 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5] text-base font-semibold text-[#324354] focus:outline-none focus:border-[#324354]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#324354] hover:bg-[#324354]/95 text-white font-bold rounded-2xl shadow-lg transition-all"
                  >
                    Consultar Mis Mantenimientos
                  </button>
                </form>

                {/* Quick Select Chips */}
                <div className="w-full border-t border-gray-200 pt-6 text-left">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Técnicos Activos en Jornada:</div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {technicians.filter(t => t.id !== 9999).map(tech => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleLoginTechnician(tech.id)}
                        className="px-3 py-1.5 bg-[#F6F3EE] hover:bg-[#324354] text-[#324354] hover:text-white rounded-xl text-xs font-semibold border border-[#e2ded5] transition-all"
                      >
                        {tech.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Technician Personal Dashboard */
              <div className="flex flex-col gap-6">
                
                {/* Profile Banner */}
                <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#324354] text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {currentPortalTech.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#324354]">{currentPortalTech.name}</h2>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Turno: <strong>{getTurnoLabel(currentPortalTech.turno)}</strong> · ID: {currentPortalTech.id} {currentPortalTech.documento ? `· Cédula: ${currentPortalTech.documento}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#324354]">{portalTechHours.toFixed(1)}h / {currentPortalTech.capacity.toFixed(1)}h</div>
                      <div className="text-xs font-semibold text-[#7B8E90]">{Math.round((portalTechHours / currentPortalTech.capacity) * 100)}% ocupado hoy</div>
                    </div>
                    <button
                      onClick={() => {
                        sessionStorage.removeItem('techflow_active_tech_id');
                        setActiveTechId(null);
                      }}
                      className="p-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-600 transition-all"
                      title="Cambiar técnico"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Status Counters */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5]">
                    <div className="text-xl font-bold text-[#324354]">{portalTechTasks.length}</div>
                    <div className="text-[11px] text-gray-500 font-medium">Asignados</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5]">
                    <div className="text-xl font-bold text-amber-600">
                      {portalTechTasks.filter(t => t.status === 'Pendiente' || !t.status).length}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">Pendientes</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5]">
                    <div className="text-xl font-bold text-blue-600">
                      {portalTechTasks.filter(t => t.status === 'Incompleto').length}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">Incompletos</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#e2ded5]">
                    <div className="text-xl font-bold text-emerald-600">
                      {portalTechTasks.filter(t => t.status === 'Completado').length}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">Completados</div>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-sm flex flex-col gap-4">
                  <h3 className="text-base font-bold text-[#324354]">Mis Mantenimientos para Hoy</h3>

                  <div className="flex flex-col gap-4">
                    {portalTechTasks.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        🎉 ¡No tienes mantenimientos asignados para el día de hoy!
                      </div>
                    ) : (
                      portalTechTasks.map(task => {
                        return (
                          <div
                            key={task.id}
                            className="p-5 rounded-2xl border border-[#e2ded5] bg-[#F6F3EE]/40 flex flex-col gap-4 hover:border-[#324354] transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-[#324354] text-white text-xs font-bold rounded">
                                    #{task.csvId || task.code}
                                  </span>
                                  <h4 className="font-bold text-base text-[#324354]">{task.title}</h4>
                                </div>
                                <div className="text-xs text-gray-600 flex items-center gap-3 flex-wrap">
                                  <span>⏱️ {task.durationMinutes} min ({task.durationHours.toFixed(1)}h)</span>
                                  <span>· 🏭 Planta: <strong>{task.planta}</strong></span>
                                  <span>· ⚙️ Máquina: <strong>{task.maquina}</strong></span>
                                </div>
                                {task.detalle && (
                                  <div className="mt-2 text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                                    <strong className="text-[#324354]">Instrucción / Detalle:</strong> {task.detalle}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Estado Actual</label>
                                <select
                                  value={task.status || 'Pendiente'}
                                  onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                                  className="px-3 py-2 bg-white border border-[#324354] rounded-xl text-xs font-bold text-[#324354] shadow-sm focus:outline-none"
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
                                <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Observaciones / Novedades de Ejecución:</label>
                                <textarea
                                  value={task.observations || ''}
                                  onChange={(e) => handleUpdateDetails(task.id, e.target.value, task.fechaApertura || null, task.fechaCierre || null)}
                                  placeholder="Escribe aquí las observaciones o novedades de este trabajo..."
                                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs min-h-[60px] focus:outline-none focus:border-[#324354]"
                                />
                                {saveFeedback[task.id] && (
                                  <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Cambios guardados en Supabase
                                  </div>
                                )}
                              </div>
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

      </main>

      {/* Modal: Add Technician */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5]">
            <h3 className="text-xl font-bold text-[#324354] mb-4">Añadir Técnico a Jornada</h3>
            <form onSubmit={handleAddTechSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">ID del Técnico (IDTECS)</label>
                <input
                  type="number"
                  value={newTechForm.id}
                  onChange={(e) => setNewTechForm(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="Ej. 100"
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newTechForm.name}
                  onChange={(e) => setNewTechForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Carlos Mendoza"
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#324354]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Turno / Jornada</label>
                <select
                  value={newTechForm.turno}
                  onChange={(e) => setNewTechForm(prev => ({ ...prev, turno: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none"
                >
                  <option value="PR">Producción (PR)</option>
                  <option value="NP">Paro de Planta (NP)</option>
                  <option value="PRNP">Producción y Paro (PRNP)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90"
                >
                  Añadir Técnico
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
            <h3 className="text-xl font-bold text-[#324354] mb-4">Crear Mantenimiento Manual</h3>
            <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Título de la Tarea</label>
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
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Detalle / Descripción</label>
                <textarea
                  value={newTaskForm.detalle}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, detalle: e.target.value }))}
                  placeholder="Descripción detallada del trabajo..."
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
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Máquina</label>
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
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    value={newTaskForm.durationMinutes}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, durationMinutes: parseFloat(e.target.value) || 0 }))}
                    min="10"
                    step="5"
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Frecuencia (días)</label>
                  <input
                    type="number"
                    value={newTaskForm.frecuencia}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, frecuencia: parseFloat(e.target.value) || 0 }))}
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Ref Frecuencia (actual)</label>
                  <input
                    type="number"
                    value={newTaskForm.refFrecuencia}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, refFrecuencia: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90"
                >
                  Guardar Mantenimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
