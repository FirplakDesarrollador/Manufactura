'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, CheckCircle2, XCircle, Eye, X, Pencil } from 'lucide-react';
import EditarRegistroVigilanciaModal from './EditarRegistroVigilanciaModal';

interface HistorialMoldesProps {
    onNuevoRegistro: () => void;
}

interface MoldesRow {
    id: number;
    created_at: string;
    auditadoPor: string;
    pinesCentrados: boolean;
    ceraGlass: boolean;
    golpesCaidas: boolean;
    defectoReparacion: boolean;
    DejaCaerMolde: boolean | null;
    golpesContramolde: boolean;
    aplicaPlastilina: boolean;
    acumulacionCera: boolean;
    aplicaCeraGlass: boolean;
    Deformaciones: boolean | null;
    despiqueFisuras: boolean;
    rebabas: boolean;
    prensas: boolean;
    RayaMolde: boolean | null;
    golpesMoldes: boolean;
    rayaEspatula: boolean;
    objetosDentro: boolean;
    observacionesAlistamiento: string | null;
    observacionesEncerado: string | null;
    observacionesDesprensado: string | null;
    observacionesDesmolde: string | null;
    [key: string]: unknown;
}

const ITEMS_CHECK = [
    { key: 'pinesCentrados', section: 'Alistamiento de Moldes', label: '¿El molde tiene los pines centrados?' },
    { key: 'ceraGlass', section: 'Alistamiento de Moldes', label: '¿Se aplicó la cera glass y 1140 en las partes definidas?' },
    { key: 'golpesCaidas', section: 'Alistamiento de Moldes', label: '¿El molde está libre de golpes, caídas o mala manipulación?' },
    { key: 'defectoReparacion', section: 'Alistamiento de Moldes', label: '¿Se reportan moldes con defectos y se sacan a reparación?' },
    { key: 'DejaCaerMolde', section: 'Alistamiento de Moldes', label: '¿La línea cuenta con tope para evitar caída del molde?' },

    { key: 'golpesContramolde', section: 'Encerado y Alistamiento CM', label: '¿El contramolde se trabaja sin golpes de cincel ni martillo?' },
    { key: 'aplicaPlastilina', section: 'Encerado y Alistamiento CM', label: '¿Se aplica plastilina en partes reventadas y despiques leves?' },
    { key: 'acumulacionCera', section: 'Encerado y Alistamiento CM', label: '¿El contramolde está libre de acumulación excesiva de cera/masa?' },
    { key: 'aplicaCeraGlass', section: 'Encerado y Alistamiento CM', label: '¿Se aplica la cera Glass en todo el contramolde?' },
    { key: 'Deformaciones', section: 'Encerado y Alistamiento CM', label: '¿El contramolde está libre de deformaciones internas?' },

    { key: 'despiqueFisuras', section: 'Desprensado A/B', label: '¿Se descarga cuidadosamente el contramolde (sin golpes bruscos)?' },
    { key: 'rebabas', section: 'Desprensado A/B', label: '¿La pestaña del molde permanece sin rayones en remoción de rebabas?' },
    { key: 'prensas', section: 'Desprensado A/B', label: '¿Se colocan las prensas sin dejarlas caer sobre molde/contramolde?' },

    { key: 'RayaMolde', section: 'Desmolde', label: '¿Se desmonta la pieza sin rayar el molde?' },
    { key: 'golpesMoldes', section: 'Desmolde', label: '¿Se coloca el contramolde sin golpear el molde?' },
    { key: 'rayaEspatula', section: 'Desmolde', label: '¿Se desmolda con la espátula sin rayar el molde?' },
    { key: 'objetosDentro', section: 'Desmolde', label: '¿El molde viaja libre de objetos en banda de retorno?' }
];

const BoolSectionBadge = ({ ok }: { ok: boolean }) => ok
    ? <CheckCircle2 size={16} className="text-emerald-500 inline" />
    : <XCircle size={16} className="text-red-500 inline" />;

export default function HistorialMoldes({ onNuevoRegistro }: HistorialMoldesProps) {
    const [registros, setRegistros] = useState<MoldesRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<MoldesRow | null>(null);
    const [editingRegistro, setEditingRegistro] = useState<any | null>(null);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pv_moldes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setRegistros(data as MoldesRow[]);
            }
        } catch (err) {
            console.error('Error fetching historial moldes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
    }, []);

    const filtered = registros.filter(r => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (
            (r.auditadoPor && r.auditadoPor.toLowerCase().includes(t)) ||
            (r.observacionesAlistamiento && r.observacionesAlistamiento.toLowerCase().includes(t)) ||
            (r.observacionesEncerado && r.observacionesEncerado.toLowerCase().includes(t)) ||
            (r.observacionesDesprensado && r.observacionesDesprensado.toLowerCase().includes(t)) ||
            (r.observacionesDesmolde && r.observacionesDesmolde.toLowerCase().includes(t)) ||
            String(r.id).includes(t)
        );
    });

    const formatDate = (d: string) => {
        if (!d) return 'N/A';
        try {
            return new Date(d).toLocaleString('es-CO', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch {
            return d;
        }
    };

    // En BD pv_moldes: false = sin novedad (CUMPLE), true = con novedad (NO CUMPLE)
    const sectionOk = (r: MoldesRow, keys: (keyof MoldesRow)[]) =>
        keys.every(k => !r[k]);

    const countCumplimiento = (r: MoldesRow) => {
        const total = ITEMS_CHECK.length;
        const okCount = ITEMS_CHECK.filter(i => !r[i.key]).length;
        return Math.round((okCount / total) * 100);
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por auditor, observaciones..."
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

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold">
                            <tr>
                                <th className="px-4 py-3">Fecha / Hora</th>
                                <th className="px-4 py-3">Auditado por</th>
                                <th className="px-4 py-3 text-center">Alistamiento</th>
                                <th className="px-4 py-3 text-center">Encerado CM</th>
                                <th className="px-4 py-3 text-center">Desprensado</th>
                                <th className="px-4 py-3 text-center">Desmolde</th>
                                <th className="px-4 py-3 text-center">Cumplimiento</th>
                                <th className="px-4 py-3 text-center">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Cargando historial de Moldes...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Sin registros encontrados.</td></tr>
                            ) : filtered.map((row) => {
                                const pct = countCumplimiento(row);
                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(row.created_at)}</td>
                                        <td className="px-4 py-3 font-semibold text-[#324354]">{row.auditadoPor || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <BoolSectionBadge ok={sectionOk(row, ['pinesCentrados', 'ceraGlass', 'golpesCaidas', 'defectoReparacion', 'DejaCaerMolde'])} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <BoolSectionBadge ok={sectionOk(row, ['golpesContramolde', 'aplicaPlastilina', 'acumulacionCera', 'aplicaCeraGlass', 'Deformaciones'])} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <BoolSectionBadge ok={sectionOk(row, ['despiqueFisuras', 'rebabas', 'prensas'])} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <BoolSectionBadge ok={sectionOk(row, ['RayaMolde', 'golpesMoldes', 'rayaEspatula', 'objetosDentro'])} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                pct >= 90 ? 'bg-emerald-100 text-emerald-700'
                                                    : pct >= 75 ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {pct}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <button
                                                onClick={() => setSelected(row)}
                                                className="p-1.5 rounded-lg bg-sky-50 text-[#0099e5] hover:bg-[#0099e5] hover:text-white transition cursor-pointer"
                                                title="Ver detalle completo"
                                            >
                                                <Eye size={16} />
                                            </button>
                                                <button onClick={() => setEditingRegistro(row)} title="Editar registro" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition cursor-pointer"><Pencil size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">Detalle Control de Moldes #{selected.id}</h3>
                                <p className="text-xs text-slate-400">
                                    {formatDate(selected.created_at)} · Auditado por: <strong className="text-slate-600">{selected.auditadoPor}</strong>
                                </p>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 text-xs sm:text-sm">
                            {(['Alistamiento de Moldes', 'Encerado y Alistamiento CM', 'Desprensado A/B', 'Desmolde'] as const).map((sec) => {
                                const items = ITEMS_CHECK.filter(i => i.section === sec);
                                const obsKey =
                                    sec === 'Alistamiento de Moldes' ? 'observacionesAlistamiento'
                                    : sec === 'Encerado y Alistamiento CM' ? 'observacionesEncerado'
                                    : sec === 'Desprensado A/B' ? 'observacionesDesprensado'
                                    : 'observacionesDesmolde';
                                const obsText = selected[obsKey] as string | null;

                                return (
                                    <div key={sec} className="space-y-2">
                                        <h4 className="text-xs font-bold text-[#0099e5] uppercase">{sec}</h4>
                                        {items.map((item) => {
                                            const cumple = !selected[item.key];
                                            return (
                                                <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                    <span className="text-slate-700 font-medium pr-3">{item.label}</span>
                                                    {cumple ? (
                                                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs shrink-0">
                                                            <CheckCircle2 size={14} /> CUMPLE
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500 font-bold flex items-center gap-1 text-xs shrink-0">
                                                            <XCircle size={14} /> NOVEDAD
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {obsText && obsText.trim() !== '' && (
                                            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                                                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">Observaciones</span>
                                                <p className="text-slate-700 italic">{obsText}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={() => setSelected(null)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        
            {editingRegistro && (
                <EditarRegistroVigilanciaModal
                    tabla="pv_moldes"
                    titulo="Control de Moldes"
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
