import { NextResponse } from 'next/server';
import { parseFecha } from '@/lib/prioridadesPlantas';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Permitir hasta 60 segundos (útil para Vercel si la API tarda >10s)

// Semáforo de producción (query "FPK - Semaforo - DJP") vía la API de Sistemas.
// Esta información es crítica: cualquier falla o dato que no llegue se informa (error o advertencia);
// nunca se responde "éxito" con datos vacíos o incompletos sin decirlo.

// Campo de la app, nombre visible y nombres posibles en la API (UDT o vista de Python)
const COLUMNAS: Array<[string, string, string[]]> = [
    ['originnum', 'Originnum', ['U_Originnum', 'Originnum']],
    ['nroOp', 'Nro OP', ['U_NroOP', 'Nro OP', 'NroOP']],
    ['sku', 'SKU', ['U_SKU', 'SKU']],
    ['descripcion', 'Descripción Artículo', ['U_DescArticulo', 'Descripción Artículo', 'DescArticulo']],
    ['planta', 'Planta', ['U_Planta', 'Planta']],
    ['familia', 'Familia', ['U_Familia', 'Familia']],
    ['tipoOrden', 'Tipo Orden', ['U_TipoOrden', 'Tipo Orden', 'TipoOrden']],
    ['cantPendiente', 'Cant. Pendiente', ['U_CantPendiente', 'Cant. Pendiente', 'CantPendiente']],
    ['cantPendItem', 'Cant. Pend. Item', ['U_CantPendItem', 'Cant. Pend. Item', 'CantPendItem']],
    ['cantTotal', 'Cantidad total', ['U_CantidadTotal', 'Cantidad total', 'CantidadTotal']],
    ['disponiblePt01', 'Disponible PT01', ['U_DisponiblePT01', 'Disponible PT01', 'DisponiblePT01']],
    ['fechaCreacionOp', 'Fecha Creación OP', ['U_FechaCreacionOP', 'Fecha Creación OP', 'FechaCreacionOP']],
    ['estado', 'Estado', ['U_Estado', 'Estado']],
    ['fechaRecomendadaLiberacion', 'Fecha Recomendada Liberación', ['U_FechaRecoLib', 'Fecha Recomendada Liberación', 'FechaRecoLib']],
    ['fechaRealLiberacion', 'Fecha Real Liberación', ['U_FechaRealLib', 'Fecha Real Liberación', 'FechaRealLib']],
    ['consumoParaLiberar', 'Consumo Para Liberar', ['U_ConsumoParaLib', 'Consumo Para Liberar', 'ConsumoParaLib']],
    ['colorLiberacionTxt', 'Color Liberación Txt', ['U_ColorLibTxt', 'Color Liberación Txt', 'ColorLibTxt']],
    ['colorLiberacion', 'Color Liberación', ['U_ColorLib', 'Color Liberación', 'ColorLib']],
    ['cumplimientoLiberacion', 'Cumplimiento Liberación', ['U_CumpLib', 'Cumplimiento Liberación', 'CumpLib']],
    ['fechaEntregaLote', 'Fecha Entrega Lote', ['U_FechaEntLote', 'Fecha Entrega Lote', 'FechaEntLote']],
    ['fechaRecomendadaEntrega', 'Fecha Recomendada de Entrega', ['U_FechaRecoEnt', 'Fecha Recomendada de Entrega', 'FechaRecoEnt']],
    ['fechaCierreOp', 'Fecha Cierre OP', ['U_FechaCierreOP', 'Fecha Cierre OP', 'FechaCierreOP']],
    ['fechaIdealEntregaProduccion', 'Fecha Ideal Entrega Producción', ['U_FechaIdealEnt', 'Fecha Ideal Entrega Producción', 'FechaIdealEnt']],
    ['consumoAmortiguadorPlanta', 'Consumo Amortiguador Planta', ['U_ConsumoAmort', 'Consumo Amortiguador Planta', 'ConsumoAmort']],
    ['colorProduccionTxt', 'Color Producción Txt', ['U_ColorProdTxt', 'Color Producción Txt', 'ColorProdTxt']],
    ['colorProduccion', 'Color Producción', ['U_ColorProd', 'Color Producción', 'ColorProd']],
    ['cumplimientoPlanta', 'Cumplimiento Planta', ['U_CumpPlanta', 'Cumplimiento Planta', 'CumpPlanta']],
    ['diasRetrazoFirplak', 'Dias Retrazo Firplak', ['U_DiasRetrazo', 'Dias Retrazo Firplak', 'DiasRetrazo']],
    ['colorFirplakTxt', 'Color Firplak Txt', ['U_ColorFirplakTxt', 'Color Firplak Txt', 'ColorFirplakTxt']],
    ['colorFirplak', 'Color Firplak', ['U_ColorFirplak', 'Color Firplak', 'ColorFirplak']],
    ['cumplimientoFirplak', 'Cumplimiento Firplak', ['U_CumpFirplak', 'Cumplimiento Firplak', 'CumpFirplak']],
    ['fechaPrometidaEntregaItem', 'Fecha Prometida Entrega Item', ['U_FechaPromEnt', 'Fecha Prometida Entrega Item', 'FechaPromEnt']],
    ['destino', 'Destino', ['U_Destino', 'Destino']],
    ['numLote', 'NumLote', ['U_NumLote', 'NumLote']],
    ['molde', 'Molde', ['U_Molde', 'Molde']],
    ['capacidadMolde', 'Capacidad Molde', ['U_CapacidadMolde', 'Capacidad Molde', 'CapacidadMolde']],
    ['fechaCargaMolde', 'Fecha Carga Molde', ['U_FechaCargaMolde', 'Fecha Carga Molde', 'FechaCargaMolde']],
    ['amortiguador', 'Amortiguador', ['U_Amortiguador', 'Amortiguador']],
    ['cliente', 'Cliente', ['U_Cliente', 'Cliente']]
];

// Datos sin los que una fila no sirve para priorizar
const OBLIGATORIOS = ['nroOp', 'sku', 'planta', 'estado', 'cantPendiente'];
// Columnas que pueden venir vacías en todas las filas sin que sea un error (p. ej. órdenes aún abiertas)
const PUEDEN_VENIR_VACIAS = new Set(['fechaCierreOp', 'cantPendItem', 'molde', 'capacidadMolde', 'fechaCargaMolde']);
const FECHAS = ['fechaRecomendadaLiberacion', 'fechaRealLiberacion', 'fechaRecomendadaEntrega', 'fechaIdealEntregaProduccion', 'fechaPrometidaEntregaItem'];
const NUMEROS = ['cantPendiente', 'cantTotal', 'disponiblePt01'];
// Plantas que procesa "Prioridades diarias de Plantas" (lib/prioridadesPlantas.ts)
const PLANTAS = ['MS', 'FV', 'CEFI', 'MBL', 'INYECCION'];

const vacio = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
const ejemplos = (filas: number[]) => `filas ${filas.slice(0, 5).join(', ')}${filas.length > 5 ? '…' : ''}`;

function fallo(error: string, detalle: string, status = 502) {
    console.error('Semáforo:', error, '|', detalle);
    return NextResponse.json({ success: false, error, details: detalle.slice(0, 500) }, { status });
}

export async function GET() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const apiUrl = process.env.SEMAFORO_API_URL || "https://toner-villages-acoustic-colony.trycloudflare.com/semaforo";
    const apiKey = process.env.SEMAFORO_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';
    let host = 'desconocido';
    try { host = new URL(apiUrl).host } catch { /* URL inválida: la consulta fallará y se informa */ }
    const fuente = host.includes('ngrok') ? 'API de Sistemas (ngrok)' : host.includes('trycloudflare') ? 'API de Sistemas (Cloudflare)' : `API de Sistemas (${host})`;

    // 1) Consulta
    let res: Response;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    try {
        res = await fetch(apiUrl, { headers: { 'api-key': apiKey }, cache: 'no-store', signal: ctrl.signal });
    } catch (e: any) {
        return fallo(
            e?.name === 'AbortError'
                ? 'La API del Semáforo no respondió en 55 segundos (tiempo agotado).'
                : `No hay conexión con la API del Semáforo de Sistemas (${host}). El túnel puede estar apagado o la dirección cambió.`,
            e?.cause?.code || e?.message || String(e)
        );
    } finally {
        clearTimeout(timer);
    }

    const texto = await res.text();
    if (!res.ok) {
        const plano = texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        let error = `La API del Semáforo respondió con error HTTP ${res.status}.`;
        if (/ERR_NGROK_3200|is offline/i.test(texto)) error = `El túnel ngrok de Sistemas está apagado (${host} offline, ERR_NGROK_3200).`;
        else if (/ERR_NGROK/i.test(texto)) error = `El túnel ngrok de Sistemas respondió con error (HTTP ${res.status}).`;
        else if (host.includes('trycloudflare') && [404, 502, 530].includes(res.status)) error = `El túnel de Cloudflare de Sistemas está caído o cambió de dirección (HTTP ${res.status}).`;
        else if (res.status === 401 || res.status === 403) error = `La API del Semáforo rechazó la llave de acceso (HTTP ${res.status}).`;
        return fallo(error, plano || texto);
    }

    let data: any;
    try {
        data = JSON.parse(texto);
    } catch {
        return fallo('La API del Semáforo respondió algo que no es JSON (respuesta no válida).', texto.replace(/\s+/g, ' '));
    }
    if (data && data.error) {
        return fallo(`La API del Semáforo informó un error: ${data.message || data.error}`, JSON.stringify(data));
    }

    const registros: any[] | null = Array.isArray(data) ? data : Array.isArray(data?.response) ? data.response : null;
    if (!registros) {
        return fallo('La API del Semáforo respondió en un formato que la app no reconoce (no trae la lista de registros).',
            `Claves recibidas: ${data && typeof data === 'object' ? Object.keys(data).join(', ') : typeof data}`);
    }
    if (registros.length === 0) {
        return fallo('La consulta del Semáforo devolvió 0 registros. El Semáforo nunca debería estar vacío: la query o la API de Sistemas tienen un problema.', 'Lista vacía');
    }

    // 2) Mapeo
    const reconocidas = new Set(COLUMNAS.flatMap(([, , nombres]) => nombres));
    const mapped = registros.map((r: any, index: number) => {
        const fila: Record<string, any> = { id: index + 1 };
        for (const [campo, , nombres] of COLUMNAS) {
            const nombre = nombres.find(n => r?.[n] != null);
            fila[campo] = nombre ? r[nombre] : null;
        }
        return fila;
    });

    // 3) Validación: todo lo que falte o no se reconozca se informa
    const advertencias: string[] = [];
    const etiqueta = Object.fromEntries(COLUMNAS.map(([c, l]) => [c, l]));

    const sinColumna = COLUMNAS.filter(([c, , nombres]) => !PUEDEN_VENIR_VACIAS.has(c) && !registros.some(r => nombres.some(n => r?.[n] !== undefined)));
    if (sinColumna.length) advertencias.push(`Columnas que no llegaron en ningún registro (pudo cambiar su nombre en la API): ${sinColumna.map(([, l]) => l).join(', ')}.`);

    const extra = [...new Set(registros.flatMap(r => Object.keys(r || {})))].filter(k => !reconocidas.has(k));
    if (extra.length) advertencias.push(`La API envía columnas que la app no reconoce y no se muestran: ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? '…' : ''}.`);

    for (const campo of OBLIGATORIOS) {
        if (sinColumna.some(([c]) => c === campo)) continue;
        const filas = mapped.filter(f => vacio(f[campo])).map(f => f.id);
        if (filas.length) advertencias.push(`${filas.length} registro(s) sin ${etiqueta[campo]} (${ejemplos(filas)}).`);
    }

    const plantasRaras = new Map<string, number>();
    for (const f of mapped) {
        if (vacio(f.planta)) continue;
        const p = String(f.planta).trim().toUpperCase();
        if (!PLANTAS.some(n => p.includes(n))) plantasRaras.set(p, (plantasRaras.get(p) || 0) + 1);
    }
    if (plantasRaras.size) advertencias.push(`Plantas no reconocidas (esas filas NO entran en Prioridades diarias de Plantas): ${[...plantasRaras].map(([p, n]) => `${p} (${n})`).join(', ')}.`);

    const estadosRaros = new Map<string, number>();
    for (const f of mapped) {
        if (vacio(f.estado)) continue;
        const e = String(f.estado).trim().toUpperCase();
        if (e !== 'LIBERADO' && !e.includes('PLANIFICADO')) estadosRaros.set(e, (estadosRaros.get(e) || 0) + 1);
    }
    if (estadosRaros.size) advertencias.push(`Estados no reconocidos (esas filas no se cuentan como Liberado ni Planificado): ${[...estadosRaros].map(([e, n]) => `${e} (${n})`).join(', ')}.`);

    for (const campo of FECHAS) {
        const filas = mapped.filter(f => !vacio(f[campo]) && !parseFecha(String(f[campo]))).map(f => f.id);
        if (filas.length) advertencias.push(`${filas.length} fecha(s) ilegibles en ${etiqueta[campo]} (${ejemplos(filas)}).`);
    }
    for (const campo of NUMEROS) {
        const filas = mapped.filter(f => !vacio(f[campo]) && isNaN(Number(String(f[campo]).replace(',', '.')))).map(f => f.id);
        if (filas.length) advertencias.push(`${filas.length} valor(es) no numéricos en ${etiqueta[campo]} (${ejemplos(filas)}); se tomarían como 0.`);
    }

    console.log(`Semáforo: ${mapped.length} registros, ${advertencias.length} advertencia(s)`);
    return NextResponse.json({
        success: true,
        source: fuente,
        data: mapped,
        total: mapped.length,
        advertencias
    });
}
