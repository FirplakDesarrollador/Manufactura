'use client';

// Especialidad de los técnicos de mantenimiento = las plantas que atiende cada uno (varias), aparte de la cuadrilla.
// Se guarda en mantenimiento_tecnicos.especialidad como códigos separados por coma ("MS, CEFI"), el mismo formato que
// usa el Planificador para asignar las tareas por planta (parseTechPlantas).
// Solo técnicos activos y las plantas principales (las mismas del Sistema de Producción); una planta oculta que el
// técnico ya tenga se sigue mostrando para poder quitarla.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obtenerCodigoPlanta, type NomenclaturaPlanta } from '@/lib/nomenclaturaPlantas';
import { PLANTAS_OCULTAS_SP } from '@/lib/sistema-produccion/cumplimiento';

// Plantas que no salen aquí: las ocultas del Sistema de Producción, menos Proveedor Externo (EX) y Obras Civiles (OC),
// que sí son especialidades de mantenimiento
const OCULTAS = PLANTAS_OCULTAS_SP.filter(c => c !== 'EX' && c !== 'OC');

type Tecnico = { id: number; name: string; turno?: string; especialidad?: string; planta?: string };

export default function EspecialidadesTecnicos({ technicians, plantas, onTechsUpdated }: {
  technicians: Tecnico[]; plantas: NomenclaturaPlanta[]; onTechsUpdated?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  // Cambios hechos aquí (se ven al instante; se guardan por detrás)
  const [local, setLocal] = useState<Record<number, string[]>>({});
  const recarga = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (recarga.current) clearTimeout(recarga.current); }, []);

  const principales = useMemo(() => plantas.filter(p => p.activo !== false && !OCULTAS.includes(p.codigo)), [plantas]);
  const codigosDe = (t: Tecnico): string[] => {
    if (local[t.id]) return local[t.id];
    const raw = (t.especialidad || t.planta || '').split(',').map(s => s.trim()).filter(Boolean);
    return [...new Set(raw.map(r => obtenerCodigoPlanta(r, plantas) || r))];
  };

  // Solo técnicos activos
  const lista = useMemo(() => technicians.filter(t => t.id !== 9999 && t.turno !== 'INACTIVO').sort((a, b) => a.name.localeCompare(b.name)), [technicians]);

  const alternar = (t: Tecnico, codigo: string) => {
    const act = codigosDe(t);
    const nuevas = act.includes(codigo) ? act.filter(c => c !== codigo) : [...act, codigo];
    if (!nuevas.length) { setError(`${t.name} debe tener al menos una planta.`); return; }
    const orden = plantas.map(p => p.codigo);
    const ordenadas = [...orden.filter(c => nuevas.includes(c)), ...nuevas.filter(c => !orden.includes(c))];
    setError(null);
    setLocal(prev => ({ ...prev, [t.id]: ordenadas }));   // se marca de una vez
    void (async () => {
      const { error: e } = await supabase.from('mantenimiento_tecnicos').update({ especialidad: ordenadas.join(', ') }).eq('id', t.id);
      if (e) {
        setLocal(prev => ({ ...prev, [t.id]: act }));      // vuelve a como estaba
        setError(`No se guardó la especialidad de ${t.name}: ${e.message}`);
        return;
      }
      // El Gestor se recarga una sola vez, 3 s después del último cambio (recargarlo en cada clic es lento)
      if (recarga.current) clearTimeout(recarga.current);
      recarga.current = setTimeout(() => onTechsUpdated?.(), 3000);
    })();
  };

  return (
    <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3 w-full mt-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Wrench className="w-5 h-5 text-[#324354] shrink-0" />
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#324354] leading-tight">Especialidad de los Técnicos (plantas)</h2>
          <p className="text-[11px] text-slate-500">Toque una planta para marcarla o quitarla; cada técnico puede atender varias. El Planificador le asigna las tareas de esas plantas. Solo técnicos activos.</p>
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
          // Plantas principales + las ocultas o desconocidas que el técnico ya tiene (para poder quitarlas)
          const extra = suyas.filter(c => !principales.some(p => p.codigo === c));
          return (
            <div key={t.id} className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3 py-2">
              <div className="lg:w-[260px] shrink-0 min-w-0">
                <span className="text-xs font-black text-[#324354] truncate block" title={t.name}>{t.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {principales.map(p => {
                  const on = suyas.includes(p.codigo);
                  return (
                    <button key={p.codigo} type="button" onClick={() => alternar(t, p.codigo)} title={p.nombre_oficial}
                      className={`h-6 px-2 rounded-md border text-[10px] font-bold ${on ? 'bg-[#324354] border-[#324354] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-[#324354] hover:text-[#324354]'}`}>
                      {p.codigo}
                    </button>
                  );
                })}
                {extra.map(c => (
                  <button key={c} type="button" onClick={() => alternar(t, c)} title="Planta que no está entre las principales: toque para quitarla"
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
