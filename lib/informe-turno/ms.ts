import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularResumen, fetchCatalogoDefectosMs, fetchMsReportes, normalizarPiezas } from '@/lib/calidad/msCalidad';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';

// Informe final de turno MS (Mármol Sintético): reemplaza el mensaje de cierre que los supervisores enviaban por WhatsApp.
// Lo que ya existe en Control de Piso y en Calidad MS se jala solo; el supervisor diligencia el resto.

// Colores "normales" del día: lo demás (granitos, negro, grises…) se cuenta como Colores en el informe
const COLORES_BASE = ['BLANCO', 'NATURAL', 'MARFIL'];
const TAMANOS = ['Pequena', 'Mediana', 'Grande'];

// Defectos que se reportan en el bloque RRC, en el orden del informe. Se buscan en ms_defectos por palabras clave
// (sin número, tildes ni mayúsculas) para no depender del texto exacto del catálogo.
// Las claves se prueban en orden (de la más específica a la más general) y se usa la primera que encuentre algo:
// así "despique" no suma los otros despiques (ruteadora, flauta, línea…) ni "perfor" la "Despicada en perforación".
// El catálogo tiene errores de digitación (ej. "manipualción"), por eso se busca por fragmentos y no por el nombre exacto.
export const RRC_MS: { nombre: string; claves: string[] }[] = [
    { nombre: 'Masa en gelcoat', claves: ['masa en gelcoat', 'masa en gel'] },
    { nombre: 'Gelcoat desmoldado', claves: ['gelcoat desmoldado', 'gel desmoldado'] },
    { nombre: 'Despique por mala manipulación', claves: ['mala manip'] },
    { nombre: 'Pintura chorreada', claves: ['pintura chorread', 'chorread'] },
    { nombre: 'Rajado al desmoldar', claves: ['rajado al desmold', 'rajad'] },
    { nombre: 'Pieza dañada al perforar', claves: ['danada al perfor', 'pieza danada'] },
    { nombre: 'Pintura sin catalizador', claves: ['sin catalizador', 'catalizador'] },
    { nombre: 'Burbuja de aire en el acabado', claves: ['burbuja de aire en el acabado', 'burbuja de aire', 'burbuja'] }
];

export interface ConteoDefecto { nombre: string; cantidad: number; fuentes?: string[] } // fuentes: defectos de ms_defectos contados

export interface DatosAutoMs {
    pintura: { total: number; l1: number; l2: number; l3: number };
    colores: number;
    desgelcadas: number;               // piezas pintadas ese día que quedaron en estado Desgelcada
    coloresDetalle: ConteoDefecto[];
    vaciado: { total: number; pequenas: number; medianas: number; grandes: number; sinTamano?: ConteoDefecto[] }; // sinTamano: productos sin tamaño (ej. "No aplica")
    calidad: number | null;            // % IFI del día (mismo cálculo de Calidad MS)
    revisadas: number;                 // piezas revisadas en inspección
    rrc: ConteoDefecto[];              // los 8 defectos del informe
    otrosDefectos: ConteoDefecto[];    // defectos del día que no están en el bloque RRC (solo informativo)
    topDefectos?: ConteoDefecto[];     // los 3 defectos con más piezas del día (sugerencia de paro por no calidad)
    errorCalidad?: string;
}

export interface FilaAusentismo { nombre: string; motivo: string }
export interface FilaParo { minutos: string; causa: string }

export interface ManualMs {
    ausentismos: FilaAusentismo[];
    programado: string;
    cnc: string;
    adm: string;
    ultracaster: string;
    acabado: string;
    kilos: string;
    metaKilos: string;
    parosPintura: FilaParo[];
    parosVaciado: FilaParo[];
    reflejados: FilaParo[];
    reparacion: string;
    desgelcadas: string;
    mesones: string;
    mesaTrabajo: string;
    barras: string;
    linea: string;
    lineaBuffer: string;
    pulido: string;
    automantenimiento: string;
}

// Alistamiento y alimentación se reportan todos los días: vienen puestos y el supervisor solo ajusta los minutos
const parosBase = (): FilaParo[] => [{ minutos: '10', causa: 'Alistamiento' }, { minutos: '48', causa: 'Alimentación' }];

export const manualVacio = (): ManualMs => ({
    ausentismos: [],
    programado: '', cnc: '', adm: '', ultracaster: '', acabado: '', kilos: '', metaKilos: '',
    parosPintura: parosBase(), parosVaciado: parosBase(), reflejados: [],
    reparacion: '', desgelcadas: '', mesones: '', mesaTrabajo: '', barras: '', linea: '', lineaBuffer: '', pulido: '', automantenimiento: ''
});

// Paro reflejado por kilos: (meta de kilos de la semana - kilos entregados al CEDI) / kilos por minuto
export const KG_POR_MINUTO_MS = 9.09;
export const META_KILOS_MS_INICIAL = 5376;
// Los paros reflejados reparten ese tiempo: se permite pasarse hasta 5 min
export const TOLERANCIA_REFLEJADOS_MIN = 5;

const aNumero = (s: string | undefined) => {
    const v = Number((s ?? '').trim().replace(',', '.'));
    return (s ?? '').trim() === '' || Number.isNaN(v) ? null : v;
};

export function minutosParoKilos(meta: number | null, kilos: number | null): number | null {
    if (meta == null || kilos == null) return null;
    return Math.max(0, Math.round((meta - kilos) / KG_POR_MINUTO_MS));
}

// Lunes de la semana de la fecha (YYYY-MM-DD), para saber si dos informes son de la misma semana
const lunesDe = (f: string) => {
    const d = new Date(`${f}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// La meta cambia cada semana: por defecto se toma la del último informe guardado antes de la fecha
export function metaKilosPorDefecto(informes: InformeMsGuardado[], fecha: string): { valor: number; mismaSemana: boolean } {
    const previo = informes
        .filter(i => i.fecha < fecha && aNumero(i.datos?.manual?.metaKilos) != null)
        .sort((x, y) => (x.fecha < y.fecha ? 1 : -1))[0];
    if (!previo) return { valor: META_KILOS_MS_INICIAL, mismaSemana: true };
    return { valor: aNumero(previo.datos?.manual?.metaKilos)!, mismaSemana: lunesDe(previo.fecha) === lunesDe(fecha) };
}

export const MOTIVOS_AUSENTISMO = ['Incapacitado', 'Cita médica', 'Se dirige a la EPS', 'Permiso', 'Calamidad doméstica', 'Vacaciones', 'Licencia', 'No se presentó', 'No se ha reportado - no responde'];
// Los 5 paros que más se repiten en MS (histórico de paros por familia / modo de pérdida)
// Personal activo de Mármol Sintético (base de Talento Humano), para la lista de ausentismos
export async function cargarPersonasMs(): Promise<string[]> {
    const { data, error } = await supabaseTH
        .from('empleados')
        .select('nombreCompleto')
        .eq('activo', true)
        .eq('planta', 'Marmol sintetico')
        .order('nombreCompleto', { ascending: true });
    if (error) throw error;
    return [...new Set((data || []).map(e => (e.nombreCompleto || '').trim()).filter(Boolean))];
}

// Paro reflejado por ausentismo: 10,06 min por persona ausente, máximo 60 min
export const MIN_PARO_POR_AUSENTE = 10.06;
export const MAX_PARO_AUSENTISMO_MIN = 60;
export const personasAusentes = (m: ManualMs) => m.ausentismos.filter(x => x.nombre.trim()).length;
export const minutosParoAusentismo = (personas: number) => Math.min(MAX_PARO_AUSENTISMO_MIN, Math.round(personas * MIN_PARO_POR_AUSENTE));

// Sugerencias de paros reflejados: avería, lavado de Ultracaster, ausentismo con las personas reportadas y no calidad con el top 3 de defectos
export function causasReflejadoMs(m: ManualMs, a: DatosAutoMs | null): string[] {
    const ausentes = personasAusentes(m);
    const top = (a?.topDefectos || []).filter(d => d.cantidad > 0);
    return [
        'Avería',
        'Lavado de máquina Ultracaster',
        ausentes ? `Ausentismo de ${ausentes} ${ausentes === 1 ? 'persona' : 'personas'}` : 'Ausentismo de personas',
        top.length ? `No calidad por ${top.map(d => `${d.nombre.toLowerCase()} (${d.cantidad})`).join(', ')}` : 'No calidad por'
    ];
}

export const CAUSAS_PARO_MS =['Alistamiento', 'Alimentación', 'Lavado de máquina Ultracaster', 'Ausentismo de personas', 'Piezas con no calidad'];

export interface InformeMsGuardado {
    id: number;
    fecha: string;
    usuario_email: string | null;
    datos: { manual?: Partial<ManualMs>; auto?: DatosAutoMs } | null;
    texto: string | null;
    updated_at: string;
}

const normalizar = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();

const diaSiguiente = (fecha: string) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
};

// Control de Piso guarda las fechas en hora local de Colombia sin zona: el día va de 00:00 a 00:00
async function filasDelDia<T>(client: SupabaseClient, columnaFecha: string, columnas: string, fecha: string): Promise<T[]> {
    const filas: T[] = [];
    const PAGINA = 1000;
    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await client
            .from('query_trazabilidad_ms')
            .select(columnas)
            .gte(columnaFecha, fecha)
            .lt(columnaFecha, diaSiguiente(fecha))
            .order('id', { ascending: true })
            .range(desde, desde + PAGINA - 1);
        if (error) throw error;
        filas.push(...((data as unknown as T[]) || []));
        if (!data || data.length < PAGINA) break;
    }
    return filas;
}

export async function cargarDatosAutoMs(client: SupabaseClient, fecha: string): Promise<DatosAutoMs> {
    type FilaPintura = { pintura_linea: string | null; producto_color: string | null; estado: string | null };
    type FilaVaciado = { producto_tamano: string | null; producto_descripcion: string | null };
    const [pintadas, vaciadas] = await Promise.all([
        filasDelDia<FilaPintura>(client, 'pintura_fecha', 'id, pintura_linea, producto_color, estado', fecha),
        filasDelDia<FilaVaciado>(client, 'vaciado_fecha', 'id, producto_tamano, producto_descripcion', fecha)
    ]);

    const coloresMap = new Map<string, number>();
    pintadas.forEach(r => {
        const color = String(r.producto_color || '').trim().toUpperCase();
        if (color && !COLORES_BASE.includes(color)) coloresMap.set(color, (coloresMap.get(color) || 0) + 1);
    });
    const coloresDetalle = [...coloresMap.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
    const contar = <F,>(arr: F[], f: (r: F) => boolean) => arr.filter(f).length;
    const agrupar = (nombres: string[]): ConteoDefecto[] => {
        const m = new Map<string, number>();
        nombres.forEach(n => m.set(n, (m.get(n) || 0) + 1));
        return [...m.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }));
    };

    const datos: DatosAutoMs = {
        pintura: {
            total: pintadas.length,
            l1: contar(pintadas, r => r.pintura_linea === 'Linea 1'),
            l2: contar(pintadas, r => r.pintura_linea === 'Linea 2'),
            l3: contar(pintadas, r => r.pintura_linea === 'Linea 3')
        },
        colores: coloresDetalle.reduce((a, c) => a + c.cantidad, 0),
        // Control de Piso no guarda la fecha del desgelcado (Vaciado solo cambia el estado): se cuenta por el día de pintura
        desgelcadas: contar(pintadas, r => r.estado === 'Desgelcada'),
        coloresDetalle,
        vaciado: {
            total: vaciadas.length,
            pequenas: contar(vaciadas, r => r.producto_tamano === 'Pequena'),
            medianas: contar(vaciadas, r => r.producto_tamano === 'Mediana'),
            grandes: contar(vaciadas, r => r.producto_tamano === 'Grande'),
            // Piezas cuyo producto no tiene tamaño Pequeña/Mediana/Grande: se muestran para que la suma cuadre con el total
            sinTamano: agrupar(vaciadas.filter(r => !TAMANOS.includes(r.producto_tamano || '')).map(r => `${r.producto_descripcion || 'Producto sin nombre'} (${r.producto_tamano || 'sin tamaño'})`))
        },
        calidad: null,
        revisadas: 0,
        rrc: RRC_MS.map(d => ({ nombre: d.nombre, cantidad: 0 })),
        otrosDefectos: []
    };

    // Calidad MS: mismo cálculo de la app de Calidad (pieza buena = sin defectos o solo opaco), en el día de Colombia
    try {
        const desde = new Date(`${fecha}T00:00:00-05:00`).toISOString();
        const hasta = new Date(`${diaSiguiente(fecha)}T00:00:00-05:00`).toISOString();
        const [reportes, catalogo] = await Promise.all([
            fetchMsReportes(client, desde, hasta, 'id, created_at, producto_id, defecto, Reparacion'),
            fetchCatalogoDefectosMs(client)
        ]);
        const piezas = normalizarPiezas(reportes, catalogo);
        const resumen = calcularResumen(piezas);
        datos.revisadas = resumen.piezasRevisadas;
        datos.calidad = resumen.piezasRevisadas > 0 ? resumen.calidad : null;

        // Piezas por defecto (una pieza cuenta una vez por defecto)
        const porDefecto = new Map<string, number>();
        piezas.forEach(p => new Set(p.defectos.map(d => d.nombre)).forEach(n => porDefecto.set(n, (porDefecto.get(n) || 0) + 1)));

        // Defecto(s) del catálogo que corresponden a cada línea RRC: la primera clave (en orden) que encuentre algo
        const nombresCatalogo = [...new Set([...catalogo.values(), ...porDefecto.keys()])].filter(Boolean);
        const usados = new Set<string>();
        datos.rrc = RRC_MS.map(d => {
            let fuentes: string[] = [];
            for (const k of d.claves) {
                fuentes = nombresCatalogo.filter(n => normalizar(n).includes(k));
                if (fuentes.length) break;
            }
            fuentes.forEach(f => usados.add(f));
            const cantidad = piezas.filter(p => p.defectos.some(x => fuentes.includes(x.nombre))).length;
            return { nombre: d.nombre, cantidad, fuentes };
        });
        datos.otrosDefectos = [...porDefecto.entries()]
            .filter(([nombre]) => !usados.has(nombre) && normalizar(nombre) !== 'opaco')
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
        datos.topDefectos = [...porDefecto.entries()]
            .filter(([nombre]) => normalizar(nombre) !== 'opaco')
            .map(([nombre, cantidad]) => ({ nombre: nombre.replace(/^\s*\d+\s*[.)-]\s*/, '').trim(), cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 3);
    } catch (e: unknown) {
        datos.errorCalidad = (e as { message?: string })?.message || 'No se pudo leer Calidad MS';
    }

    return datos;
}

// ---------------------------------------------------------------------------
// Texto del informe (mismo formato que se enviaba por WhatsApp)
// ---------------------------------------------------------------------------

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s.replace(',', '.'))) ? null : Number(s.replace(',', '.')));
const miles = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const deProgramado = (v: number | null, programado: number | null) => `${v == null ? '-' : miles(v)}${programado ? ` de ${miles(programado)}` : ''}`;
const paro = (p: FilaParo) => `-${p.minutos.trim() ? `${p.minutos.trim()} min ` : ''}${p.causa.trim()}`;
const conCausa = (arr: FilaParo[]) => arr.filter(p => p.causa.trim());

export function construirTextoMs(fecha: string, m: ManualMs, a: DatosAutoMs | null): string {
    const prog = num(m.programado);
    const valor = (s: string) => (num(s) == null ? '-' : miles(num(s)!));
    const aus = m.ausentismos.filter(x => x.nombre.trim());
    const fechaTxt = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const l: string[] = [];

    l.push('*INFORME FINAL MS*', `_${fechaTxt}_`, '');
    l.push(`.AUSENTISMOS: ${String(aus.length).padStart(2, '0')}`);
    aus.forEach(x => l.push(`-${x.nombre.trim()}${x.motivo.trim() ? ` ${x.motivo.trim().toLowerCase()}` : ''}`));
    l.push('');

    l.push(`*PINTURA: ${deProgramado(a?.pintura.total ?? null, prog)}`);
    l.push(`*Línea 1: ${a?.pintura.l1 ?? '-'}`, `*Línea 2: ${a?.pintura.l2 ?? '-'}`, `*Línea 3: ${a?.pintura.l3 ?? '-'}`, '');
    l.push(`*Colores: ${a?.colores ?? '-'}`, '');

    l.push(`*Vaciado: ${deProgramado(a?.vaciado.total ?? null, prog)}`);
    l.push(`*Pequeñas: ${a?.vaciado.pequenas ?? '-'}`, `*Medianas: ${a?.vaciado.medianas ?? '-'}`, `*Grandes: ${a?.vaciado.grandes ?? '-'}`);
    const sinTamano = (a?.vaciado.sinTamano || []).reduce((s, x) => s + x.cantidad, 0);
    if (sinTamano) l.push(`*Sin tamaño: ${sinTamano}`);
    l.push('');

    l.push(`*Piezas ruteadas CNC: ${valor(m.cnc)}`, `*Piezas vaciadas ADM: ${valor(m.adm)}`, `*Piezas vaciadas Ultracaster: ${m.ultracaster.trim() === '' && a ? miles(a.vaciado.total) : valor(m.ultracaster)}`, '');

    l.push(`*Acabado: ${deProgramado(num(m.acabado), prog)}`);
    l.push(`*Calidad: ${a?.calidad == null ? '-' : `${Math.round(a.calidad)}%`}`);
    l.push(`*Kilos vaciados: ${num(m.kilos) == null ? '-' : `${miles(num(m.kilos)!)} kg`}`, '');
    l.push(`*Piezas revisadas en inspección: ${a ? a.revisadas : '-'}`, '');

    l.push('*PAROS REALES:');
    l.push('-Pintura', ...conCausa(m.parosPintura).map(paro), '');
    l.push('-Vaciado', ...conCausa(m.parosVaciado).map(paro), '');

    l.push('*REFLEJADOS:');
    const refl = conCausa(m.reflejados);
    l.push(...(refl.length ? refl.map(paro) : ['-Sin paros reflejados']), '');

    l.push('*RRC');
    (a?.rrc || RRC_MS.map(d => ({ nombre: d.nombre, cantidad: 0 }))).forEach(d => l.push(`*${d.nombre}: ${a ? d.cantidad : '-'}`));
    l.push('');

    l.push('*OTROS:');
    l.push(`*Piezas de reparación: ${valor(m.reparacion)}`, `*Piezas desgelcadas: ${m.desgelcadas.trim() === '' && a ? miles(a.desgelcadas ?? 0) : valor(m.desgelcadas)}`, `*Mesones: ${valor(m.mesones)}`,
        `*Mesa de trabajo: ${valor(m.mesaTrabajo)}`, `*Barras: ${valor(m.barras)}`, '');
    l.push(`*Línea: ${valor(m.linea)}`, `*Línea buffer: ${valor(m.lineaBuffer)}`, `*Pulido: ${valor(m.pulido)}`, '');
    l.push(`*Auto mantenimiento: ${num(m.automantenimiento) == null ? '-' : `${miles(num(m.automantenimiento)!)} %`}`);

    return l.join('\n');
}

// ---------------------------------------------------------------------------
// Texto para el Excel "Nivel de productividad" (hojas BD_MS y BD_PAROS): se pega en Claude para Excel,
// por eso usa los nombres exactos de las columnas y va separado por tabulaciones
// ---------------------------------------------------------------------------

export function construirTextoExcelMs(fecha: string, m: ManualMs, a: DatosAutoMs | null): string {
    const [y, mes, d] = fecha.split('-').map(Number);
    const dia = `${mes}/${d}/${y}`; // mismo formato de la columna Dia / FECHA del Excel
    const n = (s: string) => (num(s) == null ? '' : String(num(s)));
    const ultracaster = m.ultracaster.trim() === '' && a ? String(a.vaciado.total) : n(m.ultracaster);
    const desgelcadas = m.desgelcadas.trim() === '' && a ? String(a.desgelcadas ?? 0) : n(m.desgelcadas);
    const aus = m.ausentismos.filter(x => x.nombre.trim());
    const limpio = (s: string) => s.replace(/[\t\n]+/g, ' ').trim().toUpperCase();

    const bdMs: [string, string][] = [
        ['Dia', dia],
        ['PLANTA', 'MS'],
        ['OBJ PIEZAS', n(m.programado)],
        ['AUSENTISMO_GENERAL', String(aus.length)],
        ['Real Pintura Linea 1', a ? String(a.pintura.l1) : ''],
        ['Real Pintura Linea 2', a ? String(a.pintura.l2) : ''],
        ['Real Pintura Linea 3', a ? String(a.pintura.l3) : ''],
        ['Real Vaciado', a ? String(a.vaciado.total) : ''],
        ['ADM', n(m.adm)],
        ['CNC Pulido', n(m.cnc)],
        ['Real Acabado', n(m.acabado)],
        ['CALIDAD', a?.calidad == null ? '' : `${Math.round(a.calidad)}%`],
        ['Kg entregados al CEDI', n(m.kilos)],
        ['Mesones', n(m.mesones)]
    ];

    const paros = [
        ...conCausa(m.parosPintura).map(p => ({ proceso: 'PINTURA', p, tipo: 'REAL' })),
        ...conCausa(m.parosVaciado).map(p => ({ proceso: 'VACIADO', p, tipo: 'REAL' })),
        ...conCausa(m.reflejados).map(p => ({ proceso: '', p, tipo: 'REFLEJADO' }))
    ];

    const l: string[] = [];
    l.push(`Llena el informe MS del ${dia} en el Excel "Nivel de productividad" (hojas BD_MS y BD_PAROS) con los datos de abajo, siguiendo cómo se han llenado los días anteriores:`);
    l.push(
        '1. BD_MS: agrega una fila nueva para el día. Las columnas en gris son fórmulas: no escribas valores en ellas, cópiales la fórmula de la fila anterior.',
        '2. La mano de obra teórica (MO_TEORICA_MS_T1, T2, T3 y total) y las demás columnas de personas son las mismas durante toda la semana: tómalas de la fila anterior si es la misma semana. Si cambió la semana, pregúntame antes de llenarlas.',
        '3. TOTAL_PERSONAS y PRESENTISMO se calculan con el ausentismo del día, igual que en las filas anteriores.',
        '4. Horarios, tiempo de alimentación y demás columnas que no vienen en los datos: usa los mismos valores de la fila anterior.',
        '5. BD_PAROS: una fila por cada paro, con FAMILIA, MODO PERDIDA, EQUIPO, AREA RESPONSABLE y RESPONSABLE2 según cómo se han clasificado paros parecidos en el histórico. Antes de escribir, muéstrame una tabla con la clasificación sugerida de cada paro para revisarla.',
        '6. No modifiques filas de otros días.', ''
    );
    l.push('DATOS PARA BD_MS:');
    l.push(bdMs.map(c => c[0]).join('\t'), bdMs.map(c => c[1]).join('\t'), '');
    l.push('DATOS PARA BD_PAROS (falta clasificar FAMILIA, MODO PERDIDA, EQUIPO, AREA RESPONSABLE y RESPONSABLE2):');
    l.push(['FECHA', 'PLANTA', 'PROCESO', 'DESCRIPCIÓN', 'TIEMPO TOTAL (MIN)', 'TIPO DE PARO'].join('\t'));
    paros.forEach(({ proceso, p, tipo }) => l.push([dia, 'MS', proceso, limpio(p.causa), n(p.minutos), tipo].join('\t')));
    if (!paros.length) l.push('(sin paros)');
    l.push('');
    l.push('DATOS DE REFERENCIA (no tienen columna en BD_MS):');
    l.push(`Meta de kilos de la semana\t${n(m.metaKilos)}`);
    l.push(`Piezas vaciadas Ultracaster\t${ultracaster}`, `Colores\t${a ? a.colores : ''}`, `Piezas revisadas en inspección\t${a ? a.revisadas : ''}`);
    l.push(`Ausentismos\t${aus.map(x => `${x.nombre.trim()}${x.motivo.trim() ? ` (${x.motivo.trim().toLowerCase()})` : ''}`).join('; ')}`);
    l.push(`Piezas de reparación\t${n(m.reparacion)}`, `Piezas desgelcadas\t${desgelcadas}`, `Mesa de trabajo\t${n(m.mesaTrabajo)}`, `Barras\t${n(m.barras)}`);
    l.push(`Línea\t${n(m.linea)}`, `Línea buffer\t${n(m.lineaBuffer)}`, `Pulido\t${n(m.pulido)}`, `Auto mantenimiento\t${num(m.automantenimiento) == null ? '' : `${num(m.automantenimiento)}%`}`);
    if (a) l.push(`RRC\t${a.rrc.map(r => `${r.nombre}: ${r.cantidad}`).join('; ')}`);

    // El mismo informe que antes llegaba por WhatsApp, como respaldo para Claude
    l.push('', 'INFORME DEL SUPERVISOR (formato WhatsApp):', construirTextoMs(fecha, m, a));

    return l.join('\n');
}

// ---------------------------------------------------------------------------
// Guardado (tabla informe_turno_ms, ver informe_turno_ms.sql). Nunca se borra: un informe por día que se actualiza.
// ---------------------------------------------------------------------------

const mensajeTabla = (e: { message?: string; code?: string }) =>
    /informe_turno_ms/.test(e?.message || '') && /(does not exist|schema cache|not find)/i.test(e?.message || '')
        ? 'Falta ejecutar informe_turno_ms.sql en Supabase para poder guardar.'
        : e?.message || 'No se pudo guardar el informe';

export async function cargarInformesMs(client: SupabaseClient): Promise<InformeMsGuardado[]> {
    const { data, error } = await client
        .from('informe_turno_ms')
        .select('id, fecha, usuario_email, datos, texto, updated_at')
        .eq('activo', true)
        .order('fecha', { ascending: false })
        .limit(60);
    if (error) throw new Error(mensajeTabla(error));
    return (data as InformeMsGuardado[]) || [];
}

export async function guardarInformeMs(
    client: SupabaseClient,
    info: { id?: number; fecha: string; manual: ManualMs; auto: DatosAutoMs | null; texto: string }
): Promise<number> {
    const { data: u } = await client.auth.getUser();
    const fila = {
        fecha: info.fecha,
        usuario_uuid: u?.user?.id ?? null,
        usuario_email: u?.user?.email ?? null,
        datos: { manual: info.manual, auto: info.auto },
        texto: info.texto,
        updated_at: new Date().toISOString()
    };
    if (info.id) {
        const { error } = await client.from('informe_turno_ms').update(fila).eq('id', info.id);
        if (error) throw new Error(mensajeTabla(error));
        return info.id;
    }
    const { data, error } = await client.from('informe_turno_ms').insert(fila).select('id').single();
    if (error) throw new Error(mensajeTabla(error));
    return (data as { id: number }).id;
}
