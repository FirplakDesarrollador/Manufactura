'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Eye, X } from 'lucide-react';

interface HistorialVaciadoFvProps {
    onNuevoRegistro: () => void;
}

export default function HistorialVaciadoFv({ onNuevoRegistro }: HistorialVaciadoFvProps) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistro, setSelectedRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_vaciado_fv')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setRegistros(data);
            }
        } catch (err) {
            console.error('Error fetching historial vaciado fv:', err);
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
            (r.operador && r.operador.toLowerCase().includes(term)) ||
            (r.referencia && r.referencia.toLowerCase().includes(term)) ||
            (r.tipo_resina && r.tipo_resina.toLowerCase().includes(term)) ||
            (r.catalizador_masilla && r.catalizador_masilla.toLowerCase().includes(term))
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
                        placeholder="Buscar por operario, referencia, tipo resina..."
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
                                <th className="px-4 py-3">Operario</th>
                                <th className="px-4 py-3">Referencia</th>
                                <th className="px-4 py-3">Tipo Resina</th>
                                <th className="px-4 py-3 text-center">Resina + Fibra</th>
                                <th className="px-4 py-3 text-center">% Res / % Fib</th>
                                <th className="px-4 py-3 text-center">Peso OK</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        Cargando historial de vaciado FV...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        No se encontraron registros de vaciado en Fibra de Vidrio.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                            {formatDate(row.created_at)}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-[#324354]">
                                            {row.operador || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-slate-800">
                                                {row.referencia || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                row.tipo_resina === 'Virgen' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {row.tipo_resina || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                                            {row.resina_mas_fibra != null ? row.resina_mas_fibra : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs">
                                            {row.resina_peso_total != null && row.fibra_peso_total != null ? (
                                                <span className="font-mono text-slate-600">
                                                    {row.resina_peso_total}% / {row.fibra_peso_total}%
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {row.peso_OK ? (
                                                <CheckCircle2 size={18} className="text-emerald-500 inline" />
                                            ) : (
                                                <XCircle size={18} className="text-red-500 inline" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedRegistro(row)}
                                                className="p-1.5 rounded-lg bg-sky-50 text-[#0099e5] hover:bg-[#0099e5] hover:text-white transition cursor-pointer"
                                                title="Ver detalle completo"
                                            >
                                                <Eye size={16} />
                                            </button>
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
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">
                                    Detalle Chequeo Vaciado FV #{selectedRegistro.id}
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

                        <div className="p-6 space-y-4 text-xs sm:text-sm">
                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Operario</span>
                                    <span className="font-semibold text-slate-800">{selectedRegistro.operador || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Referencia</span>
                                    <span className="font-semibold text-slate-800">{selectedRegistro.referencia || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Tipo de Resina</span>
                                    <span className="font-semibold text-slate-800">{selectedRegistro.tipo_resina || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Fecha Cambio Caneca</span>
                                    <span className="font-semibold text-slate-800">{selectedRegistro.fecha_cambio_caneca || '—'}</span>
                                </div>
                            </div>

                            {/* Parámetros Operativos */}
                            <div>
                                <h4 className="text-xs font-bold text-[#0099e5] uppercase mb-2">Parámetros Operativos</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Presión Resina</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.presion_resina ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Presión Chopper</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.presion_chopper ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">% Catalizador</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.porc_catalizador ? `${selectedRegistro.porc_catalizador}%` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Calentadores</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.calentadores || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Temp. Ambiente</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.temp_ambiente ? `${selectedRegistro.temp_ambiente} °C` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Cant. Masilla</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.cantidad_masilla ?? '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pesos y Proporciones */}
                            <div>
                                <h4 className="text-xs font-bold text-[#0099e5] uppercase mb-2">Pesos y Proporciones</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Peso Resina (15s)</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.peso_resina ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Peso Fibra (15s)</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.peso_fibra ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Resina + Fibra</span>
                                        <span className="font-bold text-slate-800">{selectedRegistro.resina_mas_fibra ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">% Resina</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.resina_peso_total ? `${selectedRegistro.resina_peso_total}%` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">% Fibra</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.fibra_peso_total ? `${selectedRegistro.fibra_peso_total}%` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Catalizador Masilla</span>
                                        <span className="font-semibold text-slate-700">{selectedRegistro.catalizador_masilla || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Verificaciones / Switches */}
                            <div>
                                <h4 className="text-xs font-bold text-[#0099e5] uppercase mb-2">Verificaciones de Calidad</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {[
                                        { label: 'Peso OK?', val: selectedRegistro.peso_OK },
                                        { label: 'Filtro Limpio?', val: selectedRegistro.filtro_limpio },
                                        { label: 'Se usó matt 225?', val: selectedRegistro.se_uso_matt },
                                        { label: 'Rodillos completos', val: selectedRegistro.rodillos_completos },
                                        { label: 'Rodillos limpios', val: selectedRegistro.rodillos_limpios },
                                        { label: 'Tarro catalizador limpio', val: selectedRegistro.tarro_catalizador_limpio },
                                        { label: 'Referencia Resina (4891)', val: selectedRegistro.resina_3835 },
                                        { label: 'Catalizador (Revox HD)', val: selectedRegistro.catalizador_LPT }
                                    ].map((check, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                            <span className="text-slate-700">{check.label}</span>
                                            {check.val ? (
                                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                    <CheckCircle2 size={14} /> SÍ
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-bold flex items-center gap-1">
                                                    <XCircle size={14} /> NO
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Observaciones */}
                            {selectedRegistro.observaciones && (
                                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
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
        </div>
    );
}
