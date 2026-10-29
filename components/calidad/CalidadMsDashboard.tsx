'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, ExternalLink, Loader2, Search, X } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    ReferenceLine,
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { supabase } from '@/lib/supabase';
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi';
import {
    MS_FECHA_INICIO_BI,
    MsPiezaNormalizada,
    calcularPareto,
    calcularReferencias,
    calcularResumen,
    fetchCatalogoDefectosMs,
    fetchMsReportes,
    fetchProductosMs,
    normalizarPiezas
} from '@/lib/calidad/msCalidad';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const PARETO_COLORS = [
    '#008080', '#e06634', '#0284c7', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6',
    '#84cc16', '#a855f7', '#06b6d4', '#f97316', '#3b82f6',
    '#e11d48', '#d97706', '#475569', '#64748b', '#94a3b8'
];
const COLOR_OTROS = '#cbd5e1';
const CAUSAS_EN_ANILLO = 12;

// Semáforo de calidad MS (meta 90%): verde ≥ 90%, amarillo 80–89,9%, rojo < 80%
const META_MS = 90;
const colorCalidad = (v: number | null | undefined) => (v == null ? '#94a3b8' : v >= META_MS ? '#59a96a' : v >= META_MS - 10 ? '#deb841' : '#d14747');

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaCorta = (f: string) => f.split('-').reverse().join('/');
const ANIO_INICIO = Number(MS_FECHA_INICIO_BI.slice(0, 4));

type Gran = 'dia' | 'mes' | 'anio';
interface Columna { key: string; label: string; valor: number; total: number; buenas: number; conCausa: number; meses?: number }
interface SelPeriodo { gran: Gran; key: string }

const clavePeriodo = (p: MsPiezaNormalizada, gran: Gran) => (gran === 'dia' ? p.fecha : gran === 'mes' ? p.fecha.slice(0, 7) : p.fecha.slice(0, 4));

const nombrePeriodo = (gran: Gran, key: string) => {
    if (gran === 'anio') return `Año ${key}`;
    if (gran === 'mes') return `${MESES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
    return fechaCorta(key);
};

const TooltipTendencia = ({ active, payload, gran, causa }: any) => {
    if (!active || !payload?.length) return null;
    const c: Columna = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 text-[11px] min-w-[180px]">
            <p className="font-black text-slate-800 capitalize mb-1">{nombrePeriodo(gran, c.key)}</p>
            {causa ? (
                <p className="font-bold text-slate-700">{c.valor.toFixed(1)}% de las piezas con {causa}</p>
            ) : (
                <p className="font-bold" style={{ color: colorCalidad(c.valor) }}>Calidad {c.valor.toFixed(1)}%</p>
            )}
            <p className="text-slate-500">Revisadas {c.total.toLocaleString('es-CO')} · Buenas {c.buenas.toLocaleString('es-CO')}</p>
            {causa && <p className="text-slate-500">Con el defecto: {c.conCausa.toLocaleString('es-CO')}</p>}
            {c.meses != null && <p className="text-slate-500">Promedio de {c.meses} mes(es) con dato</p>}
        </div>
    );
};

// Clic en una gráfica de Recharts: puede llegar por la barra y por la gráfica a la vez; se procesa una sola vez
function useClicUnico() {
    const ultimo = useRef(0);
    const marcado = useRef(false);
    return {
        // Devuelve true si el clic se debe procesar
        tomar: () => {
            marcado.current = true;
            const ahora = Date.now();
            if (ahora - ultimo.current < 150) return false;
            ultimo.current = ahora;
            return true;
        },
        // Para el clic del recuadro: true si el clic fue sobre un elemento de la gráfica
        consumir: () => {
            const v = marcado.current;
            marcado.current = false;
            return v;
        }
    };
}

// Etiqueta con el % de cada porción del anillo (solo porciones con espacio suficiente)
const etiquetaPorcion = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    if (!percent || percent < 0.025) return null;
    const rad = Math.PI / 180;
    const r = outerRadius + 10;
    const x = cx + r * Math.cos(-midAngle * rad);
    const y = cy + r * Math.sin(-midAngle * rad);
    return (
        <text x={x} y={y} fill="#334155" fontSize={10} fontWeight={800} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {`${(percent * 100).toFixed(1)}%`}
        </text>
    );
};

// Mármol Sintético (MS): tablero dinámico estilo Power BI (filtros Año/Mes/Semana/Día y filtro cruzado entre gráficas)
export default function CalidadMsDashboard({ powerBiUrl }: { powerBiUrl?: string }) {
    const hoy = hoyBogota();
    const anioActual = Number(hoy.slice(0, 4));
    const mesActual = Number(hoy.slice(5, 7));

    const [vista, setVista] = useState<'html' | 'powerbi'>('html');
    // Gráfica de la derecha: por mes o promedio por año (null = automática según los filtros)
    const [vistaSec, setVistaSec] = useState<'mes' | 'anio' | null>(null);

    // Filtros de selección múltiple (lista vacía = "Todas"). Al abrir: año y mes en curso.
    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([mesActual]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);

    // Selecciones cruzadas (clic en un elemento filtra las demás gráficas; otro clic lo quita)
    const [selPeriodo, setSelPeriodo] = useState<SelPeriodo | null>(null);
    const [selCausa, setSelCausa] = useState<string | null>(null);
    const [selRef, setSelRef] = useState<string | null>(null);

    // Tabla de referencias
    const [refSearch, setRefSearch] = useState('');
    const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({});
    const [verTotal, setVerTotal] = useState(true);
    const [verReparacion, setVerReparacion] = useState(false);

    // Piezas por año ya consultadas
    const [porAnio, setPorAnio] = useState<Record<number, MsPiezaNormalizada[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const catalogos = useRef<{ catalogo: Map<number, string>; productos: Map<number, string> } | null>(null);

    const aniosDisponibles = useMemo(() => Array.from({ length: anioActual - ANIO_INICIO + 1 }, (_, i) => anioActual - i), [anioActual]);
    const todosLosAnios = anios.length === 0;
    const aniosVista = useMemo(() => (todosLosAnios ? [...aniosDisponibles] : [...anios]).sort((a, b) => a - b), [todosLosAnios, aniosDisponibles, anios]);

    const granPrincipal: Gran = todosLosAnios && !(semanas.length > 0 || diasSel.length > 0) ? 'anio' : (anios.length === 1 && meses.length === 1) || semanas.length > 0 || diasSel.length > 0 ? 'dia' : 'mes';
    const granSecundaria: Gran = vistaSec ?? (granPrincipal === 'mes' ? 'anio' : 'mes');
    const aniosCarga = useMemo(() => (granSecundaria === 'anio' ? aniosDisponibles : aniosVista), [granSecundaria, aniosDisponibles, aniosVista]);

    useEffect(() => {
        const pendientes = aniosCarga.filter(a => !porAnio[a]);
        if (pendientes.length === 0) return;
        let vivo = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                if (!catalogos.current) {
                    const [catalogo, productos] = await Promise.all([fetchCatalogoDefectosMs(supabase), fetchProductosMs(supabase)]);
                    catalogos.current = { catalogo, productos };
                }
                const nuevos: Record<number, MsPiezaNormalizada[]> = {};
                for (const a of pendientes) {
                    const desde = a === ANIO_INICIO ? `${MS_FECHA_INICIO_BI}T00:00:00Z` : `${a}-01-01T00:00:00Z`;
                    const rows = await fetchMsReportes(supabase, desde, `${a + 1}-01-01T00:00:00Z`, 'id, created_at, producto_id, defecto, Reparacion');
                    nuevos[a] = normalizarPiezas(rows, catalogos.current.catalogo, catalogos.current.productos);
                }
                if (vivo) setPorAnio(prev => ({ ...prev, ...nuevos }));
            } catch (e: any) {
                if (vivo) setError(e?.message || 'Error consultando Supabase');
            } finally {
                if (vivo) setLoading(false);
            }
        })();
        return () => { vivo = false; };
    }, [aniosCarga, porAnio]);

    // Piezas en cascada: Año → Mes → Semana → Día
    const piezasAnios = useMemo(() => aniosVista.flatMap(a => porAnio[a] || []), [aniosVista, porAnio]);
    const piezasMes = useMemo(
        () => (meses.length ? piezasAnios.filter(p => meses.includes(Number(p.fecha.slice(5, 7)))) : piezasAnios),
        [piezasAnios, meses]
    );
    const piezasSemana = useMemo(
        () => (semanas.length ? piezasMes.filter(p => semanas.includes(semanaIso(p.fecha).clave)) : piezasMes),
        [piezasMes, semanas]
    );
    const piezas = useMemo(() => (diasSel.length ? piezasSemana.filter(p => diasSel.includes(p.fecha)) : piezasSemana), [piezasSemana, diasSel]);

    const variosAnios = aniosVista.length > 1;
    const unSoloMes = anios.length === 1 && meses.length === 1;
    const filtroDiario = semanas.length > 0 || diasSel.length > 0;

    // Granularidad automática: días (un mes, semana o días), meses (varios meses/años) o años (Año en "Todas")

    // Filtros cruzados
    const enPeriodo = (p: MsPiezaNormalizada) => !selPeriodo || clavePeriodo(p, selPeriodo.gran) === selPeriodo.key;
    const conCausa = (p: MsPiezaNormalizada) => !selCausa || p.defectos.some(d => d.nombre === selCausa);
    const enRef = (p: MsPiezaNormalizada) => !selRef || p.referencia === selRef;

    // Tarjetas: periodo y referencia elegidos (con una causa elegida, las piezas con esa causa)
    const piezasKpi = useMemo(() => piezas.filter(p => enPeriodo(p) && enRef(p) && conCausa(p)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [piezas, selPeriodo, selRef, selCausa]);
    const resumen = useMemo(() => calcularResumen(piezasKpi), [piezasKpi]);

    // Pareto: filtrado por periodo y referencia; la causa elegida se resalta
    const pareto = useMemo(() => calcularPareto(piezas.filter(p => enPeriodo(p) && enRef(p))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [piezas, selPeriodo, selRef]);
    const colorCausa = useMemo(() => {
        const m = new Map<string, string>();
        pareto.forEach((c, i) => m.set(c.name, i < CAUSAS_EN_ANILLO ? PARETO_COLORS[i % PARETO_COLORS.length] : COLOR_OTROS));
        return m;
    }, [pareto]);
    const anillo = useMemo(() => {
        const top = pareto.slice(0, CAUSAS_EN_ANILLO).map(c => ({ ...c, color: colorCausa.get(c.name)! }));
        const resto = pareto.slice(CAUSAS_EN_ANILLO);
        if (resto.length) {
            const cantidad = resto.reduce((a, c) => a + c.cantidad, 0);
            const pct = Math.round(resto.reduce((a, c) => a + c.pct, 0) * 10) / 10;
            top.push({ name: `Otras (${resto.length})`, cantidad, pct, esMolde: false, color: COLOR_OTROS });
        }
        return top;
    }, [pareto, colorCausa]);
    // Si la causa elegida queda en "Otras", se resalta esa porción
    const causaEnAnillo = selCausa && anillo.some(a => a.name === selCausa) ? selCausa : selCausa ? anillo[anillo.length - 1]?.name : null;

    // Referencias: filtradas por periodo y causa; el total de piezas no depende de la causa
    const referencias = useMemo(() => {
        const base = piezas.filter(p => enPeriodo(p));
        const totales = new Map(calcularReferencias(base).map(r => [r.referencia, r]));
        const lista = selCausa ? calcularReferencias(base.filter(conCausa)) : [...totales.values()];
        return lista
            .map(r => (selCausa ? { ...r, totalPiezas: totales.get(r.referencia)?.totalPiezas ?? r.totalPiezas, reparacion: totales.get(r.referencia)?.reparacion ?? r.reparacion } : r))
            .filter(r => r.piezasDefectuosas > 0 || !selCausa);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [piezas, selPeriodo, selCausa]);
    const referenciasVisibles = useMemo(() => {
        if (!refSearch.trim()) return referencias;
        const q = refSearch.toLowerCase();
        return referencias.filter(r => r.referencia.toLowerCase().includes(q) || r.subdefectos.some(s => s.name.toLowerCase().includes(q)));
    }, [referencias, refSearch]);

    // Tendencias: filtradas por referencia; con una causa elegida muestran el % de piezas con esa causa
    // Por año (vista secundaria): promedio de los valores mensuales de cada año
    const promedioAnual = (lista: MsPiezaNormalizada[]): Columna[] => {
        const porAnioCol = new Map<string, Columna[]>();
        columnasDe(lista, 'mes').forEach(c => {
            const a = c.key.slice(0, 4);
            porAnioCol.set(a, [...(porAnioCol.get(a) || []), c]);
        });
        return [...porAnioCol.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([a, cols]) => ({
            key: a,
            label: a,
            valor: Math.round((cols.reduce((x, c) => x + c.valor, 0) / cols.length) * 10) / 10,
            total: cols.reduce((x, c) => x + c.total, 0),
            buenas: cols.reduce((x, c) => x + c.buenas, 0),
            conCausa: cols.reduce((x, c) => x + c.conCausa, 0),
            meses: cols.length
        }));
    };
    const columnasDe = (lista: MsPiezaNormalizada[], gran: Gran): Columna[] => {
        const grupos = new Map<string, MsPiezaNormalizada[]>();
        lista.forEach(p => {
            const k = clavePeriodo(p, gran);
            const arr = grupos.get(k);
            if (arr) arr.push(p); else grupos.set(k, [p]);
        });
        const aniosEnDatos = new Set(lista.map(p => p.fecha.slice(0, 4))).size > 1;
        return [...grupos.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, arr]) => {
                const r = calcularResumen(arr);
                const nCausa = selCausa ? arr.filter(conCausa).length : 0;
                const label = gran === 'anio'
                    ? key
                    : gran === 'mes'
                        ? `${MESES[Number(key.slice(5, 7)) - 1].slice(0, 3)}${aniosEnDatos ? ` ${key.slice(2, 4)}` : ''}`
                        : unSoloMes ? String(Number(key.slice(8, 10))) : `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}${aniosEnDatos ? `/${key.slice(2, 4)}` : ''}`;
                const valor = selCausa ? (r.piezasRevisadas ? (nCausa / r.piezasRevisadas) * 100 : 0) : r.calidad;
                return { key, label, valor: Math.round(valor * 10) / 10, total: r.piezasRevisadas, buenas: r.piezasBuenas, conCausa: nCausa };
            })
            .filter(c => c.total > 0 && (selCausa || c.valor > 0));
    };
    const columnasPrincipal = useMemo(() => columnasDe(piezas.filter(enRef), granPrincipal),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [piezas, selRef, selCausa, granPrincipal, unSoloMes]);
    // Gráfica secundaria: por mes (todos los meses de los años elegidos) o promedio por año (todos los años)
    const columnasSecundaria = useMemo(() => {
        if (granSecundaria === 'anio') return promedioAnual(aniosDisponibles.flatMap(a => porAnio[a] || []).filter(enRef));
        return columnasDe(piezasAnios.filter(enRef), 'mes');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [piezasAnios, porAnio, aniosDisponibles, selRef, selCausa, granSecundaria]);

    // Las selecciones que dejan de existir al cambiar filtros se quitan
    useEffect(() => {
        if (selPeriodo && ![...columnasPrincipal, ...columnasSecundaria].some(c => c.key === selPeriodo.key)) setSelPeriodo(null);
    }, [columnasPrincipal, columnasSecundaria, selPeriodo]);

    const limpiarSelecciones = () => { setSelPeriodo(null); setSelCausa(null); setSelRef(null); setVistaSec(null); };
    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanas([]); setDiasSel([]); limpiarSelecciones(); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanas([]); setDiasSel([]); limpiarSelecciones(); };
    const cambiarSemanas = (v: string[]) => { setSemanas(v); setDiasSel([]); limpiarSelecciones(); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); limpiarSelecciones(); };
    // Día elegido en la gráfica: se refleja en los filtros Semana y Día (al quitarlo vuelven a lo filtrado)
    const diaSel = selPeriodo?.gran === 'dia' ? selPeriodo.key : null;
    const semanasVista = diaSel ? [semanaIso(diaSel).clave] : semanas;
    const diasVista = diaSel ? [diaSel] : diasSel;

    const opcionesSemana = useMemo(() => {
        const mapa = new Map<string, { anio: number; semana: number }>();
        piezasMes.forEach(p => { const s = semanaIso(p.fecha); mapa.set(s.clave, s); });
        return [...mapa.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([clave, s]) => ({ value: clave, label: `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}` }));
    }, [piezasMes, variosAnios]);
    const opcionesDia = useMemo(() => {
        const fechas = [...new Set(piezasSemana.map(p => p.fecha))].sort();
        return fechas.map(f => ({ value: f, label: unSoloMes ? String(Number(f.slice(8, 10))) : fechaCorta(f).slice(0, variosAnios ? 10 : 5) }));
    }, [piezasSemana, unSoloMes, variosAnios]);

    // Clics en las gráficas de tendencia
    const clicPrincipal = useClicUnico();
    const clicSecundaria = useClicUnico();
    const clicAnillo = useClicUnico();
    // Clic en un mes o un año: cambia los filtros de arriba y todo el tablero pasa a ese periodo
    // (otro clic en el mismo lo quita). Un día solo se resalta y filtra las demás gráficas.
    const alternarPeriodo = (gran: Gran, key: string) => {
        if (gran === 'dia') {
            setSelPeriodo(prev => (prev && prev.gran === gran && prev.key === key ? null : { gran, key }));
            return;
        }
        const y = Number(key.slice(0, 4));
        const soloAnio = anios.length === 1 && anios[0] === y;
        setSemanas([]);
        setDiasSel([]);
        setSelPeriodo(null);
        if (gran === 'anio') {
            setAnios(soloAnio ? [] : [y]);
            return;
        }
        const m = Number(key.slice(5, 7));
        if (soloAnio && meses.length === 1 && meses[0] === m) {
            setMeses([]);
        } else {
            setAnios([y]);
            setMeses([m]);
        }
    };
    const alternarCausa = (nombre: string) => setSelCausa(prev => (prev === nombre ? null : nombre));
    const columnaDeClic = (e: any, cols: Columna[]) => {
        const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
        return Number.isInteger(idx) ? cols[idx] : cols.find(c => c.label === String(e?.activeLabel));
    };

    const nombreGran = (g: Gran) => (g === 'dia' ? 'Día' : g === 'mes' ? 'Mes' : 'Año');
    const contexto = (g: Gran) => {
        if (g === 'anio') return 'promedio de los meses';
        if (g === 'mes') return todosLosAnios ? 'todos los años' : aniosVista.join(', ');
        if (unSoloMes && !filtroDiario) return `${MESES[meses[0] - 1]} ${anios[0]}`;
        return diasSel.length ? `${diasSel.length} días` : semanas.length ? `${semanas.length === 1 ? opcionesSemana.find(s => s.value === semanas[0])?.label : `${semanas.length} semanas`}` : '';
    };
    const tituloTendencia = (g: Gran) => {
        const ctx = contexto(g);
        const base = selCausa ? `% piezas con ${selCausa} por ${nombreGran(g)}` : `IFI por ${nombreGran(g)}`;
        return ctx ? `${base} (${ctx})` : base;
    };
    const colorPunto = (v: number) => (selCausa ? colorCausa.get(selCausa) || '#324354' : colorCalidad(v));
    // Periodo elegido en la otra gráfica: se resaltan los periodos que lo contienen o que están dentro de él
    const atenuar = (gran: Gran, key: string) => {
        if (!selPeriodo) return false;
        if (selPeriodo.gran === gran) return selPeriodo.key !== key;
        return !(key.startsWith(selPeriodo.key) || selPeriodo.key.startsWith(key));
    };

    const hayDatos = piezas.length > 0;
    const cargandoInicial = loading && !hayDatos;

    const kpis = [
        { titulo: '% Opaco', valor: `${resumen.pctOpaco.toFixed(1)} %`, estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Buenas', valor: resumen.piezasBuenas.toLocaleString('es-CO'), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Defectuosas', valor: resumen.piezasDefectuosas.toLocaleString('es-CO'), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Revisadas', valor: resumen.piezasRevisadas.toLocaleString('es-CO'), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Defectos', valor: resumen.cantidadDefectos.toLocaleString('es-CO'), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: '% Moldes', valor: `${resumen.pctMoldes.toFixed(1)} %`, estilo: 'bg-rose-50/70 border-rose-200 text-rose-900', tit: 'text-rose-800' },
        { titulo: 'DPU', valor: resumen.dpu.toFixed(1), estilo: 'bg-sky-600 border-sky-600 text-white', tit: 'text-sky-100' },
        { titulo: 'Calidad', valor: `${resumen.calidad.toFixed(1)} %`, estilo: 'bg-[#0084d1] border-[#0084d1] text-white', tit: 'text-sky-100' }
    ];

    const chips = [
        selPeriodo && { texto: nombrePeriodo(selPeriodo.gran, selPeriodo.key), quitar: () => setSelPeriodo(null) },
        selCausa && { texto: selCausa, quitar: () => setSelCausa(null) },
        selRef && { texto: selRef, quitar: () => setSelRef(null) }
    ].filter(Boolean) as { texto: string; quitar: () => void }[];

    return (
        // Alto de cada fila de gráficas según la pantalla: el recuadro de MS mide ≈ 810 px de pantalla con el zoom de 100 %
        <div className="space-y-2" style={{ ["--ms-h" as string]: "max(120px, calc((100dvh - 382px) / 2 - 12px))", ["--ms-h2" as string]: "max(140px, calc((100dvh - 382px) / 2 + 12px))" } as React.CSSProperties}>
            {/* Encabezado: título y vista a la izquierda; filtros estilo Power BI arriba a la derecha */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-slate-100 text-xs">
                {/* Título y selector de vista en la misma línea (compacto) */}
                <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Mármol Sintético (MS)</h2>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                        <button
                            onClick={() => setVista('html')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${vista === 'html' ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Tablero Dinámico</span>
                        </button>
                        {powerBiUrl && (
                            <button
                                onClick={() => setVista('powerbi')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${vista === 'powerbi' ? 'bg-[#0084d1] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Power BI</span>
                            </button>
                        )}
                    </div>
                </div>
                {vista === 'html' && (
                    <div className="flex flex-wrap items-start gap-2 w-full lg:w-auto">
                        <FiltroPbi titulo="Año" seleccion={anios.map(String)} opciones={aniosDisponibles.map(a => ({ value: String(a), label: String(a) }))} onChange={cambiarAnios} onBorrar={() => cambiarAnios([])} puedeBorrar={anios.length > 0} />
                        <FiltroPbi titulo="Mes" seleccion={meses.map(String)} opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={cambiarMeses} onBorrar={() => cambiarMeses([])} puedeBorrar={meses.length > 0} />
                        <FiltroPbi titulo="Semana" seleccion={semanasVista} opciones={opcionesSemana} onChange={cambiarSemanas} onBorrar={() => cambiarSemanas([])} puedeBorrar={semanasVista.length > 0} />
                        <FiltroPbi titulo="Día" seleccion={diasVista} opciones={opcionesDia} onChange={cambiarDias} onBorrar={() => cambiarDias([])} puedeBorrar={diasVista.length > 0} />
                    </div>
                )}
            </div>

            {vista === 'powerbi' && powerBiUrl ? (
                <div className="w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                    <iframe title="Power BI Calidad MS" src={powerBiUrl} className="w-full h-full border-0" allowFullScreen />
                </div>
            ) : (
                <>
                    {error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

                    {/* Selecciones activas en las gráficas */}
                    {chips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-bold text-slate-500">Filtrando por:</span>
                            {chips.map(c => (
                                <button key={c.texto} onClick={c.quitar} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#324354] text-white font-bold hover:bg-[#25323f]" title="Quitar este filtro">
                                    <span className="capitalize">{c.texto}</span> <X className="w-3 h-3" />
                                </button>
                            ))}
                            {chips.length > 1 && (
                                <button onClick={limpiarSelecciones} className="text-[11px] font-bold text-slate-500 hover:text-[#324354] underline">Quitar todo</button>
                            )}
                        </div>
                    )}

                    {/* Tarjetas KPI */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {kpis.map(k => (
                            <div key={k.titulo} className={`px-2.5 py-1.5 rounded-xl border shadow-2xs flex flex-col justify-between ${k.estilo}`}>
                                <span className={`text-[8px] font-bold uppercase truncate ${k.tit}`}>{k.titulo}</span>
                                <span className="text-sm sm:text-base font-black leading-tight mt-0.5">{cargandoInicial ? '…' : k.valor}</span>
                            </div>
                        ))}
                    </div>

                    {/* Pareto (lista + anillo) y detalle por referencia */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                        <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-col">
                            <div className="flex items-center justify-between mb-1.5">
                                <h3 className="text-xs sm:text-sm font-black text-slate-800">Pareto de causas</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                <div className="md:col-span-5 space-y-0.5 max-h-[var(--ms-h)] overflow-y-auto pr-1 scrollbar-thin">
                                    {pareto.map(d => {
                                        const activa = selCausa === d.name;
                                        return (
                                            <button
                                                key={d.name}
                                                onClick={() => alternarCausa(d.name)}
                                                className={`w-full flex items-center justify-between text-[11px] py-0.5 px-1 rounded border-b border-slate-100 text-left transition-opacity ${activa ? 'bg-slate-100 ring-1 ring-[#324354]' : 'hover:bg-slate-50'} ${selCausa && !activa ? 'opacity-40' : ''}`}
                                            >
                                                <span className="flex items-center gap-1.5 truncate mr-1.5">
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorCausa.get(d.name) }} />
                                                    <span className="truncate text-slate-700 font-medium">{d.name}</span>
                                                </span>
                                                <span className="text-right flex-shrink-0 font-mono text-[10px]">
                                                    <span className="font-bold text-slate-900">{d.cantidad}</span>
                                                    <span className="text-slate-400 ml-0.5">({d.pct}%)</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {!pareto.length && <p className="text-xs text-slate-400 py-6 text-center">{cargandoInicial ? 'Cargando…' : 'Sin defectos en el periodo.'}</p>}
                                </div>
                                {/* Anillo grande: sube hasta la línea del título para usar todo el alto del recuadro */}
                                <div
                                    className="md:col-span-7 h-[var(--ms-h)] md:h-[calc(var(--ms-h)+28px)] md:-mt-7"
                                    onClick={() => { if (!clicAnillo.consumir()) setSelCausa(null); }}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 14, right: 40, bottom: 14, left: 40 }}>
                                            <Pie
                                                data={anillo}
                                                dataKey="cantidad"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="100%"
                                                paddingAngle={1.5}
                                                label={etiquetaPorcion}
                                                labelLine={false}
                                                isAnimationActive={false}
                                                cursor="pointer"
                                                onClick={(d: any) => {
                                                    const nombre = d?.payload?.name ?? d?.name;
                                                    if (!clicAnillo.tomar() || !nombre || String(nombre).startsWith('Otras (')) return;
                                                    alternarCausa(nombre);
                                                }}
                                            >
                                                {anillo.map(a => (
                                                    <Cell key={a.name} fill={a.color} fillOpacity={causaEnAnillo && causaEnAnillo !== a.name ? 0.25 : 1} stroke="#fff" />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any, name: any, item: any) => [`${value} piezas (${item?.payload?.pct}%)`, name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-col">
                            {/* Título y controles en una sola línea (compacto) */}
                            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-1.5">
                                <h3 className="text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap shrink-0">Detalle por Referencia</h3>
                                {/* El buscador toma el ancho que sobra en la línea del título */}
                                <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                                    <label className="flex items-center gap-1 font-bold text-slate-600 cursor-pointer text-[9px] whitespace-nowrap shrink-0">
                                        <input type="checkbox" checked={verTotal} onChange={e => setVerTotal(e.target.checked)} className="w-3 h-3 rounded cursor-pointer" />
                                        Total piezas
                                    </label>
                                    <label className="flex items-center gap-1 font-bold text-slate-600 cursor-pointer text-[9px] whitespace-nowrap shrink-0">
                                        <input type="checkbox" checked={verReparacion} onChange={e => setVerReparacion(e.target.checked)} className="w-3 h-3 rounded cursor-pointer" />
                                        Reparación
                                    </label>
                                    <div className="relative flex-1 min-w-[80px] max-w-[160px]">
                                        <Search className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={refSearch}
                                            onChange={e => setRefSearch(e.target.value)}
                                            className="w-full pl-5 pr-1.5 py-0.5 text-[9px] bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#324354]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-y-auto max-h-[var(--ms-h)] scrollbar-thin text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 text-[10px] border-b border-slate-200">
                                        <tr>
                                            <th className="py-1 px-1.5">Referencia</th>
                                            <th className="py-1 px-1.5 text-right">{selCausa ? 'Con la causa' : 'Piezas Def.'}</th>
                                            {verTotal && <th className="py-1 px-1.5 text-right">Total Piezas</th>}
                                            {verReparacion && <th className="py-1 px-1.5 text-right">Reparación</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {referenciasVisibles.map(ref => {
                                            const abierta = !!expandedRefs[ref.referencia];
                                            const activa = selRef === ref.referencia;
                                            return (
                                                <React.Fragment key={ref.referencia}>
                                                    <tr
                                                        onClick={() => setSelRef(prev => (prev === ref.referencia ? null : ref.referencia))}
                                                        className={`cursor-pointer font-bold text-slate-800 transition-all ${activa ? 'bg-slate-100 outline outline-1 outline-[#324354]' : 'hover:bg-slate-50'} ${selRef && !activa ? 'opacity-40' : ''}`}
                                                        title={activa ? 'Quitar el filtro de esta referencia' : 'Filtrar las gráficas por esta referencia'}
                                                    >
                                                        <td className="py-1 px-1.5">
                                                            <span className="flex items-center gap-1">
                                                                <span
                                                                    role="button"
                                                                    onClick={e => { e.stopPropagation(); setExpandedRefs(prev => ({ ...prev, [ref.referencia]: !prev[ref.referencia] })); }}
                                                                    className="p-0.5 rounded hover:bg-slate-200"
                                                                    title={abierta ? 'Ocultar defectos' : 'Ver defectos'}
                                                                >
                                                                    {abierta ? <ChevronDown className="w-3 h-3 text-blue-600" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                                </span>
                                                                <span className="truncate">{ref.referencia}</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-1 px-1.5 text-right font-black text-slate-900">{ref.piezasDefectuosas}</td>
                                                        {verTotal && <td className="py-1 px-1.5 text-right text-slate-600">{ref.totalPiezas}</td>}
                                                        {verReparacion && <td className="py-1 px-1.5 text-right text-slate-600">{ref.reparacion}</td>}
                                                    </tr>
                                                    {abierta && ref.subdefectos.map(s => (
                                                        <tr key={s.name} className="bg-slate-50/80 text-[10px] text-slate-600">
                                                            <td className="py-0.5 pl-6 pr-1.5 border-l-2 border-blue-400 truncate">• {s.name}</td>
                                                            <td className="py-0.5 px-1.5 text-right font-bold text-slate-800">{s.piezasDefectuosas}</td>
                                                            {verTotal && <td className="py-0.5 px-1.5 text-right">{s.totalPiezas}</td>}
                                                            {verReparacion && <td className="py-0.5 px-1.5 text-right">{s.reparacion}</td>}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {!referenciasVisibles.length && <p className="text-xs text-slate-400 py-6 text-center">{cargandoInicial ? 'Cargando…' : 'Sin referencias.'}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Tendencias: clic en un punto o columna filtra las demás gráficas; otro clic o clic por fuera lo quita */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                        <div
                            className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200"
                            onClick={() => { if (!clicPrincipal.consumir() && selPeriodo?.gran === granPrincipal) setSelPeriodo(null); }}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <h3 className="text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{tituloTendencia(granPrincipal)}</h3>
                            </div>
                            <div className="h-[var(--ms-h2)] w-full">
                                {cargandoInicial ? (
                                    <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                                ) : columnasPrincipal.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">Sin datos para los filtros elegidos.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={columnasPrincipal}
                                            margin={{ top: 22, right: 16, left: selCausa ? 0 : 62, bottom: 0 }}
                                            onClick={(e: any) => {
                                                const col = columnaDeClic(e, columnasPrincipal);
                                                if (col && clicPrincipal.tomar()) alternarPeriodo(granPrincipal, col.key);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                            <YAxis
                                                domain={selCausa ? [0, (max: number) => Math.min(100, Math.ceil((max * 1.2) / 5) * 5 || 5)] : [(min: number) => Math.max(0, Math.min(60, Math.floor(min / 10) * 10)), 100]}
                                                tick={{ fontSize: 10 }}
                                                width={32}
                                            />
                                            <Tooltip content={<TooltipTendencia gran={granPrincipal} causa={selCausa} />} />
                                            {!selCausa && (
                                                <ReferenceLine y={META_MS} stroke="#3b8f50" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta ${META_MS}%`, fill: '#3b8f50', fontSize: 10, fontWeight: 800, position: 'left', offset: 36 }} />
                                            )}
                                            <Line
                                                type="monotone"
                                                dataKey="valor"
                                                stroke={selCausa ? colorCausa.get(selCausa) || '#324354' : '#0284c7'}
                                                strokeWidth={2}
                                                isAnimationActive={false}
                                                dot={(props: any) => {
                                                    const c: Columna = props.payload;
                                                    const tenue = atenuar(granPrincipal, c.key);
                                                    const elegido = selPeriodo?.gran === granPrincipal && selPeriodo.key === c.key;
                                                    return (
                                                        <circle key={c.key} cx={props.cx} cy={props.cy} r={elegido ? 6 : 4} fill={colorPunto(c.valor)} fillOpacity={tenue ? 0.3 : 1} stroke="#fff" strokeWidth={1.5} />
                                                    );
                                                }}
                                                activeDot={{ r: 6 }}
                                            >
                                                {/* Con muchos puntos los valores se alternan arriba y abajo para no superponerse */}
                                                <LabelList
                                                    dataKey="valor"
                                                    content={(p: any) => {
                                                        if (p.value == null) return null;
                                                        const abajo = columnasPrincipal.length > 12 && p.index % 2 === 1;
                                                        return (
                                                            <text x={p.x} y={abajo ? p.y + 14 : p.y - 8} textAnchor="middle" fontSize={9} fontWeight={800} fill="#334155">
                                                                {`${Number(p.value).toFixed(1)}%`}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            </Line>
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div
                            className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200"
                            onClick={() => { if (!clicSecundaria.consumir() && selPeriodo?.gran === granSecundaria) setSelPeriodo(null); }}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <h3 className="text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{tituloTendencia(granSecundaria)}</h3>
                                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]" onClick={e => e.stopPropagation()}>
                                    {([['mes', 'Por mes'], ['anio', 'Promedio por año']] as const).map(([g, txt]) => (
                                        <button
                                            key={g}
                                            onClick={() => { setVistaSec(g); if (selPeriodo?.gran === granSecundaria) setSelPeriodo(null); }}
                                            className={`px-2 py-0.5 rounded-md font-bold transition-all ${granSecundaria === g ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}
                                        >
                                            {txt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[var(--ms-h2)] w-full">
                                {cargandoInicial ? (
                                    <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                                ) : columnasSecundaria.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">Sin datos.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={columnasSecundaria}
                                            margin={{ top: 22, right: 8, left: selCausa ? 0 : 62, bottom: 0 }}
                                            onClick={(e: any) => {
                                                const col = columnaDeClic(e, columnasSecundaria);
                                                if (col && clicSecundaria.tomar()) alternarPeriodo(granSecundaria, col.key);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                            <YAxis domain={selCausa ? [0, (max: number) => Math.min(100, Math.ceil((max * 1.2) / 5) * 5 || 5)] : [(min: number) => Math.max(0, Math.min(60, Math.floor(min / 10) * 10)), 100]} tick={{ fontSize: 10 }} width={32} />
                                            <Tooltip content={<TooltipTendencia gran={granSecundaria} causa={selCausa} />} cursor={{ fill: '#f1f5f9' }} />
                                            {!selCausa && (
                                                <ReferenceLine y={META_MS} stroke="#3b8f50" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta ${META_MS}%`, fill: '#3b8f50', fontSize: 10, fontWeight: 800, position: 'left', offset: 36 }} />
                                            )}
                                            <Bar
                                                dataKey="valor"
                                                radius={[4, 4, 0, 0]}
                                                cursor="pointer"
                                                isAnimationActive={false}
                                                onClick={(item: any) => {
                                                    const key = item?.payload?.key || item?.key;
                                                    if (key && clicSecundaria.tomar()) alternarPeriodo(granSecundaria, key);
                                                }}
                                            >
                                                {columnasSecundaria.map(c => {
                                                    // Por mes con un solo mes filtrado arriba: los demás meses quedan tenues
                                                    // Periodos fuera de los filtros de arriba quedan tenues
                                                    const fueraDelFiltro = granSecundaria === 'mes'
                                                        ? meses.length > 0 && !meses.includes(Number(c.key.slice(5, 7)))
                                                        : anios.length > 0 && !anios.includes(Number(c.key));
                                                    const tenue = selPeriodo ? atenuar(granSecundaria, c.key) : fueraDelFiltro;
                                                    return <Cell key={c.key} fill={colorPunto(c.valor)} fillOpacity={tenue ? 0.3 : 1} />;
                                                })}
                                                <LabelList
                                                    dataKey="valor"
                                                    position="top"
                                                    formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                                                    style={{ fontSize: 9, fontWeight: 800, fill: '#334155' }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
