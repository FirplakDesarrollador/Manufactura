'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, Loader2, Maximize2, PenTool, Pencil, Plus, Save, Star, Trash2, Upload, X } from 'lucide-react';
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

type CampoTexto = 'responsable' | 'detectarlo' | 'evitarlo' | 'rojo' | 'naranja' | 'amarillo' | 'verde';

const ZONAS: { key: 'rojo' | 'naranja' | 'amarillo' | 'verde'; label: string; cls: string; txt: string }[] = [
  { key: 'rojo', label: 'Zona Roja', cls: 'bg-red-50/70 border-red-500 text-red-700', txt: 'text-red-950' },
  { key: 'naranja', label: 'Zona Naranja', cls: 'bg-amber-50/70 border-amber-500 text-amber-700', txt: 'text-amber-950' },
  { key: 'amarillo', label: 'Zona Amarilla', cls: 'bg-yellow-50/70 border-yellow-500 text-yellow-700', txt: 'text-yellow-950' },
  { key: 'verde', label: 'Zona Verde', cls: 'bg-emerald-50/70 border-emerald-500 text-emerald-700', txt: 'text-emerald-950' }
];

interface CriterioDetallePanelProps {
  planta: string;
  plantaNombre: string;
  numero: number; // número visible del defecto
  idDefectoMs?: number | null; // id interno en ms_defectos (vínculo con los registros diarios)
  nombreDefecto: string;
  criterio: CriterioCalidad | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (criterio: CriterioCalidad) => void;
  onZoom: (url: string) => void;
}

// Detalle de un criterio de calidad. El modo edición usa el mismo diseño del modo consulta,
// con los campos editables y las herramientas de fotos (adjuntar, tomar, anotar, principal, eliminar).
export default function CriterioDetallePanel({
  planta,
  plantaNombre,
  numero,
  idDefectoMs,
  nombreDefecto,
  criterio,
  canEdit,
  onClose,
  onSaved,
  onZoom
}: CriterioDetallePanelProps) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<CampoTexto, string>>({ responsable: '', detectarlo: '', evitarlo: '', rojo: '', naranja: '', amarillo: '', verde: '' });
  const [fotos, setFotos] = useState<string[]>(getCriterioFotos(criterio));
  const [fotoIdx, setFotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [annotatingIdx, setAnnotatingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Al cambiar de criterio (o tras guardar) se vuelve a la vista de consulta con sus datos
  useEffect(() => {
    setFotos(getCriterioFotos(criterio));
    setFotoIdx(0);
    setEditando(false);
    setError(null);
  }, [criterio]);

  const iniciarEdicion = () => {
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
    setFotoIdx(0);
    setError(null);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setFotos(getCriterioFotos(criterio));
    setFotoIdx(0);
    setError(null);
    setEditando(false);
  };

  const setField = (key: CampoTexto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
        urls.push(await subirFoto(file, planta, String(numero)));
      }
      setFotos(prev => {
        const next = [...prev, ...urls].slice(0, MAX_FOTOS);
        setFotoIdx(next.length - 1);
        return next;
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCapture = async (dataUrl: string) => {
    setShowCamera(false);
    if (fotos.length >= MAX_FOTOS) return;
    setUploading(true);
    try {
      const url = await subirFoto(dataUrl, planta, String(numero));
      setFotos(prev => {
        const next = [...prev, url].slice(0, MAX_FOTOS);
        setFotoIdx(next.length - 1);
        return next;
      });
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
      const url = await subirFoto(dataUrl, planta, String(numero));
      setFotos(prev => prev.map((f, i) => (i === idx ? url : f)));
    } finally {
      setUploading(false);
    }
  };

  const setPrincipal = (idx: number) => {
    setFotos(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)]);
    setFotoIdx(0);
  };

  const removeFoto = (idx: number) => {
    setFotos(prev => prev.filter((_, i) => i !== idx));
    setFotoIdx(0);
  };

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
            .insert({ ...payload, planta, codigo: String(numero), defecto: nombreDefecto, ...(idDefectoMs != null ? { id_defecto_ms: idDefectoMs } : {}) })
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
    } catch (err: any) {
      console.warn('Error guardando criterio de calidad:', err);
      setError(err?.message || 'No se pudo guardar el criterio.');
    } finally {
      setSaving(false);
    }
  };

  const fotoActual = fotos[Math.min(fotoIdx, fotos.length - 1)];
  const c = criterio;
  const editInput =
    'w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-[#324354] outline-none focus:border-[#324354] focus:ring-2 focus:ring-amber-200 transition-all';

  return (
    <div className={`col-span-full bg-white rounded-2xl p-5 border-2 shadow-xl my-1 transition-colors ${editando ? 'border-amber-500 ring-4 ring-amber-100' : 'border-[#324354]'}`}>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-[#324354] bg-[#324354]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Defecto {numero} • {plantaNombre}
            </span>
            {editando && (
              <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                <Pencil size={12} /> Modo edición
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-[#324354] mt-2">{nombreDefecto}</h3>
        </div>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button
                onClick={cancelarEdicion}
                disabled={saving}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#324354] text-xs font-bold rounded-xl transition flex items-center gap-1 disabled:opacity-50"
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Guardando…' : 'Guardar Criterio'}</span>
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  onClick={iniciarEdicion}
                  className="px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Pencil size={14} />
                  <span>{c ? 'Editar Criterio' : 'Crear Criterio'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#324354] text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <X size={14} />
                <span>Cerrar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="mt-3 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

      {!c && !editando ? (
        <p className="text-sm text-slate-500 font-medium py-6 text-center">
          Este defecto aún no tiene criterio de calidad registrado.
          {canEdit ? ' Usa "Crear Criterio" para registrarlo.' : ''}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
          {/* Fotos */}
          <div className="lg:col-span-4 space-y-2">
            <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFiles} className="hidden" />

            <div
              onClick={() => fotoActual && onZoom(fotoActual)}
              className={`w-full h-56 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative ${
                fotoActual ? 'cursor-zoom-in bg-slate-900' : 'bg-slate-50'
              }`}
            >
              {fotoActual ? (
                <>
                  <img src={fotoActual} alt={nombreDefecto} className="w-full h-full object-contain" />
                  {editando && fotos[0] === fotoActual && (
                    <div className="absolute top-2 left-2 bg-[#324354] text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Principal
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Maximize2 size={12} />
                    <span>Ampliar</span>
                  </div>
                </>
              ) : editando ? (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#324354]"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold">Agregar foto</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-slate-400">Sin imagen ilustrativa</span>
              )}
            </div>

            {/* Miniaturas: en edición incluyen las acciones sobre cada foto */}
            {(fotos.length > 1 || (editando && fotos.length > 0)) && (
              <div className="grid grid-cols-5 gap-1.5">
                {fotos.map((f, idx) => (
                  <div
                    key={`${idx}-${f.slice(-24)}`}
                    className={`relative group h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${
                      f === fotoActual ? 'border-[#324354]' : 'border-slate-200 hover:border-slate-400'
                    }`}
                    onClick={() => setFotoIdx(idx)}
                  >
                    <img src={f} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    {editando && idx === 0 && (
                      <Star className="absolute top-0.5 left-0.5 w-3 h-3 fill-amber-300 text-amber-300 drop-shadow" />
                    )}
                  </div>
                ))}
                {editando && fotos.length < MAX_FOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-12 rounded-lg border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 flex items-center justify-center"
                    title="Agregar foto"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}

            {editando && (
              <div className="space-y-2 p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">Fotografías</span>
                  <span className="text-[10px] font-bold text-amber-800">{fotos.length}/{MAX_FOTOS}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || fotos.length >= MAX_FOTOS}
                    className="px-2 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Seleccionar fotos desde el computador, celular o tablet"
                  >
                    <Upload className="w-3.5 h-3.5" /> Adjuntar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={uploading || fotos.length >= MAX_FOTOS}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Tomar foto con la cámara"
                  >
                    <Camera className="w-3.5 h-3.5" /> Tomar foto
                  </button>
                </div>
                {fotoActual && (
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-amber-200">
                    <button type="button" onClick={() => onZoom(fotoActual)} className="py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center justify-center" title="Ver / Ampliar">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setAnnotatingIdx(fotos.indexOf(fotoActual))} className="py-1 bg-sky-500 hover:bg-sky-400 text-white rounded-lg flex items-center justify-center" title="Anotar / marcar el defecto">
                      <PenTool className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrincipal(fotos.indexOf(fotoActual))}
                      disabled={fotos[0] === fotoActual}
                      className="py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg flex items-center justify-center disabled:opacity-40"
                      title="Definir como foto principal"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeFoto(fotos.indexOf(fotoActual))} className="py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center justify-center" title="Eliminar foto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Información técnica y zonas: mismas cajas; en edición con campos */}
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 border rounded-xl space-y-1 ${editando ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Responsable de la causa</span>
                {editando ? (
                  <textarea rows={2} value={form.responsable} onChange={setField('responsable')} placeholder="Ej. PINTURA, PRENSADO" className={`${editInput} text-sm font-bold resize-y`} />
                ) : (
                  <span className="text-sm font-bold text-[#324354] whitespace-pre-line">{c?.responsable || 'No especificado'}</span>
                )}
              </div>
              <div className={`p-3 border rounded-xl space-y-1 ${editando ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo detectarlo?</span>
                {editando ? (
                  <textarea rows={2} value={form.detectarlo} onChange={setField('detectarlo')} className={`${editInput} text-xs font-semibold leading-relaxed resize-y`} />
                ) : (
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{c?.detectarlo || 'No especificado'}</p>
                )}
              </div>
            </div>

            <div className={`p-3 border rounded-xl space-y-1 ${editando ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo evitarlo / acción correctiva?</span>
              {editando ? (
                <textarea rows={2} value={form.evitarlo} onChange={setField('evitarlo')} className={`${editInput} text-xs font-semibold leading-relaxed resize-y`} />
              ) : (
                <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{c?.evitarlo || 'No especificado'}</p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-[#324354] uppercase tracking-wider block">Máximo permitido por zona</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ZONAS.map(z => (
                  <div key={z.key} className={`p-3 border-l-4 rounded-xl space-y-0.5 ${z.cls}`}>
                    <span className="text-[10px] font-black uppercase">{z.label}</span>
                    {editando ? (
                      <input type="text" value={form[z.key]} onChange={setField(z.key)} placeholder="N/A" className={`${editInput} text-xs font-bold`} />
                    ) : (
                      <p className={`text-xs font-bold whitespace-pre-line ${z.txt}`}>{c?.[z.key] || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCamera && <LiveCameraModal isOpen={showCamera} onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {annotatingIdx !== null && fotos[annotatingIdx] && (
        <PhotoAnnotationEditor imageSrc={fotos[annotatingIdx]} onSave={handleAnnotated} onCancel={() => setAnnotatingIdx(null)} />
      )}
    </div>
  );
}
