'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    PROCESOS_CONSUMO,
    ProcesoConsumoKey,
    RegistroConsumo,
    ReferenciaSapSugerencia,
    cargarConsumos,
    cargarSugerenciasReferencias,
    hoyBogotaYMD
} from '@/lib/calidad/consumos';
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi';
import SelectorReferenciaSap from '@/components/calidad/consumos/SelectorReferenciaSap';
import {
    Scale,
    Plus,
    History,
    CheckCircle2,
    AlertTriangle,
    Layers,
    Save,
    Loader2,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    X,
    Sparkles,
    ArrowRightLeft
} from 'lucide-react';

interface ConsumosModuleProps {
    userEmail?: string;
}

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const fechaCorta = (f: string) => (f ? f.split('-').reverse().join('/') : '—');

const parseNum = (val: string): number | null => {
    const clean = String(val ?? '').replace(',', '.').trim();
    if (clean === '') return null;
    const n = Number(clean);
    return isNaN(n) ? null : n;
};

function getEstadoVariacion(pct: number | null): 'ok' | 'alerta' | 'critico' {
    if (pct === null || !isFinite(pct)) return 'ok';
    const abs = Math.abs(pct);
    if (abs <= 5) return 'ok';
    if (abs <= 10) return 'alerta';
    return 'critico';
}

export default function ConsumosModule({ userEmail }: ConsumosModuleProps) {
    // Navegación principal: Registrar rápido vs Historial
    const [vista, setVista] = useState<'registrar' | 'historial'>('registrar');
    const [procesoActivo, setProcesoActivo] = useState<ProcesoConsumoKey>('pintura_ms');

    // Datos cargados
    const [registros, setRegistros] = useState<RegistroConsumo[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [sugerencias, setSugerencias] = useState<{
        fv: ReferenciaSapSugerencia[];
        ms: ReferenciaSapSugerencia[];
    }>({ fv: [], ms: [] });

    // Estado del formulario rápido
    const [editingId, setEditingId] = useState<number | null>(null);
    const [fecha, setFecha] = useState<string>(hoyBogotaYMD);
    const [tipoResina, setTipoResina] = useState<string>('BLANCO');
    const [esCicloDosPiezas, setEsCicloDosPiezas] = useState<boolean>(false);

    // Pieza 1 (o única)
    const [referencia, setReferencia] = useState<string>('');
    const [pesoSap, setPesoSap] = useState<string>('');
    const [pesoReal, setPesoReal] = useState<string>('');

    // Pieza 2 (solo para ciclo de 2 piezas en Pintura MS)
    const [referencia2, setReferencia2] = useState<string>('');
    const [pesoSap2, setPesoSap2] = useState<string>('');
    const [pesoReal2, setPesoReal2] = useState<string>('');
    // En ciclo de 2 piezas: el operario puede ingresar Real 1 + Real 2, o un solo Real Total del ciclo
    const [modoRealCiclo, setModoRealCiclo] = useState<'total' | 'separado'>('total');

    // Parámetros adicionales
    const [galgaPared, setGalgaPared] = useState<string>('');
    const [galgaPiso, setGalgaPiso] = useState<string>('');
    const [operario, setOperario] = useState<string>('');
    const [observaciones, setObservaciones] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Filtros del Historial
    const [filtroProcesoHist, setFiltroProcesoHist] = useState<ProcesoConsumoKey | 'todos'>('todos');
    const [searchHist, setSearchHist] = useState<string>('');
    const [anios, setAnios] = useState<number[]>([]);
    const [meses, setMeses] = useState<number[]>([]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);

    const procesoConfig = useMemo(
        () => PROCESOS_CONSUMO.find((p) => p.key === procesoActivo) || PROCESOS_CONSUMO[0],
        [procesoActivo]
    );

    const fetchAll = useCallback(async () => {
        setLoadingList(true);
        const [data, sugs] = await Promise.all([cargarConsumos(), cargarSugerenciasReferencias()]);
        setRegistros(data);
        setSugerencias(sugs);
        setLoadingList(false);
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Al cambiar de proceso (si no estamos editando), ajustar tipo de material por defecto y ciclo
    const handleSelectProceso = (key: ProcesoConsumoKey) => {
        const cfg = PROCESOS_CONSUMO.find((p) => p.key === key)!;
        setProcesoActivo(key);
        setEditingId(null);
        setTipoResina(cfg.tiposMaterial[0] || '');
        if (!cfg.soportaCicloDosPiezas) {
            setEsCicloDosPiezas(false);
        }
        setReferencia('');
        setPesoSap('');
        setPesoReal('');
        setReferencia2('');
        setPesoSap2('');
        setPesoReal2('');
        setGalgaPared('');
        setGalgaPiso('');
        setObservaciones('');
        setErrorMsg(null);
        setSuccessMsg(null);
    };

    const listaSugerenciasPlanta = useMemo(
        () => (procesoConfig.planta === 'FV' ? sugerencias.fv : sugerencias.ms),
        [procesoConfig.planta, sugerencias]
    );

    // Auto-rellenar Peso SAP (y Tipo Resina) cuando el usuario selecciona una referencia conocida
    const handleReferenciaChange = (val: string, pieza: 1 | 2) => {
        if (pieza === 1) setReferencia(val);
        else setReferencia2(val);

        const upper = val.trim().toUpperCase();
        const match = listaSugerenciasPlanta.find((s) => s.referencia === upper);
        if (match) {
            const isPintura = procesoActivo === 'pintura_fv' || procesoActivo === 'pintura_ms';
            const pesoSug = isPintura ? match.pesoSapGelcoat : match.pesoSapResina;
            if (pesoSug != null && isFinite(pesoSug)) {
                if (pieza === 1) setPesoSap(String(pesoSug));
                else setPesoSap2(String(pesoSug));
            }
            if (pieza === 1 && match.tipoResina && procesoActivo === 'vaciado_fv') {
                setTipoResina(match.tipoResina);
            }
        }
    };

    // Cálculos en tiempo real (1 pieza o Ciclo de 2 piezas)
    const calculosEnVivo = useMemo(() => {
        const sap1 = parseNum(pesoSap) ?? 0;
        const sap2 = esCicloDosPiezas ? parseNum(pesoSap2) ?? 0 : 0;
        const sapTotal = Number((sap1 + sap2).toFixed(3));

        const r1 = parseNum(pesoReal);
        const r2 = parseNum(pesoReal2);

        let realTotal: number | null = null;
        if (esCicloDosPiezas && modoRealCiclo === 'separado') {
            if (r1 !== null || r2 !== null) {
                realTotal = Number(((r1 ?? 0) + (r2 ?? 0)).toFixed(3));
            }
        } else {
            realTotal = r1;
        }

        const listo = sapTotal > 0 && realTotal !== null;
        const diferencia = listo ? Number((realTotal! - sapTotal).toFixed(3)) : null;
        const porcentaje = listo && sapTotal > 0 ? Number(((diferencia! / sapTotal) * 100).toFixed(2)) : null;
        const estado = getEstadoVariacion(porcentaje);

        return { sap1, sap2, sapTotal, realTotal, diferencia, porcentaje, estado, listo };
    }, [pesoSap, pesoSap2, pesoReal, pesoReal2, esCicloDosPiezas, modoRealCiclo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!referencia.trim()) {
            setErrorMsg('Ingresa o selecciona la referencia de la pieza.');
            return;
        }
        const sap1 = parseNum(pesoSap);
        if (sap1 === null || sap1 <= 0) {
            setErrorMsg('Ingresa un Peso SAP válido (mayor a 0).');
            return;
        }

        let sap2: number | null = null;
        if (esCicloDosPiezas) {
            if (!referencia2.trim()) {
                setErrorMsg('En ciclo de 2 piezas debes ingresar la Referencia de la Pieza 2.');
                return;
            }
            sap2 = parseNum(pesoSap2);
            if (sap2 === null || sap2 <= 0) {
                setErrorMsg('Ingresa un Peso SAP válido para la Pieza 2.');
                return;
            }
        }

        if (calculosEnVivo.realTotal === null || calculosEnVivo.realTotal <= 0) {
            setErrorMsg('Ingresa el Peso Real medido.');
            return;
        }

        setSubmitting(true);

        const sapTotal = Number((sap1 + (sap2 ?? 0)).toFixed(3));
        const realTotal = calculosEnVivo.realTotal;
        const diff = Number((realTotal - sapTotal).toFixed(3));
        const pct = sapTotal > 0 ? Number(((diff / sapTotal) * 100).toFixed(2)) : 0;

        const payload = {
            fecha,
            planta: procesoConfig.planta,
            proceso: procesoActivo,
            tipo_resina: tipoResina.trim() || null,
            es_ciclo_dos_piezas: esCicloDosPiezas,
            referencia: referencia.trim().toUpperCase(),
            peso_sap: sap1,
            referencia_2: esCicloDosPiezas ? referencia2.trim().toUpperCase() : null,
            peso_sap_2: esCicloDosPiezas ? sap2 : null,
            peso_sap_total: sapTotal,
            peso_real: realTotal,
            peso_real_2: esCicloDosPiezas && modoRealCiclo === 'separado' ? parseNum(pesoReal2) : null,
            diferencia: diff,
            porcentaje_variacion: pct,
            galga_pared: procesoConfig.usaGalgas ? parseNum(galgaPared) : null,
            galga_piso: procesoConfig.usaGalgas ? parseNum(galgaPiso) : null,
            operario: operario.trim() || null,
            observaciones: observaciones.trim() || null,
            registrado_por: userEmail || null
        };

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('calidad_consumos')
                    .update(payload)
                    .eq('id', editingId);
                if (error) {
                    setErrorMsg(`Error al actualizar: ${error.message}`);
                    setSubmitting(false);
                    return;
                }
                setSuccessMsg(`Registro #${editingId} actualizado correctamente.`);
                setEditingId(null);
            } else {
                const { error } = await supabase.from('calidad_consumos').insert([payload]);
                if (error) {
                    setErrorMsg(`Error al guardar: ${error.message}`);
                    setSubmitting(false);
                    return;
                }
                setSuccessMsg(
                    `Consumo guardado (${payload.referencia}${payload.referencia_2 ? ` + ${payload.referencia_2}` : ''}) · Dif: ${diff > 0 ? '+' : ''}${diff} kg`
                );
            }

            // Limpiar campos de pieza para registrar rápidamente la siguiente
            setReferencia('');
            setPesoSap('');
            setPesoReal('');
            setReferencia2('');
            setPesoSap2('');
            setPesoReal2('');
            setGalgaPared('');
            setGalgaPiso('');
            setObservaciones('');
            fetchAll();
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: any) {
            setErrorMsg(`Error inesperado: ${err?.message || err}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditarRegistro = (reg: RegistroConsumo) => {
        setEditingId(reg.id);
        setProcesoActivo(reg.proceso);
        setFecha(reg.fecha);
        setTipoResina(reg.tipo_resina || '');
        setEsCicloDosPiezas(Boolean(reg.es_ciclo_dos_piezas));
        setReferencia(reg.referencia || '');
        setPesoSap(String(reg.peso_sap ?? ''));
        setReferencia2(reg.referencia_2 || '');
        setPesoSap2(reg.peso_sap_2 != null ? String(reg.peso_sap_2) : '');
        if (reg.es_ciclo_dos_piezas && reg.peso_real_2 != null) {
            setModoRealCiclo('separado');
            setPesoReal(String(Number((reg.peso_real - reg.peso_real_2).toFixed(3))));
            setPesoReal2(String(reg.peso_real_2));
        } else {
            setModoRealCiclo('total');
            setPesoReal(String(reg.peso_real ?? ''));
            setPesoReal2('');
        }
        setGalgaPared(reg.galga_pared != null ? String(reg.galga_pared) : '');
        setGalgaPiso(reg.galga_piso != null ? String(reg.galga_piso) : '');
        setOperario(reg.operario || '');
        setObservaciones(reg.observaciones || '');
        setErrorMsg(null);
        setSuccessMsg(null);
        setVista('registrar');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEliminarRegistro = async (id: number) => {
        if (!window.confirm(`¿Eliminar el registro de consumo #${id}?`)) return;
        const { error } = await supabase.from('calidad_consumos').delete().eq('id', id);
        if (!error) {
            setRegistros((prev) => prev.filter((r) => r.id !== id));
        }
    };

    // Conteos por proceso
    const conteoPorProceso = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of registros) {
            map[r.proceso] = (map[r.proceso] || 0) + 1;
        }
        return map;
    }, [registros]);

    // Filtros PBI del historial
    const todasFechasHist = useMemo(() => {
        const set = new Set<string>();
        registros.forEach((r) => {
            if (filtroProcesoHist !== 'todos' && r.proceso !== filtroProcesoHist) return;
            if (r.fecha && r.fecha.length >= 10) set.add(r.fecha);
        });
        return Array.from(set).sort();
    }, [registros, filtroProcesoHist]);

    const aniosDisp = useMemo(() => {
        const set = new Set<number>();
        todasFechasHist.forEach((f) => set.add(Number(f.slice(0, 4))));
        return Array.from(set).sort((a, b) => b - a);
    }, [todasFechasHist]);

    const fechasAnioMes = useMemo(
        () =>
            todasFechasHist.filter((f) => {
                if (anios.length && !anios.includes(Number(f.slice(0, 4)))) return false;
                if (meses.length && !meses.includes(Number(f.slice(5, 7)))) return false;
                return true;
            }),
        [todasFechasHist, anios, meses]
    );

    const variosAnios = anios.length !== 1 && aniosDisp.length > 1;
    const unSoloMes = meses.length === 1 && !variosAnios;

    const opcionesMes = useMemo(() => {
        const set = new Set<number>();
        todasFechasHist.forEach((f) => {
            if (!anios.length || anios.includes(Number(f.slice(0, 4)))) set.add(Number(f.slice(5, 7)));
        });
        return MESES.map((m, i) => ({ value: String(i + 1), label: m })).filter(
            (o) => set.size === 0 || set.has(Number(o.value))
        );
    }, [todasFechasHist, anios]);

    const opcionesSemana = useMemo(() => {
        const mapa = new Map<string, { anio: number; semana: number }>();
        fechasAnioMes.forEach((f) => {
            const s = semanaIso(f);
            mapa.set(s.clave, s);
        });
        return Array.from(mapa.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, s]) => ({
                value: k,
                label: `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}`
            }));
    }, [fechasAnioMes, variosAnios]);

    const opcionesDia = useMemo(
        () =>
            fechasAnioMes
                .filter((f) => !semanas.length || semanas.includes(semanaIso(f).clave))
                .map((f) => ({
                    value: f,
                    label: unSoloMes ? String(Number(f.slice(8, 10))) : fechaCorta(f).slice(0, variosAnios ? 10 : 5)
                })),
        [fechasAnioMes, semanas, unSoloMes, variosAnios]
    );

    const registrosFiltrados = useMemo(() => {
        return registros.filter((r) => {
            if (filtroProcesoHist !== 'todos' && r.proceso !== filtroProcesoHist) return false;
            if (anios.length && !anios.includes(Number(r.fecha.slice(0, 4)))) return false;
            if (meses.length && !meses.includes(Number(r.fecha.slice(5, 7)))) return false;
            if (semanas.length && !semanas.includes(semanaIso(r.fecha).clave)) return false;
            if (diasSel.length && !diasSel.includes(r.fecha)) return false;
            if (searchHist.trim()) {
                const q = searchHist.toLowerCase();
                const hit =
                    r.referencia.toLowerCase().includes(q) ||
                    (r.referencia_2 && r.referencia_2.toLowerCase().includes(q)) ||
                    (r.tipo_resina && r.tipo_resina.toLowerCase().includes(q)) ||
                    (r.operario && r.operario.toLowerCase().includes(q));
                if (!hit) return false;
            }
            return true;
        });
    }, [registros, filtroProcesoHist, anios, meses, semanas, diasSel, searchHist]);

    const kpisHistorial = useMemo(() => {
        const total = registrosFiltrados.length;
        if (total === 0) return { total: 0, sapSum: 0, realSum: 0, diffSum: 0, pctOk: 0 };
        const sapSum = registrosFiltrados.reduce((a, r) => a + Number(r.peso_sap_total || 0), 0);
        const realSum = registrosFiltrados.reduce((a, r) => a + Number(r.peso_real || 0), 0);
        const diffSum = realSum - sapSum;
        const okCount = registrosFiltrados.filter(
            (r) => getEstadoVariacion(r.porcentaje_variacion) === 'ok'
        ).length;
        return {
            total,
            sapSum: Number(sapSum.toFixed(2)),
            realSum: Number(realSum.toFixed(2)),
            diffSum: Number(diffSum.toFixed(2)),
            pctOk: Number(((okCount / total) * 100).toFixed(1))
        };
    }, [registrosFiltrados]);

    const nombreProceso = (key: ProcesoConsumoKey) =>
        PROCESOS_CONSUMO.find((p) => p.key === key)?.nombre || key;

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
            {/* --- BARRA SUPERIOR: TÍTULO Y CAMBIO DE VISTA --- */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#324354] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Scale size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-[#324354] tracking-tight">
                            Control de Consumos · MS &amp; FV
                        </h1>
                        <p className="text-xs text-slate-500">
                            Registro rápido de consumos reales vs SAP en Mármol Sintético y Fibra de Vidrio
                        </p>
                    </div>
                </div>

                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setVista('registrar')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            vista === 'registrar'
                                ? 'bg-[#324354] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Plus size={14} />
                        <span>{editingId ? `Editando #${editingId}` : 'Registrar Consumo'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setVista('historial')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            vista === 'historial'
                                ? 'bg-[#324354] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <History size={14} />
                        <span>Historial ({registros.length})</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VISTA 1: REGISTRO RÁPIDO (SIN TABLA EXCEL)                                */}
            {/* ========================================================================= */}
            {vista === 'registrar' && (
                <div className="space-y-4">
                    {/* Selector rápido de los 5 procesos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {PROCESOS_CONSUMO.map((proc) => {
                            const active = procesoActivo === proc.key;
                            const count = conteoPorProceso[proc.key] || 0;
                            return (
                                <button
                                    key={proc.key}
                                    type="button"
                                    onClick={() => handleSelectProceso(proc.key)}
                                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                        active
                                            ? 'bg-[#324354] text-white border-[#324354] shadow-md -translate-y-0.5'
                                            : 'bg-white text-slate-700 border-slate-200/90 hover:border-[#0099e5] hover:shadow-xs'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                active
                                                    ? 'bg-white/15 text-[#38bdf8]'
                                                    : proc.planta === 'MS'
                                                    ? 'bg-sky-50 text-[#0099e5]'
                                                    : 'bg-emerald-50 text-emerald-700'
                                            }`}
                                        >
                                            {proc.planta}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold ${
                                                active ? 'text-slate-300' : 'text-slate-400'
                                            }`}
                                        >
                                            {count} reg.
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-sm font-extrabold leading-tight">{proc.nombre}</p>
                                        {proc.soportaCicloDosPiezas && (
                                            <p
                                                className={`text-[10px] mt-0.5 font-medium ${
                                                    active ? 'text-sky-200' : 'text-[#0099e5]'
                                                }`}
                                            >
                                                Soporta ciclo de 2 piezas
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Mensajes de estado */}
                    {successMsg && (
                        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold animate-in fade-in">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuccessMsg(null)}
                                className="p-1 hover:bg-emerald-100 rounded-lg cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-bold">
                            <AlertTriangle size={18} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Formulario Principal en Tarjeta Ágil */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-visible"
                    >
                        {/* Cabecera de la tarjeta */}
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 rounded-t-3xl flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#0099e5]">
                                    {procesoConfig.plantaNombre}
                                </span>
                                <h2 className="text-base sm:text-lg font-black text-[#324354]">
                                    {editingId
                                        ? `Editando Consumo #${editingId} · ${procesoConfig.nombre}`
                                        : `Nuevo Consumo · ${procesoConfig.nombre}`}
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectProceso(procesoActivo)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                                    >
                                        Cancelar edición
                                    </button>
                                )}
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                />
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-6">
                            {/* FILA 1: Tipo de Material + Toggle Ciclo de 2 Piezas (solo Pintura MS) */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                                        {procesoConfig.labelMaterial}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {procesoConfig.tiposMaterial.map((tipo) => (
                                            <button
                                                key={tipo}
                                                type="button"
                                                onClick={() => setTipoResina(tipo)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                                    tipoResina === tipo
                                                        ? 'bg-[#0099e5] text-white border-[#0099e5] shadow-2xs'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {tipo}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {procesoConfig.soportaCicloDosPiezas && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                                            Modalidad del Ciclo (Pintura MS)
                                        </label>
                                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setEsCicloDosPiezas(false)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                    !esCicloDosPiezas
                                                        ? 'bg-white text-[#324354] shadow-2xs'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                1 Pieza
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEsCicloDosPiezas(true)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                    esCicloDosPiezas
                                                        ? 'bg-[#0099e5] text-white shadow-2xs'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <Layers size={13} />
                                                <span>Ciclo de 2 Piezas (Suma vs SAP)</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FILA 2: Referencias y Pesos (Modo 1 Pieza vs Ciclo de 2 Piezas) */}
                            {!esCicloDosPiezas ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                                            <span>Referencia *</span>
                                            <span className="text-[10px] font-semibold text-[#0099e5] flex items-center gap-0.5 normal-case">
                                                <Sparkles size={11} /> Auto-rellena desde SAP
                                            </span>
                                        </label>
                                        <SelectorReferenciaSap
                                            value={referencia}
                                            proceso={procesoActivo}
                                            planta={procesoConfig.planta}
                                            sugerenciasLocales={listaSugerenciasPlanta}
                                            placeholder={
                                                procesoConfig.planta === 'FV'
                                                    ? 'Ej: HONOLULU, CALIMA, SANTORINI...'
                                                    : 'Ej: SIENA 94X48, GENOVA 63...'
                                            }
                                            onChangeText={(txt) => handleReferenciaChange(txt, 1)}
                                            onSelectPesoSap={({ referencia: refSel, pesoSap: pesoAuto, tipoResina: tipoAuto }) => {
                                                setReferencia(refSel);
                                                if (pesoAuto != null && pesoAuto > 0) {
                                                    setPesoSap(String(pesoAuto));
                                                }
                                                if (tipoAuto && (procesoActivo === 'vaciado_fv' || procesoActivo === 'vaciado_ms')) {
                                                    setTipoResina(tipoAuto);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                            Peso SAP ({procesoConfig.unidad}) *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={pesoSap}
                                            onChange={(e) => setPesoSap(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-base font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                                            Peso Real ({procesoConfig.unidad}) *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={pesoReal}
                                            onChange={(e) => setPesoReal(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 rounded-2xl bg-sky-50/50 border-2 border-[#0099e5]/40 text-base font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition"
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* MODO CICLO DE 2 PIEZAS (PINTURA MS) */
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 bg-sky-50/70 border border-sky-200/80 rounded-2xl px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-[#324354]">
                                            <ArrowRightLeft size={15} className="text-[#0099e5]" />
                                            <span>
                                                Ciclo de 2 piezas: se suman los Pesos SAP y se comparan contra el consumo real del ciclo
                                            </span>
                                        </div>
                                        <div className="inline-flex bg-white p-0.5 rounded-lg border border-sky-200 text-[11px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setModoRealCiclo('total')}
                                                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                                                    modoRealCiclo === 'total'
                                                        ? 'bg-[#324354] text-white'
                                                        : 'text-slate-600'
                                                }`}
                                            >
                                                Real total del ciclo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setModoRealCiclo('separado')}
                                                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                                                    modoRealCiclo === 'separado'
                                                        ? 'bg-[#324354] text-white'
                                                        : 'text-slate-600'
                                                }`}
                                            >
                                                Real por pieza (1 + 2)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Tarjeta Pieza 1 */}
                                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                                            <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#324354] text-white">
                                                Pieza 1
                                            </span>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                    Referencia Pieza 1 *
                                                </label>
                                                <SelectorReferenciaSap
                                                    value={referencia}
                                                    proceso={procesoActivo}
                                                    planta={procesoConfig.planta}
                                                    sugerenciasLocales={listaSugerenciasPlanta}
                                                    placeholder="Ej: LVM SIENA 94X48"
                                                    onChangeText={(txt) => handleReferenciaChange(txt, 1)}
                                                    onSelectPesoSap={({ referencia: refSel, pesoSap: pesoAuto }) => {
                                                        setReferencia(refSel);
                                                        if (pesoAuto != null && pesoAuto > 0) {
                                                            setPesoSap(String(pesoAuto));
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className={`grid gap-3 ${modoRealCiclo === 'separado' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                        Peso SAP 1 (kg) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={pesoSap}
                                                        onChange={(e) => setPesoSap(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                                    />
                                                </div>
                                                {modoRealCiclo === 'separado' && (
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                            Peso Real 1 (kg) *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            value={pesoReal}
                                                            onChange={(e) => setPesoReal(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full px-3.5 py-2.5 rounded-xl bg-sky-50/50 border-2 border-[#0099e5]/40 text-sm font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tarjeta Pieza 2 */}
                                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                                            <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0099e5] text-white">
                                                Pieza 2
                                            </span>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                    Referencia Pieza 2 *
                                                </label>
                                                <SelectorReferenciaSap
                                                    value={referencia2}
                                                    proceso={procesoActivo}
                                                    planta={procesoConfig.planta}
                                                    sugerenciasLocales={listaSugerenciasPlanta}
                                                    placeholder="Ej: LVM GENOVA 63"
                                                    onChangeText={(txt) => handleReferenciaChange(txt, 2)}
                                                    onSelectPesoSap={({ referencia: refSel, pesoSap: pesoAuto }) => {
                                                        setReferencia2(refSel);
                                                        if (pesoAuto != null && pesoAuto > 0) {
                                                            setPesoSap2(String(pesoAuto));
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className={`grid gap-3 ${modoRealCiclo === 'separado' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                        Peso SAP 2 (kg) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={pesoSap2}
                                                        onChange={(e) => setPesoSap2(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                                    />
                                                </div>
                                                {modoRealCiclo === 'separado' && (
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                            Peso Real 2 (kg) *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            value={pesoReal2}
                                                            onChange={(e) => setPesoReal2(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full px-3.5 py-2.5 rounded-xl bg-sky-50/50 border-2 border-[#0099e5]/40 text-sm font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input único de Peso Real Total del ciclo */}
                                    {modoRealCiclo === 'total' && (
                                        <div className="max-w-sm">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                                                Peso Real Total del Ciclo (Pieza 1 + Pieza 2 en kg) *
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={pesoReal}
                                                onChange={(e) => setPesoReal(e.target.value)}
                                                placeholder="Ej: 4.85"
                                                className="w-full px-4 py-3 rounded-2xl bg-sky-50/50 border-2 border-[#0099e5]/40 text-base font-black text-[#324354] focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TARJETA DE RESULTADO EN VIVO (COMPARACIÓN VS SAP) */}
                            <div
                                className={`rounded-2xl p-4 border-2 transition-all grid grid-cols-2 sm:grid-cols-4 gap-3 items-center ${
                                    !calculosEnVivo.listo
                                        ? 'bg-slate-50 border-dashed border-slate-200'
                                        : calculosEnVivo.estado === 'ok'
                                        ? 'bg-emerald-50/70 border-[#59a96a]'
                                        : calculosEnVivo.estado === 'alerta'
                                        ? 'bg-amber-50/70 border-[#deb841]'
                                        : 'bg-red-50/70 border-[#d14747]'
                                }`}
                            >
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                        {esCicloDosPiezas ? 'Peso SAP Total (1+2)' : 'Peso SAP'}
                                    </span>
                                    <span className="text-xl font-black text-[#324354]">
                                        {calculosEnVivo.sapTotal > 0 ? `${calculosEnVivo.sapTotal} kg` : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                        {esCicloDosPiezas ? 'Peso Real Total' : 'Peso Real'}
                                    </span>
                                    <span className="text-xl font-black text-[#324354]">
                                        {calculosEnVivo.realTotal !== null ? `${calculosEnVivo.realTotal} kg` : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                        Diferencia (Real - SAP)
                                    </span>
                                    <span
                                        className={`text-xl font-black ${
                                            !calculosEnVivo.listo
                                                ? 'text-slate-400'
                                                : calculosEnVivo.estado === 'ok'
                                                ? 'text-[#59a96a]'
                                                : calculosEnVivo.estado === 'alerta'
                                                ? 'text-amber-600'
                                                : 'text-[#d14747]'
                                        }`}
                                    >
                                        {calculosEnVivo.diferencia !== null
                                            ? `${calculosEnVivo.diferencia > 0 ? '+' : ''}${calculosEnVivo.diferencia} kg`
                                            : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                        Desviación %
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xl font-black ${
                                                !calculosEnVivo.listo
                                                    ? 'text-slate-400'
                                                    : calculosEnVivo.estado === 'ok'
                                                    ? 'text-[#59a96a]'
                                                    : calculosEnVivo.estado === 'alerta'
                                                    ? 'text-amber-600'
                                                    : 'text-[#d14747]'
                                            }`}
                                        >
                                            {calculosEnVivo.porcentaje !== null
                                                ? `${calculosEnVivo.porcentaje > 0 ? '+' : ''}${calculosEnVivo.porcentaje}%`
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* FILA 3: Galgas (si aplica) + Operario + Observaciones */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {procesoConfig.usaGalgas && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                Galga Pared (mils)
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={galgaPared}
                                                onChange={(e) => setGalgaPared(e.target.value)}
                                                placeholder="Ej: 28 / 120"
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-slate-600 uppercase">
                                                Galga Piso (mils)
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={galgaPiso}
                                                onChange={(e) => setGalgaPiso(e.target.value)}
                                                placeholder="Ej: 30 / 120"
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                                        Operario (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={operario}
                                        onChange={(e) => setOperario(e.target.value)}
                                        placeholder="Nombre del operario"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white"
                                    />
                                </div>
                                <div className={`space-y-1 ${procesoConfig.usaGalgas ? '' : 'lg:col-span-3'}`}>
                                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                                        Observaciones (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Novedad o nota breve..."
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white"
                                    />
                                </div>
                            </div>

                            {/* BOTÓN DE GUARDAR */}
                            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            <span>{editingId ? 'Actualizar Consumo' : 'Guardar Consumo'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISTA 2: HISTORIAL Y RESUMEN                                              */}
            {/* ========================================================================= */}
            {vista === 'historial' && (
                <div className="space-y-4">
                    {/* KPIs de Resumen */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
                            <span className="text-[11px] font-bold uppercase text-slate-500">Registros</span>
                            <p className="text-2xl sm:text-3xl font-black text-[#324354] mt-1">{kpisHistorial.total}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
                            <span className="text-[11px] font-bold uppercase text-slate-500">Total Real vs SAP</span>
                            <p className="text-lg sm:text-xl font-black text-[#324354] mt-1">
                                {kpisHistorial.realSum} <span className="text-xs font-semibold text-slate-400">/ {kpisHistorial.sapSum} kg</span>
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
                            <span className="text-[11px] font-bold uppercase text-slate-500">Diferencia Acumulada</span>
                            <p
                                className={`text-2xl sm:text-3xl font-black mt-1 ${
                                    kpisHistorial.diffSum > 0
                                        ? 'text-[#d14747]'
                                        : kpisHistorial.diffSum < 0
                                        ? 'text-[#0099e5]'
                                        : 'text-[#59a96a]'
                                }`}
                            >
                                {kpisHistorial.diffSum > 0 ? '+' : ''}
                                {kpisHistorial.diffSum} kg
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
                            <span className="text-[11px] font-bold uppercase text-slate-500">En Tolerancia (±5%)</span>
                            <p className="text-2xl sm:text-3xl font-black text-[#59a96a] mt-1">
                                {kpisHistorial.pctOk}%
                            </p>
                        </div>
                    </div>

                    {/* Barra de Filtros */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFiltroProcesoHist('todos')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                        filtroProcesoHist === 'todos'
                                            ? 'bg-[#324354] text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    Todos ({registros.length})
                                </button>
                                {PROCESOS_CONSUMO.map((p) => (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setFiltroProcesoHist(p.key)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                            filtroProcesoHist === p.key
                                                ? 'bg-[#324354] text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        {p.nombre} ({conteoPorProceso[p.key] || 0})
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-end gap-2">
                                <FiltroPbi
                                    titulo="Año"
                                    seleccion={anios.map(String)}
                                    opciones={aniosDisp.map((a) => ({ value: String(a), label: String(a) }))}
                                    onChange={(v) => { setAnios(v.map(Number)); setSemanas([]); setDiasSel([]); }}
                                    onBorrar={() => { setAnios([]); setSemanas([]); setDiasSel([]); }}
                                    puedeBorrar={anios.length > 0}
                                />
                                <FiltroPbi
                                    titulo="Mes"
                                    seleccion={meses.map(String)}
                                    opciones={opcionesMes}
                                    onChange={(v) => { setMeses(v.map(Number)); setSemanas([]); setDiasSel([]); }}
                                    onBorrar={() => { setMeses([]); setSemanas([]); setDiasSel([]); }}
                                    puedeBorrar={meses.length > 0}
                                />
                                <FiltroPbi
                                    titulo="Semana"
                                    seleccion={semanas}
                                    opciones={opcionesSemana}
                                    onChange={(v) => { setSemanas(v); setDiasSel([]); }}
                                    onBorrar={() => { setSemanas([]); setDiasSel([]); }}
                                    puedeBorrar={semanas.length > 0}
                                />
                                <FiltroPbi
                                    titulo="Día"
                                    seleccion={diasSel}
                                    opciones={opcionesDia}
                                    onChange={setDiasSel}
                                    onBorrar={() => setDiasSel([])}
                                    puedeBorrar={diasSel.length > 0}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 max-w-md">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchHist}
                                    onChange={(e) => setSearchHist(e.target.value)}
                                    placeholder="Buscar por referencia, resina u operario..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0099e5]"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={fetchAll}
                                disabled={loadingList}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Actualizar"
                            >
                                <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Lista en tarjetas limpias (no tabla densa) */}
                    {loadingList ? (
                        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 font-semibold border border-slate-200">
                            Cargando registros de consumos...
                        </div>
                    ) : registrosFiltrados.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center space-y-3 border border-slate-200">
                            <p className="text-slate-500 font-semibold">No hay consumos registrados con estos filtros.</p>
                            <button
                                type="button"
                                onClick={() => setVista('registrar')}
                                className="px-4 py-2 rounded-xl bg-[#0099e5] text-white font-bold text-xs cursor-pointer"
                            >
                                + Registrar primer consumo
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {registrosFiltrados.map((reg) => {
                                const estado = getEstadoVariacion(reg.porcentaje_variacion);
                                return (
                                    <div
                                        key={reg.id}
                                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#324354] text-white">
                                                        {nombreProceso(reg.proceso)}
                                                    </span>
                                                    {reg.tipo_resina && (
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                                            {reg.tipo_resina}
                                                        </span>
                                                    )}
                                                    {reg.es_ciclo_dos_piezas && (
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-sky-50 text-[#0099e5] border border-sky-200">
                                                            Ciclo 2 Piezas
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 mt-1.5">
                                                    {reg.referencia}
                                                    {reg.referencia_2 ? ` + ${reg.referencia_2}` : ''}
                                                </h3>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    {fechaCorta(reg.fecha)}
                                                    {reg.operario ? ` · ${reg.operario}` : ''}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditarRegistro(reg)}
                                                    title="Editar"
                                                    className="p-1.5 rounded-lg bg-sky-50 text-[#0099e5] hover:bg-[#0099e5] hover:text-white transition cursor-pointer"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEliminarRegistro(reg.id)}
                                                    title="Eliminar"
                                                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Métricas SAP vs Real */}
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">SAP</span>
                                                <span className="text-sm font-black text-[#324354]">
                                                    {reg.peso_sap_total} kg
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Real</span>
                                                <span className="text-sm font-black text-[#324354]">
                                                    {reg.peso_real} kg
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dif.</span>
                                                <span
                                                    className={`text-sm font-black ${
                                                        estado === 'ok'
                                                            ? 'text-[#59a96a]'
                                                            : estado === 'alerta'
                                                            ? 'text-amber-600'
                                                            : 'text-[#d14747]'
                                                    }`}
                                                >
                                                    {reg.diferencia > 0 ? '+' : ''}
                                                    {reg.diferencia} kg
                                                </span>
                                            </div>
                                        </div>

                                        {(reg.galga_pared != null || reg.galga_piso != null || reg.observaciones) && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                                {(reg.galga_pared != null || reg.galga_piso != null) && (
                                                    <span className="font-semibold">
                                                        Galga Pared: <strong>{reg.galga_pared ?? '—'}</strong> · Piso:{' '}
                                                        <strong>{reg.galga_piso ?? '—'}</strong>
                                                    </span>
                                                )}
                                                {reg.observaciones && (
                                                    <span className="italic truncate max-w-full">
                                                        &ldquo;{reg.observaciones}&rdquo;
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
