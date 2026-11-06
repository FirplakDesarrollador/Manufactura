'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormInspeccionMsProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormInspeccionMs({ onCancel, onSuccess }: FormInspeccionMsProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sección INSPECCIÓN (8 switches)
    const [galgaLvr, setGalgaLvr] = useState<boolean>(true);
    const [nivel, setNivel] = useState<boolean>(true);
    const [pandeo, setPandeo] = useState<boolean>(true);
    const [paloDescubrirBurbujas, setPaloDescubrirBurbujas] = useState<boolean>(true);
    const [pintaGarantiaFlautas, setPintaGarantiaFlautas] = useState<boolean>(true);
    const [guiaPlantillasMesones, setGuiaPlantillasMesones] = useState<boolean>(true);
    const [piezaDespiquePestana, setPiezaDespiquePestana] = useState<boolean>(true);
    const [marcarEtiqueta, setMarcarEtiqueta] = useState<boolean>(true);

    // Sección DESMOLDE (4 switches)
    const [tapaDesaguesPegadosCorrectos, setTapaDesaguesPegadosCorrectos] = useState<boolean>(true);
    const [etiquetaCorrecta, setEtiquetaCorrecta] = useState<boolean>(true);
    const [etiquetaBienPuesta, setEtiquetaBienPuesta] = useState<boolean>(true);
    const [empaqueHoneycomb, setEmpaqueHoneycomb] = useState<boolean>(true);

    // Observaciones
    const [observaciones, setObservaciones] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const payload = {
            galga_lvr: galgaLvr,
            nivel: nivel,
            pandeo: pandeo,
            palo_descubrir_burbujas: paloDescubrirBurbujas,
            pinta_garantia_flautas: pintaGarantiaFlautas,
            guia_plantillas_mesones: guiaPlantillasMesones,
            'pieza_despique_pestaña': piezaDespiquePestana,
            marcar_etiqueta: marcarEtiqueta,
            tapa_desagues_pegados_correctos: tapaDesaguesPegadosCorrectos,
            etiqueta_correcta: etiquetaCorrecta,
            etiqueta_bien_puesta: etiquetaBienPuesta,
            empaque_honeycomb: empaqueHoneycomb,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_inspeccion_ms').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_inspeccion_ms:', error);
                setErrorMsg(`Error al guardar: ${error.message}`);
                setSubmitting(false);
                return;
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error general guardando registro:', err);
            setErrorMsg(`Error inesperado: ${err.message || err}`);
            setSubmitting(false);
        }
    };

    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 select-none pr-4">
                {label}
            </span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    checked ? 'bg-[#0099e5]' : 'bg-slate-400'
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
                    INSPECCIÓN
                </h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                    Plan de Vigilancia · Planta Mármol Sintético
                </p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-4">
                {/* Bloque 1: INSPECCIÓN */}
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Galga LVR y LVM"
                        checked={galgaLvr}
                        onChange={setGalgaLvr}
                    />
                    <ToggleSwitch
                        label="Nivel"
                        checked={nivel}
                        onChange={setNivel}
                    />
                    <ToggleSwitch
                        label="Pandeo"
                        checked={pandeo}
                        onChange={setPandeo}
                    />
                    <ToggleSwitch
                        label="Palo para descubrir burbujas"
                        checked={paloDescubrirBurbujas}
                        onChange={setPaloDescubrirBurbujas}
                    />
                    <ToggleSwitch
                        label="Pinta de garantía en flautas"
                        checked={pintaGarantiaFlautas}
                        onChange={setPintaGarantiaFlautas}
                    />
                    <ToggleSwitch
                        label="Guía plantillas mesones (7)"
                        checked={guiaPlantillasMesones}
                        onChange={setGuiaPlantillasMesones}
                    />
                    <ToggleSwitch
                        label="Pieza sin despique en pestaña"
                        checked={piezaDespiquePestana}
                        onChange={setPiezaDespiquePestana}
                    />
                    <ToggleSwitch
                        label="Marcar etiqueta"
                        checked={marcarEtiqueta}
                        onChange={setMarcarEtiqueta}
                    />
                </div>

                {/* Subtítulo sección DESMOLDE */}
                <div className="pt-4 pb-1 text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-[#0099e5] tracking-wider uppercase">
                        DESMOLDE
                    </h3>
                </div>

                {/* Bloque 2: DESMOLDE */}
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Tapa desagues bien pegados y correctos"
                        checked={tapaDesaguesPegadosCorrectos}
                        onChange={setTapaDesaguesPegadosCorrectos}
                    />
                    <ToggleSwitch
                        label="Etiqueta correcta"
                        checked={etiquetaCorrecta}
                        onChange={setEtiquetaCorrecta}
                    />
                    <ToggleSwitch
                        label="Etiqueta bien puesta"
                        checked={etiquetaBienPuesta}
                        onChange={setEtiquetaBienPuesta}
                    />
                    <ToggleSwitch
                        label="Empaque con honeycomb"
                        checked={empaqueHoneycomb}
                        onChange={setEmpaqueHoneycomb}
                    />
                </div>

                {/* Observaciones */}
                <div className="pt-3">
                    <textarea
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones..."
                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099e5]/20 bg-slate-50/50"
                    />
                </div>

                {/* Botones de acción inferiores: Guardar y Cancelar */}
                <div className="pt-6 flex items-center justify-center gap-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-40 sm:w-48 py-3 rounded-xl bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <span>Guardar</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="w-40 sm:w-48 py-3 rounded-xl bg-[#ff5252] hover:bg-[#eb4444] active:scale-95 text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <span>Cancelar</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

