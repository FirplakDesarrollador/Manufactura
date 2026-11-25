'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MaquinaSelect, { MaquinaCatalogo, maquinaPorNombre, useMaquinasCatalogo } from './MaquinaSelect';

// Relaciona los equipos de una puesta a punto con el listado de máquinas del Gestor de Mantenimiento.
// Sugiere la máquina más parecida (misma planta, palabras en común) y al guardar deja en el formato el
// nombre del listado y su id_maquina. Solo actualiza filas; no borra nada.

const norm = (s: string | null | undefined) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'para', 'en', 'con', 'a', 'al', 'e', 'o']);
const palabras = (s: string) => norm(s).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !VACIAS.has(w))
    .map(w => w.replace(/(es|s)$/, '')); // singular simple: "prensas" → "prensa"

function sugerir(equipo: string, planta: string, proceso: string, catalogo: MaquinaCatalogo[]): MaquinaCatalogo | null {
    const exacta = maquinaPorNombre(catalogo, equipo);
    if (exacta) return exacta;
    const pe = palabras(equipo);
    if (!pe.length) return null;
    const pPlanta = palabras(planta)[0] || '';
    const pProc = palabras(proceso)[0] || '';
    let mejor: { m: MaquinaCatalogo; score: number } | null = null;
    for (const m of catalogo) {
        if (pPlanta && m.planta && !norm(m.planta).includes(pPlanta)) continue;
        const pm = new Set(palabras(`${m.nombre_equipo} ${m.codigo_equipo || ''}`));
        const comunes = pe.filter(w => pm.has(w)).length;
        if (!comunes) continue;
        let score = comunes / pe.length;
        if (pProc && norm(m.proceso).includes(pProc)) score += 0.25;
        if (!mejor || score > mejor.score) mejor = { m, score };
    }
    return mejor && mejor.score >= 0.5 ? mejor.m : null;
}

type Fila = { equipo: string; id_maquina: number | null };

export default function RelacionarMaquinas({ idPuesta, planta, proceso, equipos }: { idPuesta: string; planta: string; proceso: string; equipos: Fila[] }) {
    const router = useRouter();
    const catalogo = useMaquinasCatalogo();
    const [abierto, setAbierto] = useState(false);
    const [eleccion, setEleccion] = useState<Record<string, { nombre: string; id_maquina: number | null }>>({});
    const [guardando, setGuardando] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

    // Equipos que aún no están unidos a una máquina (ni por id ni por nombre exacto del listado)
    const pendientes = useMemo(() => equipos.filter(e => !e.id_maquina && !maquinaPorNombre(catalogo.maquinas, e.equipo)), [equipos, catalogo.maquinas]);

    useEffect(() => {
        if (catalogo.loading) return;
        const ini: typeof eleccion = {};
        for (const e of pendientes) {
            const s = sugerir(e.equipo, planta, proceso, catalogo.maquinas);
            ini[e.equipo] = s ? { nombre: s.nombre_equipo, id_maquina: s.id } : { nombre: '', id_maquina: null };
        }
        setEleccion(ini);
    }, [catalogo.loading, catalogo.maquinas, pendientes, planta, proceso]);

    if (catalogo.loading || catalogo.error || !pendientes.length) return null;

    const listos = pendientes.filter(e => eleccion[e.equipo]?.id_maquina);

    const guardar = async () => {
        setGuardando(true); setMsg(null);
        try {
            for (const e of listos) {
                const m = eleccion[e.equipo]!;
                const base = { equipo_herramienta: m.nombre, actualizado_en: new Date().toISOString() };
                let { error } = await supabase.from('puestas_a_punto_detalle').update({ ...base, id_maquina: m.id_maquina })
                    .eq('id_puesta_a_punto', idPuesta).eq('equipo_herramienta', e.equipo);
                // Si la columna id_maquina aún no existe, se relaciona por el nombre exacto del listado
                if (error && /id_maquina/.test(error.message)) {
                    ({ error } = await supabase.from('puestas_a_punto_detalle').update(base)
                        .eq('id_puesta_a_punto', idPuesta).eq('equipo_herramienta', e.equipo));
                }
                if (error) throw error;
            }
            setMsg({ ok: true, t: `${listos.length} equipo(s) relacionados con el listado de máquinas.` });
            router.refresh();
        } catch (err) {
            setMsg({ ok: false, t: err instanceof Error ? err.message : String(err) });
        } finally { setGuardando(false); }
    };

    return (
        <div style={{ background: '#F6F3EE', border: '1px solid #e2ded5', borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#324354' }}>
                    {pendientes.length} equipo(s) de este formato no están relacionados con el listado de máquinas.
                </span>
                <button type="button" onClick={() => setAbierto(!abierto)}
                    style={{ padding: '0.45rem 0.9rem', background: '#324354', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    {abierto ? 'Cerrar' : 'Relacionar máquinas'}
                </button>
            </div>

            {abierto && (
                <div style={{ marginTop: '0.8rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 0.6rem' }}>
                        Revise la máquina sugerida para cada equipo, cámbiela si no corresponde y guarde. Los equipos sin máquina se dejan como están.
                    </p>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {pendientes.map(e => (
                            <div key={e.equipo} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(220px, 2fr)', gap: '0.6rem', alignItems: 'center', background: 'white', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#324354' }}>{e.equipo}</span>
                                <MaquinaSelect
                                    nombre={eleccion[e.equipo]?.nombre || ''}
                                    idMaquina={eleccion[e.equipo]?.id_maquina ?? null}
                                    catalogo={catalogo}
                                    onChange={v => setEleccion(prev => ({ ...prev, [e.equipo]: v }))}
                                    placeholder="Sin máquina sugerida: seleccione..."
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.8rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                        {msg && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: msg.ok ? '#59a96a' : '#d14747' }}>{msg.t}</span>}
                        <button type="button" disabled={guardando || !listos.length} onClick={guardar}
                            style={{ padding: '0.5rem 1rem', background: listos.length ? '#59a96a' : '#94A3B8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: listos.length ? 'pointer' : 'default' }}>
                            {guardando ? 'Guardando...' : `Guardar ${listos.length} relación(es)`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
