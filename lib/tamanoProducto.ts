// Tamaño de producto (Pequena / Mediana / Grande) para conteos de Control de Piso.
// El tamaño llega de SAP con las órdenes; algunos artículos vienen como "No aplica" o vacíos y SAP lo
// vuelve a escribir en cada sincronización. Aquí se corrigen esos productos sin tocar el dato de SAP.
// Para agregar otro producto: una línea más con una parte de su descripción y su tamaño.
const CORRECCIONES: { descripcion: RegExp; tamano: 'Pequena' | 'Mediana' | 'Grande' }[] = [
    { descripcion: /LAVARROPAS\s+VERSA/i, tamano: 'Pequena' }
];

const VALIDOS = ['Pequena', 'Mediana', 'Grande'];

export function tamanoProducto(tamano: string | null | undefined, descripcion: string | null | undefined): string | null {
    if (tamano && VALIDOS.includes(tamano)) return tamano;
    return CORRECCIONES.find(c => c.descripcion.test(descripcion || ''))?.tamano || tamano || null;
}

// Copia de la fila con producto_tamano corregido (para los conteos que filtran por ese campo)
export function conTamanoCorregido<T extends { producto_tamano?: string | null; producto_descripcion?: string | null }>(fila: T): T {
    const t = tamanoProducto(fila.producto_tamano, fila.producto_descripcion);
    return t === (fila.producto_tamano ?? null) ? fila : { ...fila, producto_tamano: t };
}
