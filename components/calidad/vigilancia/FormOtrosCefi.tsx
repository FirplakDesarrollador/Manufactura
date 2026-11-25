'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormOtrosCefiProps {
    onCancel: () => void;
    onSuccess: () => void;
}

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

const SectionTitle = ({ title }: { title: string }) => (
    <div className="pt-4 pb-1 text-center">
        <h3 className="text-sm sm:text-base font-bold text-[#0099e5] tracking-wider uppercase">
            {title}
        </h3>
    </div>
);

export default function FormOtrosCefi({ onCancel, onSuccess }: FormOtrosCefiProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // TARUGADORA
    const [inspecTarugo, setInspecTarugo] = useState<boolean>(true);
    // TALADRO
    const [revisanMedidas, setRevisanMedidas] = useState<boolean>(true);
    const [flexometro, setFlexometro] = useState<boolean>(true);
    // INSPECCION/EMPAQUE
    const [etiquetaVsInstructivo, setEtiquetaVsInstructivo] = useState<boolean>(true);
    const [chulearPerforaciones, setChulearPerforaciones] = useState<boolean>(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const payload = {
            inspec_tarugo: inspecTarugo,
            revisan_medidas: revisanMedidas,
            flexometro,
            etiqueta_vs_instrucctivo: etiquetaVsInstructivo,
            chulear_perforaciones: chulearPerforaciones,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_otros_cefi').insert([payload]);
            if (error) {
                setErrorMsg(`Error al guardar: ${error.message}`);
                setSubmitting(false);
                return;
            }
            onSuccess();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setErrorMsg(`Error inesperado: ${msg}`);
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200/90 overflow-hidden animate-in fade-in duration-200">
            <div className="pt-8 pb-2 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">OTROS</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Plan de Vigilancia · Planta CEFI</p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-2">
                <SectionTitle title="TARUGADORA" />
                <div className="space-y-0">
                    <ToggleSwitch
                        checked={inspecTarugo}
                        onChange={setInspecTarugo}
                        label="Inspeccionar tarugos bien pegados"
                    />
                </div>

                <SectionTitle title="TALADRO" />
                <div className="space-y-0">
                    <ToggleSwitch
                        checked={revisanMedidas}
                        onChange={setRevisanMedidas}
                        label="Se revisan medidas?"
                    />
                    <ToggleSwitch
                        checked={flexometro}
                        onChange={setFlexometro}
                        label="Flexometro?"
                    />
                </div>

                <SectionTitle title="INSPECCION/EMPAQUE" />
                <div className="space-y-0">
                    <ToggleSwitch
                        checked={etiquetaVsInstructivo}
                        onChange={setEtiquetaVsInstructivo}
                        label="Etiqueta vs Instructivo"
                    />
                    <ToggleSwitch
                        checked={chulearPerforaciones}
                        onChange={setChulearPerforaciones}
                        label="Chulear perforaciones mueble 1 y 5"
                    />
                </div>

                {/* Botones */}
                <div className="flex items-center justify-center gap-4 pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-2.5 bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center min-w-[130px] disabled:opacity-60"
                    >
                        {submitting ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /><span>Guardando...</span></div> : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="px-8 py-2.5 bg-[#ff5252] hover:bg-[#ee3838] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer min-w-[130px] disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
