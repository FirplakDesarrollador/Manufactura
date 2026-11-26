'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormOtrosMsProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormOtrosMs({ onCancel, onSuccess }: FormOtrosMsProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 1. DESPRENSADO (4 switches)
    const [espatulaFilo, setEspatulaFilo] = useState<boolean>(true);
    const [cepilloCerdas, setCepilloCerdas] = useState<boolean>(true);
    const [contramoldeSinExceso, setContramoldeSinExceso] = useState<boolean>(true);
    const [mallaGallinero, setMallaGallinero] = useState<boolean>(true);

    // 2. ETIQUETAS (6 switches)
    const [herInspLvm, setHerInspLvm] = useState<boolean>(true);
    const [herInspMesones, setHerInspMesones] = useState<boolean>(true);
    const [herSacarMesones, setHerSacarMesones] = useState<boolean>(true);
    const [herSacarLvm, setHerSacarLvm] = useState<boolean>(true);
    const [etiquetaPegada, setEtiquetaPegada] = useState<boolean>(true);
    const [marcarDesague, setMarcarDesague] = useState<boolean>(true);

    // 3. TAPA HUECOS (2 switches)
    const [buenAcabado, setBuenAcabado] = useState<boolean>(true);
    const [paloDescubrirBurbujas, setPaloDescubrirBurbujas] = useState<boolean>(true);

    // 4. DESMOLDE (2 switches)
    const [puestaPunto, setPuestaPunto] = useState<boolean>(true);
    const [durometro, setDurometro] = useState<boolean>(true);

    // 5. AUX PULIDO - Bloque 1 (3 switches)
    const [pulidoraConLija, setPulidoraConLija] = useState<boolean>(true);
    const [piezasAdecuadasEstanteria, setPiezasAdecuadasEstanteria] = useState<boolean>(true);
    const [pesasGuia, setPesasGuia] = useState<boolean>(true);

    // 6. AUX PULIDO - Bloque 2 (8 switches)
    const [rasqueta, setRasqueta] = useState<boolean>(true);
    const [usoRotoflex, setUsoRotoflex] = useState<boolean>(true);
    const [puestaPuntoPulido, setPuestaPuntoPulido] = useState<boolean>(true);
    const [guiaPerforacionFlauta, setGuiaPerforacionFlauta] = useState<boolean>(true);
    const [guiaQuadratto48, setGuiaQuadratto48] = useState<boolean>(true);
    const [guiaQuadratto63, setGuiaQuadratto63] = useState<boolean>(true);
    const [guiaQuadratto79, setGuiaQuadratto79] = useState<boolean>(true);
    const [guiaQuadratto94, setGuiaQuadratto94] = useState<boolean>(true);

    // Observaciones
    const [observaciones, setObservaciones] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSubmitting(true);

        const payload = {
            espatula_filo: espatulaFilo,
            cepillo_cerdas: cepilloCerdas,
            contramolde_sin_exceso: contramoldeSinExceso,
            malla_gallinero: mallaGallinero,
            her_insp_lvm: herInspLvm,
            her_insp_mesones: herInspMesones,
            her_sacar_mesones: herSacarMesones,
            her_sacar_lvm: herSacarLvm,
            etiqueta_pegada: etiquetaPegada,
            marcar_desague: marcarDesague,
            buen_acabado: buenAcabado,
            palo_descubrir_burbujas: paloDescubrirBurbujas,
            puesta_punto: puestaPunto,
            durometro: durometro,
            pulidora_con_lija: pulidoraConLija,
            piezas_adecuadas_estanteria: piezasAdecuadasEstanteria,
            pesas_guia: pesasGuia,
            rasqueta: rasqueta,
            uso_rotoflex: usoRotoflex,
            puesta_punto_pulido: puestaPuntoPulido,
            guia_perforacion_flauta: guiaPerforacionFlauta,
            guia_quadratto_48: guiaQuadratto48,
            guia_quadratto_63: guiaQuadratto63,
            guia_quadratto_79: guiaQuadratto79,
            guia_quadratto_94: guiaQuadratto94,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_otros_ms').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_otros_ms:', error);
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

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="pt-4 pb-1 text-center">
            <h3 className="text-lg sm:text-xl font-bold text-[#0099e5] tracking-wider uppercase">
                {title}
            </h3>
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200/90 overflow-hidden animate-in fade-in duration-200">
            {/* Header del formulario */}
            <div className="pt-8 pb-2 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">
                    OTROS
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

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-2">
                {/* 1. DESPRENSADO */}
                <SectionTitle title="DESPRENSADO" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Espatula con filo"
                        checked={espatulaFilo}
                        onChange={setEspatulaFilo}
                    />
                    <ToggleSwitch
                        label="Cepillo de cerdas"
                        checked={cepilloCerdas}
                        onChange={setCepilloCerdas}
                    />
                    <ToggleSwitch
                        label="Contramolde sin exceso de masa"
                        checked={contramoldeSinExceso}
                        onChange={setContramoldeSinExceso}
                    />
                    <ToggleSwitch
                        label="Malla de gallinero"
                        checked={mallaGallinero}
                        onChange={setMallaGallinero}
                    />
                </div>

                {/* 2. ETIQUETAS */}
                <SectionTitle title="ETIQUETAS" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Her insp de mamonetes LVM y LVR"
                        checked={herInspLvm}
                        onChange={setHerInspLvm}
                    />
                    <ToggleSwitch
                        label="Her insp de mamonetes Mesones y LVP"
                        checked={herInspMesones}
                        onChange={setHerInspMesones}
                    />
                    <ToggleSwitch
                        label="Her para sacar mamonetes Mesones y LVP"
                        checked={herSacarMesones}
                        onChange={setHerSacarMesones}
                    />
                    <ToggleSwitch
                        label="Her para sacar mamonetes LVM y LVR"
                        checked={herSacarLvm}
                        onChange={setHerSacarLvm}
                    />
                    <ToggleSwitch
                        label="Etiqueta bien pegada"
                        checked={etiquetaPegada}
                        onChange={setEtiquetaPegada}
                    />
                    <ToggleSwitch
                        label="Marcar desague"
                        checked={marcarDesague}
                        onChange={setMarcarDesague}
                    />
                </div>

                {/* 3. TAPA HUECOS */}
                <SectionTitle title="TAPA HUECOS" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Buen acabado?"
                        checked={buenAcabado}
                        onChange={setBuenAcabado}
                    />
                    <ToggleSwitch
                        label="Palo para descubrir burbujas"
                        checked={paloDescubrirBurbujas}
                        onChange={setPaloDescubrirBurbujas}
                    />
                </div>

                {/* 4. DESMOLDE */}
                <SectionTitle title="DESMOLDE" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Puesta a punto"
                        checked={puestaPunto}
                        onChange={setPuestaPunto}
                    />
                    <ToggleSwitch
                        label="Durometro"
                        checked={durometro}
                        onChange={setDurometro}
                    />
                </div>

                {/* 5. AUX PULIDO (Bloque 1) */}
                <SectionTitle title="AUX PULIDO" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Pulidora con lija 40 (prohibida)"
                        checked={pulidoraConLija}
                        onChange={setPulidoraConLija}
                    />
                    <ToggleSwitch
                        label="Piezas adecuadas en estantería"
                        checked={piezasAdecuadasEstanteria}
                        onChange={setPiezasAdecuadasEstanteria}
                    />
                    <ToggleSwitch
                        label="Pesas y/o guia en piezas criticas"
                        checked={pesasGuia}
                        onChange={setPesasGuia}
                    />
                </div>

                {/* 6. AUX PULIDO (Bloque 2) */}
                <SectionTitle title="AUX PULIDO" />
                <div className="space-y-1">
                    <ToggleSwitch
                        label="Rasqueta"
                        checked={rasqueta}
                        onChange={setRasqueta}
                    />
                    <ToggleSwitch
                        label="Uso del rotoflex #2"
                        checked={usoRotoflex}
                        onChange={setUsoRotoflex}
                    />
                    <ToggleSwitch
                        label="Puesta a punto"
                        checked={puestaPuntoPulido}
                        onChange={setPuestaPuntoPulido}
                    />
                    <ToggleSwitch
                        label="Guia perforación de flauta"
                        checked={guiaPerforacionFlauta}
                        onChange={setGuiaPerforacionFlauta}
                    />
                    <ToggleSwitch
                        label="Guia Quadratto 48"
                        checked={guiaQuadratto48}
                        onChange={setGuiaQuadratto48}
                    />
                    <ToggleSwitch
                        label="Guia Quadratto 63"
                        checked={guiaQuadratto63}
                        onChange={setGuiaQuadratto63}
                    />
                    <ToggleSwitch
                        label="Guia Quadratto 79"
                        checked={guiaQuadratto79}
                        onChange={setGuiaQuadratto79}
                    />
                    <ToggleSwitch
                        label="Guia Quadratto 94"
                        checked={guiaQuadratto94}
                        onChange={setGuiaQuadratto94}
                    />
                </div>

                {/* Observaciones */}
                <div className="pt-4">
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

