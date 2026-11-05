import type { SupabaseClient } from '@supabase/supabase-js';

// Cálculo de Calidad IFI de Mármol Sintético (MS).
// Replica las medidas y transformaciones del Power BI "BI Calidad MS":
//  - Fuente: ms_reporte_defectos (created_at > 2025-09-17), catálogos ms_defectos y productos_defectos_ms
//  - Fecha del registro = fecha UTC de created_at (Power BI la convierte a tipo fecha sin zona horaria)
//  - Solo se consideran los 3 primeros defectos de cada pieza (Power Query divide la columna en 3 pares id/defecto)
//  - Pieza buena = sin defectos o con "1. Opaco" como único defecto
//  - Calidad = PiezasBuenas / PiezasRevisadas
//  - Reparación = piezas con Reparacion "No cumple" o vacía desde 2026-03-11, o con valor "Reparacion"

export const MS_FECHA_INICIO_BI = '2025-09-17';
const OPACO_ID = 1;
const MAX_DEFECTOS_POR_PIEZA = 3;
const FECHA_INICIO_REPARACION = '2026-03-11';

export interface MsReporteRaw {
    id: number;
    created_at: string;
    producto_id?: number | null;
    defecto: any;
    Reparacion?: string | null;
    producto?: { Referencia?: string | null } | null;
}

export interface MsDefectoCatalogo {
    id: number;
    Defecto: string;
}

interface DefectoParsed {
    id: number | null;
    nombre: string;
}

export interface MsPiezaNormalizada {
    id: number;
    fecha: string; // YYYY-MM-DD (UTC)
    referencia: string;
    defectos: DefectoParsed[]; // máximo 3
    esBuena: boolean;
    tieneOpaco: boolean;
    esReparacion: boolean;
}

export interface MsCalidadResumen {
    piezasRevisadas: number;
    piezasBuenas: number;
    piezasDefectuosas: number;
    cantidadDefectos: number;
    cantidadMoldes: number;
    piezasOpaco: number;
    pctOpaco: number;
    pctMoldes: number;
    dpu: number;
    calidad: number;
}

export interface MsParetoItem {
    name: string;
    cantidad: number;
    pct: number;
    esMolde: boolean;
}

export interface MsReferenciaItem {
    referencia: string;
    piezasDefectuosas: number;
    totalPiezas: number;
    reparacion: number;
    subdefectos: { name: string; piezasDefectuosas: number; totalPiezas: number; reparacion: number }[];
}

// Convierte un elemento del arreglo `defecto` (objeto, JSON en texto o texto plano) en { id, nombre }
function parseDefectoItem(d: any): DefectoParsed | null {
    if (d === null || d === undefined) return null;
    let obj = d;
    if (typeof d === 'string') {
        const trimmed = d.trim();
        if (!trimmed) return null;
        try {
            obj = JSON.parse(trimmed);
        } catch {
            const match = trimmed.match(/id\W*(\d+)/i);
            return { id: match ? Number(match[1]) : null, nombre: trimmed };
        }
    }
    if (typeof obj !== 'object') return null;
    const rawId = obj.id ?? obj.Id ?? obj.ID;
    const id = rawId !== undefined && rawId !== null && String(rawId).trim() !== '' ? Number(rawId) : null;
    const nombre = String(obj.defecto ?? obj.Defecto ?? obj.nombre ?? obj.Nombre ?? '').trim();
    if (id === null && !nombre) return null;
    return { id: Number.isNaN(id) ? null : id, nombre };
}

function parseDefectos(raw: any): DefectoParsed[] | null {
    if (raw === null || raw === undefined) return null;
    let arr = raw;
    if (typeof raw === 'string') {
        try {
            arr = JSON.parse(raw);
        } catch {
            return null;
        }
    }
    if (!Array.isArray(arr)) return null;
    return arr.map(parseDefectoItem).filter((d): d is DefectoParsed => d !== null);
}

export function fechaUTC(createdAt: string): string {
    return String(createdAt).slice(0, 10);
}

export function normalizarPiezas(
    rows: MsReporteRaw[],
    catalogo: Map<number, string>,
    productos?: Map<number, string>
): MsPiezaNormalizada[] {
    const piezas: MsPiezaNormalizada[] = [];
    const vistos = new Set<number>();

    for (const r of rows) {
        if (vistos.has(r.id)) continue;
        const fecha = fechaUTC(r.created_at);
        if (fecha <= MS_FECHA_INICIO_BI) continue;

        // Power BI descarta los registros con defecto nulo (no generan filas al despivotar)
        const parsed = parseDefectos(r.defecto);
        if (parsed === null) continue;
        vistos.add(r.id);

        const defectos = parsed.slice(0, MAX_DEFECTOS_POR_PIEZA).map(d => ({
            id: d.id,
            nombre: (d.id !== null && catalogo.get(d.id)) || d.nombre || `Defecto ${d.id ?? ''}`.trim()
        }));

        const esBuena = parsed.length === 0 || (parsed.length === 1 && parsed[0].id === OPACO_ID);
        const tieneOpaco = defectos.some(d => d.id === OPACO_ID);

        const rep = r.Reparacion ?? null;
        const reparacion2 = (rep === 'No cumple' || rep === null) && fecha >= FECHA_INICIO_REPARACION ? 'Reparacion' : rep;

        piezas.push({
            id: r.id,
            fecha,
            referencia:
                r.producto?.Referencia ||
                (r.producto_id != null && productos?.get(Number(r.producto_id))) ||
                `Producto #${r.producto_id ?? '-'}`,
            defectos,
            esBuena,
            tieneOpaco,
            esReparacion: reparacion2 === 'Reparacion'
        });
    }

    return piezas;
}

const esMolde = (nombre: string) => nombre.toLowerCase().includes('molde');

export function calcularResumen(piezas: MsPiezaNormalizada[]): MsCalidadResumen {
    const piezasRevisadas = piezas.length;
    let piezasBuenas = 0;
    let cantidadDefectos = 0;
    let cantidadMoldes = 0;
    let piezasOpaco = 0;

    for (const p of piezas) {
        if (p.esBuena) piezasBuenas += 1;
        if (p.tieneOpaco) piezasOpaco += 1;
        cantidadDefectos += p.defectos.length;
        cantidadMoldes += p.defectos.filter(d => esMolde(d.nombre)).length;
    }

    return {
        piezasRevisadas,
        piezasBuenas,
        piezasDefectuosas: piezasRevisadas - piezasBuenas,
        cantidadDefectos,
        cantidadMoldes,
        piezasOpaco,
        pctOpaco: piezasRevisadas > 0 ? (piezasOpaco / piezasRevisadas) * 100 : 0,
        pctMoldes: cantidadDefectos > 0 ? (cantidadMoldes / cantidadDefectos) * 100 : 0,
        dpu: piezasRevisadas > 0 ? cantidadDefectos / piezasRevisadas : 0,
        calidad: piezasRevisadas > 0 ? (piezasBuenas / piezasRevisadas) * 100 : 0
    };
}

// Pareto: piezas por defecto, excluyendo "1. Opaco" (filtro del visual de anillo en Power BI)
export function calcularPareto(piezas: MsPiezaNormalizada[]): MsParetoItem[] {
    const conteo = new Map<string, number>();
    for (const p of piezas) {
        const nombres = new Set(p.defectos.filter(d => d.id !== OPACO_ID).map(d => d.nombre));
        nombres.forEach(n => conteo.set(n, (conteo.get(n) || 0) + 1));
    }
    const total = Array.from(conteo.values()).reduce((a, b) => a + b, 0);
    return Array.from(conteo.entries())
        .map(([name, cantidad]) => ({
            name,
            cantidad,
            pct: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
            esMolde: esMolde(name)
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

// Tabla Referencia → Defecto con PiezasDefectuosas, Total Piezas y Reparación
export function calcularReferencias(piezas: MsPiezaNormalizada[]): MsReferenciaItem[] {
    type Acc = { total: number; buenas: number; rep: number; sub: Map<string, { total: number; buenas: number; rep: number }> };
    const refs = new Map<string, Acc>();

    for (const p of piezas) {
        let acc = refs.get(p.referencia);
        if (!acc) {
            acc = { total: 0, buenas: 0, rep: 0, sub: new Map() };
            refs.set(p.referencia, acc);
        }
        acc.total += 1;
        if (p.esBuena) acc.buenas += 1;
        if (p.esReparacion) acc.rep += 1;

        new Set(p.defectos.map(d => d.nombre)).forEach(nombre => {
            const s = acc!.sub.get(nombre) || { total: 0, buenas: 0, rep: 0 };
            s.total += 1;
            if (p.esBuena) s.buenas += 1;
            if (p.esReparacion) s.rep += 1;
            acc!.sub.set(nombre, s);
        });
    }

    return Array.from(refs.entries())
        .map(([referencia, a]) => ({
            referencia,
            piezasDefectuosas: a.total - a.buenas,
            totalPiezas: a.total,
            reparacion: a.rep,
            subdefectos: Array.from(a.sub.entries())
                .map(([name, s]) => ({ name, piezasDefectuosas: s.total - s.buenas, totalPiezas: s.total, reparacion: s.rep }))
                .sort((x, y) => y.piezasDefectuosas - x.piezasDefectuosas)
        }))
        .sort((a, b) => b.piezasDefectuosas - a.piezasDefectuosas);
}

// IFI por día (solo días con calidad > 0, igual que el filtro del visual en Power BI)
export function calcularIfiPorDia(piezas: MsPiezaNormalizada[]) {
    const porDia = new Map<string, MsPiezaNormalizada[]>();
    piezas.forEach(p => {
        const arr = porDia.get(p.fecha) || [];
        arr.push(p);
        porDia.set(p.fecha, arr);
    });
    return Array.from(porDia.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, arr]) => {
            const r = calcularResumen(arr);
            return {
                fecha,
                dia: Number(fecha.slice(8, 10)),
                calidad: Math.round(r.calidad * 10) / 10,
                total: r.piezasRevisadas,
                buenos: r.piezasBuenas,
                defectuosos: r.piezasDefectuosas
            };
        })
        .filter(d => d.calidad > 0);
}

// IFI por mes de un año (YYYY), 12 posiciones
export function calcularIfiPorMes(piezas: MsPiezaNormalizada[], year: string, nombresMeses: string[]) {
    return nombresMeses.map((mes, idx) => {
        const prefix = `${year}-${String(idx + 1).padStart(2, '0')}`;
        const r = calcularResumen(piezas.filter(p => p.fecha.startsWith(prefix)));
        return {
            mes,
            calidad: Math.round(r.calidad * 10) / 10,
            total: r.piezasRevisadas,
            buenos: r.piezasBuenas,
            defectuosos: r.piezasDefectuosas
        };
    });
}

// ---------------------------------------------------------------------------
// Estadísticas históricas por defecto (para el detalle de criterios de calidad)
// ---------------------------------------------------------------------------

export interface EstadisticaDefectoMs {
    ocurrencias: number; // piezas en las que se reportó el defecto
    diasConDefecto: number;
    promedioDia: number; // ocurrencias ÷ días con producción
    pctPiezas: number; // % de piezas revisadas con el defecto
    ultimaFecha: string | null;
    ult30: { ocurrencias: number; diasProduccion: number; promedioDia: number };
    porMes: { mes: string; ocurrencias: number; promedioDia: number }[]; // últimos 12 meses
}

export interface EstadisticasDefectosMs {
    desde: string | null;
    hasta: string | null;
    diasProduccion: number;
    piezasRevisadas: number;
    porDefecto: Map<number, EstadisticaDefectoMs>; // clave: id de ms_defectos
}

const sumarDias = (fecha: string, dias: number) =>
    new Date(new Date(`${fecha}T00:00:00Z`).getTime() + dias * 864e5).toISOString().slice(0, 10);

// Una pieza cuenta una vez por defecto (aunque se repita en el arreglo). Promedio por día = sobre días con producción.
export function calcularEstadisticasDefectos(piezas: MsPiezaNormalizada[]): EstadisticasDefectosMs {
    const diasProd = new Set<string>();
    const diasProdPorMes = new Map<string, Set<string>>();
    const acc = new Map<number, { total: number; dias: Set<string>; fechas: string[]; porMes: Map<string, number> }>();
    let desde: string | null = null;
    let hasta: string | null = null;

    for (const p of piezas) {
        diasProd.add(p.fecha);
        const mes = p.fecha.slice(0, 7);
        (diasProdPorMes.get(mes) || diasProdPorMes.set(mes, new Set()).get(mes)!).add(p.fecha);
        if (!desde || p.fecha < desde) desde = p.fecha;
        if (!hasta || p.fecha > hasta) hasta = p.fecha;

        new Set(p.defectos.map(d => d.id).filter((id): id is number => id !== null)).forEach(id => {
            const a = acc.get(id) || { total: 0, dias: new Set<string>(), fechas: [], porMes: new Map<string, number>() };
            a.total += 1;
            a.dias.add(p.fecha);
            a.fechas.push(p.fecha);
            a.porMes.set(mes, (a.porMes.get(mes) || 0) + 1);
            acc.set(id, a);
        });
    }

    const nDias = diasProd.size;
    const inicio30 = hasta ? sumarDias(hasta, -29) : null;
    const dias30 = inicio30 ? [...diasProd].filter(d => d >= inicio30).length : 0;
    const meses = [...diasProdPorMes.keys()].sort().slice(-12);

    const porDefecto = new Map<number, EstadisticaDefectoMs>();
    acc.forEach((a, id) => {
        const oc30 = inicio30 ? a.fechas.filter(f => f >= inicio30).length : 0;
        porDefecto.set(id, {
            ocurrencias: a.total,
            diasConDefecto: a.dias.size,
            promedioDia: nDias > 0 ? a.total / nDias : 0,
            pctPiezas: piezas.length > 0 ? (a.total / piezas.length) * 100 : 0,
            ultimaFecha: [...a.dias].sort().pop() || null,
            ult30: { ocurrencias: oc30, diasProduccion: dias30, promedioDia: dias30 > 0 ? oc30 / dias30 : 0 },
            porMes: meses.map(m => {
                const oc = a.porMes.get(m) || 0;
                const d = diasProdPorMes.get(m)?.size || 0;
                return { mes: m, ocurrencias: oc, promedioDia: d > 0 ? oc / d : 0 };
            })
        });
    });

    return { desde, hasta, diasProduccion: nDias, piezasRevisadas: piezas.length, porDefecto };
}

// ---------------------------------------------------------------------------
// Consultas a Supabase (requieren un cliente con sesión: la tabla tiene RLS)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;
const PARALLEL_PAGES = 6;

// Trae todos los reportes en [desde, hasta) paginando en paralelo (Supabase limita a 1000 filas por consulta)
export async function fetchMsReportes(
    client: SupabaseClient,
    desde: string,
    hasta: string,
    columnas = 'id, created_at, producto_id, defecto, Reparacion, producto:productos_defectos_ms (Referencia)',
    opciones: { soloConFoto?: boolean } = {}
): Promise<MsReporteRaw[]> {
    let countQuery = client
        .from('ms_reporte_defectos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', desde)
        .lt('created_at', hasta);
    if (opciones.soloConFoto) countQuery = countQuery.not('fotoUrl', 'is', null);
    const { count, error: countErr } = await countQuery;
    if (countErr) throw countErr;

    const total = count || 0;
    const pages = Math.ceil(total / PAGE_SIZE);
    const rows: MsReporteRaw[] = [];

    for (let start = 0; start < pages; start += PARALLEL_PAGES) {
        const batch = Array.from({ length: Math.min(PARALLEL_PAGES, pages - start) }, (_, i) => {
            const from = (start + i) * PAGE_SIZE;
            let q = client
                .from('ms_reporte_defectos')
                .select(columnas)
                .gte('created_at', desde)
                .lt('created_at', hasta);
            if (opciones.soloConFoto) q = q.not('fotoUrl', 'is', null);
            return q.order('id', { ascending: true }).range(from, from + PAGE_SIZE - 1);
        });
        const results = await Promise.all(batch);
        for (const { data, error } of results) {
            if (error) throw error;
            rows.push(...((data as unknown as MsReporteRaw[]) || []));
        }
    }

    return rows;
}

export async function fetchCatalogoDefectosMs(client: SupabaseClient): Promise<Map<number, string>> {
    const { data, error } = await client.from('ms_defectos').select('id, Defecto');
    if (error) throw error;
    return new Map((data || []).map((d: MsDefectoCatalogo) => [Number(d.id), String(d.Defecto || '').trim()]));
}

export async function fetchProductosMs(client: SupabaseClient): Promise<Map<number, string>> {
    const { data, error } = await client.from('productos_defectos_ms').select('id, Referencia');
    if (error) throw error;
    return new Map((data || []).map((p: { id: number; Referencia: string | null }) => [Number(p.id), String(p.Referencia || '').trim()]));
}

// Rango [desde, hasta) en UTC para un día YYYY-MM-DD
export function rangoDiaUTC(fecha: string): [string, string] {
    const d = new Date(`${fecha}T00:00:00Z`);
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    return [`${fecha}T00:00:00Z`, `${next.toISOString().slice(0, 10)}T00:00:00Z`];
}
