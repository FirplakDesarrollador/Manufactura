'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormEnchapeMblProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormEnchapeMbl({ onCancel, onSuccess }: FormEnchapeMblProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Campos numéricos / texto
    const [espesor, setEspesor] = useState<string>('');
    const [velocidad, setVelocidad] = useState<string>('');
    const [pieza, setPieza] = useState<string>('');
    const [cantidadCantos, setCantidadCantos] = useState<string>('');

    // Toggles
    const [cantosPegados, setCantosPegados] = useState<boolean>(true);
    const [loctite, setLoctite] = useState<boolean>(true);
    const [colorCanto, setColorCanto] = useState<boolean>(true);
    const [pintaGarantiaMedida, setPintaGarantiaMedida] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const parseNum = (val: string) => {
            const n = parseFloat(val.replace(',', '.').trim());
            return isNaN(n) ? null : n;
        };

        const payload = {
            espesor: parseNum(espesor),
            velocidad: parseNum(velocidad),
            pieza: pieza.trim() || null,
            cantidad_cantos: parseNum(cantidadCantos),
            cantos_pegados: cantosPegados,
            loctite: loctite,
            color_canto: colorCanto,
            pinta_garantia_medida: pintaGarantiaMedida,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_enchape_mbl').insert([payload]);
            if (error) {
                setErrorMsg(`Error al guardar: ${error.message}`);
                setSubmitting(false);
                return;
            }
            onSuccess();
        } catch (err: any) {
            setErrorMsg(`Error inesperado: ${err.message || err}`);
            setSubmitting(false);
        }
    };

    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 select-none pr-4">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#0099e5]' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200/90 overflow-hidden animate-in fade-in duration-200">
            <div className="pt-8 pb-4 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">ENCHAPE</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Plan de Vigilancia · Planta Muebles</p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-1">
                {/* Espesor de la Lamina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/2">Espesor de la Lamina</label>
                    <input type="number" step="any" value={espesor} onChange={(e) => setEspesor(e.target.value)} placeholder=""
                        className="sm:w-1/2 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none" />
                </div>

                {/* Velocidad */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/2">Velocidad</label>
                    <input type="number" step="any" value={velocidad} onChange={(e) => setVelocidad(e.target.value)} placeholder=""
                        className="sm:w-1/2 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none" />
                </div>

                {/* Pieza */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/2">Pieza</label>
                    <input type="text" value={pieza} onChange={(e) => setPieza(e.target.value)} placeholder=""
                        className="sm:w-1/2 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none" />
                </div>

                {/* Cantidad Cantos */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/2">Cantidad Cantos</label>
                    <input type="number" step="1" value={cantidadCantos} onChange={(e) => setCantidadCantos(e.target.value)} placeholder=""
                        className="sm:w-1/2 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none" />
                </div>

                {/* Toggles */}
                <div className="pt-2 space-y-0">
                    <ToggleSwitch checked={cantosPegados} onChange={setCantosPegados} label="Cantos Pegados" />
                    <ToggleSwitch checked={loctite} onChange={setLoctite} label="Loctite" />
                    <ToggleSwitch checked={colorCanto} onChange={setColorCanto} label="Color Canto" />
                    <ToggleSwitch checked={pintaGarantiaMedida} onChange={setPintaGarantiaMedida} label="Pinta de Garantia Medida" />
                </div>

                {/* Observaciones */}
                <div className="pt-3">
                    <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones..."
                        className="w-full py-2.5 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors" />
                </div>

                {/* Botones */}
                <div className="flex items-center justify-center gap-4 pt-6">
                    <button type="submit" disabled={submitting}
                        className="px-8 py-2.5 bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center min-w-[130px] disabled:opacity-60">
                        {submitting ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /><span>Guardando...</span></div> : 'Guardar'}
                    </button>
                    <button type="button" onClick={onCancel} disabled={submitting}
                        className="px-8 py-2.5 bg-[#ff5252] hover:bg-[#ee3838] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer min-w-[130px] disabled:opacity-60">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}

