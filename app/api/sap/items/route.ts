import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';
import { crearFaltantes, nombreSap } from '@/lib/sapFaltantes';

type Faltantes = ReturnType<typeof crearFaltantes>;

const CLASES: Record<string, string> = { itcMaterial: 'Artículos', itcService: 'Servicio' };
const EMISIONES: Record<string, string> = { im_Manual: 'Manual', im_Backflush: 'Notificación' };
const TIPOS_LINEA: Record<string, string> = { pit_Item: 'Artículo', pit_Resource: 'Recurso', pit_Text: 'Texto' };
const pesos = (n: number) => `$ ${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Consulta por producto (datos maestros, almacenes y lista de materiales). Lo que SAP no entregue o no se
// reconozca va en `faltantes` (la pantalla lo muestra como error) en lugar de completarse con valores por defecto.
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const query = searchParams.get('query');

        if (!code && !query) {
            return NextResponse.json({ error: 'Se requiere código o término de búsqueda' }, { status: 400 });
        }

        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || '';
        const cookie = loginData.cookieHeader;
        const sap = (ruta: string) => fetch(`${baseUrl}${ruta}`, { headers: { 'Cookie': cookie, 'Content-Type': 'application/json' } });

        // 1) Artículo principal y coincidencias
        let primario: any = null;
        let coincidencias: any[] = [];
        if (code) {
            const r = await sap(`/Items('${encodeURIComponent(code.replace(/'/g, "''"))}')`);
            if (r.ok) primario = await r.json();
            else if (r.status === 404) {
                const alt = await sap(`/Items?$filter=ItemCode eq '${encodeURIComponent(code.replace(/'/g, "''"))}'`);
                if (alt.ok) primario = (await alt.json()).value?.[0] || null;
                else return NextResponse.json({ error: `Error SAP: ${alt.status}` }, { status: alt.status });
            } else {
                return NextResponse.json({ error: `Error SAP: ${r.status}` }, { status: r.status });
            }
            if (!primario) return NextResponse.json({ error: `Artículo ${code} no encontrado en SAP` }, { status: 404 });
        } else {
            const q = encodeURIComponent(query!.trim().replace(/'/g, "''"));
            const r = await sap(`/Items?$filter=contains(ItemCode, '${q}') or contains(ItemName, '${q}')&$top=20`);
            if (!r.ok) return NextResponse.json({ error: `Error SAP: ${r.status}` }, { status: r.status });
            coincidencias = (await r.json()).value || [];
            if (!coincidencias.length) return NextResponse.json({ error: `Ningún artículo coincide con "${query}" en SAP` }, { status: 404 });
            primario = coincidencias[0];
        }

        const f = crearFaltantes();

        // 2) Lista de materiales y nombres de grupo, fabricante y lista de precios (en paralelo)
        const precio = (primario.ItemPrices || [])[0];
        const [arbol, nombreGrupo, nombreFabricante, nombreLista] = await Promise.all([
            sap(`/ProductTrees('${encodeURIComponent(primario.ItemCode.replace(/'/g, "''"))}')`).then(async r => ({ status: r.status, data: r.ok ? await r.json() : null })).catch(() => ({ status: 0, data: null })),
            primario.ItemsGroupCode != null ? nombreSap(baseUrl, cookie, `ItemGroups(${primario.ItemsGroupCode})`, 'GroupName') : Promise.resolve(null),
            primario.Manufacturer != null && primario.Manufacturer !== -1 ? nombreSap(baseUrl, cookie, `Manufacturers(${primario.Manufacturer})`, 'ManufacturerName') : Promise.resolve(null),
            precio?.PriceList != null ? nombreSap(baseUrl, cookie, `PriceLists(${precio.PriceList})`, 'PriceListName') : Promise.resolve(null)
        ]);

        // 404 = el artículo no tiene lista de materiales (normal); cualquier otro error se informa
        let bomComponents: any[] = [];
        if (arbol.data) bomComponents = mapearLdm(arbol.data, f);
        else if (arbol.status !== 404) f.agregar(`Lista de materiales (SAP respondió ${arbol.status || 'sin conexión'})`);

        const item = mapSapItem(primario, f, {
            grupo: nombreGrupo,
            fabricante: nombreFabricante,
            listaPrecios: nombreLista,
            bomComponents
        });

        return NextResponse.json({
            item,
            matches: coincidencias.map(c => ({ itemCode: c.ItemCode, itemName: c.ItemName })),
            faltantes: f.lista
        });

    } catch (error: any) {
        console.error("Error en endpoint /api/sap/items:", error);
        return NextResponse.json({ error: error.message || 'Error interno al consultar SAP' }, { status: 500 });
    }
}

function mapearLdm(arbol: any, f: Faltantes) {
    const lineas: any[] = arbol.ProductTreeLines || [];
    return lineas.map((line: any, index: number) => {
        const n = index + 1;
        const cantidad = line.Quantity;
        if (cantidad == null) f.agregar(`Cantidad del componente ${n} de la lista de materiales`);
        const total = line.Price != null && cantidad != null ? line.Price * cantidad : null;
        return {
            id: n,
            tipo: f.traducir(line.ItemType, TIPOS_LINEA, 'Tipo de componente (lista de materiales)'),
            no: f.requerido(line.ItemCode, `Nº del componente ${n} de la lista de materiales`),
            descripcion: line.ItemName || '',
            cantidad: cantidad != null ? String(cantidad) : '',
            // ProductTrees no trae la unidad de medida de la línea (en SAP sale del dato maestro del componente)
            uom: line.InventoryUOM || '',
            almacen: f.requerido(line.Warehouse, `Almacén del componente ${n} de la lista de materiales`),
            metodoEmision: f.traducir(line.IssueMethod, EMISIONES, 'Método de emisión (lista de materiales)'),
            costoEst: "****",
            listaPrecios: line.PriceList != null ? `Lista ${line.PriceList}` : '',
            costoEstTotal: "****",
            precioUnitario: line.Price ? pesos(line.Price) : '',
            total: total ? pesos(total) : '',
            totalNum: total || 0,
            comentarios: line.Comment || '',
            ctaWip: line.WipAccount || ''
        };
    });
}

function mapSapItem(sapItem: any, f: Faltantes, extra: { grupo: string | null; fabricante: string | null; listaPrecios: string | null; bomComponents: any[] }) {
    const precio = (sapItem.ItemPrices || [])[0];
    if (!precio) f.agregar('Lista de precios');
    else if (!extra.listaPrecios) f.agregar(`Nombre de la lista de precios ${precio.PriceList}`);
    if (sapItem.ItemsGroupCode != null && !extra.grupo) f.agregar(`Nombre del grupo de artículos ${sapItem.ItemsGroupCode}`);
    // El nombre del fabricante no se marca como faltante: el usuario de integración no tiene permiso para leer
    // Manufacturers (SAP responde 403) y se muestra el código real ("Fabricante 16"), que sí es dato de SAP
    const esInventario = sapItem.InventoryItem === 'tYES';

    return {
        itemCode: f.requerido(sapItem.ItemCode, 'Nº de artículo'),
        itemName: f.requerido(sapItem.ItemName, 'Descripción'),
        foreignName: sapItem.ForeignName || '',
        itemClass: f.traducir(sapItem.ItemClass, CLASES, 'Clase de artículo'),
        itemsGroupCode: sapItem.ItemsGroupCode == null ? String(f.requerido(null, 'Grupo de artículos')) : extra.grupo || `Grupo ${sapItem.ItemsGroupCode}`,
        // UoMGroupEntry -1 = grupo de unidades "Manual" en SAP
        uomGroup: sapItem.UoMGroupEntry == null ? String(f.requerido(null, 'Grupo de unidades de medida')) : sapItem.UoMGroupEntry === -1 ? 'Manual' : `Grupo ${sapItem.UoMGroupEntry}`,
        priceList: precio ? extra.listaPrecios || `Lista ${precio.PriceList}` : '',
        price: precio ? `${precio.Currency && precio.Currency !== '$' ? `${precio.Currency} ` : '$ '}${Number(precio.Price || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
        barCode: sapItem.BarCode || '',

        // Indicadores tipo checkbox de SAP
        inventoryItem: esInventario,
        salesItem: sapItem.SalesItem === 'tYES',
        purchaseItem: sapItem.PurchaseItem === 'tYES',
        assetItem: sapItem.AssetItem === 'tYES',

        // General
        manufacturer: sapItem.Manufacturer == null ? String(f.requerido(null, 'Fabricante')) : sapItem.Manufacturer === -1 ? '- Sin fabricante -' : extra.fabricante || `Fabricante ${sapItem.Manufacturer}`,
        valid: sapItem.Valid === 'tYES',
        frozen: sapItem.Frozen === 'tYES',
        activeStatus: sapItem.Frozen == null ? String(f.requerido(null, 'Estado activo/inactivo')) : sapItem.Frozen === 'tYES' ? 'Inactivo' : 'Activo',
        vatLiable: sapItem.VatLiable === 'tYES',
        taxSubject: sapItem.VatLiable === 'tYES',

        // Inventario y Unidades
        defaultWarehouse: esInventario ? f.requerido(sapItem.DefaultWarehouse, 'Almacén por defecto') : sapItem.DefaultWarehouse || '',
        salesUnit: sapItem.SalesUnit || '',
        purchaseUnit: sapItem.PurchaseUnit || '',
        inventoryUOM: esInventario ? f.requerido(sapItem.InventoryUOM, 'Unidad de medida de inventario') : sapItem.InventoryUOM || '',
        quantityOnStock: f.requerido(sapItem.QuantityOnStock, 'Cantidad en stock'),
        quantityOrderedFromVendors: f.requerido(sapItem.QuantityOrderedFromVendors, 'Cantidad pedida a proveedores'),
        quantityOrderedByCustomers: f.requerido(sapItem.QuantityOrderedByCustomers, 'Cantidad comprometida con clientes'),

        // Lista de Materiales (BOM)
        bomComponents: extra.bomComponents,

        // Lista de almacenes (ItemWarehouseInfoCollection). Campos de usuario con su nombre real en SAP.
        warehouses: (sapItem.ItemWarehouseInfoCollection || []).map((wh: any) => ({
            warehouseCode: wh.WarehouseCode,
            warehouseName: wh.WarehouseName || wh.WarehouseCode,
            locked: wh.Locked === 'tYES',
            inStock: wh.InStock ?? 0,
            committed: wh.Committed ?? 0,
            ordered: wh.Ordered ?? 0,
            available: (wh.InStock ?? 0) - (wh.Committed ?? 0) + (wh.Ordered ?? 0),
            minStock: wh.MinimalStock ?? 0,
            maxStock: wh.MaximalStock ?? 0,
            requiredStock: wh.MinimalOrder ?? 0,
            itemCost: wh.StandardAveragePrice ?? 0,
            dispReal: wh.U_DispReal != null ? Number(wh.U_DispReal) : undefined,
            amortiguadorToc: wh.U_AmoTOC ?? '',
            minOrderQty: wh.U_MINORDRQTY ?? 0,
            leadTime: wh.U_LEADTIME ?? 0,
            reabastecimientoMin: wh.U_Reabastecimiento ?? 0,
            tiempoReabastecimiento: wh.U_tiempo_reab ?? ''
        }))
    };
}
