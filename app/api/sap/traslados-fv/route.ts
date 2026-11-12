import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { supabase } from '@/lib/supabase';
import { trasladosDeOf, sapBaseUrl, encabezadosDesde, documentos, ofsDelComentario, type DocTraslado } from '@/lib/sapTraslados';
import { grupoMaterial, sinTildes } from '@/lib/gruposMateriales';

// Módulo Traslados (FV): revisa que cada OF liberada pendiente tenga su traslado y que lo trasladado cubra la lista de materiales.
// Se exigen los Accesorios y Equipos que no son consumibles de uso común (tabla traslados_consumibles_fv), salvo que el
// artículo tenga Sí / No propio en Parámetros a revisar (tabla traslados_articulos_fv), que manda sobre la regla.
// Resultado por OF en traslados_of_fv. Automático (vercel.json): lunes a viernes 5:00 a. m., 12:00 m. y 5:00 p. m. hora Colombia.
// ?of=NNN revisa solo esa OF (botón de la tarjeta).
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Fila = {
    item: string; descripcion: string; requerido: number; solicitado: number; trasladado: number; pendiente: number
    estado: 'entregado' | 'solicitado' | 'faltante' | 'no_exigido'; motivo?: string
    grupo: 'acc' | 'mp' | 'mo'
    // Parámetros a revisar: lo que dice la regla por defecto y si el usuario lo ajustó (Sí / No por artículo)
    porDefecto: boolean; ajuste?: boolean
    sustituto?: { item: string; descripcion: string; cantidad: number }
}

const EPS = 1e-6;
// Los mismos consumibles iniciales de traslados_fv.sql (solo para ?simular=1 si la tabla aún no existe)
const CONSUMIBLES_INICIALES = ['TORNILLO', 'CHAPOLA', 'ARANDELA', 'TUERCA', 'VARILLA ROSCADA', 'CARTON', 'CALCOMANIA', 'ETIQUETA', 'MALLA GALLINERO', 'VARILLA MADERA', 'MANGUERA AGRICOLA', 'GRAPAS', 'LISTON ICOPOR', 'REGLETA', 'CINTA', 'TUBERIA FLEXIBLE', 'PATA SOPORTE', 'SNAP FIJACION', 'L FIJACION', 'MANGUERA 3/8IN BLANCA PARA AIRE', 'MANGUERA TRANSPAREN', 'TUBO CERRAM', 'TUBO C18', 'CANTONERA', 'NIVELADOR'];
const red = (n: number) => Math.round(n * 10000) / 10000;

async function revisarOf(docNum: string, consumibles: string[], ajustes: Map<string, boolean>, baseUrl: string, docsOf?: { solicitudes: DocTraslado[]; traslados: DocTraslado[] }) {
    const r = await fetchSAP(`${baseUrl}/ProductionOrders?$filter=DocumentNumber eq ${docNum}&$select=DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,ProductionOrderLines`, { method: 'GET' });
    if (!r.ok) throw new Error(`SAP no respondió la OF (${r.status})`);
    const po = (await r.json()).value?.[0];
    if (!po) throw new Error('La OF no está en SAP');
    const lineas: any[] = Array.isArray(po.ProductionOrderLines) ? po.ProductionOrderLines : [];
    if (!lineas.length) throw new Error('SAP no entregó la lista de materiales');

    const { solicitudes, traslados } = docsOf || await trasladosDeOf(docNum, baseUrl);
    const suma = (docs: DocTraslado[]) => {
        const m = new Map<string, { cantidad: number; descripcion: string }>();
        for (const d of docs) for (const l of d.lineas) {
            const x = m.get(l.item) || { cantidad: 0, descripcion: l.descripcion };
            x.cantidad += l.cantidad; m.set(l.item, x);
        }
        return m;
    };
    const solicitado = suma(solicitudes), trasladado = suma(traslados);

    // Lista de materiales agrupada por artículo (un mismo artículo puede venir en varias líneas)
    const req = new Map<string, { descripcion: string; cantidad: number }>();
    for (const l of lineas) {
        const item = String(l.ItemNo || '').trim(); if (!item) continue;
        const x = req.get(item) || { descripcion: l.ItemName || '', cantidad: 0 };
        x.cantidad += Number(l.PlannedQuantity) || 0; req.set(item, x);
    }

    const esConsumible = (desc: string) => { const d = sinTildes(desc); return consumibles.find(p => p && d.includes(p)) };
    const detalle: Fila[] = [];
    for (const [item, { descripcion, cantidad }] of req) {
        const grupo = grupoMaterial(descripcion);
        const sol = solicitado.get(item)?.cantidad || 0, tra = trasladado.get(item)?.cantidad || 0;
        const cons = grupo === 'acc' ? esConsumible(descripcion) : undefined;
        // Regla por defecto: se revisan los accesorios que no son consumibles. El Sí / No del artículo manda sobre la regla.
        const porDefecto = grupo === 'acc' && !cons;
        const ajuste = ajustes.get(item);
        const base = { item, descripcion, grupo, porDefecto, ajuste, requerido: red(cantidad), solicitado: red(sol), trasladado: red(tra), pendiente: red(Math.max(0, cantidad - tra)) };
        if (!(ajuste ?? porDefecto)) {
            const motivo = ajuste === false ? 'Marcado No revisar' : grupo === 'mo' ? 'Mano de obra' : grupo === 'mp' ? 'Materia prima pesada' : `Consumible (${cons})`;
            detalle.push({ ...base, estado: 'no_exigido', motivo }); continue;
        }
        detalle.push({ ...base, estado: tra >= cantidad - EPS ? 'entregado' : sol >= cantidad - EPS ? 'solicitado' : 'faltante' });
    }

    // Trasladado que no está en la lista: posibles sustitutos (misma familia de código y misma primera palabra)
    const extras = [...trasladado].filter(([item]) => !req.has(item)).map(([item, x]) => ({ item, descripcion: x.descripcion, cantidad: red(x.cantidad), usado: false }));
    const familia = (c: string) => c.split('-')[0];
    const primera = (d: string) => sinTildes(d).split(/\s+/)[0] || '';
    for (const f of detalle) {
        if (f.estado !== 'faltante' && f.estado !== 'solicitado') continue;
        const s = extras.find(e => !e.usado && familia(e.item) === familia(f.item) && primera(e.descripcion) === primera(f.descripcion));
        if (s) { s.usado = true; f.sustituto = { item: s.item, descripcion: s.descripcion, cantidad: s.cantidad }; }
    }

    const exigidos = detalle.filter(f => f.estado !== 'no_exigido');
    const n = (e: Fila['estado']) => exigidos.filter(f => f.estado === e).length;
    const documentos = [...solicitudes, ...traslados].map(({ lineas: ls, ...d }) => ({ ...d, articulos: ls.length }));
    const estado = documentos.length === 0 ? 'sin_traslado' : n('faltante') > 0 ? 'faltante' : n('solicitado') > 0 ? 'solicitado' : 'completo';
    return {
        orden_fabricacion: docNum, estado,
        producto_sku: po.ItemNo || null, producto_descripcion: po.ProductDescription || null, cantidad: Number(po.PlannedQuantity) || null,
        exigidos: exigidos.length, entregados: n('entregado'), solicitados_pendientes: n('solicitado'), faltantes: n('faltante'),
        sustitutos: detalle.filter(f => f.sustituto).length,
        documentos, detalle, extras: extras.map(({ usado, ...e }) => ({ ...e, asignado: usado })),
        error: null, calculado_at: new Date().toISOString(),
    };
}

export async function GET(request: Request) {
    const inicio = Date.now();
    try {
        const params = new URL(request.url).searchParams;
        const soloOf = params.get('of');
        // ?simular=1: calcula y devuelve el resultado sin guardarlo (pruebas)
        const simular = params.get('simular') === '1';
        if (soloOf && !/^\d+$/.test(soloOf)) return NextResponse.json({ error: 'Número de orden inválido' }, { status: 400 });

        const { data: cons, error: errCons } = await supabase.from('traslados_consumibles_fv').select('patron');
        if (errCons && !simular) return NextResponse.json({ error: /traslados_consumibles_fv|relation|schema cache/i.test(errCons.message) ? 'Falta crear las tablas del módulo Traslados: ejecute traslados_fv.sql en Supabase.' : errCons.message }, { status: 500 });
        const consumibles = (errCons ? CONSUMIBLES_INICIALES : (cons || []).map(c => c.patron))
            .map((p: string) => sinTildes(String(p || '').trim())).filter(Boolean);
        // Sí / No por artículo (Parámetros a revisar); si la tabla aún no existe se usa solo la regla por defecto
        const { data: aj } = await supabase.from('traslados_articulos_fv').select('item, revisar');
        const ajustes = new Map<string, boolean>((aj || []).map((a: any) => [String(a.item), !!a.revisar]));

        let ofs: string[];
        if (soloOf) ofs = [soloOf];
        else {
            // Las mismas OF que muestra la app (vista de Fibra: pendientes y de productos de Fibra)
            const { data, error } = await supabase.from('ordenes_fabricacion_fv').select('orden_fabricacion');
            if (error) return NextResponse.json({ error: `No se pudieron leer las OF de Fibra: ${error.message}` }, { status: 500 });
            ofs = [...new Set((data || []).map(r => String(r.orden_fabricacion).trim()).filter(x => /^\d+$/.test(x)))];
        }

        const baseUrl = sapBaseUrl();
        const filas: any[] = [];

        // Revisión de todas las OF: una sola consulta de encabezados (últimos 150 días) y solo se descargan los documentos de estas OF
        let docsPorOf: Map<string, { solicitudes: DocTraslado[]; traslados: DocTraslado[] }> | null = null;
        if (!soloOf) {
            const desde = new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10);
            const enc = await encabezadosDesde(desde, baseUrl);
            console.log(`[traslados-fv] encabezados ${enc.length} en ${Math.round((Date.now() - inicio) / 1000)} s`);
            const conjunto = new Set(ofs);
            const elegidos = enc.filter(e => ofsDelComentario(e.comentario).some(o => conjunto.has(o)));
            const docs = await documentos(elegidos, baseUrl);
            console.log(`[traslados-fv] ${elegidos.length} documentos de ${ofs.length} OF en ${Math.round((Date.now() - inicio) / 1000)} s`);
            docsPorOf = new Map(ofs.map(o => [o, { solicitudes: [], traslados: [] }]));
            for (const e of elegidos) {
                const d = docs.get(`${e.entidad}:${e.docEntry}`); if (!d) continue;
                for (const o of ofsDelComentario(e.comentario)) {
                    const x = docsPorOf.get(o); if (!x) continue;
                    (d.tipo === 'Solicitud' ? x.solicitudes : x.traslados).push(d);
                }
            }
        }
        // Una OF a la vez: en la misma sesión de SAP las consultas en paralelo se bloquean entre sí
        for (const of of ofs) {
            const lote = await Promise.all([of].map(async of => {
                try { return await revisarOf(of, consumibles, ajustes, baseUrl, docsPorOf?.get(of)); }
                catch (e: any) {
                    return { orden_fabricacion: of, estado: 'error', exigidos: 0, entregados: 0, solicitados_pendientes: 0, faltantes: 0, sustitutos: 0,
                        documentos: [], detalle: [], extras: [], error: e?.message || 'Error consultando SAP', calculado_at: new Date().toISOString() };
                }
            }));
            filas.push(...lote);
        }

        if (simular) return NextResponse.json({ filas });

        if (filas.length) {
            const { error } = await supabase.from('traslados_of_fv').upsert(filas, { onConflict: 'orden_fabricacion' });
            if (error) return NextResponse.json({ error: /traslados_of_fv|relation|schema cache/i.test(error.message) ? 'Falta crear las tablas del módulo Traslados: ejecute traslados_fv.sql en Supabase.' : `No se pudo guardar la revisión: ${error.message}` }, { status: 500 });
        }
        // Revisión completa: se quitan las OF que ya no están pendientes
        if (!soloOf && ofs.length) {
            await supabase.from('traslados_of_fv').delete().not('orden_fabricacion', 'in', `(${ofs.join(',')})`);
        }

        const cuenta = (e: string) => filas.filter(f => f.estado === e).length;
        return NextResponse.json({
            revisadas: filas.length, completo: cuenta('completo'), solicitado: cuenta('solicitado'), faltante: cuenta('faltante'),
            sin_traslado: cuenta('sin_traslado'), error: cuenta('error') || undefined, segundos: Math.round((Date.now() - inicio) / 1000),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error en la revisión de traslados' }, { status: 500 });
    }
}
