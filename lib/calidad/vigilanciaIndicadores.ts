import { supabase } from '@/lib/supabase';
import { PlantaVigilanciaKey } from '@/components/calidad/vigilancia/types';

export interface ItemVigilanciaMeta {
    columna: string;
    nombre: string;
    descripcion?: string;
    categoria?: string;
}

export interface ProcesoVigilanciaMeta {
    id: string;
    nombre: string;
    tabla: string;
    plantaKey: PlantaVigilanciaKey;
    items: ItemVigilanciaMeta[];
}

export const CATALOGO_ITEMS_VIGILANCIA: ProcesoVigilanciaMeta[] = [
    // --- 1. MÁRMOL SINTÉTICO (MS) ---
    {
        id: 'pintura_ms',
        nombre: 'Pintura MS',
        tabla: 'pv_pintura_ms',
        plantaKey: 'ms',
        items: [
            { columna: 'bolsa_pinada', nombre: 'Bolsa Pinada', descripcion: 'Bolsa debidamente pinada sin fugas' },
            { columna: 'aspas_sin_mucha_acum', nombre: 'Aspas sin Acumulación', descripcion: 'Aspas limpias sin exceso de material' },
            { columna: 'uso_galga', nombre: 'Uso de Galga', descripcion: 'Operario usa la galga de espesores' },
            { columna: 'galga_en_buen_estado', nombre: 'Galga en Buen Estado', descripcion: 'Galga calibrada y sin deformaciones' },
            { columna: 'conteo_galguiar', nombre: 'Conteo al Galguiar', descripcion: 'Verificación del conteo al medir' },
            { columna: 'cera_glass', nombre: 'Cera Glass', descripcion: 'Aplicación correcta de cera glass' },
            { columna: 'guia_tornillos', nombre: 'Guía de Tornillos', descripcion: 'Uso de la guía para tornillos' },
            { columna: 'puesta_punto', nombre: 'Puesta a Punto', descripcion: 'Puesta a punto de cabina validada' }
        ]
    },
    {
        id: 'vaciado_ms',
        nombre: 'Vaciado MS',
        tabla: 'pv_vaciado_ms',
        plantaKey: 'ms',
        items: [
            { columna: 'peso_ok', nombre: 'Peso de Pieza', descripcion: 'Peso de la pieza dentro del estándar técnico' },
            { columna: 'cera_glass', nombre: 'Cera Glass en Molde', descripcion: 'Aplicación de cera glass en el molde' },
            { columna: 'estado_contramolde', nombre: 'Estado de Contramolde', descripcion: 'Contramolde en condiciones óptimas' },
            { columna: 'hoja_reporte_contramolde', nombre: 'Hoja Reporte Contramolde', descripcion: 'Diligenciamiento de la hoja de reporte' },
            { columna: 'resina_ultracaster', nombre: 'Resina Ultracaster', descripcion: 'Uso correcto de resina Ultracaster' },
            { columna: 'catalizador_AC50', nombre: 'Catalizador AC50', descripcion: 'Uso correcto de catalizador AC50' },
            { columna: 'puesta_punto', nombre: 'Puesta a Punto Vaciado', descripcion: 'Puesta a punto verificada' },
            { columna: 'carbonato_buen_estado', nombre: 'Carbonato en Buen Estado', descripcion: 'Carga de carbonato sin humedad' },
            { columna: 'cobalto_bien_tapado', nombre: 'Cobalto Bien Tapado', descripcion: 'Recipiente de cobalto herméticamente cerrado' },
            { columna: 'vaselina_acpm', nombre: 'Vaselina con ACPM', descripcion: 'Mezcla y aplicación adecuada' },
            { columna: 'vibrador_encendido', nombre: 'Vibrador Encendido', descripcion: 'Operación con vibrador encendido' },
            { columna: 'cronometro', nombre: 'Uso de Cronómetro', descripcion: 'Monitoreo de tiempo de gel con cronómetro' }
        ]
    },
    {
        id: 'inspeccion_ms',
        nombre: 'Inspección MS',
        tabla: 'pv_inspeccion_ms',
        plantaKey: 'ms',
        items: [
            { columna: 'galga_lvr', nombre: 'Galga LVR', descripcion: 'Espesores verificados con galga LVR' },
            { columna: 'nivel', nombre: 'Nivel', descripcion: 'Nivelación de la pieza correcta' },
            { columna: 'pandeo', nombre: 'Control de Pandeo', descripcion: 'Ausencia de pandeo en mesones y lavamanos' },
            { columna: 'palo_descubrir_burbujas', nombre: 'Palo Descubrir Burbujas', descripcion: 'Uso de herramienta para detectar burbujas' },
            { columna: 'pinta_garantia_flautas', nombre: 'Pinta Garantía en Flautas', descripcion: 'Pinta de garantía aplicada en flautas' },
            { columna: 'guia_plantillas_mesones', nombre: 'Guía y Plantillas Mesones', descripcion: 'Uso de plantillas guía en mesones' },
            { columna: 'pieza_despique_pestaña', nombre: 'Pestaña sin Despiques', descripcion: 'Inspección de bordes y pestañas' },
            { columna: 'marcar_etiqueta', nombre: 'Marcación de Etiqueta', descripcion: 'Etiqueta marcada según estándar' },
            { columna: 'tapa_desagues_pegados_correctos', nombre: 'Tapa Desagües Pegados', descripcion: 'Tapa desagües fijados correctamente' },
            { columna: 'etiqueta_correcta', nombre: 'Etiqueta Correcta', descripcion: 'Correspondencia con la orden y referencia' },
            { columna: 'etiqueta_bien_puesta', nombre: 'Etiqueta Bien Pegada', descripcion: 'Fijación firme y recta' },
            { columna: 'empaque_honeycomb', nombre: 'Empaque Honeycomb', descripcion: 'Protección con empaque tipo Honeycomb' }
        ]
    },
    {
        id: 'otros_ms',
        nombre: 'Otros Procesos MS',
        tabla: 'pv_otros_ms',
        plantaKey: 'ms',
        items: [
            { columna: 'espatula_filo', nombre: 'Espátula con Filo', descripcion: 'Herramienta de desmolde en buen estado' },
            { columna: 'cepillo_cerdas', nombre: 'Cepillo de Cerdas', descripcion: 'Cepillo de limpieza adecuado' },
            { columna: 'contramolde_sin_exceso', nombre: 'CM sin Exceso de Material', descripcion: 'Contramolde libre de residuos' },
            { columna: 'malla_gallinero', nombre: 'Malla de Gallinero', descripcion: 'Uso de malla de refuerzo' },
            { columna: 'her_insp_lvm', nombre: 'Herramienta Insp. LVM', descripcion: 'Herramienta de inspección lavamanos' },
            { columna: 'her_insp_mesones', nombre: 'Herramienta Insp. Mesones', descripcion: 'Herramienta de inspección mesones' },
            { columna: 'her_sacar_mesones', nombre: 'Herramienta Sacar Mesones', descripcion: 'Dispositivo extractor de mesones' },
            { columna: 'her_sacar_lvm', nombre: 'Herramienta Sacar LVM', descripcion: 'Dispositivo extractor de lavamanos' },
            { columna: 'etiqueta_pegada', nombre: 'Etiqueta Pegada', descripcion: 'Etiqueta colocada en la pieza' },
            { columna: 'marcar_desague', nombre: 'Marcar Desagüe', descripcion: 'Marcación del orificio de desagüe' },
            { columna: 'buen_acabado', nombre: 'Buen Acabado Tapa Huecos', descripcion: 'Acabado liso y sin resaltos' },
            { columna: 'palo_descubrir_burbujas', nombre: 'Palo Burbujas Tapa Huecos', descripcion: 'Uso de palillo detector de burbujas' },
            { columna: 'puesta_punto', nombre: 'Puesta a Punto Desmolde', descripcion: 'Validación de puesta a punto' },
            { columna: 'durometro', nombre: 'Control con Durómetro', descripcion: 'Medición de dureza Barcol' },
            { columna: 'pulidora_con_lija', nombre: 'Pulidora con Lija', descripcion: 'Pulidora con grano de lija especificado' },
            { columna: 'piezas_adecuadas_estanteria', nombre: 'Almacenamiento en Estantería', descripcion: 'Posicionamiento correcto en estanterías' },
            { columna: 'pesas_guia', nombre: 'Uso de Pesas Guía', descripcion: 'Pesas patrón y guía utilizadas' },
            { columna: 'rasqueta', nombre: 'Uso de Rasqueta', descripcion: 'Rasqueta en filo y condiciones aptas' },
            { columna: 'uso_rotoflex', nombre: 'Uso de Rotoflex', descripcion: 'Herramienta rotativa utilizada correctamente' },
            { columna: 'puesta_punto_pulido', nombre: 'Puesta a Punto Pulido', descripcion: 'Condiciones de pulido validadas' },
            { columna: 'guia_perforacion_flauta', nombre: 'Guía Perforación Flauta', descripcion: 'Uso de guía en perforación' },
            { columna: 'guia_quadratto_48', nombre: 'Guía Quadratto 48', descripcion: 'Plantilla Quadratto 48' },
            { columna: 'guia_quadratto_63', nombre: 'Guía Quadratto 63', descripcion: 'Plantilla Quadratto 63' },
            { columna: 'guia_quadratto_79', nombre: 'Guía Quadratto 79', descripcion: 'Plantilla Quadratto 79' },
            { columna: 'guia_quadratto_94', nombre: 'Guía Quadratto 94', descripcion: 'Plantilla Quadratto 94' }
        ]
    },

    // --- 2. FIBRA DE VIDRIO (FV) ---
    {
        id: 'pintura_fv',
        nombre: 'Pintura FV',
        tabla: 'pv_pintura_fv',
        plantaKey: 'fv',
        items: [
            { columna: 'Uso_Galga', nombre: 'Uso de Galga', descripcion: 'Operario mide espesor de gelcoat' },
            { columna: 'Galga_Buen_Estado', nombre: 'Galga en Buen Estado', descripcion: 'Galga limpia y sin dientes mellados' },
            { columna: 'peso_ok', nombre: 'Peso Gelcoat en Rango', descripcion: 'Cantidad y peso de pintura aplicado' }
        ]
    },
    {
        id: 'vaciado_fv',
        nombre: 'Vaciado FV',
        tabla: 'pv_vaciado_fv',
        plantaKey: 'fv',
        items: [
            { columna: 'peso_OK', nombre: 'Peso de Tina en Rango', descripcion: 'Peso de la tina dentro de tolerancia' },
            { columna: 'filtro_limpio', nombre: 'Filtro de Resina Limpio', descripcion: 'Filtros libres de impurezas y grumos' },
            { columna: 'se_uso_matt', nombre: 'Uso de Matt', descripcion: 'Colocación adecuada de velo/matt de refuerzo' },
            { columna: 'rodillos_completos', nombre: 'Rodillos Completos', descripcion: 'Disponibilidad de rodillos desaireadores' },
            { columna: 'rodillos_limpios', nombre: 'Rodillos Limpios', descripcion: 'Rodillos sin acumulación de resina curada' },
            { columna: 'tarro_catalizador_limpio', nombre: 'Tarro Catalizador Limpio', descripcion: 'Envase dosificador limpio' },
            { columna: 'resina_3835', nombre: 'Resina 3835', descripcion: 'Uso de resina certificada 3835' },
            { columna: 'catalizador_LPT', nombre: 'Catalizador LPT', descripcion: 'Uso de catalizador LPT especificado' }
        ]
    },
    {
        id: 'inspeccion_fv',
        nombre: 'Inspección FV',
        tabla: 'pv_inspeccion_fv',
        plantaKey: 'fv',
        items: [
            { columna: 'caja_accesorios_cinta_seguridad', nombre: 'Cinta de Seguridad Caja', descripcion: 'Caja sellada con cinta de seguridad' },
            { columna: 'caja_accesorios_completa', nombre: 'Caja Accesorios Completa', descripcion: 'Kit completo de herrajes y manuales' },
            { columna: 'galga_espesores', nombre: 'Galga de Espesores', descripcion: 'Inspección de espesor en bordes y piso' },
            { columna: 'inspeccion_espejo', nombre: 'Inspección con Espejo', descripcion: 'Revisión inferior con espejo de inspección' },
            { columna: 'desague_rubor', nombre: 'Desagüe y Rubor', descripcion: 'Boca de desagüe limpia y sin rebaba' }
        ]
    },

    // --- 3. MUEBLES (MBL) ---
    {
        id: 'corte_mbl',
        nombre: 'Corte Muebles',
        tabla: 'pv_corte_mbl',
        plantaKey: 'muebles',
        items: [
            { columna: 'estado_disco', nombre: 'Estado de Disco', descripcion: 'Disco afilado sin desportilladuras' },
            { columna: 'dimensiones_hoja_ruta', nombre: 'Dimensiones Hoja de Ruta', descripcion: 'Medidas exactas según plano y ruta' },
            { columna: 'uso_app', nombre: 'Uso de App', descripcion: 'Registro en sistema o App de control' }
        ]
    },
    {
        id: 'enchape_mbl',
        nombre: 'Enchape Muebles',
        tabla: 'pv_enchape_mbl',
        plantaKey: 'muebles',
        items: [
            { columna: 'cantos_pegados', nombre: 'Adherencia de Cantos', descripcion: 'Canto totalmente adherido sin burbujas' },
            { columna: 'loctite', nombre: 'Aplicación de Adhesivo', descripcion: 'Uso de Loctite / adhesivo en uniones' },
            { columna: 'color_canto', nombre: 'Tono / Color de Canto', descripcion: 'Color y textura coinciden con la melamina' },
            { columna: 'pinta_garantia_medida', nombre: 'Pinta Garantía y Medida', descripcion: 'Trazabilidad y sello de garantía' }
        ]
    },
    {
        id: 'taladros',
        nombre: 'Taladros Muebles',
        tabla: 'pv_taladros',
        plantaKey: 'muebles',
        items: [
            { columna: 'ranuras', nombre: 'Ranurado Correcto', descripcion: 'Ranuras en profundidad y ancho especificado' },
            { columna: 'ingresa_lado_correcto', nombre: 'Lado de Ingreso Correcto', descripcion: 'Orientación de la pieza al ingresar' },
            { columna: 'revisan_medidas', nombre: 'Revisión de Medidas', descripcion: 'Medición sistemática de centros de huecos' },
            { columna: 'chulea_hoja_ruta', nombre: 'Chuleo Hoja de Ruta', descripcion: 'Marcación de pasos completados' },
            { columna: 'flexometro', nombre: 'Uso de Flexómetro', descripcion: 'Uso de instrumento de medición calibrado' },
            { columna: 'pinta_garantia', nombre: 'Pinta de Garantía', descripcion: 'Sello / marca de control aplicada' },
            { columna: 'uso_app', nombre: 'Uso de App', descripcion: 'Registro en sistema de trazabilidad' },
            { columna: 'pieza_patron_taladro', nombre: 'Pieza Patrón de Taladro', descripcion: 'Comparación física con pieza patrón' },
            { columna: 'puesta_punto', nombre: 'Puesta a Punto Taladros', descripcion: 'Puesta a punto de brocas y topes' }
        ]
    },
    {
        id: 'inspeccion_mbl',
        nombre: 'Inspección Muebles',
        tabla: 'pv_inspeccion_mbl',
        plantaKey: 'muebles',
        items: [
            { columna: 'etiqueta_vs_instructivo', nombre: 'Etiqueta vs Instructivo', descripcion: 'Coincidencia de plano e instructivo' },
            { columna: 'chulear_perforaciones', nombre: 'Chulear Perforaciones', descripcion: 'Verificación de todas las perforaciones' },
            { columna: 'chulear_kitting', nombre: 'Chulear Kitting', descripcion: 'Chequeo de bolsa de herrajes' },
            { columna: 'kitting_completo', nombre: 'Kitting Completo', descripcion: 'Tornillería, tarugos y correderas completas' },
            { columna: 'resaltar_piezas', nombre: 'Resaltar Piezas', descripcion: 'Identificación de partes en lista de empaque' },
            { columna: 'sello_calidad', nombre: 'Sello de Calidad', descripcion: 'Estampado de sello de liberación de calidad' }
        ]
    },
    {
        id: 'otros_mbl',
        nombre: 'Otros Muebles',
        tabla: 'pv_otros_mbl',
        plantaKey: 'muebles',
        items: [
            { columna: 'LM_vs_kitting', nombre: 'Lista Materiales vs Kitting', descripcion: 'Conciliación de lista de materiales' },
            { columna: 'listado_vs_fabricado', nombre: 'Listado vs Fabricado', descripcion: 'Cotejo de piezas cortadas vs orden' },
            { columna: 'firma_en_piezas', nombre: 'Firma en Piezas', descripcion: 'Rúbrica de control del operario' },
            { columna: 'reponer_piezas', nombre: 'Gestión Reponer Piezas', descripcion: 'Procedimiento de piezas defectuosas' }
        ]
    },

    // --- 4. CEFI ---
    {
        id: 'corte_cefi',
        nombre: 'Corte CEFI',
        tabla: 'pv_corte_cefi',
        plantaKey: 'cefi',
        items: [
            { columna: 'estado_disco', nombre: 'Estado de Disco', descripcion: 'Disco sin astillamiento en melamina' },
            { columna: 'dimensiones_hoja_ruta', nombre: 'Dimensiones Hoja de Ruta', descripcion: 'Escuadra y medidas de corte conformes' }
        ]
    },
    {
        id: 'enchape_cefi',
        nombre: 'Enchape CEFI',
        tabla: 'pv_enchape_cefi',
        plantaKey: 'cefi',
        items: [
            { columna: 'cantos_pegados', nombre: 'Cantos Adheridos', descripcion: 'Adhesión firme y sin filos cortantes' },
            { columna: 'color_canto', nombre: 'Color de Canto', descripcion: 'Tono exacto para zócalo o moldura' }
        ]
    },
    {
        id: 'otros_cefi',
        nombre: 'Otros Parámetros CEFI',
        tabla: 'pv_otros_cefi',
        plantaKey: 'cefi',
        items: [
            { columna: 'inspec_tarugo', nombre: 'Inspección de Tarugo', descripcion: 'Alineación y pegado de tarugos' },
            { columna: 'revisan_medidas', nombre: 'Revisión de Medidas', descripcion: 'Control dimensional rutinario' },
            { columna: 'flexometro', nombre: 'Uso de Flexómetro', descripcion: 'Medición con flexómetro' },
            { columna: 'etiqueta_vs_instrucctivo', nombre: 'Etiqueta vs Instructivo', descripcion: 'Información de etiqueta verificada' },
            { columna: 'chulear_perforaciones', nombre: 'Chulear Perforaciones', descripcion: 'Perforaciones cotejadas al 100%' }
        ]
    },

    // --- 5. MOLDES (RMOLD) ---
    {
        id: 'moldes_general',
        nombre: 'Control de Moldes',
        tabla: 'pv_moldes',
        plantaKey: 'moldes',
        items: [
            { columna: 'pinesCentrados', nombre: 'Pines Centrados', descripcion: 'Pines de alineación en centro' },
            { columna: 'ceraGlass', nombre: 'Cera Glass en Molde', descripcion: 'Aplicación de cera desmoldante' },
            { columna: 'golpesCaidas', nombre: 'Sin Golpes ni Caídas', descripcion: 'Molde manipulado sin impactos' },
            { columna: 'defectoReparacion', nombre: 'Reporte a Reparación', descripcion: 'Reporte oportuno de defectos' },
            { columna: 'DejaCaerMolde', nombre: 'Sin Caídas por Tope', descripcion: 'Tope de línea opera correctamente' },
            { columna: 'golpesContramolde', nombre: 'Sin Golpes en CM', descripcion: 'Sin marcas de cincel o martillo en contramolde' },
            { columna: 'aplicaPlastilina', nombre: 'Aplica Plastilina', descripcion: 'Plastilina aplicada en despiques leves' },
            { columna: 'acumulacionCera', nombre: 'Sin Acumulación de Cera/Masa', descripcion: 'Superficie de molde limpia' },
            { columna: 'aplicaCeraGlass', nombre: 'Cera Glass en Contramolde', descripcion: 'Encerado parejo en contramolde' },
            { columna: 'Deformaciones', nombre: 'Sin Deformaciones Internas', descripcion: 'Geometría del contramolde intacta' },
            { columna: 'rebabas', nombre: 'Sin Rayar Pestaña / Rebabas', descripcion: 'Remoción de rebaba cuidadosa' },
            { columna: 'prensas', nombre: 'Sin Dejar Caer Prensas', descripcion: 'Prensas colocadas con suavidad' },
            { columna: 'RayaMolde', nombre: 'Desmonte sin Rayar', descripcion: 'Extracción sin rayar la cavidad' },
            { columna: 'golpesMoldes', nombre: 'Sin Golpes al Colocar CM', descripcion: 'Ensamble de contramolde suave' },
            { columna: 'rayaEspatula', nombre: 'Sin Rayar con Espátula', descripcion: 'Uso cuidadoso de la espátula de desmolde' },
            { columna: 'objetosDentro', nombre: 'Sin Objetos Dentro de Molde', descripcion: 'Banda y cavidad libre de cuerpos extraños' }
        ]
    }
];

// Estructura de resultados calculados
export interface CumplimientoItemResult {
    columna: string;
    nombre: string;
    descripcion?: string;
    totalEvaluaciones: number;
    cumplen: number;
    noCumplen: number;
    porcentaje: number;
    estado: 'excelente' | 'alerta' | 'critico';
}

export interface CumplimientoProcesoResult {
    id: string;
    nombre: string;
    tabla: string;
    plantaKey: PlantaVigilanciaKey;
    totalRegistros: number;
    totalChequeos: number;
    chequeosCumplen: number;
    porcentaje: number;
    estado: 'excelente' | 'alerta' | 'critico';
    items: CumplimientoItemResult[];
}

export interface CumplimientoPlantaResult {
    plantaKey: PlantaVigilanciaKey;
    nombre: string;
    codigoOficial: string;
    totalRegistros: number;
    totalChequeos: number;
    chequeosCumplen: number;
    porcentaje: number;
    estado: 'excelente' | 'alerta' | 'critico';
    procesos: CumplimientoProcesoResult[];
}

export interface TendenciaPunto {
    fecha: string;
    porcentaje: number;
    total: number;
}

export interface DashboardVigilanciaData {
    cumplimientoGlobal: number;
    totalAuditorias: number;
    totalChequeos: number;
    totalChequeosCumplen: number;
    itemsEnAlerta: number;
    plantas: CumplimientoPlantaResult[];
    puntosCriticos: (CumplimientoItemResult & { proceso: string; planta: string })[];
    mejoresItems: (CumplimientoItemResult & { proceso: string; planta: string })[];
    tendenciaTemporal: TendenciaPunto[];
}

export const PLANTA_NOMBRES: Record<PlantaVigilanciaKey, { nombre: string; codigo: string }> = {
    ms: { nombre: 'Mármol Sintético', codigo: 'MS' },
    fv: { nombre: 'Fibra de Vidrio', codigo: 'FV' },
    muebles: { nombre: 'Muebles', codigo: 'MBL' },
    cefi: { nombre: 'CEFI', codigo: 'CEFI' },
    moldes: { nombre: 'Moldes', codigo: 'RMOLD' }
};

export function clasificarSemaforo(porcentaje: number): 'excelente' | 'alerta' | 'critico' {
    if (porcentaje >= 90) return 'excelente';
    if (porcentaje >= 85) return 'alerta';
    return 'critico';
}

/**
 * Consulta y procesa los indicadores de cumplimiento de cada item en todas las plantas.
 * Soporta filtrado opcional por días (ej: 7, 30, o null para todo el historial).
 */
export async function cargarIndicadoresVigilancia(diasFiltro?: number | null): Promise<DashboardVigilanciaData> {
    const fechaLimite = diasFiltro
        ? new Date(Date.now() - diasFiltro * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // Consultar todas las tablas en paralelo
    const resultadosPorProceso: CumplimientoProcesoResult[] = await Promise.all(
        CATALOGO_ITEMS_VIGILANCIA.map(async (proc) => {
            try {
                let query = supabase.from(proc.tabla).select('*');
                if (fechaLimite) {
                    query = query.gte('created_at', fechaLimite);
                }
                const { data, error } = await query;
                if (error || !data || data.length === 0) {
                    const emptyItems = proc.items.map((it) => ({
                        columna: it.columna,
                        nombre: it.nombre,
                        descripcion: it.descripcion,
                        totalEvaluaciones: 0,
                        cumplen: 0,
                        noCumplen: 0,
                        porcentaje: 100,
                        estado: 'excelente' as const
                    }));
                    return {
                        id: proc.id,
                        nombre: proc.nombre,
                        tabla: proc.tabla,
                        plantaKey: proc.plantaKey,
                        totalRegistros: 0,
                        totalChequeos: 0,
                        chequeosCumplen: 0,
                        porcentaje: 100,
                        estado: 'excelente' as const,
                        items: emptyItems
                    };
                }

                const totalRegistros = data.length;
                let sumChequeos = 0;
                let sumCumplen = 0;

                const itemsCalculados: CumplimientoItemResult[] = proc.items.map((itemMeta) => {
                    let cumplenCount = 0;
                    let totalItemEval = 0;

                    for (const row of data) {
                        const val = row[itemMeta.columna];
                        if (val !== undefined && val !== null) {
                            totalItemEval++;
                            if (val === true || val === 1 || val === 'true') {
                                cumplenCount++;
                            }
                        }
                    }

                    const pct = totalItemEval > 0 ? (cumplenCount / totalItemEval) * 100 : 100;
                    sumChequeos += totalItemEval;
                    sumCumplen += cumplenCount;

                    return {
                        columna: itemMeta.columna,
                        nombre: itemMeta.nombre,
                        descripcion: itemMeta.descripcion,
                        totalEvaluaciones: totalItemEval,
                        cumplen: cumplenCount,
                        noCumplen: totalItemEval - cumplenCount,
                        porcentaje: Number(pct.toFixed(1)),
                        estado: clasificarSemaforo(pct)
                    };
                });

                const procPct = sumChequeos > 0 ? (sumCumplen / sumChequeos) * 100 : 100;

                return {
                    id: proc.id,
                    nombre: proc.nombre,
                    tabla: proc.tabla,
                    plantaKey: proc.plantaKey,
                    totalRegistros,
                    totalChequeos: sumChequeos,
                    chequeosCumplen: sumCumplen,
                    porcentaje: Number(procPct.toFixed(1)),
                    estado: clasificarSemaforo(procPct),
                    items: itemsCalculados
                };
            } catch (err) {
                console.warn(`Error procesando tabla ${proc.tabla}:`, err);
                return {
                    id: proc.id,
                    nombre: proc.nombre,
                    tabla: proc.tabla,
                    plantaKey: proc.plantaKey,
                    totalRegistros: 0,
                    totalChequeos: 0,
                    chequeosCumplen: 0,
                    porcentaje: 100,
                    estado: 'excelente' as const,
                    items: proc.items.map((it) => ({
                        columna: it.columna,
                        nombre: it.nombre,
                        descripcion: it.descripcion,
                        totalEvaluaciones: 0,
                        cumplen: 0,
                        noCumplen: 0,
                        porcentaje: 100,
                        estado: 'excelente' as const
                    }))
                };
            }
        })
    );

    // Agrupar por planta
    const plantKeys: PlantaVigilanciaKey[] = ['ms', 'fv', 'muebles', 'cefi', 'moldes'];
    const plantasResult: CumplimientoPlantaResult[] = plantKeys.map((pKey) => {
        const procesosPlanta = resultadosPorProceso.filter((p) => p.plantaKey === pKey);
        const totalRegistros = procesosPlanta.reduce((acc, p) => acc + p.totalRegistros, 0);
        const totalChequeos = procesosPlanta.reduce((acc, p) => acc + p.totalChequeos, 0);
        const chequeosCumplen = procesosPlanta.reduce((acc, p) => acc + p.chequeosCumplen, 0);
        const pct = totalChequeos > 0 ? (chequeosCumplen / totalChequeos) * 100 : 100;

        return {
            plantaKey: pKey,
            nombre: PLANTA_NOMBRES[pKey].nombre,
            codigoOficial: PLANTA_NOMBRES[pKey].codigo,
            totalRegistros,
            totalChequeos,
            chequeosCumplen,
            porcentaje: Number(pct.toFixed(1)),
            estado: clasificarSemaforo(pct),
            procesos: procesosPlanta
        };
    });

    // Indicadores globales consolidados
    const totalAuditorias = plantasResult.reduce((acc, p) => acc + p.totalRegistros, 0);
    const totalChequeosGlobal = plantasResult.reduce((acc, p) => acc + p.totalChequeos, 0);
    const totalCumplenGlobal = plantasResult.reduce((acc, p) => acc + p.chequeosCumplen, 0);
    const cumplimientoGlobal =
        totalChequeosGlobal > 0 ? Number(((totalCumplenGlobal / totalChequeosGlobal) * 100).toFixed(1)) : 100;

    // Lista plana de todos los items para Pareto y puntos críticos
    const allItemsFlattened: (CumplimientoItemResult & { proceso: string; planta: string })[] = [];
    for (const pl of plantasResult) {
        for (const pr of pl.procesos) {
            for (const it of pr.items) {
                if (it.totalEvaluaciones > 0) {
                    allItemsFlattened.push({
                        ...it,
                        proceso: pr.nombre,
                        planta: pl.nombre
                    });
                }
            }
        }
    }

    // Puntos críticos: ordenar por menor cumplimiento
    const puntosCriticos = [...allItemsFlattened]
        .filter((it) => it.porcentaje < 90)
        .sort((a, b) => a.porcentaje - b.porcentaje)
        .slice(0, 10);

    // Mejores items: mayor cumplimiento con al menos 10 evaluaciones
    const mejoresItems = [...allItemsFlattened]
        .filter((it) => it.totalEvaluaciones >= 5)
        .sort((a, b) => b.porcentaje - a.porcentaje)
        .slice(0, 10);

    const itemsEnAlerta = allItemsFlattened.filter((it) => it.porcentaje < 85).length;

    return {
        cumplimientoGlobal,
        totalAuditorias,
        totalChequeos: totalChequeosGlobal,
        totalChequeosCumplen: totalCumplenGlobal,
        itemsEnAlerta,
        plantas: plantasResult,
        puntosCriticos,
        mejoresItems,
        tendenciaTemporal: []
    };
}
