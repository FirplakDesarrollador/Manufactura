// Calidad General Plantas - IFI (MS, MBL, CEFI, FV, RTM)
//
// Resultado de un día = Σ peso_efectivo × mín(calidad / meta, 100%)
//   peso_efectivo = peso de la planta ÷ suma de pesos de las plantas con dato ese día
//   (si solo reporta una planta, esa planta pesa 100% y su cumplimiento es el de Firplak).
// Resultado del mes = promedio de los resultados diarios.

export type PlantaIfi = 'MS' | 'MBL' | 'CEFI' | 'FV' | 'RTM';

export interface PlantaIfiConfig {
    codigo: PlantaIfi;
    nombre: string;
    peso: number; // 0..1
    meta: number; // 0..1
    orden: number;
}

// Valores por defecto (iguales a calidad_ifi_plantas en calidad_ifi_general.sql)
export const PLANTAS_IFI_DEFAULT: PlantaIfiConfig[] = [
    { codigo: 'MS', nombre: 'Mármol Sintético', peso: 0.55, meta: 0.9, orden: 1 },
    { codigo: 'MBL', nombre: 'Muebles', peso: 0.27, meta: 0.95, orden: 2 },
    { codigo: 'CEFI', nombre: 'CEFI', peso: 0.13, meta: 0.95, orden: 3 },
    { codigo: 'FV', nombre: 'Fibra de Vidrio', peso: 0.03, meta: 0.35, orden: 4 },
    { codigo: 'RTM', nombre: 'Quarzstone (RTM)', peso: 0.02, meta: 0.7, orden: 5 }
];

// Plantas cuyo dato diario se digita en la app (MS y FV se calculan desde su fuente)
export const PLANTAS_IFI_MANUALES: PlantaIfi[] = ['MBL', 'CEFI', 'RTM'];

export interface DetallePlantaIfi {
    codigo: PlantaIfi;
    calidad: number; // 0..1
    meta: number;
    pesoEfectivo: number; // 0..1, ya redistribuido entre las plantas con dato
    cumplimiento: number; // 0..1, mín(calidad/meta, 1)
    aporte: number; // pesoEfectivo × cumplimiento
}

export interface ResultadoIfi {
    ifi: number | null; // 0..1, null si ninguna planta tiene dato
    detalle: DetallePlantaIfi[];
}

export function calcularIfiGeneral(
    valores: Partial<Record<PlantaIfi, number | null | undefined>>,
    plantas: PlantaIfiConfig[] = PLANTAS_IFI_DEFAULT
): ResultadoIfi {
    const conDato = plantas.filter(p => typeof valores[p.codigo] === 'number' && !Number.isNaN(valores[p.codigo]));
    const sumaPesos = conDato.reduce((acc, p) => acc + p.peso, 0);
    if (conDato.length === 0 || sumaPesos <= 0) return { ifi: null, detalle: [] };

    const detalle = conDato.map(p => {
        const calidad = valores[p.codigo] as number;
        const pesoEfectivo = p.peso / sumaPesos;
        const cumplimiento = Math.min(calidad / p.meta, 1);
        return { codigo: p.codigo, calidad, meta: p.meta, pesoEfectivo, cumplimiento, aporte: pesoEfectivo * cumplimiento };
    });

    return { ifi: detalle.reduce((acc, d) => acc + d.aporte, 0), detalle };
}

export const promedio = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
