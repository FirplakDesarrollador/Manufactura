// lib/prioridadesPlantas.ts
// Genera el libro "Prioridades Diarias Plantas" ya procesado (equivalente al resultado
// de correr la macro VBA "Procesar_Todas_las_Plantas_y_Resumen" sobre el Query - Semáforo),
// para que el usuario descargue el archivo final sin tener que abrir Excel y ejecutar nada.

import ExcelJS from "exceljs";
import { agregarTablaDinamica, calcularTablaDinamica, type TablaDinamicaSpec, type ValorTD } from "./excelTablaDinamica";

export interface SemaforoRow {
    originnum: string;
    nroOp: string;
    sku: string;
    descripcion: string;
    planta: string;
    familia: string;
    tipoOrden: string;
    cantPendiente: string;
    cantPendItem: string | null;
    cantTotal: string;
    disponiblePt01: string;
    fechaCreacionOp: string;
    estado: string;
    fechaRecomendadaLiberacion: string;
    fechaRealLiberacion: string;
    consumoParaLiberar: string;
    colorLiberacionTxt: string;
    colorLiberacion: string;
    cumplimientoLiberacion: string;
    fechaEntregaLote: string;
    fechaRecomendadaEntrega: string;
    fechaCierreOp: string | null;
    fechaIdealEntregaProduccion: string;
    consumoAmortiguadorPlanta: string;
    colorProduccionTxt: string;
    colorProduccion: string;
    cumplimientoPlanta: string;
    diasRetrazoFirplak: string;
    colorFirplakTxt: string;
    colorFirplak: string;
    cumplimientoFirplak: string;
    fechaPrometidaEntregaItem: string;
    destino: string;
    numLote: string;
    molde: string | null;
    capacidadMolde: string | null;
    fechaCargaMolde: string;
    amortiguador: string;
    cliente: string;
}

type ColKey = keyof SemaforoRow;

interface ColumnDef {
    key: ColKey;
    header: string;
}

// Orden exacto de columnas 1..39 tal como las espera la macro (C_ORIGINNUM=1 ... C_CLIENTE=39)
const COLUMNS: ColumnDef[] = [
    { key: "originnum", header: "Originnum" },
    { key: "nroOp", header: "Nro OP" },
    { key: "sku", header: "SKU" },
    { key: "descripcion", header: "Descripción Artículo" },
    { key: "planta", header: "Planta" },
    { key: "familia", header: "Familia" },
    { key: "tipoOrden", header: "Tipo Orden" },
    { key: "cantPendiente", header: "Cant. Pendiente" },
    { key: "cantPendItem", header: "Cant. Pend. Item" },
    { key: "cantTotal", header: "Cantidad total" },
    { key: "disponiblePt01", header: "Disponible PT01" },
    { key: "fechaCreacionOp", header: "Fecha Creación OP" },
    { key: "estado", header: "Estado" },
    { key: "fechaRecomendadaLiberacion", header: "Fecha Recomendada Liberación" },
    { key: "fechaRealLiberacion", header: "Fecha Real Liberación" },
    { key: "consumoParaLiberar", header: "Consumo Para Liberar" },
    { key: "colorLiberacionTxt", header: "Color Liberación Txt" },
    { key: "colorLiberacion", header: "Color Liberación" },
    { key: "cumplimientoLiberacion", header: "Cumplimiento Liberación" },
    { key: "fechaEntregaLote", header: "Fecha Entrega Lote" },
    { key: "fechaRecomendadaEntrega", header: "Fecha Recomendada de Entrega" },
    { key: "fechaCierreOp", header: "Fecha Cierre OP" },
    { key: "fechaIdealEntregaProduccion", header: "Fecha Ideal Entrega Producción" },
    { key: "consumoAmortiguadorPlanta", header: "Consumo Amortiguador Planta" },
    { key: "colorProduccionTxt", header: "Color Producción Txt" },
    { key: "colorProduccion", header: "Color Producción" },
    { key: "cumplimientoPlanta", header: "Cumplimiento Planta" },
    { key: "diasRetrazoFirplak", header: "Dias Retrazo Firplak" },
    { key: "colorFirplakTxt", header: "Color Firplak Txt" },
    { key: "colorFirplak", header: "Color Firplak" },
    { key: "cumplimientoFirplak", header: "Cumplimiento Firplak" },
    { key: "fechaPrometidaEntregaItem", header: "Fecha Prometida Entrega Item" },
    { key: "destino", header: "Destino" },
    { key: "numLote", header: "NumLote" },
    { key: "molde", header: "Molde" },
    { key: "capacidadMolde", header: "Capacidad Molde" },
    { key: "fechaCargaMolde", header: "Fecha Carga Molde" },
    { key: "amortiguador", header: "Amortiguador" },
    { key: "cliente", header: "Cliente" },
];

const DATE_KEYS = new Set<ColKey>([
    "fechaRecomendadaLiberacion",
    "fechaRealLiberacion",
    "fechaRecomendadaEntrega",
    "fechaIdealEntregaProduccion",
    "fechaPrometidaEntregaItem",
]);

const NUM_KEYS_SEMAFORO = new Set<ColKey>(["cantPendiente", "cantPendItem", "cantTotal", "disponiblePt01"]);

const VISIBLE_SEMAFORO_KEYS: ColKey[] = [
    "originnum", "nroOp", "descripcion", "planta", "familia", "tipoOrden", "cantPendiente",
    "estado", "fechaRecomendadaLiberacion", "fechaRealLiberacion", "fechaRecomendadaEntrega",
    "fechaIdealEntregaProduccion", "fechaPrometidaEntregaItem", "cliente",
];

const VISIBLE_PLANTA_KEYS: ColKey[] = [
    "nroOp", "descripcion", "planta", "cantPendiente", "fechaRealLiberacion",
    "fechaIdealEntregaProduccion", "fechaPrometidaEntregaItem", "cliente",
];

const PLANTAS = ["MS", "FV", "CEFI", "MBL", "INYECCION"] as const;

// Paleta (mismos valores RGB que la macro original)
const COLOR = {
    tituloBg: "FF323232",
    tituloFont: "FFFFFFFF",
    seccionBg: "FF595959",
    seccionFont: "FFFFFFFF",
    headerBg: "FFD9D9D9",
    headerFont: "FF000000",
    zebraPar: "FFE6E6E6",
    zebraImpar: "FFFFFFFF",
    atrasadoBg: "FFFFC7CE",
    atrasadoFont: "FF9C0006",
    atrasadoWBg: "FFFFE2B9",
    atrasadoWFont: "FF9C5700",
    hoyBg: "FFFFFF00",
    hoyFont: "FF000000",
    prioridadBg: "FFFF9933",
};

// ================= Utilidades de fecha/numero =================

// También la usa /api/sap/semaforo para avisar de fechas que no se pueden leer
export function parseFecha(raw: string | null | undefined): Date | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return isNaN(d.getTime()) ? null : d;
    }

    const generic = new Date(s);
    return isNaN(generic.getTime()) ? null : generic;
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function nextBusinessDay(d: Date): Date {
    const t = new Date(d);
    do {
        t.setDate(t.getDate() + 1);
    } while (t.getDay() === 0 || t.getDay() === 6);
    return t;
}

function parseNum(raw: string | null | undefined): number {
    if (raw === null || raw === undefined || raw === "") return 0;
    const n = parseFloat(String(raw).replace(",", "."));
    return isNaN(n) ? 0 : n;
}

function esLiberado(estado: string): boolean {
    return String(estado || "").trim().toUpperCase() === "LIBERADO";
}

function esPlanificado(estado: string): boolean {
    return String(estado || "").trim().toUpperCase().includes("PLANIFICADO");
}

function esPlanta(planta: string, nombre: string): boolean {
    return String(planta || "").trim().toUpperCase().includes(nombre);
}

function esSodimac(cliente: string): boolean {
    return String(cliente || "").trim().toUpperCase().includes("SODIMAC");
}

function multiplicadorFV(familia: string): number {
    switch (String(familia || "").trim().toUpperCase()) {
        case "FVH": return 2;
        case "FVHM": return 2;
        case "FVHMP": return 3;
        default: return 1;
    }
}

type Prioridad = "" | "ATRASADO" | "HOY" | "SODIMAC";

function calcularPrioridad(row: SemaforoRow, hoy: Date): Prioridad {
    const sodimac = esSodimac(row.cliente);
    const fIdeal = parseFecha(row.fechaIdealEntregaProduccion);
    if (fIdeal) {
        const f = startOfDay(fIdeal);
        if (f < hoy) return "ATRASADO";
        if (sameDate(f, hoy)) return "HOY";
        if (sodimac) return "SODIMAC";
        return "";
    }
    return sodimac ? "SODIMAC" : "";
}

// ================= Hoja cruda (ORIGINAL / SEMAFORO) =================

function escribirHojaDatos(
    ws: ExcelJS.Worksheet,
    data: SemaforoRow[],
    opts: { visibleKeys?: ColKey[]; autofilter?: boolean }
) {
    ws.views = [{ showGridLines: false }];

    const headerRow = ws.addRow(COLUMNS.map((c) => c.header));
    headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerBg } };
        cell.font = { bold: true, color: { argb: COLOR.headerFont } };
    });

    data.forEach((row) => {
        const values = COLUMNS.map((c) => {
            const raw = row[c.key];
            if (DATE_KEYS.has(c.key)) {
                const d = parseFecha(raw as string);
                return d ?? (raw ?? "");
            }
            if (opts.visibleKeys && NUM_KEYS_SEMAFORO.has(c.key)) {
                return parseNum(raw as string);
            }
            return raw ?? "";
        });
        const r = ws.addRow(values);
        COLUMNS.forEach((c, idx) => {
            const cell = r.getCell(idx + 1);
            if (DATE_KEYS.has(c.key) && cell.value instanceof Date) {
                cell.numFmt = "dd/mm/yyyy";
            }
            if (opts.visibleKeys && NUM_KEYS_SEMAFORO.has(c.key)) {
                cell.numFmt = "#,##0";
            }
        });
    });

    COLUMNS.forEach((c, idx) => {
        const col = ws.getColumn(idx + 1);
        col.width = c.key === "descripcion" ? 55 : c.key === "cliente" ? 30 : c.key === "cantPendiente" ? 10 : 16;
        if (opts.visibleKeys) {
            col.hidden = !opts.visibleKeys.includes(c.key);
        }
    });

    if (opts.autofilter && data.length > 0) {
        ws.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: data.length + 1, column: COLUMNS.length },
        };
    }
}

// ================= Hoja por planta =================

function filasPlanta(data: SemaforoRow[], plantaNombre: string): SemaforoRow[] {
    return data
        .filter((r) => esLiberado(r.estado) && esPlanta(r.planta, plantaNombre))
        .sort((a, b) => {
            const fa = parseFecha(a.fechaIdealEntregaProduccion);
            const fb = parseFecha(b.fechaIdealEntregaProduccion);
            if (!fa && !fb) return 0;
            if (!fa) return 1;
            if (!fb) return -1;
            return fa.getTime() - fb.getTime();
        });
}

function escribirHojaPlanta(ws: ExcelJS.Worksheet, data: SemaforoRow[], plantaNombre: string, hoy: Date) {
    ws.views = [{ showGridLines: false, state: "frozen", ySplit: 1 }];

    const cols = [...VISIBLE_PLANTA_KEYS];
    const headers = cols.map((k) => COLUMNS.find((c) => c.key === k)!.header);
    headers.push("PRIORIDAD");

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerBg } };
        cell.font = { bold: true, color: { argb: COLOR.headerFont } };
    });

    const rows = filasPlanta(data, plantaNombre);

    rows.forEach((row) => {
        const prioridad = calcularPrioridad(row, hoy);
        const values = cols.map((k) => {
            if (DATE_KEYS.has(k)) {
                return parseFecha(row[k] as string) ?? (row[k] ?? "");
            }
            if (k === "cantPendiente") return parseNum(row.cantPendiente);
            return row[k] ?? "";
        });
        values.push(prioridad);

        const r = ws.addRow(values);
        cols.forEach((k, idx) => {
            const cell = r.getCell(idx + 1);
            if (DATE_KEYS.has(k) && cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy";
            if (k === "cantPendiente") cell.numFmt = "#,##0";
        });

        const sodimac = esSodimac(row.cliente);
        let bg: string | null = null;
        let font: string | null = null;
        let bold = false;
        if (prioridad === "ATRASADO") {
            bg = COLOR.atrasadoBg;
            font = COLOR.atrasadoFont;
            bold = sodimac;
        } else if (prioridad === "HOY") {
            bg = COLOR.hoyBg;
            font = COLOR.hoyFont;
            bold = false;
        } else if (prioridad === "SODIMAC") {
            bg = COLOR.hoyBg;
            font = COLOR.hoyFont;
            bold = true;
        }
        if (bg) {
            r.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg! } };
                cell.font = { ...cell.font, color: { argb: font! }, bold };
            });
        }
    });

    cols.forEach((k, idx) => {
        const col = ws.getColumn(idx + 1);
        col.width = k === "descripcion" ? 55 : k === "cliente" ? 28 : k === "cantPendiente" ? 10 : 14;
    });
    ws.getColumn(cols.length + 1).width = 13;

    if (rows.length > 0) {
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: cols.length + 1 } };

        const prioridadColLetter = ws.getColumn(cols.length + 1).letter;
        ws.dataValidations.add(`${prioridadColLetter}2:${prioridadColLetter}${rows.length + 1}`, {
            type: "list",
            allowBlank: true,
            formulae: ['"ATRASADO,HOY,SODIMAC,PRIORIDAD"'],
        });
    }

    ws.pageSetup = {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
        printTitlesRow: "1:1",
    };
    ws.headerFooter = { oddFooter: `&D  -  Pagina &P de &N`, differentOddEven: false };
}

// ================= RESUMEN =================

function calcAtrasado(data: SemaforoRow[], planta: string, colFecha: ColKey, hoy: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, planta) && esLiberado(r.estado))
        .filter((r) => {
            const f = parseFecha(r[colFecha] as string);
            return f ? startOfDay(f) <= hoy : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente), 0);
}

function calcSigHabil(data: SemaforoRow[], planta: string, sigHab: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, planta) && esLiberado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaIdealEntregaProduccion);
            return f ? sameDate(startOfDay(f), sigHab) : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente), 0);
}

function calcPlanificadoMesesAnteriores(data: SemaforoRow[], planta: string, finMesAnt: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, planta) && esPlanificado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaRecomendadaLiberacion);
            return f ? startOfDay(f) <= finMesAnt : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente), 0);
}

function calcPlanificado(data: SemaforoRow[], planta: string, ini: Date, fin: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, planta) && esPlanificado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaRecomendadaLiberacion);
            if (!f) return false;
            const fd = startOfDay(f);
            return fd >= ini && fd <= fin;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente), 0);
}

function calcPlanificadoTotal(data: SemaforoRow[], planta: string): number {
    return data
        .filter((r) => esPlanta(r.planta, planta) && esPlanificado(r.estado))
        .reduce((acc, r) => acc + parseNum(r.cantPendiente), 0);
}

// Variantes de conversion FV (multiplican cantidad por familia)
function calcAtrasadoConvFV(data: SemaforoRow[], colFecha: ColKey, hoy: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, "FV") && esLiberado(r.estado))
        .filter((r) => {
            const f = parseFecha(r[colFecha] as string);
            return f ? startOfDay(f) <= hoy : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente) * multiplicadorFV(r.familia), 0);
}

function calcSigHabilConvFV(data: SemaforoRow[], sigHab: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, "FV") && esLiberado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaIdealEntregaProduccion);
            return f ? sameDate(startOfDay(f), sigHab) : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente) * multiplicadorFV(r.familia), 0);
}

function calcPlanificadoMesesAnterioresConvFV(data: SemaforoRow[], finMesAnt: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, "FV") && esPlanificado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaRecomendadaLiberacion);
            return f ? startOfDay(f) <= finMesAnt : false;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente) * multiplicadorFV(r.familia), 0);
}

function calcPlanificadoConvFV(data: SemaforoRow[], ini: Date, fin: Date): number {
    return data
        .filter((r) => esPlanta(r.planta, "FV") && esPlanificado(r.estado))
        .filter((r) => {
            const f = parseFecha(r.fechaRecomendadaLiberacion);
            if (!f) return false;
            const fd = startOfDay(f);
            return fd >= ini && fd <= fin;
        })
        .reduce((acc, r) => acc + parseNum(r.cantPendiente) * multiplicadorFV(r.familia), 0);
}

function calcPlanificadoTotalConvFV(data: SemaforoRow[]): number {
    return data
        .filter((r) => esPlanta(r.planta, "FV") && esPlanificado(r.estado))
        .reduce((acc, r) => acc + parseNum(r.cantPendiente) * multiplicadorFV(r.familia), 0);
}

const MESES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function fmtFecha(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
}

function escribirHojaResumen(ws: ExcelJS.Worksheet, data: SemaforoRow[], hoy: Date) {
    ws.views = [{ showGridLines: false }];

    const sigHab = nextBusinessDay(hoy);
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const iniM0 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finM0 = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const iniM1 = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    const finM1 = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
    const iniM2 = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 1);
    const finM2 = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0);

    ws.mergeCells("A1:I1");
    const title = ws.getCell("A1");
    title.value = `RESUMEN DIARIO DE PRODUCCION  -  ${fmtFecha(hoy)}`;
    title.font = { bold: true, size: 13, color: { argb: COLOR.tituloFont } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.tituloBg } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 32;

    ws.getRow(2).height = 5;

    const headers = [
        "PLANTA",
        `ATRASADAS\nF.Prometida Entrega\n(AF)`,
        `ATRASADAS\nF.Ideal Entrega Prod.\n(W)`,
        `PENDIENTE\nPROXIMO DIA HABIL\n${fmtFecha(sigHab)}`,
        `PLANIFICADO\nPENDIENTE\nMESES ANTERIORES`,
        `PLANIFICADO\nMES EN CURSO\n${MESES[hoy.getMonth()]}`,
        `PLANIFICADO\nMES+1\n${MESES[(hoy.getMonth() + 1) % 12]}`,
        `PLANIFICADO\nMES+2\n${MESES[(hoy.getMonth() + 2) % 12]}`,
        `PLANIFICADO\nTOTAL`,
    ];
    const headerRow = ws.getRow(3);
    headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        cell.font = { bold: true, color: { argb: COLOR.seccionFont } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.seccionBg } };
    });
    headerRow.height = 52;

    let fila = 4;
    const escribirFila = (nombre: string, vals: number[]) => {
        const r = ws.getRow(fila);
        r.getCell(1).value = nombre;
        vals.forEach((v, idx) => (r.getCell(idx + 2).value = v));
        const zebra = fila % 2 === 0 ? COLOR.zebraPar : COLOR.zebraImpar;
        for (let c = 1; c <= 9; c++) {
            const cell = r.getCell(c);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
            cell.alignment = { horizontal: c === 1 ? "left" : "center", vertical: "middle" };
        }
        r.height = 20;
        // Coloreado condicional (columnas B, C, D, E cuando > 0)
        const condCols: { col: number; bg: string; font: string }[] = [
            { col: 2, bg: COLOR.atrasadoBg, font: COLOR.atrasadoFont },
            { col: 3, bg: COLOR.atrasadoWBg, font: COLOR.atrasadoWFont },
            { col: 4, bg: COLOR.hoyBg, font: COLOR.hoyFont },
            { col: 5, bg: COLOR.atrasadoWBg, font: COLOR.atrasadoWFont },
        ];
        condCols.forEach(({ col, bg, font }) => {
            const val = r.getCell(col).value;
            if (typeof val === "number" && val > 0) {
                const cell = r.getCell(col);
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
                cell.font = { bold: true, color: { argb: font } };
            }
        });
        vals.forEach((_, idx) => (r.getCell(idx + 2).numFmt = "#,##0"));
        fila++;
    };

    PLANTAS.forEach((p) => {
        escribirFila(p, [
            calcAtrasado(data, p, "fechaPrometidaEntregaItem", hoy),
            calcAtrasado(data, p, "fechaIdealEntregaProduccion", hoy),
            calcSigHabil(data, p, sigHab),
            calcPlanificadoMesesAnteriores(data, p, finMesAnt),
            calcPlanificado(data, p, iniM0, finM0),
            calcPlanificado(data, p, iniM1, finM1),
            calcPlanificado(data, p, iniM2, finM2),
            calcPlanificadoTotal(data, p),
        ]);

        if (p === "FV") {
            escribirFila("FV (CONVERSION)", [
                calcAtrasadoConvFV(data, "fechaPrometidaEntregaItem", hoy),
                calcAtrasadoConvFV(data, "fechaIdealEntregaProduccion", hoy),
                calcSigHabilConvFV(data, sigHab),
                calcPlanificadoMesesAnterioresConvFV(data, finMesAnt),
                calcPlanificadoConvFV(data, iniM0, finM0),
                calcPlanificadoConvFV(data, iniM1, finM1),
                calcPlanificadoConvFV(data, iniM2, finM2),
                calcPlanificadoTotalConvFV(data),
            ]);
        }
    });

    for (let c = 1; c <= 9; c++) {
        for (let r = 3; r < fila; r++) {
            ws.getCell(r, c).border = {
                top: { style: "thin", color: { argb: "FFB4B4B4" } },
                bottom: { style: "thin", color: { argb: "FFB4B4B4" } },
                left: { style: "thin", color: { argb: "FFB4B4B4" } },
                right: { style: "thin", color: { argb: "FFB4B4B4" } },
            };
        }
    }

    ws.getColumn(1).width = 18;
    for (let c = 2; c <= 9; c++) ws.getColumn(c).width = 15;

    fila += 1;
    const leyendaTitulo = ws.getCell(fila, 1);
    leyendaTitulo.value = "LEYENDA  -  COLUMNA PRIORIDAD EN HOJAS DE PLANTA:";
    leyendaTitulo.font = { bold: true };
    ws.getRow(fila).height = 18;
    fila++;

    const leyenda: { texto: string; bg: string; font: string; bold: boolean }[] = [
        { texto: "ATRASADO              -  F.Ideal Entrega Prod. vencida (W < hoy)  -  Maxima prioridad", bg: COLOR.atrasadoBg, font: COLOR.atrasadoFont, bold: false },
        { texto: "ATRASADO + SODIMAC    -  Vencida Y cliente Sodimac  -  Rojo con NEGRITA", bg: COLOR.atrasadoBg, font: COLOR.atrasadoFont, bold: true },
        { texto: "HOY                   -  F.Ideal Entrega Prod. = hoy  -  Entregar hoy", bg: COLOR.hoyBg, font: COLOR.hoyFont, bold: false },
        { texto: "SODIMAC               -  Cliente Sodimac con fecha futura  -  Prioridad canal", bg: COLOR.hoyBg, font: COLOR.hoyFont, bold: true },
        { texto: "PRIORIDAD             -  Marcacion manual del supervisor", bg: COLOR.prioridadBg, font: "FF000000", bold: false },
    ];
    leyenda.forEach((l) => {
        ws.mergeCells(fila, 1, fila, 6);
        const cell = ws.getCell(fila, 1);
        cell.value = l.texto;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: l.bg } };
        cell.font = { color: { argb: l.font }, bold: l.bold };
        ws.getRow(fila).height = 16;
        fila++;
    });
}

// ================= CONCENTRACION MS (tabla dinámica) =================
// Tabla dinámica real (como la del archivo manual): filtros CONCENTRACION MS = SI, Estado = Liberado +
// Planificado y Planta = MS; filas por Molde con la suma de Cant. Pendiente, de mayor a menor.
// CONCENTRACION MS = SI para lo Liberado y lo Planificado con Fecha Recomendada Liberación hasta fin de mes.

const HOJA_CONCENTRACION = "CONCENTRACION MS";
const HOJA_DATOS_CONCENTRACION = "DATOS CONCENTRACION";
const CAMPOS_CONCENTRACION = ["Nro OP", "Descripción Artículo", "Planta", "Estado", "Molde", "Cant. Pendiente", "CONCENTRACION MS"];

function specConcentracionMS(data: SemaforoRow[], hoy: Date): TablaDinamicaSpec {
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const texto = (v: unknown) => String(v ?? "").trim();

    const filas: ValorTD[][] = data.map((r) => {
        let concentracion = "NO";
        if (esLiberado(r.estado)) concentracion = "SI";
        else if (esPlanificado(r.estado)) {
            const f = parseFecha(r.fechaRecomendadaLiberacion);
            if (f && startOfDay(f) <= finMes) concentracion = "SI";
        }
        return [texto(r.nroOp), texto(r.descripcion), texto(r.planta), texto(r.estado), texto(r.molde) || null, parseNum(r.cantPendiente), concentracion];
    });

    const distintos = (i: number, regla: (v: string) => boolean) => [...new Set(filas.map((f) => String(f[i] ?? "")))].filter((v) => v && regla(v));
    const estados = distintos(3, (v) => esLiberado(v) || esPlanificado(v));
    const plantas = distintos(2, (v) => esPlanta(v, "MS"));
    // Sin estos valores la tabla mostraría otra cosa sin avisar: mejor que falle y se vea el error
    if (!plantas.length) throw new Error("CONCENTRACION MS: el Semáforo no trae registros de la planta MS");
    if (!estados.length) throw new Error("CONCENTRACION MS: el Semáforo no trae registros en estado Liberado ni Planificado");

    return {
        hojaDatos: HOJA_DATOS_CONCENTRACION,
        hojaTabla: HOJA_CONCENTRACION,
        campos: CAMPOS_CONCENTRACION,
        numericos: ["Cant. Pendiente"],
        filas,
        filtros: [
            { campo: "CONCENTRACION MS", seleccion: ["SI"] },
            { campo: "Estado", seleccion: estados },
            { campo: "Planta", seleccion: plantas },
        ],
        campoFilas: "Molde",
        campoValor: "Cant. Pendiente",
        nombreTabla: "TablaConcentracionMS",
    };
}

// Hoja de datos (oculta) que alimenta la tabla dinámica
function escribirHojaDatosConcentracion(ws: ExcelJS.Worksheet, spec: TablaDinamicaSpec) {
    ws.state = "hidden";
    ws.addRow(spec.campos);
    ws.getRow(1).font = { bold: true };
    spec.filas.forEach((f) => ws.addRow(f.map((v) => v ?? undefined)));
    ws.getColumn(2).width = 50;
    ws.getColumn(5).width = 45;
}

// Lo que muestra la tabla al abrir el archivo (Excel lo reescribe igual al actualizar la tabla)
function escribirHojaConcentracionMS(ws: ExcelJS.Worksheet, spec: TablaDinamicaSpec) {
    const res = calcularTablaDinamica(spec);
    spec.filtros.forEach((f, i) => {
        ws.getCell(i + 1, 1).value = f.campo;
        ws.getCell(i + 1, 2).value = res.textoFiltro(f.campo);
    });
    const inicio = spec.filtros.length + 2;
    ws.getCell(inicio, 1).value = "Etiquetas de fila";
    ws.getCell(inicio, 2).value = `Suma de ${spec.campoValor}`;
    res.filasVisibles.forEach((f, i) => {
        ws.getCell(inicio + 1 + i, 1).value = f.etiqueta;
        ws.getCell(inicio + 1 + i, 2).value = f.total;
    });
    ws.getCell(inicio + 1 + res.filasVisibles.length, 1).value = "Total general";
    ws.getCell(inicio + 1 + res.filasVisibles.length, 2).value = res.totalGeneral;
    ws.getColumn(1).width = 55;
    ws.getColumn(2).width = 24;
}

// ================= Punto de entrada =================

export async function generarPrioridadesPlantasBuffer(data: SemaforoRow[]): Promise<ArrayBuffer> {
    const hoy = startOfDay(new Date());
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Manufactura FIRPLAK";
    workbook.created = new Date();

    // Orden final de pestañas: RESUMEN, MS, FV, INYECCION, MBL, CEFI, SEMAFORO, ORIGINAL, CONCENTRACION MS (+ DATOS CONCENTRACION oculta)
    const wsResumen = workbook.addWorksheet("RESUMEN");
    escribirHojaResumen(wsResumen, data, hoy);

    const ordenPlantasHojas = ["MS", "FV", "INYECCION", "MBL", "CEFI"];
    ordenPlantasHojas.forEach((p) => {
        const ws = workbook.addWorksheet(p);
        escribirHojaPlanta(ws, data, p, hoy);
    });

    const wsSemaforo = workbook.addWorksheet("SEMAFORO");
    escribirHojaDatos(wsSemaforo, data, { visibleKeys: VISIBLE_SEMAFORO_KEYS, autofilter: true });

    const wsOriginal = workbook.addWorksheet("ORIGINAL");
    escribirHojaDatos(wsOriginal, data, {});

    const specConc = specConcentracionMS(data, hoy);
    escribirHojaConcentracionMS(workbook.addWorksheet(HOJA_CONCENTRACION), specConc);
    escribirHojaDatosConcentracion(workbook.addWorksheet(HOJA_DATOS_CONCENTRACION), specConc);

    workbook.views = [{ activeTab: 0 }];

    // ExcelJS no crea tablas dinámicas: se agrega aparte sobre el archivo generado
    return agregarTablaDinamica(await workbook.xlsx.writeBuffer(), specConc);
}

export async function descargarPrioridadesPlantas(data: SemaforoRow[]): Promise<number> {
    const buffer = await generarPrioridadesPlantasBuffer(data);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const hoy = startOfDay(new Date());
    const nombre = `Prioridades_Diarias_Plantas_${String(hoy.getDate()).padStart(2, "0")}${String(hoy.getMonth() + 1).padStart(2, "0")}${hoy.getFullYear()}.xlsx`;

    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filasPlanta(data, "MS").length +
        filasPlanta(data, "FV").length +
        filasPlanta(data, "INYECCION").length +
        filasPlanta(data, "MBL").length +
        filasPlanta(data, "CEFI").length;
}
