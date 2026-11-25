'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormOtrosMblProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormOtrosMbl({ onCancel, onSuccess }: FormOtrosMblProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Toggles
    const [lmVsKitting, setLmVsKitting] = useState<boolean>(true);
    const [listadoVsFabricado, setListadoVsFabricado] = useState<boolean>(true);
    const [firmaEnPiezas, setFirmaEnPiezas] = useState<boolean>(true);
    const [reponerPiezas, setReponerPiezas] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const payload = {
            LM_vs_kitting: lmVsKitting,
            listado_vs_fabricado: listadoVsFabricado,
            firma_en_piezas: firmaEnPiezas,
            reponer_piezas: reponerPiezas,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_otros_mbl').insert([payload]);
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
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">OTROS</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Plan de Vigilancia · Planta Muebles</p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-0">
                <div className="pt-2 space-y-0">
                    <ToggleSwitch checked={lmVsKitting} onChange={setLmVsKitting} label="Lista de Materiales vs Kitting" />
                    <ToggleSwitch checked={listadoVsFabricado} onChange={setListadoVsFabricado} label="Listado vs fabricado" />
                    <ToggleSwitch checked={firmaEnPiezas} onChange={setFirmaEnPiezas} label="Firma en piezas que se rompen" />
                    <ToggleSwitch checked={reponerPiezas} onChange={setReponerPiezas} label="Reponer piezas con hoja" />
                </div>

                {/* Observaciones */}
                <div className="pt-4">
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
