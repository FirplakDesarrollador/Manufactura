// Registro de datos que SAP no entregó o que no se reconocen, para mostrarlos como error en Consulta SAP
// en lugar de rellenarlos con valores por defecto (evita falsos positivos, p. ej. una orden cancelada como "Liberado").
export function crearFaltantes() {
    const lista: string[] = [];
    const agregar = (texto: string) => { if (!lista.includes(texto)) lista.push(texto); };
    return {
        lista,
        agregar,
        // Valor obligatorio: si viene vacío se registra y se devuelve '' (nunca un valor inventado)
        requerido<T>(valor: T | null | undefined, nombre: string): T | '' {
            if (valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')) {
                agregar(nombre);
                return '';
            }
            return valor;
        },
        // Código de SAP traducido con un diccionario: si no se reconoce se registra y se muestra el código tal cual
        traducir(valor: string | null | undefined, diccionario: Record<string, string>, nombre: string): string {
            if (!valor) { agregar(nombre); return ''; }
            if (diccionario[valor]) return diccionario[valor];
            agregar(`${nombre}: valor "${valor}" no reconocido`);
            return valor;
        }
    };
}

export async function nombreSap(baseUrl: string, cookie: string, recurso: string, campo: string): Promise<string | null> {
    try {
        const r = await fetch(`${baseUrl}/${recurso}?$select=${campo}`, { headers: { Cookie: cookie, 'Content-Type': 'application/json' } });
        if (!r.ok) return null;
        const d = await r.json();
        return d?.[campo] || null;
    } catch {
        return null;
    }
}
