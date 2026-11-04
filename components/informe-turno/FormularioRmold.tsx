'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, Plus, Settings2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    CAUSAS_PARO_BASE, FAMILIAS_PARO, META_NS, META_PRODUCTIVIDAD, MINUTOS_POR_MOLDE, MetaPersonas, NOMBRE_FAMILIA, ParoRmold, RegistroRmold,
    TIEMPO_OPERACION_MIN, calcularDia, cargarRmold, guardarCierreRmold, guardarMetasPersonas, metaParaPersonas
} from '@/lib/informe-turno/rmold';

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaLarga = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const etiqueta = 'text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1';
const campo = 'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] bg-white';
const dec = (n: number, d = 1) => n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
// Semáforo de indicadores con meta: verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo
const semaforo = (v: number | null, meta: number) => (v == null ? 'text-slate-400' : v >= meta ? 'text-[#3b8f50]' : v >= meta - 10 ? 'text-[#b8961f]' : 'text-[#d14747]');

type Campos = Record<'ms' | 'fv' | 'rtm' | 'brillados' | 'desmanchados' | 'esperados' | 'entregados' | 'personas' | 'meta', string>;
const VACIO: Campos = { ms: '', fv: '', rtm: '', brillados: '', desmanchados: '', esperados: '', entregados: '', personas: '', meta: '' };
const txt = (v: number | null | undefined) => (v == null ? '' : String(v));
const valor = (s: string) => (s.trim() === '' ? 0 : Math.max(0, Number(s.replace(',', '.')) || 0));
const valorONulo = (s: string) => (s.trim() === '' ? null : Math.max(0, Number(s.replace(',', '.')) || 0));

interface ParoForm { familia: string; causa: string; minutos: string; observacion: string; tipo: 'REFLEJADO' | 'REAL' }
const paroNuevo = (): ParoForm => ({ familia: FAMILIAS_PARO[0], causa: '', minutos: '', observacion: '', tipo: 'REFLEJADO' });

// Informe de Turno → Reparación de Moldes: cierre del día (reemplaza la hoja del mes del Excel "Productividad Moldes")
export default function FormularioRmold() {
    const [registros, setRegistros] = useState<RegistroRmold[]>([]);
    const [paros, setParos] = useState<ParoRmold[]>([]);
    const [metas, setMetas] = useState<MetaPersonas[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [fecha, setFecha] = useState(hoyBogota());
    const [c, setC] = useState<Campos>(VACIO);
    const [metaManual, setMetaManual] = useState(false);
    const [parosForm, setParosForm] = useState<ParoForm[]>([]);
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
    const [configurando, setConfigurando] = useState(false);

    useEffect(() => {
        let vivo = true;
        setCargando(true);
        cargarRmold(supabase)
            .then(d => { if (vivo) { setRegistros(d.registros); setParos(d.paros); setMetas(d.metas); setErrorCarga(null); } })
            .catch(e => { if (vivo) setErrorCarga(e?.message || 'No se pudieron cargar los datos'); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [recarga]);

    const existente = useMemo(() => registros.find(r => r.fecha === fecha) || null, [registros, fecha]);
    const ultimo = useMemo(() => [...registros].filter(r => r.fecha < fecha).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] || null, [registros, fecha]);

    // Al cambiar la fecha (o al terminar de cargar): si ya hay cierre se carga para editar; si no, formulario nuevo
    // con las personas del último cierre y la meta de la tabla
    useEffect(() => {
        if (cargando) return;
        if (existente) {
            setC({
                ms: txt(existente.moldes_ms), fv: txt(existente.moldes_fv), rtm: txt(existente.moldes_rtm),
                brillados: txt(existente.moldes_brillados), desmanchados: txt(existente.moldes_desmanchados),
                esperados: txt(existente.moldes_esperados), entregados: txt(existente.moldes_entregados),
                personas: txt(existente.personas), meta: txt(existente.meta)
            });
            setMetaManual(true);
            setObservaciones(existente.observaciones || '');
            setParosForm(paros.filter(p => p.fecha === fecha).map(p => ({ familia: p.familia, causa: p.causa, minutos: txt(p.minutos), observacion: p.observacion || '', tipo: p.tipo })));
        } else {
            const personas = ultimo?.personas ? String(ultimo.personas) : '';
            setC({ ...VACIO, personas, meta: txt(metaParaPersonas(metas, Number(personas))) });
            setMetaManual(false);
            setObservaciones('');
            setParosForm([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, cargando, existente]);

    useEffect(() => { setMensaje(null); }, [fecha]);

    const metaSugerida = metaParaPersonas(metas, valor(c.personas));
    const cambiar = (k: keyof Campos, v: string) => {
        setC(prev => {
            const nuevo = { ...prev, [k]: v };
            // La meta sigue a las personas mientras no se haya escrito a mano
            if (k === 'personas' && !metaManual) nuevo.meta = txt(metaParaPersonas(metas, valor(v)));
            return nuevo;
        });
        if (k === 'meta') setMetaManual(true);
    };

    const calculo = calcularDia({
        moldes_ms: valor(c.ms), moldes_fv: valor(c.fv), moldes_rtm: valor(c.rtm), moldes_brillados: valor(c.brillados), moldes_desmanchados: valor(c.desmanchados),
        moldes_esperados: valorONulo(c.esperados), moldes_entregados: valorONulo(c.entregados), nivel_servicio: null,
        personas: valor(c.personas), meta: valor(c.meta)
    });
    const minutosRegistrados = parosForm.reduce((a, p) => a + valor(p.minutos), 0);
    const porExplicar = Math.max(0, calculo.parosReflejados) - minutosRegistrados;

    const causasConocidas = useMemo(() => [...new Set([...CAUSAS_PARO_BASE, ...paros.map(p => p.causa)])].sort(), [paros]);

    const faltantes = [
        !fecha && 'fecha',
        !(valor(c.personas) > 0) && 'personas',
        !(valor(c.meta) > 0) && 'meta',
        c.esperados.trim() === '' && 'moldes esperados',
        c.entregados.trim() === '' && 'moldes entregados',
        parosForm.some(p => !p.causa.trim() || !(valor(p.minutos) > 0)) && 'causa y minutos de cada paro'
    ].filter(Boolean) as string[];

    const guardar = async () => {
        if (faltantes.length) return;
        setGuardando(true);
        setMensaje(null);
        try {
            const { data } = await supabase.auth.getUser();
            const usuario = data?.user?.email || '';
            await guardarCierreRmold(supabase, {
                id: existente?.id,
                fecha,
                moldes_ms: valor(c.ms), moldes_fv: valor(c.fv), moldes_rtm: valor(c.rtm),
                moldes_brillados: valor(c.brillados), moldes_desmanchados: valor(c.desmanchados),
                moldes_esperados: valorONulo(c.esperados), moldes_entregados: valorONulo(c.entregados),
                // Con esperados y entregados el NS se calcula; el valor digitado del histórico ya no aplica
                nivel_servicio: null,
                personas: valor(c.personas), meta: valor(c.meta),
                tiempo_operacion_min: existente?.tiempo_operacion_min || TIEMPO_OPERACION_MIN,
                observaciones: observaciones.trim() || null
            }, parosForm.map(p => ({
                fecha, familia: p.familia, causa: p.causa.trim().toUpperCase(), minutos: valor(p.minutos), observacion: p.observacion.trim() || null, tipo: p.tipo
            })), usuario);
            setMensaje({ ok: true, texto: `Cierre del ${fechaLarga(fecha)} guardado.` });
            setRecarga(n => n + 1);
        } catch (e: any) {
            setMensaje({ ok: false, texto: e?.message || 'No se pudo guardar el cierre' });
        } finally {
            setGuardando(false);
        }
    };

    const recientes = useMemo(() => [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12), [registros]);
    const numero = (k: keyof Campos, label: string, ayuda?: string) => (
        <div>
            <label className={etiqueta} title={ayuda}>{label}</label>
            <input type="number" inputMode="decimal" min={0} step="any" value={c[k]} onChange={e => cambiar(k, e.target.value)} placeholder="0" className={campo} />
        </div>
    );

    if (cargando && !registros.length) {
        return <div className="flex items-center justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Formulario */}
            <section className={`lg:col-span-8 bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border ${existente ? 'border-amber-400 ring-4 ring-amber-100' : 'border-[#e2ded5]'} space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">RMOLD · Reparación de Moldes</span>
                        <h2 className="text-lg font-black text-[#324354] mt-1.5">Cierre del día</h2>
                        <p className="text-xs text-slate-500 capitalize">{fechaLarga(fecha)}</p>
                    </div>
                    <div className="flex items-end gap-2">
                        {existente && (
                            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 rounded-md px-2 py-1" title={existente.origen === 'excel' ? 'Dato cargado del Excel' : `Registrado por ${existente.actualizado_por || existente.creado_por || '—'}`}>
                                Modo edición{existente.origen === 'excel' ? ' · Excel' : ''}
                            </span>
                        )}
                        <div>
                            <label className={etiqueta}>Fecha</label>
                            <input type="date" value={fecha} max={hoyBogota()} onChange={e => setFecha(e.target.value)} className={`${campo} w-40`} />
                        </div>
                    </div>
                </div>

                {errorCarga && (
                    <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {errorCarga}</p>
                )}

                {/* 1. Moldes reparados */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">1. Moldes reparados</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {numero('ms', 'Mármol (MS)')}
                        {numero('fv', 'Fibra (FV)')}
                        {numero('rtm', 'RTM')}
                        {numero('brillados', 'Brillados', 'Cada molde brillado cuenta como ½ molde reparado')}
                        {numero('desmanchados', 'Desmanchados', 'Cada molde desmanchado cuenta como ⅓ de molde reparado')}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Total = MS + FV + RTM + Brillados ÷ 2 + Desmanchados ÷ 3</p>
                </div>

                {/* 2. Nivel de servicio */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">2. Nivel de servicio</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {numero('esperados', 'Moldes esperados', 'Moldes que producción esperaba recibir hoy')}
                        {numero('entregados', 'Moldes entregados', 'Moldes que se entregaron a producción hoy')}
                    </div>
                </div>

                {/* 3. Personal y meta */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2 flex items-center gap-2">
                        3. Personal y meta
                        <button type="button" onClick={() => setConfigurando(true)} className="ml-1 px-2 py-0.5 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1">
                            <Settings2 className="w-3.5 h-3.5" /> Configurar meta
                        </button>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {numero('personas', 'Personas (FTE)')}
                        <div>
                            <label className={etiqueta}>Meta (moldes/día)</label>
                            <input type="number" inputMode="decimal" min={0} step="any" value={c.meta} onChange={e => cambiar('meta', e.target.value)} placeholder="0" className={campo} />
                            {metaSugerida != null && valor(c.meta) !== metaSugerida && (
                                <button type="button" onClick={() => { setC(p => ({ ...p, meta: String(metaSugerida) })); setMetaManual(false); }} className="text-[10px] font-bold text-sky-700 hover:underline mt-0.5">
                                    Usar la de la tabla: {metaSugerida}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Paros */}
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-sm font-black text-[#324354]">4. Paros</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${porExplicar > 0.5 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
                            title={`Paros reflejados = (Meta − Total) × ${MINUTOS_POR_MOLDE} min`}>
                            Reflejados {dec(Math.max(0, calculo.parosReflejados), 0)} min · registrados {dec(minutosRegistrados, 0)} min
                            {porExplicar > 0.5 ? ` · faltan ${dec(porExplicar, 0)} min por explicar` : ''}
                        </span>
                    </div>
                    <datalist id="causas-rmold">{causasConocidas.map(x => <option key={x} value={x} />)}</datalist>
                    <div className="space-y-2">
                        {parosForm.map((p, i) => {
                            const set = (k: keyof ParoForm, v: string) => setParosForm(prev => prev.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                            return (
                                <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2">
                                    <div className="col-span-2 sm:col-span-3">
                                        <label className={etiqueta}>Causa</label>
                                        <input list="causas-rmold" value={p.causa} onChange={e => set('causa', e.target.value)} placeholder="Ej. Ausentismos" className={campo} />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className={etiqueta}>Familia</label>
                                        <select value={p.familia} onChange={e => set('familia', e.target.value)} className={campo}>
                                            {FAMILIAS_PARO.filter(f => f !== 'SIN CLASIFICAR').map(f => <option key={f} value={f}>{NOMBRE_FAMILIA[f]}</option>)}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={etiqueta}>Minutos</label>
                                        <input type="number" inputMode="decimal" min={0} step="any" value={p.minutos} onChange={e => set('minutos', e.target.value)} placeholder="0" className={campo} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={etiqueta}>Tipo</label>
                                        <select value={p.tipo} onChange={e => set('tipo', e.target.value)} className={campo} title="Reflejado: explica la diferencia contra la meta. Real: tiempo medido.">
                                            <option value="REFLEJADO">Reflejado</option>
                                            <option value="REAL">Real</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-11 sm:order-last">
                                        <input value={p.observacion} onChange={e => set('observacion', e.target.value)} placeholder="Observación (ej. 2 personas en CEFI)" className={`${campo} font-medium`} />
                                    </div>
                                    <button type="button" onClick={() => setParosForm(prev => prev.filter((_, j) => j !== i))} className="sm:col-span-2 h-9 flex items-center justify-center gap-1 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50" title="Quitar paro">
                                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                                    </button>
                                </div>
                            );
                        })}
                        <button type="button" onClick={() => setParosForm(prev => [...prev, paroNuevo()])} className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-[#324354] hover:text-[#324354] flex items-center justify-center gap-1.5">
                            <Plus className="w-4 h-4" /> Agregar paro
                        </button>
                    </div>
                </div>

                {/* 5. Observaciones */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">5. Observaciones <span className="text-[10px] font-bold text-slate-400">(opcional)</span></h3>
                    <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className={`${campo} font-medium`} placeholder="Novedades del turno" />
                </div>

                <div className="-mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 px-4 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] rounded-b-2xl flex flex-wrap items-center justify-end gap-2">
                    {mensaje && (
                        <span className={`mr-auto text-xs font-bold flex items-center gap-1.5 ${mensaje.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {mensaje.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {mensaje.texto}
                        </span>
                    )}
                    {!mensaje && faltantes.length > 0 && <span className="mr-auto text-[11px] font-bold text-slate-500">Falta: {faltantes.join(', ')}</span>}
                    <button onClick={guardar} disabled={guardando || faltantes.length > 0} className="px-5 py-2 rounded-lg bg-[#324354] hover:bg-[#25323f] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
                        {guardando && <Loader2 className="w-4 h-4 animate-spin" />} {existente ? 'Guardar cambios' : 'Guardar cierre'}
                    </button>
                </div>
            </section>

            {/* Resultado en vivo y últimos cierres */}
            <aside className="lg:col-span-4 space-y-3">
                <section className="bg-[#324354] text-white rounded-2xl p-4 shadow-sm space-y-3 lg:sticky lg:top-[100px]">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-white/70">Resultado del día</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { t: 'Moldes reparados', v: dec(calculo.total), d: `meta ${dec(valor(c.meta), 0)}` },
                            { t: 'Productividad', v: calculo.productividad == null ? '—' : `${dec(calculo.productividad)} %`, d: `meta ${META_PRODUCTIVIDAD} %`, cls: semaforo(calculo.productividad, META_PRODUCTIVIDAD) },
                            { t: 'Piezas / persona', v: calculo.pzsPersona == null ? '—' : dec(calculo.pzsPersona), d: `meta ${dec(calculo.metaPzsPersona)}` },
                            { t: 'Productividad / persona', v: calculo.productividadPersona == null ? '—' : `${dec(calculo.productividadPersona)} %`, d: 'meta 100 %', cls: semaforo(calculo.productividadPersona, 100) },
                            { t: 'Nivel de servicio', v: calculo.ns == null ? '—' : `${dec(calculo.ns)} %`, d: `meta ${META_NS} %`, cls: semaforo(calculo.ns, META_NS) },
                            { t: 'Paros reflejados', v: `${dec(calculo.parosReflejados, 0)} min`, d: calculo.parosReflejados < 0 ? 'sobre la meta' : `${MINUTOS_POR_MOLDE} min por molde` }
                        ].map(k => (
                            <div key={k.t} className="bg-white rounded-xl px-2.5 py-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 block truncate">{k.t}</span>
                                <span className={`text-lg font-black leading-tight ${k.cls || 'text-[#324354]'}`}>{k.v}</span>
                                <span className="block text-[9px] font-bold text-slate-400">{k.d}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-white/60 flex items-start gap-1"><Info className="w-3 h-3 shrink-0 mt-px" /> Mismas fórmulas del Excel Productividad Moldes. Los indicadores se ven en Tablero de Control → RMOLD.</p>
                </section>

                <section className="bg-white rounded-2xl p-3 shadow-sm border border-[#e2ded5]">
                    <h3 className="text-xs font-black text-[#324354] mb-1.5">Últimos cierres</h3>
                    <table className="w-full text-[11px]">
                        <thead className="text-[9px] uppercase text-slate-500 border-b border-slate-200">
                            <tr><th className="text-left py-1">Fecha</th><th className="text-right">Moldes</th><th className="text-right">Prod.</th><th className="text-right">NS</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recientes.map(r => {
                                const k = calcularDia(r);
                                return (
                                    <tr key={r.fecha} onClick={() => setFecha(r.fecha)} className={`cursor-pointer hover:bg-slate-50 ${r.fecha === fecha ? 'bg-amber-50' : ''}`} title="Abrir para editar">
                                        <td className="py-1 font-bold text-slate-700">{r.fecha.split('-').reverse().join('/')}</td>
                                        <td className="text-right font-bold">{dec(k.total)}</td>
                                        <td className={`text-right font-black ${semaforo(k.productividad, META_PRODUCTIVIDAD)}`}>{k.productividad == null ? '—' : `${dec(k.productividad, 0)}%`}</td>
                                        <td className={`text-right font-black ${semaforo(k.ns, META_NS)}`}>{k.ns == null ? '—' : `${dec(k.ns, 0)}%`}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!recientes.length && <p className="text-xs text-slate-400 text-center py-4">Aún no hay cierres registrados.</p>}
                </section>
            </aside>

            {configurando && (
                <ConfigurarMetaModal
                    metas={metas}
                    onCerrar={() => setConfigurando(false)}
                    onGuardado={nuevas => { setMetas(nuevas); setConfigurando(false); if (!metaManual) setC(p => ({ ...p, meta: txt(metaParaPersonas(nuevas, valor(p.personas))) })); }}
                />
            )}
        </div>
    );
}

// Tabla personas → meta (moldes por día) que propone el formulario
function ConfigurarMetaModal({ metas, onCerrar, onGuardado }: { metas: MetaPersonas[]; onCerrar: () => void; onGuardado: (m: MetaPersonas[]) => void }) {
    const [filas, setFilas] = useState(metas.map(m => ({ personas: String(m.personas), meta: String(m.meta) })));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onCerrar(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [guardando, onCerrar]);

    const limpias = filas.map(f => ({ personas: Math.round(Number(f.personas)), meta: Number(f.meta) })).filter(f => f.personas > 0 && f.meta >= 0);
    const repetidas = limpias.length !== new Set(limpias.map(f => f.personas)).size;

    const guardar = async () => {
        if (repetidas) return;
        setGuardando(true);
        setError(null);
        try {
            const orden = [...limpias].sort((a, b) => a.personas - b.personas);
            await guardarMetasPersonas(supabase, orden);
            onGuardado(orden);
        } catch (e: any) {
            setError(e?.message || 'No se pudo guardar');
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto" onMouseDown={e => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}>
            <div className="bg-white rounded-2xl border-2 border-[#324354] shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2ded5] flex items-start justify-between">
                    <div>
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">RMOLD</span>
                        <h3 className="text-xl font-black text-[#324354] mt-1.5">Meta según personas</h3>
                        <p className="text-[11px] text-slate-500">El formulario propone esta meta (moldes por día) según las personas del turno.</p>
                    </div>
                    <button onClick={onCerrar} disabled={guardando} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full" title="Cerrar"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <span>Personas</span><span>Meta (moldes/día)</span><span className="w-8" />
                    </div>
                    {filas.map((f, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                            <input type="number" min={1} step={1} value={f.personas} onChange={e => setFilas(p => p.map((x, j) => (j === i ? { ...x, personas: e.target.value } : x)))} className={campo} />
                            <input type="number" min={0} step="any" value={f.meta} onChange={e => setFilas(p => p.map((x, j) => (j === i ? { ...x, meta: e.target.value } : x)))} className={campo} />
                            <button type="button" onClick={() => setFilas(p => p.filter((_, j) => j !== i))} className="w-8 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setFilas(p => [...p, { personas: '', meta: '' }])} className="w-full py-1.5 rounded-lg border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-[#324354] hover:text-[#324354] flex items-center justify-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Agregar fila
                    </button>
                    {repetidas && <p className="text-xs font-bold text-amber-700">Hay un número de personas repetido.</p>}
                    {error && <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
                </div>
                <div className="px-5 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] flex justify-end gap-2">
                    <button onClick={onCerrar} disabled={guardando} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button onClick={guardar} disabled={guardando || repetidas} className="px-4 py-2 rounded-lg bg-[#324354] hover:bg-[#25323f] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
                        {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
