'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu, Search, X, Check, Building2, Plus } from 'lucide-react';

export interface MachineItem {
  id?: number | string;
  nombre_equipo: string;
  codigo_equipo?: string;
  planta?: string;
}

interface MachineSearchAutocompleteProps {
  value: string;
  onChange: (maquina: string, matchedPlanta?: string) => void;
  maquinasCatalogo?: MachineItem[];
  existingTarjetas?: Array<{ maquina?: string; planta?: string }>;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  onBlur?: () => void;
}

// Built-in catalog of FIRPLAK plant machinery & equipment for instant search matching
const DEFAULT_FIRPLAK_MACHINES: MachineItem[] = [
  { nombre_equipo: 'Enchapadora de Cantos Holzher 7405', codigo_equipo: 'S01CEFIPRT20', planta: 'CEFI' },
  { nombre_equipo: 'Enchapadora de Cantos KDT', codigo_equipo: 'S01MUEPRT20', planta: 'Muebles' },
  { nombre_equipo: 'Enchapadora de Cantos Manuel', codigo_equipo: 'ENCH-003', planta: 'Muebles' },
  { nombre_equipo: 'Mantenimiento sistema de extracción cabina de pintura FV', codigo_equipo: 'S01FVNP120', planta: 'Fibra de Vidrio' },
  { nombre_equipo: 'Lubricación y cambio de oring para gatillo (multicolor 0890)', codigo_equipo: 'S02MSNPT60', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento compresor kaeser 3', codigo_equipo: 'S01MSNPT40', planta: 'CEFI' },
  { nombre_equipo: '0181- Mantenimiento taladro vertical Holzher 7405', codigo_equipo: 'D01CEFIPRT20', planta: 'CEFI' },
  { nombre_equipo: 'Mantenimiento líneas 2 de vaciado M.S', codigo_equipo: 'S01MSPRT30', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Revisar estructura de linea 2 M.S', codigo_equipo: 'S01MSPRT30', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento secado de aire RTM C-0244', codigo_equipo: 'S02RTMPRT30', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento ultracaster #2 C-0402', codigo_equipo: 'S01MSPRT60', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento equipo laser (Muebles) C-01042 (grande)', codigo_equipo: 'S01MBLNPT240', planta: 'Muebles' },
  { nombre_equipo: 'Mantenimiento equipo laser (CEFI) C-01184', codigo_equipo: 'S02CEFIPR60', planta: 'CEFI' },
  { nombre_equipo: 'Mantenimiento compresor de atlas C-1227', codigo_equipo: 'S02CEFIPR60', planta: 'CEFI' },
  { nombre_equipo: 'Inspeccion, limpieza y lubricacion del vastago Ultracaster', codigo_equipo: 'S01MSPRT60', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento tronzadora Herrajes', codigo_equipo: 'S02FVNPT120', planta: 'Fibra de Vidrio' },
  { nombre_equipo: 'Cambiar filtros iniciales de cabina de pintura', codigo_equipo: 'S01MSNPT30', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Checklist de arranque fines de semana', codigo_equipo: 'S01MSNPT120', planta: 'General' },
  { nombre_equipo: 'Mantenimiento base de ruteadora MS (cabina de pulido)', codigo_equipo: 'S01MSNPT120', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento sistema rotoflex N°1', codigo_equipo: 'ROTOFLEX-01', planta: 'General' },
  { nombre_equipo: 'Mantenimiento de cadena contramoldes (larga)', codigo_equipo: 'S01MSPRT60', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mantenimiento de cadena retorno', codigo_equipo: 'S01MSPRT60', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Limpieza de retesteadores, refiladores y redondeadores', codigo_equipo: 'CORR-325', planta: 'Muebles' },
  { nombre_equipo: 'Compresor Kaeser 02', codigo_equipo: 'KAESER-02', planta: 'General' },
  { nombre_equipo: 'Inyectora Battenfeld 01', codigo_equipo: 'INY-01', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Sierra Escuadradora 01', codigo_equipo: 'ESQ-01', planta: 'Muebles' },
  { nombre_equipo: 'Prensa Hidráulica 01', codigo_equipo: 'PREN-01', planta: 'General' },
  { nombre_equipo: 'Pulidora Automática MS', codigo_equipo: 'PUL-MS', planta: 'Mármol Sintético' },
  { nombre_equipo: 'Mezcladora de Resina Mármol', codigo_equipo: 'MEZ-01', planta: 'Mármol Sintético' }
];

const normalizeStr = (str: string) =>
  str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';

export default function MachineSearchAutocomplete({
  value,
  onChange,
  maquinasCatalogo = [],
  existingTarjetas = [],
  placeholder = 'Buscar o escribir máquina / equipo...',
  required = false,
  id = 'machine-autocomplete-input',
  className = '',
  onBlur
}: MachineSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal value if parent changes value prop externally
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Consolidate all machine options (Supabase DB + existing cards + defaults)
  const allMachineOptions = useMemo(() => {
    const list: MachineItem[] = [];
    const seen = new Set<string>();

    const addMachine = (nombre?: string, codigo?: string, planta?: string, id?: any) => {
      if (!nombre || !nombre.trim()) return;
      const cleanName = nombre.trim();
      const normKey = normalizeStr(cleanName);
      if (seen.has(normKey)) return;
      seen.add(normKey);
      list.push({
        id,
        nombre_equipo: cleanName,
        codigo_equipo: codigo?.trim() || undefined,
        planta: planta?.trim() || undefined
      });
    };

    // 1. Database catalog machines
    if (Array.isArray(maquinasCatalogo)) {
      maquinasCatalogo.forEach((m: any) => {
        addMachine(m.nombre_equipo || m.nombre || m.equipo, m.codigo_equipo || m.codigo, m.planta, m.id);
      });
    }

    // 2. Existing cards machines
    if (Array.isArray(existingTarjetas)) {
      existingTarjetas.forEach(t => {
        if (t.maquina) addMachine(t.maquina, undefined, t.planta);
      });
    }

    // 3. Fallback FIRPLAK standard machines
    DEFAULT_FIRPLAK_MACHINES.forEach(m => {
      addMachine(m.nombre_equipo, m.codigo_equipo, m.planta);
    });

    return list;
  }, [maquinasCatalogo, existingTarjetas]);

  // Filter options based on user input
  const filteredOptions = useMemo(() => {
    const query = normalizeStr(inputValue);
    if (!query) return allMachineOptions;

    return allMachineOptions.filter(m => {
      const nameMatch = normalizeStr(m.nombre_equipo).includes(query);
      const codeMatch = m.codigo_equipo ? normalizeStr(m.codigo_equipo).includes(query) : false;
      const plantMatch = m.planta ? normalizeStr(m.planta).includes(query) : false;
      return nameMatch || codeMatch || plantMatch;
    });
  }, [inputValue, allMachineOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);

    // Find direct match if any
    const matched = allMachineOptions.find(
      m => normalizeStr(m.nombre_equipo) === normalizeStr(val)
    );

    onChange(val, matched?.planta);
  };

  const handleSelectOption = (option: MachineItem) => {
    setInputValue(option.nombre_equipo);
    onChange(option.nombre_equipo, option.planta);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('', undefined);
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          <Cpu className="w-4 h-4" />
        </div>
        
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full pl-9 pr-9 py-2.5 bg-[#F6F3EE] rounded-xl border border-gray-300 text-sm font-medium text-[#324354] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#324354] focus:bg-white transition-all ${className}`}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 transition-colors"
            title="Limpiar campo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-y-auto scrollbar-thin divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, idx) => {
              const isSelected = normalizeStr(item.nombre_equipo) === normalizeStr(inputValue);
              return (
                <div
                  key={item.id || `${item.nombre_equipo}-${idx}`}
                  onClick={() => handleSelectOption(item)}
                  className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-amber-50/80 text-[#324354] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.codigo_equipo && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                          [{item.codigo_equipo}]
                        </span>
                      )}
                      <span className="font-semibold truncate text-[#324354]">
                        {item.nombre_equipo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.planta && (
                      <span className="px-2 py-0.5 text-[9.5px] font-medium bg-amber-100/70 text-amber-900 rounded-full flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5 opacity-70" />
                        {item.planta}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              <p className="font-medium">No hay coincidencias en el catálogo</p>
              {inputValue.trim() && (
                <div
                  onClick={() => {
                    setIsOpen(false);
                    onChange(inputValue.trim());
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#324354] font-bold text-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Usar equipo libre: &quot;{inputValue.trim()}&quot;</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
