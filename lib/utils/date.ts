export function parseDBDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date(''); // Devuelve Invalid Date
    // Si la cadena ya tiene un indicador de zona horaria (como Z o +00:00), no la alteramos
    if (dateStr.endsWith('Z') || /(?:\+|-)\d{2}:\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
    }
    // Si es un formato ISO de la BD sin zona horaria, agregamos Z para forzar UTC
    if (dateStr.includes('T')) {
        return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
}
