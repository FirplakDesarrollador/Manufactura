'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlantaVigilanciaConfig, ProcesoVigilanciaInfo } from './types';
import FormPinturaMs from './FormPinturaMs';
import HistorialPinturaMs from './HistorialPinturaMs';
import FormVaciadoMs from './FormVaciadoMs';
import HistorialVaciadoMs from './HistorialVaciadoMs';
import FormInspeccionMs from './FormInspeccionMs';
import HistorialInspeccionMs from './HistorialInspeccionMs';
import FormOtrosMs from './FormOtrosMs';
import HistorialOtrosMs from './HistorialOtrosMs';
import FormPinturaFv from './FormPinturaFv';
import HistorialPinturaFv from './HistorialPinturaFv';
import FormVaciadoFv from './FormVaciadoFv';
import HistorialVaciadoFv from './HistorialVaciadoFv';
import FormInspeccionFv from './FormInspeccionFv';
import HistorialInspeccionFv from './HistorialInspeccionFv';
import FormCorteMbl from './FormCorteMbl';
import HistorialCorteMbl from './HistorialCorteMbl';
import FormEnchapeMbl from './FormEnchapeMbl';
import HistorialEnchapeMbl from './HistorialEnchapeMbl';
import FormTaladrosMbl from './FormTaladrosMbl';
import HistorialTaladrosMbl from './HistorialTaladrosMbl';
import FormInspeccionMbl from './FormInspeccionMbl';
import HistorialInspeccionMbl from './HistorialInspeccionMbl';
import FormOtrosMbl from './FormOtrosMbl';
import HistorialOtrosMbl from './HistorialOtrosMbl';
import {
    MarmolSinteticoIcon,
    FibraDeVidrioIcon,
    MueblesIcon,
    CefiIcon,
    RtmIcon,
    MoldesIcon,
    PaintRollerIcon,
    SprayGunIcon,
    ClipboardSearchIcon
} from './VigilanciaIcons';
import { 
    ArrowLeft, 
    Layers, 
    Database, 
    Clock, 
    CheckCircle2, 
    ShieldCheck,
    ChevronRight,
    ListFilter,
    Plus,
    LayoutGrid
} from 'lucide-react';

interface VigilanciaPlantaViewProps {
    planta: PlantaVigilanciaConfig;
    onBack: () => void;
}

const PROCESOS_CON_FORMULARIO = new Set([
    'pintura_ms', 'vaciado_ms', 'inspeccion_ms', 'otros_ms',
    'pintura_fv', 'vaciado_fv', 'inspeccion_fv',
    'corte_mbl', 'enchape_mbl', 'taladros', 'inspeccion_mbl', 'otros_mbl'
]);

export default function VigilanciaPlantaView({ planta, onBack }: VigilanciaPlantaViewProps) {
    const [selectedProceso, setSelectedProceso] = useState<ProcesoVigilanciaInfo>(planta.procesos[0]);
    const [recordsCount, setRecordsCount] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(true);

    // Modo activo dentro del proceso (registro o historial)
    const [activeTabMode, setActiveTabMode] = useState<'registro' | 'historial'>('registro');
    const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

    // Actualizar estado al cambiar de planta
    useEffect(() => {
        setSelectedProceso(planta.procesos[0]);
    }, [planta.key]);

    // Cargar conteos de registros existentes en cada tabla pv_
    const fetchCounts = async () => {
        setLoadingCounts(true);
        const counts: Record<string, number> = {};

        await Promise.all(
            planta.procesos.map(async (proc) => {
                try {
                    const { count, error } = await supabase
                        .from(proc.tabla)
                        .select('*', { count: 'exact', head: true });
                    if (!error && count !== null) {
                        counts[proc.id] = count;
                    } else {
                        counts[proc.id] = 0;
                    }
                } catch {
                    counts[proc.id] = 0;
                }
            })
        );

        setRecordsCount(counts);
        setLoadingCounts(false);
    };

    useEffect(() => {
        fetchCounts();
    }, [planta]);

    const handleProcesoChange = (proc: ProcesoVigilanciaInfo) => {
        setSelectedProceso(proc);
        setActiveTabMode('registro');
        setSaveSuccessMsg(null);
    };

    const handleFormSuccess = (nombreProceso: string) => {
        fetchCounts();
        setActiveTabMode('historial');
        setSaveSuccessMsg(`¡Chequeo de ${nombreProceso} guardado exitosamente en la base de datos!`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);
    };

    const renderPlantMiniIcon = () => {
        const props = { size: 36, className: "shrink-0" };
        switch (planta.key) {
            case 'ms': return <MarmolSinteticoIcon {...props} />;
            case 'fv': return <FibraDeVidrioIcon {...props} />;
            case 'muebles': return <MueblesIcon {...props} />;
            case 'cefi': return <CefiIcon {...props} />;
            case 'rtm': return <RtmIcon {...props} />;
            case 'moldes': return <MoldesIcon {...props} />;
            default: return null;
        }
    };

    const tieneFormulario = PROCESOS_CON_FORMULARIO.has(selectedProceso.id);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
            {/* Barra superior de Navegación y Encabezado de la Planta */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#324354] hover:text-white text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al Menú Principal</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        {renderPlantMiniIcon()}
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-[#324354]">
                                    {planta.nombre}
                                </h1>
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-[#0099e5]/10 text-[#0099e5] uppercase">
                                    {planta.codigoOficial}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {planta.subtitulo || planta.descripcion}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Layers size={14} className="text-[#0099e5]" />
                    <span>{planta.procesos.length} Procesos configurados</span>
                </div>
            </div>

            {/* Selector de Procesos (Pestañas / Grid de procesos de la planta) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {planta.procesos.map((proc) => {
                    const isSelected = selectedProceso.id === proc.id;
                    const count = recordsCount[proc.id] ?? 0;
                    return (
                        <button
                            key={proc.id}
                            onClick={() => handleProcesoChange(proc)}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[90px] ${
                                isSelected
                                    ? 'bg-[#324354] border-[#324354] text-white shadow-md'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-[#0099e5]/50 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-1 w-full">
                                <span className="text-xs sm:text-sm font-bold tracking-tight">
                                    {proc.nombre}
                                </span>
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {loadingCounts ? '...' : count}
                                </span>
                            </div>
                            <span className={`text-[10px] font-mono mt-2 truncate w-full ${
                                isSelected ? 'text-slate-300' : 'text-slate-400'
                            }`}>
                                {proc.tabla}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Mensaje de Éxito al Guardar */}
            {saveSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>{saveSuccessMsg}</span>
                    </div>
                    <button
                        onClick={() => setSaveSuccessMsg(null)}
                        className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Barra de Sub-Navegación del Proceso (Registro vs Historial) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0099e5] uppercase tracking-wider">
                        Proceso
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                    <span className="text-lg font-bold text-[#324354]">
                        {selectedProceso.nombre}
                    </span>
                </div>

                {tieneFormulario && (
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTabMode('registro')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                activeTabMode === 'registro'
                                    ? 'bg-[#0099e5] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Plus size={14} />
                            <span>+ Nuevo Chequeo</span>
                        </button>
                        <button
                            onClick={() => setActiveTabMode('historial')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                activeTabMode === 'historial'
                                    ? 'bg-[#324354] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <ListFilter size={14} />
                            <span>Historial ({recordsCount[selectedProceso.id] ?? 0})</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Contenido según el proceso seleccionado */}
            {selectedProceso.id === 'pintura_ms' ? (
                activeTabMode === 'registro' ? (
                    <FormPinturaMs
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Pintura MS')}
                    />
                ) : (
                    <HistorialPinturaMs
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'vaciado_ms' ? (
                activeTabMode === 'registro' ? (
                    <FormVaciadoMs
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Vaciado MS')}
                    />
                ) : (
                    <HistorialVaciadoMs
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'inspeccion_ms' ? (
                activeTabMode === 'registro' ? (
                    <FormInspeccionMs
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Inspección MS')}
                    />
                ) : (
                    <HistorialInspeccionMs
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'otros_ms' ? (
                activeTabMode === 'registro' ? (
                    <FormOtrosMs
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Otros MS')}
                    />
                ) : (
                    <HistorialOtrosMs
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'pintura_fv' ? (
                activeTabMode === 'registro' ? (
                    <FormPinturaFv
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Pintura FV')}
                    />
                ) : (
                    <HistorialPinturaFv
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'vaciado_fv' ? (
                activeTabMode === 'registro' ? (
                    <FormVaciadoFv
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Vaciado FV')}
                    />
                ) : (
                    <HistorialVaciadoFv
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'inspeccion_fv' ? (
                activeTabMode === 'registro' ? (
                    <FormInspeccionFv
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Inspección FV')}
                    />
                ) : (
                    <HistorialInspeccionFv
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'corte_mbl' ? (
                activeTabMode === 'registro' ? (
                    <FormCorteMbl
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Corte MBL')}
                    />
                ) : (
                    <HistorialCorteMbl
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'enchape_mbl' ? (
                activeTabMode === 'registro' ? (
                    <FormEnchapeMbl
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Enchape MBL')}
                    />
                ) : (
                    <HistorialEnchapeMbl
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'taladros' ? (
                activeTabMode === 'registro' ? (
                    <FormTaladrosMbl
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Taladros MBL')}
                    />
                ) : (
                    <HistorialTaladrosMbl
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'inspeccion_mbl' ? (
                activeTabMode === 'registro' ? (
                    <FormInspeccionMbl
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Inspección MBL')}
                    />
                ) : (
                    <HistorialInspeccionMbl
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : selectedProceso.id === 'otros_mbl' ? (
                activeTabMode === 'registro' ? (
                    <FormOtrosMbl
                        onCancel={() => setActiveTabMode('historial')}
                        onSuccess={() => handleFormSuccess('Otros MBL')}
                    />
                ) : (
                    <HistorialOtrosMbl
                        onNuevoRegistro={() => setActiveTabMode('registro')}
                    />
                )
            ) : (
                /* Procesos de FV (o pendientes de formularios específicos) */
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#0099e5] uppercase tracking-wider">
                                    Proceso Activo
                                </span>
                                <ChevronRight size={14} className="text-slate-400" />
                                <h2 className="text-xl font-bold text-[#324354]">
                                    {selectedProceso.nombre}
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                {selectedProceso.descripcion}
                            </p>
                        </div>

                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tabla Supabase</span>
                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {selectedProceso.tabla}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-sky-50 via-blue-50/50 to-slate-50 rounded-2xl border border-sky-200/80 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="w-16 h-16 rounded-2xl bg-[#0099e5]/10 flex items-center justify-center shrink-0 text-[#0099e5]">
                            <ShieldCheck size={36} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-base sm:text-lg font-bold text-[#324354]">
                                Módulo de Planta {planta.nombre} · Proceso {selectedProceso.nombre} Preparado
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                                La estructura de la planta y la conexión con la base de datos (<code className="font-mono text-[#0099e5] font-bold">{selectedProceso.tabla}</code>) ya están listas. 
                                Envíame el pantallazo de los campos del formulario de {selectedProceso.nombre} para construirlo.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <Database size={18} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Registros</span>
                                <span className="text-lg font-black text-slate-700">
                                    {loadingCounts ? '...' : (recordsCount[selectedProceso.id] ?? 0)}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase block">Conexión a BD</span>
                                <span className="text-xs font-black text-emerald-700">
                                    Activa ({selectedProceso.tabla})
                                </span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                <Clock size={18} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase block">Estado</span>
                                <span className="text-xs font-black text-amber-700">
                                    Esperando Pantallazo
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
