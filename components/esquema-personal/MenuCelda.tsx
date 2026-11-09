'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, UserX } from 'lucide-react';
import type { Asignacion, Empleado, EstadoCelda } from '@/lib/esquema-personal';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista desplegable de una celda: el personal de la planta (Talento Humano) y las opciones de vacante.
// Se dibuja con posición fija para que la tabla con scroll no la recorte.
export default function MenuCelda({ rect, actual, personal, ubicacion, onPersona, onEstado, onVaciar, onDetalle, onCerrar }: {
    rect: DOMRect;
    actual: Asignacion | null;
    personal: Empleado[];              // personal activo de la planta según TH
    ubicacion: Map<number, string>;    // empleado_id → dónde está en el esquema
    onPersona: (e: Empleado) => void;
    onEstado: (estado: EstadoCelda) => void;
    onVaciar: () => void;
    onDetalle: () => void;
    onCerrar: () => void;
}) {
    const [texto, setTexto] = useState('');
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cerrarFuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar(); };
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        const desplazar = (e: Event) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar(); };
        document.addEventListener('mousedown', cerrarFuera);
        document.addEventListener('keydown', tecla);
        window.addEventListener('scroll', desplazar, true);
        window.addEventListener('resize', onCerrar);
        return () => {
            document.removeEventListener('mousedown', cerrarFuera);
            document.removeEventListener('keydown', tecla);
            window.removeEventListener('scroll', desplazar, true);
            window.removeEventListener('resize', onCerrar);
        };
    }, [onCerrar]);

    const grupos = useMemo(() => {
        const q = sinTildes(texto.trim());
        const l = personal.filter(e => e.id !== actual?.empleado_id && (!q || q.split(' ').every(p => sinTildes(`${e.nombre} ${e.cargo || ''}`).includes(p))));
        return [
            { titulo: 'Sin ubicar', items: l.filter(e => !ubicacion.has(e.id)) },
            { titulo: 'Ya ubicados · se mueven a esta celda', items: l.filter(e => ubicacion.has(e.id)) }
        ].filter(g => g.items.length);
    }, [texto, personal, ubicacion, actual?.empleado_id]);

    // Se abre debajo de la celda; si no cabe, encima
    const ancho = Math.max(rect.width, 280);
    const alto = 360;
    const abajo = rect.bottom + alto < window.innerHeight || rect.top < alto;
    const izquierda = Math.min(rect.left, window.innerWidth - ancho - 8);

    const opcion = 'w-full text-left px-2.5 py-1 text-[12px] font-bold hover:bg-[#F6F3EE] flex items-center gap-1.5';
    return (
        <div ref={caja} style={{ position: 'fixed', left: Math.max(8, izquierda), width: ancho, ...(abajo ? { top: rect.bottom + 2 } : { bottom: window.innerHeight - rect.top + 2 }) }}
            className="z-[55] bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden">
            <div className="p-1.5 border-b border-slate-100 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input autoFocus value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar en el personal de la planta…"
                    className="w-full border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-[13px] outline-none focus:border-[#324354]" />
            </div>
            <div className="max-h-[300px] overflow-y-auto py-0.5">
                {!texto && (
                    <div className="border-b border-slate-100 pb-0.5 mb-0.5">
                        {actual?.estado !== 'vacante' && <button type="button" onClick={() => onEstado('vacante')} className={`${opcion} text-rose-700`}><span className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" /> Vacante</button>}
                        {actual?.estado !== 'vacante_no_activa' && <button type="button" onClick={() => onEstado('vacante_no_activa')} className={`${opcion} text-slate-600`}><span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300" /> Vacante no activa</button>}
                        {actual?.estado === 'ocupado' && <button type="button" onClick={onDetalle} className={`${opcion} text-[#324354]`}><SlidersHorizontal className="w-3.5 h-3.5" /> Nuevo (N) / novedad…</button>}
                        {actual && <button type="button" onClick={onVaciar} className={`${opcion} text-slate-500`}><UserX className="w-3.5 h-3.5" /> Dejar vacía</button>}
                    </div>
                )}
                {grupos.map(g => (
                    <div key={g.titulo}>
                        <div className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">{g.titulo}</div>
                        {g.items.map(e => (
                            <button key={e.id} type="button" onClick={() => onPersona(e)} className="w-full text-left px-2.5 py-1 hover:bg-[#F6F3EE]">
                                <span className="block text-[12px] font-semibold text-[#324354] leading-tight">{e.nombre}</span>
                                <span className="block text-[10px] text-slate-500 leading-tight truncate">{ubicacion.get(e.id) || e.cargo}</span>
                            </button>
                        ))}
                    </div>
                ))}
                {!grupos.length && (
                    <p className="px-2.5 py-3 text-[11px] text-slate-400 text-center">
                        {personal.length ? 'No hay personas que coincidan.' : 'No hay personal de esta planta en Talento Humano. Revise “Planta en Talento Humano” en Editar estructura.'}
                    </p>
                )}
            </div>
        </div>
    );
}
