'use client';

// Especialidad de los técnicos de mantenimiento = las plantas que atiende cada uno (varias), aparte de la cuadrilla.
// Se guarda en mantenimiento_tecnicos.especialidad como códigos separados por coma ("MS, CEFI"), el mismo formato que
// usa el Planificador para asignar las tareas por planta (parseTechPlantas).

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obtenerCodigoPlanta, type NomenclaturaPlanta } from '@/lib/nomenclaturaPlantas';

type Tecnico = { id: number; name: string; turno?: string; especialidad?: string; planta?: string };

export default function EspecialidadesTecnicos({ technicians, plantas, onTechsUpdated }: {
  technicians: Tecnico[]; plantas: NomenclaturaPlanta[]; onTechsUpdated?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);
  // Cambios ya guardados mientras se recargan los técnicos
  const [local, setLocal] = useState<Record<number, string[]>>({});

  const activas = useMemo(() => plantas.filter(p => p.activo !== false), [plantas]);
  const codigosDe = (t: Tecnico): string[] => {
    if (local[t.id]) return local[t.id];
    const raw = (t.especialidad || t.planta || '').split(',').map(s => s.trim()).filter(Boolean);
    return [...new Set(raw.map(r => obtenerCodigoPlanta(r, plantas) || r))];
  };

  const lista = useMemo(() => technicians.filter(t => t.id !== 9999).sort((a, b) =>
    (a.turno === 'INACTIVO' ? 1 : 0) - (b.turno === 'INACTIVO' ? 1 : 0) || a.name.localeCompare(b.name)), [technicians]);

  const alternar = async (t: Tecnico, codigo: string) => {
    const act = codigosDe(t);
    const nuevas = act.includes(codigo) ? act.filter(c => c !== codigo) : [...act, codigo];
    if (!nuevas.length) { setError(`${t.name} debe tener al menos una planta.`); return; }
    // Mismo orden de la Nomenclatura
    const ordenadas = [...activas.map(p => p.codigo).filter(c => nuevas.includes(c)), ...nuevas.filter(c => !activas.some(p => p.codigo === c))];
    setGuardando(t.id); setError(null);
    const { error: e } = await supabase.from('mantenimiento_tecnicos').update({ especialidad: ordenadas.join(', ') }).eq('id', t.id);
    setGuardando(null);
    if (e) { setError(`No se guardó la especialidad de ${t.name}: ${e.message}`); return; }
    setLocal(prev => ({ ...prev, [t.id]: ordenadas }));
    onTechsUpdated?.();
  };

  return (
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3 w-full mt-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Wrench className="w-5 h-5 text-[#324354] shrink-0" />
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#324354] leading-tight">Especialidad de los Técnicos (plantas)</h2>
          <p className="text-[11px] text-slate-500">Toque una planta para marcarla o quitarla; cada técnico puede atender varias. El Planificador le asigna las tareas de esas plantas.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d14747] bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {lista.map(t => {
          const suyas = codigosDe(t);
          const desconocidas = suyas.filter(c => !activas.some(p => p.codigo === c));
          return (
            <div key={t.id} className={`flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3 py-2 ${t.turno === 'INACTIVO' ? 'opacity-60' : ''}`}>
              <div className="lg:w-[260px] shrink-0 flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-[#324354] truncate" title={t.name}>{t.name}</span>
                {guardando === t.id && <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {activas.map(p => {
                  const on = suyas.includes(p.codigo);
                  return (
                    <button key={p.codigo} type="button" onClick={() => void alternar(t, p.codigo)} disabled={guardando === t.id} title={p.nombre_oficial}
                      className={`h-6 px-2 rounded-md border text-[10px] font-bold transition-colors ${on ? 'bg-[#324354] border-[#324354] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-[#324354] hover:text-[#324354]'}`}>
                      {p.codigo}
                    </button>
                  );
                })}
                {/* Valores guardados que no son una planta de la Nomenclatura (se pueden quitar tocándolos) */}
                {desconocidas.map(c => (
                  <button key={c} type="button" onClick={() => void alternar(t, c)} title="No es una planta activa de la Nomenclatura: toque para quitarla"
                    className="h-6 px-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold">{c} ×</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
