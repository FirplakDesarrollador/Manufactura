'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Search,
  Filter,
  ArrowRightLeft,
  Briefcase,
  Zap,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obtenerCodigoPlanta } from '@/lib/nomenclaturaPlantas';

export type ModalityType = 'PR' | 'NP' | 'PRNP' | 'INACTIVO';

export interface TechnicianObj {
  id: number | string;
  name: string;
  documento?: string;
  planta?: string;
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

  // Technician modal (Create / Edit)
  const [showTechModal, setShowTechModal] = useState<boolean>(false);
  const [editingTech, setEditingTech] = useState<TechnicianObj | null>(null);
  const [techFormData, setTechFormData] = useState<{
    nombre: string;
    documento: string;
    modalidad_operativa: ModalityType;
    planta: string;
    capacidad_horas: string;
  }>({
    nombre: '',
    documento: '',
    modalidad_operativa: 'PR',
    planta: 'Mármol Sintético',
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
            const rawVal = (t.modalidad_operativa || t.turno || 'PR').toUpperCase();
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
        (t.planta && normalizeStr(t.planta).includes(q));

      const matchPlant =
        plantaFilter === 'TODAS' ||
        (t.planta && normalizeStr(t.planta) === normalizeStr(plantaFilter));

      return matchSearch && matchPlant;
    });
  }, [dbTechnicians, techSearch, plantaFilter]);

  // Group technicians into the 4 columns
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
    let activeTechsCount = 0;
    let inactTechsCount = 0;

    dbTechnicians.forEach(t => {
      const hours = t.capacidad_horas || 7.2;
      if (t.modalidad_operativa === 'INACTIVO' || t.activo === false) {
        inactTechsCount++;
      } else {
        activeTechsCount++;
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

    const totalPrHoursAvailable = directPrHours + splitPrFromNppr;
    const totalNpHoursAvailable = directNpHours + splitNpFromNppr;

    return {
      totalTechs: dbTechnicians.length,
      activeTechsCount,
      inactTechsCount,
      directPrHours: Math.round(directPrHours * 10) / 10,
      directNpHours: Math.round(directNpHours * 10) / 10,
      npprTotalHours: Math.round(npprTotalHours * 10) / 10,
      splitPrFromNppr: Math.round(splitPrFromNppr * 10) / 10,
      splitNpFromNppr: Math.round(splitNpFromNppr * 10) / 10,
      totalPrHoursAvailable: Math.round(totalPrHoursAvailable * 10) / 10,
      totalNpHoursAvailable: Math.round(totalNpHoursAvailable * 10) / 10,
    };
  }, [dbTechnicians]);

  // Modal Handlers
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
      turno: techFormData.modalidad_operativa,
      especialidad: techFormData.planta,
      planta: techFormData.planta,
      capacidad_horas: parseFloat(techFormData.capacidad_horas) || 7.2,
      activo: !isInactive,
    };

    setSaving(true);
    try {
      if (editingTech && editingTech.id) {
        let { error } = await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', editingTech.id);
        if (error && error.message.includes('modalidad_operativa')) {
          delete payload.modalidad_operativa;
          await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', editingTech.id);
        }
        setStatusMsg({ type: 'success', text: `Técnico ${payload.nombre} actualizado correctamente.` });
      } else {
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

  // Quick Change Modality directly from card
  const handleQuickChangeModality = async (tech: TechnicianObj, newModality: ModalityType) => {
    const isInactive = newModality === 'INACTIVO';
    
    // Optimistic local update
    setDbTechnicians(prev =>
      prev.map(t =>
        t.id === tech.id
          ? { ...t, modalidad_operativa: newModality, activo: !isInactive }
          : t
      )
    );

    try {
      const payload: any = {
        modalidad_operativa: newModality,
        turno: newModality,
        activo: !isInactive,
      };

      const { error } = await supabase
        .from('mantenimiento_tecnicos')
        .update(payload)
        .eq('id', tech.id);

      if (error && error.message.includes('modalidad_operativa')) {
        delete payload.modalidad_operativa;
        await supabase.from('mantenimiento_tecnicos').update(payload).eq('id', tech.id);
      }

      setStatusMsg({
        type: 'success',
        text: `Técnico ${tech.name} movido a ${newModality === 'PR' ? 'PR (Producción)' : newModality === 'NP' ? 'NP (No Producción)' : newModality === 'PRNP' ? 'NPPR (Mitad y Mitad)' : 'Inactivos'}.`,
      });
      if (onTechsUpdated) onTechsUpdated();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error(err);
      await loadMasterData();
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

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#e2ded5] shadow-xs flex flex-col gap-6 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. CABECERA PRINCIPAL                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e2ded5] pb-4">
        <div>
          <h3 className="text-xl font-black text-[#324354] flex items-center gap-2.5 tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-[#324354] text-white flex items-center justify-center text-xs font-black shadow-xs">
              1
            </span>
            <Users className="w-6 h-6 text-[#7B8E90]" />
            <span>Gestión y Distribución de Cuadrilla de Mantenimiento</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Clasificación operativa por modalidades (PR, NP, NPPR 50/50 e Inactivos) y balanceo de horas de trabajo.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenNewTech}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#324354] text-white text-xs font-bold rounded-xl hover:bg-[#324354]/90 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Técnico</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
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
      {/* 2. RESUMEN DE CAPACIDAD Y MÉTRICAS (KPIs)                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#F6F3EE] p-3.5 rounded-2xl border border-gray-300/80">
        
        {/* Card 1: PR Total */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              PR · Producción
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl font-black text-emerald-950">
              {columnsData.PR.length} <span className="text-xs font-bold text-gray-500">técnicos</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-emerald-700">{capacityStats.totalPrHoursAvailable}h/día</div>
              <div className="text-[9px] text-gray-400 font-medium">Disponibles PR</div>
            </div>
          </div>
        </div>

        {/* Card 2: NP Total */}
        <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">
              NP · No Producción
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl font-black text-sky-950">
              {columnsData.NP.length} <span className="text-xs font-bold text-gray-500">técnicos</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-sky-700">{capacityStats.totalNpHoursAvailable}h/día</div>
              <div className="text-[9px] text-gray-400 font-medium">Disponibles NP</div>
            </div>
          </div>
        </div>

        {/* Card 3: NPPR Total (50% / 50%) */}
        <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              NPPR · Mitad y Mitad
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl font-black text-amber-950">
              {columnsData.PRNP.length} <span className="text-xs font-bold text-gray-500">técnicos</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-amber-700">{capacityStats.npprTotalHours}h total</div>
              <div className="text-[9px] text-amber-600 font-bold">50% PR · 50% NP</div>
            </div>
          </div>
        </div>

        {/* Card 4: Inactivos */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Inactivos / Fuera
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl font-black text-slate-700">
              {columnsData.INACTIVO.length} <span className="text-xs font-bold text-gray-400">técnicos</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-500">Total: {capacityStats.totalTechs}</div>
              <div className="text-[9px] text-gray-400 font-medium">Registrados</div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. FILTROS Y BÚSQUEDA                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={techSearch}
            onChange={e => setTechSearch(e.target.value)}
            placeholder="Buscar técnico por nombre o CC..."
            className="w-full pl-9 pr-8 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-medium text-[#324354] focus:outline-none focus:border-[#324354]"
          />
          {techSearch && (
            <button
              onClick={() => setTechSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Plant */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Planta:
          </span>
          <button
            onClick={() => setPlantaFilter('TODAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              plantaFilter === 'TODAS'
                ? 'bg-[#324354] text-white shadow-2xs'
                : 'bg-[#F6F3EE] text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            Todas ({dbTechnicians.length})
          </button>
          {availablePlants.map(p => {
            const count = dbTechnicians.filter(t => t.planta === p).length;
            const code = obtenerCodigoPlanta(p);
            return (
              <button
                key={p}
                onClick={() => setPlantaFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  plantaFilter === p
                    ? 'bg-[#324354] text-white shadow-2xs'
                    : 'bg-[#F6F3EE] text-gray-600 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                {code} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLERO DE 4 COLUMNAS (PR, NP, NPPR / PRNP, INACTIVOS)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        
        {/* ======================================================================= */}
        {/* COLUMNA 1: PR · PRODUCCIÓN (100% PR)                                   */}
        {/* ======================================================================= */}
        <div className="bg-[#f8fdf9] rounded-2xl border-2 border-emerald-200 p-3.5 flex flex-col gap-3 min-h-[500px] shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                PR · Producción
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              {columnsData.PR.length}
            </span>
          </div>

          <p className="text-[11px] text-emerald-800/80 font-medium">
            Técnicos dedicados 100% a intervención en línea activa de producción.
          </p>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[620px] pr-1">
            {columnsData.PR.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-emerald-200">
                Sin técnicos en PR
              </div>
            ) : (
              columnsData.PR.map(tech => (
                <div
                  key={tech.id}
                  className="bg-white p-3 rounded-xl border border-emerald-200 hover:border-emerald-400 shadow-2xs flex flex-col gap-2 transition-all hover:shadow-sm"
                >
                  {/* Top: Name and Actions */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h5 className="text-xs font-black text-[#324354] leading-tight">{tech.name}</h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                        {tech.documento && <span>CC: {tech.documento}</span>}
                        {tech.planta && (
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                            {obtenerCodigoPlanta(tech.planta)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditTech(tech)}
                        className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100"
                        title="Editar Datos"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTech(tech)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Marcar Inactivo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Time Allocation Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100">
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {tech.capacidad_horas}h/día · 100% PR
                    </span>
                  </div>

                  {/* Quick Move Selector */}
                  <div className="flex items-center justify-between pt-1 gap-1 text-[10px]">
                    <span className="text-gray-400 font-bold flex items-center gap-1">
                      <ArrowRight className="w-2.5 h-2.5" /> Mover:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'NP')}
                        className="px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 font-bold rounded"
                        title="Mover a NP (No Producción)"
                      >
                        NP
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'PRNP')}
                        className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded"
                        title="Mover a NPPR (Mitad y Mitad)"
                      >
                        NPPR
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'INACTIVO')}
                        className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 font-bold rounded"
                        title="Mover a Inactivo"
                      >
                        Inactivo
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 2: NP · NO PRODUCCIÓN (100% NP / PARO)                          */}
        {/* ======================================================================= */}
        <div className="bg-[#f0f9ff] rounded-2xl border-2 border-sky-200 p-3.5 flex flex-col gap-3 min-h-[500px] shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-500"></div>
              <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider">
                NP · No Producción
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">
              {columnsData.NP.length}
            </span>
          </div>

          <p className="text-[11px] text-sky-800/80 font-medium">
            Técnicos dedicados 100% a intervenciones durante paros de planta o sin producción.
          </p>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[620px] pr-1">
            {columnsData.NP.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-sky-200">
                Sin técnicos en NP
              </div>
            ) : (
              columnsData.NP.map(tech => (
                <div
                  key={tech.id}
                  className="bg-white p-3 rounded-xl border border-sky-200 hover:border-sky-400 shadow-2xs flex flex-col gap-2 transition-all hover:shadow-sm"
                >
                  {/* Top: Name and Actions */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h5 className="text-xs font-black text-[#324354] leading-tight">{tech.name}</h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                        {tech.documento && <span>CC: {tech.documento}</span>}
                        {tech.planta && (
                          <span className="bg-sky-50 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200 font-mono">
                            {obtenerCodigoPlanta(tech.planta)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditTech(tech)}
                        className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100"
                        title="Editar Datos"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTech(tech)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Marcar Inactivo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Time Allocation Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100">
                    <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {tech.capacidad_horas}h/día · 100% NP (Paro)
                    </span>
                  </div>

                  {/* Quick Move Selector */}
                  <div className="flex items-center justify-between pt-1 gap-1 text-[10px]">
                    <span className="text-gray-400 font-bold flex items-center gap-1">
                      <ArrowRight className="w-2.5 h-2.5" /> Mover:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'PR')}
                        className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold rounded"
                        title="Mover a PR (Producción)"
                      >
                        PR
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'PRNP')}
                        className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded"
                        title="Mover a NPPR (Mitad y Mitad)"
                      >
                        NPPR
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'INACTIVO')}
                        className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 font-bold rounded"
                        title="Mover a Inactivo"
                      >
                        Inactivo
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 3: NPPR / PRNP · MITAD Y MITAD (50% PR / 50% NP)               */}
        {/* ======================================================================= */}
        <div className="bg-[#fffdf5] rounded-2xl border-2 border-amber-200 p-3.5 flex flex-col gap-3 min-h-[500px] shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                NPPR · Mitad y Mitad
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
              {columnsData.PRNP.length}
            </span>
          </div>

          <p className="text-[11px] text-amber-800/80 font-medium">
            Asigna <strong className="font-bold text-amber-900">50% del tiempo a Producción</strong> y <strong className="font-bold text-amber-900">50% a No Producción</strong>.
          </p>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[620px] pr-1">
            {columnsData.PRNP.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-amber-200">
                Sin técnicos en NPPR
              </div>
            ) : (
              columnsData.PRNP.map(tech => {
                const totalHours = tech.capacidad_horas || 7.2;
                const halfPr = Math.round((totalHours * 0.5) * 10) / 10;
                const halfNp = Math.round((totalHours * 0.5) * 10) / 10;

                return (
                  <div
                    key={tech.id}
                    className="bg-white p-3 rounded-xl border border-amber-200 hover:border-amber-400 shadow-2xs flex flex-col gap-2 transition-all hover:shadow-sm"
                  >
                    {/* Top: Name and Actions */}
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h5 className="text-xs font-black text-[#324354] leading-tight">{tech.name}</h5>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                          {tech.documento && <span>CC: {tech.documento}</span>}
                          {tech.planta && (
                            <span className="bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                              {obtenerCodigoPlanta(tech.planta)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditTech(tech)}
                          className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100"
                          title="Editar Datos"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTech(tech)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Marcar Inactivo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Time Split Visual Badge */}
                    <div className="flex flex-col gap-1 pt-1.5 border-t border-gray-100">
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-600">
                        <span>Total: {totalHours}h/día</span>
                        <span className="text-amber-800 font-black">División 50% / 50%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-center">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-0.5 rounded">
                          PR: {halfPr}h
                        </span>
                        <span className="bg-sky-50 text-sky-800 border border-sky-200 py-0.5 rounded">
                          NP: {halfNp}h
                        </span>
                      </div>
                    </div>

                    {/* Quick Move Selector */}
                    <div className="flex items-center justify-between pt-1 gap-1 text-[10px]">
                      <span className="text-gray-400 font-bold flex items-center gap-1">
                        <ArrowRight className="w-2.5 h-2.5" /> Mover:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickChangeModality(tech, 'PR')}
                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold rounded"
                          title="Mover a PR (Producción)"
                        >
                          PR
                        </button>
                        <button
                          onClick={() => handleQuickChangeModality(tech, 'NP')}
                          className="px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 font-bold rounded"
                          title="Mover a NP (No Producción)"
                        >
                          NP
                        </button>
                        <button
                          onClick={() => handleQuickChangeModality(tech, 'INACTIVO')}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 font-bold rounded"
                          title="Mover a Inactivo"
                        >
                          Inactivo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 4: INACTIVOS                                                    */}
        {/* ======================================================================= */}
        <div className="bg-[#f8fafc] rounded-2xl border-2 border-slate-200 p-3.5 flex flex-col gap-3 min-h-[500px] shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Inactivos
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200 text-slate-700 border border-slate-300">
              {columnsData.INACTIVO.length}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 font-medium">
            Personal temporalmente fuera de cuadrilla, incapacidades o retirados.
          </p>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[620px] pr-1">
            {columnsData.INACTIVO.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
                Sin técnicos inactivos
              </div>
            ) : (
              columnsData.INACTIVO.map(tech => (
                <div
                  key={tech.id}
                  className="bg-white/80 p-3 rounded-xl border border-slate-300 opacity-80 hover:opacity-100 shadow-2xs flex flex-col gap-2 transition-all"
                >
                  {/* Top: Name and Actions */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h5 className="text-xs font-black text-slate-700 leading-tight">{tech.name}</h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium mt-0.5">
                        {tech.documento && <span>CC: {tech.documento}</span>}
                        {tech.planta && (
                          <span className="bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                            {obtenerCodigoPlanta(tech.planta)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditTech(tech)}
                        className="p-1 text-gray-400 hover:text-[#324354] rounded hover:bg-gray-100"
                        title="Editar Datos"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100">
                    <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Inactivo (0h asignadas)
                    </span>
                  </div>

                  {/* Reactivate Quick Selectors */}
                  <div className="flex items-center justify-between pt-1 gap-1 text-[10px]">
                    <span className="text-gray-400 font-bold flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-emerald-600" /> Activar a:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'PR')}
                        className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold rounded"
                        title="Reactivar en PR (Producción)"
                      >
                        PR
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'NP')}
                        className="px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 font-bold rounded"
                        title="Reactivar en NP (No Producción)"
                      >
                        NP
                      </button>
                      <button
                        onClick={() => handleQuickChangeModality(tech, 'PRNP')}
                        className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded"
                        title="Reactivar en NPPR (Mitad y Mitad)"
                      >
                        NPPR
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: NUEVO / EDITAR TÉCNICO                                             */}
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
                <label className="text-xs font-bold text-gray-700 block mb-1">Modalidad Operativa:</label>
                <select
                  value={techFormData.modalidad_operativa}
                  onChange={e => setTechFormData(prev => ({ ...prev, modalidad_operativa: e.target.value as ModalityType }))}
                  className="w-full px-3.5 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                >
                  <option value="PR">🟢 PR · Producción (100% Línea Activa)</option>
                  <option value="NP">🔵 NP · No Producción (100% Paro de Planta)</option>
                  <option value="PRNP">🟡 NPPR · Mitad Producción y Mitad Paro (50% / 50%)</option>
                  <option value="INACTIVO">⚪ Inactivo (Fuera de cuadrilla)</option>
                </select>
                {techFormData.modalidad_operativa === 'PRNP' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1 font-medium">
                    ⚡ Se asignará automáticamente la mitad del tiempo ({parseFloat(techFormData.capacidad_horas || '7.2') / 2}h) a Producción (PR) y la otra mitad a No Producción (NP).
                  </p>
                )}
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

    </div>
  );
}
