// lib/nomenclaturaPlantas.ts
// Estandarización unificada de códigos de plantas de producción FIRPLAK S.A.
// Basado en la tabla oficial public.nomenclatura_plantas

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
 * Catálogo maestro estático predeterminado con los códigos oficiales de public.nomenclatura_plantas
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
    codigo: 'MBL',
    nombre_oficial: 'Muebles',
    alias: [
      'MBL',
      'MUEBLES',
      'PLANTA DE MUEBLES',
      'PLANTA MUEBLES',
      'CARPINTERIA',
      'MADERA',
      'MUEBLE',
      'MP-20'
    ],
    descripcion: 'Planta de Fabricación de Mobiliario y Madera',
    color_hex: '#7B8E90',
    activo: true
  },
  {
    codigo: 'CEFI',
    nombre_oficial: 'CEFI',
    alias: [
      'CEFI',
      'CEMA',
      'PLANTA CEFI',
      'CEFI MUEBLES'
    ],
    descripcion: 'Centro de Fabricación Integrado (CEFI)',
    color_hex: '#7B8E90',
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
      'SERVICIOS GENERALES',
      'PLANTA GENERAL',
      'PLANTA SERVICIOS GENERALES',
      'SERVICIOS',
      'TALLER MTTO',
      'INFRAESTRUCTURA'
    ],
    descripcion: 'Área de soporte transversal y servicios generales',
    color_hex: '#64748b',
    activo: true
  },
  {
    codigo: 'MANUF',
    nombre_oficial: 'Manufactura',
    alias: [
      'MANUF',
      'MANUFACTURA',
      'PRODUCCION GENERAL',
      'PRODUCCIÓN'
    ],
    descripcion: 'Área central de Manufactura',
    color_hex: '#324354',
    activo: true
  },
  {
    codigo: 'MTTO',
    nombre_oficial: 'Mantenimiento',
    alias: [
      'MTTO',
      'MANTENIMIENTO',
      'TALLER DE MANTENIMIENTO'
    ],
    descripcion: 'Área técnica de Mantenimiento',
    color_hex: '#f59e0b',
    activo: true
  },
  {
    codigo: 'LOGI',
    nombre_oficial: 'Logística',
    alias: [
      'LOGI',
      'LOG',
      'LOGISTICA',
      'LOGÍSTICA'
    ],
    descripcion: 'Área de Logística y Despachos',
    color_hex: '#8b5cf6',
    activo: true
  },
  {
    codigo: 'ALM',
    nombre_oficial: 'Almacén',
    alias: [
      'ALM',
      'ALMACEN',
      'ALMACÉN',
      'ALMACEN REPUESTOS',
      'BODEGA'
    ],
    descripcion: 'Almacén central y repuestos',
    color_hex: '#06b6d4',
    activo: true
  },
  {
    codigo: 'CEDI',
    nombre_oficial: 'Centro de Distribución',
    alias: [
      'CEDI',
      'CENTRO DE DISTRIBUCION',
      'CENTRO DE DISTRIBUCIÓN'
    ],
    descripcion: 'Centro de Distribución (CEDI)',
    color_hex: '#10b981',
    activo: true
  },
  {
    codigo: 'EXPO',
    nombre_oficial: 'Exportaciones',
    alias: [
      'EXPO',
      'EXPORTACIONES',
      'INTERNACIONAL'
    ],
    descripcion: 'Área de Exportaciones',
    color_hex: '#ec4899',
    activo: true
  },
  {
    codigo: 'FPK-HOME-MED',
    nombre_oficial: 'FIRPLAK HOME MEDELLÍN',
    alias: [
      'FPK-HOME-MED',
      'FIRPLAK HOME MEDELLIN',
      'FIRPLAK HOME MEDELLÍN',
      'HOME MEDELLIN',
      'SHOWROOM'
    ],
    descripcion: 'Tienda FIRPLAK Home Medellín',
    color_hex: '#6366f1',
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
    codigo: 'MOL',
    nombre_oficial: 'Moldes',
    alias: [
      'MOL',
      'MOLDES',
      'TALLER DE MOLDES'
    ],
    descripcion: 'Taller de fabricación y mantenimiento de moldes',
    color_hex: '#d97706',
    activo: true
  },
  {
    codigo: 'EX',
    nombre_oficial: 'Proveedor Externo',
    alias: [
      'EX',
      'EXTERNO',
      'PROVEEDOR EXTERNO',
      'TERCEROS'
    ],
    descripcion: 'Servicios con proveedores externos',
    color_hex: '#64748b',
    activo: true
  },
  {
    codigo: 'OTROS',
    nombre_oficial: 'Otros',
    alias: [
      'OTROS',
      'OTRO',
      'VARIOS',
      'CUARTO 5 S',
      'HUACALES',
      'GENERAL'
    ],
    descripcion: 'Otras áreas operativas',
    color_hex: '#94a3b8',
    activo: true
  }
];

/**
 * Normaliza un nombre o código de planta recibido a su Nombre Oficial canónico.
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
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Coincidencia exacta con código o nombre oficial
  for (const item of catalogo) {
    const cleanCodigo = item.codigo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanOficial = item.nombre_oficial.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (clean === cleanCodigo || clean === cleanOficial) {
      return item.nombre_oficial;
    }

    if (item.alias && Array.isArray(item.alias)) {
      for (const al of item.alias) {
        const cleanAlias = al.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (clean === cleanAlias) {
          return item.nombre_oficial;
        }
      }
    }
  }

  // 2. Heurística
  if (clean.includes('MARMOL') || clean === 'MS') return 'Mármol Sintético';
  if (clean.includes('CEFI')) return 'CEFI';
  if (clean.includes('MUEBLE') || clean === 'MBL' || clean.includes('MADERA') || clean.includes('CARPINT')) return 'Muebles';
  if (clean.includes('ACRILIC') || clean.includes('TERMOFORM') || clean === 'ACR') return 'Acrílicos';
  if (clean.includes('FIBRA') || clean === 'FV') return 'Fibra de Vidrio';
  if (clean.includes('RTM')) return 'RTM';
  if (clean.includes('CEDI') || clean.includes('DISTRIB')) return 'Centro de Distribución';
  if (clean.includes('ALMACEN') || clean === 'ALM') return 'Almacén';
  if (clean.includes('LOGIST') || clean === 'LOGI') return 'Logística';
  if (clean.includes('SERVICIO') || clean === 'SG') return 'Servicios Generales';
  if (clean.includes('MTTO') || clean.includes('MANTENIMIENTO')) return 'Mantenimiento';

  return input.trim();
}

/**
 * Devuelve SIEMPRE el CÓDIGO oficial de planta (ej: 'MS', 'MBL', 'CEFI', 'FV', 'RTM', 'SG', 'ALM', 'CEDI', 'OTROS')
 */
export function obtenerCodigoPlanta(
  input: string | null | undefined,
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string {
  if (!input || typeof input !== 'string') return 'MS';

  const clean = input
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Si ya es un código directo
  const directMatch = catalogo.find(
    p => p.codigo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === clean
  );
  if (directMatch) return directMatch.codigo;

  // 2. Buscar por alias
  for (const item of catalogo) {
    if (item.alias && Array.isArray(item.alias)) {
      for (const al of item.alias) {
        const cleanAlias = al.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (clean === cleanAlias) {
          return item.codigo;
        }
      }
    }
  }

  // 3. Buscar por nombre oficial
  const officialMatch = catalogo.find(
    p => p.nombre_oficial.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === clean
  );
  if (officialMatch) return officialMatch.codigo;

  // 4. Heurísticas rápidas
  if (clean.includes('MARMOL') || clean.includes('SINTETICO')) return 'MS';
  if (clean.includes('CEFI')) return 'CEFI';
  if (clean.includes('MUEBLE') || clean.includes('MADERA') || clean.includes('CARPINT')) return 'MBL';
  if (clean.includes('ACRILIC') || clean.includes('TERMOFORM')) return 'ACR';
  if (clean.includes('FIBRA')) return 'FV';
  if (clean.includes('RTM')) return 'RTM';
  if (clean.includes('CEDI') || clean.includes('DISTRIB')) return 'CEDI';
  if (clean.includes('ALMACEN')) return 'ALM';
  if (clean.includes('LOGIST')) return 'LOGI';
  if (clean.includes('SERVICIO')) return 'SG';
  if (clean.includes('MTTO') || clean.includes('MANTENIMIENTO')) return 'MTTO';
  if (clean.includes('EXPO')) return 'EXPO';
  if (clean.includes('HOME')) return 'FPK-HOME-MED';
  if (clean.includes('MOLDE')) return 'MOL';
  if (clean.includes('EXTERNO') || clean.includes('TERCERO')) return 'EX';
  if (clean.includes('CUARTO') || clean.includes('HUACAL') || clean.includes('OTRO')) return 'OTROS';

  return clean.length <= 6 ? clean : 'OTROS';
}

/**
 * Lista de todos los códigos oficiales para usar en Dropdowns / Selects
 */
export function obtenerCodigosOficialesPlantas(
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string[] {
  return catalogo.filter(p => p.activo !== false).map(p => p.codigo);
}

/**
 * Lista de todos los nombres oficiales para usar en Dropdowns / Selects
 */
export function obtenerNombresOficialesPlantas(
  catalogo: NomenclaturaPlanta[] = NOMENCLATURA_PLANTAS_DEFAULT
): string[] {
  return catalogo.filter(p => p.activo !== false).map(p => p.nombre_oficial);
}

/**
 * Calcula el código de semanas S{semanas} a partir de la frecuencia en días.
 * Estándar industrial FIRPLAK:
 * - <= 7 días: 1 semana -> '01' (S01)
 * - 15 días: 2 semanas -> '02' (S02)
 * - 30 días: 4 semanas (1 mes ≈ 4 semanas) -> '04' (S04)
 * - 60 días: 8 semanas (2 meses) -> '08' (S08)
 * - 90 días: 12 semanas (3 meses = 12 semanas) -> '12' (S12)
 * - 120 días: 16 semanas -> '16' (S16)
 * - 180 días: 24 semanas -> '24' (S24)
 * - >= 360 días: 52 semanas -> '52' (S52)
 * Fórmula: Math.max(1, Math.round((frecuenciaDias / 30) * 4))
 */
export function computeSemanasFromFrecuencia(frecuenciaDias?: number | null): string {
  const frec = Number(frecuenciaDias);
  if (!frec || isNaN(frec) || frec <= 0) return '04';
  if (frec <= 7) return '01';
  if (frec >= 360) return '52';

  // 30 días = 4 semanas -> 90 días = 12 semanas
  const semanas = Math.max(1, Math.round((frec / 30) * 4));
  return String(semanas).padStart(2, '0');
}

/**
 * Extrae la nomenclatura existente entre corchetes o la calcula con la frecuencia adecuada
 */
export function computeNomenclatura(
  planta?: string | null,
  tipoIntervencion?: string | null,
  duracionMinutos?: number | null,
  rawCodeOrTitle?: string | null,
  frecuenciaDias?: number | null
): string {
  const seccion = computeSemanasFromFrecuencia(frecuenciaDias);
  let pCode = obtenerCodigoPlanta(planta);
  // Limpiar caracteres extraños en pCode si tiene comas o espacios
  pCode = pCode.replace(/[^A-Za-z0-9]/g, '');

  let tCode = 'NPT';
  if (tipoIntervencion) {
    const cleanTipo = String(tipoIntervencion).toUpperCase();
    if (cleanTipo.includes('PR') && !cleanTipo.includes('NP')) {
      tCode = 'PRT';
    } else {
      tCode = 'NPT';
    }
  }

  const dur = duracionMinutos || 60;

  if (rawCodeOrTitle) {
    const match = String(rawCodeOrTitle).match(/\[([A-Z0-9_,\s-]+)\]/i);
    if (match && match[1]) {
      const inner = match[1].toUpperCase().replace(/\s+/g, '');
      // Si la nomenclatura existente tiene S\d{2} y se suministró una frecuencia específica,
      // actualizamos el prefijo de semanas (ej: si tenía S04 pero la frecuencia es 90d -> S12)
      if (frecuenciaDias !== undefined && frecuenciaDias !== null && /^S\d{2}/.test(inner)) {
        return `[S${seccion}${inner.slice(3).replace(/[^A-Za-z0-9]/g, '')}]`;
      }
      return `[${inner.replace(/[^A-Za-z0-9]/g, '')}]`;
    }
  }

  return `[S${seccion}${pCode}${tCode}${dur}]`;
}

/**
 * Limpia el título del mantenimiento removiendo nomenclaturas repetidas en corchetes
 */
export function cleanTaskTitle(title: string, nomenclature?: string): string {
  if (!title) return '';
  let clean = String(title).trim();
  if (nomenclature) {
    const escNom = nomenclature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(escNom, 'gi'), '').trim();
  }
  clean = clean.replace(/\[\s*\]/g, '').replace(/\s{2,}/g, ' ').trim();
  return clean || String(title).trim();
}
