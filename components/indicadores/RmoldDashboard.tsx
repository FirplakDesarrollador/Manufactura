'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ReferenceLine, PieChart, Pie
} from 'recharts';
import { supabase } from '@/lib/supabase';
import FiltroPbi, { semanaIso } from '@/components/calidad/FiltroPbi';
import {
    COLOR_FAMILIA, FAMILIAS_PARO, META_NS, META_PRODUCTIVIDAD, NOMBRE_FAMILIA, ParoRmold, RegistroRmold, calcularDia, cargarRmold
} from '@/lib/informe-turno/rmold';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PARETO_COLORS = ['#008080', '#e06634', '#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6', '#84cc16', '#a855f7'];
const COLOR_OTROS = '#cbd5e1';
const CAUSAS_EN_ANILLO = 12;
const COLOR_META = '#3b8f50';
const COLOR_LINEA = '#324354';
const COLOR_REFLEJADOS = '#7c3aed';
const COLOR_ESPERADOS = '#cbd5e1';
const COLOR_ENTREGADOS = '#0284c7';
// Tipos de molde reparado (equivalentes: brillado = ½, desmanchado = ⅓)
const TIPOS = [
    { k: 'ms', nombre: 'MS', color: '#0284c7' },
    { k: 'fv', nombre: 'FV', color: '#10b981' },
    { k: 'rtm', nombre: 'RTM', color: '#8b5cf6' },
    { k: 'brill', nombre: 'Brillados (½)', color: '#f59e0b' },
    { k: 'desm', nombre: 'Desmanchados (⅓)', color: '#64748b' }
] as const;

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaCorta = (f: string) => f.split('-').reverse().join('/');
const dec = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (n: number | null | undefined) => (n == null ? '—' : `${dec(n)} %`);
// Semáforo de gráficas con meta: verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo
const colorSemaforo = (v: number | null | undefined, meta: number) => (v == null ? '#94a3b8' : v >= meta ? '#59a96a' : v >= meta - 10 ? '#deb841' : '#d14747');

type Gran = 'dia' | 'mes' | 'anio';
type Medida = 'pzs' | 'persona';
interface SelPeriodo { gran: Gran; key: string }

interface Dia {
    fecha: string; ms: number; fv: number; rtm: number; brill: number; desm: number; total: number; meta: number; personas: number;
    productividad: number | null; pzsPersona: number | null; metaPzsPersona: number; productividadPersona: number | null;
    ns: number | null; esperados: number | null; entregados: number | null; reflejados: number;
}
// Columna de un periodo: promedios por día (como la tabla de promedios del Excel) y minutos de paro sumados
interface Columna {
    key: string; label: string; dias: number;
    ms: number; fv: number; rtm: number; brill: number; desm: number; total: number; meta: number; personas: number;
    productividad: number | null; pzsPersona: number | null; metaPzsPersona: number | null; productividadPersona: number | null;
    ns: number | null; esperados: number | null; entregados: number | null;
    reflejados: number; parosTotal: number; [familia: string]: any;
}

const clave = (fecha: string, gran: Gran) => (gran === 'dia' ? fecha : gran === 'mes' ? fecha.slice(0, 7) : fecha.slice(0, 4));
const nombrePeriodo = (gran: Gran, key: string) => (gran === 'anio' ? `Año ${key}` : gran === 'mes' ? `${MESES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` : fechaCorta(key));
const promedio = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null && isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

// Clic de Recharts: puede llegar por la barra y por la gráfica; con clave se ignora el mismo periodo repetido durante 1 s
function useClicUnico() {
    const ultimo = useRef(0);
    const ultimaClave = useRef<string | null>(null);
    const marcado = useRef(false);
    return {
        tomar: (k?: string) => {
            marcado.current = true;
            const ahora = Date.now();
            if (ahora - ultimo.current < (k ? 1000 : 150) && (!k || k === ultimaClave.current)) return false;
            ultimo.current = ahora;
            ultimaClave.current = k ?? null;
            return true;
        },
        consumir: () => { const v = marcado.current; marcado.current = false; return v; }
    };
}
const dentroDeGrafica = (e: React.MouseEvent) => !!(e.target as Element | null)?.closest?.('.recharts-wrapper');

const etiquetaPorcion = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
    if (!percent || percent < 0.025) return null;
    const rad = Math.PI / 180;
    const r = outerRadius + 10;
    const x = cx + r * Math.cos(-midAngle * rad);
    const y = cy + r * Math.sin(-midAngle * rad);
    return <text x={x} y={y} fill="#334155" fontSize={10} fontWeight={800} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">{`${(percent * 100).toFixed(1)}%`}</text>;
};

const Fila = ({ color, texto, valor }: { color?: string; texto: string; valor: string }) => (
    <p className="flex justify-between gap-3">
        <span className="flex items-center gap-1 text-slate-600">{color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}{texto}</span>
        <span className="font-black text-slate-800">{valor}</span>
    </p>
);
const TooltipRmold = ({ active, payload, gran, vista }: any) => {
    if (!active || !payload?.length) return null;
    const c: Columna = payload[0].payload;
    const prom = gran !== 'dia' ? ' (prom./día)' : '';
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 text-[11px] min-w-[210px] space-y-0.5">
            <p className="font-black text-slate-800 capitalize mb-1">{nombrePeriodo(gran, c.key)}{gran !== 'dia' && <span className="font-normal text-slate-500"> · {c.dias} día(s)</span>}</p>
            {vista === 'pzs' && <>
                {TIPOS.map(t => (c[t.k] ? <Fila key={t.k} color={t.color} texto={t.nombre} valor={dec(c[t.k])} /> : null))}
                <Fila texto={`Total${prom}`} valor={dec(c.total)} />
                <Fila texto="Meta" valor={dec(c.meta)} />
                <Fila texto="Productividad" valor={pct(c.productividad)} />
            </>}
            {vista === 'persona' && <>
                <Fila texto={`Piezas/persona${prom}`} valor={dec(c.pzsPersona)} />
                <Fila texto="Meta piezas/persona" valor={dec(c.metaPzsPersona)} />
                <Fila texto="Personas" valor={dec(c.personas)} />
                <Fila texto="Productividad/persona" valor={pct(c.productividadPersona)} />
            </>}
            {vista === 'ns' && <>
                <Fila color={COLOR_ESPERADOS} texto={`Esperados${prom}`} valor={dec(c.esperados)} />
                <Fila color={COLOR_ENTREGADOS} texto={`Entregados${prom}`} valor={dec(c.entregados)} />
                <Fila texto="Nivel de servicio" valor={pct(c.ns)} />
                {c.ns != null && c.esperados == null && <p className="text-[10px] text-slate-400">NS digitado en el Excel (sin esperados/entregados)</p>}
            </>}
            {vista === 'paros' && <>
                {FAMILIAS_PARO.map(f => (c[f] ? <Fila key={f} color={COLOR_FAMILIA[f]} texto={NOMBRE_FAMILIA[f]} valor={`${dec(c[f], 0)} min`} /> : null))}
                <Fila texto="Registrados" valor={`${dec(c.parosTotal, 0)} min`} />
                {c.dias > 0 && <Fila color={COLOR_REFLEJADOS} texto="Reflejados (meta − real) × 24" valor={`${dec(c.reflejados, 0)} min`} />}
            </>}
        </div>
    );
};

// Tablero de Control → RMOLD (Reparación de Moldes): productividad, nivel de servicio y paros con el diseño de
// Saldos y Destrucciones / Mármol Sintético (filtros Año/Mes/Semana/Día, filtro cruzado y valores en las gráficas).
// Los datos salen del cierre diario del Informe de Turno → RMOLD.
export default function RmoldDashboard() {
    const router = useRouter();
    const hoy = hoyBogota();
    const anioActual = Number(hoy.slice(0, 4));
    const mesActual = Number(hoy.slice(5, 7));

    const [registros, setRegistros] = useState<RegistroRmold[]>([]);
    const [paros, setParos] = useState<ParoRmold[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [medida, setMedida] = useState<Medida>('pzs');
    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([mesActual]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);
    const [selPeriodo, setSelPeriodo] = useState<SelPeriodo | null>(null);
    const [selCausa, setSelCausa] = useState<string | null>(null);

    useEffect(() => {
        let vivo = true;
        cargarRmold(supabase)
            .then(d => { if (vivo) { setRegistros(d.registros); setParos(d.paros); setError(null); } })
            .catch(e => { if (vivo) setError(e?.message || 'No se pudieron cargar los datos de RMOLD'); })
            .finally(() => { if (vivo) setLoading(false); });
        return () => { vivo = false; };
    }, []);

    const dias: Dia[] = useMemo(() => registros.map(r => {
        const k = calcularDia(r);
        return {
            fecha: r.fecha, ms: r.moldes_ms, fv: r.moldes_fv, rtm: r.moldes_rtm, brill: r.moldes_brillados / 2, desm: r.moldes_desmanchados / 3,
            total: k.total, meta: r.meta, personas: r.personas, productividad: k.productividad, pzsPersona: k.pzsPersona,
            metaPzsPersona: k.metaPzsPersona, productividadPersona: k.productividadPersona, ns: k.ns,
            esperados: r.moldes_esperados, entregados: r.moldes_entregados, reflejados: k.parosReflejados
        };
    }), [registros]);

    // Filtros en cascada Año → Mes → Semana → Día sobre las fechas con cierre o con paros
    const aniosDisponibles = useMemo(() => {
        const s = new Set([...dias.map(d => Number(d.fecha.slice(0, 4))), ...paros.map(p => Number(p.fecha.slice(0, 4)))]);
        s.add(anioActual);
        return [...s].sort((a, b) => b - a);
    }, [dias, paros, anioActual]);
    const todosLosAnios = anios.length === 0;
    const variosAnios = (todosLosAnios ? aniosDisponibles.length : anios.length) > 1;
    const unSoloMes = anios.length === 1 && meses.length === 1;
    const filtroDiario = semanas.length > 0 || diasSel.length > 0;
    const gran: Gran = todosLosAnios && !filtroDiario ? 'anio' : unSoloMes || filtroDiario ? 'dia' : 'mes';

    const pasaAnioMes = (f: string) => (todosLosAnios || anios.includes(Number(f.slice(0, 4)))) && (!meses.length || meses.includes(Number(f.slice(5, 7))));
    const pasaFiltros = (f: string) => pasaAnioMes(f) && (!semanas.length || semanas.includes(semanaIso(f).clave)) && (!diasSel.length || diasSel.includes(f));
    const diasF = useMemo(() => dias.filter(d => pasaFiltros(d.fecha)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dias, anios, meses, semanas, diasSel]);
    const parosF = useMemo(() => paros.filter(p => pasaFiltros(p.fecha)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [paros, anios, meses, semanas, diasSel]);

    const enPeriodo = (f: string) => !selPeriodo || clave(f, selPeriodo.gran) === selPeriodo.key;
    const conCausa = (p: ParoRmold) => !selCausa || p.causa === selCausa;

    // Columnas por periodo (unión de días con cierre y días con paros)
    const columnas: Columna[] = useMemo(() => {
        const grupos = new Map<string, { d: Dia[]; p: ParoRmold[] }>();
        const g = (k: string) => { if (!grupos.has(k)) grupos.set(k, { d: [], p: [] }); return grupos.get(k)!; };
        diasF.forEach(d => g(clave(d.fecha, gran)).d.push(d));
        parosF.filter(conCausa).forEach(p => g(clave(p.fecha, gran)).p.push(p));
        const aniosEnDatos = new Set([...grupos.keys()].map(k => k.slice(0, 4))).size > 1;
        return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, { d, p }]) => {
            const prom = (f: (x: Dia) => number | null) => promedio(d.map(f));
            const col: Columna = {
                key,
                label: gran === 'anio' ? key : gran === 'mes'
                    ? `${MESES[Number(key.slice(5, 7)) - 1].slice(0, 3)}${aniosEnDatos ? ` ${key.slice(2, 4)}` : ''}`
                    : unSoloMes ? String(Number(key.slice(8, 10))) : `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`,
                dias: d.length,
                ms: prom(x => x.ms) || 0, fv: prom(x => x.fv) || 0, rtm: prom(x => x.rtm) || 0, brill: prom(x => x.brill) || 0, desm: prom(x => x.desm) || 0,
                total: prom(x => x.total) || 0, meta: prom(x => x.meta) || 0, personas: prom(x => x.personas) || 0,
                productividad: prom(x => x.productividad), pzsPersona: prom(x => x.pzsPersona), metaPzsPersona: prom(x => x.metaPzsPersona),
                productividadPersona: prom(x => x.productividadPersona), ns: prom(x => x.ns), esperados: prom(x => x.esperados), entregados: prom(x => x.entregados),
                reflejados: d.reduce((a, x) => a + x.reflejados, 0),
                parosTotal: p.reduce((a, x) => a + x.minutos, 0)
            };
            FAMILIAS_PARO.forEach(f => { col[f] = p.filter(x => x.familia === f).reduce((a, x) => a + x.minutos, 0); });
            return col;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diasF, parosF, gran, unSoloMes, selCausa]);
    const colsProd = useMemo(() => columnas.filter(c => c.dias > 0), [columnas]);
    const colsNs = useMemo(() => columnas.filter(c => c.ns != null), [columnas]);
    const colsParos = useMemo(() => columnas.filter(c => c.parosTotal > 0 || c.dias > 0), [columnas]);

    useEffect(() => {
        if (selPeriodo && !columnas.some(c => c.key === selPeriodo.key)) setSelPeriodo(null);
    }, [columnas, selPeriodo]);

    // Pareto de causas (periodo elegido; la causa elegida se resalta)
    const pareto = useMemo(() => {
        const m = new Map<string, number>();
        parosF.filter(p => enPeriodo(p.fecha)).forEach(p => m.set(p.causa, (m.get(p.causa) || 0) + p.minutos));
        const total = [...m.values()].reduce((a, b) => a + b, 0);
        let acum = 0;
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, minutos]) => {
            acum += minutos;
            return { name, minutos, pct: total ? Math.round((minutos / total) * 1000) / 10 : 0, pctAcum: total ? Math.round((acum / total) * 1000) / 10 : 0 };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parosF, selPeriodo]);
    const colorCausa = useMemo(() => {
        const m = new Map<string, string>();
        pareto.forEach((c, i) => m.set(c.name, i < CAUSAS_EN_ANILLO ? PARETO_COLORS[i % PARETO_COLORS.length] : COLOR_OTROS));
        return m;
    }, [pareto]);
    const anillo = useMemo(() => {
        const top = pareto.slice(0, CAUSAS_EN_ANILLO).map(c => ({ ...c, color: colorCausa.get(c.name)! }));
        const resto = pareto.slice(CAUSAS_EN_ANILLO);
        if (resto.length) top.push({ name: `Otras (${resto.length})`, minutos: resto.reduce((a, c) => a + c.minutos, 0), pct: Math.round(resto.reduce((a, c) => a + c.pct, 0) * 10) / 10, pctAcum: 100, color: COLOR_OTROS });
        return top;
    }, [pareto, colorCausa]);
    const causaEnAnillo = selCausa && anillo.some(a => a.name === selCausa) ? selCausa : selCausa ? anillo[anillo.length - 1]?.name : null;

    // Selecciones
    const limpiar = () => { setSelPeriodo(null); setSelCausa(null); };
    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanas([]); setDiasSel([]); limpiar(); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanas([]); setDiasSel([]); limpiar(); };
    const cambiarSemanas = (v: string[]) => { setSemanas(v); setDiasSel([]); limpiar(); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); limpiar(); };
    const diaSel = selPeriodo?.gran === 'dia' ? selPeriodo.key : null;
    const semanasVista = diaSel ? [semanaIso(diaSel).clave] : semanas;
    const diasVista = diaSel ? [diaSel] : diasSel;

    const fechasConDato = useMemo(() => [...new Set([...dias.map(d => d.fecha), ...paros.map(p => p.fecha)])].filter(pasaAnioMes).sort(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dias, paros, anios, meses]);
    const opcionesSemana = useMemo(() => {
        const mapa = new Map<string, { anio: number; semana: number }>();
        fechasConDato.forEach(f => { const s = semanaIso(f); mapa.set(s.clave, s); });
        return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, s]) => ({ value: k, label: `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}` }));
    }, [fechasConDato, variosAnios]);
    const opcionesDia = useMemo(() => fechasConDato.filter(f => !semanas.length || semanas.includes(semanaIso(f).clave))
        .map(f => ({ value: f, label: unSoloMes ? String(Number(f.slice(8, 10))) : fechaCorta(f).slice(0, variosAnios ? 10 : 5) })), [fechasConDato, semanas, unSoloMes, variosAnios]);

    const clicProd = useClicUnico();
    const clicNs = useClicUnico();
    const clicParos = useClicUnico();
    const clicAnillo = useClicUnico();
    // Clic en un mes o un año cambia los filtros de arriba; un día solo se resalta y filtra lo demás
    const alternarPeriodo = (key: string) => {
        if (gran === 'dia') { setSelPeriodo(prev => (prev?.key === key ? null : { gran, key })); return; }
        const y = Number(key.slice(0, 4));
        const soloAnio = anios.length === 1 && anios[0] === y;
        setSemanas([]); setDiasSel([]); setSelPeriodo(null);
        if (gran === 'anio') { setAnios(soloAnio ? [] : [y]); return; }
        const m = Number(key.slice(5, 7));
        if (soloAnio && meses.length === 1 && meses[0] === m) setMeses([]);
        else { setAnios([y]); setMeses([m]); }
    };
    const columnaDeClic = (e: any, cols: Columna[]) => {
        const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
        return Number.isInteger(idx) ? cols[idx] : cols.find(c => c.label === String(e?.activeLabel));
    };
    const tenue = (key: string) => !!selPeriodo && selPeriodo.key !== key;
    const quitarAlClicFuera = (clic: ReturnType<typeof useClicUnico>) => (e: React.MouseEvent) => {
        if (!clic.consumir() && !dentroDeGrafica(e) && selPeriodo) setSelPeriodo(null);
    };
    // Props comunes de cada gráfica de tiempo
    const propsGrafica = (cols: Columna[], clic: ReturnType<typeof useClicUnico>) => ({
        data: cols,
        margin: { top: 18, right: 4, left: 0, bottom: 0 },
        style: { cursor: 'pointer' },
        onClick: (e: any) => { const col = columnaDeClic(e, cols); if (col && clic.tomar(col.key)) alternarPeriodo(col.key); }
    });
    const clicBarra = (cols: Columna[], clic: ReturnType<typeof useClicUnico>) => (_: any, index: number) => {
        const col = cols[index];
        if (col && clic.tomar(col.key)) alternarPeriodo(col.key);
    };
    const ejeX = (cols: Columna[], clic: ReturnType<typeof useClicUnico>) => (
        <XAxis dataKey="label" tick={{ fontSize: 10, cursor: 'pointer' }} onClick={(t: any) => {
            const col = cols.find(c => c.label === String(t?.value ?? t?.payload?.value));
            if (col && clic.tomar(col.key)) alternarPeriodo(col.key);
        }} />
    );
    // Valores de una línea: con muchos puntos van alternados arriba/abajo
    const etiquetaLinea = (cols: Columna[], fmt: (v: number) => string, color?: (c: Columna) => string) => (p: any) => {
        if (p.value == null) return null;
        const abajo = cols.length > 12 && p.index % 2 === 1;
        return <text x={p.x} y={abajo ? p.y + 13 : p.y - 7} textAnchor="middle" fontSize={cols.length > 12 ? 8 : 9} fontWeight={800} fill={color ? color(cols[p.index]) : '#334155'}>{fmt(Number(p.value))}</text>;
    };
    const puntoSemaforo = (campo: 'productividad' | 'productividadPersona' | 'ns', meta: number) => (p: any) => {
        const v = p.payload?.[campo];
        if (v == null) return <g key={p.index} />;
        return <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={colorSemaforo(v, meta)} stroke="#fff" strokeWidth={1.5} opacity={tenue(p.payload.key) ? 0.35 : 1} />;
    };
    // Total dentro de la parte alta de la pila (línea invisible que solo lleva la etiqueta)
    const etiquetaDentro = (cols: Columna[], fmt: (v: number) => string) => (p: any) => {
        if (!p.value || (cols.length > 16 && p.index % 2 === 1)) return null;
        return <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#fff">{fmt(Number(p.value))}</text>;
    };

    // Tarjetas: días y paros filtrados (y el periodo elegido)
    const diasKpi = diasF.filter(d => enPeriodo(d.fecha));
    const parosKpi = parosF.filter(p => enPeriodo(p.fecha) && conCausa(p));
    const promK = (f: (d: Dia) => number | null) => promedio(diasKpi.map(f));
    const kProd = promK(d => d.productividad);
    const kPersona = promK(d => d.productividadPersona);
    const kNs = promK(d => d.ns);
    const cargandoInicial = loading && !registros.length;
    const tarjeta = (titulo: string, valor: string, detalle?: string, color?: string, ayuda?: string) => ({ titulo, valor, detalle, color, ayuda });
    const kpis = [
        tarjeta('Moldes reparados', dec(promK(d => d.total)), `prom./día · ${diasKpi.length} días`, undefined, 'Promedio diario de moldes reparados equivalentes (MS + FV + RTM + brillados ÷ 2 + desmanchados ÷ 3)'),
        tarjeta('Productividad', pct(kProd), `meta ${META_PRODUCTIVIDAD} %`, colorSemaforo(kProd, META_PRODUCTIVIDAD), 'Promedio de (moldes reparados ÷ meta) de cada día'),
        tarjeta('Piezas / persona', dec(promK(d => d.pzsPersona)), `meta ${dec(promK(d => d.metaPzsPersona))}`, undefined, 'Moldes reparados ÷ personas (meta = meta del día ÷ 7)'),
        tarjeta('Product. / persona', pct(kPersona), 'meta 100 %', colorSemaforo(kPersona, 100)),
        tarjeta('Nivel de servicio', pct(kNs), `meta ${META_NS} %`, colorSemaforo(kNs, META_NS), 'Moldes entregados ÷ moldes esperados (promedio de los días)'),
        tarjeta('Personas', dec(promK(d => d.personas)), 'prom./día'),
        tarjeta('Paros registrados', `${dec(parosKpi.reduce((a, p) => a + p.minutos, 0), 0)} min`, `${parosKpi.length} paros`),
        tarjeta('Causa principal', pareto[0]?.name?.toLowerCase() || '—', pareto[0] ? `${pareto[0].pct} %` : undefined)
    ];

    const contexto = gran === 'anio' ? 'promedio por día de cada año' : gran === 'mes' ? (todosLosAnios ? 'todos los años' : [...anios].sort().join(', '))
        : unSoloMes && !filtroDiario ? `${MESES[meses[0] - 1]} ${anios[0]}` : diasSel.length ? `${diasSel.length} días` : semanas.length ? `${semanas.length} semana(s)` : '';
    const porGran = gran === 'dia' ? 'Día' : gran === 'mes' ? 'Mes' : 'Año';
    const titulo = (base: string) => `${base} por ${porGran}${contexto ? ` (${contexto})` : ''}`;

    const chips = [
        selPeriodo && { texto: nombrePeriodo(selPeriodo.gran, selPeriodo.key), quitar: () => setSelPeriodo(null) },
        selCausa && { texto: selCausa.toLowerCase(), quitar: () => setSelCausa(null) }
    ].filter(Boolean) as { texto: string; quitar: () => void }[];

    const vacio = (texto: string) => <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500 text-center px-4">{texto}</div>;
    const cargador = <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    const leyenda = (items: { color: string; texto: string; linea?: boolean }[]) => (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold text-slate-500">
            {items.map(i => <span key={i.texto} className="flex items-center gap-1"><span className={i.linea ? 'w-3 h-0.5' : 'w-2 h-2 rounded-sm'} style={{ backgroundColor: i.color }} />{i.texto}</span>)}
        </div>
    );
    const sinRegistros = !cargandoInicial && !registros.length;

    return (
        // Alto por fila según la pantalla: el recuadro mide ≈ 810 px de pantalla con zoom de 100 % (como Saldos y MS)
        <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5]">
            <div className="space-y-2" style={{ ['--rm-h' as string]: 'max(120px, calc((100dvh - 382px) / 2 - 12px))', ['--rm-h2' as string]: 'max(140px, calc((100dvh - 382px) / 2 + 12px))' } as React.CSSProperties}>
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-2">
                        <h2 className="text-base font-black text-[#324354] whitespace-nowrap">Reparación de Moldes · RMOLD</h2>
                        <button
                            onClick={() => router.push('/informe-turno?planta=RMOLD')}
                            className="px-2 py-0.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                            title="Registrar el cierre del día en Informe de Turno → RMOLD"
                        >
                            <Plus className="w-3 h-3" /> Registrar cierre
                        </button>
                        {error && <span className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black cursor-help bg-rose-100 text-rose-700 border border-rose-300" title={error}>!</span>}
                    </div>
                    <div className="flex flex-wrap items-start gap-1.5 w-full lg:w-auto">
                        <FiltroPbi compacto titulo="Año" seleccion={anios.map(String)} opciones={aniosDisponibles.map(a => ({ value: String(a), label: String(a) }))} onChange={cambiarAnios} onBorrar={() => cambiarAnios([])} puedeBorrar={anios.length > 0} />
                        <FiltroPbi compacto titulo="Mes" seleccion={meses.map(String)} opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={cambiarMeses} onBorrar={() => cambiarMeses([])} puedeBorrar={meses.length > 0} />
                        <FiltroPbi compacto titulo="Semana" seleccion={semanasVista} opciones={opcionesSemana} onChange={cambiarSemanas} onBorrar={() => cambiarSemanas([])} puedeBorrar={semanasVista.length > 0} />
                        <FiltroPbi compacto titulo="Día" seleccion={diasVista} opciones={opcionesDia} onChange={cambiarDias} onBorrar={() => cambiarDias([])} puedeBorrar={diasVista.length > 0} />
                    </div>
                </div>

                {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-500">Filtrando por:</span>
                        {chips.map(c => (
                            <button key={c.texto} onClick={c.quitar} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#324354] text-white font-bold hover:bg-[#25323f]" title="Quitar este filtro">
                                <span className="capitalize">{c.texto}</span> <X className="w-3 h-3" />
                            </button>
                        ))}
                        {chips.length > 1 && <button onClick={limpiar} className="text-[11px] font-bold text-slate-500 hover:text-[#324354] underline">Quitar todo</button>}
                    </div>
                )}

                {/* Tarjetas KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {kpis.map(k => (
                        <div key={k.titulo} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between min-w-0" title={k.ayuda}>
                            <span className="text-[8px] font-bold uppercase truncate text-slate-500">{k.titulo}</span>
                            <span className="flex items-baseline justify-between gap-1 min-w-0">
                                <span className={`font-black leading-tight truncate ${k.titulo === 'Causa principal' ? 'text-[11px] capitalize text-slate-900' : 'text-sm sm:text-base'}`} style={k.color ? { color: k.color } : undefined} title={k.valor}>
                                    {cargandoInicial ? '…' : k.valor}
                                </span>
                                {k.detalle && !cargandoInicial && <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{k.detalle}</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fila 1: productividad y nivel de servicio */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200" onClick={quitarAlClicFuera(clicProd)}>
                        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{titulo(medida === 'pzs' ? 'Productividad moldes reparados' : 'Piezas por persona')}</h3>
                            <div className="shrink-0 flex items-center gap-2">
                                {leyenda(medida === 'pzs'
                                    ? [...TIPOS.map(t => ({ color: t.color, texto: t.nombre.split(' ')[0] })), { color: COLOR_LINEA, texto: '% cumpl.', linea: true }]
                                    : [{ color: '#7B8E90', texto: 'Pzs/persona' }, { color: COLOR_LINEA, texto: '% cumpl.', linea: true }])}
                                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]" onClick={e => e.stopPropagation()}>
                                    {([['pzs', 'Piezas'], ['persona', 'Pzs/persona']] as const).map(([m, t]) => (
                                        <button key={m} onClick={() => setMedida(m)} className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${medida === m ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="h-[var(--rm-h2)] w-full">
                            {cargandoInicial ? cargador : sinRegistros ? vacio(error || 'Aún no hay cierres de RMOLD. Regístrelos en Informe de Turno → RMOLD.') : !colsProd.length ? vacio('Sin cierres para los filtros elegidos.') : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart {...propsGrafica(colsProd, clicProd)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        {ejeX(colsProd, clicProd)}
                                        <YAxis yAxisId="izq" tick={{ fontSize: 9 }} width={30} />
                                        <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: COLOR_LINEA }} width={36} domain={[0, (max: number) => Math.max(140, Math.ceil(max / 20) * 20 + 20)]} tickFormatter={v => `${v}%`} />
                                        <Tooltip content={<TooltipRmold gran={gran} vista={medida} />} cursor={{ fill: '#f1f5f9' }} />
                                        <ReferenceLine yAxisId="pct" y={medida === 'pzs' ? META_PRODUCTIVIDAD : 100} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5}
                                            label={{ value: `Meta ${medida === 'pzs' ? META_PRODUCTIVIDAD : 100}%`, position: 'insideTopRight', fill: COLOR_META, fontSize: 9, fontWeight: 800 }} />
                                        {medida === 'pzs'
                                            ? TIPOS.map((t, i) => (
                                                <Bar key={t.k} yAxisId="izq" dataKey={t.k} stackId="m" name={t.nombre} fill={t.color} radius={i === TIPOS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} cursor="pointer" onClick={clicBarra(colsProd, clicProd)}>
                                                    {colsProd.map(c => <Cell key={c.key} fillOpacity={tenue(c.key) ? 0.3 : 1} />)}
                                                </Bar>
                                            ))
                                            : (
                                                <Bar yAxisId="izq" dataKey="pzsPersona" name="Piezas/persona" fill="#7B8E90" radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="pointer" onClick={clicBarra(colsProd, clicProd)}>
                                                    {colsProd.map(c => <Cell key={c.key} fillOpacity={tenue(c.key) ? 0.3 : 1} />)}
                                                </Bar>
                                            )}
                                        <Line yAxisId="izq" dataKey={medida === 'pzs' ? 'total' : 'pzsPersona'} stroke="none" dot={false} activeDot={false} isAnimationActive={false} legendType="none">
                                            <LabelList content={etiquetaDentro(colsProd, v => dec(v, medida === 'pzs' ? 0 : 1))} />
                                        </Line>
                                        <Line yAxisId="pct" type="monotone" dataKey={medida === 'pzs' ? 'productividad' : 'productividadPersona'} stroke={COLOR_LINEA} strokeWidth={1.5} isAnimationActive={false} connectNulls
                                            dot={puntoSemaforo(medida === 'pzs' ? 'productividad' : 'productividadPersona', medida === 'pzs' ? META_PRODUCTIVIDAD : 100)}>
                                            <LabelList content={etiquetaLinea(colsProd, v => `${Math.round(v)}%`)} />
                                        </Line>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200" onClick={quitarAlClicFuera(clicNs)}>
                        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{titulo('Nivel de servicio')}</h3>
                            <div className="shrink-0">{leyenda([{ color: COLOR_ESPERADOS, texto: 'Esperados' }, { color: COLOR_ENTREGADOS, texto: 'Entregados' }, { color: COLOR_LINEA, texto: 'NS', linea: true }])}</div>
                        </div>
                        <div className="h-[var(--rm-h2)] w-full">
                            {cargandoInicial ? cargador : !colsNs.length ? vacio(sinRegistros ? 'Sin datos.' : 'Sin nivel de servicio para los filtros elegidos.') : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart {...propsGrafica(colsNs, clicNs)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        {ejeX(colsNs, clicNs)}
                                        <YAxis yAxisId="izq" tick={{ fontSize: 9 }} width={26} />
                                        <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 9, fill: COLOR_LINEA }} width={36} domain={[(min: number) => Math.max(0, Math.floor(Math.min(min, META_NS) / 10) * 10 - 10), 100]} allowDataOverflow tickFormatter={v => `${v}%`} />
                                        <Tooltip content={<TooltipRmold gran={gran} vista="ns" />} cursor={{ fill: '#f1f5f9' }} />
                                        <ReferenceLine yAxisId="pct" y={META_NS} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5}
                                            label={{ value: `Meta ${META_NS}%`, position: 'insideBottomRight', fill: COLOR_META, fontSize: 9, fontWeight: 800 }} />
                                        {(['esperados', 'entregados'] as const).map(k => (
                                            <Bar key={k} yAxisId="izq" dataKey={k} fill={k === 'esperados' ? COLOR_ESPERADOS : COLOR_ENTREGADOS} radius={[3, 3, 0, 0]} isAnimationActive={false} cursor="pointer" onClick={clicBarra(colsNs, clicNs)}>
                                                {colsNs.map(c => <Cell key={c.key} fillOpacity={tenue(c.key) ? 0.3 : 1} />)}
                                            </Bar>
                                        ))}
                                        <Line yAxisId="pct" type="monotone" dataKey="ns" stroke={COLOR_LINEA} strokeWidth={1.5} isAnimationActive={false} connectNulls dot={puntoSemaforo('ns', META_NS)}>
                                            <LabelList content={etiquetaLinea(colsNs, v => `${dec(v, v >= 99.95 ? 0 : 1)}%`, c => colorSemaforo(c?.ns, META_NS))} />
                                        </Line>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fila 2: paros por periodo y Pareto de causas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200" onClick={quitarAlClicFuera(clicParos)}>
                        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800 first-letter:uppercase">{titulo(`${selCausa ? `${selCausa.toLowerCase()} · ` : ''}Paros (min)`)}</h3>
                            <div className="shrink-0">{leyenda([...FAMILIAS_PARO.filter(f => colsParos.some(c => c[f] > 0)).map(f => ({ color: COLOR_FAMILIA[f], texto: NOMBRE_FAMILIA[f] })), { color: COLOR_REFLEJADOS, texto: 'Reflejados', linea: true }])}</div>
                        </div>
                        <div className="h-[var(--rm-h)] w-full">
                            {cargandoInicial ? cargador : !colsParos.length ? vacio('Sin paros para los filtros elegidos.') : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart {...propsGrafica(colsParos, clicParos)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        {ejeX(colsParos, clicParos)}
                                        <YAxis tick={{ fontSize: 9 }} width={38} tickFormatter={v => Number(v).toLocaleString('es-CO')} />
                                        <Tooltip content={<TooltipRmold gran={gran} vista="paros" />} cursor={{ fill: '#f1f5f9' }} />
                                        <ReferenceLine y={0} stroke="#cbd5e1" />
                                        {FAMILIAS_PARO.map((f, i) => (
                                            <Bar key={f} dataKey={f} stackId="p" fill={COLOR_FAMILIA[f]} radius={i === FAMILIAS_PARO.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} cursor="pointer" onClick={clicBarra(colsParos, clicParos)}>
                                                {colsParos.map(c => <Cell key={c.key} fillOpacity={tenue(c.key) ? 0.3 : 1} />)}
                                            </Bar>
                                        ))}
                                        <Line dataKey="parosTotal" stroke="none" dot={false} activeDot={false} isAnimationActive={false} legendType="none">
                                            <LabelList content={(p: any) => (!p.value || (colsParos.length > 16 && p.index % 2 === 1) ? null
                                                : <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#334155">{Math.round(p.value).toLocaleString('es-CO')}</text>)} />
                                        </Line>
                                        {!selCausa && (
                                            <Line type="monotone" dataKey={(c: Columna) => (c.dias > 0 ? c.reflejados : null)} name="Reflejados" stroke={COLOR_REFLEJADOS} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: COLOR_REFLEJADOS }} isAnimationActive={false} connectNulls />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-col">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5">Pareto de causas de paro</h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                            <div className="md:col-span-6 space-y-0.5 max-h-[var(--rm-h)] overflow-y-auto pr-1 scrollbar-thin">
                                {pareto.map(d => {
                                    const activa = selCausa === d.name;
                                    return (
                                        <button key={d.name} onClick={() => setSelCausa(prev => (prev === d.name ? null : d.name))} title={`${d.name} · acumulado ${d.pctAcum}%`}
                                            className={`w-full flex items-center justify-between text-[11px] py-0.5 px-1 rounded border-b border-slate-100 text-left transition-opacity ${activa ? 'bg-slate-100 ring-1 ring-[#324354]' : 'hover:bg-slate-50'} ${selCausa && !activa ? 'opacity-40' : ''}`}>
                                            <span className="flex items-center gap-1.5 truncate mr-1.5">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorCausa.get(d.name) }} />
                                                <span className="truncate text-slate-700 font-medium capitalize">{d.name.toLowerCase()}</span>
                                            </span>
                                            <span className="text-right flex-shrink-0 font-mono text-[10px]">
                                                <span className="font-bold text-slate-900">{Math.round(d.minutos).toLocaleString('es-CO')}</span>
                                                <span className="text-slate-400 ml-0.5">({d.pct}%)</span>
                                            </span>
                                        </button>
                                    );
                                })}
                                {!pareto.length && <p className="text-xs text-slate-400 py-6 text-center">{cargandoInicial ? 'Cargando…' : 'Sin paros en el periodo.'}</p>}
                            </div>
                            <div className="md:col-span-6 h-[var(--rm-h)] md:h-[calc(var(--rm-h)+28px)] md:-mt-7" onClick={() => { if (!clicAnillo.consumir()) setSelCausa(null); }}>
                                {pareto.length > 0 && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 14, right: 36, bottom: 14, left: 36 }}>
                                            <Pie data={anillo} dataKey="minutos" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="100%" paddingAngle={1.5}
                                                label={etiquetaPorcion} labelLine={false} isAnimationActive={false} cursor="pointer"
                                                onClick={(d: any) => {
                                                    const nombre = d?.payload?.name ?? d?.name;
                                                    if (!clicAnillo.tomar() || !nombre || String(nombre).startsWith('Otras (')) return;
                                                    setSelCausa(prev => (prev === nombre ? null : nombre));
                                                }}>
                                                {anillo.map(a => <Cell key={a.name} fill={a.color} fillOpacity={causaEnAnillo && causaEnAnillo !== a.name ? 0.25 : 1} stroke="#fff" />)}
                                            </Pie>
                                            <Tooltip formatter={(value: any, name: any, item: any) => [`${Math.round(Number(value)).toLocaleString('es-CO')} min (${item?.payload?.pct}%)`, String(name).toLowerCase()]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
