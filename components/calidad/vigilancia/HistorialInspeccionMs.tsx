'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import EditarRegistroVigilanciaModal from './EditarRegistroVigilanciaModal';

interface HistorialInspeccionMsProps {
    onNuevoRegistro: () => void;
}

export default function HistorialInspeccionMs({ onNuevoRegistro }: HistorialInspeccionMsProps) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistro, setSelectedRegistro] = useState<any | null>(null);
    const [editingRegistro, setEditingRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_inspeccion_ms')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(40);

            if (!error && data) {
                setRegistros(data);
            }
        } catch (err) {
            console.error('Error fetching historial inspeccion ms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
    }, []);

    const filtered = registros.filter(r => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            (r.observaciones && r.observaciones.toLowerCase().includes(term)) ||
            String(r.id).includes(term)
        );
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    const countCumple = (r: any) => {
        const keys = [
            'galga_lvr', 'nivel', 'pandeo', 'palo_descubrir_burbujas',
            'pinta_garantia_flautas', 'guia_plantillas_mesones', 'pieza_despique_pestaña',
            'marcar_etiqueta', 'tapa_desagues_pegados_correctos', 'etiqueta_correcta',
            'etiqueta_bien_puesta', 'empaque_honeycomb'
        ];
        return keys.filter(k => Boolean(r[k])).length;
    };

    return (
        <div className="w-full space-y-4">
            {/* Barra de herramientas superior */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por ID u observaciones..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchHistorial}
                        disabled={loading}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={onNuevoRegistro}
                        className="px-4 py-2 bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
                    >
                        + Nuevo Chequeo
                    </button>
                </div>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                                <th className="py-3 px-4">ID</th>
                                <th className="py-3 px-4">Fecha / Hora</th>
                                <th className="py-3 px-4 text-center">Galga LVR</th>
                                <th className="py-3 px-4 text-center">Nivel / Pandeo</th>
                                <th className="py-3 px-4 text-center">Etiqueta / Honeycomb</th>
                                <th className="py-3 px-4 text-center">Cumplimiento</th>
                                <th className="py-3 px-4">Observaciones</th>
                                <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-400">
                                        Cargando historial de Inspección MS...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-400">
                                        No se encontraron registros de chequeo en Inspección MS.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r) => {
                                    const cumplidos = countCumple(r);
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2.5 px-4 font-mono font-bold text-slate-500">
                                                #{r.id}
                                            </td>
                                            <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                                                {formatDate(r.created_at)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                {r.galga_lvr ? (
                                                    <span className="text-emerald-600 font-bold">Sí</span>
                                                ) : (
                                                    <span className="text-red-500 font-bold">No</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {r.nivel ? '✓' : '✕'} / {r.pandeo ? '✓' : '✕'}
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {r.etiqueta_correcta ? '✓' : '✕'} / {r.empaque_honeycomb ? '✓' : '✕'}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    cumplidos >= 10
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {cumplidos} / 12
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                                                {r.observaciones || '-'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedRegistro(r)}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#324354] hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                                                >
                                                    Ver Detalle
                                                </button>
                                                <button onClick={() => setEditingRegistro(r)} title="Editar registro" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0099e5] text-[#0099e5] hover:text-white border border-sky-200 font-semibold text-[11px] transition cursor-pointer"><Pencil size={12} /> Editar</button>
                                            </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle Completo del Registro */}
            {selectedRegistro && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setSelectedRegistro(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-[#324354]">
                                    Detalle Plan de Vigilancia · Inspección MS
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Registrado el {formatDate(selectedRegistro.created_at)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRegistro(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Checklist Inspección */}
                        <div>
                            <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider mb-2.5">
                                Inspección
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {[
                                    { label: 'Galga LVR y LVM', val: selectedRegistro.galga_lvr },
                                    { label: 'Nivel', val: selectedRegistro.nivel },
                                    { label: 'Pandeo', val: selectedRegistro.pandeo },
                                    { label: 'Palo para descubrir burbujas', val: selectedRegistro.palo_descubrir_burbujas },
                                    { label: 'Pinta de garantía en flautas', val: selectedRegistro.pinta_garantia_flautas },
                                    { label: 'Guía plantillas mesones (7)', val: selectedRegistro.guia_plantillas_mesones },
                                    { label: 'Pieza sin despique en pestaña', val: selectedRegistro['pieza_despique_pestaña'] },
                                    { label: 'Marcar etiqueta', val: selectedRegistro.marcar_etiqueta }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                                        <span className="text-slate-700 font-medium">{item.label}</span>
                                        {item.val ? (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                                <CheckCircle2 size={13} /> Cumple
                                            </span>
                                        ) : (
                                            <span className="text-red-500 font-bold flex items-center gap-1 text-[11px]">
                                                <XCircle size={13} /> No
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Checklist Desmolde */}
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-[#0099e5] uppercase tracking-wider mb-2.5">
                                Desmolde
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {[
                                    { label: 'Tapa desagues bien pegados y correctos', val: selectedRegistro.tapa_desagues_pegados_correctos },
                                    { label: 'Etiqueta correcta', val: selectedRegistro.etiqueta_correcta },
                                    { label: 'Etiqueta bien puesta', val: selectedRegistro.etiqueta_bien_puesta },
                                    { label: 'Empaque con honeycomb', val: selectedRegistro.empaque_honeycomb }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                                        <span className="text-slate-700 font-medium">{item.label}</span>
                                        {item.val ? (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                                <CheckCircle2 size={13} /> Cumple
                                            </span>
                                        ) : (
                                            <span className="text-red-500 font-bold flex items-center gap-1 text-[11px]">
                                                <XCircle size={13} /> No
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Observaciones */}
                        {selectedRegistro.observaciones && (
                            <div className="border-t border-slate-100 pt-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observaciones</span>
                                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    {selectedRegistro.observaciones}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedRegistro(null)}
                                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        
            {editingRegistro && (
                <EditarRegistroVigilanciaModal
                    tabla="pv_inspeccion_ms"
                    titulo="Inspección MS"
                    registro={editingRegistro}
                    onClose={() => setEditingRegistro(null)}
                    onSaved={() => {
                        setEditingRegistro(null);
                        fetchHistorial();
                    }}
                />
            )}
        </div>
    );
}

