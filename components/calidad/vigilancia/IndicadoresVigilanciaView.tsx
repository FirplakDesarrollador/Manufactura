'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    cargarRegistrosCrudosVigilancia,
    calcularDashboardDesdeRegistros,
    RegistrosPorTabla,
    CATALOGO_ITEMS_VIGILANCIA,
    CumplimientoItemResult,
    CumplimientoProcesoResult,
    clasificarSemaforo,
    EstadoSemaforoVigilancia
} from '@/lib/calidad/vigilanciaIndicadores';
import { PlantaVigilanciaKey } from '@/components/calidad/vigilancia/types';
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Search,
    Layers,
    ArrowLeft,
    BarChart3,
    Award,
    X,
    Filter,
    MousePointerClick
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    ReferenceLine,
    LabelList
} from 'recharts';

interface IndicadoresVigilanciaViewProps {
    plantaInicial?: PlantaVigilanciaKey | null;
    onBack?: () => void;
}

const COLOR_SEMAFORO: Record<EstadoSemaforoVigilancia, string> = {
    excelente: '#59a96a', // Verde FIRPLAK
    alerta: '#deb841',    // Amarillo FIRPLAK
    critico: '#d14747',   // Rojo FIRPLAK
    sin_datos: '#94a3b8'  // Gris pizarra
};

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const fechaCorta = (f: string) => f.split('-').reverse().join('/');

interface ItemEnriquecido extends CumplimientoItemResult {
    itemKey: string;
    procesoId: string;
    procesoNombre: string;
    plantaKey: PlantaVigilanciaKey;
    plantaNombre: string;
    tabla: string;
}

export default function IndicadoresVigilanciaView({
    plantaInicial = null,
    onBack
}: IndicadoresVigilanciaViewProps) {
    const [loading, setLoading] = useState(true);
    const [registrosCrudos, setRegistrosCrudos] = useState<RegistrosPorTabla>({});

    // Filtros de alcance y cruce interactivo
    const [selectedPlanta, setSelectedPlanta] = useState<PlantaVigilanciaKey | 'todas'>(plantaInicial || 'todas');
    const [selectedProcesoId, setSelectedProcesoId] = useState<string>('todos');
    const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
    const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'excelente' | 'alerta' | 'critico'>('todos');
    const [soloNoConformes, setSoloNoConformes] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filtros de calendario estilo Power BI (Año, Mes, Semana, Día)
    const [anios, setAnios] = useState<number[]>([]);
    const [meses, setMeses] = useState<number[]>([]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await cargarRegistrosCrudosVigilancia();
            setRegistrosCrudos(raw);
        } catch (err) {
            console.error('Error cargando indicadores de vigilancia:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (plantaInicial) {
            setSelectedPlanta(plantaInicial);
        }
    }, [plantaInicial]);

    // Fechas disponibles con datos según la planta seleccionada (para opciones en cascada)
    const todasLasFechas = useMemo(() => {
        const set = new Set<string>();
        for (const proc of CATALOGO_ITEMS_VIGILANCIA) {
            if (selectedPlanta !== 'todas' && proc.plantaKey !== selectedPlanta) continue;
            const rows = registrosCrudos[proc.tabla] || [];
            for (const r of rows) {
                if (r.fecha && r.fecha.length >= 10) set.add(r.fecha);
            }
        }
        return Array.from(set).sort();
    }, [registrosCrudos, selectedPlanta]);

    const aniosDisponibles = useMemo(() => {
        const set = new Set<number>();
        todasLasFechas.forEach((f) => set.add(Number(f.slice(0, 4))));
        return Array.from(set).sort((a, b) => b - a);
    }, [todasLasFechas]);

    const pasaAnioMes = useCallback(
        (f: string) => {
            if (anios.length && !anios.includes(Number(f.slice(0, 4)))) return false;
            if (meses.length && !meses.includes(Number(f.slice(5, 7)))) return false;
            return true;
        },
        [anios, meses]
    );

    const fechasAnioMes = useMemo(() => todasLasFechas.filter(pasaAnioMes), [todasLasFechas, pasaAnioMes]);
    const variosAnios = anios.length !== 1 && aniosDisponibles.length > 1;
    const unSoloMes = meses.length === 1 && !variosAnios;

    const opcionesMes = useMemo(() => {
        const mesesPresentes = new Set<number>();
        todasLasFechas.forEach((f) => {
            if (!anios.length || anios.includes(Number(f.slice(0, 4)))) {
                mesesPresentes.add(Number(f.slice(5, 7)));
            }
        });
        return MESES.map((m, i) => ({ value: String(i + 1), label: m })).filter(
            (o) => mesesPresentes.size === 0 || mesesPresentes.has(Number(o.value))
        );
    }, [todasLasFechas, anios]);

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

    const opcionesDia = useMemo(() => {
        return fechasAnioMes
            .filter((f) => !semanas.length || semanas.includes(semanaIso(f).clave))
            .map((f) => ({
                value: f,
                label: unSoloMes ? String(Number(f.slice(8, 10))) : fechaCorta(f).slice(0, variosAnios ? 10 : 5)
            }));
    }, [fechasAnioMes, semanas, unSoloMes, variosAnios]);

    const cambiarAnios = (v: string[]) => {
        setAnios(v.map(Number));
        setSemanas([]);
        setDiasSel([]);
        setSelectedItemKey(null);
    };
    const cambiarMeses = (v: string[]) => {
        setMeses(v.map(Number));
        setSemanas([]);
        setDiasSel([]);
        setSelectedItemKey(null);
    };
    const cambiarSemanas = (v: string[]) => {
        setSemanas(v);
        setDiasSel([]);
        setSelectedItemKey(null);
    };
    const cambiarDias = (v: string[]) => {
        setDiasSel(v);
        setSelectedItemKey(null);
    };

    // Cálculo instantáneo del tablero según los filtros de calendario
    const data = useMemo(() => {
        if (loading && Object.keys(registrosCrudos).length === 0) return null;
        return calcularDashboardDesdeRegistros(registrosCrudos, {
            anios,
            meses,
            semanas,
            dias: diasSel
        });
    }, [loading, registrosCrudos, anios, meses, semanas, diasSel]);

    // Lista plana de todos los ítems enriquecidos del dataset actual
    const allItemsEnriquecidos = useMemo<ItemEnriquecido[]>(() => {
        if (!data) return [];
        const list: ItemEnriquecido[] = [];
        for (const pl of data.plantas) {
            for (const pr of pl.procesos) {
                for (const it of pr.items) {
                    list.push({
                        ...it,
                        itemKey: `${pr.tabla}:${it.columna}`,
                        procesoId: pr.id,
                        procesoNombre: pr.nombre,
                        plantaKey: pl.plantaKey,
                        plantaNombre: pl.nombre,
                        tabla: pr.tabla
                    });
                }
            }
        }
        return list;
    }, [data]);

    // Ítem seleccionado actualmente (si el usuario hizo click en una barra o fila)
    const selectedItemObj = useMemo(() => {
        if (!selectedItemKey) return null;
        return allItemsEnriquecidos.find((it) => it.itemKey === selectedItemKey) || null;
    }, [allItemsEnriquecidos, selectedItemKey]);

    // Procesos disponibles según la planta seleccionada
    const availableProcesos = useMemo<CumplimientoProcesoResult[]>(() => {
        if (!data) return [];
        if (selectedPlanta === 'todas') {
            return data.plantas.flatMap((p) => p.procesos);
        }
        const pl = data.plantas.find((p) => p.plantaKey === selectedPlanta);
        return pl ? pl.procesos : [];
    }, [data, selectedPlanta]);

    // Procesos activos (respetando selectedProcesoId)
    const scopedProcesos = useMemo<CumplimientoProcesoResult[]>(() => {
        if (selectedProcesoId === 'todos') return availableProcesos;
        return availableProcesos.filter((p) => p.id === selectedProcesoId);
    }, [availableProcesos, selectedProcesoId]);

    // Métricas de los KPI Cards (recalculadas dinámicamente según Planta -> Proceso -> Ítem seleccionado)
    const currentViewMetrics = useMemo(() => {
        if (!data) return null;

        // Si hay un ítem específico seleccionado, las tarjetas reflejan ese ítem
        if (selectedItemObj) {
            const parentProc = availableProcesos.find((p) => p.id === selectedItemObj.procesoId);
            return {
                scopeLabel: `${selectedItemObj.nombre} (${selectedItemObj.procesoNombre})`,
                cumplimiento: selectedItemObj.porcentaje,
                totalAuditorias: parentProc?.totalRegistros ?? selectedItemObj.totalEvaluaciones,
                totalChequeos: selectedItemObj.totalEvaluaciones,
                totalCumplen: selectedItemObj.cumplen,
                itemsEnAlerta: selectedItemObj.estado === 'critico' ? 1 : 0,
                estado: selectedItemObj.estado
            };
        }

        // Si hay un proceso específico seleccionado
        if (selectedProcesoId !== 'todos') {
            const proc = availableProcesos.find((p) => p.id === selectedProcesoId);
            if (proc) {
                const alertasProc = proc.items.filter((it) => it.estado === 'critico').length;
                return {
                    scopeLabel: proc.nombre,
                    cumplimiento: proc.porcentaje,
                    totalAuditorias: proc.totalRegistros,
                    totalChequeos: proc.totalChequeos,
                    totalCumplen: proc.chequeosCumplen,
                    itemsEnAlerta: alertasProc,
                    estado: proc.estado
                };
            }
        }

        // Si hay una planta específica seleccionada
        if (selectedPlanta !== 'todas') {
            const plantaObj = data.plantas.find((p) => p.plantaKey === selectedPlanta);
            if (plantaObj) {
                const alertasPlanta = plantaObj.procesos
                    .flatMap((pr) => pr.items)
                    .filter((it) => it.estado === 'critico').length;

                return {
                    scopeLabel: plantaObj.nombre,
                    cumplimiento: plantaObj.porcentaje,
                    totalAuditorias: plantaObj.totalRegistros,
                    totalChequeos: plantaObj.totalChequeos,
                    totalCumplen: plantaObj.chequeosCumplen,
                    itemsEnAlerta: alertasPlanta,
                    estado: plantaObj.estado
                };
            }
        }

        // Consolidado global
        return {
            scopeLabel: 'Todas las Plantas',
            cumplimiento: data.cumplimientoGlobal,
            totalAuditorias: data.totalAuditorias,
            totalChequeos: data.totalChequeos,
            totalCumplen: data.totalChequeosCumplen,
            itemsEnAlerta: data.itemsEnAlerta,
            estado: clasificarSemaforo(data.cumplimientoGlobal, data.totalChequeos)
        };
    }, [data, selectedPlanta, selectedProcesoId, selectedItemObj, availableProcesos]);

    // Ítems filtrados para la Matriz Detallada
    const filteredItems = useMemo<ItemEnriquecido[]>(() => {
        if (!data) return [];

        return allItemsEnriquecidos.filter((it) => {
            if (selectedPlanta !== 'todas' && it.plantaKey !== selectedPlanta) return false;
            if (selectedProcesoId !== 'todos' && it.procesoId !== selectedProcesoId) return false;
            if (selectedItemKey && it.itemKey !== selectedItemKey) return false;
            if (estadoFiltro !== 'todos' && it.estado !== estadoFiltro) return false;
            if (soloNoConformes && it.noCumplen <= 0) return false;

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const match =
                    it.nombre.toLowerCase().includes(q) ||
                    (it.descripcion && it.descripcion.toLowerCase().includes(q)) ||
                    it.procesoNombre.toLowerCase().includes(q) ||
                    it.plantaNombre.toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [data, allItemsEnriquecidos, selectedPlanta, selectedProcesoId, selectedItemKey, estadoFiltro, soloNoConformes, searchQuery]);

    // Datos para Gráfica 1 (Plantas si 'todas', Procesos si hay planta seleccionada)
    const chart1Data = useMemo(() => {
        if (!data) return [];
        if (selectedPlanta === 'todas') {
            return data.plantas.map((pl) => ({
                id: pl.plantaKey,
                kind: 'planta' as const,
                name: pl.codigoOficial,
                fullName: pl.nombre,
                cumplimiento: pl.porcentaje,
                total: pl.totalRegistros,
                estado: pl.estado,
                fill: COLOR_SEMAFORO[pl.estado]
            }));
        }
        return availableProcesos.map((pr) => ({
            id: pr.id,
            kind: 'proceso' as const,
            name: pr.nombre.length > 14 ? pr.nombre.substring(0, 13) + '…' : pr.nombre,
            fullName: pr.nombre,
            cumplimiento: pr.porcentaje,
            total: pr.totalRegistros,
            estado: pr.estado,
            fill: COLOR_SEMAFORO[pr.estado]
        }));
    }, [data, selectedPlanta, availableProcesos]);

    // Datos para Gráfica 2 (Puntos Críticos / Ítems de Menor Cumplimiento en el alcance activo)
    const chart2Data = useMemo(() => {
        if (!data) return [];
        // Tomamos todos los ítems con evaluaciones en el alcance actual (planta + proceso + estado + soloNoConformes)
        let pool = allItemsEnriquecidos.filter((it) => {
            if (it.totalEvaluaciones <= 0) return false;
            if (selectedPlanta !== 'todas' && it.plantaKey !== selectedPlanta) return false;
            if (selectedProcesoId !== 'todos' && it.procesoId !== selectedProcesoId) return false;
            if (estadoFiltro !== 'todos' && it.estado !== estadoFiltro) return false;
            if (soloNoConformes && it.noCumplen <= 0) return false;
            return true;
        });

        // Si no hay filtro de proceso ni estado explícito, priorizamos ítems < 90%;
        // si todos están >= 90% pero hay proceso o filtro activo, mostramos los de menor % igual para permitir interacción.
        const bajoMeta = pool.filter((it) => it.porcentaje < 90);
        const finalPool =
            estadoFiltro !== 'todos' || soloNoConformes || selectedProcesoId !== 'todos'
                ? pool
                : bajoMeta.length > 0
                ? bajoMeta
                : pool;

        return [...finalPool]
            .sort((a, b) => a.porcentaje - b.porcentaje)
            .slice(0, 8)
            .map((it) => ({
                itemKey: it.itemKey,
                procesoId: it.procesoId,
                plantaKey: it.plantaKey,
                name: it.nombre.length > 22 ? it.nombre.substring(0, 21) + '…' : it.nombre,
                fullName: `${it.nombre} (${it.procesoNombre})`,
                cumplimiento: it.porcentaje,
                cumplen: it.cumplen,
                noCumplen: it.noCumplen,
                totalEvaluaciones: it.totalEvaluaciones,
                estado: it.estado,
                fill: COLOR_SEMAFORO[it.estado]
            }));
    }, [data, allItemsEnriquecidos, selectedPlanta, selectedProcesoId, estadoFiltro, soloNoConformes]);

    // Manejadores de interacción (Click en gráficas, KPIs y tabla)
    const handleChart1Click = (entry: any) => {
        if (!entry) return;
        const payload = entry.payload ?? entry;
        if (payload.kind === 'planta') {
            setSelectedPlanta(payload.id as PlantaVigilanciaKey);
            setSelectedProcesoId('todos');
            setSelectedItemKey(null);
            setEstadoFiltro('todos');
            setSoloNoConformes(false);
        } else if (payload.kind === 'proceso') {
            setSelectedItemKey(null);
            setEstadoFiltro('todos');
            setSoloNoConformes(false);
            setSelectedProcesoId((prev) => (prev === payload.id ? 'todos' : payload.id));
        }
    };

    const handleChart2Click = (entry: any) => {
        if (!entry) return;
        const payload = entry.payload ?? entry;
        if (!payload.itemKey) return;
        setSelectedItemKey((prev) => (prev === payload.itemKey ? null : payload.itemKey));
    };

    const handleRowClick = (item: ItemEnriquecido) => {
        setSelectedItemKey((prev) => (prev === item.itemKey ? null : item.itemKey));
    };

    const handleClearCrossFilters = () => {
        setSelectedPlanta('todas');
        setSelectedProcesoId('todos');
        setSelectedItemKey(null);
        setEstadoFiltro('todos');
        setSoloNoConformes(false);
        setSearchQuery('');
        setAnios([]);
        setMeses([]);
        setSemanas([]);
        setDiasSel([]);
    };

    const hasActiveCrossFilters =
        selectedPlanta !== 'todas' ||
        selectedProcesoId !== 'todos' ||
        selectedItemKey !== null ||
        estadoFiltro !== 'todos' ||
        soloNoConformes ||
        searchQuery.trim() !== '' ||
        anios.length > 0 ||
        meses.length > 0 ||
        semanas.length > 0 ||
        diasSel.length > 0;

    const getBadgeClass = (estado: EstadoSemaforoVigilancia) => {
        if (estado === 'excelente') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (estado === 'alerta') return 'bg-amber-100 text-amber-800 border-amber-300';
        if (estado === 'critico') return 'bg-red-100 text-red-800 border-red-300';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    };

    const getEstadoLabel = (estado: EstadoSemaforoVigilancia) => {
        if (estado === 'excelente') return 'Excelente (≥90%)';
        if (estado === 'alerta') return 'Observación (85-90%)';
        if (estado === 'critico') return 'Crítico (<85%)';
        return 'Sin datos';
    };

    const activeProcesoNombre = useMemo(() => {
        if (selectedProcesoId === 'todos') return null;
        return availableProcesos.find((p) => p.id === selectedProcesoId)?.nombre || null;
    }, [availableProcesos, selectedProcesoId]);

    const chart2ShowingAllOk =
        estadoFiltro === 'todos' &&
        !soloNoConformes &&
        selectedProcesoId === 'todos' &&
        chart2Data.length > 0 &&
        chart2Data.every((d) => d.cumplimiento >= 90);

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
            {/* --- CABECERA DE CONTROL SUPERIOR --- */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Volver al Menú"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-[#0099e5]" />
                                <h1 className="text-xl sm:text-2xl font-bold text-[#324354] tracking-tight">
                                    Indicadores de Cumplimiento · Plan de Vigilancia
                                </h1>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <MousePointerClick className="w-3.5 h-3.5 text-[#0099e5]" />
                                <span>Haz clic en cualquier barra, tarjeta o fila para filtrar e interactuar con todo el tablero</span>
                            </p>
                        </div>
                    </div>

                    {/* Filtros de Tiempo estilo Power BI: Año, Mes, Semana, Día */}
                    <div className="flex flex-wrap items-end gap-2">
                        <FiltroPbi
                            titulo="Año"
                            seleccion={anios.map(String)}
                            opciones={aniosDisponibles.map((a) => ({ value: String(a), label: String(a) }))}
                            onChange={cambiarAnios}
                            onBorrar={() => cambiarAnios([])}
                            puedeBorrar={anios.length > 0}
                        />
                        <FiltroPbi
                            titulo="Mes"
                            seleccion={meses.map(String)}
                            opciones={opcionesMes}
                            onChange={cambiarMeses}
                            onBorrar={() => cambiarMeses([])}
                            puedeBorrar={meses.length > 0}
                        />
                        <FiltroPbi
                            titulo="Semana"
                            seleccion={semanas}
                            opciones={opcionesSemana}
                            onChange={cambiarSemanas}
                            onBorrar={() => cambiarSemanas([])}
                            puedeBorrar={semanas.length > 0}
                        />
                        <FiltroPbi
                            titulo="Día"
                            seleccion={diasSel}
                            opciones={opcionesDia}
                            onChange={cambiarDias}
                            onBorrar={() => cambiarDias([])}
                            puedeBorrar={diasSel.length > 0}
                        />

                        {/* Botón Refrescar */}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="h-6 px-2 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                            title="Recargar datos"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0099e5]' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtro por Plantas (Pills) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Planta:</span>
                        {[
                            { key: 'todas', label: 'Todas las Plantas' },
                            { key: 'ms', label: 'Mármol Sintético (MS)' },
                            { key: 'fv', label: 'Fibra de Vidrio (FV)' },
                            { key: 'muebles', label: 'Muebles (MBL)' },
                            { key: 'cefi', label: 'CEFI' },
                            { key: 'moldes', label: 'Moldes' }
                        ].map((tab) => {
                            const isSelected = selectedPlanta === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setSelectedPlanta(tab.key as any);
                                        setSelectedProcesoId('todos');
                                        setSelectedItemKey(null);
                                        setEstadoFiltro('todos');
                                        setSoloNoConformes(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#324354] text-white shadow-xs'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {hasActiveCrossFilters && (
                        <button
                            onClick={handleClearCrossFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Limpiar filtros</span>
                        </button>
                    )}
                </div>

                {/* Chips de filtros interactivos activos */}
                {(activeProcesoNombre || selectedItemObj || estadoFiltro !== 'todos' || soloNoConformes) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                            <Filter className="w-3 h-3 text-[#0099e5]" />
                            Filtros activos:
                        </span>

                        {activeProcesoNombre && (
                            <button
                                onClick={() => setSelectedProcesoId('todos')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0099e5]/10 text-[#0077b6] border border-[#0099e5]/30 font-bold hover:bg-[#0099e5]/20 cursor-pointer"
                            >
                                <span>Proceso: {activeProcesoNombre}</span>
                                <X className="w-3 h-3" />
                            </button>
                        )}

                        {selectedItemObj && (
                            <button
                                onClick={() => setSelectedItemKey(null)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#324354] text-white font-bold hover:bg-[#253340] cursor-pointer"
                            >
                                <span>Ítem: {selectedItemObj.nombre}</span>
                                <X className="w-3 h-3" />
                            </button>
                        )}

                        {estadoFiltro !== 'todos' && (
                            <button
                                onClick={() => setEstadoFiltro('todos')}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold cursor-pointer ${getBadgeClass(
                                    estadoFiltro
                                )}`}
                            >
                                <span>Semáforo: {getEstadoLabel(estadoFiltro)}</span>
                                <X className="w-3 h-3" />
                            </button>
                        )}

                        {soloNoConformes && (
                            <button
                                onClick={() => setSoloNoConformes(false)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold cursor-pointer"
                            >
                                <span>Solo con no conformidades</span>
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* --- CARDS DE KPIS PRINCIPALES (4 TARJETAS INTERACTIVAS) --- */}
            {currentViewMetrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* KPI 1: Cumplimiento General */}
                    <button
                        type="button"
                        onClick={() => {
                            setEstadoFiltro('todos');
                            setSoloNoConformes(false);
                            setSelectedItemKey(null);
                        }}
                        className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                            estadoFiltro === 'todos' && !soloNoConformes && !selectedItemKey
                                ? 'border-[#324354]/40 shadow-xs'
                                : 'border-slate-200/90 shadow-xs'
                        }`}
                        title="Clic para ver todos los ítems del alcance actual"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                                Cumplimiento · {currentViewMetrics.scopeLabel}
                            </span>
                            <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(
                                    currentViewMetrics.estado
                                )}`}
                            >
                                Meta: 90%
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span
                                className="text-3xl sm:text-4xl font-black tracking-tight"
                                style={{ color: COLOR_SEMAFORO[currentViewMetrics.estado] }}
                            >
                                {currentViewMetrics.totalChequeos > 0 ? `${currentViewMetrics.cumplimiento}%` : '—'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                {currentViewMetrics.totalChequeos === 0
                                    ? 'Sin registros'
                                    : currentViewMetrics.cumplimiento >= 90
                                    ? 'Conforme'
                                    : currentViewMetrics.cumplimiento >= 85
                                    ? 'En observación'
                                    : 'Crítico'}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, currentViewMetrics.cumplimiento)}%`,
                                    backgroundColor: COLOR_SEMAFORO[currentViewMetrics.estado]
                                }}
                            />
                        </div>
                    </button>

                    {/* KPI 2: Total Auditorías */}
                    <button
                        type="button"
                        onClick={() => {
                            setEstadoFiltro('todos');
                            setSoloNoConformes(false);
                            setSelectedItemKey(null);
                        }}
                        className="text-left bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                        title="Clic para mostrar todos los registros del alcance actual"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Registros Realizados
                            </span>
                            <Layers className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl sm:text-4xl font-black text-[#324354] tracking-tight">
                                {currentViewMetrics.totalAuditorias.toLocaleString('es-CO')}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">Hojas de vigilancia capturadas</p>
                        </div>
                        <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-2 w-fit">
                            ✓ Datos en tiempo real
                        </div>
                    </button>

                    {/* KPI 3: Total Chequeos de Ítems (Click filtra solo ítems con no conformidades) */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedItemKey(null);
                            setSoloNoConformes((prev) => !prev);
                        }}
                        className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                            soloNoConformes
                                ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/30'
                                : 'border-slate-200/90 shadow-xs'
                        }`}
                        title="Clic para filtrar ítems que presentan no conformidades"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Chequeos Evaluados
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="mt-2">
                            <span className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                                {currentViewMetrics.totalCumplen.toLocaleString('es-CO')}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold ml-1">
                                / {currentViewMetrics.totalChequeos.toLocaleString('es-CO')}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">Parámetros que cumplieron</p>
                        </div>
                        <div
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md mt-2 w-fit ${
                                soloNoConformes
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {(currentViewMetrics.totalChequeos - currentViewMetrics.totalCumplen).toLocaleString('es-CO')}{' '}
                            no conformidades {soloNoConformes ? '· Filtrado' : '· Clic para filtrar'}
                        </div>
                    </button>

                    {/* KPI 4: Ítems en Alerta (Click filtra solo ítems críticos < 85%) */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedItemKey(null);
                            setEstadoFiltro((prev) => (prev === 'critico' ? 'todos' : 'critico'));
                        }}
                        className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                            estadoFiltro === 'critico'
                                ? 'border-[#d14747] ring-2 ring-red-200 bg-red-50/30'
                                : 'border-slate-200/90 shadow-xs'
                        }`}
                        title="Clic para filtrar solo ítems críticos (< 85%)"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Puntos en Alerta
                            </span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="mt-2">
                            <span
                                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                                    currentViewMetrics.itemsEnAlerta > 0 ? 'text-[#d14747]' : 'text-emerald-600'
                                }`}
                            >
                                {currentViewMetrics.itemsEnAlerta}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {currentViewMetrics.itemsEnAlerta === 1
                                    ? 'Ítem con cumplimiento < 85%'
                                    : 'Ítems con cumplimiento < 85%'}
                            </p>
                        </div>
                        <div
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md mt-2 w-fit ${
                                currentViewMetrics.itemsEnAlerta > 0
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}
                        >
                            {estadoFiltro === 'critico'
                                ? '✓ Mostrando críticos'
                                : currentViewMetrics.itemsEnAlerta > 0
                                ? 'Clic para ver críticos'
                                : 'Estándar bajo control'}
                        </div>
                    </button>
                </div>
            )}

            {/* --- SECCIÓN DE GRÁFICAS INTERACTIVAS (2 COLUMNAS RESPONSIVAS CON RECHARTS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* GRÁFICA 1: Cumplimiento por Planta o por Proceso (Click para profundizar / filtrar) */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#324354]">
                                {selectedPlanta === 'todas'
                                    ? 'Cumplimiento por Planta (%)'
                                    : `Cumplimiento por Proceso en ${
                                          data?.plantas.find((p) => p.plantaKey === selectedPlanta)?.nombre || ''
                                      } (%)`}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {selectedPlanta === 'todas'
                                    ? 'Clic en una barra para explorar los procesos de esa planta'
                                    : 'Clic en un proceso para filtrar sus ítems y KPIs'}
                            </p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0">
                            Interactiva
                        </span>
                    </div>

                    <div className="mt-4 h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart
                                data={chart1Data}
                                margin={{ top: 26, right: 15, left: -10, bottom: 25 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    interval={0}
                                    angle={-10}
                                    textAnchor="end"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0, 153, 229, 0.08)' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const p = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                                                    <p className="font-bold text-slate-100">{p.fullName || p.name}</p>
                                                    <p className="text-emerald-400 font-extrabold text-sm">
                                                        Cumplimiento: {p.total > 0 ? `${p.cumplimiento}%` : 'Sin datos'}
                                                    </p>
                                                    <p className="text-slate-300 text-[11px]">
                                                        Registros auditados: {p.total}
                                                    </p>
                                                    <p className="text-[#38bdf8] text-[10px] font-semibold pt-0.5">
                                                        Clic para filtrar →
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    y={90}
                                    stroke="#59a96a"
                                    strokeDasharray="4 4"
                                    strokeWidth={2}
                                    label={{
                                        value: 'Meta: 90%',
                                        position: 'insideTopRight',
                                        fill: '#59a96a',
                                        fontSize: 11
                                    }}
                                />
                                <Bar
                                    dataKey="cumplimiento"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={48}
                                    onClick={(barData) => handleChart1Click(barData)}
                                    className="cursor-pointer"
                                >
                                    {chart1Data.map((entry, index) => {
                                        const isHighlighted =
                                            entry.kind === 'proceso'
                                                ? selectedProcesoId === 'todos'
                                                    ? !selectedItemObj || selectedItemObj.procesoId === entry.id
                                                    : selectedProcesoId === entry.id
                                                : true;

                                        const isExplicitlySelected =
                                            entry.kind === 'proceso' && selectedProcesoId === entry.id;

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                                fillOpacity={isHighlighted ? 1 : 0.3}
                                                stroke={isExplicitlySelected ? '#324354' : 'none'}
                                                strokeWidth={isExplicitlySelected ? 2 : 0}
                                            />
                                        );
                                    })}
                                    <LabelList
                                        dataKey="cumplimiento"
                                        position="top"
                                        offset={6}
                                        formatter={(val: any) =>
                                            typeof val === 'number' ? `${val.toFixed(1)}%` : ''
                                        }
                                        style={{
                                            fill: '#324354',
                                            fontSize: 12,
                                            fontWeight: 800
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICA 2: Puntos Críticos / Desglose de Ítems (Click para filtrar ítem específico) */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#324354]">
                                {activeProcesoNombre
                                    ? `Ítems de ${activeProcesoNombre} (Menor a Mayor)`
                                    : chart2ShowingAllOk
                                    ? 'Ítems Evaluados (Todos en Meta ≥ 90%)'
                                    : 'Puntos Críticos de Calidad (Menor Cumplimiento)'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Clic en un ítem para ver su detalle exacto en los KPIs y la matriz
                            </p>
                        </div>
                        <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                chart2ShowingAllOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                        >
                            {chart2ShowingAllOk ? 'En Meta' : 'Atención Prioritaria'}
                        </span>
                    </div>

                    <div className="mt-4 h-[290px] w-full">
                        {chart2Data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart
                                    layout="vertical"
                                    data={chart2Data}
                                    margin={{ top: 10, right: 56, left: 10, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#475569' }}
                                        width={145}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0, 153, 229, 0.08)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const p = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                                                        <p className="font-bold text-slate-100">{p.fullName}</p>
                                                        <p
                                                            className="font-extrabold text-sm"
                                                            style={{ color: p.fill }}
                                                        >
                                                            Cumplimiento: {p.cumplimiento}%
                                                        </p>
                                                        <p className="text-slate-300 text-[11px]">
                                                            Cumple: {p.cumplen} · No cumple: {p.noCumplen} (de{' '}
                                                            {p.totalEvaluaciones})
                                                        </p>
                                                        <p className="text-[#38bdf8] text-[10px] font-semibold pt-0.5">
                                                            Clic para seleccionar ítem →
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine
                                        x={90}
                                        stroke="#59a96a"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                    />
                                    <Bar
                                        dataKey="cumplimiento"
                                        radius={[0, 6, 6, 0]}
                                        maxBarSize={22}
                                        onClick={(barData) => handleChart2Click(barData)}
                                        className="cursor-pointer"
                                    >
                                        {chart2Data.map((entry, index) => {
                                            const isSelected = selectedItemKey === entry.itemKey;
                                            const isDimmed = selectedItemKey !== null && !isSelected;
                                            return (
                                                <Cell
                                                    key={`crit-cell-${index}`}
                                                    fill={entry.fill}
                                                    fillOpacity={isDimmed ? 0.3 : 1}
                                                    stroke={isSelected ? '#324354' : 'none'}
                                                    strokeWidth={isSelected ? 2 : 0}
                                                />
                                            );
                                        })}
                                        <LabelList
                                            dataKey="cumplimiento"
                                            position="right"
                                            offset={8}
                                            formatter={(val: any) =>
                                                typeof val === 'number' ? `${val.toFixed(1)}%` : ''
                                            }
                                            style={{
                                                fill: '#324354',
                                                fontSize: 12,
                                                fontWeight: 800
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <Award className="w-12 h-12 text-emerald-500 mb-2" />
                                <p className="text-sm font-bold text-slate-700">
                                    {currentViewMetrics?.totalAuditorias === 0
                                        ? 'Sin registros en este período'
                                        : '¡Sin ítems bajo este subfiltro!'}
                                </p>
                                <p className="text-xs text-slate-500 max-w-xs mt-1">
                                    {currentViewMetrics?.totalAuditorias === 0
                                        ? 'Prueba seleccionando otro día, semana, mes, año o el historial completo.'
                                        : 'Todos los ítems evaluados en este alcance cumplen por encima del filtro activo.'}
                                </p>
                                {(estadoFiltro !== 'todos' || soloNoConformes || selectedItemKey) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEstadoFiltro('todos');
                                            setSoloNoConformes(false);
                                            setSelectedItemKey(null);
                                        }}
                                        className="mt-3 px-3 py-1.5 rounded-xl bg-[#324354] hover:bg-[#253340] text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Mostrar todos los ítems evaluados
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MATRIZ DETALLADA DE ÍTEMS AUDITADOS --- */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[#0099e5]" />
                            <h2 className="text-base sm:text-lg font-bold text-[#324354]">
                                Matriz Detallada de Ítems Auditados
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Haz clic en una fila para enfocar ese ítem en los KPIs y gráficas
                        </p>
                    </div>

                    {/* Filtros de búsqueda y proceso */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Selector de sub-proceso */}
                        <select
                            value={selectedProcesoId}
                            onChange={(e) => {
                                setSelectedProcesoId(e.target.value);
                                setSelectedItemKey(null);
                                setEstadoFiltro('todos');
                                setSoloNoConformes(false);
                            }}
                            className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0099e5]/30 cursor-pointer"
                        >
                            <option value="todos">Todos los Procesos ({availableProcesos.length})</option>
                            {availableProcesos.map((proc) => (
                                <option key={proc.id} value={proc.id}>
                                    {proc.nombre}
                                </option>
                            ))}
                        </select>

                        {/* Buscador de texto */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar ítem o parámetro..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0099e5]/30 text-slate-800 placeholder-slate-400 w-full sm:w-56"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-3">Ítem / Parámetro Evaluado</th>
                                <th className="p-3">Proceso</th>
                                <th className="p-3">Planta</th>
                                <th className="p-3 text-center">Evaluaciones</th>
                                <th className="p-3 text-center">Cumple</th>
                                <th className="p-3 text-center">No Cumple</th>
                                <th className="p-3 text-center">Cumplimiento (%)</th>
                                <th className="p-3 text-center">Semáforo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const semaforoColor = COLOR_SEMAFORO[item.estado];
                                    const isSelectedRow = selectedItemKey === item.itemKey;
                                    return (
                                        <tr
                                            key={item.itemKey}
                                            onClick={() => handleRowClick(item)}
                                            className={`transition-colors cursor-pointer ${
                                                isSelectedRow
                                                    ? 'bg-[#0099e5]/10 hover:bg-[#0099e5]/15'
                                                    : 'hover:bg-slate-50/90'
                                            }`}
                                        >
                                            <td className="p-3 font-semibold text-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                    {isSelectedRow && (
                                                        <span className="w-2 h-2 rounded-full bg-[#0099e5] shrink-0" />
                                                    )}
                                                    <span>{item.nombre}</span>
                                                </div>
                                                {item.descripcion && (
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        {item.descripcion}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                                                {item.procesoNombre}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                    {item.plantaNombre}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-700">
                                                {item.totalEvaluaciones}
                                            </td>
                                            <td className="p-3 text-center font-bold text-emerald-600">
                                                {item.cumplen}
                                            </td>
                                            <td className="p-3 text-center font-bold text-red-500">
                                                {item.noCumplen}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.totalEvaluaciones > 0 ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span
                                                            className="font-black text-xs"
                                                            style={{ color: semaforoColor }}
                                                        >
                                                            {item.porcentaje}%
                                                        </span>
                                                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${Math.min(100, item.porcentaje)}%`,
                                                                    backgroundColor: semaforoColor
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-semibold">—</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(
                                                        item.estado
                                                    )}`}
                                                >
                                                    {getEstadoLabel(item.estado)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 space-y-2">
                                        <p>No se encontraron ítems que coincidan con los subfiltros activos.</p>
                                        {(estadoFiltro !== 'todos' || soloNoConformes || selectedItemKey || searchQuery.trim() !== '') && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEstadoFiltro('todos');
                                                    setSoloNoConformes(false);
                                                    setSelectedItemKey(null);
                                                    setSearchQuery('');
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#324354] hover:bg-[#253340] text-white text-xs font-bold transition-colors cursor-pointer"
                                            >
                                                Mostrar todos los ítems evaluados
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Leyenda interactiva de semáforo */}
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                    <p>
                        Mostrando <strong className="text-slate-800">{filteredItems.length}</strong> parámetros auditados
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">Filtrar semáforo:</span>
                        {(
                            [
                                { key: 'excelente', label: '≥ 90% Conforme', color: '#59a96a' },
                                { key: 'alerta', label: '85% - 89.9% Alerta', color: '#deb841' },
                                { key: 'critico', label: '< 85% Crítico', color: '#d14747' }
                            ] as const
                        ).map((s) => {
                            const active = estadoFiltro === s.key;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedItemKey(null);
                                        setEstadoFiltro((prev) => (prev === s.key ? 'todos' : s.key));
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                                        active
                                            ? 'bg-[#324354] text-white border-[#324354] shadow-2xs'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: s.color }}
                                    />
                                    <span>{s.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
