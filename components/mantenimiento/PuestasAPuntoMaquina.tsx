'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PuestaVinculada {
  id_puesta_a_punto: string;
  consecutivo: string | null;
  nombre_puesta_a_punto: string | null;
  proceso: string | null;
  planta: string | null;
  version_formato: string | null;
  estado_puesta_a_punto: string | null;
  actividades: number;
}

// Puestas a punto (Mantenimiento Autónomo) que tienen items relacionados con esta máquina,
// ya sea por id_maquina o, si la columna aún no existe, por el nombre exacto del equipo.
export default function PuestasAPuntoMaquina({ maquina }: { maquina: { id?: number | string; nombre_equipo?: string } }) {
  const [puestas, setPuestas] = useState<PuestaVinculada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const conteo = new Map<string, number>();
      const sumar = (rows: { id_puesta_a_punto: string; id_detalle: string }[] | null, vistos: Set<string>) => {
        (rows || []).forEach(r => {
          if (vistos.has(r.id_detalle)) return;
          vistos.add(r.id_detalle);
          conteo.set(r.id_puesta_a_punto, (conteo.get(r.id_puesta_a_punto) || 0) + 1);
        });
      };
      const vistos = new Set<string>();

      if (maquina.id) {
        // Falla si la columna id_maquina no existe todavía; en ese caso se ignora
        const { data } = await supabase.from('puestas_a_punto_detalle').select('id_puesta_a_punto, id_detalle').eq('id_maquina', maquina.id);
        sumar(data, vistos);
      }
      const nombre = (maquina.nombre_equipo || '').trim();
      if (nombre) {
        const { data } = await supabase
          .from('puestas_a_punto_detalle')
          .select('id_puesta_a_punto, id_detalle')
          .ilike('equipo_herramienta', nombre.replace(/[%_\\]/g, '\\$&'));
        sumar(data, vistos);
      }

      const ids = [...conteo.keys()];
      let result: PuestaVinculada[] = [];
      if (ids.length > 0) {
        const { data: encs } = await supabase
          .from('puestas_a_punto_encabezado')
          .select('id_puesta_a_punto, consecutivo, nombre_puesta_a_punto, proceso, planta, version_formato, estado_puesta_a_punto')
          .in('id_puesta_a_punto', ids);
        result = (encs || []).map(e => ({ ...e, actividades: conteo.get(e.id_puesta_a_punto) || 0 }));
      }
      if (active) { setPuestas(result); setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [maquina.id, maquina.nombre_equipo]);

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-[#7B8E90]" />
          <span>Puestas a Punto de este Equipo</span>
        </h4>
        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
          {loading ? '...' : `${puestas.length} Puesta(s)`}
        </span>
      </div>

      {loading ? (
        <div className="p-4 bg-[#F6F3EE] rounded-xl text-center text-xs text-gray-500">Cargando puestas a punto...</div>
      ) : puestas.length === 0 ? (
        <div className="p-4 bg-[#F6F3EE] rounded-xl text-center text-xs text-gray-500">
          Esta máquina no está relacionada con ninguna puesta a punto.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
          {puestas.map(p => (
            <Link
              key={p.id_puesta_a_punto}
              href={`/mantenimiento/puestas-a-punto/${encodeURIComponent(p.planta || '')}/ver/${p.id_puesta_a_punto}`}
              target="_blank"
              className="p-3 bg-white hover:bg-emerald-50/50 transition-colors flex items-center justify-between gap-3 group"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-[11px]">
                    {p.consecutivo || 'PP'}
                  </span>
                  <span className="font-bold text-xs text-[#324354] group-hover:text-emerald-900">
                    {p.nombre_puesta_a_punto || p.proceso}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">V.{p.version_formato || '1'}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  Proceso: {p.proceso || '-'} · Planta: {p.planta || '-'} · {p.actividades} actividad(es) de esta máquina · {p.estado_puesta_a_punto || 'Abierta'}
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 group-hover:bg-[#324354] group-hover:text-white rounded-lg text-xs font-bold transition-colors shrink-0 text-[#324354]">
                Ver Puesta
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
