import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const query = searchParams.get('query');

        if (!code && !query) {
            return NextResponse.json({ error: 'Se requiere código o término de búsqueda' }, { status: 400 });
        }

        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '');

        let url = '';

        if (code) {
            // Búsqueda por código exacto o directo
            const encodedCode = encodeURIComponent(code);
            url = `${baseUrl}/Items('${encodedCode}')`;
        } else if (query) {
            // Búsqueda parcial por ItemCode o ItemName
            const encodedQuery = encodeURIComponent(query.trim());
            url = `${baseUrl}/Items?$filter=contains(ItemCode, '${encodedQuery}') or contains(ItemName, '${encodedQuery}')&$top=20`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Si dio 404 buscando por clave directa, intentar con filtro eq
            if (response.status === 404 && code) {
                const altUrl = `${baseUrl}/Items?$filter=ItemCode eq '${encodeURIComponent(code)}'`;
                const altRes = await fetch(altUrl, {
                    headers: { 'Cookie': loginData.cookieHeader, 'Content-Type': 'application/json' }
                });
                if (altRes.ok) {
                    const altData = await altRes.json();
                    if (altData.value && altData.value.length > 0) {
                        return NextResponse.json({ item: mapSapItem(altData.value[0]), matches: [] });
                    }
                }
            }
            return NextResponse.json({ error: `Error SAP: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        let primaryItemRaw = data.value ? data.value[0] : data;
        let bomComponents: any[] = [];

        if (primaryItemRaw && primaryItemRaw.ItemCode) {
            try {
                const treeUrl = `${baseUrl}/ProductTrees('${encodeURIComponent(primaryItemRaw.ItemCode)}')`;
                const treeRes = await fetch(treeUrl, {
                    headers: { 'Cookie': loginData.cookieHeader, 'Content-Type': 'application/json' }
                });
                if (treeRes.ok) {
                    const treeData = await treeRes.json();
                    const lines = treeData.ProductTreeLines || treeData.ProductTreeItems || [];
                    bomComponents = lines.map((line: any, index: number) => ({
                        id: index + 1,
                        tipo: line.ItemType === 'pit_Resource' ? 'Recurso' : 'Artículo',
                        no: line.ItemCode,
                        descripcion: line.ItemName || line.ItemCode,
                        cantidad: String(line.Quantity || 1),
                        uom: line.UoMCode || 'UN',
                        almacen: line.Warehouse || 'MP-10',
                        metodoEmision: line.IssueMethod === 'im_Manual' ? 'Manual' : 'Notificación',
                        costoEst: "****",
                        listaPrecios: "****",
                        costoEstTotal: "****",
                        precioUnitario: line.Price ? `$ ${line.Price.toLocaleString('es-CO')}` : '',
                        total: line.Price ? `$ ${(line.Price * (line.Quantity || 1)).toLocaleString('es-CO')}` : '',
                        ctaWip: "0"
                    }));
                }
            } catch (e) {
                console.log("Artículo no tiene Lista de Materiales en SAP:", primaryItemRaw.ItemCode);
            }
        }

        // Si la respuesta es un arreglo de coincidencias (cuando se usa $filter)
        if (data.value) {
            if (data.value.length === 0) {
                return NextResponse.json({ error: 'Artículo no encontrado en SAP' }, { status: 404 });
            }
            const matches = data.value.map((item: any) => mapSapItem(item, item.ItemCode === primaryItemRaw.ItemCode ? bomComponents : []));
            return NextResponse.json({
                item: matches[0],
                matches: matches.map(m => ({ itemCode: m.itemCode, itemName: m.itemName }))
            });
        }

        // Si la respuesta es un objeto único (búsqueda directa por ID)
        const mappedItem = mapSapItem(data, bomComponents);
        return NextResponse.json({ item: mappedItem, matches: [] });

    } catch (error: any) {
        console.error("Error en endpoint /api/sap/items:", error);
        return NextResponse.json({ error: error.message || 'Error interno al consultar SAP' }, { status: 500 });
    }
}

function mapSapItem(sapItem: any, bomComponents: any[] = []) {
    const mainPrice = sapItem.ItemPrices && sapItem.ItemPrices.length > 0
        ? sapItem.ItemPrices[0].Price
        : 0;

    return {
        itemCode: sapItem.ItemCode || '',
        itemName: sapItem.ItemName || '',
        foreignName: sapItem.ForeignName || '',
        itemClass: sapItem.ItemClass || 'Artículos',
        itemsGroupCode: sapItem.ItemsGroupCode ? `Grupo ${sapItem.ItemsGroupCode}` : '',
        uomGroup: sapItem.UoMGroupEntry ? 'Manual' : 'Manual',
        priceList: '1. Lista Base 2020',
        price: mainPrice ? `$ ${mainPrice.toLocaleString('es-CO')}` : '$ 0.00',
        barCode: sapItem.BarCode || '',
        
        // Indicadores tipo checkbox de SAP
        inventoryItem: sapItem.InventoryItem === 'tYES',
        salesItem: sapItem.SalesItem === 'tYES',
        purchaseItem: sapItem.PurchaseItem === 'tYES',
        assetItem: sapItem.AssetItem === 'tYES',

        // General
        manufacturer: sapItem.Manufacturer ? `Fabricante ${sapItem.Manufacturer}` : 'FIRPLAK',
        valid: sapItem.Valid === 'tYES',
        frozen: sapItem.Frozen === 'tYES',
        activeStatus: sapItem.Frozen === 'tYES' ? 'Inactivo' : 'Activo',
        vatLiable: sapItem.VatLiable === 'tYES',
        taxSubject: sapItem.VatLiable === 'tYES',

        // Inventario y Unidades
        defaultWarehouse: sapItem.DefaultWarehouse || 'PT-02',
        salesUnit: sapItem.SalesUnit || 'UN',
        purchaseUnit: sapItem.PurchaseUnit || 'UN',
        inventoryUOM: sapItem.InventoryUOM || sapItem.SalesUnit || 'UN',
        quantityOnStock: sapItem.QuantityOnStock || 0,
        quantityOrderedFromVendors: sapItem.QuantityOrderedFromVendors || 0,
        quantityOrderedByCustomers: sapItem.QuantityOrderedByCustomers || 0,

        // Lista de Materiales (BOM)
        bomComponents: bomComponents,

        // Lista de almacenes (ItemWarehouseInfoCollection)
        warehouses: (sapItem.ItemWarehouseInfoCollection || []).map((wh: any) => ({
            warehouseCode: wh.WarehouseCode,
            warehouseName: wh.WarehouseName || wh.WarehouseCode,
            locked: wh.Locked === 'tYES',
            inStock: wh.InStock || 0,
            committed: wh.Committed || 0,
            ordered: wh.Ordered || 0,
            available: (wh.InStock || 0) - (wh.Committed || 0) + (wh.Ordered || 0),
            minStock: wh.MinimalStock || 0,
            maxStock: wh.MaximalStock || 0,
            requiredStock: wh.RequiredStock || 0,
            itemCost: wh.StandardAveragePrice || wh.ItemCost || 0,
            dispReal: (wh.InStock || 0) - (wh.Committed || 0) + (wh.Ordered || 0),
            amortiguadorToc: wh.U_AmortiguadorTOC || wh.AmortiguadorTOC || '',
            minOrderQty: wh.U_MINORDRQTY || wh.MinOrderQty || 0,
            leadTime: wh.U_TiempoLead || wh.LeadTime || 0,
            reabastecimientoMin: wh.U_ReabastecimientoMinimo || wh.MinReorderQty || 0,
            tiempoReabastecimiento: wh.U_TiempoReabastecimiento || wh.ReorderLeadTime || ''
        }))
    };
}
