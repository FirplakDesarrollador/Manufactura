'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Eraser } from 'lucide-react';

// Semana ISO (lunes a domingo), como la columna "Semana" del Power BI. Clave "AAAA-Snn".
export function semanaIso(fecha: string): { anio: number; semana: number; clave: string } {
    const [y, m, d] = fecha.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    const dia = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dia);
    const anio = t.getUTCFullYear();
    const inicio = new Date(Date.UTC(anio, 0, 1));
    const semana = Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7);
    return { anio, semana, clave: `${anio}-S${String(semana).padStart(2, '0')}` };
}

// Filtro estilo Power BI: título con borrador encima y lista desplegable de selección múltiple.
// Sin nada marcado equivale a "Todas".
export default function FiltroPbi({ titulo, seleccion, opciones, onChange, onBorrar, puedeBorrar, minimoUno = false }: {
    titulo: string;
    seleccion: string[];
    opciones: { value: string; label: string }[];
    onChange: (v: string[]) => void;
    onBorrar: () => void;
    puedeBorrar: boolean;
    minimoUno?: boolean; // Año: siempre debe quedar al menos uno
}) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [abierto]);

    const todas = seleccion.length === 0;
    const texto = todas
        ? 'Todas'
        : seleccion.length === 1
            ? opciones.find(o => o.value === seleccion[0])?.label || seleccion[0]
            : 'Varias selecciones';

    const alternar = (v: string) => {
        const nueva = seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v];
        if (minimoUno && nueva.length === 0) return;
        onChange(nueva);
    };

    return (
        <div ref={ref} className="group relative min-w-[96px] flex-1 sm:flex-none sm:w-28">
            <div className="flex items-center justify-between h-3 mb-0.5">
                <span className="text-[8px] font-bold text-slate-500">{titulo}</span>
                <button
                    type="button"
                    onClick={onBorrar}
                    disabled={!puedeBorrar}
                    className={`p-0.5 rounded text-slate-500 hover:text-[#324354] hover:bg-slate-200 transition-opacity ${puedeBorrar ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
                    title="Borrar selecciones"
                    aria-label={`Borrar filtro ${titulo}`}
                >
                    <Eraser className="w-3 h-3" />
                </button>
            </div>
            <button
                type="button"
                onClick={() => setAbierto(v => !v)}
                className={`w-full h-6 bg-white border rounded px-2 text-[9px] font-semibold text-slate-800 flex items-center justify-between gap-1 ${abierto ? 'border-[#324354]' : 'border-slate-300'}`}
            >
                <span className="truncate capitalize">{texto}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>
            {abierto && (
                <div className="absolute left-0 top-full mt-1 z-40 w-full min-w-[170px] max-h-64 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg py-1">
                    {!minimoUno && (
                        <button type="button" onClick={() => onChange([])} className="w-full px-2 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left border-b border-slate-100">
                            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${todas ? 'bg-[#324354] border-[#324354]' : 'border-slate-400'}`}>
                                {todas && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                            </span>
                            Seleccionar todo
                        </button>
                    )}
                    {opciones.length === 0 && <p className="px-2 py-1.5 text-[11px] text-slate-400 italic">Sin opciones con datos</p>}
                    {opciones.map(o => {
                        const marcado = seleccion.includes(o.value);
                        return (
                            <button key={o.value} type="button" onClick={() => alternar(o.value)} className="w-full px-2 py-1.5 flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-100 text-left capitalize">
                                <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${marcado ? 'bg-[#324354] border-[#324354]' : 'border-slate-400'}`}>
                                    {marcado && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
