'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PLANTAS_SP } from '@/lib/sistema-produccion/cumplimiento';
import {
    ESTADOS_REGLA, GARANTES_SP, ORDEN_ESTADOS, REGLAS_INICIALES, ROLES_SP,
    esGaranteSP, type EstadoRegla, type ReglasSP, type RolSP
} from '@/lib/sistema-produccion/reglas';

// Reglas de Medición del Sistema de Producción: consulta para todos; los garantes la editan (modo edición ámbar).
export default function ReglasMedicionView() {
    const [reglas, setReglas] = useState<ReglasSP | null>(null);
    const [borrador, setBorrador] = useState<ReglasSP | null>(null);
    const [meta, setMeta] = useState<{ por: string | null; at: string | null; guardadas: boolean }>({ por: null, at: null, guardadas: false });
    const [email, setEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [nuevaPersona, setNuevaPersona] = useState<Record<RolSP, string>>({ 'Líder': '', 'Supervisor': '', 'Jefe': '' });

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setEmail(user?.email ?? null);
            const { data, error: e } = await supabase.from('sp_reglas_medicion').select('datos, actualizado_por, actualizado_at').eq('clave', 'reglas').maybeSingle();
            if (e) {
                setError(/sp_reglas_medicion|relation|schema cache/i.test(e.message) ? 'Falta crear la tabla de reglas: ejecute sp_reglas_medicion.sql en Supabase. Se muestran los valores iniciales del Excel ILU.' : e.message);
                setReglas(REGLAS_INICIALES); return;
            }
            if (data?.datos) { setReglas(data.datos as ReglasSP); setMeta({ por: data.actualizado_por, at: data.actualizado_at, guardadas: true }); }
            else setReglas(REGLAS_INICIALES);
        })();
    }, []);

    const garante = esGaranteSP(email);
    const editando = !!borrador;
    const r = borrador || reglas;

    const ciclo = (e: EstadoRegla) => ORDEN_ESTADOS[(ORDEN_ESTADOS.indexOf(e) + 1) % ORDEN_ESTADOS.length];
    const cambiarRol = (i: number, rol: RolSP) => setBorrador(b => b && ({ ...b, herramientas: b.herramientas.map((h, k) => k === i ? { ...h, roles: { ...h.roles, [rol]: ciclo(h.roles[rol]) } } : h) }));
    const cambiarPlanta = (i: number, p: string) => setBorrador(b => b && ({ ...b, herramientas: b.herramientas.map((h, k) => k === i ? { ...h, plantas: { ...h.plantas, [p]: ciclo(h.plantas[p] || 'por_definir') } } : h) }));
    const cambiarNum = (campo: 'metaIndividual' | 'limiteSuperior' | 'limiteInferior', v: string) => setBorrador(b => b && ({ ...b, [campo]: Math.max(0, Math.min(100, Number(v) || 0)) }));
    const agregarPersona = (rol: RolSP) => {
        const n = nuevaPersona[rol].trim(); if (!n) return;
        setBorrador(b => b && ({ ...b, personas: { ...b.personas, [rol]: [...(b.personas[rol] || []), n] } }));
        setNuevaPersona(p => ({ ...p, [rol]: '' }));
    };
    const quitarPersona = (rol: RolSP, i: number) => setBorrador(b => b && ({ ...b, personas: { ...b.personas, [rol]: b.personas[rol].filter((_, k) => k !== i) } }));

    const guardar = async () => {
        if (!borrador) return;
        if (borrador.limiteInferior >= borrador.limiteSuperior) { setError('El límite inferior debe ser menor que el superior.'); return; }
        setGuardando(true); setError(null);
        const ahora = new Date().toISOString();
        const { error: e } = await supabase.from('sp_reglas_medicion').upsert({ clave: 'reglas', datos: borrador, actualizado_por: email, actualizado_at: ahora }, { onConflict: 'clave' });
        setGuardando(false);
        if (e) { setError(/row-level security|policy/i.test(e.message) ? 'Solo los garantes del Sistema de Producción pueden guardar las reglas.' : e.message); return; }
        setReglas(borrador); setBorrador(null); setMeta({ por: email, at: ahora, guardadas: true });
    };

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
                        {editando && <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 rounded-md px-2 py-0.5">Modo edición</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {meta.guardadas ? `Última actualización: ${meta.at ? new Date(meta.at).toLocaleString('es-CO') : '—'}${meta.por ? ` · ${meta.por}` : ''}` : 'Valores iniciales tomados del Excel ILU CONSOLIDADO (aún sin guardar).'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {garante && !editando && (
                        <button onClick={() => { setBorrador(JSON.parse(JSON.stringify(r))); setError(null); }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#324354] text-white text-xs font-bold hover:bg-[#254153]"><Pencil size={14} /> Editar</button>
                    )}
                    {editando && <>
                        <button onClick={() => { setBorrador(null); setError(null); }} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"><X size={14} /> Cancelar</button>
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
                <table className="w-full text-xs border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="bg-[#324354] text-white text-[10px] uppercase tracking-wider">
                            <th className="px-2 py-1.5 text-left" rowSpan={2}>Herramienta</th>
                            <th className="px-2 py-1.5 text-left" rowSpan={2}>Fuente del dato</th>
                            <th className="px-2 py-1 text-center border-l border-white/20" colSpan={3}>A quién aplica (rol)</th>
                            <th className="px-2 py-1 text-center border-l border-white/20" colSpan={PLANTAS_SP.length}>Plantas</th>
                        </tr>
                        <tr className="bg-[#254153] text-white text-[10px] uppercase whitespace-nowrap">
                            {ROLES_SP.map((x, i) => <th key={x} className={`px-1.5 py-1 text-center ${i === 0 ? 'border-l border-white/20' : ''}`}>{x}</th>)}
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
                                <td className="px-2 py-1.5 text-[11px] text-slate-600">{h.fuente}</td>
                                {ROLES_SP.map((rol, k) => <td key={rol} className={`px-1 py-1 ${k === 0 ? 'border-l border-slate-200' : ''}`}>{celda(h.roles[rol], editando ? () => cambiarRol(i, rol) : undefined)}</td>)}
                                {PLANTAS_SP.map((p, k) => <td key={p.value} className={`px-0.5 py-1 ${k === 0 ? 'border-l border-slate-200' : ''}`}>{celda(h.plantas[p.value] || 'por_definir', editando ? () => cambiarPlanta(i, p.value) : undefined)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Personas por rol */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ROLES_SP.map(rol => (
                    <div key={rol} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black uppercase text-[#324354]">{rol === 'Líder' ? 'Líderes' : rol === 'Supervisor' ? 'Supervisores' : 'Jefes'}</h3>
                            <span className="text-[10px] font-bold text-slate-500">{(r.personas[rol] || []).length} persona(s)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(r.personas[rol] || []).map((n, k) => (
                                <span key={`${n}-${k}`} className="flex items-center gap-1 text-[11px] font-semibold bg-[#F6F3EE] border border-[#e2ded5] text-[#324354] rounded-lg px-2 py-0.5">
                                    {n}
                                    {editando && <button onClick={() => quitarPersona(rol, k)} title="Quitar" className="text-[#7B8E90] hover:text-[#d14747]"><Trash2 size={11} /></button>}
                                </span>
                            ))}
                        </div>
                        {editando && (
                            <div className="flex gap-1.5 mt-2">
                                <input value={nuevaPersona[rol]} onChange={e => setNuevaPersona(p => ({ ...p, [rol]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && agregarPersona(rol)}
                                    placeholder="Nombre" className="flex-1 h-7 px-2 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-200" />
                                <button onClick={() => agregarPersona(rol)} className="h-7 px-2 rounded-lg bg-[#324354] text-white text-xs font-bold"><Plus size={13} /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
