'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { supabase } from '@/lib/supabase';
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi';
import RegistrarSaldoModal from '@/components/calidad/RegistrarSaldoModal';
import { COLOR_TIPO_SD, CostoSku, EventoSD, NOMBRE_TIPO_SD, PLANTAS_SD, TipoSD, cargarEventosSD } from '@/lib/calidad/saldosDestrucciones';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const PARETO_COLORS = [
    '#008080', '#e06634', '#0284c7', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6',
    '#84cc16', '#a855f7'
];
const COLOR_OTROS = '#cbd5e1';
const CAUSAS_EN_ANILLO = 12;
const COLOR_ACUMULADO = '#f59e0b';

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaCorta = (f: string) => f.split('-').reverse().join('/');

type Gran = 'dia' | 'mes' | 'anio';
type Medida = 'costo' | 'pzs';
type FiltroTipo = 'todos' | TipoSD;
interface Columna { key: string; label: string; saldo: number; destruccion: number; total: number; acumulado: number; meses?: number }
interface SelPeriodo { gran: Gran; key: string }

const clavePeriodo = (e: EventoSD, gran: Gran) => (gran === 'dia' ? e.fecha : gran === 'mes' ? e.fecha.slice(0, 7) : e.fecha.slice(0, 4));
const nombrePeriodo = (gran: Gran, key: string) => {
    if (gran === 'anio') return `Año ${key}`;
    if (gran === 'mes') return `${MESES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
    return fechaCorta(key);
};

// Formato de valores: pesos completos o compactos ($7,6 M / $352 mil) y piezas
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const compacto = (n: number, medida: Medida) => {
    if (medida === 'pzs') return Math.round(n).toLocaleString('es-CO');
    const a = Math.abs(n);
    if (a >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
    if (a >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`;
    return `$${Math.round(n)}`;
};

// Clic en una gráfica de Recharts: puede llegar por la barra y por la gráfica a la vez; se procesa una sola vez
function useClicUnico() {
    const ultimo = useRef(0);
    const marcado = useRef(false);
    return {
        tomar: () => {
            marcado.current = true;
            const ahora = Date.now();
            if (ahora - ultimo.current < 150) return false;
            ultimo.current = ahora;
            return true;
        },
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

const TooltipPeriodo = ({ active, payload, gran, medida }: any) => {
    if (!active || !payload?.length) return null;
    const c: Columna = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 text-[11px] min-w-[190px]">
            <p className="font-black text-slate-800 capitalize mb-1">{nombrePeriodo(gran, c.key)}</p>
            <p className="font-bold" style={{ color: COLOR_TIPO_SD.saldo }}>Saldos: {medida === 'costo' ? pesos(c.saldo) : `${c.saldo} pzs`}</p>
            <p className="font-bold" style={{ color: COLOR_TIPO_SD.destruccion }}>Destrucciones: {medida === 'costo' ? pesos(c.destruccion) : `${c.destruccion} pzs`}</p>
            <p className="font-black text-slate-800">Total: {medida === 'costo' ? pesos(c.total) : `${c.total} pzs`}</p>
            {c.meses != null ? (
                <p className="text-slate-500">Promedio de {c.meses} mes(es) con dato</p>
            ) : (
                <p className="text-slate-500">Acumulado: {medida === 'costo' ? pesos(c.acumulado) : `${c.acumulado} pzs`}</p>
            )}
        </div>
    );
};

// Saldos y destrucciones: tablero dinámico con el mismo diseño de Mármol Sintético (filtros Año/Mes/Semana/Día,
// filtro cruzado y 4 gráficas: diaria con acumulado, mensual/anual, Pareto de causas y detalle de piezas)
export default function CalidadSaldosDashboard() {
    const hoy = hoyBogota();
    const anioActual = Number(hoy.slice(0, 4));
    const mesActual = Number(hoy.slice(5, 7));

    const [medida, setMedida] = useState<Medida>('costo');
    const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
    const [vistaSec, setVistaSec] = useState<'mes' | 'anio'>('mes');

    // Filtros de selección múltiple (lista vacía = "Todas"). Al abrir: año y mes en curso.
    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([mesActual]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);

    // Selecciones cruzadas (clic en un elemento filtra las demás gráficas; otro clic lo quita)
    const [selPeriodo, setSelPeriodo] = useState<SelPeriodo | null>(null);
    const [selCausa, setSelCausa] = useState<string | null>(null);
    const [selRef, setSelRef] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');

    const [plantasSel, setPlantasSel] = useState<string[]>([]);
    const [eventos, setEventos] = useState<EventoSD[]>([]);
    const [costos, setCostos] = useState<CostoSku[]>([]);
    const [avisos, setAvisos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [registrando, setRegistrando] = useState(false);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let vivo = true;
        setLoading(true);
        cargarEventosSD(supabase)
            .then(d => { if (vivo) { setEventos(d.eventos); setCostos(d.costos); setAvisos(d.avisos); setError(null); } })
            .catch(e => { if (vivo) setError(e?.message || 'No se pudieron cargar los saldos y destrucciones'); })
            .finally(() => { if (vivo) setLoading(false); });
        return () => { vivo = false; };
    }, [recarga]);

    const valor = (e: EventoSD) => (medida === 'costo' ? e.costo : e.cantidad);
    const fmt = (n: number) => compacto(n, medida);

    const aniosDisponibles = useMemo(() => {
        const s = new Set(eventos.map(e => Number(e.fecha.slice(0, 4))));
        s.add(anioActual);
        return [...s].sort((a, b) => b - a);
    }, [eventos, anioActual]);
    const todosLosAnios = anios.length === 0;
    const variosAnios = (todosLosAnios ? aniosDisponibles.length : anios.length) > 1;
    const unSoloMes = anios.length === 1 && meses.length === 1;
    const filtroDiario = semanas.length > 0 || diasSel.length > 0;
    const granPrincipal: Gran = todosLosAnios && !filtroDiario ? 'anio' : unSoloMes || filtroDiario ? 'dia' : 'mes';

    // Eventos en cascada: Planta y Tipo → Año → Mes → Semana → Día
    const plantasConDatos = useMemo(() => PLANTAS_SD.filter(p => eventos.some(e => e.planta === p.codigo)), [eventos]);
    const porTipo = useMemo(
        () => eventos.filter(e => (filtroTipo === 'todos' || e.tipo === filtroTipo) && (!plantasSel.length || plantasSel.includes(e.planta))),
        [eventos, filtroTipo, plantasSel]
    );
    const eventosAnios = useMemo(() => (todosLosAnios ? porTipo : porTipo.filter(e => anios.includes(Number(e.fecha.slice(0, 4))))), [porTipo, anios, todosLosAnios]);
    const eventosMes = useMemo(() => (meses.length ? eventosAnios.filter(e => meses.includes(Number(e.fecha.slice(5, 7)))) : eventosAnios), [eventosAnios, meses]);
    const eventosSemana = useMemo(() => (semanas.length ? eventosMes.filter(e => semanas.includes(semanaIso(e.fecha).clave)) : eventosMes), [eventosMes, semanas]);
    const filtrados = useMemo(() => (diasSel.length ? eventosSemana.filter(e => diasSel.includes(e.fecha)) : eventosSemana), [eventosSemana, diasSel]);

    // Filtros cruzados
    const enPeriodo = (e: EventoSD) => !selPeriodo || clavePeriodo(e, selPeriodo.gran) === selPeriodo.key;
    const conCausa = (e: EventoSD) => !selCausa || e.causa === selCausa;
    const enRef = (e: EventoSD) => !selRef || e.referencia === selRef;

    // Tarjetas: todo lo elegido
    const eventosKpi = useMemo(() => filtrados.filter(e => enPeriodo(e) && conCausa(e) && enRef(e)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtrados, selPeriodo, selCausa, selRef]);

    // Pareto de causas: periodo y referencia (la causa elegida se resalta)
    const pareto = useMemo(() => {
        const m = new Map<string, number>();
        filtrados.filter(e => enPeriodo(e) && enRef(e)).forEach(e => m.set(e.causa, (m.get(e.causa) || 0) + valor(e)));
        const total = [...m.values()].reduce((a, b) => a + b, 0);
        let acum = 0;
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, cantidad]) => {
            acum += cantidad;
            return { name, cantidad, pct: total ? Math.round((cantidad / total) * 1000) / 10 : 0, pctAcum: total ? Math.round((acum / total) * 1000) / 10 : 0 };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtrados, selPeriodo, selRef, medida]);
    const colorCausa = useMemo(() => {
        const m = new Map<string, string>();
        pareto.forEach((c, i) => m.set(c.name, i < CAUSAS_EN_ANILLO ? PARETO_COLORS[i % PARETO_COLORS.length] : COLOR_OTROS));
        return m;
    }, [pareto]);
    const anillo = useMemo(() => {
        const top = pareto.slice(0, CAUSAS_EN_ANILLO).map(c => ({ ...c, color: colorCausa.get(c.name)! }));
        const resto = pareto.slice(CAUSAS_EN_ANILLO);
        if (resto.length) {
            top.push({ name: `Otras (${resto.length})`, cantidad: resto.reduce((a, c) => a + c.cantidad, 0), pct: Math.round(resto.reduce((a, c) => a + c.pct, 0) * 10) / 10, pctAcum: 100, color: COLOR_OTROS });
        }
        return top;
    }, [pareto, colorCausa]);
    const causaEnAnillo = selCausa && anillo.some(a => a.name === selCausa) ? selCausa : selCausa ? anillo[anillo.length - 1]?.name : null;

    // Detalle de piezas: periodo y causa (la referencia elegida se resalta)
    const detalle = useMemo(() => {
        const q = busqueda.trim().toUpperCase();
        return filtrados
            .filter(e => enPeriodo(e) && conCausa(e))
            .filter(e => !q || e.referencia.includes(q) || e.causa.includes(q) || e.sku.includes(q) || e.responsable.includes(q))
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.costo - a.costo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtrados, selPeriodo, selCausa, busqueda]);

    // Columnas de las gráficas de tiempo (saldo y destrucción apilados + acumulado)
    const columnasDe = (lista: EventoSD[], gran: Gran): Columna[] => {
        const grupos = new Map<string, { saldo: number; destruccion: number }>();
        lista.forEach(e => {
            const k = clavePeriodo(e, gran);
            const g = grupos.get(k) || { saldo: 0, destruccion: 0 };
            g[e.tipo] += valor(e);
            grupos.set(k, g);
        });
        const aniosEnDatos = new Set(lista.map(e => e.fecha.slice(0, 4))).size > 1;
        let acum = 0;
        return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, g]) => {
            const total = g.saldo + g.destruccion;
            acum += total;
            const label = gran === 'anio'
                ? key
                : gran === 'mes'
                    ? `${MESES[Number(key.slice(5, 7)) - 1].slice(0, 3)}${aniosEnDatos ? ` ${key.slice(2, 4)}` : ''}`
                    : unSoloMes ? String(Number(key.slice(8, 10))) : `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`;
            return { key, label, saldo: g.saldo, destruccion: g.destruccion, total, acumulado: acum };
        });
    };
    // Promedio mensual de cada año
    const promedioAnual = (lista: EventoSD[]): Columna[] => {
        const porAnio = new Map<string, Columna[]>();
        columnasDe(lista, 'mes').forEach(c => porAnio.set(c.key.slice(0, 4), [...(porAnio.get(c.key.slice(0, 4)) || []), c]));
        let acum = 0;
        return [...porAnio.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([a, cols]) => {
            const n = cols.length;
            const saldo = cols.reduce((x, c) => x + c.saldo, 0) / n;
            const destruccion = cols.reduce((x, c) => x + c.destruccion, 0) / n;
            acum += saldo + destruccion;
            return { key: a, label: a, saldo, destruccion, total: saldo + destruccion, acumulado: acum, meses: n };
        });
    };

    const columnasPrincipal = useMemo(() => columnasDe(filtrados.filter(e => conCausa(e) && enRef(e)), granPrincipal),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtrados, selCausa, selRef, granPrincipal, medida, unSoloMes]);
    const columnasSecundaria = useMemo(() => {
        const base = (vistaSec === 'anio' ? porTipo : eventosAnios).filter(e => conCausa(e) && enRef(e));
        return vistaSec === 'anio' ? promedioAnual(base) : columnasDe(base, 'mes');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [porTipo, eventosAnios, selCausa, selRef, vistaSec, medida]);
    const granSecundaria: Gran = vistaSec;

    // Las selecciones que dejan de existir al cambiar filtros se quitan
    useEffect(() => {
        if (selPeriodo && ![...columnasPrincipal, ...columnasSecundaria].some(c => c.key === selPeriodo.key)) setSelPeriodo(null);
    }, [columnasPrincipal, columnasSecundaria, selPeriodo]);

    const limpiarSelecciones = () => { setSelPeriodo(null); setSelCausa(null); setSelRef(null); };
    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanas([]); setDiasSel([]); limpiarSelecciones(); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanas([]); setDiasSel([]); limpiarSelecciones(); };
    const cambiarSemanas = (v: string[]) => { setSemanas(v); setDiasSel([]); limpiarSelecciones(); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); limpiarSelecciones(); };
    // Día elegido en la gráfica: se refleja en los filtros Semana y Día
    const diaSel = selPeriodo?.gran === 'dia' ? selPeriodo.key : null;
    const semanasVista = diaSel ? [semanaIso(diaSel).clave] : semanas;
    const diasVista = diaSel ? [diaSel] : diasSel;

    const opcionesSemana = useMemo(() => {
        const mapa = new Map<string, { anio: number; semana: number }>();
        eventosMes.forEach(e => { const s = semanaIso(e.fecha); mapa.set(s.clave, s); });
        return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([clave, s]) => ({ value: clave, label: `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}` }));
    }, [eventosMes, variosAnios]);
    const opcionesDia = useMemo(() => {
        const fechas = [...new Set(eventosSemana.map(e => e.fecha))].sort();
        return fechas.map(f => ({ value: f, label: unSoloMes ? String(Number(f.slice(8, 10))) : fechaCorta(f).slice(0, variosAnios ? 10 : 5) }));
    }, [eventosSemana, unSoloMes, variosAnios]);

    const clicPrincipal = useClicUnico();
    const clicSecundaria = useClicUnico();
    const clicAnillo = useClicUnico();
    // Clic en un mes o un año: cambia los filtros de arriba (otro clic lo quita). Un día solo se resalta.
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
        if (soloAnio && meses.length === 1 && meses[0] === m) setMeses([]);
        else { setAnios([y]); setMeses([m]); }
    };
    const columnaDeClic = (e: any, cols: Columna[]) => {
        const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
        return Number.isInteger(idx) ? cols[idx] : cols.find(c => c.label === String(e?.activeLabel));
    };
    const atenuar = (gran: Gran, key: string) => {
        if (!selPeriodo) return false;
        if (selPeriodo.gran === gran) return selPeriodo.key !== key;
        return !(key.startsWith(selPeriodo.key) || selPeriodo.key.startsWith(key));
    };

    const nombreGran = (g: Gran) => (g === 'dia' ? 'Día' : g === 'mes' ? 'Mes' : 'Año');
    const contexto = (g: Gran) => {
        if (g === 'anio') return 'promedio mensual';
        if (g === 'mes') return todosLosAnios ? 'todos los años' : [...anios].sort().join(', ');
        if (unSoloMes && !filtroDiario) return `${MESES[meses[0] - 1]} ${anios[0]}`;
        return diasSel.length ? `${diasSel.length} días` : semanas.length ? `${semanas.length} semana(s)` : '';
    };
    const tituloTiempo = (g: Gran) => {
        const ctx = contexto(g);
        const base = `${selCausa ? `${selCausa} · ` : ''}Saldos y destrucciones por ${nombreGran(g)}`;
        return ctx ? `${base} (${ctx})` : base;
    };

    // Tarjetas
    const suma = (lista: EventoSD[], f: (e: EventoSD) => number) => lista.reduce((a, e) => a + f(e), 0);
    const saldos = eventosKpi.filter(e => e.tipo === 'saldo');
    const destrucciones = eventosKpi.filter(e => e.tipo === 'destruccion');
    const costoTotal = suma(eventosKpi, e => e.costo);
    const pzsTotal = suma(eventosKpi, e => e.cantidad);
    const causaPrincipal = (() => {
        const m = new Map<string, number>();
        eventosKpi.forEach(e => m.set(e.causa, (m.get(e.causa) || 0) + valor(e)));
        return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    })();
    const cargandoInicial = loading && eventos.length === 0;
    const kpis = [
        { titulo: 'Piezas', valor: pzsTotal.toLocaleString('es-CO'), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Costo total', valor: pesos(costoTotal), estilo: 'bg-white border-slate-200 text-slate-900', tit: 'text-slate-500' },
        { titulo: 'Saldos (pzs)', valor: suma(saldos, e => e.cantidad).toLocaleString('es-CO'), estilo: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', tit: 'text-emerald-800' },
        { titulo: 'Saldos ($)', valor: pesos(suma(saldos, e => e.costo)), estilo: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', tit: 'text-emerald-800' },
        { titulo: 'Destrucciones (pzs)', valor: suma(destrucciones, e => e.cantidad).toLocaleString('es-CO'), estilo: 'bg-rose-50/70 border-rose-200 text-rose-900', tit: 'text-rose-800' },
        { titulo: 'Destrucciones ($)', valor: pesos(suma(destrucciones, e => e.costo)), estilo: 'bg-rose-50/70 border-rose-200 text-rose-900', tit: 'text-rose-800' },
        { titulo: '% Destrucción', valor: `${(medida === 'costo' ? (costoTotal ? (suma(destrucciones, e => e.costo) / costoTotal) * 100 : 0) : (pzsTotal ? (suma(destrucciones, e => e.cantidad) / pzsTotal) * 100 : 0)).toFixed(1)} %`, estilo: 'bg-sky-600 border-sky-600 text-white', tit: 'text-sky-100' },
        { titulo: 'Causa principal', valor: causaPrincipal, estilo: 'bg-[#0084d1] border-[#0084d1] text-white', tit: 'text-sky-100', largo: true }
    ];

    const chips = [
        selPeriodo && { texto: nombrePeriodo(selPeriodo.gran, selPeriodo.key), quitar: () => setSelPeriodo(null) },
        selCausa && { texto: selCausa.toLowerCase(), quitar: () => setSelCausa(null) },
        selRef && { texto: selRef.toLowerCase(), quitar: () => setSelRef(null) }
    ].filter(Boolean) as { texto: string; quitar: () => void }[];

    // Barras apiladas de saldo y destrucción (con el tipo filtrado, solo una)
    const tiposVisibles: TipoSD[] = filtroTipo === 'todos' ? ['saldo', 'destruccion'] : [filtroTipo];
    // Con muchas columnas el valor va en una de cada dos para que no se monten
    const etiquetaTotal = (cols: Columna[]) => (p: any) => {
        const c = cols[p.index];
        if (!c || !c.total) return null;
        if (cols.length > 16 && p.index % 2 === 1) return null;
        return <text x={p.x + p.width / 2} y={p.y - 5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#334155">{fmt(c.total)}</text>;
    };
    // Barras: la de arriba de la pila lleva la etiqueta del total
    const barras = (cols: Columna[], gran: Gran, clic: ReturnType<typeof useClicUnico>, tenueFiltro?: (c: Columna) => boolean) =>
        tiposVisibles.map((t, i) => (
            <Bar
                key={t}
                dataKey={t}
                stackId="sd"
                name={NOMBRE_TIPO_SD[t]}
                fill={COLOR_TIPO_SD[t]}
                radius={i === tiposVisibles.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                isAnimationActive={false}
                cursor="pointer"
                onClick={(item: any) => {
                    const key = item?.payload?.key || item?.key;
                    if (key && clic.tomar()) alternarPeriodo(gran, key);
                }}
            >
                {cols.map(c => {
                    const tenue = selPeriodo ? atenuar(gran, c.key) : tenueFiltro ? tenueFiltro(c) : false;
                    return <Cell key={c.key} fillOpacity={tenue ? 0.3 : 1} />;
                })}
                {i === tiposVisibles.length - 1 && <LabelList dataKey="total" content={etiquetaTotal(cols)} />}
            </Bar>
        ));

    return (
        // Alto de cada fila según la pantalla: el recuadro mide ≈ 810 px de pantalla con el zoom de 100 % (como Mármol Sintético)
        <div className="space-y-2" style={{ ["--sd-h" as string]: "max(120px, calc((100dvh - 382px) / 2 - 12px))", ["--sd-h2" as string]: "max(140px, calc((100dvh - 382px) / 2 + 12px))" } as React.CSSProperties}>
            {/* Encabezado: título, medida y tipo a la izquierda; filtros estilo Power BI arriba a la derecha */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-slate-100 text-xs">
                <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-base sm:text-lg font-black text-[#324354]">Saldos y Destrucciones</h2>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                        {([['costo', '$ Costo'], ['pzs', 'Piezas']] as const).map(([m, txt]) => (
                            <button key={m} onClick={() => setMedida(m)} className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${medida === m ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}>
                                {txt}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                        {([['todos', 'Todos'], ['saldo', 'Saldos'], ['destruccion', 'Destrucciones']] as const).map(([t, txt]) => (
                            <button
                                key={t}
                                onClick={() => { setFiltroTipo(t); limpiarSelecciones(); }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${filtroTipo === t ? 'bg-white text-[#324354] shadow-xs' : 'text-slate-600 hover:text-black'}`}
                            >
                                {t !== 'todos' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_TIPO_SD[t] }} />}
                                {txt}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setRegistrando(true)}
                        className="px-2.5 py-1 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        title="Registrar un saldo o destrucción de FV, Muebles, CEFI, Cuarzo o RTM (MS llega automático desde Calidad MS)"
                    >
                        <Plus className="w-3.5 h-3.5" /> Registrar
                    </button>
                </div>
                <div className="flex flex-wrap items-start gap-2 w-full lg:w-auto">
                    <FiltroPbi titulo="Planta" seleccion={plantasSel} opciones={plantasConDatos.map(p => ({ value: p.codigo, label: `${p.codigo} · ${p.nombre}` }))} onChange={v => { setPlantasSel(v); limpiarSelecciones(); }} onBorrar={() => setPlantasSel([])} puedeBorrar={plantasSel.length > 0} />
                    <FiltroPbi titulo="Año" seleccion={anios.map(String)} opciones={aniosDisponibles.map(a => ({ value: String(a), label: String(a) }))} onChange={cambiarAnios} onBorrar={() => cambiarAnios([])} puedeBorrar={anios.length > 0} />
                    <FiltroPbi titulo="Mes" seleccion={meses.map(String)} opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={cambiarMeses} onBorrar={() => cambiarMeses([])} puedeBorrar={meses.length > 0} />
                    <FiltroPbi titulo="Semana" seleccion={semanasVista} opciones={opcionesSemana} onChange={cambiarSemanas} onBorrar={() => cambiarSemanas([])} puedeBorrar={semanasVista.length > 0} />
                    <FiltroPbi titulo="Día" seleccion={diasVista} opciones={opcionesDia} onChange={cambiarDias} onBorrar={() => cambiarDias([])} puedeBorrar={diasVista.length > 0} />
                </div>
            </div>

            {error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            {avisos.map(a => <div key={a} className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{a}</div>)}

            {registrando && (
                <RegistrarSaldoModal
                    costos={costos}
                    causasConocidas={[...new Set(eventos.map(e => e.causa))].sort()}
                    onCerrar={() => setRegistrando(false)}
                    onGuardado={() => { setRegistrando(false); setRecarga(n => n + 1); }}
                />
            )}

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-slate-500">Filtrando por:</span>
                    {chips.map(c => (
                        <button key={c.texto} onClick={c.quitar} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#324354] text-white font-bold hover:bg-[#25323f]" title="Quitar este filtro">
                            <span className="capitalize">{c.texto}</span> <X className="w-3 h-3" />
                        </button>
                    ))}
                    {chips.length > 1 && <button onClick={limpiarSelecciones} className="text-[11px] font-bold text-slate-500 hover:text-[#324354] underline">Quitar todo</button>}
                </div>
            )}

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {kpis.map(k => (
                    <div key={k.titulo} className={`px-2.5 py-1.5 rounded-xl border shadow-2xs flex flex-col justify-between min-w-0 ${k.estilo}`}>
                        <span className={`text-[8px] font-bold uppercase truncate ${k.tit}`}>{k.titulo}</span>
                        <span className={`font-black leading-tight mt-0.5 truncate ${k.largo ? 'text-[11px] capitalize' : 'text-sm sm:text-base'}`} title={k.largo ? k.valor : undefined}>
                            {cargandoInicial ? '…' : k.largo ? k.valor.toLowerCase() : k.valor}
                        </span>
                    </div>
                ))}
            </div>

            {/* Fila 1: diaria con acumulado y mensual / promedio por año */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                <div
                    className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200"
                    onClick={() => { if (!clicPrincipal.consumir() && selPeriodo?.gran === granPrincipal) setSelPeriodo(null); }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{tituloTiempo(granPrincipal)}</h3>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><span className="w-3 h-0.5" style={{ backgroundColor: COLOR_ACUMULADO }} /> Acumulado</span>
                    </div>
                    <div className="h-[var(--sd-h2)] w-full">
                        {cargandoInicial ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : columnasPrincipal.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">Sin eventos para los filtros elegidos.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={columnasPrincipal}
                                    margin={{ top: 18, right: 4, left: 0, bottom: 0 }}
                                    onClick={(e: any) => {
                                        const col = columnaDeClic(e, columnasPrincipal);
                                        if (col && clicPrincipal.tomar()) alternarPeriodo(granPrincipal, col.key);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="izq" tick={{ fontSize: 9 }} width={54} tickFormatter={v => fmt(Number(v))} />
                                    <YAxis yAxisId="der" orientation="right" tick={{ fontSize: 9, fill: COLOR_ACUMULADO }} width={50} tickFormatter={v => fmt(Number(v))} />
                                    <Tooltip content={<TooltipPeriodo gran={granPrincipal} medida={medida} />} cursor={{ fill: '#f1f5f9' }} />
                                    {barras(columnasPrincipal, granPrincipal, clicPrincipal).map(b => React.cloneElement(b, { yAxisId: 'izq' }))}
                                    <Line yAxisId="der" type="monotone" dataKey="acumulado" stroke={COLOR_ACUMULADO} strokeWidth={2} dot={{ r: 2.5, fill: COLOR_ACUMULADO }} isAnimationActive={false}>
                                        {/* Con muchos puntos, el acumulado lleva valor cada 3 puntos y en el último (arriba de la línea) */}
                                        <LabelList
                                            dataKey="acumulado"
                                            content={(p: any) => {
                                                const ultimo = p.index === columnasPrincipal.length - 1;
                                                if (p.value == null || (columnasPrincipal.length > 12 && p.index % 3 !== 2 && !ultimo)) return null;
                                                return <text x={p.x} y={p.y - 8} textAnchor={ultimo ? 'end' : 'middle'} fontSize={8} fontWeight={800} fill="#b45309">{fmt(Number(p.value))}</text>;
                                            }}
                                        />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div
                    className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200"
                    onClick={() => { if (!clicSecundaria.consumir() && selPeriodo?.gran === granSecundaria) setSelPeriodo(null); }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{tituloTiempo(granSecundaria)}</h3>
                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]" onClick={e => e.stopPropagation()}>
                            {([['mes', 'Por mes'], ['anio', 'Promedio por año']] as const).map(([g, txt]) => (
                                <button
                                    key={g}
                                    onClick={() => { setVistaSec(g); if (selPeriodo?.gran === granSecundaria) setSelPeriodo(null); }}
                                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${vistaSec === g ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}
                                >
                                    {txt}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[var(--sd-h2)] w-full">
                        {cargandoInicial ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : columnasSecundaria.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">Sin datos.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={columnasSecundaria}
                                    margin={{ top: 18, right: 4, left: 0, bottom: 0 }}
                                    onClick={(e: any) => {
                                        const col = columnaDeClic(e, columnasSecundaria);
                                        if (col && clicSecundaria.tomar()) alternarPeriodo(granSecundaria, col.key);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 9 }} width={54} tickFormatter={v => fmt(Number(v))} />
                                    <Tooltip content={<TooltipPeriodo gran={granSecundaria} medida={medida} />} cursor={{ fill: '#f1f5f9' }} />
                                    {barras(columnasSecundaria, granSecundaria, clicSecundaria, c => (granSecundaria === 'mes'
                                        ? meses.length > 0 && !meses.includes(Number(c.key.slice(5, 7)))
                                        : anios.length > 0 && !anios.includes(Number(c.key))))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Fila 2: Pareto de causas y detalle de piezas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Pareto de causas</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-5 space-y-0.5 max-h-[var(--sd-h)] overflow-y-auto pr-1 scrollbar-thin">
                            {pareto.map(d => {
                                const activa = selCausa === d.name;
                                return (
                                    <button
                                        key={d.name}
                                        onClick={() => setSelCausa(prev => (prev === d.name ? null : d.name))}
                                        title={`${d.name} · acumulado ${d.pctAcum}%`}
                                        className={`w-full flex items-center justify-between text-[11px] py-0.5 px-1 rounded border-b border-slate-100 text-left transition-opacity ${activa ? 'bg-slate-100 ring-1 ring-[#324354]' : 'hover:bg-slate-50'} ${selCausa && !activa ? 'opacity-40' : ''}`}
                                    >
                                        <span className="flex items-center gap-1.5 truncate mr-1.5">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorCausa.get(d.name) }} />
                                            <span className="truncate text-slate-700 font-medium capitalize">{d.name.toLowerCase()}</span>
                                        </span>
                                        <span className="text-right flex-shrink-0 font-mono text-[10px]">
                                            <span className="font-bold text-slate-900">{fmt(d.cantidad)}</span>
                                            <span className="text-slate-400 ml-0.5">({d.pct}%)</span>
                                        </span>
                                    </button>
                                );
                            })}
                            {!pareto.length && <p className="text-xs text-slate-400 py-6 text-center">{cargandoInicial ? 'Cargando…' : 'Sin eventos en el periodo.'}</p>}
                        </div>
                        {/* Anillo grande: sube hasta la línea del título para usar todo el alto del recuadro */}
                        <div className="md:col-span-7 h-[var(--sd-h)] md:h-[calc(var(--sd-h)+28px)] md:-mt-7" onClick={() => { if (!clicAnillo.consumir()) setSelCausa(null); }}>
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
                                            setSelCausa(prev => (prev === nombre ? null : nombre));
                                        }}
                                    >
                                        {anillo.map(a => <Cell key={a.name} fill={a.color} fillOpacity={causaEnAnillo && causaEnAnillo !== a.name ? 0.25 : 1} stroke="#fff" />)}
                                    </Pie>
                                    <Tooltip formatter={(value: any, name: any, item: any) => [`${fmt(Number(value))} (${item?.payload?.pct}%)`, String(name).toLowerCase()]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-col">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap shrink-0">Detalle de piezas <span className="text-[10px] font-bold text-slate-400">({detalle.length})</span></h3>
                        <div className="relative flex-1 min-w-[80px] max-w-[180px]">
                            <Search className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar referencia, causa, SKU..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="w-full pl-5 pr-1.5 py-0.5 text-[9px] bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#324354]"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-[var(--sd-h)] scrollbar-thin text-[11px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 text-[10px] border-b border-slate-200">
                                <tr>
                                    <th className="py-1 px-1.5">Fecha</th>
                                    <th className="py-1 px-1.5">Tipo</th>
                                    <th className="py-1 px-1.5">Referencia</th>
                                    <th className="py-1 px-1.5">Causa</th>
                                    <th className="py-1 px-1.5 text-right">Pzs</th>
                                    <th className="py-1 px-1.5 text-right pr-2">Costo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {detalle.slice(0, 300).map((e, i) => {
                                    const activa = selRef === e.referencia;
                                    return (
                                        <tr
                                            key={`${e.fecha}-${e.sku}-${i}`}
                                            onClick={() => setSelRef(prev => (prev === e.referencia ? null : e.referencia))}
                                            className={`cursor-pointer text-slate-700 transition-all ${activa ? 'bg-slate-100 outline outline-1 outline-[#324354]' : 'hover:bg-slate-50'} ${selRef && !activa ? 'opacity-40' : ''}`}
                                            title={`${e.planta} · ${e.sku ? `${e.sku} · ` : ''}${e.referencia} · ${e.causa} · Responsable: ${e.responsable}${e.sinCosto ? ' · sin costo en el catálogo' : ''}`}
                                        >
                                            <td className="py-1 px-1.5 whitespace-nowrap">{fechaCorta(e.fecha).slice(0, 5)}</td>
                                            <td className="py-1 px-1.5">
                                                <span className="px-1.5 py-px rounded-full text-[9px] font-black text-white" style={{ backgroundColor: COLOR_TIPO_SD[e.tipo] }}>{e.tipo === 'saldo' ? 'S' : 'D'}</span>
                                                <span className="block text-[8px] font-bold text-slate-400 mt-px">{e.planta}</span>
                                            </td>
                                            <td className="py-1 px-1.5 font-bold text-slate-800 truncate max-w-[110px] capitalize">{e.referencia.toLowerCase()}</td>
                                            <td className="py-1 px-1.5 truncate max-w-[90px] capitalize">{e.causa.toLowerCase()}</td>
                                            <td className="py-1 px-1.5 text-right font-bold">{e.cantidad}</td>
                                            <td className={`py-1 px-1.5 pr-2 text-right font-black whitespace-nowrap ${e.sinCosto ? 'text-amber-600' : 'text-slate-900'}`}>{e.sinCosto ? '—' : pesos(e.costo)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!detalle.length && <p className="text-xs text-slate-400 py-6 text-center">{cargandoInicial ? 'Cargando…' : 'Sin piezas para los filtros elegidos.'}</p>}
                        {detalle.length > 300 && <p className="text-[10px] text-slate-400 py-1 text-center">Mostrando 300 de {detalle.length}. Use los filtros o el buscador.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
