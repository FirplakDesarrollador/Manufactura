'use client';

import React, { useMemo, useState } from 'react';
import { Search, UserX, X } from 'lucide-react';
import type { Asignacion, ContenidoCelda, Empleado, EstadoCelda, Puesto, Turno } from '@/lib/esquema-personal';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Buscador de personas de Talento Humano: primero las de la planta sin ubicar, luego el resto de la planta y otras plantas
export function BuscadorPersona({ empleados, plantaTh, ubicacion, onElegir, autoFocus = true }: {
    empleados: Empleado[];
    plantaTh: string | null;
    ubicacion: Map<number, string>;   // empleado_id → dónde está en el esquema
    onElegir: (e: { id: number; nombre: string }) => void;
    autoFocus?: boolean;
}) {
    const [texto, setTexto] = useState('');
    const lista = useMemo(() => {
        const q = sinTildes(texto.trim());
        const coincide = (e: Empleado) => !q || q.split(' ').every(p => sinTildes(`${e.nombre} ${e.cargo || ''}`).includes(p));
        const plantas = (plantaTh || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        const dePlanta = (e: Empleado) => plantas.includes((e.planta || '').trim().toLowerCase());
        const filtrados = empleados.filter(coincide);
        const grupos = [
            { titulo: 'De la planta, sin ubicar', items: filtrados.filter(e => dePlanta(e) && !ubicacion.has(e.id)) },
            { titulo: 'De la planta, ya ubicados', items: filtrados.filter(e => dePlanta(e) && ubicacion.has(e.id)) },
            { titulo: 'Otras plantas', items: q ? filtrados.filter(e => !dePlanta(e)) : [] }
        ];
        return grupos.map(g => ({ ...g, items: g.items.slice(0, 60) })).filter(g => g.items.length);
    }, [texto, empleados, plantaTh, ubicacion]);

    return (
        <div>
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input autoFocus={autoFocus} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar persona por nombre o cargo…"
                    className="w-full border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-sm font-medium text-[#324354] outline-none focus:border-[#324354]" />
            </div>
            <div className="mt-1.5 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {lista.map(g => (
                    <div key={g.titulo}>
                        <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 sticky top-0">{g.titulo}</div>
                        {g.items.map(e => (
                            <button key={e.id} type="button" onClick={() => onElegir({ id: e.id, nombre: e.nombre })}
                                className="w-full text-left px-2.5 py-1 hover:bg-[#F6F3EE] flex items-baseline justify-between gap-2">
                                <span className="text-[13px] font-semibold text-[#324354] truncate">{e.nombre}</span>
                                <span className="text-[10px] text-slate-500 truncate text-right shrink-0 max-w-[50%]">
                                    {ubicacion.get(e.id) || [e.cargo, e.planta !== plantaTh ? e.planta : null].filter(Boolean).join(' · ')}
                                </span>
                            </button>
                        ))}
                    </div>
                ))}
                {!lista.length && <p className="px-2.5 py-3 text-xs text-slate-400 text-center">No hay personas que coincidan.</p>}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Solo personal activo de Talento Humano. Si alguien no aparece, debe crearse o activarse en la app de TH.</p>
        </div>
    );
}

// Ventana para cambiar lo que hay en una celda (puesto × turno)
export default function EditorCelda({ puesto, turno, actual, nombreActual, empleados, plantaTh, ubicacion, guardando, onGuardar, onCerrar }: {
    puesto: Puesto;
    turno: Turno;
    actual: Asignacion | null;
    nombreActual: string;
    empleados: Empleado[];
    plantaTh: string | null;
    ubicacion: Map<number, string>;
    guardando: boolean;
    onGuardar: (c: ContenidoCelda | null) => void;
    onCerrar: () => void;
}) {
    const [persona, setPersona] = useState<{ id: number; nombre: string } | null>(
        actual?.estado === 'ocupado' && actual.empleado_id != null ? { id: actual.empleado_id, nombre: nombreActual } : null
    );
    const [nuevo, setNuevo] = useState(actual?.nuevo ?? false);
    const [novedad, setNovedad] = useState(actual?.novedad ?? '');
    const otraUbicacion = persona ? ubicacion.get(persona.id) : undefined;
    const esLaMisma = !!persona && persona.id === actual?.empleado_id;

    const guardarEstado = (estado: EstadoCelda) => onGuardar({ empleado: null, estado, nuevo: false, novedad: '' });

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto" onMouseDown={onCerrar}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4" onMouseDown={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{turno.nombre}{turno.horario ? ` · ${turno.horario}` : ''}</p>
                        <h3 className="text-base font-black text-[#324354]">{puesto.nombre}</h3>
                    </div>
                    <button type="button" onClick={onCerrar} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" title="Cerrar"><X className="w-5 h-5" /></button>
                </div>

                {persona ? (
                    <div className="rounded-xl border border-slate-200 bg-[#F6F3EE] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-[#324354]">{persona.nombre}</span>
                            <button type="button" onClick={() => setPersona(null)} className="text-[11px] font-bold text-slate-500 hover:text-[#324354] hover:underline">Cambiar</button>
                        </div>
                        {otraUbicacion && !esLaMisma && (
                            <p className="text-[11px] font-bold text-amber-800">Ya está en {otraUbicacion}. Al guardar queda en los dos lugares; para pasarla de puesto arrástrela en el esquema.</p>
                        )}
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <input type="checkbox" checked={nuevo} onChange={e => setNuevo(e.target.checked)} className="w-4 h-4 accent-[#324354]" /> Nuevo (N)
                        </label>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Novedad (opcional)</label>
                            <input value={novedad} onChange={e => setNovedad(e.target.value)} placeholder="Ej. vacaciones 3-7 nov, en formación…"
                                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#324354] outline-none focus:border-[#324354] bg-white" />
                        </div>
                    </div>
                ) : (
                    <BuscadorPersona empleados={empleados} plantaTh={plantaTh} ubicacion={ubicacion} onElegir={setPersona} />
                )}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button type="button" disabled={guardando} onClick={() => guardarEstado('vacante')} className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-100 disabled:opacity-50">Vacante</button>
                    <button type="button" disabled={guardando} onClick={() => guardarEstado('vacante_no_activa')} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 disabled:opacity-50">Vacante no activa</button>
                    {actual && (
                        <button type="button" disabled={guardando} onClick={() => onGuardar(null)} className="px-2.5 py-1.5 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 disabled:opacity-50">
                            <UserX className="w-3.5 h-3.5" /> Dejar vacía
                        </button>
                    )}
                    <div className="flex-1" />
                    <button type="button" onClick={onCerrar} className="px-3 py-1.5 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-100">Cancelar</button>
                    <button type="button" disabled={!persona || guardando} onClick={() => persona && onGuardar({ empleado: persona, estado: 'ocupado', nuevo, novedad })}
                        className="px-4 py-1.5 rounded-lg bg-[#324354] hover:bg-[#25323f] text-white text-sm font-bold disabled:opacity-40">
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
