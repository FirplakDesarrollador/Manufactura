'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, History, Loader2, Pencil, Plus, Printer,
    RefreshCw, Search, Star, Trash2, UserPlus, Users
} from 'lucide-react';
import EditorCelda, { BuscadorPersona } from './EditorCelda';
import MenuCelda from './MenuCelda';
import {
    Asignacion, ContenidoCelda, Empleado, Esquema, Novedad, PlantaEsquema, Puesto, Seccion, Turno,
    cargarEmpleadosPorId, cargarEsquema, crearEstructura, editarEstructura, guardarCelda, guardarNovedad, intercambiarOrden,
    moverCelda, quitarNovedad, resumenEsquema
} from '@/lib/esquema-personal';

const etiqueta = 'text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1';
const campo = 'w-full border border-slate-300 rounded-lg px-2 py-1 text-sm font-bold text-[#324354] outline-none focus:border-[#324354] bg-white';
const clave = (puestoId: number, turnoId: number) => `${puestoId}-${turnoId}`;
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Texto que se guarda al salir del campo (solo si cambió)
function TextoEditable({ valor, onGuardar, className = '', placeholder, numero = false }: {
    valor: string; onGuardar: (v: string) => void; className?: string; placeholder?: string; numero?: boolean;
}) {
    const [v, setV] = useState(valor);
    useEffect(() => { setV(valor); }, [valor]);
    return (
        <input value={v} placeholder={placeholder} type={numero ? 'number' : 'text'} inputMode={numero ? 'decimal' : undefined}
            onChange={e => setV(e.target.value)}
            onBlur={() => { if (v.trim() !== valor.trim()) onGuardar(v.trim()); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setV(valor); (e.target as HTMLInputElement).blur(); } }}
            className={`${campo} ${className}`} />
    );
}

function BotonIcono({ titulo, onClick, children, peligro = false, disabled = false }: { titulo: string; onClick: () => void; children: React.ReactNode; peligro?: boolean; disabled?: boolean }) {
    return (
        <button type="button" title={titulo} onClick={onClick} disabled={disabled}
            className={`p-1 rounded-md disabled:opacity-25 disabled:cursor-not-allowed ${peligro ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:bg-slate-100 hover:text-[#324354]'}`}>
            {children}
        </button>
    );
}

// Indicador en una línea: etiqueta, valor y detalle
function Dato({ t, v, sub, tono = 'normal' }: { t: string; v: React.ReactNode; sub?: string; tono?: 'normal' | 'malo' | 'bueno' }) {
    const color = tono === 'malo' ? 'text-[#d14747]' : tono === 'bueno' ? 'text-emerald-700' : 'text-[#324354]';
    return (
        <div className="flex items-baseline gap-1.5 bg-[#F6F3EE] rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">{t}</span>
            <span className={`text-base font-black leading-none ${color}`}>{v}</span>
            {sub && <span className="text-[10px] text-slate-500 whitespace-nowrap">{sub}</span>}
        </div>
    );
}

// Cada turno tiene su color para distinguirlo en todo el esquema (encabezado, columna, persona)
// Tonos claros derivados del manual de marca (navy #324354, sage #7B8E90, crema #F6F3EE)
const COLORES_TURNO = [
    { base: '#BCCAD8', tinte: '#F2F5F8' },  // azul (navy aclarado)
    { base: '#C6D3CB', tinte: '#F2F5F3' },  // verde sage
    { base: '#E4D5BA', tinte: '#FAF6EF' },  // arena (crema tostado)
    { base: '#C9D1D2', tinte: '#F1F3F3' },  // sage gris
    { base: '#AEBCCB', tinte: '#EFF2F5' },  // navy medio
    { base: '#D3DCCD', tinte: '#F4F6F2' }   // verde claro
];
const colorTurno = (i: number) => COLORES_TURNO[(i < 0 ? 0 : i) % COLORES_TURNO.length];

type Arrastre ={ tipo: 'celda'; a: Asignacion } | { tipo: 'empleado'; e: Empleado };

export default function EsquemaPlanta({ planta, editor, email, empleados, errorEmpleados, onPlantaCambio }: {
    planta: PlantaEsquema;
    editor: boolean;
    email?: string;
    empleados: Empleado[];
    errorEmpleados: string | null;
    onPlantaCambio: () => void;
}) {
    const [esq, setEsq] = useState<Esquema | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [recarga, setRecarga] = useState(0);
    const [estructura, setEstructura] = useState(false);
    const [celdaAbierta, setCeldaAbierta] = useState<{ puesto: Puesto; turno: Turno } | null>(null);
    const [menu, setMenu] = useState<{ puesto: Puesto; turno: Turno; rect: DOMRect } | null>(null);
    const cerrarMenu = useCallback(() => setMenu(null), []);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
    const [buscar, setBuscar] = useState('');
    const [arrastre, setArrastre] = useState<Arrastre | null>(null);
    const [sobre, setSobre] = useState<string | null>(null);
    const [nuevaNovedad, setNuevaNovedad] = useState(false);

    useEffect(() => {
        let vivo = true;
        setCargando(true);
        cargarEsquema(planta.id)
            .then(d => { if (vivo) { setEsq(d); setError(null); } })
            .catch(e => { if (vivo) setError(e?.message || 'No se pudo cargar el esquema'); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [planta.id, recarga]);

    const recargar = useCallback(() => setRecarga(n => n + 1), []);

    // Ejecuta un cambio, avisa el resultado y vuelve a leer el esquema
    const hacer = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
        setGuardando(true);
        setAviso(null);
        try {
            await fn();
            if (ok) setAviso({ ok: true, texto: ok });
            recargar();
            return true;
        } catch (e) {
            setAviso({ ok: false, texto: (e as Error)?.message || 'No se pudo guardar el cambio' });
            return false;
        } finally {
            setGuardando(false);
        }
    }, [recargar]);

    const celdas = useMemo(() => new Map((esq?.asignaciones || []).map(a => [clave(a.puesto_id, a.turno_id), a])), [esq]);
    const puestoPorId = useMemo(() => new Map((esq?.puestos || []).map(p => [p.id, p])), [esq]);
    const turnoPorId = useMemo(() => new Map((esq?.turnos || []).map(t => [t.id, t])), [esq]);

    // Dónde está cada persona dentro del esquema de esta planta
    const ubicacion = useMemo(() => {
        const m = new Map<number, string>();
        (esq?.asignaciones || []).forEach(a => {
            if (a.empleado_id == null) return;
            const p = puestoPorId.get(a.puesto_id), t = turnoPorId.get(a.turno_id);
            if (p && t) m.set(a.empleado_id, `${p.nombre} · ${t.nombre}`);
        });
        (esq?.novedades || []).forEach(n => { if (n.empleado_id != null && !m.has(n.empleado_id)) m.set(n.empleado_id, `Novedades: ${n.observacion || 'sin observación'}`); });
        return m;
    }, [esq, puestoPorId, turnoPorId]);

    const activosTh = useMemo(() => new Set(empleados.map(e => e.id)), [empleados]);

    // Personas del esquema que no están en la lista de activos: se leen de TH por id (retiradas o inexistentes)
    const [otros, setOtros] = useState<Empleado[]>([]);
    useEffect(() => {
        if (!esq || !empleados.length) return;
        const ids = [...new Set([...esq.asignaciones.map(a => a.empleado_id), ...esq.novedades.map(n => n.empleado_id)])]
            .filter((id): id is number => id != null && !activosTh.has(id));
        cargarEmpleadosPorId(ids).then(setOtros).catch(() => setOtros([]));
    }, [esq, empleados.length, activosTh]);
    const personas = useMemo(() => new Map([...otros, ...empleados].map(e => [e.id, e])), [otros, empleados]);
    const nombreDe = useCallback((id: number | null) => (id == null ? '' : personas.get(id)?.nombre || (empleados.length ? `Id TH ${id}` : 'Cargando…')), [personas, empleados.length]);
    const motivoFuera = useCallback((id: number) => (personas.get(id) ? 'Retirado / inactivo en TH' : 'No existe en TH'), [personas]);
    // Personal de la planta según Talento Humano (planta_th admite varias, separadas por coma)
    const plantasTh = useMemo(() => (planta.planta_th || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean), [planta.planta_th]);
    const personalPlanta = useMemo(() => empleados.filter(e => plantasTh.includes((e.planta || '').trim().toLowerCase())), [empleados, plantasTh]);
    const sinUbicar = useMemo(() => personalPlanta.filter(e => !ubicacion.has(e.id)), [personalPlanta, ubicacion]);
    const fueraDeTh = (id: number | null) => empleados.length > 0 && id != null && !activosTh.has(id);
    const noActivos = useMemo(() => {
        if (!esq || !empleados.length) return [];
        const l: { nombre: string; donde: string }[] = [];
        esq.asignaciones.forEach(a => {
            if (a.estado !== 'ocupado' || a.empleado_id == null || activosTh.has(a.empleado_id)) return;
            l.push({ nombre: nombreDe(a.empleado_id), donde: `${puestoPorId.get(a.puesto_id)?.nombre} · ${turnoPorId.get(a.turno_id)?.nombre} · ${motivoFuera(a.empleado_id)}` });
        });
        esq.novedades.forEach(n => { if (!activosTh.has(n.empleado_id)) l.push({ nombre: nombreDe(n.empleado_id), donde: `Novedades · ${motivoFuera(n.empleado_id)}` }); });
        return l;
    }, [esq, empleados.length, activosTh, puestoPorId, turnoPorId, nombreDe, motivoFuera]);

    const resumen = esq ? resumenEsquema(planta, esq) : null;
    const q = sinTildes(buscar.trim());
    const resaltada = (a?: Asignacion) => !!q && a?.empleado_id != null && sinTildes(nombreDe(a.empleado_id)).includes(q);

    // Secciones con sus puestos (los puestos sin sección van al final)
    const grupos = useMemo(() => {
        if (!esq) return [];
        const g: { seccion: Seccion | null; puestos: Puesto[] }[] = esq.secciones.map(s => ({ seccion: s, puestos: esq.puestos.filter(p => p.seccion_id === s.id) }));
        const sueltos = esq.puestos.filter(p => !esq.secciones.some(s => s.id === p.seccion_id));
        if (sueltos.length) g.push({ seccion: null, puestos: sueltos });
        return g;
    }, [esq]);

    // ---------------- Celdas ----------------
    const guardarContenido = async (c: ContenidoCelda | null) => {
        if (!celdaAbierta) return;
        const actual = celdas.get(clave(celdaAbierta.puesto.id, celdaAbierta.turno.id)) || null;
        const ok = await hacer(() => guardarCelda(planta.id, celdaAbierta.puesto, celdaAbierta.turno, actual, c, email, nombreDe(actual?.empleado_id ?? null)));
        if (ok) setCeldaAbierta(null);
    };

    // Lista desplegable de la celda
    const elegirDelMenu = async (accion: { persona?: Empleado; estado?: 'vacante' | 'vacante_no_activa'; vaciar?: boolean }) => {
        if (!menu) return;
        const { puesto, turno } = menu;
        setMenu(null);
        const actual = celdas.get(clave(puesto.id, turno.id)) || null;
        const nombreActual = nombreDe(actual?.empleado_id ?? null);
        if (accion.persona) {
            const per = accion.persona;
            // Si ya está en otra celda de la planta, se mueve: su celda anterior queda vacía
            const anterior = esq?.asignaciones.find(a => a.empleado_id === per.id && a.estado === 'ocupado' && a.id !== actual?.id);
            const pAnt = anterior && puestoPorId.get(anterior.puesto_id), tAnt = anterior && turnoPorId.get(anterior.turno_id);
            await hacer(async () => {
                if (anterior && pAnt && tAnt) await guardarCelda(planta.id, pAnt, tAnt, anterior, null, email, per.nombre);
                await guardarCelda(planta.id, puesto, turno, actual, { empleado: { id: per.id, nombre: per.nombre }, estado: 'ocupado', nuevo: false, novedad: '' }, email, nombreActual);
            }, anterior && pAnt && tAnt ? `${per.nombre} pasó de ${pAnt.nombre} · ${tAnt.nombre} a ${puesto.nombre} · ${turno.nombre}.` : undefined);
        } else if (accion.estado) {
            await hacer(() => guardarCelda(planta.id, puesto, turno, actual, { empleado: null, estado: accion.estado!, nuevo: false, novedad: '' }, email, nombreActual));
        } else if (accion.vaciar && actual) {
            await hacer(() => guardarCelda(planta.id, puesto, turno, actual, null, email, nombreActual));
        }
    };

    const soltar = async (puesto: Puesto, turno: Turno) => {
        const a = arrastre;
        setArrastre(null);
        setSobre(null);
        if (!a || !editor) return;
        const destino = celdas.get(clave(puesto.id, turno.id)) || null;
        if (a.tipo === 'celda') {
            if (a.a.puesto_id === puesto.id && a.a.turno_id === turno.id) return;
            const p0 = puestoPorId.get(a.a.puesto_id), t0 = turnoPorId.get(a.a.turno_id);
            if (!p0 || !t0) return;
            const n0 = a.a.estado === 'ocupado' ? nombreDe(a.a.empleado_id) : 'Vacante';
            const n1 = destino ? (destino.estado === 'ocupado' ? nombreDe(destino.empleado_id) : 'vacante') : '';
            await hacer(() => moverCelda(planta.id, { a: a.a, puesto: p0, turno: t0, nombre: n0 }, { a: destino, puesto, turno, nombre: n1 }, email),
                destino ? 'Se intercambiaron las dos celdas.' : `${n0} quedó en ${puesto.nombre} · ${turno.nombre}.`);
        } else {
            if (destino?.estado === 'ocupado' && !confirm(`${puesto.nombre} · ${turno.nombre} lo ocupa ${nombreDe(destino.empleado_id)}. ¿Reemplazarlo por ${a.e.nombre}?`)) return;
            await hacer(() => guardarCelda(planta.id, puesto, turno, destino, { empleado: { id: a.e.id, nombre: a.e.nombre }, estado: 'ocupado', nuevo: false, novedad: '' }, email, nombreDe(destino?.empleado_id ?? null)),
                `${a.e.nombre} quedó en ${puesto.nombre} · ${turno.nombre}.`);
        }
    };

    // ---------------- Estructura ----------------
    const mover = (tabla: 'esquema_secciones' | 'esquema_turnos' | 'esquema_puestos', lista: { id: number; orden: number }[], i: number, d: -1 | 1) => {
        const j = i + d;
        if (j < 0 || j >= lista.length) return;
        hacer(() => intercambiarOrden(tabla, lista[i], lista[j]));
    };
    const siguienteOrden = (l: { orden: number }[]) => (l.length ? Math.max(...l.map(x => x.orden)) + 1 : 1);

    const agregarSeccion = () => {
        const nombre = prompt('Nombre de la sección (ej. Óvalo 3):')?.trim();
        if (nombre && esq) hacer(() => crearEstructura(planta.id, 'esquema_secciones', { planta_id: planta.id, nombre, orden: siguienteOrden(esq.secciones) }, email), `Sección ${nombre} creada.`);
    };
    const agregarTurno = () => {
        const nombre = prompt('Nombre del turno (ej. Turno noche):')?.trim();
        if (!nombre || !esq) return;
        const horario = prompt('Horario (ej. L-V 10:00 p.m. - 6:00 a.m.):')?.trim() || null;
        hacer(() => crearEstructura(planta.id, 'esquema_turnos', { planta_id: planta.id, nombre, horario, orden: siguienteOrden(esq.turnos) }, email), `Turno ${nombre} creado.`);
    };
    const agregarPuesto = (seccion: Seccion | null, puestos: Puesto[]) => {
        const nombre = prompt(`Nombre del puesto${seccion ? ` en ${seccion.nombre}` : ''}:`)?.trim();
        if (nombre) hacer(() => crearEstructura(planta.id, 'esquema_puestos', { planta_id: planta.id, seccion_id: seccion?.id ?? null, nombre, orden: siguienteOrden(puestos) }, email), `Puesto ${nombre} creado.`);
    };
    const quitarPuesto = (p: Puesto) => {
        const ocupadas = esq?.asignaciones.filter(a => a.puesto_id === p.id) || [];
        if (!confirm(`¿Quitar el puesto ${p.nombre}?${ocupadas.length ? ` Tiene ${ocupadas.length} celda(s) con personas o vacantes: también se quitan.` : ''}`)) return;
        hacer(async () => {
            for (const a of ocupadas) {
                const t = turnoPorId.get(a.turno_id);
                if (t) await guardarCelda(planta.id, p, t, a, null, email, nombreDe(a.empleado_id));
            }
            await editarEstructura(planta.id, 'esquema_puestos', p.id, { activo: false }, email, `Quitó puesto: ${p.nombre}`);
        }, `Puesto ${p.nombre} quitado.`);
    };
    // Agrega una fila (puesto) justo debajo de otra; reordena la sección para dejarle espacio
    const agregarFila = (p: Puesto, puestos: Puesto[]) => {
        const nombre = prompt('Nombre del puesto de la nueva fila:', p.nombre)?.trim();
        if (!nombre) return;
        const i = puestos.findIndex(x => x.id === p.id);
        hacer(async () => {
            for (let j = puestos.length - 1; j > i; j--) {
                if (puestos[j].orden !== j + 2) await editarEstructura(planta.id, 'esquema_puestos', puestos[j].id, { orden: j + 2 });
            }
            for (let j = 0; j <= i; j++) {
                if (puestos[j].orden !== j + 1) await editarEstructura(planta.id, 'esquema_puestos', puestos[j].id, { orden: j + 1 });
            }
            await crearEstructura(planta.id, 'esquema_puestos', { planta_id: planta.id, seccion_id: p.seccion_id, nombre, critico: p.critico, cuenta_fte: p.cuenta_fte, orden: i + 2 }, email);
        }, `Fila ${nombre} agregada.`);
    };
    // Solo se suprimen filas sin nadie en ningún turno (queda activo = false, no se borra)
    const filaVacia = (p: Puesto) => !esq?.asignaciones.some(a => a.puesto_id === p.id);
    const suprimirFila = (p: Puesto) => {
        if (!filaVacia(p) || !confirm(`¿Suprimir la fila vacía ${p.nombre}?`)) return;
        hacer(() => editarEstructura(planta.id, 'esquema_puestos', p.id, { activo: false }, email, `Suprimió fila vacía: ${p.nombre}`), `Fila ${p.nombre} suprimida.`);
    };
    const quitarSeccion = (s: Seccion, puestos: Puesto[]) => {
        if (puestos.length) { alert(`La sección ${s.nombre} todavía tiene ${puestos.length} puesto(s). Quítelos o páselos a otra sección primero.`); return; }
        if (confirm(`¿Quitar la sección ${s.nombre}?`)) hacer(() => editarEstructura(planta.id, 'esquema_secciones', s.id, { activo: false }, email, `Quitó sección: ${s.nombre}`));
    };
    const quitarTurno = (t: Turno) => {
        const n = esq?.asignaciones.filter(a => a.turno_id === t.id).length || 0;
        if (n) { alert(`El turno ${t.nombre} tiene ${n} celda(s) ocupadas. Muévalas o déjelas vacías primero.`); return; }
        if (confirm(`¿Quitar el turno ${t.nombre}?`)) hacer(() => editarEstructura(planta.id, 'esquema_turnos', t.id, { activo: false }, email, `Quitó turno: ${t.nombre}`));
    };
    const editarPlanta = (cambios: Partial<PlantaEsquema>, detalle: string) =>
        hacer(async () => { await editarEstructura(planta.id, 'esquema_plantas', planta.id, cambios, email, detalle); onPlantaCambio(); });

    // ---------------- Render ----------------
    if (cargando && !esq) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    if (error || !esq || !resumen) {
        return <p className="m-4 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>;
    }

    const colorDe = (t: Turno) => colorTurno(esq.turnos.findIndex(x => x.id === t.id));
    const conteoTurno = (t: Turno) => esq.asignaciones.filter(a => a.turno_id === t.id && a.estado === 'ocupado').length;

    // Celda como en el Excel: una línea, con relleno según el estado
    const celda = (puesto: Puesto, turno: Turno) => {
        const k = clave(puesto.id, turno.id);
        const a = celdas.get(k);
        const arrastrable = editor && !estructura && !!a;
        const relleno = !a ? colorDe(turno).tinte
            : a.estado === 'vacante' ? '#F8C9C9'
            : a.estado === 'vacante_no_activa' ? '#E2E4E8'
            : a.novedad ? '#FBEF8F'
            : a.nuevo ? '#F9D29B'
            : colorDe(turno).tinte;
        const fuera = a?.estado === 'ocupado' && a.empleado_id != null && fueraDeTh(a.empleado_id);
        const nombre = a?.estado === 'ocupado' ? nombreDe(a.empleado_id) : '';
        const titulo = [nombre, a?.nuevo && 'Nuevo', a?.novedad && `Novedad: ${a.novedad}`, fuera && a?.empleado_id != null && motivoFuera(a.empleado_id)].filter(Boolean).join(' · ');
        return (
            <td key={turno.id} className="p-0 border-b border-r border-[#e2ded5]" style={{ background: relleno }}>
                <div
                    draggable={arrastrable}
                    onDragStart={() => a && setArrastre({ tipo: 'celda', a })}
                    onDragEnd={() => { setArrastre(null); setSobre(null); }}
                    onDragOver={e => { if (arrastre && editor) { e.preventDefault(); setSobre(k); } }}
                    onDragLeave={() => setSobre(s => (s === k ? null : s))}
                    onDrop={e => { e.preventDefault(); soltar(puesto, turno); }}
                    onClick={e => editor && !estructura && !guardando && setMenu({ puesto, turno, rect: e.currentTarget.getBoundingClientRect() })}
                    title={titulo || undefined}
                    className={`group h-6 px-2 flex items-center gap-1 text-[12px] leading-none whitespace-nowrap overflow-hidden
                        ${editor && !estructura ? 'cursor-pointer hover:outline hover:outline-1 hover:outline-[#324354] hover:-outline-offset-1' : ''}
                        ${sobre === k ? 'outline outline-2 outline-sky-500 -outline-offset-2' : ''} ${resaltada(a) ? 'outline outline-2 outline-[#324354] -outline-offset-2' : ''}`}>
                    {!a ? (editor && !estructura && <Plus className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 print:hidden" />)
                        : a.estado === 'vacante' ? <span className="w-full text-center font-black text-rose-800 text-[11px] uppercase">Vacante</span>
                        : a.estado === 'vacante_no_activa' ? <span className="w-full text-center font-bold text-slate-500 text-[11px]">Vacante no activa</span>
                        : <>
                            <span className={`truncate font-semibold ${fuera ? 'text-rose-700 line-through' : 'text-[#324354]'}`}>{nombre}</span>
                            {a.nuevo && <span className="font-black text-amber-800 shrink-0">(N)</span>}
                            {a.novedad && <span className="text-yellow-800 shrink-0">⚑</span>}
                        </>}
                </div>
            </td>
        );
    };

    return (
        <div className="max-w-[1800px] mx-auto w-full px-3 sm:px-4 py-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-3 print:block print:p-0 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
            <div className="min-w-0 space-y-2">
                {/* Encabezado y resumen */}
                <div className="bg-white rounded-2xl border border-[#e2ded5] p-3 print:border-0 print:p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                            <h2 className="text-lg font-black text-[#324354] leading-tight">{planta.nombre} <span className="text-[11px] font-black text-slate-400">{planta.codigo}</span></h2>
                            {planta.nota && !estructura && <p className="text-xs text-slate-500">{planta.nota}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 print:hidden">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar persona…" className="border border-slate-300 rounded-lg pl-7 pr-2 py-1.5 text-sm w-44 outline-none focus:border-[#324354]" />
                            </div>
                            <button type="button" onClick={recargar} title="Actualizar" className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /></button>
                            <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-black flex items-center gap-1 hover:bg-slate-50"><Printer className="w-4 h-4" /> Imprimir</button>
                            {editor && (
                                <button type="button" onClick={() => setEstructura(v => !v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 ${estructura ? 'bg-[#324354] text-white' : 'border border-[#324354] text-[#324354] hover:bg-[#324354]/5'}`}>
                                    <Pencil className="w-4 h-4" /> {estructura ? 'Terminar edición' : 'Editar estructura'}
                                </button>
                            )}
                        </div>
                    </div>

                    {estructura ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div><label className={etiqueta}>Objetivo FTE</label><TextoEditable numero valor={planta.objetivo_fte == null ? '' : String(planta.objetivo_fte)} onGuardar={v => editarPlanta({ objetivo_fte: v === '' ? null : Number(v) }, `Objetivo FTE: ${planta.objetivo_fte ?? '-'} → ${v || '-'}`)} /></div>
                            <div><label className={etiqueta}>Objetivo piezas día</label><TextoEditable numero valor={planta.objetivo_piezas == null ? '' : String(planta.objetivo_piezas)} onGuardar={v => editarPlanta({ objetivo_piezas: v === '' ? null : Math.round(Number(v)) }, `Objetivo piezas: ${planta.objetivo_piezas ?? '-'} → ${v || '-'}`)} /></div>
                            <div className="col-span-2"><label className={etiqueta}>Nota (presupuesto, comentarios)</label><TextoEditable valor={planta.nota || ''} onGuardar={v => editarPlanta({ nota: v || null }, 'Editó la nota de la planta')} /></div>
                            <div className="col-span-2"><label className={etiqueta}>Nombre de la planta</label><TextoEditable valor={planta.nombre} onGuardar={v => v && editarPlanta({ nombre: v }, `Nombre de la planta: ${v}`)} /></div>
                            <div className="col-span-2"><label className={etiqueta} title="Valor de la columna planta en Talento Humano">Planta en Talento Humano</label><TextoEditable valor={planta.planta_th || ''} placeholder="Ej. Marmol sintetico, Marmol (Calidad)" onGuardar={v => editarPlanta({ planta_th: v || null }, `Planta en TH: ${v || '-'}`)} /></div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            <Dato t="Objetivo FTE" v={resumen.objetivo ?? '—'} sub={planta.objetivo_piezas ? `${planta.objetivo_piezas} piezas` : undefined} />
                            <Dato t="Real" v={resumen.real} sub={`${resumen.enEsquema} + ${resumen.conNovedad} nov.`} />
                            <Dato t="Diferencia" v={resumen.diferencia == null ? '—' : resumen.diferencia > 0 ? `+${resumen.diferencia}` : resumen.diferencia} tono={resumen.diferencia == null ? 'normal' : resumen.diferencia < 0 ? 'malo' : 'bueno'} />
                            <Dato t="Vacantes" v={resumen.vacantes} tono={resumen.vacantes ? 'malo' : 'normal'} />
                            <Dato t="Nuevos" v={resumen.nuevos} />
                            <Dato t="Críticos sin cubrir" v={resumen.criticosSinCubrir} tono={resumen.criticosSinCubrir ? 'malo' : 'normal'} />
                        </div>
                    )}
                </div>

                {aviso && (
                    <p className={`text-xs font-bold rounded-lg px-3 py-1.5 print:hidden ${aviso.ok ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'}`}>{aviso.texto}</p>
                )}
                {editor && !estructura && (
                    <p className="text-[10px] text-slate-500 print:hidden">Clic en una celda para elegir persona o vacante · arrastre para mover · pase el mouse sobre un puesto para <b>+ agregar fila</b> o suprimir una fila vacía.</p>
                )}

                <div className="bg-white rounded-2xl border border-[#e2ded5] overflow-x-auto print:border-0 print:overflow-visible">
                    <table className="w-full border-separate border-spacing-0 text-sm min-w-[640px] table-fixed">
                        <thead>
                            <tr>
                                <th className={`text-left px-2 py-1 text-[11px] font-black uppercase tracking-wider text-white sticky left-0 bg-[#324354] z-10 ${estructura ? 'w-[300px]' : 'w-[190px]'}`}>Puesto</th>
                                {esq.turnos.map((t, i) => (
                                    <th key={t.id} className="text-center px-2 py-1 align-middle text-[#324354] border-l border-white" style={{ background: colorDe(t).base }}>
                                        {estructura ? (
                                            <div className="space-y-1">
                                                <TextoEditable valor={t.nombre} className="!text-xs" onGuardar={v => v && hacer(() => editarEstructura(planta.id, 'esquema_turnos', t.id, { nombre: v }, email, `Turno ${t.nombre} → ${v}`))} />
                                                <TextoEditable valor={t.horario || ''} placeholder="Horario" className="!text-xs !font-medium" onGuardar={v => hacer(() => editarEstructura(planta.id, 'esquema_turnos', t.id, { horario: v || null }, email, `Horario de ${t.nombre}: ${v || '-'}`))} />
                                                <div className="flex gap-0.5 [&_button]:text-[#324354] [&_button:hover]:bg-white/40">
                                                    <BotonIcono titulo="Mover a la izquierda" disabled={i === 0} onClick={() => mover('esquema_turnos', esq.turnos, i, -1)}><ArrowLeft className="w-3.5 h-3.5" /></BotonIcono>
                                                    <BotonIcono titulo="Mover a la derecha" disabled={i === esq.turnos.length - 1} onClick={() => mover('esquema_turnos', esq.turnos, i, 1)}><ArrowRight className="w-3.5 h-3.5" /></BotonIcono>
                                                    <BotonIcono titulo="Quitar turno" onClick={() => quitarTurno(t)}><Trash2 className="w-3.5 h-3.5" /></BotonIcono>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="block text-[11px] font-black uppercase leading-tight">{t.nombre} <span className="font-bold text-[#324354]/70 normal-case">· {conteoTurno(t)}</span></span>
                                                <span className="block text-[10px] font-medium text-[#324354]/80 leading-tight">{t.horario || 'Sin horario'}</span>
                                            </>
                                        )}
                                    </th>
                                ))}
                                {estructura && (
                                    <th className="px-2 py-2 align-top w-[110px]">
                                        <button type="button" onClick={agregarTurno} className="text-[11px] font-black text-[#324354] hover:underline flex items-center gap-1 whitespace-nowrap"><Plus className="w-3.5 h-3.5" /> Turno</button>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {grupos.map(({ seccion, puestos }, gi) => (
                                <React.Fragment key={seccion?.id ?? 'sin'}>
                                    <tr>
                                        <td colSpan={esq.turnos.length + 1 + (estructura ? 1 : 0)} className="px-2 py-0.5 bg-[#e2ded5] text-[#324354]">
                                            {estructura && seccion ? (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <div className="w-56"><TextoEditable valor={seccion.nombre} className="!text-xs" onGuardar={v => v && hacer(() => editarEstructura(planta.id, 'esquema_secciones', seccion.id, { nombre: v }, email, `Sección ${seccion.nombre} → ${v}`))} /></div>
                                                    <BotonIcono titulo="Subir sección" disabled={gi === 0} onClick={() => mover('esquema_secciones', esq.secciones, gi, -1)}><ArrowUp className="w-3.5 h-3.5" /></BotonIcono>
                                                    <BotonIcono titulo="Bajar sección" disabled={gi >= esq.secciones.length - 1} onClick={() => mover('esquema_secciones', esq.secciones, gi, 1)}><ArrowDown className="w-3.5 h-3.5" /></BotonIcono>
                                                    <BotonIcono titulo="Quitar sección" peligro onClick={() => quitarSeccion(seccion, puestos)}><Trash2 className="w-3.5 h-3.5" /></BotonIcono>
                                                    <button type="button" onClick={() => agregarPuesto(seccion, puestos)} className="ml-1 text-[11px] font-black text-[#324354] hover:underline flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" /> Puesto</button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-black uppercase tracking-wider">{seccion?.nombre || 'Sin sección'}</span>
                                            )}
                                        </td>
                                    </tr>
                                    {puestos.map((p, pi) => (
                                        <tr key={p.id} className="group/fila">
                                            <td className={`border-b border-r border-[#e2ded5] sticky left-0 bg-white z-[1] align-middle ${estructura ? 'px-2 py-1' : 'px-2 p-0'}`}>
                                                {estructura ? (
                                                    <div className="space-y-1">
                                                        <TextoEditable valor={p.nombre} className="!text-xs" onGuardar={v => v && hacer(() => editarEstructura(planta.id, 'esquema_puestos', p.id, { nombre: v }, email, `Puesto ${p.nombre} → ${v}`))} />
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <BotonIcono titulo="Subir" disabled={pi === 0} onClick={() => mover('esquema_puestos', puestos, pi, -1)}><ArrowUp className="w-3.5 h-3.5" /></BotonIcono>
                                                            <BotonIcono titulo="Bajar" disabled={pi === puestos.length - 1} onClick={() => mover('esquema_puestos', puestos, pi, 1)}><ArrowDown className="w-3.5 h-3.5" /></BotonIcono>
                                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600" title="Puesto o cargo crítico">
                                                                <input type="checkbox" checked={p.critico} onChange={e => hacer(() => editarEstructura(planta.id, 'esquema_puestos', p.id, { critico: e.target.checked }, email, `${p.nombre}: ${e.target.checked ? 'crítico' : 'no crítico'}`))} className="accent-[#324354]" /> Crítico
                                                            </label>
                                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600" title="Suma al personal real (FTE)">
                                                                <input type="checkbox" checked={p.cuenta_fte} onChange={e => hacer(() => editarEstructura(planta.id, 'esquema_puestos', p.id, { cuenta_fte: e.target.checked }, email, `${p.nombre}: ${e.target.checked ? 'cuenta' : 'no cuenta'} en FTE`))} className="accent-[#324354]" /> FTE
                                                            </label>
                                                            {esq.secciones.length > 1 && (
                                                                <select value={p.seccion_id ?? ''} title="Pasar a otra sección"
                                                                    onChange={e => { const s = esq.secciones.find(x => x.id === Number(e.target.value)); if (s) hacer(() => editarEstructura(planta.id, 'esquema_puestos', p.id, { seccion_id: s.id, orden: siguienteOrden(esq.puestos.filter(x => x.seccion_id === s.id)) }, email, `${p.nombre} pasó a ${s.nombre}`)); }}
                                                                    className="text-[10px] font-bold border border-slate-300 rounded px-1 py-0.5 max-w-[90px]">
                                                                    {!p.seccion_id && <option value="">Sin sección</option>}
                                                                    {esq.secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                                </select>
                                                            )}
                                                            <BotonIcono titulo="Quitar puesto" peligro onClick={() => quitarPuesto(p)}><Trash2 className="w-3.5 h-3.5" /></BotonIcono>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="h-6 flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap overflow-hidden" title={p.nombre}>
                                                        {p.critico && <Star className="w-3 h-3 text-[#d14747] fill-[#d14747] shrink-0" aria-label="Puesto crítico" />}
                                                        <span className="truncate">{p.nombre}</span>
                                                        {!p.cuenta_fte && <span className="text-[9px] font-black text-slate-400 shrink-0" title="No suma al personal real">· no FTE</span>}
                                                        {editor && (
                                                            <span className="ml-auto hidden group-hover/fila:flex items-center gap-0.5 shrink-0 bg-white pl-1 print:!hidden">
                                                                <button type="button" title="Agregar fila debajo" disabled={guardando} onClick={() => agregarFila(p, puestos)} className="p-0.5 rounded text-[#324354] hover:bg-slate-100"><Plus className="w-3.5 h-3.5" /></button>
                                                                {filaVacia(p) && <button type="button" title="Suprimir fila vacía" disabled={guardando} onClick={() => suprimirFila(p)} className="p-0.5 rounded text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                            {esq.turnos.map(t => celda(p, t))}
                                            {estructura && <td className="border-b border-[#e2ded5]" />}
                                        </tr>
                                    ))}
                                    {estructura && !seccion && (
                                        <tr><td colSpan={esq.turnos.length + 2} className="px-2 py-1"><button type="button" onClick={() => agregarPuesto(null, puestos)} className="text-[11px] font-black text-[#324354] hover:underline flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" /> Puesto</button></td></tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {!esq.puestos.length && !estructura && (
                                <tr><td colSpan={esq.turnos.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">Esta planta aún no tiene puestos. {editor ? 'Use “Editar estructura” para crear secciones, turnos y puestos.' : ''}</td></tr>
                            )}
                        </tbody>
                    </table>
                    {estructura && (
                        <div className="flex flex-wrap gap-2 p-2 border-t border-slate-100">
                            <button type="button" onClick={agregarSeccion} className="px-2.5 py-1 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-600 hover:border-[#324354] hover:text-[#324354] flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Sección</button>
                            {!esq.secciones.length && (
                                <button type="button" onClick={() => agregarPuesto(null, esq.puestos)} className="px-2.5 py-1 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-600 hover:border-[#324354] hover:text-[#324354] flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Puesto</button>
                            )}
                            {!esq.turnos.length && (
                                <button type="button" onClick={agregarTurno} className="px-2.5 py-1 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-black text-slate-600 hover:border-[#324354] hover:text-[#324354] flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Turno</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Panel lateral */}
            <aside className="space-y-3 print:mt-4">
                <div className="bg-white rounded-2xl border border-[#e2ded5] p-3">
                    <h3 className="text-xs font-black text-[#324354] uppercase tracking-wider mb-2">Convenciones</h3>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-rose-100 border border-rose-300" /> Vacante</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-slate-200 border border-slate-300" /> Vacante no activa</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-amber-100 border border-amber-300" /> Nuevo (N)</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-yellow-100 border border-yellow-300" /> Novedad</span>
                        <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#d14747] fill-[#d14747]" /> Puesto crítico</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded border border-dashed border-rose-400" /> No activo en TH</span>
                    </div>
                </div>

                {/* Personal con novedades */}
                <div className="bg-white rounded-2xl border border-[#e2ded5] p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-xs font-black text-[#324354] uppercase tracking-wider">Personal con novedades ({esq.novedades.length})</h3>
                        {editor && !nuevaNovedad && <button type="button" onClick={() => setNuevaNovedad(true)} className="text-[11px] font-black text-[#324354] hover:underline flex items-center gap-0.5 print:hidden"><Plus className="w-3.5 h-3.5" /> Agregar</button>}
                    </div>
                    {nuevaNovedad && (
                        <div className="mb-2 p-2 rounded-xl bg-[#F6F3EE] print:hidden">
                            <BuscadorPersona empleados={empleados} plantaTh={planta.planta_th} ubicacion={ubicacion} onElegir={async per => {
                                const obs = prompt(`Observación para ${per.nombre} (ej. Incapacidad larga, Apoyo FV):`) ?? '';
                                const ok = await hacer(() => guardarNovedad(planta.id, { empleado_id: per.id, observacion: obs, cuenta_fte: true }, per.nombre, email), `${per.nombre} agregado a novedades.`);
                                if (ok) setNuevaNovedad(false);
                            }} />
                            <button type="button" onClick={() => setNuevaNovedad(false)} className="mt-1 text-[11px] font-bold text-slate-500 hover:underline">Cancelar</button>
                        </div>
                    )}
                    <div className="divide-y divide-slate-100">
                        {esq.novedades.map(n => <FilaNovedad key={n.id} n={n} nombre={nombreDe(n.empleado_id)} editor={editor} fuera={fueraDeTh(n.empleado_id)}
                            onGuardar={c => hacer(() => guardarNovedad(planta.id, { id: n.id, empleado_id: n.empleado_id, cuenta_fte: c.cuenta_fte ?? n.cuenta_fte, observacion: c.observacion ?? n.observacion ?? '' }, nombreDe(n.empleado_id), email))}
                            onQuitar={() => confirm(`¿Quitar a ${nombreDe(n.empleado_id)} de novedades?`) && hacer(() => quitarNovedad(planta.id, n, nombreDe(n.empleado_id), email))} />)}
                        {!esq.novedades.length && <p className="text-xs text-slate-400 py-2">Sin novedades.</p>}
                    </div>
                </div>

                {/* Activos en TH sin ubicar */}
                <div className="bg-white rounded-2xl border border-[#e2ded5] p-3 print:hidden">
                    <h3 className="text-xs font-black text-[#324354] uppercase tracking-wider mb-1 flex items-center gap-1.5"><UserPlus className="w-4 h-4" /> Sin ubicar ({sinUbicar.length})</h3>
                    <p className="text-[10px] text-slate-500 mb-1.5">Activos en Talento Humano ({planta.planta_th || 'sin planta TH'}) que no están en el esquema.{editor ? ' Arrástrelos a una celda.' : ''}</p>
                    {errorEmpleados && <p className="text-[11px] font-bold text-rose-700">{errorEmpleados}</p>}
                    <div className="max-h-56 overflow-y-auto space-y-1">
                        {sinUbicar.map(e => (
                            <div key={e.id} draggable={editor} onDragStart={() => setArrastre({ tipo: 'empleado', e })} onDragEnd={() => { setArrastre(null); setSobre(null); }}
                                className={`px-2 py-1 rounded-md border border-slate-200 bg-slate-50 ${editor ? 'cursor-grab active:cursor-grabbing hover:border-[#324354]' : ''}`}>
                                <span className="block text-[12px] font-bold text-[#324354] leading-tight">{e.nombre}</span>
                                <span className="block text-[10px] text-slate-500 leading-tight">{e.cargo}</span>
                            </div>
                        ))}
                        {!sinUbicar.length && !errorEmpleados && <p className="text-xs text-slate-400">Todo el personal activo está ubicado.</p>}
                    </div>
                </div>

                {/* Personas del esquema que ya no están activas en TH */}
                {noActivos.length > 0 && (
                    <div className="bg-white rounded-2xl border border-rose-200 p-3 print:hidden">
                        <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="w-4 h-4" /> Revisar en Talento Humano ({noActivos.length})</h3>
                        <p className="text-[10px] text-slate-500 mb-1.5">Están en el esquema pero no aparecen activas en TH (retiro, o nombre sin vincular).</p>
                        <div className="space-y-1">
                            {noActivos.map((x, i) => (
                                <div key={i} className="text-[11px] leading-tight"><span className="font-bold text-[#324354]">{x.nombre}</span><span className="block text-slate-500">{x.donde}</span></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Historial */}
                <details className="bg-white rounded-2xl border border-[#e2ded5] p-3 print:hidden">
                    <summary className="text-xs font-black text-[#324354] uppercase tracking-wider cursor-pointer flex items-center gap-1.5"><History className="w-4 h-4" /> Últimos cambios <ChevronDown className="w-3.5 h-3.5" /></summary>
                    <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                        {esq.historial.map(h => (
                            <div key={h.id} className="text-[11px] leading-tight border-b border-slate-100 pb-1">
                                <span className="text-slate-700">{h.detalle}</span>
                                <span className="block text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })} · {h.usuario_email || '—'}</span>
                            </div>
                        ))}
                        {!esq.historial.length && <p className="text-xs text-slate-400">Sin cambios registrados.</p>}
                    </div>
                </details>
            </aside>

            {menu && (
                <MenuCelda
                    rect={menu.rect}
                    actual={celdas.get(clave(menu.puesto.id, menu.turno.id)) || null}
                    personal={personalPlanta}
                    ubicacion={ubicacion}
                    onPersona={persona => elegirDelMenu({ persona })}
                    onEstado={estado => elegirDelMenu({ estado: estado === 'vacante_no_activa' ? 'vacante_no_activa' : 'vacante' })}
                    onVaciar={() => elegirDelMenu({ vaciar: true })}
                    onDetalle={() => { setCeldaAbierta({ puesto: menu.puesto, turno: menu.turno }); setMenu(null); }}
                    onCerrar={cerrarMenu}
                />
            )}
            {celdaAbierta && (
                <EditorCelda
                    puesto={celdaAbierta.puesto}
                    turno={celdaAbierta.turno}
                    actual={celdas.get(clave(celdaAbierta.puesto.id, celdaAbierta.turno.id)) || null}
                    nombreActual={nombreDe(celdas.get(clave(celdaAbierta.puesto.id, celdaAbierta.turno.id))?.empleado_id ?? null)}
                    empleados={empleados}
                    plantaTh={planta.planta_th}
                    ubicacion={ubicacion}
                    guardando={guardando}
                    onGuardar={guardarContenido}
                    onCerrar={() => setCeldaAbierta(null)}
                />
            )}
        </div>
    );
}

function FilaNovedad({ n, nombre, editor, fuera, onGuardar, onQuitar }: {
    n: Novedad; nombre: string; editor: boolean; fuera: boolean;
    onGuardar: (c: { observacion?: string; cuenta_fte?: boolean }) => void;
    onQuitar: () => void;
}) {
    return (
        <div className="py-1.5">
            <div className="flex items-start justify-between gap-2">
                <span className={`text-[12px] font-bold leading-tight ${fuera ? 'text-rose-700' : 'text-[#324354]'}`}>{nombre}</span>
                {editor && <BotonIcono titulo="Quitar de novedades" peligro onClick={onQuitar}><Trash2 className="w-3.5 h-3.5" /></BotonIcono>}
            </div>
            {editor ? (
                <div className="flex items-center gap-2 mt-0.5">
                    <TextoEditable valor={n.observacion || ''} placeholder="Observación" className="!text-[11px] !font-medium !py-0.5" onGuardar={v => onGuardar({ observacion: v })} />
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 shrink-0" title="Suma al personal real">
                        <input type="checkbox" checked={n.cuenta_fte} onChange={e => onGuardar({ cuenta_fte: e.target.checked })} className="accent-[#324354]" /> FTE
                    </label>
                </div>
            ) : (
                <span className="block text-[11px] text-slate-500 leading-tight">{n.observacion || 'Sin observación'}{!n.cuenta_fte && ' · no suma al real'}</span>
            )}
        </div>
    );
}
