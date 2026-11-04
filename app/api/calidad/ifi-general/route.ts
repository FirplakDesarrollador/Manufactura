import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
    calcularResumen,
    fetchCatalogoDefectosMs,
    fetchMsReportes,
    normalizarPiezas
} from '@/lib/calidad/msCalidad';
import { calcularResumenFv, normalizarRegistrosFv } from '@/lib/calidad/fvCalidad';
import { fetchRegistrosFv } from '@/lib/calidad/fvSharepoint';
import {
    PLANTAS_IFI_DEFAULT,
    PLANTAS_IFI_MANUALES,
    PlantaIfi,
    PlantaIfiConfig,
    calcularIfiGeneral,
    promedio
} from '@/lib/calidad/ifiGeneral';
import { puedeEditarCalidad } from '@/lib/calidad/permisos';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
// Primer mes completo con datos de MS en Supabase (los registros empiezan el 17-sep-2025)
const MS_PRIMER_MES = '2025-10';
// Marca de "la planta no trabajó ese día" en calidad_ifi_diaria (calidad nula). Ver calidad_ifi_no_trabajo.sql
const FUENTE_NO_TRABAJO = 'no_trabajo';

type DiaPlanta = { calidad: number; revisadas?: number; buenas?: number };

// Cliente Supabase con la sesión del usuario (las tablas tienen RLS) y datos del usuario
async function getContexto(request: Request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error } = await client.auth.getUser(token);
    if (error || !userData?.user) return null;
    const email = userData.user.email || '';
    const { data: usuario } = await client.from('usuarios').select('nombre, correo, rol').ilike('correo', email).maybeSingle();
    return { client, email, nombre: usuario?.nombre || email, puedeEditar: puedeEditarCalidad(usuario) };
}

async function getPlantas(client: SupabaseClient, anio?: number): Promise<PlantaIfiConfig[]> {
    const { data, error } = await client.from('calidad_ifi_plantas').select('codigo, nombre, peso, meta, orden').eq('activa', true).order('orden');
    if (error) throw new Error(`calidad_ifi_plantas: ${error.message}. ¿Se ejecutó calidad_ifi_general.sql?`);
    const base = !data || data.length === 0 ? PLANTAS_IFI_DEFAULT : (data.map(p => ({ ...p, peso: Number(p.peso), meta: Number(p.meta) })) as PlantaIfiConfig[]);
    if (anio == null) return base;
    return aplicarPesos(base, (await getPesosPorAnio(client)).get(anio));
}

// Pesos por año (calidad_ifi_pesos). Sin tabla o sin pesos para el año: se usan los vigentes.
async function getPesosPorAnio(client: SupabaseClient): Promise<Map<number, Partial<Record<PlantaIfi, number>>>> {
    const out = new Map<number, Partial<Record<PlantaIfi, number>>>();
    const { data, error } = await client.from('calidad_ifi_pesos').select('anio, planta, peso');
    if (error) return out;
    (data || []).forEach(r => out.set(Number(r.anio), { ...(out.get(Number(r.anio)) || {}), [r.planta as PlantaIfi]: Number(r.peso) }));
    return out;
}

const aplicarPesos = (plantas: PlantaIfiConfig[], pesos?: Partial<Record<PlantaIfi, number>>) =>
    pesos ? plantas.map(p => (typeof pesos[p.codigo] === 'number' ? { ...p, peso: pesos[p.codigo] as number } : p)) : plantas;

const rangoMes = (anio: number, mes: number): [string, string] => {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const sig = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
    return [desde, sig];
};

// MS por día (misma lógica del Power BI "BI Calidad MS")
async function msPorDia(client: SupabaseClient, desde: string, hasta: string): Promise<Map<string, DiaPlanta>> {
    const [rows, catalogo] = await Promise.all([
        fetchMsReportes(client, `${desde}T00:00:00Z`, `${hasta}T00:00:00Z`, 'id, created_at, producto_id, defecto, Reparacion'),
        fetchCatalogoDefectosMs(client)
    ]);
    const porDia = new Map<string, ReturnType<typeof normalizarPiezas>>();
    normalizarPiezas(rows, catalogo).forEach(p => porDia.set(p.fecha, [...(porDia.get(p.fecha) || []), p]));
    const out = new Map<string, DiaPlanta>();
    porDia.forEach((piezas, fecha) => {
        const r = calcularResumen(piezas);
        if (r.piezasRevisadas > 0) out.set(fecha, { calidad: r.calidad / 100, revisadas: r.piezasRevisadas, buenas: r.piezasBuenas });
    });
    return out;
}

// FV por día (misma lógica del Power BI "BI Calidad FV")
async function fvPorDia(desde: string, hasta: string): Promise<Map<string, DiaPlanta>> {
    const porDia = new Map<string, ReturnType<typeof normalizarRegistrosFv>>();
    normalizarRegistrosFv(await fetchRegistrosFv(desde, hasta)).forEach(p => porDia.set(p.fecha, [...(porDia.get(p.fecha) || []), p]));
    const out = new Map<string, DiaPlanta>();
    porDia.forEach((piezas, fecha) => {
        const r = calcularResumenFv(piezas);
        if (r.piezasRevisadas > 0) out.set(fecha, { calidad: r.calidad / 100, revisadas: r.piezasRevisadas, buenas: r.piezasBuenas });
    });
    return out;
}

// Resultado de todos los meses con lo ya guardado (sin recalcular MS/FV en vivo): diario guardado si existe,
// si no el histórico mensual. Sirve para la vista por año del tablero.
async function resumenTodosLosMeses(client: SupabaseClient, plantasBase: PlantaIfiConfig[]) {
    const pesosPorAnio = await getPesosPorAnio(client);
    const diarias: { fecha: string; planta: string; calidad: number | null }[] = [];
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await client.from('calidad_ifi_diaria').select('fecha, planta, calidad').order('fecha').range(desde, desde + 999);
        if (error) throw new Error(`calidad_ifi_diaria: ${error.message}`);
        diarias.push(...(data || []));
        if (!data || data.length < 1000) break;
    }
    const { data: mensual, error: mErr } = await client.from('calidad_ifi_mensual').select('anio, mes, planta, calidad');
    if (mErr) throw new Error(`calidad_ifi_mensual: ${mErr.message}`);

    // Días por mes ("YYYY-MM" → fecha → valores por planta)
    const porMes = new Map<string, Map<string, Partial<Record<PlantaIfi, number>>>>();
    diarias.forEach(r => {
        if (r.calidad === null) return;
        const fecha = String(r.fecha).slice(0, 10);
        const ym = fecha.slice(0, 7);
        const dias = porMes.get(ym) || new Map();
        dias.set(fecha, { ...(dias.get(fecha) || {}), [r.planta as PlantaIfi]: Number(r.calidad) });
        porMes.set(ym, dias);
    });
    const histPorMes = new Map<string, Partial<Record<PlantaIfi, number>>>();
    (mensual || []).forEach(h => {
        if (h.calidad === null) return;
        const ym = `${h.anio}-${String(h.mes).padStart(2, '0')}`;
        histPorMes.set(ym, { ...(histPorMes.get(ym) || {}), [h.planta as PlantaIfi]: Number(h.calidad) });
    });

    const claves = Array.from(new Set([...porMes.keys(), ...histPorMes.keys()])).sort();
    return claves.map(ym => {
        const plantas = aplicarPesos(plantasBase, pesosPorAnio.get(Number(ym.slice(0, 4))));
        const dias = porMes.get(ym);
        const diario = dias
            ? [...dias.values()].map(v => ({ v, ifi: calcularIfiGeneral(v, plantas).ifi })).filter(d => d.ifi !== null)
            : [];
        if (diario.length > 0) {
            const valores: Partial<Record<PlantaIfi, number | null>> = {};
            plantasBase.forEach(p => { valores[p.codigo] = promedio(diario.map(d => d.v[p.codigo]).filter((x): x is number => typeof x === 'number')); });
            return { anio: Number(ym.slice(0, 4)), mes: Number(ym.slice(5, 7)), ifi: promedio(diario.map(d => d.ifi as number)), valores, fuente: 'diario', dias: diario.length };
        }
        const hist = histPorMes.get(ym) || {};
        return { anio: Number(ym.slice(0, 4)), mes: Number(ym.slice(5, 7)), ifi: calcularIfiGeneral(hist, plantas).ifi, valores: hist, fuente: 'historico', dias: 0 };
    }).filter(m => m.ifi !== null);
}

// GET /api/calidad/ifi-general?anio=2026&mes=10  ·  GET /api/calidad/ifi-general?vista=anual
export async function GET(request: Request) {
    const ctx = await getContexto(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'Se requiere la sesión del usuario' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    // Pesos configurados por año (ventana "Configurar pesos")
    if (searchParams.get('vista') === 'pesos') {
        try {
            const plantas = await getPlantas(ctx.client);
            const pesos = await getPesosPorAnio(ctx.client);
            return NextResponse.json({ success: true, plantas, pesos: Object.fromEntries(pesos), puedeEditar: ctx.puedeEditar });
        } catch (err: any) {
            return NextResponse.json({ success: false, error: err.message || 'Error consultando pesos' }, { status: 500 });
        }
    }
    if (searchParams.get('vista') === 'anual') {
        try {
            const plantas = await getPlantas(ctx.client);
            const meses = await resumenTodosLosMeses(ctx.client, plantas);
            return NextResponse.json({ success: true, plantas, meses, puedeEditar: ctx.puedeEditar });
        } catch (err: any) {
            console.error('Error calculando IFI general anual:', err);
            return NextResponse.json({ success: false, error: err.message || 'Error calculando IFI general anual' }, { status: 500 });
        }
    }

    const anio = Number(searchParams.get('anio'));
    const mes = Number(searchParams.get('mes'));
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return NextResponse.json({ success: false, error: 'Parámetros anio/mes inválidos' }, { status: 400 });
    }

    try {
        const { client } = ctx;
        const plantas = await getPlantas(client, anio);
        const [desde, hasta] = rangoMes(anio, mes);
        const avisos: string[] = [];

        const [ms, fv, manualRes, mensualRes] = await Promise.all([
            msPorDia(client, desde, hasta).catch(e => { avisos.push(`MS: ${e.message}`); return new Map<string, DiaPlanta>(); }),
            fvPorDia(desde, hasta).catch(e => { avisos.push(`FV: ${e.message}`); return new Map<string, DiaPlanta>(); }),
            client.from('calidad_ifi_diaria').select('fecha, planta, calidad, fuente, registrado_por').gte('fecha', desde).lt('fecha', hasta),
            client.from('calidad_ifi_mensual').select('planta, calidad, fuente, dudoso, nota').eq('anio', anio).eq('mes', mes)
        ]);
        if (manualRes.error) throw new Error(`calidad_ifi_diaria: ${manualRes.error.message}`);

        // Guardar MS/FV calculados en la tabla diaria (instantánea para trazabilidad)
        const snapshot = [
            ...[...ms].map(([fecha, d]) => ({ fecha, planta: 'MS', calidad: +d.calidad.toFixed(4), revisadas: d.revisadas, buenas: d.buenas, fuente: 'supabase_ms', updated_at: new Date().toISOString() })),
            ...[...fv].map(([fecha, d]) => ({ fecha, planta: 'FV', calidad: +d.calidad.toFixed(4), revisadas: d.revisadas, buenas: d.buenas, fuente: 'sharepoint_fv', updated_at: new Date().toISOString() }))
        ];
        if (snapshot.length > 0) {
            const { error: upErr } = await client.from('calidad_ifi_diaria').upsert(snapshot, { onConflict: 'fecha,planta' });
            if (upErr) avisos.push(`No se pudo guardar la instantánea MS/FV: ${upErr.message}`);
        }
        // FV consultado bien: se quitan días guardados que ya no tienen registros
        // (p. ej. los guardados con la fecha en UTC antes de pasar a hora de Colombia)
        if (!avisos.some(a => a.startsWith('FV:'))) {
            const diasFv = [...fv.keys()];
            let borrar = client.from('calidad_ifi_diaria').delete().eq('planta', 'FV').eq('fuente', 'sharepoint_fv').gte('fecha', desde).lt('fecha', hasta);
            if (diasFv.length) borrar = borrar.not('fecha', 'in', `(${diasFv.join(',')})`);
            const { error: delErr } = await borrar;
            if (delErr) avisos.push(`No se pudieron limpiar días de FV sin registros: ${delErr.message}`);
        }

        // Unir por día: MS y FV de su fuente; MBL, CEFI y RTM de lo digitado
        const dias = new Map<string, Partial<Record<PlantaIfi, number>>>();
        const set = (fecha: string, planta: PlantaIfi, calidad: number) => dias.set(fecha, { ...(dias.get(fecha) || {}), [planta]: calidad });
        ms.forEach((d, fecha) => set(fecha, 'MS', d.calidad));
        fv.forEach((d, fecha) => set(fecha, 'FV', d.calidad));
        // "No trabajó": la planta queda fuera del día y su peso se reparte entre las demás
        const noTrabajo = new Map<string, PlantaIfi[]>();
        (manualRes.data || []).forEach(r => {
            if (!PLANTAS_IFI_MANUALES.includes(r.planta as PlantaIfi)) return;
            const fecha = String(r.fecha).slice(0, 10);
            if (r.fuente === FUENTE_NO_TRABAJO) {
                noTrabajo.set(fecha, [...(noTrabajo.get(fecha) || []), r.planta as PlantaIfi]);
                return;
            }
            if (r.calidad !== null) set(fecha, r.planta as PlantaIfi, Number(r.calidad));
        });

        const diario = [...dias.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([fecha, valores]) => {
                const r = calcularIfiGeneral(valores, plantas);
                return { fecha, dia: Number(fecha.slice(8, 10)), ifi: r.ifi, valores, detalle: r.detalle, noTrabajo: noTrabajo.get(fecha) || [] };
            })
            .filter(d => d.ifi !== null);

        // Mes: promedio de los resultados diarios; por planta, promedio de su calidad diaria
        const ifiMes = promedio(diario.map(d => d.ifi as number));
        const plantasMes = plantas.map(p => {
            const vals = diario.map(d => d.valores[p.codigo]).filter((v): v is number => typeof v === 'number');
            return { ...p, calidad: promedio(vals), dias: vals.length };
        });

        // Histórico mensual (Excel / fuentes) con el resultado general calculado con la fórmula vigente
        const historicoFilas = mensualRes.error ? [] : mensualRes.data || [];
        const histValores: Partial<Record<PlantaIfi, number>> = {};
        historicoFilas.forEach(h => { if (h.calidad !== null) histValores[h.planta as PlantaIfi] = Number(h.calidad); });
        const historico = historicoFilas.length
            ? { ifi: calcularIfiGeneral(histValores, plantas).ifi, plantas: historicoFilas.map(h => ({ ...h, calidad: h.calidad === null ? null : Number(h.calidad) })) }
            : null;

        return NextResponse.json({
            success: true,
            anio,
            mes,
            plantas,
            diario,
            mesResumen: { ifi: ifiMes, diasConDato: diario.length, plantas: plantasMes },
            historico,
            puedeEditar: ctx.puedeEditar,
            avisos
        });
    } catch (err: any) {
        console.error('Error calculando IFI general:', err);
        return NextResponse.json({ success: false, error: err.message || 'Error calculando IFI general' }, { status: 500 });
    }
}

// POST { accion: 'registrar', fecha, valores: { MBL?, CEFI?, RTM? } }  (valores en %; null borra el dato)
// POST { accion: 'sincronizar_mes', anio, mes }  (actualiza el histórico mensual de MS/FV desde su fuente)
export async function POST(request: Request) {
    const ctx = await getContexto(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'Se requiere la sesión del usuario' }, { status: 401 });
    if (!ctx.puedeEditar) return NextResponse.json({ success: false, error: 'Solo Calidad o Administrador pueden registrar' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { client } = ctx;

    try {
        // Pesos de un año: { accion: 'guardar_pesos', anio, pesos: { MS: 55, MBL: 27, ... } } (en %, deben sumar 100)
        if (body.accion === 'guardar_pesos') {
            const anio = Number(body.anio);
            if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) return NextResponse.json({ success: false, error: 'Año inválido' }, { status: 400 });
            const plantas = await getPlantas(client);
            const filas = plantas.map(p => ({ anio, planta: p.codigo, peso: Number(body.pesos?.[p.codigo]), registrado_por: ctx.nombre, updated_at: new Date().toISOString() }));
            if (filas.some(r => !Number.isFinite(r.peso) || r.peso < 0 || r.peso > 100)) {
                return NextResponse.json({ success: false, error: 'Cada peso debe estar entre 0 y 100%' }, { status: 400 });
            }
            const suma = filas.reduce((a, r) => a + r.peso, 0);
            if (Math.abs(suma - 100) > 0.05) return NextResponse.json({ success: false, error: `Los pesos deben sumar 100% (suman ${suma.toFixed(1)}%)` }, { status: 400 });
            const { error } = await client.from('calidad_ifi_pesos').upsert(filas.map(r => ({ ...r, peso: +(r.peso / 100).toFixed(4) })), { onConflict: 'anio,planta' });
            if (error) throw new Error(/calidad_ifi_pesos/.test(error.message) ? 'Falta ejecutar calidad_ifi_pesos_anio.sql en Supabase.' : error.message);
            return NextResponse.json({ success: true });
        }

        if (body.accion === 'registrar') {
            const fecha = String(body.fecha || '');
            if (!FECHA_RE.test(fecha)) return NextResponse.json({ success: false, error: 'Fecha inválida' }, { status: 400 });

            const upserts: any[] = [];
            const borrar: string[] = [];
            for (const planta of PLANTAS_IFI_MANUALES) {
                if (!(planta in (body.valores || {}))) continue;
                const raw = body.valores[planta];
                if (raw === null || raw === '') { borrar.push(planta); continue; }
                if (raw === FUENTE_NO_TRABAJO) {
                    upserts.push({ fecha, planta, calidad: null, fuente: FUENTE_NO_TRABAJO, registrado_por: ctx.nombre, updated_at: new Date().toISOString() });
                    continue;
                }
                const pct = Number(raw);
                if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                    return NextResponse.json({ success: false, error: `${planta}: la calidad debe estar entre 0 y 100%` }, { status: 400 });
                }
                upserts.push({ fecha, planta, calidad: +(pct / 100).toFixed(4), fuente: 'manual', registrado_por: ctx.nombre, updated_at: new Date().toISOString() });
            }

            if (upserts.length) {
                const { error } = await client.from('calidad_ifi_diaria').upsert(upserts, { onConflict: 'fecha,planta' });
                if (error) {
                    const faltaScript = upserts.some(u => u.fuente === FUENTE_NO_TRABAJO) && /null value|check constraint|violates/i.test(error.message);
                    throw new Error(faltaScript ? 'Para marcar "No trabajó" falta ejecutar calidad_ifi_no_trabajo.sql en Supabase.' : error.message);
                }
            }
            if (borrar.length) {
                const { error } = await client.from('calidad_ifi_diaria').delete().eq('fecha', fecha).in('planta', borrar).in('fuente', ['manual', FUENTE_NO_TRABAJO]);
                if (error) throw error;
            }
            return NextResponse.json({ success: true, guardados: upserts.length, borrados: borrar.length });
        }

        if (body.accion === 'sincronizar_mes') {
            const anio = Number(body.anio);
            const mes = Number(body.mes);
            if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
                return NextResponse.json({ success: false, error: 'anio/mes inválidos' }, { status: 400 });
            }
            const [desde, hasta] = rangoMes(anio, mes);
            const ym = desde.slice(0, 7);
            const filas: any[] = [];

            if (ym >= MS_PRIMER_MES) {
                const dias = [...(await msPorDia(client, desde, hasta)).values()].map(d => d.calidad);
                const cal = promedio(dias);
                if (cal !== null) filas.push({ anio, mes, planta: 'MS', calidad: +cal.toFixed(4), fuente: 'supabase_ms', dudoso: false, nota: `Promedio de ${dias.length} día(s) con registro`, updated_at: new Date().toISOString() });
            }
            const diasFv = [...(await fvPorDia(desde, hasta)).values()].map(d => d.calidad);
            const calFv = promedio(diasFv);
            if (calFv !== null) filas.push({ anio, mes, planta: 'FV', calidad: +calFv.toFixed(4), fuente: 'sharepoint_fv', dudoso: false, nota: `Promedio de ${diasFv.length} día(s) con registro`, updated_at: new Date().toISOString() });

            if (filas.length) {
                const { error } = await client.from('calidad_ifi_mensual').upsert(filas, { onConflict: 'anio,mes,planta' });
                if (error) throw error;
            }
            return NextResponse.json({ success: true, anio, mes, actualizados: filas.map(f => f.planta) });
        }

        return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });
    } catch (err: any) {
        console.error('Error en POST IFI general:', err);
        return NextResponse.json({ success: false, error: err.message || 'Error guardando' }, { status: 500 });
    }
}
