'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, Loader2, PenTool, Plus, Save, Star, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PhotoAnnotationEditor from '@/components/mantenimiento/PhotoAnnotationEditor';
import LiveCameraModal from '@/components/mantenimiento/LiveCameraModal';
import type { Defecto as CriterioCalidad } from '@/components/calidad/DefectModal';

const MAX_FOTOS = 5;
const STORAGE_BUCKET = 'fichas-media';

export const getCriterioFotos = (c: CriterioCalidad | null | undefined): string[] => {
  if (!c) return [];
  if (Array.isArray(c.fotos) && c.fotos.length > 0) return c.fotos.filter(Boolean).slice(0, MAX_FOTOS);
  return c.foto ? [c.foto] : [];
};

// Sube una imagen (archivo o dataURL) a Storage; si falla, conserva el base64 como en mantenimiento
async function subirFoto(fuente: File | string, planta: string, codigo: string): Promise<string> {
  const blob = typeof fuente === 'string' ? await (await fetch(fuente)).blob() : fuente;
  const ext = typeof fuente === 'string' ? 'jpg' : (fuente.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `criterios-calidad/${planta}/${codigo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: true
  });

  if (!error) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    if (data?.publicUrl) return data.publicUrl;
  }
  console.warn('Error subiendo foto de criterio a Storage, usando base64:', error);
  if (typeof fuente === 'string') return fuente;
  return await new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(fuente);
  });
}

interface CriterioEditModalProps {
  isOpen: boolean;
  planta: string;
  codigo: string; // número visible del defecto
  idDefectoMs?: number | null; // id interno en ms_defectos (vínculo con los registros diarios)
  nombreDefecto: string;
  criterio: CriterioCalidad | null; // null = el defecto aún no tiene criterio (se crea)
  onClose: () => void;
  onSaved: (criterio: CriterioCalidad) => void;
}

// Edición de un criterio de calidad con hasta 5 fotos (mismo flujo del formulario de máquinas)
export default function CriterioEditModal({
  isOpen,
  planta,
  codigo,
  idDefectoMs,
  nombreDefecto,
  criterio,
  onClose,
  onSaved
}: CriterioEditModalProps) {
  const [form, setForm] = useState({
    responsable: '',
    detectarlo: '',
    evitarlo: '',
    rojo: '',
    naranja: '',
    amarillo: '',
    verde: ''
  });
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [annotatingIdx, setAnnotatingIdx] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      responsable: criterio?.responsable || '',
      detectarlo: criterio?.detectarlo || '',
      evitarlo: criterio?.evitarlo || '',
      rojo: criterio?.rojo || '',
      naranja: criterio?.naranja || '',
      amarillo: criterio?.amarillo || '',
      verde: criterio?.verde || ''
    });
    setFotos(getCriterioFotos(criterio));
    setError(null);
  }, [isOpen, criterio]);

  if (!isOpen) return null;

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    const disponibles = MAX_FOTOS - fotos.length;
    if (files.length === 0 || disponibles <= 0) return;
    if (files.length > disponibles) alert(`Solo se agregarán ${disponibles} foto(s): el máximo es ${MAX_FOTOS}.`);

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, disponibles)) {
        if (file.size > 15 * 1024 * 1024) {
          alert(`La imagen "${file.name}" supera el máximo de 15MB.`);
          continue;
        }
        urls.push(await subirFoto(file, planta, codigo));
      }
      setFotos(prev => [...prev, ...urls].slice(0, MAX_FOTOS));
    } finally {
      setUploading(false);
    }
  };

  const handleCapture = async (dataUrl: string) => {
    setShowCamera(false);
    if (fotos.length >= MAX_FOTOS) return;
    setUploading(true);
    try {
      const url = await subirFoto(dataUrl, planta, codigo);
      setFotos(prev => [...prev, url].slice(0, MAX_FOTOS));
    } finally {
      setUploading(false);
    }
  };

  const handleAnnotated = async (dataUrl: string) => {
    const idx = annotatingIdx;
    setAnnotatingIdx(null);
    if (idx === null) return;
    setUploading(true);
    try {
      const url = await subirFoto(dataUrl, planta, codigo);
      setFotos(prev => prev.map((f, i) => (i === idx ? url : f)));
    } finally {
      setUploading(false);
    }
  };

  const setPrincipal = (idx: number) =>
    setFotos(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)]);

  const removeFoto = (idx: number) => setFotos(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const clean = (v: string) => v.trim() || null;
    const payload = {
      responsable: clean(form.responsable),
      detectarlo: clean(form.detectarlo),
      evitarlo: clean(form.evitarlo),
      rojo: clean(form.rojo),
      naranja: clean(form.naranja),
      amarillo: clean(form.amarillo),
      verde: clean(form.verde),
      fotos,
      foto: fotos[0] || null
    };

    try {
      const query = criterio?.id
        ? supabase.from('criterios_calidad_plantas').update(payload).eq('id', criterio.id).select().single()
        : supabase
            .from('criterios_calidad_plantas')
            .insert({ ...payload, planta, codigo, defecto: nombreDefecto, ...(idDefectoMs != null ? { id_defecto_ms: idDefectoMs } : {}) })
            .select()
            .single();

      const { data, error: saveErr } = await query;
      if (saveErr) {
        // Columna `fotos` inexistente: falta ejecutar criterios_fotos.sql
        if (saveErr.code === 'PGRST204' || saveErr.code === '42703' || /fotos/i.test(saveErr.message)) {
          throw new Error('La base de datos aún no admite varias fotos. Ejecuta el script criterios_fotos.sql en Supabase.');
        }
        throw saveErr;
      }
      onSaved(data as CriterioCalidad);
      onClose();
    } catch (err: any) {
      console.warn('Error guardando criterio de calidad:', err);
      setError(err?.message || 'No se pudo guardar el criterio.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#324354] font-semibold outline-none focus:border-[#324354] focus:ring-1 focus:ring-[#324354]/30 transition-all';
  const labelCls = 'text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1';

  const zonas: { key: 'rojo' | 'naranja' | 'amarillo' | 'verde'; label: string; cls: string }[] = [
    { key: 'rojo', label: 'Zona Roja', cls: 'border-red-500 bg-red-50/60' },
    { key: 'naranja', label: 'Zona Naranja', cls: 'border-amber-500 bg-amber-50/60' },
    { key: 'amarillo', label: 'Zona Amarilla', cls: 'border-yellow-500 bg-yellow-50/60' },
    { key: 'verde', label: 'Zona Verde', cls: 'border-emerald-500 bg-emerald-50/60' }
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-[#e2ded5] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-[#e2ded5] flex items-start justify-between gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <span className="self-start px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
              {criterio ? '✏️ Edición de Criterio' : '+ Nuevo Criterio'}
            </span>
            <h3 className="text-xl font-bold text-[#324354]">
              {codigo}. {nombreDefecto}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFiles} className="hidden" />

        {/* Body */}
        <div className="px-6 py-5 sm:px-8 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Fotografías */}
          <div className="p-4 bg-[#F6F3EE] rounded-2xl border border-gray-200 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3">
              <Camera className="w-4 h-4 text-[#324354]" />
              <span className="text-xs font-bold text-[#324354] uppercase tracking-wider">Fotografías del Defecto</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  fotos.length >= MAX_FOTOS
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : fotos.length > 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {fotos.length}/{MAX_FOTOS} fotos
              </span>
            </div>

            <p className="text-xs text-gray-500 -mt-1">
              Adjunta o toma hasta 5 fotografías. La primera es la <strong>foto principal</strong>. Pasa el cursor (o toca) una foto para anotarla, marcarla como principal o eliminarla.
            </p>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || fotos.length >= MAX_FOTOS}
                className="px-3.5 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Seleccionar fotos desde el computador, celular o tablet"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{uploading ? 'Subiendo foto...' : 'Adjuntar Foto'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={uploading || fotos.length >= MAX_FOTOS}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Tomar foto con la cámara (en vivo o la nativa del celular/tablet)"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Tomar Foto</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {fotos.map((url, idx) => (
                <div
                  key={`${idx}-${url.slice(-24)}`}
                  className={`relative group rounded-xl overflow-hidden border-2 bg-white h-24 ${
                    idx === 0 ? 'border-[#324354] shadow-xs' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-[#324354] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                      <span>Principal</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                    <button type="button" onClick={() => setZoomImage(url)} className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg" title="Ver / Ampliar">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setAnnotatingIdx(idx)} className="p-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg" title="Anotar / marcar el defecto">
                      <PenTool className="w-3.5 h-3.5" />
                    </button>
                    {idx > 0 && (
                      <button type="button" onClick={() => setPrincipal(idx)} className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg" title="Definir como foto principal">
                        <Star className="w-3.5 h-3.5 fill-slate-950" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeFoto(idx)} className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg" title="Eliminar foto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-24 rounded-xl bg-white/60 hover:bg-white border-2 border-dashed border-gray-300 hover:border-[#324354] flex flex-col items-center justify-center text-gray-400 hover:text-[#324354] transition-all"
                >
                  <Plus className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold">Agregar foto</span>
                </button>
              )}
            </div>
          </div>

          {/* Información técnica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Responsable de la causa</label>
              <input type="text" value={form.responsable} onChange={setField('responsable')} className={inputCls} placeholder="Ej. PINTURA, PRENSADO" />
            </div>
            <div>
              <label className={labelCls}>¿Cómo detectarlo?</label>
              <textarea rows={2} value={form.detectarlo} onChange={setField('detectarlo')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>¿Cómo evitarlo / acción correctiva?</label>
              <textarea rows={2} value={form.evitarlo} onChange={setField('evitarlo')} className={inputCls} />
            </div>
          </div>

          <div>
            <span className="text-xs font-black text-[#324354] uppercase tracking-wider block mb-2">Máximo permitido por zona</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {zonas.map(z => (
                <div key={z.key} className={`p-2.5 border-l-4 rounded-xl ${z.cls}`}>
                  <label className={labelCls}>{z.label}</label>
                  <textarea rows={2} value={form[z.key]} onChange={setField(z.key)} className={inputCls} placeholder="N/A" />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 sm:px-8 border-t border-[#e2ded5] bg-[#F6F3EE] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-5 py-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Guardando...' : 'Guardar Criterio'}</span>
          </button>
        </div>
      </div>

      {showCamera && <LiveCameraModal isOpen={showCamera} onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {annotatingIdx !== null && fotos[annotatingIdx] && (
        <PhotoAnnotationEditor imageSrc={fotos[annotatingIdx]} onSave={handleAnnotated} onCancel={() => setAnnotatingIdx(null)} />
      )}

      {zoomImage && (
        <div className="fixed inset-0 z-[10050] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="Foto del defecto" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
