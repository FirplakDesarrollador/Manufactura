'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormPinturaFvProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function FormPinturaFv({ onCancel, onSuccess }: FormPinturaFvProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [paintersList, setPaintersList] = useState<string[]>([]);

    // Estados de campos según capturas de PINTURA FV
    const [pintor, setPintor] = useState<string>('');
    const [abanico, setAbanico] = useState<string>('');
    const [presion, setPresion] = useState<string>('');
    const [presionEstatica, setPresionEstatica] = useState<string>('');
    const [porcCatalizador, setPorcCatalizador] = useState<string>('');
    const [tempAmbiente, setTempAmbiente] = useState<string>('');
    const [galgaSuperior, setGalgaSuperior] = useState<string>('');
    const [galgaParedes, setGalgaParedes] = useState<string>('');
    const [galgaPiso, setGalgaPiso] = useState<string>('');
    const [galgaPestanas, setGalgaPestanas] = useState<string>('');
    const [lote, setLote] = useState<string>('');
    const [referencia, setReferencia] = useState<string>('');
    const [color, setColor] = useState<string>('');
    const [tiempoEspera, setTiempoEspera] = useState<string>('');

    // Switches (Toggles booleanos)
    const [pesoOk, setPesoOk] = useState<boolean>(true);
    const [usoGalga, setUsoGalga] = useState<boolean>(true);
    const [galgaBuenEstado, setGalgaBuenEstado] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    // Cargar lista previa de pintores únicos de FV para autocompletado
    useEffect(() => {
        const fetchPainters = async () => {
            try {
                const { data } = await supabase
                    .from('pv_pintura_fv')
                    .select('Pintor')
                    .not('Pintor', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (data) {
                    const unique = Array.from(new Set(data.map(d => d.Pintor?.trim()).filter(Boolean))) as string[];
                    setPaintersList(unique);
                }
            } catch (err) {
                console.warn('No se pudo cargar la lista previa de pintores FV:', err);
            }
        };
        fetchPainters();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!pintor.trim()) {
            setErrorMsg('Por favor ingresa o selecciona el nombre del pintor.');
            return;
        }

        setSubmitting(true);

        const parseNum = (val: string) => {
            if (val === undefined || val === null || val.trim() === '') return null;
            const cleaned = val.replace(',', '.').trim();
            const n = parseFloat(cleaned);
            return isNaN(n) ? null : n;
        };

        const payload = {
            Pintor: pintor.trim(),
            Abanico: parseNum(abanico),
            Presion: parseNum(presion),
            Presion_Estatica: parseNum(presionEstatica),
            Porc_Catalizador: parseNum(porcCatalizador),
            Temp_Ambiente: parseNum(tempAmbiente),
            Galga_superior: parseNum(galgaSuperior),
            galga_paredes: parseNum(galgaParedes),
            galga_inferior: parseNum(galgaPiso),
            galga_pestana: parseNum(galgaPestanas),
            Lote: lote.trim() || null,
            referencia: referencia.trim() || null,
            Color: color.trim() || null,
            tiempo_esperar: parseNum(tiempoEspera),
            peso_ok: pesoOk,
            Uso_Galga: usoGalga,
            Galga_Buen_Estado: galgaBuenEstado,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_pintura_fv').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_pintura_fv:', error);
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
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
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
                    PINTURA FV
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
                {/* 1. Pintor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Pintor
                    </label>
                    <div className="sm:w-2/3 relative">
                        <input
                            type="text"
                            list="painters-fv-list"
                            value={pintor}
                            onChange={(e) => setPintor(e.target.value)}
                            placeholder="Select..."
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <datalist id="painters-fv-list">
                            {paintersList.map((p, idx) => (
                                <option key={idx} value={p} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* 2. Abanico */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Abanico
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={abanico}
                        onChange={(e) => setAbanico(e.target.value)}
                        placeholder="Ej. 28"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 3. Presión */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presion}
                        onChange={(e) => setPresion(e.target.value)}
                        placeholder="Ej. 74"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 4. Presión Estática */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión Estática
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presionEstatica}
                        onChange={(e) => setPresionEstatica(e.target.value)}
                        placeholder="Ej. 25"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 5. % Catalizador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Catalizador
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={porcCatalizador}
                        onChange={(e) => setPorcCatalizador(e.target.value)}
                        placeholder="Ej. 3"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 6. Temp. Ambiente */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Temp. Ambiente
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tempAmbiente}
                        onChange={(e) => setTempAmbiente(e.target.value)}
                        placeholder="Ej. 24"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 7. Galga Superior */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Superior
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaSuperior}
                        onChange={(e) => setGalgaSuperior(e.target.value)}
                        placeholder="Ej. 30"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 8. Galga Paredes */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Paredes
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaParedes}
                        onChange={(e) => setGalgaParedes(e.target.value)}
                        placeholder="Ej. 30"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 9. Galga Piso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Piso
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaPiso}
                        onChange={(e) => setGalgaPiso(e.target.value)}
                        placeholder="Ej. 30"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 10. Galga Pestañas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Pestañas
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaPestanas}
                        onChange={(e) => setGalgaPestanas(e.target.value)}
                        placeholder="Ej. 20"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 11. # Lote */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        # Lote
                    </label>
                    <input
                        type="text"
                        value={lote}
                        onChange={(e) => setLote(e.target.value)}
                        placeholder="Ej. 50002"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 12. Referencia */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Referencia
                    </label>
                    <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ej. Milenio, Mobu..."
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 13. Color */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Color
                    </label>
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Ej. Blanco"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 14. Tiempo de Espera (min) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Tiempo de Espera (min)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tiempoEspera}
                        onChange={(e) => setTiempoEspera(e.target.value)}
                        placeholder="Ej. 15"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* Sección de Switches / Parámetros de verificación */}
                <div className="pt-2 pb-1 space-y-1">
                    <ToggleSwitch
                        label="Peso OK?"
                        checked={pesoOk}
                        onChange={setPesoOk}
                    />
                    <ToggleSwitch
                        label="Uso de galga"
                        checked={usoGalga}
                        onChange={setUsoGalga}
                    />
                    <ToggleSwitch
                        label="Galga en buen estado"
                        checked={galgaBuenEstado}
                        onChange={setGalgaBuenEstado}
                    />
                </div>

                {/* Observaciones */}
                <div className="pt-2">
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

