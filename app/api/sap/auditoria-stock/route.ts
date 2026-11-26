import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

export const dynamic = 'force-dynamic';

const PLANTAS_POR_BODEGA: Record<string, string> = {
    'MP-01': 'FV',
    'MP-02': 'MBL',
    'MP-03': 'FV',
    'MP-04': 'MBL',
    'MP-05': 'FV',
    'MP-06': 'MOLD',
    'MP-07': 'MBL',
    'MP-08': 'CENTRAL',
    'MP-09': 'I+D',
    'MP-10': 'MS',
    'MP-11': 'CEFI',
    'MP-12': 'CEFI',
    'PT-01': 'PT',
    'PT-02': 'PT',
    'PT-03': 'PT',
    'PT-06': 'PT',
    'PT-10': 'MED',
    'PT-11': 'BOG',
    'REP-01': 'MTTO',
};

const SQL_CODE = 'fir_auditoria_stock';
const SQL_QUERY_TEXT = `SELECT T0.[ItemCode] AS [item_code], T1.[ItemName] AS [item_name], T0.[WhsCode] AS [whs_code], T0.[OnHand] AS [in_stock], T0.[IsCommited] AS [committed], T0.[OnOrder] AS [ordered], T0.[AvgPrice] AS [costo_unitario], T1.[ItmsGrpCod] AS [grupo_codigo], T1.[SalUnitMsr] AS [unidad] FROM [OITW] T0 INNER JOIN [OITM] T1 ON T0.[ItemCode] = T1.[ItemCode] WHERE T0.[OnHand] > 0`;

async function asegurarQueryStock(baseUrl: string, cookieHeader: string) {
    try {
        const checkRes = await fetch(`${baseUrl}/SQLQueries('${SQL_CODE}')`, {
            headers: { 'Cookie': cookieHeader }
        });
        if (checkRes.status === 404) {
            await fetch(`${baseUrl}/SQLQueries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
                body: JSON.stringify({
                    SqlCode: SQL_CODE,
                    SqlName: 'Auditoria de Stock Firplak',
                    SqlText: SQL_QUERY_TEXT
                })
            });
        }
    } catch (e) {
        console.warn('Advertencia asegurando SQLQuery fir_auditoria_stock:', e);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            codigoDesde,
            codigoHasta,
            grupoArticulos,
            almacenes = [],
            ocultarStockCero = true
        } = body;

        // Iniciar sesión en SAP Service Layer
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';
        const cookieHeader = loginData.cookieHeader;

        // Garantizar que la consulta SQL rápida existe en SAP
        await asegurarQueryStock(baseUrl, cookieHeader);

        // Consultar stock directamente desde SQLQueries de Service Layer
        let nextUrl: string | null = `${baseUrl}/SQLQueries('${SQL_CODE}')/List`;
        const rawStockRows: any[] = [];
        const maxPages = 6; // hasta 6.000 registros de stock activo
        let pageCount = 0;

        while (nextUrl && pageCount < maxPages) {
            pageCount++;
            const sapResponse = await fetch(nextUrl, {
                method: 'GET',
                headers: {
                    'Cookie': cookieHeader,
                    'Prefer': 'odata.maxpagesize=1000'
                },
                cache: 'no-store'
            });

            if (!sapResponse.ok) {
                const errText = await sapResponse.text();
                console.error(`Error en SQLQueries(${SQL_CODE})/List página ${pageCount}:`, sapResponse.status, errText);
                break;
            }

            const data = await sapResponse.json();
            if (Array.isArray(data.value)) {
                rawStockRows.push(...data.value);
            }

            const next = data['@odata.nextLink'];
            if (!next) break;
            nextUrl = next.startsWith('http') ? next : `${baseUrl}/${String(next).replace(/^\//, '')}`;
        }

        // Filtros en memoria precisos
        const almacenesSet = new Set(
            (almacenes || []).map((w: string) => String(w).trim().toUpperCase()).filter(Boolean)
        );

        const codDesdeTrim = (codigoDesde || '').trim().toUpperCase();
        const codHastaTrim = (codigoHasta || '').trim().toUpperCase();
        const grupoNum = grupoArticulos && grupoArticulos !== 'TODOS' && grupoArticulos !== 'Todos' ? Number(grupoArticulos) : null;

        const resultados: any[] = [];

        for (const row of rawStockRows) {
            const whCode = String(row.whs_code || '').trim().toUpperCase();
            const itemCode = String(row.item_code || '').trim().toUpperCase();
            const inStock = Number(row.in_stock || 0);

            // Filtro por almacén
            if (almacenesSet.size > 0 && !almacenesSet.has(whCode)) {
                continue;
            }

            // Filtro ocultar stock cero
            if (ocultarStockCero && inStock <= 0) {
                continue;
            }

            // Filtro rango de códigos
            if (codDesdeTrim && itemCode < codDesdeTrim) {
                continue;
            }
            if (codHastaTrim && itemCode > codHastaTrim) {
                continue;
            }

            // Filtro grupo de artículos
            if (grupoNum !== null && Number(row.grupo_codigo) !== grupoNum) {
                continue;
            }

            const committed = Number(row.committed || 0);
            const ordered = Number(row.ordered || 0);
            const available = inStock - committed + ordered;
            const costoUnitario = Number(row.costo_unitario || 0);
            const valorTotal = inStock * costoUnitario;

            // Determinar categoría ABC
            let categoria: 'A' | 'B' | 'C' = 'C';
            if (itemCode.startsWith('CMPD01') || itemCode.startsWith('PGEL') || itemCode.startsWith('CMPD09') || inStock > 500) {
                categoria = 'A';
            } else if (itemCode.startsWith('CMPD') || inStock > 100) {
                categoria = 'B';
            }

            resultados.push({
                id: `${row.item_code}__${whCode}`,
                sku: row.item_code,
                descripcion: row.item_name || 'Sin descripción',
                almacen: whCode,
                planta: PLANTAS_POR_BODEGA[whCode] || 'MS',
                categoria,
                stockTeorico: inStock,
                conteoFisico: null,
                costoUnitario,
                precio: costoUnitario,
                valorTotal,
                comprometido: committed,
                pedido: ordered,
                disponible: available,
                unidad: row.unidad || 'UN',
                fechaConteo: null,
                responsable: null,
                estado: 'Pendiente',
                observacion: ''
            });
        }

        return NextResponse.json({
            total: resultados.length,
            items: resultados,
            filtrosAplicados: {
                codigoDesde,
                codigoHasta,
                grupoArticulos,
                almacenes,
                ocultarStockCero
            }
        });

    } catch (error: any) {
        console.error('Error en /api/sap/auditoria-stock:', error);
        return NextResponse.json({
            error: error.message || 'Error interno al consultar SAP Service Layer'
        }, { status: 500 });
    }
}
