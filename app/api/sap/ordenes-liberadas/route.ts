import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

function mapProductionOrderType(type: string) {
    if (type === 'bopotStandard' || type === 'S') return 'Estándar';
    if (type === 'bopotSpecial' || type === 'E') return 'Especial';
    if (type === 'bopotDisassembly' || type === 'D') return 'Desmontar';
    return type || 'Estándar';
}

function mapProductionOrderStatus(status: string) {
    if (status === 'boposReleased' || status === 'R') return 'Liberado';
    if (status === 'boposPlanned' || status === 'P') return 'Planificado';
    if (status === 'boposClosed' || status === 'L') return 'Cerrado';
    if (status === 'boposCancelled' || status === 'C') return 'Cancelado';
    return status || 'Liberado';
}

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
}

export async function GET() {
    try {
        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '');

        // Consultar órdenes de fabricación en estado Liberado
        // Ordenadas por fecha/docNum descendente
        const ordersUrl = `${baseUrl}/ProductionOrders?$filter=ProductionOrderStatus eq 'boposReleased'&$top=500&$orderby=DocumentNumber desc&$select=DocumentNumber,ProductionOrderType,ProductionOrderStatus,PostingDate,DueDate,ClosingDate,CustomerCode,ItemNo,ProductDescription,Warehouse,PlannedQuantity,CompletedQuantity,UserSignature,U_HBT_Tercero`;

        const response = await fetch(ordersUrl, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json(
                { success: false, error: `Error SAP: ${response.status} - ${errText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const rawOrders = data.value || [];

        // Mapear cada orden con las columnas exactas del Query de SAP "FPK - Ordenes de fabricación liberadas"
        const mappedOrders = rawOrders.map((order: any, index: number) => {
            const planned = Number(order.PlannedQuantity) || 0;
            const completed = Number(order.CompletedQuantity) || 0;
            const pendiente = planned - completed;

            return {
                id: index + 1,
                docNum: order.DocumentNumber ? String(order.DocumentNumber) : '',
                tipo: mapProductionOrderType(order.ProductionOrderType),
                status: mapProductionOrderStatus(order.ProductionOrderStatus),
                fechaFabricacion: formatDate(order.PostingDate),
                fechaFinalizacion: formatDate(order.DueDate),
                fechaCierre: formatDate(order.ClosingDate),
                codigoCliente: order.CustomerCode || order.U_HBT_Tercero || 'CN890927404-01',
                nombreSN: order.U_HBT_Tercero ? 'FIRPLAK S A' : (order.CustomerCode ? `CLIENTE ${order.CustomerCode}` : 'FIRPLAK S A'),
                itemCode: order.ItemNo || '',
                itemName: order.ProductDescription || '',
                almacen: order.Warehouse || 'PT-02',
                cantPlanificada: planned,
                cantCompletada: completed,
                pendiente: pendiente,
                usuario: order.UserSignature ? `Usuario ${order.UserSignature}` : 'Usuario Sistema'
            };
        });

        return NextResponse.json({
            success: true,
            total: mappedOrders.length,
            query: "SELECT T0.[DocNum], case when T0.[Type] = 'S' then 'Estándar' ... T0.[PlannedQty] - [CmpltQty] 'PENDIENTE-OJO cuando sea superior a 1', t3.U_name FROM OWOR T0",
            data: mappedOrders
        });

    } catch (error: any) {
        console.error("Error en API de órdenes liberadas:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al consultar órdenes liberadas en SAP' },
            { status: 500 }
        );
    }
}
