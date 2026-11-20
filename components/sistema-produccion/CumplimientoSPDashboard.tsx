'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Loader2, X } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ReferenceLine
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import FiltroPbi from '@/components/calidad/FiltroPbi';
import {
    HistoricoSP, META_SP, PLANTAS_SP,
    aliasPersonaSP, colorSemaforo, hoyIso, nombreHerramienta, nombrePlanta, promedio, semanaDe
} from '@/lib/sistema-produccion/cumplimiento';
import { REGLAS_INICIALES, completarReglas, type ReglasSP, type RolSP } from '@/lib/sistema-produccion/reglas';
import { calcularCupos, type Ejecucion } from '@/lib/sistema-produccion/ejecuciones';
import { resolveNombreCompleto } from '@/lib/ficha-rcc/constants';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const COLOR_META = '#3b8f50';
// Cumplimiento colectivo FIRPLAK (tarjetas y gráficas por mes / seguimiento): límites del BI SFPK
const LIM_SUP = 80;
const LIM_INF = 60;
const COLOR_LIM_INF = '#d14747';
const colorColectivo = (v: number | null | undefined) =>
    v === null || v === undefined ? '#cbd5e1' : v >= LIM_SUP ? '#59a96a' : v >= LIM_INF ? '#deb841' : '#d14747';
const SIN_PLANTA = 'Sin planta';
const fechaLocal = (v: string | null | undefined) => {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v).slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const rolTablero = (r: RolSP): Rol => (r === 'Gerente' ? 'Otro' : r);
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
    ejec?: number;      // app: 1 ejecutada (o presente en la RRC), 0 no
    hist: boolean;
    grupo?: string;     // app: herramienta (AF, OPT, OPTS, BIT o RRC)
}
// Asistencia a la Respuesta Rápida Calidad (módulo RRC): la calificación es presentes ÷ registros, como su ranking
interface AsistenciaRRC { fecha: string; responsable: string; estado: string }
// Proceso de la RRC → planta del Sistema de Producción (Diseño, Ingeniería y Manufactura no son planta)
const PLANTA_DE_PROCESO_RRC: Record<string, string> = {
    'marmol sintetico': 'MS', 'muebles': 'MBLES', 'fibra de vidrio': 'FV', 'calidad': 'CALIDAD', 'cefi': 'CEFI', 'mantenimiento': 'MANTENIMIENTO',
};
interface Empleado { nombreCompleto: string; correo_electronico: string | null; cargo: string | null }
interface Filtro { herr?: string | null; planta?: string | null; persona?: string | null }

// Cumplimiento de un conjunto de observaciones: cada semana vale su % (histórico) o, en la app, el promedio de sus
// herramientas: cada una ejecutadas ÷ exigidas según su frecuencia (RRC: asistencias ÷ registros); así una herramienta
// diaria no pesa más que una semanal. El periodo es el promedio de sus semanas, como el "PROMEDIO MENSUAL" del Excel.
function resumen(obs: Obs[]) {
    const semanas = new Map<string, { vals: number[]; grupos: Map<string, { ejec: number; total: number }> }>();
    obs.forEach(o => {
        if (!semanas.has(o.semana)) semanas.set(o.semana, { vals: [], grupos: new Map() });
        const s = semanas.get(o.semana)!;
        if (o.hist) { s.vals.push(o.valor!); return; }
        const g = o.grupo || '';
        if (!s.grupos.has(g)) s.grupos.set(g, { ejec: 0, total: 0 });
        const x = s.grupos.get(g)!; x.total += 1; x.ejec += o.ejec!;
    });
    const valores = [...semanas.values()].map(s => (s.vals.length ? promedio(s.vals)!
        : s.grupos.size ? promedio([...s.grupos.values()].map(g => (g.ejec / g.total) * 100))! : null))
        .filter((v): v is number => v !== null);
    const opt = obs.filter(o => !o.hist && o.grupo !== 'RRC');
    const rrc = obs.filter(o => !o.hist && o.grupo === 'RRC');
    return {
        valor: promedio(valores),
        semanas: valores.length,
        programadas: opt.length,
        ejecutadas: opt.reduce((a, o) => a + (o.ejec || 0), 0),
        rrcRegistros: rrc.length,
        rrcPresentes: rrc.reduce((a, o) => a + (o.ejec || 0), 0),
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
            <p className="font-black text-slate-800 capitalize mb-1">{d.titulo || d.nombre}</p>
            <p className="flex justify-between gap-3"><span className="text-slate-600">Cumplimiento</span><span className="font-black" style={{ color: d.colectivo ? colorColectivo(d.valor) : colorSemaforo(d.valor) }}>{pct(d.valor)}</span></p>
            {d.colectivo ? (
                <p className="flex justify-between gap-3"><span className="text-slate-600">Límites</span><span className="font-black text-slate-800">sup. {LIM_SUP} % · inf. {LIM_INF} %</span></p>
            ) : (
                <p className="flex justify-between gap-3"><span className="text-slate-600">Meta</span><span className="font-black text-slate-800">{META_SP} %</span></p>
            )}
            {d.programadas > 0 && <p className="flex justify-between gap-3"><span className="text-slate-600">Ejecutadas / exigidas</span><span className="font-black text-slate-800">{d.ejecutadas} / {d.programadas}</span></p>}
            {d.rrcRegistros > 0 && <p className="flex justify-between gap-3"><span className="text-slate-600">Asistencia RRC</span><span className="font-black text-slate-800">{d.rrcPresentes} / {d.rrcRegistros}</span></p>}
            {d.semanas > 1 && <p className="text-[10px] text-slate-400">Promedio de {d.semanas} semanas</p>}
            {d.conHistorico && <p className="text-[10px] text-slate-400">Incluye histórico del Excel ILU</p>}
        </div>
    );
};

// Estadísticas de Producción → Cumplimiento del Sistema de Producción.
// Como el Power BI "BI SFPK": cumplimiento general FIRPLAK en el tiempo, por herramienta, por planta y por persona.
// Cumplimiento (meta 90 %): Hora-Hora, OPT, OPT Sistémica y Bitácora en automático desde el historial de cada módulo
// contra la frecuencia de las Reglas de Medición; RRC con la asistencia del módulo RRC. Hasta la última semana del Excel
// ILU CONSOLIDADO se usa su histórico.
// altoPx (opcional): alto fijo del recuadro completo en px CSS (Tablero de Control). Sin él, las gráficas se ajustan a la pantalla.
export default function CumplimientoSPDashboard({ altoPx }: { altoPx?: number } = {}) {
    const hoy = hoyIso();
    const anioActual = Number(hoy.slice(0, 4));

    // Historial de ejecución de cada herramienta y reglas de medición (frecuencias por rol)
    const [crudo, setCrudo] = useState<{ hh: any[]; opt: any[]; opts: any[]; bit: any[]; plantas: any[]; usuarios: any[] }>({ hh: [], opt: [], opts: [], bit: [], plantas: [], usuarios: [] });
    const [reglas, setReglas] = useState<ReglasSP>(completarReglas(REGLAS_INICIALES));
    const [historico, setHistorico] = useState<HistoricoSP[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [asistencias, setAsistencias] = useState<AsistenciaRRC[]>([]);
    const [procesoPersonaRRC, setProcesoPersonaRRC] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [errores, setErrores] = useState<string[]>([]);

    const [anios, setAnios] = useState<number[]>([anioActual]);
    const [meses, setMeses] = useState<number[]>([]);
    const [semanasSel, setSemanasSel] = useState<string[]>([]);
    const [diasSel, setDiasSel] = useState<string[]>([]);
    // Filtro Planta del encabezado (varias); el clic en la gráfica de plantas elige una sola
    const [plantasSel, setPlantasSel] = useState<string[]>([]);
    // Seguimiento (gráfica derecha): diario o semanal. La izquierda siempre es mensual.
    const [granSeg, setGranSeg] = useState<'dia' | 'semana'>('dia');
    // Columna elegida en cualquiera de las dos gráficas (con su granularidad)
    const [sel, setSel] = useState<{ key: string; gran: Gran } | null>(null);
    const selPeriodo = sel?.key ?? null;
    const setSelPeriodo = (v: null) => setSel(v);
    const [selHerr, setSelHerr] = useState<string | null>(null);
    const [selPlanta, setSelPlanta] = useState<string | null>(null);
    const [selPersona, setSelPersona] = useState<string | null>(null);
    const [rol, setRol] = useState<Rol | 'todos'>('todos');

    useEffect(() => {
        let vivo = true;
        (async () => {
            const errs: string[] = [];
            const [rg, hh, op, r, bt, pl, us, h, e, a, cr, cp] = await Promise.all([
                supabase.from('sp_reglas_medicion').select('datos').eq('clave', 'reglas').maybeSingle(),
                supabase.from('Hora_Hora').select('*').gte('fecha', '2026-01-01'),
                supabase.from('OPT').select('*').gte('Create_at', '2026-01-01'),
                supabase.from('opt_registros').select('created_at, user_email, modulo_tipo, planta'),
                supabase.from('seguimiento_bitacora').select('fecha, completado, id_supervisor, plantillas_actividades ( id_planta )').eq('completado', true).gte('fecha', '2026-01-01'),
                supabase.from('plantas').select('id, nombre'),
                supabase.from('usuarios').select('id, nombre, correo'),
                supabase.from('sp_cumplimiento_historico').select('fecha, nivel, planta, persona, rol, herramienta, cumplimiento'),
                supabaseTalentoHumano.from('empleados').select('nombreCompleto, correo_electronico, cargo'),
                supabase.from('registro_asistencia').select('fecha, responsable, estado'),
                supabase.from('cat_responsables').select('nombre, proceso_id'),
                supabase.from('cat_procesos').select('id, nombre')
            ]);
            if (a.error) errs.push(`Asistencia RRC: ${a.error.message}`);
            if (hh.error) errs.push(`Hora a Hora: ${hh.error.message}`);
            if (op.error) errs.push(`OPT Operativa: ${op.error.message}`);
            if (r.error) errs.push(`OPT Sistémica: ${r.error.message}`);
            if (bt.error) errs.push(`Bitácora: ${bt.error.message}`);
            if (us.error) errs.push(`Usuarios: ${us.error.message}`);
            if (h.error) errs.push(`Histórico Excel ILU: ${h.error.message}${/does not exist|schema cache/.test(h.error.message) ? ' (falta ejecutar sistema_produccion_cumplimiento.sql)' : ''}`);
            if (e.error) errs.push(`Empleados: ${e.error.message}`);
            if (!vivo) return;
            if (rg.data?.datos) setReglas(completarReglas(rg.data.datos as ReglasSP));
            setCrudo({ hh: hh.data || [], opt: op.data || [], opts: r.data || [], bit: bt.data || [], plantas: pl.data || [], usuarios: us.data || [] });
            setHistorico(((h.data as HistoricoSP[]) || []).map(x => ({ ...x, persona: x.persona ? aliasPersonaSP(x.persona) : x.persona, cumplimiento: Number(x.cumplimiento) })));
            setEmpleados((e.data as Empleado[]) || []);
            setAsistencias((a.data as AsistenciaRRC[]) || []);
            // Persona de la RRC → planta, según su proceso
            const procs = new Map(((cp.data as { id: string; nombre: string }[]) || []).map(x => [x.id, norm(x.nombre)]));
            const pp = new Map<string, string>();
            ((cr.data as { nombre: string; proceso_id: string }[]) || []).forEach(x => {
                const planta = PLANTA_DE_PROCESO_RRC[procs.get(x.proceso_id) || ''];
                if (planta) { pp.set(norm(x.nombre), planta); pp.set(norm(resolveNombreCompleto(x.nombre)), planta); }
            });
            setProcesoPersonaRRC(pp);
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

    // Fin del histórico: desde la semana siguiente manda la app
    const finHistorico = useMemo(() => {
        const ult = historico.reduce((m, h) => (h.fecha > m ? h.fecha : m), '');
        if (!ult) return '';
        const [y, mo, d] = ult.split('-').map(Number);
        const t = new Date(Date.UTC(y, mo - 1, d));
        t.setUTCDate(t.getUTCDate() + (7 - (t.getUTCDay() || 7))); // domingo de esa semana
        return t.toISOString().slice(0, 10);
    }, [historico]);

    // Herramientas automáticas (Hora-Hora, OPT, OPT Sistémica, Bitácora): historial de ejecución de cada módulo contra la
    // frecuencia de las Reglas de Medición, por persona; la planta es la registrada en la ejecución (o la de la persona).
    const { cuposApp, sinPersona } = useMemo(() => {
        const nombreDeCorreo = (c: string | null | undefined) => (c ? empPorCorreo.get(norm(c))?.nombreCompleto || c : '');
        const usuarios = new Map<number, { nombre: string; correo: string | null }>(crudo.usuarios.map((u: any) => [u.id, { nombre: u.nombre, correo: u.correo }]));
        const plantas = new Map<number, string>(crudo.plantas.map((x: any) => [x.id, x.nombre]));
        const ej: Ejecucion[] = [];
        crudo.hh.forEach((x: any) => ej.push({ herr: 'AF', fecha: fechaLocal(x.fecha), quien: x.realizado_por || x.creado_por || nombreDeCorreo(x.creado_por_email), email: nombreDeCorreo(x.creado_por_email), planta: x.planta }));
        crudo.opt.forEach((x: any) => ej.push({ herr: 'OPT', fecha: fechaLocal(x.Create_at), quien: nombreDeCorreo(x['Created By']) || nombreDeCorreo(x.Created), email: nombreDeCorreo(x.Created), planta: x.Planta }));
        crudo.opts.forEach((x: any) => ej.push({ herr: 'OPTS', fecha: fechaLocal(x.created_at), quien: nombreDeCorreo(x.user_email), planta: x.planta }));
        // Bitácora: un día por supervisor con al menos una actividad completada
        const dias = new Map<string, Ejecucion>();
        crudo.bit.forEach((x: any) => {
            const u = usuarios.get(x.id_supervisor);
            if (!u) return;
            const k = `${x.id_supervisor}|${x.fecha}`;
            if (!dias.has(k)) dias.set(k, { herr: 'BIT', fecha: fechaLocal(x.fecha), quien: u.nombre, email: nombreDeCorreo(u.correo), planta: plantas.get(x.plantillas_actividades?.id_planta) || null });
        });
        ej.push(...dias.values());
        const desde = finHistorico ? new Date(Date.parse(`${finHistorico}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : `${anioActual}-01-01`;
        const { cupos, sinPersona } = calcularCupos(ej, reglas, desde, hoy);
        return { cuposApp: cupos.map(c => ({ ...c, persona: aliasPersonaSP(titulo(c.persona)), rolP: rolTablero(c.rol) })), sinPersona };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crudo, reglas, finHistorico, hoy, empPorCorreo]);

    // RRC desde la app: cada registro de asistencia (después del histórico del Excel) es una observación del grupo RRC
    const rrcApp = useMemo(() => asistencias
        .filter(x => x.fecha && x.fecha <= hoy && (!finHistorico || x.fecha > finHistorico))
        .map(x => {
            const completo = resolveNombreCompleto(x.responsable);
            return {
                fecha: x.fecha.slice(0, 10),
                persona: aliasPersonaSP(titulo(completo)),
                rolP: rolDeCargo(empPorCorreo.get(norm(completo))?.cargo),
                planta: procesoPersonaRRC.get(norm(completo)) || procesoPersonaRRC.get(norm(x.responsable)) || null,
                ejec: x.estado === 'Presente' ? 1 : 0,
            };
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [asistencias, finHistorico, hoy, empPorCorreo, procesoPersonaRRC]);

    // Observaciones según el filtro cruzado (herramienta / planta / persona)
    const observaciones = (f: Filtro): Obs[] => {
        const out: Obs[] = [];
        // Plantas en juego: la elegida en la gráfica o las del filtro Planta del encabezado
        const plantas = f.planta ? [f.planta] : plantasSel;
        const nivel = f.persona ? 'persona' : plantas.length ? 'planta' : 'firplak';
        // Persona + planta: el histórico de personas no tiene planta, solo cuenta la app
        if (!(f.persona && plantas.length) && !plantas.includes(SIN_PLANTA)) {
            historico.forEach(h => {
                if (h.nivel !== nivel) return;
                if ((h.herramienta || null) !== (f.herr || null)) return;
                if (nivel === 'planta' && !plantas.includes(h.planta || '')) return;
                if (nivel === 'persona' && norm(h.persona) !== norm(f.persona)) return;
                const s = semanaDe(h.fecha);
                out.push({ fecha: s.viernes, semana: s.clave, viernes: s.viernes, valor: h.cumplimiento, hist: true });
            });
        }
        cuposApp.forEach(c => {
            if (f.herr && c.herr !== f.herr) return;
            if (plantas.length && !plantas.includes(c.planta || SIN_PLANTA)) return;
            if (f.persona && norm(c.persona) !== norm(f.persona)) return;
            const s = semanaDe(c.fecha);
            out.push({ fecha: c.fecha, semana: s.clave, viernes: s.viernes, ejec: c.ejec, hist: false, grupo: c.herr });
        });
        if (!f.herr || f.herr === 'RRC') rrcApp.forEach(x => {
            if (plantas.length && !plantas.includes(x.planta || SIN_PLANTA)) return;
            if (f.persona && norm(x.persona) !== norm(f.persona)) return;
            const s = semanaDe(x.fecha);
            out.push({ fecha: x.fecha, semana: s.clave, viernes: s.viernes, ejec: x.ejec, hist: false, grupo: 'RRC' });
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
    const enSel = (o: Obs) => !sel || claveGran(o, sel.gran) === sel.key;
    const cruce = (excepto?: 'herr' | 'planta' | 'persona'): Filtro => ({
        herr: excepto === 'herr' ? null : selHerr,
        planta: excepto === 'planta' ? null : selPlanta,
        persona: excepto === 'persona' ? null : selPersona
    });

    // Opciones de los filtros con datos
    const fechasConDato = useMemo(() => {
        const s = new Set<string>();
        historico.forEach(h => s.add(semanaDe(h.fecha).viernes));
        cuposApp.forEach(c => s.add(c.fecha));
        rrcApp.forEach(x => s.add(x.fecha));
        return [...s].sort();
    }, [historico, cuposApp, rrcApp]);
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
    const opcionesDia = useMemo(() => [...cuposApp.map(c => c.fecha), ...rrcApp.map(x => x.fecha)]
        .filter((f, i, a) => a.indexOf(f) === i && fechasFiltradas.includes(f) && (!semanasSel.length || semanasSel.includes(semanaDe(f).clave)))
        .sort().map(f => ({ value: f, label: f.split('-').reverse().join('/').slice(0, variosAnios ? 10 : 5) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cuposApp, rrcApp, fechasFiltradas.join(), semanasSel, variosAnios]);

    const limpiarSel = () => { setSelPeriodo(null); };
    const cambiarAnios = (v: string[]) => { setAnios(v.map(Number)); setSemanasSel([]); setDiasSel([]); limpiarSel(); };
    const cambiarMeses = (v: string[]) => { setMeses(v.map(Number)); setSemanasSel([]); setDiasSel([]); limpiarSel(); };
    const cambiarSemanas = (v: string[]) => { setSemanasSel(v); setDiasSel([]); limpiarSel(); };
    const cambiarDias = (v: string[]) => { setDiasSel(v); limpiarSel(); };

    // 1) Cumplimiento general FIRPLAK en el tiempo
    const obsGeneral = useMemo(() => observaciones(cruce()).filter(pasaPeriodo),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [historico, cuposApp, rrcApp, selHerr, selPlanta, selPersona, plantasSel, anios, meses, semanasSel, diasSel]);
    const columnasDe = (gran: Gran) => {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const columnasMes = useMemo(() => columnasDe('mes'), [obsGeneral, variosAnios]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const columnasSeg = useMemo(() => columnasDe(granSeg), [obsGeneral, granSeg, variosAnios]);
    useEffect(() => {
        if (!sel) return;
        const cols = sel.gran === 'mes' ? columnasMes : sel.gran === granSeg ? columnasSeg : [];
        if (!cols.some(c => c.key === sel.key)) setSel(null);
    }, [columnasMes, columnasSeg, granSeg, sel]);

    // Categorías (herramienta / planta / persona) en el periodo filtrado y la columna elegida
    const categoria = (f: Filtro) => resumen(observaciones(f).filter(o => pasaPeriodo(o) && enSel(o)));
    const porHerramienta = useMemo(() => {
        const codigos = new Set<string>();
        historico.forEach(h => { if (h.herramienta) codigos.add(h.herramienta); });
        cuposApp.forEach(c => codigos.add(c.herr));
        if (rrcApp.length) codigos.add('RRC');
        return [...codigos].map(c => ({ key: c, nombre: nombreHerramienta(c), ...categoria({ ...cruce('herr'), herr: c }) }))
            .filter(x => x.valor !== null).sort((a, b) => b.valor! - a.valor!);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historico, cuposApp, rrcApp, selPlanta, selPersona, selPeriodo, sel, plantasSel, anios, meses, semanasSel, diasSel]);
    const porPlanta = useMemo(() => {
        const plantas = plantasSel.length ? [...plantasSel] : PLANTAS_SP.map(p => p.value);
        if (!plantasSel.length && (cuposApp.some(c => !c.planta) || rrcApp.some(x => !x.planta))) plantas.push(SIN_PLANTA);
        return plantas.map(p => ({ key: p, nombre: p, titulo: p === SIN_PLANTA ? SIN_PLANTA : `${p} · ${nombrePlanta(p)}`, ...categoria({ ...cruce('planta'), planta: p }) }))
            .filter(x => x.valor !== null || x.key !== SIN_PLANTA)
            .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1) || a.key.localeCompare(b.key));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historico, cuposApp, rrcApp, selHerr, selPersona, selPeriodo, sel, plantasSel, anios, meses, semanasSel, diasSel]);
    const personas = useMemo(() => {
        const m = new Map<string, { nombre: string; rol: Rol }>();
        historico.forEach(h => { if (h.nivel === 'persona' && h.persona) m.set(norm(h.persona), { nombre: titulo(h.persona), rol: (h.rol as Rol) || 'Otro' }); });
        cuposApp.forEach(c => { const k = norm(c.persona); if (!m.has(k)) m.set(k, { nombre: c.persona, rol: c.rolP }); });
        rrcApp.forEach(x => { const k = norm(x.persona); if (!m.has(k)) m.set(k, { nombre: x.persona, rol: x.rolP }); });
        return [...m.values()];
    }, [historico, cuposApp, rrcApp]);
    const porPersona = useMemo(() => personas
        .filter(p => rol === 'todos' || p.rol === rol)
        .map(p => ({ key: p.nombre, nombre: p.nombre, rol: p.rol, ...categoria({ ...cruce('persona'), persona: p.nombre }) }))
        .filter(x => x.valor !== null).sort((a, b) => b.valor! - a.valor!),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [personas, rol, historico, cuposApp, rrcApp, selHerr, selPlanta, selPeriodo, sel, plantasSel, anios, meses, semanasSel, diasSel]);

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
        sel && { texto: nombreGran(sel.key, sel.gran), quitar: () => setSel(null) },
        selHerr && { texto: nombreHerramienta(selHerr), quitar: () => setSelHerr(null) },
        selPlanta && { texto: selPlanta === SIN_PLANTA ? SIN_PLANTA : nombrePlanta(selPlanta), quitar: () => setSelPlanta(null) },
        selPersona && { texto: selPersona, quitar: () => setSelPersona(null) }
    ].filter(Boolean) as { texto: string; quitar: () => void }[];
    const quitarTodo = () => { setSelPeriodo(null); setSelHerr(null); setSelPlanta(null); setSelPersona(null); };

    const cargador = <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    const vacio = (t: string) => <div className="h-full flex items-center justify-center text-xs font-bold text-slate-500 text-center px-4">{t}</div>;
    // Títulos: lo elegido en las gráficas y, si no hay planta elegida en la gráfica, las plantas del filtro
    const plantasTitulo = selPlanta ? (selPlanta === SIN_PLANTA ? SIN_PLANTA : nombrePlanta(selPlanta)) : plantasSel.length ? (plantasSel.length > 2 ? `${plantasSel.length} plantas` : plantasSel.map(nombrePlanta).join(' + ')) : null;
    const sufijo = [selHerr && nombreHerramienta(selHerr), plantasTitulo, selPersona].filter(Boolean).join(' · ');

    // Barras en el tiempo (mes, semana o día): clic en una columna la elige como filtro
    const graficaTiempo = (cols: ReturnType<typeof columnasDe>, g: Gran) => (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cols.map(c => ({ ...c, colectivo: true }))} margin={{ top: 22, right: 4, left: 44, bottom: 0 }} style={{ cursor: 'pointer' }}
                onClick={(e: any) => {
                    const idx = e?.activeIndex != null ? Number(e.activeIndex) : NaN;
                    const col = Number.isInteger(idx) ? cols[idx] : cols.find(c => c.label === String(e?.activeLabel));
                    if (col) setSel(prev => (prev && prev.key === col.key && prev.gran === g ? null : { key: col.key, gran: g }));
                }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={cols.length > 30 ? 'preserveStartEnd' : 0} />
                <YAxis tick={{ fontSize: 9 }} width={32} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<TooltipCumpl />} cursor={{ fill: '#f1f5f9' }} />
                <ReferenceLine y={LIM_SUP} stroke={COLOR_META} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: `Sup. ${LIM_SUP}%`, position: 'left', offset: 36, fill: COLOR_META, fontSize: 9, fontWeight: 800 }} />
                <ReferenceLine y={LIM_INF} stroke={COLOR_LIM_INF} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: `Inf. ${LIM_INF}%`, position: 'left', offset: 36, fill: COLOR_LIM_INF, fontSize: 9, fontWeight: 800 }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="pointer" maxBarSize={48}>
                    {cols.map(c => <Cell key={c.key} fill={colorColectivo(c.valor)} fillOpacity={sel && !(sel.gran === g && sel.key === c.key) ? 0.3 : 1} />)}
                    <LabelList dataKey="valor" position="top" content={(p: any) => {
                        if (p.value == null || (cols.length > 20 && p.index % 2 === 1)) return null;
                        return <text x={p.x + p.width / 2} y={p.y - 5} textAnchor="middle" fontSize={cols.length > 20 ? 8 : 10} fontWeight={800} fill="#334155">{Number(p.value).toFixed(cols.length > 20 ? 0 : 1)}</text>;
                    }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );

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
                    <LabelList dataKey="valor" position="right" formatter={(v: any) => (v == null ? 'sin dato' : `${Number(v).toFixed(1)}%`)} style={{ fontSize: 10, fontWeight: 800, fill: '#334155' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );

    return (
        <section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] overflow-hidden" style={altoPx ? { height: altoPx } : undefined}>
            {/* Alto de cada gráfica: con alto fijo, lo que queda después del encabezado, las tarjetas y los títulos, repartido en 2 filas */}
            <div className="space-y-2" style={{ ['--sp-h' as string]: altoPx ? `${Math.max(120, Math.floor((altoPx - 250) / 2))}px` : 'max(220px, calc((100dvh - 382px) / 2))' } as React.CSSProperties}>
                {/* Encabezado: título y acción a la izquierda, filtros a la derecha */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-2">
                        <h2 className="text-base font-black text-[#324354] whitespace-nowrap">Cumplimiento Sistema de Producción</h2>
                        {/* Reglas de medición: a quién aplica cada herramienta, metas y cálculo */}
                        <a href="/sistema-produccion/reglas"
                            className="px-2 py-0.5 bg-white border border-[#e2ded5] hover:bg-[#F6F3EE] text-[#324354] rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                            title="Ver las reglas con las que se mide el cumplimiento">
                            <BookOpenCheck className="w-3.5 h-3.5" /> Reglas de Medición del Sistema
                        </a>
                    </div>
                    <div className="flex flex-wrap items-start gap-1.5 w-full lg:w-auto">
                        <FiltroPbi compacto titulo="Planta" seleccion={plantasSel} opciones={PLANTAS_SP.map(p => ({ value: p.value, label: `${p.value} · ${p.label}` }))}
                            onChange={v => { setPlantasSel(v); setSelPlanta(null); }} onBorrar={() => { setPlantasSel([]); setSelPlanta(null); }} puedeBorrar={plantasSel.length > 0} />
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
                {!loading && sinPersona > 0 && (
                    <p className="text-[10px] font-semibold text-slate-500" title="Ejecuciones de Hora-Hora, OPT, OPT Sistémica o Bitácora hechas por personas que no están en las Reglas de Medición (no tienen frecuencia exigida)">
                        {sinPersona} ejecución(es) de personas que no están en las Reglas de Medición no se cuentan.
                    </p>
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
                            <span className="text-[8px] font-bold uppercase truncate text-slate-500">Cumplimiento {sufijo ? `· ${sufijo}` : 'FIRPLAK'}{sel ? ` · ${nombreGran(sel.key, sel.gran)}` : ''}</span>
                            <span className="text-[8px] font-black px-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap" title={`Límite superior ${LIM_SUP} % · inferior ${LIM_INF} % (cumplimiento colectivo)`}>Sup. {LIM_SUP}% · Inf. {LIM_INF}%</span>
                        </span>
                        <span className="flex items-baseline justify-between gap-1">
                            <span className="text-lg sm:text-xl font-black leading-tight" style={{ color: colorColectivo(general.valor) }}>{loading ? '…' : pct(general.valor)}</span>
                            {!loading && <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{general.programadas > 0 ? `${general.ejecutadas} de ${general.programadas} ejecuciones` : general.semanas ? `${general.semanas} semana(s)` : 'sin datos'}</span>}
                        </span>
                    </div>
                    {kpis.map(k => (
                        <div key={k.titulo} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between min-w-0"
                            title={k.programadas ? `${k.ejecutadas} ejecutadas de ${k.programadas} exigidas` : k.conHistorico ? 'Histórico del Excel ILU' : 'Sin ejecuciones exigidas en el periodo'}>
                            <span className="text-[8px] font-bold uppercase truncate text-slate-500">{k.titulo}</span>
                            <span className="flex items-baseline justify-between gap-1">
                                <span className="text-sm sm:text-base font-black leading-tight" style={{ color: colorColectivo(k.valor) }}>{loading ? '…' : pct(k.valor)}</span>
                                {!loading && k.programadas > 0 && <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{k.ejecutadas}/{k.programadas}</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fila 1 (como Calidad MS): mensual a la izquierda y seguimiento diario / semanal a la derecha.
                    Clic en una columna filtra herramienta, planta y persona por ese periodo. */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800 mb-1.5">Cumplimiento {sufijo || 'FIRPLAK'} por Mes</h3>
                        <div className="h-[var(--sp-h)] w-full">
                            {loading ? cargador : !columnasMes.length ? vacio('Sin datos para los filtros elegidos.') : graficaTiempo(columnasMes, 'mes')}
                        </div>
                    </div>
                    <div className="lg:col-span-7 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h3 className="min-w-0 truncate text-xs sm:text-sm font-black text-slate-800">
                                Seguimiento {granSeg === 'dia' ? 'Diario' : 'Semanal'} {sufijo || 'FIRPLAK'}
                            </h3>
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] shrink-0">
                                {([['dia', 'Diario'], ['semana', 'Semanal']] as const).map(([g, t]) => (
                                    <button key={g} onClick={() => { setGranSeg(g); if (sel && sel.gran !== 'mes') setSel(null); }}
                                        className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${granSeg === g ? 'bg-[#324354] text-white shadow-xs' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[var(--sp-h)] w-full">
                            {loading ? cargador : !columnasSeg.length ? vacio(granSeg === 'dia'
                                ? 'Sin ejecuciones exigidas por día para los filtros elegidos. El histórico del Excel es semanal: use Semanal.'
                                : 'Sin datos para los filtros elegidos.') : graficaTiempo(columnasSeg, granSeg)}
                        </div>
                    </div>
                </div>

                {/* Fila 2: por herramienta, por planta y por persona */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                    <div className="lg:col-span-3 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5 truncate">Cumplimiento por Herramienta</h3>
                        {/* Alto mínimo por barra para que los nombres no se monten; si no caben, se desplaza */}
                        <div className="h-[var(--sp-h)] w-full overflow-y-auto">
                            {loading ? cargador : !porHerramienta.length ? vacio('Sin datos por herramienta.') : (
                                <div style={{ height: `max(100%, ${porHerramienta.length * 30 + 30}px)` }}>{barrasCategoria(porHerramienta, selHerr, setSelHerr, 112)}</div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-4 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5 truncate">Cumplimiento por Planta</h3>
                        <div className="h-[var(--sp-h)] w-full overflow-y-auto">
                            {loading ? cargador : !porPlanta.length ? vacio('Sin datos por planta.') : (
                                <div style={{ height: `max(100%, ${porPlanta.length * 20 + 30}px)` }}>{barrasCategoria(porPlanta, selPlanta, setSelPlanta, 92)}</div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-5 bg-white rounded-xl p-2.5 shadow-xs border border-slate-200">
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
