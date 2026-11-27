import { supabase } from '@/lib/supabase';

export type ProcesoConsumoKey =
    | 'pintura_ms'
    | 'vaciado_ms'
    | 'pintura_fv'
    | 'vaciado_fv'
    | 'masilla_fv';

export interface ProcesoConsumoConfig {
    key: ProcesoConsumoKey;
    nombre: string;
    nombreCorto: string;
    planta: 'MS' | 'FV';
    plantaNombre: string;
    soportaCicloDosPiezas: boolean;
    usaGalgas: boolean;
    labelMaterial: string;
    tiposMaterial: string[];
    unidad: string;
}

export const PROCESOS_CONSUMO: ProcesoConsumoConfig[] = [
    {
        key: 'pintura_ms',
        nombre: 'Pintura MS',
        nombreCorto: 'Pintura MS',
        planta: 'MS',
        plantaNombre: 'Mármol Sintético',
        soportaCicloDosPiezas: true,
        usaGalgas: true,
        labelMaterial: 'Color / Tipo Gelcoat',
        tiposMaterial: ['BLANCO', 'NEGRO', 'GRIS', 'NATURAL', 'COLOR'],
        unidad: 'kg'
    },
    {
        key: 'vaciado_ms',
        nombre: 'Vaciado MS',
        nombreCorto: 'Vaciado MS',
        planta: 'MS',
        plantaNombre: 'Mármol Sintético',
        soportaCicloDosPiezas: false,
        usaGalgas: false,
        labelMaterial: 'Tipo de Resina',
        tiposMaterial: ['ULTRACASTER', 'ADM', 'CARGADA', 'OTRA'],
        unidad: 'kg'
    },
    {
        key: 'pintura_fv',
        nombre: 'Pintura FV',
        nombreCorto: 'Pintura FV',
        planta: 'FV',
        plantaNombre: 'Fibra de Vidrio',
        soportaCicloDosPiezas: false,
        usaGalgas: true,
        labelMaterial: 'Tipo / Color Gelcoat',
        tiposMaterial: ['BLANCO', 'COLOR', 'NATURAL'],
        unidad: 'kg'
    },
    {
        key: 'vaciado_fv',
        nombre: 'Vaciado FV',
        nombreCorto: 'Vaciado FV',
        planta: 'FV',
        plantaNombre: 'Fibra de Vidrio',
        soportaCicloDosPiezas: false,
        usaGalgas: true,
        labelMaterial: 'Tipo de Resina',
        tiposMaterial: ['VIRGEN', 'CARGADA', 'BLANCO'],
        unidad: 'kg'
    },
    {
        key: 'masilla_fv',
        nombre: 'Masilla FV',
        nombreCorto: 'Masilla FV',
        planta: 'FV',
        plantaNombre: 'Fibra de Vidrio',
        soportaCicloDosPiezas: false,
        usaGalgas: false,
        labelMaterial: 'Tipo de Masilla',
        tiposMaterial: ['MASILLA', 'CARGADA', 'OTRA'],
        unidad: 'kg'
    }
];

export interface RegistroConsumo {
    id: number;
    created_at: string;
    fecha: string; // YYYY-MM-DD
    planta: 'MS' | 'FV';
    proceso: ProcesoConsumoKey;
    tipo_resina: string | null;
    es_ciclo_dos_piezas: boolean;
    referencia: string;
    peso_sap: number;
    referencia_2: string | null;
    peso_sap_2: number | null;
    peso_sap_total: number;
    peso_real: number;
    peso_real_2: number | null;
    diferencia: number;
    porcentaje_variacion: number | null;
    galga_pared: number | null;
    galga_piso: number | null;
    operario: string | null;
    observaciones: string | null;
    registrado_por: string | null;
}

export interface ReferenciaSapSugerencia {
    referencia: string;
    sku?: string | null;
    pesoSapResina?: number | null;
    pesoSapGelcoat?: number | null;
    pesoSapMasilla?: number | null;
    tipoResina?: string | null;
    planta: 'MS' | 'FV';
    origen: 'sap' | 'historial';
}

export function hoyBogotaYMD(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/**
 * Carga únicamente los productos con SKU oficial desde SAP (productos_fv_pesos para FV).
 * No mezcla nombres manuales del histórico: todas las referencias se manejan por SKU oficial de SAP.
 */
export async function cargarSugerenciasReferencias(): Promise<{
    fv: ReferenciaSapSugerencia[];
    ms: ReferenciaSapSugerencia[];
}> {
    const fvList: ReferenciaSapSugerencia[] = [];

    try {
        const { data, error } = await supabase
            .from('productos_fv_pesos')
            .select(
                'producto_sku, producto_descripcion, resina_banera_kg, resina_banera_tipo, gelcoat_banera_kg, resina_faldon_kg, resina_faldon_tipo, gelcoat_faldon_kg'
            )
            .is('error', null)
            .order('producto_descripcion', { ascending: true })
            .limit(1500);

        if (!error && data) {
            for (const row of data as any[]) {
                const sku = String(row.producto_sku || '').trim();
                const desc = String(row.producto_descripcion || '').trim();
                if (!sku || !desc) continue;
                fvList.push({
                    referencia: desc,
                    sku,
                    pesoSapResina:
                        row.resina_banera_kg != null
                            ? Number(row.resina_banera_kg)
                            : row.resina_faldon_kg != null
                            ? Number(row.resina_faldon_kg)
                            : null,
                    pesoSapGelcoat:
                        row.gelcoat_banera_kg != null
                            ? Number(row.gelcoat_banera_kg)
                            : row.gelcoat_faldon_kg != null
                            ? Number(row.gelcoat_faldon_kg)
                            : null,
                    tipoResina: row.resina_banera_tipo
                        ? String(row.resina_banera_tipo).toUpperCase()
                        : row.resina_faldon_tipo
                        ? String(row.resina_faldon_tipo).toUpperCase()
                        : null,
                    planta: 'FV',
                    origen: 'sap'
                });
            }
        }
    } catch (err) {
        console.warn('Error cargando catálogo SKU de FV:', err);
    }

    return {
        fv: fvList,
        ms: []
    };
}

export async function cargarConsumos(): Promise<RegistroConsumo[]> {
    const { data, error } = await supabase
        .from('calidad_consumos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Error cargando calidad_consumos:', error);
        return [];
    }
    return (data || []) as RegistroConsumo[];
}
