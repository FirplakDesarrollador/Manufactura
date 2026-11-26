'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Save, X } from 'lucide-react';

interface FormPinturaMsProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const CABINAS = [
    { value: '1', label: 'Cabina 1' },
    { value: '2', label: 'Cabina 2' }
];

export default function FormPinturaMs({ onCancel, onSuccess }: FormPinturaMsProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [paintersList, setPaintersList] = useState<string[]>([]);

    // Estados del formulario mapeados 1 a 1 con pv_pintura_ms
    const [cabina, setCabina] = useState<string>('');
    const [pintor, setPintor] = useState<string>('');
    const [largoAbanico, setLargoAbanico] = useState<string>('');
    const [anchoAbanico, setAnchoAbanico] = useState<string>('');
    const [presion, setPresion] = useState<string>('');
    const [presionEstatica, setPresionEstatica] = useState<string>('');
    const [porcCatalizador, setPorcCatalizador] = useState<string>('');
    const [nombreCatalizador, setNombreCatalizador] = useState<string>('NOROX 925');
    const [tempHorno, setTempHorno] = useState<string>('');
    const [tempAmbiente, setTempAmbiente] = useState<string>('');
    const [galgaSuperior, setGalgaSuperior] = useState<string>('');
    const [galgaParedes, setGalgaParedes] = useState<string>('');
    const [galgaPiso, setGalgaPiso] = useState<string>('');
    const [galgaPestana, setGalgaPestana] = useState<string>('');
    const [tiempoGel, setTiempoGel] = useState<string>('');
    const [lote, setLote] = useState<string>('');
    const [color, setColor] = useState<string>('');

    // Switches (Toggles booleanos)
    const [bolsaPinada, setBolsaPinada] = useState<boolean>(true);
    const [aspasSinMuchaAcum, setAspasSinMuchaAcum] = useState<boolean>(true);
    const [usoGalga, setUsoGalga] = useState<boolean>(true);
    const [galgaEnBuenEstado, setGalgaEnBuenEstado] = useState<boolean>(true);
    const [conteoGalguiar, setConteoGalguiar] = useState<boolean>(true);
    const [ceraGlass, setCeraGlass] = useState<boolean>(true);
    const [guiaTornillos, setGuiaTornillos] = useState<boolean>(true);
    const [puestaPunto, setPuestaPunto] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    // Cargar lista histórica de pintores únicos para el autocompletado
    useEffect(() => {
        const fetchPainters = async () => {
            try {
                const { data } = await supabase
                    .from('pv_pintura_ms')
                    .select('pintor')
                    .not('pintor', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (data) {
                    const unique = Array.from(new Set(data.map(d => d.pintor?.trim()).filter(Boolean))) as string[];
                    setPaintersList(unique);
                }
            } catch (err) {
                console.warn('No se pudo cargar la lista previa de pintores:', err);
            }
        };
        fetchPainters();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!cabina) {
            setErrorMsg('Por favor selecciona una cabina.');
            return;
        }

        if (!pintor.trim()) {
            setErrorMsg('Por favor ingresa o selecciona el nombre del pintor.');
            return;
        }

        setSubmitting(true);

        const parseNum = (val: string) => {
            if (!val || val.trim() === '') return null;
            const cleaned = val.replace(',', '.').trim();
            const n = parseFloat(cleaned);
            return isNaN(n) ? null : n;
        };

        const payload = {
            cabina: cabina.trim(),
            pintor: pintor.trim(),
            largo_abanico: parseNum(largoAbanico),
            ancho_abanico: parseNum(anchoAbanico),
            presion: parseNum(presion),
            presion_estatica: parseNum(presionEstatica),
            porc_catalizador: parseNum(porcCatalizador),
            nombre_catalizador: nombreCatalizador.trim() || null,
            temp_horno: parseNum(tempHorno),
            temp_ambiente: parseNum(tempAmbiente),
            galga_superior: parseNum(galgaSuperior),
            galga_paredes: parseNum(galgaParedes),
            galga_piso: parseNum(galgaPiso),
            galga_pestanas: parseNum(galgaPestana),
            tiempo_gel: tiempoGel.trim() || null,
            lote: lote.trim() || null,
            color: color.trim() || null,
            bolsa_pinada: bolsaPinada,
            aspas_sin_mucha_acum: aspasSinMuchaAcum,
            uso_galga: usoGalga,
            galga_en_buen_estado: galgaEnBuenEstado,
            conteo_galguiar: conteoGalguiar,
            cera_glass: ceraGlass,
            guia_tornillos: guiaTornillos,
            puesta_punto: puestaPunto,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_pintura_ms').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_pintura_ms:', error);
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

    // Componente Switch personalizado idéntico a las capturas
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
                    PINTURA MS
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
                {/* 1. Cabina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Cabina
                    </label>
                    <select
                        value={cabina}
                        onChange={(e) => setCabina(e.target.value)}
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer text-left"
                    >
                        <option value="">Select...</option>
                        {CABINAS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Pintor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Pintor
                    </label>
                    <div className="sm:w-2/3 relative">
                        <input
                            type="text"
                            list="painters-list"
                            value={pintor}
                            onChange={(e) => setPintor(e.target.value)}
                            placeholder="Seleccionar o escribir el pintor"
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <datalist id="painters-list">
                            {paintersList.map((p, idx) => (
                                <option key={idx} value={p} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* 3. Largo Abanico */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Largo Abanico
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={largoAbanico}
                        onChange={(e) => setLargoAbanico(e.target.value)}
                        placeholder="Ej. 24"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 4. Ancho Abanico */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Ancho Abanico
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={anchoAbanico}
                        onChange={(e) => setAnchoAbanico(e.target.value)}
                        placeholder="Ej. 4"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 5. Presión */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presion}
                        onChange={(e) => setPresion(e.target.value)}
                        placeholder="Ej. 41"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 6. Presión Estática */}
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

                {/* 7. % Catalizador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Catalizador
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={porcCatalizador}
                        onChange={(e) => setPorcCatalizador(e.target.value)}
                        placeholder="Ej. 2.7"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 8. Nombre Catalizador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Nombre Catalizador
                    </label>
                    <input
                        type="text"
                        value={nombreCatalizador}
                        onChange={(e) => setNombreCatalizador(e.target.value)}
                        placeholder="Ej. NOROX 925"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 9. Temp. Horno */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Temp. Horno
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tempHorno}
                        onChange={(e) => setTempHorno(e.target.value)}
                        placeholder="Ej. 38.4"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 10. Temp. Ambiente */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Temp. Ambiente
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tempAmbiente}
                        onChange={(e) => setTempAmbiente(e.target.value)}
                        placeholder="Ej. 22.6"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 11. Galga Superior */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Superior
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaSuperior}
                        onChange={(e) => setGalgaSuperior(e.target.value)}
                        placeholder="Ej. 18"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 12. Galga Paredes */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Paredes
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaParedes}
                        onChange={(e) => setGalgaParedes(e.target.value)}
                        placeholder="Ej. 22"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 13. Galga Piso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Piso
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaPiso}
                        onChange={(e) => setGalgaPiso(e.target.value)}
                        placeholder="Ej. 16"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 14. Galga Pestaña */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Galga Pestaña
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={galgaPestana}
                        onChange={(e) => setGalgaPestana(e.target.value)}
                        placeholder="Ej. 22"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 15. Tiempo de Gel */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Tiempo de Gel
                    </label>
                    <input
                        type="text"
                        value={tiempoGel}
                        onChange={(e) => setTiempoGel(e.target.value)}
                        placeholder="Ej. 14.03,46"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 16. # Lote */}
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

                {/* 17. Color */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Color
                    </label>
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Ej. Blanco, Natural, etc."
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* Sección de Switches / Parámetros de verificación */}
                <div className="pt-3 pb-1 space-y-1">
                    <ToggleSwitch
                        label="Bolsa pinada (max 15 dias)"
                        checked={bolsaPinada}
                        onChange={setBolsaPinada}
                    />
                    <ToggleSwitch
                        label="Aspas sin mucha acumulación"
                        checked={aspasSinMuchaAcum}
                        onChange={setAspasSinMuchaAcum}
                    />
                    <ToggleSwitch
                        label="Uso de galga"
                        checked={usoGalga}
                        onChange={setUsoGalga}
                    />
                    <ToggleSwitch
                        label="Galga en buen estado"
                        checked={galgaEnBuenEstado}
                        onChange={setGalgaEnBuenEstado}
                    />
                    <ToggleSwitch
                        label="Conteo para galguiar"
                        checked={conteoGalguiar}
                        onChange={setConteoGalguiar}
                    />
                    <ToggleSwitch
                        label="Cera glas"
                        checked={ceraGlass}
                        onChange={setCeraGlass}
                    />
                    <ToggleSwitch
                        label="Guia para apretar tornillos"
                        checked={guiaTornillos}
                        onChange={setGuiaTornillos}
                    />
                    <ToggleSwitch
                        label="Puesta a punto"
                        checked={puestaPunto}
                        onChange={setPuestaPunto}
                    />
                </div>

                {/* Observaciones */}
                <div className="pt-2">
                    <textarea
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099e5] bg-slate-50/50"
                    />
                </div>

                {/* Botones de acción inferiores: Guardar y Cancelar (idénticos al pantallazo) */}
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

