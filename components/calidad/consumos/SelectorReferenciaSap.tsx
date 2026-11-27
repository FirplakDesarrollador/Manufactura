'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProcesoConsumoKey, ReferenciaSapSugerencia } from '@/lib/calidad/consumos';
import { Search, Loader2, Sparkles, Database, ChevronDown, X } from 'lucide-react';

interface SapSearchItem {
    sku: string;
    descripcion: string;
}

interface SelectorReferenciaSapProps {
    value: string;
    proceso: ProcesoConsumoKey;
    planta: 'MS' | 'FV';
    sugerenciasLocales: ReferenciaSapSugerencia[];
    placeholder?: string;
    onChangeText: (text: string) => void;
    onSelectPesoSap: (info: {
        referencia: string;
        pesoSap: number | null;
        tipoResina?: string | null;
        fuente: 'sap_cache' | 'sap_vivo' | 'historial';
    }) => void;
}

export default function SelectorReferenciaSap({
    value,
    proceso,
    planta,
    sugerenciasLocales,
    placeholder,
    onChangeText,
    onSelectPesoSap
}: SelectorReferenciaSapProps) {
    const [open, setOpen] = useState(false);
    const [loadingSapSearch, setLoadingSapSearch] = useState(false);
    const [loadingPesoSap, setLoadingPesoSap] = useState(false);
    const [sapResults, setSapResults] = useState<SapSearchItem[]>([]);
    const [sapStatusMsg, setSapStatusMsg] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar desplegable al hacer clic fuera
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // Filtrar sugerencias locales (productos_fv_pesos + historial)
    const localesFiltradas = useMemo(() => {
        const q = value.trim().toLowerCase();
        if (!q) return sugerenciasLocales.slice(0, 30);
        return sugerenciasLocales
            .filter(
                (s) =>
                    s.referencia.toLowerCase().includes(q) ||
                    (s.sku && s.sku.toLowerCase().includes(q))
            )
            .slice(0, 25);
    }, [sugerenciasLocales, value]);

    // Búsqueda en vivo en SAP cuando el usuario escribe >= 2 caracteres y el menú está abierto
    useEffect(() => {
        const q = value.trim();
        if (!open || q.length < 2) {
            setSapResults([]);
            setLoadingSapSearch(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoadingSapSearch(true);
            try {
                const res = await fetch(
                    `/api/sap/pesos-consumo?accion=buscar&q=${encodeURIComponent(q)}&planta=${planta}`,
                    { signal: controller.signal }
                );
                if (res.ok) {
                    const data = await res.json();
                    setSapResults(Array.isArray(data.items) ? data.items : []);
                } else {
                    setSapResults([]);
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    setSapResults([]);
                }
            } finally {
                setLoadingSapSearch(false);
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [value, open, planta]);

    const getPesoLocalPorProceso = (s: ReferenciaSapSugerencia): number | null => {
        if (proceso === 'pintura_fv' || proceso === 'pintura_ms') {
            return s.pesoSapGelcoat ?? null;
        }
        if (proceso === 'vaciado_fv' || proceso === 'vaciado_ms') {
            return s.pesoSapResina ?? null;
        }
        if (proceso === 'masilla_fv') {
            return s.pesoSapMasilla ?? null;
        }
        return null;
    };

    const consultarPesoSapPorSku = async (sku: string, nombreDisplay: string, fallbackTipo?: string | null) => {
        setLoadingPesoSap(true);
        setSapStatusMsg(null);
        try {
            const res = await fetch(
                `/api/sap/pesos-consumo?accion=peso&sku=${encodeURIComponent(sku)}&proceso=${encodeURIComponent(proceso)}`
            );
            if (res.ok) {
                const data = await res.json();
                if (data.pesoSugerido != null && Number(data.pesoSugerido) > 0) {
                    onSelectPesoSap({
                        referencia: nombreDisplay,
                        pesoSap: Number(data.pesoSugerido),
                        tipoResina: data.tipoResina || fallbackTipo || null,
                        fuente: 'sap_vivo'
                    });
                    setSapStatusMsg(`Peso SAP cargado (${data.pesoSugerido} kg)`);
                } else {
                    onSelectPesoSap({
                        referencia: nombreDisplay,
                        pesoSap: null,
                        tipoResina: data.tipoResina || fallbackTipo || null,
                        fuente: 'sap_vivo'
                    });
                    setSapStatusMsg('Artículo sin peso de este material en LDM SAP (ingrésalo manual)');
                }
            } else {
                setSapStatusMsg('No se pudo consultar LDM en SAP');
            }
        } catch {
            setSapStatusMsg('Sin conexión con SAP');
        } finally {
            setLoadingPesoSap(false);
        }
    };

    const handlePickLocal = async (s: ReferenciaSapSugerencia) => {
        setOpen(false);
        onChangeText(s.referencia);
        const pesoLocal = getPesoLocalPorProceso(s);

        if (pesoLocal != null && pesoLocal > 0) {
            onSelectPesoSap({
                referencia: s.referencia,
                pesoSap: pesoLocal,
                tipoResina: s.tipoResina || null,
                fuente: s.origen === 'sap' ? 'sap_cache' : 'historial'
            });
            setSapStatusMsg(
                s.origen === 'sap'
                    ? `Peso SAP cargado automáticamente (${pesoLocal} kg)`
                    : `Peso cargado del historial (${pesoLocal} kg)`
            );
            return;
        }

        // Si tenemos SKU (ej. Masilla FV), consultamos la LDM en vivo en SAP
        if (s.sku) {
            await consultarPesoSapPorSku(s.sku, s.referencia, s.tipoResina);
        } else {
            onSelectPesoSap({
                referencia: s.referencia,
                pesoSap: null,
                tipoResina: s.tipoResina || null,
                fuente: 'historial'
            });
        }
    };

    const handlePickSapLive = async (item: SapSearchItem) => {
        setOpen(false);
        const nombre = item.descripcion || item.sku;
        onChangeText(nombre);
        await consultarPesoSapPorSku(item.sku, nombre);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                    type="text"
                    value={value}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        onChangeText(e.target.value);
                        setSapStatusMsg(null);
                        if (!open) setOpen(true);
                    }}
                    placeholder={placeholder || 'Buscar pieza o SKU en SAP...'}
                    className="w-full pl-9 pr-14 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {loadingPesoSap && <Loader2 size={15} className="animate-spin text-[#0099e5]" />}
                    {value && !loadingPesoSap && (
                        <button
                            type="button"
                            onClick={() => {
                                onChangeText('');
                                setSapStatusMsg(null);
                                setOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                            title="Limpiar"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                        title="Desplegar piezas"
                    >
                        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Estado de consulta SAP */}
            {loadingPesoSap && (
                <p className="text-[11px] font-semibold text-[#0099e5] mt-1 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Consultando peso en SAP...
                </p>
            )}
            {!loadingPesoSap && sapStatusMsg && (
                <p className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                    <Sparkles size={11} className="text-emerald-600 shrink-0" /> {sapStatusMsg}
                </p>
            )}

            {/* Menú desplegable estrictamente por SKU oficial de SAP */}
            {open && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {/* Sección 1: Catálogo SKU SAP precalculado (FV) */}
                    {localesFiltradas.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between sticky top-0">
                                <span>Catálogo SKU SAP ({planta})</span>
                                <span className="text-[#0099e5]">Auto-rellena SAP</span>
                            </div>
                            {localesFiltradas.map((s) => {
                                const peso = getPesoLocalPorProceso(s);
                                return (
                                    <button
                                        key={`${s.sku || s.referencia}`}
                                        type="button"
                                        onClick={() => handlePickLocal(s)}
                                        className="w-full px-3.5 py-2 text-left hover:bg-sky-50 flex items-center justify-between gap-2 transition cursor-pointer"
                                    >
                                        <div className="min-w-0">
                                            <span className="block text-xs font-bold text-slate-800 truncate">
                                                {s.referencia}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {s.sku}
                                                {s.tipoResina ? ` · ${s.tipoResina}` : ''}
                                            </span>
                                        </div>
                                        {peso != null && peso > 0 ? (
                                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                                                {peso} kg
                                            </span>
                                        ) : s.sku ? (
                                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-sky-50 text-[#0099e5] text-[10px] font-bold">
                                                Consultar SAP
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Sección 2: Búsqueda directa de SKUs fabricados en SAP */}
                    {value.trim().length >= 2 && (
                        <div>
                            <div className="px-3 py-1.5 bg-sky-50/70 text-[10px] font-black uppercase tracking-wider text-[#0099e5] flex items-center justify-between sticky top-0">
                                <span className="flex items-center gap-1">
                                    <Database size={11} /> SKUs fabricados en SAP ({planta})
                                </span>
                                {loadingSapSearch && <Loader2 size={11} className="animate-spin" />}
                            </div>
                            {loadingSapSearch && sapResults.length === 0 ? (
                                <p className="px-3.5 py-3 text-xs text-slate-400">Buscando SKUs fabricados en SAP...</p>
                            ) : sapResults.length === 0 ? (
                                <p className="px-3.5 py-2.5 text-[11px] text-slate-400 italic">
                                    Sin SKUs fabricados en SAP para &ldquo;{value.trim()}&rdquo;
                                </p>
                            ) : (
                                sapResults.map((item) => (
                                    <button
                                        key={item.sku}
                                        type="button"
                                        onClick={() => handlePickSapLive(item)}
                                        className="w-full px-3.5 py-2 text-left hover:bg-sky-50 flex items-center justify-between gap-2 transition cursor-pointer"
                                    >
                                        <div className="min-w-0">
                                            <span className="block text-xs font-bold text-slate-800 truncate">
                                                {item.descripcion}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500">{item.sku}</span>
                                        </div>
                                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#324354] text-white text-[10px] font-bold">
                                            Traer SAP
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {localesFiltradas.length === 0 && value.trim().length < 2 && (
                        <p className="px-3.5 py-3 text-xs text-slate-400">
                            Escribe el SKU o nombre de la pieza (mín. 2 letras) para buscar en SAP...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
