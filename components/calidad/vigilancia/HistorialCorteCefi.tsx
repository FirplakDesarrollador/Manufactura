'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Eye, X, Pencil } from 'lucide-react';
import EditarRegistroVigilanciaModal from './EditarRegistroVigilanciaModal';

interface HistorialCorteCefiProps { onNuevoRegistro: () => void; }

interface CorteCefiRow {
    id: number;
    created_at: string;
    velocidad_maquina: number | null;
    cant_tableros: number | null;
    estado_disco: boolean;
    dimensiones_hoja_ruta: boolean;
    verificar_puesta_punto: string | null;
}

const BoolBadge = ({ v }: { v: boolean }) => v
    ? <CheckCircle2 size={16} className="text-emerald-500 inline" />
    : <XCircle size={16} className="text-red-500 inline" />;

export default function HistorialCorteCefi({ onNuevoRegistro }: HistorialCorteCefiProps) {
    const [registros, setRegistros] = useState<CorteCefiRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<CorteCefiRow | null>(null);
    const [editingRegistro, setEditingRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('pv_corte_cefi').select('*').order('created_at', { ascending: false }).limit(50);
            if (!error && data) setRegistros(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchHistorial(); }, []);

    const filtered = registros.filter(r => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (r.verificar_puesta_punto && r.verificar_puesta_punto.toLowerCase().includes(t)) || String(r.id).includes(t);
    });

    const formatDate = (d: string) => {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }); }
        catch { return d; }
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por puesta a punto, ID..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099e5]" />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchHistorial} disabled={loading} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={onNuevoRegistro} className="px-4 py-2 bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer">+ Nuevo Chequeo</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold">
                            <tr>
                                <th className="px-4 py-3">Fecha / Hora</th>
                                <th className="px-4 py-3 text-center">Vel. Máquina</th>
                                <th className="px-4 py-3 text-center">Cant. Tableros</th>
                                <th className="px-4 py-3 text-center">Estado Disco</th>
                                <th className="px-4 py-3 text-center">Dim. Hoja Ruta</th>
                                <th className="px-4 py-3">Puesta a Punto</th>
                                <th className="px-4 py-3 text-center">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Cargando historial de Corte CEFI...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin registros encontrados.</td></tr>
                            ) : filtered.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(row.created_at)}</td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-800">{row.velocidad_maquina ?? '—'}</td>
                                    <td className="px-4 py-3 text-center">{row.cant_tableros ?? '—'}</td>
                                    <td className="px-4 py-3 text-center"><BoolBadge v={row.estado_disco} /></td>
                                    <td className="px-4 py-3 text-center"><BoolBadge v={row.dimensiones_hoja_ruta} /></td>
                                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{row.verificar_puesta_punto || '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <button onClick={() => setSelected(row)} className="p-1.5 rounded-lg bg-sky-50 text-[#0099e5] hover:bg-[#0099e5] hover:text-white transition cursor-pointer"><Eye size={16} /></button>
                                                <button onClick={() => setEditingRegistro(row)} title="Editar registro" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition cursor-pointer"><Pencil size={15} /></button>
                                            </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full animate-in zoom-in-95 duration-150 overflow-hidden">
                        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">Detalle Corte CEFI #{selected.id}</h3>
                                <p className="text-xs text-slate-400">{formatDate(selected.created_at)}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 text-xs sm:text-sm">
                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Velocidad Máquina</span><span className="font-semibold text-slate-800">{selected.velocidad_maquina ?? '—'}</span></div>
                                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Cant. Tableros</span><span className="font-semibold text-slate-800">{selected.cant_tableros ?? '—'}</span></div>
                                <div className="col-span-2"><span className="text-[10px] font-bold text-slate-400 uppercase block">Verificar Puesta Punto</span><span className="font-semibold text-slate-800">{selected.verificar_puesta_punto || '—'}</span></div>
                            </div>
                            {[
                                { label: 'Estado del Disco', val: selected.estado_disco },
                                { label: 'Dimensiones hoja de ruta', val: selected.dimensiones_hoja_ruta }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-slate-700 font-medium">{item.label}</span>
                                    {item.val ? <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs"><CheckCircle2 size={14} /> CUMPLE</span>
                                        : <span className="text-red-500 font-bold flex items-center gap-1 text-xs"><XCircle size={14} /> NO</span>}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={() => setSelected(null)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        
            {editingRegistro && (
                <EditarRegistroVigilanciaModal
                    tabla="pv_corte_cefi"
                    titulo="Corte CEFI"
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
