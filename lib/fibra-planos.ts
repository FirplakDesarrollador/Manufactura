import { supabase } from '@/lib/supabase';

// Planos de proceso de Fibra de vidrio: un PDF por bañera y proceso.
// Reemplazar o quitar un plano solo pone activo = false; el PDF queda en el bucket.

export const PLANOS_TABLA = 'fibra_planos';
export const PLANOS_BUCKET = 'fibra-planos';
export const PLANOS_MAX_BYTES = 30 * 1024 * 1024;

// El id es el valor guardado en fibra_planos.proceso; el nombre es lo que se muestra.
// Ojo: los ids de masilla y cantoneras están cruzados a propósito. Los primeros planos
// (masilla) se guardaron con proceso = 'cantoneras', así que ese id se muestra como
// "Aplicación de masilla" y va de primero; 'masilla' queda para Cantoneras.
// El id 'soldadura' se muestra como Herrajes (no tenía planos cuando se renombró).
export const PROCESOS_PLANO = [
    { id: 'cantoneras', nombre: 'Aplicación de masilla' },
    { id: 'masilla', nombre: 'Cantoneras' },
    { id: 'soldadura', nombre: 'Herrajes' },
    { id: 'pulido', nombre: 'Pulido' },
    { id: 'ensamble', nombre: 'Ensamble' },
    { id: 'huacal', nombre: 'Huacal' }
] as const;

export type ProcesoPlano = typeof PROCESOS_PLANO[number]['id'];

export interface Plano {
    id: number;
    banera: string;
    proceso: ProcesoPlano;
    pdf_path: string;
    nombre_archivo: string | null;
    version: number;
    observacion: string | null;
    activo: boolean;
    usuario_email: string | null;
    hash?: string | null;               // huella SHA-256 del PDF (fibra_planos_hash.sql)
    created_at: string;
}

export const nombreProceso = (id: string) => PROCESOS_PLANO.find(p => p.id === id)?.nombre || id;

// Nombre de la bañera a partir del archivo: "BAÑERA OVALADA 170.pdf" → "BAÑERA OVALADA 170"
export const baneraDeArchivo = (nombre: string) => nombre.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

const clave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
export const mismaBanera = (a: string, b: string) => clave(a) === clave(b);

// Nombre para mostrar: sin el "Dibujo v19" del archivo (el nombre guardado no cambia)
export const nombreVisible = (nombre: string) => nombre.replace(/\bdibujo\s*v?\s*\d+\b/gi, '').replace(/\s{2,}/g, ' ').trim();

// Modelo general de la bañera: se busca el nombre del modelo en cualquier parte del nombre, así
// "Herraje Silla Chattanoogan 2021 Plano" y "Chattanoogan 200x200" quedan juntos.
// Si no es un modelo conocido, se usa la primera palabra que no sea un prefijo ("Bañera", "Herraje"…).
const MODELOS = new Set(['americana', 'bonaire', 'calima', 'cataluna', 'chattanoogan', 'danesa', 'francesa', 'galapagos', 'honolulu',
    'ibiza', 'italiana', 'malta', 'milenium', 'millenium', 'chatanoogan', 'mobu', 'noruega', 'qatar', 'santorini', 'tahiti']);
const PREFIJOS = new Set(['banera', 'baneras', 'hidromasaje', 'hidroaero', 'faldon', 'plano', 'planos', 'tina', 'herraje', 'herrajes',
    'silla', 'u', 'complemento', 'soporte', 'ensamble', 'huacal', 'guacal', 'cantonera', 'cantoneras', 'masilla', 'pulido',
    'de', 'del', 'la', 'el', 'para', 'con', 'y']);
const palabrasDe = (nombre: string) => clave(nombre).split(/[\s_+-]+/).filter(Boolean);
export function modeloBanera(nombre: string): string {
    const palabras = palabrasDe(nombre);
    const m = palabras.find(p => MODELOS.has(p));
    // Variantes de escritura del mismo modelo
    if (m) return ({ chatanoogan: 'chattanoogan', millenium: 'milenium' } as Record<string, string>)[m] || m;
    return palabras.find(p => !PREFIJOS.has(p) && !/^\d/.test(p)) || clave(nombre);
}

// Nombre general de un grupo: el nombre corto que empieza por el modelo (ej. "Cataluña 170x90") si alguna versión lo tiene;
// si no, modelo + medida más común
export function tituloModelo(nombres: string[]): string {
    const cortos = nombres
        .filter(n => n.trim().split(/\s+/).length <= 3 && palabrasDe(n)[0] === modeloBanera(n))
        .sort((a, b) => a.length - b.length);
    if (cortos.length) return cortos[0].trim();
    const original = nombres[0].split(/[\s_-]+/).find(p => clave(p) === modeloBanera(nombres[0])) || modeloBanera(nombres[0]);
    const modelo = original.toLowerCase();
    const medidas = new Map<string, number>();
    nombres.forEach(n => { const m = n.match(/\d{2,3}\s*x\s*\d{2,3}/i)?.[0].replace(/\s/g, '').toLowerCase(); if (m) medidas.set(m, (medidas.get(m) || 0) + 1); });
    const medida = [...medidas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return `${modelo.charAt(0).toUpperCase()}${modelo.slice(1)}${medida ? ` ${medida}` : ''}`;
}

function errorDe(e: { message?: string; code?: string } | null): Error {
    const m = e?.message || 'Error desconocido';
    if (e?.code === '42P01' || /fibra_planos/.test(m) && /does not exist|schema cache/.test(m)) return new Error('Falta ejecutar fibra_planos.sql en Supabase');
    if (/fibra_planos_proceso_check/.test(m)) return new Error('Este proceso aún no está habilitado en Supabase: falta ejecutar fibra_planos_huacal.sql');
    if (/bucket not found/i.test(m)) return new Error('Falta ejecutar fibra_planos.sql en Supabase (bucket fibra-planos)');
    return new Error(m);
}

// Solo editan quienes tienen el permiso fibra.planos (o administradores)
export async function puedeEditarPlanos(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    const { data } = await supabase.from('usuarios').select('rol, permisos').ilike('correo', email.trim().toLowerCase()).maybeSingle();
    const p = data?.permisos as { fibra?: { planos?: boolean }; modulos?: { planos?: boolean } } | null;
    return data?.rol === 'admin' || data?.rol === 'desarrollador' || p?.fibra?.planos === true || p?.modulos?.planos === true;
}

export async function cargarPlanos(): Promise<Plano[]> {
    const { data, error } = await supabase
        .from(PLANOS_TABLA)
        .select('*')  // * para no fallar si aún no existe la columna hash
        .order('created_at', { ascending: false });
    if (error) throw errorDe(error);
    return (data || []) as Plano[];
}

// Bañeras conocidas en las órdenes de FV, para sugerir el nombre al cargar
export async function cargarBanerasFv(): Promise<string[]> {
    const { data } = await supabase.from('ordenes_fabricacion_fv').select('producto_descripcion').limit(5000);
    const vistas = new Map<string, string>();
    (data || []).forEach((o: { producto_descripcion: string | null }) => {
        const d = (o.producto_descripcion || '').trim();
        if (d && !vistas.has(clave(d))) vistas.set(clave(d), d);
    });
    return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export async function urlPlano(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(PLANOS_BUCKET).createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) throw errorDe(error);
    return data.signedUrl;
}

// Sube el PDF y lo deja como plano vigente; si ya había uno, pasa a versión anterior
export async function subirPlano(banera: string, proceso: ProcesoPlano, archivo: File, actual: Plano | null, observacion: string, email?: string, hash?: string | null) {
    if (archivo.type !== 'application/pdf' && !/\.pdf$/i.test(archivo.name)) throw new Error(`${archivo.name} no es un PDF`);
    if (archivo.size > PLANOS_MAX_BYTES) throw new Error(`${archivo.name} supera 30 MB`);
    const ruta = `${proceso}/${crypto.randomUUID()}.pdf`;
    const { error: e1 } = await supabase.storage.from(PLANOS_BUCKET).upload(ruta, archivo, { contentType: 'application/pdf', upsert: false });
    if (e1) throw errorDe(e1);
    if (actual) {
        const { error: e2 } = await supabase.from(PLANOS_TABLA).update({ activo: false, updated_at: new Date().toISOString() }).eq('id', actual.id);
        if (e2) throw errorDe(e2);
    }
    const fila = {
        banera: banera.trim(), proceso, pdf_path: ruta, nombre_archivo: archivo.name,
        version: (actual?.version || 0) + 1, observacion: observacion.trim() || null, usuario_email: email || null
    };
    const conHuella: Record<string, unknown> = hash ? { ...fila, hash } : fila;
    let { error: e3 } = await supabase.from(PLANOS_TABLA).insert(conHuella);
    // Si aún no se ejecutó fibra_planos_hash.sql, se guarda sin huella
    if (e3 && hash && /hash/.test(e3.message || '')) ({ error: e3 } = await supabase.from(PLANOS_TABLA).insert(fila));
    if (e3) throw errorDe(e3);
}

// Huella SHA-256 del contenido del PDF: detecta el mismo plano aunque el archivo tenga otro nombre
export async function hashArchivo(archivo: File): Promise<string | null> {
    try {
        const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
        return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        return null;
    }
}

const nombreArchivoClave = (n: string | null | undefined) => clave(n || '').replace(/\s+/g, ' ');

// ¿Ya está cargado este PDF? Mismo contenido (huella) o mismo nombre de archivo que un plano vigente
export function planoRepetido(archivo: File, hash: string | null, vigentes: Plano[]): Plano | null {
    return vigentes.find(p => (hash && p.hash && p.hash === hash) || nombreArchivoClave(p.nombre_archivo) === nombreArchivoClave(archivo.name)) || null;
}

export async function quitarPlano(p: Plano) {
    const { error } = await supabase.from(PLANOS_TABLA).update({ activo: false, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) throw errorDe(error);
}
