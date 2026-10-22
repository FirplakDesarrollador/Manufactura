// Cálculo de Calidad IFI de Fibra de Vidrio (FV).
// Replica las medidas y transformaciones del Power BI "BI Calidad FV":
//  - Fuente: lista SharePoint "Reporte de defectos Fibra de Vidrio" (sitio CalidadMPyTC)
//  - Solo Linea = "Linea 1", número de factura válido y creados después del 2023-04-01
//  - Fecha del registro = fecha UTC de Created
//  - Defectos: texto "38 Pintura chorreada;74 Piel de naranja;..." → se toman hasta 8 (Registros)
//  - Pieza defectuosa = Buen estado = false con al menos un defecto (de los 5 primeros)
//    que no sea "Acumulacion de estireno" ni un defecto de molde
//  - IFI = (Revisadas - Defectuosas) / Revisadas;  meta IFI FV = 35 %

export const FV_META_IFI = 35;
export const FV_FECHA_INICIO_BI = '2023-04-01';
const MAX_DEFECTOS_REGISTROS = 8;
const MAX_DEFECTOS_DEFECTUOSAS = 5;
const DEFECTO_ESTIRENO = ' Acumulacion de estireno';
const DEFECTO_PIEL_NARANJA = ' Piel de naranja';

const FACTURAS_INVALIDAS = new Set([
    '', '000', '0000', '00000', '000000', '111111111', '2180918 74', '2qi1479', '34234', 'dsd', 'gghjgh',
    'ghjh', 'Italiana', 'kjh', 'Orden 1', 'Otra prueba', 'res', 'test', 'Test', 'wqwqe', 'yuyu'
]);

const DEFECTOS_MOLDE = new Set([
    ' Marca de reparación de molde', ' Marca de reparación de molde con poros', ' Molde con poros',
    ' Molde deformado', ' Molde despicado', ' Molde fisurado', ' Molde Fisurado', ' Molde rayado', ' Molde Rayado '
]);

export interface FvRegistroRaw {
    id: number;
    created: string;
    producto: string;
    linea: string | null;
    numeroFactura: string | null;
    buenEstado: boolean | null;
    defectos: string | null;
}

export interface FvPieza {
    id: number;
    fecha: string; // YYYY-MM-DD (UTC)
    producto: string;
    defectos: string[]; // hasta 8 nombres tal como los deja Power Query (con espacio inicial)
    defectosIfi: number; // filas que cuentan en "Piezas defectuosas sin moldes"
    esDefectuosa: boolean;
}

export interface FvCalidadResumen {
    piezasRevisadas: number;
    piezasBuenas: number;
    piezasDefectuosas: number;
    cantidadDefectos: number;
    cantidadMoldes: number;
    pctMoldes: number;
    pctPielNaranja: number;
    dpu: number;
    calidad: number;
}

// Equivale a Splitter.SplitTextByCharacterTransition(dígito → no dígito) y tomar la 2ª parte
function nombreDefecto(parte: string): string | null {
    const cortes: number[] = [];
    for (let i = 0; i < parte.length - 1; i++) {
        if (/\d/.test(parte[i]) && !/\d/.test(parte[i + 1])) cortes.push(i + 1);
    }
    if (cortes.length === 0) return null;
    return parte.slice(cortes[0], cortes[1] ?? parte.length);
}

export function normalizarRegistrosFv(rows: FvRegistroRaw[]): FvPieza[] {
    const piezas: FvPieza[] = [];
    for (const r of rows) {
        if (r.linea !== 'Linea 1') continue;
        if (r.numeroFactura !== null && FACTURAS_INVALIDAS.has(r.numeroFactura)) continue;
        if (!r.created || r.created.slice(0, 10) <= FV_FECHA_INICIO_BI) continue;

        const partes = (r.defectos ?? '').split(';');
        const nombres = (n: number) => partes.slice(0, n).map(nombreDefecto).filter((d): d is string => d !== null);

        const defectos = nombres(MAX_DEFECTOS_REGISTROS).filter(d => d !== '');
        const defectosIfi = r.buenEstado === false
            ? nombres(MAX_DEFECTOS_DEFECTUOSAS).filter(d => d !== DEFECTO_ESTIRENO && !DEFECTOS_MOLDE.has(d)).length
            : 0;

        piezas.push({
            id: r.id,
            fecha: r.created.slice(0, 10),
            producto: (r.producto || 'Sin producto').trim(),
            defectos,
            defectosIfi,
            esDefectuosa: defectosIfi > 0
        });
    }
    return piezas;
}

export function calcularResumenFv(piezas: FvPieza[]): FvCalidadResumen {
    const piezasRevisadas = piezas.length;
    let piezasDefectuosas = 0;
    let cantidadDefectos = 0;
    let filasIfi = 0;
    let pielNaranja = 0;

    for (const p of piezas) {
        if (p.esDefectuosa) piezasDefectuosas += 1;
        cantidadDefectos += p.defectos.length;
        filasIfi += p.defectosIfi;
        pielNaranja += p.defectos.filter(d => d === DEFECTO_PIEL_NARANJA).length;
    }

    const piezasBuenas = piezasRevisadas - piezasDefectuosas;
    // Igual que el BI: "moldes" = todos los defectos menos las filas de piezas defectuosas sin moldes
    const cantidadMoldes = cantidadDefectos - filasIfi;

    return {
        piezasRevisadas,
        piezasBuenas,
        piezasDefectuosas,
        cantidadDefectos,
        cantidadMoldes,
        pctMoldes: cantidadDefectos > 0 ? (cantidadMoldes / cantidadDefectos) * 100 : 0,
        pctPielNaranja: piezasRevisadas > 0 ? (pielNaranja / piezasRevisadas) * 100 : 0,
        dpu: piezasRevisadas > 0 ? cantidadDefectos / piezasRevisadas : 0,
        calidad: piezasRevisadas > 0 ? (piezasBuenas / piezasRevisadas) * 100 : 0
    };
}

// Pareto: ocurrencias de cada defecto (todas las filas de Registros con defecto)
export function calcularParetoFv(piezas: FvPieza[]) {
    const conteo = new Map<string, number>();
    piezas.forEach(p => p.defectos.forEach(d => {
        const name = d.trim();
        conteo.set(name, (conteo.get(name) || 0) + 1);
    }));
    const total = Array.from(conteo.values()).reduce((a, b) => a + b, 0);
    return Array.from(conteo.entries())
        .map(([name, cantidad]) => ({
            name,
            cantidad,
            pct: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
            esMolde: name.toLowerCase().includes('molde')
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

// Tabla Producto → Defecto: piezas con defecto (como la matriz del BI)
export function calcularProductosFv(piezas: FvPieza[]) {
    const map = new Map<string, { conDefecto: number; defectuosas: number; total: number; sub: Map<string, number> }>();
    for (const p of piezas) {
        const acc = map.get(p.producto) || { conDefecto: 0, defectuosas: 0, total: 0, sub: new Map<string, number>() };
        acc.total += 1;
        if (p.defectos.length > 0) acc.conDefecto += 1;
        if (p.esDefectuosa) acc.defectuosas += 1;
        new Set(p.defectos.map(d => d.trim())).forEach(d => acc.sub.set(d, (acc.sub.get(d) || 0) + 1));
        map.set(p.producto, acc);
    }
    return Array.from(map.entries())
        .map(([producto, a]) => ({
            producto,
            piezasConDefecto: a.conDefecto,
            piezasDefectuosas: a.defectuosas,
            totalPiezas: a.total,
            subdefectos: Array.from(a.sub.entries())
                .map(([name, cantidad]) => ({ name, cantidad }))
                .sort((x, y) => y.cantidad - x.cantidad)
        }))
        .sort((a, b) => b.piezasConDefecto - a.piezasConDefecto || a.producto.localeCompare(b.producto));
}

export function calcularIfiPorDiaFv(piezas: FvPieza[]) {
    const porDia = new Map<string, FvPieza[]>();
    piezas.forEach(p => porDia.set(p.fecha, [...(porDia.get(p.fecha) || []), p]));
    return Array.from(porDia.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, arr]) => {
            const r = calcularResumenFv(arr);
            return {
                fecha,
                dia: Number(fecha.slice(8, 10)),
                calidad: Math.round(r.calidad * 10) / 10,
                total: r.piezasRevisadas,
                buenos: r.piezasBuenas,
                defectuosos: r.piezasDefectuosas
            };
        });
}

export function calcularIfiPorMesFv(piezas: FvPieza[], year: string, nombresMeses: string[]) {
    return nombresMeses.map((mes, idx) => {
        const prefix = `${year}-${String(idx + 1).padStart(2, '0')}`;
        const r = calcularResumenFv(piezas.filter(p => p.fecha.startsWith(prefix)));
        return {
            mes,
            calidad: Math.round(r.calidad * 10) / 10,
            total: r.piezasRevisadas,
            buenos: r.piezasBuenas,
            defectuosos: r.piezasDefectuosas
        };
    });
}
