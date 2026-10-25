// Criterios de aceptación y rechazo de calidad (tabla criterios_calidad_plantas)

export interface CriterioCalidad {
    id?: number;
    planta: string;
    codigo: string;
    defecto: string;
    foto?: string | null;
    fotos?: string[] | null; // hasta 5 fotos; `foto` es la principal (fotos[0])
    id_defecto_ms?: number | null; // vínculo con ms_defectos.id (solo planta Ms)
    responsable?: string | null;
    detectarlo?: string | null;
    evitarlo?: string | null;
    rojo?: string | null;
    naranja?: string | null;
    amarillo?: string | null;
    verde?: string | null;
    pct_max_dia?: number | null; // % máximo de piezas con el defecto permitido al día
    created_at?: string;
}

// Plantas con criterios. `codigo` es el valor de la columna `planta` en la base de datos.
export const PLANTAS_CRITERIOS: { codigo: string; sigla: string; nombre: string; titulo: string }[] = [
    { codigo: 'Ms', sigla: 'MS', nombre: 'Mármol Sintético', titulo: 'Criterios de Aceptación y Rechazo de Mármol Sintético (MS)' },
    { codigo: 'Fv', sigla: 'FV', nombre: 'Fibra de Vidrio', titulo: 'Criterios de Aceptación y Rechazo de Fibra de Vidrio (FV)' },
    { codigo: 'R moldes', sigla: 'RM', nombre: 'Revisión de Moldes', titulo: 'Criterios de Aceptación y Rechazo de Revisión de Moldes' },
    { codigo: 'Qznt', sigla: 'QZ', nombre: 'Quarzstone', titulo: 'Criterios de Aceptación y Rechazo de Quarzstone (QZ)' },
    { codigo: 'Mbles', sigla: 'MBL', nombre: 'Muebles', titulo: 'Criterios de Aceptación y Rechazo de Muebles (MBL)' },
    { codigo: 'Cefi', sigla: 'CEFI', nombre: 'Zócalos (CEFI)', titulo: 'Criterios de Aceptación y Rechazo de CEFI' }
];

export const plantaCriterios = (codigo: string) => PLANTAS_CRITERIOS.find(p => p.codigo === codigo) || PLANTAS_CRITERIOS[0];
