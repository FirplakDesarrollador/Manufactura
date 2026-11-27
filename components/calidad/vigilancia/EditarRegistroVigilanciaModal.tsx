'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CATALOGO_ITEMS_VIGILANCIA } from '@/lib/calidad/vigilanciaIndicadores';
import { X, Save, Loader2, AlertTriangle, Pencil } from 'lucide-react';

interface EditarRegistroVigilanciaModalProps {
    tabla: string;
    titulo: string;
    registro: Record<string, any>;
    onClose: () => void;
    onSaved: (registroActualizado: Record<string, any>) => void;
}

const ETIQUETAS_CAMPOS: Record<string, string> = {
    cabina: 'Cabina',
    pintor: 'Pintor',
    Pintor: 'Pintor',
    operador: 'Operador / Operario',
    operario: 'Operario',
    auditadoPor: 'Auditado Por',
    referencia: 'Referencia',
    largo_abanico: 'Largo Abanico',
    ancho_abanico: 'Ancho Abanico',
    Abanico: 'Abanico',
    presion: 'Presión Dinámica',
    Presion: 'Presión Dinámica',
    presion_estatica: 'Presión Estática',
    Presion_Estatica: 'Presión Estática',
    presion_resina: 'Presión Resina',
    presion_chopper: 'Presión Chopper',
    porc_catalizador: '% Catalizador',
    Porc_Catalizador: '% Catalizador',
    nombre_catalizador: 'Nombre Catalizador',
    catalizador_masilla: 'Catalizador Masilla',
    temp_horno: 'Temp. Horno',
    temp_ambiente: 'Temp. Ambiente',
    Temp_Ambiente: 'Temp. Ambiente',
    t_ambiente: 'Temp. Ambiente',
    galga_superior: 'Galga Superior',
    Galga_superior: 'Galga Superior',
    galga_paredes: 'Galga Paredes',
    galga_piso: 'Galga Piso',
    galga_inferior: 'Galga Inferior',
    galga_pestanas: 'Galga Pestañas',
    galga_pestana: 'Galga Pestaña',
    tiempo_gel: 'Tiempo Gel',
    tiempo_esperar: 'Tiempo de Espera',
    lote: 'Lote',
    Lote: 'Lote',
    color: 'Color',
    Color: 'Color',
    carga: 'Carga',
    calentadores: 'Calentadores',
    fecha_caneca: 'Fecha Caneca',
    fecha_lote: 'Fecha Lote',
    fecha_cambio_caneca: 'Fecha Cambio Caneca',
    referencia_resina: 'Referencia Resina',
    tipo_resina: 'Tipo Resina',
    resina_inicial: 'Resina Inicial',
    resina_final: 'Resina Final',
    r_inicial_r_final: 'Total Resina (Ini - Fin)',
    peso_pieza: 'Peso Pieza',
    porc_resina: '% Resina',
    kilos_minuto: 'Kilos / Minuto',
    peso_resina: 'Peso Resina',
    peso_fibra: 'Peso Fibra',
    resina_mas_fibra: 'Resina + Fibra',
    resina_peso_total: 'Resina Peso Total',
    fibra_peso_total: 'Fibra Peso Total',
    cantidad_masilla: 'Cantidad Masilla',
    velocidad_maquina: 'Velocidad Máquina',
    cant_tableros: 'Cantidad Tableros',
    cantidad_tableros: 'Cantidad Tableros (Aux)',
    verificar_puesta_punto: 'Verificar Puesta a Punto',
    espesor: 'Espesor',
    velocidad: 'Velocidad',
    pieza: 'Pieza',
    cantidad_cantos: 'Cantidad Cantos',
    observaciones: 'Observaciones',
    observacionesAlistamiento: 'Observaciones Alistamiento',
    observacionesEncerado: 'Observaciones Encerado y CM',
    observacionesDesprensado: 'Observaciones Desprensado A/B',
    observacionesDesmolde: 'Observaciones Desmolde',
    resina_ADM: 'Resina ADM',
    despiqueFisuras: 'Sin Despiques ni Fisuras'
};

const CAMPOS_NUMERICOS = new Set([
    'largo_abanico',
    'ancho_abanico',
    'Abanico',
    'presion',
    'Presion',
    'presion_estatica',
    'Presion_Estatica',
    'presion_resina',
    'presion_chopper',
    'porc_catalizador',
    'Porc_Catalizador',
    'temp_horno',
    'temp_ambiente',
    'Temp_Ambiente',
    't_ambiente',
    'galga_superior',
    'Galga_superior',
    'galga_paredes',
    'galga_piso',
    'galga_inferior',
    'galga_pestanas',
    'galga_pestana',
    'tiempo_esperar',
    'carga',
    'resina_inicial',
    'resina_final',
    'r_inicial_r_final',
    'peso_pieza',
    'porc_resina',
    'kilos_minuto',
    'peso_resina',
    'peso_fibra',
    'resina_mas_fibra',
    'resina_peso_total',
    'fibra_peso_total',
    'cantidad_masilla',
    'velocidad_maquina',
    'cant_tableros',
    'cantidad_tableros',
    'espesor',
    'velocidad',
    'cantidad_cantos'
]);

const CAMPOS_SOLO_LECTURA = new Set(['id', 'created_at']);

function formatearEtiquetaFallback(col: string): string {
    return col
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function EditarRegistroVigilanciaModal({
    tabla,
    titulo,
    registro,
    onClose,
    onSaved
}: EditarRegistroVigilanciaModalProps) {
    const [formValues, setFormValues] = useState<Record<string, any>>(() => ({ ...registro }));
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        setFormValues({ ...registro });
        setErrorMsg(null);
    }, [registro]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    // Catálogo de ítems booleanos conocidos para esta tabla
    const itemsCatalogoMap = useMemo(() => {
        const proc = CATALOGO_ITEMS_VIGILANCIA.find((p) => p.tabla === tabla);
        const map = new Map<string, { nombre: string; descripcion?: string }>();
        if (proc) {
            proc.items.forEach((it) => map.set(it.columna, { nombre: it.nombre, descripcion: it.descripcion }));
        }
        return map;
    }, [tabla]);

    // Clasificar las columnas del registro en: parámetros (texto/número), booleanos y observaciones
    const { camposParametros, camposBooleanos, camposObservaciones } = useMemo(() => {
        const params: string[] = [];
        const bools: string[] = [];
        const obs: string[] = [];

        const keys = Object.keys(registro).filter((k) => !CAMPOS_SOLO_LECTURA.has(k));

        for (const k of keys) {
            const val = registro[k];
            const lower = k.toLowerCase();
            if (lower.includes('observacion')) {
                obs.push(k);
            } else if (typeof val === 'boolean' || itemsCatalogoMap.has(k)) {
                bools.push(k);
            } else {
                params.push(k);
            }
        }

        return { camposParametros: params, camposBooleanos: bools, camposObservaciones: obs };
    }, [registro, itemsCatalogoMap]);

    const getLabel = (col: string) => {
        const fromCat = itemsCatalogoMap.get(col);
        if (fromCat) return fromCat.nombre;
        if (ETIQUETAS_CAMPOS[col]) return ETIQUETAS_CAMPOS[col];
        return formatearEtiquetaFallback(col);
    };

    const isNumericField = (col: string) => {
        return typeof registro[col] === 'number' || CAMPOS_NUMERICOS.has(col);
    };

    const handleChange = (col: string, value: any) => {
        setFormValues((prev) => ({ ...prev, [col]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);

        try {
            const payload: Record<string, any> = {};

            for (const col of [...camposParametros, ...camposBooleanos, ...camposObservaciones]) {
                const rawVal = formValues[col];

                if (camposBooleanos.includes(col)) {
                    payload[col] = Boolean(rawVal);
                } else if (isNumericField(col)) {
                    if (rawVal === '' || rawVal === null || rawVal === undefined) {
                        payload[col] = null;
                    } else {
                        const parsed = Number(String(rawVal).replace(',', '.').trim());
                        if (isNaN(parsed)) {
                            setErrorMsg(`El campo "${getLabel(col)}" debe ser un número válido.`);
                            setSaving(false);
                            return;
                        }
                        payload[col] = parsed;
                    }
                } else {
                    const str = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();
                    payload[col] = str === '' ? null : str;
                }
            }

            const { data, error } = await supabase
                .from(tabla)
                .update(payload)
                .eq('id', registro.id)
                .select()
                .single();

            if (error) {
                console.error(`Error actualizando ${tabla}:`, error);
                setErrorMsg(`No se pudo guardar el cambio: ${error.message}`);
                setSaving(false);
                return;
            }

            onSaved(data || { ...registro, ...payload });
        } catch (err: any) {
            console.error('Error inesperado guardando edición:', err);
            setErrorMsg(`Error inesperado: ${err?.message || err}`);
            setSaving(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !saving) onClose();
            }}
        >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-[#324354] text-white px-5 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-white/10 shrink-0">
                            <Pencil size={18} className="text-[#38bdf8]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold truncate">
                                Editar {titulo} #{registro.id}
                            </h3>
                            {registro.created_at && (
                                <p className="text-[11px] text-slate-300">
                                    Registrado el {formatDate(registro.created_at)}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer disabled:opacity-50"
                        title="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Sección 1: Parámetros Numéricos y de Texto */}
                    {camposParametros.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#0099e5] border-b border-slate-100 pb-1.5">
                                Parámetros y Datos del Registro
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {camposParametros.map((col) => {
                                    const numeric = isNumericField(col);
                                    const val = formValues[col] ?? '';
                                    return (
                                        <div key={col} className="space-y-1">
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                                {getLabel(col)}
                                            </label>
                                            <input
                                                type={numeric ? 'number' : 'text'}
                                                step={numeric ? 'any' : undefined}
                                                value={val}
                                                onChange={(e) => handleChange(col, e.target.value)}
                                                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sección 2: Ítems de Verificación (Switches) */}
                    {camposBooleanos.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#0099e5] border-b border-slate-100 pb-1.5">
                                Ítems de Verificación (Cumple / No Cumple)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {camposBooleanos.map((col) => {
                                    const checked = Boolean(formValues[col]);
                                    const desc = itemsCatalogoMap.get(col)?.descripcion;
                                    return (
                                        <div
                                            key={col}
                                            onClick={() => handleChange(col, !checked)}
                                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                checked
                                                    ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                                                    : 'bg-red-50/50 border-red-200 hover:bg-red-50'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <span className="block text-xs font-bold text-slate-800">
                                                    {getLabel(col)}
                                                </span>
                                                {desc && (
                                                    <span className="block text-[10px] text-slate-500 truncate">
                                                        {desc}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`text-[10px] font-black uppercase ${
                                                        checked ? 'text-emerald-700' : 'text-red-600'
                                                    }`}
                                                >
                                                    {checked ? 'Sí' : 'No'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleChange(col, !checked);
                                                    }}
                                                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                                        checked ? 'bg-[#59a96a]' : 'bg-slate-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                                            checked ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sección 3: Observaciones */}
                    {camposObservaciones.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#0099e5] border-b border-slate-100 pb-1.5">
                                Observaciones
                            </h4>
                            <div className="space-y-3">
                                {camposObservaciones.map((col) => (
                                    <div key={col} className="space-y-1">
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                            {getLabel(col)}
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formValues[col] ?? ''}
                                            onChange={(e) => handleChange(col, e.target.value)}
                                            placeholder="Sin observaciones..."
                                            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0099e5] focus:bg-white transition resize-y"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0099e5] hover:bg-[#0088cc] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
