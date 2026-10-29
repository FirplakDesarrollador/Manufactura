// Saldos y destrucciones de producto no conforme (todas las plantas).
// Fuentes:
//  - Mármol Sintético (MS), automático: eventos de Calidad MS → Saldos (ms_reporte_defectos, defecto "Saldo - X" /
//    "Destrucción - X", 1 pieza por registro) desde MS_AUTOMATICO_DESDE, con el costo cruzado por referencia contra
//    calidad_costos_sku (hoja "Costos SKU" del Excel de No Conformes).
//  - Histórico de MS hasta el 27/10/2026 y las demás plantas (FV, Muebles, CEFI, Cuarzo, RTM): tabla
//    calidad_saldos_destrucciones (origen 'excel' o registro manual desde el formulario del tablero).
// Si las tablas aún no existen se usa el archivo local public/datos-locales/saldos-destrucciones.json (no se sube a GitHub).
import type { SupabaseClient } from '@supabase/supabase-js';

export type TipoSD = 'saldo' | 'destruccion';

export interface EventoSD {
    fecha: string; // YYYY-MM-DD
    tipo: TipoSD;
    planta: string;
    sku: string;
    referencia: string;
    causa: string;
    responsable: string;
    cantidad: number; // piezas
    costo: number; // $ del evento (cantidad × costo unitario)
    origen: 'automatico' | 'excel' | 'manual';
    sinCosto?: boolean; // automático sin coincidencia en el catálogo de costos
}

export interface CostoSku { sku: string; descripcion: string; costo: number }

export const NOMBRE_TIPO_SD: Record<TipoSD, string> = { saldo: 'Saldo', destruccion: 'Destrucción' };
export const COLOR_TIPO_SD: Record<TipoSD, string> = { saldo: '#10b981', destruccion: '#ef4444' };

export const PLANTAS_SD = [
    { codigo: 'MS', nombre: 'Mármol Sintético' },
    { codigo: 'FV', nombre: 'Fibra de Vidrio' },
    { codigo: 'MBL', nombre: 'Muebles' },
    { codigo: 'CEFI', nombre: 'CEFI' },
    { codigo: 'QZ', nombre: 'Cuarzo / Superficies' },
    { codigo: 'RTM', nombre: 'RTM' }
];
// MS llega solo desde Calidad MS; las demás se registran en el formulario
export const PLANTAS_MANUALES_SD = PLANTAS_SD.filter(p => p.codigo !== 'MS');
// Primer día que MS se toma automático (el Excel trae MS hasta el 27/10/2026)
export const MS_AUTOMATICO_DESDE = '2026-10-28';

const fechaBogota = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso));
const normalizar = (s: string) => s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/(\d)\s*[Xx]\s*(\d)/g, '$1X$2')
    .replace(/\s+/g, ' ')
    .trim();

async function paginado<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
    let todo: T[] = [];
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await consulta(desde, desde + 999);
        if (error) throw error;
        todo = todo.concat(data || []);
        if (!data || data.length < 1000) break;
    }
    return todo;
}

export async function fetchCostosSku(sb: SupabaseClient): Promise<CostoSku[]> {
    const filas = await paginado<any>((d, h) => sb.from('calidad_costos_sku').select('sku, descripcion, costo_promedio').order('sku').range(d, h));
    return filas.map(f => ({ sku: f.sku, descripcion: normalizar(f.descripcion || ''), costo: Number(f.costo_promedio) || 0 }));
}

// Siglas de las referencias de la app → familia en la descripción del SKU
const FAMILIAS: Record<string, string> = {
    LVM: 'LAVAMANOS', LVR: 'LAVARROPAS', LVP: 'LAVAPLATOS', LVT: 'LAVATRAPEROS',
    MESON: 'MESON', MESA: 'MESA', POCETA: 'POCETA'
};

// Costo unitario de una referencia de la app (p. ej. "LVM ECO 48x38", "MESON AQUA 180x60"): mediana de los SKU cuya
// descripción empieza por la familia y contiene el modelo y la medida (variantes en blanco si las hay).
export function costoUnitarioReferencia(referencia: string, costos: CostoSku[], cache = new Map<string, number | null>()): number | null {
    const clave = normalizar(referencia);
    if (cache.has(clave)) return cache.get(clave)!;
    const palabras = clave.split(' ');
    const familia = FAMILIAS[palabras[0]] || palabras[0];
    const resto = palabras.slice(1);
    const medida = resto.find(p => /^\d+X\d+$/.test(p));
    const intentos = [
        resto,                                                     // todo: modelo, medida y extras ("CON FLAUTA")
        resto.filter(p => p === medida || p === resto[0]),         // modelo + medida
        medida ? [medida] : []                                     // solo la medida
    ].filter(t => t.length > 0);
    let resultado: number | null = null;
    for (const t of intentos) {
        const coinciden = costos.filter(c => c.descripcion.startsWith(familia) && !c.descripcion.includes('QUARTZSTONE') && t.every(p => c.descripcion.includes(p)) && c.costo > 0);
        if (coinciden.length) {
            // La app no guarda el color: se prefiere el blanco (el más fabricado) si existe
            const blancos = coinciden.filter(c => /\bBLANCO\b/.test(c.descripcion) && !c.descripcion.includes('GRANITO BLANCO'));
            const v = (blancos.length ? blancos : coinciden).map(c => c.costo).sort((a, b) => a - b);
            resultado = v[Math.floor(v.length / 2)];
            break;
        }
    }
    cache.set(clave, resultado);
    return resultado;
}

// Eventos automáticos de MS: registros de Calidad MS → Saldos ("Saldo - CAUSA" / "Destrucción - CAUSA")
async function fetchEventosMsAutomaticos(sb: SupabaseClient, costos: CostoSku[]): Promise<EventoSD[]> {
    const desde = new Date(`${MS_AUTOMATICO_DESDE}T00:00:00-05:00`).toISOString();
    const filas = await paginado<any>((d, h) => sb
        .from('ms_reporte_defectos')
        .select('id, created_at, defecto, producto:productos_defectos_ms (Referencia)')
        .gte('created_at', desde)
        .order('created_at', { ascending: true })
        .range(d, h));
    const cache = new Map<string, number | null>();
    const eventos: EventoSD[] = [];
    for (const r of filas) {
        const lista = Array.isArray(r.defecto) ? r.defecto : typeof r.defecto === 'string' ? [r.defecto] : [];
        for (const d of lista) {
            const texto = String(typeof d === 'string' ? d : d?.defecto || d?.Defecto || d?.nombre || '');
            const m = texto.match(/^\s*(saldo|destrucci[oó]n)\s*-\s*(.+)$/i);
            if (!m) continue;
            const producto = Array.isArray(r.producto) ? r.producto[0] : r.producto;
            const referencia = String(producto?.Referencia || 'Sin referencia').trim();
            const unitario = costoUnitarioReferencia(referencia, costos, cache);
            eventos.push({
                fecha: fechaBogota(r.created_at),
                tipo: m[1].toLowerCase().startsWith('saldo') ? 'saldo' : 'destruccion',
                planta: 'MS',
                sku: '',
                referencia: referencia.toUpperCase(),
                causa: m[2].trim().toUpperCase(),
                responsable: 'MS',
                cantidad: 1,
                costo: Math.round(unitario ?? 0),
                origen: 'automatico',
                sinCosto: unitario == null
            });
        }
    }
    return eventos;
}

async function fetchEventosTabla(sb: SupabaseClient): Promise<EventoSD[]> {
    const filas = await paginado<any>((d, h) => sb
        .from('calidad_saldos_destrucciones')
        .select('fecha, tipo, planta, sku, referencia, causa, responsable, cantidad, costo, origen')
        .order('fecha', { ascending: true })
        .range(d, h));
    return filas.map(f => ({
        fecha: String(f.fecha).slice(0, 10),
        tipo: f.tipo,
        planta: f.planta,
        sku: f.sku || '',
        referencia: String(f.referencia || '').toUpperCase(),
        causa: String(f.causa || '').toUpperCase(),
        responsable: String(f.responsable || 'SIN RESPONSABLE').toUpperCase(),
        cantidad: Number(f.cantidad) || 1,
        costo: Number(f.costo) || 0,
        origen: f.origen === 'excel' ? 'excel' : 'manual'
    }));
}

async function fetchArchivoLocal(): Promise<EventoSD[]> {
    const resp = await fetch('/datos-locales/saldos-destrucciones.json', { cache: 'no-store' });
    if (!resp.ok) return [];
    return ((await resp.json()) as EventoSD[]).map(e => ({ ...e, origen: 'excel' as const }));
}

export interface CargaSD { eventos: EventoSD[]; costos: CostoSku[]; avisos: string[] }

// Carga todo: tabla (histórico + manuales) + MS automático. Si las tablas no existen aún, usa el archivo local.
export async function cargarEventosSD(sb: SupabaseClient): Promise<CargaSD> {
    const avisos: string[] = [];
    let costos: CostoSku[] = [];
    let tabla: EventoSD[] = [];
    let tablasListas = true;
    try {
        [costos, tabla] = await Promise.all([fetchCostosSku(sb), fetchEventosTabla(sb)]);
    } catch {
        tablasListas = false;
        avisos.push('Faltan las tablas de saldos y destrucciones en la base (ejecutar calidad_saldos_destrucciones.sql y el archivo de datos).');
        tabla = await fetchArchivoLocal();
    }
    let automaticos: EventoSD[] = [];
    try {
        automaticos = await fetchEventosMsAutomaticos(sb, costos);
        const sinCosto = automaticos.filter(e => e.sinCosto).length;
        if (sinCosto && tablasListas) avisos.push(`${sinCosto} evento(s) de MS sin costo: su referencia no coincide con el catálogo de costos.`);
    } catch {
        avisos.push('No se pudieron leer los saldos de Calidad MS.');
    }
    if (!tabla.length && !automaticos.length && !tablasListas) {
        avisos.push('Sin datos: el histórico del Excel solo está en el equipo de Calidad hasta cargarlo a la base.');
    }
    return { eventos: [...tabla, ...automaticos], costos, avisos };
}

export interface NuevoEventoSD {
    fecha: string;
    tipo: TipoSD;
    planta: string;
    sku: string;
    referencia: string;
    causa: string;
    responsable: string;
    cantidad: number;
    costo: number;
    creado_por: string;
}

export async function guardarEventoSD(sb: SupabaseClient, e: NuevoEventoSD) {
    const { error } = await sb.from('calidad_saldos_destrucciones').insert({ ...e, origen: 'manual' });
    if (error) throw error;
}
