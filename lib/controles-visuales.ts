import { supabase } from '@/lib/supabase';

export const CV_TABLA = 'controles_visuales';
export const CV_BUCKET = 'controles-visuales';
export const CV_BASE_PATH = '/mantenimiento/controles-visuales';

export type IconoControl = 'ninguno' | 'bascula' | 'alerta' | 'casco' | 'pare' | 'check';

export const ICONOS: { value: IconoControl; label: string }[] = [
  { value: 'ninguno', label: 'Sin ícono' },
  { value: 'bascula', label: 'Báscula / peso' },
  { value: 'alerta', label: 'Alerta' },
  { value: 'casco', label: 'EPP / casco' },
  { value: 'pare', label: 'Pare' },
  { value: 'check', label: 'Verificar' },
];

/** hoja = logo + textos (carta horizontal por defecto); rotulo = recuadro con texto (11.8 x 3.1 cm por defecto) */
export type FormatoControl = 'hoja' | 'rotulo';

/** Archivos que se pueden subir como control ya existente (se guardan con tipo 'pdf') */
export const CV_MIME_ARCHIVO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const CV_MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;

export interface ControlVisual {
  id: string;
  codigo: string;
  planta: string;
  area: string | null;
  titulo: string;
  /** plantilla = creado en la app; pdf = archivo subido (PDF o imagen, ver archivo_mime) */
  tipo: 'plantilla' | 'pdf';
  /** Puede venir vacío si aún no se ejecutó controles_visuales_rotulos.sql */
  formato?: FormatoControl | null;
  archivo_mime?: string | null;
  /** Tamaño impreso en cm; vacío = tamaño por defecto del formato (ver tamanoControl) */
  ancho_cm?: number | null;
  alto_cm?: number | null;
  texto_principal: string | null;
  dato_destacado: string | null;
  texto_secundario: string | null;
  icono: IconoControl | null;
  pdf_path: string | null;
  version: number;
  activo: boolean;
  creado_por: string | null;
  actualizado_por: string | null;
  created_at: string;
  updated_at: string;
}

/** Centímetros a píxeles CSS (96 dpi) */
export const PX_POR_CM = 96 / 2.54;

export interface TamanoCm {
  ancho: number;
  alto: number;
}

/** Tamaños por defecto: la hoja es una carta horizontal; el rótulo, el de la presentación de manufactura */
export const TAMANO_DEFECTO: Record<FormatoControl, TamanoCm> = {
  hoja: { ancho: 27.9, alto: 21.6 },
  rotulo: { ancho: 11.8, alto: 3.1 },
};

/** Tamaños rápidos que ofrece el editor */
export const TAMANOS_PREDEFINIDOS: Record<FormatoControl, { nombre: string; tamano: TamanoCm }[]> = {
  hoja: [
    { nombre: 'Carta', tamano: TAMANO_DEFECTO.hoja },
    { nombre: 'Media carta', tamano: { ancho: 21.6, alto: 14 } },
    { nombre: 'Cuarto de carta', tamano: { ancho: 14, alto: 10.8 } },
  ],
  rotulo: [
    { nombre: 'Estándar', tamano: TAMANO_DEFECTO.rotulo },
    { nombre: 'Pequeño', tamano: { ancho: 8, alto: 2.5 } },
    { nombre: 'Grande', tamano: { ancho: 18, alto: 5 } },
  ],
};

/** Lo máximo que cabe en una carta horizontal con márgenes de 1 cm */
export const TAMANO_MAXIMO: TamanoCm = { ancho: 25.9, alto: 19.5 };

export function formatoControl(c: Pick<ControlVisual, 'formato'>): FormatoControl {
  return c.formato === 'rotulo' ? 'rotulo' : 'hoja';
}

export function tamanoControl(c: Pick<ControlVisual, 'formato' | 'ancho_cm' | 'alto_cm'>): TamanoCm {
  const defecto = TAMANO_DEFECTO[formatoControl(c)];
  return { ancho: Number(c.ancho_cm) || defecto.ancho, alto: Number(c.alto_cm) || defecto.alto };
}

export function mismoTamano(a: TamanoCm, b: TamanoCm): boolean {
  return Math.abs(a.ancho - b.ancho) < 0.05 && Math.abs(a.alto - b.alto) < 0.05;
}

/** Una hoja carta de tamaño completo se imprime sola en su página; todo lo demás va al pliego */
export function vaEnPliego(c: Pick<ControlVisual, 'tipo' | 'formato' | 'ancho_cm' | 'alto_cm'>): boolean {
  if (c.tipo !== 'plantilla') return false;
  return formatoControl(c) === 'rotulo' || !mismoTamano(tamanoControl(c), TAMANO_DEFECTO.hoja);
}

/** "Marmol Sintetico" -> "MS", "Fibra de Vidrio" -> "FV", "Bañeras" -> "BAN" */
export function prefijoPlanta(planta: string): string {
  const limpio = planta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ');
  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p && !['DE', 'DEL', 'LA', 'EL', 'Y'].includes(p));
  if (palabras.length === 0) return 'GEN';
  if (palabras.length === 1) return palabras[0].slice(0, 3);
  return palabras.map((p) => p[0]).join('').slice(0, 3);
}

/** Siguiente código libre para la planta: CV-MS-001, CV-MS-002... */
export async function generarCodigo(planta: string): Promise<string> {
  return (await generarCodigos(planta, 1))[0];
}

/** Varios códigos consecutivos libres, para importar muchos controles de una vez */
export async function generarCodigos(planta: string, cantidad: number): Promise<string[]> {
  const prefijo = `CV-${prefijoPlanta(planta)}-`;
  const { data } = await supabase
    .from(CV_TABLA)
    .select('codigo')
    .like('codigo', `${prefijo}%`);
  const max = (data || []).reduce((acc: number, row: { codigo: string }) => {
    const n = parseInt(row.codigo.slice(prefijo.length), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return Array.from({ length: cantidad }, (_, i) => `${prefijo}${String(max + 1 + i).padStart(3, '0')}`);
}

/** Texto de un error de Supabase (son objetos con message, no instancias de Error) */
export function mensajeError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    if (/does not exist|schema cache/.test(err.message)) {
      if (/ancho_cm|alto_cm/.test(err.message)) return 'falta ejecutar controles_visuales_tamano.sql en Supabase';
      if (/formato|archivo_mime/.test(err.message)) return 'falta ejecutar controles_visuales_rotulos.sql en Supabase';
    }
    return err.message;
  }
  return 'error desconocido';
}

export function esRotulo(c: Pick<ControlVisual, 'formato'>): boolean {
  return c.formato === 'rotulo';
}

export function esImagen(c: Pick<ControlVisual, 'tipo' | 'archivo_mime'>): boolean {
  return c.tipo === 'pdf' && !!c.archivo_mime?.startsWith('image/');
}

/**
 * Textos de un PowerPoint de controles existentes: cada cuadro de texto de cada
 * diapositiva es un rótulo. Los párrafos de un mismo cuadro se unen con espacio.
 */
export async function leerRotulosPptx(archivo: File): Promise<string[]> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(archivo);
  const slides = Object.keys(zip.files)
    .map((nombre) => ({ nombre, n: Number(nombre.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1]) }))
    .filter((s) => s.n)
    .sort((a, b) => a.n - b.n);

  const textos: string[] = [];
  for (const { nombre } of slides) {
    const xml = new DOMParser().parseFromString(await zip.files[nombre].async('text'), 'application/xml');
    for (const forma of Array.from(xml.getElementsByTagName('p:sp'))) {
      const texto = Array.from(forma.getElementsByTagName('a:p'))
        .map((p) => Array.from(p.getElementsByTagName('a:t')).map((t) => t.textContent || '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (texto) textos.push(texto);
    }
  }
  return textos;
}

export function slugPlanta(planta: string): string {
  return planta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'general';
}

export function rutaPlanta(planta: string): string {
  return `${CV_BASE_PATH}/${encodeURIComponent(planta)}`;
}

export function rutaImprimir(id: string): string {
  return `${CV_BASE_PATH}/imprimir/${id}`;
}

/** Página que acomoda varios controles en cada hoja de papel */
export function rutaImprimirPliego(ids: string[]): string {
  return `${CV_BASE_PATH}/imprimir/pliego?ids=${ids.join(',')}`;
}
