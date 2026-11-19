'use client';

import { useEffect, useState } from 'react';
import { Cobertura, cargarCobertura, coberturaDe, indicadorCobertura } from '@/lib/mantenimiento/coberturaPuestas';

const VERDE = '#59a96a', ROJO = '#d14747';

// Conteo de puestas a punto de la planta frente a las HDT vigentes, por proceso
export default function CoberturaPuestas({ planta }: { planta: string }) {
    const [c, setC] = useState<Cobertura | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        cargarCobertura().then(t => setC(coberturaDe(t, planta))).catch(e => setError(e instanceof Error ? e.message : String(e)));
    }, [planta]);

    if (error) return <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">{error}</p>;
    if (!c) return <div className="h-24 rounded-2xl bg-white border border-[#e2ded5] animate-pulse mb-6" />;

    const { requeridos, cubiertos, faltan, pct } = indicadorCobertura(c);
    const color = (p: { puestas: number; hdts: number }) => !p.hdts ? '#7B8E90' : p.puestas > 0 ? VERDE : ROJO;

    return (
        <section className="bg-white rounded-2xl border border-[#e2ded5] p-4 sm:p-5 mb-6 font-[Montserrat,sans-serif]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Dato titulo="Puestas a punto" valor={c.puestas} texto="registradas en esta planta" />
                <Dato titulo="Procesos con HDT" valor={requeridos} texto={`deben tener mínimo 1 puesta a punto (${c.hdts} HDT vigentes)`} />
                <Dato titulo="Procesos cubiertos" valor={`${cubiertos} / ${requeridos}`} texto={faltan ? `faltan ${faltan} proceso(s) sin puesta a punto` : 'todos los procesos tienen puesta a punto'} color={faltan ? ROJO : VERDE} />
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] font-bold text-[#324354] mb-1">
                    <span>Procesos con puesta a punto</span><span>{pct}%</span>
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
                                            : p.puestas > 0 ? <span className="font-bold" style={{ color: VERDE }}>Cumple</span>
                                            : <span className="font-bold" style={{ color: ROJO }}>Falta 1</span>}
                                    </td>
                                </tr>
                            ))}
                            {!c.procesos.length && <tr><td colSpan={4} className="py-4 text-center text-slate-400">Esta planta no tiene puestas a punto ni HDT vigentes.</td></tr>}
                        </tbody>
                    </table>
                    <p className="mt-2 text-[10px] text-slate-400">Regla: cada proceso con HDT vigente debe tener mínimo 1 puesta a punto (no una por cada HDT). Pase el mouse por un proceso para ver sus labores.</p>
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
