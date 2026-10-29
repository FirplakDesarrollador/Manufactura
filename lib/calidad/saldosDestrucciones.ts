// Saldos y destrucciones de producto no conforme (todas las plantas).
// Fuente provisional: hoja "DESTRUCCIONES-SALDOS" del Excel "NO CONFORMES OCTUBRE 2026" (Calidad),
// exportada a public/datos-locales/saldos-destrucciones.json. Ese archivo trae costos y NO se sube a GitHub
// (.gitignore): solo existe en el equipo donde se exportó. Más adelante: eventos de Calidad MS → Saldos (ms_reporte_defectos)
// con el costo del producto, y luego las demás plantas (FV, Muebles, CEFI, Cuarzo).

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
    costo: number; // $ del evento (cantidad × costo promedio del SKU)
}

export const NOMBRE_TIPO_SD: Record<TipoSD, string> = { saldo: 'Saldo', destruccion: 'Destrucción' };
export const COLOR_TIPO_SD: Record<TipoSD, string> = { saldo: '#10b981', destruccion: '#ef4444' };

// Carga los eventos del archivo local; si no existe (p. ej. en la página publicada) avisa sin romper el tablero
export async function cargarEventosSD(): Promise<EventoSD[]> {
    const resp = await fetch('/datos-locales/saldos-destrucciones.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('Los datos provisionales de saldos y destrucciones (Excel de No Conformes) solo están cargados en el equipo de Calidad. Pronto se tomarán automáticamente de Calidad MS.');
    return (await resp.json()) as EventoSD[];
}
