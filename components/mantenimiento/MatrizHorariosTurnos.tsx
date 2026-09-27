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
  Users
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

interface Props {
  technicians?: Array<{ id: number | string; name: string; cargo?: string }>;
}

const DEFAULT_TURNOS: TurnoItem[] = [
  { codigo: 'T1', horario: '5:30--12:50', color: '#ffedd5' },
  { codigo: 'T2', horario: '7:30--14:50', color: '#bae6fd' },
  { codigo: 'T3', horario: '14:50--22:10', color: '#fef08a' },
  { codigo: 'T4', horario: '22:10--05:30', color: '#bbf7d0' },
  { codigo: 'T5', horario: '20:30 -- 5:30', color: '#cbd5e1' },
  { codigo: 'T6', horario: '06:30--13:50', color: '#fdba74' },
  { codigo: 'T7', horario: '12:50--20:40', color: '#f5d0fe' },
];

const DIAS_SEMANA = [
  { key: 'DOMINGO', label: 'DOMINGO' },
  { key: 'LUNES', label: 'LUNES' },
  { key: 'MARTES', label: 'MARTES' },
  { key: 'MIERCOLES', label: 'MIÉRCOLES' },
  { key: 'JUEVES', label: 'JUEVES' },
  { key: 'VIERNES', label: 'VIERNES' },
  { key: 'SABADO', label: 'SÁBADO' },
];

const DEFAULT_INITIAL_ASSIGNMENTS: Record<string, Record<string, string>> = {
  'Jhan Carlos': { LUNES: 'T3', MARTES: 'T3', MIERCOLES: 'T3', JUEVES: 'T3', VIERNES: 'T3', SABADO: 'T2' },
  'Carlos Giraldo': { LUNES: 'T4', MARTES: 'T4', MIERCOLES: 'T4', JUEVES: 'T4', VIERNES: 'T4', SABADO: 'T4' },
  'Anderson Plata': { LUNES: 'T1+2', MARTES: 'T1+2', MIERCOLES: 'T1+2', JUEVES: 'T1+2', VIERNES: 'T1+2' },
  'Alvaro Gonzalez': { LUNES: 'T2', MARTES: 'T2', MIERCOLES: 'T2', JUEVES: 'T2', VIERNES: 'T2', SABADO: 'T1' },
  'Gustavo Gonzales': { LUNES: 'T6+2', MARTES: 'T6+2', MIERCOLES: 'T6+2', JUEVES: 'T6+2', VIERNES: 'T6+2' },
  'Yeison Correa': { LUNES: 'T3', MARTES: 'T3', MIERCOLES: 'T3', JUEVES: 'T3', VIERNES: 'T3', SABADO: 'T7' },
  'Andres Alarcon': { LUNES: 'T1', MARTES: 'T1', MIERCOLES: 'T1', JUEVES: 'T1', VIERNES: 'T1', SABADO: 'T1' },
  'Harrison Mendoza': { LUNES: 'T5', MARTES: 'T4', MIERCOLES: 'T4', JUEVES: 'T4', VIERNES: 'T4', SABADO: 'T4' },
  'Sebastian Arango': { LUNES: 'T6', MARTES: 'T6', MIERCOLES: 'T6', JUEVES: 'T6', VIERNES: 'T6', SABADO: 'T6' },
  'Nicolas Osorio': { LUNES: 'T6', MARTES: 'T6', MIERCOLES: 'T6', JUEVES: 'T6', VIERNES: 'T6', SABADO: 'T6' },
  'Jampier Josa': { LUNES: 'T6+2', MARTES: 'T6+2', MIERCOLES: 'T6+2', JUEVES: 'T6+2', VIERNES: 'T6+2' },
};

export default function MatrizHorariosTurnos({ technicians = [] }: Props) {
  const [turnos, setTurnos] = useState<TurnoItem[]>(DEFAULT_TURNOS);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>(DEFAULT_INITIAL_ASSIGNMENTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  // Merge technicians prop with default list if empty
  const techNames = useMemo(() => {
    const fromProps = technicians.map(t => t.name).filter(Boolean);
    const fromDefaults = Object.keys(DEFAULT_INITIAL_ASSIGNMENTS);
    const merged = Array.from(new Set([...fromProps, ...fromDefaults]));
    return merged.length > 0 ? merged : fromDefaults;
  }, [technicians]);

  // Load turnos & horarios from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch turnos
        const { data: dbTurnos, error: turnosErr } = await supabase
          .from('mantenimiento_turnos')
          .select('*')
          .order('codigo', { ascending: true });

        if (!turnosErr && dbTurnos && dbTurnos.length > 0) {
          setTurnos(dbTurnos);
        } else {
          // If table doesn't exist yet, fallback to DEFAULT_TURNOS
          console.warn('mantenimiento_turnos no existe o está vacía, usando por defecto');
        }

        // 2. Fetch horarios
        const { data: dbHorarios, error: horErr } = await supabase
          .from('mantenimiento_horarios')
          .select('*');

        if (!horErr && dbHorarios && dbHorarios.length > 0) {
          const map: Record<string, Record<string, string>> = {};
          dbHorarios.forEach((item: HorarioAsignacion) => {
            if (!map[item.tecnico_nombre]) map[item.tecnico_nombre] = {};
            map[item.tecnico_nombre][item.dia_semana] = item.turno_codigo;
          });
          setAssignments(prev => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Error cargando horarios/turnos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Helper to find color for a turno code
  const getTurnoColor = (codigo: string) => {
    if (!codigo) return 'transparent';
    const found = turnos.find(t => t.codigo.toUpperCase() === codigo.trim().toUpperCase());
    if (found) return found.color;

    // Handle combined turnos like T1+2, T6+2
    const baseCode = codigo.split('+')[0];
    const baseFound = turnos.find(t => t.codigo.toUpperCase() === baseCode.trim().toUpperCase());
    if (baseFound) return baseFound.color;

    return '#e2e8f0'; // slate default
  };

  // Turno modal triggers
  const handleOpenNewTurno = () => {
    setEditingTurno(null);
    setTurnoForm({
      codigo: `T${turnos.length + 1}`,
      horario: '08:00--16:00',
      color: '#cbd5e1',
    });
    setShowTurnoModal(true);
  };

  const handleOpenEditTurno = (t: TurnoItem) => {
    setEditingTurno(t);
    setTurnoForm({
      codigo: t.codigo,
      horario: t.horario,
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

    const payload = {
      codigo: turnoForm.codigo.trim().toUpperCase(),
      horario: turnoForm.horario.trim(),
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
        // Check if exists locally
        const existingIdx = turnos.findIndex(t => t.codigo.toUpperCase() === payload.codigo);
        if (existingIdx >= 0) {
          // Edit existing code
          setTurnos(prev => prev.map((t, idx) => (idx === existingIdx ? { ...t, ...payload } : t)));
        } else {
          // Insert DB
          const { data, error } = await supabase.from('mantenimiento_turnos').insert([payload]).select();
          if (!error && data && data[0]) {
            setTurnos(prev => [...prev, data[0]]);
          } else {
            setTurnos(prev => [...prev, payload]);
          }
        }
      }

      setShowTurnoModal(false);
      setStatusMsg({ type: 'success', text: `Turno ${payload.codigo} guardado correctamente.` });
      setTimeout(() => setStatusMsg(null), 3000);
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
    const updatedAssignments = {
      ...assignments,
      [tecnico]: {
        ...(assignments[tecnico] || {}),
        [dia]: turnoCodigo,
      },
    };

    setAssignments(updatedAssignments);
    setCellEdit(null);

    // Save to DB
    try {
      const { error } = await supabase.from('mantenimiento_horarios').upsert(
        [
          {
            tecnico_nombre: tecnico,
            dia_semana: dia,
            turno_codigo: turnoCodigo,
          },
        ],
        { onConflict: 'tecnico_nombre,dia_semana' }
      );

      if (error) {
        console.warn('Nota: Si la tabla mantenimiento_horarios aún no existe en Supabase, los datos se conservan localmente:', error.message);
      }
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
        Object.entries(diasMap).forEach(([dia, turno]) => {
          if (turno) {
            recordsToUpsert.push({
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

        if (error) {
          throw error;
        }
      }

      setStatusMsg({ type: 'success', text: '¡Matriz de horarios guardada con éxito en la base de datos!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Error guardando en Supabase:', err);
      setStatusMsg({
        type: 'info',
        text: 'Matriz guardada localmente. Ejecuta el script SQL en Supabase para habilitar la persistencia multiusuario.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Navigate week
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-6">
      
      {/* Header Numeral 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2ded5] pb-4">
        <div>
          <h3 className="text-lg font-bold text-[#324354] flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">
              2
            </span>
            <Clock className="w-5 h-5 text-[#7B8E90]" />
            <span>Matriz de Horarios y Programación de Turnos</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión de turnos de mantenimiento (T1-T7) y asignación semanal de cuadrillas por técnico.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={handlePrevWeek}
            className="p-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
          >
            Esta Semana
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 bg-white text-[#324354] rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold transition-all"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MATRIZ DE HORARIOS POR TÉCNICO (Grid Excel style like Image 1) */}
      <div className="overflow-x-auto border border-gray-300 rounded-2xl shadow-xs">
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-white text-[#324354] font-black uppercase text-center border-b-2 border-gray-300">
              <th className="py-3 px-4 border-r border-gray-300 w-44 text-left">
                TÉCNICO
              </th>
              {weekDaysInfo.map(dia => (
                <th key={dia.key} className="py-2.5 px-3 border-r border-gray-300">
                  <div className="text-[11px] font-bold text-gray-700">{dia.label}</div>
                  <div className="text-sm font-black text-[#324354]">{dia.dateNumber}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-medium">
            {techNames.map((tecnico, techIdx) => {
              const techAssignments = assignments[tecnico] || {};
              const isGroupSeparator = techIdx === 4 || techIdx === 8; // Grouping like in Excel screenshot

              return (
                <React.Fragment key={tecnico}>
                  {isGroupSeparator && (
                    <tr className="bg-gray-100 h-2">
                      <td colSpan={8} className="border-y border-gray-300"></td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50 transition-colors">
                    {/* Technician Name */}
                    <td className="py-2.5 px-4 font-bold text-[#324354] border-r border-gray-300 bg-white shadow-xs">
                      {tecnico}
                    </td>

                    {/* Day Cells */}
                    {weekDaysInfo.map(dia => {
                      const assignedTurno = techAssignments[dia.key] || '';
                      const cellColor = getTurnoColor(assignedTurno);

                      return (
                        <td
                          key={dia.key}
                          onClick={() => {
                            setCellEdit({
                              tecnico,
                              dia: dia.key,
                              currentTurno: assignedTurno,
                            });
                            setCustomTurnoInput(assignedTurno);
                          }}
                          style={{ backgroundColor: assignedTurno ? cellColor : 'transparent' }}
                          className="py-2 px-2 text-center border-r border-gray-300 cursor-pointer hover:opacity-85 transition-all select-none font-black text-gray-900"
                        >
                          {assignedTurno ? (
                            <span className="px-2 py-0.5 rounded-md font-mono text-xs shadow-2xs font-extrabold tracking-wide">
                              {assignedTurno}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px] italic hover:text-gray-500">+ Asignar</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CATÁLOGO Y EDICIÓN DE TURNOS (T1 - T7) */}
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

        {/* Turnos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {turnos.map(t => (
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
                {t.horario}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: MODAL ASIGNAR TURNO A CELDA */}
      {cellEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#324354]">Asignar Turno</h4>
                <p className="text-xs text-gray-500 font-medium">
                  {cellEdit.tecnico} · <span className="font-bold">{cellEdit.dia}</span>
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
                <label className="text-xs font-bold text-gray-700 block mb-1">Horario / Rango de Horas:</label>
                <input
                  type="text"
                  value={turnoForm.horario}
                  onChange={e => setTurnoForm(prev => ({ ...prev, horario: e.target.value }))}
                  placeholder="08:00--16:00"
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
                    Vista Previa: {turnoForm.codigo || 'T?'}
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
