'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FormVaciadoFvProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const RESIN_TYPES = ['Virgen', 'Cargada'];

const DEFAULT_REFERENCIAS = [
    'AMERICANA',
    'BONAIRE',
    'CALIMA',
    'CATALUNA',
    'CHATTANOOGAN',
    'DANESA',
    'FALDON AMERICANA',
    'FALDON CATALUNA',
    'FALDON DANESA',
    'FALDON MALTA',
    'FALDON NORUEGA',
    'FALDÓN HONOLULU',
    'FRANCESA 160',
    'FRANCESA 180X90',
    'FRANCESA 181',
    'GALAPAGOS',
    'HONOLULU',
    'ITALIANA ECO 150',
    'JAMAICA',
    'MALTA',
    'MILENIUM',
    'MOBU',
    'NORUEGA',
    'SANTORINI',
    'TAHITI'
];

export default function FormVaciadoFv({ onCancel, onSuccess }: FormVaciadoFvProps) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [operariosList, setOperariosList] = useState<string[]>([]);
    const [referenciasList, setReferenciasList] = useState<string[]>(DEFAULT_REFERENCIAS);

    // Campos según capturas de VACIADO FV
    const [operador, setOperador] = useState<string>('');
    const [referencia, setReferencia] = useState<string>('');
    const [tipoResina, setTipoResina] = useState<string>('');
    const [presionResina, setPresionResina] = useState<string>('');
    const [presionChopper, setPresionChopper] = useState<string>('');
    const [porcCatalizador, setPorcCatalizador] = useState<string>('');
    const [calentadores, setCalentadores] = useState<string>('apagado');
    const [tempAmbiente, setTempAmbiente] = useState<string>('');
    const [fechaCambioCaneca, setFechaCambioCaneca] = useState<string>(getTodayFormatted());
    const [catalizadorMasilla, setCatalizadorMasilla] = useState<string>('NOROX 925');
    const [cantidadMasilla, setCantidadMasilla] = useState<string>('');

    // Pesos y cálculos dinámicos
    const [pesoResina, setPesoResina] = useState<string>('0');
    const [pesoFibra, setPesoFibra] = useState<string>('0');

    // Switches (Toggles booleanos)
    const [pesoOk, setPesoOk] = useState<boolean>(true);
    const [filtroLimpio, setFiltroLimpio] = useState<boolean>(true);
    const [seUsoMatt, setSeUsoMatt] = useState<boolean>(true);
    const [rodillosCompletos, setRodillosCompletos] = useState<boolean>(true);
    const [rodillosLimpios, setRodillosLimpios] = useState<boolean>(true);
    const [tarroCatalizadorLimpio, setTarroCatalizadorLimpio] = useState<boolean>(true);
    const [resina3835, setResina3835] = useState<boolean>(true); // Referenica Resina (4891)
    const [catalizadorLpt, setCatalizadorLpt] = useState<boolean>(true); // Catalizador (Revox HD)

    const [observaciones, setObservaciones] = useState<string>('');

    // Cálculos de Resina + Fibra, % Resina y % Fibra
    const calculos = useMemo(() => {
        const r = parseFloat((pesoResina || '0').replace(',', '.'));
        const f = parseFloat((pesoFibra || '0').replace(',', '.'));
        const validR = isNaN(r) ? 0 : r;
        const validF = isNaN(f) ? 0 : f;
        const suma = validR + validF;

        if (suma === 0) {
            return {
                resinaMasFibra: 0,
                porcResinaDisplay: 'NaN',
                porcFibraDisplay: 'NaN',
                porcResinaNum: null,
                porcFibraNum: null
            };
        }

        const pRes = (validR / suma) * 100;
        const pFib = (validF / suma) * 100;

        return {
            resinaMasFibra: Math.round(suma * 100) / 100,
            porcResinaDisplay: `${pRes.toFixed(1)}%`,
            porcFibraDisplay: `${pFib.toFixed(1)}%`,
            porcResinaNum: Math.round(pRes * 100) / 100,
            porcFibraNum: Math.round(pFib * 100) / 100
        };
    }, [pesoResina, pesoFibra]);

    // Cargar listas previas de operarios y referencias únicas de pv_vaciado_fv
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data } = await supabase
                    .from('pv_vaciado_fv')
                    .select('operador, referencia')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (data) {
                    const uniqueOps = Array.from(new Set(data.map(d => d.operador?.trim()).filter(Boolean))) as string[];
                    if (uniqueOps.length > 0) setOperariosList(uniqueOps);

                    const uniqueRefs = Array.from(new Set([
                        ...DEFAULT_REFERENCIAS,
                        ...data.map(d => d.referencia?.trim()).filter(Boolean)
                    ])) as string[];
                    setReferenciasList(uniqueRefs);
                }
            } catch (err) {
                console.warn('No se pudieron cargar datos iniciales de vaciado FV:', err);
            }
        };
        fetchInitialData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!operador.trim()) {
            setErrorMsg('Por favor selecciona o ingresa el nombre del operario.');
            return;
        }

        if (!referencia.trim()) {
            setErrorMsg('Por favor selecciona o ingresa la referencia.');
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
            operador: operador.trim(),
            referencia: referencia.trim(),
            tipo_resina: tipoResina.trim() || null,
            presion_resina: parseNum(presionResina),
            presion_chopper: parseNum(presionChopper),
            porc_catalizador: parseNum(porcCatalizador),
            calentadores: calentadores.trim() || null,
            temp_ambiente: parseNum(tempAmbiente),
            fecha_cambio_caneca: fechaCambioCaneca.trim() || null,
            catalizador_masilla: catalizadorMasilla.trim() || null,
            cantidad_masilla: parseNum(cantidadMasilla),
            peso_resina: parseNum(pesoResina) ?? 0,
            peso_fibra: parseNum(pesoFibra) ?? 0,
            resina_mas_fibra: calculos.resinaMasFibra,
            resina_peso_total: calculos.porcResinaNum,
            fibra_peso_total: calculos.porcFibraNum,
            peso_OK: pesoOk,
            filtro_limpio: filtroLimpio,
            se_uso_matt: seUsoMatt,
            rodillos_completos: rodillosCompletos,
            rodillos_limpios: rodillosLimpios,
            tarro_catalizador_limpio: tarroCatalizadorLimpio,
            resina_3835: resina3835,
            catalizador_LPT: catalizadorLpt,
            observaciones: observaciones.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('pv_vaciado_fv').insert([payload]);

            if (error) {
                console.error('Error insertando en pv_vaciado_fv:', error);
                setErrorMsg(`Error al guardar: ${error.message}`);
                setSubmitting(false);
                return;
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error general guardando registro vaciado FV:', err);
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
                    VACIADO FV
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
                {/* 1. Operario */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Operario
                    </label>
                    <div className="sm:w-2/3 relative">
                        <input
                            type="text"
                            list="operarios-fv-list"
                            value={operador}
                            onChange={(e) => setOperador(e.target.value)}
                            placeholder="Seleccione..."
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <datalist id="operarios-fv-list">
                            {operariosList.map((op, idx) => (
                                <option key={idx} value={op} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* 2. Referencia */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Referencia
                    </label>
                    <div className="sm:w-2/3 relative">
                        <input
                            type="text"
                            list="referencias-fv-list"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            placeholder="Seleccione..."
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <datalist id="referencias-fv-list">
                            {referenciasList.map((ref, idx) => (
                                <option key={idx} value={ref} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* 3. Tipo de Resina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Tipo de Resina
                    </label>
                    <div className="sm:w-2/3 relative">
                        <select
                            value={tipoResina}
                            onChange={(e) => setTipoResina(e.target.value)}
                            className="w-full py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="">Seleccione...</option>
                            {RESIN_TYPES.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 4. Presión Resina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión Resina
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presionResina}
                        onChange={(e) => setPresionResina(e.target.value)}
                        placeholder="Presión de resina"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 5. Presión Chopper */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Presión Chopper
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presionChopper}
                        onChange={(e) => setPresionChopper(e.target.value)}
                        placeholder="Presión chopper"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 6. % Catalizador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200 focus-within:border-[#0099e5]">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Catalizador
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={porcCatalizador}
                        onChange={(e) => setPorcCatalizador(e.target.value)}
                        placeholder="Ej. 1.5"
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
                        placeholder="apagado / prendido"
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
                        placeholder="°C"
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
                        value={fechaCambioCaneca}
                        onChange={(e) => setFechaCambioCaneca(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 10. Catalizador en Masilla segun ficha */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Catalizador en Masilla segun ficha
                    </label>
                    <input
                        type="text"
                        value={catalizadorMasilla}
                        onChange={(e) => setCatalizadorMasilla(e.target.value)}
                        placeholder="Ej. NOROX 925"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 11. Cantidad de Masilla */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Cantidad de Masilla
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={cantidadMasilla}
                        onChange={(e) => setCantidadMasilla(e.target.value)}
                        placeholder="Gramos / cantidad"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 12. Peso Resina (15s) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Peso Resina (15s)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={pesoResina}
                        onChange={(e) => setPesoResina(e.target.value)}
                        placeholder="0"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 13. Peso Fibra (15s) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-200">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Peso Fibra (15s)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={pesoFibra}
                        onChange={(e) => setPesoFibra(e.target.value)}
                        placeholder="0"
                        className="sm:w-2/3 py-2 px-3 bg-transparent text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* 14. Resina + Fibra (Calculado) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-slate-200 bg-slate-50/50 px-2 rounded-lg">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        Resina + Fibra
                    </label>
                    <div className="sm:w-2/3 py-1 px-3 text-xs sm:text-sm font-bold text-slate-800">
                        {calculos.resinaMasFibra}
                    </div>
                </div>

                {/* 15. % Resina (Calculado) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-slate-200 bg-slate-50/50 px-2 rounded-lg">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Resina
                    </label>
                    <div className="sm:w-2/3 py-1 px-3 text-xs sm:text-sm font-bold text-slate-800">
                        {calculos.porcResinaDisplay}
                    </div>
                </div>

                {/* 16. % Fibra (Calculado) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-slate-200 bg-slate-50/50 px-2 rounded-lg">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:w-1/3">
                        % Fibra
                    </label>
                    <div className="sm:w-2/3 py-1 px-3 text-xs sm:text-sm font-bold text-slate-800">
                        {calculos.porcFibraDisplay}
                    </div>
                </div>

                {/* Switches / Toggles booleanos */}
                <div className="pt-2 space-y-1">
                    <ToggleSwitch
                        checked={pesoOk}
                        onChange={setPesoOk}
                        label="Peso OK?"
                    />
                    <ToggleSwitch
                        checked={filtroLimpio}
                        onChange={setFiltroLimpio}
                        label="Filtro Limpio?"
                    />
                    <ToggleSwitch
                        checked={seUsoMatt}
                        onChange={setSeUsoMatt}
                        label="Se usó matt 225?"
                    />
                    <ToggleSwitch
                        checked={rodillosCompletos}
                        onChange={setRodillosCompletos}
                        label="Rodillos completos"
                    />
                    <ToggleSwitch
                        checked={rodillosLimpios}
                        onChange={setRodillosLimpios}
                        label="Rodillos limpios"
                    />
                    <ToggleSwitch
                        checked={tarroCatalizadorLimpio}
                        onChange={setTarroCatalizadorLimpio}
                        label="Tarro catalizador limpio"
                    />
                    <ToggleSwitch
                        checked={resina3835}
                        onChange={setResina3835}
                        label="Referenica Resina (4891)"
                    />
                    <ToggleSwitch
                        checked={catalizadorLpt}
                        onChange={setCatalizadorLpt}
                        label="Catalizador (Revox HD)"
                    />
                </div>

                {/* Observaciones */}
                <div className="pt-3">
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones..."
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                    />
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-center gap-4 pt-4">
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
