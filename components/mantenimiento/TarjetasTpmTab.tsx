'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  Camera, 
  CheckCircle2, 
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
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import * as XLSX from 'xlsx';

export type TpmColor = 'roja' | 'azul' | 'amarilla' | 'verde';

export interface Empleado {
  id: number;
  nombreCompleto: string;
  cargo?: string;
  planta?: string;
}

export interface TarjetaTpm {
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

interface TarjetasTpmTabProps {
  userEmail?: string;
  onCardCreated?: () => void;
  onNavigateToCorrectivo?: () => void;
}

export default function TarjetasTpmTab({
  userEmail = '',
  onCardCreated,
  onNavigateToCorrectivo
}: TarjetasTpmTabProps) {
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

  // Employee dropdown search
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

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

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          fetchTarjetas(),
          fetchEmpleados(),
          fetchMaquinas(),
          fetchPlantas()
        ]);
      } catch (err) {
        console.error('Error inicializando módulo TPM:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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

  // Fetch Tarjetas TPM from Supabase (both mantenimiento_ordenes and tarjetas_falla_anomalia)
  const fetchTarjetas = async () => {
    setSyncing(true);
    try {
      const { data: tpmData } = await supabase
        .from('tarjetas_falla_anomalia')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: ordData } = await supabase
        .from('mantenimiento_ordenes')
        .select('*')
        .or('tipo_orden.eq.CORRECTIVO,origen.eq.TARJETA_TPM,id_tarjeta_falla.not.is.null')
        .order('created_at', { ascending: false });

      const tpmMap = new Map<string, TarjetaTpm>();

      if (ordData && ordData.length > 0) {
        ordData.forEach((d: any, index: number) => {
          const isTpm = d.origen === 'TARJETA_TPM' || (d.codigo && d.codigo.startsWith('TPM-')) || d.id_tarjeta_falla != null || (d.titulo && d.titulo.includes('Tarjeta'));
          if (!isTpm) return;

          let fotosArr: string[] = [];
          if (Array.isArray(d.fotos_antes)) fotosArr = d.fotos_antes;
          else if (Array.isArray(d.fotos)) fotosArr = d.fotos;
          else if (typeof d.fotos === 'string' && d.fotos.trim().startsWith('[')) {
            try { fotosArr = JSON.parse(d.fotos); } catch {}
          } else if (typeof d.fotos === 'string' && d.fotos.trim().length > 0) {
            fotosArr = [d.fotos];
          }

          let color: TpmColor = 'roja';
          const tLower = ((d.titulo || '') + ' ' + (d.codigo || '')).toLowerCase();
          if (tLower.includes('azul') || tLower.includes('autónomo') || tLower.includes('autonomo')) {
            color = 'azul';
          } else if (tLower.includes('amarill') || tLower.includes('seguridad') || tLower.includes('5s')) {
            color = 'amarilla';
          } else if (tLower.includes('verde') || tLower.includes('kaizen') || tLower.includes('mejora')) {
            color = 'verde';
          }

          const rawEstado = (d.estado || '').toLowerCase();
          const estado: 'abierta' | 'en_proceso' | 'cerrada' = 
            rawEstado === 'cerrada' || rawEstado === 'resuelta' || rawEstado === 'completado' ? 'cerrada' :
            rawEstado === 'en_proceso' || rawEstado === 'en proceso' ? 'en_proceso' : 'abierta';

          const cod = d.codigo || `TPM-${d.id || index + 1}`;

          let cleanSintoma = d.sintoma_falla || d.titulo || 'Anomalía detectada';
          if (cleanSintoma.startsWith('[')) {
            const closingIdx = cleanSintoma.indexOf(']');
            if (closingIdx !== -1 && closingIdx < cleanSintoma.length - 1) {
              cleanSintoma = cleanSintoma.slice(closingIdx + 1).trim();
            }
          }

          tpmMap.set(cod, {
            id: d.id || index + 1,
            codigo: cod,
            tipo_tarjeta: color,
            tipo_aviso: color === 'roja' ? 'Mantenimiento' : color === 'azul' ? 'Autónomo' : color === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
            maquina: d.maquina || 'Equipo General',
            planta: d.planta || 'Mármol Sintético',
            detectada_por: d.reportado_por || d.tecnico_nombre || 'Operador',
            descripcion_que: cleanSintoma,
            prioridad: (d.prioridad as any) || 'Alta',
            accion_inmediata: d.accion_realizada || d.comentarios_ejecucion || '',
            estado,
            fecha_apertura: d.created_at ? d.created_at.slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' '),
            fecha_cierre: d.fecha_cierre || null,
            fotos: fotosArr,
            created_at: d.created_at
          });
        });
      }

      if (tpmData && tpmData.length > 0) {
        tpmData.forEach((d: any, index: number) => {
          const cod = d.codigo || d.codigo_tarjeta || `TPM-${d.id || index + 1}`;
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

          let color: TpmColor = 'roja';
          const tAviso = (d.tipo_tarjeta || d.tipo_aviso || d.color_tarjeta || '').toLowerCase();
          if (tAviso.includes('azul') || tAviso.includes('autonomo') || tAviso.includes('operador')) {
            color = 'azul';
          } else if (tAviso.includes('amarill') || tAviso.includes('seguridad') || tAviso.includes('5s') || tAviso.includes('riesgo')) {
            color = 'amarilla';
          } else if (tAviso.includes('verde') || tAviso.includes('mejora') || tAviso.includes('kaizen')) {
            color = 'verde';
          }

          const rawEstado = (d.estado || '').toLowerCase();
          const estado: 'abierta' | 'en_proceso' | 'cerrada' = 
            rawEstado === 'cerrada' || rawEstado === 'resuelta' || rawEstado === 'completado' ? 'cerrada' :
            rawEstado === 'en_proceso' || rawEstado === 'en proceso' ? 'en_proceso' : 'abierta';

          tpmMap.set(cod, {
            id: d.id || index + 1,
            codigo: cod,
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
          });
        });
      }

      // Default fallback mock records if empty
      const defaultMocks: TarjetaTpm[] = [
        {
          id: 'mock_1',
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
          id: 'mock_2',
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
          id: 'mock_3',
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
          id: 'mock_4',
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
          fecha_apertura: '2026-09-08 16:45',
          fotos: []
        }
      ];

      const dbList = Array.from(tpmMap.values());
      const combined = [...dbList];
      defaultMocks.forEach(m => {
        if (!tpmMap.has(m.codigo)) {
          combined.push(m);
        }
      });

      setTarjetas(combined);
    } catch (err) {
      console.warn('Error cargando tarjetas TPM:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Photo Select / Upload (Max 2)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = formData.fotos.length;
    const remaining = 2 - currentCount;
    if (remaining <= 0) {
      alert('Máximo 2 fotos por reporte de anomalía.');
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remaining);
    setUploadingPhotos(true);

    try {
      const newUrls: string[] = [];
      for (const file of selectedFiles) {
        let uploaded = false;
        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `tpm_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('tarjetas-falla')
            .upload(fileName, file);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('tarjetas-falla')
              .getPublicUrl(fileName);
            if (urlData?.publicUrl) {
              newUrls.push(urlData.publicUrl);
              uploaded = true;
            }
          }
        } catch (storageErr) {
          console.warn('Supabase storage fallback to data url:', storageErr);
        }

        if (!uploaded) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newUrls.push(base64);
        }
      }

      setFormData(prev => ({
        ...prev,
        fotos: [...prev.fotos, ...newUrls].slice(0, 2)
      }));
    } catch (err) {
      console.error('Error procesando fotos:', err);
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  // Submit New TPM Card
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maquina.trim()) {
      alert('Por favor selecciona o escribe la máquina o equipo.');
      return;
    }
    if (!formData.descripcion_que.trim()) {
      alert('Por favor describe la avería o síntoma.');
      return;
    }

    setSubmitting(true);
    const newCode = `TPM-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    try {
      // 1. Insert into tarjetas_falla_anomalia
      let insertedTpmId: number | string = Date.now();
      try {
        const { data: tpmData } = await supabase
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
      } catch (e) {
        console.warn('Aviso guardando en tarjetas_falla_anomalia:', e);
      }

      // 2. Unify with Mantenimiento Correctivo in mantenimiento_ordenes (Unassigned)
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

      if (onCardCreated) {
        onCardCreated();
      }

      alert(`¡Tarjeta de Anomalía ${newCode} creada con éxito y agregada a Mantenimiento Correctivo (Sin asignar)!`);
    } catch (err: any) {
      console.error('Error creando tarjeta TPM:', err);
      alert('Error guardando la tarjeta: ' + (err.message || 'Error de conexión'));
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status in Supabase & Local
  const handleUpdateStatus = async (id: number | string, codigo: string, newStatus: 'abierta' | 'en_proceso' | 'cerrada') => {
    const updated = tarjetas.map(t => (t.id === id || t.codigo === codigo ? { ...t, estado: newStatus } : t));
    setTarjetas(updated);
    setSaveFeedback(prev => ({ ...prev, [id]: true }));

    try {
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

      // 1. Update tarjetas_falla_anomalia
      await supabase
        .from('tarjetas_falla_anomalia')
        .update({
          estado: newStatus,
          fecha_cierre: newStatus === 'cerrada' ? nowStr : null
        })
        .eq('codigo_tarjeta', codigo);

      // 2. Update mantenimiento_ordenes
      const ordEstado = newStatus === 'cerrada' ? 'Resuelta' : newStatus === 'en_proceso' ? 'En Proceso' : 'Abierta';
      await supabase
        .from('mantenimiento_ordenes')
        .update({
          estado: ordEstado,
          fecha_cierre: newStatus === 'cerrada' ? nowStr : null
        })
        .eq('codigo', codigo);

      if (onCardCreated) {
        onCardCreated();
      }
    } catch (err) {
      console.warn('Error actualizando estado TPM:', err);
    } finally {
      setTimeout(() => {
        setSaveFeedback(prev => ({ ...prev, [id]: false }));
      }, 1500);
    }
  };

  // Filtered Tarjetas
  const filteredTarjetas = useMemo(() => {
    return tarjetas.filter(item => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inCode = (item.codigo || '').toLowerCase().includes(q);
        const inMaq = (item.maquina || '').toLowerCase().includes(q);
        const inPlanta = (item.planta || '').toLowerCase().includes(q);
        const inDesc = (item.descripcion_que || '').toLowerCase().includes(q);
        const inDet = (item.detectada_por || '').toLowerCase().includes(q);
        if (!inCode && !inMaq && !inPlanta && !inDesc && !inDet) return false;
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Top Controls & Direct Link Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#324354]">Módulo de Tarjetas de Anomalías (TPM)</h2>
            <p className="text-xs text-gray-500">
              Gestión visual de anomalías rojas, azules, amarillas y verdes enlazadas con mantenimiento correctivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/mantenimiento/tarjetas-falla"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F6F3EE] hover:bg-gray-200 text-[#324354] font-bold rounded-xl text-xs transition-all border border-[#e2ded5]"
            title="Abrir vista completa dedicada en nueva pestaña"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#7B8E90]" />
            <span>Abrir en Página Completa</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Tarjeta de Anomalía</span>
          </button>
        </div>
      </div>

      {/* Top TPM KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Tarjetas</span>
          <div className="text-2xl font-bold text-[#324354] mt-1">{stats.total}</div>
          <span className="text-[10px] text-gray-500 font-medium">{stats.abiertas} abiertas</span>
        </div>

        {/* Rojas */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            🔴 Rojas (Mtto)
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats.rojas}</div>
          <span className="text-[10px] text-rose-600 font-medium">Técnico requerido</span>
        </div>

        {/* Azules */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs flex flex-col justify-between bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            🔵 Azules (Autónomo)
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.azules}</div>
          <span className="text-[10px] text-blue-600 font-medium">Operador</span>
        </div>

        {/* Amarillas */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 Amarillas (5S/Seg)
          </span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.amarillas}</div>
          <span className="text-[10px] text-amber-600 font-medium">Seguridad y orden</span>
        </div>

        {/* Verdes */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 Verdes (Kaizen)
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.verdes}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Mejoras de equipo</span>
        </div>

        {/* Resueltas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cerradas / Resueltas</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.cerradas}</div>
          <span className="text-[10px] text-gray-500 font-medium">{stats.total > 0 ? ((stats.cerradas / stats.total) * 100).toFixed(0) : 0}% de efectividad</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-[#324354] text-sm sm:text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#7B8E90]" />
            <span>Filtros de Tarjetas TPM ({filteredTarjetas.length} registradas)</span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTarjetas}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F6F3EE] text-[#324354] hover:bg-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Global Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, máquina, síntoma o empleado..."
              className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs focus:outline-none focus:border-[#324354]"
            />
          </div>

          {/* Filter Color TPM */}
          <div>
            <select
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
            >
              <option value="todos">Color TPM: Todos</option>
              <option value="roja">🔴 Roja (Mantenimiento)</option>
              <option value="azul">🔵 Azul (Autónomo)</option>
              <option value="amarilla">🟡 Amarilla (Seguridad/5S)</option>
              <option value="verde">🟢 Verde (Kaizen)</option>
            </select>
          </div>

          {/* Filter Estado */}
          <div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
            >
              <option value="todos">Estado: Todos</option>
              <option value="abierta">Abierta</option>
              <option value="en_proceso">En Proceso</option>
              <option value="cerrada">Cerrada / Resuelta</option>
            </select>
          </div>

          {/* Filter Prioridad */}
          <div>
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-semibold text-[#324354] focus:outline-none cursor-pointer"
            >
              <option value="todas">Prioridad: Todas</option>
              <option value="Alta">🚨 Alta</option>
              <option value="Media">⚠️ Media</option>
              <option value="Baja">ℹ️ Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas TPM Table */}
      <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#324354] text-white sticky top-0 z-20">
              <tr>
                <th className="py-3 px-3 font-bold text-center">Evidencia</th>
                <th className="py-3 px-4 font-bold">Código</th>
                <th className="py-3 px-3 font-bold">Tipo / Color TPM</th>
                <th className="py-3 px-4 font-bold min-w-[150px]">Máquinas y Equipos</th>
                <th className="py-3 px-3 font-bold">Planta</th>
                <th className="py-3 px-4 font-bold min-w-[220px]">Anomalía / Falla Detectada</th>
                <th className="py-3 px-4 font-bold">Reportado Por</th>
                <th className="py-3 px-3 font-bold text-center">Prioridad</th>
                <th className="py-3 px-3 font-bold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTarjetas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No se encontraron tarjetas de anomalías con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredTarjetas.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Foto Evidencia */}
                    <td className="py-3 px-3 text-center">
                      {item.fotos && item.fotos.length > 0 ? (
                        <div className="relative inline-block group">
                          <img
                            src={item.fotos[0]}
                            alt={item.codigo}
                            onClick={() => setPreviewImage(item.fotos![0])}
                            className="w-11 h-11 object-cover rounded-xl border-2 border-[#324354] shadow-xs cursor-pointer hover:scale-105 hover:shadow-md transition-all"
                            title="Clic para ampliar foto"
                          />
                          {item.fotos.length > 1 && (
                            <span 
                              onClick={() => setPreviewImage(item.fotos![1])}
                              className="absolute -bottom-1 -right-1 bg-[#324354] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full cursor-pointer shadow-xs border border-white"
                              title="Ver segunda foto"
                            >
                              +1
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 mx-auto rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                    </td>

                    {/* Código */}
                    <td className="py-3 px-4 font-bold text-[#324354]">
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-purple-50 text-purple-800 border border-purple-200">
                        {item.codigo}
                      </span>
                    </td>

                    {/* Color Badge */}
                    <td className="py-3 px-3">
                      {renderColorBadge(item.tipo_tarjeta)}
                    </td>

                    {/* Máquina */}
                    <td className="py-3 px-4 font-bold text-[#324354]">
                      {item.maquina}
                    </td>

                    {/* Planta */}
                    <td className="py-3 px-3 font-medium text-gray-600">
                      {item.planta}
                    </td>

                    {/* Descripción de la Anomalía */}
                    <td className="py-3 px-4 text-[#324354] font-medium">
                      {item.descripcion_que}
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <span>📅 {item.fecha_apertura}</span>
                      </div>
                    </td>

                    {/* Reportado Por */}
                    <td className="py-3 px-4 font-medium text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[140px]">{item.detectada_por}</span>
                      </div>
                    </td>

                    {/* Prioridad */}
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        item.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' :
                        item.prioridad === 'Media' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.prioridad}
                      </span>
                    </td>

                    {/* Estado con Selector Dinámico */}
                    <td className="py-3 px-3 text-center">
                      <div className="relative inline-block">
                        <select
                          value={item.estado}
                          onChange={(e) => handleUpdateStatus(item.id, item.codigo, e.target.value as any)}
                          className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-all cursor-pointer focus:outline-none ${
                            item.estado === 'cerrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            item.estado === 'en_proceso' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                            'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          <option value="abierta">🔴 Abierta</option>
                          <option value="en_proceso">🟡 En Proceso</option>
                          <option value="cerrada">🟢 Cerrada</option>
                        </select>
                        {saveFeedback[item.id] && (
                          <span className="absolute -top-3 right-0 text-[10px] text-emerald-600 font-bold animate-bounce">
                            ✓ Guardado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Tarjeta de Anomalía */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#e2ded5] shadow-2xl p-6 relative">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-[#e2ded5] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#324354]">
                    Nueva Tarjeta de Anomalía (TPM)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Se creará en TPM y se vinculará a Mantenimiento Correctivo (Sin asignar).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Selector Visual de Color TPM */}
              <div>
                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-2">
                  Tipo / Color de Tarjeta TPM *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  
                  {/* Roja */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'roja' }))}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      formData.tipo_tarjeta === 'roja'
                        ? 'border-rose-600 bg-rose-50/70 shadow-xs'
                        : 'border-gray-200 hover:border-rose-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                      <span>Roja</span>
                    </div>
                    <div className="text-[10px] text-rose-600 font-medium mt-0.5">Mantenimiento</div>
                  </button>

                  {/* Azul */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'azul' }))}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      formData.tipo_tarjeta === 'azul'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span>Azul</span>
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium mt-0.5">Autónomo (Operador)</div>
                  </button>

                  {/* Amarilla */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'amarilla' }))}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      formData.tipo_tarjeta === 'amarilla'
                        ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Amarilla</span>
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">Seguridad / 5S</div>
                  </button>

                  {/* Verde */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_tarjeta: 'verde' }))}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      formData.tipo_tarjeta === 'verde'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-gray-200 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <span>Verde</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Mejora Kaizen</div>
                  </button>

                </div>
              </div>

              {/* Máquina & Planta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                    Máquinas y Equipos *
                  </label>
                  <input
                    type="text"
                    required
                    list="maquinas-tpm-list"
                    value={formData.maquina}
                    onChange={(e) => setFormData(prev => ({ ...prev, maquina: e.target.value }))}
                    placeholder="Ej: Prensa Hidráulica 02"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354]"
                  />
                  <datalist id="maquinas-tpm-list">
                    {maquinasCatalogo.map((m, idx) => (
                      <option key={idx} value={m.nombre_equipo || m.nombre}>
                        {m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}{m.planta ? `(${m.planta})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                    Planta *
                  </label>
                  <select
                    value={formData.planta}
                    onChange={(e) => setFormData(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354] cursor-pointer"
                  >
                    {plantasNomenclatura.length > 0 ? (
                      plantasNomenclatura.map((p, idx) => (
                        <option key={idx} value={p.nombre_oficial || p.nombre}>
                          {p.nombre_oficial || p.nombre}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Mármol Sintético">Mármol Sintético</option>
                        <option value="Muebles">Muebles</option>
                        <option value="Logística">Logística</option>
                        <option value="Cocinas">Cocinas</option>
                        <option value="Planta Ensamble">Planta Ensamble</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Persona que Reporta (Talento Humano Autocomplete) */}
              <div className="relative">
                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                  Persona que Reporta (Empleado Talento Humano)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.detectada_por || employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setFormData(prev => ({ ...prev, detectada_por: e.target.value }));
                      setShowEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    placeholder="Escribe para buscar empleado..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354]"
                  />
                </div>

                {showEmployeeDropdown && empleadosList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-[#e2ded5] shadow-lg z-30 divide-y divide-gray-100">
                    {empleadosList
                      .filter(emp => emp.nombreCompleto.toLowerCase().includes((formData.detectada_por || employeeSearch).toLowerCase()))
                      .slice(0, 10)
                      .map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, detectada_por: emp.nombreCompleto }));
                            setEmployeeSearch(emp.nombreCompleto);
                            setShowEmployeeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors text-xs flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-[#324354]">{emp.nombreCompleto}</span>
                          <span className="text-[10px] text-gray-400">{emp.cargo || emp.planta}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Descripción de la Anomalía / Síntoma */}
              <div>
                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                  Descripción de la Avería / Síntoma *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.descripcion_que}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_que: e.target.value }))}
                  placeholder="Describe detalladamente qué anomalía, ruido, fuga o defecto se encontró..."
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354] resize-none"
                />
              </div>

              {/* Prioridad & Destino en Gestor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                    Nivel de Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354] cursor-pointer"
                  >
                    <option value="Alta">🚨 Alta (Crítica)</option>
                    <option value="Media">⚠️ Media</option>
                    <option value="Baja">ℹ️ Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                    Destino en Gestor
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#324354] flex items-center justify-between">
                    <span>Mantenimiento Correctivo</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      Sin Asignar
                    </span>
                  </div>
                </div>
              </div>

              {/* Acción Inmediata / Preliminar */}
              <div>
                <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                  Acción Correctiva Preliminar
                </label>
                <input
                  type="text"
                  value={formData.accion_inmediata}
                  onChange={(e) => setFormData(prev => ({ ...prev, accion_inmediata: e.target.value }))}
                  placeholder="Acciones tomadas para mitigar o reparar la falla..."
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border border-[#e2ded5] text-xs font-medium focus:outline-none focus:border-[#324354]"
                />
              </div>

              {/* Fotos de Evidencia (Máx 2) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#324354] uppercase tracking-wider">
                    Fotos de Evidencia (Máximo 2)
                  </label>
                  <span className="text-[10px] text-gray-400 font-semibold">{formData.fotos.length}/2 adjuntadas</span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {formData.fotos.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#324354] shadow-xs group">
                      <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {formData.fotos.length < 2 && (
                    <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#324354] bg-[#F6F3EE] hover:bg-gray-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                      {uploadingPhotos ? (
                        <Loader2 className="w-5 h-5 text-[#324354] animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-gray-500" />
                          <span className="text-[10px] font-bold text-gray-500">Adjuntar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingPhotos}
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e2ded5] mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#324354] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhotos}
                  className="px-5 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Creando Tarjeta...' : 'Guardar y Vincular Correctivo'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white p-2 rounded-2xl shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-rose-600 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Evidencia Ampliada" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}

    </div>
  );
}
