'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CostoSku, PLANTAS_MANUALES_SD, TipoSD, guardarEventoSD } from '@/lib/calidad/saldosDestrucciones';

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const etiqueta = 'text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1';
const campo = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-[#324354] outline-none focus:border-[#324354]';

// Formulario para registrar un saldo o una destrucción de las plantas que no lo hacen automático
// (FV, Muebles, CEFI, Cuarzo, RTM). Al elegir el producto del catálogo de costos, el costo se llena solo.
export default function RegistrarSaldoModal({ costos, causasConocidas, onCerrar, onGuardado }: {
    costos: CostoSku[];
    causasConocidas: string[];
    onCerrar: () => void;
    onGuardado: () => void;
}) {
    const [planta, setPlanta] = useState(PLANTAS_MANUALES_SD[0].codigo);
    const [tipo, setTipo] = useState<TipoSD>('saldo');
    const [fecha, setFecha] = useState(hoyBogota());
    const [busqueda, setBusqueda] = useState('');
    const [sku, setSku] = useState('');
    const [referencia, setReferencia] = useState('');
    const [causa, setCausa] = useState('');
    const [responsable, setResponsable] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const [unitario, setUnitario] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Coincidencias del catálogo por SKU o descripción (todas las palabras escritas)
    const sugerencias = useMemo(() => {
        const palabras = busqueda.trim().toUpperCase().split(/\s+/).filter(Boolean);
        if (!palabras.length || referencia) return [];
        return costos.filter(c => palabras.every(p => c.descripcion.includes(p) || c.sku.includes(p))).slice(0, 8);
    }, [busqueda, costos, referencia]);

    const elegir = (c: CostoSku) => {
        setSku(c.sku);
        setReferencia(c.descripcion);
        setUnitario(String(Math.round(c.costo)));
        setBusqueda('');
    };
    const quitarProducto = () => { setSku(''); setReferencia(''); setUnitario(''); };

    const nCantidad = Math.max(0, Math.floor(Number(cantidad) || 0));
    const nUnitario = Math.max(0, Number(unitario) || 0);
    const total = nCantidad * nUnitario;
    const refFinal = (referencia || busqueda).trim();
    const valido = !!fecha && !!refFinal && !!causa.trim() && nCantidad > 0;

    const guardar = async () => {
        if (!valido) return;
        setGuardando(true);
        setError(null);
        try {
            const { data } = await supabase.auth.getUser();
            await guardarEventoSD(supabase, {
                fecha,
                tipo,
                planta,
                sku,
                referencia: refFinal.toUpperCase(),
                causa: causa.trim().toUpperCase(),
                responsable: responsable.trim().toUpperCase() || planta,
                cantidad: nCantidad,
                costo: Math.round(total),
                creado_por: data?.user?.email || ''
            });
            onGuardado();
        } catch (e: any) {
            setError(e?.message?.includes('calidad_saldos_destrucciones')
                ? 'Falta crear la tabla en la base (calidad_saldos_destrucciones.sql).'
                : e?.message || 'No se pudo guardar el evento');
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/60" onMouseDown={e => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e2ded5] overflow-hidden max-h-[92dvh] flex flex-col">
                <div className="px-5 py-4 border-b border-[#e2ded5] flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-[#324354]">Registrar saldo o destrucción</h3>
                        <p className="text-[11px] text-slate-500">Mármol Sintético llega automático desde Calidad MS → Saldos.</p>
                    </div>
                    <button onClick={onCerrar} disabled={guardando} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-3 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiqueta}>Planta</label>
                            <select value={planta} onChange={e => setPlanta(e.target.value)} className={campo}>
                                {PLANTAS_MANUALES_SD.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={etiqueta}>Fecha</label>
                            <input type="date" value={fecha} max={hoyBogota()} onChange={e => setFecha(e.target.value)} className={campo} />
                        </div>
                    </div>

                    <div>
                        <label className={etiqueta}>Tipo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {([['saldo', 'Saldo', 'bg-emerald-600 border-emerald-600'], ['destruccion', 'Destrucción', 'bg-red-600 border-red-600']] as const).map(([t, txt, activo]) => (
                                <button key={t} type="button" onClick={() => setTipo(t)} className={`py-2 rounded-lg border text-sm font-black ${tipo === t ? `${activo} text-white` : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                    {txt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={etiqueta}>Producto (SKU o descripción)</label>
                        {referencia ? (
                            <div className="flex items-start gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-[#324354] leading-snug">{referencia}</p>
                                    {sku && <p className="text-[10px] font-mono text-slate-500">{sku}</p>}
                                </div>
                                <button type="button" onClick={quitarProducto} className="p-1 text-slate-400 hover:text-slate-700" title="Cambiar producto"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Ej. bañera, mueble macao, VQUA02…" className={`${campo} pl-9`} />
                                {sugerencias.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-slate-300 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                        {sugerencias.map(c => (
                                            <button key={c.sku} type="button" onClick={() => elegir(c)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 border-b border-slate-100 last:border-0">
                                                <p className="text-[11px] font-bold text-[#324354] leading-snug">{c.descripcion}</p>
                                                <p className="text-[10px] text-slate-500"><span className="font-mono">{c.sku}</span> · {pesos(c.costo)}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {busqueda.trim() && !sugerencias.length && (
                                    <p className="text-[10px] text-slate-400 mt-1">No está en el catálogo de costos: se guardará con este nombre y el costo que digites.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={etiqueta}>Causa</label>
                        <input list="causas-sd" value={causa} onChange={e => setCausa(e.target.value)} placeholder="Ej. Rajada al desmoldar" className={campo} />
                        <datalist id="causas-sd">{causasConocidas.map(c => <option key={c} value={c} />)}</datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiqueta}>Cantidad (pzs)</label>
                            <input type="number" inputMode="numeric" min={1} step={1} value={cantidad} onChange={e => setCantidad(e.target.value)} className={campo} />
                        </div>
                        <div>
                            <label className={etiqueta}>Costo unitario ($)</label>
                            <input type="number" inputMode="numeric" min={0} step={1} value={unitario} onChange={e => setUnitario(e.target.value)} placeholder="0" className={campo} />
                        </div>
                    </div>

                    <div>
                        <label className={etiqueta}>Responsable / área (opcional)</label>
                        <input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Ej. Laminación, Acabado, Proveedor" className={campo} />
                    </div>

                    <div className={`rounded-lg px-3 py-2 flex items-center justify-between border ${tipo === 'saldo' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                        <span className="text-[11px] font-black uppercase tracking-wider">Costo total</span>
                        <span className="text-lg font-black">{pesos(total)}</span>
                    </div>

                    {error && <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
                </div>

                <div className="px-5 py-3 bg-[#F6F3EE] border-t border-[#e2ded5] flex justify-end gap-2">
                    <button onClick={onCerrar} disabled={guardando} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button onClick={guardar} disabled={!valido || guardando} className="px-4 py-2 rounded-lg bg-[#324354] hover:bg-[#324354]/90 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
                        {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
