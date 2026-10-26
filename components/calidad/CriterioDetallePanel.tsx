'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Camera, Eye, Info, Loader2, Maximize2, PenTool, Pencil, Plus, Save, Star, Trash2, TrendingDown, TrendingUp, Upload, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '@/lib/supabase';
import type { EstadisticaDefectoMs } from '@/lib/calidad/msCalidad';
import PhotoAnnotationEditor from '@/components/mantenimiento/PhotoAnnotationEditor';
import LiveCameraModal from '@/components/mantenimiento/LiveCameraModal';
import type { CriterioCalidad } from '@/lib/calidad/criterios';

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

type CampoTexto = 'responsable' | 'detectarlo' | 'evitarlo' | 'rojo' | 'naranja' | 'amarillo' | 'verde' | 'pct_max_dia';

const ZONAS: { key: 'rojo' | 'naranja' | 'amarillo' | 'verde'; label: string; cls: string; txt: string }[] = [
  { key: 'rojo', label: 'Zona Roja', cls: 'bg-red-50/70 border-red-500 text-red-700', txt: 'text-red-950' },
  { key: 'naranja', label: 'Zona Naranja', cls: 'bg-amber-50/70 border-amber-500 text-amber-700', txt: 'text-amber-950' },
  { key: 'amarillo', label: 'Zona Amarilla', cls: 'bg-yellow-50/70 border-yellow-500 text-yellow-700', txt: 'text-yellow-950' },
  { key: 'verde', label: 'Zona Verde', cls: 'bg-emerald-50/70 border-emerald-500 text-emerald-700', txt: 'text-emerald-950' }
];

// Láminas de acabado por zonas críticas (solo Mármol Sintético). Fuente: PDF de Calidad en /public
const ZONAS_CRITICAS_MS = [
  { src: '/calidad/zonas-criticas/lavamanos-1.jpg', mini: '/calidad/zonas-criticas/lavamanos-1-mini.jpg', label: 'Lavamanos' },
  { src: '/calidad/zonas-criticas/lavamanos-2.jpg', mini: '/calidad/zonas-criticas/lavamanos-2-mini.jpg', label: 'Lavamanos (ovalado)' },
  { src: '/calidad/zonas-criticas/lavarropas.jpg', mini: '/calidad/zonas-criticas/lavarropas-mini.jpg', label: 'Lavarropas' }
];

const TEXTO_ESCALAMIENTO_QRR =
  'Si el porcentaje de piezas con este defecto supera este valor 3 días seguidos, el tema sube de nivel y se abre el tratamiento de problemas en QRR.';

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
  // Estadísticas históricas del defecto en los registros diarios (ms_reporte_defectos)
  estadistica?: EstadisticaDefectoMs | null;
  estadisticasInfo?: { desde: string | null; hasta: string | null; diasProduccion: number } | null;
  estadisticasLoading?: boolean;
  estadisticasError?: string | null;
  // Configuración del registro en línea (tabla ms_defectos): alarmas y requisitos al registrar
  configRegistro?: ConfigRegistroMs | null;
  canConfig?: boolean;
  onConfigSaved?: (config: ConfigRegistroMs) => void;
  // Plantas sin catálogo propio: código y nombre se editan aquí; se puede eliminar el criterio
  editarIdentidad?: boolean;
  onDelete?: () => Promise<void> | void;
  mostrarEstadisticas?: boolean;
  iniciarEditando?: boolean; // defecto nuevo: abre directo en modo edición
}

export interface ConfigRegistroMs {
  Al_amarilla?: number | null;
  Al_azul?: number | null;
  Al_roja?: number | null;
  Requiere_Foto?: boolean | null;
  Requiere_Referencia_Molde?: boolean | null;
}

const ALARMAS: { key: 'Al_amarilla' | 'Al_azul' | 'Al_roja'; label: string; cls: string; txt: string }[] = [
  { key: 'Al_amarilla', label: 'Alarma amarilla', cls: 'bg-yellow-50/70 border-yellow-500 text-yellow-700', txt: 'text-yellow-950' },
  { key: 'Al_azul', label: 'Alarma azul', cls: 'bg-blue-50/70 border-blue-500 text-blue-700', txt: 'text-blue-950' },
  { key: 'Al_roja', label: 'Alarma roja', cls: 'bg-red-50/70 border-red-500 text-red-700', txt: 'text-red-950' }
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtFecha = (f: string | null | undefined) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '—');
const fmtNum = (v: number, d = 2) => v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

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
  onZoom,
  estadistica,
  estadisticasInfo,
  estadisticasLoading = false,
  estadisticasError = null,
  configRegistro = null,
  canConfig = false,
  onConfigSaved,
  editarIdentidad = false,
  onDelete,
  mostrarEstadisticas = true,
  iniciarEditando = false
}: CriterioDetallePanelProps) {
  const [editando, setEditando] = useState(false);
  const [cfgForm, setCfgForm] = useState<ConfigRegistroMs>({});
  // Cada parte se edita con su propio permiso: criterio (Calidad) y configuración (configurar_defectos)
  const editCriterio = editando && canEdit;
  const editConfig = editando && canConfig && idDefectoMs != null;
  const [form, setForm] = useState<Record<CampoTexto, string>>({ responsable: '', detectarlo: '', evitarlo: '', rojo: '', naranja: '', amarillo: '', verde: '', pct_max_dia: '' });
  const [fotos, setFotos] = useState<string[]>(getCriterioFotos(criterio));
  const [fotoIdx, setFotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [annotatingIdx, setAnnotatingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [codigoEdit, setCodigoEdit] = useState(String(numero));
  const [nombreEdit, setNombreEdit] = useState(nombreDefecto);
  const [eliminando, setEliminando] = useState(false);
  const [infoQrr, setInfoQrr] = useState(false);

  // Al cambiar de criterio (o tras guardar) se vuelve a la vista de consulta con sus datos
  useEffect(() => {
    setFotos(getCriterioFotos(criterio));
    setFotoIdx(0);
    setEditando(false);
    setError(null);
  }, [criterio]);

  useEffect(() => {
    if (iniciarEditando) iniciarEdicion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarEditando]);

  // Escape cierra la ventana (solo en consulta, para no perder cambios en edición)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editando && !showCamera && annotatingIdx === null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editando, showCamera, annotatingIdx, onClose]);

  const iniciarEdicion = () => {
    setForm({
      responsable: criterio?.responsable || '',
      detectarlo: criterio?.detectarlo || '',
      evitarlo: criterio?.evitarlo || '',
      rojo: criterio?.rojo || '',
      naranja: criterio?.naranja || '',
      amarillo: criterio?.amarillo || '',
      verde: criterio?.verde || '',
      pct_max_dia: criterio?.pct_max_dia != null ? String(criterio.pct_max_dia) : ''
    });
    setFotos(getCriterioFotos(criterio));
    setFotoIdx(0);
    setError(null);
    setCfgForm({ ...(configRegistro || {}) });
    setCodigoEdit(String(criterio?.codigo ?? numero));
    setNombreEdit(nombreDefecto);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    if (!criterio && iniciarEditando) {
      onClose();
      return;
    }
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
    if (editarIdentidad && canEdit && (!nombreEdit.trim() || !codigoEdit.trim())) {
      setError('El código y el nombre del defecto son obligatorios.');
      setSaving(false);
      return;
    }
    const pctTexto = form.pct_max_dia.trim().replace(',', '.');
    if (canEdit && pctTexto !== '' && (isNaN(Number(pctTexto)) || Number(pctTexto) < 0 || Number(pctTexto) > 100)) {
      setError('El % máximo permitido al día debe ser un número entre 0 y 100.');
      setSaving(false);
      return;
    }
    const identidad = editarIdentidad ?{ codigo: codigoEdit.trim(), defecto: nombreEdit.trim() } : {};
    const payload = {
      responsable: clean(form.responsable),
      detectarlo: clean(form.detectarlo),
      evitarlo: clean(form.evitarlo),
      rojo: clean(form.rojo),
      naranja: clean(form.naranja),
      amarillo: clean(form.amarillo),
      verde: clean(form.verde),
      pct_max_dia: form.pct_max_dia.trim() === '' ? null : Number(form.pct_max_dia.replace(',', '.')),
      fotos,
      foto: fotos[0] || null,
      ...identidad
    };

    try {
      // 1. Configuración del registro en línea (ms_defectos)
      if (editConfig) {
        const cfg: ConfigRegistroMs = {
          Al_amarilla: Number(cfgForm.Al_amarilla) || 0,
          Al_azul: Number(cfgForm.Al_azul) || 0,
          Al_roja: Number(cfgForm.Al_roja) || 0,
          Requiere_Foto: !!cfgForm.Requiere_Foto,
          Requiere_Referencia_Molde: !!cfgForm.Requiere_Referencia_Molde
        };
        const { error: cfgErr } = await supabase.from('ms_defectos').update(cfg).eq('id', idDefectoMs);
        if (cfgErr) throw new Error(`Configuración del registro: ${cfgErr.message}`);
        onConfigSaved?.(cfg);
      }

      // 2. Criterio de calidad (solo con permiso de Calidad)
      if (!canEdit) {
        setEditando(false);
        return;
      }
      const query = criterio?.id
        ? supabase.from('criterios_calidad_plantas').update(payload).eq('id', criterio.id).select().single()
        : supabase
            .from('criterios_calidad_plantas')
            .insert({ planta, codigo: String(numero), defecto: nombreDefecto, ...payload, ...(idDefectoMs != null ? { id_defecto_ms: idDefectoMs } : {}) })
            .select()
            .single();

      const { data, error: saveErr } = await query;
      if (saveErr) {
        // Columna `fotos` inexistente: falta ejecutar criterios_fotos.sql
        if (/pct_max_dia/i.test(saveErr.message)) {
          throw new Error('La base de datos aún no tiene el % máximo permitido al día. Ejecuta el script criterios_pct_max_dia.sql en Supabase.');
        }
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

  // Configuración del registro en línea (alarmas y requisitos al registrar el defecto)
  const cfg = editConfig ? cfgForm : configRegistro || {};
  // % máximo de defecto permitido al día (3 días seguidos por encima → escalamiento a QRR)
  const tarjetaPctMax = (
    <div className={`relative h-full p-3 border rounded-xl space-y-1 ${editCriterio ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">% máximo de defecto permitido al día</span>
        <span className="group shrink-0">
          <button
            type="button"
            onClick={() => setInfoQrr(v => !v)}
            onBlur={() => setInfoQrr(false)}
            className="text-sky-600 hover:text-sky-700"
            aria-label="Información sobre el escalamiento a QRR"
          >
            <Info className="w-4 h-4" />
          </button>
          <span
            className={`absolute left-0 top-9 z-20 w-64 p-2.5 rounded-lg bg-[#254153] text-white text-[11px] font-semibold leading-snug shadow-lg normal-case tracking-normal ${infoQrr ? 'block' : 'hidden group-hover:block'}`}
          >
            {TEXTO_ESCALAMIENTO_QRR}
          </span>
        </span>
      </div>
      {editCriterio ? (
        <div className="flex items-center gap-1.5">
          <input type="text" inputMode="decimal" value={form.pct_max_dia} onChange={setField('pct_max_dia')} placeholder="Ej. 5" className={`${editInput} text-sm font-bold`} />
          <span className="text-sm font-black text-[#324354]">%</span>
        </div>
      ) : (
        <span className={`font-black text-[#324354] block ${c?.pct_max_dia != null ? 'text-2xl' : 'text-base'}`}>
          {c?.pct_max_dia != null ? `${fmtNum(Number(c.pct_max_dia))}%` : 'No definido'}
        </span>
      )}
      <p className="text-[10px] font-semibold text-slate-500 leading-snug">3 días seguidos por encima → se escala a QRR</p>
    </div>
  );

  const seccionConfig = idDefectoMs != null && (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-black text-[#324354] uppercase tracking-wider">Configuración de alarmas en el registro diario de defectos</span>
        <span className="text-[10px] font-bold text-slate-400">La tarjeta cambia de color al llegar a esta cantidad en el día</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {ALARMAS.map(a => (
          <div key={a.key} className={`p-3 border-l-4 rounded-xl space-y-0.5 ${a.cls}`}>
            <span className="text-[10px] font-black uppercase">{a.label}</span>
            {editConfig ? (
              <input
                type="number"
                min={0}
                value={cfgForm[a.key] ?? 0}
                onChange={e => setCfgForm(prev => ({ ...prev, [a.key]: parseInt(e.target.value, 10) || 0 }))}
                className={`${editInput} text-xs font-bold`}
              />
            ) : (
              <p className={`text-xs font-bold ${a.txt}`}>desde {cfg[a.key] ?? 0} en el día</p>
            )}
          </div>
        ))}
        {([
          { key: 'Requiere_Foto', label: 'Requiere foto' },
          { key: 'Requiere_Referencia_Molde', label: 'Referencia de molde' }
        ] as const).map(t => {
          const activo = !!cfg[t.key];
          return (
            <div key={t.key} className={`p-3 rounded-xl border space-y-1 ${editConfig ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-black text-slate-500 uppercase block">{t.label}</span>
              {editConfig ? (
                <button
                  type="button"
                  onClick={() => setCfgForm(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${activo ? 'bg-[#324354]' : 'bg-slate-300'}`}
                  title={activo ? 'Activado' : 'Desactivado'}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              ) : (
                <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-full ${activo ? 'bg-[#324354] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {activo ? 'Sí' : 'No'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !editando) onClose();
      }}
    >
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border-2 shadow-2xl w-full max-w-6xl min-h-[80vh] max-h-[94vh] overflow-y-auto transition-colors ${editando ? 'border-amber-500 ring-4 ring-amber-100' : 'border-[#324354]'}`}>
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
          {editarIdentidad && editCriterio ? (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <input value={codigoEdit} onChange={e => setCodigoEdit(e.target.value)} placeholder="Código" className={`${editInput} w-24 text-sm font-black`} />
              <input value={nombreEdit} onChange={e => setNombreEdit(e.target.value)} placeholder="Nombre del defecto" className={`${editInput} min-w-[240px] flex-1 text-lg font-black`} />
            </div>
          ) : (
            <h3 className="text-xl font-black text-[#324354] mt-2">{nombreDefecto || 'Nuevo defecto'}</h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              {onDelete && canEdit && criterio?.id && (
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar este criterio de calidad? Esta acción no se puede deshacer.')) return;
                    setEliminando(true);
                    try { await onDelete(); } finally { setEliminando(false); }
                  }}
                  disabled={saving || eliminando}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                >
                  {eliminando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Eliminar</span>
                </button>
              )}
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
                <span>{saving ? 'Guardando…' : 'Guardar'}</span>
              </button>
            </>
          ) : (
            <>
              {(canEdit || (canConfig && idDefectoMs != null)) && (
                <button
                  onClick={iniciarEdicion}
                  className="px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Pencil size={14} />
                  <span>{!canEdit ? 'Editar Configuración' : c ? 'Editar Criterio' : 'Crear Criterio'}</span>
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

      {!c && !editCriterio ? (
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
              className={`w-full h-64 lg:h-[340px] rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative ${
                fotoActual ? 'cursor-zoom-in bg-slate-900' : 'bg-slate-50'
              }`}
            >
              {fotoActual ? (
                <>
                  <img src={fotoActual} alt={nombreDefecto} className="w-full h-full object-contain" />
                  {editCriterio && fotos[0] === fotoActual && (
                    <div className="absolute top-2 left-2 bg-[#324354] text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Principal
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Maximize2 size={12} />
                    <span>Ampliar</span>
                  </div>
                </>
              ) : editCriterio ? (
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
            {(fotos.length > 1 || (editCriterio && fotos.length > 0)) && (
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
                    {editCriterio && idx === 0 && (
                      <Star className="absolute top-0.5 left-0.5 w-3 h-3 fill-amber-300 text-amber-300 drop-shadow" />
                    )}
                  </div>
                ))}
                {editCriterio && fotos.length < MAX_FOTOS && (
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

            {editCriterio && (
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
              <div className={`p-3 border rounded-xl space-y-1 ${editCriterio ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Responsable de la causa</span>
                {editCriterio ? (
                  <textarea rows={4} value={form.responsable} onChange={setField('responsable')} placeholder="Ej. PINTURA, PRENSADO" className={`${editInput} text-sm font-bold resize-y`} />
                ) : (
                  <span className="text-sm font-bold text-[#324354] whitespace-pre-line">{c?.responsable || 'No especificado'}</span>
                )}
              </div>
              <div className={`p-3 border rounded-xl space-y-1 ${editCriterio ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo detectarlo?</span>
                {editCriterio ? (
                  <textarea rows={5} value={form.detectarlo} onChange={setField('detectarlo')} className={`${editInput} text-xs font-semibold leading-relaxed resize-y`} />
                ) : (
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{c?.detectarlo || 'No especificado'}</p>
                )}
              </div>
            </div>

            <div className={`p-3 border rounded-xl space-y-1 ${editCriterio ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">¿Cómo evitarlo / acción correctiva?</span>
              {editCriterio ? (
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
                    {editCriterio ? (
                      <input type="text" value={form[z.key]} onChange={setField(z.key)} placeholder="N/A" className={`${editInput} text-xs font-bold`} />
                    ) : (
                      <p className={`text-xs font-bold whitespace-pre-line ${z.txt}`}>{c?.[z.key] || 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sin estadísticas, el % máximo al día se muestra aquí; con estadísticas va junto a ellas */}
            {!mostrarEstadisticas && tarjetaPctMax}

            {/* Láminas de zonas críticas de acabado: iguales para todos los defectos de MS */}
            {planta === 'Ms' && (
                <div className="p-3 border border-slate-200 bg-slate-50 rounded-xl space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Acabado · zonas críticas</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ZONAS_CRITICAS_MS.map(z => (
                      <button
                        key={z.src}
                        type="button"
                        onClick={() => onZoom(z.src)}
                        className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white hover:border-[#324354] transition-colors"
                        title={`Ver zonas críticas · ${z.label}`}
                      >
                        <img src={z.mini} alt={`Zonas críticas de acabado · ${z.label}`} className="w-full h-28 object-contain bg-[#eceeed]" />
                        <span className="bg-[#254153] text-white text-[10px] font-bold px-1.5 py-0.5 flex items-center justify-between gap-1">
                          <span className="truncate">{z.label}</span>
                          <Maximize2 className="w-3 h-3 shrink-0" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
            )}

            {seccionConfig}
          </div>
        </div>
      )}

      {/* Sin criterio registrado: la configuración del registro igual se muestra */}
      {!c && !editCriterio && seccionConfig && <div className="mt-2">{seccionConfig}</div>}

      {/* Estadísticas del defecto en los registros diarios de MS */}
      {mostrarEstadisticas && (
      <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 size={14} /> Estadísticas del defecto · registro diario MS
          </span>
          {estadisticasInfo && (
            <span className="text-[10px] font-bold text-slate-400">
              {fmtFecha(estadisticasInfo.desde)} – {fmtFecha(estadisticasInfo.hasta)} · {estadisticasInfo.diasProduccion} días con producción
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="sm:w-48 shrink-0">{tarjetaPctMax}</div>
          <div className="flex-1 min-w-0">
        {estadisticasLoading ? (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando estadísticas del histórico…
          </div>
        ) : estadisticasError ? (
          <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">No se pudieron cargar las estadísticas: {estadisticasError}</div>
        ) : !estadistica ? (
          <p className="text-xs font-bold text-slate-400 py-3">Este defecto no se ha reportado en el registro diario.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            <div className="xl:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#324354] text-white">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70 block">Promedio por día</span>
                <span className="text-2xl font-black">{fmtNum(estadistica.promedioDia)}</span>
                <span className="text-[10px] font-bold text-white/70 block">piezas / día histórico</span>
              </div>
              {(() => {
                const peor = estadistica.ult30.promedioDia > estadistica.promedioDia;
                const Icono = peor ? TrendingUp : TrendingDown;
                return (
                  <div className={`p-2.5 rounded-xl border ${peor ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Últimos 30 días</span>
                    <span className={`text-xl font-black flex items-center gap-1 ${peor ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {fmtNum(estadistica.ult30.promedioDia)} <Icono size={16} />
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block">{estadistica.ult30.ocurrencias} pzs en {estadistica.ult30.diasProduccion} días</span>
                  </div>
                );
              })()}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total histórico</span>
                <span className="text-xl font-black text-[#324354]">{estadistica.ocurrencias.toLocaleString('es-CO')}</span>
                <span className="text-[10px] font-bold text-slate-500 block">piezas con el defecto</span>
              </div>
              {(() => {
                // Rojo cuando el % de piezas supera el % máximo permitido al día del criterio
                const supera = c?.pct_max_dia != null && estadistica.pctPiezas > Number(c.pct_max_dia);
                return (
                  <div className={`p-2.5 rounded-xl border ${supera ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">% de piezas</span>
                    <span className={`text-xl font-black ${supera ? 'text-rose-700' : 'text-[#324354]'}`}>{fmtNum(estadistica.pctPiezas)}%</span>
                    <span className={`text-[10px] font-bold block ${supera ? 'text-rose-700' : 'text-slate-500'}`}>
                      {supera ? `supera el máximo (${fmtNum(Number(c!.pct_max_dia))}%)` : 'de las revisadas'}
                    </span>
                  </div>
                );
              })()}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Días con el defecto</span>
                <span className="text-xl font-black text-[#324354]">{estadistica.diasConDefecto}</span>
                <span className="text-[10px] font-bold text-slate-500 block">de {estadisticasInfo?.diasProduccion ?? '—'} días</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Última detección</span>
                <span className="text-xl font-black text-[#324354]">{fmtFecha(estadistica.ultimaFecha)}</span>
              </div>
            </div>

            <div className="xl:col-span-7 p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Promedio por día de cada mes · línea = promedio histórico
              </span>
              <div className="h-[170px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={estadistica.porMes.map(m => ({ ...m, etiqueta: `${MESES_CORTOS[Number(m.mes.slice(5, 7)) - 1]} ${m.mes.slice(2, 4)}`, valor: +m.promedioDia.toFixed(2) }))}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals />
                    <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} pzs/día (${p.payload.ocurrencias} pzs)`, 'Promedio']} />
                    <ReferenceLine y={+estadistica.promedioDia.toFixed(2)} stroke="#d14747" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Bar dataKey="valor" fill="#7B8E90" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
      )}

      {showCamera && <LiveCameraModal isOpen={showCamera} onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {annotatingIdx !== null && fotos[annotatingIdx] && (
        <PhotoAnnotationEditor imageSrc={fotos[annotatingIdx]} onSave={handleAnnotated} onCancel={() => setAnnotatingIdx(null)} />
      )}
    </div>
    </div>
  );
}
