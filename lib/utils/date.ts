export function parseDBDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date(''); // Devuelve Invalid Date
    const str = String(dateStr).trim();
    // Si contiene formato de fecha YYYY-MM-DD, parsear como fecha local a mediodía para evitar desfases de zona horaria
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
    }
    return new Date(str);
}


/**
 * Convierte a Date un timestamp de evento (pintura_fecha, vaciado_fecha, pulido_fecha,
 * acabado_fecha, etc.) para mostrar fecha Y hora correctas.
 *
 * La app guarda estos campos con new Date().toISOString() (hora UTC) en columnas
 * "timestamp without time zone", asi que el valor leido ("YYYY-MM-DDTHH:mm:ss.sss" o
 * "YYYY-MM-DD HH:mm:ss") no trae zona: se interpreta como UTC y se muestra en la zona
 * horaria del navegador (America/Bogota).
 *
 * No usar para columnas de planeacion (fecha_ideal_produccion, fecha_entrega_estimada):
 * esas son solo fecha y deben seguir pasando por parseDBDate.
 */
export function parseDBTimestamp(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date(''); // Devuelve Invalid Date
    const str = String(dateStr).trim();
    const ts = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}.*)$/);
    if (ts) {
        const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(ts[2]);
        return new Date(hasZone ? `${ts[1]}T${ts[2]}` : `${ts[1]}T${ts[2]}Z`);
    }
    return parseDBDate(str);
}
