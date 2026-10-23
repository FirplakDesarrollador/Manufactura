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

