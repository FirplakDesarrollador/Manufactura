'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, FileSpreadsheet, Info, Loader2, Plus, RefreshCw, Send, Trash2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    CAUSAS_PARO_MS, DatosAutoMs, FilaAusentismo, FilaParo, InformeMsGuardado, ManualMs, MOTIVOS_AUSENTISMO,
    cargarDatosAutoMs, cargarInformesMs, construirTextoExcelMs, construirTextoMs, guardarInformeMs, manualVacio
} from '@/lib/informe-turno/ms';

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fechaLarga = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const etiqueta = 'text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1';
const campo = 'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] bg-white';

type CampoNumero = Exclude<keyof ManualMs, 'ausentismos' | 'parosPintura' | 'parosVaciado' | 'reflejados'>;
type ListaParos = 'parosPintura' | 'parosVaciado' | 'reflejados';

// Etiqueta de dato que se jala solo (no lo escribe el supervisor)
function Auto({ fuente }: { fuente: string }) {
    return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-sky-800 bg-sky-50 border border-sky-200 rounded px-1.5 py-px" title={`Se toma automáticamente de ${fuente}`}>
            <Zap className="w-2.5 h-2.5" /> {fuente}
        </span>
    );
}

// Texto libre con sugerencias en una lista compacta (la del datalist del navegador es muy espaciada y no se puede ajustar)
function ConSugerencias({ value, onChange, opciones, placeholder }: { value: string; onChange: (v: string) => void; opciones: string[]; placeholder: string }) {
    const [abierto, setAbierto] = useState(false);
    const filtro = value.trim().toLowerCase();
    const visibles = opciones.filter(o => !filtro || o.toLowerCase().includes(filtro));
    return (
        <div className="relative">
            <input
                value={value}
                onChange={e => { onChange(e.target.value); setAbierto(true); }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setTimeout(() => setAbierto(false), 120)}
                onKeyDown={e => { if (e.key === 'Escape') setAbierto(false); }}
                placeholder={placeholder}
                className={`${campo} font-medium pr-7`}
            />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            {abierto && visibles.length > 0 && !(visibles.length === 1 && visibles[0] === value) && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto">
                    {visibles.map(o => (
                        <li key={o}>
                            <button type="button" onMouseDown={e => { e.preventDefault(); onChange(o); setAbierto(false); }} className="w-full text-left px-2.5 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-100 leading-tight">
                                {o}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Dato({ t, v }: { t: string; v: React.ReactNode }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[9px] font-black uppercase text-slate-500 block truncate">{t}</span>
            <span className="text-lg font-black leading-tight text-[#324354]">{v}</span>
        </div>
    );
}

// Informe de Turno → Mármol Sintético: informe final del turno que antes se escribía a mano en WhatsApp
export default function FormularioMs() {
    const [fecha, setFecha] = useState(hoyBogota());
    const [informes, setInformes] = useState<InformeMsGuardado[]>([]);
    const [errorInformes, setErrorInformes] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [auto, setAuto] = useState<DatosAutoMs | null>(null);
    const [cargandoAuto, setCargandoAuto] = useState(true);
    const [errorAuto, setErrorAuto] = useState<string | null>(null);

    const [m, setM] = useState<ManualMs>(manualVacio());
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
    const [copiado, setCopiado] = useState<'whatsapp' | 'excel' | null>(null);

    useEffect(() => {
        let vivo = true;
        cargarInformesMs(supabase)
            .then(d => { if (vivo) { setInformes(d); setErrorInformes(null); } })
            .catch(e => { if (vivo) setErrorInformes(e?.message || 'No se pudieron cargar los informes'); });
        return () => { vivo = false; };
    }, [recarga]);

    const leerAuto = useCallback(async (f: string) => {
        setCargandoAuto(true);
        setErrorAuto(null);
        try {
            setAuto(await cargarDatosAutoMs(supabase, f));
        } catch (e: any) {
            setAuto(null);
            setErrorAuto(e?.message || 'No se pudieron leer los datos de Control de Piso');
        } finally {
            setCargandoAuto(false);
        }
    }, []);

    useEffect(() => { leerAuto(fecha); }, [fecha, leerAuto]);

    const existente = useMemo(() => informes.find(i => i.fecha === fecha) || null, [informes, fecha]);

    // Al cambiar de fecha: si ya hay informe se carga para editar; si no, formulario nuevo
    useEffect(() => {
        setM(existente?.datos?.manual ? { ...manualVacio(), ...existente.datos.manual } : manualVacio());
        setMensaje(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, existente?.id]);

    const texto = useMemo(() => construirTextoMs(fecha, m, auto), [fecha, m, auto]);

    const set = (k: CampoNumero, v: string) => setM(p => ({ ...p, [k]: v }));
    const setAus = (i: number, k: keyof FilaAusentismo, v: string) => setM(p => ({ ...p, ausentismos: p.ausentismos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
    const setParo = (lista: ListaParos, i: number, k: keyof FilaParo, v: string) => setM(p => ({ ...p, [lista]: p[lista].map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
    const quitarParo = (lista: ListaParos, i: number) => setM(p => ({ ...p, [lista]: p[lista].filter((_, j) => j !== i) }));
    const agregarParo = (lista: ListaParos, causa = '') => {
        setM(p => ({ ...p, [lista]: [...p[lista], { minutos: '', causa }] }));
        // Con la causa ya puesta solo falta escribir los minutos
        setTimeout(() => {
            const filas = document.querySelectorAll<HTMLInputElement>(`[data-paros="${lista}"] input[type="number"]`);
            filas[filas.length - 1]?.focus();
        }, 0);
    };

    const numero = (k: CampoNumero, label: string, ayuda?: string, sufijo?: string) => (
        <div>
            <label className={etiqueta} title={ayuda}>{label}{sufijo ? ` (${sufijo})` : ''}</label>
            <input type="number" inputMode="decimal" min={0} step="any" value={m[k]} onChange={e => set(k, e.target.value)} placeholder="0" className={campo} />
        </div>
    );

    // Campo que por defecto muestra el dato de Control de Piso; si se escribe otro valor, manda el escrito
    const conDefecto = (k: CampoNumero, label: string, auto: number | undefined, origen: string) => (
        <div>
            <label className={etiqueta}>{label}</label>
            <input type="number" inputMode="decimal" min={0} step="any" value={m[k].trim() !== '' ? m[k] : auto != null ? String(auto) : ''} onChange={e => set(k, e.target.value)} placeholder="0" className={campo} />
            {m[k].trim() === '' ? (
                <span className="text-[10px] font-bold text-sky-700 mt-0.5 inline-block">= {origen}</span>
            ) : auto != null && Number(m[k]) !== auto && (
                <button type="button" onClick={() => set(k, '')} className="text-[10px] font-bold text-sky-700 hover:underline mt-0.5">
                    Volver a {origen}: {auto}
                </button>
            )}
        </div>
    );

    const listaParos = (lista: ListaParos, titulo: string, minutosOpcional = false) => (
        <div className="space-y-1.5" data-paros={lista}>
            <span className="text-[11px] font-black uppercase text-slate-600">{titulo}</span>
            {m[lista].map((p, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2">
                    <input type="number" inputMode="decimal" min={0} step="any" value={p.minutos} onChange={e => setParo(lista, i, 'minutos', e.target.value)} placeholder={minutosOpcional ? 'min' : '0'} className={campo} title="Minutos" />
                    <ConSugerencias value={p.causa} onChange={v => setParo(lista, i, 'causa', v)} opciones={CAUSAS_PARO_MS} placeholder="Causa (ej. avería en extractor de cabina #2, se apagaba)" />
                    <button type="button" onClick={() => quitarParo(lista, i)} className="w-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                </div>
            ))}
            {/* Paros más comunes: un clic agrega la fila con la causa puesta y el cursor en los minutos */}
            <div className="flex flex-wrap gap-1">
                {CAUSAS_PARO_MS.map(c => (
                    <button key={c} type="button" onClick={() => agregarParo(lista, c)} className="px-2 py-0.5 rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-600 hover:border-[#324354] hover:text-[#324354] flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> {c}
                    </button>
                ))}
                <button type="button" onClick={() => agregarParo(lista)} className="px-2 py-0.5 rounded-full border-2 border-dashed border-slate-300 text-[11px] font-bold text-slate-500 hover:border-[#324354] hover:text-[#324354] flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Otro paro
                </button>
            </div>
        </div>
    );

    const guardar = async () => {
        setGuardando(true);
        setMensaje(null);
        try {
            await guardarInformeMs(supabase, { id: existente?.id, fecha, manual: m, auto, texto });
            setMensaje({ ok: true, texto: `Informe del ${fechaLarga(fecha)} guardado.` });
            setRecarga(n => n + 1);
        } catch (e: any) {
            setMensaje({ ok: false, texto: e?.message || 'No se pudo guardar el informe' });
        } finally {
            setGuardando(false);
        }
    };

    const copiar = async (cual: 'whatsapp' | 'excel') => {
        const contenido = cual === 'excel' ? construirTextoExcelMs(fecha, m, auto) : texto;
        try {
            await navigator.clipboard.writeText(contenido);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = contenido;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopiado(cual);
        setTimeout(() => setCopiado(null), 2500);
    };

    // Guarda y abre WhatsApp con el informe listo para elegir el grupo
    const enviarWhatsapp = async () => {
        const ventana = window.open('', '_blank');
        await guardar();
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        if (ventana) ventana.location.href = url;
        else window.location.href = url;
    };

    const a = auto;
    const cargandoTxt = cargandoAuto ? <Loader2 className="w-4 h-4 animate-spin text-slate-400 inline" /> : '—';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

            {/* Formulario */}
            <section className={`lg:col-span-7 bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border ${existente ? 'border-amber-400 ring-4 ring-amber-100' : 'border-[#e2ded5]'} space-y-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <span className="text-xs font-black uppercase bg-[#324354]/10 text-[#324354] px-2.5 py-1 rounded-md">MS · Mármol Sintético</span>
                        <h2 className="text-lg font-black text-[#324354] mt-1.5">Informe final de turno</h2>
                        <p className="text-xs text-slate-500 capitalize">{fechaLarga(fecha)}</p>
                    </div>
                    <div className="flex items-end gap-2">
                        {existente && (
                            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 rounded-md px-2 py-1" title={`Guardado por ${existente.usuario_email || '—'}`}>
                                Modo edición
                            </span>
                        )}
                        <button type="button" onClick={() => leerAuto(fecha)} disabled={cargandoAuto} className="h-[34px] px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1 disabled:opacity-50" title="Volver a leer Control de Piso y Calidad">
                            <RefreshCw className={`w-3.5 h-3.5 ${cargandoAuto ? 'animate-spin' : ''}`} /> Actualizar
                        </button>
                        <div>
                            <label className={etiqueta}>Fecha</label>
                            <input type="date" value={fecha} max={hoyBogota()} onChange={e => e.target.value && setFecha(e.target.value)} className={`${campo} w-40`} />
                        </div>
                    </div>
                </div>

                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 -mt-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>Los datos con <Auto fuente="Control de Piso" /> o <Auto fuente="Calidad MS" /> se llenan solos. Solo diligencie los campos en blanco.</span>
                </p>

                {errorAuto && (
                    <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {errorAuto}</p>
                )}

                {/* 1. Ausentismos */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">1. Ausentismos <span className="text-xs font-bold text-slate-400">({m.ausentismos.filter(x => x.nombre.trim()).length})</span></h3>
                    <div className="space-y-1.5">
                        {m.ausentismos.map((x, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                <input value={x.nombre} onChange={e => setAus(i, 'nombre', e.target.value)} placeholder="Nombre" className={`${campo} font-medium`} />
                                <ConSugerencias value={x.motivo} onChange={v => setAus(i, 'motivo', v)} opciones={MOTIVOS_AUSENTISMO} placeholder="Motivo" />
                                <button type="button" onClick={() => setM(p => ({ ...p, ausentismos: p.ausentismos.filter((_, j) => j !== i) }))} className="w-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setM(p => ({ ...p, ausentismos: [...p.ausentismos, { nombre: '', motivo: '' }] }))} className="w-full py-1.5 rounded-lg border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-[#324354] hover:text-[#324354] flex items-center justify-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Agregar persona
                        </button>
                    </div>
                </div>

                {/* 2. Producción */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">2. Producción</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                        {numero('programado', 'Programado del día', 'Piezas programadas: se usa en "Pintura 519 de 528", Vaciado y Acabado')}
                    </div>

                    <div className="flex items-center gap-2 mb-1.5"><span className="text-[11px] font-black uppercase text-slate-600">Pintura</span><Auto fuente="Control de Piso" /></div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                        <Dato t="Total" v={a ? a.pintura.total : cargandoTxt} />
                        <Dato t="Línea 1" v={a ? a.pintura.l1 : cargandoTxt} />
                        <Dato t="Línea 2" v={a ? a.pintura.l2 : cargandoTxt} />
                        <Dato t="Línea 3" v={a ? a.pintura.l3 : cargandoTxt} />
                        <div title={a?.coloresDetalle.map(c => `${c.nombre}: ${c.cantidad}`).join('\n') || 'Piezas pintadas que no son blanco, natural ni marfil'}>
                            <Dato t="Colores" v={a ? a.colores : cargandoTxt} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5"><span className="text-[11px] font-black uppercase text-slate-600">Vaciado</span><Auto fuente="Control de Piso" /></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <Dato t="Total" v={a ? a.vaciado.total : cargandoTxt} />
                        <Dato t="Pequeñas" v={a ? a.vaciado.pequenas : cargandoTxt} />
                        <Dato t="Medianas" v={a ? a.vaciado.medianas : cargandoTxt} />
                        <Dato t="Grandes" v={a ? a.vaciado.grandes : cargandoTxt} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5">
                        {numero('cnc', 'Piezas ruteadas CNC')}
                        {numero('adm', 'Piezas vaciadas ADM')}
                        {conDefecto('ultracaster', 'Piezas vaciadas Ultracaster', a?.vaciado.total, 'total de vaciado')}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {numero('acabado', 'Acabado', 'Piezas de acabado del turno (varía respecto a Control de Piso)')}
                        {numero('kilos', 'Kilos vaciados', 'Kilos entregados al CEDI', 'kg')}
                    </div>
                </div>

                {/* 3. Calidad */}
                <div>
                    <div className="flex items-center gap-2 mb-2"><h3 className="text-sm font-black text-[#324354]">3. Calidad</h3><Auto fuente="Calidad MS" /></div>
                    {a?.errorCalidad && (
                        <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Calidad MS: {a.errorCalidad}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <Dato t="Calidad" v={a ? (a.calidad == null ? '—' : `${Math.round(a.calidad)}%`) : cargandoTxt} />
                        <Dato t="Revisadas en inspección" v={a ? a.revisadas : cargandoTxt} />
                    </div>
                    <span className="text-[11px] font-black uppercase text-slate-600">RRC</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1">
                        {(a?.rrc || []).map(d => (
                            <div key={d.nombre} className="flex justify-between text-xs py-1 border-b border-slate-100">
                                <span className="text-slate-600">{d.nombre}</span>
                                <span className={`font-black ${d.cantidad > 0 ? 'text-[#d14747]' : 'text-slate-400'}`}>{d.cantidad}</span>
                            </div>
                        ))}
                    </div>
                    {a && a.otrosDefectos.length > 0 && (
                        <details className="mt-2">
                            <summary className="text-[11px] font-bold text-slate-500 cursor-pointer">Otros defectos registrados ese día ({a.otrosDefectos.length}) · no van en el informe</summary>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1">
                                {a.otrosDefectos.map(d => (
                                    <div key={d.nombre} className="flex justify-between text-[11px] py-0.5 text-slate-500"><span>{d.nombre}</span><span className="font-bold">{d.cantidad}</span></div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>

                {/* 4. Paros */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">4. Paros reales</h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {listaParos('parosPintura', 'Pintura')}
                        {listaParos('parosVaciado', 'Vaciado')}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">5. Paros reflejados</h3>
                    {listaParos('reflejados', 'Reflejados', true)}
                </div>

                {/* 6. Otros */}
                <div>
                    <h3 className="text-sm font-black text-[#324354] mb-2">6. Otros</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-2.5">
                        {numero('reparacion', 'Piezas de reparación')}
                        {conDefecto('desgelcadas', 'Piezas desgelcadas', a?.desgelcadas, 'Control de Piso')}
                        {numero('mesones', 'Mesones')}
                        {numero('mesaTrabajo', 'Mesa de trabajo')}
                        {numero('barras', 'Barras')}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {numero('linea', 'Línea')}
                        {numero('lineaBuffer', 'Línea buffer')}
                        {numero('pulido', 'Pulido')}
                        {numero('automantenimiento', 'Auto mantenimiento', undefined, '%')}
                    </div>
                </div>

                <div className="-mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 px-4 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] rounded-b-2xl flex flex-wrap items-center justify-end gap-2">
                    {mensaje && (
                        <span className={`mr-auto text-xs font-bold flex items-center gap-1.5 ${mensaje.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {mensaje.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {mensaje.texto}
                        </span>
                    )}
                    <button onClick={guardar} disabled={guardando} className="px-5 py-2 rounded-lg bg-[#324354] hover:bg-[#25323f] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
                        {guardando && <Loader2 className="w-4 h-4 animate-spin" />} {existente ? 'Guardar cambios' : 'Guardar informe'}
                    </button>
                </div>
            </section>

            {/* Vista previa del mensaje y últimos informes */}
            <aside className="lg:col-span-5 space-y-3">
                <section className="bg-[#324354] text-white rounded-2xl p-3 shadow-sm space-y-2 lg:sticky lg:top-[100px]">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-white/70">Mensaje para WhatsApp</h3>
                        <div className="flex gap-1.5">
                            <button onClick={() => copiar('excel')} className="px-2.5 py-1.5 rounded-lg bg-white text-[#324354] hover:bg-slate-100 text-xs font-black flex items-center gap-1" title="Copia los datos con los nombres de columna de BD_MS y BD_PAROS para pegarlos en Claude para Excel">
                                {copiado === 'excel' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} {copiado === 'excel' ? 'Copiado' : 'Pasar a Excel'}
                            </button>
                            <button onClick={() => copiar('whatsapp')} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1">
                                {copiado === 'whatsapp' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado === 'whatsapp' ? 'Copiado' : 'Copiar'}
                            </button>
                            <button onClick={enviarWhatsapp} disabled={guardando} className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1fb757] text-[#0b3d1f] text-xs font-black flex items-center gap-1 disabled:opacity-50" title="Guarda el informe y abre WhatsApp para elegir el grupo">
                                <Send className="w-3.5 h-3.5" /> Guardar y enviar
                            </button>
                        </div>
                    </div>
                    <pre className="bg-white text-[#1f2c36] rounded-xl p-3 text-[11.5px] leading-snug whitespace-pre-wrap font-sans max-h-[calc(100vh-190px)] overflow-y-auto">{texto}</pre>
                </section>

                <section className="bg-white rounded-2xl p-3 shadow-sm border border-[#e2ded5]">
                    <h3 className="text-xs font-black text-[#324354] mb-1.5">Últimos informes</h3>
                    {errorInformes ? (
                        <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">{errorInformes}</p>
                    ) : (
                        <>
                            <table className="w-full text-[11px]">
                                <thead className="text-[9px] uppercase text-slate-500 border-b border-slate-200">
                                    <tr><th className="text-left py-1">Fecha</th><th className="text-left">Supervisor</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {informes.slice(0, 12).map(r => (
                                        <tr key={r.id} onClick={() => setFecha(r.fecha)} className={`cursor-pointer hover:bg-slate-50 ${r.fecha === fecha ? 'bg-amber-50' : ''}`} title="Abrir para editar">
                                            <td className="py-1 font-bold text-slate-700">{r.fecha.split('-').reverse().join('/')}</td>
                                            <td className="text-slate-500 truncate max-w-[200px]">{r.usuario_email || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!informes.length && <p className="text-xs text-slate-400 text-center py-4">Aún no hay informes guardados.</p>}
                        </>
                    )}
                </section>
            </aside>
        </div>
    );
}
