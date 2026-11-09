'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarPlus, Loader2, X } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ReferenceLine
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import FiltroPbi from '@/components/calidad/FiltroPbi';
import {
    HistoricoSP, META_SP, PLANTAS_SP, PlanEvaluado, PlanSP, RegistroSP,
    colorSemaforo, hoyIso, marcarEjecutadas, nombreHerramienta, nombrePlanta, planVencido, promedio, semanaDe
} from '@/lib/sistema-produccion/cumplimiento';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const COLOR_META = '#3b8f50';
const SIN_PLANTA = 'Sin planta';
const ROLES = ['Jefe', 'Supervisor', 'Líder'] as const;

type Gran = 'dia' | 'semana' | 'mes' | 'anio';
type Rol = typeof ROLES[number] | 'Otro';

const norm = (s: string | null | undefined) =>
    String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`);
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
const rolDeCargo = (cargo: string | null | undefined): Rol => {
    const c = norm(cargo);
    if (c.includes('jefe') || c.includes('director') || c.includes('gerente')) return 'Jefe';
    if (c.includes('supervisor') || c.includes('coordinador')) return 'Supervisor';
    if (c.includes('lider')) return 'Líder';
    return 'Otro';
};

// Una observación: semana del histórico del Excel (valor ya calculado) o programación de la app (ejecutada o no)
interface Obs {
    fecha: string;      // día de la programación; en el histórico, el viernes de la semana
    semana: string;     // AAAA-Snn
    viernes: string;    // viernes de la semana (asigna mes y año, como el Excel)
    valor?: number;     // histórico
    ejec?: number;      // app: 1 ejecutada, 0 no
    hist: boolean;
}
interface Empleado { nombreCompleto: string; correo_electronico: string | null; cargo: string | null }
interface Filtro { herr?: string | null; planta?: string | null; persona?: string | null }

// Cumplimiento de un conjunto de observaciones: cada semana vale su % (histórico) o ejecutadas ÷ programadas (app);
// el periodo es el promedio de sus semanas, como el "PROMEDIO MENSUAL" del Excel. Por día: solo la app.
function resumen(obs: Obs[]) {
    const semanas = new Map<string, { vals: number[]; ejec: number; total: number }>();
    obs.forEach(o => {
        if (!semanas.has(o.semana)) semanas.set(o.semana, { vals: [], ejec: 0, total: 0 });
        const s = semanas.get(o.semana)!;
        if (o.hist) s.vals.push(o.valor!);
        else { s.total += 1; s.ejec += o.ejec!; }
    });
    const valores = [...semanas.values()].map(s => (s.vals.length ? promedio(s.vals)! : s.total ? (s.ejec / s.total) * 100 : null))
        .filter((v): v is number => v !== null);
    const app = obs.filter(o => !o.hist);
    return {
        valor: promedio(valores),
        semanas: valores.length,
        programadas: app.length,
        ejecutadas: app.reduce((a, o) => a + (o.ejec || 0), 0),
        conHistorico: obs.some(o => o.hist)
    };
}

const claveGran = (o: Obs, g: Gran) => (g === 'dia' ? o.fecha : g === 'semana' ? o.semana : g === 'mes' ? o.viernes.slice(0, 7) : o.viernes.slice(0, 4));
const etiquetaGran = (k: string, g: Gran, variosAnios: boolean) =>
    g === 'dia' ? `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`
        : g === 'semana' ? `S${Number(k.slice(6))}${variosAnios ? ` ${k.slice(2, 4)}` : ''}`
            : g === 'mes' ? `${MESES[Number(k.slice(5, 7)) - 1].slice(0, 3)}${variosAnios ? ` ${k.slice(2, 4)}` : ''}`
                : k;
const nombreGran = (k: string, g: Gran) =>
    g === 'dia' ? k.split('-').reverse().join('/') : g === 'semana' ? `Semana ${Number(k.slice(6))} · ${k.slice(0, 4)}`
        : g === 'mes' ? `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}` : `Año ${k}`;

const TooltipCumpl = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-2.5 text-[11px] min-w-[190px] space-y-0.5">
            <p className="font-black text-slate-800 capitalize mb-1">{d.nombre}</p>
            <p className="flex justify-between gap-3"><span className="text-slate-600">Cumplimiento</span><span className="font-black" style={{ color: colorSemaforo(d.valor) }}>{pct(d.valor)}</span></p>
            <p className="flex justify-between gap-3"><span className="text-slate-600">Meta</span><span className="font-black text-slate-800">{META_SP} %</span></p>
            {d.programadas > 0 && <p className="flex justify-between gap-3"><span className="text-slate-600">Ejecutadas / programadas</span><span className="font-black text-slate-800">{d.ejecutadas} / {d.programadas}</span></p>}
            {d.semanas > 1 && <p className="text-[10px] text-slate-400">Promedio de {d.semanas} semanas</p>}
            {d.conHistorico && <p className="text-[10px] text-slate-400">Incluye histórico del Excel ILU</p>}
        </div>
    );
};

// Estadísticas de Producción → Cumplimiento del Sistema de Producción.
// Como el Power BI "BI SFPK": cumplimiento general FIRPLAK en el tiempo, por herramienta, por planta y por persona.
// Cumplimiento = auditorías OPT Sistémica ejecutadas ÷ programadas (meta 90 %); hasta la última semana
// del Excel ILU CONSOLIDADO se usa su histórico.
export default function CumplimientoSPDashboard() {
    const router = useRouter();
    const hoy = hoyIso();
    const anioActual = Number(hoy.slice(0, 4));

    const [planes, setPlanes] = useState<PlanSP[]>([]);
    const [registros, setRegistros] = useState<RegistroSP[]>([]);
    const [historico, setHistorico] = useState<HistoricoSP[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [errores, setErrores] = useState<string[]>([]);

    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([]);
    const [semanasSel, setSemanasSel] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);
    const [gran, setGran] = useState<Gran>('semana');
    const [selPeriodo, setSelPeriodo] = useState<string | null>(null);
    const [selHerr, setSelHerr] = useState<string | null>(null);
    const [selPlanta, setSelPlanta] = useState<string | null>(null);
    const [selPersona, setSelPersona] = useState<string | null>(null);
    const [rol, setRol] = useState<Rol | 'todos'>('todos');

    useEffect(() => {
        let vivo = true;
        (async () => {
            const errs: string[] = [];
            const [p, r, h, e] = await Promise.all([
                supabase.from('opt_planificacion').select('id, fecha_programada, responsable_email, modulo_tipo, estado, planta'),
                supabase.from('opt_registros').select('created_at, user_email, modulo_tipo'),
                supabase.from('sp_cumplimiento_historico').select('fecha, nivel, planta, persona, rol, herramienta, cumplimiento'),
                supabaseTalentoHumano.from('empleados').select('nombreCompleto, correo_electronico, cargo')
            ]);
            if (p.error) errs.push(`Agendamiento OPT: ${p.error.message}${/planta/.test(p.error.message) ? ' (falta ejecutar sistema_produccion_cumplimiento.sql)' : ''}`);
            if (r.error) errs.push(`Registros OPT: ${r.error.message}`);
            if (h.error) errs.push(`Histórico Excel ILU: ${h.error.message}${/does not exist|schema cache/.test(h.error.message) ? ' (falta ejecutar sistema_produccion_cumplimiento.sql)' : ''}`);
            if (e.error) errs.push(`Empleados: ${e.error.message}`);
            if (!vivo) return;
            setPlanes((p.data as PlanSP[]) || []);
            setRegistros((r.data as RegistroSP[]) || []);
            setHistorico(((h.data as HistoricoSP[]) || []).map(x => ({ ...x, cumplimiento: Number(x.cumplimiento) })));
            setEmpleados((e.data as Empleado[]) || []);
            setErrores(errs);
            setLoading(false);
        })();
        return () => { vivo = false; };
    }, []);

    // Personas: correo o nombre del agendamiento → nombre del empleado; el histórico trae nombres cortos
    const empPorCorreo = useMemo(() => {
        const m = new Map<string, Empleado>();
        empleados.forEach(e => { if (e.correo_electronico) m.set(norm(e.correo_electronico), e); m.set(norm(e.nombreCompleto), e); });
        return m;
    }, [empleados]);
    const personaDe = (resp: string | null) => {
        const e = empPorCorreo.get(norm(resp));
        return e ? titulo(e.nombreCompleto) : titulo(String(resp || 'Sin responsable').split('@')[0].replace(/[._]/g, ' '));
    };

    // Fin del histórico: desde la semana siguiente manda la app
    const finHistorico = useMemo(() => {
        const ult = historico.reduce((m, h) => (h.fecha > m ? h.fecha : m), '');
        if (!ult) return '';
        const [y, mo, d] = ult.split('-').map(Number);
        const t = new Date(Date.UTC(y, mo - 1, d));
        t.setUTCDate(t.getUTCDate() + (7 - (t.getUTCDay() || 7))); // domingo de esa semana
        return t.toISOString().slice(0, 10);
    }, [historico]);

    const planesApp = useMemo(() => {
        const evaluados = marcarEjecutadas(planes, registros) as PlanEvaluado[];
        return evaluados
            .filter(p => planVencido(p, hoy) && (!finHistorico || p.fecha_programada! > finHistorico))
            .map(p => ({ ...p, persona: personaDe(p.responsable_email), rolP: rolDeCargo(empPorCorreo.get(norm(p.responsable_email))?.cargo) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planes, registros, finHistorico, hoy, empPorCorreo]);

    // Observaciones según el filtro cruzado (herramienta / planta / persona)
    const observaciones = (f: Filtro): Obs[] => {
        const out: Obs[] = [];
        const nivel = f.persona ? 'persona' : f.planta ? 'planta' : 'firplak';
        // Persona + planta: el histórico de personas no tiene planta, solo cuenta la app
        if (!(f.persona && f.planta) && f.planta !== SIN_PLANTA) {
            historico.forEach(h => {
                if (h.nivel !== nivel) return;
                if ((h.herramienta || null) !== (f.herr || null)) return;
                if (nivel === 'planta' && h.planta !== f.planta) return;
                if (nivel === 'persona' && norm(h.persona) !== norm(f.persona)) return;
                const s = semanaDe(h.fecha);
                out.push({ fecha: s.viernes, semana: s.clave, viernes: s.viernes, valor: h.cumplimiento, hist: true });
            });
        }
        planesApp.forEach(p => {
            if (f.herr && (p.modulo_tipo || '').toUpperCase() !== f.herr) return;
            if (f.planta && (p.planta || SIN_PLANTA) !== f.planta) return;
            if (f.persona && norm(p.persona) !== norm(f.persona)) return;
            const s = semanaDe(p.fecha_programada!);
            out.push({ fecha: p.fecha_programada!, semana: s.clave, viernes: s.viernes, ejec: p.ejecutada ? 1 : 0, hist: false });
        });
        return out;
    };

    // Filtros de periodo (Año → Mes → Semana → Día)
    const pasaPeriodo = (o: Obs) => {
        const f = o.hist ? o.viernes : o.fecha;
        if (anios.length && !anios.includes(Number(f.slice(0, 4)))) return false;
        if (meses.length && !meses.includes(Number(f.slice(5, 7)))) return false;
        if (semanasSel.length && !semanasSel.includes(o.semana)) return false;
        if (diasSel.length && (o.hist || !diasSel.includes(o.fecha))) return false;
        return true;
    };
    const enSel = (o: Obs) => !selPeriodo || claveGran(o, gran) === selPeriodo;
    const cruce = (excepto?: 'herr' | 'planta' | 'persona'): Filtro => ({
        herr: excepto === 'herr' ? null : selHerr,
        planta: excepto === 'planta' ? null : selPlanta,
        persona: excepto === 'persona' ? null : selPersona
    });

    // Opciones de los filtros con datos
    const fechasConDato = useMemo(() => {
        const s = new Set<string>();
        historico.forEach(h => s.add(semanaDe(h.fecha).viernes));
        planesApp.forEach(p => s.add(p.fecha_programada!));
        return [...s].sort();
    }, [historico, planesApp]);
    const aniosDisponibles = useMemo(() => {
        const s = new Set(fechasConDato.map(f => Number(f.slice(0, 4))));
        s.add(anioActual);
        return [...s].sort((a, b) => b - a);
    }, [fechasConDato, anioActual]);
    const variosAnios = (anios.length ? anios.length : aniosDisponibles.length) > 1;
    const fechasFiltradas = fechasConDato.filter(f => (!anios.length || anios.includes(Number(f.slice(0, 4)))) && (!meses.length || meses.includes(Number(f.slice(5, 7)))));
    const opcionesSemana = useMemo(() => {
        const m = new Map<string, string>();
        fechasFiltradas.forEach(f => { const s = semanaDe(f); m.set(s.clave, `Semana ${s.semana}${variosAnios ? ` · ${s.anio}` : ''}`); });
        return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, label]) => ({ value, label }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechasFiltradas.join(), variosAnios]);
    const opcionesDia = useMemo(() => planesApp.map(p => p.fecha_programada!)
        .filter((f, i, a) => a.indexOf(f) === i && fechasFiltradas.includes(f) && (!semanasSel.length || semanasSel.includes(semanaDe(f).clave)))
        .sort().map(f => ({ value: f, label: f.split('-').reverse().join('/').slice(0, variosAnios ? 10 : 5) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [planesApp, fechasFiltradas.join(), semanasSel, variosAnios]);

    const limpiarSel = () => { setSelPeriodo(null); };
    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanasSel([]); setDiasSel([]); limpiarSel(); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanasSel([]); setDiasSel([]); limpiarSel(); };
    const cambiarSemanas = (v: string[]) => { setSemanasSel(v); setDiasSel([]); limpiarSel(); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); limpiarSel(); };

    // 1) Cumplimiento general FIRPLAK en el tiempo
    const obsGeneral = useMemo(() => observaciones(cruce()).filter(pasaPeriodo),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [historico, planesApp, selHerr, selPlanta, selPersona, anios, meses, semanasSel, diasSel]);
    const columnas = useMemo(() => {
        const g = new Map<string, Obs[]>();
        obsGeneral.forEach(o => {
            if (gran === 'dia' && o.hist) return; // el histórico es semanal
            const k = claveGran(o, gran);
            if (!g.has(k)) g.set(k, []);
            g.get(k)!.push(o);
        });
        return [...g.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, os]) => {
            const r = resumen(os);
            return { key, label: etiquetaGran(key, gran, variosAnios), nombre: nombreGran(key, gran), ...r };
        }).filter(c => c.valor !== null);
    }, [obsGeneral, gran, variosAnios]);
    useEffect(() => { if (selPeriodo && !columnas.some(c => c.key === selPeriodo)) setSelPeriodo(null); }, [columnas, selPeriodo]);

    // Categorías (herramienta / planta / persona) en el periodo filtrado y la columna elegida
    const categoria = (f: Filtro) => resumen(observaciones(f).filter(o => pasaPeriodo(o) && enSel(o)));
    const porHerramienta = useMemo(() => {
        const codigos = new Set<string>();
        historico.forEach(h => { if (h.herramienta) codigos.add(h.herramienta); });
        planesApp.forEach(p => { if (p.modulo_tipo) codigos.add(p.modulo_tipo.toUpperCase()); });
        return [...codigos].map(c => ({ key: c, nombre: nombreHerramienta(c), ...categoria({ ...cruce('herr'), herr: c }) }))
            .filter(x => x.valor !== null).sort((a, b) => b.valor! - a.valor!);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historico, planesApp, selPlanta, selPersona, selPeriodo, gran, anios, meses, semanasSel, diasSel]);
    const porPlanta = useMemo(() => {
        const plantas = [...PLANTAS_SP.map(p => p.value)];
        if (planesApp.some(p => !p.planta)) plantas.push(SIN_PLANTA);
        return plantas.map(p => ({ key: p, nombre: p === SIN_PLANTA ? SIN_PLANTA : `${p} · ${nombrePlanta(p)}`, corto: p, ...categoria({ ...cruce('planta'), planta: p }) }))
            .filter(x => x.valor !== null).sort((a, b) => b.valor! - a.valor!);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historico, planesApp, selHerr, selPersona, selPeriodo, gran, anios, meses, semanasSel, diasSel]);
    const personas = useMemo(() => {
        const m = new Map<string, { nombre: string; rol: Rol }>();
        historico.forEach(h => { if (h.nivel === 'persona' && h.persona) m.set(norm(h.persona), { nombre: titulo(h.persona), rol: (h.rol as Rol) || 'Otro' }); });
        planesApp.forEach(p => { const k = norm(p.persona); if (!m.has(k)) m.set(k, { nombre: p.persona, rol: p.rolP }); });
        return [...m.values()];
    }, [historico, planesApp]);
    const porPersona = useMemo(() => personas
        .filter(p => rol === 'todos' || p.rol === rol)
        .map(p => ({ key: p.nombre, nombre: p.nombre, rol: p.rol, ...categoria({ ...cruce('persona'), persona: p.nombre }) }))
        .filter(x => x.valor !== null).sort((a, b) => b.valor! - a.valor!),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [personas, rol, historico, planesApp, selHerr, selPlanta, selPeriodo, gran, anios, meses, semanasSel, diasSel]);

    // Tarjetas: periodos fijos (hoy, semana, mes y año en curso) con el filtro cruzado; la general con los filtros
    const kpiDe = (pasa: (o: Obs) => boolean) => resumen(observaciones(cruce()).filter(pasa));
    const semHoy = semanaDe(hoy).clave;
    const general = resumen(obsGeneral.filter(enSel));
    const kpis = [
        { titulo: 'Hoy', ...kpiDe(o => !o.hist && o.fecha === hoy) },
        { titulo: `Semana ${Number(semHoy.slice(6))}`, ...kpiDe(o => o.semana === semHoy) },
        { titulo: MESES[Number(hoy.slice(5, 7)) - 1], ...kpiDe(o => (o.hist ? o.viernes : o.fecha).slice(0, 7) === hoy.slice(0, 7)) },
        { titulo: `Acumulado ${anioActual}`, ...kpiDe(o => (o.hist ? o.viernes : o.fecha).slice(0, 4) === String(anioActual)) }
    ];

    const chips = [
        selPeriodo && { texto: nombreGran(selPeriodo, gran), quitar: () => setSelPeriodo(null) },
        selHerr && { texto: nombreHerramienta(selHerr), quitar: () => setSelHerr(null) },
        selPlanta && { texto: selPlanta === SIN_PLANTA ? SIN_PLANTA : nombrePlanta(selPlanta), quitar: () => setSelPlanta(null) },
        selPersona && { texto: selPersona, quitar: () => setSelPersona(null) }
    ].filter(Boolean) as { texto: string; quitar: () => void }[];
    const quitarTodo = () => { setSelPeriodo(null); setSelHerr(null); setSelPlanta(null); setSelPersona(null); };

    const cargador = <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    const vacio = (t: string) => <div className="h-full flex items-center justify-center text-xs font-bold text-slate-500 text-center px-4">{t}</div>;
    const sufijo = [selHerr && nombreHerramienta(selHerr), selPlanta && (selPlanta === SIN_PLANTA ? SIN_PLANTA : nombrePlanta(selPlanta)), selPersona].filter(Boolean).join(' · ');

    // Barras horizontales de una categoría: clic = filtro cruzado; la elegida queda resaltada
    const barrasCategoria = (datos: any[], sel: string | null, onSel: (k: string | null) => void, anchoEje = 128) => (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="nombre" width={anchoEje} tick={{ fontSize: 10, fill: '#334155' }} interval={0} />
                <Tooltip content={<TooltipCumpl />} cursor={{ fill: '#f1f5f9' }} />
                <ReferenceLine x={META_SP} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} cursor="pointer"
                    onClick={(d: any) => { const k = d?.payload?.key ?? d?.key; if (k) onSel(sel === k ? null : k); }}>
                    {datos.map(d => <Cell key={d.key} fill={colorSemaforo(d.valor)} fillOpacity={sel && sel !== d.key ? 0.3 : 1} />)}
                    <LabelList dataKey="valor" position="right" formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 10, fontWeight: 800, fill: '#334155' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );

    return (
        <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5]">
            <div className="space-y-2" style={{ ['--sp-h' as string]: 'max(220px, calc((100dvh - 382px) / 2))' } as React.CSSProperties}>
                {/* Encabezado: título y acción a la izquierda, filtros a la derecha */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-2">
                        <h2 className="text-base font-black text-[#324354] whitespace-nowrap">Cumplimiento Sistema de Producción</h2>
                        <button
                            onClick={() => router.push('/opt-sistemica/agendamiento')}
                            className="px-2 py-0.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                            title="Programar auditorías en OPT Sistémica → Agendamiento"
                        >
                            <CalendarPlus className="w-3 h-3" /> Programar OPT
                        </button>
                    </div>
                    <div className="flex flex-wrap items-start gap-1.5 w-full lg:w-auto">
                        <FiltroPbi compacto titulo="Año" seleccion={anios.map(String)} opciones={aniosDisponibles.map(a => ({ value: String(a), label: String(a) }))} onChange={cambiarAnios} onBorrar={() => cambiarAnios([])} puedeBorrar={anios.length > 0} />
                        <FiltroPbi compacto titulo="Mes" seleccion={meses.map(String)} opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} onChange={cambiarMeses} onBorrar={() => cambiarMeses([])} puedeBorrar={meses.length > 0} />
                        <FiltroPbi compacto titulo="Semana" seleccion={semanasSel} opciones={opcionesSemana} onChange={cambiarSemanas} onBorrar={() => cambiarSemanas([])} puedeBorrar={semanasSel.length > 0} />
                        <FiltroPbi compacto titulo="Día" seleccion={diasSel} opciones={opcionesDia} onChange={cambiarDias} onBorrar={() => cambiarDias([])} puedeBorrar={diasSel.length > 0} />
                    </div>
                </div>

                {errores.length > 0 && (
                    <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-800 space-y-0.5">
                        {errores.map(e => <p key={e} className="flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> {e}</p>)}
                    </div>
                )}

                {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-500">Filtrando por:</span>
                        {chips.map(c => (
                            <button key={c.texto} onClick={c.quitar} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#324354] text-white font-bold hover:bg-[#25323f]" title="Quitar este filtro">
                                <span className="capitalize">{c.texto}</span> <X className="w-3 h-3" />
                            </button>
                        ))}
                        {chips.length > 1 && <button onClick={quitarTodo} className="text-[11px] font-bold text-slate-500 hover:text-[#324354] underline">Quitar todo</button>}
                    </div>
                )}

                {/* Tarjetas: la general (filtros) y los periodos de medición: día, semana, mes y acumulado del año */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <div className="col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between min-w-0">
                        <span className="flex items-center justify-between gap-1">
                            <span className="text-[8px] font-bold uppercase truncate text-slate-500">Cumplimiento {sufijo ? `· ${sufijo}` : 'FIRPLAK'}{selPeriodo ? ` · ${nombreGran(selPeriodo, gran)}` : ''}</span>
                            <span className="text-[8px] font-black px-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Meta {META_SP}%</span>
                        </span>
                        <span className="flex items-baseline justify-between gap-1">
                            <span className="text-lg sm:text-xl font-black leading-tight" style={{ color: colorSemaforo(general.valor) }}>{loading ? '…' : pct(general.valor)}</span>
                            {!loading && <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{general.programadas > 0 ? `${general.ejecutadas} de ${general.programadas} OPT` : general.semanas ? `${general.semanas} semana(s)` : 'sin datos'}</span>}
                        </span>
                    </div>
                    {kpis.map(k => (
                        <div key={k.titulo} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between min-w-0"
                            title={k.programadas ? `${k.ejecutadas} ejecutadas de ${k.programadas} programadas` : k.conHistorico ? 'Histórico del Excel ILU' : 'Sin OPT programadas vencidas en el periodo'}>
                            <span className="text-[8px] font-bold uppercase truncate text-slate-500">{k.titulo}</span>
                            <span className="flex items-baseline justify-between gap-1">
                                <span className="text-sm sm:text-base font-black leading-tight" style={{ color: colorSemaforo(k.valor) }}>{loading ? '…' : pct(k.valor)}</span>
                                {!loading && k.programadas > 0 && <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{k.ejecutadas}/{k.programadas}</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fila 1: general en el tiempo + por herramienta */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-8 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800">
                                Cumplimiento General {sufijo || 'FIRPLAK'} por {gran === 'dia' ? 'Día' : gran === 'semana' ? 'Semana' : gran === 'mes' ? 'Mes' : 'Año'}
                            </h3>
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] shrink-0">
                                {([['dia', 'Diario'], ['semana', 'Semanal'], ['mes', 'Mensual'], ['anio', 'Anual']] as const).map(([g, t]) => (
                                    <button key={g} onClick={() => { setGran(g); setSelPeriodo(null); }}
                                        className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${gran === g ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[var(--sp-h)] w-full">
                            {loading ? cargador : !columnas.length ? vacio(gran === 'dia'
                                ? 'Sin OPT programadas vencidas para los filtros elegidos. El histórico del Excel es semanal: use Semanal o Mensual.'
                                : 'Sin datos para los filtros elegidos.') : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={columnas} margin={{ top: 22, right: 4, left: 30, bottom: 0 }} style={{ cursor: 'pointer' }}
                                        onClick={(e: any) => {
                                            const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
                                            const col = Number.isInteger(idx) ? columnas[idx] : columnas.find(c => c.label === String(e?.activeLabel));
                                            if (col) setSelPeriodo(prev => (prev === col.key ? null : col.key));
                                        }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={columnas.length > 30 ? 'preserveStartEnd' : 0} />
                                        <YAxis tick={{ fontSize: 9 }} width={32} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                        <Tooltip content={<TooltipCumpl />} cursor={{ fill: '#f1f5f9' }} />
                                        <ReferenceLine y={META_SP} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5}
                                            label={{ value: `Meta ${META_SP}%`, position: 'left', offset: 36, fill: COLOR_META, fontSize: 9, fontWeight: 800 }} />
                                        <Bar dataKey="valor" radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="pointer">
                                            {columnas.map(c => <Cell key={c.key} fill={colorSemaforo(c.valor)} fillOpacity={selPeriodo && selPeriodo !== c.key ? 0.3 : 1} />)}
                                            <LabelList dataKey="valor" position="top" content={(p: any) => {
                                                if (p.value == null || (columnas.length > 20 && p.index % 2 === 1)) return null;
                                                return <text x={p.x + p.width / 2} y={p.y - 5} textAnchor="middle" fontSize={columnas.length > 20 ? 8 : 10} fontWeight={800} fill="#334155">{Number(p.value).toFixed(columnas.length > 20 ? 0 : 1)}</text>;
                                            }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-4 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5 truncate">Cumplimiento por Herramienta</h3>
                        <div className="h-[var(--sp-h)] w-full">
                            {loading ? cargador : !porHerramienta.length ? vacio('Sin datos por herramienta.') : barrasCategoria(porHerramienta, selHerr, setSelHerr, 132)}
                        </div>
                    </div>
                </div>

                {/* Fila 2: por planta y por persona */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5 truncate">Cumplimiento por Planta</h3>
                        <div className="h-[var(--sp-h)] w-full">
                            {loading ? cargador : !porPlanta.length ? vacio('Sin datos por planta.') : barrasCategoria(porPlanta, selPlanta, setSelPlanta, 150)}
                        </div>
                    </div>
                    <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800">Cumplimiento por Persona</h3>
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] shrink-0">
                                {([['todos', 'Todos'], ['Jefe', 'Jefes'], ['Supervisor', 'Supervisores'], ['Líder', 'Líderes']] as const).map(([r, t]) => (
                                    <button key={r} onClick={() => setRol(r)}
                                        className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${rol === r ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[var(--sp-h)] w-full overflow-y-auto">
                            {loading ? cargador : !porPersona.length ? vacio('Sin datos por persona.') : (
                                <div style={{ height: Math.max(porPersona.length * 24 + 16, 180) }}>
                                    {barrasCategoria(porPersona, selPersona, setSelPersona, 170)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
