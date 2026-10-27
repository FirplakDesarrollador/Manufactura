'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Eraser, Loader2, PencilLine, Plus, Save, Scale, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine, LabelList } from 'recharts';
import { supabase } from '@/lib/supabase';
import { PLANTAS_IFI_MANUALES, PlantaIfi } from '@/lib/calidad/ifiGeneral';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Semáforo del IFI general (meta 90%): verde ≥ 90%, amarillo 80–89,99%, rojo < 80%
const META_IFI = 0.9;
const colorIfi = (v: number | null | undefined) => (v == null ? '#94a3b8' : v >= META_IFI ? '#59a96a' : v >= 0.8 ? '#deb841' : '#d14747');
const colorPlanta = (v: number | null | undefined, meta: number) => (v == null ? '#94a3b8' : v >= meta ? '#59a96a' : v >= meta - 0.1 ? '#deb841' : '#d14747');
const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${(v * 100).toFixed(d)}%`);
const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaCorta = (f: string) => f.split('-').reverse().join('/');
const claveMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}`;

// Semana ISO (lunes a domingo), como la columna "Semana" del Power BI. Clave "AAAA-Snn".
function semanaIso(fecha: string): { anio: number; semana: number; clave: string } {
    const [y, m, d] = fecha.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    const dia = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dia);
    const anio = t.getUTCFullYear();
    const inicio = new Date(Date.UTC(anio, 0, 1));
    const semana = Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7);
    return { anio, semana, clave: `${anio}-S${String(semana).padStart(2, '0')}` };
}

interface PlantaCfg { codigo: PlantaIfi; nombre: string; peso: number; meta: number; orden: number }
interface Detalle { codigo: PlantaIfi; calidad: number; meta: number; pesoEfectivo: number; cumplimiento: number; aporte: number }
interface Dia { fecha: string; dia: number; ifi: number; valores: Partial<Record<PlantaIfi, number>>; detalle: Detalle[]; noTrabajo?: PlantaIfi[] }

// Valor del formulario cuando la planta no trabajó ese día (su peso se reparte entre las demás)
const NO_TRABAJO = 'no_trabajo';
interface Respuesta {
    plantas: PlantaCfg[];
    diario: Dia[];
    mesResumen: { ifi: number | null; diasConDato: number; plantas: (PlantaCfg & { calidad: number | null; dias: number })[] };
    historico: { ifi: number | null; plantas: { planta: PlantaIfi; calidad: number | null; fuente: string; dudoso: boolean; nota: string | null }[] } | null;
    puedeEditar: boolean;
    avisos: string[];
}

// Resultado que muestran las tarjetas de arriba (día, semana, mes o varios)
interface Resumen {
    titulo: string;
    detalle: string;
    ifi: number | null;
    valores: Partial<Record<PlantaIfi, number | null>>;
    fechaRegistro: string | null; // fecha que se abre al "Agregar" (solo cuando es un día)
    noTrabajo?: PlantaIfi[]; // plantas que no trabajaron (solo cuando es un día)
}

// Columna de la gráfica: un día, un mes o un año
interface Columna { key: string; label: string; ifi: number | null; ifiPct: number; tipo: 'dia' | 'mes' | 'anio'; fecha?: string; anio?: number; mes?: number; dia?: Dia }

// Vista anual (Año en "Todas"): resultado guardado de cada mes
interface MesGuardado { anio: number; mes: number; ifi: number; valores: Partial<Record<PlantaIfi, number | null>>; fuente: 'diario' | 'historico'; dias: number }
interface RespuestaAnual { plantas: PlantaCfg[]; meses: MesGuardado[]; puedeEditar: boolean }

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sesión no disponible');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const TooltipColumna = ({ active, payload, plantas, etiqueta = 'IFI' }: any) => {
    if (!active || !payload?.length) return null;
    const c: Columna = payload[0].payload;
    const nombre = (cod: PlantaIfi) => plantas.find((p: PlantaCfg) => p.codigo === cod)?.nombre || cod;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 text-[11px] min-w-[230px]">
            <div className="flex justify-between font-black text-slate-800 mb-1.5">
                <span className="capitalize">{c.tipo === 'dia' ? c.fecha : c.tipo === 'anio' ? `Año ${c.anio}` : `${MESES[(c.mes || 1) - 1]} ${c.anio}`}</span>
                <span style={{ color: etiqueta === 'IFI' ? colorIfi(c.ifi) : '#324354' }}>{etiqueta} {pct(c.ifi)}</span>
            </div>
            {c.dia && (
                <table className="w-full">
                    <thead className="text-[9px] text-slate-400 uppercase">
                        <tr><th className="text-left">Planta</th><th className="text-right">Calidad</th><th className="text-right">Meta</th><th className="text-right">Cumpl.</th><th className="text-right">Peso</th></tr>
                    </thead>
                    <tbody>
                        {c.dia.detalle.map(x => (
                            <tr key={x.codigo} className="text-slate-700">
                                <td className="font-bold" title={nombre(x.codigo)}>{x.codigo}</td>
                                <td className="text-right">{pct(x.calidad)}</td>
                                <td className="text-right text-slate-400">{pct(x.meta, 0)}</td>
                                <td className="text-right font-bold" style={{ color: x.cumplimiento >= 1 ? '#59a96a' : '#d14747' }}>{pct(x.cumplimiento)}</td>
                                <td className="text-right text-slate-500">{pct(x.pesoEfectivo, 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {!!c.dia?.noTrabajo?.length && (
                <p className="text-[10px] font-bold text-slate-500 mt-1">No trabajó: {c.dia.noTrabajo.join(', ')} · peso repartido</p>
            )}
            {c.tipo !== 'dia' && <p className="text-[10px] text-slate-500">Clic para ver {c.tipo === 'anio' ? 'el año' : 'el mes'} arriba</p>}
        </div>
    );
}

// Filtro estilo Power BI: título con borrador encima y lista desplegable de selección múltiple.
// Sin nada marcado equivale a "Todas".
function FiltroPbi({ titulo, seleccion, opciones, onChange, onBorrar, puedeBorrar, minimoUno = false }: {
    titulo: string;
    seleccion: string[];
    opciones: { value: string; label: string }[];
    onChange: (v: string[]) => void;
    onBorrar: () => void;
    puedeBorrar: boolean;
    minimoUno?: boolean; // Año: siempre debe quedar al menos uno
}) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [abierto]);

    const todas = seleccion.length === 0;
    const texto = todas
        ? 'Todas'
        : seleccion.length === 1
            ? opciones.find(o => o.value === seleccion[0])?.label || seleccion[0]
            : 'Varias selecciones';

    const alternar = (v: string) => {
        const nueva = seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v];
        if (minimoUno && nueva.length === 0) return;
        onChange(nueva);
    };

    return (
        <div ref={ref} className="group relative min-w-[120px] flex-1 sm:flex-none sm:w-40">
            <div className="flex items-center justify-between h-4 mb-0.5">
                <span className="text-[10px] font-bold text-slate-500">{titulo}</span>
                <button
                    type="button"
                    onClick={onBorrar}
                    disabled={!puedeBorrar}
                    className={`p-0.5 rounded text-slate-500 hover:text-[#324354] hover:bg-slate-200 transition-opacity ${puedeBorrar ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
                    title="Borrar selecciones"
                    aria-label={`Borrar filtro ${titulo}`}
                >
                    <Eraser className="w-3 h-3" />
                </button>
            </div>
            <button
                type="button"
                onClick={() => setAbierto(v => !v)}
                className={`w-full h-8 bg-white border rounded px-2 text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 ${abierto ? 'border-[#324354]' : 'border-slate-300'}`}
            >
                <span className="truncate capitalize">{texto}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>
            {abierto && (
                <div className="absolute left-0 top-full mt-1 z-40 w-full min-w-[170px] max-h-64 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg py-1">
                    {!minimoUno && (
                        <button type="button" onClick={() => onChange([])} className="w-full px-2 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left border-b border-slate-100">
                            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${todas ? 'bg-[#324354] border-[#324354]' : 'border-slate-400'}`}>
                                {todas && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                            </span>
                            Seleccionar todo
                        </button>
                    )}
                    {opciones.length === 0 && <p className="px-2 py-1.5 text-[11px] text-slate-400 italic">Sin opciones con datos</p>}
                    {opciones.map(o => {
                        const marcado = seleccion.includes(o.value);
                        return (
                            <button key={o.value} type="button" onClick={() => alternar(o.value)} className="w-full px-2 py-1.5 flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-100 text-left capitalize">
                                <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${marcado ? 'bg-[#324354] border-[#324354]' : 'border-slate-400'}`}>
                                    {marcado && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Calidad General Plantas - IFI (MS, MBL, CEFI, FV, RTM): filtros tipo Power BI y resultado diario o mensual
export default function CalidadGeneralIFI() {
    const hoy = hoyBogota();
    const anioActual = Number(hoy.slice(0, 4));
    const mesActual = Number(hoy.slice(5, 7));

    // Filtros de selección múltiple (lista vacía = "Todas"). Al abrir: año y mes en curso.
    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([mesActual]);
    const [semanas, setSemanas] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);

    // Datos por mes ya consultados ("YYYY-MM" → respuesta de la API)
    const [datos, setDatos] = useState<Record<string, Respuesta>>({});
    const [anual, setAnual] = useState<RespuestaAnual | null>(null);
    const todosLosAnios = anios.length === 0;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showRegistro, setShowRegistro] = useState(false);
    const [regFecha, setRegFecha] = useState(hoy);
    const [regValores, setRegValores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const [regError, setRegError] = useState<string | null>(null);

    // Planta elegida en las tarjetas: la gráfica muestra solo su calidad (null = IFI general)
    const [plantaSel, setPlantaSel] = useState<PlantaIfi | null>(null);

    // Columna resaltada (clic en la gráfica, como en Power BI). Se quita con otro clic en ella o por fuera.
    const [sel, setSel] = useState<string | null>(null);
    const graficaRef = useRef<HTMLDivElement>(null);
    const clicEnBarra = useRef(false);
    const ultimoClic = useRef(0);

    // Meses (año, mes) que se necesitan según los filtros de Año y Mes
    const periodos = useMemo(() => {
        const out: { anio: number; mes: number }[] = [];
        [...anios].sort((a, b) => a - b).forEach(a => {
            const tope = a === anioActual ? mesActual : a < anioActual ? 12 : 0;
            const lista = meses.length ? [...meses].sort((x, y) => x - y) : Array.from({ length: 12 }, (_, i) => i + 1);
            lista.filter(m => m <= tope).forEach(m => out.push({ anio: a, mes: m }));
        });
        return out;
    }, [anios, meses, anioActual, mesActual]);

    const cargar = useCallback(async () => {
        const pendientes = periodos.filter(p => !datos[claveMes(p.anio, p.mes)]);
        if (pendientes.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const headers = await authHeaders();
            const nuevos: Record<string, Respuesta> = {};
            // De a 3 meses en paralelo para no saturar la API
            for (let i = 0; i < pendientes.length; i += 3) {
                const lote = pendientes.slice(i, i + 3);
                const resps = await Promise.all(lote.map(async p => {
                    const resp = await fetch(`/api/calidad/ifi-general?anio=${p.anio}&mes=${p.mes}`, { headers });
                    const json = await resp.json();
                    if (!resp.ok || !json.success) throw new Error(json.error || 'Error consultando IFI general');
                    return [claveMes(p.anio, p.mes), json as Respuesta] as const;
                }));
                resps.forEach(([k, r]) => { nuevos[k] = r; });
            }
            setDatos(prev => ({ ...prev, ...nuevos }));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [periodos, datos]);

    useEffect(() => { void cargar(); }, [cargar]);

    // Año en "Todas": un solo llamado con el resultado guardado de todos los meses
    useEffect(() => {
        if (!todosLosAnios || anual) return;
        let vivo = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await fetch('/api/calidad/ifi-general?vista=anual', { headers: await authHeaders() });
                const json = await resp.json();
                if (!resp.ok || !json.success) throw new Error(json.error || 'Error consultando el IFI por año');
                if (vivo) setAnual(json);
            } catch (e: any) {
                if (vivo) setError(e.message);
            } finally {
                if (vivo) setLoading(false);
            }
        })();
        return () => { vivo = false; };
    }, [todosLosAnios, anual]);

    // Meses guardados que pasan el filtro de Mes (vista anual)
    const mesesAnuales = useMemo(
        () => (anual?.meses || []).filter(m => meses.length === 0 || meses.includes(m.mes)),
        [anual, meses]
    );

    // Ventana "Configurar pesos": pesos de las plantas por año (en %)
    const [showPesos, setShowPesos] = useState(false);
    const [pesosAnio, setPesosAnio] = useState(anioActual);
    const [pesosTabla, setPesosTabla] = useState<Record<string, Partial<Record<PlantaIfi, number>>>>({});
    const [pesosForm, setPesosForm] = useState<Record<string, string>>({});
    const [pesosPlantas, setPesosPlantas] = useState<PlantaCfg[]>([]);
    const [pesosEstado, setPesosEstado] = useState<{ cargando: boolean; guardando: boolean; error: string | null }>({ cargando: false, guardando: false, error: null });

    const abrirPesos = async () => {
        setShowPesos(true);
        setPesosAnio(anios.length === 1 ? anios[0] : anioActual);
        setPesosEstado({ cargando: true, guardando: false, error: null });
        try {
            const resp = await fetch('/api/calidad/ifi-general?vista=pesos', { headers: await authHeaders() });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'No se pudieron consultar los pesos');
            setPesosTabla(json.pesos || {});
            setPesosPlantas(json.plantas || []);
            setPesosEstado({ cargando: false, guardando: false, error: null });
        } catch (e: any) {
            setPesosEstado({ cargando: false, guardando: false, error: e.message });
        }
    };

    // Al cambiar de año se llenan los pesos guardados de ese año o, si no tiene, los vigentes
    useEffect(() => {
        if (!showPesos) return;
        const delAnio = pesosTabla[String(pesosAnio)];
        const v: Record<string, string> = {};
        pesosPlantas.forEach(p => {
            const peso = delAnio?.[p.codigo] ?? p.peso;
            v[p.codigo] = String(+(peso * 100).toFixed(2));
        });
        setPesosForm(v);
    }, [showPesos, pesosAnio, pesosTabla, pesosPlantas]);

    const sumaPesos = pesosPlantas.reduce((a, p) => a + (Number((pesosForm[p.codigo] || '').replace(',', '.')) || 0), 0);

    const guardarPesos = async () => {
        setPesosEstado(e => ({ ...e, guardando: true, error: null }));
        try {
            const pesos: Record<string, number> = {};
            pesosPlantas.forEach(p => { pesos[p.codigo] = Number((pesosForm[p.codigo] || '0').replace(',', '.')); });
            const resp = await fetch('/api/calidad/ifi-general', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ accion: 'guardar_pesos', anio: pesosAnio, pesos }) });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'No se pudieron guardar los pesos');
            setShowPesos(false);
            // Se recalcula todo con los pesos nuevos
            setDatos({});
            setAnual(null);
        } catch (e: any) {
            setPesosEstado(st => ({ ...st, guardando: false, error: e.message }));
            return;
        }
        setPesosEstado({ cargando: false, guardando: false, error: null });
    };

    // Respuestas cargadas para los periodos visibles
    const respuestas = useMemo(
        () => periodos.map(p => ({ ...p, r: datos[claveMes(p.anio, p.mes)] })).filter(x => x.r) as { anio: number; mes: number; r: Respuesta }[],
        [periodos, datos]
    );
    const base = respuestas[0]?.r || Object.values(datos)[0] || null;
    const plantas = base?.plantas || anual?.plantas || [];
    const puedeEditar = !!(base?.puedeEditar || anual?.puedeEditar);
    const avisos = Array.from(new Set(respuestas.flatMap(x => x.r.avisos || [])));
    const variosAnios = anios.length > 1;

    // Días con dato de los periodos visibles y los que quedan tras Semana / Día
    const todosLosDias = useMemo(() => respuestas.flatMap(x => x.r.diario), [respuestas]);
    const diasSemana = useMemo(
        () => (semanas.length ? todosLosDias.filter(d => semanas.includes(semanaIso(d.fecha).clave)) : todosLosDias),
        [todosLosDias, semanas]
    );
    const diasFiltrados = useMemo(() => (diasSel.length ? diasSemana.filter(d => diasSel.includes(d.fecha)) : diasSemana), [diasSemana, diasSel]);
    const filtroDiario = semanas.length > 0 || diasSel.length > 0;
    const unSoloMes = periodos.length === 1;

    // Resultado de un mes: promedio diario de la API o, si no hay diario, el histórico mensual
    const resumenMes = useCallback((anio: number, m: number, r: Respuesta): Resumen => {
        const conDiario = r.diario.length > 0;
        const valores: Partial<Record<PlantaIfi, number | null>> = {};
        r.plantas.forEach(p => {
            valores[p.codigo] = conDiario
                ? r.mesResumen.plantas.find(x => x.codigo === p.codigo)?.calidad ?? null
                : r.historico?.plantas.find(h => h.planta === p.codigo)?.calidad ?? null;
        });
        return {
            titulo: `${MESES[m - 1]}${variosAnios || anio !== anioActual ? ` ${anio}` : ''}`,
            detalle: conDiario ? `Promedio de ${r.mesResumen.diasConDato} día(s) con dato` : r.historico ? 'Histórico mensual (Excel / fuentes)' : 'Sin datos',
            ifi: conDiario ? r.mesResumen.ifi : r.historico?.ifi ?? null,
            valores,
            fechaRegistro: null
        };
    }, [variosAnios, anioActual]);

    const resumenDias = useCallback((dias: Dia[], titulo: string, detalle: string): Resumen => {
        const valores: Partial<Record<PlantaIfi, number | null>> = {};
        plantas.forEach(p => {
            valores[p.codigo] = promedio(dias.map(d => d.valores[p.codigo]).filter((v): v is number => typeof v === 'number'));
        });
        return {
            titulo,
            detalle,
            ifi: promedio(dias.map(d => d.ifi)),
            valores,
            fechaRegistro: dias.length === 1 ? dias[0].fecha : null,
            noTrabajo: dias.length === 1 ? dias[0].noTrabajo || [] : undefined
        };
    }, [plantas]);

    const resumenMesesGuardados = useCallback((lista: MesGuardado[], titulo: string): Resumen => {
        const valores: Partial<Record<PlantaIfi, number | null>> = {};
        plantas.forEach(p => {
            valores[p.codigo] = promedio(lista.map(m => m.valores[p.codigo]).filter((v): v is number => typeof v === 'number'));
        });
        return { titulo, detalle: `Promedio de ${lista.length} mes(es) con dato`, ifi: promedio(lista.map(m => m.ifi)), valores, fechaRegistro: null };
    }, [plantas]);

    const tituloDia = (d: Dia) => `${d.dia} de ${MESES[Number(d.fecha.slice(5, 7)) - 1]}${variosAnios ? ` ${d.fecha.slice(0, 4)}` : ''}`;

    // Columnas: por día (un solo mes, o filtros de Semana/Día) o por mes (varios meses)
    const columnas: Columna[] = useMemo(() => {
        if (todosLosAnios) {
            const porAnio = new Map<number, MesGuardado[]>();
            mesesAnuales.forEach(m => porAnio.set(m.anio, [...(porAnio.get(m.anio) || []), m]));
            return [...porAnio.entries()].sort(([a], [b]) => a - b).map(([a, lista]) => {
                const ifi = plantaSel
                    ? promedio(lista.map(m => m.valores[plantaSel]).filter((v): v is number => typeof v === 'number'))
                    : promedio(lista.map(m => m.ifi));
                return { key: `a-${a}`, label: String(a), ifi, ifiPct: ifi == null ? 0 : +(ifi * 100).toFixed(1), tipo: 'anio' as const, anio: a };
            }).filter(c => c.ifi != null);
        }
        if (!unSoloMes && !filtroDiario) {
            return respuestas.map(({ anio, mes, r }) => {
                const rm = resumenMes(anio, mes, r);
                const ifi = plantaSel ? rm.valores[plantaSel] ?? null : rm.ifi;
                return {
                    key: `m-${claveMes(anio, mes)}`,
                    label: `${MESES[mes - 1].slice(0, 3)}${variosAnios ? ` ${String(anio).slice(2)}` : ''}`,
                    ifi,
                    ifiPct: ifi == null ? 0 : +(ifi * 100).toFixed(1),
                    tipo: 'mes' as const,
                    anio,
                    mes
                };
            }).filter(c => c.ifi != null);
        }
        return diasFiltrados
            .map(d => {
                const v = plantaSel ? d.valores[plantaSel] ?? null : d.ifi;
                return {
                    key: d.fecha,
                    label: unSoloMes ? String(d.dia) : `${d.dia}/${Number(d.fecha.slice(5, 7))}${variosAnios ? `/${d.fecha.slice(2, 4)}` : ''}`,
                    ifi: v,
                    ifiPct: v == null ? 0 : +(v * 100).toFixed(1),
                    tipo: 'dia' as const,
                    fecha: d.fecha,
                    dia: d
                };
            })
            .filter(c => c.ifi != null);
    }, [respuestas, diasFiltrados, unSoloMes, filtroDiario, variosAnios, resumenMes, todosLosAnios, mesesAnuales, plantaSel]);

    // Meta y semáforo de la gráfica: IFI general (90%) o la meta de la planta elegida
    const cfgSel = plantaSel ? plantas.find(p => p.codigo === plantaSel) || null : null;
    const metaGrafica = cfgSel ? cfgSel.meta : META_IFI;
    const colorColumna = (v: number | null | undefined) => (cfgSel ? colorPlanta(v, cfgSel.meta) : colorIfi(v));

    // Si la columna resaltada deja de existir (cambio de filtros), se quita
    useEffect(() => {
        if (sel && !columnas.some(c => c.key === sel)) setSel(null);
    }, [columnas, sel]);

    // Clic por fuera de la gráfica: quita el resaltado (no aplica a tarjetas, filtros ni ventanas)
    useEffect(() => {
        if (!sel) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (graficaRef.current?.contains(t)) return;
            if ((t as HTMLElement).closest?.('[data-ifi-conservar]')) return;
            setSel(null);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [sel]);

    // El clic puede llegar por la barra y por la gráfica a la vez: se procesa una sola vez
    const alternar = (key: string) => {
        clicEnBarra.current = true;
        const ahora = Date.now();
        if (ahora - ultimoClic.current < 150) return;
        ultimoClic.current = ahora;
        setSel(prev => (prev === key ? null : key));
    };

    // Resultado para las tarjetas
    const resumen: Resumen | null = useMemo(() => {
        const col = sel ? columnas.find(c => c.key === sel) : null;
        if (col?.tipo === 'anio') return resumenMesesGuardados(mesesAnuales.filter(m => m.anio === col.anio), `Año ${col.anio}`);
        if (todosLosAnios) return resumenMesesGuardados(mesesAnuales, 'Todos los años');
        if (col?.tipo === 'dia' && col.dia) return resumenDias([col.dia], tituloDia(col.dia), `Resultado del día ${fechaCorta(col.fecha!)}`);
        if (col?.tipo === 'mes') {
            const r = datos[claveMes(col.anio!, col.mes!)];
            if (r) return resumenMes(col.anio!, col.mes!, r);
        }
        if (filtroDiario) {
            if (diasFiltrados.length === 1) return resumenDias(diasFiltrados, tituloDia(diasFiltrados[0]), `Resultado del día ${fechaCorta(diasFiltrados[0].fecha)}`);
            const titulo = diasSel.length ? `${diasSel.length} días` : semanas.length === 1 ? `Semana ${semanaIso(diasFiltrados[0]?.fecha || hoy).semana}` : `${semanas.length} semanas`;
            return resumenDias(diasFiltrados, titulo, `Promedio de ${diasFiltrados.length} día(s) con dato`);
        }
        if (unSoloMes) {
            const x = respuestas[0];
            return x ? resumenMes(x.anio, x.mes, x.r) : null;
        }
        // Varios meses: promedio de los meses con dato
        const porMes = respuestas.map(x => resumenMes(x.anio, x.mes, x.r)).filter(x => x.ifi != null);
        const valores: Partial<Record<PlantaIfi, number | null>> = {};
        plantas.forEach(p => {
            valores[p.codigo] = promedio(porMes.map(x => x.valores[p.codigo]).filter((v): v is number => typeof v === 'number'));
        });
        const titulo = meses.length === 0 ? (anios.length === 1 ? String(anios[0]) : `${anios.length} años`) : `${respuestas.length} meses`;
        return { titulo, detalle: `Promedio de ${porMes.length} mes(es) con dato`, ifi: promedio(porMes.map(x => x.ifi as number)), valores, fechaRegistro: null };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sel, columnas, datos, filtroDiario, diasFiltrados, diasSel, semanas, unSoloMes, respuestas, plantas, meses, anios, resumenMes, resumenDias, todosLosAnios, mesesAnuales, resumenMesesGuardados]);

    // Opciones de los filtros (dependen de los anteriores, como en Power BI)
    const opcionesAnio = useMemo(() => Array.from({ length: anioActual - 2021 + 1 }, (_, i) => anioActual - i).map(a => ({ value: String(a), label: String(a) })), [anioActual]);
    const opcionesSemana = useMemo(() => {
        const mapa = new Map<string, { anio: number; semana: number }>();
        todosLosDias.forEach(d => { const s = semanaIso(d.fecha); mapa.set(s.clave, s); });
        return Array.from(mapa.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([clave, s]) => ({ value: clave, label: `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}` }));
    }, [todosLosDias, variosAnios]);
    const opcionesDia = diasSemana.map(d => ({ value: d.fecha, label: unSoloMes ? String(d.dia) : fechaCorta(d.fecha).slice(0, variosAnios ? 10 : 5) }));

    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanas([]); setDiasSel([]); setSel(null); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanas([]); setDiasSel([]); setSel(null); };
    const cambiarSemanas = (v: string[]) => { setSemanas(v); setDiasSel([]); setSel(null); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); setSel(null); };

    // Prellenar el formulario con lo ya registrado en la fecha elegida
    const abrirRegistro = (fecha = hoy) => {
        setRegFecha(fecha);
        setRegError(null);
        setShowRegistro(true);
    };
    useEffect(() => {
        if (!showRegistro) return;
        const dia = Object.values(datos).flatMap(r => r.diario).find(d => d.fecha === regFecha);
        const v: Record<string, string> = {};
        PLANTAS_IFI_MANUALES.forEach(p => {
            const val = dia?.valores[p];
            v[p] = dia?.noTrabajo?.includes(p) ? NO_TRABAJO : typeof val === 'number' ? String(+(val * 100).toFixed(1)) : '';
        });
        setRegValores(v);
    }, [showRegistro, regFecha, datos]);

    const guardarRegistro = async () => {
        setGuardando(true);
        setRegError(null);
        try {
            const valores: Record<string, number | string | null> = {};
            PLANTAS_IFI_MANUALES.forEach(p => {
                const raw = (regValores[p] || '').replace(',', '.').trim();
                valores[p] = raw === NO_TRABAJO ? NO_TRABAJO : raw === '' ? null : Number(raw);
            });
            const resp = await fetch('/api/calidad/ifi-general', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({ accion: 'registrar', fecha: regFecha, valores })
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'No se pudo guardar');
            setShowRegistro(false);
            // Se vuelve a consultar el mes de la fecha registrada
            const [y, m] = regFecha.split('-').map(Number);
            setDatos(prev => {
                const copia = { ...prev };
                delete copia[claveMes(y, m)];
                return copia;
            });
        } catch (e: any) {
            setRegError(e.message);
        } finally {
            setGuardando(false);
        }
    };

    const sinColumnas = !loading && columnas.length === 0;
    const mesSinDiario = unSoloMes && !filtroDiario ? respuestas[0]?.r : null;
    const sujeto = cfgSel ? `Calidad ${cfgSel.nombre} (${cfgSel.codigo})` : 'IFI General';
    const tituloGrafica = todosLosAnios
        ? `${sujeto} por Año${meses.length ? ` (${meses.length === 1 ? MESES[meses[0] - 1] : `${meses.length} meses`})` : ''}`
        : filtroDiario || unSoloMes
        ? `${sujeto} por Día${unSoloMes && !filtroDiario ? ` (${MESES[periodos[0].mes - 1]} ${periodos[0].anio})` : ''}`
        : `${sujeto} por Mes (${[...anios].sort().join(', ')})`;

    return (
        <div className="space-y-3">
            {/* Encabezado: título a la izquierda (con acciones) y filtros estilo Power BI a la derecha */}
            <div data-ifi-conservar className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                <div className="min-w-0 space-y-2">
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-[#324354]">Calidad General Plantas - IFI</h2>
                    </div>
                    {puedeEditar && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => abrirRegistro(resumen?.fechaRegistro || hoy)}
                                className="px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg font-bold flex items-center gap-1.5"
                            >
                                <PencilLine className="w-3.5 h-3.5" />
                                <span>Registrar calidad del día</span>
                            </button>
                            <button
                                onClick={abrirPesos}
                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-[#324354] rounded-lg font-bold flex items-center gap-1.5"
                                title="Peso de cada planta en el IFI general, por año"
                            >
                                <Scale className="w-3.5 h-3.5" />
                                <span>Configurar pesos</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-end gap-2 w-full lg:w-auto">
                    <FiltroPbi
                        titulo="Año"
                        seleccion={anios.map(String)}
                        opciones={opcionesAnio}
                        onChange={cambiarAnios}
                        onBorrar={() => cambiarAnios([])}
                        puedeBorrar={anios.length > 0}
                    />
                    <FiltroPbi
                        titulo="Mes"
                        seleccion={meses.map(String)}
                        opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
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
                </div>
            </div>

            {error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            {avisos.map(a => <div key={a} className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{a}</div>)}

            {/* Resultado del periodo (o de la columna resaltada) y por planta */}
            <div data-ifi-conservar className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div
                    onClick={() => setPlantaSel(null)}
                    className={`col-span-2 p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between transition-opacity ${plantaSel ? 'opacity-40 cursor-pointer hover:opacity-70' : ''}`}
                    style={{ borderColor: colorIfi(resumen?.ifi), background: `${colorIfi(resumen?.ifi)}14` }}
                    title={plantaSel ? 'Ver el IFI general de todas las plantas' : undefined}
                >
                    <div className="flex justify-between items-center gap-2">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                            IFI General · <span className="capitalize">{resumen?.titulo || '—'}</span>
                        </span>
                        {sel ? (
                            <button
                                type="button"
                                onClick={() => setSel(null)}
                                className="text-[10px] font-black bg-white text-[#324354] px-2 py-0.5 rounded-full border border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                                title="Quitar el resaltado"
                            >
                                <X className="w-3 h-3" /> Quitar selección
                            </button>
                        ) : (
                            <span className="text-[10px] font-black bg-white/80 text-slate-700 px-1.5 rounded-full border border-slate-200">Meta 90%</span>
                        )}
                    </div>
                    <p className="text-2xl font-black mt-1" style={{ color: colorIfi(resumen?.ifi) }}>{pct(resumen?.ifi)}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{resumen?.detalle || (loading ? 'Cargando…' : 'Sin datos')}</p>
                </div>
                {plantas.map(p => {
                    const cal = resumen?.valores[p.codigo] ?? null;
                    // MBL, CEFI y RTM se registran a mano: sin dato se muestran vacías con opción de agregar
                    const puedeAgregar = PLANTAS_IFI_MANUALES.includes(p.codigo) && puedeEditar;
                    const fechaAgregar = resumen?.fechaRegistro || hoy;
                    return (
                        <div
                            key={p.codigo}
                            onClick={() => setPlantaSel(prev => (prev === p.codigo ? null : p.codigo))}
                            title={plantaSel === p.codigo ? 'Volver al IFI general' : `Ver solo ${p.nombre} en la gráfica`}
                            className={`p-2 rounded-xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-all ${cal === null ? 'bg-slate-50 border-dashed border-slate-300' : 'bg-white border-slate-200'} ${plantaSel === p.codigo ? 'ring-2 ring-[#324354] border-[#324354]' : plantaSel ? 'opacity-60 hover:opacity-100' : 'hover:border-[#324354]'}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-600 uppercase" title={p.nombre}>{p.codigo}</span>
                                <span className="text-[9px] font-bold text-slate-400">peso {pct(p.peso, 0)}</span>
                            </div>
                            {resumen?.noTrabajo?.includes(p.codigo) ? (
                                <span className="flex items-center gap-1 my-0.5">
                                    <span className="text-[13px] font-black text-slate-500" title="Ese día su peso se repartió entre las plantas que trabajaron">No trabajó</span>
                                </span>
                            ) : cal === null ? (
                                puedeAgregar ? (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); abrirRegistro(fechaAgregar); }}
                                        className="self-start my-0.5 px-2 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#324354] hover:bg-slate-100 text-[#324354] text-[11px] font-black flex items-center gap-1"
                                        title={`Registrar la calidad de ${p.nombre} del ${fechaCorta(fechaAgregar)}`}
                                    >
                                        <Plus className="w-3 h-3" /> Agregar
                                    </button>
                                ) : (
                                    <span className="text-[11px] font-bold text-slate-400 italic my-1">Sin dato</span>
                                )
                            ) : (
                                <span className="flex items-center gap-1">
                                    <span className="text-lg font-black" style={{ color: colorPlanta(cal, p.meta) }}>{pct(cal)}</span>
                                </span>
                            )}
                            <span className="text-[9px] font-bold text-slate-400">meta {pct(p.meta, 0)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Gráfica: clic en una columna la resalta; otro clic en ella o por fuera la quita */}
            <div
                ref={graficaRef}
                className="bg-white rounded-xl p-3 shadow-xs border border-slate-200"
                onClick={() => {
                    // Clic dentro del recuadro pero fuera de las columnas
                    if (clicEnBarra.current) { clicEnBarra.current = false; return; }
                    setSel(null);
                }}
            >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 capitalize">{tituloGrafica}</h3>
                    <span className="text-[10px] font-bold text-slate-500">
                        {cfgSel
                            ? `Semáforo vs. meta ${pct(cfgSel.meta, 0)}: Verde ≥ meta | Amarillo hasta 10 pts debajo | Rojo · Clic en otra tarjeta o en IFI General para cambiar`
                            : 'Semáforo: Verde ≥90% | Amarillo 80–89,9% | Rojo <80% · Clic en una columna para resaltarla'}
                    </span>
                </div>
                <div className="h-[380px] w-full">
                    {loading && columnas.length === 0 ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                    ) : sinColumnas ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-sm font-bold text-slate-500">Sin datos para los filtros elegidos.</p>
                            {mesSinDiario?.historico && (
                                <p className="text-[11px] text-slate-400 max-w-md">
                                    Se muestra el histórico mensual. Plantas: {mesSinDiario.historico.plantas.map(h => `${h.planta} ${pct(h.calidad)}${h.dudoso ? '*' : ''}`).join(' · ')}
                                    {mesSinDiario.historico.plantas.some(h => h.dudoso) && ' (* dato dudoso del Excel)'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={columnas}
                                margin={{ top: 22, right: 10, left: 62, bottom: 0 }}
                                onClick={(e: any) => {
                                    // Recharts 3 entrega el índice de la columna bajo el cursor
                                    const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
                                    const col = Number.isInteger(idx) ? columnas[idx] : columnas.find(c => c.label === String(e?.activeLabel));
                                    if (col) alternar(col.key);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis domain={[(min: number) => Math.max(0, Math.min(70, Math.floor(min / 10) * 10)), 100]} tick={{ fontSize: 10 }} width={32} />
                                <Tooltip content={<TooltipColumna plantas={plantas} etiqueta={cfgSel ? cfgSel.codigo : 'IFI'} />} cursor={{ fill: '#f1f5f9' }} />
                                <ReferenceLine y={metaGrafica * 100} stroke="#2563eb" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta ${pct(metaGrafica, 0)}`, fill: '#2563eb', fontSize: 10, fontWeight: 800, position: 'left', offset: 36 }} />
                                <Bar
                                    dataKey="ifiPct"
                                    radius={[4, 4, 0, 0]}
                                    cursor="pointer"
                                    onClick={(item: any) => {
                                        const key = item?.payload?.key || item?.key;
                                        if (key) alternar(key);
                                    }}
                                >
                                    {columnas.map(c => <Cell key={c.key} fill={colorColumna(c.ifi)} fillOpacity={sel && sel !== c.key ? 0.3 : 1} />)}
                                    <LabelList
                                        dataKey="ifiPct"
                                        position="top"
                                        formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                                        style={{ fontSize: 10, fontWeight: 800, fill: '#334155' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Modal: registrar calidad del día (MBL, CEFI, RTM) */}
            {showPesos && (
                <div data-ifi-conservar className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60" onMouseDown={e => { if (e.target === e.currentTarget && !pesosEstado.guardando) setShowPesos(false); }}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e2ded5] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#e2ded5] flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">Configurar pesos por año</h3>
                                <p className="text-[11px] text-slate-500">Peso de cada planta en el IFI general. Deben sumar 100%. Si una planta no trabaja un día, su peso se reparte entre las demás.</p>
                            </div>
                            <button onClick={() => setShowPesos(false)} disabled={pesosEstado.guardando} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Año</label>
                                <select value={pesosAnio} onChange={e => setPesosAnio(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-[#324354] outline-none focus:border-[#324354]">
                                    {Array.from({ length: anioActual + 1 - 2021 + 1 }, (_, i) => anioActual + 1 - i).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                {!pesosEstado.cargando && !pesosTabla[String(pesosAnio)] && (
                                    <p className="text-[10px] font-bold text-amber-700 mt-1">Este año no tiene pesos propios: se muestran los vigentes.</p>
                                )}
                            </div>
                            {pesosEstado.cargando ? (
                                <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                            ) : (
                                pesosPlantas.map(p => (
                                    <div key={p.codigo} className="flex items-center gap-3">
                                        <span className="flex-1 text-xs font-bold text-slate-700">{p.nombre} <span className="text-slate-400">({p.codigo})</span></span>
                                        <div className="relative w-28">
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                max={100}
                                                step="0.1"
                                                value={pesosForm[p.codigo] ?? ''}
                                                onChange={e => setPesosForm(prev => ({ ...prev, [p.codigo]: e.target.value }))}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 pr-7 text-sm font-bold text-[#324354] text-right outline-none focus:border-[#324354]"
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div className={`flex justify-between text-xs font-black px-3 py-2 rounded-lg border ${Math.abs(sumaPesos - 100) <= 0.05 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                <span>Total</span>
                                <span>{sumaPesos.toFixed(1)}%</span>
                            </div>
                            {pesosEstado.error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{pesosEstado.error}</div>}
                        </div>
                        <div className="px-5 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] flex justify-end gap-2">
                            <button onClick={() => setShowPesos(false)} disabled={pesosEstado.guardando} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">Cancelar</button>
                            <button
                                onClick={guardarPesos}
                                disabled={pesosEstado.guardando || pesosEstado.cargando || Math.abs(sumaPesos - 100) > 0.05}
                                className="px-4 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {pesosEstado.guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>Guardar pesos {pesosAnio}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRegistro && (
                <div data-ifi-conservar className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60" onMouseDown={e => { if (e.target === e.currentTarget && !guardando) setShowRegistro(false); }}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e2ded5] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#e2ded5] flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#324354]">Registrar calidad del día</h3>
                                <p className="text-[11px] text-slate-500">MS y FV se calculan automáticamente. Deja vacío para quitar un dato.</p>
                            </div>
                            <button onClick={() => setShowRegistro(false)} disabled={guardando} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
                                <input type="date" value={regFecha} max={hoy} onChange={e => setRegFecha(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-[#324354] outline-none focus:border-[#324354]" />
                            </div>
                            {PLANTAS_IFI_MANUALES.map(p => {
                                const cfg = plantas.find(x => x.codigo === p);
                                const noTrabajo = regValores[p] === NO_TRABAJO;
                                return (
                                    <div key={p}>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between mb-1">
                                            <span>{cfg?.nombre || p} ({p})</span>
                                            <span className="text-slate-400">meta {pct(cfg?.meta, 0)}</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type={noTrabajo ? 'text' : 'number'}
                                                    inputMode="decimal"
                                                    min={0}
                                                    max={100}
                                                    step="0.1"
                                                    value={noTrabajo ? '' : regValores[p] ?? ''}
                                                    disabled={noTrabajo}
                                                    onChange={e => setRegValores(prev => ({ ...prev, [p]: e.target.value }))}
                                                    placeholder={noTrabajo ? 'No trabajó · su peso se reparte' : 'Sin dato'}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] disabled:bg-slate-100 disabled:placeholder:text-slate-500"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                                            </div>
                                            {/* Planta sin producción ese día: queda fuera del cálculo y los pesos se recalculan */}
                                            <button
                                                type="button"
                                                onClick={() => setRegValores(prev => ({ ...prev, [p]: noTrabajo ? '' : NO_TRABAJO }))}
                                                className={`h-9 px-2.5 rounded-lg border text-[11px] font-black whitespace-nowrap flex items-center gap-1 ${noTrabajo ? 'bg-[#324354] border-[#324354] text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                                                title="Marcar que la planta no trabajó este día"
                                            >
                                                {noTrabajo && <Check className="w-3 h-3" strokeWidth={3} />} No trabajó
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {regError && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{regError}</div>}
                        </div>
                        <div className="px-5 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] flex justify-end gap-2">
                            <button onClick={() => setShowRegistro(false)} disabled={guardando} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">Cancelar</button>
                            <button onClick={guardarRegistro} disabled={guardando} className="px-4 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{guardando ? 'Guardando…' : 'Guardar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
