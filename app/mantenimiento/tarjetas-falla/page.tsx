'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  Camera, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Download, 
  X, 
  User, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  Trash2, 
  Loader2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import Header from '@/components/opt-sistemica/Header';
import * as XLSX from 'xlsx';

type TpmColor = 'roja' | 'azul' | 'amarilla' | 'verde';

interface Empleado {
  id: number;
  nombreCompleto: string;
  cargo?: string;
  planta?: string;
}

interface TarjetaTpm {
  id: number | string;
  codigo: string;
  tipo_tarjeta: TpmColor; // 'roja' | 'azul' | 'amarilla' | 'verde'
  tipo_aviso?: string;
  maquina: string;
  codigo_maquina?: string;
  planta: string;
  detectada_por: string; // Empleado que reporta
  descripcion_que: string; // Síntoma / Falla
  prioridad: 'Alta' | 'Media' | 'Baja';
  accion_inmediata?: string;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
  fecha_apertura: string;
  fecha_cierre?: string;
  fotos?: string[];
  id_orden_correctivo?: number;
  created_at?: string;
}

export default function TarjetasAnomaliasPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [tarjetas, setTarjetas] = useState<TarjetaTpm[]>([]);
  const [empleadosList, setEmpleadosList] = useState<Empleado[]>([]);
  const [maquinasCatalogo, setMaquinasCatalogo] = useState<any[]>([]);
  const [plantasNomenclatura, setPlantasNomenclatura] = useState<any[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('todas');
  const [filterPlanta, setFilterPlanta] = useState<string>('todas');

  // Modal State for New TPM Card
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ [id: string | number]: boolean }>({});

  // New TPM Form State
  const [formData, setFormData] = useState<{
    tipo_tarjeta: TpmColor;
    maquina: string;
    planta: string;
    detectada_por: string;
    descripcion_que: string;
    prioridad: 'Alta' | 'Media' | 'Baja';
    accion_inmediata: string;
    fotos: string[];
  }>({
    tipo_tarjeta: 'roja',
    maquina: '',
    planta: 'Mármol Sintético',
    detectada_por: '',
    descripcion_que: '',
    prioridad: 'Alta',
    accion_inmediata: '',
    fotos: []
  });

  // Check auth & fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || '');

        await Promise.all([
          fetchTarjetas(),
          fetchEmpleados(),
          fetchMaquinas(),
          fetchPlantas()
        ]);
      } catch (err) {
        console.error('Error inicializando módulo:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // Fetch Plantas
  const fetchPlantas = async () => {
    try {
      const { data } = await supabase
        .from('nomenclatura_plantas')
        .select('*')
        .order('nombre_oficial', { ascending: true });
      if (data && data.length > 0) {
        setPlantasNomenclatura(data);
      }
    } catch (e) {
      console.warn('Error cargando plantas:', e);
    }
  };

  // Fetch Empleados from Talento Humano
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
      console.warn('Error cargando empleados de Talento Humano:', err);
    }
  };

  // Fetch Machines Catalog
  const fetchMaquinas = async () => {
    try {
      const { data } = await supabase
        .from('maquinas_equipos')
        .select('*')
        .order('nombre_equipo', { ascending: true });
      if (data && data.length > 0) {
        setMaquinasCatalogo(data);
      }
    } catch (e) {
      console.warn('Error cargando máquinas:', e);
    }
  };

  // Fetch Tarjetas TPM from Supabase
  const fetchTarjetas = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('tarjetas_falla_anomalia')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: TarjetaTpm[] = data.map((d: any, index: number) => {
          let fotosArr: string[] = [];
          if (Array.isArray(d.fotos)) {
            fotosArr = d.fotos;
          } else if (typeof d.fotos === 'string' && d.fotos.trim().startsWith('[')) {
            try { fotosArr = JSON.parse(d.fotos); } catch {}
          } else if (typeof d.fotos === 'string' && d.fotos.trim().length > 0) {
            fotosArr = [d.fotos];
          } else if (d.foto_url) {
            fotosArr = [d.foto_url];
          } else if (d.foto) {
            fotosArr = [d.foto];
          }

          // Determine TPM Color
          let color: TpmColor = 'roja';
          const tAviso = (d.tipo_tarjeta || d.tipo_aviso || d.color_tarjeta || '').toLowerCase();
          if (tAviso.includes('azul') || tAviso.includes('autonomo') || tAviso.includes('operador')) {
            color = 'azul';
          } else if (tAviso.includes('amarill') || tAviso.includes('seguridad') || tAviso.includes('5s') || tAviso.includes('riesgo')) {
            color = 'amarilla';
          } else if (tAviso.includes('verde') || tAviso.includes('mejora') || tAviso.includes('kaizen')) {
            color = 'verde';
          } else {
            color = 'roja';
          }

          const rawEstado = (d.estado || '').toLowerCase();
          const estado: 'abierta' | 'en_proceso' | 'cerrada' = 
            rawEstado === 'cerrada' || rawEstado === 'resuelta' || rawEstado === 'completado' ? 'cerrada' :
            rawEstado === 'en_proceso' || rawEstado === 'en proceso' ? 'en_proceso' : 'abierta';

          return {
            id: d.id || index + 1,
            codigo: d.codigo || d.codigo_tarjeta || `TPM-${d.id || index + 1}`,
            tipo_tarjeta: color,
            tipo_aviso: d.tipo_aviso || (color === 'roja' ? 'Mantenimiento' : color === 'azul' ? 'Autónomo' : color === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen'),
            maquina: d.maquina || d.equipo || 'Equipo General',
            planta: d.planta || d.planta_proceso || 'Mármol Sintético',
            detectada_por: d.detectada_por || d.responsable || d.reportado_por || 'Operador',
            descripcion_que: d.descripcion_que || d.descripcion_anomalia || d.sintoma || d.falla || 'Anomalía detectada',
            prioridad: (d.prioridad as any) || 'Alta',
            accion_inmediata: d.accion_inmediata || d.accion_correctiva || d.observacion || d.observaciones || '',
            estado,
            fecha_apertura: d.fecha_apertura || (d.created_at ? d.created_at.slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ')),
            fecha_cierre: d.fecha_cierre || null,
            fotos: fotosArr,
            created_at: d.created_at
          };
        });
        setTarjetas(mapped);
      } else {
        // Mock fallback if table is empty
        setTarjetas([
          {
            id: 1,
            codigo: 'TPM-0101',
            tipo_tarjeta: 'roja',
            tipo_aviso: 'Mantenimiento',
            maquina: 'Prensa Hidráulica 02',
            planta: 'Mármol Sintético',
            detectada_por: 'Carlos Alberto Giraldo Mazo',
            descripcion_que: 'Fuga de aceite hidráulico en manguera de retorno del pistón principal',
            prioridad: 'Alta',
            accion_inmediata: 'Contención con paño absorbente y ajuste preliminar',
            estado: 'en_proceso',
            fecha_apertura: '2026-09-08 08:30',
            fotos: []
          },
          {
            id: 2,
            codigo: 'TPM-0102',
            tipo_tarjeta: 'azul',
            tipo_aviso: 'Autónomo',
            maquina: 'Cabina de Pintura C-0154',
            planta: 'Mármol Sintético',
            detectada_por: 'Anderson David Plata Peña',
            descripcion_que: 'Filtro de aire saturado y guías con polvo acumulado',
            prioridad: 'Media',
            accion_inmediata: 'Limpieza básica de ducto y purga de condensado',
            estado: 'cerrada',
            fecha_apertura: '2026-09-07 14:15',
            fotos: []
          },
          {
            id: 3,
            codigo: 'TPM-0103',
            tipo_tarjeta: 'amarilla',
            tipo_aviso: 'Seguridad/5S',
            maquina: 'Sierra Escuadradora 01',
            planta: 'Muebles',
            detectada_por: 'Gustavo Adolfo Gonzalez Londoño',
            descripcion_que: 'Guarda de seguridad del disco suelta y falta de demarcación en piso',
            prioridad: 'Alta',
            accion_inmediata: 'Aseguramiento temporal con perno y aviso de advertencia',
            estado: 'abierta',
            fecha_apertura: '2026-09-08 11:20',
            fotos: []
          },
          {
            id: 4,
            codigo: 'TPM-0104',
            tipo_tarjeta: 'verde',
            tipo_aviso: 'Mejora Kaizen',
            maquina: 'Rotoflex MS-01',
            planta: 'Mármol Sintético',
            detectada_por: 'Jhan Carlos Martinez Peñata',
            descripcion_que: 'Sugerencia de guía de alineación rápida para cambio de moldes',
            prioridad: 'Baja',
            accion_inmediata: 'Boceto de soporte para validación técnica',
            estado: 'abierta',
            fecha_apertura: '2026-09-09 10:00',
            fotos: []
          }
        ]);
      }
    } catch (err) {
      console.warn('Error fetching tarjetas TPM:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Helper to handle local and Supabase photo upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const remainingSlots = 2 - (formData.fotos?.length || 0);
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setFormData(prev => ({
              ...prev,
              fotos: [...(prev.fotos || []), reader.result as string].slice(0, 2)
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('Error cargando fotos:', err);
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Handle Form Submit: Creates TPM Card + Synchronizes with Correctives (Unassigned)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion_que.trim() || !formData.maquina.trim()) {
      alert('Por favor completa la máquina y la descripción de la anomalía.');
      return;
    }

    setSubmitting(true);
    const newCode = `TPM-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    try {
      // 1. Insert into tarjetas_falla_anomalia
      let insertedTpmId: number | string = Date.now();
      const { data: tpmData, error: tpmError } = await supabase
        .from('tarjetas_falla_anomalia')
        .insert([{
          codigo_tarjeta: newCode,
          tipo_tarjeta: formData.tipo_tarjeta,
          tipo_aviso: formData.tipo_tarjeta === 'roja' ? 'Mantenimiento' : formData.tipo_tarjeta === 'azul' ? 'Autónomo' : formData.tipo_tarjeta === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
          maquina: formData.maquina,
          planta: formData.planta,
          planta_proceso: formData.planta,
          detectada_por: formData.detectada_por || 'Operador',
          responsable: formData.detectada_por || 'Operador',
          descripcion_que: formData.descripcion_que.trim(),
          prioridad: formData.prioridad,
          accion_inmediata: formData.accion_inmediata.trim() || undefined,
          accion_correctiva: formData.accion_inmediata.trim() || undefined,
          estado: 'abierta',
          fecha_apertura: nowStr,
          fotos: formData.fotos
        }])
        .select()
        .single();

      if (tpmData) {
        insertedTpmId = tpmData.id;
      }

      // 2. Unify with Mantenimiento Correctivo in mantenimiento_ordenes (Unassigned as requested)
      try {
        const colorTitleMap: { [k in TpmColor]: string } = {
          roja: '🔴 Tarjeta Roja (Mantenimiento)',
          azul: '🔵 Tarjeta Azul (Autónomo)',
          amarilla: '🟡 Tarjeta Amarilla (Seguridad/5S)',
          verde: '🟢 Tarjeta Verde (Mejora Kaizen)'
        };

        await supabase.from('mantenimiento_ordenes').insert([{
          origen: 'TARJETA_TPM',
          tipo_orden: 'CORRECTIVO',
          id_tarjeta_falla: typeof insertedTpmId === 'number' ? insertedTpmId : null,
          codigo: newCode,
          titulo: `[${colorTitleMap[formData.tipo_tarjeta]}] ${formData.descripcion_que.trim()}`,
          maquina: formData.maquina,
          planta: formData.planta,
          id_tecnico: null, // Queda Sin Asignar
          tecnico_nombre: 'Sin asignar',
          turno: 'General',
          prioridad: formData.prioridad,
          estado: 'Abierta',
          fecha_programada: new Date().toISOString().slice(0, 10),
          duracion_estimada_min: 60,
          sintoma_falla: formData.descripcion_que.trim(),
          accion_realizada: formData.accion_inmediata.trim() || undefined,
          comentarios_ejecucion: `Reportado por empleado: ${formData.detectada_por || 'Operario de Planta'}`,
          fotos_antes: formData.fotos,
          reportado_por: formData.detectada_por || userEmail
        }]);
      } catch (ordErr) {
        console.warn('Aviso: Sincronizando con mantenimiento_ordenes:', ordErr);
      }

      // 3. Update Local State
      const newRecord: TarjetaTpm = {
        id: insertedTpmId,
        codigo: newCode,
        tipo_tarjeta: formData.tipo_tarjeta,
        tipo_aviso: formData.tipo_tarjeta === 'roja' ? 'Mantenimiento' : formData.tipo_tarjeta === 'azul' ? 'Autónomo' : formData.tipo_tarjeta === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
        maquina: formData.maquina,
        planta: formData.planta,
        detectada_por: formData.detectada_por || 'Operador',
        descripcion_que: formData.descripcion_que.trim(),
        prioridad: formData.prioridad,
        accion_inmediata: formData.accion_inmediata.trim(),
        estado: 'abierta',
        fecha_apertura: nowStr,
        fotos: formData.fotos
      };

      setTarjetas(prev => [newRecord, ...prev]);
      setShowCreateModal(false);
      setFormData({
        tipo_tarjeta: 'roja',
        maquina: '',
        planta: 'Mármol Sintético',
        detectada_por: '',
        descripcion_que: '',
        prioridad: 'Alta',
        accion_inmediata: '',
        fotos: []
      });

      alert(`¡Tarjeta de Anomalía ${newCode} creada con éxito y agregada a Mantenimiento Correctivo (Sin asignar)!`);
    } catch (err: any) {
      console.error('Error al guardar tarjeta TPM:', err);
      alert('Error al guardar la tarjeta: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (id: number | string, newStatus: 'abierta' | 'en_proceso' | 'cerrada') => {
    const updated = tarjetas.map(t => (t.id === id ? { ...t, estado: newStatus } : t));
    setTarjetas(updated);

    setSaveFeedback(prev => ({ ...prev, [id]: true }));
    try {
      await supabase
        .from('tarjetas_falla_anomalia')
        .update({ estado: newStatus })
        .eq('id', id);

      // Sync with mantenimiento_ordenes if linked
      await supabase
        .from('mantenimiento_ordenes')
        .update({ estado: newStatus === 'cerrada' ? 'Completado' : newStatus === 'en_proceso' ? 'En Proceso' : 'Pendiente' })
        .eq('id_tarjeta_falla', id);
    } catch (err) {
      console.warn('Error actualizando estado en Supabase:', err);
    } finally {
      setTimeout(() => setSaveFeedback(prev => ({ ...prev, [id]: false })), 2000);
    }
  };

  // Filtered Tarjetas
  const filteredTarjetas = useMemo(() => {
    return tarjetas.filter(item => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.codigo.toLowerCase().includes(q) ||
          item.maquina.toLowerCase().includes(q) ||
          item.planta.toLowerCase().includes(q) ||
          item.detectada_por.toLowerCase().includes(q) ||
          item.descripcion_que.toLowerCase().includes(q) ||
          (item.accion_inmediata && item.accion_inmediata.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (filterColor !== 'todos' && item.tipo_tarjeta !== filterColor) {
        return false;
      }

      if (filterEstado !== 'todos' && item.estado !== filterEstado) {
        return false;
      }

      if (filterPrioridad !== 'todas' && item.prioridad !== filterPrioridad) {
        return false;
      }

      if (filterPlanta !== 'todas' && item.planta !== filterPlanta) {
        return false;
      }

      return true;
    });
  }, [tarjetas, searchTerm, filterColor, filterEstado, filterPrioridad, filterPlanta]);

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = tarjetas.length;
    const rojas = tarjetas.filter(t => t.tipo_tarjeta === 'roja').length;
    const azules = tarjetas.filter(t => t.tipo_tarjeta === 'azul').length;
    const amarillas = tarjetas.filter(t => t.tipo_tarjeta === 'amarilla').length;
    const verdes = tarjetas.filter(t => t.tipo_tarjeta === 'verde').length;
    const cerradas = tarjetas.filter(t => t.estado === 'cerrada').length;
    const abiertas = tarjetas.filter(t => t.estado === 'abierta').length;

    return { total, rojas, azules, amarillas, verdes, cerradas, abiertas };
  }, [tarjetas]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredTarjetas.length === 0) {
      alert('No hay tarjetas para exportar.');
      return;
    }

    try {
      const dataToExport = filteredTarjetas.map((t, idx) => ({
        '#': idx + 1,
        'Código': t.codigo,
        'Tipo / Color TPM': t.tipo_tarjeta === 'roja' ? 'Roja (Mantenimiento)' : t.tipo_tarjeta === 'azul' ? 'Azul (Autónomo)' : t.tipo_tarjeta === 'amarilla' ? 'Amarilla (Seguridad/5S)' : 'Verde (Mejora Kaizen)',
        'Máquinas y Equipos': t.maquina,
        'Planta': t.planta,
        'Reportado Por (Empleado)': t.detectada_por,
        'Anomalía / Falla Detectada': t.descripcion_que,
        'Prioridad': t.prioridad,
        'Acción Inmediata': t.accion_inmediata || 'Sin registrar',
        'Estado': t.estado === 'cerrada' ? 'Cerrada / Resuelta' : t.estado === 'en_proceso' ? 'En Proceso' : 'Abierta',
        'Fecha Reporte': t.fecha_apertura
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tarjetas Anomalías TPM');
      XLSX.writeFile(wb, `Tarjetas_Anomalias_TPM_FIRPLAK_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      alert('Error generando archivo Excel.');
    }
  };

  const renderColorBadge = (color: TpmColor) => {
    switch (color) {
      case 'roja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            🔴 Roja · Mantenimiento
          </span>
        );
      case 'azul':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            🔵 Azul · Autónomo
          </span>
        );
      case 'amarilla':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 Amarilla · Seguridad/5S
          </span>
        );
      case 'verde':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 Verde · Kaizen/Mejora
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
          <span className="text-xs font-bold text-[#324354]">Cargando módulo de Tarjetas de Anomalías...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#324354]">
      {/* Top Header */}
      <Header
        title="Tarjetas de Anomalías"
        subtitle="Reporte y Gestión de Anomalías en Planta"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col gap-3.5 pt-24">
        
        {/* Top Header Action Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white px-4 py-2.5 rounded-2xl border border-[#e2ded5] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#324354] text-white flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#324354] leading-tight">Registro de Tarjetas de Anomalías</h2>
              <p className="text-[11px] text-gray-500">Reporte y seguimiento operativo de condiciones anormales</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95 ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Tarjeta de Anomalía</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e2ded5] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-[#324354] text-xs sm:text-sm flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#7B8E90]" />
              <span>Filtros de Tarjetas TPM ({filteredTarjetas.length} registradas)</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchTarjetas}
                disabled={syncing}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#F6F3EE] text-[#324354] hover:bg-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterColor('todos');
                  setFilterEstado('todos');
                  setFilterPrioridad('todas');
                  setFilterPlanta('todas');
                }}
                className="text-xs text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer ml-1"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Global Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, máquina, síntoma o empleado..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
              />
            </div>

            {/* TPM Color Filter */}
            <div>
              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
              >
                <option value="todos">Color TPM: Todos</option>
                <option value="roja">🔴 Tarjeta Roja (Mtto)</option>
                <option value="azul">🔵 Tarjeta Azul (Autónomo)</option>
                <option value="amarilla">🟡 Tarjeta Amarilla (5S)</option>
                <option value="verde">🟢 Tarjeta Verde (Kaizen)</option>
              </select>
            </div>

            {/* Estado Filter */}
            <div>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
              >
                <option value="todos">Estado: Todos</option>
                <option value="abierta">🔴 Abierta</option>
                <option value="en_proceso">🟡 En Proceso</option>
                <option value="cerrada">🟢 Cerrada / Resuelta</option>
              </select>
            </div>

            {/* Prioridad Filter */}
            <div>
              <select
                value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
              >
                <option value="todas">Prioridad: Todas</option>
                <option value="Alta">🚨 Alta (Crítica)</option>
                <option value="Media">⚠️ Media</option>
                <option value="Baja">ℹ️ Baja</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tarjetas Table - Full Width No Scroll */}
        <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse table-auto">
              <thead className="bg-[#324354] text-white sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-2.5 px-2 font-bold text-center w-[54px]">Evidencia</th>
                  <th className="py-2.5 px-2 font-bold text-center w-[75px]">Código</th>
                  <th className="py-2.5 px-2 font-bold w-[120px]">Tipo / Color TPM</th>
                  <th className="py-2.5 px-2.5 font-bold w-[140px]">Máquinas y Equipos</th>
                  <th className="py-2.5 px-2 font-bold w-[90px]">Planta</th>
                  <th className="py-2.5 px-3 font-bold min-w-[180px]">Anomalía / Falla Detectada</th>
                  <th className="py-2.5 px-2.5 font-bold w-[130px]">Reportado Por</th>
                  <th className="py-2.5 px-2 font-bold text-center w-[75px]">Prioridad</th>
                  <th className="py-2.5 px-2 font-bold text-center w-[105px]">Estado</th>
                  <th className="py-2.5 px-3 font-bold w-[160px]">Acción / Solución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTarjetas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      No se encontraron tarjetas de anomalías con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredTarjetas.map((item) => {
                    const isCerrada = item.estado === 'cerrada';
                    const isEnProceso = item.estado === 'en_proceso';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        {/* Evidencia Foto */}
                        <td className="py-2 px-1 text-center">
                          {item.fotos && item.fotos.length > 0 ? (
                            <div className="relative inline-block group">
                              <img
                                src={item.fotos[0]}
                                alt={item.codigo}
                                onClick={() => setPreviewImage(item.fotos![0])}
                                className="w-9 h-9 object-cover rounded-lg border border-[#324354] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                                title="Clic para ampliar foto"
                              />
                              {item.fotos.length > 1 && (
                                <span 
                                  onClick={() => setPreviewImage(item.fotos![1])}
                                  className="absolute -bottom-1 -right-1 bg-[#324354] text-white text-[8px] font-bold px-1 py-0.2 rounded-full cursor-pointer shadow-xs border border-white"
                                  title="Ver segunda foto"
                                >
                                  +1
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-8 h-8 mx-auto rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </td>

                        {/* Código */}
                        <td className="py-2 px-1.5 text-center font-bold text-[#324354]">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-mono text-[10px]">
                            {item.codigo}
                          </span>
                        </td>

                        {/* Color TPM Badge */}
                        <td className="py-2 px-1.5">
                          {renderColorBadge(item.tipo_tarjeta)}
                        </td>

                        {/* Máquina */}
                        <td className="py-2 px-2 font-bold text-[#324354] text-[11px] truncate max-w-[140px]" title={item.maquina}>
                          {item.maquina}
                        </td>

                        {/* Planta */}
                        <td className="py-2 px-1.5 font-medium text-gray-600 text-[10.5px] truncate max-w-[90px]" title={item.planta}>
                          {item.planta}
                        </td>

                        {/* Descripción / Falla */}
                        <td className="py-2 px-2.5 text-[#324354] font-medium text-[11px]">
                          <div className="line-clamp-2" title={item.descripcion_que}>
                            {item.descripcion_que}
                          </div>
                          <div className="text-[9.5px] text-gray-400 mt-0.5">
                            📅 {item.fecha_apertura}
                          </div>
                        </td>

                        {/* Reportado Por */}
                        <td className="py-2 px-2 font-semibold text-[#324354] text-[10.5px]">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#7B8E90] shrink-0" />
                            <span className="truncate max-w-[110px]" title={item.detectada_por}>{item.detectada_por}</span>
                          </div>
                        </td>

                        {/* Prioridad */}
                        <td className="py-2 px-1 text-center font-bold">
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] inline-block ${
                            item.prioridad === 'Alta' ? 'bg-rose-100 text-rose-800' :
                            item.prioridad === 'Media' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.prioridad}
                          </span>
                        </td>

                        {/* Estado con Selector Interactivo */}
                        <td className="py-2 px-1 text-center">
                          <div className="relative inline-block">
                            <select
                              value={item.estado}
                              onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                              className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border cursor-pointer focus:outline-none transition-all ${
                                isCerrada ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                isEnProceso ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              <option value="abierta">🔴 Abierta</option>
                              <option value="en_proceso">🟡 En Proceso</option>
                              <option value="cerrada">🟢 Cerrada</option>
                            </select>
                            {saveFeedback[item.id] && (
                              <span className="absolute -top-3 right-0 text-[8.5px] font-black text-emerald-600 animate-in fade-in">
                                ¡Guardado!
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acción / Solución */}
                        <td className="py-2 px-2 text-gray-700 text-[10.5px]">
                          {item.accion_inmediata ? (
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-gray-200 text-[10px] max-h-16 overflow-y-auto" title={item.accion_inmediata}>
                              {item.accion_inmediata}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[10px]">Sin registrar</span>
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

      </main>

      {/* ========================================================================= */}
      {/* MODAL: REPORTAR TARJETA DE ANOMALÍA (TPM) — EXACTO A LA IMAGEN 2 */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pt-24 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e2ded5] max-h-[88vh] overflow-y-auto my-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-xl font-bold text-[#324354] leading-tight">
                Reportar Tarjeta de Anomalía (TPM)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              
              {/* Selector de Color / Tipo de Tarjeta TPM */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">
                  Tipo de Tarjeta / Clasificación TPM <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Roja */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'roja' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      formData.tipo_tarjeta === 'roja' 
                        ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400 font-bold' 
                        : 'bg-[#F6F3EE] border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold text-rose-700">
                      🔴 Tarjeta Roja
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Mantenimiento Técnico</span>
                  </button>

                  {/* Azul */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'azul' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      formData.tipo_tarjeta === 'azul' 
                        ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-400 font-bold' 
                        : 'bg-[#F6F3EE] border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold text-blue-700">
                      🔵 Tarjeta Azul
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Mantenimiento Autónomo</span>
                  </button>

                  {/* Amarilla */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'amarilla' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      formData.tipo_tarjeta === 'amarilla' 
                        ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400 font-bold' 
                        : 'bg-[#F6F3EE] border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold text-amber-700">
                      🟡 Tarjeta Amarilla
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Seguridad, 5S y Fugas</span>
                  </button>

                  {/* Verde */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'verde' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      formData.tipo_tarjeta === 'verde' 
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400 font-bold' 
                        : 'bg-[#F6F3EE] border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1 font-bold text-emerald-700">
                      🟢 Tarjeta Verde
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Mejora Kaizen / Ideas</span>
                  </button>
                </div>
              </div>

              {/* Máquinas y Planta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                    Máquinas y Equipos <span className="text-rose-600">*</span>
                  </label>
                  <input
                    list="maquinas-options-tpm"
                    type="text"
                    value={formData.maquina}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = maquinasCatalogo.find(m => 
                        `${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`.toLowerCase() === val.toLowerCase() ||
                        m.nombre_equipo?.toLowerCase() === val.toLowerCase()
                      );
                      if (matched) {
                        setFormData(prev => ({
                          ...prev,
                          maquina: matched.nombre_equipo,
                          planta: matched.planta || prev.planta
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, maquina: val }));
                      }
                    }}
                    placeholder="Buscar o seleccionar equipo..."
                    required
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  />
                  <datalist id="maquinas-options-tpm">
                    {maquinasCatalogo.map(m => (
                      <option 
                        key={m.id} 
                        value={`${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`}
                      >
                        {m.planta ? `Planta: ${m.planta}` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Planta</label>
                  <select
                    value={formData.planta}
                    onChange={(e) => setFormData(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    {plantasNomenclatura.length > 0 ? (
                      plantasNomenclatura.map(p => (
                        <option key={p.codigo} value={p.nombre_oficial}>
                          {p.codigo} - {p.nombre_oficial}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Mármol Sintético">MS - Mármol Sintético</option>
                        <option value="Muebles">MB - Muebles</option>
                        <option value="Bañeras">BA - Bañeras</option>
                        <option value="Ensamble">EN - Ensamble</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Persona que Reporta (Empleado de Talento Humano) */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                  Persona que Reporta (Empleado) <span className="text-rose-600">*</span>
                </label>
                <input
                  list="empleados-options-tpm"
                  type="text"
                  value={formData.detectada_por}
                  onChange={(e) => setFormData(prev => ({ ...prev, detectada_por: e.target.value }))}
                  placeholder="Escribe o selecciona el nombre del operario / empleado..."
                  required
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                />
                <datalist id="empleados-options-tpm">
                  {empleadosList.map(emp => (
                    <option key={emp.id} value={emp.nombreCompleto}>
                      {emp.cargo ? `Cargo: ${emp.cargo}` : ''} {emp.planta ? `· Planta: ${emp.planta}` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Descripción de la Avería / Síntoma */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                  Descripción de la Avería / Síntoma <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={formData.descripcion_que}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_que: e.target.value }))}
                  placeholder="Describe la anomalía detectada, ruido, fuga o falla de funcionamiento..."
                  required
                  rows={2}
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                />
              </div>

              {/* Nivel de Prioridad y Asignación Automática */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Nivel de Prioridad</label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354]"
                  >
                    <option value="Alta">🚨 Alta (Crítica)</option>
                    <option value="Media">⚠️ Media</option>
                    <option value="Baja">ℹ️ Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Destino en Gestor</label>
                  <div className="w-full px-3 py-2 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-between">
                    <span>Mantenimiento Correctivo</span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]">Sin Asignar</span>
                  </div>
                </div>
              </div>

              {/* Acción Inmediata / Preliminar */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Acción Correctiva Preliminar</label>
                <textarea
                  value={formData.accion_inmediata}
                  onChange={(e) => setFormData(prev => ({ ...prev, accion_inmediata: e.target.value }))}
                  placeholder="Acciones tomadas para mitigar o reparar la falla..."
                  rows={2}
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                />
              </div>

              {/* Adjuntar Fotos de Evidencia (Máximo 2) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Fotos de Evidencia (Máximo 2)
                  </label>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {formData.fotos?.length || 0}/2 adjuntadas
                  </span>
                </div>
                
                <div className="p-3 bg-[#F6F3EE] rounded-2xl border border-dashed border-gray-300 flex items-center gap-3 flex-wrap">
                  {formData.fotos && formData.fotos.map((foto, index) => (
                    <div key={index} className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-[#324354] shadow-xs shrink-0">
                      <img src={foto} alt={`Evidencia ${index + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-[#324354]/90 text-[9px] text-white text-center font-bold py-0.5">
                        {index === 0 ? 'Foto 1' : 'Foto 2'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            fotos: prev.fotos.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                        title="Eliminar foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(formData.fotos?.length || 0) < 2 && (
                    <label className={`flex flex-col items-center justify-center w-20 h-20 bg-white hover:bg-slate-100 border-2 border-dashed border-[#7B8E90] rounded-xl cursor-pointer transition-all shrink-0 ${uploadingPhotos ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingPhotos ? (
                        <Loader2 className="w-5 h-5 text-[#324354] animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-[#324354] mb-1" />
                          <span className="text-[10px] font-bold text-[#324354]">Adjuntar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple={(formData.fotos?.length || 0) === 0}
                        onChange={handlePhotoSelect}
                        className="hidden"
                        disabled={uploadingPhotos}
                      />
                    </label>
                  )}

                  <div className="text-[11px] text-gray-500 leading-tight flex-1 min-w-[140px]">
                    <span className="font-semibold text-[#324354] block">📷 Adjunta fotos de la avería</span>
                    La primera foto se mostrará por defecto en el listado y portal técnico.
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhotos}
                  className="flex-1 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-[#324354]/90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando Tarjeta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Crear Tarjeta de Anomalía</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3 border border-[#e2ded5]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#7B8E90]" />
                <span>Evidencia Fotográfica de la Tarjeta TPM</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                title="Cerrar vista"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto rounded-2xl flex items-center justify-center bg-[#F6F3EE] p-2">
              <img
                src={previewImage}
                alt="Evidencia Ampliada"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
