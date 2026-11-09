import { supabase } from '@/lib/supabase';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';

// Esquema de personal de las plantas: la estructura (secciones, turnos, puestos) y quién ocupa cada puesto.
// No hay tabla de personal: las personas se leen siempre de Talento Humano y aquí solo se guarda
// su id de TH y su ubicación. Nombre, cargo y estado (activo/retirado) vienen de TH.
// Nada se borra: quitar = activo false.

export interface PlantaEsquema {
    id: number;
    codigo: string;
    nombre: string;
    planta_th: string | null;
    objetivo_fte: number | null;
    objetivo_piezas: number | null;
    nota: string | null;
    orden: number;
}
export interface Seccion { id: number; planta_id: number; nombre: string; orden: number }
export interface Turno { id: number; planta_id: number; nombre: string; horario: string | null; orden: number }
export interface Puesto { id: number; planta_id: number; seccion_id: number | null; nombre: string; critico: boolean; cuenta_fte: boolean; orden: number }
export type EstadoCelda = 'ocupado' | 'vacante' | 'vacante_no_activa';
export interface Asignacion {
    id: number;
    puesto_id: number;
    turno_id: number;
    empleado_id: number | null;   // id en Talento Humano (null solo en vacantes)
    estado: EstadoCelda;
    nuevo: boolean;
    novedad: string | null;
}
export interface Novedad { id: number; planta_id: number; empleado_id: number; observacion: string | null; cuenta_fte: boolean }
export interface Movimiento { id: number; accion: string; detalle: string | null; usuario_email: string | null; created_at: string }
export interface Empleado { id: number; nombre: string; cargo: string | null; planta: string | null; activo: boolean }

export interface Esquema {
    secciones: Seccion[];
    turnos: Turno[];
    puestos: Puesto[];
    asignaciones: Asignacion[];
    novedades: Novedad[];
    historial: Movimiento[];
}

const FALTA_SQL = 'Falta ejecutar esquema_personal.sql en Supabase';
const errorDe = (e: { message?: string; code?: string } | null) => {
    if (!e) return null;
    if (e.code === '42P01' || /does not exist|schema cache/i.test(e.message || '')) return new Error(FALTA_SQL);
    return new Error(e.message || 'Error en la base de datos');
};

export const limpiarNombre = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Permisos: editan jefes, coordinadores y director (cargo en Talento Humano),
// admin/desarrollador o quien tenga usuarios.permisos.esquema_personal.editar
// ---------------------------------------------------------------------------

const CARGO_EDITOR = /\b(jefe|coordinador|coordinadora|director|directora)\b/i;
const AREAS_EDITORAS = /manufactura|calidad|mantenimiento|marmol|fibra|muebles|cefi|moldes|quarzstone|produccion/i;

export async function puedeEditarEsquema(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    const correo = email.trim().toLowerCase();
    try {
        const { data: u } = await supabase.from('usuarios').select('rol, permisos').ilike('correo', correo).maybeSingle();
        const permiso = (u?.permisos as Record<string, unknown> | null)?.esquema_personal as { editar?: boolean } | boolean | undefined;
        if (u?.rol === 'admin' || u?.rol === 'desarrollador' || permiso === true || (typeof permiso === 'object' && permiso?.editar)) return true;
    } catch { /* sigue con Talento Humano */ }
    try {
        const { data } = await supabaseTH.from('empleados').select('cargo, planta').eq('activo', true).ilike('correo_electronico', correo).limit(1);
        const e = data?.[0];
        return !!e && CARGO_EDITOR.test(e.cargo || '') && AREAS_EDITORAS.test(`${e.planta || ''} ${e.cargo || ''}`);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export async function cargarPlantas(): Promise<PlantaEsquema[]> {
    const { data, error } = await supabase
        .from('esquema_plantas')
        .select('id, codigo, nombre, planta_th, objetivo_fte, objetivo_piezas, nota, orden')
        .eq('activo', true)
        .order('orden')
        .order('nombre');
    if (error) throw errorDe(error);
    return data || [];
}

export async function cargarEsquema(plantaId: number): Promise<Esquema> {
    const [sec, tur, pue, nov, his] = await Promise.all([
        supabase.from('esquema_secciones').select('id, planta_id, nombre, orden').eq('planta_id', plantaId).eq('activo', true).order('orden'),
        supabase.from('esquema_turnos').select('id, planta_id, nombre, horario, orden').eq('planta_id', plantaId).eq('activo', true).order('orden'),
        supabase.from('esquema_puestos').select('id, planta_id, seccion_id, nombre, critico, cuenta_fte, orden').eq('planta_id', plantaId).eq('activo', true).order('orden'),
        supabase.from('esquema_novedades').select('id, planta_id, empleado_id, observacion, cuenta_fte').eq('planta_id', plantaId).eq('activo', true).order('created_at'),
        supabase.from('esquema_historial').select('id, accion, detalle, usuario_email, created_at').eq('planta_id', plantaId).order('created_at', { ascending: false }).limit(30)
    ]);
    for (const r of [sec, tur, pue, nov, his]) if (r.error) throw errorDe(r.error);
    const puestos = pue.data || [];
    let asignaciones: Asignacion[] = [];
    if (puestos.length) {
        const { data, error } = await supabase
            .from('esquema_asignaciones')
            .select('id, puesto_id, turno_id, empleado_id, estado, nuevo, novedad')
            .in('puesto_id', puestos.map(p => p.id))
            .eq('activo', true);
        if (error) throw errorDe(error);
        asignaciones = data || [];
    }
    return { secciones: sec.data || [], turnos: tur.data || [], puestos, asignaciones, novedades: nov.data || [], historial: his.data || [] };
}

// Personal activo de Talento Humano (todas las plantas: hay personas que apoyan otras plantas)
export async function cargarEmpleadosActivos(): Promise<Empleado[]> {
    const { data, error } = await supabaseTH
        .from('empleados')
        .select('id, nombreCompleto, cargo, planta')
        .eq('activo', true)
        .order('nombreCompleto')
        .limit(5000);
    if (error) throw new Error(`Talento Humano: ${error.message}`);
    return (data || []).map(e => ({ id: Number(e.id), nombre: limpiarNombre(e.nombreCompleto), cargo: e.cargo, planta: e.planta, activo: true }));
}

// Personas del esquema que ya no están activas en TH: se leen por id para mostrar su nombre
export async function cargarEmpleadosPorId(ids: number[]): Promise<Empleado[]> {
    if (!ids.length) return [];
    const { data, error } = await supabaseTH.from('empleados').select('id, nombreCompleto, cargo, planta, activo').in('id', ids);
    if (error) throw new Error(`Talento Humano: ${error.message}`);
    return (data || []).map(e => ({ id: Number(e.id), nombre: limpiarNombre(e.nombreCompleto), cargo: e.cargo, planta: e.planta, activo: !!e.activo }));
}

// ---------------------------------------------------------------------------
// Conteos del resumen (mismo criterio del Excel: puestos que cuentan + novedades que cuentan)
// ---------------------------------------------------------------------------

export function resumenEsquema(p: PlantaEsquema, e: Esquema) {
    const cuenta = new Set(e.puestos.filter(x => x.cuenta_fte).map(x => x.id));
    const ocupadas = e.asignaciones.filter(a => a.estado === 'ocupado' && a.empleado_id != null);
    const enEsquema = ocupadas.filter(a => cuenta.has(a.puesto_id)).length;
    const conNovedad = e.novedades.filter(n => n.cuenta_fte).length;
    const real = enEsquema + conNovedad;
    return {
        objetivo: p.objetivo_fte,
        real,
        enEsquema,
        conNovedad,
        diferencia: p.objetivo_fte == null ? null : real - Number(p.objetivo_fte),
        vacantes: e.asignaciones.filter(a => a.estado === 'vacante').length,
        nuevos: ocupadas.filter(a => a.nuevo).length,
        novedadesEnPuesto: ocupadas.filter(a => limpiarNombre(a.novedad) !== '').length,
        criticosSinCubrir: e.puestos.filter(x => x.critico && !e.asignaciones.some(a => a.puesto_id === x.id && a.estado === 'ocupado')).length
    };
}

// ---------------------------------------------------------------------------
// Escritura (siempre deja rastro en el historial)
// ---------------------------------------------------------------------------

async function registrar(plantaId: number, accion: string, detalle: string, email?: string) {
    await supabase.from('esquema_historial').insert({ planta_id: plantaId, accion, detalle, usuario_email: email || null });
}

const ahora = () => new Date().toISOString();

export interface ContenidoCelda {
    empleado: { id: number; nombre: string } | null;   // el nombre solo se usa para el historial
    estado: EstadoCelda;
    nuevo: boolean;
    novedad: string;
}

// Reemplaza lo que haya en la celda (puesto × turno). contenido null = dejar la celda vacía
export async function guardarCelda(plantaId: number, puesto: Puesto, turno: Turno, actual: Asignacion | null, contenido: ContenidoCelda | null, email?: string, nombreActual?: string) {
    if (actual) {
        const { error } = await supabase.from('esquema_asignaciones').update({ activo: false, updated_at: ahora(), usuario_email: email || null }).eq('id', actual.id);
        if (error) throw errorDe(error);
    }
    if (contenido) {
        const { error } = await supabase.from('esquema_asignaciones').insert({ ...celdaInsert(contenido, puesto.id, turno.id), usuario_email: email || null });
        if (error) throw errorDe(error);
    }
    const quien = contenido?.estado === 'ocupado' ? contenido.empleado?.nombre : contenido?.estado === 'vacante' ? 'Vacante' : contenido?.estado === 'vacante_no_activa' ? 'Vacante no activa' : 'vacío';
    const antes = actual ? (actual.estado === 'ocupado' ? nombreActual || 'persona' : 'vacante') : 'vacío';
    await registrar(plantaId, 'celda', `${puesto.nombre} · ${turno.nombre}: ${antes} → ${quien}`, email);
}

// Mueve (o intercambia) lo que hay en una celda hacia otra
export async function moverCelda(plantaId: number, origen: { a: Asignacion; puesto: Puesto; turno: Turno; nombre: string }, destino: { a: Asignacion | null; puesto: Puesto; turno: Turno; nombre: string }, email?: string) {
    const contenido = (a: Asignacion): ContenidoCelda => ({
        empleado: a.estado === 'ocupado' && a.empleado_id != null ? { id: a.empleado_id, nombre: '' } : null,
        estado: a.estado,
        nuevo: a.nuevo,
        novedad: a.novedad || ''
    });
    const detalle = `${origen.nombre}: ${origen.puesto.nombre} · ${origen.turno.nombre} → ${destino.puesto.nombre} · ${destino.turno.nombre}${destino.a ? ` (intercambio con ${destino.nombre})` : ''}`;
    // Primero se liberan las dos celdas para no chocar con la regla de una asignación por celda
    const ids = [origen.a.id, destino.a?.id].filter((x): x is number => x != null);
    const { error } = await supabase.from('esquema_asignaciones').update({ activo: false, updated_at: ahora(), usuario_email: email || null }).in('id', ids);
    if (error) throw errorDe(error);
    const filas = [{ ...celdaInsert(contenido(origen.a), destino.puesto.id, destino.turno.id), usuario_email: email || null }];
    if (destino.a) filas.push({ ...celdaInsert(contenido(destino.a), origen.puesto.id, origen.turno.id), usuario_email: email || null });
    const r = await supabase.from('esquema_asignaciones').insert(filas);
    if (r.error) throw errorDe(r.error);
    await registrar(plantaId, 'mover', detalle, email);
}

function celdaInsert(c: ContenidoCelda, puestoId: number, turnoId: number) {
    return {
        puesto_id: puestoId,
        turno_id: turnoId,
        empleado_id: c.estado === 'ocupado' ? c.empleado?.id ?? null : null,
        estado: c.estado,
        nuevo: c.estado === 'ocupado' && c.nuevo,
        novedad: c.estado === 'ocupado' ? limpiarNombre(c.novedad) || null : null
    };
}

// Novedades (personal fuera del esquema)
export async function guardarNovedad(plantaId: number, n: { id?: number; empleado_id: number; observacion: string; cuenta_fte: boolean }, nombre: string, email?: string) {
    const fila = { empleado_id: n.empleado_id, observacion: limpiarNombre(n.observacion) || null, cuenta_fte: n.cuenta_fte, usuario_email: email || null };
    const { error } = n.id
        ? await supabase.from('esquema_novedades').update({ ...fila, updated_at: ahora() }).eq('id', n.id)
        : await supabase.from('esquema_novedades').insert({ ...fila, planta_id: plantaId });
    if (error) throw errorDe(error);
    await registrar(plantaId, 'novedad', `${n.id ? 'Editó' : 'Agregó'} novedad: ${nombre}${fila.observacion ? ` (${fila.observacion})` : ''}`, email);
}

export async function quitarNovedad(plantaId: number, n: Novedad, nombre: string, email?: string) {
    const { error } = await supabase.from('esquema_novedades').update({ activo: false, updated_at: ahora(), usuario_email: email || null }).eq('id', n.id);
    if (error) throw errorDe(error);
    await registrar(plantaId, 'novedad', `Quitó novedad: ${nombre}`, email);
}

// Estructura: plantas, secciones, turnos y puestos
type TablaEstructura = 'esquema_plantas' | 'esquema_secciones' | 'esquema_turnos' | 'esquema_puestos';
const NOMBRE_TABLA: Record<TablaEstructura, string> = { esquema_plantas: 'planta', esquema_secciones: 'sección', esquema_turnos: 'turno', esquema_puestos: 'puesto' };

export async function crearEstructura(plantaId: number | null, tabla: TablaEstructura, fila: Record<string, unknown>, email?: string): Promise<number> {
    const { data, error } = await supabase.from(tabla).insert(fila).select('id').single();
    if (error) throw errorDe(error);
    await registrar(plantaId ?? data.id, 'estructura', `Creó ${NOMBRE_TABLA[tabla]}: ${String(fila.nombre ?? '')}`, email);
    return data.id;
}

export async function editarEstructura(plantaId: number, tabla: TablaEstructura, id: number, cambios: Record<string, unknown>, email?: string, detalle?: string) {
    const { error } = await supabase.from(tabla).update({ ...cambios, updated_at: ahora() }).eq('id', id);
    if (error) throw errorDe(error);
    if (detalle) await registrar(plantaId, 'estructura', detalle, email);
}

// Cambia el orden de dos elementos vecinos
export async function intercambiarOrden(tabla: TablaEstructura, a: { id: number; orden: number }, b: { id: number; orden: number }) {
    const ordenA = a.orden === b.orden ? b.orden + 1 : b.orden;
    const r1 = await supabase.from(tabla).update({ orden: ordenA }).eq('id', a.id);
    const r2 = await supabase.from(tabla).update({ orden: a.orden }).eq('id', b.id);
    if (r1.error || r2.error) throw errorDe(r1.error || r2.error);
}
