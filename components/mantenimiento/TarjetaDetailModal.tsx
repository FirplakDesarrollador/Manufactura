'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Edit3, 
  Save, 
  Lock, 
  Unlock, 
  User, 
  Calendar, 
  Clock, 
  Cpu, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Square, 
  Wrench, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import PhotoAnnotationEditor from './PhotoAnnotationEditor';
import LiveCameraModal from './LiveCameraModal';

type TpmColor = 'roja' | 'azul' | 'amarilla' | 'verde';

export interface TarjetaTpm {
  id: number | string;
  codigo: string;
  tipo_tarjeta: TpmColor;
  tipo_aviso?: string;
  maquina: string;
  codigo_maquina?: string;
  planta: string;
  detectada_por: string;
  descripcion_que: string;
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

interface TarjetaDetailModalProps {
  tarjeta: TarjetaTpm | null;
  onClose: () => void;
  onUpdateTarjeta: (updated: TarjetaTpm) => Promise<void>;
  currentUserEmail: string;
  maquinasCatalogo: any[];
  plantasNomenclatura: any[];
  empleadosList: any[];
  onOpenPhotoPreview: (photoUrl: string) => void;
}

export default function TarjetaDetailModal({
  tarjeta,
  onClose,
  onUpdateTarjeta,
  currentUserEmail,
  maquinasCatalogo,
  plantasNomenclatura,
  empleadosList,
  onOpenPhotoPreview
}: TarjetaDetailModalProps) {
  if (!tarjeta) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<TarjetaTpm>({ ...tarjeta });
  
  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialTextRef = useRef<string>('');

  // Photo annotation editor state
  const [annotatingImage, setAnnotatingImage] = useState<{ src: string; index?: number } | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditData({ ...tarjeta });
    setIsEditing(false);
  }, [tarjeta]);

  // Check if current user is authorized to edit
  const canEdit = React.useMemo(() => {
    if (!currentUserEmail) return true; // fallback if no auth session
    
    const emailPrefix = currentUserEmail.split('@')[0].toLowerCase(); // e.g. "hector.chinchilla"
    const creatorText = (tarjeta.detectada_por || '').toLowerCase(); // e.g. "Hector José Chinchilla Trigos"
    const createdByEmail = (tarjeta.created_by || '').toLowerCase();

    // Check by email
    if (createdByEmail && createdByEmail === currentUserEmail.toLowerCase()) return true;

    // Check if name parts match email parts
    const nameParts = emailPrefix.split(/[._-]/); // ["hector", "chinchilla"]
    const matchesName = nameParts.some(part => part.length > 2 && creatorText.includes(part));

    // Special admin emails always have edit permission
    const ADMIN_EMAILS = [
      'hector.chinchilla@firplak.com',
      'coordinacioncalidad@firplak.com',
      'estiven.londono@firplak.com',
      'mantenimiento@firplak.com'
    ];
    if (ADMIN_EMAILS.includes(currentUserEmail.toLowerCase())) return true;

    return matchesName;
  }, [tarjeta, currentUserEmail]);

  // Voice recognition stop
  const handleStopVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    setIsListening(false);
  };

  // Voice recognition toggle
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta dictado por voz.');
      return;
    }

    if (isListening) {
      handleStopVoice();
      return;
    }

    const initialText = editData.descripcion_que || '';
    initialTextRef.current = initialText;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            sessionTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (sessionTranscript.trim()) {
          const base = initialTextRef.current.trim();
          const cleanSession = sessionTranscript.trim();
          setEditData(prev => ({
            ...prev,
            descripcion_que: base ? `${base} ${cleanSession}` : cleanSession
          }));
        }
      };
      recognition.onerror = () => handleStopVoice();
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      handleStopVoice();
    }
  };

  // Photo handlers: Direct Attach & Direct Camera Capture (unconditional OR, max 2)
  const handleDirectFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentFotos = editData.fotos || [];
    const availableSlots = Math.max(0, 2 - currentFotos.length);

    if (availableSlots <= 0) {
      alert('Ya has alcanzado el límite máximo de 2 fotos. Puedes eliminar una si deseas cambiarla.');
      e.target.value = '';
      return;
    }

    const filesToRead = Array.from(files).slice(0, availableSlots);
    const readPromises = filesToRead.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newImages => {
      setEditData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...newImages].slice(0, 2)
      }));
    });

    e.target.value = '';
  };

  const handleCameraCapture = (dataUrl: string) => {
    setShowLiveCamera(false);
    setEditData(prev => ({
      ...prev,
      fotos: [...(prev.fotos || []), dataUrl].slice(0, 2)
    }));
  };

  const handleSaveAnnotatedPhoto = (annotatedDataUrl: string) => {
    if (annotatingImage?.index !== undefined) {
      setEditData(prev => ({
        ...prev,
        fotos: (prev.fotos || []).map((f, i) => i === annotatingImage.index ? annotatedDataUrl : f)
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), annotatedDataUrl].slice(0, 2)
      }));
    }
    setAnnotatingImage(null);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      handleStopVoice();
      await onUpdateTarjeta(editData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error guardando cambios:', err);
      alert('Error guardando cambios.');
    } finally {
      setSaving(false);
    }
  };

  const renderColorBadge = (color: TpmColor) => {
    switch (color) {
      case 'roja':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            🔴 Roja · Mantenimiento Especializado
          </span>
        );
      case 'azul':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            🔵 Azul · Mantenimiento Autónomo
          </span>
        );
      case 'amarilla':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            🟡 Amarilla · Seguridad y 5S
          </span>
        );
      case 'verde':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            🟢 Verde · Mejora Kaizen
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 pt-20 pb-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#e2ded5] max-h-[90vh] overflow-y-auto flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-3 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-mono font-bold text-xs">
              {tarjeta.codigo}
            </span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#324354] leading-tight truncate">
                Detalle de Tarjeta de Anomalía
              </h3>
              <p className="text-[11px] text-gray-500">
                Registrada el {tarjeta.fecha_apertura}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Permission Badge / Edit Button */}
            {canEdit ? (
              !isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Editar Tarjeta</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              )
            ) : (
              <div 
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-xl text-[11px] font-medium border border-gray-200"
                title={`Solo ${tarjeta.detectada_por} puede editar este registro`}
              >
                <Lock className="w-3 h-3 text-gray-400" />
                <span>Solo Lectura</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                handleStopVoice();
                onClose();
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 font-sans">
          
          {/* Status and Color Banner */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[#F6F3EE] p-3 rounded-2xl border border-[#e2ded5]">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <select
                  value={editData.tipo_tarjeta}
                  onChange={(e) => setEditData(prev => ({ ...prev, tipo_tarjeta: e.target.value as any }))}
                  className="px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
                >
                  <option value="roja">🔴 Roja (Mantenimiento)</option>
                  <option value="azul">🔵 Azul (Autónomo)</option>
                  <option value="amarilla">🟡 Amarilla (Seguridad/5S)</option>
                  <option value="verde">🟢 Verde (Mejora Kaizen)</option>
                </select>
              ) : (
                renderColorBadge(tarjeta.tipo_tarjeta)
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Estado:</span>
              <span 
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                  (isEditing ? editData.estado : tarjeta.estado) === 'cerrada' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  (isEditing ? editData.estado : tarjeta.estado) === 'en_proceso' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-rose-50 text-rose-800 border-rose-200'
                }`}
                title="El estado se actualiza únicamente desde la Orden de Mantenimiento Correctivo"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  (isEditing ? editData.estado : tarjeta.estado) === 'cerrada' ? 'bg-emerald-500' :
                  (isEditing ? editData.estado : tarjeta.estado) === 'en_proceso' ? 'bg-amber-500' :
                  'bg-rose-500'
                }`}></span>
                {(isEditing ? editData.estado : tarjeta.estado) === 'cerrada' ? 'Cerrada' : (isEditing ? editData.estado : tarjeta.estado) === 'en_proceso' ? 'En Proceso' : 'Abierta'}
              </span>
            </div>
          </div>

          {/* Machine, Plant, Priority and Author Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Máquinas y Equipos */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#7B8E90]" />
                Máquina o Equipo
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.maquina}
                  onChange={(e) => setEditData(prev => ({ ...prev, maquina: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
                />
              ) : (
                <span className="text-xs font-bold text-[#324354]">{tarjeta.maquina}</span>
              )}
            </div>

            {/* Planta */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#7B8E90]" />
                Planta
              </span>
              {isEditing ? (
                <select
                  value={editData.planta}
                  onChange={(e) => setEditData(prev => ({ ...prev, planta: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
                >
                  {plantasNomenclatura.map(p => (
                    <option key={p.codigo} value={p.nombre_oficial}>{p.nombre_oficial}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-[#324354]">{tarjeta.planta}</span>
              )}
            </div>

            {/* Persona que Reporta */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#7B8E90]" />
                Reportado Por
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#324354] break-words">
                  {tarjeta.detectada_por}
                </span>
                {canEdit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    ✓ Autorizado para editar
                  </span>
                )}
              </div>
            </div>

            {/* Prioridad */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#7B8E90]" />
                Prioridad
              </span>
              {isEditing ? (
                <select
                  value={editData.prioridad}
                  onChange={(e) => setEditData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#324354]"
                >
                  <option value="Alta">🚨 Alta (Crítica)</option>
                  <option value="Media">⚠️ Media</option>
                  <option value="Baja">ℹ️ Baja</option>
                </select>
              ) : (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold w-fit ${
                  tarjeta.prioridad === 'Alta' ? 'bg-rose-100 text-rose-800' :
                  tarjeta.prioridad === 'Media' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {tarjeta.prioridad}
                </span>
              )}
            </div>

            {/* Destino */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#7B8E90]" />
                Destino en Mantenimiento
              </span>
              <span className="text-xs font-bold text-[#324354]">
                Mantenimiento Correctivo
              </span>
            </div>

          </div>

          {/* Descripción de la Anomalía / Síntoma */}
          <div className="p-4 bg-white rounded-2xl border border-[#e2ded5] shadow-2xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
                Descripción de la Avería / Síntoma
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Parar Micrófono</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-rose-600" />
                      <span>Dictar por Voz</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editData.descripcion_que}
                onChange={(e) => setEditData(prev => ({ ...prev, descripcion_que: e.target.value }))}
                rows={3}
                className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs text-[#324354] focus:outline-none"
              />
            ) : (
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed bg-[#F6F3EE] p-3 rounded-xl">
                {tarjeta.descripcion_que}
              </p>
            )}
          </div>

          {/* Acción / Solución Registrada */}
          <div className="p-4 bg-white rounded-2xl border border-[#e2ded5] shadow-2xs flex flex-col gap-2">
            <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">
              Acción / Solución Realizada
            </span>
            {isEditing ? (
              <textarea
                value={editData.accion_inmediata || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, accion_inmediata: e.target.value }))}
                placeholder="Escribe la solución ejecutada o notas de mitigación..."
                rows={2}
                className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-xs text-[#324354] focus:outline-none"
              />
            ) : (
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed bg-[#F6F3EE] p-3 rounded-xl">
                {tarjeta.accion_inmediata || 'Sin registrar acción correctiva aún.'}
              </p>
            )}
          </div>

          {/* Evidencia Fotográfica */}
          <div className="p-4 bg-white rounded-2xl border border-[#e2ded5] shadow-2xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#7B8E90]" />
                Evidencia Fotográfica ({isEditing ? `${editData.fotos?.length || 0}/2` : `${tarjeta.fotos?.length || 0}`})
              </span>

              {isEditing && (editData.fotos?.length || 0) < 2 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowLiveCamera(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#324354] text-white font-bold rounded-lg text-xs cursor-pointer hover:bg-[#324354]/90 shadow-xs active:scale-95 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tomar Foto</span>
                  </button>
                  <label className="relative flex items-center gap-1 px-2.5 py-1.5 bg-white text-[#324354] font-bold rounded-lg text-xs cursor-pointer hover:bg-gray-100 border border-gray-300 shadow-xs active:scale-95 transition-all select-none overflow-hidden">
                    <ImageIcon className="w-3.5 h-3.5 text-[#7B8E90]" />
                    <span>Adjuntar</span>
                    <input
                      type="file"
                      accept="image/*,.png,.jpg,.jpeg,.webp"
                      multiple
                      onChange={handleDirectFileAttach}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Adjuntar foto"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Photos List */}
            {((isEditing ? editData.fotos : tarjeta.fotos) || []).length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {(isEditing ? editData.fotos : tarjeta.fotos)!.map((foto, idx) => (
                  <div key={idx} className="relative group bg-[#F6F3EE] p-2 rounded-2xl border border-gray-200 flex flex-col gap-2">
                    <div 
                      onClick={() => onOpenPhotoPreview(foto)}
                      className="relative w-full h-40 rounded-xl overflow-hidden cursor-pointer shadow-xs border border-gray-200"
                    >
                      <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute bottom-1 left-1 bg-[#324354]/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Foto {idx + 1}
                      </span>
                    </div>

                    {isEditing && (
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setAnnotatingImage({ src: foto, index: idx })}
                          className="flex-1 py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10.5px] border border-rose-200 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Señalar en Rojo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditData(prev => ({
                              ...prev,
                              fotos: (prev.fotos || []).filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg cursor-pointer"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic bg-[#F6F3EE] p-3 rounded-xl text-center">
                Sin evidencia fotográfica adjuntada.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0 rounded-b-3xl">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  handleStopVoice();
                  setIsEditing(false);
                  setEditData({ ...tarjeta });
                }}
                disabled={saving}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Descartar Edición
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Guardando...' : 'Guardar y Cerrar'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                handleStopVoice();
                onClose();
              }}
              className="w-full py-2 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer"
            >
              Cerrar Detalle
            </button>
          )}
        </div>

      </div>

      {/* Live Camera Modal */}
      <LiveCameraModal
        isOpen={showLiveCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowLiveCamera(false)}
      />

      {/* Embedded Photo Annotation Editor */}
      {annotatingImage && (
        <PhotoAnnotationEditor
          imageSrc={annotatingImage.src}
          onSave={handleSaveAnnotatedPhoto}
          onCancel={() => setAnnotatingImage(null)}
        />
      )}
    </div>
  );
}
