// lib/nomenclaturaPlantas.ts
// Estandarización unificada de plantas de producción FIRPLAK S.A.

export interface NomenclaturaPlanta {
  id?: number | string;
  codigo: string;
  nombre_oficial: string;
  alias: string[];
  descripcion?: string;
  color_hex?: string;
  activo?: boolean;
}

/**
 * Catálogo maestro estático predeterminado (fallback y acceso síncrono rápido)
 */
export const NOMENCLATURA_PLANTAS_DEFAULT: NomenclaturaPlanta[] = [
  {
    codigo: 'MS',
    nombre_oficial: 'Mármol Sintético',
    alias: [
      'MS',
      'MARMOL',
      'MÁRMOL',
      'MARMOL SINTETICO',
      'MÁRMOL SINTÉTICO',
      'PLANTA MÁRMOL',
      'PLANTA MARMOL',
      'PLANTA MÁRMOL SINTÉTICO',
      'MP-10',
      'MARMOL SINTETICO MS'
    ],
    descripcion: 'Planta de producción de lavamanos, bañeras y piezas en Mármol Sintético',
    color_hex: '#324354',
    activo: true
  },
  {
    codigo: 'CEFI',
    nombre_oficial: 'Muebles (CEFI)',
    alias: [
      'CEFI',
      'MUEBLES',
      'MBL',
      'PLANTA DE MUEBLES',
      'PLANTA MUEBLES',
      'CARPINTERIA',
      'MADERA',
      'CEFI MUEBLES',
      'MUEBLE',
      'MP-20'
    ],
    descripcion: 'Centro de Fabricación Integrado de Mobiliario y Madera',
    color_hex: '#7B8E90',
    activo: true
  },
  {
    codigo: 'ACR',
    nombre_oficial: 'Acrílicos',
    alias: [
      'ACR',
      'ACRILICOS',
      'ACRÍLICOS',
      'PLANTA ACRÍLICOS',
      'PLANTA ACRILICOS',
      'BAÑERAS',
      'BANERAS',
      'TERMOFORMADO',
      'MP-30'
    ],
    descripcion: 'Línea de termoformado y procesamiento de láminas acrílicas',
    color_hex: '#deb841',
    activo: true
  },
  {
    codigo: 'FV',
    nombre_oficial: 'Fibra de Vidrio',
    alias: [
      'FV',
      'FIBRA',
      'FIBRA DE VIDRIO',
      'PLANTA FIBRA',
      'PLANTA FIBRA DE VIDRIO',
      'REFUERZO FIBRA',
      'RTM FIBRA'
    ],
    descripcion: 'Planta de aspersión, laminado y refuerzo en Fibra de Vidrio',
    color_hex: '#59a96a',
    activo: true
  },
  {
    codigo: 'RTM',
    nombre_oficial: 'RTM',
    alias: [
      'RTM',
      'INYECCION RTM',
      'INYECCIÓN RTM',
      'MOLDEO RTM',
      'PLANTA RTM'
    ],
    descripcion: 'Planta de moldeo por transferencia de resina (Resin Transfer Moulding)',
    color_hex: '#3b82f6',
    activo: true
  },
  {
    codigo: 'SG',
    nombre_oficial: 'Servicios Generales',
    alias: [
      'SG',
      'MTTO',
      'MANTENIMIENTO',
      'SERVICIOS GENERALES',
      'PLANTA GENERAL',
      'PLANTA SERVICIOS GENERALES',
      'SERVICIOS',
      'TALLER MTTO'
    ],
    descripcion: 'Área de soporte transversal, mantenimiento e infraestructura general',
    color_hex: '#64748b',
    activo: true
  }
];

/**
 * Normaliza un nombre o código de planta recibido a su Nombre Oficial canónico.
 * Soporta insensibilidad a mayúsculas/minúsculas, tildes y espacios extras.
 */
export function normalizarPlanta(
  input: string | null | undefined,
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string {
  if (!input || typeof input !== 'string') return 'Mármol Sintético';

  const clean = input
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remover tildes para comparación robusta

  // 1. Coincidencia exacta con nombre oficial o código
  for (const item of catalogo) {
    const cleanOficial = item.nombre_oficial
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const cleanCodigo = item.codigo
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (clean === cleanOficial || clean === cleanCodigo) {
      return item.nombre_oficial;
    }

    // 2. Coincidencia dentro de la lista de alias
    for (const al of item.alias) {
      const cleanAlias = al
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (clean === cleanAlias) {
        return item.nombre_oficial;
      }
    }
  }

  // 3. Coincidencias por palabras clave (heurística para textos largos)
  if (clean.includes('MARMOL') || clean === 'MS') return 'Mármol Sintético';
  if (clean.includes('MUEBLE') || clean.includes('CEFI') || clean.includes('MADERA') || clean.includes('CARPINT')) return 'Muebles (CEFI)';
  if (clean.includes('ACRILIC') || clean.includes('TERMOFORM')) return 'Acrílicos';
  if (clean.includes('FIBRA') || clean === 'FV') return 'Fibra de Vidrio';
  if (clean.includes('RTM')) return 'RTM';
  if (clean.includes('SERVICIO') || clean.includes('MTTO') || clean.includes('MANTENIMIENTO')) return 'Servicios Generales';

  return input.trim();
}

/**
 * Devuelve el código estándar (ej: 'MS', 'CEFI', 'FV') a partir de cualquier alias o nombre oficial
 */
export function obtenerCodigoPlanta(
  input: string | null | undefined,
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string {
  const oficial = normalizarPlanta(input, catalogo);
  const found = catalogo.find(p => p.nombre_oficial === oficial);
  return found ? found.codigo : (input || 'MS').trim().toUpperCase();
}

/**
 * Lista de todos los nombres oficiales para usar en Dropdowns / Selects
 */
export function obtenerNombresOficialesPlantas(
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string[] {
  return catalogo.filter(p => p.activo !== false).map(p => p.nombre_oficial);
}
