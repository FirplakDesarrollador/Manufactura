'use client';

import { HERRAMIENTAS_AUTO, HERRAMIENTAS_POR_PLANTA, plantaSP, reglasSinMedicion } from '@/lib/sistema-produccion/ejecuciones';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, BookOpenCheck, Eye, EyeOff, Loader2, RefreshCw, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PLANTAS_SP, cargarPlantasSP } from '@/lib/sistema-produccion/cumplimiento';
import { actualizarTrabajoEstandarizado } from '@/lib/sistema-produccion/trabajoEstandarizado';
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano';
import { SearchableSelect } from '@/components/ui/searchable-select';

// Planta de Talento Humano → planta del Sistema de Producción (para prellenar la planta de quien se agrega)
const PLANTA_TH_A_SP: Record<string, string> = {
    'fibra de vidrio': 'FV', 'marmol sintetico': 'MS', 'muebles': 'MBL', 'cefi': 'CEFI', 'calidad': 'CALID',
    'marmol (calidad)': 'CALID', 'muebles (calidad)': 'CALID', 'fibra (calidad)': 'CALID', 'moldes': 'MOLD', 'cedi': 'CEDI',
    'almacen': 'ALM', 'mantenimiento': 'MTTO', 'rr moldes': 'RMOLD', 'servicios': 'SG',
    'manufactura': 'MANUF', 'ingenieria': 'TRANSVERSAL', 'i+d+i': 'TRANSVERSAL',
};
const norm = (x: string) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const limpio = (x: string) => String(x || '').replace(/\s+/g, ' ').trim();
import {
    ESTADOS_REGLA, GARANTES_SP, NOMBRE_ROL, ORDEN_ESTADOS, REGLAS_INICIALES, ROLES_SP,
    TRANSVERSAL, completarReglas, personaOculta, plantasDePersona, esGaranteSP, type EstadoRegla, type ReglasSP, type RolSP
} from '@/lib/sistema-produccion/reglas';

// Reglas de Medición del Sistema de Producción: consulta para todos; los garantes la editan (modo edición ámbar).
export default function ReglasMedicionView() {
    const [reglas, setReglas] = useState<ReglasSP | null>(null);
    const [borrador, setBorrador] = useState<ReglasSP | null>(null);
    const [meta, setMeta] = useState<{ por: string | null; at: string | null; guardadas: boolean }>({ por: null, at: null, guardadas: false });
    const [email, setEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    // Vigencia: los cambios aplican desde el lunes elegido; las semanas anteriores se siguen midiendo con la versión anterior
    const [versiones, setVersiones] = useState<{ vigente_desde: string; actualizado_por: string | null }[]>([]);
    // Fecha elegida en el calendario (por defecto hoy); el cambio aplica desde el lunes de esa semana, porque el
    // cumplimiento se mide por semana
    const [aplicaDesde, setAplicaDesde] = useState<string>(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const [conFestivo, setConFestivo] = useState(false);
    // Personal activo de Talento Humano: nombre completo y planta
    const [personal, setPersonal] = useState<{ nombre: string; planta: string }[]>([]);
    useEffect(() => {
        supabaseTalentoHumano.from('empleados').select('nombreCompleto, planta').eq('activo', true).order('nombreCompleto')
            .then(({ data }) => setPersonal((data || []).map(e => ({ nombre: limpio(e.nombreCompleto), planta: norm(e.planta) }))));
    }, []);
    const enPersonal = new Set(personal.map(p => norm(p.nombre)));
    const [nuevaPersona, setNuevaPersona] = useState<Record<RolSP, string>>({ 'Líder': '', 'Supervisor': '', 'Jefe': '', 'Gerente': '', 'Especialista': '' });

    useEffect(() => {
        (async () => {
            await cargarPlantasSP();
            const { data: { user } } = await supabase.auth.getUser();
            setEmail(user?.email ?? null);
            const { data, error: e } = await supabase.from('sp_reglas_medicion').select('datos, actualizado_por, actualizado_at').eq('clave', 'reglas').maybeSingle();
            if (e) {
                setError(/sp_reglas_medicion|relation|schema cache/i.test(e.message) ? 'Falta crear la tabla de reglas: ejecute sp_reglas_medicion.sql en Supabase. Se muestran los valores iniciales del Excel ILU.' : e.message);
                setReglas(completarReglas(REGLAS_INICIALES)); return;
            }
            const vr = await supabase.from('sp_reglas_versiones').select('vigente_desde, actualizado_por').order('vigente_desde', { ascending: true });
            if (!vr.error) setVersiones((vr.data || []) as { vigente_desde: string; actualizado_por: string | null }[]);
            if (data?.datos) { setReglas(completarReglas(data.datos as ReglasSP)); setMeta({ por: data.actualizado_por, at: data.actualizado_at, guardadas: true }); }
            else setReglas(completarReglas(REGLAS_INICIALES));
        })();
    }, []);

    // Actualizar indicadores: foto del Trabajo Estandarizado de la semana en curso
    const [actualizando, setActualizando] = useState(false);
    const [avisoAct, setAvisoAct] = useState<{ ok: boolean; texto: string } | null>(null);
    const actualizarIndicadores = async () => {
        setActualizando(true); setAvisoAct(null);
        try {
            const { errores, guardadas } = await actualizarTrabajoEstandarizado();
            setAvisoAct(errores.length ? { ok: false, texto: errores.join(' · ') }
                : { ok: true, texto: `Indicadores actualizados ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · Trabajo Estandarizado de ${guardadas} planta(s)` });
        } catch (e: any) {
            setAvisoAct({ ok: false, texto: `No se pudo actualizar: ${e?.message || e}` });
        }
        setActualizando(false);
    };

    const garante = esGaranteSP(email);
    const editando = !!borrador;
    const r = borrador || reglas;

    const ciclo = (e: EstadoRegla) => ORDEN_ESTADOS[(ORDEN_ESTADOS.indexOf(e) + 1) % ORDEN_ESTADOS.length];
    const cambiarRol = (i: number, rol: RolSP) => setBorrador(b => b && ({ ...b, herramientas: b.herramientas.map((h, k) => k === i ? { ...h, roles: { ...h.roles, [rol]: ciclo(h.roles[rol]) } } : h) }));
    const cambiarPlanta = (i: number, p: string) => setBorrador(b => b && ({ ...b, herramientas: b.herramientas.map((h, k) => k === i ? { ...h, plantas: { ...h.plantas, [p]: ciclo(h.plantas[p] || 'por_definir') } } : h) }));
    const cambiarNum = (campo: 'metaIndividual' | 'limiteSuperior' | 'limiteInferior', v: string) => setBorrador(b => b && ({ ...b, [campo]: Math.max(0, Math.min(100, Number(v) || 0)) }));
    const agregarPersona = (rol: RolSP, nombre?: string) => {
        const n = limpio(nombre ?? nuevaPersona[rol]); if (!n) return;
        const plantaTH = personal.find(p => norm(p.nombre) === norm(n))?.planta || '';
        const planta = PLANTA_TH_A_SP[plantaTH] || plantaSP(plantaTH) || '';
        setBorrador(b => b && ({
            ...b,
            personas: { ...b.personas, [rol]: (b.personas[rol] || []).some(x => norm(x) === norm(n)) ? b.personas[rol] : [...(b.personas[rol] || []), n] },
            plantaPersona: { ...(b.plantaPersona || {}), [n]: plantasDePersona(b, n).length ? plantasDePersona(b, n) : planta && planta !== TRANSVERSAL ? [planta] : [] },
        }));
        setNuevaPersona(p => ({ ...p, [rol]: '' }));
    };
    // Frecuencia por semana (vacío = sin frecuencia definida)
    const cambiarFrecuencia = (i: number, rol: RolSP, campo: 'semana' | 'festivo', v: string) => setBorrador(b => b && ({
        ...b, herramientas: b.herramientas.map((h, k) => {
            if (k !== i) return h;
            const fr = { ...(h.frecuencia || {}) };
            const actual = fr[rol] || { semana: 0, festivo: null, periodo: rol === 'Gerente' ? 'mes' as const : 'semana' as const };
            const n = v === '' ? null : Math.max(0, Math.min(20, Math.round(Number(v) || 0)));
            const nuevo = { ...actual, [campo]: n };
            if (campo === 'semana' && n === null) delete fr[rol]; else fr[rol] = { semana: nuevo.semana ?? 0, festivo: nuevo.festivo ?? null, periodo: actual.periodo || 'semana' };
            return { ...h, frecuencia: fr };
        })
    }));
    const cambiarPeriodo = (i: number, rol: RolSP, periodo: 'semana' | 'mes') => setBorrador(b => b && ({
        ...b, herramientas: b.herramientas.map((h, k) => {
            const fr = h.frecuencia?.[rol];
            if (k !== i || !fr) return h;
            return { ...h, frecuencia: { ...h.frecuencia, [rol]: { ...fr, periodo, festivo: periodo === 'mes' ? null : fr.festivo } } };
        })
    }));
    // Plantas de la persona: agregar o quitar una (puede tener varias)
    const alternarPlantaPersona = (nombre: string, planta: string) => setBorrador(b => {
        if (!b) return b;
        const act = plantasDePersona(b, nombre);
        const nuevas = act.includes(planta) ? act.filter(p => p !== planta) : [...act, planta];
        return { ...b, plantaPersona: { ...(b.plantaPersona || {}), [nombre]: PLANTAS_SP.map(p => p.value).filter(p => nuevas.includes(p)) } };
    });
    // Ocultar / mostrar una persona: sigue en su rol, pero no se mide ni sale en el tablero (desde "Aplica desde")
    const alternarOculta = (nombre: string) => setBorrador(b => {
        if (!b) return b;
        const ya = personaOculta(b, nombre);
        return { ...b, ocultas: ya ? (b.ocultas || []).filter(o => norm(o) !== norm(nombre)) : [...(b.ocultas || []), nombre] };
    });
    const quitarPersona = (rol: RolSP, i: number) => setBorrador(b => b && ({ ...b, personas: { ...b.personas, [rol]: b.personas[rol].filter((_, k) => k !== i) } }));

    // Lunes de la semana de una fecha (AAAA-MM-DD)
    const lunesVigencia = (fecha: string) => {
        const [y, m, dd] = fecha.split('-').map(Number);
        const d = new Date(y, (m || 1) - 1, dd || 1, 12);
        d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const fechaCorta = (iso: string) => iso.split('-').reverse().join('/');
    const guardar = async () => {
        if (!borrador) return;
        if (borrador.limiteInferior >= borrador.limiteSuperior) { setError('El límite inferior debe ser menor que el superior.'); return; }
        setGuardando(true); setError(null);
        const ahora = new Date().toISOString();
        const { error: e } = await supabase.from('sp_reglas_medicion').upsert({ clave: 'reglas', datos: borrador, actualizado_por: email, actualizado_at: ahora }, { onConflict: 'clave' });
        if (e) { setGuardando(false); setError(/row-level security|policy/i.test(e.message) ? 'Solo los garantes del Sistema de Producción pueden guardar las reglas.' : e.message); return; }
        // Versión con vigencia (lunes elegido); si ese lunes ya tenía versión, se reemplaza
        const desdeV = lunesVigencia(aplicaDesde);
        const { error: eV } = await supabase.from('sp_reglas_versiones').upsert({ vigente_desde: desdeV, datos: borrador, actualizado_por: email, actualizado_at: ahora }, { onConflict: 'vigente_desde' });
        if (eV) { setGuardando(false); setError(`Las reglas se guardaron, pero NO su vigencia (${/sp_reglas_versiones|relation|schema cache/i.test(eV.message) ? 'falta ejecutar sp_reglas_versiones.sql' : eV.message}): el cambio aplicaría también a las semanas anteriores.`); return; }
        setVersiones(v => [...v.filter(x => x.vigente_desde !== desdeV), { vigente_desde: desdeV, actualizado_por: email }].sort((a, b) => a.vigente_desde.localeCompare(b.vigente_desde)));
        // Verificación: se vuelve a leer lo guardado y se compara
        const { data: v, error: ev } = await supabase.from('sp_reglas_medicion').select('datos, actualizado_at').eq('clave', 'reglas').maybeSingle();
        setGuardando(false);
        // La base guarda el JSON con las claves en otro orden: se compara ordenándolas (y sin campos vacíos)
        const canon = (x: unknown): unknown => Array.isArray(x) ? x.map(canon)
            : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, canon(y)])) : x;
        if (ev || !v || JSON.stringify(canon(v.datos)) !== JSON.stringify(canon(borrador))) {
            setError(`Los cambios NO quedaron guardados en la base de datos${ev ? `: ${ev.message}` : ''}. Intente de nuevo o avise a Sistemas.`); return;
        }
        setReglas(borrador); setBorrador(null); setMeta({ por: email, at: ahora, guardadas: true });
    };

    // Revisiones esperadas por semana: frecuencia del rol × personas de ese rol en cada planta (solo si la herramienta aplica al rol
    // y no está marcada "No aplica" para la planta). Una persona con varias plantas aparece en cada una; el total la cuenta una vez.
    const columnasTotal = [...PLANTAS_SP.map(p => ({ key: p.value, label: p.value.replace('FPK-HOME-', 'HOME '), titulo: p.label })),
        { key: '', label: 'Sin planta', titulo: 'Personas sin planta definida' }];
    const totales = (r?.herramientas || []).map(h => {
        const porCol: Record<string, number> = {};
        let total = 0;
        columnasTotal.forEach(c => { porCol[c.key] = 0; });
        ROLES_SP.forEach(rol => {
            const fr = h.frecuencia?.[rol];
            if (!fr || fr.periodo === 'mes' || h.roles[rol] !== 'aplica') return;
            const cant = conFestivo && fr.festivo != null ? fr.festivo : fr.semana;
            (r?.personas[rol] || []).forEach(n => {
                if (personaOculta(r, n)) return;
                const suyas = plantasDePersona(r, n);
                const aplican = suyas.filter(p => h.plantas[p] !== 'no_aplica');
                if (suyas.length && !aplican.length) return;
                (aplican.length ? aplican : ['']).forEach(p => { porCol[p in porCol ? p : ''] += cant; });
                total += cant;
            });
        });
        return { codigo: h.codigo, nombre: h.nombre, porCol, total };
    }).filter(t => t.total > 0);
    const totalCol = (k: string) => totales.reduce((a, t) => a + t.porCol[k], 0);
    const granTotal = totales.reduce((a, t) => a + t.total, 0);

    if (!r) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

    const celda = (estado: EstadoRegla, onClick?: () => void) => {
        const e = ESTADOS_REGLA[estado];
        return (
            <button type="button" disabled={!onClick} onClick={onClick} title={`${e.label}: ${e.ayuda}${onClick ? ' · clic para cambiar' : ''}`}
                className={`w-full min-w-[34px] h-6 rounded-md border text-[10px] font-black ${e.clase} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-amber-300' : 'cursor-default'}`}>
                {e.corto}
            </button>
        );
    };
    const numero = (campo: 'metaIndividual' | 'limiteSuperior' | 'limiteInferior', label: string, ayuda: string) => (
        <div className="px-3 py-2 rounded-xl border border-slate-200 bg-white min-w-0" title={ayuda}>
            <div className="text-[10px] font-black uppercase text-slate-500">{label}</div>
            {editando ? (
                <input type="number" min={0} max={100} value={r[campo]} onChange={e => cambiarNum(campo, e.target.value)}
                    className="mt-0.5 w-20 h-7 px-2 bg-white border border-amber-300 rounded-lg text-sm font-black text-[#324354] focus:ring-2 focus:ring-amber-200 outline-none" />
            ) : <div className="text-xl font-black text-[#324354]">{r[campo]} %</div>}
        </div>
    );

    return (
        <section className={`bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border space-y-4 ${editando ? 'border-amber-500 ring-4 ring-amber-100' : 'border-[#e2ded5]'}`}>
            {/* Encabezado */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <BookOpenCheck className="w-5 h-5 text-[#324354]" />
                        <h2 className="text-base sm:text-lg font-black text-[#324354]">Reglas de Medición del Sistema</h2>
                        <a href="/indicadores-productividad?vista=sistema-produccion"
                            className="px-2 py-0.5 bg-white border border-[#e2ded5] hover:bg-[#F6F3EE] text-[#324354] rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                            title="Ir al Cumplimiento del Sistema de Producción (Tablero de Control)">
                            <BarChart3 className="w-3.5 h-3.5" /> Indicadores
                        </a>
                        {/* Recalcula lo que no se guarda solo (Trabajo Estandarizado: foto de la semana desde las HDT); el resto se
                            calcula en vivo al abrir los indicadores */}
                        <button type="button" onClick={actualizarIndicadores} disabled={actualizando}
                            className="px-2 py-0.5 bg-white border border-[#e2ded5] hover:bg-[#F6F3EE] text-[#324354] rounded-lg text-[11px] font-bold flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                            title="Recalcula el Trabajo Estandarizado (HDT) de la semana en curso y lo guarda. Las demás herramientas se calculan solas al abrir los indicadores.">
                            <RefreshCw className={`w-3.5 h-3.5 ${actualizando ? 'animate-spin' : ''}`} /> {actualizando ? 'Actualizando…' : 'Actualizar indicadores'}
                        </button>
                        {avisoAct && <span className={`text-[10px] font-bold ${avisoAct.ok ? 'text-emerald-700' : 'text-[#d14747]'}`}>{avisoAct.texto}</span>}
                        {editando && <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 rounded-md px-2 py-0.5">Modo edición</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {meta.guardadas ? `Última actualización: ${meta.at ? new Date(meta.at).toLocaleString('es-CO') : '—'}${meta.por ? ` · ${meta.por}` : ''}` : 'Valores iniciales tomados del Excel ILU CONSOLIDADO (aún sin guardar).'}
                    </p>
                    {versiones.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5" title="Cada semana se mide con la versión vigente en esa semana; un cambio no modifica las semanas anteriores">
                            Versiones vigentes desde: {versiones.map(v => fechaCorta(v.vigente_desde)).join(' · ')} <span className="text-slate-400">(cada semana se mide con la versión de su fecha; la tabla muestra la última)</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {garante && !editando && (
                        <button onClick={() => { setBorrador(JSON.parse(JSON.stringify(r))); setError(null); }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#324354] text-white text-xs font-bold hover:bg-[#254153]"><Pencil size={14} /> Editar</button>
                    )}
                    {editando && <>
                        <button onClick={() => { setBorrador(null); setError(null); }} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"><X size={14} /> Cancelar</button>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-amber-900" title="Las semanas anteriores se siguen midiendo con las reglas que tenían. El cumplimiento es semanal: el cambio aplica desde el lunes de la semana de la fecha elegida">
                            Aplica desde
                            <input type="date" value={aplicaDesde} onChange={e => { if (e.target.value) setAplicaDesde(e.target.value); }}
                                className="h-8 px-2 rounded-lg border border-amber-300 bg-white text-[11px] font-bold outline-none" />
                            {lunesVigencia(aplicaDesde) !== aplicaDesde && <span className="text-[10px] font-semibold text-amber-800">(semana del lunes {fechaCorta(lunesVigencia(aplicaDesde))})</span>}
                        </label>
                        <button onClick={guardar} disabled={guardando} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
                            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
                        </button>
                    </>}
                </div>
            </div>

            {error && <div className="px-3 py-2 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-lg flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}

            {/* Garantes */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-[#324354]" />
                <span className="font-bold text-slate-600">Garantes (pueden modificar):</span>
                {GARANTES_SP.map(g => <span key={g.nombre} className="px-2 py-0.5 rounded-full bg-[#324354]/10 text-[#324354] font-bold">{g.nombre}</span>)}
                {!garante && <span className="text-slate-400">· Usted puede consultar las reglas.</span>}
            </div>

            {/* Metas y cálculo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-2 content-start">
                    {numero('metaIndividual', 'Meta individual', 'Herramienta, planta y persona')}
                    {numero('limiteSuperior', 'Colectivo · límite superior', 'Cumplimiento FIRPLAK (verde desde aquí)')}
                    {numero('limiteInferior', 'Colectivo · límite inferior', 'Cumplimiento FIRPLAK (rojo por debajo)')}
                </div>
                <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-[#F6F3EE] p-3">
                    <h3 className="text-xs font-black uppercase text-[#324354] mb-1.5">Cómo se mide</h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                        {r.calculo.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {ORDEN_ESTADOS.map(e => (
                    <span key={e} className="flex items-center gap-1.5" title={ESTADOS_REGLA[e].ayuda}>
                        <span className={`inline-flex items-center justify-center w-9 h-5 rounded border text-[10px] font-black ${ESTADOS_REGLA[e].clase}`}>{ESTADOS_REGLA[e].corto}</span>
                        <span className="font-semibold text-slate-600">{ESTADOS_REGLA[e].label}</span>
                    </span>
                ))}
                {editando && <span className="text-amber-700 font-bold">· Clic en una casilla para cambiar su estado</span>}
            </div>

            {/* Matriz herramienta × rol y × planta */}
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[1300px]">
                    <thead>
                        <tr className="bg-[#324354] text-white text-[10px] uppercase tracking-wider">
                            <th className="px-2 py-1.5 text-left" rowSpan={2}>Herramienta</th>
                            <th className="px-2 py-1.5 text-left w-[240px] min-w-[200px]" rowSpan={2}>Fuente del dato</th>
                            <th className="px-2 py-1 text-center border-l border-white/20" colSpan={3}>A quién aplica (rol)</th>
                            <th className="px-2 py-1 text-center border-l border-white/20" colSpan={PLANTAS_SP.length}>Plantas</th>
                        </tr>
                        <tr className="bg-[#254153] text-white text-[10px] uppercase whitespace-nowrap">
                            {ROLES_SP.map((x, i) => <th key={x} className={`px-1.5 py-1 text-center ${i === 0 ? 'border-l border-white/20' : ''}`} title={NOMBRE_ROL[x].varios}>{NOMBRE_ROL[x].corto}</th>)}
                            {PLANTAS_SP.map((p, i) => <th key={p.value} className={`px-1 py-1 text-center ${i === 0 ? 'border-l border-white/20' : ''}`} title={p.label}>{p.value === 'MANTENIMIENTO' ? 'MANT.' : p.value}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {r.herramientas.map((h, i) => (
                            <tr key={h.codigo} className="hover:bg-[#F6F3EE] align-middle">
                                <td className="px-2 py-1.5">
                                    <div className="font-black text-[#324354]">{h.nombre}</div>
                                    {h.nota && <div className="text-[10px] text-slate-500 leading-tight">{h.nota}</div>}
                                </td>
                                <td className="px-2 py-1.5 text-[11px] text-slate-600 w-[240px] min-w-[200px]">{h.fuente}</td>
                                {ROLES_SP.map((rol, k) => <td key={rol} className={`px-1 py-1 ${k === 0 ? 'border-l border-slate-200' : ''}`}>{celda(h.roles[rol], editando ? () => cambiarRol(i, rol) : undefined)}</td>)}
                                {PLANTAS_SP.map((p, k) => <td key={p.value} className={`px-0.5 py-1 ${k === 0 ? 'border-l border-slate-200' : ''}`}>{celda(h.plantas[p.value] || 'por_definir', editando ? () => cambiarPlanta(i, p.value) : undefined)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Frecuencia mínima por semana (por herramienta y rol); en semanas con festivo puede bajar */}
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <div className="px-3 py-2 bg-[#F6F3EE] border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-black uppercase text-[#324354]">Frecuencia mínima</h3>
                    <span className="text-[10px] text-slate-500">Cantidad que cada persona debe cumplir por semana o por mes · entre paréntesis, en semanas con festivo · "—" sin frecuencia definida</span>
                </div>
                <table className="w-full text-xs border-collapse min-w-[640px]">
                    <thead>
                        <tr className="bg-[#324354] text-white text-[10px] uppercase tracking-wider">
                            <th className="px-2 py-1.5 text-left">Herramienta</th>
                            {ROLES_SP.map(rol => <th key={rol} className="px-2 py-1.5 text-center">{NOMBRE_ROL[rol].varios}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {r.herramientas.map((h, i) => (
                            <tr key={h.codigo} className="hover:bg-[#F6F3EE]">
                                <td className="px-2 py-1.5 font-black text-[#324354]">{h.nombre}</td>
                                {ROLES_SP.map(rol => {
                                    const fr = h.frecuencia?.[rol];
                                    const aplica = h.roles[rol] === 'aplica';
                                    return (
                                        <td key={rol} className="px-2 py-1.5 text-center">
                                            {editando ? (
                                                <div className="inline-flex items-center gap-1">
                                                    <input type="number" min={0} max={20} value={fr?.semana ?? ''} placeholder="—" title="Por semana"
                                                        onChange={e => cambiarFrecuencia(i, rol, 'semana', e.target.value)}
                                                        className="w-12 h-6 px-1 text-center bg-white border border-amber-300 rounded text-xs font-black outline-none focus:ring-2 focus:ring-amber-200" />
                                                    <select value={fr?.periodo || 'semana'} disabled={!fr} onChange={e => cambiarPeriodo(i, rol, e.target.value as 'semana' | 'mes')} title="Periodo"
                                                        className="h-6 text-[10px] font-bold bg-white border border-amber-300 rounded outline-none disabled:opacity-40">
                                                        <option value="semana">/ semana</option>
                                                        <option value="mes">/ mes</option>
                                                    </select>
                                                    {fr?.periodo !== 'mes' && <>
                                                        <span className="text-[10px] text-slate-500">festivo</span>
                                                        <input type="number" min={0} max={20} value={fr?.festivo ?? ''} placeholder="—" title="En semanas con festivo" disabled={!fr}
                                                            onChange={e => cambiarFrecuencia(i, rol, 'festivo', e.target.value)}
                                                            className="w-12 h-6 px-1 text-center bg-white border border-amber-300 rounded text-xs font-black outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-40" />
                                                    </>}
                                                </div>
                                            ) : fr ? (
                                                <span className={`font-black ${aplica ? 'text-[#324354]' : 'text-slate-400'}`} title={aplica ? '' : 'Tiene frecuencia, pero la herramienta no aplica a este rol'}>
                                                    {fr.semana} / {fr.periodo === 'mes' ? 'mes' : 'semana'}{fr.periodo !== 'mes' && fr.festivo != null && fr.festivo !== fr.semana ? <span className="text-[#7a5f0e]"> ({fr.festivo} con festivo)</span> : fr.periodo !== 'mes' && fr.festivo != null ? <span className="text-slate-500"> (igual con festivo)</span> : null}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Total de revisiones esperadas por semana, por planta */}
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
                {reglasSinMedicion(r).length > 0 && (
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-[11px] font-semibold text-amber-900">
                        <p className="font-black">Reglas en "Sí" que no se están midiendo en el tablero:</p>
                        <ul className="list-disc pl-5">{reglasSinMedicion(r).map(t => <li key={t}>{t}</li>)}</ul>
                    </div>
                )}
                <div className="px-3 py-2 bg-[#F6F3EE] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-xs font-black uppercase text-[#324354]">Revisiones esperadas por semana · por planta</h3>
                        <p className="text-[10px] text-slate-500">Frecuencia × personas de cada rol en la planta (según las plantas de cada persona, abajo; quien tiene varias plantas aparece en cada una y el total lo cuenta una vez). Solo herramientas con frecuencia semanal definida (las mensuales, como la del Gerente, no se suman aquí).</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                        {([[false, 'Semana normal'], [true, 'Semana con festivo']] as const).map(([v, t]) => (
                            <button key={t} onClick={() => setConFestivo(v)} className={`px-2 py-0.5 rounded-md font-bold ${conFestivo === v ? 'bg-[#324354] text-white' : 'text-slate-600 hover:text-black'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                {totales.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold italic text-slate-400">Defina frecuencias y plantas de las personas para ver los totales.</div>
                ) : (
                    <table className="w-full text-xs border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-[#324354] text-white text-[10px] uppercase whitespace-nowrap">
                                <th className="px-2 py-1.5 text-left">Herramienta</th>
                                {columnasTotal.map(c => <th key={c.key || 'sin'} className="px-1.5 py-1.5 text-center" title={c.titulo}>{c.label}</th>)}
                                <th className="px-2 py-1.5 text-center bg-[#254153]">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {totales.map(t => (
                                <tr key={t.codigo} className="hover:bg-[#F6F3EE]">
                                    <td className="px-2 py-1.5 font-black text-[#324354] whitespace-nowrap">{t.nombre}{![...HERRAMIENTAS_AUTO, ...HERRAMIENTAS_POR_PLANTA].includes(t.codigo as never) && <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1" title="Aún no tiene fuente automática en la app: no entra en el cumplimiento del tablero">sin medición</span>}</td>
                                    {columnasTotal.map(c => <td key={c.key || 'sin'} className={`px-1.5 py-1.5 text-center font-bold ${t.porCol[c.key] ? 'text-[#324354]' : 'text-slate-300'}`}>{t.porCol[c.key] || '—'}</td>)}
                                    <td className="px-2 py-1.5 text-center font-black text-[#324354] bg-[#F6F3EE]">{t.total}</td>
                                </tr>
                            ))}
                            <tr className="bg-[#324354]/10 font-black text-[#324354]">
                                <td className="px-2 py-1.5 uppercase text-[10px]" title="Suma de cada planta; quien tiene varias plantas suma en cada una">Total por planta</td>
                                {columnasTotal.map(c => <td key={c.key || 'sin'} className="px-1.5 py-1.5 text-center">{totalCol(c.key) || '—'}</td>)}
                                <td className="px-2 py-1.5 text-center bg-[#324354] text-white">{granTotal}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Personas por rol */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                {ROLES_SP.map(rol => (
                    <div key={rol} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black uppercase text-[#324354]">{NOMBRE_ROL[rol].varios}</h3>
                            <span className="text-[10px] font-bold text-slate-500">{(r.personas[rol] || []).length} persona(s)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(r.personas[rol] || []).map((n, k) => (
                                <span key={`${n}-${k}`} className={`flex flex-wrap items-center gap-1 max-w-full text-[11px] font-semibold border rounded-lg px-2 py-0.5 ${personaOculta(r, n) ? 'bg-slate-100 border-dashed border-slate-300 text-slate-400' : 'bg-[#F6F3EE] border-[#e2ded5] text-[#324354]'}`}
                                    title={personaOculta(r, n) ? 'Oculta: no se mide ni sale en el tablero' : undefined}>
                                    {personaOculta(r, n) && <EyeOff size={11} />}
                                    {/* Con muchas plantas: el nombre en un renglón y las plantas en el siguiente (no se sale del recuadro) */}
                                    <span className={`${personaOculta(r, n) ? 'line-through' : ''} ${plantasDePersona(r, n).length > 2 ? 'basis-full' : ''}`}>{n}</span>
                                    {personal.length > 0 && !enPersonal.has(norm(n)) && (
                                        <span title="No está activo en la base de personal (Talento Humano): revise el nombre o retírelo" className="text-[#d14747]"><AlertTriangle size={11} /></span>
                                    )}
                                    {plantasDePersona(r, n).map(p => (
                                        <span key={p} className="ml-0.5 flex items-center gap-0.5 text-[9px] font-black px-1 rounded bg-[#324354]/10 text-[#324354]" title={`Planta: ${p}`}>
                                            {p}
                                            {editando && <button type="button" onClick={() => alternarPlantaPersona(n, p)} title={`Quitar ${p}`} className="text-[#7B8E90] hover:text-[#d14747]"><X size={9} /></button>}
                                        </span>
                                    ))}
                                    {!plantasDePersona(r, n).length && <span className="ml-1 text-[9px] font-black px-1 rounded bg-[#deb841]/30 text-[#7a5f0e]" title="Planta por definir">¿planta?</span>}
                                    {editando && (
                                        <select value="" onChange={e => { if (e.target.value) alternarPlantaPersona(n, e.target.value); }} title="Agregar una planta a la persona (puede tener varias)"
                                            className="ml-1 h-5 w-[74px] text-[10px] font-bold bg-white border border-amber-300 rounded outline-none">
                                            <option value="">+ Planta</option>
                                            {PLANTAS_SP.filter(p => !plantasDePersona(r, n).includes(p.value)).map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
                                        </select>
                                    )}
                                    {editando && (
                                        <button type="button" onClick={() => alternarOculta(n)} title={personaOculta(r, n) ? 'Mostrar: volver a medirla' : 'Ocultar: no medirla ni mostrarla en el tablero'}
                                            className="text-[#7B8E90] hover:text-[#324354]">{personaOculta(r, n) ? <Eye size={11} /> : <EyeOff size={11} />}</button>
                                    )}
                                    {editando && <button onClick={() => quitarPersona(rol, k)} title="Quitar" className="text-[#7B8E90] hover:text-[#d14747]"><Trash2 size={11} /></button>}
                                </span>
                            ))}
                        </div>
                        {editando && (
                            // Solo nombres completos de la base de personal (Talento Humano); al elegir se agrega con su planta
                            <div className="mt-2">
                                <SearchableSelect key={`${rol}-${(r.personas[rol] || []).length}`} name={`agregar-${rol}`} options={personal.map(p => p.nombre)}
                                    placeholder="Agregar persona (base de personal)" className="h-7 px-2 py-1 text-xs border-amber-300"
                                    onValueChange={v => v && agregarPersona(rol, v)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
