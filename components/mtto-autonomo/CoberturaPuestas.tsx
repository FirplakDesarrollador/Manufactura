'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cobertura, cargarCobertura, coberturaDe, sinTildes } from '@/lib/mantenimiento/coberturaPuestas';

const VERDE = '#59a96a', AMARILLO = '#deb841', ROJO = '#d14747';

// Puestos del Esquema de personal de la planta (nombres distintos, sin supervisión), como segunda referencia
async function puestosEsquema(planta: string): Promise<number | null> {
    const { data: plantas } = await supabase.from('esquema_plantas').select('id, nombre, planta_th').eq('activo', true);
    const p = (plantas || []).find(x => sinTildes(x.nombre) === sinTildes(planta)
        || (x.planta_th || '').split(',').some((t: string) => sinTildes(t) === sinTildes(planta)));
    if (!p) return null;
    const { data } = await supabase.from('esquema_puestos').select('nombre').eq('planta_id', p.id).eq('activo', true).eq('cuenta_fte', true);
    return new Set((data || []).map(x => sinTildes(x.nombre))).size;
}

// Conteo de puestas a punto de la planta frente a las HDT vigentes, por proceso
export default function CoberturaPuestas({ planta }: { planta: string }) {
    const [c, setC] = useState<Cobertura | null>(null);
    const [puestos, setPuestos] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        cargarCobertura().then(t => setC(coberturaDe(t, planta))).catch(e => setError(e instanceof Error ? e.message : String(e)));
        puestosEsquema(planta).then(setPuestos).catch(() => setPuestos(null));
    }, [planta]);

    if (error) return <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">{error}</p>;
    if (!c) return <div className="h-24 rounded-2xl bg-white border border-[#e2ded5] animate-pulse mb-6" />;

    const cubiertas = c.procesos.reduce((s, p) => s + Math.min(p.puestas, p.hdts), 0);
    const faltan = c.procesos.reduce((s, p) => s + Math.max(0, p.hdts - p.puestas), 0);
    const pct = c.hdts ? Math.round((cubiertas / c.hdts) * 100) : 0;
    const color = (p: { puestas: number; hdts: number }) => !p.hdts ? '#7B8E90' : p.puestas >= p.hdts ? VERDE : p.puestas > 0 ? AMARILLO : ROJO;

    return (
        <section className="bg-white rounded-2xl border border-[#e2ded5] p-4 sm:p-5 mb-6 font-[Montserrat,sans-serif]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Dato titulo="Puestas a punto" valor={c.puestas} texto="registradas en esta planta" />
                <Dato titulo="HDT vigentes" valor={c.hdts} texto="labores con hoja de trabajo" />
                <Dato titulo="Deberían existir" valor={Math.max(c.hdts, c.puestas)} texto={faltan ? `faltan ${faltan} puesta(s) a punto` : 'todas las HDT tienen puesta a punto'} color={faltan ? ROJO : VERDE} />
                <Dato titulo="Puestos del esquema" valor={puestos ?? '—'} texto={puestos == null ? 'planta sin esquema de personal' : 'puestos distintos en el esquema de personal'} />
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] font-bold text-[#324354] mb-1">
                    <span>Cobertura frente a las HDT</span><span>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#F6F3EE] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? VERDE : '#324354' }} />
                </div>
            </div>

            <button type="button" onClick={() => setAbierto(!abierto)} className="mt-3 text-[12px] font-bold text-[#324354] hover:underline">
                {abierto ? 'Ocultar detalle por proceso ▴' : 'Ver detalle por proceso ▾'}
            </button>

            {abierto && (
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[12px]">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-left">
                                <th className="py-1.5 px-2">Proceso</th>
                                <th className="py-1.5 px-2 text-center">Puestas a punto</th>
                                <th className="py-1.5 px-2 text-center">HDT vigentes</th>
                                <th className="py-1.5 px-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {c.procesos.map(p => (
                                <tr key={p.clave} className="border-t border-slate-100" title={p.labores.length ? `Labores con HDT: ${p.labores.join(', ')}` : undefined}>
                                    <td className="py-1.5 px-2 font-bold text-[#324354]">
                                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color(p) }} />{p.proceso}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-black text-[#324354]">{p.puestas}</td>
                                    <td className="py-1.5 px-2 text-center text-slate-600">{p.hdts}</td>
                                    <td className="py-1.5 px-2 text-slate-600">
                                        {!p.hdts ? 'Sin HDT vigente en este proceso'
                                            : p.puestas >= p.hdts ? <span className="font-bold" style={{ color: VERDE }}>Completo</span>
                                            : <span className="font-bold" style={{ color: p.puestas ? '#9a7a14' : ROJO }}>Faltan {p.hdts - p.puestas}</span>}
                                    </td>
                                </tr>
                            ))}
                            {!c.procesos.length && <tr><td colSpan={4} className="py-4 text-center text-slate-400">Esta planta no tiene puestas a punto ni HDT vigentes.</td></tr>}
                        </tbody>
                    </table>
                    <p className="mt-2 text-[10px] text-slate-400">Referencia: una puesta a punto por cada HDT vigente (labor) del proceso. Pase el mouse por un proceso para ver sus labores.</p>
                </div>
            )}
        </section>
    );
}

function Dato({ titulo, valor, texto, color }: { titulo: string; valor: number | string; texto: string; color?: string }) {
    return (
        <div className="rounded-xl bg-[#F6F3EE] px-3 py-2.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{titulo}</span>
            <span className="block text-2xl font-black leading-tight" style={{ color: color || '#324354' }}>{valor}</span>
            <span className="block text-[11px] text-slate-500 leading-snug">{texto}</span>
        </div>
    );
}
