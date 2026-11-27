import { NextResponse } from 'next/server';
import { fetchSAP } from '@/lib/sap';
import { sapBaseUrl } from '@/lib/sapTraslados';
import { sinTildes } from '@/lib/gruposMateriales';

export const dynamic = 'force-dynamic';

type LineaBom = { ItemCode: string; ItemName: string; Quantity: number };
type ArbolBom = { codigo: string; descripcion: string; lineas: LineaBom[] } | null;

const esGelcoat = (l: LineaBom) =>
    /GEL\s?COAT/.test(sinTildes(l.ItemName)) || /^PGEL/i.test(l.ItemCode);

const esMasilla = (l: LineaBom) =>
    /MASILLA/.test(sinTildes(l.ItemName)) && !/CATALIZADOR/.test(sinTildes(l.ItemName));

const esResina = (l: LineaBom) =>
    /\bRESINA\b/.test(sinTildes(l.ItemName)) &&
    !/REFUERZO/.test(sinTildes(l.ItemName)) &&
    !/MASILLA/.test(sinTildes(l.ItemName));

const esCarbonatoOCarga = (l: LineaBom) =>
    /CARBONATO|CARGA\s+MINERAL|MARMOLINA|CUARZO/.test(sinTildes(l.ItemName));

const seAbreSubEstructura = (l: LineaBom) =>
    /^PEST|^PSEM|^PMAS|^PREF/i.test(l.ItemCode) ||
    /REFUERZO|CONFORMACION|ESTRUCTURA|VACIADO|MEZCLA/.test(sinTildes(l.ItemName));

const detectarTipoResina = (nombre: string): string | null => {
    const n = sinTildes(nombre);
    if (/CARGAD/.test(n)) return 'CARGADA';
    if (/ULTRACASTER/.test(n)) return 'ULTRACASTER';
    if (/\bADM\b/.test(n)) return 'ADM';
    if (/VIRGEN|4891|3835/.test(n)) return 'VIRGEN';
    return null;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

async function leerArbol(baseUrl: string, codigo: string, cache: Map<string, ArbolBom>): Promise<ArbolBom> {
    if (cache.has(codigo)) return cache.get(codigo)!;
    const safeCode = encodeURIComponent(codigo.replace(/'/g, "''"));
    const r = await fetchSAP(
        `${baseUrl}/ProductTrees('${safeCode}')?$select=TreeCode,ProductDescription,Quantity,ProductTreeLines`,
        { method: 'GET' }
    );
    let arbol: ArbolBom = null;
    if (r.ok) {
        const d = await r.json();
        const base = Number(d.Quantity) > 0 ? Number(d.Quantity) : 1;
        arbol = {
            codigo,
            descripcion: String(d.ProductDescription || ''),
            lineas: (d.ProductTreeLines || []).map((l: any) => ({
                ItemCode: String(l.ItemCode || '').trim(),
                ItemName: String(l.ItemName || ''),
                Quantity: (Number(l.Quantity) || 0) / base
            }))
        };
    } else if (r.status !== 404) {
        throw new Error(`SAP no entregó la lista de materiales de ${codigo} (${r.status})`);
    }
    cache.set(codigo, arbol);
    return arbol;
}

async function extraerPesosBom(
    baseUrl: string,
    codigo: string,
    factor: number,
    prof: number,
    cache: Map<string, ArbolBom>,
    out: {
        gelcoatKg: number;
        resinaKg: number;
        masillaKg: number;
        cargaKg: number;
        tipoResina: string | null;
        detalle: { itemCode: string; itemName: string; cantidad: number; categoria: string }[];
    }
) {
    if (prof > 4) return;
    const arbol = await leerArbol(baseUrl, codigo, cache);
    if (!arbol) return;

    for (const l of arbol.lineas) {
        const q = l.Quantity * factor;
        if (q <= 0) continue;

        if (esGelcoat(l)) {
            out.gelcoatKg += q;
            out.detalle.push({ itemCode: l.ItemCode, itemName: l.ItemName, cantidad: r3(q), categoria: 'gelcoat' });
        } else if (esMasilla(l)) {
            out.masillaKg += q;
            out.detalle.push({ itemCode: l.ItemCode, itemName: l.ItemName, cantidad: r3(q), categoria: 'masilla' });
        } else if (esResina(l)) {
            out.resinaKg += q;
            out.tipoResina = out.tipoResina || detectarTipoResina(l.ItemName);
            out.detalle.push({ itemCode: l.ItemCode, itemName: l.ItemName, cantidad: r3(q), categoria: 'resina' });
        } else if (esCarbonatoOCarga(l)) {
            out.cargaKg += q;
            out.detalle.push({ itemCode: l.ItemCode, itemName: l.ItemName, cantidad: r3(q), categoria: 'carga' });
        } else if (seAbreSubEstructura(l)) {
            await extraerPesosBom(baseUrl, l.ItemCode, q, prof + 1, cache, out);
        }
    }
}

/**
 * GET /api/sap/pesos-consumo
 *  - ?accion=buscar&q=<texto>&planta=MS|FV  → Busca artículos activos en SAP
 *  - ?accion=peso&sku=<ItemCode>&proceso=<proceso> → Extrae peso SAP exacto de la lista de materiales
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const accion = searchParams.get('accion') || 'buscar';
    const baseUrl = sapBaseUrl();

    try {
        if (accion === 'buscar') {
            const qRaw = (searchParams.get('q') || '').trim();
            const planta = (searchParams.get('planta') || '').trim().toUpperCase();
            if (qRaw.length < 2) {
                return NextResponse.json({ items: [] });
            }
            const q = qRaw.replace(/'/g, "''").toUpperCase();

            // Solo piezas fabricadas (TreeType eq 'iProductionTree') correspondientes a la planta seleccionada
            let filtroPlanta = '';
            if (planta === 'FV') {
                filtroPlanta =
                    " and (startswith(ItemCode,'VHPT') or startswith(ItemCode,'VTIN') or startswith(ItemCode,'VHEM') or U_Familia eq 'FV' or U_Familia eq 'FVH' or U_Familia eq 'FVHMP')";
            } else if (planta === 'MS') {
                filtroPlanta =
                    " and (U_Familia eq 'PC' or U_Familia eq 'PA' or U_Familia eq 'MS')";
            }

            const filter = `(contains(ItemName,'${q}') or contains(ItemCode,'${q}')) and Valid eq 'tYES' and TreeType eq 'iProductionTree'${filtroPlanta}`;
            const url = `${baseUrl}/Items?$select=ItemCode,ItemName,Frozen,TreeType,U_Familia&$filter=${encodeURIComponent(filter)}&$top=25`;
            const r = await fetchSAP(url, { method: 'GET' });
            if (!r.ok) {
                return NextResponse.json({ error: `SAP respondió ${r.status}`, items: [] }, { status: r.status });
            }
            const data = await r.json();
            const prefijosExcluidos = /^(PEMP|CMPD|PMPD|PEST|PREF|PGEL|MP)/i;
            const items = (data.value || [])
                .filter((it: any) => {
                    if (it.Frozen === 'tYES') return false;
                    const code = String(it.ItemCode || '').trim();
                    if (prefijosExcluidos.test(code)) return false;
                    return true;
                })
                .map((it: any) => ({
                    sku: String(it.ItemCode || '').trim(),
                    descripcion: String(it.ItemName || '').trim()
                }));
            return NextResponse.json({ items });
        }

        if (accion === 'peso') {
            const sku = (searchParams.get('sku') || '').trim();
            const proceso = (searchParams.get('proceso') || '').trim();
            if (!sku) {
                return NextResponse.json({ error: 'Falta parámetro sku' }, { status: 400 });
            }

            const cache = new Map<string, ArbolBom>();
            const out = {
                gelcoatKg: 0,
                resinaKg: 0,
                masillaKg: 0,
                cargaKg: 0,
                tipoResina: null as string | null,
                detalle: [] as { itemCode: string; itemName: string; cantidad: number; categoria: string }[]
            };

            await extraerPesosBom(baseUrl, sku, 1, 0, cache, out);

            const gelcoatKg = r3(out.gelcoatKg);
            const resinaKg = r3(out.resinaKg);
            const masillaKg = r3(out.masillaKg);
            const vaciadoMsKg = r3(out.resinaKg + out.cargaKg);

            let pesoSugerido: number | null = null;
            if (proceso === 'pintura_ms' || proceso === 'pintura_fv') {
                pesoSugerido = gelcoatKg > 0 ? gelcoatKg : null;
            } else if (proceso === 'vaciado_fv') {
                pesoSugerido = resinaKg > 0 ? resinaKg : null;
            } else if (proceso === 'vaciado_ms') {
                pesoSugerido = vaciadoMsKg > 0 ? vaciadoMsKg : resinaKg > 0 ? resinaKg : null;
            } else if (proceso === 'masilla_fv') {
                pesoSugerido = masillaKg > 0 ? masillaKg : null;
            }

            return NextResponse.json({
                sku,
                pesoSugerido,
                gelcoatKg,
                resinaKg,
                masillaKg,
                vaciadoMsKg,
                tipoResina: out.tipoResina,
                detalle: out.detalle
            });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err: any) {
        console.error('Error en /api/sap/pesos-consumo:', err);
        return NextResponse.json(
            { error: err?.message || 'Error consultando SAP' },
            { status: 500 }
        );
    }
}
