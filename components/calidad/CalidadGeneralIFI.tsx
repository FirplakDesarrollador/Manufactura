'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Loader2, PencilLine, RefreshCw, Save, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { supabase } from '@/lib/supabase';
import { PLANTAS_IFI_MANUALES, PlantaIfi } from '@/lib/calidad/ifiGeneral';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Semáforo del IFI general (cumplimiento ponderado, meta 100%)
const colorIfi = (v: number | null | undefined) => (v == null ? '#94a3b8' : v >= 0.95 ? '#59a96a' : v >= 0.9 ? '#deb841' : '#d14747');
const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${(v * 100).toFixed(d)}%`);
const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

interface PlantaCfg { codigo: PlantaIfi; nombre: string; peso: number; meta: number; orden: number }
interface Detalle { codigo: PlantaIfi; calidad: number; meta: number; pesoEfectivo: number; cumplimiento: number; aporte: number }
interface Dia { fecha: string; dia: number; ifi: number; valores: Partial<Record<PlantaIfi, number>>; detalle: Detalle[] }
interface Respuesta {
    plantas: PlantaCfg[];
    diario: Dia[];
    mesResumen: { ifi: number | null; diasConDato: number; plantas: (PlantaCfg & { calidad: number | null; dias: number })[] };
    historico: { ifi: number | null; plantas: { planta: PlantaIfi; calidad: number | null; fuente: string; dudoso: boolean; nota: string | null }[] } | null;
    puedeEditar: boolean;
    avisos: string[];
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sesión no disponible');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const TooltipDia = ({ active, payload, plantas }: any) => {
    if (!active || !payload?.length) return null;
    const d: Dia = payload[0].payload;
    const nombre = (c: PlantaIfi) => plantas.find((p: PlantaCfg) => p.codigo === c)?.nombre || c;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2.5 text-[11px] min-w-[230px]">
            <div className="flex justify-between font-black text-slate-800 mb-1.5">
                <span>{d.fecha}</span>
                <span style={{ color: colorIfi(d.ifi) }}>IFI {pct(d.ifi)}</span>
            </div>
            <table className="w-full">
                <thead className="text-[9px] text-slate-400 uppercase">
                    <tr><th className="text-left">Planta</th><th className="text-right">Calidad</th><th className="text-right">Meta</th><th className="text-right">Cumpl.</th><th className="text-right">Peso</th></tr>
                </thead>
                <tbody>
                    {d.detalle.map(x => (
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
        </div>
    );
};

// Calidad General Plantas - IFI (MS, MBL, CEFI, FV, RTM), resultado diario del mes
export default function CalidadGeneralIFI() {
    const hoy = hoyBogota();
    const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
    const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
    const [data, setData] = useState<Respuesta | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showRegistro, setShowRegistro] = useState(false);
    const [regFecha, setRegFecha] = useState(hoy);
    const [regValores, setRegValores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const [regError, setRegError] = useState<string | null>(null);

    const [sync, setSync] = useState<{ activo: boolean; texto: string } | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`/api/calidad/ifi-general?anio=${anio}&mes=${mes}`, { headers: await authHeaders() });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'Error consultando IFI general');
            setData(json);
        } catch (e: any) {
            setData(null);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [anio, mes]);

    useEffect(() => { void cargar(); }, [cargar]);

    // Prellenar el formulario con lo ya registrado en la fecha elegida
    const abrirRegistro = (fecha = hoy) => {
        setRegFecha(fecha);
        setRegError(null);
        setShowRegistro(true);
    };
    useEffect(() => {
        if (!showRegistro) return;
        const dia = data?.diario.find(d => d.fecha === regFecha);
        const v: Record<string, string> = {};
        PLANTAS_IFI_MANUALES.forEach(p => {
            const val = dia?.valores[p];
            v[p] = typeof val === 'number' ? String(+(val * 100).toFixed(1)) : '';
        });
        setRegValores(v);
    }, [showRegistro, regFecha, data]);

    const guardarRegistro = async () => {
        setGuardando(true);
        setRegError(null);
        try {
            const valores: Record<string, number | null> = {};
            PLANTAS_IFI_MANUALES.forEach(p => {
                const raw = (regValores[p] || '').replace(',', '.').trim();
                valores[p] = raw === '' ? null : Number(raw);
            });
            const resp = await fetch('/api/calidad/ifi-general', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({ accion: 'registrar', fecha: regFecha, valores })
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'No se pudo guardar');
            setShowRegistro(false);
            const [y, m] = regFecha.split('-').map(Number);
            if (y !== anio || m !== mes) { setAnio(y); setMes(m); } else void cargar();
        } catch (e: any) {
            setRegError(e.message);
        } finally {
            setGuardando(false);
        }
    };

    // Recalcula el histórico mensual de MS (desde oct-2025) y FV (desde abr-2023) con sus fuentes
    const sincronizarHistorico = async () => {
        if (!confirm('Se recalculará el histórico mensual de MS (desde oct-2025) y FV (desde abr-2023) con sus fuentes. Puede tardar unos minutos. ¿Continuar?')) return;
        const meses: [number, number][] = [];
        for (let y = 2023; y <= Number(hoy.slice(0, 4)); y++) {
            for (let m = 1; m <= 12; m++) {
                const ym = `${y}-${String(m).padStart(2, '0')}`;
                if (ym >= '2023-04' && ym <= hoy.slice(0, 7)) meses.push([y, m]);
            }
        }
        setSync({ activo: true, texto: 'Iniciando…' });
        const fallos: string[] = [];
        for (let i = 0; i < meses.length; i++) {
            const [y, m] = meses[i];
            setSync({ activo: true, texto: `${i + 1}/${meses.length} · ${MESES[m - 1]} ${y}` });
            try {
                const resp = await fetch('/api/calidad/ifi-general', {
                    method: 'POST',
                    headers: await authHeaders(),
                    body: JSON.stringify({ accion: 'sincronizar_mes', anio: y, mes: m })
                });
                const json = await resp.json();
                if (!resp.ok || !json.success) fallos.push(`${MESES[m - 1]} ${y}: ${json.error}`);
            } catch (e: any) {
                fallos.push(`${MESES[m - 1]} ${y}: ${e.message}`);
            }
        }
        setSync({ activo: false, texto: fallos.length ? `Terminado con ${fallos.length} error(es): ${fallos.slice(0, 3).join(' | ')}` : 'Histórico MS/FV actualizado' });
        void cargar();
    };

    const plantas = data?.plantas || [];
    const diario = data?.diario || [];
    const resumen = data?.mesResumen;
    const sinDiario = !loading && diario.length === 0;

    const anios = useMemo(() => {
        const actual = Number(hoy.slice(0, 4));
        return Array.from({ length: actual - 2021 + 1 }, (_, i) => actual - i);
    }, [hoy]);

    return (
        <div className="space-y-3">
            {/* Filtros y acciones */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                        <span className="text-slate-400 font-bold">Año</span>
                        <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer">
                            {anios.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                        <span className="text-slate-400 font-bold">Mes</span>
                        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer capitalize">
                            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <button onClick={cargar} disabled={loading} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700" title="Recargar">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
                {data?.puedeEditar && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={sincronizarHistorico}
                            disabled={sync?.activo}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-[#324354] rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-60"
                            title="Recalcula el histórico mensual de MS y FV desde Supabase y SharePoint"
                        >
                            {sync?.activo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                            <span>Sincronizar histórico MS/FV</span>
                        </button>
                        <button
                            onClick={() => abrirRegistro()}
                            className="px-3 py-1.5 bg-[#324354] hover:bg-[#324354]/90 text-white rounded-lg font-bold flex items-center gap-1.5"
                        >
                            <PencilLine className="w-3.5 h-3.5" />
                            <span>Registrar calidad del día</span>
                        </button>
                    </div>
                )}
            </div>

            {sync && <div className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${sync.activo ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>Sincronización: {sync.texto}</div>}
            {error && <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            {data?.avisos?.map(a => <div key={a} className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{a}</div>)}

            {/* Resultado del mes y por planta */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="col-span-2 p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between" style={{ borderColor: colorIfi(resumen?.ifi), background: `${colorIfi(resumen?.ifi)}14` }}>
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">IFI General · <span className="capitalize">{MESES[mes - 1]}</span></span>
                        <span className="text-[10px] font-black bg-white/80 text-slate-700 px-1.5 rounded-full border border-slate-200">Meta 100%</span>
                    </div>
                    <p className="text-2xl font-black mt-1" style={{ color: colorIfi(resumen?.ifi) }}>
                        {sinDiario && data?.historico ? pct(data.historico.ifi) : pct(resumen?.ifi)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                        {sinDiario && data?.historico ? 'Histórico mensual (Excel / fuentes)' : `Promedio de ${resumen?.diasConDato ?? 0} día(s) con dato`}
                    </p>
                </div>
                {plantas.map(p => {
                    const cal = sinDiario
                        ? data?.historico?.plantas.find(h => h.planta === p.codigo)?.calidad ?? null
                        : resumen?.plantas.find(x => x.codigo === p.codigo)?.calidad ?? null;
                    const ok = cal !== null && cal >= p.meta;
                    return (
                        <div key={p.codigo} className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-600 uppercase" title={p.nombre}>{p.codigo}</span>
                                <span className="text-[9px] font-bold text-slate-400">peso {pct(p.peso, 0)}</span>
                            </div>
                            <span className={`text-lg font-black ${cal === null ? 'text-slate-300' : ok ? 'text-emerald-600' : 'text-rose-600'}`}>{pct(cal)}</span>
                            <span className="text-[9px] font-bold text-slate-400">meta {pct(p.meta, 0)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Gráfica diaria del mes */}
            <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 capitalize">IFI General por Día ({MESES[mes - 1]} {anio})</h3>
                    <span className="text-[10px] font-bold text-slate-500">
                        Semáforo: Verde ≥95% | Amarillo 90–95% | Rojo &lt;90% · Clic en una barra para editar ese día
                    </span>
                </div>
                <div className="h-[230px] w-full">
                    {loading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                    ) : sinDiario ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-sm font-bold text-slate-500">Sin datos diarios para este mes.</p>
                            {data?.historico && (
                                <p className="text-[11px] text-slate-400 max-w-md">
                                    Se muestra el histórico mensual. Plantas: {data.historico.plantas.map(h => `${h.planta} ${pct(h.calidad)}${h.dudoso ? '*' : ''}`).join(' · ')}
                                    {data.historico.plantas.some(h => h.dudoso) && ' (* dato dudoso del Excel)'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={diario.map(d => ({ ...d, ifiPct: +(d.ifi * 100).toFixed(1) }))}
                                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                                onClick={(e: any) => { if (data?.puedeEditar && e?.activePayload?.[0]) abrirRegistro(e.activePayload[0].payload.fecha); }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                                <YAxis domain={[(min: number) => Math.max(0, Math.min(80, Math.floor(min / 10) * 10)), 100]} tick={{ fontSize: 10 }} />
                                <Tooltip content={<TooltipDia plantas={plantas} />} cursor={{ fill: '#f1f5f9' }} />
                                <ReferenceLine y={100} stroke="#2563eb" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta 100%', fill: '#2563eb', fontSize: 10, position: 'insideTopRight' }} />
                                <Bar dataKey="ifiPct" radius={[4, 4, 0, 0]} cursor={data?.puedeEditar ? 'pointer' : undefined}>
                                    {diario.map(d => <Cell key={d.fecha} fill={colorIfi(d.ifi)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Modal: registrar calidad del día (MBL, CEFI, RTM) */}
            {showRegistro && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60" onMouseDown={e => { if (e.target === e.currentTarget && !guardando) setShowRegistro(false); }}>
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
                                return (
                                    <div key={p}>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between mb-1">
                                            <span>{cfg?.nombre || p} ({p})</span>
                                            <span className="text-slate-400">meta {pct(cfg?.meta, 0)}</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                max={100}
                                                step="0.1"
                                                value={regValores[p] ?? ''}
                                                onChange={e => setRegValores(prev => ({ ...prev, [p]: e.target.value }))}
                                                placeholder="Sin dato"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm font-bold text-[#324354] outline-none focus:border-[#324354]"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
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
