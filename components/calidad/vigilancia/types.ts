// Tipos y definiciones para el módulo Plan de Vigilancia (Calidad FIRPLAK)

export type PlantaVigilanciaKey = 'ms' | 'fv' | 'muebles' | 'cefi' | 'moldes';

export interface ProcesoVigilanciaInfo {
    id: string;
    nombre: string;
    tabla: string;
    descripcion?: string;
    icono?: string;
}

export interface PlantaVigilanciaConfig {
    key: PlantaVigilanciaKey;
    codigoOficial: string;
    nombre: string;
    subtitulo?: string;
    descripcion: string;
    procesos: ProcesoVigilanciaInfo[];
}

export const PLANTAS_VIGILANCIA: PlantaVigilanciaConfig[] = [
    {
        key: 'ms',
        codigoOficial: 'MS',
        nombre: 'Marmol Sintético',
        subtitulo: 'Planta Mármol Sintético',
        descripcion: 'Vigilancia en procesos de pintura, vaciado, inspección y parámetros de calidad en marmol.',
        procesos: [
            { id: 'pintura_ms', nombre: 'Pintura', tabla: 'pv_pintura_ms', descripcion: 'Control de abanico, presiones, catalizador, temperatura y galga' },
            { id: 'vaciado_ms', nombre: 'Vaciado', tabla: 'pv_vaciado_ms', descripcion: 'Control de cargas, resina, catalizador, gel y peso' },
            { id: 'inspeccion_ms', nombre: 'Inspección', tabla: 'pv_inspeccion_ms', descripcion: 'Verificación de galga, pandeo, burbujas y etiquetado' },
            { id: 'otros_ms', nombre: 'Otros', tabla: 'pv_otros_ms', descripcion: 'Desprensado, etiquetas, tapa huecos, desmolde y aux pulido' }
        ]
    },
    {
        key: 'fv',
        codigoOficial: 'FV',
        nombre: 'Fibra de Vidrio',
        subtitulo: 'Planta Fibra de Vidrio',
        descripcion: 'Vigilancia en pintura, vaciado por aspersión/chopper e inspección de tinas y complementos.',
        procesos: [
            { id: 'pintura_fv', nombre: 'Pintura', tabla: 'pv_pintura_fv', descripcion: 'Control de presiones, espesores de galga, lote y color' },
            { id: 'vaciado_fv', nombre: 'Vaciado', tabla: 'pv_vaciado_fv', descripcion: 'Control de resina, chopper, fibra, rodillos y filtros' },
            { id: 'inspeccion_fv', nombre: 'Inspección', tabla: 'pv_inspeccion_fv', descripcion: 'Accesorios, cintas de seguridad, galga de espesores y desague' }
        ]
    },
    {
        key: 'muebles',
        codigoOficial: 'MBL',
        nombre: 'Muebles',
        subtitulo: 'Planta de Mobiliario y Madera',
        descripcion: 'Vigilancia en procesos de corte computarizado, enchape de cantos, taladros e inspección final.',
        procesos: [
            { id: 'corte_mbl', nombre: 'Corte', tabla: 'pv_corte_mbl', descripcion: 'Velocidad de máquina, tableros, estado de disco y puesta a punto' },
            { id: 'enchape_mbl', nombre: 'Enchape', tabla: 'pv_enchape_mbl', descripcion: 'Espesor, velocidad, adherencia de cantos y color' },
            { id: 'taladros', nombre: 'Taladros', tabla: 'pv_taladros', descripcion: 'Ranuras, medidas, hoja de ruta, pieza patrón y puesta a punto' },
            { id: 'inspeccion_mbl', nombre: 'Inspección', tabla: 'pv_inspeccion_mbl', descripcion: 'Etiqueta vs instructivo, kitting y sello de calidad' },
            { id: 'otros_mbl', nombre: 'Otros Parámetros', tabla: 'pv_otros_mbl', descripcion: 'LM vs kitting, listado vs fabricado y firma de piezas' }
        ]
    },
    {
        key: 'cefi',
        codigoOficial: 'CEFI',
        nombre: 'CEFI',
        subtitulo: 'Centro de Fabricación Integrado',
        descripcion: 'Vigilancia en corte de zócalos/componentes, enchape e inspección operativa CEFI.',
        procesos: [
            { id: 'corte_cefi', nombre: 'Corte', tabla: 'pv_corte_cefi', descripcion: 'Velocidad, tableros, disco y dimensiones de ruta' },
            { id: 'enchape_cefi', nombre: 'Enchape', tabla: 'pv_enchape_cefi', descripcion: 'Espesor, velocidad, cantidad de cantos y adherencia' },
            { id: 'otros_cefi', nombre: 'Otros Parámetros', tabla: 'pv_otros_cefi', descripcion: 'Inspección tarugo, medidas, flexómetro y etiquetas' }
        ]
    },
    {
        key: 'moldes',
        codigoOficial: 'RMOLD',
        nombre: 'Moldes',
        subtitulo: 'Alistamiento e Inspección de Moldes',
        descripcion: 'Vigilancia sistemática en alistamiento, encerado, desprensado, desmolde y estado de moldes.',
        procesos: [
            { id: 'moldes_general', nombre: 'Control de Moldes', tabla: 'pv_moldes', descripcion: 'Pines centrados, cera glass, golpes, plastilina, rebabas y desmolde' }
        ]
    }
];

