'use client';

// Tiempo real de ejecución de una orden de mantenimiento, en minutos (obligatorio al cerrarla).
// Al lado muestra el equivalente en horas como ayuda. Se guarda en mantenimiento_ordenes.tiempo_ejecucion_min.

import React from 'react';
import { Timer } from 'lucide-react';

/** "90" → 90; vacío o inválido → null */
export const minutosValidos = (v: string | number | null | undefined): number | null => {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const textoHoras = (min: number | null): string => {
  if (!min) return '— h';
  const h = Math.floor(min / 60), m = min % 60;
  const dec = (min / 60).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return h > 0 ? `${dec} h (${h} h ${m} min)` : `${dec} h (${m} min)`;
};

export default function TiempoEjecucionInput({ value, onChange, falta }: {
  value: string;
  onChange: (v: string) => void;
  /** se intentó cerrar sin tiempo: se resalta en rojo */
  falta?: boolean;
}) {
  const min = minutosValidos(value);
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 text-[#324354]" />
        <span>Tiempo de Ejecución (minutos) <span className="text-[#d14747]">*</span></span>
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number" inputMode="numeric" min={1} step={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ej. 90"
          className={`w-32 px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold text-[#324354] focus:outline-none ${falta && !min ? 'bg-rose-50 border-[#d14747] ring-2 ring-rose-100' : 'bg-[#F6F3EE] border-[#e2ded5] focus:border-[#324354]'}`}
        />
        <span className="text-xs font-semibold text-slate-500" title="Equivalente en horas">= {textoHoras(min)}</span>
      </div>
      {falta && !min && <p className="text-[11px] font-semibold text-[#d14747] mt-1">Escriba cuántos minutos tomó el trabajo para poder cerrarlo.</p>}
    </div>
  );
}
