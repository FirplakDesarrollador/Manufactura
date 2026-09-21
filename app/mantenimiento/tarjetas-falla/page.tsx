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
  ArrowLeft,
  Mic,
  MicOff,
  Image as ImageIcon,
  Edit3,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import Header from '@/components/opt-sistemica/Header';
import SubHeaderTarjetas, { TarjetaTabType } from '@/components/mantenimiento/SubHeaderTarjetas';
import TarjetasIndicadores from '@/components/mantenimiento/TarjetasIndicadores';
import TarjetasGuia from '@/components/mantenimiento/TarjetasGuia';
import PhotoAnnotationEditor from '@/components/mantenimiento/PhotoAnnotationEditor';
import TarjetaDetailModal from '@/components/mantenimiento/TarjetaDetailModal';
import LiveCameraModal from '@/components/mantenimiento/LiveCameraModal';
import * as XLSX from 'xlsx';

type TpmColor = 'roja' | 'azul' | 'amarilla' | 'verde';
type TarjetaSortField = 'evidencia' | 'codigo' | 'tipo_tarjeta' | 'maquina' | 'planta' | 'fecha_apertura' | 'descripcion_que' | 'detectada_por' | 'prioridad' | 'estado' | 'accion_inmediata';

interface Empleado {
  id: number;
  nombreCompleto: string;
  cargo?: string;
  planta?: string;
  correo_electronico?: string;
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
  created_by?: string;
}

export default function TarjetasAnomaliasPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TarjetaTabType>('historial');

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

  // Sorting state
  const [sortField, setSortField] = useState<TarjetaSortField>('fecha_apertura');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: TarjetaSortField) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'fecha_apertura' ? false : true);
    }
  };

  const renderSortIcon = (field: TarjetaSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 inline-block shrink-0" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-amber-300 inline-block shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-300 inline-block shrink-0" />
    );
  };

  // Modal State for New TPM Card
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ [id: string | number]: boolean }>({});
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);
  const [createdSuccessCode, setCreatedSuccessCode] = useState<string | null>(null);

  // Voice dictation & Photo Annotation states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [annotatingImage, setAnnotatingImage] = useState<{ src: string; index?: number } | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Selected Tarjeta for full detail and edit modal
  const [selectedTarjetaDetail, setSelectedTarjetaDetail] = useState<TarjetaTpm | null>(null);

  // Helper to determine active user's full name from session & Talento Humano
  const resolveUserFullName = (userObj: any, email: string, empList: Empleado[]): string => {
    // 1. Check user metadata for direct full name
    const metaName = 
      userObj?.user_metadata?.full_name || 
      userObj?.user_metadata?.nombre || 
      userObj?.user_metadata?.name ||
      userObj?.user_metadata?.nombre_completo;
      
    if (metaName && typeof metaName === 'string' && metaName.trim()) {
      const matchByMeta = empList.find(e => e.nombreCompleto.toLowerCase() === metaName.trim().toLowerCase());
      if (matchByMeta) return matchByMeta.nombreCompleto;
      return metaName.trim();
    }

    // 2. Match by email in empleados list
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const matchByEmail = empList.find(e => e.correo_electronico && e.correo_electronico.toLowerCase().trim() === cleanEmail);
      if (matchByEmail) return matchByEmail.nombreCompleto;

      // 3. Match by name segments in email (e.g. hector.chinchilla matches Hector José Chinchilla Trigos)
      const emailPrefix = cleanEmail.split('@')[0];
      const parts = emailPrefix.split(/[._-]/).filter(p => p.length > 2);
      if (parts.length >= 2) {
        const matchByParts = empList.find(e => {
          const empLower = e.nombreCompleto.toLowerCase();
          return parts.every(part => empLower.includes(part));
        });
        if (matchByParts) return matchByParts.nombreCompleto;
      } else if (parts.length === 1) {
        const matchBySingle = empList.find(e => e.nombreCompleto.toLowerCase().includes(parts[0]));
        if (matchBySingle) return matchBySingle.nombreCompleto;
      }
      
      // 4. Fallback: Capitalized email name
      const readable = emailPrefix.replace(/[._-]/g, ' ');
      return readable.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    return '';
  };

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

  // Clear any existing localStorage draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('firplak_tpm_card_draft');
    }
  }, []);

  // Check auth & fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setSessionUser(user);
        setUserEmail(user.email || '');

        await Promise.all([
          fetchTarjetas(),
          fetchEmpleados(user),
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
  const fetchEmpleados = async (currentUser?: any) => {
    try {
      const { data, error } = await supabaseTalentoHumano
        .from('empleados')
        .select('id, nombreCompleto, cargo, planta, correo_electronico, activo')
        .eq('activo', true)
        .order('nombreCompleto', { ascending: true });
      if (data && data.length > 0) {
        setEmpleadosList(data);

        // Resolve active user full name and initialize detectada_por
        const userToUse = currentUser || sessionUser;
        const emailToUse = userToUse?.email || userEmail;
        const resolvedName = resolveUserFullName(userToUse, emailToUse, data);
        if (resolvedName) {
          setCurrentUserFullName(resolvedName);
          setFormData(prev => ({
            ...prev,
            detectada_por: prev.detectada_por || resolvedName
          }));
        }
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

  const INITIAL_MOCK_TARJETAS: TarjetaTpm[] = [
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
      fecha_apertura: '2026-09-09 10:00',
      fotos: []
    }
  ];

  // Fetch Tarjetas TPM from Supabase + localStorage (Never lose cards)
  const fetchTarjetas = async () => {
    setSyncing(true);
    try {
      const tarjetaMap = new Map<string, TarjetaTpm>();

      // 1. Read LocalStorage backup cards first
      if (typeof window !== 'undefined') {
        const localSaved = localStorage.getItem('firplak_tarjetas_tpm_records');
        if (localSaved) {
          try {
            const parsed: TarjetaTpm[] = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => {
                if (p && p.codigo) tarjetaMap.set(p.codigo, p);
              });
            }
          } catch (e) {}
        }
      }

      // 2. Query from Supabase tarjetas_falla_anomalia
      try {
        const { data: tData } = await supabase
          .from('tarjetas_falla_anomalia')
          .select('*')
          .order('created_at', { ascending: false });

        if (tData && tData.length > 0) {
          tData.forEach((d: any, index: number) => {
            let fotosArr: string[] = [];
            if (Array.isArray(d.fotos)) fotosArr = d.fotos;
            else if (typeof d.fotos === 'string' && d.fotos.trim().startsWith('[')) {
              try { fotosArr = JSON.parse(d.fotos); } catch {}
            } else if (typeof d.fotos === 'string' && d.fotos.trim().length > 0) fotosArr = [d.fotos];
            else if (d.foto_url) fotosArr = [d.foto_url];
            else if (d.foto) fotosArr = [d.foto];

            let color: TpmColor = 'roja';
            const tAviso = (d.tipo_tarjeta || d.tipo_aviso || d.color_tarjeta || '').toLowerCase();
            if (tAviso.includes('azul') || tAviso.includes('autonomo') || tAviso.includes('operador')) color = 'azul';
            else if (tAviso.includes('amarill') || tAviso.includes('seguridad') || tAviso.includes('5s') || tAviso.includes('riesgo')) color = 'amarilla';
            else if (tAviso.includes('verde') || tAviso.includes('mejora') || tAviso.includes('kaizen')) color = 'verde';
            else color = 'roja';

            const rawEstado = (d.estado || '').toLowerCase();
            const estado: 'abierta' | 'en_proceso' | 'cerrada' = 
              rawEstado === 'cerrada' || rawEstado === 'resuelta' || rawEstado === 'completado' ? 'cerrada' :
              rawEstado === 'en_proceso' || rawEstado === 'en proceso' ? 'en_proceso' : 'abierta';

            const cod = d.codigo || d.codigo_tarjeta || `TPM-${d.id || index + 1}`;
            tarjetaMap.set(cod, {
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
              created_at: d.created_at,
              created_by: d.created_by || d.user_email || d.creado_por || undefined
            });
          });
        }
      } catch (errDb) {
        console.warn('Consulta tarjetas_falla_anomalia:', errDb);
      }

      // 3. Query from Supabase mantenimiento_ordenes for any missing TPM cards
      try {
        const { data: oData } = await supabase
          .from('mantenimiento_ordenes')
          .select('*')
          .order('created_at', { ascending: false });

        if (oData && oData.length > 0) {
          const tpmOrders = oData.filter((o: any) => 
            o.origen === 'TARJETA_TPM' || (o.codigo && o.codigo.startsWith('TPM-')) || o.id_tarjeta_falla != null
          );
          tpmOrders.forEach((o: any) => {
            const cod = o.codigo || `TPM-${o.id}`;
            if (!tarjetaMap.has(cod)) {
              let fotosArr: string[] = [];
              if (Array.isArray(o.fotos_antes)) fotosArr = o.fotos_antes;
              else if (Array.isArray(o.fotos)) fotosArr = o.fotos;

              let color: TpmColor = 'roja';
              const tit = (o.titulo || '').toLowerCase();
              if (tit.includes('azul') || tit.includes('autónomo')) color = 'azul';
              else if (tit.includes('amarilla') || tit.includes('seguridad')) color = 'amarilla';
              else if (tit.includes('verde') || tit.includes('mejora')) color = 'verde';

              let cleanSintoma = o.sintoma_falla || o.titulo || 'Anomalía reportada';
              if (cleanSintoma.startsWith('[')) {
                const idx = cleanSintoma.indexOf(']');
                if (idx !== -1 && idx < cleanSintoma.length - 1) cleanSintoma = cleanSintoma.slice(idx + 1).trim();
              }

              const rawEstado = (o.estado || '').toLowerCase();
              const estado: 'abierta' | 'en_proceso' | 'cerrada' = 
                rawEstado === 'cerrada' || rawEstado === 'resuelta' || rawEstado === 'completado' ? 'cerrada' :
                rawEstado === 'en proceso' || rawEstado === 'en_proceso' ? 'en_proceso' : 'abierta';

              tarjetaMap.set(cod, {
                id: o.id_tarjeta_falla || o.id,
                codigo: cod,
                tipo_tarjeta: color,
                tipo_aviso: color === 'roja' ? 'Mantenimiento' : color === 'azul' ? 'Autónomo' : color === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
                maquina: o.maquina || 'Equipo General',
                planta: o.planta || 'Mármol Sintético',
                detectada_por: o.reportado_por || 'Operario',
                descripcion_que: cleanSintoma,
                prioridad: (o.prioridad as any) || 'Alta',
                accion_inmediata: o.accion_realizada || '',
                estado,
                fecha_apertura: o.created_at ? o.created_at.slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' '),
                fotos: fotosArr,
                created_at: o.created_at
              });
            }
          });
        }
      } catch (oErr) {
        console.warn('Consulta mantenimiento_ordenes:', oErr);
      }

      // 4. Merge initial mocks if needed
      INITIAL_MOCK_TARJETAS.forEach(m => {
        if (!tarjetaMap.has(m.codigo)) {
          tarjetaMap.set(m.codigo, m);
        }
      });

      const combined = Array.from(tarjetaMap.values());
      // Sort newest first
      combined.sort((a, b) => {
        const tA = new Date(a.fecha_apertura).getTime() || 0;
        const tB = new Date(b.fecha_apertura).getTime() || 0;
        return tB - tA;
      });

      setTarjetas(combined);
      if (typeof window !== 'undefined') {
        localStorage.setItem('firplak_tarjetas_tpm_records', JSON.stringify(combined));
      }
    } catch (err) {
      console.warn('Error fetching tarjetas:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Voice-to-Text: Stop Speech Recognition immediately
  const handleStopVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error deteniendo dictado por voz:', e);
      }
    }
    setIsListening(false);
  };

  // Voice-to-Text: Toggle Speech Recognition
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no tiene activado el dictado por voz. Te sugerimos usar Google Chrome, Microsoft Edge o Safari.');
      return;
    }

    if (isListening) {
      handleStopVoice();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setFormData(prev => ({
            ...prev,
            descripcion_que: prev.descripcion_que ? `${prev.descripcion_que} ${transcript.trim()}` : transcript.trim()
          }));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        handleStopVoice();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      handleStopVoice();
    }
  };

  // Helper: Open file picker reliably
  const handleTriggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else {
      const el = document.getElementById('tpm-direct-file-input') as HTMLInputElement;
      if (el) {
        el.value = '';
        el.click();
      }
    }
  };

  // Helper: Attach images directly from device files (max 2 total, unconditional OR choice)
  const handleDirectFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentFotos = formData.fotos || [];
    const availableSlots = Math.max(0, 2 - currentFotos.length);

    if (availableSlots <= 0) {
      alert('Ya has alcanzado el límite máximo de 2 fotos. Puedes eliminar una si deseas cambiarla.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, availableSlots);
    const readPromises = filesToRead.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string || '');
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newImages => {
      const validImages = newImages.filter(img => Boolean(img));
      if (validImages.length > 0) {
        setFormData(prev => ({
          ...prev,
          fotos: [...(prev.fotos || []), ...validImages].slice(0, 2)
        }));
      }
    }).catch(err => {
      console.warn('Error leyendo archivos:', err);
    });
  };

  // Helper: Live camera capture from LiveCameraModal
  const handleCameraCapture = (dataUrl: string) => {
    setShowLiveCamera(false);
    setFormData(prev => ({
      ...prev,
      fotos: [...(prev.fotos || []), dataUrl].slice(0, 2)
    }));
  };

  // Save annotated photo (re-edited or marked in red)
  const handleSaveAnnotatedPhoto = (annotatedDataUrl: string) => {
    if (annotatingImage?.index !== undefined) {
      // Re-edited existing photo
      setFormData(prev => ({
        ...prev,
        fotos: prev.fotos.map((f, i) => i === annotatingImage.index ? annotatedDataUrl : f)
      }));
    } else {
      // New photo added
      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), annotatedDataUrl].slice(0, 2)
      }));
    }
    setAnnotatingImage(null);
  };

  // Handle Form Submit: Creates TPM Card + Synchronizes with Correctives (Unassigned)
  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setFormValidationMsg(null);

    const cleanMaquina = (formData.maquina || '').trim() || 'Equipo General';
    const cleanDescripcion = (formData.descripcion_que || '').trim();
    const cleanAccion = (formData.accion_inmediata || '').trim();

    if (!cleanDescripcion) {
      setFormValidationMsg('⚠️ Por favor escribe la descripción de la avería o síntoma.');
      const el = document.getElementById('field-tpm-descripcion');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
      return;
    }

    try {
      setSubmitting(true);
      const newCode = `TPM-${Math.floor(100 + Math.random() * 900)}`;
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const fechaApertura = new Date().toISOString().split('T')[0];
      const tempId = Date.now();

      // 1. Instant Optimistic State Update: Never block the UI
      const newRecord: TarjetaTpm = {
        id: tempId,
        codigo: newCode,
        tipo_tarjeta: formData.tipo_tarjeta,
        tipo_aviso: formData.tipo_tarjeta === 'roja' ? 'Mantenimiento' : formData.tipo_tarjeta === 'azul' ? 'Autónomo' : formData.tipo_tarjeta === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
        maquina: cleanMaquina,
        planta: formData.planta,
        detectada_por: formData.detectada_por || currentUserFullName || 'Operador',
        descripcion_que: cleanDescripcion,
        prioridad: formData.prioridad,
        accion_inmediata: cleanAccion,
        estado: 'abierta',
        fecha_apertura: nowStr,
        fotos: [...(formData.fotos || [])],
        created_at: new Date().toISOString()
      };

      setTarjetas(prev => {
        const next = [newRecord, ...prev.filter(p => p.codigo !== newCode)];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('firplak_tarjetas_tpm_records', JSON.stringify(next));
          } catch (e) {
            console.warn('LocalStorage save warning:', e);
          }
        }
        return next;
      });

      // Reset Form & Switch Tab immediately
      setShowCreateModal(false);
      setFormData({
        tipo_tarjeta: 'roja',
        maquina: '',
        planta: 'Mármol Sintético',
        detectada_por: currentUserFullName || '',
        descripcion_que: '',
        prioridad: 'Alta',
        accion_inmediata: '',
        fotos: []
      });
      setCreatedSuccessCode(newCode);
      setActiveTab('historial');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // 2. Background Database Synchronization (with timeout safety)
      (async () => {
      try {
        // Map fields to match Postgres check constraints on tarjetas_falla_anomalia
        const dbTipoAviso = 
          formData.tipo_tarjeta === 'roja' ? 'mantenimiento_planeado' :
          formData.tipo_tarjeta === 'azul' ? 'mantenimiento_autonomo' :
          formData.tipo_tarjeta === 'amarilla' ? 'seguridad' : 'otros';

        const dbPrioridadTpm = 
          formData.prioridad === 'Alta' ? 'A' :
          formData.prioridad === 'Media' ? 'B' : 'C';

        let generatedCode = newCode;
        let insertedTpmUuid: string | null = null;

        // Supabase tarjetas_falla_anomalia
        try {
          const tpmPayload = {
            planta_proceso: formData.planta || 'Mármol Sintético',
            planta: formData.planta || 'Mármol Sintético',
            maquina: cleanMaquina,
            tipo_aviso: dbTipoAviso,
            tipo_tarjeta: formData.tipo_tarjeta,
            prioridad: dbPrioridadTpm,
            fecha_apertura: fechaApertura,
            detectada_por: newRecord.detectada_por,
            descripcion_que: cleanDescripcion,
            observaciones: cleanAccion || undefined,
            estado: 'abierta',
            fotos: newRecord.fotos || []
          };

          const tpmPromise = supabase
            .from('tarjetas_falla_anomalia')
            .insert([tpmPayload])
            .select();

          const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );

          const { data: tpmData, error: tpmErr } = await Promise.race([tpmPromise, timeoutPromise]) as any;
          if (tpmErr) {
            console.error('🔴 Error guardando tarjetas_falla_anomalia:', tpmErr);
          } else if (tpmData && tpmData[0]) {
            insertedTpmUuid = tpmData[0].id;
            if (tpmData[0].codigo_tarjeta) {
              generatedCode = tpmData[0].codigo_tarjeta;
              // Update optimistic card code with official generated code
              setTarjetas(prev => prev.map(card => card.id === tempId ? { ...card, codigo: generatedCode } : card));
            }
          }
        } catch (tpmCatch) {
          console.warn('Aviso sincronización tarjetas_falla_anomalia:', tpmCatch);
        }

        // Supabase mantenimiento_ordenes (Correctivo Sin Asignar)
        try {
          const colorTitleMap: { [k in TpmColor]: string } = {
            roja: '🔴 Tarjeta Roja (Mantenimiento)',
            azul: '🔵 Tarjeta Azul (Autónomo)',
            amarilla: '🟡 Tarjeta Amarilla (Seguridad/5S)',
            verde: '🟢 Tarjeta Verde (Mejora Kaizen)'
          };

          const ordPayload = {
            origen: 'TARJETA_TPM',
            tipo_orden: 'CORRECTIVO',
            id_tarjeta_falla: null, // Integer foreign key or null
            codigo: generatedCode,
            titulo: `[${colorTitleMap[newRecord.tipo_tarjeta]}] ${cleanDescripcion}`,
            maquina: cleanMaquina,
            planta: newRecord.planta,
            id_tecnico: null,
            tecnico_nombre: 'Sin asignar',
            turno: 'General',
            prioridad: newRecord.prioridad,
            estado: 'Abierta',
            fecha_programada: fechaApertura,
            duracion_estimada_min: 60,
            sintoma_falla: cleanDescripcion,
            accion_realizada: cleanAccion || undefined,
            comentarios_ejecucion: `Reportado por: ${newRecord.detectada_por} (${userEmail})`,
            reportado_por: newRecord.detectada_por,
            fotos_antes: newRecord.fotos || []
          };

          const ordPromise = supabase.from('mantenimiento_ordenes').insert([ordPayload]);
          const ordTimeout = new Promise<{ data: any; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );

          const { error: ordErr } = await Promise.race([ordPromise, ordTimeout]) as any;
          if (ordErr) {
            console.error('🔴 Error guardando mantenimiento_ordenes:', ordErr);
          } else {
            console.log('✅ Tarjeta y Orden de Mantenimiento creadas exitosamente en Supabase');
          }
        } catch (ordCatch) {
          console.warn('Aviso sincronización mantenimiento_ordenes:', ordCatch);
        }
        } catch (bgErr) {
          console.warn('Error en sincronización en segundo plano:', bgErr);
        }
      })();
    } catch (err: any) {
      console.error('Error al procesar la creación de la tarjeta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Update Tarjeta Full Details (Only by creator / authorized)
  const handleUpdateTarjetaDetails = async (updated: TarjetaTpm) => {
    try {
      // 1. Update in Supabase tarjetas_falla_anomalia
      await supabase
        .from('tarjetas_falla_anomalia')
        .update({
          tipo_tarjeta: updated.tipo_tarjeta,
          tipo_aviso: updated.tipo_tarjeta === 'roja' ? 'Mantenimiento' : updated.tipo_tarjeta === 'azul' ? 'Autónomo' : updated.tipo_tarjeta === 'amarilla' ? 'Seguridad/5S' : 'Mejora Kaizen',
          maquina: updated.maquina,
          planta: updated.planta,
          descripcion_que: updated.descripcion_que,
          prioridad: updated.prioridad,
          accion_inmediata: updated.accion_inmediata || null,
          accion_correctiva: updated.accion_inmediata || null,
          estado: updated.estado,
          fotos: updated.fotos
        })
        .eq('id', updated.id);

      // 2. Sync with mantenimiento_ordenes if linked
      try {
        await supabase
          .from('mantenimiento_ordenes')
          .update({
            maquina: updated.maquina,
            planta: updated.planta,
            prioridad: updated.prioridad,
            sintoma_falla: updated.descripcion_que,
            accion_realizada: updated.accion_inmediata || null,
            estado: updated.estado === 'cerrada' ? 'Completado' : updated.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente',
            fotos_antes: updated.fotos
          })
          .eq('id_tarjeta_falla', updated.id);
      } catch (ordErr) {
        console.warn('Sync mantenimiento_ordenes error:', ordErr);
      }

      // 3. Update local state and localStorage
      setTarjetas(prev => {
        const next = prev.map(t => t.id === updated.id ? updated : t);
        if (typeof window !== 'undefined') {
          localStorage.setItem('firplak_tarjetas_tpm_records', JSON.stringify(next));
        }
        return next;
      });
      setSelectedTarjetaDetail(null);
      alert('¡Tarjeta de anomalía actualizada con éxito!');
    } catch (err) {
      console.error('Error actualizando tarjeta:', err);
      alert('Error al guardar los cambios de la tarjeta.');
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (id: number | string, newStatus: 'abierta' | 'en_proceso' | 'cerrada') => {
    setTarjetas(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, estado: newStatus } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('firplak_tarjetas_tpm_records', JSON.stringify(next));
      }
      return next;
    });

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

  // Filtered and Sorted Tarjetas
  const filteredTarjetas = useMemo(() => {
    const list = tarjetas.filter(item => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.codigo.toLowerCase().includes(q) ||
          item.maquina.toLowerCase().includes(q) ||
          item.planta.toLowerCase().includes(q) ||
          item.detectada_por.toLowerCase().includes(q) ||
          item.descripcion_que.toLowerCase().includes(q) ||
          (item.fecha_apertura && item.fecha_apertura.toLowerCase().includes(q)) ||
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

    return [...list].sort((a, b) => {
      let valA: any = sortField in a ? (a as any)[sortField] || '' : '';
      let valB: any = sortField in b ? (b as any)[sortField] || '' : '';

      if (sortField === 'evidencia') {
        valA = a.fotos && a.fotos.length > 0 ? 1 : 0;
        valB = b.fotos && b.fotos.length > 0 ? 1 : 0;
      } else if (sortField === 'fecha_apertura') {
        valA = a.fecha_apertura ? a.fecha_apertura.slice(0, 10) : (a.created_at?.slice(0, 10) || '');
        valB = b.fecha_apertura ? b.fecha_apertura.slice(0, 10) : (b.created_at?.slice(0, 10) || '');
      } else if (sortField === 'prioridad') {
        const priorityWeight: Record<string, number> = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        valA = priorityWeight[a.prioridad] || 0;
        valB = priorityWeight[b.prioridad] || 0;
      } else if (sortField === 'estado') {
        const estadoWeight: Record<string, number> = { 'abierta': 1, 'en_proceso': 2, 'cerrada': 3 };
        valA = estadoWeight[a.estado] || 0;
        valB = estadoWeight[b.estado] || 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      const comp = String(valA).localeCompare(String(valB), 'es', { numeric: true, sensitivity: 'base' });
      return sortAsc ? comp : -comp;
    });
  }, [tarjetas, searchTerm, filterColor, filterEstado, filterPrioridad, filterPlanta, sortField, sortAsc]);

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

      {/* SubHeader con las 4 pestañas: Historial Tarjetas, + Nueva Tarjeta, Indicadores, ¿Cómo funcionan las tarjetas? */}
      <SubHeaderTarjetas
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'nueva') {
            setFormData(prev => ({
              ...prev,
              detectada_por: prev.detectada_por || currentUserFullName || ''
            }));
          }
        }}
        totalTarjetas={tarjetas.length}
      />

      <main className="flex-1 w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col gap-3.5">
        
        {/* Pestaña: Indicadores */}
        {activeTab === 'indicadores' && (
          <TarjetasIndicadores tarjetas={tarjetas} />
        )}

        {/* Pestaña: ¿Cómo funcionan las tarjetas? */}
        {activeTab === 'guia' && (
          <TarjetasGuia />
        )}

        {/* Pestaña: Nueva Tarjeta (Formulario directo sin banner repetido y con autoguardado activo) */}
        {activeTab === 'nueva' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 animate-in fade-in">
            {/* Formulario Principal */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#e2ded5] shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 flex-wrap gap-2">
                <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
                  Reporte de Tarjeta de Anomalía (TPM)
                </span>
              </div>

              <form onSubmit={handleCreateSubmit} noValidate className="flex flex-col gap-4">
                
                {/* Selector de Color / Tipo de Tarjeta TPM */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">
                    Tipo de Tarjeta / Clasificación TPM <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

                {/* Renglón: Máquinas y Equipos (1 solo renglón a todo lo ancho) */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                    Máquinas y Equipos <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="field-tpm-maquina"
                    list="maquinas-options-tpm"
                    type="text"
                    value={formData.maquina}
                    onChange={(e) => {
                      if (formValidationMsg) setFormValidationMsg(null);
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
                    className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
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

                {/* Renglón: Planta (1 solo renglón a todo lo ancho) */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                    Planta <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.planta}
                    onChange={(e) => setFormData(prev => ({ ...prev, planta: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#324354]"
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

                {/* Renglón: Persona que Reporta (Empleado de Talento Humano) (1 solo renglón a todo lo ancho) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Persona que Reporta (Empleado) <span className="text-rose-600">*</span>
                    </label>
                    {currentUserFullName && formData.detectada_por !== currentUserFullName && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, detectada_por: currentUserFullName }))}
                        className="text-[11px] text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer"
                        title="Restablecer a mi usuario activo en sesión"
                      >
                        Usar mi usuario ({currentUserFullName.split(' ')[0]})
                      </button>
                    )}
                  </div>
                  <input
                    list="empleados-options-tpm"
                    type="text"
                    value={formData.detectada_por}
                    onChange={(e) => setFormData(prev => ({ ...prev, detectada_por: e.target.value }))}
                    placeholder="Escribe o selecciona el nombre del operario / empleado..."
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  />
                  <datalist id="empleados-options-tpm">
                    {empleadosList.map(emp => (
                      <option key={emp.id} value={emp.nombreCompleto}>
                        {emp.cargo ? `Cargo: ${emp.cargo}` : ''} {emp.planta ? `· Planta: ${emp.planta}` : ''}
                      </option>
                    ))}
                  </datalist>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Por defecto tu usuario de sesión, pero puedes editarlo o seleccionar a otro empleado para reportar a su nombre.
                  </p>
                </div>

                {/* Renglón: Descripción de la Avería / Síntoma con Dictado por Voz (1 solo renglón a todo lo ancho) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Descripción de la Avería / Síntoma <span className="text-rose-600">*</span>
                    </label>
                    
                    {/* Botón de control de Micrófono */}
                    {isListening ? (
                      <button
                        type="button"
                        onClick={handleStopVoice}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer animate-pulse active:scale-95"
                        title="Haz clic para detener el micrófono"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Parar Micrófono</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95"
                        title="Dictar descripción por voz"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-600" />
                        <span>Dictar por Voz</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    id="field-tpm-descripcion"
                    value={formData.descripcion_que}
                    onChange={(e) => {
                      if (formValidationMsg) setFormValidationMsg(null);
                      setFormData(prev => ({ ...prev, descripcion_que: e.target.value }));
                    }}
                    placeholder="Describe la anomalía detectada, o presiona 'Dictar por Voz' para hablar..."
                    required
                    rows={3}
                    className={`w-full p-3 bg-[#F6F3EE] rounded-xl border text-sm focus:outline-none transition-all ${
                      isListening 
                        ? 'border-rose-500 ring-2 ring-rose-300' 
                        : formValidationMsg 
                          ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' 
                          : 'border-gray-300 focus:ring-2 focus:ring-[#324354]'
                    }`}
                  />
                  
                  {/* Banner activo con botón adicional para parar micrófono */}
                  {isListening && (
                    <div className="flex items-center justify-between p-2.5 mt-2 bg-rose-50 border border-rose-300 rounded-xl shadow-2xs animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0"></span>
                        <span className="text-xs text-rose-800 font-bold">
                          🎙️ Micrófono activado · Hable ahora
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStopVoice}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Detener</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Renglón: Nivel de Prioridad (1 solo renglón a todo lo ancho) */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">
                    Nivel de Prioridad <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-semibold text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#324354]"
                  >
                    <option value="Alta">🚨 Alta (Crítica)</option>
                    <option value="Media">⚠️ Media</option>
                    <option value="Baja">ℹ️ Baja</option>
                  </select>
                </div>

                {/* Renglón: Destino en Gestor (1 solo renglón a todo lo ancho) */}
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Destino en Gestor</label>
                  <div className="w-full px-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-between">
                    <span>Mantenimiento Correctivo</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">Sin Asignar</span>
                  </div>
                </div>

                {/* Sección de Fotos y Acciones Rehechas desde Cero */}
                <div className="space-y-4 pt-2">
                  {/* Bloque de Evidencia Fotográfica */}
                  <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#7B8E90]" />
                        <span>Fotos de Evidencia (Máximo 2)</span>
                      </label>
                      <span className="text-[11px] text-gray-500 font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        {formData.fotos?.length || 0}/2 adjuntadas
                      </span>
                    </div>

                    {/* BOTÓN 1 & BOTÓN 2: Tomar Foto y Adjuntar Archivo */}
                    {(formData.fotos?.length || 0) < 2 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* BOTÓN 1: Tomar Foto con Cámara */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📷 Botón Tomar Foto pulsado');
                            setShowLiveCamera(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#324354] hover:bg-[#253341] active:bg-[#1a2530] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition-all active:scale-95 border-0"
                        >
                          <Camera className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>Tomar Foto</span>
                        </button>

                        {/* BOTÓN 2: Adjuntar Archivo */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📁 Botón Adjuntar Archivo pulsado');
                            handleTriggerFilePicker();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-[#324354] font-bold rounded-xl text-xs sm:text-sm border border-gray-300 shadow-xs cursor-pointer transition-all active:scale-95 select-none"
                        >
                          <ImageIcon className="w-4 h-4 text-[#7B8E90] shrink-0" />
                          <span>Adjuntar Archivo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Límite de 2 fotos alcanzado (2/2). Puedes eliminar o editar cualquiera abajo.</span>
                      </div>
                    )}

                    {/* Hidden input para adjuntar archivos directamente en cualquier momento */}
                    <input
                      id="tpm-direct-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.png,.jpg,.jpeg,.webp"
                      multiple
                      onChange={handleDirectFileAttach}
                      className="hidden"
                    />

                    {/* Vista previa de miniaturas adjuntas */}
                    {formData.fotos && formData.fotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        {formData.fotos.map((foto, index) => (
                          <div key={index} className="relative bg-white p-2 rounded-xl border border-gray-200 flex flex-col gap-2 shadow-2xs">
                            <div 
                              onClick={() => setPreviewImage(foto)}
                              className="relative w-full h-28 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
                              title="Clic para ampliar foto"
                            >
                              <img src={foto} alt={`Evidencia ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <span className="absolute bottom-1 left-1 bg-[#324354]/90 text-[9px] text-white font-bold px-1.5 py-0.5 rounded">
                                Foto {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({
                                    ...prev,
                                    fotos: prev.fotos.filter((_, i) => i !== index)
                                  }));
                                }}
                                className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all cursor-pointer shadow-2xs"
                                title="Eliminar foto"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAnnotatingImage({ src: foto, index })}
                              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs border border-rose-200 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Señalar en Rojo</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-gray-500 leading-tight">
                      <span className="font-bold text-[#324354]">💡 Evidencias:</span> Puedes tomar 2 fotos, adjuntar 2 archivos o combinar 1 y 1 (máximo 2 en total). Pulsa <strong>Señalar en Rojo</strong> para destacar el punto exacto de la avería.
                    </div>
                  </div>

                  {/* Banner de Validación / Error */}
                  {formValidationMsg && (
                    <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold rounded-xl flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{formValidationMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormValidationMsg(null)}
                        className="text-rose-600 hover:text-rose-900 font-bold p-1 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* BOTÓN 3 & BOTÓN 4: Cancelar y Crear Tarjeta de Anomalía */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    {/* BOTÓN 3: Cancelar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('🚫 Botón Cancelar pulsado');
                        handleStopVoice();
                        setFormValidationMsg(null);
                        setActiveTab('historial');
                      }}
                      className="w-full py-3.5 px-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shadow-2xs flex items-center justify-center gap-2 border-0"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                      <span>Cancelar</span>
                    </button>

                    {/* BOTÓN 4: Crear Tarjeta de Anomalía */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-4 bg-[#324354] hover:bg-[#253341] active:bg-[#1a2530] text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pestaña: Historial Tarjetas */}
        {activeTab === 'historial' && (
          <>
            {/* Banner de Notificación de Tarjeta Creada con Éxito */}
            {createdSuccessCode && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>¡Tarjeta {createdSuccessCode} creada y registrada con éxito!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedSuccessCode(null)}
                  className="p-1 hover:bg-emerald-100 rounded-full cursor-pointer text-emerald-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e2ded5] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-[#324354] text-xs sm:text-sm flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#7B8E90]" />
                  <span>Filtros de Tarjetas TPM ({filteredTarjetas.length} registradas)</span>
                </h3>

                <div className="flex items-center gap-2">
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
                  <th 
                    onClick={() => handleSort('evidencia')}
                    className="py-2.5 px-2 font-bold text-center w-[60px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por evidencia fotográfica"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Evidencia</span>
                      {renderSortIcon('evidencia')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('codigo')}
                    className="py-2.5 px-2 font-bold text-center w-[80px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por código"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Código</span>
                      {renderSortIcon('codigo')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('tipo_tarjeta')}
                    className="py-2.5 px-2 font-bold w-[125px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por tipo / color TPM"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tipo / Color</span>
                      {renderSortIcon('tipo_tarjeta')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('maquina')}
                    className="py-2.5 px-2.5 font-bold w-[135px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por máquina"
                  >
                    <div className="flex items-center gap-1">
                      <span>Máquinas y Equipos</span>
                      {renderSortIcon('maquina')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('planta')}
                    className="py-2.5 px-2 font-bold w-[90px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por planta"
                  >
                    <div className="flex items-center gap-1">
                      <span>Planta</span>
                      {renderSortIcon('planta')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_apertura')}
                    className="py-2.5 px-2 font-bold text-center w-[95px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por fecha de reporte"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Fecha</span>
                      {renderSortIcon('fecha_apertura')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('descripcion_que')}
                    className="py-2.5 px-3 font-bold min-w-[170px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por anomalía / falla"
                  >
                    <div className="flex items-center gap-1">
                      <span>Anomalía / Falla Detectada</span>
                      {renderSortIcon('descripcion_que')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('detectada_por')}
                    className="py-2.5 px-2.5 font-bold w-[130px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por persona que reporta"
                  >
                    <div className="flex items-center gap-1">
                      <span>Reportado Por</span>
                      {renderSortIcon('detectada_por')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('prioridad')}
                    className="py-2.5 px-2 font-bold text-center w-[75px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por prioridad"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Prioridad</span>
                      {renderSortIcon('prioridad')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('estado')}
                    className="py-2.5 px-2 font-bold text-center w-[105px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por estado"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Estado</span>
                      {renderSortIcon('estado')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('accion_inmediata')}
                    className="py-2.5 px-3 font-bold w-[150px] cursor-pointer hover:bg-[#253341] select-none transition-colors"
                    title="Ordenar por acción realizada"
                  >
                    <div className="flex items-center gap-1">
                      <span>Acción / Solución</span>
                      {renderSortIcon('accion_inmediata')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTarjetas.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      No se encontraron tarjetas de anomalías con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredTarjetas.map((item) => {
                    const isCerrada = item.estado === 'cerrada';
                    const isEnProceso = item.estado === 'en_proceso';
                    const fechaSolo = (item.fecha_apertura || item.created_at || '').slice(0, 10).replace('T', ' ');

                    return (
                      <tr 
                        key={item.codigo || `tpm_${item.id}`} 
                        onClick={() => setSelectedTarjetaDetail(item)}
                        className="hover:bg-slate-100/80 cursor-pointer transition-colors group"
                        title="Haz clic para ver el detalle completo de la tarjeta"
                      >
                        {/* Evidencia Foto */}
                        <td className="py-2.5 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.fotos && item.fotos.length > 0 ? (
                            <div className="relative inline-block group/img">
                              <img
                                src={item.fotos[0]}
                                alt={item.codigo}
                                onClick={() => setPreviewImage(item.fotos![0])}
                                className="w-9 h-9 object-cover rounded-lg border border-[#324354] shadow-2xs cursor-pointer hover:scale-110 transition-transform"
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
                        <td className="py-2.5 px-2 text-center font-bold text-[#324354]">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-mono text-[10.5px] group-hover:bg-[#324354] group-hover:text-white transition-colors">
                            {item.codigo}
                          </span>
                        </td>

                        {/* Color TPM Badge */}
                        <td className="py-2.5 px-2">
                          {renderColorBadge(item.tipo_tarjeta)}
                        </td>

                        {/* Máquina */}
                        <td className="py-2.5 px-2 font-bold text-[#324354] text-[11px]" title={item.maquina}>
                          <span className="break-words">{item.maquina}</span>
                        </td>

                        {/* Planta */}
                        <td className="py-2.5 px-2 font-medium text-gray-600 text-[11px]" title={item.planta}>
                          <span className="break-words">{item.planta}</span>
                        </td>

                        {/* Fecha (Columna separada, solo fecha sin hora) */}
                        <td className="py-2.5 px-2 text-center font-medium text-gray-700 text-[11px] whitespace-nowrap">
                          {fechaSolo || 'N/A'}
                        </td>

                        {/* Descripción / Falla (Limpia sin fecha redundante) */}
                        <td className="py-2.5 px-3 text-[#324354] font-medium text-[11px]">
                          <div className="line-clamp-2 leading-snug" title={item.descripcion_que}>
                            {item.descripcion_que}
                          </div>
                        </td>

                        {/* Reportado Por - Nombre completo en múltiples líneas sin recortar (...) */}
                        <td className="py-2.5 px-3 font-semibold text-[#324354] text-[11px] min-w-[140px] max-w-[220px]">
                          <div className="flex items-start gap-1.5 leading-snug">
                            <User className="w-3.5 h-3.5 text-[#7B8E90] shrink-0 mt-0.5" />
                            <span className="whitespace-normal break-words font-medium">{item.detectada_por}</span>
                          </div>
                        </td>

                        {/* Prioridad */}
                        <td className="py-2.5 px-1.5 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] inline-block ${
                            item.prioridad === 'Alta' ? 'bg-rose-100 text-rose-800' :
                            item.prioridad === 'Media' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.prioridad}
                          </span>
                        </td>

                        {/* Estado (Solo lectura - Modificable únicamente desde Correctivo) */}
                        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <span 
                            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border select-none ${
                              isCerrada ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              isEnProceso ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                            title="El estado de la anomalía se actualiza únicamente desde la Orden de Mantenimiento Correctivo"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isCerrada ? 'bg-emerald-500' :
                              isEnProceso ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`}></span>
                            {isCerrada ? 'Cerrada' : isEnProceso ? 'En Proceso' : 'Abierta'}
                          </span>
                        </td>

                        {/* Acción / Solución */}
                        <td className="py-2.5 px-2.5 text-gray-700 text-[10.5px]">
                          {item.accion_inmediata ? (
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-gray-200 text-[10px] max-h-16 overflow-y-auto leading-tight" title={item.accion_inmediata}>
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
          </>
        )}

      </main>



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

      {/* Modal Cámara en Vivo (Webcam PC/Laptop + Celular) */}
      <LiveCameraModal
        isOpen={showLiveCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowLiveCamera(false)}
      />

      {/* Modal Editor de Marcado en Rojo para Foto */}
      {annotatingImage && (
        <PhotoAnnotationEditor
          imageSrc={annotatingImage.src}
          onSave={handleSaveAnnotatedPhoto}
          onCancel={() => setAnnotatingImage(null)}
        />
      )}

      {/* Modal de Detalle Completo de Tarjeta TPM (Edición exclusiva para creador) */}
      {selectedTarjetaDetail && (
        <TarjetaDetailModal
          tarjeta={selectedTarjetaDetail}
          onClose={() => setSelectedTarjetaDetail(null)}
          onUpdateTarjeta={handleUpdateTarjetaDetails}
          currentUserEmail={userEmail}
          maquinasCatalogo={maquinasCatalogo}
          plantasNomenclatura={plantasNomenclatura}
          empleadosList={empleadosList}
          onOpenPhotoPreview={(url) => setPreviewImage(url)}
        />
      )}

    </div>
  );
}
