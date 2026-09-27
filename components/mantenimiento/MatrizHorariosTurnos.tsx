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
  LayoutGrid,
  List,
  CalendarDays,
  Sparkles,
  UserCheck
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
  dia_semana: string; // 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'
  turno_codigo: string;
  fecha?: string;
  semana_codigo?: string;
}

export interface TechnicianObj {
  id: number | string;
  name: string;
  documento?: string;
  planta?: string;
  turno?: string;
  activo?: boolean;
}

interface Props {
  technicians?: TechnicianObj[];
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

// Reference map from spreadsheet short aliases to initial turnos
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

// Normalized name helper for matching
const normalizeStr = (text: string = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function MatrizHorariosTurnos({ technicians: propTechnicians }: Props) {
  const [dbTechnicians, setDbTechnicians] = useState<TechnicianObj[]>([]);
  const [turnos, setTurnos] = useState<TurnoItem[]>(DEFAULT_TURNOS);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // View Mode: 'planner' (Outlook style by hours) vs 'matrix' (compact table)
  const [viewMode, setViewMode] = useState<'planner' | 'matrix'>('planner');

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
    const first = curr.getDate() - curr.getDay(); // Sunday as first day
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
  useEffect(() => {
    async function loadMasterData() {
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
            .filter((t: any) => t.id !== 9999 && t.activo !== false)
            .map((t: any) => ({
              id: t.id,
              name: t.nombre_completo || t.nombre || `Técnico #${t.id}`,
              documento: t.documento,
              planta: t.planta || t.especialidad,
              turno: t.turno,
              activo: t.activo !== false,
            }));
        } else if (propTechnicians && propTechnicians.length > 0) {
          officialTechs = propTechnicians.filter(t => t.id !== 9999);
        }

        setDbTechnicians(officialTechs);

        // 2. Fetch Turnos
        let activeTurnos = DEFAULT_TURNOS;
        const { data: dbTurnos, error: turnosErr } = await supabase
          .from('mantenimiento_turnos')
          .select('*')
          .order('codigo', { ascending: true });

        if (!turnosErr && dbTurnos && dbTurnos.length > 0) {
          // Normalize double dashes
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

        // Pre-populate with initial assignments matching official full names
        officialTechs.forEach(tech => {
          const normFullName = normalizeStr(tech.name);
          loadedAssignments[tech.name] = {};

          // Look for matching alias in default seed data
          Object.entries(INITIAL_ALIAS_ASSIGNMENTS).forEach(([alias, diasMap]) => {
            const normAlias = normalizeStr(alias);
            if (normFullName.includes(normAlias) || normAlias.includes(normFullName)) {
              loadedAssignments[tech.name] = { ...diasMap };
            }
          });
        });

        // Overlay with database records if available
        if (dbHorarios && dbHorarios.length > 0) {
          dbHorarios.forEach((item: any) => {
            // Find corresponding official technician name
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
        console.error('Error cargando datos de horarios:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMasterData();
  }, [propTechnicians]);

  // List of technician full names to display (ONLY from mantenimiento_tecnicos)
  const officialTechList = useMemo(() => {
    if (dbTechnicians.length > 0) return dbTechnicians;
    if (propTechnicians && propTechnicians.length > 0) return propTechnicians;
    return [];
  }, [dbTechnicians, propTechnicians]);

  // Helper to find color for a turno code
  const getTurnoInfo = (codigo: string) => {
    if (!codigo) return null;
    const cleanCode = codigo.trim().toUpperCase();
    const found = turnos.find(t => t.codigo.toUpperCase() === cleanCode);
    if (found) return found;

    // Handle combined codes like T1+2, T6+2
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

  // Turno modal triggers
  const handleOpenNewTurno = () => {
    setEditingTurno(null);
    setTurnoForm({
      codigo: `T${turnos.length + 1}`,
      horario: '08:00 - 16:00',
      color: '#cbd5e1',
    });
    setShowTurnoModal(true);
  };

  const handleOpenEditTurno = (t: TurnoItem) => {
    setEditingTurno(t);
    setTurnoForm({
      codigo: t.codigo,
      horario: cleanHorarioText(t.horario),
      color: t.color || '#bae6fd',
    });
    setShowTurnoModal(true);
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
        // Update DB
        const { error } = await supabase
          .from('mantenimiento_turnos')
          .update(payload)
          .eq('id', editingTurno.id);

        if (error) console.warn('No se pudo actualizar en DB (mantenimiento_turnos):', error.message);

        setTurnos(prev => prev.map(t => (t.id === editingTurno.id ? { ...t, ...payload } : t)));
      } else {
        const existingIdx = turnos.findIndex(t => t.codigo.toUpperCase() === payload.codigo);
        if (existingIdx >= 0) {
          setTurnos(prev => prev.map((t, idx) => (idx === existingIdx ? { ...t, ...payload } : t)));
        } else {
          const { data, error } = await supabase.from('mantenimiento_turnos').insert([payload]).select();
          if (!error && data && data[0]) {
            setTurnos(prev => [...prev, { ...data[0], horario: cleanHorarioText(data[0].horario) }]);
          } else {
            setTurnos(prev => [...prev, payload]);
          }
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

    // Save to DB
    try {
      const techObj = officialTechList.find(t => t.name === tecnico);
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

  // Save all schedules to DB
  const handleSaveAllAssignments = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const recordsToUpsert: HorarioAsignacion[] = [];

      Object.entries(assignments).forEach(([tecnico, diasMap]) => {
        const techObj = officialTechList.find(t => t.name === tecnico);
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

      setStatusMsg({ type: 'success', text: '¡Matriz de horarios y turnos guardada con éxito en Supabase!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Error guardando en Supabase:', err);
      setStatusMsg({
        type: 'info',
        text: 'Datos guardados en memoria de la sesión activa.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Planner Grouping: For each Day -> group by Turno -> list of assigned Technicians
  const plannerScheduleByDay = useMemo(() => {
    const result: Record<string, Record<string, string[]>> = {};

    DIAS_SEMANA.forEach(dia => {
      result[dia.key] = {};
    });

    officialTechList.forEach(tech => {
      const techAssignments = assignments[tech.name] || {};
      DIAS_SEMANA.forEach(dia => {
        const turno = techAssignments[dia.key];
        if (turno) {
          if (!result[dia.key][turno]) {
            result[dia.key][turno] = [];
          }
          result[dia.key][turno].push(tech.name);
        }
      });
    });

    return result;
  }, [officialTechList, assignments]);

  // Hourly slots for Planner View (Covering full plant operational hours)
  const hourlySlots = [
    { label: '05:00', hourNum: 5 },
    { label: '06:00', hourNum: 6 },
    { label: '07:00', hourNum: 7 },
    { label: '08:00', hourNum: 8 },
    { label: '09:00', hourNum: 9 },
    { label: '10:00', hourNum: 10 },
    { label: '11:00', hourNum: 11 },
    { label: '12:00', hourNum: 12 },
    { label: '13:00', hourNum: 13 },
    { label: '14:00', hourNum: 14 },
    { label: '15:00', hourNum: 15 },
    { label: '16:00', hourNum: 16 },
    { label: '17:00', hourNum: 17 },
    { label: '18:00', hourNum: 18 },
    { label: '19:00', hourNum: 19 },
    { label: '20:00', hourNum: 20 },
    { label: '21:00', hourNum: 21 },
    { label: '22:00', hourNum: 22 },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-6">
      
      {/* Header Numeral 2 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e2ded5] pb-4">
        <div>
          <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">
              2
            </span>
            <Clock className="w-5 h-5 text-[#7B8E90]" />
            <span>Matriz de Horarios y Programación de Turnos</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Planificación semanal de cuadrilla conectada a <span className="font-bold text-[#324354]">mantenimiento_tecnicos</span> ({officialTechList.length} técnicos oficiales).
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Switch View Buttons */}
          <div className="flex items-center bg-[#F6F3EE] p-1 rounded-xl border border-gray-300">
            <button
              onClick={() => setViewMode('planner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'planner'
                  ? 'bg-[#324354] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
              title="Vista de Calendario y Cronograma por Horas (Estilo Planner)"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Vista Planificador (Horas)</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-[#324354] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
              title="Vista Matriz de Asignación por Técnico"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Vista Matriz</span>
            </button>
          </div>

          <button
            onClick={handleSaveAllAssignments}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
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

      {/* Week Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F6F3EE] p-3 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7B8E90]" />
          <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
            Semana: {weekDaysInfo[0]?.dateNumber} al {weekDaysInfo[6]?.dateNumber} de {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
        </div>

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
      {/* VISTA 1: PLANNER POR HORAS (Estilo Teams / Outlook / Planner con Horas)  */}
      {/* ========================================================================= */}
      {viewMode === 'planner' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#7B8E90]" />
              Cronograma Semanal de Turnos por Bloque Horario
            </span>
            <span className="text-[11px] text-gray-400 italic">
              Haz clic en cualquier celda de la cuadrilla para ajustar asignaciones
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
                      {dia.label}
                    </div>
                    <div className="text-sm font-black text-[#324354]">{dia.dateNumber}</div>
                  </div>
                );
              })}
            </div>

            {/* Content Column Grid - Single view compact layout */}
            <div className="grid grid-cols-7 divide-x divide-gray-300 min-h-[460px] bg-slate-50/30">
              {weekDaysInfo.map(dia => {
                const dayTurnosMap = plannerScheduleByDay[dia.key] || {};
                const activeTurnoKeys = Object.keys(dayTurnosMap);

                return (
                  <div key={dia.key} className="p-1.5 flex flex-col gap-2 min-h-full">
                    {activeTurnoKeys.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-3 text-center text-gray-300 text-[11px] italic">
                        Sin turnos asignados
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
                            className="rounded-xl p-2 border border-gray-400/40 shadow-2xs flex flex-col gap-1.5 transition-transform hover:scale-[1.01]"
                          >
                            {/* Card Header: Turno Badge + Clean Hours */}
                            <div className="flex items-center justify-between border-b border-black/10 pb-1">
                              <span className="font-black font-mono text-xs text-gray-900 bg-white/70 px-1.5 py-0.5 rounded shadow-2xs">
                                {turnoKey}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-gray-800 tracking-tight">
                                {cleanHorario}
                              </span>
                            </div>

                            {/* Assigned Technicians (Full Names) */}
                            <div className="flex flex-col gap-1 pt-0.5">
                              {assignedTechs.map(techName => (
                                <div
                                  key={techName}
                                  onClick={() => {
                                    setCellEdit({
                                      tecnico: techName,
                                      dia: dia.key,
                                      currentTurno: turnoKey,
                                    });
                                    setCustomTurnoInput(turnoKey);
                                  }}
                                  className="text-[10.5px] font-bold text-gray-900 bg-white/80 hover:bg-white px-1.5 py-1 rounded-md shadow-2xs cursor-pointer truncate flex items-center gap-1 border border-black/5"
                                  title={`Clic para reasignar a ${techName}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#324354] shrink-0"></span>
                                  <span className="truncate">{techName}</span>
                                </div>
                              ))}
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
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: MATRIZ COMPACTA DE CUADRILLA (Técnicos Oficiales de la BD)      */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="overflow-x-auto border border-gray-300 rounded-2xl shadow-xs">
          <table className="w-full text-xs text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#F6F3EE] text-[#324354] font-black uppercase text-center border-b-2 border-gray-300">
                <th className="py-3 px-4 border-r border-gray-300 w-64 text-left">
                  TÉCNICO (OFICIAL)
                </th>
                {weekDaysInfo.map(dia => (
                  <th key={dia.key} className="py-2.5 px-2 border-r border-gray-300">
                    <div className="text-[11px] font-bold text-gray-700">{dia.label}</div>
                    <div className="text-sm font-black text-[#324354]">{dia.dateNumber}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {officialTechList.map((tech) => {
                const techAssignments = assignments[tech.name] || {};

                return (
                  <tr key={tech.id} className="hover:bg-gray-50 transition-colors">
                    {/* Official Full Name + Document/Plant */}
                    <td className="py-2.5 px-4 font-bold text-[#324354] border-r border-gray-300 bg-white">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 leading-snug">{tech.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                          {tech.documento && <span>CC: {tech.documento}</span>}
                          {tech.planta && <span className="bg-gray-100 px-1 rounded text-gray-700 font-semibold">{tech.planta}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {weekDaysInfo.map(dia => {
                      const assignedTurno = techAssignments[dia.key] || '';
                      const tInfo = getTurnoInfo(assignedTurno);
                      const cleanHorario = cleanHorarioText(tInfo?.horario);

                      return (
                        <td
                          key={dia.key}
                          onClick={() => {
                            setCellEdit({
                              tecnico: tech.name,
                              dia: dia.key,
                              currentTurno: assignedTurno,
                            });
                            setCustomTurnoInput(assignedTurno);
                          }}
                          style={{ backgroundColor: assignedTurno ? tInfo?.color : 'transparent' }}
                          className="py-1.5 px-1.5 text-center border-r border-gray-300 cursor-pointer hover:opacity-85 transition-all select-none font-black text-gray-900"
                        >
                          {assignedTurno ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="px-1.5 py-0.5 rounded font-mono text-xs font-black tracking-wide bg-white/70 shadow-2xs">
                                {assignedTurno}
                              </span>
                              {cleanHorario && (
                                <span className="text-[9px] font-mono text-gray-700 font-bold leading-tight mt-0.5">
                                  {cleanHorario}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px] italic hover:text-gray-500">+ Asignar</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATÁLOGO Y EDICIÓN DE TURNOS (Horarios Limpios sin Doble Guion)          */}
      {/* ========================================================================= */}
      <div className="bg-[#F6F3EE] p-5 rounded-2xl border border-gray-300/80 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-300 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#324354]" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#324354]">
              Catálogo de Turnos y Convenciones
            </h4>
          </div>

          <button
            onClick={handleOpenNewTurno}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Turno</span>
          </button>
        </div>

        {/* Turnos Grid with Clean Single-Hyphen Hours */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {turnos.map(t => {
            const cleanHours = cleanHorarioText(t.horario);
            return (
              <div
                key={t.codigo}
                style={{ backgroundColor: t.color || '#fff' }}
                className="p-2.5 rounded-xl border border-gray-400/50 flex flex-col justify-between gap-1.5 shadow-2xs group relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-gray-900 font-mono tracking-wider">{t.codigo}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditTurno(t)}
                      className="p-1 text-gray-700 hover:text-black hover:bg-white/60 rounded"
                      title="Editar Turno"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTurno(t)}
                      className="p-1 text-rose-700 hover:text-rose-900 hover:bg-white/60 rounded"
                      title="Eliminar Turno"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-gray-900 font-mono">
                  {cleanHours}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: MODAL ASIGNAR TURNO A CELDA */}
      {cellEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#324354]">Asignar Turno</h4>
                <p className="text-xs text-gray-600 font-bold truncate max-w-[220px]">
                  {cellEdit.tecnico}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
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

            {/* Custom turno input (e.g. T1+2, T6+2) */}
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

            {/* Clear assignment button */}
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

      {/* MODAL 2: CREAR / EDITAR TURNO */}
      {showTurnoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h4 className="font-bold text-sm text-[#324354]">
                {editingTurno ? `Editar Turno ${editingTurno.codigo}` : 'Crear Nuevo Turno'}
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
