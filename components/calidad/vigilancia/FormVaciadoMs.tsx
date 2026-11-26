'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormVaciadoMsProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const LINEAS = [
    { value: '1', label: 'Línea 1' },
    { value: '2', label: 'Línea 2' },
    { value: '3', label: 'Línea 3' }
];

const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function FormVaciadoMs({ onCancel, onSuccess }: FormVaciadoMsProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [operariosList, setOperariosList] = useState<string[]>([]);

    // Campos mapeados 1 a 1 con pv_vaciado_ms
    const [linea, setLinea] = useState<string>('');
    const [operario, setOperario] = useState<string>('');
    const [referencia, setReferencia] = useState<string>('');
    const [presion, setPresion] = useState<string>('');
    const [carga, setCarga] = useState<string>('');
    const [porcCatalizador, setPorcCatalizador] = useState<string>('');
    const [calentadores, setCalentadores] = useState<string>('');
    const [tempAmbiente, setTempAmbiente] = useState<string>('');
    const [fechaCaneca, setFechaCaneca] = useState<string>(getTodayFormatted());
    const [fechaLote, setFechaLote] = useState<string>(getTodayFormatted());
    const [referenciaResina, setReferenciaResina] = useState<string>('');
    const [resinaInicial, setResinaInicial] = useState<string>('0');
    const [resinaFinal, setResinaFinal] = useState<string>('0');
    const [pesoPieza, setPesoPieza] = useState<string>('');
    const [porcResina, setPorcResina] = useState<string>('');
    const [pesoOk, setPesoOk] = useState<boolean>(true);
    const [kilosMinuto, setKilosMinuto] = useState<string>('');
    const [tiempoGel, setTiempoGel] = useState<string>('');

    // Switches (Toggles booleanos)
    const [ceraGlass, setCeraGlass] = useState<boolean>(true);
    const [estadoContramolde, setEstadoContramolde] = useState<boolean>(true);
    const [hojaReporteContramolde, setHojaReporteContramolde] = useState<boolean>(true);
    const [resinaUltracaster, setResinaUltracaster] = useState<boolean>(true);
    const [resinaAdm, setResinaAdm] = useState<boolean>(false);
    const [catalizadorAc50, setCatalizadorAc50] = useState<boolean>(true);
    const [puestaPunto, setPuestaPunto] = useState<boolean>(true);
    const [carbonatoBuenEstado, setCarbonatoBuenEstado] = useState<boolean>(true);
    const [cobaltoBienTapado, setCobaltoBienTapado] = useState<boolean>(true);
    const [vaselinaAcpm, setVaselinaAcpm] = useState<boolean>(true);
    const [vibradorEncendido, setVibradorEncendido] = useState<boolean>(true);
    const [cronometro, setCronometro] = useState<boolean>(true);

    const [observaciones, setObservaciones] = useState<string>('');

    // Total Resina calculado automáticamente (Resina Inicial - Resina Final)
    const totalResina = useMemo(() => {
        const ini = parseFloat((resinaInicial || '0').replace(',', '.'));
        const fin = parseFloat((resinaFinal || '0').replace(',', '.'));
        if (isNaN(ini) || isNaN(fin)) return 0;
        const diff = ini - fin;
        return Math.round(diff * 100) / 100;
    }, [resinaInicial, resinaFinal]);

    // Cargar lista histórica de operarios de vaciado para autocompletado
    useEffect(() => {
        const fetchOperarios = async () => {
            try {
                const { data } = await supabase
                    .from('pv_vaciado_ms')
                    .select('operador')
                    .not('operador', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (data) {
                    const unique = Array.from(new Set(data.map(d => d.operador?.trim()).filter(Boolean))) as string[];
                    setOperariosList(unique);
                }
            } catch (err) {
                console.warn('No se pudo cargar la lista previa de operarios:', err);
            }
        };
        fetchOperarios();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!linea) {
            setErrorMsg('Por favor selecciona una línea.');
            return;
        }

        if (!operario.trim()) {
            setErrorMsg('Por favor ingresa o selecciona el operario.');
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
            cabina: linea.trim(),
            operador: operario.trim(),
            referencia: referencia.trim() || null,
            presion: parseNum(presion),
            carga: parseNum(carga),
            porc_catalizador: parseNum(porcCatalizador),
            calentadores: calentadores.trim() || null,
            t_ambiente: parseNum(tempAmbiente),
            fecha_caneca: fechaCaneca.trim() || null,
            fecha_lote: fechaLote.trim() || null,
            referencia_resina: referenciaResina.trim() || null,
            resina_inicial: parseNum(resinaInicial) ?? 0,
            resina_final: parseNum(resinaFinal) ?? 0,
            r_inicial_r_final: totalResina,
            peso_pieza: parseNum(pesoPieza),
            porc_resina: parseNum(porcResina),
            peso_ok: pesoOk,
            kilos_minuto: parseNum(kilosMinuto),
            tiempo_gel: tiempoGel.trim() || null,
            cera_glass: ceraGlass,
            estado_contramolde: estadoContramolde,
            hoja_reporte_contramolde: hojaReporteContramolde,
            resina_ultracaster: resinaUltracaster,
            resina_ADM: resinaAdm,
            catalizador_AC50: catalizadorAc50,
            puesta_punto: puestaPunto,
            carbonato_buen_estado: carbonatoBuenEstado,
            cobalto_bien_tapado: cobaltoBienTapado,
            vaselina_acpm: vaselinaAcpm,
            vibrador_encendido: vibradorEncendido,
            cronometro: cronometro,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_vaciado_ms').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_vaciado_ms:', error);
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
                    VACIADO MS
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
                {/* 1. Linea */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Linea
                    </label>
                    <select
                        value={linea}
                        onChange={(e) => setLinea(e.target.value)}
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer text-left"
                    >
                        <option value="">Select...</option>
                        {LINEAS.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Operario */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Operario
                    </label>
                    <div className="sm:w-2/3 relative">
                        <input
                            type="text"
                            list="operarios-vaciado-list"
                            value={operario}
                            onChange={(e) => setOperario(e.target.value)}
                            placeholder="Select..."
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <datalist id="operarios-vaciado-list">
                            {operariosList.map((op, idx) => (
                                <option key={idx} value={op} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* 3. Referencia */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Referencia
                    </label>
                    <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ej. Oslo 124, Barra 120..."
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 4. Presión */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presion}
                        onChange={(e) => setPresion(e.target.value)}
                        placeholder="Ej. 40"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 5. Carga */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Carga
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={carga}
                        onChange={(e) => setCarga(e.target.value)}
                        placeholder="Ej. 350"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 6. % Catalizador */}
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

                {/* 7. Calentadores */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Calentadores
                    </label>
                    <input
                        type="text"
                        value={calentadores}
                        onChange={(e) => setCalentadores(e.target.value)}
                        placeholder="Ej. Prendido / Apagado"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 8. Temp. Ambiente */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Temp. Ambiente
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tempAmbiente}
                        onChange={(e) => setTempAmbiente(e.target.value)}
                        placeholder="Ej. 22"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 9. Fecha Cambio Caneca */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Fecha Cambio Caneca
                    </label>
                    <input
                        type="text"
                        value={fechaCaneca}
                        onChange={(e) => setFechaCaneca(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 10. Fecha Lote */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Fecha Lote
                    </label>
                    <input
                        type="text"
                        value={fechaLote}
                        onChange={(e) => setFechaLote(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 11. Referencia Resina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Referencia Resina
                    </label>
                    <input
                        type="text"
                        value={referenciaResina}
                        onChange={(e) => setReferenciaResina(e.target.value)}
                        placeholder="Ej. 202"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 12. Resina Inicial */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Resina Inicial
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={resinaInicial}
                        onChange={(e) => setResinaInicial(e.target.value)}
                        placeholder="0"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 13. Resina Final */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Resina Final
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={resinaFinal}
                        onChange={(e) => setResinaFinal(e.target.value)}
                        placeholder="0"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 14. Total Resina (Calculado automáticamente) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Total Resina
                    </label>
                    <div className="sm:w-2/3 py-1 px-3 text-slate-800 text-xs sm:text-sm font-bold">
                        {totalResina}
                    </div>
                </div>

                {/* 15. Peso de la Pieza */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Peso de la Pieza
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={pesoPieza}
                        onChange={(e) => setPesoPieza(e.target.value)}
                        placeholder="Ej. 30"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 16. % Resina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Resina
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={porcResina}
                        onChange={(e) => setPorcResina(e.target.value)}
                        placeholder="Ej. 16"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 17. Peso OK? */}
                <ToggleSwitch
                    label="Peso OK?"
                    checked={pesoOk}
                    onChange={setPesoOk}
                />

                {/* 18. Kilos por minuto */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Kilos por minuto
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={kilosMinuto}
                        onChange={(e) => setKilosMinuto(e.target.value)}
                        placeholder="Ej. 11.4"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 19. Tiempo de gel */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Tiempo de gel
                    </label>
                    <input
                        type="text"
                        value={tiempoGel}
                        onChange={(e) => setTiempoGel(e.target.value)}
                        placeholder="Ej. 15.35,32"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* Sección de Switches / Parámetros de verificación */}
                <div className="pt-2 pb-1 space-y-1">
                    <ToggleSwitch
                        label="Cera glas"
                        checked={ceraGlass}
                        onChange={setCeraGlass}
                    />
                    <ToggleSwitch
                        label="Estado del contramolde"
                        checked={estadoContramolde}
                        onChange={setEstadoContramolde}
                    />
                    <ToggleSwitch
                        label="Hoja reporte contramoldes"
                        checked={hojaReporteContramolde}
                        onChange={setHojaReporteContramolde}
                    />
                    <ToggleSwitch
                        label="Resina M202 (ultracaster)"
                        checked={resinaUltracaster}
                        onChange={setResinaUltracaster}
                    />
                    <ToggleSwitch
                        label="Resina 755 o 093 (ADM)"
                        checked={resinaAdm}
                        onChange={setResinaAdm}
                    />
                    <ToggleSwitch
                        label="Catalizador (AC50)"
                        checked={catalizadorAc50}
                        onChange={setCatalizadorAc50}
                    />
                    <ToggleSwitch
                        label="Puesta a punto"
                        checked={puestaPunto}
                        onChange={setPuestaPunto}
                    />
                    <ToggleSwitch
                        label="Carbonato en buen estado"
                        checked={carbonatoBuenEstado}
                        onChange={setCarbonatoBuenEstado}
                    />
                    <ToggleSwitch
                        label="Cobalto bien tapado"
                        checked={cobaltoBienTapado}
                        onChange={setCobaltoBienTapado}
                    />
                    <ToggleSwitch
                        label="Vaselina/ACPM"
                        checked={vaselinaAcpm}
                        onChange={setVaselinaAcpm}
                    />
                    <ToggleSwitch
                        label="Vibrador encendido (solo ultracaster)"
                        checked={vibradorEncendido}
                        onChange={setVibradorEncendido}
                    />
                    <ToggleSwitch
                        label="Cronometro"
                        checked={cronometro}
                        onChange={setCronometro}
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

