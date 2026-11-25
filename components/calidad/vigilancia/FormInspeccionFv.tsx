'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormInspeccionFvProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormInspeccionFv({ onCancel, onSuccess }: FormInspeccionFvProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Switches (Toggles booleanos según captura INSPECCION FV)
    const [cajaCintaSeguridad, setCajaCintaSeguridad] = useState<boolean>(true);
    const [cajaCompleta, setCajaCompleta] = useState<boolean>(true);
    const [galgaEspesores, setGalgaEspesores] = useState<boolean>(true);
    const [inspeccionEspejo, setInspeccionEspejo] = useState<boolean>(true);
    const [desagueRubor, setDesagueRubor] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const payload = {
            caja_accesorios_cinta_seguridad: cajaCintaSeguridad,
            caja_accesorios_completa: cajaCompleta,
            galga_espesores: galgaEspesores,
            inspeccion_espejo: inspeccionEspejo,
            desague_rubor: desagueRubor,
            observaciones: observaciones.trim() || '',
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_inspeccion_fv').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_inspeccion_fv:', error);
                setErrorMsg(`Error al guardar: ${error.message}`);
                setSubmitting(false);
                return;
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error general guardando inspección FV:', err);
            setErrorMsg(`Error inesperado: ${err.message || err}`);
            setSubmitting(false);
        }
    };

    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 select-none pr-4">
                {label}
            </span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    checked ? 'bg-[#0099e5]' : 'bg-slate-300'
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200/90 overflow-hidden animate-in fade-in duration-200">
            {/* Header del formulario */}
            <div className="pt-8 pb-4 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">
                    INSPECCION FV
                </h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                    Plan de Vigilancia · Planta Fibra de Vidrio
                </p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-4">
                {/* Switches de Inspección */}
                <div className="space-y-1">
                    <ToggleSwitch
                        checked={cajaCintaSeguridad}
                        onChange={setCajaCintaSeguridad}
                        label="Caja de accesorios con cinta de seguridad"
                    />
                    <ToggleSwitch
                        checked={cajaCompleta}
                        onChange={setCajaCompleta}
                        label="Caja de accesorios completa"
                    />
                    <ToggleSwitch
                        checked={galgaEspesores}
                        onChange={setGalgaEspesores}
                        label="Galga para espesores"
                    />
                    <ToggleSwitch
                        checked={inspeccionEspejo}
                        onChange={setInspeccionEspejo}
                        label="Inspeccion con espejo"
                    />
                    <ToggleSwitch
                        checked={desagueRubor}
                        onChange={setDesagueRubor}
                        label="Desague con rubor"
                    />
                </div>

                {/* Observaciones con borde inferior estilo formulario */}
                <div className="pt-3">
                    <input
                        type="text"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones..."
                        className="w-full py-2.5 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                    />
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-center gap-4 pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-2.5 bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center min-w-[130px] disabled:opacity-60"
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Guardando...</span>
                            </div>
                        ) : (
                            'Guardar'
                        )}
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

