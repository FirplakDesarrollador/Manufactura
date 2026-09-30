'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  MapPin,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obtenerCodigoPlanta } from '@/lib/nomenclaturaPlantas';

export type ModalityType = 'PR' | 'NP' | 'PRNP' | 'INACTIVO';

export interface TechnicianObj {
  id: number | string;
  name: string;
  documento?: string;
  planta?: string;
  especialidad?: string;
  modalidad_operativa?: ModalityType;
  capacidad_horas?: number;
  activo?: boolean;
}

interface Props {
  technicians?: any[];
  onTechsUpdated?: () => void;
}

const normalizeStr = (text: string = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function MatrizHorariosTurnos({ technicians: propTechnicians, onTechsUpdated }: Props) {
  const [dbTechnicians, setDbTechnicians] = useState<TechnicianObj[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Search & Filter state
  const [techSearch, setTechSearch] = useState<string>('');
  const [plantaFilter, setPlantaFilter] = useState<string>('TODAS');

  // Technician detail/edit modal
  const [showTechModal, setShowTechModal] = useState<boolean>(false);
  const [editingTech, setEditingTech] = useState<TechnicianObj | null>(null);
  const [techFormData, setTechFormData] = useState<{
    nombre: string;
    documento: string;
    modalidad_operativa: ModalityType;
    planta: string;
    especialidad: string;
    capacidad_horas: string;
  }>({
    nombre: '',
    documento: '',
    modalidad_operativa: 'PR',
    planta: 'Mármol Sintético',
    especialidad: 'Mantenimiento General',
    capacidad_horas: '7.2',
  });

  // Load Technicians from Supabase
  const loadMasterData = async () => {
    setLoading(true);
    try {
      let officialTechs: TechnicianObj[] = [];
      const { data: techsData, error: techErr } = await supabase
        .from('mantenimiento_tecnicos')
        .select('*')
        .order('id', { ascending: true });

      if (!techErr && techsData && techsData.length > 0) {
        officialTechs = techsData
          .filter((t: any) => t.id !== 9999)
          .map((t: any) => {
            let rawMod: ModalityType = 'PR';
            const rawVal = (t.modalidad_operativa || 'PR').toUpperCase();
            if (rawVal === 'NP') rawMod = 'NP';
            else if (rawVal === 'PRNP' || rawVal === 'NPPR' || rawVal === 'MIXTO') rawMod = 'PRNP';
            else if (rawVal === 'INACTIVO' || t.activo === false) rawMod = 'INACTIVO';
            else rawMod = 'PR';

            const isInactive = t.activo === false || rawMod === 'INACTIVO';

            return {
              id: t.id,
              name: t.nombre_completo || t.nombre || `Técnico #${t.id}`,
              documento: t.documento,
              planta: t.planta || t.especialidad || 'Mármol Sintético',
              especialidad: t.especialidad || t.planta || 'Mantenimiento General',
              modalidad_operativa: isInactive ? 'INACTIVO' : rawMod,
              capacidad_horas: parseFloat(t.capacidad_horas) || 7.2,
              activo: !isInactive,
            };
          });
      } else if (propTechnicians && propTechnicians.length > 0) {
        officialTechs = propTechnicians
          .filter(t => t.id !== 9999)
          .map(t => {
            let rawMod: ModalityType = 'PR';
            const rawVal = (t.modalidad_operativa || t.turno || 'PR').toUpperCase();
            if (rawVal === 'NP') rawMod = 'NP';
            else if (rawVal === 'PRNP' || rawVal === 'NPPR' || rawVal === 'MIXTO') rawMod = 'PRNP';
            else if (rawVal === 'INACTIVO' || t.activo === false) rawMod = 'INACTIVO';
            else rawMod = 'PR';

            return {
              id: t.id,
              name: t.name || t.nombre,
              documento: t.documento,
              planta: t.planta || 'Mármol Sintético',
              especialidad: t.especialidad || t.planta || 'Mantenimiento General',
              modalidad_operativa: t.activo === false ? 'INACTIVO' : rawMod,
              capacidad_horas: t.capacity || 7.2,
              activo: t.activo !== false,
            };
          });
      }

      setDbTechnicians(officialTechs);
    } catch (err) {
      console.error('Error cargando técnicos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [propTechnicians]);

  // Unique plants for filtering
  const availablePlants = useMemo(() => {
    const set = new Set<string>();
    dbTechnicians.forEach(t => {
      if (t.planta) set.add(t.planta.trim());
      else if (t.especialidad) set.add(t.especialidad.trim());
    });
    return Array.from(set).sort();
  }, [dbTechnicians]);

  // Filter technicians
  const filteredTechs = useMemo(() => {
    const q = normalizeStr(techSearch);
    return dbTechnicians.filter(t => {
      const matchSearch =
        !q ||
        normalizeStr(t.name).includes(q) ||
        (t.documento && normalizeStr(t.documento).includes(q)) ||
        (t.planta && normalizeStr(t.planta).includes(q)) ||
        (t.especialidad && normalizeStr(t.especialidad).includes(q));

      const matchPlant =
        plantaFilter === 'TODAS' ||
        (t.planta && normalizeStr(t.planta) === normalizeStr(plantaFilter)) ||
        (t.especialidad && normalizeStr(t.especialidad) === normalizeStr(plantaFilter));

      return matchSearch && matchPlant;
    });
  }, [dbTechnicians, techSearch, plantaFilter]);

  // Group technicians into the 4 parallel columns
  const columnsData = useMemo(() => {
    const prList: TechnicianObj[] = [];
    const npList: TechnicianObj[] = [];
    const npprList: TechnicianObj[] = [];
    const inactivoList: TechnicianObj[] = [];

    filteredTechs.forEach(t => {
      if (t.modalidad_operativa === 'INACTIVO' || t.activo === false) {
        inactivoList.push(t);
      } else if (t.modalidad_operativa === 'NP') {
        npList.push(t);
      } else if (t.modalidad_operativa === 'PRNP') {
        npprList.push(t);
      } else {
        prList.push(t);
      }
    });

    return {
      PR: prList,
      NP: npList,
      PRNP: npprList,
      INACTIVO: inactivoList,
    };
  }, [filteredTechs]);

  // Calculate Capacity Totals
  // NPPR divides 50% to PR and 50% to NP
  const capacityStats = useMemo(() => {
    let directPrHours = 0;
    let directNpHours = 0;
    let npprTotalHours = 0;

    dbTechnicians.forEach(t => {
      const hours = t.capacidad_horas || 7.2;
      if (t.modalidad_operativa !== 'INACTIVO' && t.activo !== false) {
        if (t.modalidad_operativa === 'PR') {
          directPrHours += hours;
        } else if (t.modalidad_operativa === 'NP') {
          directNpHours += hours;
        } else if (t.modalidad_operativa === 'PRNP') {
          npprTotalHours += hours;
        }
      }
    });

    const splitPrFromNppr = npprTotalHours * 0.5;
    const splitNpFromNppr = npprTotalHours * 0.5;

    return {
      totalTechs: dbTechnicians.length,
      totalPrHours: Math.round((directPrHours + splitPrFromNppr) * 10) / 10,
      totalNpHours: Math.round((directNpHours + splitNpFromNppr) * 10) / 10,
      npprTotalHours: Math.round(npprTotalHours * 10) / 10,
    };
  }, [dbTechnicians]);

  // Open Create Modal
  const handleOpenNewTech = () => {
    setEditingTech(null);
    setTechFormData({
      nombre: '',
      documento: '',
      modalidad_operativa: 'PR',
      planta: 'Mármol Sintético',
      especialidad: 'Mantenimiento General',
      capacidad_horas: '7.2',
    });
    setShowTechModal(true);
  };

  // Open Detail / Edit Modal
  const handleOpenEditTech = (tech: TechnicianObj) => {
    setEditingTech(tech);
    setTechFormData({
      nombre: tech.name,
      documento: tech.documento || '',
      modalidad_operativa: tech.modalidad_operativa || 'PR',
      planta: tech.planta || 'Mármol Sintético',
      especialidad: tech.especialidad || 'Mantenimiento General',
      capacidad_horas: tech.capacidad_horas?.toString() || '7.2',
    });
    setShowTechModal(true);
  };

  // Direct 1-Click Fast Modality Changer via Select
  const handleFastChangeModality = async (tech: TechnicianObj, targetModality: ModalityType) => {
    if (tech.modalidad_operativa === targetModality && (targetModality !== 'INACTIVO' ? tech.activo !== false : tech.activo === false)) {
      return;
    }

    const isInactive = targetModality === 'INACTIVO';

    // Optimistic local state update
    setDbTechnicians(prev =>
      prev.map(t =>
        t.id === tech.id
          ? { ...t, modalidad_operativa: targetModality, activo: !isInactive }
          : t
      )
    );

    try {
      const payload = {
        modalidad_operativa: targetModality,
        activo: !isInactive,
      };

      const { error } = await supabase
        .from('mantenimiento_tecnicos')
        .update(payload)
        .eq('id', tech.id);

      if (error) {
        console.error('Error actualizando modalidad en Supabase:', error);
        throw error;
      }

      const modLabel =
        targetModality === 'PR'
          ? 'PR (Producción)'
          : targetModality === 'NP'
          ? 'NP (No Producción)'
          : targetModality === 'PRNP'
          ? 'NPPR (Mitad y Mitad)'
          : 'Inactivo';

      setStatusMsg({
        type: 'success',
        text: `✓ ${tech.name} asignado a ${modLabel}.`,
      });
      if (onTechsUpdated) onTechsUpdated();
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
      // Reload on error
      await loadMasterData();
    }
  };

  // Save changes from Modal
  const handleSaveTechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techFormData.nombre.trim()) {
      alert('Ingresa el nombre del técnico.');
      return;
    }

    const isInactive = techFormData.modalidad_operativa === 'INACTIVO';
    const payload = {
      nombre: techFormData.nombre.trim(),
      documento: techFormData.documento.trim() || null,
      modalidad_operativa: techFormData.modalidad_operativa,
      especialidad: techFormData.especialidad || techFormData.planta,
      capacidad_horas: parseFloat(techFormData.capacidad_horas) || 7.2,
      activo: !isInactive,
    };

    setSaving(true);
    try {
      if (editingTech && editingTech.id) {
        let { error } = await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', editingTech.id);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Técnico ${payload.nombre} actualizado.` });
      } else {
        let { error } = await supabase.from('mantenimiento_tecnicos').insert([payload]);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Técnico ${payload.nombre} creado.` });
      }

      setShowTechModal(false);
      await loadMasterData();
      if (onTechsUpdated) onTechsUpdated();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Render individual compact Technician Card
  const renderTechCard = (tech: TechnicianObj, currentColumn: ModalityType) => {
    const isInactive = tech.modalidad_operativa === 'INACTIVO' || tech.activo === false;
    const currentMod: ModalityType = isInactive ? 'INACTIVO' : tech.modalidad_operativa || 'PR';
    const plantaDisplay = tech.planta || tech.especialidad || 'General';

    return (
      <div
        key={tech.id}
        className={`p-2.5 rounded-xl border transition-all shadow-2xs flex flex-col gap-1.5 ${
          isInactive
            ? 'bg-slate-50 border-slate-200 text-slate-600 opacity-85 hover:opacity-100'
            : currentMod === 'PR'
            ? 'bg-white border-emerald-200 hover:border-emerald-400'
            : currentMod === 'NP'
            ? 'bg-white border-sky-200 hover:border-sky-400'
            : 'bg-white border-amber-200 hover:border-amber-400'
        }`}
      >
        {/* Top: Name (2 lines, compact) + Planta Badge + Edit Pencil */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex flex-col flex-1 min-w-0">
            {/* 2-line wrapped smaller name */}
            <span
              className="text-[11px] font-black text-[#324354] line-clamp-2 leading-snug cursor-pointer hover:text-emerald-700 transition-colors"
              onClick={() => handleOpenEditTech(tech)}
              title={`${tech.name} (Clic para ver detalles completos)`}
            >
              {tech.name}
            </span>

            {/* Planta / Especialidad Tag */}
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium mt-0.5">
              <span className="inline-flex items-center gap-0.5 text-gray-600 font-bold bg-gray-100/90 px-1.5 py-0.2 rounded text-[9.5px] border border-gray-200 truncate max-w-[180px]">
                <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                <span className="truncate">{plantaDisplay}</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenEditTech(tech)}
            className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
            title="Ver detalles / Editar (Cédula, Horas, Planta)"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {/* ONLY THE ACTIVE MODALITY BADGE & FAST CHANGE DROPDOWN */}
        <div className="relative mt-0.5">
          <select
            value={currentMod}
            onChange={e => handleFastChangeModality(tech, e.target.value as ModalityType)}
            className={`w-full text-[10px] font-black py-1 pl-2 pr-6 rounded-lg border cursor-pointer transition-all appearance-none ${
              currentMod === 'PR'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : currentMod === 'NP'
                ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                : currentMod === 'PRNP'
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Clic para cambiar modalidad rápidamente"
          >
            <option value="PR">🟢 PR · Producción (100%)</option>
            <option value="NP">🔵 NP · No Producción (100%)</option>
            <option value="PRNP">🟡 NPPR · Mitad y Mitad (50/50)</option>
            <option value="INACTIVO">⚪ Inactivo</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500">
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>

        {/* Sub-label for NPPR 50/50 breakdown */}
        {currentMod === 'PRNP' && (
          <div className="text-[9px] font-bold text-amber-800 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200 text-center">
            50% PR ({((tech.capacidad_horas || 7.2) * 0.5).toFixed(1)}h) · 50% NP ({((tech.capacidad_horas || 7.2) * 0.5).toFixed(1)}h)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4 font-sans w-full">
      
      {/* ========================================================================= */}
      {/* 1. CABECERA PRINCIPAL + KPI RESUMEN                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#e2ded5] pb-3">
        <div>
          <h3 className="text-lg font-black text-[#324354] flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black">
              1
            </span>
            <Users className="w-5 h-5 text-[#7B8E90]" />
            <span>Gestión y Distribución de Cuadrilla de Mantenimiento</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            4 Columnas en paralelo. Cambia la modalidad de cualquier técnico directamente desde su recuadro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-[#F6F3EE] px-3 py-1.5 rounded-xl border border-gray-300">
            <span className="text-emerald-800">PR: {capacityStats.totalPrHours}h</span>
            <span className="text-gray-300">|</span>
            <span className="text-sky-800">NP: {capacityStats.totalNpHours}h</span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-800">NPPR (50/50): {capacityStats.npprTotalHours}h</span>
          </div>

          <button
            onClick={handleOpenNewTech}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Técnico</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : statusMsg.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-300'
              : 'bg-sky-50 text-sky-900 border border-sky-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BARRA COMPACTA DE BÚSQUEDA Y FILTRO DE PLANTA                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={techSearch}
            onChange={e => setTechSearch(e.target.value)}
            placeholder="Buscar técnico..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-medium text-[#324354] focus:outline-none focus:border-[#324354]"
          />
          {techSearch && (
            <button
              onClick={() => setTechSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-0.5">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Planta:
          </span>
          <button
            onClick={() => setPlantaFilter('TODAS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              plantaFilter === 'TODAS'
                ? 'bg-[#324354] text-white shadow-2xs'
                : 'bg-[#F6F3EE] text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            Todas ({dbTechnicians.length})
          </button>
          {availablePlants.map(p => {
            const count = dbTechnicians.filter(t => t.planta === p || t.especialidad === p).length;
            const code = obtenerCodigoPlanta(p) !== 'OTROS' ? obtenerCodigoPlanta(p) : p;
            return (
              <button
                key={p}
                onClick={() => setPlantaFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  plantaFilter === p
                    ? 'bg-[#324354] text-white shadow-2xs'
                    : 'bg-[#F6F3EE] text-gray-600 hover:bg-gray-200 border border-gray-300'
                }`}
                title={p}
              >
                {code} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 4 COLUMNAS EN PARALELO (PR, NP, NPPR, INACTIVOS)                        */}
      {/* ========================================================================= */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="grid grid-cols-4 gap-3 min-w-[860px]">
          
          {/* ===================================================================== */}
          {/* COLUMNA 1: PR · PRODUCCIÓN                                           */}
          {/* ===================================================================== */}
          <div className="bg-[#f8fdf9] rounded-2xl border-2 border-emerald-200 p-2.5 flex flex-col gap-2 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                  PR · Producción
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                {columnsData.PR.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-0.5">
              {columnsData.PR.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-emerald-200">
                  Sin técnicos en PR
                </div>
              ) : (
                columnsData.PR.map(tech => renderTechCard(tech, 'PR'))
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 2: NP · NO PRODUCCIÓN (PARO)                                  */}
          {/* ===================================================================== */}
          <div className="bg-[#f0f9ff] rounded-2xl border-2 border-sky-200 p-2.5 flex flex-col gap-2 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sky-200 pb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="text-xs font-black text-sky-950 uppercase tracking-tight">
                  NP · No Producción
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                {columnsData.NP.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-0.5">
              {columnsData.NP.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-sky-200">
                  Sin técnicos en NP
                </div>
              ) : (
                columnsData.NP.map(tech => renderTechCard(tech, 'NP'))
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 3: NPPR · MITAD Y MITAD (50% PR / 50% NP)                     */}
          {/* ===================================================================== */}
          <div className="bg-[#fffdf5] rounded-2xl border-2 border-amber-200 p-2.5 flex flex-col gap-2 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-200 pb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-black text-amber-950 uppercase tracking-tight">
                  NPPR · Mitad y Mitad
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                {columnsData.PRNP.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-0.5">
              {columnsData.PRNP.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-amber-200">
                  Sin técnicos en NPPR
                </div>
              ) : (
                columnsData.PRNP.map(tech => renderTechCard(tech, 'PRNP'))
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* COLUMNA 4: INACTIVOS                                                  */}
          {/* ===================================================================== */}
          <div className="bg-[#f8fafc] rounded-2xl border-2 border-slate-200 p-2.5 flex flex-col gap-2 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Inactivos
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                {columnsData.INACTIVO.length}
              </span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-0.5">
              {columnsData.INACTIVO.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-slate-200">
                  Sin técnicos inactivos
                </div>
              ) : (
                columnsData.INACTIVO.map(tech => renderTechCard(tech, 'INACTIVO'))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DETALLE / EDICIÓN (Cédula, Planta, Horas, etc.)                     */}
      {/* ========================================================================= */}
      {showTechModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#324354]">
                  {editingTech ? `Detalle / Editar Técnico: ${editingTech.name}` : 'Nuevo Técnico de Mantenimiento'}
                </h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Información complementaria y parámetros operativos
                </p>
              </div>
              <button
                onClick={() => setShowTechModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
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
                <label className="text-xs font-bold text-gray-700 block mb-1">Modalidad Operativa:</label>
                <select
                  value={techFormData.modalidad_operativa}
                  onChange={e => setTechFormData(prev => ({ ...prev, modalidad_operativa: e.target.value as ModalityType }))}
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                >
                  <option value="PR">🟢 PR · Producción (100% Línea Activa)</option>
                  <option value="NP">🔵 NP · No Producción (100% Paro de Planta)</option>
                  <option value="PRNP">🟡 NPPR · Mitad Producción y Mitad Paro (50% PR / 50% NP)</option>
                  <option value="INACTIVO">⚪ Inactivo (Fuera de cuadrilla)</option>
                </select>
                {techFormData.modalidad_operativa === 'PRNP' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1 font-medium">
                    ⚡ Se asignará automáticamente la mitad del tiempo ({((parseFloat(techFormData.capacidad_horas || '7.2')) / 2).toFixed(1)}h) a Producción (PR) y la otra mitad a No Producción (NP).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Planta / Especialidad:</label>
                  <input
                    type="text"
                    value={techFormData.planta}
                    onChange={e => setTechFormData(prev => ({ ...prev, planta: e.target.value, especialidad: e.target.value }))}
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#324354] text-white font-bold text-xs rounded-xl hover:bg-[#324354]/90 flex items-center gap-1.5 cursor-pointer"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTech ? 'Actualizar Técnico' : 'Guardar Técnico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
