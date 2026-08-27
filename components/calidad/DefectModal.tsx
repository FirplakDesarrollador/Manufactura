'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export interface Defecto {
  id?: number;
  planta: string;
  codigo: string;
  defecto: string;
  foto?: string | null;
  responsable?: string | null;
  detectarlo?: string | null;
  evitarlo?: string | null;
  rojo?: string | null;
  naranja?: string | null;
  amarillo?: string | null;
  verde?: string | null;
  created_at?: string;
}

interface DefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defecto: Defecto) => Promise<void>;
  defectToEdit?: Defecto | null;
  currentPlant: string;
}

export default function DefectModal({
  isOpen,
  onClose,
  onSave,
  defectToEdit,
  currentPlant
}: DefectModalProps) {
  const [codigo, setCodigo] = useState('');
  const [defectoName, setDefectoName] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [responsable, setResponsable] = useState('');
  const [detectarlo, setDetectarlo] = useState('');
  const [evitarlo, setEvitarlo] = useState('');
  const [rojo, setRojo] = useState('');
  const [naranja, setNaranja] = useState('');
  const [amarillo, setAmarillo] = useState('');
  const [verde, setVerde] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defectToEdit) {
      setCodigo(defectToEdit.codigo || '');
      setDefectoName(defectToEdit.defecto || '');
      setFotoUrl(defectToEdit.foto || '');
      setResponsable(defectToEdit.responsable || '');
      setDetectarlo(defectToEdit.detectarlo || '');
      setEvitarlo(defectToEdit.evitarlo || '');
      setRojo(defectToEdit.rojo || '');
      setNaranja(defectToEdit.naranja || '');
      setAmarillo(defectToEdit.amarillo || '');
      setVerde(defectToEdit.verde || '');
    } else {
      setCodigo('');
      setDefectoName('');
      setFotoUrl('');
      setResponsable('');
      setDetectarlo('');
      setEvitarlo('');
      setRojo('');
      setNaranja('');
      setAmarillo('');
      setVerde('');
    }
  }, [defectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectoName.trim()) {
      alert('El nombre del defecto es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: Defecto = {
        id: defectToEdit?.id,
        planta: defectToEdit?.planta || currentPlant,
        codigo: codigo.trim(),
        defecto: defectoName.trim(),
        foto: fotoUrl.trim() || null,
        responsable: responsable.trim() || null,
        detectarlo: detectarlo.trim() || null,
        evitarlo: evitarlo.trim() || null,
        rojo: rojo.trim() || null,
        naranja: naranja.trim() || null,
        amarillo: amarillo.trim() || null,
        verde: verde.trim() || null,
      };
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Error saving defect:', error);
      alert('Ocurrió un error al guardar el defecto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#324354] text-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold">
              {defectToEdit ? 'Editar Criterio de Calidad' : 'Nuevo Criterio de Calidad'}
            </h2>
            <p className="text-xs text-slate-300">
              Planta activa: <span className="font-bold text-white uppercase">{currentPlant}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                Código
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#324354] focus:outline-none"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. 104"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
                Nombre del Defecto *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#324354] focus:outline-none"
                value={defectoName}
                onChange={(e) => setDefectoName(e.target.value)}
                placeholder="Ej. RAYAS PROFUNDAS"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
              Responsable de la Causa
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#324354] focus:outline-none"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ej. VACIADO, PULIDO, PINTURA"
            />
          </div>

          {/* Foto / Imagen */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider">
              Foto / Imagen Ilustrativa
            </label>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                className="flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#324354] focus:outline-none"
                value={fotoUrl.startsWith('data:image') ? 'Imagen cargada en Base64' : fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                placeholder="Pegar URL de la imagen o subir archivo..."
                disabled={fotoUrl.startsWith('data:image')}
              />

              <label className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-[#324354] border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap shadow-xs">
                <Upload size={14} />
                <span>Subir Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Quitar</span>
                </button>
              )}
            </div>

            {fotoUrl && (
              <div className="mt-2 h-28 w-full max-w-xs rounded-lg overflow-hidden border border-slate-300 bg-white flex items-center justify-center">
                <img src={fotoUrl} alt="Vista previa" className="h-full w-full object-contain" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
              ¿Cómo Detectarlo?
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#324354] focus:outline-none"
              value={detectarlo}
              onChange={(e) => setDetectarlo(e.target.value)}
              placeholder="Instrucciones sobre cómo identificar visualmente el defecto..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">
              ¿Cómo Evitarlo / Acción?
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#324354] focus:outline-none"
              value={evitarlo}
              onChange={(e) => setEvitarlo(e.target.value)}
              placeholder="Acciones para prevenir el defecto..."
            />
          </div>

          {/* Intensidad / Zonas */}
          <div className="pt-2">
            <h3 className="text-xs font-black text-[#324354] uppercase tracking-wider mb-2">
              Aceptabilidad por Zonas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-black text-red-600 uppercase mb-1">
                  Zona Roja
                </label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 bg-red-50/50 border border-red-200 rounded-lg text-xs font-semibold text-red-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  value={rojo}
                  onChange={(e) => setRojo(e.target.value)}
                  placeholder="Ej. NO SE ACEPTA"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-amber-600 uppercase mb-1">
                  Zona Naranja
                </label>
                <input
                  type="text"
                  disabled={currentPlant === 'Cefi'}
                  className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-40"
                  value={naranja}
                  onChange={(e) => setNaranja(e.target.value)}
                  placeholder="Ej. 0 o N/A"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-yellow-600 uppercase mb-1">
                  Zona Amarilla
                </label>
                <input
                  type="text"
                  disabled={currentPlant === 'Cefi'}
                  className="w-full px-2.5 py-1.5 bg-yellow-50/50 border border-yellow-200 rounded-lg text-xs font-semibold text-yellow-900 focus:ring-2 focus:ring-yellow-500 focus:outline-none disabled:opacity-40"
                  value={amarillo}
                  onChange={(e) => setAmarillo(e.target.value)}
                  placeholder="Ej. 2 o N/A"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-emerald-600 uppercase mb-1">
                  Zona Verde
                </label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={verde}
                  onChange={(e) => setVerde(e.target.value)}
                  placeholder="Ej. SE ACEPTA"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#324354] hover:bg-[#25323f] active:scale-95 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Criterio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
