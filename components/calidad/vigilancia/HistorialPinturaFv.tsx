'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface HistorialPinturaFvProps {
    onNuevoRegistro: () => void;
}

export default function HistorialPinturaFv({ onNuevoRegistro }: HistorialPinturaFvProps) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistro, setSelectedRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_pintura_fv')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(40);

            if (!error && data) {
                setRegistros(data);
            }
        } catch (err) {
            console.error('Error fetching historial pintura fv:', err);
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
            (r.Pintor && r.Pintor.toLowerCase().includes(term)) ||
            (r.referencia && r.referencia.toLowerCase().includes(term)) ||
            (r.Lote && r.Lote.toLowerCase().includes(term)) ||
            (r.Color && r.Color.toLowerCase().includes(term))
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
                        placeholder="Buscar por pintor, referencia, lote, color..."
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
                                <th className="py-3 px-4">Fecha / Hora</th>
                                <th className="py-3 px-4">Pintor</th>
                                <th className="py-3 px-4">Referencia</th>
                                <th className="py-3 px-4">Abanico</th>
                                <th className="py-3 px-4">Presión (Din/Est)</th>
                                <th className="py-3 px-4">% Cataliz.</th>
                                <th className="py-3 px-4">Lote / Color</th>
                                <th className="py-3 px-4 text-center">Peso OK</th>
                                <th className="py-3 px-4 text-center">Uso Galga</th>
                                <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-8 text-center text-slate-400">
                                        Cargando historial de Pintura FV...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-8 text-center text-slate-400">
                                        No se encontraron registros de chequeo en Pintura FV.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-2.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                                            {formatDate(r.created_at)}
                                        </td>
                                        <td className="py-2.5 px-4 font-bold text-slate-800">
                                            {r.Pintor || '-'}
                                        </td>
                                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                                            {r.referencia || '-'}
                                        </td>
                                        <td className="py-2.5 px-4 font-mono text-slate-600">
                                            {r.Abanico ?? '-'}
                                        </td>
                                        <td className="py-2.5 px-4 font-mono text-slate-600">
                                            {r.Presion ?? '-'} / {r.Presion_Estatica ?? '-'}
                                        </td>
                                        <td className="py-2.5 px-4 font-mono text-slate-600">
                                            {r.Porc_Catalizador ? `${r.Porc_Catalizador}%` : '-'}
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-700">
                                            <span className="font-semibold">{r.Lote || '-'}</span>
                                            {r.Color && <span className="text-slate-400 block text-[10px]">{r.Color}</span>}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            {r.peso_ok ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <CheckCircle2 size={11} /> Sí
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                                    <XCircle size={11} /> No
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            {r.Uso_Galga ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <CheckCircle2 size={11} /> Sí
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                                    <XCircle size={11} /> No
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedRegistro(r)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#324354] hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
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
                        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-[#324354]">
                                    Detalle Plan de Vigilancia · Pintura FV
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

                        {/* Datos principales */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Pintor</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Pintor || '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Referencia</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.referencia || '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lote / Color</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Lote || '-'} · {selectedRegistro.Color || '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Abanico</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Abanico ?? '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Presión (Din / Est)</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Presion ?? '-'} / {selectedRegistro.Presion_Estatica ?? '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">% Catalizador</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Porc_Catalizador ? `${selectedRegistro.Porc_Catalizador}%` : '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Temp. Ambiente</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.Temp_Ambiente ?? '-'}°</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tiempo Espera</span>
                                <span className="font-bold text-slate-800 text-sm">{selectedRegistro.tiempo_esperar ? `${selectedRegistro.tiempo_esperar} min` : '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Galgas (Sup/Pared/Piso/Pest)</span>
                                <span className="font-bold text-slate-800 text-sm">
                                    {selectedRegistro.Galga_superior ?? '-'} / {selectedRegistro.galga_paredes ?? '-'} / {selectedRegistro.galga_inferior ?? '-'} / {selectedRegistro.galga_pestana ?? '-'}
                                </span>
                            </div>
                        </div>

                        {/* Parámetros booleanos */}
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider mb-2.5">
                                Parámetros de Verificación
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                {[
                                    { label: 'Peso OK?', val: selectedRegistro.peso_ok },
                                    { label: 'Uso de galga', val: selectedRegistro.Uso_Galga },
                                    { label: 'Galga en buen estado', val: selectedRegistro.Galga_Buen_Estado }
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
        </div>
    );
}

