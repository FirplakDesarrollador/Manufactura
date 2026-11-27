'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import EditarRegistroVigilanciaModal from './EditarRegistroVigilanciaModal';

interface HistorialOtrosMsProps {
    onNuevoRegistro: () => void;
}

export default function HistorialOtrosMs({ onNuevoRegistro }: HistorialOtrosMsProps) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistro, setSelectedRegistro] = useState<any | null>(null);
    const [editingRegistro, setEditingRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_otros_ms')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(40);

            if (!error && data) {
                setRegistros(data);
            }
        } catch (err) {
            console.error('Error fetching historial otros ms:', err);
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
        return String(r.id).includes(term);
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
            'espatula_filo', 'cepillo_cerdas', 'contramolde_sin_exceso', 'malla_gallinero',
            'her_insp_lvm', 'her_insp_mesones', 'her_sacar_mesones', 'her_sacar_lvm',
            'etiqueta_pegada', 'marcar_desague', 'buen_acabado', 'palo_descubrir_burbujas',
            'puesta_punto', 'durometro', 'pulidora_con_lija', 'piezas_adecuadas_estanteria',
            'pesas_guia', 'rasqueta', 'uso_rotoflex', 'puesta_punto_pulido',
            'guia_perforacion_flauta', 'guia_quadratto_48', 'guia_quadratto_63',
            'guia_quadratto_79', 'guia_quadratto_94'
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
                        placeholder="Buscar por ID de registro..."
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
                                <th className="py-3 px-4 text-center">Desprensado</th>
                                <th className="py-3 px-4 text-center">Etiquetas</th>
                                <th className="py-3 px-4 text-center">Desmolde / Tapa</th>
                                <th className="py-3 px-4 text-center">Aux Pulido</th>
                                <th className="py-3 px-4 text-center">Total Cumplidos</th>
                                <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-400">
                                        Cargando historial de Otros MS...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-400">
                                        No se encontraron registros de chequeo en Otros MS.
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
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {[r.espatula_filo, r.cepillo_cerdas, r.contramolde_sin_exceso, r.malla_gallinero].filter(Boolean).length} / 4
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {[r.her_insp_lvm, r.her_insp_mesones, r.her_sacar_mesones, r.her_sacar_lvm, r.etiqueta_pegada, r.marcar_desague].filter(Boolean).length} / 6
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {[r.buen_acabado, r.palo_descubrir_burbujas, r.puesta_punto, r.durometro].filter(Boolean).length} / 4
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                                                {[
                                                    r.pulidora_con_lija, r.piezas_adecuadas_estanteria, r.pesas_guia,
                                                    r.rasqueta, r.uso_rotoflex, r.puesta_punto_pulido,
                                                    r.guia_perforacion_flauta, r.guia_quadratto_48, r.guia_quadratto_63,
                                                    r.guia_quadratto_79, r.guia_quadratto_94
                                                ].filter(Boolean).length} / 11
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    cumplidos >= 20
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {cumplidos} / 25
                                                </span>
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
                        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-[#324354]">
                                    Detalle Plan de Vigilancia · Otros MS
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

                        {[
                            {
                                title: 'Desprensado',
                                items: [
                                    { label: 'Espatula con filo', val: selectedRegistro.espatula_filo },
                                    { label: 'Cepillo de cerdas', val: selectedRegistro.cepillo_cerdas },
                                    { label: 'Contramolde sin exceso de masa', val: selectedRegistro.contramolde_sin_exceso },
                                    { label: 'Malla de gallinero', val: selectedRegistro.malla_gallinero }
                                ]
                            },
                            {
                                title: 'Etiquetas',
                                items: [
                                    { label: 'Her insp de mamonetes LVM y LVR', val: selectedRegistro.her_insp_lvm },
                                    { label: 'Her insp de mamonetes Mesones y LVP', val: selectedRegistro.her_insp_mesones },
                                    { label: 'Her para sacar mamonetes Mesones y LVP', val: selectedRegistro.her_sacar_mesones },
                                    { label: 'Her para sacar mamonetes LVM y LVR', val: selectedRegistro.her_sacar_lvm },
                                    { label: 'Etiqueta bien pegada', val: selectedRegistro.etiqueta_pegada },
                                    { label: 'Marcar desague', val: selectedRegistro.marcar_desague }
                                ]
                            },
                            {
                                title: 'Tapa Huecos y Desmolde',
                                items: [
                                    { label: 'Buen acabado?', val: selectedRegistro.buen_acabado },
                                    { label: 'Palo para descubrir burbujas', val: selectedRegistro.palo_descubrir_burbujas },
                                    { label: 'Puesta a punto (Desmolde)', val: selectedRegistro.puesta_punto },
                                    { label: 'Durometro', val: selectedRegistro.durometro }
                                ]
                            },
                            {
                                title: 'Aux Pulido',
                                items: [
                                    { label: 'Pulidora con lija 40 (prohibida)', val: selectedRegistro.pulidora_con_lija },
                                    { label: 'Piezas adecuadas en estantería', val: selectedRegistro.piezas_adecuadas_estanteria },
                                    { label: 'Pesas y/o guia en piezas criticas', val: selectedRegistro.pesas_guia },
                                    { label: 'Rasqueta', val: selectedRegistro.rasqueta },
                                    { label: 'Uso del rotoflex #2', val: selectedRegistro.uso_rotoflex },
                                    { label: 'Puesta a punto (Pulido)', val: selectedRegistro.puesta_punto_pulido },
                                    { label: 'Guia perforación de flauta', val: selectedRegistro.guia_perforacion_flauta },
                                    { label: 'Guia Quadratto 48', val: selectedRegistro.guia_quadratto_48 },
                                    { label: 'Guia Quadratto 63', val: selectedRegistro.guia_quadratto_63 },
                                    { label: 'Guia Quadratto 79', val: selectedRegistro.guia_quadratto_79 },
                                    { label: 'Guia Quadratto 94', val: selectedRegistro.guia_quadratto_94 }
                                ]
                            }
                        ].map((group, gIdx) => (
                            <div key={gIdx} className={gIdx > 0 ? 'border-t border-slate-100 pt-4' : ''}>
                                <h4 className="text-xs font-bold text-[#0099e5] uppercase tracking-wider mb-2.5">
                                    {group.title}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {group.items.map((item, idx) => (
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
                        ))}

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
                    tabla="pv_otros_ms"
                    titulo="Otros MS"
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

