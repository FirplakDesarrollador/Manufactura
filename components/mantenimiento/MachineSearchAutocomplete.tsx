'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu, Search, X, Check, Building2, Plus } from 'lucide-react';

export interface MachineItem {
  id?: number | string;
  nombre_equipo: string;
  codigo_equipo?: string;
  planta?: string;
  nombre_alterno?: string;
  activo_fijo?: string;
  proceso?: string;
  marca?: string;
  modelo?: string;
  normName?: string;
  normExtra?: string;
  normCode?: string;
  normPlant?: string;
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
  { nombre_equipo: 'Maquina de vaciado Ultracaster 2 - Azul C-0402', codigo_equipo: '0402', planta: 'Mármol Sintético' },
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

  // Consolidate and pre-normalize all machine options once per catalog update
  const allMachineOptions = useMemo(() => {
    const list: MachineItem[] = [];
    const seen = new Set<string>();

    const texto = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
    const addMachine = (m: any) => {
      const cleanName = texto(m.nombre_equipo || m.nombre || m.equipo);
      if (!cleanName) return;
      const normName = normalizeStr(cleanName);
      if (seen.has(normName)) return;
      seen.add(normName);

      const codigo = texto(m.codigo_equipo || m.codigo);
      const planta = texto(m.planta);
      const item: MachineItem = {
        id: m.id,
        nombre_equipo: cleanName,
        codigo_equipo: codigo || undefined,
        planta: planta || undefined,
        nombre_alterno: texto(m.nombre_alterno) || undefined,
        activo_fijo: texto(m.activo_fijo) || undefined,
        proceso: texto(m.proceso) || undefined,
        marca: texto(m.marca) || undefined,
        modelo: texto(m.modelo) || undefined,
        normName,
        normCode: normalizeStr(codigo),
        normPlant: normalizeStr(planta)
      };
      // Descripción, activo fijo, proceso, marca y modelo también sirven para buscar
      item.normExtra = normalizeStr([item.nombre_alterno, item.activo_fijo, item.proceso, item.marca, item.modelo].filter(Boolean).join(' '));
      list.push(item);
    };

    // 1. Base oficial de Máquinas y Equipos (Gestor de Mantenimiento)
    if (Array.isArray(maquinasCatalogo) && maquinasCatalogo.length > 0) {
      maquinasCatalogo.forEach(addMachine);
      return list;
    }

    // 2. Sin conexión a la base: equipos de tarjetas existentes y catálogo de respaldo
    if (Array.isArray(existingTarjetas)) {
      existingTarjetas.forEach(t => {
        if (t.maquina) addMachine({ nombre_equipo: t.maquina, planta: t.planta });
      });
    }
    DEFAULT_FIRPLAK_MACHINES.forEach(addMachine);

    return list;
  }, [maquinasCatalogo, existingTarjetas]);

  // Ultra-fast filtering capped at max 50 items for instant 60fps rendering
  const filteredOptions = useMemo(() => {
    const query = normalizeStr(inputValue);
    if (!query) return allMachineOptions.slice(0, 50);

    const matches: MachineItem[] = [];
    for (let i = 0; i < allMachineOptions.length; i++) {
      const item = allMachineOptions[i];
      if (
        (item.normName && item.normName.includes(query)) ||
        (item.normCode && item.normCode.includes(query)) ||
        (item.normPlant && item.normPlant.includes(query)) ||
        (item.normExtra && item.normExtra.includes(query))
      ) {
        matches.push(item);
        if (matches.length >= 50) break;
      }
    }
    return matches;
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

    const normVal = normalizeStr(val);
    const matched = allMachineOptions.find(m => m.normName === normVal);
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

      {/* Lista desplegable: nombre, descripción, código / activo fijo, planta y proceso (legible en celular) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain scrollbar-thin divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, idx) => {
              const isSelected = item.normName === normalizeStr(inputValue);
              const marcaModelo = [item.marca, item.modelo].filter(Boolean).join(' · ');
              return (
                <div
                  key={item.id || `${item.nombre_equipo}-${idx}`}
                  onClick={() => handleSelectOption(item)}
                  className={`px-3 sm:px-3.5 py-3 sm:py-2.5 cursor-pointer flex items-start justify-between gap-2 transition-colors ${
                    isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`text-[13px] sm:text-sm leading-snug text-[#324354] break-words ${isSelected ? 'font-black' : 'font-bold'}`}>
                      {item.nombre_equipo}
                    </p>
                    {item.nombre_alterno && item.nombre_alterno !== item.nombre_equipo && (
                      <p className="text-[11px] sm:text-xs leading-snug text-slate-500 break-words">{item.nombre_alterno}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      {item.planta && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100/70 text-amber-900 rounded-md inline-flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 opacity-70" />
                          {item.planta}
                        </span>
                      )}
                      {item.proceso && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md">{item.proceso}</span>
                      )}
                      {item.codigo_equipo && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 rounded-md border border-slate-200">{item.codigo_equipo}</span>
                      )}
                      {item.activo_fijo && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">AF: {item.activo_fijo}</span>
                      )}
                      {marcaModelo && <span className="text-[10px] text-slate-400">{marcaModelo}</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
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
