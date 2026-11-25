'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormMoldesProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const DEFAULT_AUDITORES = [
    'Sonia Helena Puerta Puerta',
    'Luisa Fernanda Caicedo Urrutia'
];

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
    <div className="pt-5 pb-1 text-center border-t border-slate-100 first:border-t-0">
        <h3 className="text-sm sm:text-base font-bold text-[#0099e5] tracking-wider uppercase">
            {title}
        </h3>
    </div>
);

export default function FormMoldes({ onCancel, onSuccess }: FormMoldesProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [auditoresList, setAuditoresList] = useState<string[]>(DEFAULT_AUDITORES);

    const [auditadoPor, setAuditadoPor] = useState<string>('');

    // 1. Alistamiento de moldes (preguntas convertidas a POSITIVO: true = Cumple / Sin novedad)
    const [pinesCentradosOk, setPinesCentradosOk] = useState<boolean>(true);
    const [ceraGlassOk, setCeraGlassOk] = useState<boolean>(true);
    const [sinGolpesCaidasOk, setSinGolpesCaidasOk] = useState<boolean>(true);
    const [reporteDefectosOk, setReporteDefectosOk] = useState<boolean>(true);
    const [topeLineaOk, setTopeLineaOk] = useState<boolean>(true);
    const [obsAlistamiento, setObsAlistamiento] = useState<string>('');

    // 2. Encerado y alistamiento de CM (POSITIVO)
    const [sinGolpesCmOk, setSinGolpesCmOk] = useState<boolean>(true);
    const [aplicaPlastilinaOk, setAplicaPlastilinaOk] = useState<boolean>(true);
    const [sinAcumulacionCeraOk, setSinAcumulacionCeraOk] = useState<boolean>(true);
    const [aplicaCeraGlassCmOk, setAplicaCeraGlassCmOk] = useState<boolean>(true);
    const [sinDeformacionesOk, setSinDeformacionesOk] = useState<boolean>(true);
    const [obsEncerado, setObsEncerado] = useState<string>('');

    // 3. Desprensado A/B (POSITIVO)
    const [descargaCuidadosaOk, setDescargaCuidadosaOk] = useState<boolean>(true);
    const [pestanaSinRayonesOk, setPestanaSinRayonesOk] = useState<boolean>(true);
    const [prensasCuidadosasOk, setPrensasCuidadosasOk] = useState<boolean>(true);
    const [obsDesprensado, setObsDesprensado] = useState<string>('');

    // 4. Desmolde (POSITIVO)
    const [desmonteSinRayarOk, setDesmonteSinRayarOk] = useState<boolean>(true);
    const [colocacionCmSinGolpesOk, setColocacionCmSinGolpesOk] = useState<boolean>(true);
    const [espatulaSinRayarOk, setEspatulaSinRayarOk] = useState<boolean>(true);
    const [sinObjetosDentroOk, setSinObjetosDentroOk] = useState<boolean>(true);
    const [obsDesmolde, setObsDesmolde] = useState<string>('');

    useEffect(() => {
        const fetchAuditores = async () => {
            try {
                const { data } = await supabase
                    .from('pv_moldes')
                    .select('auditadoPor')
                    .not('auditadoPor', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (data) {
                    const unique = Array.from(new Set([
                        ...DEFAULT_AUDITORES,
                        ...data.map(d => (d.auditadoPor as string)?.trim()).filter(Boolean)
                    ]));
                    setAuditoresList(unique);
                }
            } catch (err) {
                console.warn('No se pudo cargar lista de auditores de moldes:', err);
            }
        };
        fetchAuditores();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!auditadoPor.trim()) {
            setErrorMsg('Por favor ingresa o selecciona quién realiza la auditoría.');
            return;
        }

        setSubmitting(true);

        // Nota: En la tabla histórica pv_moldes, las columnas booleanas almacenan true cuando hay falla/novedad (pregunta negativa).
        // Al redactarlas en positivo en la UI (true = Cumple / OK), invertimos (!val) al persistir para conservar compatibilidad histórica.
        const payload = {
            auditadoPor: auditadoPor.trim(),
            pinesCentrados: !pinesCentradosOk,
            ceraGlass: !ceraGlassOk,
            golpesCaidas: !sinGolpesCaidasOk,
            defectoReparacion: !reporteDefectosOk,
            DejaCaerMolde: !topeLineaOk,
            observacionesAlistamiento: obsAlistamiento.trim() || '',

            golpesContramolde: !sinGolpesCmOk,
            aplicaPlastilina: !aplicaPlastilinaOk,
            acumulacionCera: !sinAcumulacionCeraOk,
            aplicaCeraGlass: !aplicaCeraGlassCmOk,
            Deformaciones: !sinDeformacionesOk,
            observacionesEncerado: obsEncerado.trim() || '',

            despiqueFisuras: !descargaCuidadosaOk,
            rebabas: !pestanaSinRayonesOk,
            prensas: !prensasCuidadosasOk,
            observacionesDesprensado: obsDesprensado.trim() || '',

            RayaMolde: !desmonteSinRayarOk,
            golpesMoldes: !colocacionCmSinGolpesOk,
            rayaEspatula: !espatulaSinRayarOk,
            objetosDentro: !sinObjetosDentroOk,
            observacionesDesmolde: obsDesmolde.trim() || '',

            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_moldes').insert([payload]);
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
            <div className="pt-8 pb-4 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#324354] tracking-wider uppercase font-sans">
                    CONTROL DE MOLDES
                </h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                    Plan de Vigilancia · Planta Moldes (RMOLD)
                </p>
            </div>

            {errorMsg && (
                <div className="mx-6 sm:mx-10 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-12 pb-8 space-y-2">
                {/* Auditado por */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Auditado por
                    </label>
                    <div className="sm:w-2/3">
                        <input
                            type="text"
                            list="auditores-moldes-list"
                            value={auditadoPor}
                            onChange={(e) => setAuditadoPor(e.target.value)}
                            placeholder="Seleccione o escriba nombre..."
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none"
                        />
                        <datalist id="auditores-moldes-list">
                            {auditoresList.map((a, idx) => (
                                <option key={idx} value={a} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* Sección 1: Alistamiento de moldes */}
                <SectionTitle title="ALISTAMIENTO DE MOLDES" />
                <div>
                    <ToggleSwitch
                        checked={pinesCentradosOk}
                        onChange={setPinesCentradosOk}
                        label="¿El molde tiene los pines centrados?"
                    />
                    <ToggleSwitch
                        checked={ceraGlassOk}
                        onChange={setCeraGlassOk}
                        label="¿Se aplicó la cera glass y 1140 en las partes definidas del molde?"
                    />
                    <ToggleSwitch
                        checked={sinGolpesCaidasOk}
                        onChange={setSinGolpesCaidasOk}
                        label="¿El molde está libre de golpes, caídas o mala manipulación?"
                    />
                    <ToggleSwitch
                        checked={reporteDefectosOk}
                        onChange={setReporteDefectosOk}
                        label="¿Se reportan los moldes con defectos y se sacan a reparación?"
                    />
                    <ToggleSwitch
                        checked={topeLineaOk}
                        onChange={setTopeLineaOk}
                        label="¿La línea cuenta con tope para evitar la caída del molde?"
                    />
                    <div className="pt-2 pb-1">
                        <input
                            type="text"
                            value={obsAlistamiento}
                            onChange={(e) => setObsAlistamiento(e.target.value)}
                            placeholder="Observaciones Alistamiento de moldes..."
                            className="w-full py-2 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Sección 2: Encerado y alistamiento de CM */}
                <SectionTitle title="ENCERADO Y ALISTAMIENTO DE CM" />
                <div>
                    <ToggleSwitch
                        checked={sinGolpesCmOk}
                        onChange={setSinGolpesCmOk}
                        label="¿El contramolde se trabaja sin golpes de cincel ni martillo?"
                    />
                    <ToggleSwitch
                        checked={aplicaPlastilinaOk}
                        onChange={setAplicaPlastilinaOk}
                        label="¿Se aplica plastilina en las partes reventadas y despiques leves?"
                    />
                    <ToggleSwitch
                        checked={sinAcumulacionCeraOk}
                        onChange={setSinAcumulacionCeraOk}
                        label="¿El contramolde está libre de acumulación excesiva de cera y/o masa?"
                    />
                    <ToggleSwitch
                        checked={aplicaCeraGlassCmOk}
                        onChange={setAplicaCeraGlassCmOk}
                        label="¿Se aplica la cera Glass en todo el contramolde?"
                    />
                    <ToggleSwitch
                        checked={sinDeformacionesOk}
                        onChange={setSinDeformacionesOk}
                        label="¿El contramolde está libre de deformaciones internas que generen espesor delgado?"
                    />
                    <div className="pt-2 pb-1">
                        <input
                            type="text"
                            value={obsEncerado}
                            onChange={(e) => setObsEncerado(e.target.value)}
                            placeholder="Observaciones Encerado y alistamiento de CM..."
                            className="w-full py-2 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Sección 3: Desprensado A/B */}
                <SectionTitle title="DESPRENSADO A/B" />
                <div>
                    <ToggleSwitch
                        checked={descargaCuidadosaOk}
                        onChange={setDescargaCuidadosaOk}
                        label="¿Se descarga cuidadosamente el contramolde en piso o estantería (sin golpes bruscos)?"
                    />
                    <ToggleSwitch
                        checked={pestanaSinRayonesOk}
                        onChange={setPestanaSinRayonesOk}
                        label="¿La pestaña del molde permanece sin rayones durante la remoción de rebabas?"
                    />
                    <ToggleSwitch
                        checked={prensasCuidadosasOk}
                        onChange={setPrensasCuidadosasOk}
                        label="¿Se colocan las prensas adecuadamente sin dejarlas caer sobre el contramolde o molde?"
                    />
                    <div className="pt-2 pb-1">
                        <input
                            type="text"
                            value={obsDesprensado}
                            onChange={(e) => setObsDesprensado(e.target.value)}
                            placeholder="Observaciones Desprensado A/B..."
                            className="w-full py-2 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Sección 4: Desmolde */}
                <SectionTitle title="DESMOLDE" />
                <div>
                    <ToggleSwitch
                        checked={desmonteSinRayarOk}
                        onChange={setDesmonteSinRayarOk}
                        label="¿Se desmonta la pieza sin rayar el molde?"
                    />
                    <ToggleSwitch
                        checked={colocacionCmSinGolpesOk}
                        onChange={setColocacionCmSinGolpesOk}
                        label="¿Se coloca el contramolde sin golpear el molde?"
                    />
                    <ToggleSwitch
                        checked={espatulaSinRayarOk}
                        onChange={setEspatulaSinRayarOk}
                        label="¿Se desmolda con la espátula sin rayar el molde?"
                    />
                    <ToggleSwitch
                        checked={sinObjetosDentroOk}
                        onChange={setSinObjetosDentroOk}
                        label="¿El molde viaja libre de objetos en su interior en la banda de retorno?"
                    />
                    <div className="pt-2 pb-1">
                        <input
                            type="text"
                            value={obsDesmolde}
                            onChange={(e) => setObsDesmolde(e.target.value)}
                            placeholder="Observaciones Desmolde..."
                            className="w-full py-2 px-3 bg-transparent border-b-2 border-slate-200 focus:border-[#0099e5] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                        />
                    </div>
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
