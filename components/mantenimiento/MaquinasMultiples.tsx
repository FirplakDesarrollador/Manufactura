'use client';

// Varias máquinas / equipos en un mismo mantenimiento (p. ej. Rotoflex 1 y Rotoflex 2).
// Se guardan en el mismo campo de texto "maquina", separadas por " | " (SEPARADOR_MAQUINAS), así las órdenes y el
// historial no cambian de estructura y la hoja de vida de CADA equipo reconoce la intervención (ver partesMaquina).

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export const SEPARADOR_MAQUINAS = ' | ';
/** Equipos de un campo "maquina" (uno o varios separados por "|") */
export const partesMaquina = (v?: string | null): string[] => String(v || '').split('|').map(s => s.trim()).filter(Boolean);

type Maq = { id?: number | string; nombre_equipo?: string; codigo_equipo?: string; planta?: string };

export default function MaquinasMultiples({ value, catalogo, onChange, listId = 'maquinas-catalogo-options' }: {
  value: string;
  catalogo: Maq[];
  /** valor (nombres unidos por " | ") y las máquinas del catálogo reconocidas, en el mismo orden */
  onChange: (valor: string, reconocidas: Maq[]) => void;
  listId?: string;
}) {
  const [texto, setTexto] = useState('');
  const lista = partesMaquina(value);
  const buscar = (val: string) => {
    const v = val.trim().toLowerCase();
    return catalogo.find(m =>
      `${m.codigo_equipo ? `[${m.codigo_equipo}] ` : ''}${m.nombre_equipo}`.toLowerCase() === v ||
      m.nombre_equipo?.toLowerCase() === v || (m.codigo_equipo && m.codigo_equipo.toLowerCase() === v));
  };
  const emitir = (nombres: string[]) => {
    const reconocidas = nombres.map(n => buscar(n)).filter(Boolean) as Maq[];
    onChange(nombres.join(SEPARADOR_MAQUINAS), reconocidas);
  };
  const agregar = (val: string) => {
    const t = val.trim();
    if (!t) return;
    const m = buscar(t);
    const nombre = m?.nombre_equipo || t;
    setTexto('');
    if (lista.some(x => x.toLowerCase() === nombre.toLowerCase())) return;
    emitir([...lista, nombre]);
  };

  return (
    <div className="w-full px-2 py-1.5 bg-[#F6F3EE] rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#324354] flex flex-wrap items-center gap-1.5">
      {lista.map((n, i) => (
        <span key={`${n}-${i}`} className="flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-lg bg-white border border-[#e2ded5] text-sm font-semibold text-[#324354]">
          {n}
          <button type="button" onClick={() => emitir(lista.filter((_, k) => k !== i))} title={`Quitar ${n}`}
            className="text-slate-400 hover:text-[#d14747]"><X size={13} /></button>
        </span>
      ))}
      <input
        list={listId}
        type="text"
        value={texto}
        onChange={e => {
          const v = e.target.value;
          // Al elegir de la lista del catálogo se agrega de una vez
          if (buscar(v)) agregar(v); else setTexto(v);
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(texto); } if (e.key === 'Backspace' && !texto && lista.length) emitir(lista.slice(0, -1)); }}
        onBlur={() => agregar(texto)}
        placeholder={lista.length ? 'Agregar otro equipo…' : 'Buscar o seleccionar equipo(s)…'}
        className="flex-1 min-w-[180px] h-7 px-1.5 bg-transparent text-sm outline-none"
      />
      {texto.trim() && (
        <button type="button" onClick={() => agregar(texto)} className="h-7 px-2 rounded-lg bg-[#324354] text-white text-xs font-bold flex items-center gap-1">
          <Plus size={13} /> Agregar
        </button>
      )}
    </div>
  );
}
