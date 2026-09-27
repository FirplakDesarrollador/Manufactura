'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  Layers,
  Filter,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface TurnoItem {
  id?: number;
  codigo: string;
  horario: string;
  hora_inicio?: string;
  hora_fin?: string;
  color: string;
  descripcion?: string;
}

export interface HorarioAsignacion {
  id?: number;
  tecnico_id?: number | string;
  tecnico_nombre: string;
  dia_semana: string;
  turno_codigo: string;
  fecha?: string;
  semana_codigo?: string;
}

export interface TechnicianObj {
  id: number | string;
  name: string;
  documento?: string;
  planta?: string;
  modalidad_operativa?: string; // 'PR', 'NP', 'PRNP', 'INACTIVO'
  capacidad_horas?: number;
  activo?: boolean;
}

interface Props {
  technicians?: any[];
  onTechsUpdated?: () => void;
}

// Clean any double dashes (--), multiple hyphens, or unformatted spaces
export const cleanHorarioText = (raw?: string | null): string => {
  if (!raw) return '';
  return raw
    .replace(/--+/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
};

const DEFAULT_TURNOS: TurnoItem[] = [
  { codigo: 'T1', horario: '05:30 - 12:50', hora_inicio: '05:30', hora_fin: '12:50', color: '#ffedd5' },
  { codigo: 'T2', horario: '07:30 - 14:50', hora_inicio: '07:30', hora_fin: '14:50', color: '#bae6fd' },
  { codigo: 'T3', horario: '14:50 - 22:10', hora_inicio: '14:50', hora_fin: '22:10', color: '#fef08a' },
  { codigo: 'T4', horario: '22:10 - 05:30', hora_inicio: '22:10', hora_fin: '05:30', color: '#bbf7d0' },
  { codigo: 'T5', horario: '20:30 - 05:30', hora_inicio: '20:30', hora_fin: '05:30', color: '#cbd5e1' },
  { codigo: 'T6', horario: '06:30 - 13:50', hora_inicio: '06:30', hora_fin: '13:50', color: '#fdba74' },
  { codigo: 'T7', horario: '12:50 - 20:40', hora_inicio: '12:50', hora_fin: '20:40', color: '#f5d0fe' },
];

const DIAS_SEMANA = [
  { key: 'DOMINGO', label: 'DOMINGO', short: 'Dom' },
  { key: 'LUNES', label: 'LUNES', short: 'Lun' },
  { key: 'MARTES', label: 'MARTES', short: 'Mar' },
  { key: 'MIERCOLES', label: 'MIÉRCOLES', short: 'Mié' },
  { key: 'JUEVES', label: 'JUEVES', short: 'Jue' },
  { key: 'VIERNES', label: 'VIERNES', short: 'Vie' },
  { key: 'SABADO', label: 'SÁBADO', short: 'Sáb' },
];

const INITIAL_ALIAS_ASSIGNMENTS: Record<string, Record<string, string>> = {
  'jhan carlos': { LUNES: 'T3', MARTES: 'T3', MIERCOLES: 'T3', JUEVES: 'T3', VIERNES: 'T3', SABADO: 'T2' },
  'carlos giraldo': { LUNES: 'T4', MARTES: 'T4', MIERCOLES: 'T4', JUEVES: 'T4', VIERNES: 'T4', SABADO: 'T4' },
  'anderson plata': { LUNES: 'T1+2', MARTES: 'T1+2', MIERCOLES: 'T1+2', JUEVES: 'T1+2', VIERNES: 'T1+2' },
  'alvaro gonzalez': { LUNES: 'T2', MARTES: 'T2', MIERCOLES: 'T2', JUEVES: 'T2', VIERNES: 'T2', SABADO: 'T1' },
  'gustavo gonzales': { LUNES: 'T6+2', MARTES: 'T6+2', MIERCOLES: 'T6+2', JUEVES: 'T6+2', VIERNES: 'T6+2' },
  'gustavo gonzalez': { LUNES: 'T6+2', MARTES: 'T6+2', MIERCOLES: 'T6+2', JUEVES: 'T6+2', VIERNES: 'T6+2' },
  'yeison correa': { LUNES: 'T3', MARTES: 'T3', MIERCOLES: 'T3', JUEVES: 'T3', VIERNES: 'T3', SABADO: 'T7' },
  'andres alarcon': { LUNES: 'T1', MARTES: 'T1', MIERCOLES: 'T1', JUEVES: 'T1', VIERNES: 'T1', SABADO: 'T1' },
  'harrison mendoza': { LUNES: 'T5', MARTES: 'T4', MIERCOLES: 'T4', JUEVES: 'T4', VIERNES: 'T4', SABADO: 'T4' },
  'harrinson mendoza': { LUNES: 'T5', MARTES: 'T4', MIERCOLES: 'T4', JUEVES: 'T4', VIERNES: 'T4', SABADO: 'T4' },
  'sebastian arango': { LUNES: 'T6', MARTES: 'T6', MIERCOLES: 'T6', JUEVES: 'T6', VIERNES: 'T6', SABADO: 'T6' },
  'nicolas osorio': { LUNES: 'T6', MARTES: 'T6', MIERCOLES: 'T6', JUEVES: 'T6', VIERNES: 'T6', SABADO: 'T6' },
  'jampier josa': { LUNES: 'T6+2', MARTES: 'T6+2', MIERCOLES: 'T6+2', JUEVES: 'T6+2', VIERNES: 'T6+2' },
};

const normalizeStr = (text: string = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function MatrizHorariosTurnos({ technicians: propTechnicians, onTechsUpdated }: Props) {
  const [dbTechnicians, setDbTechnicians] = useState<TechnicianObj[]>([]);
  const [turnos, setTurnos] = useState<TurnoItem[]>(DEFAULT_TURNOS);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Search & Filter state for Sidebar
  const [techSearch, setTechSearch] = useState<string>('');
  const [modalidadFilter, setModalidadFilter] = useState<'TODOS' | 'PR' | 'NP' | 'PRNP' | 'INACTIVO'>('TODOS');

  // Technician modal (Create / Edit)
  const [showTechModal, setShowTechModal] = useState<boolean>(false);
  const [editingTech, setEditingTech] = useState<TechnicianObj | null>(null);
  const [techFormData, setTechFormData] = useState<{
    nombre: string;
    documento: string;
    modalidad_operativa: string;
    planta: string;
    capacidad_horas: string;
  }>({
    nombre: '',
    documento: '',
    modalidad_operativa: 'PR',
    planta: 'Mármol Sintético',
    capacidad_horas: '7.2',
  });

  // Turno creation/editing modal state
  const [showTurnoModal, setShowTurnoModal] = useState<boolean>(false);
  const [editingTurno, setEditingTurno] = useState<TurnoItem | null>(null);
  const [turnoForm, setTurnoForm] = useState<{ codigo: string; horario: string; color: string }>({
    codigo: '',
    horario: '',
    color: '#bae6fd',
  });

  // Cell assignment modal state
  const [cellEdit, setCellEdit] = useState<{ tecnico: string; dia: string; currentTurno: string } | null>(null);
  const [customTurnoInput, setCustomTurnoInput] = useState<string>('');

  // Date/Week management
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Calculate week dates (Sunday to Saturday)
  const weekDaysInfo = useMemo(() => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay();
    const sunday = new Date(curr.setDate(first));

    return DIAS_SEMANA.map((diaObj, index) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + index);
      return {
        ...diaObj,
        dateNumber: d.getDate(),
        fullDateStr: d.toISOString().split('T')[0],
      };
    });
  }, [currentDate]);

  // Load Technicians, Turnos & Horarios from Supabase
  const loadMasterData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Official Technicians directly from mantenimiento_tecnicos
      let officialTechs: TechnicianObj[] = [];
      const { data: techsData, error: techErr } = await supabase
        .from('mantenimiento_tecnicos')
        .select('*')
        .order('id', { ascending: true });

      if (!techErr && techsData && techsData.length > 0) {
        officialTechs = techsData
          .filter((t: any) => t.id !== 9999)
          .map((t: any) => {
            const rawMod = t.modalidad_operativa || t.turno || 'PR';
            const isInactive = t.activo === false || rawMod === 'INACTIVO';
            return {
              id: t.id,
              name: t.nombre_completo || t.nombre || `Técnico #${t.id}`,
              documento: t.documento,
              planta: t.planta || t.especialidad || 'MS',
              modalidad_operativa: isInactive ? 'INACTIVO' : rawMod,
              capacidad_horas: parseFloat(t.capacidad_horas) || 7.2,
              activo: !isInactive,
            };
          });
      } else if (propTechnicians && propTechnicians.length > 0) {
        officialTechs = propTechnicians
          .filter(t => t.id !== 9999)
          .map(t => ({
            id: t.id,
            name: t.name || t.nombre,
            documento: t.documento,
            planta: t.planta,
            modalidad_operativa: t.activo === false ? 'INACTIVO' : (t.modalidad_operativa || t.turno || 'PR'),
            capacidad_horas: t.capacity || 7.2,
            activo: t.activo !== false,
          }));
      }

      setDbTechnicians(officialTechs);

      // 2. Fetch Turnos
      let activeTurnos = DEFAULT_TURNOS;
      const { data: dbTurnos, error: turnosErr } = await supabase
        .from('mantenimiento_turnos')
        .select('*')
        .order('codigo', { ascending: true });

      if (!turnosErr && dbTurnos && dbTurnos.length > 0) {
        activeTurnos = dbTurnos.map((t: any) => ({
          ...t,
          horario: cleanHorarioText(t.horario),
        }));
        setTurnos(activeTurnos);
      }

      // 3. Fetch Horarios from DB
      const { data: dbHorarios } = await supabase
        .from('mantenimiento_horarios')
        .select('*');

      const loadedAssignments: Record<string, Record<string, string>> = {};

      officialTechs.forEach(tech => {
        const normFullName = normalizeStr(tech.name);
        loadedAssignments[tech.name] = {};

        Object.entries(INITIAL_ALIAS_ASSIGNMENTS).forEach(([alias, diasMap]) => {
          const normAlias = normalizeStr(alias);
          if (normFullName.includes(normAlias) || normAlias.includes(normFullName)) {
            loadedAssignments[tech.name] = { ...diasMap };
          }
        });
      });

      if (dbHorarios && dbHorarios.length > 0) {
        dbHorarios.forEach((item: any) => {
          const matchingTech = officialTechs.find(
            t =>
              normalizeStr(t.name) === normalizeStr(item.tecnico_nombre) ||
              normalizeStr(t.name).includes(normalizeStr(item.tecnico_nombre)) ||
              normalizeStr(item.tecnico_nombre).includes(normalizeStr(t.name))
          );

          const targetName = matchingTech ? matchingTech.name : item.tecnico_nombre;
          if (!loadedAssignments[targetName]) loadedAssignments[targetName] = {};
          if (item.turno_codigo) {
            loadedAssignments[targetName][item.dia_semana] = item.turno_codigo;
          }
        });
      }

      setAssignments(loadedAssignments);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [propTechnicians]);

  // Color helper for Turnos
  const getTurnoInfo = (codigo: string) => {
    if (!codigo) return null;
    const cleanCode = codigo.trim().toUpperCase();
    const found = turnos.find(t => t.codigo.toUpperCase() === cleanCode);
    if (found) return found;

    const baseCode = cleanCode.split('+')[0];
    const baseFound = turnos.find(t => t.codigo.toUpperCase() === baseCode);
    if (baseFound) {
      return {
        ...baseFound,
        codigo: cleanCode,
      };
    }

    return {
      codigo: cleanCode,
      horario: 'Horario Especial',
      color: '#e2e8f0',
    };
  };

  // Color & Badge helper for Modalidad Operativa
  const getModalidadBadge = (mod?: string) => {
    const cleanMod = (mod || 'PR').toUpperCase();
    if (cleanMod === 'INACTIVO') {
      return {
        label: 'Inactivo',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-300',
        dot: 'bg-slate-400',
      };
    }
    if (cleanMod === 'PR') {
      return {
        label: 'PR · Producción',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (cleanMod === 'NP') {
      return {
        label: 'NP · No Producción',
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
      };
    }
    return {
      label: 'PRNP · Mixto',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    };
  };

  // Filtered Technicians for Sidebar
  const filteredTechnicians = useMemo(() => {
    const q = normalizeStr(techSearch);
    return dbTechnicians.filter(t => {
      const matchSearch =
        !q ||
        normalizeStr(t.name).includes(q) ||
        (t.documento && normalizeStr(t.documento).includes(q)) ||
        (t.modalidad_operativa && normalizeStr(t.modalidad_operativa).includes(q));

      const matchMod =
        modalidadFilter === 'TODOS' ||
        t.modalidad_operativa === modalidadFilter ||
        (modalidadFilter === 'INACTIVO' && t.activo === false);

      return matchSearch && matchMod;
    });
  }, [dbTechnicians, techSearch, modalidadFilter]);

  // Counts by modality
  const counts = useMemo(() => {
    let pr = 0;
    let np = 0;
    let prnp = 0;
    let inact = 0;

    dbTechnicians.forEach(t => {
      if (t.modalidad_operativa === 'INACTIVO' || t.activo === false) inact++;
      else if (t.modalidad_operativa === 'NP') np++;
      else if (t.modalidad_operativa === 'PRNP') prnp++;
      else pr++;
    });

    return { pr, np, prnp, inact, total: dbTechnicians.length };
  }, [dbTechnicians]);

  // Grouping for Weekly Calendar: Day -> Turno -> Technicians
  const plannerScheduleByDay = useMemo(() => {
    const result: Record<string, Record<string, TechnicianObj[]>> = {};

    DIAS_SEMANA.forEach(dia => {
      result[dia.key] = {};
    });

    dbTechnicians.forEach(tech => {
      const techAssignments = assignments[tech.name] || {};
      DIAS_SEMANA.forEach(dia => {
        const turno = techAssignments[dia.key];
        if (turno) {
          if (!result[dia.key][turno]) {
            result[dia.key][turno] = [];
          }
          result[dia.key][turno].push(tech);
        }
      });
    });

    return result;
  }, [dbTechnicians, assignments]);

  // Handle Technician Create / Edit Modal
  const handleOpenNewTech = () => {
    setEditingTech(null);
    setTechFormData({
      nombre: '',
      documento: '',
      modalidad_operativa: 'PR',
      planta: 'Mármol Sintético',
      capacidad_horas: '7.2',
    });
    setShowTechModal(true);
  };

  const handleOpenEditTech = (tech: TechnicianObj) => {
    setEditingTech(tech);
    setTechFormData({
      nombre: tech.name,
      documento: tech.documento || '',
      modalidad_operativa: tech.modalidad_operativa || 'PR',
      planta: tech.planta || 'Mármol Sintético',
      capacidad_horas: tech.capacidad_horas?.toString() || '7.2',
    });
    setShowTechModal(true);
  };

  const handleSaveTechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techFormData.nombre.trim()) {
      alert('Ingresa el nombre del técnico.');
      return;
    }

    const isInactive = techFormData.modalidad_operativa === 'INACTIVO';
    const payload: any = {
      nombre: techFormData.nombre.trim(),
      documento: techFormData.documento.trim() || null,
      modalidad_operativa: techFormData.modalidad_operativa,
      turno: techFormData.modalidad_operativa, // backwards compatibility
      especialidad: techFormData.planta,
      capacidad_horas: parseFloat(techFormData.capacidad_horas) || 7.2,
      activo: !isInactive,
    };

    setSaving(true);
    try {
      if (editingTech && editingTech.id) {
        // Update DB
        let { error } = await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', editingTech.id);
        if (error && error.message.includes('modalidad_operativa')) {
          delete payload.modalidad_operativa;
          await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', editingTech.id);
        }
        setStatusMsg({ type: 'success', text: `Técnico ${payload.nombre} actualizado correctamente.` });
      } else {
        // Insert DB
        let { error } = await supabase.from('mantenimiento_tecnicos').insert([payload]);
        if (error && error.message.includes('modalidad_operativa')) {
          delete payload.modalidad_operativa;
          await supabase.from('mantenimiento_tecnicos').insert([payload]);
        }
        setStatusMsg({ type: 'success', text: `Técnico ${payload.nombre} creado correctamente.` });
      }

      setShowTechModal(false);
      await loadMasterData();
      if (onTechsUpdated) onTechsUpdated();
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Delete / Inactivate Tech
  const handleDeleteTech = async (tech: TechnicianObj) => {
    if (!confirm(`¿Deseas marcar como inactivo al técnico ${tech.name}?`)) return;

    try {
      await supabase
        .from('mantenimiento_tecnicos')
        .update({ activo: false, modalidad_operativa: 'INACTIVO', turno: 'INACTIVO' })
        .eq('id', tech.id);

      await loadMasterData();
      if (onTechsUpdated) onTechsUpdated();
      setStatusMsg({ type: 'info', text: `Técnico ${tech.name} marcado como inactivo.` });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Turno (Create or Edit)
  const handleSaveTurno = async () => {
    if (!turnoForm.codigo.trim() || !turnoForm.horario.trim()) {
      alert('Ingresa el código y el horario del turno.');
      return;
    }

    const cleanHorario = cleanHorarioText(turnoForm.horario);
    const payload = {
      codigo: turnoForm.codigo.trim().toUpperCase(),
      horario: cleanHorario,
      color: turnoForm.color,
    };

    setSaving(true);
    try {
      if (editingTurno && editingTurno.id) {
        await supabase.from('mantenimiento_turnos').update(payload).eq('id', editingTurno.id);
        setTurnos(prev => prev.map(t => (t.id === editingTurno.id ? { ...t, ...payload } : t)));
      } else {
        const { data, error } = await supabase.from('mantenimiento_turnos').insert([payload]).select();
        if (!error && data && data[0]) {
          setTurnos(prev => [...prev, { ...data[0], horario: cleanHorarioText(data[0].horario) }]);
        } else {
          setTurnos(prev => [...prev, payload]);
        }
      }

      setShowTurnoModal(false);
      setStatusMsg({ type: 'success', text: `Turno ${payload.codigo} (${cleanHorario}) guardado correctamente.` });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Delete Turno
  const handleDeleteTurno = async (t: TurnoItem) => {
    if (!confirm(`¿Eliminar el turno ${t.codigo}?`)) return;

    if (t.id) {
      await supabase.from('mantenimiento_turnos').delete().eq('id', t.id);
    }
    setTurnos(prev => prev.filter(item => item.codigo !== t.codigo));
    setStatusMsg({ type: 'info', text: `Turno ${t.codigo} eliminado.` });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Update cell assignment
  const handleSelectCellTurno = async (tecnico: string, dia: string, turnoCodigo: string) => {
    const cleanCode = turnoCodigo.trim().toUpperCase();
    const updatedAssignments = {
      ...assignments,
      [tecnico]: {
        ...(assignments[tecnico] || {}),
        [dia]: cleanCode,
      },
    };

    setAssignments(updatedAssignments);
    setCellEdit(null);

    // Save to Supabase
    try {
      const techObj = dbTechnicians.find(t => t.name === tecnico);
      await supabase.from('mantenimiento_horarios').upsert(
        [
          {
            tecnico_id: techObj?.id || null,
            tecnico_nombre: tecnico,
            dia_semana: dia,
            turno_codigo: cleanCode,
          },
        ],
        { onConflict: 'tecnico_nombre,dia_semana' }
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Save all schedules to Supabase
  const handleSaveAllAssignments = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const recordsToUpsert: HorarioAsignacion[] = [];

      Object.entries(assignments).forEach(([tecnico, diasMap]) => {
        const techObj = dbTechnicians.find(t => t.name === tecnico);
        Object.entries(diasMap).forEach(([dia, turno]) => {
          if (turno) {
            recordsToUpsert.push({
              tecnico_id: techObj?.id || null,
              tecnico_nombre: tecnico,
              dia_semana: dia,
              turno_codigo: turno,
            });
          }
        });
      });

      if (recordsToUpsert.length > 0) {
        const { error } = await supabase
          .from('mantenimiento_horarios')
          .upsert(recordsToUpsert, { onConflict: 'tecnico_nombre,dia_semana' });

        if (error) throw error;
      }

      setStatusMsg({ type: 'success', text: '¡Planificación semanal guardada con éxito en Supabase!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Error guardando en Supabase:', err);
      setStatusMsg({
        type: 'info',
        text: 'Datos actualizados en la sesión.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-5">
      
      {/* ========================================================================= */}
      {/* 1. CABECERA UNIFICADA DE PLANIFICACIÓN                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e2ded5] pb-4">
        <div>
          <h3 className="text-lg font-black text-[#324354] flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">
              1
            </span>
            <Calendar className="w-5 h-5 text-[#7B8E90]" />
            <span>Planificación de Cuadrilla, Horarios y Turnos de Mantenimiento</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión centralizada de técnicos, modalidad operativa (PR/NP) y calendario semanal de turnos (T1-T7).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNewTech}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Técnico</span>
          </button>

          <button
            onClick={handleSaveAllAssignments}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-all cursor-pointer shadow-xs"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-sky-50 text-sky-800 border border-sky-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGACIÓN SEMANAL Y CONTADORES                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#F6F3EE] p-3 rounded-2xl border border-gray-200">
        
        {/* Week Date Label */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7B8E90]" />
          <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
            Semana: {weekDaysInfo[0]?.dateNumber} al {weekDaysInfo[6]?.dateNumber} de {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Modality KPI Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-100/90 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            PR (Producción): {counts.pr}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-sky-100/90 text-sky-800 border border-sky-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-600"></span>
            NP (Paro): {counts.np}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            Inactivos: {counts.inact}
          </span>
        </div>

        {/* Week Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - 7);
              setCurrentDate(d);
            }}
            className="p-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
          >
            Esta Semana
          </button>
          <button
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + 7);
              setCurrentDate(d);
            }}
            className="p-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISTA UNIFICADA: SIDEBAR DE TÉCNICOS + CALENDARIO SEMANAL             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ======================================================================= */}
        {/* PANEL IZQUIERDO: CUADRILLA DE TÉCNICOS (Modalidad + Ficha)            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 bg-[#F6F3EE] p-3.5 rounded-2xl border border-gray-300/80 flex flex-col gap-3">
          
          {/* Header & Search */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#7B8E90]" />
                Cuadrilla ({filteredTechnicians.length})
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={techSearch}
                onChange={e => setTechSearch(e.target.value)}
                placeholder="Buscar por nombre o CC..."
                className="w-full pl-8 pr-7 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-medium text-[#324354] focus:outline-none focus:border-[#324354]"
              />
              {techSearch && (
                <button
                  onClick={() => setTechSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {(['TODOS', 'PR', 'NP', 'INACTIVO'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setModalidadFilter(f)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all shrink-0 ${
                    modalidadFilter === f
                      ? 'bg-[#324354] text-white shadow-2xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f === 'INACTIVO' ? 'Inactivos' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Technicians List (Single-view scrollable) */}
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredTechnicians.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs italic">
                No se encontraron técnicos
              </div>
            ) : (
              filteredTechnicians.map(tech => {
                const modBadge = getModalidadBadge(tech.modalidad_operativa);
                const isInactive = tech.modalidad_operativa === 'INACTIVO' || tech.activo === false;

                return (
                  <div
                    key={tech.id}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 shadow-2xs ${
                      isInactive
                        ? 'bg-slate-100/90 border-slate-300/80 text-slate-600 opacity-80'
                        : 'bg-white border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {/* Top Row: Name + Action Buttons */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex flex-col">
                        <span className={`text-xs font-black leading-tight ${isInactive ? 'text-slate-700' : 'text-[#324354]'}`}>
                          {tech.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                          {tech.documento && <span>CC: {tech.documento}</span>}
                          {tech.planta && <span className="bg-gray-100 px-1 rounded text-gray-700 font-semibold">{tech.planta}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditTech(tech)}
                          className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100"
                          title="Editar Técnico"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {!isInactive && (
                          <button
                            onClick={() => handleDeleteTech(tech)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Marcar Inactivo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Modality Badge */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1.5 ${modBadge.bg} ${modBadge.text} ${modBadge.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${modBadge.dot}`}></span>
                        {modBadge.label}
                      </span>

                      <span className="text-[10px] font-bold text-gray-400">
                        {tech.capacidad_horas}h/día
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL DERECHO: CALENDARIO SEMANAL DE TURNOS POR DÍA                      */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7B8E90]" />
              Calendario Semanal de Turnos
            </span>
            <span className="text-[10px] text-gray-400 italic">
              Haz clic en cualquier ficha para reasignar
            </span>
          </div>

          <div className="border border-gray-300 rounded-2xl overflow-hidden bg-white shadow-xs">
            {/* 7 Columns for Days */}
            <div className="grid grid-cols-7 border-b border-gray-300 bg-[#F6F3EE] divide-x divide-gray-300 text-center">
              {weekDaysInfo.map((dia, idx) => {
                const isWeekend = idx === 0 || idx === 6;
                return (
                  <div key={dia.key} className={`py-2 px-1 ${isWeekend ? 'bg-gray-100/70' : ''}`}>
                    <div className="text-[11px] font-extrabold text-gray-700 tracking-wider uppercase">
                      {dia.short}
                    </div>
                    <div className="text-sm font-black text-[#324354]">{dia.dateNumber}</div>
                  </div>
                );
              })}
            </div>

            {/* Content Column Grid */}
            <div className="grid grid-cols-7 divide-x divide-gray-300 min-h-[460px] max-h-[500px] overflow-y-auto bg-slate-50/20">
              {weekDaysInfo.map(dia => {
                const dayTurnosMap = plannerScheduleByDay[dia.key] || {};
                const activeTurnoKeys = Object.keys(dayTurnosMap);

                return (
                  <div key={dia.key} className="p-1 flex flex-col gap-1.5 min-h-full">
                    {activeTurnoKeys.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-2 text-center text-gray-300 text-[10px] italic">
                        Sin turnos
                      </div>
                    ) : (
                      activeTurnoKeys.map(turnoKey => {
                        const tInfo = getTurnoInfo(turnoKey);
                        const assignedTechs = dayTurnosMap[turnoKey] || [];
                        const cleanHorario = cleanHorarioText(tInfo?.horario);

                        return (
                          <div
                            key={turnoKey}
                            style={{ backgroundColor: tInfo?.color || '#fff' }}
                            className="rounded-xl p-1.5 border border-gray-400/40 shadow-2xs flex flex-col gap-1 transition-transform hover:scale-[1.01]"
                          >
                            {/* Turno Header Badge + Hours */}
                            <div className="flex items-center justify-between border-b border-black/10 pb-0.5">
                              <span className="font-black font-mono text-[11px] text-gray-900 bg-white/70 px-1 rounded shadow-2xs">
                                {turnoKey}
                              </span>
                              <span className="text-[9px] font-bold font-mono text-gray-800 tracking-tight">
                                {cleanHorario}
                              </span>
                            </div>

                            {/* Assigned Technicians */}
                            <div className="flex flex-col gap-1 pt-0.5">
                              {assignedTechs.map(tech => {
                                const modBadge = getModalidadBadge(tech.modalidad_operativa);
                                const isInactive = tech.modalidad_operativa === 'INACTIVO' || tech.activo === false;

                                return (
                                  <div
                                    key={tech.id}
                                    onClick={() => {
                                      setCellEdit({
                                        tecnico: tech.name,
                                        dia: dia.key,
                                        currentTurno: turnoKey,
                                      });
                                      setCustomTurnoInput(turnoKey);
                                    }}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs cursor-pointer truncate flex items-center gap-1 border border-black/5 ${
                                      isInactive
                                        ? 'bg-slate-200 text-slate-600'
                                        : 'bg-white/85 hover:bg-white text-gray-900'
                                    }`}
                                    title={`Clic para reasignar: ${tech.name} (${modBadge.label})`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${modBadge.dot}`}></span>
                                    <span className="truncate">{tech.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. CATÁLOGO Y EDICIÓN DE TURNOS (T1 - T7)                                 */}
      {/* ========================================================================= */}
      <div className="bg-[#F6F3EE] p-4 rounded-2xl border border-gray-300/80 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#324354]" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354]">
              Catálogo Maestro de Turnos Horarios
            </h4>
          </div>

          <button
            onClick={() => {
              setEditingTurno(null);
              setTurnoForm({
                codigo: `T${turnos.length + 1}`,
                horario: '08:00 - 16:00',
                color: '#cbd5e1',
              });
              setShowTurnoModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Turno</span>
          </button>
        </div>

        {/* Turnos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {turnos.map(t => {
            const cleanHours = cleanHorarioText(t.horario);
            return (
              <div
                key={t.codigo}
                style={{ backgroundColor: t.color || '#fff' }}
                className="p-2 rounded-xl border border-gray-400/50 flex flex-col justify-between gap-1 shadow-2xs group relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-gray-900 font-mono tracking-wider">{t.codigo}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTurno(t);
                        setTurnoForm({
                          codigo: t.codigo,
                          horario: cleanHorarioText(t.horario),
                          color: t.color || '#bae6fd',
                        });
                        setShowTurnoModal(true);
                      }}
                      className="p-1 text-gray-700 hover:text-black hover:bg-white/60 rounded"
                      title="Editar Turno"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTurno(t)}
                      className="p-1 text-rose-700 hover:text-rose-900 hover:bg-white/60 rounded"
                      title="Eliminar Turno"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-gray-900 font-mono">
                  {cleanHours}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NUEVO / EDITAR TÉCNICO                                           */}
      {/* ========================================================================= */}
      {showTechModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h4 className="font-bold text-sm text-[#324354]">
                {editingTech ? `Editar Técnico: ${editingTech.name}` : 'Nuevo Técnico de Mantenimiento'}
              </h4>
              <button
                onClick={() => setShowTechModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTechSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nombre Completo Oficial:</label>
                <input
                  type="text"
                  required
                  value={techFormData.nombre}
                  onChange={e => setTechFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Anderson David Plata Peña"
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Cédula de Ciudadanía (CC):</label>
                <input
                  type="text"
                  value={techFormData.documento}
                  onChange={e => setTechFormData(prev => ({ ...prev, documento: e.target.value }))}
                  placeholder="Ej: 1010232658"
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Modalidad Operativa (Condición de Planta):</label>
                <select
                  value={techFormData.modalidad_operativa}
                  onChange={e => setTechFormData(prev => ({ ...prev, modalidad_operativa: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                >
                  <option value="PR">🟢 PR · En Producción (Línea Activa)</option>
                  <option value="NP">🔵 NP · No Producción (Paro de Planta)</option>
                  <option value="PRNP">🟡 PRNP · Producción y Paro (Flexible)</option>
                  <option value="INACTIVO">⚪ Inactivo (Fuera de cuadrilla / Retirado)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Planta Principal:</label>
                  <input
                    type="text"
                    value={techFormData.planta}
                    onChange={e => setTechFormData(prev => ({ ...prev, planta: e.target.value }))}
                    placeholder="Mármol Sintético"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-medium text-[#324354]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Capacidad Diaria (Horas):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={techFormData.capacidad_horas}
                    onChange={e => setTechFormData(prev => ({ ...prev, capacidad_horas: e.target.value }))}
                    placeholder="7.2"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-medium text-[#324354]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#324354] text-white font-bold text-xs rounded-xl hover:bg-[#324354]/90 flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTech ? 'Actualizar Técnico' : 'Guardar Técnico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASIGNAR TURNO A TÉCNICO EN UN DÍA                                */}
      {/* ========================================================================= */}
      {cellEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#324354]">Asignar Turno Horario</h4>
                <p className="text-xs text-gray-700 font-bold truncate max-w-[220px]">
                  {cellEdit.tecnico}
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  Día: <span className="font-bold text-[#324354]">{cellEdit.dia}</span>
                </p>
              </div>
              <button
                onClick={() => setCellEdit(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick selection grid */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">Seleccionar Turno:</label>
              <div className="grid grid-cols-4 gap-2">
                {turnos.map(t => (
                  <button
                    key={t.codigo}
                    type="button"
                    onClick={() => handleSelectCellTurno(cellEdit.tecnico, cellEdit.dia, t.codigo)}
                    style={{ backgroundColor: t.color }}
                    className={`p-2 rounded-xl border border-gray-400/60 font-black text-xs font-mono transition-transform hover:scale-105 cursor-pointer text-gray-900 ${
                      cellEdit.currentTurno === t.codigo ? 'ring-2 ring-[#324354] ring-offset-1' : ''
                    }`}
                  >
                    {t.codigo}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom turno input */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200">
              <label className="text-xs font-bold text-gray-700">O ingresar combinado (ej: T1+2, T6+2):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTurnoInput}
                  onChange={e => setCustomTurnoInput(e.target.value.toUpperCase())}
                  placeholder="Ej: T1+2"
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold font-mono focus:outline-none focus:border-[#324354]"
                />
                <button
                  type="button"
                  onClick={() => handleSelectCellTurno(cellEdit.tecnico, cellEdit.dia, customTurnoInput)}
                  className="px-4 py-2 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 shrink-0"
                >
                  Asignar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectCellTurno(cellEdit.tecnico, cellEdit.dia, '')}
              className="w-full py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 mt-1"
            >
              Quitar Asignación (Dejar Vacío)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREAR / EDITAR TURNO HORARIO                                     */}
      {/* ========================================================================= */}
      {showTurnoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h4 className="font-bold text-sm text-[#324354]">
                {editingTurno ? `Editar Turno ${editingTurno.codigo}` : 'Crear Nuevo Turno Horario'}
              </h4>
              <button
                onClick={() => setShowTurnoModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Código del Turno (ej: T1, T8):</label>
                <input
                  type="text"
                  value={turnoForm.codigo}
                  onChange={e => setTurnoForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                  placeholder="T8"
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold font-mono focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Horario / Rango de Horas (ej: 08:00 - 16:00):</label>
                <input
                  type="text"
                  value={turnoForm.horario}
                  onChange={e => setTurnoForm(prev => ({ ...prev, horario: e.target.value }))}
                  placeholder="08:00 - 16:00"
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold font-mono focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Color del Turno:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={turnoForm.color}
                    onChange={e => setTurnoForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-gray-300 p-1 bg-white"
                  />
                  <div
                    style={{ backgroundColor: turnoForm.color }}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-gray-400 text-gray-900"
                  >
                    Vista Previa: {turnoForm.codigo || 'T?'} ({cleanHorarioText(turnoForm.horario) || '00:00 - 00:00'})
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowTurnoModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTurno}
                disabled={saving}
                className="px-5 py-2 bg-[#324354] text-white font-bold text-xs rounded-xl hover:bg-[#324354]/90 flex items-center gap-1.5"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar Turno</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
