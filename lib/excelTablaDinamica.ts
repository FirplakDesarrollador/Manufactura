// lib/excelTablaDinamica.ts
// Agrega una tabla dinámica real de Excel a un libro generado con ExcelJS (ExcelJS no las crea).
// Se escriben a mano las partes del archivo .xlsx: caché (definición + registros), la tabla y sus
// relaciones. La caché lleva los datos completos, así que la tabla se ve aunque Excel abra el archivo
// en Vista protegida; además se actualiza sola al abrir (refreshOnLoad) para quedar idéntica a Excel.

import JSZip from "jszip";

export type ValorTD = string | number | null;

export interface FiltroTD {
    campo: string;
    // Valores que quedan marcados en el filtro (exactos, como vienen en los datos)
    seleccion: string[];
}

export interface TablaDinamicaSpec {
    hojaDatos: string;          // hoja con los datos fuente (fila 1 = encabezados)
    hojaTabla: string;          // hoja donde va la tabla dinámica
    campos: string[];           // encabezados de la hoja de datos, en orden
    numericos: string[];        // campos numéricos (el resto se trata como texto)
    filas: ValorTD[][];         // registros, en el mismo orden de `campos`
    filtros: FiltroTD[];        // filtros de página, de arriba hacia abajo
    campoFilas: string;         // campo en Etiquetas de fila
    campoValor: string;         // campo que se suma
    nombreTabla: string;
}

export interface ResultadoTD {
    // Lo que debe quedar escrito en la hoja (Excel lo reescribe igual al actualizar)
    filasVisibles: Array<{ etiqueta: string; total: number }>;
    totalGeneral: number;
    textoFiltro: (campo: string) => string;
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const esc = (s: string) => s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const vacio = (v: ValorTD) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

// Calcula lo que mostrará la tabla con los filtros indicados (para escribir la hoja y las filas de la caché)
export function calcularTablaDinamica(spec: TablaDinamicaSpec): ResultadoTD {
    const idx = (c: string) => {
        const i = spec.campos.indexOf(c);
        if (i < 0) throw new Error(`Tabla dinámica: el campo "${c}" no está en los datos`);
        return i;
    };
    const iFila = idx(spec.campoFilas);
    const iValor = idx(spec.campoValor);
    const filtros = spec.filtros.map(f => ({ i: idx(f.campo), sel: new Set(f.seleccion) }));
    const sumas = new Map<string, number>();
    let total = 0;
    for (const r of spec.filas) {
        if (!filtros.every(f => f.sel.size === 0 || f.sel.has(String(r[f.i] ?? "")))) continue;
        const etiqueta = vacio(r[iFila]) ? "(en blanco)" : String(r[iFila]);
        const v = Number(r[iValor]) || 0;
        sumas.set(etiqueta, (sumas.get(etiqueta) || 0) + v);
        total += v;
    }
    const filasVisibles = [...sumas].map(([etiqueta, t]) => ({ etiqueta, total: t }))
        .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));
    return {
        filasVisibles,
        totalGeneral: total,
        textoFiltro: (campo) => {
            const f = spec.filtros.find(x => x.campo === campo);
            if (!f || f.seleccion.length === 0) return "(Todas)";
            return f.seleccion.length === 1 ? f.seleccion[0] : "(Varios elementos)";
        }
    };
}

// Busca la ruta del XML de una hoja por su nombre
async function rutaHoja(zip: JSZip, nombre: string): Promise<string> {
    const wb = await zip.file("xl/workbook.xml")!.async("string");
    const m = [...wb.matchAll(/<sheet\b[^>]*>/g)].map(x => x[0])
        .find(t => (t.match(/name="([^"]*)"/)?.[1] ?? "") === esc(nombre));
    if (!m) throw new Error(`Tabla dinámica: no existe la hoja "${nombre}"`);
    const rid = m.match(/r:id="([^"]+)"/)![1];
    const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(x => x[0]).find(t => t.includes(`Id="${rid}"`));
    const target = rel?.match(/Target="([^"]+)"/)?.[1];
    if (!target) throw new Error(`Tabla dinámica: no se encontró el archivo de la hoja "${nombre}"`);
    return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

const colLetra = (n: number) => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

export async function agregarTablaDinamica(buffer: ArrayBuffer | Uint8Array, spec: TablaDinamicaSpec): Promise<ArrayBuffer> {
    const zip = await JSZip.loadAsync(buffer);
    const res = calcularTablaDinamica(spec);
    const numericos = new Set(spec.numericos);

    // Elementos compartidos de cada campo de texto (orden de aparición) y su índice
    const items = spec.campos.map((c, ci) => {
        if (numericos.has(c)) return null;
        const lista: string[] = [];
        const pos = new Map<string, number>();
        let hayVacio = false;
        for (const r of spec.filas) {
            if (vacio(r[ci])) { hayVacio = true; continue; }
            const v = String(r[ci]);
            if (!pos.has(v)) { pos.set(v, lista.length); lista.push(v); }
        }
        return { lista, pos, hayVacio, iVacio: lista.length };
    });

    // --- Definición de la caché ---
    const cacheFields = spec.campos.map((c, ci) => {
        const it = items[ci];
        if (!it) {
            const nums = spec.filas.map(r => Number(r[ci]) || 0);
            const enteros = nums.every(n => Number.isInteger(n));
            const min = nums.length ? Math.min(...nums) : 0, max = nums.length ? Math.max(...nums) : 0;
            return `<cacheField name="${esc(c)}" numFmtId="0"><sharedItems containsSemiMixedTypes="0" containsString="0" containsNumber="1"${enteros ? ' containsInteger="1"' : ""} minValue="${min}" maxValue="${max}"/></cacheField>`;
        }
        const n = it.lista.length + (it.hayVacio ? 1 : 0);
        return `<cacheField name="${esc(c)}" numFmtId="0"><sharedItems${it.hayVacio ? ' containsBlank="1"' : ""} count="${n}">${it.lista.map(v => `<s v="${esc(v)}"/>`).join("")}${it.hayVacio ? "<m/>" : ""}</sharedItems></cacheField>`;
    }).join("");
    const ultimaCol = colLetra(spec.campos.length);
    const cacheDef = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheDefinition ${NS} r:id="rId1" refreshOnLoad="1" refreshedBy="Manufactura FIRPLAK" refreshedDate="${(Date.now() / 86400000 + 25569).toFixed(6)}" createdVersion="6" refreshedVersion="6" minRefreshableVersion="3" recordCount="${spec.filas.length}"><cacheSource type="worksheet"><worksheetSource ref="A1:${ultimaCol}${spec.filas.length + 1}" sheet="${esc(spec.hojaDatos)}"/></cacheSource><cacheFields count="${spec.campos.length}">${cacheFields}</cacheFields></pivotCacheDefinition>`;

    // --- Registros de la caché ---
    const registros = spec.filas.map(r => "<r>" + spec.campos.map((c, ci) => {
        const it = items[ci];
        if (!it) return `<n v="${Number(r[ci]) || 0}"/>`;
        return `<x v="${vacio(r[ci]) ? it.iVacio : it.pos.get(String(r[ci]))}"/>`;
    }).join("") + "</r>").join("");
    const cacheRec = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheRecords ${NS} count="${spec.filas.length}">${registros}</pivotCacheRecords>`;

    // --- Tabla dinámica ---
    const iFila = spec.campos.indexOf(spec.campoFilas);
    const iValor = spec.campos.indexOf(spec.campoValor);
    const itFila = items[iFila]!;
    // Elementos de la fila en el orden en que se muestran (mayor a menor); los demás al final
    const ordenFila: number[] = [];
    for (const f of res.filasVisibles) ordenFila.push(f.etiqueta === "(en blanco)" && itFila.hayVacio ? itFila.iVacio : itFila.pos.get(f.etiqueta)!);
    for (let k = 0; k < itFila.lista.length + (itFila.hayVacio ? 1 : 0); k++) if (!ordenFila.includes(k)) ordenFila.push(k);

    const pivotFields = spec.campos.map((c, ci) => {
        const it = items[ci];
        if (ci === iValor) return `<pivotField dataField="1" showAll="0"/>`;
        if (ci === iFila) {
            return `<pivotField axis="axisRow" showAll="0" sortType="descending"><items count="${ordenFila.length + 1}">${ordenFila.map(x => `<item x="${x}"/>`).join("")}<item t="default"/></items><autoSortScope><pivotArea dataOnly="0" outline="0" fieldPosition="0"><references count="1"><reference field="4294967294" count="1" selected="0"><x v="0"/></reference></references></pivotArea></autoSortScope></pivotField>`;
        }
        const filtro = spec.filtros.find(f => f.campo === c);
        if (filtro && it) {
            const total = it.lista.length + (it.hayVacio ? 1 : 0);
            const varios = filtro.seleccion.length > 1;
            const sel = new Set(filtro.seleccion);
            const lista = Array.from({ length: total }, (_, k) => {
                const valor = k === it.iVacio && it.hayVacio ? "" : it.lista[k];
                return `<item x="${k}"${varios && !sel.has(valor) ? ' h="1"' : ""}/>`;
            }).join("");
            return `<pivotField axis="axisPage" showAll="0"${varios ? ' multipleItemSelectionAllowed="1"' : ""}><items count="${total + 1}">${lista}<item t="default"/></items></pivotField>`;
        }
        return `<pivotField showAll="0"/>`;
    }).join("");

    const n = res.filasVisibles.length;
    const rowItems = res.filasVisibles.map((_, k) => k === 0 ? "<i><x/></i>" : `<i><x v="${k}"/></i>`).join("") + '<i t="grand"><x/></i>';
    const pageFields = spec.filtros.map(f => {
        const ci = spec.campos.indexOf(f.campo);
        const it = items[ci]!;
        const unico = f.seleccion.length === 1 ? ` item="${f.seleccion[0] === "" ? it.iVacio : it.pos.get(f.seleccion[0])}"` : "";
        return `<pageField fld="${ci}"${unico} hier="-1"/>`;
    }).join("");
    const filaInicio = spec.filtros.length + 2;
    const tabla = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotTableDefinition ${NS} name="${esc(spec.nombreTabla)}" cacheId="1" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Valores" updatedVersion="6" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="6" indent="0" outline="1" outlineData="1" multipleFieldFilters="0"><location ref="A${filaInicio}:B${filaInicio + n + 1}" firstHeaderRow="1" firstDataRow="1" firstDataCol="1" rowPageCount="${spec.filtros.length}" colPageCount="1"/><pivotFields count="${spec.campos.length}">${pivotFields}</pivotFields><rowFields count="1"><field x="${iFila}"/></rowFields><rowItems count="${n + 1}">${rowItems}</rowItems><colItems count="1"><i/></colItems><pageFields count="${spec.filtros.length}">${pageFields}</pageFields><dataFields count="1"><dataField name="${esc(`Suma de ${spec.campoValor}`)}" fld="${iValor}" baseField="0" baseItem="0"/></dataFields><pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>`;

    // --- Archivos y relaciones ---
    zip.file("xl/pivotCache/pivotCacheDefinition1.xml", cacheDef);
    zip.file("xl/pivotCache/pivotCacheRecords1.xml", cacheRec);
    zip.file("xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/pivotCacheRecords" Target="pivotCacheRecords1.xml"/></Relationships>`);
    zip.file("xl/pivotTables/pivotTable1.xml", tabla);
    zip.file("xl/pivotTables/_rels/pivotTable1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition1.xml"/></Relationships>`);

    // Hoja de la tabla -> tabla dinámica
    const hoja = await rutaHoja(zip, spec.hojaTabla);
    const relsHoja = hoja.replace(/worksheets\/([^/]+)$/, "worksheets/_rels/$1.rels");
    const relPivot = `<Relationship Id="rIdTablaDinamica1" Type="${REL}/pivotTable" Target="../pivotTables/pivotTable1.xml"/>`;
    const existente = zip.file(relsHoja);
    zip.file(relsHoja, existente
        ? (await existente.async("string")).replace("</Relationships>", `${relPivot}</Relationships>`)
        : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relPivot}</Relationships>`);

    // Libro -> caché
    const relsLibro = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
    zip.file("xl/_rels/workbook.xml.rels", relsLibro.replace("</Relationships>",
        `<Relationship Id="rIdCacheDinamica1" Type="${REL}/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/></Relationships>`));
    let libro = await zip.file("xl/workbook.xml")!.async("string");
    const pivotCaches = `<pivotCaches><pivotCache cacheId="1" r:id="rIdCacheDinamica1"/></pivotCaches>`;
    // Orden del esquema: ... definedNames, calcPr, oleSize, customWorkbookViews, pivotCaches, ...
    const despues = libro.match(/<calcPr\b[^>]*\/>|<calcPr\b[\s\S]*?<\/calcPr>/) || libro.match(/<\/definedNames>/) || libro.match(/<\/sheets>/);
    if (!despues) throw new Error("Tabla dinámica: estructura de workbook.xml no reconocida");
    libro = libro.replace(despues[0], despues[0] + pivotCaches);
    if (!libro.includes("xmlns:r=")) libro = libro.replace("<workbook ", `<workbook xmlns:r="${REL}" `);
    zip.file("xl/workbook.xml", libro);

    // Tipos de contenido
    let tipos = await zip.file("[Content_Types].xml")!.async("string");
    const ct = "application/vnd.openxmlformats-officedocument.spreadsheetml";
    tipos = tipos.replace("</Types>",
        `<Override PartName="/xl/pivotCache/pivotCacheDefinition1.xml" ContentType="${ct}.pivotCacheDefinition+xml"/>` +
        `<Override PartName="/xl/pivotCache/pivotCacheRecords1.xml" ContentType="${ct}.pivotCacheRecords+xml"/>` +
        `<Override PartName="/xl/pivotTables/pivotTable1.xml" ContentType="${ct}.pivotTable+xml"/></Types>`);
    zip.file("[Content_Types].xml", tipos);

    return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
