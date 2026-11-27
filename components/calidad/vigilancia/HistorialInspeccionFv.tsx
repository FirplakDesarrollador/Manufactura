'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Eye, X, Pencil } from 'lucide-react';
import EditarRegistroVigilanciaModal from './EditarRegistroVigilanciaModal';

interface HistorialInspeccionFvProps {
    onNuevoRegistro: () => void;
}

export default function HistorialInspeccionFv({ onNuevoRegistro }: HistorialInspeccionFvProps) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistro, setSelectedRegistro] = useState<any | null>(null);
    const [editingRegistro, setEditingRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_inspeccion_fv')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setRegistros(data);
            }
        } catch (err) {
            console.error('Error fetching historial inspeccion fv:', err);
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
            (String(r.id).includes(term))
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

    const StatusBadge = ({ value, label }: { value: boolean; label: string }) => (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            title={label}
        >
            {value ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            <span>{value ? 'OK' : 'NO'}</span>
        </span>
    );

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
                        placeholder="Buscar por ID, observaciones..."
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

            {/* Tabla de registros */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold">
                            <tr>
                                <th className="px-4 py-3">Fecha / Hora</th>
                                <th className="px-4 py-3 text-center">Cinta Seguridad</th>
                                <th className="px-4 py-3 text-center">Caja Completa</th>
                                <th className="px-4 py-3 text-center">Galga Espesores</th>
                                <th className="px-4 py-3 text-center">Inspección Espejo</th>
                                <th className="px-4 py-3 text-center">Desagüe Rubor</th>
                                <th className="px-4 py-3">Observaciones</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        Cargando historial de inspección FV...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        No se encontraron registros de inspección en Fibra de Vidrio.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                            {formatDate(row.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge value={row.caja_accesorios_cinta_seguridad} label="Cinta Seguridad" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge value={row.caja_accesorios_completa} label="Caja Completa" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge value={row.galga_espesores} label="Galga Espesores" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge value={row.inspeccion_espejo} label="Inspección Espejo" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge value={row.desague_rubor} label="Desagüe Rubor" />
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                                            {row.observaciones || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <button
                                                onClick={() => setSelectedRegistro(row)}
                                                className="p-1.5 rounded-lg bg-sky-50 text-[#0099e5] hover:bg-[#0099e5] hover:text-white transition cursor-pointer"
                                                title="Ver detalle completo"
                                            >
                                                <Eye size={16} />
                                            </button>
                                                <button onClick={() => setEditingRegistro(row)} title="Editar registro" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition cursor-pointer"><Pencil size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle */}
            {selectedRegistro && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full animate-in zoom-in-95 duration-150 overflow-hidden">
                        <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">
                                    Detalle Inspección FV #{selectedRegistro.id}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {formatDate(selectedRegistro.created_at)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRegistro(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-3 text-xs sm:text-sm">
                            <h4 className="text-xs font-bold text-[#0099e5] uppercase mb-2">Puntos de Control</h4>
                            <div className="space-y-2">
                                {[
                                    { label: 'Caja de accesorios con cinta de seguridad', val: selectedRegistro.caja_accesorios_cinta_seguridad },
                                    { label: 'Caja de accesorios completa', val: selectedRegistro.caja_accesorios_completa },
                                    { label: 'Galga para espesores', val: selectedRegistro.galga_espesores },
                                    { label: 'Inspeccion con espejo', val: selectedRegistro.inspeccion_espejo },
                                    { label: 'Desague con rubor', val: selectedRegistro.desague_rubor }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-700 font-medium">{item.label}</span>
                                        {item.val ? (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                                                <CheckCircle2 size={16} /> CUMPLE
                                            </span>
                                        ) : (
                                            <span className="text-red-500 font-bold flex items-center gap-1 text-xs">
                                                <XCircle size={16} /> NO CUMPLE
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {selectedRegistro.observaciones && (
                                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl mt-3">
                                    <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1">Observaciones</span>
                                    <p className="text-slate-700 italic">{selectedRegistro.observaciones}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button
                                onClick={() => setSelectedRegistro(null)}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        
            {editingRegistro && (
                <EditarRegistroVigilanciaModal
                    tabla="pv_inspeccion_fv"
                    titulo="Inspección FV"
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

