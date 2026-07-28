import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

function mapProductionOrderType(type: string) {
    if (type === 'bopotStandard') return 'Estándar';
    if (type === 'bopotSpecial') return 'Especial';
    if (type === 'bopotDisassembly') return 'Desmontaje';
    return type;
}

function mapProductionOrderStatus(status: string) {
    if (status === 'boposReleased') return 'Liberado';
    if (status === 'boposPlanned') return 'Planificado';
    if (status === 'boposClosed') return 'Cerrado';
    return status;
}

function mapOrigin(origin: string) {
    if (origin === 'bopooSalesOrder') return 'Pedido de cliente';
    if (origin === 'bopooManual') return 'Manual';
    return origin;
}

function mapIssueType(issueType: string) {
    if (issueType === 'im_Manual') return 'Manual';
    if (issueType === 'im_Backflush') return 'Notificación';
    return issueType;
}

function mapRoutingDate(calc: string) {
    if (calc === 'raOnStartDate') return 'En Fecha de inicio';
    if (calc === 'raOnEndDate') return 'En Fecha de finalización';
    return calc;
}

function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
}

export async function GET(request: Request, props: { params: Promise<{ docNum: string }> }) {
    try {
        const params = await props.params;
        const { docNum } = params;
        if (!docNum) {
            return NextResponse.json({ error: 'Número de orden requerido' }, { status: 400 });
        }

        const loginData = await loginToSAP();
        const url = `${process.env.SAP_API_URL?.replace('/Login', '')}/ProductionOrders?$filter=DocumentNumber eq ${docNum}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: `Error SAP: ${response.status}` }, { status: response.status });
        }
        
        const data = await response.json();
        
        if (!data.value || data.value.length === 0) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const sapOrder = data.value[0];

        // Mapear los datos de SAP al formato esperado por el frontend
        const mappedOrder = {
            tipo: mapProductionOrderType(sapOrder.ProductionOrderType),
            estado: mapProductionOrderStatus(sapOrder.ProductionOrderStatus),
            noProducto: sapOrder.ItemNo,
            descripcionProducto: sapOrder.ProductDescription || '',
            cantPlanificada: sapOrder.PlannedQuantity,
            nombreUN: sapOrder.InventoryUOM || '',
            almacen: sapOrder.Warehouse,
            socioNegocio: sapOrder.U_HBT_Tercero || '',
            metodoEnrutamiento: mapRoutingDate(sapOrder.RoutingDateCalculation),
            aprovisionarArticulos: false,
            noOrden: sapOrder.DocumentNumber.toString(),
            fechaOrden: formatDate(sapOrder.PostingDate),
            fechaInicio: formatDate(sapOrder.StartDate),
            fechaFinalizacion: formatDate(sapOrder.DueDate),
            usuario: sapOrder.UserSignature ? `Usuario ${sapOrder.UserSignature}` : '',
            origen: mapOrigin(sapOrder.ProductionOrderOrigin),
            vinculadoA: mapOrigin(sapOrder.ProductionOrderOrigin),
            pedidoVinculado: sapOrder.ProductionOrderOriginNumber ? sapOrder.ProductionOrderOriginNumber.toString() : '',
            cliente: sapOrder.CustomerCode || '',
            centroCostos: '',
            proyecto: sapOrder.Project || '',
            comentarios: sapOrder.Remarks || '',
            observacionesEmpaque: '',
            cantCompletada: sapOrder.CompletedQuantity || 0,
            cantRechazada: sapOrder.RejectedQuantity || 0,
            fechaCierreReal: formatDate(sapOrder.ClosingDate),
            asientoContable: sapOrder.JournalRemarks || '',
            componentes: sapOrder.ProductionOrderLines.map((line: any, index: number) => ({
                id: index + 1,
                tipo: 'Artículo',
                no: line.ItemNo,
                descripcion: line.ItemName || '',
                cantBase: line.BaseQuantity,
                ratioBase: line.BaseQuantity,
                cantRequerida: line.PlannedQuantity,
                consumido: line.IssuedQuantity,
                disponible: 0, // No disponible directamente en ProductionOrderLines
                unidadMedida: 'Manual',
                almacen: line.Warehouse,
                metodoEmision: mapIssueType(line.ProductionOrderIssueType)
            }))
        };

        return NextResponse.json(mappedOrder);

    } catch (error: any) {
        console.error("Error en endpoint de SAP:", error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
