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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            codigoDesde,
            codigoHasta,
            grupoArticulos,
            almacenes = [],
            ocultarStockCero = true,
            maxResults = 100
        } = body;

        // Iniciar sesión en SAP Service Layer
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';

        // Construir filtros OData para /Items
        const filters: string[] = [];

        if (codigoDesde && codigoHasta) {
            filters.push(`ItemCode ge '${codigoDesde.trim().replace(/'/g, "''")}' and ItemCode le '${codigoHasta.trim().replace(/'/g, "''")}'`);
        } else if (codigoDesde) {
            filters.push(`ItemCode ge '${codigoDesde.trim().replace(/'/g, "''")}'`);
        } else if (codigoHasta) {
            filters.push(`ItemCode le '${codigoHasta.trim().replace(/'/g, "''")}'`);
        }

        if (grupoArticulos && grupoArticulos !== 'TODOS' && grupoArticulos !== 'Todos') {
            const numGrupo = Number(grupoArticulos);
            if (!isNaN(numGrupo)) {
                filters.push(`ItemsGroupCode eq ${numGrupo}`);
            }
        }

        const filterParam = filters.length > 0 ? `&$filter=${encodeURIComponent(filters.join(' and '))}` : '';
        const selectParam = `$select=ItemCode,ItemName,ItemsGroupCode,SalesUnit,ItemWarehouseInfoCollection,ItemPrices`;
        const topParam = `&$top=${Math.min(maxResults, 250)}`;

        const url = `${baseUrl}/Items?${selectParam}${filterParam}${topParam}`;

        const sapResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
                'Content-Type': 'application/json',
                'Prefer': 'odata.maxpagesize=250'
            },
            cache: 'no-store'
        });

        if (!sapResponse.ok) {
            const errText = await sapResponse.text();
            console.error('Error al consultar SAP Service Layer (/Items):', sapResponse.status, errText);
            return NextResponse.json({
                error: `SAP Service Layer respondió con error ${sapResponse.status}`,
                details: errText
            }, { status: sapResponse.status });
        }

        const data = await sapResponse.json();
        const sapItems = Array.isArray(data.value) ? data.value : [];

        // Almacenes seleccionados normalizados (si está vacío, no se filtra por almacén específico)
        const almacenesSet = new Set(
            (almacenes || []).map((w: string) => String(w).trim().toUpperCase())
        );

        const resultados: any[] = [];

        for (const item of sapItems) {
            const whCollection = item.ItemWarehouseInfoCollection || [];
            
            for (const wh of whCollection) {
                const whCode = String(wh.WarehouseCode || '').trim().toUpperCase();
                
                // Si el usuario especificó almacenes en el formulario, verificar coincidencia
                if (almacenesSet.size > 0 && !almacenesSet.has(whCode)) {
                    continue;
                }

                const inStock = Number(wh.InStock || 0);

                // Ocultar artículos con una cantidad acumulada equivalente a cero
                if (ocultarStockCero && inStock <= 0) {
                    continue;
                }

                // Buscar precio en lista de precios o costo en el almacén
                const preciosLista = item.ItemPrices || [];
                const precioValido = preciosLista.find((p: any) => Number(p.Price || 0) > 0)?.Price;
                const costoUnitario = Number(wh.StandardAveragePrice || wh.ItemCost || precioValido || 0);
                const precio = Number(precioValido || costoUnitario || 0);
                const comprometido = Number(wh.Committed || 0);
                const pedido = Number(wh.Ordered || 0);
                const disponible = inStock - comprometido + pedido;
                const valorTotal = inStock * costoUnitario;

                // Determinar categoría ABC aproximada por código y stock
                let categoria: 'A' | 'B' | 'C' = 'C';
                const codeUpper = String(item.ItemCode).toUpperCase();
                if (codeUpper.startsWith('CMPD01') || codeUpper.startsWith('PGEL') || codeUpper.startsWith('CMPD09') || inStock > 500) {
                    categoria = 'A';
                } else if (codeUpper.startsWith('CMPD') || inStock > 100) {
                    categoria = 'B';
                }

                resultados.push({
                    id: `${item.ItemCode}__${whCode}`,
                    sku: item.ItemCode,
                    descripcion: item.ItemName || 'Sin descripción',
                    almacen: whCode,
                    planta: PLANTAS_POR_BODEGA[whCode] || 'MS',
                    categoria,
                    stockTeorico: inStock,
                    conteoFisico: null,
                    costoUnitario,
                    precio,
                    valorTotal,
                    comprometido,
                    pedido,
                    disponible,
                    unidad: item.SalesUnit || 'UN',
                    fechaConteo: null,
                    responsable: null,
                    estado: 'Pendiente',
                    observacion: ''
                });
            }
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
